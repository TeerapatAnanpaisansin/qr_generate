import axios from "axios";

/* Validate envs early */
const required = [
  "GRIST_BASE_URL",
  "GRIST_API_KEY",
  "GRIST_DOC_ID",
  "USERS_TABLE",
  "LINKS_TABLE",
];
for (const k of required) {
  const v = process.env[k];
  if (!v || String(v).trim() === "") {
    throw new Error(`Missing environment variable: ${k}`);
  }
}

/* Normalize base URL: must be https://.../api (no trailing slash) */
const rawBase = String(process.env.GRIST_BASE_URL).trim();
if (!/^https?:\/\//i.test(rawBase)) {
  throw new Error(`GRIST_BASE_URL must start with http(s):// — got "${rawBase}"`);
}
const base = rawBase.replace(/\/+$/, "");

/* Axios instance */
export const grist = axios.create({
  baseURL: base,
  headers: {
    Authorization: `Bearer ${process.env.GRIST_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export async function gristGetById(table, recId) {
  const id = Number(recId);
  if (!Number.isFinite(id)) throw new Error("gristGetById: invalid id");
  const { data } = await grist.get(
    `/docs/${process.env.GRIST_DOC_ID}/tables/${table}/records`,
    { params: { filter: JSON.stringify({ id: [id] }) } }
  );
  return data?.records?.[0] ?? null;
}

const DOC_ID = String(process.env.GRIST_DOC_ID).trim();
export const TABLES = {
  USERS: String(process.env.USERS_TABLE).trim(),
  LINKS: String(process.env.LINKS_TABLE).trim(),
};

const tableUrl = (table) => `/docs/${DOC_ID}/tables/${table}/records`;

export async function gristQuery(table, filter = {}) {
  const hasFilter = filter && Object.keys(filter).length > 0;
  let params;
  if (hasFilter) {
    const normalized = Object.fromEntries(
      Object.entries(filter).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
    );
    params = { filter: JSON.stringify(normalized) };
  }
  const { data } = await grist.get(tableUrl(table), { params });
  return data?.records ?? [];
}

export async function gristInsert(table, fields) {
  const { data } = await grist.post(tableUrl(table), { records: [{ fields }] });
  return data?.records?.[0] ?? null;
}

export async function gristUpdateById(table, recId, fields) {
  const { data } = await grist.patch(tableUrl(table), { records: [{ id: recId, fields }] });
  return data?.records?.[0] ?? null;
}

export async function gristDeleteById(table, recId) {
  await grist.delete(tableUrl(table), { data: { records: [{ id: recId }] } });
  return true;
}
