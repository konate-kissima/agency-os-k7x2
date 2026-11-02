import json, os, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
DB = {"a1": {"name": "Dupont Chauffage", "city": "Poissy", "address": "5 rue A 78300", "dept": "78", "phone": "01 39 11 22 33", "website": "", "stage": "a_contacter", "score": 50},
      "a2": {"name": "Martin Sarl", "city": "Triel", "phone": "", "website": "http://127.0.0.1:PORT/site", "stage": "a_contacter", "score": 60},
      "a3": {"name": "Perdu", "stage": "perdu"},
      "a4": {"name": "Zzz Annuaire", "city": "Paris", "phone": "01", "website": "https://www.qualit-enr.org/entreprises/x", "stage": "a_contacter", "score": 10}}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ct="application/json"):
        b = body.encode() if isinstance(body, str) else json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", ct); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path.startswith("/rest/v1/prospects"):
            rows = [{"id": k, "data": v} for k, v in DB.items() if "enrichedAt" not in v]
            return self._send(200, rows)
        if self.path == "/robots.txt": return self._send(404, "", "text/plain")
        if self.path.startswith("/site"):
            return self._send(200, '<a href="https://www.instagram.com/martin_chauffage/">ig</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">s</a><a href="https://facebook.com/martinchauffage78">fb</a><a href="mailto:contact@martin.fr">m</a>', "text/html")
        self._send(404, "")
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); q = json.loads(self.rfile.read(n))
        if q["textQuery"].startswith("Dupont"):
            return self._send(200, {"places": [{"id": "P1", "displayName": {"text": "Dupont Chauffage"}, "formattedAddress": "5 rue A, 78300 Poissy, France", "rating": 4.8, "userRatingCount": 52, "websiteUri": f"http://127.0.0.1:{PORT}/site"}]})
        self._send(200, {"places": [{"id": "P9", "displayName": {"text": "Boulangerie Totalement Autre"}, "formattedAddress": "1 rue B, 78300 Poissy", "rating": 3.0, "userRatingCount": 2}]})
    def do_PATCH(self):
        n = int(self.headers.get("Content-Length", 0)); body = json.loads(self.rfile.read(n))
        pid = self.path.split("eq.")[1]; DB[pid] = body["data"]; self._send(204, "")
srv = HTTPServer(("127.0.0.1", 0), H); PORT = srv.server_port
DB["a2"]["website"] = f"http://127.0.0.1:{PORT}/site"
threading.Thread(target=srv.serve_forever, daemon=True).start()
env = {**os.environ, "SUPABASE_URL": f"http://127.0.0.1:{PORT}", "SUPABASE_SERVICE_KEY": "k", "GOOGLE_PLACES_KEY": "g", "PLACES_BASE": f"http://127.0.0.1:{PORT}", "PAUSE": "0", "NO_PROXY": "127.0.0.1", "no_proxy": "127.0.0.1"}
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "../scripts/enrich.py")], env=env, capture_output=True, text=True)
print(r.stdout, r.stderr)
bad = 0
def ok(c, m):
    global bad
    print("ok  " if c else "FAIL", m); bad += 0 if c else 1
a1, a2 = DB["a1"], DB["a2"]
ok(a1.get("reviews") == 52 and a1.get("rating") == 4.8, "avis Google récupérés")
ok(a1.get("website", "").endswith("/site"), "site trouvé via Google")
ok(a1.get("instagram") == "https://instagram.com/martin_chauffage" and a1.get("facebook") == "https://facebook.com/martinchauffage78", "Instagram/Facebook trouvés (lien de partage ignoré)")
ok(a2.get("email") == "contact@martin.fr" and "reviews" not in a2, "email trouvé; homonyme Google rejeté")
ok("instagram" not in DB["a4"] and "facebook" not in DB["a4"], "annuaire qualit-enr ignoré")
ok("enrichedAt" not in DB["a3"], "fiche perdue ignorée")
sys.exit(bad)
