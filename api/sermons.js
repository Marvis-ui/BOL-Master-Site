const crypto = require("node:crypto");

const SESSION_COOKIE = "bol_sermon_session";
const SESSION_SECONDS = 8 * 60 * 60;
const ALLOWED_CATEGORIES = new Set(["Sunday Service", "Hour of Power", "Thanksgiving"]);

function send(res, status, data, extraHeaders) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (extraHeaders) {
    for (const key of Object.keys(extraHeaders)) res.setHeader(key, extraHeaders[key]);
  }
  res.end(JSON.stringify(data));
}

function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

function sameOrigin(req) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.referer;
  if (!referer) return false;
  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  const secret = process.env.SERMON_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("Sermon editor is not configured.");
  return secret;
}

function sessionCookie(expiry) {
  const signature = crypto.createHmac("sha256", sessionSecret()).update(String(expiry)).digest("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return SESSION_COOKIE + "=" + expiry + "." + signature + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + SESSION_SECONDS + secure;
}

function hasSession(req) {
  try {
    const cookies = (req.headers.cookie || "").split(";").map(function (part) {
      return part.trim();
    });
    const item = cookies.find(function (part) {
      return part.startsWith(SESSION_COOKIE + "=");
    });
    if (!item) return false;
    const value = item.slice((SESSION_COOKIE + "=").length);
    const pieces = value.split(".");
    if (pieces.length !== 2) return false;
    const expiry = Number(pieces[0]);
    if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
    const expected = crypto.createHmac("sha256", sessionSecret()).update(pieces[0]).digest("base64url");
    return safeEqual(pieces[1], expected);
  } catch {
    return false;
  }
}

function githubSettings() {
  const owner = process.env.SERMON_GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
  const repo = process.env.SERMON_GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "";
  const branch = process.env.SERMON_GITHUB_BRANCH || "main";
  const token = process.env.SERMON_GITHUB_TOKEN || "";
  const file = process.env.SERMON_GITHUB_FILE || "sermons-data.js";
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !token) {
    throw new Error("Sermon editor storage is not configured.");
  }
  return { owner: owner, repo: repo, branch: branch, token: token, file: file };
}

function githubUrl(settings) {
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
  const result = await response.json().catch(function () {
    return {};
  });
  if (!response.ok) {
    const error = new Error(result.message || "GitHub could not save the sermon file.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function parseSermonFile(text) {
  const marker = "window.BOL_SERMONS =";
  const start = text.indexOf(marker);
  const end = text.lastIndexOf(";");
  if (start < 0 || end <= start) throw new Error("The sermon content file could not be read.");
  const jsonStart = start + marker.length;
  const sermons = JSON.parse(text.slice(jsonStart, end).trim());
  if (!Array.isArray(sermons)) throw new Error("The sermon content file has an invalid format.");
  return sermons;
}

async function loadFromGitHub(settings) {
  const url = githubUrl(settings) + "?ref=" + encodeURIComponent(settings.branch);
  try {
    const file = await githubCall(url, settings, {});
    const text = Buffer.from(String(file.content || "").replace(/\s/g, ""), "base64").toString("utf8");
    return { sermons: parseSermonFile(text), sha: file.sha };
  } catch (error) {
    if (error.status === 404) return { sermons: [], sha: null };
    throw error;
  }
}

function validateSermons(value) {
  if (!Array.isArray(value) || value.length > 1000) throw new Error("The sermon list is invalid.");
  const ids = new Set();
  const sermons = value.map(function (item) {
    const sermon = {
      id: String(item.id || "").trim(),
      title: String(item.title || "").trim(),
      speaker: String(item.speaker || "").trim(),
      date: String(item.date || "").trim(),
      category: String(item.category || "").trim(),
      scripture: String(item.scripture || "").trim(),
      summary: String(item.summary || "").trim(),
      pdfUrl: String(item.pdfUrl || "").trim(),
      body: String(item.body || "").trim()
    };
    if (!sermon.id || sermon.id.length > 120 || ids.has(sermon.id)) throw new Error("Each sermon needs a unique ID.");
    ids.add(sermon.id);
    if (!sermon.title || sermon.title.length > 180) throw new Error("Enter a title of 1 to 180 characters.");
    if (!sermon.speaker || sermon.speaker.length > 120) throw new Error("Enter a speaker of 1 to 120 characters.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sermon.date) || Number.isNaN(Date.parse(sermon.date + "T12:00:00Z"))) {
      throw new Error("Choose a valid sermon date.");
    }
    if (!ALLOWED_CATEGORIES.has(sermon.category)) throw new Error("Choose a listed service type.");
    if (!sermon.scripture || sermon.scripture.length > 180) throw new Error("Enter a Scripture reference.");
    if (sermon.summary.length > 5000) throw new Error("Keep the summary under 5,000 characters.");
    if (sermon.pdfUrl) {
      let url;
      try { url = new URL(sermon.pdfUrl); } catch { throw new Error("Enter a valid Google Drive PDF URL."); }
      if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new Error("Only Google Drive document links are supported.");
      if (sermon.pdfUrl.length > 2000) throw new Error("The PDF URL is too long.");
    }
    if (sermon.body.length > 100000) throw new Error("The sermon text must be under 100,000 characters.");
    return sermon;
  });
  return sermons;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST for this endpoint." }, { "Allow": "POST" });
  if (!sameOrigin(req)) return send(res, 403, { error: "This request could not be verified." });

  let body;
  try {
    body = requestBody(req);
  } catch {
    return send(res, 400, { error: "The request was not valid JSON." });
  }

  const action = String(body.action || "");
  if (action === "login") {
    const expected = process.env.SERMON_ADMIN_PASSWORD || "";
    if (expected.length < 16) return send(res, 503, { error: "The sermon editor is not configured yet." });
    try {
      sessionSecret();
    } catch {
      return send(res, 503, { error: "The sermon editor is not configured yet." });
    }
    if (!safeEqual(String(body.password || ""), expected)) return send(res, 401, { error: "That password was not correct." });
    const expiry = Date.now() + SESSION_SECONDS * 1000;
    return send(res, 200, { authenticated: true }, { "Set-Cookie": sessionCookie(expiry) });
  }

  if (action === "logout") {
    return send(res, 200, { authenticated: false }, {
      "Set-Cookie": SESSION_COOKIE + "=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" +
        (process.env.NODE_ENV === "production" ? "; Secure" : "")
    });
  }

  if (action === "session") return send(res, 200, { authenticated: hasSession(req) });
  if (!hasSession(req)) return send(res, 401, { error: "Please sign in to manage sermons." });

  let settings;
  try {
    settings = githubSettings();
  } catch (error) {
    return send(res, 503, { error: error.message });
  }


  if (["study-load","study-save","calendar-load","calendar-save"].includes(action)) {
    const study=action.startsWith("study-");
    const target={...settings,file:study?"bible-study-data.js":"calendar-editor-data.js"};
    const marker=study?"window.BOL_STUDY_AGENDA = ":"window.BOL_CALENDAR_EDITS = ";
    try {
      const url=githubUrl(target);
      const file=await githubCall(url+"?ref="+encodeURIComponent(target.branch),target,{});
      const raw=Buffer.from(file.content.replace(/\s/g,""),"base64").toString("utf8");
      const start=raw.indexOf(marker);
      const end=study?raw.indexOf("\n(function(){",start):raw.length;
      if(start<0||end<0)throw new Error("Content format changed.");
      const literal=raw.slice(start+marker.length,end).trim();
      let current;
      if(study&&literal.startsWith("\x60")){
        const close=literal.indexOf("\x60",1);
        if(close<0)throw new Error("Invalid curriculum.");
        current=literal.slice(1,close).trim().split("\n").map(line=>{const [date,scriptures,theme,remark]=line.split("|");return {date,scriptures,theme,remark};});
      }else current=JSON.parse(literal.replace(/;$/,""));
      if(!Array.isArray(current))throw new Error("Invalid records.");
      if(action.endsWith("-load"))return send(res,200,{records:current,revision:file.sha});
      if(body.revision!==file.sha)return send(res,409,{error:"Content changed. Reload and preview again."});
      if(!Array.isArray(body.records)||!body.records.length||body.records.length>1000)return send(res,400,{error:"Supply 1–1000 records."});
      const keys=new Set();
      const changes=body.records.map(item=>{
        const fields=study?["date","scriptures","theme","remark"]:["id","date","title","time","place","mode","original"];
        const row={};
        for(const key of fields){if(item[key]!=null&&typeof item[key]!=="string")throw Error("Invalid field "+key);row[key]=(item[key]||"").trim();if(row[key].length>2000)throw Error("Field too long.");}
        if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date+"T12:00:00Z"))||new Date(row.date+"T12:00:00Z").toISOString().slice(0,10)!==row.date)throw Error("Invalid date: "+row.date);
        if(study&&!row.scriptures)throw Error("Scriptures required.");
        if(!study&&(!/^[a-zA-Z0-9_-]{1,120}$/.test(row.id)||!["add","replace","cancel","birthday"].includes(row.mode)||(!row.title&&row.mode!=="cancel")||(["replace","cancel"].includes(row.mode)&&!row.original)))throw Error("Invalid calendar record.");
        const key=study?row.date:row.id;if(keys.has(key))throw Error("Duplicate record: "+key);keys.add(key);return row;
      });
      const index=new Map(current.map(row=>[study?row.date:row.id,row]));
      for(const row of changes){const key=study?row.date:row.id;if(study&&index.has(key)&&body.replaceExisting!==true)continue;index.set(key,row);}
      const next=[...index.values()].sort((a,b)=>a.date.localeCompare(b.date));
      const json=JSON.stringify(next,null,2).replace(/</g,"\\u003c");
      const content=raw.slice(0,start)+marker+json+";\n"+(study?raw.slice(end):"");
      const saved=await githubCall(url,target,{method:"PUT",body:{message:study?"Update Bible Study curriculum":"Update church calendar",branch:target.branch,sha:file.sha,content:Buffer.from(content).toString("base64")}});
      return send(res,200,{records:next,revision:saved.content.sha,message:"Saved to GitHub. Public content updates after deployment."});
    }catch(error){return send(res,error.status===409||error.status===422?409:400,{error:error.message||"Unable to save; no reset performed."});}
  }


  if (action === "library-load" || action === "library-save") {
    const target={...settings,file:"church-library.json"};
    try {
      const url=githubUrl(target);
      const file=await githubCall(url+"?ref="+encodeURIComponent(target.branch),target,{});
      const current=JSON.parse(Buffer.from(file.content,"base64").toString("utf8"));
      if(!Array.isArray(current))throw Error("Invalid library; no reset performed.");
      if(action==="library-load")return send(res,200,{records:current,revision:file.sha});
      if(body.revision!==file.sha)return send(res,409,{error:"Reload records before publishing."});
      const input=body.record;
      if(!input||typeof input!=="object")throw Error("Missing record.");
      const row={};
      for(const k of ["id","kind","title","date","description","url","category","name","reference","visibility"]){
        if(typeof (input[k]??"")!=="string")throw Error("Invalid field.");
        row[k]=(input[k]||"").trim();
        if(row[k].length>(k==="description"?10000:2000))throw Error("Field too long.");
      }
      if(!/^[a-zA-Z0-9_-]{1,120}$/.test(row.id)||!["quote","event","archive","hope","youth"].includes(row.kind)||!row.title||!["public","hidden"].includes(row.visibility))throw Error("Invalid record.");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date+"T12:00:00Z"))||new Date(row.date+"T12:00:00Z").toISOString().slice(0,10)!==row.date)throw Error("Valid date required.");
      if(row.kind==="archive"&&Number(row.date.slice(0,4))<2012)throw Error("Archive starts in 2012.");
      if(row.kind==="quote"&&(!row.description||!row.reference))throw Error("Verse text and reference required.");
      if(row.kind==="youth"&&!row.name)throw Error("Approved public display name required.");
      if(["archive","event"].includes(row.kind)&&!row.url)throw Error("Document or album URL required.");
      if(row.url){const u=new URL(row.url);if(u.protocol!=="https:"||u.username||u.password)throw Error("Use HTTPS links.");
        if(["archive","hope"].includes(row.kind)&&!["drive.google.com","docs.google.com"].includes(u.hostname))throw Error("Use Google Drive document links.");
        if(row.kind==="event"&&!["photos.app.goo.gl","photos.google.com"].includes(u.hostname))throw Error("Use a Google Photos album link.");
      }
      if(body.approved!==true)throw Error("Confirm the record is safe for a public repository, including hidden records.");
      const next=current.filter(r=>r.id!==row.id);next.push(row);
      const saved=await githubCall(url,target,{method:"PUT",body:{message:"Update approved church library record",branch:target.branch,sha:file.sha,content:Buffer.from(JSON.stringify(next,null,2)+"\n").toString("base64")}});
      return send(res,200,{records:next,revision:saved.content.sha,message:"Saved to GitHub; public changes follow deployment."});
    }catch(error){return send(res,error.status===409||error.status===422?409:400,{error:error.message});}
  }

  if (action === "hop-load" || action === "hop-save") {
    // Separate content file: never overwrite sermon data.
    const hop = { ...settings, file: "hour-of-power-data.js" };
    try {
      const url = githubUrl(hop);
      const file = await githubCall(url + "?ref=" + encodeURIComponent(hop.branch), hop, {});
      const raw = Buffer.from(String(file.content || "").replace(/\s/g, ""), "base64").toString("utf8");
      const marker = "window.BOL_HOUR_OF_POWER = ";
      if (!raw.startsWith(marker) || !raw.trimEnd().endsWith(";")) throw new Error("Invalid devotional content file. No changes saved.");
      const current = JSON.parse(raw.trimEnd().slice(marker.length, -1));
      if (!Array.isArray(current)) throw new Error("Invalid devotional list.");
      if (action === "hop-load") return send(res, 200, { records: current, revision: file.sha });
      if (body.revision !== file.sha) return send(res, 409, { error: "Content changed. Reload before editing again." });
      const input = body.record;
      if (!input || typeof input !== "object") return send(res, 400, { error: "Missing record." });
      const record = {};
      for (const key of ["kind","id","title","date","scripture","quote","story","speaker","theme","referenceUrl","referenceTitle"]) {
        if (input[key] != null && typeof input[key] !== "string") return send(res, 400, { error: "Invalid " + key });
        record[key] = (input[key] || "").trim();
      }
      if (!["devotional","quote"].includes(record.kind) || !/^[a-zA-Z0-9_-]{1,120}$/.test(record.id) || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(Date.parse(record.date+"T12:00:00Z")) || new Date(record.date+"T12:00:00Z").toISOString().slice(0,10)!==record.date) return send(res,400,{error:"Invalid record type, ID or date."});
      if (record.kind === "devotional" && (!record.title || !record.scripture) || record.kind === "quote" && !record.quote) return send(res,400,{error:"Enter the title and Scripture, or quote text."});
      if (Object.entries(record).some(([k,v])=>v.length>(k==="story"?50000:k==="quote"?10000:k==="referenceUrl"?2000:300))) return send(res,400,{error:"A field exceeds its maximum length."});
      if (!Array.isArray(input.lessons) || input.lessons.length>50 || input.lessons.some(t=>typeof t!=="string" || t.length>3000)) return send(res,400,{error:"Invalid lesson list."});
      record.lessons=input.lessons.map(t=>t.trim()).filter(Boolean);
      if(record.referenceUrl){try{const u=new URL(record.referenceUrl);if(u.protocol!=="https:")throw new Error();}catch{return send(res,400,{error:"Use a valid HTTPS reference URL."});}}
      record.published=true;
      const next=current.filter(r=>r.id!==record.id);next.push(record);
      const content = marker + JSON.stringify(next,null,2) + ";\n";
      const saved = await githubCall(url, hop, { method:"PUT", body:{message:"Publish Hour of Power content",branch:hop.branch,sha:file.sha,content:Buffer.from(content,"utf8").toString("base64")} });
      return send(res,200,{records:next,revision:saved.content.sha,message:"Saved to GitHub. The public page updates after deployment."});
    } catch(error) {
      return send(res,error.status===409||error.status===422?409:502,{error:"Could not save or load devotional content. Reload and retry; no automatic reset was performed."});
    }
  }

  if (action === "load") {
    try {
      const content = await loadFromGitHub(settings);
      return send(res, 200, { sermons: content.sermons });
    } catch (error) {
      return send(res, 502, { error: error.message || "Could not load sermons from GitHub." });
    }
  }

  if (action === "save") {
    let sermons;
    try {
      sermons = validateSermons(body.sermons);
    } catch (error) {
      return send(res, 400, { error: error.message });
    }

    try {
      const current = await loadFromGitHub(settings);
      const contentText = "window.BOL_SERMONS = " + JSON.stringify(sermons, null, 2) + ";\n";
      const payload = {
        message: "Update church sermon messages",
        content: Buffer.from(contentText, "utf8").toString("base64"),
        branch: settings.branch
      };
      if (current.sha) payload.sha = current.sha;
      await githubCall(githubUrl(settings), settings, { method: "PUT", body: payload });
      return send(res, 200, {
        saved: true,
        sermons: sermons,
        message: "Saved to the church website repository. The live page will update after Vercel publishes the change."
      });
    } catch (error) {
      const status = error.status === 409 || error.status === 422 ? 409 : 502;
      return send(res, status, {
        error: status === 409
          ? "The sermon file changed while you were editing. Reload this editor and try again."
          : (error.message || "GitHub could not save the sermon.")
      });
    }
  }

  return send(res, 400, { error: "Unknown sermon editor action." });
};
