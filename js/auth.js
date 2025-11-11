export const AUTH_URL = "https://green-sky-91e0.giannhsgew.workers.dev/login";

export async function signin(id, pw) {
  const auth = btoa(`${id}:${pw}`);
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid credentials" : `Sign-in failed (${res.status})`);
  const txt = await res.json();
  console.log("JWT response:", txt);
  return txt.token;
}

export function decodeJWT(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function isExpired(token, skewSec = 30) {
  try {
    const [, payload] = token.split(".");
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!data.exp) return false; // if no exp, assume usable
    const now = Math.floor(Date.now() / 1000);
    return now >= (data.exp - skewSec);
  } catch {
    return true; // malformed token -> treat as expired
  }
}