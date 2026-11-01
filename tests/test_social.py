import json, os, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
DB = {"b1": {"name": "Alpha Plomberie", "city": "Poissy", "website": "", "stage": "a_contacter", "score": 50, "enrich": "done", "enrichedAt": "2026-10-01"},
      "b2": {"name": "Beta Chauffage", "city": "Triel", "website": "", "stage": "a_contacter", "score": 40, "enrich": "done", "enrichedAt": "2026-10-01"},
      "b3": {"name": "Gamma Sanitaire", "city": "Meulan", "website": "", "stage": "a_contacter", "score": 30, "enrich": "done", "enrichedAt": "2026-10-01"},
      "b4": {"name": "Deja Reseau", "city": "Paris", "website": "http://x", "instagram": "https://instagram.com/deja", "stage": "a_contacter", "enrich": "done"},
      "b5": {"name": "Perdu", "stage": "perdu", "website": "http://x"},
      "b6": {"name": "Site Facebook", "city": "Elancourt", "website": "https://www.facebook.com/plomberie.elancourt", "stage": "a_contacter", "score": 20, "enrich": "done"}}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ct="application/json"):
        b = body.encode() if isinstance(body, str) else json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", ct); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = self.path
        if p.startswith("/rest/v1/prospects"):
            return self._send(200, [{"id": k, "data": v} for k, v in DB.items() if "socialAt" not in v])
        if p == "/robots.txt": return self._send(404, "", "text/plain")
        if p in ("/a", "/a/"): return self._send(200, '<a href="//www.instagram.com/alpha_plomb/">ig</a><a href="https:\\/\\/m.facebook.com\\/alphaplomberie78\\/">fb</a>', "text/html")
        if p in ("/b", "/b/"): return self._send(200, "<p>accueil sans lien</p>", "text/html")
        if p == "/b/mentions-legales": return self._send(200, '<a href="https://www.facebook.com/profile.php?id=100012345678901">page</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">partage</a>', "text/html")
        if p in ("/c", "/c/"): return self._send(200, '<a href="https://www.facebook.com/pages/Gamma-Sanitaire/123456789">page</a>', "text/html")
        self._send(404, "", "text/html")
    def do_PATCH(self):
        n = int(self.headers.get("Content-Length", 0)); body = json.loads(self.rfile.read(n))
        pid = self.path.split("eq.")[1]; DB[pid] = body["data"]; self._send(204, "")
srv = HTTPServer(("127.0.0.1", 0), H); PORT = srv.server_port
DB["b1"]["website"] = f"http://127.0.0.1:{PORT}/a"; DB["b2"]["website"] = f"http://127.0.0.1:{PORT}/b"; DB["b3"]["website"] = f"http://127.0.0.1:{PORT}/c"
threading.Thread(target=srv.serve_forever, daemon=True).start()
env = {**os.environ, "SUPABASE_URL": f"http://127.0.0.1:{PORT}", "SUPABASE_SERVICE_KEY": "k", "MODE": "social", "PAUSE": "0", "NO_PROXY": "127.0.0.1", "no_proxy": "127.0.0.1"}
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "../scripts/enrich.py")], env=env, capture_output=True, text=True)
print(r.stdout, r.stderr)
bad = 0
def ok(c, m):
    global bad
    print("ok  " if c else "FAIL", m); bad += 0 if c else 1
ok(DB["b1"].get("instagram") == "https://instagram.com/alpha_plomb" and DB["b1"].get("facebook") == "https://facebook.com/alphaplomberie78", "liens sans protocole et échappés (//, m.facebook.com, \\/)")
ok(DB["b2"].get("facebook") == "https://facebook.com/profile.php?id=100012345678901", "profil Facebook par identifiant, trouvé sur la page mentions légales; lien de partage ignoré")
ok(DB["b3"].get("facebook") == "https://facebook.com/pages/Gamma-Sanitaire/123456789", "page Facebook de type /pages/Nom/ID")
ok(DB["b6"].get("facebook") == "https://facebook.com/plomberie.elancourt", "site = page Facebook → enregistré comme Facebook")
ok(DB["b4"].get("socialAt") is None and DB["b5"].get("socialAt") is None, "fiche avec réseau ou perdue non touchée")
ok(all(DB[k].get("socialAt") for k in ("b1", "b2", "b3", "b6")) and DB["b1"].get("enrichedAt") == "2026-10-01", "date de passage enregistrée, enrichissement d'origine conservé")
sys.exit(bad)
