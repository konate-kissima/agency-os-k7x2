import json, os, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
DB = {"c1": {"name": "Climtech", "city": "Poissy", "address": "3 rue X 78300", "dept": "78", "stage": "a_contacter", "score": 113},
      "c2": {"name": "Zzz Inconnu", "city": "Paris", "dept": "75", "stage": "a_contacter", "score": 20},
      "c3": {"name": "Déjà fait", "stage": "a_contacter", "created_co": "2010-01-01", "naf": "43.22B"},
      "c4": {"name": "Perdu", "stage": "perdu"}}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body):
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(json.dumps(body).encode())
    def do_GET(self):
        if self.path.startswith("/rest/v1/prospects"):
            return self._send(200, [{"id": k, "data": v} for k, v in DB.items() if "companyAt" not in v])
        if self.path.startswith("/search"):
            if "Climtech" in self.path:
                return self._send(200, {"results": [{"siren": "123456789", "nom_complet": "CLIMTECH", "date_creation": "2014-05-02", "activite_principale": "43.22B", "tranche_effectif_salarie": "03", "nature_juridique": "5499", "siege": {"libelle_commune": "POISSY"}, "dirigeants": [{"prenoms": "JEAN, PAUL", "nom": "DURAND"}]}]})
            return self._send(200, {"results": [{"siren": "9", "nom_complet": "BOULANGERIE AUTRE", "date_creation": "2000-01-01"}]})
        self._send(404, {})
    def do_PATCH(self):
        n = int(self.headers.get("Content-Length", 0)); body = json.loads(self.rfile.read(n))
        DB[self.path.split("eq.")[1]] = body["data"]; self._send(204, {})
srv = HTTPServer(("127.0.0.1", 0), H); PORT = srv.server_port
threading.Thread(target=srv.serve_forever, daemon=True).start()
env = {**os.environ, "SUPABASE_URL": f"http://127.0.0.1:{PORT}", "SUPABASE_SERVICE_KEY": "k", "GOUV_BASE": f"http://127.0.0.1:{PORT}", "MODE": "company", "PAUSE": "0", "NO_PROXY": "127.0.0.1", "no_proxy": "127.0.0.1"}
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "../scripts/enrich.py")], env=env, capture_output=True, text=True)
print(r.stdout, r.stderr)
bad = 0
def ok(c, m):
    global bad
    print("ok  " if c else "FAIL", m); bad += 0 if c else 1
c1 = DB["c1"]
ok(c1.get("created_co") == "2014-05-02" and c1.get("naf") == "43.22B" and c1.get("effectif") == "03" and c1.get("siren") == "123456789", "année de création, NAF, effectif, SIREN récupérés")
ok(c1.get("dirigeant") == "Jean Durand", "dirigeant récupéré")
ok("created_co" not in DB["c2"] and DB["c2"].get("companyAt") and DB["c2"].get("companyFound") is False, "homonyme rejeté, fiche marquée pour ne pas boucler")
ok("companyAt" not in DB["c3"] and "companyAt" not in DB["c4"], "fiche déjà complète et fiche perdue ignorées")
sys.exit(bad)
