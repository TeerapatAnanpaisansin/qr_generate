import axios from "axios";

const base = process.env.GRIST_BASE_URL;
const docId = process.env.GRIST_DOC_ID;

const api = axios.create(
  {
    baseURL: `${base}/docs/${docId}`,
    headers: {
      Authorization: `Bearer ${process.env.GRIST_API_KEY}`,
    },
  }
);

export async function gristGetById(table, recId) {
  const {data} = await api.get(`/tables/${table}/records`,
    {
      params: {filter: JSON.stringify({ id: [Number(recId)] }) },
    },
  );
}

export async function gristInsert(table, fields) {
  const { data } = await api.post(`/tables/${table}/records`,
    {
      records: [{ fields }]
    },
  );
  return data.records?.[0]
}

export async function gristQuery(table, filter = {}) {
  const hasFilter = filter && Object.keys(filter).length > 0
  let params = undefined;
  if (hasFilter) {
    const normalized = Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
    );
    params = {filter: JSON.stringify(normalized)};
  }
  const { data } = await api.get(`/tables/${table}/records`, params ? { params } : undefined);
  return data.records || [];
}

export async function gristUpdateById(table, recId, fields) {
  const resp = await api.patch(`/tables/${table}/records`,
    {
      records: [{ id: recId, fields }]
    }
  );
  return resp?.data?.records?.[0];
}

export async function gristDeleteById(table, recId) {
  await api.delete(`/tables/${table}/records` , { params: { ids: Number(recId)} });
  return true;
}