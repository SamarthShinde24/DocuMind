const BASE = "/api";

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Upload failed.");
  return data;
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch documents.");
  return data.documents;
}

export async function deleteDocument(filename) {
  const res = await fetch(`${BASE}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Delete failed.");
  return data;
}

export async function queryKnowledgeBase(question, history = []) {
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Query failed.");
  return data;
}
