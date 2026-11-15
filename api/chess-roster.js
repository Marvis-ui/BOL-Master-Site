function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function sameOrigin(req) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (!host) return false;
  if (origin) {
    try { return new URL(origin).host === host; } catch { return false; }
  }
  const referer = req.headers.referer;
  if (!referer) return false;
  try { return new URL(referer).host === host; } catch { return false; }
}

function parseBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

function githubSettings() {
  const owner = process.env.SERMON_GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
  const repo = process.env.SERMON_GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "";
  const branch = process.env.SERMON_GITHUB_BRANCH || "main";
  const token = process.env.SERMON_GITHUB_TOKEN || "";
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !token) {
    throw new Error("The shared chess roster is not configured.");
  }
  return { owner, repo, branch, token, file: "chess-roster.json" };
}

function contentsUrl(settings) {
  const path = settings.file.split("/").map(encodeURIComponent).join("/");
  return "https://api.github.com/repos/" + encodeURIComponent(settings.owner) + "/" +
    encodeURIComponent(settings.repo) + "/contents/" + path;
}

async function githubCall(url, settings, options) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + settings.token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const result = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    const error = new Error(result.message || "GitHub could not update the shared roster.");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function loadRoster(settings) {
  const url = contentsUrl(settings) + "?ref=" + encodeURIComponent(settings.branch);
  try {
    const file = await githubCall(url, settings, {});
    const source = Buffer.from(String(file.content || "").replace(/\s/g, ""), "base64").toString("utf8");
    const players = JSON.parse(source);
    if (!Array.isArray(players)) throw new Error("The roster data has an invalid format.");
    return { players, sha: file.sha };
  } catch (error) {
    if (error.status === 404) return { players: [], sha: null };
    throw error;
  }
}

const ALLOWED_STATUSES = new Set([
  "Title Challenger",
  "Defending Champion",
  "Returning Player",
  "First-Time Player"
]);
const MAX_PLAYERS = 300;

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Use GET to view the roster or POST to sign up." });
  }

  let settings;
  try { settings = githubSettings(); }
  catch (error) { return send(res, 503, { error: error.message }); }

  if (req.method === "GET") {
    try {
      const current = await loadRoster(settings);
      return send(res, 200, { players: current.players });
    } catch (error) {
      return send(res, 502, { error: error.message || "Could not load the shared roster." });
    }
  }

  if (!sameOrigin(req)) return send(res, 403, { error: "This sign-up request could not be verified." });
  if (Number(req.headers["content-length"] || 0) > 3000) return send(res, 413, { error: "The sign-up form is too large." });

  let body;
  try { body = parseBody(req); }
  catch { return send(res, 400, { error: "The sign-up was not valid JSON." }); }

  const name = String(body.name || "").trim().replace(/\s+/g, " ");
  const status = String(body.status || "");
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    return send(res, 400, { error: "Enter a name or nickname of 1 to 80 characters." });
  }
  if (!ALLOWED_STATUSES.has(status)) return send(res, 400, { error: "Choose a valid player status." });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const current = await loadRoster(settings);
      if (current.players.length >= MAX_PLAYERS) return send(res, 409, { error: "The 2027 roster is full. Please contact the church team." });
      const players = current.players.concat([{ name, status }]);
      const content = Buffer.from(JSON.stringify(players, null, 2), "utf8").toString("base64");
      const payload = {
        message: "Add a player to the 2027 chess roster",
        content,
        branch: settings.branch
      };
      if (current.sha) payload.sha = current.sha;
      try {
        await githubCall(contentsUrl(settings), settings, { method: "PUT", body: payload });
        return send(res, 201, { saved: true, players });
      } catch (error) {
        if ((error.status === 409 || error.status === 422) && attempt < 3) continue;
        throw error;
      }
    } catch (error) {
      return send(res, 502, { error: error.message || "Could not save your sign-up. Please try again." });
    }
  }
  return send(res, 409, { error: "The roster changed during sign-up. Please try again." });
};
