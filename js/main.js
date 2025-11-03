import { signin, decodeJWT, isExpired } from "./auth.js";
import { gql, Q_USER, Q_XP, Q_RESULTS } from "./graphql.js";
import { lineChart, donut, barChart } from "./charts.js";
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
  const user = me.user?.[0] || me.user;
  if (!user) throw new Error("Could not load user");

  // Switch UI
  show(els.profile);
  hide(els.loginCard);
  els.logoutBtn.classList.remove("hidden");
  els.who.textContent = `Signed in as ${user.login}`;

  // Queries with arguments + nested fields
  const xpData = (await gql(Q_XP, { limit: 5000 })).transaction;
  const results = (await gql(Q_RESULTS, { limit: 5000 })).result;

  const totalXP = sum(xpData, t => t.amount);
  const pass = results.filter(r => Number(r.grade) === 1).length;
  const fail = results.filter(r => Number(r.grade) === 0).length;

  // KPIs
  els.kpis.innerHTML = `
    <div class="grid cols-3" style="margin-top:16px">
      <div class="card">
        <div class="muted">User</div>
        <div class="kpi">${user.login}</div>
      </div>
      <div class="card">
        <div class="muted">Total XP</div>
        <div class="kpi">${formatNumber(totalXP)}</div>
      </div>
      <div class="card">
        <div class="muted">Results</div>
        <div class="row" style="gap:24px">
          <div>
            <div class="muted">Pass</div>
            <div class="kpi" style="color:var(--ok)">${pass}</div>
          </div>
          <div>
            <div class="muted">Fail</div>
            <div class="kpi" style="color:var(--bad)">${fail}</div>
          </div>
        </div>
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

  // 2) Pass/Fail donut
  const svg2 = svg("0 0 320 320");
  donut(svg2, [{ key:"Pass", value:pass }, { key:"Fail", value:fail }]);
  els.charts.appendChild(svg2);

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
    setJWT(jwt);
    // Optional: inspect token
    decodeJWT(jwt);
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