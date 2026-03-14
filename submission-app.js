const store = window.PortalStore;
let state = { submissions: [], reviewers: [], assignments: [], reviews: [] };
let pendingAttachmentFile = null;
let pendingAttachmentName = null;

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  submissionsSummary: document.querySelector("#submissions-summary"),
  submissionForm: document.querySelector("#submission-form"),
  submissionList: document.querySelector("#submission-list"),
  uploadInput: document.querySelector("#submission-upload"),
  uploadStatus: document.querySelector("#upload-status")
};

elements.submissionForm.addEventListener("submit", handleSubmissionSave);
elements.uploadInput?.addEventListener("change", handleUpload);
loadAndRender();

const requiredFields = [
  "title",
  "authors",
  "schoolName",
  "schoolAddress",
  "emails",
  "shortAbstract",
  "background",
  "implementation",
  "impact"
];

async function loadAndRender() {
  state.submissions = await store.listSubmissionsRemote();
  render();
}

async function handleSubmissionSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const submission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: formData.get("title")?.toString().trim(),
    authors: formData.get("authors")?.toString().trim(),
    schoolName: formData.get("schoolName")?.toString().trim(),
    schoolAddress: formData.get("schoolAddress")?.toString().trim(),
    emails: formData.get("emails")?.toString().trim(),
    implementationStart: formData.get("implementationStart")?.toString().trim(),
    weeklyPeriods: Number(formData.get("weeklyPeriods")) || 0,
    teacherCount: Number(formData.get("teacherCount")) || 0,
    studentCount: Number(formData.get("studentCount")) || 0,
    grades: formData.get("grades")?.toString().trim(),
    genderRatio: formData.get("genderRatio")?.toString().trim(),
    evidenceLink: formData.get("evidenceLink")?.toString().trim(),
    shortAbstract: formData.get("shortAbstract")?.toString().trim(),
    background: formData.get("background")?.toString().trim(),
    implementation: formData.get("implementation")?.toString().trim(),
    challenges: formData.get("challenges")?.toString().trim(),
    impact: formData.get("impact")?.toString().trim(),
    conclusion: formData.get("conclusion")?.toString().trim(),
    references: formData.get("references")?.toString().trim(),
    attachmentName: pendingAttachmentName || null
  };

  try {
    await store.uploadSubmissionRemote(submission, pendingAttachmentFile);
    pendingAttachmentFile = null;
    pendingAttachmentName = null;
    setUploadStatus("", false);
    event.currentTarget.reset();
    await loadAndRender();
  } catch (error) {
    setUploadStatus("Upload failed. Please try again.", true);
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
        setUploadStatus("File loaded. Review the fields below and click Save submission to finish.", false);
      } catch (error) {
        setUploadStatus("Could not read that file. Upload a JSON export or a text file with key:value lines matching the template fields.", true);
      }
    };
    reader.readAsText(file);
  } else if (ext === "doc" || ext === "docx") {
    pendingAttachmentFile = file;
    pendingAttachmentName = file.name;
    setUploadStatus("DOC/DOCX attached. Please ensure the form fields match the template before saving.", false);
  } else {
    setUploadStatus("Unsupported file type. Use DOC/DOCX for attachments or JSON/TXT for auto-fill.", true);
  }

  event.target.value = "";
}

function parseUploadedContent(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const obj = {};
    raw.split(/\r?\n/).forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        obj[key.trim()] = rest.join(":").trim();
      }
    });
    return obj;
  }
}

function populateForm(data) {
  const fields = [
    "title",
    "authors",
    "schoolName",
    "schoolAddress",
    "emails",
    "implementationStart",
    "weeklyPeriods",
    "teacherCount",
    "studentCount",
    "grades",
    "genderRatio",
    "evidenceLink",
    "shortAbstract",
    "background",
    "implementation",
    "challenges",
    "impact",
    "conclusion",
    "references"
  ];

  fields.forEach((name) => {
    const input = elements.submissionForm.querySelector(`[name="${name}"]`);
    if (!input) return;
    const value = data[name];
    if (value === undefined) return;
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = String(value ?? "");
    }
  });
}

function setUploadStatus(message, isError) {
  if (!elements.uploadStatus) return;
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.style.color = isError ? "#8e2d2d" : "#556070";
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
          <span><strong>Authors:</strong> ${store.escapeHtml(submission.authors)}</span>
          <span><strong>School:</strong> ${store.escapeHtml(submission.schoolName)}</span>
        </div>
        <p>${store.escapeHtml(submission.shortAbstract || "")}</p>
        <p class="muted">Background: ${store.escapeHtml(store.truncate(submission.background || "", 180))}</p>
        ${submission.attachmentName && submission.attachmentUrl ? `<a class="button button--ghost" href="${submission.attachmentUrl}" target="_blank" rel="noopener">Download attachment</a>` : ""}
      </article>
    `
  );
}
