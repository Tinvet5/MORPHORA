(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Backend = root.MorphoraBackend;
  const Auth = root.MorphoraAuth;
  const DOCUMENT_TYPES = Object.freeze(["annotations", "drawings", "learning_progress", "quiz_history", "bookmarks"]);
  const DOCUMENT_COLUMNS = "id,document_type,document_key,payload,client_updated_at,updated_at,revision,deleted_at,last_mutation_id,last_client_id";

  function normalizeType(value) {
    const type = String(value || "").trim();
    if (!DOCUMENT_TYPES.includes(type)) throw new Error(`Unsupported MORPHORA sync document type: ${type || "<empty>"}`);
    return type;
  }

  function normalizeKey(value) {
    const key = String(value || "root").trim();
    if (!key || key.length > 240) throw new Error("Sync document key must be 1–240 characters.");
    return key;
  }

  function normalizeRevision(value) {
    if (value == null) return null;
    const revision = Number(value);
    if (!Number.isInteger(revision) || revision < 0) throw new Error("Expected revision must be a non-negative integer or null.");
    return revision;
  }

  async function context() {
    await Backend?.ready;
    const api = Backend?.getClient?.();
    if (!api) return { api: null, user: null, localOnly: true };
    const { user, error } = await Auth.getUser();
    if (error) throw error;
    return { api, user, localOnly: false };
  }

  async function getDocument(documentType, documentKey = "root") {
    const type = normalizeType(documentType);
    const key = normalizeKey(documentKey);
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: null, error: null, skipped: true, localOnly };
    return api.from("user_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("user_id", user.id)
      .eq("document_type", type)
      .eq("document_key", key)
      .maybeSingle();
  }

  async function upsertDocument(documentType, documentKey, payload, {
    clientUpdatedAt = new Date().toISOString(),
    expectedRevision = null,
    mutationId = null,
    clientId = null
  } = {}) {
    const type = normalizeType(documentType);
    const key = normalizeKey(documentKey);
    const expected = normalizeRevision(expectedRevision);
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: null, error: null, skipped: true, localOnly };

    const values = {
      user_id: user.id,
      document_type: type,
      document_key: key,
      payload,
      client_updated_at: clientUpdatedAt,
      deleted_at: null,
      last_mutation_id: mutationId || null,
      last_client_id: clientId || null
    };

    // No precondition means first-write/legacy behavior. V5.0.4.1 callers should
    // prefer revision-aware writes once they know the remote revision.
    if (expected == null) {
      const result = await api.from("user_documents")
        .upsert(values, { onConflict: "user_id,document_type,document_key" })
        .select(DOCUMENT_COLUMNS)
        .single();
      return { ...result, conflict: false };
    }

    if (expected === 0) {
      const inserted = await api.from("user_documents").insert(values).select(DOCUMENT_COLUMNS).single();
      if (!inserted.error) return { ...inserted, conflict: false };
      // 23505 is PostgreSQL unique_violation. A competing insert means the
      // caller's revision=0 assumption is stale, so expose the remote row.
      if (String(inserted.error.code || "") !== "23505") return { ...inserted, conflict: false };
      const remote = await getDocument(type, key);
      if (remote.data?.last_mutation_id && mutationId && remote.data.last_mutation_id === mutationId) {
        return { data: remote.data, error: null, conflict: false, alreadyApplied: true };
      }
      return { data: null, error: null, conflict: true, remote: remote.data || null };
    }

    const updated = await api.from("user_documents")
      .update(values)
      .eq("user_id", user.id)
      .eq("document_type", type)
      .eq("document_key", key)
      .eq("revision", expected)
      .select(DOCUMENT_COLUMNS)
      .maybeSingle();
    if (updated.error || updated.data) return { ...updated, conflict: false };

    const remote = await getDocument(type, key);
    if (remote.data?.last_mutation_id && mutationId && remote.data.last_mutation_id === mutationId) {
      return { data: remote.data, error: null, conflict: false, alreadyApplied: true };
    }
    return { data: null, error: null, conflict: true, remote: remote.data || null };
  }

  async function deleteDocument(documentType, documentKey = "root", {
    clientUpdatedAt = new Date().toISOString(),
    expectedRevision = null,
    mutationId = null,
    clientId = null
  } = {}) {
    const type = normalizeType(documentType);
    const key = normalizeKey(documentKey);
    const expected = normalizeRevision(expectedRevision);
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: null, error: null, skipped: true, localOnly };

    const values = {
      payload: {},
      client_updated_at: clientUpdatedAt,
      deleted_at: new Date().toISOString(),
      last_mutation_id: mutationId || null,
      last_client_id: clientId || null
    };

    let query = api.from("user_documents")
      .update(values)
      .eq("user_id", user.id)
      .eq("document_type", type)
      .eq("document_key", key);
    if (expected != null) query = query.eq("revision", expected);
    const updated = await query.select(DOCUMENT_COLUMNS).maybeSingle();
    if (updated.error || updated.data) return { ...updated, conflict: false };

    const remote = await getDocument(type, key);
    if (!remote.data) return { data: null, error: null, conflict: false, alreadyDeleted: true };
    if (remote.data.last_mutation_id && mutationId && remote.data.last_mutation_id === mutationId) {
      return { data: remote.data, error: null, conflict: false, alreadyApplied: true };
    }
    if (expected != null) return { data: null, error: null, conflict: true, remote: remote.data };
    return { data: null, error: null, conflict: false };
  }

  async function listDocuments(documentType, { includeDeleted = false } = {}) {
    const type = normalizeType(documentType);
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: [], error: null, skipped: true, localOnly };
    let query = api.from("user_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("user_id", user.id)
      .eq("document_type", type)
      .order("updated_at", { ascending: false });
    if (!includeDeleted) query = query.is("deleted_at", null);
    return query;
  }

  async function listChangedDocuments({ since = null, documentType = null, limit = 200 } = {}) {
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: [], error: null, skipped: true, localOnly };
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
    let query = api.from("user_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(safeLimit);
    if (since) query = query.gt("updated_at", since);
    if (documentType) query = query.eq("document_type", normalizeType(documentType));
    return query;
  }

  async function applyMutation(mutation) {
    const options = {
      clientUpdatedAt: mutation.clientUpdatedAt,
      expectedRevision: mutation.expectedRevision,
      mutationId: mutation.id,
      clientId: mutation.clientId
    };
    if (mutation.operation === "delete") return deleteDocument(mutation.documentType, mutation.documentKey, options);
    if (mutation.operation !== "upsert") throw new Error(`Unsupported sync mutation operation: ${mutation.operation}`);
    return upsertDocument(mutation.documentType, mutation.documentKey, mutation.payload, options);
  }

  root.MorphoraSync = Object.freeze({
    version: 2,
    documentTypes: DOCUMENT_TYPES,
    upsertDocument,
    getDocument,
    listDocuments,
    listChangedDocuments,
    deleteDocument,
    applyMutation
  });
})();
