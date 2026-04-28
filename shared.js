(function () {
  const STORAGE_KEY = "vectis-2026-shared-state-v2";
  const DB_NAME = "ctis-2026-attachments";
  const DB_VERSION = 1;
  const ATTACH_STORE = "attachments";

  const SUPABASE_URL = "https://yspipbzfjmpjjkaucjia.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcGlwYnpmam1wamprYXVjamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzM2NTQsImV4cCI6MjA4OTA0OTY1NH0.UNOvKF8BWocaVE39gPN8hErBtSOYOyvzQ0LrFbbRUx0";
  const SUPABASE_BUCKET = "vectis2026";
  const TABLES = {
    submissions: "portal_submissions",
    reviewers: "portal_reviewers",
    assignments: "portal_assignments",
    reviews: "portal_reviews"
  };

  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const demoState = {
    submissions: [],
    reviewers: [],
    assignments: [],
    reviews: []
  };

  function normalizeState(state) {
    return {
      submissions: Array.isArray(state?.submissions) ? state.submissions : [],
      reviewers: Array.isArray(state?.reviewers) ? state.reviewers : [],
      assignments: Array.isArray(state?.assignments) ? state.assignments : [],
      reviews: Array.isArray(state?.reviews) ? state.reviews : []
    };
  }

  function parseOptionalNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function mapSubmissionFromRow(row) {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      title: row.title || "",
      authors: row.authors || "",
      schoolName: row.school_name || "",
      schoolAddress: row.school_address || "",
      emails: row.emails || "",
      submissionCategory: row.submission_category || "",
      theme: row.theme || "",
      implementationStart: row.implementation_start || "",
      weeklyPeriods: parseOptionalNumber(row.weekly_periods),
      teacherCount: parseOptionalNumber(row.teacher_count),
      studentCount: parseOptionalNumber(row.student_count),
      grades: row.grades || "",
      attachmentName: row.attachment_name || null,
      attachmentUrl: row.attachment_url || null,
      attachmentPath: row.attachment_path || null
    };
  }

  function mapSubmissionToRow(submission) {
    return {
      id: submission.id,
      created_at: submission.createdAt || new Date().toISOString(),
      updated_at: submission.updatedAt || submission.createdAt || new Date().toISOString(),
      title: submission.title || "",
      authors: submission.authors || "",
      school_name: submission.schoolName || "",
      school_address: submission.schoolAddress || "",
      emails: submission.emails || "",
      submission_category: submission.submissionCategory || "",
      theme: submission.theme || "",
      implementation_start: submission.implementationStart || null,
      weekly_periods: parseOptionalNumber(submission.weeklyPeriods),
      teacher_count: parseOptionalNumber(submission.teacherCount),
      student_count: parseOptionalNumber(submission.studentCount),
      grades: submission.grades || "",
      attachment_name: submission.attachmentName || null,
      attachment_url: submission.attachmentUrl || null,
      attachment_path: submission.attachmentPath || null
    };
  }

  function mapReviewerFromRow(row) {
    return {
      id: row.id,
      name: row.name || "",
      email: row.email || "",
      expertise: row.expertise || ""
      // capacity: parseOptionalNumber(row.capacity) || 1
    };
  }

  function mapReviewerToRow(reviewer) {
    return {
      id: reviewer.id,
      name: reviewer.name || "",
      email: reviewer.email || "",
      expertise: reviewer.expertise || ""
      // capacity: parseOptionalNumber(reviewer.capacity) || 1
    };
  }

  function mapAssignmentFromRow(row) {
    return {
      id: row.id,
      submissionId: row.submission_id,
      reviewerId: row.reviewer_id,
      assignedAt: row.assigned_at
    };
  }

  function mapAssignmentToRow(assignment) {
    return {
      id: assignment.id,
      submission_id: assignment.submissionId,
      reviewer_id: assignment.reviewerId,
      assigned_at: assignment.assignedAt || new Date().toISOString()
    };
  }

  function mapReviewFromRow(row) {
    return {
      id: row.id,
      reviewerId: row.reviewer_id,
      submissionId: row.submission_id,
      scores: row.scores || {},
      totalScore: parseOptionalNumber(row.total_score) || 0,
      recommendation: row.recommendation || "",
      comments: row.comments || "",
      updatedAt: row.updated_at
    };
  }

  function mapReviewToRow(review) {
    return {
      id: review.id,
      reviewer_id: review.reviewerId,
      submission_id: review.submissionId,
      scores: review.scores || {},
      total_score: parseOptionalNumber(review.totalScore) || 0,
      recommendation: review.recommendation || "",
      comments: review.comments || "",
      updated_at: review.updatedAt || new Date().toISOString()
    };
  }

  function sortSubmissions(submissions) {
    return [...submissions].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
  }

  function loadState() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return structuredClone(demoState);
    }

    try {
      const parsed = normalizeState(JSON.parse(stored));
      parsed.submissions = sortSubmissions(parsed.submissions);
      return parsed;
    } catch {
      return structuredClone(demoState);
    }
  }

  function saveState(state) {
    const normalized = normalizeState(state);
    normalized.submissions = sortSubmissions(normalized.submissions);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  async function fetchTableRows(table, orderBy) {
    if (!supabase) {
      throw new Error("Supabase client unavailable");
    }

    let query = supabase.from(table).select("*");
    if (orderBy?.column) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data || [];
  }

  async function loadStateRemote() {
    if (!supabase) return null;
    try {
      const [submissionRows, reviewerRows, assignmentRows, reviewRows] = await Promise.all([
        fetchTableRows(TABLES.submissions, { column: "created_at", ascending: false }),
        fetchTableRows(TABLES.reviewers, { column: "name", ascending: true }),
        fetchTableRows(TABLES.assignments, { column: "assigned_at", ascending: true }),
        fetchTableRows(TABLES.reviews, { column: "updated_at", ascending: false })
      ]);

      return {
        submissions: submissionRows.map(mapSubmissionFromRow),
        reviewers: reviewerRows.map(mapReviewerFromRow),
        assignments: assignmentRows.map(mapAssignmentFromRow),
        reviews: reviewRows.map(mapReviewFromRow)
      };
    } catch {
      return null;
    }
  }

  async function loadStateRemoteDetailed() {
    if (!supabase) {
      return { ok: false, error: "Supabase client unavailable", state: null };
    }

    try {
      const state = await loadStateRemote();
      if (!state) {
        return {
          ok: false,
          error: "Unable to load shared state from database.",
          state: null
        };
      }

      return {
        ok: true,
        error: null,
        state
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Unknown database error",
        state: null
      };
    }
  }

  async function saveStateRemote(state) {
    if (!supabase) return null;

    const normalized = normalizeState(state);
    await Promise.all([
      upsertRows(TABLES.submissions, normalized.submissions.map(mapSubmissionToRow), "id"),
      upsertRows(TABLES.reviewers, normalized.reviewers.map(mapReviewerToRow), "id"),
      upsertRows(TABLES.assignments, normalized.assignments.map(mapAssignmentToRow), "submission_id,reviewer_id"),
      upsertRows(TABLES.reviews, normalized.reviews.map(mapReviewToRow), "submission_id,reviewer_id")
    ]);

    const latestState = await loadStateRemote();
    if (latestState) {
      saveState(latestState);
    }
    return latestState;
  }

  async function upsertRows(table, rows, onConflict) {
    if (!supabase || !rows.length) {
      return;
    }

    const { error } = await supabase.from(table).upsert(rows, {
      onConflict
    });
    if (error) {
      throw error;
    }
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
    let attachmentUrl = submission.attachmentUrl || null;
    let attachmentPath = submission.attachmentPath || null;

    if (attachmentFile) {
      attachmentPath = `attachments/${submission.id}/${attachmentFile.name}`;
      attachmentUrl = await uploadAttachmentRemote(attachmentPath, attachmentFile);
      await saveAttachmentLocal(submission.id, attachmentFile.name, attachmentFile.type, attachmentFile);
    }

    const payload = {
      ...submission,
      attachmentUrl,
      attachmentPath,
      attachmentName: attachmentFile?.name || submission.attachmentName || null
    };
    await upsertRows(TABLES.submissions, [mapSubmissionToRow(payload)], "id");
    return payload;
  }

  async function listSubmissionsRemote() {
    if (!supabase) return [];
    try {
      const rows = await fetchTableRows(TABLES.submissions, { column: "created_at", ascending: false });
      return rows.map(mapSubmissionFromRow);
    } catch {
      return [];
    }
  }

  async function listSubmissionsRemoteDetailed() {
    if (!supabase) {
      return { ok: false, error: "Supabase client unavailable", submissions: [], filesFound: 0 };
    }

    try {
      const submissions = await listSubmissionsRemote();
      return {
        ok: true,
        error: null,
        submissions,
        filesFound: submissions.length
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Unable to list submissions",
        submissions: [],
        filesFound: 0
      };
    }
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
        const incoming = normalizeState(JSON.parse(String(reader.result)));
        incoming.submissions = sortSubmissions(incoming.submissions);
        saveState(incoming);
        callback(incoming);
      } catch {
        alert("That file could not be imported. Please choose a valid JSON export from this portal.");
      }
    };
    reader.readAsText(file);
  }

  function seedAssignmentsIfEmpty(state) {
    return state;
  }

  function resetState() {
    const nextState = structuredClone(demoState);
    saveState(nextState);
    return nextState;
  }

  window.PortalStore = {
    STORAGE_KEY,
    loadState,
    saveState,
    loadStateRemote,
    saveStateRemote,
    average,
    truncate,
    escapeHtml,
    renderCollection,
    seedAssignmentsIfEmpty,
    resetState,
    saveAttachmentLocal,
    getAttachmentLocal,
    uploadSubmissionRemote,
    listSubmissionsRemote,
    listSubmissionsRemoteDetailed,
    loadStateRemoteDetailed,
    downloadAttachment
  };
})();
