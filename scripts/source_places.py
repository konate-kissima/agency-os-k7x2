#!/usr/bin/env python3
"""Ajoute des plombiers (Google Places) directement dans Agency OS, sans doublon.
Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_PLACES_KEY
Réglages  : DEPTS (défaut IDF), QUERIES (défaut « plombier »), MAX_REQUESTS (défaut 120 recherches Google),
            NEW_LIMIT (défaut 150 nouvelles fiches max par exécution), MAX_PAGES (défaut 2), COMMUNES_JSON (test hors ligne).
Chaque exécution reprend sur d'autres communes (rotation selon la date) et plafonne les requêtes : le coût est borné.
Dédoublonnage identique à l'application : téléphone normalisé, SIREN, nom+ville."""
import datetime, json, os, re, sys, time
import requests

SB = os.environ["SUPABASE_URL"].rstrip("/")
SK = os.environ["SUPABASE_SERVICE_KEY"]
GK = os.environ["GOOGLE_PLACES_KEY"]
PLACES = os.environ.get("PLACES_BASE", "https://places.googleapis.com").rstrip("/")
DEPTS = [d.strip() for d in os.environ.get("DEPTS", "75,77,78,91,92,93,94,95").split(",") if d.strip()]
QUERIES = [q.strip() for q in os.environ.get("QUERIES", "plombier").split(",") if q.strip()]
MAX_REQ = int(os.environ.get("MAX_REQUESTS", "120"))
NEW_LIMIT = int(os.environ.get("NEW_LIMIT", "150"))
MAX_PAGES = int(os.environ.get("MAX_PAGES", "2"))
H = {"apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json"}
FIELDS = ("places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,"
          "places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,nextPageToken")
BAD_SITES = ("facebook.com", "instagram.com", "linkedin.com", "pagesjaunes.fr", "business.site", "google.com", "mappy.com", "travaux.com",
             "habitatpresto.com", "quotatis.fr", "123devis.com", "houzz.fr")


def norm_phone(p):
    s = re.sub(r"[^\d+]", "", p or "")
    if s.startswith("+33"):
        s = "0" + s[3:]
    elif s.startswith("0033"):
        s = "0" + s[4:]
    return s


def dup_keys(d):
    k = []
    ph = norm_phone(d.get("phone"))
    if ph:
        k.append("t" + ph)
    if d.get("siren"):
        k.append("s" + str(d["siren"]))
    if d.get("name") and d.get("city"):
        k.append("n" + re.sub(r"[^a-z0-9]", "", str(d["name"]).lower()) + "|" + str(d["city"]).lower())
    return k


def existing_keys():
    keys, ids, off = set(), set(), 0
    while True:
        r = requests.get(SB + "/rest/v1/prospects", headers=H, params={"select": "id,data", "limit": "1000", "offset": str(off), "order": "id"}, timeout=40)
        r.raise_for_status()
        rows = r.json()
        for x in rows:
            ids.add(x["id"])
            if x["data"].get("stage") == "perdu" and x["data"].get("lostReason") == "Doublon":
                continue
            keys.update(dup_keys(x["data"]))
        if len(rows) < 1000:
            return keys, ids
        off += 1000


def load_communes():
    f = os.environ.get("COMMUNES_JSON")
    if f:
        return [tuple(x) for x in json.load(open(f, encoding="utf-8"))]
    out = []
    for d in DEPTS:
        r = requests.get(f"https://geo.api.gouv.fr/departements/{d}/communes", params={"fields": "nom,population", "format": "json"}, timeout=30)
        r.raise_for_status()
        for c in sorted(r.json(), key=lambda x: -(x.get("population") or 0)):
            out.append((d, c["nom"]))
    return out


def search(query):
    body = {"textQuery": query, "languageCode": "fr", "regionCode": "FR", "pageSize": 20}
    places, calls = [], 0
    for _ in range(MAX_PAGES):
        r = requests.post(PLACES + "/v1/places:searchText", json=body, timeout=30,
                          headers={"X-Goog-Api-Key": GK, "Content-Type": "application/json", "X-Goog-FieldMask": FIELDS})
        calls += 1
        if r.status_code != 200:
            print("  Places HTTP", r.status_code, r.text[:160])
            break
        j = r.json()
        places += j.get("places", [])
        tok = j.get("nextPageToken")
        if not tok:
            break
        body = {**body, "pageToken": tok}
        time.sleep(0.3)
    return places, calls


def score(p, phone):
    n, r = p.get("userRatingCount") or 0, p.get("rating") or 0
    s = min(30, n) + max(0, (r - 3.5)) * 20 + (10 if p.get("websiteUri") else 0) + (20 if phone else 0) + (15 if not re.match(r"^0[67]", phone) else 0)
    return int(min(100, 25 + s * 0.6))


def site_ok(u):
    host = re.sub(r"^https?://(www\.)?", "", (u or "").lower()).split("/")[0]
    return host and not any(host == b or host.endswith("." + b) for b in BAD_SITES)


def main():
    keys, ids = existing_keys()
    communes = load_communes()
    if not communes:
        sys.exit("Aucune commune.")
    per_day = max(1, MAX_REQ // max(1, len(QUERIES)))
    start = int(os.environ.get("START", datetime.date.today().toordinal() * per_day)) % len(communes)
    print(f"{len(keys)} clés existantes, {len(communes)} communes, départ à {start}")
    new, used, today = [], 0, time.strftime("%Y-%m-%d")
    for i in range(len(communes)):
        dept, city = communes[(start + i) % len(communes)]
        for q in QUERIES:
            if used >= MAX_REQ or len(new) >= NEW_LIMIT:
                break
            places, n = search(f"{q} {city}")
            used += n
            for p in places:
                if p.get("businessStatus") not in (None, "OPERATIONAL"):
                    continue
                name = (p.get("displayName") or {}).get("text", "").strip()
                phone = p.get("nationalPhoneNumber") or ""
                if not name or len(norm_phone(phone)) < 9:
                    continue
                cp = re.search(r"\b(\d{5})\b", p.get("formattedAddress") or "")
                if cp and not cp.group(1).startswith(dept):
                    continue
                pid = "g" + p["id"]
                d = {"name": name, "phone": phone, "website": p.get("websiteUri") if site_ok(p.get("websiteUri")) else "", "city": city, "dept": dept,
                     "address": p.get("formattedAddress", ""), "rating": p.get("rating"), "reviews": p.get("userRatingCount") or 0,
                     "maps_url": p.get("googleMapsUri", ""), "place_id": p["id"], "score": score(p, phone), "stage": "a_contacter",
                     "created": today, "source": "places", "enrich": "todo"}
                w = (p.get("websiteUri") or "").lower()
                if "facebook.com/" in w and not re.search(r"facebook\.com/(sharer|share|login|pages/?$)", w):
                    d["facebook"] = p["websiteUri"]
                elif "instagram.com/" in w:
                    d["instagram"] = p["websiteUri"]
                ks = dup_keys(d)
                if pid in ids or any(k in keys for k in ks):
                    continue
                ids.add(pid)
                keys.update(ks)
                new.append({"id": pid, "data": d})
                if len(new) >= NEW_LIMIT:
                    break
        if used >= MAX_REQ or len(new) >= NEW_LIMIT:
            break
    for i in range(0, len(new), 100):
        r = requests.post(SB + "/rest/v1/prospects", headers={**H, "Prefer": "resolution=ignore-duplicates,return=minimal"}, data=json.dumps(new[i:i + 100]), timeout=40)
        if r.status_code >= 300:
            sys.exit(f"Échec d'écriture {r.status_code} {r.text[:200]}")
    print(f"{len(new)} nouveaux plombiers ajoutés ({used} recherches Google).")


if __name__ == "__main__":
    main()
