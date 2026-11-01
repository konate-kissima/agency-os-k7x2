import json, os, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
DB = {"x1": {"name": "Dupont Plomberie", "city": "Poissy", "phone": "01 39 11 22 33", "stage": "a_contacter"},
      "x2": {"name": "Ancien", "city": "Poissy", "phone": "01 30 00 00 00", "stage": "perdu", "lostReason": "Pas intéressé"}}
POSTED = []
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body):
        b = json.dumps(body).encode() if not isinstance(body, bytes) else body
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        self._send(200, [{"id": k, "data": v} for k, v in DB.items()])
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); q = json.loads(self.rfile.read(n))
        if self.path.startswith("/rest/v1/prospects"):
            POSTED.extend(q); return self._send(201, {})
        P = lambda i, nm, ph, addr, **k: {"id": i, "displayName": {"text": nm}, "nationalPhoneNumber": ph, "formattedAddress": addr, "businessStatus": "OPERATIONAL", "rating": 4.6, "userRatingCount": 30, **k}
        self._send(200, {"places": [
            P("A1", "Dupont Plomberie", "01 39 11 22 33", "1 rue X, 78300 Poissy"),                      # doublon de téléphone
            P("A2", "Ancien Plombier", "01 30 00 00 00", "2 rue Y, 78300 Poissy"),                      # prospect déjà perdu : ne revient pas
            P("A3", "Nouveau Plombier", "06 12 34 56 78", "3 rue Z, 78300 Poissy", websiteUri="https://www.facebook.com/nouveau"),
            P("A4", "Hors Zone", "01 40 00 00 01", "4 rue W, 75001 Paris"),                              # mauvais département
            P("A5", "Sans Tel", "", "5 rue V, 78300 Poissy"),
            P("A6", "Fermé", "01 39 99 99 99", "6 rue U, 78300 Poissy", businessStatus="CLOSED_PERMANENTLY"),
            P("A7", "Bon Site Plomberie", "01 39 55 55 55", "7 rue T, 78300 Poissy", websiteUri="https://bonsite.fr")]})
srv = HTTPServer(("127.0.0.1", 0), H); PORT = srv.server_port
threading.Thread(target=srv.serve_forever, daemon=True).start()
cf = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); json.dump([["78", "Poissy"]], cf); cf.close()
env = {**os.environ, "SUPABASE_URL": f"http://127.0.0.1:{PORT}", "SUPABASE_SERVICE_KEY": "k", "GOOGLE_PLACES_KEY": "g", "PLACES_BASE": f"http://127.0.0.1:{PORT}",
       "COMMUNES_JSON": cf.name, "MAX_PAGES": "1", "NO_PROXY": "127.0.0.1", "no_proxy": "127.0.0.1"}
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "../scripts/source_places.py")], env=env, capture_output=True, text=True)
print(r.stdout, r.stderr)
bad = 0
def ok(c, m):
    global bad
    print("ok  " if c else "FAIL", m); bad += 0 if c else 1
names = sorted(x["data"]["name"] for x in POSTED)
ok(r.returncode == 0, "script terminé sans erreur")
ok(names == ["Bon Site Plomberie", "Nouveau Plombier"], "seuls les nouveaux avec téléphone et dans le département sont ajoutés : " + str(names))
nv = next((x["data"] for x in POSTED if x["data"]["name"] == "Nouveau Plombier"), {})
ok(nv.get("website") == "" and nv.get("stage") == "a_contacter" and nv.get("enrich") == "todo" and nv.get("source") == "places", "site Facebook écarté, fiche à enrichir")
ok(nv.get("facebook") == "https://www.facebook.com/nouveau", "site Facebook conservé comme réseau Facebook")
ok(all(x["id"].startswith("g") for x in POSTED), "identifiants Google")
sys.exit(bad)
