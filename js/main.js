import { signin, decodeJWT, isExpired } from "./auth.js";
import { gql, Q_USER, Q_XP, Q_RESULTS, Q_PROGRESS, Q_EVENT_OBJECT_IDS, Q_AUDITS_EVENT } from "./graphql.js";
import { lineChart, barChart } from "./charts.js";
import { sum, formatNumber, show, hide } from "./ui.js";


const LS_KEY = "z01_jwt";

const els = {
  id: document.getElementById("idField"),
  pw: document.getElementById("pwField"),
  loginBtn: document.getElementById("loginBtn"),
  loginErr: document.getElementById("loginErr"),
  who: document.getElementById("who"),
  logoutBtn: document.getElementById("logoutBtn"),
  profile: document.getElementById("profileArea"),
  loginCard: document.getElementById("loginCard"),
  kpis: document.getElementById("kpis"),
  charts: document.getElementById("charts"),
};

function svg(viewBox) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", viewBox);
  return s;
}

/* ---------- JWT persistence ---------- */
function setJWT(token) {
  window._jwt = token;
  try { localStorage.setItem(LS_KEY, token); } catch {}
}
function getJWT() {
  try { return localStorage.getItem(LS_KEY) || null; } catch { return null; }
}
function clearJWT() {
  window._jwt = null;
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* ---------- Shared render after we’re authenticated ---------- */
async function renderAfterLogin() {
  // Basic user (normal query)
  const me = await gql(Q_USER);
  console.log("Logged in user:", me);
  const user = me.user?.[0] || me.user;
  if (!user) throw new Error("Could not load user");

  const eventObjIds = (await gql(Q_EVENT_OBJECT_IDS)).transaction
    .map(t => t.objectId)
    .filter(id => id != null);

  const idSet = new Set(eventObjIds);
  

  // Switch UI
  show(els.profile);
  hide(els.loginCard);
  els.logoutBtn.classList.remove("hidden");
  els.who.textContent = `Signed in as ${user.login}`;

  // Queries with arguments + nested fields
  
  const xpData   = (await gql(Q_XP)).transaction;          // already eventId=200
  const results  = (await gql(Q_RESULTS)).result;          // no eventId -> filter by idSet
  const progress = (await gql(Q_PROGRESS)).progress;       // no eventId -> filter by idSet
  const audits   = (await gql(Q_AUDITS_EVENT)).transaction; // audits for eventId=200
  const resultsEvt  = results.filter(r => idSet.has(r.object?.id ?? r.objectId ?? null) || idSet.has(r.objectId ?? null));
  // If your "result" rows don’t carry objectId directly, use path/object name matching if needed.
  // Most schemas include `result.object.id`; if not, keep using what you already have + fallback on path.

  const progressEvt = progress.filter(p => idSet.has(p.objectId ?? null));

  const totalXP = sum(xpData, t => t.amount);

  // classify results
  const isProject = (r) => r.object?.type === "project";
  const isPiscine = (r) => (r.path || "").includes("piscine-");

  // KPIs
  els.kpis.innerHTML = `
  <div class="grid cols-2" style="margin-top:16px">
    <div class="card">
      <div class="muted">User</div>
      <div class="kpi">${user.login}</div>
    </div>
    <div class="card">
      <div class="muted">Total XP</div>
      <div class="kpi">${formatNumber(Math.floor(totalXP/1000))} KB</div>
    </div>
  </div>
`;

  // Charts
  els.charts.innerHTML = "";

  // 1) XP over time
  const byDate = xpData.map(t => ({ x: new Date(t.createdAt), y: t.amount }))
                       .sort((a,b)=>a.x-b.x);
  let running = 0;
  const cumulative = byDate.map(d => ({ x: d.x, y: (running += d.y) }));
  const svg1 = svg("0 0 800 300");
  lineChart(svg1, cumulative);
  els.charts.appendChild(svg1);

  // 3) XP by project (Top 10)
  const byProject = {};
  xpData.forEach(t => {
    const name = t.object?.name || (t.path?.split("/").slice(-2).join("/") || `#${t.objectId}`);
    byProject[name] = (byProject[name] || 0) + t.amount;
  });
  const top = Object.entries(byProject)
    .map(([key,value])=>({key,value}))
    .sort((a,b)=>b.value-a.value)
    .slice(0,10);
  const svg3 = svg("0 0 800 400");
  barChart(svg3, top);
  els.charts.appendChild(svg3);
}

/* ---------- Sign in ---------- */
els.loginBtn.addEventListener("click", async () => {
  els.loginErr.textContent = "";
  const id = (els.id.value || "").trim();
  const pw = els.pw.value || "";
  if (!id || !pw) {
    els.loginErr.textContent = "Enter username/email and password";
    return;
  }

  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "Signing in…";

  try {
    const jwt = await signin(id, pw);
    console.log("Received JWT:", jwt);
    setJWT(jwt);
    
    
    await renderAfterLogin();
  } catch (e) {
    console.error(e);
    els.loginErr.textContent = e.message || "Login failed";
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "Sign in";
  }
});

/* ---------- Logout ---------- */
els.logoutBtn.addEventListener("click", () => {
  clearJWT();
  hide(els.profile);
  show(els.loginCard);
  els.logoutBtn.classList.add("hidden");
  els.who.textContent = "";
  els.pw.value = "";
});

/* ---------- Auto-restore on load (don’t nuke token on transient errors) ---------- */
window.addEventListener("DOMContentLoaded", async () => {
  const saved = getJWT();
  if (!saved) return;

  // If truly expired, force re-login
  if (isExpired(saved)) {
    clearJWT();
    hide(els.profile);
    show(els.loginCard);
    els.loginErr.textContent = "Session expired. Please sign in again.";
    return;
  }

  setJWT(saved);
  try {
    await renderAfterLogin();
  } catch (e) {
    // Only clear on actual auth failures
    const msg = (e && e.message || "").toLowerCase();
    const authFail = msg.includes("jwt") || msg.includes("unauth") || msg.includes("forbidden") || msg.includes("401");
    if (authFail) {
      clearJWT();
      hide(els.profile);
      show(els.loginCard);
      els.loginErr.textContent = "Session expired. Please sign in again.";
    } else {
      // transient error — keep the session
      console.error(e);
      els.loginErr.textContent = "Temporary error fetching data. Try refresh.";
      show(els.profile);
      hide(els.loginCard);
      els.logoutBtn.classList.remove("hidden");
    }
  }
});

/* ---------- Enter submits ---------- */
[els.id, els.pw].forEach(inp =>
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") els.loginBtn.click();
  })
);