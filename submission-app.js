const store = window.PortalStore;
let state = { submissions: [], reviewers: [], assignments: [], reviews: [] };
let pendingAttachmentFile = null;
let pendingAttachmentName = null;
let attachmentMode = false;

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  submissionsSummary: document.querySelector("#submissions-summary"),
  submissionForm: document.querySelector("#submission-form"),
  submissionList: document.querySelector("#submission-list"),
  uploadInput: document.querySelector("#submission-upload"),
  uploadStatus: document.querySelector("#upload-status"),
  modeInputs: document.querySelectorAll('input[name="submissionMode"]'),
  submissionIdRow: document.querySelector("#submission-id-row"),
  submissionIdInput: document.querySelector("#submission-id")
};

elements.submissionForm.addEventListener("submit", handleSubmissionSave);
elements.uploadInput?.addEventListener("change", handleUpload);
elements.modeInputs?.forEach((input) => input.addEventListener("change", handleUpdateToggle));

const requiredFields = [
  "submissionCategory",
  "title",
  "authors",
  "schoolName",
  "schoolAddress",
  "emails",
  "theme",
];

loadAndRender();
setRequired(true);
handleUpdateToggle();

async function loadAndRender() {
  const remoteState = await store.loadStateRemote();
  if (remoteState) {
    state = remoteState;
    store.saveState(state);
  } else {
    state = store.loadState();
  }
  render();
}

async function handleSubmissionSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const isUpdate = formData.get("submissionMode") === "update";
  const requestedId = formData.get("submissionId")?.toString().trim();
  const existingSubmission = isUpdate ? state.submissions.find((item) => item.id === requestedId) : null;

  if (isUpdate && !requestedId) {
    setUploadStatus("Please enter the submission ID to update an existing submission.", true);
    return;
  }

  if (isUpdate && !existingSubmission) {
    setUploadStatus(`No submission found for ID ${requestedId}. Please check the ID and try again.`, true);
    return;
  }

  const validationError = validateSubmission(formData, existingSubmission, isUpdate);
  if (validationError) {
    setUploadStatus(validationError, true);
    return;
  }

  const submissionId = isUpdate ? requestedId : createSubmissionId();
  const rawSubmission = {
    id: submissionId,
    createdAt: existingSubmission?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: formData.get("title")?.toString().trim(),
    authors: formData.get("authors")?.toString().trim(),
    schoolName: formData.get("schoolName")?.toString().trim(),
    schoolAddress: formData.get("schoolAddress")?.toString().trim(),
    emails: formData.get("emails")?.toString().trim(),
    submissionCategory: formData.get("submissionCategory")?.toString().trim(),
    theme: formData.get("theme")?.toString().trim(),
    implementationStart: formData.get("implementationStart")?.toString().trim(),
    weeklyPeriods: parseOptionalNumber(formData.get("weeklyPeriods")),
    teacherCount: parseOptionalNumber(formData.get("teacherCount")),
    studentCount: parseOptionalNumber(formData.get("studentCount")),
    grades: formData.get("grades")?.toString().trim(),
    attachmentName: pendingAttachmentName || existingSubmission?.attachmentName || null,
    attachmentUrl: existingSubmission?.attachmentUrl || null,
    attachmentPath: existingSubmission?.attachmentPath || null
  };
  const submission = isUpdate ? mergeSubmissionUpdate(existingSubmission, rawSubmission) : rawSubmission;

  try {
    const saved = await store.uploadSubmissionRemote(submission, pendingAttachmentFile);
    if (isUpdate) {
      state.submissions = state.submissions.map((item) => (item.id === submissionId ? saved : item));
    } else {
      state.submissions.unshift(saved);
    }
    pendingAttachmentFile = null;
    pendingAttachmentName = null;
    attachmentMode = false;
    setUploadStatus(
      isUpdate
        ? `Thank you. Submission ${submissionId} has been updated.`
        : `Thank you for the submission. Your submission ID is ${submissionId}.`,
      false
    );
    form.reset();
    clearSubmissionCategorySelection();
    elements.modeInputs?.forEach((input) => {
      input.checked = input.value === "new";
    });
    handleUpdateToggle();
    setRequired(true);
    store.saveState(state);
    try {
      const mergedState = await store.saveStateRemote(state);
      if (mergedState) {
        state = mergedState;
      }
    } catch (stateError) {
      const details = stateError?.message || stateError?.error_description || stateError?.name || "Unknown sync error";
      setUploadStatus(
        isUpdate
          ? `Thank you. Submission ${submissionId} has been updated, but shared sync failed: ${details}`
          : `Thank you for the submission. Your submission ID is ${submissionId}. Please note it down. Shared sync failed: ${details}`,
        true
      );
    }
    render();
  } catch (error) {
    const details = error?.message || error?.error_description || error?.name || "Unknown error";
    const message = details === "Failed to fetch"
      ? "Upload failed: Could not reach Supabase. Please check your internet connection or Supabase access and try again."
      : `Upload failed: ${details}`;
    setUploadStatus(message, true);
  }
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "json" || ext === "txt") {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseUploadedContent(String(reader.result));
        const missing = requiredFields.filter((field) => !parsed[field] || !String(parsed[field]).trim());
        if (missing.length) {
          setUploadStatus(`Missing required section(s): ${missing.join(", ")}. Please complete these before uploading.`, true);
          return;
        }
        populateForm(parsed);
        pendingAttachmentFile = null;
        pendingAttachmentName = null;
        attachmentMode = false;
        setRequired(true);
        setUploadStatus("File loaded. Review the fields below and click Save submission to finish.", false);
      } catch (error) {
        setUploadStatus("Could not read that file. Upload a JSON export or a text file with key:value lines matching the template fields.", true);
      }
    };
    reader.readAsText(file);
  } else if (ext === "doc" || ext === "docx" || ext === "pdf" || ext === "ppt" || ext === "pptx") {
    pendingAttachmentFile = file;
    pendingAttachmentName = file.name;
    attachmentMode = true;
    setRequired(false);
    setUploadStatus("Attachment added. You can submit it directly without filling the remaining fields.", false);
  } else {
    setUploadStatus("Unsupported file type. Use DOC, DOCX, PDF, PPT, or PPTX for attachments, or JSON/TXT for auto-fill.", true);
  }

  event.target.value = "";
}

function setUploadStatus(message, isError) {
  if (!elements.uploadStatus) return;
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.style.color = isError ? "#8e2d2d" : "#556070";
}

function validateSubmission(formData, existingSubmission, isUpdate) {
  const emails = formData.get("emails")?.toString().trim() || "";
  const implementationStart = formData.get("implementationStart")?.toString().trim() || "";

  const effectiveEmails = resolveUpdatedValue(emails, existingSubmission?.emails, isUpdate);
  if (effectiveEmails && !hasValidEmails(effectiveEmails)) {
    return "Please enter a valid email address.";
  }

  const effectiveYear = resolveUpdatedValue(implementationStart, existingSubmission?.implementationStart, isUpdate);
  if (effectiveYear) {
    const year = Number(effectiveYear);
    if (!Number.isInteger(year) || year < 2017 || year > 2026) {
      return "CT implementation start year must be between 2017 and 2026.";
    }
  }

  return "";
}

function handleUpdateToggle() {
  const isUpdate = Array.from(elements.modeInputs || []).some((input) => input.checked && input.value === "update");
  if (elements.submissionIdRow) {
    elements.submissionIdRow.hidden = !isUpdate;
  }
  if (elements.submissionIdInput) {
    elements.submissionIdInput.required = isUpdate;
    if (!isUpdate) {
      elements.submissionIdInput.value = "";
    }
  }
}

function createSubmissionId() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `VE-CTIS-2026-${datePart}-${timePart}-${randomPart}`;
}

function mergeSubmissionUpdate(existingSubmission, incomingSubmission) {
  const merged = { ...existingSubmission, ...incomingSubmission };
  Object.entries(incomingSubmission).forEach(([key, value]) => {
    if (key === "id" || key === "createdAt" || key === "updatedAt") {
      return;
    }
    if (typeof value === "string" && value.trim() === "") {
      merged[key] = existingSubmission?.[key] ?? "";
    }
    if (value === null || value === undefined) {
      merged[key] = existingSubmission?.[key];
    }
  });
  return merged;
}

function resolveUpdatedValue(incomingValue, existingValue, isUpdate) {
  if (isUpdate && (!incomingValue || incomingValue.trim() === "")) {
    return existingValue || "";
  }
  return incomingValue;
}

function hasValidEmails(value) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return value
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .every((entry) => emailPattern.test(entry));
}

function parseOptionalNumber(value) {
  const text = value?.toString().trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function setRequired(enabled) {
  requiredFields.forEach((name) => {
    elements.submissionForm.querySelectorAll(`[name="${name}"]`).forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
        input.required = enabled && !attachmentMode;
      }
    });
  });
}

function clearSubmissionCategorySelection() {
  elements.submissionForm.querySelectorAll('[name="submissionCategory"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = false;
    }
  });
}

function render() {
  elements.submissionCount.textContent = state.submissions.length;
  elements.submissionsSummary.textContent = `${state.submissions.length} saved`;

  store.renderCollection(
    elements.submissionList,
    state.submissions,
    "No submissions yet. Add the first teacher abstract to start the workflow.",
    (submission) => `
      <article class="card">
        <h3>${store.escapeHtml(submission.title)}</h3>
        <div class="meta-row">
          <span><strong>ID:</strong> ${store.escapeHtml(submission.id)}</span>
          <span><strong>Type:</strong> ${store.escapeHtml(submission.submissionCategory || "-")}</span>
          <span><strong>Authors:</strong> ${store.escapeHtml(submission.authors)}</span>
          <span><strong>School:</strong> ${store.escapeHtml(submission.schoolName)}</span>
          <span><strong>Theme:</strong> ${store.escapeHtml(submission.theme || "-")}</span>
        </div>
        ${submission.attachmentUrl ? `<a class="button button--ghost" href="${submission.attachmentUrl}" target="_blank" rel="noopener">Download attachment</a>` : ""}
      </article>
    `
  );
}
