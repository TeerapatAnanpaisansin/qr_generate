// api/_lib/grist.js
import axios from "axios";

/** Lazily creates an axios client and caches config */
let client = null;
let CFG = null;

function must(k) {
  const v = process.env[k];
  if (!v || String(v).trim() === "") throw new Error(`Missing env: ${k}`);
  return String(v).trim();
}

function ensureClient() {
  if (client) return;
  const rawBase = must("GRIST_BASE_URL");
  if (!/^https?:\/\//i.test(rawBase)) {
    throw new Error(`GRIST_BASE_URL must start with http(s):// — got "${rawBase}"`);
  }
  CFG = {
    base: rawBase.replace(/\/+$/, ""),
    key: must("GRIST_API_KEY"),
    doc: must("GRIST_DOC_ID"),
    tables: { USERS: must("USERS_TABLE"), LINKS: must("LINKS_TABLE") }
  };
  client = axios.create({
    baseURL: CFG.base,
    headers: { Authorization: `Bearer ${CFG.key}`, "Content-Type": "application/json" },
    timeout: 15000
  });
}

export const TABLES = new Proxy({}, {
  get(_, k) { ensureClient(); return CFG.tables[String(k).toUpperCase()]; }
});

const tableUrl = (t) => { ensureClient(); return `/docs/${CFG.doc}/tables/${t}/records`; };

/** Query by field filters (values can be scalar or array) */
export async function gristQuery(table, filter = {}) {
  ensureClient();
  const has = filter && Object.keys(filter).length > 0;
  let params;
  if (has) {
    const normalized = Object.fromEntries(
      Object.entries(filter).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
    );
    params = { filter: JSON.stringify(normalized) };
  }
  const { data } = await client.get(tableUrl(table), { params });
  return data?.records ?? [];
}

export async function gristInsert(table, fields) {
  ensureClient();
  const { data } = await client.post(tableUrl(table), { records: [{ fields }] });
  return data?.records?.[0] ?? null;
}

export async function gristUpdateById(table, id, fields) {
  ensureClient();
  const { data } = await client.patch(tableUrl(table), { records: [{ id, fields }] });
  return data?.records?.[0] ?? null;
}

export async function gristDeleteById(table, id) {
  ensureClient();
  await client.delete(tableUrl(table), { data: { records: [{ id }] } });
  return true;
}
