#!/usr/bin/env python3
"""Enrichit les fiches Agency OS : avis/téléphone/site (Google Places) puis Instagram/Facebook/email (site de l'entreprise).
Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_PLACES_KEY (facultative), LIMIT (défaut 100), MODE=social (repasse sur les fiches sans Instagram/Facebook), MODE=company (année de création, secteur NAF, effectif via l'annuaire officiel).
Ne contourne aucune protection : respecte robots.txt, 1 requête à la fois, délai entre sites."""
import os, re, sys, time, json, urllib.parse, urllib.robotparser
import requests

SB = os.environ["SUPABASE_URL"].rstrip("/")
SK = os.environ["SUPABASE_SERVICE_KEY"]
GK = os.environ.get("GOOGLE_PLACES_KEY", "")
PLACES = os.environ.get("PLACES_BASE", "https://places.googleapis.com").rstrip("/")
LIMIT = int(os.environ.get("LIMIT", "100"))
MODE = os.environ.get("MODE", "")  # "social" : repasse sur les fiches sans Instagram ni Facebook pour chercher leurs réseaux
GOUV = os.environ.get("GOUV_BASE", "https://recherche-entreprises.api.gouv.fr").rstrip("/")
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
    if MODE == "company":
        rows, off = [], 0
        while True:
            q = {"select": "id,data", "limit": "1000", "offset": str(off), "order": "id", "data->>companyAt": "is.null", "data->>optout": "is.null"}
            r = requests.get(SB + "/rest/v1/prospects", headers=H, params=q, timeout=40)
            r.raise_for_status()
            page = r.json()
            rows += [x for x in page if x["data"].get("stage") not in ("perdu", "stop") and not (x["data"].get("created_co") and x["data"].get("naf"))]
            if len(page) < 1000:
                break
            off += 1000
        rows.sort(key=lambda x: -(x["data"].get("score") or 0))
        return rows[:LIMIT]
    if MODE == "social":
        rows, off = [], 0
        while True:
            q = {"select": "id,data", "limit": "1000", "offset": str(off), "order": "id", "data->>socialAt": "is.null", "data->>optout": "is.null"}
            r = requests.get(SB + "/rest/v1/prospects", headers=H, params=q, timeout=40)
            r.raise_for_status()
            page = r.json()
            rows += [x for x in page if x["data"].get("stage") not in ("perdu", "stop") and not x["data"].get("instagram") and not x["data"].get("facebook")]
            if len(page) < 1000:
                break
            off += 1000
        rows.sort(key=lambda x: -(x["data"].get("score") or 0))
        return rows[:LIMIT]
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


def clean_url(u):
    return re.sub(r"\\u002[Ff]|\\/", "/", u or "")


def find_ig(html):
    for m in re.finditer(r"(?:https?:)?//(?:www\.)?instagram\.com/([A-Za-z0-9_.]{2,30})(?=[/\"'?<>\s\\)&#]|$)", html):
        h = m.group(1)
        if h.lower() not in BAD_IG and h.lower() not in BAD_HANDLES:
            return "https://instagram.com/" + h
    return ""


def find_fb(html):
    for m in re.finditer(r"(?:https?:)?//(?:www\.|m\.|fr-fr\.|web\.)?facebook\.com/([^\"'\s<>\\)#]{3,160})", html):
        raw = m.group(1)
        if raw.lower().startswith("profile.php"):
            i = re.search(r"id=(\d{5,})", raw)
            if i:
                return "https://facebook.com/profile.php?id=" + i.group(1)
            continue
        parts = [x for x in raw.split("?")[0].split("/") if x]
        if not parts:
            continue
        first = parts[0].lower()
        if first in ("pages", "people") and len(parts) >= 3:
            return "https://facebook.com/" + "/".join(parts[:3])
        if first in BAD_FB or first in BAD_HANDLES or not re.match(r"^[A-Za-z0-9_.\-]{3,80}$", parts[0]):
            continue
        return "https://facebook.com/" + parts[0]
    return ""


def social_from_url(url):
    """Si le « site » est en fait une page Facebook ou Instagram, c'est le réseau de l'entreprise."""
    host = urllib.parse.urlparse(url if re.match(r"https?://", url or "") else "https://" + (url or "")).netloc.lower()
    if host.endswith("facebook.com"):
        f = find_fb(url if url.startswith("http") else "https://" + url)
        return {"facebook": f} if f else {}
    if host.endswith("instagram.com"):
        i = find_ig(url if url.startswith("http") else "https://" + url)
        return {"instagram": i} if i else {}
    return {}


PATHS = ("", "/contact", "/contact-us", "/nous-contacter", "/mentions-legales", "/a-propos", "/qui-sommes-nous")


def crawl(site):
    out = {}
    if not site or bad_site(site):
        return out
    if not re.match(r"https?://", site):
        site = "https://" + site
    base = site.rstrip("/")
    for path in PATHS:
        url = base + path
        try:
            if not allowed(url):
                continue
            r = requests.get(url, headers={"User-Agent": UA}, timeout=8)
            if r.status_code != 200 or "text" not in r.headers.get("content-type", ""):
                continue
            html = clean_url(r.text[:600000])
        except Exception:
            continue
        if "instagram" not in out:
            i = find_ig(html)
            if i:
                out["instagram"] = i
        if "facebook" not in out:
            f = find_fb(html)
            if f:
                out["facebook"] = f
        for m in re.finditer(r"https?://(?:[a-z]+\.)?linkedin\.com/(company/[A-Za-z0-9_\-%]+)", html):
            out.setdefault("linkedin", "https://linkedin.com/" + m.group(1))
        for m in re.finditer(r"mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[a-z]{2,})", html):
            e = m.group(1).lower()
            if not re.search(r"(sentry|wixpress|example|domain)\.", e):
                out.setdefault("email", e)
        if "instagram" in out and "facebook" in out:
            break
        time.sleep(0.3)
    return out


def company_lookup(d):
    """Annuaire officiel (gratuit) : année de création, activité (NAF), effectif. Rapprochement par SIREN, sinon par nom + ville/département."""
    params = {"per_page": "5", "etat_administratif": "A"}
    if d.get("siren"):
        params["q"] = d["siren"]
    else:
        params["q"] = d.get("name") or ""
        cp = re.search(r"\b(\d{5})\b", d.get("address") or "")
        if cp:
            params["code_postal"] = cp.group(1)
        elif d.get("dept"):
            params["departement"] = str(d["dept"])
    r = requests.get(GOUV + "/search", params=params, headers={"User-Agent": UA}, timeout=20)
    if r.status_code != 200:
        print("  Annuaire HTTP", r.status_code); return None
    want, city = tokens(d.get("name")), norm(d.get("city"))
    for x in r.json().get("results", []):
        if d.get("siren"):
            if str(x.get("siren")) != str(d["siren"]):
                continue
        else:
            got = tokens(x.get("nom_complet")) | tokens(x.get("nom_raison_sociale"))
            sg = x.get("siege") or {}
            if not (want and got and len(want & got) / max(1, min(len(want), len(got))) >= 0.5):
                continue
            if city and norm(sg.get("libelle_commune")) != city and not params.get("departement") and not params.get("code_postal"):
                continue
        out = {"siren": str(x.get("siren") or ""), "created_co": x.get("date_creation") or "", "naf": x.get("activite_principale") or "",
               "effectif": x.get("tranche_effectif_salarie") or "", "legal": str(x.get("nature_juridique") or "")}
        dirs = [z for z in (x.get("dirigeants") or []) if z.get("prenoms") and z.get("nom")]
        if dirs:
            out["dirigeant"] = (str(dirs[0]["prenoms"]).split()[0].split(",")[0].title() + " " + str(dirs[0]["nom"]).title())
        return {k: v for k, v in out.items() if v}
    return {}


def main_company():
    rows = get_todo()
    print(len(rows), "fiches à compléter (annuaire officiel)")
    done = 0
    for x in rows:
        d, pid = x["data"], x["id"]
        try:
            c = company_lookup(d)
        except Exception as e:
            print("  erreur", d.get("name"), str(e)[:80]); continue
        if c is None:
            continue
        patch = {k: v for k, v in c.items() if v and not d.get(k)}
        patch["companyAt"] = time.strftime("%Y-%m-%d")
        patch["companyFound"] = bool(c)
        merged = {**d, **patch}
        yr = int(str(patch.get("created_co") or "0")[:4] or 0)
        if yr and yr >= int(time.strftime("%Y")) - 2 and not d.get("created_co"):
            merged["score"] = (d.get("score") or 40) + 10
        r = requests.patch(SB + "/rest/v1/prospects", headers={**H, "Prefer": "return=minimal"}, params={"id": "eq." + pid},
                           data=json.dumps({"data": merged}), timeout=30)
        if r.status_code >= 300:
            print("  échec écriture", pid, r.status_code, r.text[:120]); continue
        done += 1
        print(f'ok {d.get("name")}: ' + (", ".join(k for k in patch if k not in ("companyAt", "companyFound")) or "introuvable"))
        time.sleep(PAUSE)
    print(done, "fiches complétées")


def main():
    if MODE == "company":
        return main_company()
    rows = get_todo()
    print(len(rows), "fiches à enrichir")
    done = 0
    for x in rows:
        d, pid = x["data"], x["id"]
        patch = {}
        g = {} if (MODE == "social" and d.get("website")) else places_lookup(d)
        if g.get("rating") is not None:
            patch["rating"], patch["reviews"] = g["rating"], g.get("reviews") or 0
        for k in ("maps_url", "place_id"):
            if g.get(k): patch[k] = g[k]
        if g.get("gphone") and not d.get("phone"):
            patch["phone"] = g["gphone"]
        site = d.get("website") or ""
        c = {}
        for u in (d.get("website"), g.get("gsite")):
            for k, v in social_from_url(u or "").items():
                c.setdefault(k, v)
        if (not site or bad_site(site)) and g.get("gsite") and not bad_site(g["gsite"]):
            site = g["gsite"]; patch["website"] = site
        for k, v in crawl(site).items():
            c.setdefault(k, v)
        for k in ("instagram", "facebook", "linkedin", "email"):
            if c.get(k) and not d.get(k):
                patch[k] = c[k]
        patch["socialAt"] = time.strftime("%Y-%m-%d")
        if MODE != "social":
            patch["enrichedAt"] = time.strftime("%Y-%m-%d")
            patch["enrich"] = "done"
        merged = {**d, **patch}
        merged["score"] = (d.get("score") or 40) + (15 if patch.get("instagram") else 0) + (8 if patch.get("facebook") else 0) + (5 if patch.get("rating") and patch["rating"] >= 4.5 else 0)
        r = requests.patch(SB + "/rest/v1/prospects", headers={**H, "Prefer": "return=minimal"}, params={"id": "eq." + pid},
                           data=json.dumps({"data": merged}), timeout=30)
        if r.status_code >= 300:
            print("  échec écriture", pid, r.status_code, r.text[:120]); continue
        done += 1
        print(f'ok {d.get("name")}: ' + ", ".join(k for k in patch if k not in ("enrichedAt", "enrich", "socialAt")))
        time.sleep(PAUSE)
    print(done, "fiches enrichies")


if __name__ == "__main__":
    main()
