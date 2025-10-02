// backend/grist.js

import axios from "axios";

const base = process.env.GRIST_BASE_URL;
const docId = process.env.GRIST_DOC_ID;

const api = axios.create({
  baseURL: `${base}/docs/${docId}`,
  headers: {
    Authorization: `Bearer ${process.env.GRIST_API_KEY}`,
  },
});

console.log("GRIST baseURL:", `${base}/docs/${docId}`);

api.interceptors.response.use(
  r => r,
  err => {
    console.error("[Grist error]", err?.response?.status, err?.response?.data);
    throw err;
  }
);

/** Get a single record by id */
export async function gristGetById(table, recId) {
  recId = Number(recId);

  const { data } = await api.get(`/tables/${table}/records`, {
    params: {
      filter: JSON.stringify({ id: [recId] })
    },
  });

  return data?.records?.[0] ?? null;
}

/** Insert one record and return it */
export async function gristInsert(table, fields) {
  const { data } = await api.post(`/tables/${table}/records`, {
    records: [{ fields }],
  });
  return data.records?.[0];
}

export async function gristSelect(table, { filter, limit, offset, sort } = {}) {
  const params = {};
  if (filter) params.filter = filter;     // filter ต้องเป็น JSON string
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  if (sort) params.sort = sort;
  const { data } = await api.get(`/tables/${table}/records`, { params });
  return data; // { records: [...] }
}

/** Equality filter: gristQuery(LINKS, { code: 'abc' }) */
export async function gristQuery(table, filter = {}) {
  const hasFilter = filter && Object.keys(filter).length > 0;

  let params = undefined;
  if (hasFilter) {
    const normalized = Object.fromEntries(
      Object.entries(filter).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
    );
    params = { filter: JSON.stringify(normalized) };
  }

  const { data } = await api.get(`/tables/${table}/records`, params ? { params } : undefined);
  return data.records || [];
}

/** Update a record by id */
export async function gristUpdateById(table, recId, fields) {
  const resp = await api.patch(`/tables/${table}/records`, {
    records: [{ id: recId, fields }],
  });
  const data = resp?.data ?? null;
  if (!data || !data.records) return { id: recId, fields };
  return data.records[0];
}

/** Delete a single record by id */
export async function gristDeleteById(table, recId) {
  recId = Number(recId);
  try {
    await api.delete(`/tables/${table}/records`, { params: { ids: recId } });
    return true;
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 405) {
      await api.post(
        `/tables/${table}/records/${recId}`,
        {},
        { headers: { 'X-HTTP-Method-Override': 'DELETE' } }
      );
      return true;
    }
    throw e;
  }
}

/** Increment clicks safely by fetching exact record then PATCHing */
export async function gristIncrementClicks(table, recId) {
  recId = Number(recId);
  try {
    const { data } = await api.get(`/tables/${table}/records`, {
      params: { ids: recId }
    });
    const rec = data?.records?.[0];
    if (!rec) {
      console.warn("[clicks] record not found:", recId);
      return false;
    }

    const current = Number(rec.fields?.clicks) || 0;
    const next = current + 1;

    await api.patch(`/tables/${table}/records`, {
      records: [{ id: recId, fields: { clicks: next } }],
    });
    console.log(`[clicks] incremented ${recId}: ${current} -> ${next}`);
    return true;

  } catch (e) {
    console.error("[clicks] error incrementing clicks:", e?.response?.data || e?.message);
    return false;
  }
}

