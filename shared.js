(function () {
  const STORAGE_KEY = "ctis-2026-review-portal";
  const DB_NAME = "ctis-2026-attachments";
  const DB_VERSION = 1;
  const ATTACH_STORE = "attachments";

  const SUPABASE_URL = "https://yspipbzfjmpjjkaucjia.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcGlwYnpmam1wamprYXVjamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzM2NTQsImV4cCI6MjA4OTA0OTY1NH0.UNOvKF8BWocaVE39gPN8hErBtSOYOyvzQ0LrFbbRUx0";
  const SUPABASE_BUCKET = "vectis2026";

  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const demoState = {
    submissions: [],
    reviewers: [],
    assignments: [],
    reviews: []
  };

  function loadState() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return structuredClone(demoState);
    }

    try {
      const parsed = JSON.parse(stored);
      return {
        submissions: parsed.submissions || [],
        reviewers: parsed.reviewers || [],
        assignments: parsed.assignments || [],
        reviews: parsed.reviews || []
      };
    } catch {
      return structuredClone(demoState);
    }
  }

  function saveState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function seedAssignmentsIfEmpty(state) {
    if (state.assignments.length || state.submissions.length < 2 || state.reviewers.length < 2) {
      return;
    }

    state.assignments = [];
  }

  function resetState() {
    const state = structuredClone(demoState);
    saveState(state);
    return state;
  }

  // IndexedDB attachment storage (local cache for older records)
  const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(ATTACH_STORE)) {
        db.createObjectStore(ATTACH_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  async function saveAttachmentLocal(submissionId, name, type, blob) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([ATTACH_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(ATTACH_STORE).put({ id: submissionId, name, type, blob });
    });
  }

  async function getAttachmentLocal(submissionId) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([ATTACH_STORE], "readonly");
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(ATTACH_STORE).get(submissionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function uploadAttachmentRemote(path, file) {
    if (!supabase) throw new Error("Supabase client unavailable");
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadSubmissionRemote(submission, attachmentFile) {
    if (!supabase) throw new Error("Supabase client unavailable");
    let attachmentUrl = null;
    let attachmentPath = null;

    if (attachmentFile) {
      attachmentPath = `attachments/${submission.id}/${attachmentFile.name}`;
      attachmentUrl = await uploadAttachmentRemote(attachmentPath, attachmentFile);
      await saveAttachmentLocal(submission.id, attachmentFile.name, attachmentFile.type, attachmentFile);
    }

    const payload = { ...submission, attachmentUrl, attachmentPath, attachmentName: attachmentFile?.name || submission.attachmentName || null };
    const metaBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const metaPath = `submissions/${submission.id}.json`;
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(metaPath, metaBlob, { upsert: true });
    if (error) throw error;
    return payload;
  }

  async function listSubmissionsRemote() {
    if (!supabase) return [];
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list("submissions", { limit: 1000 });
    if (error) return [];
    const results = await Promise.all(
      data.map(async (item) => {
        const { data: fileData, error: dlError } = await supabase.storage.from(SUPABASE_BUCKET).download(`submissions/${item.name}`);
        if (dlError || !fileData) return null;
        const text = await fileData.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  async function downloadAttachment(path) {
    if (!supabase) return null;
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(path);
    if (error) return null;
    return data;
  }

  function average(values) {
    if (!values.length) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function truncate(value, maxLength) {
    if (!value || value.length <= maxLength) {
      return value || "";
    }

    return `${value.slice(0, maxLength).trim()}...`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderCollection(container, items, emptyMessage, template) {
    if (!items.length) {
      const empty = document.querySelector("#empty-state-template").content.firstElementChild.cloneNode(true);
      empty.querySelector("p").textContent = emptyMessage;
      container.replaceChildren(empty);
      return;
    }

    container.innerHTML = items.map(template).join("");
  }

  function exportState(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ctis-2026-review-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importState(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result));
        const state = {
          submissions: incoming.submissions || [],
          reviewers: incoming.reviewers || [],
          assignments: incoming.assignments || [],
          reviews: incoming.reviews || []
        };
        saveState(state);
        callback(state);
      } catch {
        alert("That file could not be imported. Please choose a valid JSON export from this portal.");
      }
    };
    reader.readAsText(file);
  }

  window.PortalStore = {
    STORAGE_KEY,
    loadState,
    saveState,
    seedAssignmentsIfEmpty,
    resetState,
    average,
    truncate,
    escapeHtml,
    renderCollection,
    exportState,
    importState,
    saveAttachmentLocal,
    getAttachmentLocal,
    uploadSubmissionRemote,
    listSubmissionsRemote,
    downloadAttachment
  };
})();
