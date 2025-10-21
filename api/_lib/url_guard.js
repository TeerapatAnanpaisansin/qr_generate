// qr_generate/api/_lib/url_guard.js

import crypto from "node:crypto";
import { toASCII, toUnicode } from "punycode/";

const ALLOWLIST = (process.env.URL_GUARD_ALLOWLIST || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const DENYLIST = (process.env.URL_GUARD_DENYLIST || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const RISKY_TLDS = (process.env.URL_GUARD_BLOCK_TLDS || ".zip,.mov")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const POLICY_MODE = (process.env.URL_GUARD_MODE || "enforce").toLowerCase();

const THREAT_TIMEOUT_MS = Number(process.env.URL_GUARD_TIMEOUT_MS || 2500);
const SAFE_BROWSING_API_KEY = (process.env.SAFE_BROWSING_API_KEY || "").trim();

const SUSPICIOUS_LABEL_KEYWORDS = ["login", "secure", "account", "verify", "wallet", "update", "gpo", "pay"];

const isIpv4Host = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
const sha256_16 = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

export function normalizeUrl(rawInput) {
  if (!rawInput || typeof rawInput !== "string") throw new Error("EMPTY_URL");
  const trimmed = rawInput.trim().replace(/[\u200B-\u200D\uFEFF]/g, ""); // zero-width
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);

  const hostAscii = toASCII(url.hostname).toLowerCase();
  const hostUnicode = toUnicode(hostAscii);

  url.hostname = hostAscii; 

  return { url, hostAscii, hostUnicode };
}

function checkAgainstLists(hostAscii) {
  if (ALLOWLIST.includes(hostAscii)) return { verdict: "allow", reason: "allowlist" };
  if (DENYLIST.includes(hostAscii))  return { verdict: "block", reason: "denylist" };
  if (RISKY_TLDS.some(tld => hostAscii.endsWith(tld))) return { verdict: "review", reason: "risky_tld" };
  return null;
}

const MIXED_LATIN_CYRILLIC = /[A-Za-z].*[\u0400-\u04FF]|[\u0400-\u04FF].*[A-Za-z]/;
function checkHomographAndHeuristics(hostAscii, hostUnicode) {
  if (MIXED_LATIN_CYRILLIC.test(hostUnicode)) return { verdict: "block", reason: "mixed_scripts" };
  const firstLabel = hostUnicode.split(".")[0].toLowerCase();
  if (SUSPICIOUS_LABEL_KEYWORDS.some(w => firstLabel.includes(w))) {
    return { verdict: "review", reason: "suspicious_label" };
  }
  if (isIpv4Host(hostAscii)) return { verdict: "review", reason: "raw_ip_host" };
  return null;
}

async function lookupSafeBrowsing(urlString, signal) {
  if (!SAFE_BROWSING_API_KEY) return { verdict: "unknown", vendor: "none" };

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(SAFE_BROWSING_API_KEY)}`;
  const payload = {
    client: { clientId: "shortlink-app", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: urlString }]
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  const data = await res.json().catch(() => ({}));
  const matched = Array.isArray(data?.matches) && data.matches.length > 0;
  return matched ? { verdict: "block", vendor: "gsb" } : { verdict: "allow", vendor: "gsb" };
}

export async function guardUrl(inputUrl) {
  if (POLICY_MODE === "off") return { verdict: "allow", reason: "policy_off" };

  const { url, hostAscii, hostUnicode } = normalizeUrl(inputUrl);

  const staticVerdict =
    checkAgainstLists(hostAscii) ||
    checkHomographAndHeuristics(hostAscii, hostUnicode);

  if (staticVerdict) {
    if (staticVerdict.verdict === "block" && POLICY_MODE !== "review-only") {
      return { verdict: "block", reason: staticVerdict.reason };
    }
    if (staticVerdict.verdict === "review") {
      return { verdict: "review", reason: staticVerdict.reason };
    }
  }

  let ti = { verdict: "unknown", vendor: "none" };
  if (SAFE_BROWSING_API_KEY) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort("timeout"), THREAT_TIMEOUT_MS);
    try { ti = await lookupSafeBrowsing(url.toString(), ctl.signal); }
    catch { ti = { verdict: "review", vendor: "gsb_timeout" }; }
    finally { clearTimeout(timer); }
  }

  if (ti.verdict === "block" && POLICY_MODE !== "review-only") {
    return { verdict: "block", reason: "threat_intel", vendor: ti.vendor };
  }
  if (ti.verdict === "review") {
    return { verdict: "review", reason: "threat_intel", vendor: ti.vendor };
  }

  return { verdict: "allow", reason: "clean", vendor: ti.vendor };
}
