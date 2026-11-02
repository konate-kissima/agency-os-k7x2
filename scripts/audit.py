#!/usr/bin/env python3
"""Audit des fiches : retire les données Google/site/réseaux qui ne correspondent pas à l'entreprise, nettoie les dirigeants.
DRY=1 : rapport seulement. RECHECK=1 : relit le dirigeant (gérant/président) dans l'annuaire officiel pour chaque SIREN.
Ne tourne jamais en même temps qu'un enrichissement (les deux réécrivent les fiches)."""
import os, re, json, time, urllib.parse
import requests
os.environ.setdefault("SUPABASE_URL", ""); os.environ.setdefault("SUPABASE_SERVICE_KEY", "")
import enrich as E

DRY = os.environ.get("DRY", "1") == "1"
RECHECK = os.environ.get("RECHECK", "0") == "1"
SB, H = E.SB, E.H


def host_core(url):
    h = urllib.parse.urlparse(url if re.match(r"https?://", url or "") else "https://" + (url or "")).netloc.lower()
    h = re.sub(r"^www\.", "", h)
    return h, re.sub(r"[^a-z0-9]", "", h.rsplit(".", 1)[0]) if "." in h else re.sub(r"[^a-z0-9]", "", h)


def site_matches(d):
    site = d.get("website") or ""
    host, core = host_core(site)
    if not host or "." not in host:
        return False
    nm = E.norm(d.get("name"))
    s = [t for t in E.sig(d.get("name")) if len(t) >= 4]
    if s:
        return any(t in core for t in s) or (len(core) >= 4 and core in nm)
    return (len(core) >= 4 and (core in nm or nm in core)) or (len(nm) >= 4 and nm in core)


def verify_site(d):
    """Le nom de domaine ne ressemble pas au nom : on lit le site (accueil, contact, mentions légales) et on cherche le SIREN, le téléphone ou un mot distinctif du nom."""
    site = d.get("website") or ""
    base = site if re.match(r"https?://", site) else "https://" + site
    base = base.rstrip("/")
    siren, tel = re.sub(r"\D", "", d.get("siren") or ""), E.digits(d.get("phone"))
    toks = [t for t in E.sig(d.get("name")) if len(t) >= 4]
    nm = E.norm(d.get("name"))
    for path in ("", "/contact", "/mentions-legales", "/mentions-legales/"):
        url = base + path
        try:
            if not E.allowed(url):
                continue
            r = requests.get(url, headers={"User-Agent": E.UA}, timeout=8)
            if r.status_code != 200 or "text" not in r.headers.get("content-type", ""):
                continue
            txt = r.text[:400000].lower()
        except Exception:
            continue
        dg = re.sub(r"\D", "", txt)
        if (len(siren) == 9 and siren in dg) or (len(tel) >= 9 and tel in dg):
            return True
        flat = re.sub(r"[^a-z0-9]", "", txt)
        if toks and any(t in flat for t in toks):
            return True
        if not toks and len(nm) >= 8 and nm in flat:
            return True
        time.sleep(0.3)
    return False


def all_rows():
    rows, off = [], 0
    while True:
        r = requests.get(SB + "/rest/v1/prospects", headers=H, params={"select": "id,data", "order": "id", "limit": "1000", "offset": str(off)}, timeout=60)
        r.raise_for_status()
        page = r.json(); rows += page
        if len(page) < 1000:
            return rows
        off += 1000


def dirigeant_for(siren):
    r = requests.get(E.GOUV + "/search", params={"q": siren, "per_page": "3"}, headers={"User-Agent": E.UA}, timeout=20)
    if r.status_code != 200:
        return None
    for x in r.json().get("results", []):
        if str(x.get("siren")) == str(siren):
            return E.best_dirigeant(x.get("dirigeants") or [])
    return ("", "")


PLACE = ("rating", "reviews", "gphone", "gsite", "maps_url", "place_id", "website", "instagram", "facebook", "linkedin")


def main():
    rows = all_rows()
    print(len(rows), "fiches lues", "(DRY)" if DRY else "(ÉCRITURE)")
    by_place = {}
    for x in rows:
        pid = x["data"].get("place_id")
        if pid:
            by_place.setdefault(pid, set()).add(x["data"].get("siren") or x["id"])
    st = {"annuaire": 0, "site_faux": 0, "place_partagee": 0, "dir_nettoye": 0, "dir_maj": 0, "ecrites": 0}
    samples = []
    for i, x in enumerate(rows):
        d, pid = x["data"], x["id"]
        new = dict(d)
        site = d.get("website") or ""
        if site and E.bad_site(site):
            new["annuaire_url"] = site; new["website"] = ""; st["annuaire"] += 1
            site = ""
        bad = ""
        if site and not site_matches(d) and not verify_site(d):
            bad = "site_faux"
        elif d.get("place_id") and len(by_place.get(d["place_id"], ())) > 1:
            bad = "place_partagee"
        if bad:
            st[bad] += 1
            if len(samples) < 25:
                samples.append(f'{bad}: {d.get("name")} -> {site or d.get("place_id")}')
            lost = 0
            if d.get("instagram"): lost += 15
            if d.get("facebook"): lost += 8
            try:
                if float(d.get("rating") or 0) >= 4.5: lost += 5
            except Exception:
                pass
            if site:
                new["site_douteux"] = site
            for k in PLACE:
                new.pop(k, None)
            for k in ("enrichedAt", "enrich", "socialAt"):
                new.pop(k, None)
            try:
                if lost and d.get("score"):
                    new["score"] = max(0, float(d["score"]) - lost)
                    new["score"] = int(new["score"]) if new["score"] == int(new["score"]) else new["score"]
            except Exception:
                pass
            new["audit"] = bad
        if "(démo)" in str(d.get("name")) and d.get("stage") not in ("perdu", "stop"):
            new["stage"] = "perdu"; new["lostReason"] = "Fiche de démonstration"
        dg = new.get("dirigeant")
        if dg and re.search(r"\s*\([^)]*\)\s*$", dg):
            new["dirigeant"] = re.sub(r"\s*\([^)]*\)\s*$", "", dg).strip(); st["dir_nettoye"] += 1
        if RECHECK and d.get("siren"):
            try:
                res = dirigeant_for(d["siren"])
            except Exception as e:
                res = None
            if res and res[0] and (res[0] != new.get("dirigeant") or res[1] != new.get("dirigeant_role")):
                if res[0] != new.get("dirigeant") and len(samples) < 40:
                    samples.append(f'dirigeant: {d.get("name")}: {new.get("dirigeant")} -> {res[0]} ({res[1]})')
                new["dirigeant"], new["dirigeant_role"] = res
                st["dir_maj"] += 1
            time.sleep(0.15)
        if new != d:
            if not DRY:
                r = requests.patch(SB + "/rest/v1/prospects", headers={**H, "Prefer": "return=minimal"}, params={"id": "eq." + pid}, data=json.dumps({"data": new}), timeout=30)
                if r.status_code >= 300:
                    print("  échec", pid, r.status_code); continue
            st["ecrites"] += 1
    print(json.dumps(st, ensure_ascii=False))
    print("\n".join(samples))


if __name__ == "__main__":
    main()
