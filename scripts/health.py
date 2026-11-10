#!/usr/bin/env python3
"""Contrôle de santé nocturne d'Agency OS : incohérences dans les fiches, sauvegarde du jour, enrichissement.
Sort en erreur (code 1) si un point grave est trouvé : GitHub envoie alors un e-mail."""
import os, re, sys, datetime
import requests

SB = os.environ["SUPABASE_URL"].rstrip("/"); SK = os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": SK, "Authorization": "Bearer " + SK}


def get(table, select, extra=None):
    out, off = [], 0
    while True:
        p = {"select": select, "order": "id", "limit": "1000", "offset": str(off)}; p.update(extra or {})
        r = requests.get(f"{SB}/rest/v1/{table}", headers=H, params=p, timeout=60); r.raise_for_status()
        page = r.json(); out += page
        if len(page) < 1000:
            return out
        off += 1000


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    now_paris = (now + datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")
    P = [x for x in get("prospects", "id,data") if x["data"].get("source") != "demo" and not x["data"].get("optout")]
    grave, info = [], []
    act = [x for x in P if x["data"].get("stage") in ("a_contacter", "contacte")]
    od = [x["data"].get("name") for x in P if x["data"].get("stage") == "rdv" and (x["data"].get("rdvAt") or "9") < (now - datetime.timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M") and not x["data"].get("rdvShow")]
    if od: grave.append(f"{len(od)} RDV passé(s) sans suite : {', '.join(od[:5])}")
    nr = [x["data"].get("name") for x in P if x["data"].get("stage") == "rdv" and not x["data"].get("rdvAt")]
    if nr: grave.append(f"{len(nr)} fiche(s) en RDV sans date : {', '.join(nr[:5])}")
    fut = [x["data"].get("name") for x in P if x["data"].get("stage") == "contacte" and x["data"].get("rdvAt") and not x["data"].get("rdvShow") and (x["data"].get("rdvType") or "visio") != "tel" and x["data"]["rdvAt"] >= now_paris]
    if fut: grave.append(f"{len(fut)} fiche(s) avec RDV à venir remises en rappel : {', '.join(fut[:5])}")
    lost = {x["data"].get("siren") for x in P if x["data"].get("stage") == "perdu" and x["data"].get("siren") and not re.search(r"injoignable|raccroch|doublon|num[ée]ro", x["data"].get("lostReason") or "", re.I)}
    sib = [x["data"].get("name") for x in act if x["data"].get("siren") in lost]
    if sib: info.append(f"{len(sib)} fiche(s) d'une entreprise déjà écartée encore dans la file")
    nn = [1 for x in P if x["data"].get("stage") == "contacte" and not x["data"].get("nextDate")]
    if nn: info.append(f"{len(nn)} rappel(s) sans date")
    seen, dp = set(), 0
    for x in act:
        t = re.sub(r"\D", "", x["data"].get("phone") or "")[-9:]
        if len(t) >= 9:
            dp += t in seen; seen.add(t)
    if dp: info.append(f"{dp} numéro(s) en double dans la file")
    # sauvegarde du jour
    today = now.strftime("%Y-%m-%d")
    sv = requests.get(f"{SB}/rest/v1/sauvegardes", headers=H, params={"select": "tbl,n", "jour": "eq." + today}, timeout=30)
    if sv.status_code != 200 or not sv.json():
        yest = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        sv2 = requests.get(f"{SB}/rest/v1/sauvegardes", headers=H, params={"select": "tbl", "jour": "eq." + yest}, timeout=30)
        if sv2.status_code != 200 or not sv2.json(): grave.append("aucune sauvegarde aujourd'hui ni hier")
    # enrichissement : fiches actives sans enrichissement
    ne = [1 for x in act if not x["data"].get("enrichedAt")]
    if len(ne) > 1500: info.append(f"{len(ne)} fiches actives pas encore enrichies")
    print("Fiches lues :", len(P), "| actives :", len(act))
    for g in grave: print("GRAVE :", g)
    for i in info: print("info :", i)
    if not grave and not info: print("Rien à signaler.")
    sys.exit(1 if grave else 0)


if __name__ == "__main__":
    main()
