import { apiDelete, apiGet, apiPost } from './api';

export const listDocuments = async () => (await apiGet('/api/documents')).data || [];
export const getDocument = async (id) => (await apiGet(`/api/documents/${encodeURIComponent(id)}`)).data;
export const saveDocument = async (document) => (await apiPost('/api/documents', document)).data;
export const deleteDocument = async (id) => apiDelete(`/api/documents/${encodeURIComponent(id)}`);

export function setCurrentDocumentId(id) {
  if (id) localStorage.setItem('studydesk_current_document_id', String(id));
  else localStorage.removeItem('studydesk_current_document_id');
}
export function getCurrentDocumentId() { return localStorage.getItem('studydesk_current_document_id'); }
export function clearCurrentDocumentId() { localStorage.removeItem('studydesk_current_document_id'); }

export async function getCurrentDocument(){ const id=getCurrentDocumentId(); if(!id) throw new Error("No document has been selected yet."); return getDocument(id); }
