const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.resolve(__dirname);
const SCORES_FILE = path.join(ROOT, "scores.json");

const DEFAULT_PROFILE = {
  coins: 0,
  upgrades: { speed: 0, health: 0, luck: 0 },
  weapons: ["default"],
  equipped_weapon: "default",
};

function loadScores() {
  try {
    if (!fs.existsSync(SCORES_FILE) || fs.statSync(SCORES_FILE).size === 0)
      return {};
    const raw = fs.readFileSync(SCORES_FILE, "utf8");
    const data = JSON.parse(raw);
    return typeof data === "object" && data ? data : {};
  } catch (e) {
    return {};
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), "utf8");
}

function normalizePlayer(name) {
  const clean = String(name || "Jogador")
    .trim()
    .replace(/\s+/g, " ");
  return clean.slice(0, 24) || "Jogador";
}

function isBetterRun(current, previous) {
  if (!previous) return true;
  if ((current.score || 0) !== (previous.score || 0))
    return current.score > (previous.score || 0);
  return (current.time_ms || 0) > (previous.time_ms || 0);
}

function getPlayerEntry(scores, player) {
  let entry = scores[player];
  if (!entry || typeof entry !== "object") entry = {};
  if (!("record" in entry) && ("score" in entry || "time_ms" in entry))
    entry = { record: entry };

  const profile =
    entry.profile && typeof entry.profile === "object" ? entry.profile : {};
  const upgrades =
    profile.upgrades && typeof profile.upgrades === "object"
      ? profile.upgrades
      : {};
  const weapons = Array.isArray(profile.weapons)
    ? profile.weapons
    : ["default"];

  const cleanProfile = {
    coins: Math.max(0, Number(profile.coins || DEFAULT_PROFILE.coins)),
    upgrades: {
      speed: Math.max(0, Math.min(20, Number(upgrades.speed || 0))),
      health: Math.max(0, Math.min(10, Number(upgrades.health || 0))),
      luck: Math.max(0, Math.min(100, Number(upgrades.luck || 0))),
    },
    weapons: Array.from(new Set(["default", ...weapons.map(String)])),
    equipped_weapon: String(profile.equipped_weapon || "default"),
  };

  if (!cleanProfile.weapons.includes(cleanProfile.equipped_weapon))
    cleanProfile.equipped_weapon = "default";
  entry.profile = cleanProfile;
  entry.record = entry.record || null;
  scores[player] = entry;
  return entry;
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function serveFile(req, res, pathname) {
  let filePath = path.join(ROOT, pathname);
  if (pathname === "/") filePath = path.join(ROOT, "index.html");
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".json": "application/json; charset=utf-8",
    };
    res.writeHead(200, {
      "Content-Type": map[ext] || "application/octet-stream",
    });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === "GET" && pathname === "/api/record") {
    const player = normalizePlayer(parsed.query.player || "Jogador");
    const scores = loadScores();
    const entry = getPlayerEntry(scores, player);
    sendJson(res, { player, record: entry.record });
    return;
  }

  if (req.method === "GET" && pathname === "/api/profile") {
    const player = normalizePlayer(parsed.query.player || "Jogador");
    const scores = loadScores();
    const entry = getPlayerEntry(scores, player);
    sendJson(res, { player, record: entry.record, profile: entry.profile });
    return;
  }

  if (req.method === "POST" && pathname === "/api/profile") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const player = normalizePlayer(data.player);
        const profile = data.profile;
        if (!profile || typeof profile !== "object") {
          res.writeHead(400);
          res.end("Invalid profile");
          return;
        }
        const scores = loadScores();
        const entry = getPlayerEntry(scores, player);

        const upgrades =
          profile.upgrades && typeof profile.upgrades === "object"
            ? profile.upgrades
            : {};
        const weapons = Array.isArray(profile.weapons)
          ? profile.weapons
          : ["default"];

        const cleanProfile = {
          coins: Math.max(0, Number(profile.coins || entry.profile.coins)),
          upgrades: {
            speed: Math.max(0, Math.min(20, Number(upgrades.speed || 0))),
            health: Math.max(0, Math.min(10, Number(upgrades.health || 0))),
            luck: Math.max(0, Math.min(100, Number(upgrades.luck || 0))),
          },
          weapons: Array.from(new Set(["default", ...weapons.map(String)])),
          equipped_weapon: String(profile.equipped_weapon || "default"),
        };

        if (!cleanProfile.weapons.includes(cleanProfile.equipped_weapon))
          cleanProfile.equipped_weapon = "default";

        entry.profile = cleanProfile;
        saveScores(scores);
        sendJson(res, { player, record: entry.record, profile: entry.profile });
      } catch (e) {
        res.writeHead(400);
        res.end("Invalid profile payload");
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/score") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const player = normalizePlayer(data.player);
        const run = {
          player,
          score: Math.max(0, Number(data.score || 0)),
          time_ms: Math.max(0, Number(data.time_ms || 0)),
        };
        const scores = loadScores();
        const entry = getPlayerEntry(scores, player);
        let saved = false;
        if (isBetterRun(run, entry.record)) {
          entry.record = run;
          saved = true;
        }
        saveScores(scores);
        sendJson(res, {
          saved,
          player,
          record: entry.record,
          profile: entry.profile,
        });
      } catch (e) {
        res.writeHead(400);
        res.end("Invalid score payload");
      }
    });
    return;
  }

  // static file serving
  let filePath = parsed.pathname;
  if (filePath === "/") filePath = "/index.html";
  serveFile(req, res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SWARM Node server running on port ${PORT}`);
});
