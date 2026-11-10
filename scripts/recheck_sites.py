#!/usr/bin/env python3
"""Revérifie les sites réapparus après un audit (fiches avec « site_douteux » ET un site) : garde le site s'il est prouvé, sinon le retire.
DRY=1 : rapport seulement."""
import os, sys, time
import requests
import enrich as E

DRY = os.environ.get("DRY", "1") == "1"


def rows():
    out, off = [], 0
    while True:
        r = requests.get(E.SB + "/rest/v1/prospects", headers=E.H, params={"select": "id,data", "order": "id", "limit": "1000", "offset": str(off)}, timeout=60)
        r.raise_for_status()
        page = r.json(); out += page
        if len(page) < 1000:
            return out
        off += 1000


def main():
    todo = [x for x in rows() if x["data"].get("site_douteux") and x["data"].get("website")]
    print(len(todo), "fiches à revérifier", "(DRY)" if DRY else "(ÉCRITURE)")
    kept = removed = 0
    for x in todo:
        d = x["data"]; site = d["website"]
        ok = (not E.bad_site(site)) and E.site_confirmed(d, site)
        print(("GARDÉ   " if ok else "RETIRÉ  ") + f'{d.get("name")} -> {site}')
        if ok:
            kept += 1; patch = {"site_verifie": site}
        else:
            removed += 1; patch = {"website": "", "audit": "site_faux", "site_douteux": d.get("site_douteux") or site}
            for k in ("instagram", "facebook", "linkedin"):
                patch[k] = ""
        if not DRY:
            r = requests.patch(E.SB + "/rest/v1/prospects", headers={**E.H, "Prefer": "return=minimal"}, params={"id": "eq." + x["id"]}, json={"data": {**d, **patch}}, timeout=30)
            r.raise_for_status()
        time.sleep(0.2)
    print({"gardes": kept, "retires": removed})


if __name__ == "__main__":
    main()
