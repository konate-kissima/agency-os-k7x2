#!/usr/bin/env python3
"""Enrichit les fiches Agency OS : avis/téléphone/site (Google Places) puis Instagram/Facebook/email (site de l'entreprise).
Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_PLACES_KEY (facultative), LIMIT (défaut 100).
Ne contourne aucune protection : respecte robots.txt, 1 requête à la fois, délai entre sites."""
import os, re, sys, time, json, urllib.parse, urllib.robotparser
import requests

SB = os.environ["SUPABASE_URL"].rstrip("/")
SK = os.environ["SUPABASE_SERVICE_KEY"]
GK = os.environ.get("GOOGLE_PLACES_KEY", "")
PLACES = os.environ.get("PLACES_BASE", "https://places.googleapis.com").rstrip("/")
LIMIT = int(os.environ.get("LIMIT", "100"))
PAUSE = float(os.environ.get("PAUSE", "1.0"))
H = {"apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json"}
UA = "Mozilla/5.0 (compatible; AgencyOSBot/1.0; +enrichissement de fiches B2B)"
BAD_IG = {"p", "reel", "reels", "explore", "accounts", "stories", "tv", "about", "legal", "direct"}
BAD_FB = {"sharer", "sharer.php", "share", "share.php", "dialog", "tr", "plugins", "login", "policies", "privacy", "groups", "events", "watch", "hashtag", "ads", "business", "help", "pages", "photo", "photo.php", "permalink.php"}


# Annuaires, réseaux et portails : leur site n'est pas celui de l'entreprise, leurs liens sociaux ne lui appartiennent pas
BAD_SITES = ("qualit-enr.org", "qualibat.com", "qualifelec.fr", "qualigaz.com", "france-renov.gouv.fr", "faire.gouv.fr", "ademe.fr", "pagesjaunes.fr",
             "societe.com", "pappers.fr", "facebook.com", "instagram.com", "linkedin.com", "google.com", "google.fr", "business.site", "mappy.com",
             "houzz.fr", "habitatpresto.com", "travaux.com", "quotatis.fr", "123devis.com", "lesentreprises.fr", "verif.com", "infogreffe.fr", "annuaire-entreprises.data.gouv.fr")
BAD_HANDLES = {"qualitenr", "ouiauxenergiesrenouvelables", "qualibat", "qualifelec", "qualigaz", "ademe", "faire", "wix", "wordpress", "elementor", "squarespace", "jimdo", "webador"}


def bad_site(url):
    host = urllib.parse.urlparse(url if re.match(r"https?://", url or "") else "https://" + (url or "")).netloc.lower()
    return not host or any(host == b or host.endswith("." + b) for b in BAD_SITES)


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def tokens(s):
    stop = {"sarl", "sas", "eurl", "sasu", "ste", "societe", "entreprise", "ets", "et", "de", "la", "le", "les", "des", "du"}
    return {t for t in re.findall(r"[a-z0-9]{3,}", (s or "").lower()) if t not in stop}


def get_todo():
    q = {"select": "id,data", "limit": str(LIMIT), "data->>enrichedAt": "is.null", "data->>optout": "is.null"}
    r = requests.get(SB + "/rest/v1/prospects", headers=H, params=q, timeout=30)
    r.raise_for_status()
    rows = [x for x in r.json() if x["data"].get("stage") not in ("perdu", "stop")]
    rows.sort(key=lambda x: -(x["data"].get("score") or 0))
    return rows


def places_lookup(d):
    if not GK:
        return {}
    text = f'{d.get("name","")} {d.get("city","")}'.strip()
    r = requests.post(PLACES + "/v1/places:searchText", timeout=20, json={"textQuery": text, "languageCode": "fr", "regionCode": "FR", "maxResultCount": 3},
                      headers={"X-Goog-Api-Key": GK, "Content-Type": "application/json",
                               "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri"})
    if r.status_code != 200:
        print("  Places HTTP", r.status_code, r.text[:120]); return {}
    want = tokens(d.get("name"))
    for p in r.json().get("places", []):
        got = tokens((p.get("displayName") or {}).get("text"))
        if want and got and len(want & got) / max(1, min(len(want), len(got))) >= 0.5:
            return {"rating": p.get("rating"), "reviews": p.get("userRatingCount"), "gphone": p.get("nationalPhoneNumber"),
                    "gsite": p.get("websiteUri"), "maps_url": p.get("googleMapsUri"), "place_id": p.get("id")}
    return {}


def allowed(url):
    try:
        u = urllib.parse.urlparse(url)
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(requests.get(f"{u.scheme}://{u.netloc}/robots.txt", headers={"User-Agent": UA}, timeout=6).text.splitlines())
        return rp.can_fetch(UA, url)
    except Exception:
        return True


def crawl(site):
    out = {}
    if not site or bad_site(site):
        return out
    if not re.match(r"https?://", site):
        site = "https://" + site
    base = site.rstrip("/")
    for path in ("", "/contact"):
        url = base + path
        try:
            if not allowed(url):
                continue
            r = requests.get(url, headers={"User-Agent": UA}, timeout=8)
            if r.status_code != 200 or "text" not in r.headers.get("content-type", ""):
                continue
            html = r.text[:400000]
        except Exception:
            continue
        for m in re.finditer(r"https?://(?:www\.)?instagram\.com/([A-Za-z0-9_.]{2,30})/?", html):
            if m.group(1).lower() not in BAD_IG and m.group(1).lower() not in BAD_HANDLES and "instagram" not in out:
                out["instagram"] = "https://instagram.com/" + m.group(1)
        for m in re.finditer(r"https?://(?:www\.|fr-fr\.)?facebook\.com/([A-Za-z0-9_.\-]{3,80})/?(?:[\"'?<\s]|$)", html):
            if m.group(1).lower() not in BAD_FB and m.group(1).lower() not in BAD_HANDLES and "facebook" not in out:
                out["facebook"] = "https://facebook.com/" + m.group(1)
        for m in re.finditer(r"https?://(?:[a-z]+\.)?linkedin\.com/(company/[A-Za-z0-9_\-%]+)", html):
            out.setdefault("linkedin", "https://linkedin.com/" + m.group(1))
        for m in re.finditer(r"mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[a-z]{2,})", html):
            e = m.group(1).lower()
            if not re.search(r"(sentry|wixpress|example|domain)\.", e):
                out.setdefault("email", e)
        if "instagram" in out and "facebook" in out:
            break
        time.sleep(0.4)
    return out


def main():
    rows = get_todo()
    print(len(rows), "fiches à enrichir")
    done = 0
    for x in rows:
        d, pid = x["data"], x["id"]
        patch = {}
        g = places_lookup(d)
        if g.get("rating") is not None:
            patch["rating"], patch["reviews"] = g["rating"], g.get("reviews") or 0
        for k in ("maps_url", "place_id"):
            if g.get(k): patch[k] = g[k]
        if g.get("gphone") and not d.get("phone"):
            patch["phone"] = g["gphone"]
        site = d.get("website") or ""
        if (not site or bad_site(site)) and g.get("gsite") and not bad_site(g["gsite"]):
            site = g["gsite"]; patch["website"] = site
        c = crawl(site)
        for k in ("instagram", "facebook", "linkedin", "email"):
            if c.get(k) and not d.get(k):
                patch[k] = c[k]
        patch["enrichedAt"] = time.strftime("%Y-%m-%d")
        patch["enrich"] = "done"
        merged = {**d, **patch}
        merged["score"] = (d.get("score") or 40) + (15 if patch.get("instagram") else 0) + (8 if patch.get("facebook") else 0) + (5 if patch.get("rating") and patch["rating"] >= 4.5 else 0)
        r = requests.patch(SB + "/rest/v1/prospects", headers={**H, "Prefer": "return=minimal"}, params={"id": "eq." + pid},
                           data=json.dumps({"data": merged}), timeout=30)
        if r.status_code >= 300:
            print("  échec écriture", pid, r.status_code, r.text[:120]); continue
        done += 1
        print(f'ok {d.get("name")}: ' + ", ".join(k for k in patch if k not in ("enrichedAt", "enrich")))
        time.sleep(PAUSE)
    print(done, "fiches enrichies")


if __name__ == "__main__":
    main()
