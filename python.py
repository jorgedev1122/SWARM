from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from json import JSONDecodeError
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
SCORES_FILE = ROOT / "scores.json"
HOST = "127.0.0.1"
PORT = 8000

DEFAULT_PROFILE = {
    "coins": 0,
    "upgrades": {
        "speed": 0,
        "health": 0,
        "luck": 0,
    },
    "weapons": ["default"],
    "equipped_weapon": "default",
}


def load_scores():
    if not SCORES_FILE.exists() or SCORES_FILE.stat().st_size == 0:
        return {}

    try:
        with SCORES_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (JSONDecodeError, OSError):
        return {}

    return data if isinstance(data, dict) else {}


def save_scores(scores):
    with SCORES_FILE.open("w", encoding="utf-8") as file:
        json.dump(scores, file, ensure_ascii=False, indent=2)


def normalize_player(name):
    clean_name = " ".join(str(name or "Jogador").strip().split())
    return clean_name[:24] or "Jogador"


def is_better_run(current, previous):
    if not previous:
        return True

    if current["score"] != previous.get("score", 0):
        return current["score"] > previous.get("score", 0)

    return current["time_ms"] > previous.get("time_ms", 0)


def get_player_entry(scores, player):
    entry = scores.get(player)

    if not isinstance(entry, dict):
        entry = {}

    if "record" not in entry and ("score" in entry or "time_ms" in entry):
        entry = {"record": entry}

    profile = entry.get("profile")
    if not isinstance(profile, dict):
        profile = {}

    upgrades = profile.get("upgrades")
    if not isinstance(upgrades, dict):
        upgrades = {}

    weapons = profile.get("weapons")
    if not isinstance(weapons, list):
        weapons = ["default"]

    clean_profile = {
        "coins": max(0, int(profile.get("coins", DEFAULT_PROFILE["coins"]))),
        "upgrades": {
            "speed": max(0, min(20, int(upgrades.get("speed", 0)))),
            "health": max(0, min(10, int(upgrades.get("health", 0)))),
            "luck": max(0, min(100, int(upgrades.get("luck", 0)))),
        },
        "weapons": sorted(set(["default", *[str(weapon) for weapon in weapons]])),
        "equipped_weapon": str(profile.get("equipped_weapon", "default")),
    }

    if clean_profile["equipped_weapon"] not in clean_profile["weapons"]:
        clean_profile["equipped_weapon"] = "default"

    entry["profile"] = clean_profile
    entry["record"] = entry.get("record")
    scores[player] = entry
    return entry


class SwarmHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed_url = urlparse(self.path)

        if parsed_url.path == "/api/record":
            query = parse_qs(parsed_url.query)
            player = normalize_player(query.get("player", ["Jogador"])[0])
            scores = load_scores()
            entry = get_player_entry(scores, player)
            self.send_json({"player": player, "record": entry.get("record")})
            return

        if parsed_url.path == "/api/profile":
            query = parse_qs(parsed_url.query)
            player = normalize_player(query.get("player", ["Jogador"])[0])
            scores = load_scores()
            entry = get_player_entry(scores, player)
            self.send_json({
                "player": player,
                "record": entry.get("record"),
                "profile": entry["profile"],
            })
            return

        super().do_GET()

    def do_POST(self):
        parsed_url = urlparse(self.path)

        if parsed_url.path == "/api/profile":
            self.handle_profile_update()
            return

        if parsed_url.path != "/api/score":
            self.send_error(404, "Endpoint not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(content_length)
            data = json.loads(payload.decode("utf-8"))
            player = normalize_player(data.get("player"))
            run = {
                "player": player,
                "score": max(0, int(data.get("score", 0))),
                "time_ms": max(0, int(data.get("time_ms", 0))),
            }
        except (JSONDecodeError, TypeError, ValueError):
            self.send_error(400, "Invalid score payload")
            return

        scores = load_scores()
        entry = get_player_entry(scores, player)
        saved = False

        if is_better_run(run, entry.get("record")):
            entry["record"] = run
            saved = True

        save_scores(scores)

        self.send_json({
            "saved": saved,
            "player": player,
            "record": entry.get("record"),
            "profile": entry["profile"],
        })

    def handle_profile_update(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(content_length)
            data = json.loads(payload.decode("utf-8"))
            player = normalize_player(data.get("player"))
            profile = data.get("profile")

            if not isinstance(profile, dict):
                raise ValueError("Missing profile")
        except (JSONDecodeError, TypeError, ValueError):
            self.send_error(400, "Invalid profile payload")
            return

        scores = load_scores()
        entry = get_player_entry(scores, player)

        upgrades = profile.get("upgrades") if isinstance(profile.get("upgrades"), dict) else {}
        weapons = profile.get("weapons") if isinstance(profile.get("weapons"), list) else ["default"]

        clean_profile = {
            "coins": max(0, int(profile.get("coins", entry["profile"]["coins"]))),
            "upgrades": {
                "speed": max(0, min(20, int(upgrades.get("speed", 0)))),
                "health": max(0, min(10, int(upgrades.get("health", 0)))),
                "luck": max(0, min(100, int(upgrades.get("luck", 0)))),
            },
            "weapons": sorted(set(["default", *[str(weapon) for weapon in weapons]])),
            "equipped_weapon": str(profile.get("equipped_weapon", "default")),
        }

        if clean_profile["equipped_weapon"] not in clean_profile["weapons"]:
            clean_profile["equipped_weapon"] = "default"

        entry["profile"] = clean_profile
        save_scores(scores)

        self.send_json({
            "player": player,
            "record": entry.get("record"),
            "profile": entry["profile"],
        })

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), SwarmHandler)
    print(f"SWARM rodando em http://{HOST}:{PORT}")
    print("Pressione Ctrl+C para parar.")
    server.serve_forever()
