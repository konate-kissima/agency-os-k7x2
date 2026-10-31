#!/usr/bin/env python3
"""
Recherche de plombiers / chauffagistes via l'API Google Places (New) -> CSV importable dans Agency OS.

Usage :
  export GOOGLE_PLACES_API_KEY=...            # ta clé (Google Cloud > Places API (New))
  python3 sourcing_places.py --depts 78 92 95 --queries "plombier" "chauffagiste" --out plombiers.csv
  python3 sourcing_places.py --depts 78 --dry-run   # compte les requêtes SANS les envoyer (estimation du coût)

Garde-fous : --max-requests (défaut 400) pour ne pas dépasser ton budget Google.
Vérifie la grille tarifaire Google actuelle : les champs téléphone / site / avis relèvent d'une catégorie payante.
Les communes viennent de geo.api.gouv.fr (gratuit, sans clé) ; sinon donne --communes-file (un nom par ligne, dept;commune).
"""
import argparse, csv, json, os, re, sys, time, urllib.request, urllib.error

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ",".join([
    "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
    "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount",
    "places.businessStatus", "places.googleMapsUri", "nextPageToken",
])
OUT_COLS = ["name", "phone", "website", "rating", "reviews", "address", "city", "dept", "place_id", "maps_url", "score", "mobile"]


def norm_phone(p):
    s = re.sub(r"[^\d+]", "", p or "")
    if s.startswith("+33"):
        s = "0" + s[3:]
    elif s.startswith("0033"):
        s = "0" + s[4:]
    return s


def http_json(url, data=None, headers=None, timeout=30):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def load_communes(depts, communes_file=None):
    """Retourne une liste de (dept, commune)."""
    out = []
    if communes_file:
        for line in open(communes_file, encoding="utf-8"):
            line = line.strip()
            if ";" in line:
                d, c = line.split(";", 1)
                if not depts or d in depts:
                    out.append((d, c))
        return out
    for d in depts:
        data = http_json(f"https://geo.api.gouv.fr/departements/{d}/communes?fields=nom,population&format=json")
        for c in sorted(data, key=lambda x: -(x.get("population") or 0)):
            out.append((d, c["nom"]))
    return out


def score(place):
    """Score de tri 0-100 : avis, note, site, téléphone fixe."""
    n = place.get("userRatingCount") or 0
    r = place.get("rating") or 0
    s = 0
    s += min(40, n * 2)            # jusqu'à 20 avis = 40 points
    s += max(0, (r - 3.5)) * 20    # 4.5/5 = 20 points
    s += 15 if place.get("websiteUri") else 0
    s += 10 if place.get("nationalPhoneNumber") else 0
    s += 15 if not re.match(r"^0[67]", norm_phone(place.get("nationalPhoneNumber"))) else 0
    return int(min(100, s))


def search(api_key, query, max_pages=3, sleep=0.2):
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": api_key, "X-Goog-FieldMask": FIELDS}
    body = {"textQuery": query, "languageCode": "fr", "regionCode": "FR", "pageSize": 20}
    results, calls = [], 0
    for _ in range(max_pages):
        data = http_json(PLACES_URL, body, headers)
        calls += 1
        results += data.get("places", [])
        tok = data.get("nextPageToken")
        if not tok:
            break
        body = {"textQuery": query, "languageCode": "fr", "regionCode": "FR", "pageSize": 20, "pageToken": tok}
        time.sleep(sleep)
    return results, calls


def to_row(place, dept, city):
    phone = place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber") or ""
    return {
        "name": (place.get("displayName") or {}).get("text", ""),
        "phone": phone, "website": place.get("websiteUri", ""),
        "rating": place.get("rating", ""), "reviews": place.get("userRatingCount", 0),
        "address": place.get("formattedAddress", ""), "city": city, "dept": dept,
        "place_id": place.get("id", ""), "maps_url": place.get("googleMapsUri", ""),
        "score": score(place), "mobile": "oui" if re.match(r"^0[67]", norm_phone(phone)) else "",
    }


def run(api_key, depts, queries, out_path, max_requests=400, dry_run=False, communes_file=None, search_fn=search, communes=None):
    communes = communes if communes is not None else load_communes(depts, communes_file)
    planned = len(communes) * len(queries)
    print(f"{len(communes)} communes x {len(queries)} requêtes = {planned} recherches (jusqu'à 3 pages chacune).")
    if dry_run:
        print("Dry-run : rien n'est envoyé.")
        return []
    rows, seen_ids, seen_phones, used = [], set(), set(), 0
    for dept, city in communes:
        for q in queries:
            if used >= max_requests:
                print(f"Plafond de {max_requests} requêtes atteint, arrêt.")
                break
            places, n = search_fn(api_key, f"{q} {city}")
            used += n
            for p in places:
                if p.get("businessStatus") not in (None, "OPERATIONAL"):
                    continue
                row = to_row(p, dept, city)
                ph = norm_phone(row["phone"])
                if not row["name"] or len(ph) < 9 or row["place_id"] in seen_ids or ph in seen_phones:
                    continue
                seen_ids.add(row["place_id"]); seen_phones.add(ph)
                rows.append(row)
        else:
            continue
        break
    rows.sort(key=lambda r: (-int(r["score"]), -int(r["reviews"] or 0)))
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=OUT_COLS, delimiter=";")
        w.writeheader(); w.writerows(rows)
    print(f"{len(rows)} fiches avec téléphone écrites dans {out_path} ({used} requêtes API).")
    return rows


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--depts", nargs="+", default=["78", "92", "95"])
    ap.add_argument("--queries", nargs="+", default=["plombier", "chauffagiste"])
    ap.add_argument("--out", default="plombiers.csv")
    ap.add_argument("--max-requests", type=int, default=400)
    ap.add_argument("--communes-file")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not key and not a.dry_run:
        sys.exit("GOOGLE_PLACES_API_KEY manquante (export GOOGLE_PLACES_API_KEY=...).")
    try:
        run(key, a.depts, a.queries, a.out, a.max_requests, a.dry_run, a.communes_file)
    except urllib.error.HTTPError as e:
        sys.exit(f"Erreur API {e.code} : {e.read().decode()[:300]}")
