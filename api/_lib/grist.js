import axios from "axios";

/** Build config only when first used (prevents platform 404 on Vercel if envs are missing) */
function getConfig() {
  const must = (k) => {
    const v = process.env[k];
    if (!v || String(v).trim() === "") throw new Error(`Missing env: ${k}`);
    return String(v).trim();
  };

  const rawBase = must("GRIST_BASE_URL");
  if (!/^https?:\/\//i.test(rawBase)) {
    throw new Error(`GRIST_BASE_URL must start with http(s):// — got "${rawBase}"`);
  }
  const base = rawBase.replace(/\/+$/, "");

  return {
    base,
    key: must("GRIST_API_KEY"),
    doc: must("GRIST_DOC_ID"),
    tables: {
      USERS: must("USERS_TABLE"),
      LINKS: must("LINKS_TABLE"),
    },
  };
}

let client = null;
let CFG = null;
function ensureClient() {
  if (client) return;
  CFG = getConfig();
  client = axios.create({
    baseURL: CFG.base,
    headers: {
      Authorization: `Bearer ${CFG.key}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

/** Helpers */
export const TABLES = new Proxy(
  {},
  {
    get(_, prop) {
      ensureClient();
      return CFG.tables[String(prop).toUpperCase()];
    },
  }
);

const tableUrl = (table) => {
  ensureClient();
  return `/docs/${CFG.doc}/tables/${table}/records`;
};

/** CRUD (same API as before) */
export async function gristGetById(table, recId) {
  ensureClient();
  const id = Number(recId);
  if (!Number.isFinite(id)) throw new Error("gristGetById: invalid id");
  const { data } = await client.get(tableUrl(table), {
    params: { filter: JSON.stringify({ id: [id] }) },
  });
  return data?.records?.[0] ?? null;
}

export async function gristQuery(table, filter = {}) {
  ensureClient();
  const hasFilter = filter && Object.keys(filter).length > 0;
  let params;
  if (hasFilter) {
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

export async function gristUpdateById(table, recId, fields) {
  ensureClient();
  const { data } = await client.patch(tableUrl(table), {
    records: [{ id: recId, fields }],
  });
  return data?.records?.[0] ?? null;
}

export async function gristDeleteById(table, recId) {
  ensureClient();
  await client.delete(tableUrl(table), { data: { records: [{ id: recId }] } });
  return true;
}
