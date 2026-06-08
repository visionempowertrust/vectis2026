const store = window.PortalStore;
let state = store.loadState();

const REVIEW_PASSCODE = "2026ctiskey";
let remoteRefreshTimer = null;

const RANKING_DASHBOARDS = [
  {
    summaryKey: "teacherRankingsSummary",
    bodyKey: "teacherRankingsBody",
    emptyMessage: "No in-service or B.Ed student ranked papers yet.",
    matches: (category) => isTeacherRankingCategory(category)
  },
  {
    summaryKey: "veStaffRankingsSummary",
    bodyKey: "veStaffRankingsBody",
    emptyMessage: "No VE staff ranked papers yet.",
    matches: (category) => isVeStaffRankingCategory(category)
  },
  {
    summaryKey: "uncategorizedRankingsSummary",
    bodyKey: "uncategorizedRankingsBody",
    emptyMessage: "No uncategorized ranked papers yet.",
    matches: (category) => !isTeacherRankingCategory(category) && !isVeStaffRankingCategory(category)
  }
];

const INDIAN_STATES_AND_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const TEACHER_RANKING_CSV_COLUMNS = [
  ["Rank", "rank"],
  ["Submission ID", "id"],
  ["Created at", "createdAt"],
  ["Updated at", "updatedAt"],
  ["Submission category", "submissionCategory"],
  ["Abstract title", "title"],
  ["Teacher author(s)", "authors"],
  ["School affiliation", "schoolName"],
  ["School address", "schoolAddress"],
  ["Contact email(s)", "emails"],
  ["CT implementation start year", "implementationStart"],
  ["Theme", "theme"],
  ["Weekly CT periods", "weeklyPeriods"],
  ["Teachers involved", "teacherCount"],
  ["Student count", "studentCount"],
  ["Grades served", "grades"],
  ["Attachment name", "attachmentName"],
  ["Attachment URL", "attachmentUrl"],
  ["Attachment path", "attachmentPath"],
  ["Assignment count", "assignmentCount"],
  ["Review count", "reviewCount"],
  ["Average score", "averageScore"],
  ["Recommendation summary", "recommendationSummary"],
  ["Status", "status"]
];

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  reviewerCount: document.querySelector("#reviewer-count"),
  reviewCount: document.querySelector("#review-count"),
  teacherRankingsSummary: document.querySelector("#teacher-rankings-summary"),
  exportTeacherRankingsCsv: document.querySelector("#export-teacher-rankings-csv"),
  veStaffRankingsSummary: document.querySelector("#ve-staff-rankings-summary"),
  uncategorizedRankingsSummary: document.querySelector("#uncategorized-rankings-summary"),
  assignmentSummary: document.querySelector("#assignment-summary"),
  reviewerForm: document.querySelector("#reviewer-form"),
  assignmentForm: document.querySelector("#assignment-form"),
  reviewForm: document.querySelector("#review-form"),
  teacherRankingsBody: document.querySelector("#teacher-rankings-body"),
  veStaffRankingsBody: document.querySelector("#ve-staff-rankings-body"),
  uncategorizedRankingsBody: document.querySelector("#uncategorized-rankings-body"),
  loadList: document.querySelector("#load-list"),
  unassignedSummary: document.querySelector("#unassigned-summary"),
  unassignedList: document.querySelector("#unassigned-list"),
  submissionSummaryTotal: document.querySelector("#submission-summary-total"),
  categorySummaryList: document.querySelector("#category-summary-list"),
  themeSummaryList: document.querySelector("#theme-summary-list"),
  stateSummaryList: document.querySelector("#state-summary-list"),
  assignmentSubmission: document.querySelector("#assignment-submission"),
  assignmentReviewer: document.querySelector("#assignment-reviewer"),
  reviewerSelect: document.querySelector("#reviewer-select"),
  reviewSubmission: document.querySelector("#review-submission"),
  reviewSubmissionDataMessage: document.querySelector("#review-submission-data-message"),
  reviewDetailsDialog: document.querySelector("#review-details-dialog"),
  reviewDetailsTitle: document.querySelector("#review-details-title"),
  reviewDetailsBody: document.querySelector("#review-details-body"),
  reviewDetailsClose: document.querySelector("#review-details-close")
};

bindEvents();
loadRemoteState();
startRemoteRefresh();

async function loadRemoteState() {
  const remoteState = await store.loadStateRemoteDetailed();
  if (remoteState.ok && remoteState.state) {
    state = remoteState.state;
    store.saveState(state);
  } else {
    state = store.loadState();
  }

  store.saveState(state);
  render();
}

function bindEvents() {
  elements.reviewerForm.addEventListener("submit", handleReviewerSave);
  elements.assignmentForm.addEventListener("submit", handleAssignmentSave);
  elements.reviewForm.addEventListener("submit", handleReviewSave);
  elements.reviewerSelect.addEventListener("change", populateReviewSubmissionOptions);
  elements.reviewSubmission.addEventListener("change", updateReviewSubmissionDataMessage);
  elements.exportTeacherRankingsCsv?.addEventListener("click", exportTeacherRankingsCsv);
  RANKING_DASHBOARDS.forEach((dashboard) => {
    elements[dashboard.bodyKey].addEventListener("click", handleRankingReviewClick);
  });
  elements.reviewDetailsClose?.addEventListener("click", () => elements.reviewDetailsDialog?.close());
  window.addEventListener("focus", () => {
    void loadRemoteState();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void loadRemoteState();
    }
  });
}

async function handleReviewerSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.reviewers.push({
    id: crypto.randomUUID(),
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    expertise: formData.get("expertise")?.toString().trim(),
    // capacity: Number(formData.get("capacity")) || 1
  });
  await persist();
  event.currentTarget.reset();
  render();
}

async function handleAssignmentSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const submissionId = formData.get("submissionId")?.toString();
  const reviewerId = formData.get("reviewerId")?.toString();

  if (!submissionId || !reviewerId) {
    return;
  }

  if (state.assignments.some((entry) => entry.submissionId === submissionId && entry.reviewerId === reviewerId)) {
    alert("That reviewer is already assigned to this paper.");
    return;
  }

  state.assignments.push({
    id: crypto.randomUUID(),
    submissionId,
    reviewerId,
    assignedAt: new Date().toISOString()
  });
  await persist();
  render();
}

async function handleReviewSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const reviewerId = formData.get("reviewerId")?.toString();
  const submissionId = formData.get("submissionId")?.toString();
  const passcode = formData.get("passcode")?.toString();

  if (passcode !== REVIEW_PASSCODE) {
    alert("Passcode incorrect");
    return;
  }

  if (!state.assignments.some((entry) => entry.reviewerId === reviewerId && entry.submissionId === submissionId)) {
    alert("Only assigned reviewers can submit a review for this paper.");
    return;
  }

  const scores = {
    objective: Number(formData.get("objective")) || 0,
    resources: Number(formData.get("resources")) || 0,
    ctAlignment: Number(formData.get("ctAlignment")) || 0,
    evidence: Number(formData.get("evidence")) || 0,
    challenges: Number(formData.get("challenges")) || 0,
    inPictures: Number(formData.get("inPictures")) || 0,
    studentExperiences: Number(formData.get("studentExperiences")) || 0,
    decomposition: Number(formData.get("decomposition")) || 0,
    algorithmicThinking: Number(formData.get("algorithmicThinking")) || 0,
    patternRecognition: Number(formData.get("patternRecognition")) || 0,
    abstraction: Number(formData.get("abstraction")) || 0,
    potential: Number(formData.get("potential")) || 0
  };

  const existing = state.reviews.find((entry) => entry.reviewerId === reviewerId && entry.submissionId === submissionId);
  const payload = {
    id: existing?.id || crypto.randomUUID(),
    reviewerId,
    submissionId,
    scores,
    totalScore: sumScores(Object.values(scores)),
    recommendation: formData.get("recommendation")?.toString(),
    comments: formData.get("comments")?.toString().trim(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.reviews.push(payload);
  }

  await persist();
  render();
  clearReviewForm();
}

function clearReviewForm() {
  elements.reviewForm.reset();
  elements.reviewForm.querySelectorAll("input, select, textarea").forEach((field) => {
    field.value = "";
  });
  populateReviewSubmissionOptions();
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  store.importState(file, (nextState) => {
    state = nextState;
    store.seedAssignmentsIfEmpty(state);
    persist();
    render();
  });
  event.target.value = "";
}

function handleReset() {
  if (!window.confirm("Reset the portal back to the demo event data?")) {
    return;
  }

  state = store.resetState();
  persist();
  render();
}

async function persist() {
  store.saveState(state);
  const mergedState = await store.saveStateRemote(state);
  if (mergedState) {
    state = mergedState;
  }
}

function startRemoteRefresh() {
  if (remoteRefreshTimer) {
    clearInterval(remoteRefreshTimer);
  }
  remoteRefreshTimer = window.setInterval(() => {
    if (!document.hidden) {
      void loadRemoteState();
    }
  }, 15000);
}

function render() {
  elements.submissionCount.textContent = state.submissions.length;
  elements.reviewerCount.textContent = state.reviewers.length;
  elements.reviewCount.textContent = state.reviews.length;
  elements.assignmentSummary.textContent = `${state.assignments.length} assignments`;

  renderDashboard();
  renderUnassignedAbstracts();
  renderSubmissionSummary();
  populateAssignmentOptions();
  populateReviewerOptions();
  populateReviewSubmissionOptions();
}

function renderDashboard() {
  const ranked = getRankedSubmissions();
  RANKING_DASHBOARDS.forEach((dashboard) => {
    const dashboardRanked = ranked.filter((entry) => dashboard.matches(normalizeSubmissionCategory(entry.submission.submissionCategory)));
    elements[dashboard.summaryKey].textContent = `${dashboardRanked.length} ranked`;
    elements[dashboard.bodyKey].innerHTML = renderRankingRows(dashboardRanked, dashboard.emptyMessage);
  });

  store.renderCollection(elements.loadList, state.reviewers, "Reviewer load appears here after you add the committee.", (reviewer) => {
    const assignments = getAssignmentsForReviewer(reviewer.id);
    const completedAssignments = assignments.filter((assignment) =>
      state.reviews.some((review) => review.reviewerId === reviewer.id && review.submissionId === assignment.submissionId)
    );
    const pendingAssignments = assignments.filter((assignment) =>
      !state.reviews.some((review) => review.reviewerId === reviewer.id && review.submissionId === assignment.submissionId)
    );
    return `
      <article class="card">
        <h3>${store.escapeHtml(reviewer.name)}</h3>
        <div class="meta-row">
          <!-- <span><strong>Assigned:</strong> ${assignments.length}/${reviewer.capacity}</span> -->
          <span><strong>Assigned:</strong> ${assignments.length}</span>
          <span><strong>Completed:</strong> ${completedAssignments.length}</span>
          <span><strong>Pending:</strong> ${pendingAssignments.length}</span>
        </div>
        <div class="stack">
          <div>
            <strong>Completed papers</strong>
            ${renderSubmissionStatusList(completedAssignments, "No completed reviews yet.")}
          </div>
          <div>
            <strong>Pending papers</strong>
            ${renderGroupedSubmissionStatusList(pendingAssignments, "No pending reviews.")}
          </div>
        </div>
      </article>
    `;
  });
}

function renderRankingRows(ranked, emptyMessage) {
  return ranked.length
    ? ranked.map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${store.escapeHtml(entry.submission.id || "-")}</td>
        <td>${store.escapeHtml(entry.submission.submissionCategory || "-")}</td>
        <td>${store.escapeHtml(entry.submission.title)}</td>
        <td>${store.escapeHtml(entry.submission.schoolName)}</td>
        <td>${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</td>
        <td>${renderReviewCountLink(entry.submission.id, entry.metrics.reviewCount)}</td>
        <td>${store.escapeHtml(entry.metrics.recommendationSummary)}</td>
        <td><span class="status ${statusClass(entry.metrics)}">${statusText(entry.metrics)}</span></td>
      </tr>
    `).join("")
    : `<tr><td colspan="9">${store.escapeHtml(emptyMessage)}</td></tr>`;
}

function normalizeSubmissionCategory(category) {
  return (category || "").toString().trim().toLowerCase();
}

function isTeacherRankingCategory(category) {
  return category.includes("in-service") || category.includes("pre-service") || category.includes("bed") || category.includes("b.ed");
}

function isVeStaffRankingCategory(category) {
  return category.includes("ve staff");
}

function getTeacherRankedSubmissions() {
  return getRankedSubmissions().filter((entry) =>
    isTeacherRankingCategory(normalizeSubmissionCategory(entry.submission.submissionCategory))
  );
}

function exportTeacherRankingsCsv() {
  const rows = [
    TEACHER_RANKING_CSV_COLUMNS.map(([label]) => label),
    ...getTeacherRankedSubmissions().map((entry, index) => {
      const row = {
        ...entry.submission,
        rank: index + 1,
        assignmentCount: entry.metrics.assignmentCount,
        reviewCount: entry.metrics.reviewCount,
        averageScore: entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "",
        recommendationSummary: entry.metrics.recommendationSummary,
        status: statusText(entry.metrics)
      };
      return TEACHER_RANKING_CSV_COLUMNS.map(([, fieldName]) => row[fieldName] ?? "");
    })
  ];
  const csv = rows.map((row) => row.map(formatCsvValue).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ctis-2026-inservice-bed-rankings.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatCsvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function renderUnassignedAbstracts() {
  const unassigned = state.submissions.filter((submission) => !getAssignmentsForSubmission(submission.id).length);
  elements.unassignedSummary.textContent = `${unassigned.length} unassigned`;

  store.renderCollection(
    elements.unassignedList,
    unassigned,
    "Every abstract currently has at least one reviewer assigned.",
    (submission) => `
      <article class="card">
        <h3>${store.escapeHtml(submission.title)}</h3>
        <div class="meta-row">
          <span><strong>ID:</strong> ${store.escapeHtml(submission.id || "-")}</span>
          <span><strong>Type:</strong> ${store.escapeHtml(submission.submissionCategory || "-")}</span>
          <span><strong>School:</strong> ${store.escapeHtml(submission.schoolName || "-")}</span>
        </div>
      </article>
    `
  );
}

function renderSubmissionSummary() {
  elements.submissionSummaryTotal.textContent = `${state.submissions.length} papers`;
  renderCountSummary(
    elements.categorySummaryList,
    countByField("submissionCategory"),
    "No submission categories yet."
  );
  renderCountSummary(
    elements.themeSummaryList,
    countByField("theme"),
    "No themes yet."
  );
  renderCountSummary(
    elements.stateSummaryList,
    countByGetter(getSubmissionState),
    "No state data yet."
  );
}

function countByField(fieldName) {
  return countByGetter((submission) => submission[fieldName]);
}

function countByGetter(valueGetter) {
  return state.submissions.reduce((counts, submission) => {
    const value = valueGetter(submission) || "Not specified";
    counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map());
}

function getSubmissionState(submission) {
  const address = submission.schoolAddress?.toString().trim();
  if (!address) {
    return "";
  }

  const normalizedAddress = address.toLowerCase();
  const matchedState = INDIAN_STATES_AND_TERRITORIES.find((stateName) =>
    normalizedAddress.includes(stateName.toLowerCase())
  );
  if (matchedState) {
    return matchedState;
  }

  const addressParts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return addressParts.at(-1) || "";
}

function renderCountSummary(container, counts, emptyMessage) {
  const entries = Array.from(counts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  });

  store.renderCollection(
    container,
    entries,
    emptyMessage,
    ([label, count]) => `
      <article class="card">
        <div class="meta-row">
          <span><strong>${store.escapeHtml(label)}</strong></span>
          <span>${count} ${count === 1 ? "paper" : "papers"}</span>
        </div>
      </article>
    `
  );
}

function populateAssignmentOptions() {
  populateSelect(
    elements.assignmentSubmission,
    state.submissions,
    "Choose a submission",
    (submission) => `${submission.title || submission.id} (${getAssignmentsForSubmission(submission.id).length} reviewers)`
  );
  populateSelect(
    elements.assignmentReviewer,
    state.reviewers,
    "Choose a reviewer",
    // (reviewer) => `${reviewer.name} (${getAssignmentsForReviewer(reviewer.id).length}/${reviewer.capacity})`
    (reviewer) => `${reviewer.name} (${getAssignmentsForReviewer(reviewer.id).length} assigned)`
  );
}

function populateReviewerOptions() {
  populateSelect(elements.reviewerSelect, state.reviewers, "Choose a reviewer", (reviewer) => reviewer.name);
}

function populateReviewSubmissionOptions() {
  const reviewerId = elements.reviewerSelect.value;
  const assignedSubmissionIds = reviewerId ? getAssignmentsForReviewer(reviewerId).map((entry) => entry.submissionId) : [];
  const assignedSubmissions = state.submissions.filter((submission) => assignedSubmissionIds.includes(submission.id));
  populateSelect(
    elements.reviewSubmission,
    assignedSubmissions,
    reviewerId ? "Choose an assigned submission" : "Choose a reviewer first",
    (submission) => submission.title || submission.id
  );
  updateReviewSubmissionDataMessage();
}

function populateSelect(select, items, placeholder, labelGetter) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => `<option value="${item.id}">${store.escapeHtml(labelGetter(item))}</option>`).join("");
  if (items.some((item) => item.id === currentValue)) {
    select.value = currentValue;
  }
}

const SUBMISSION_REVIEW_FIELDS = [
  ["submissionCategory", "Submission category"],
  ["title", "Abstract title"],
  ["authors", "Teacher author(s)"],
  ["schoolName", "School affiliation"],
  ["schoolAddress", "School address"],
  ["emails", "Contact email(s)"],
  ["implementationStart", "CT implementation start year"],
  ["theme", "Theme"],
  ["weeklyPeriods", "Weekly CT periods"],
  ["teacherCount", "Teachers involved"],
  ["studentCount", "Student count"],
  ["grades", "Grades served"]
];

function updateReviewSubmissionDataMessage() {
  if (!elements.reviewSubmissionDataMessage) {
    return;
  }

  const submission = findSubmission(elements.reviewSubmission.value);
  if (!submission) {
    elements.reviewSubmissionDataMessage.hidden = true;
    elements.reviewSubmissionDataMessage.innerHTML = "";
    return;
  }

  const missingFields = SUBMISSION_REVIEW_FIELDS
    .filter(([fieldName]) => !hasSubmissionFieldValue(submission[fieldName]))
    .map(([, label]) => label);

  if (!missingFields.length) {
    elements.reviewSubmissionDataMessage.hidden = true;
    elements.reviewSubmissionDataMessage.innerHTML = "";
    return;
  }

  const paperName = submission.title || submission.id || "Selected paper";
  elements.reviewSubmissionDataMessage.hidden = false;
  elements.reviewSubmissionDataMessage.innerHTML = `
    <p><strong>${store.escapeHtml(paperName)}</strong> is missing submission data. Please collect the missing data and send it for backend update before completing the review.</p>
    <ul class="status-list">
      ${missingFields.map((label) => `<li>${store.escapeHtml(label)}</li>`).join("")}
    </ul>
  `;
}

function hasSubmissionFieldValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim() !== "";
}

function getRankedSubmissions() {
  return state.submissions
    .map((submission) => ({
      submission,
      metrics: getSubmissionMetrics(submission.id)
    }))
    .sort((left, right) => {
      if (right.metrics.averageScore !== left.metrics.averageScore) {
        return right.metrics.averageScore - left.metrics.averageScore;
      }
      return right.metrics.reviewCount - left.metrics.reviewCount;
    });
}

function getSubmissionMetrics(submissionId) {
  const reviews = getReviewsForSubmission(submissionId);
  const assignments = getAssignmentsForSubmission(submissionId);
  return {
    reviewCount: reviews.length,
    assignmentCount: assignments.length,
    averageScore: reviews.length ? store.average(reviews.map((review) => review.totalScore)) : 0,
    recommendationSummary: summarizeRecommendations(reviews)
  };
}

function sumScores(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function getAssignmentsForSubmission(submissionId) {
  return state.assignments.filter((entry) => entry.submissionId === submissionId);
}

function getReviewsForSubmission(submissionId) {
  return state.reviews.filter((entry) => entry.submissionId === submissionId);
}

function getAssignmentsForReviewer(reviewerId) {
  return state.assignments.filter((entry) => entry.reviewerId === reviewerId);
}

function findReviewer(reviewerId) {
  return state.reviewers.find((reviewer) => reviewer.id === reviewerId);
}

function findSubmission(submissionId) {
  return state.submissions.find((submission) => submission.id === submissionId);
}

function renderReviewCountLink(submissionId, reviewCount) {
  if (!reviewCount) {
    return "0";
  }

  return `<button class="button-link" type="button" data-review-submission-id="${store.escapeHtml(submissionId)}">${reviewCount}</button>`;
}

function summarizeRecommendations(reviews) {
  if (!reviews.length) {
    return "-";
  }

  const counts = new Map();
  reviews.forEach((review) => {
    const key = review.recommendation || "No recommendation at all";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => `${label} (${count})`)
    .join(", ");
}

function handleRankingReviewClick(event) {
  const trigger = event.target.closest("[data-review-submission-id]");
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const submissionId = trigger.dataset.reviewSubmissionId;
  if (!submissionId) {
    return;
  }

  openReviewDetails(submissionId);
}

function openReviewDetails(submissionId) {
  const submission = findSubmission(submissionId);
  const reviews = getReviewsForSubmission(submissionId);

  if (!elements.reviewDetailsDialog || !elements.reviewDetailsBody || !elements.reviewDetailsTitle) {
    return;
  }

  elements.reviewDetailsTitle.textContent = submission?.title
    ? `Review details: ${submission.title}`
    : "Review details";

  if (!reviews.length) {
    elements.reviewDetailsBody.innerHTML = `<div class="empty-state"><p>No reviews available for this submission yet.</p></div>`;
    elements.reviewDetailsDialog.showModal();
    return;
  }

  elements.reviewDetailsBody.innerHTML = reviews.map((review) => {
    const reviewer = findReviewer(review.reviewerId);
    return `
      <article class="card">
        <h3>${store.escapeHtml(reviewer?.name || "Unknown reviewer")}</h3>
        <div class="meta-row">
          <span><strong>Recommendation:</strong> ${store.escapeHtml(review.recommendation || "-")}</span>
          <span><strong>Total score:</strong> ${review.totalScore?.toFixed(1) || "0.0"}</span>
        </div>
        <div class="score-grid">
          ${Object.entries(review.scores || {}).map(([label, value]) => `
            <div class="score-grid__item">
              <strong>${store.escapeHtml(formatScoreLabel(label))}</strong>
              <span>${store.escapeHtml(String(value))}</span>
            </div>
          `).join("")}
        </div>
        <p><strong>Reviewer comments:</strong> ${store.escapeHtml(review.comments || "-")}</p>
      </article>
    `;
  }).join("");

  elements.reviewDetailsDialog.showModal();
}

function formatScoreLabel(label) {
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function renderSubmissionStatusList(assignments, emptyMessage) {
  if (!assignments.length) {
    return `<p class="muted">${store.escapeHtml(emptyMessage)}</p>`;
  }

  return `
    <ul class="status-list">
      ${assignments.map((assignment) => {
        const submission = findSubmission(assignment.submissionId);
        const submissionId = submission?.attachmentUrl
          ? `<a href="${store.escapeHtml(submission.attachmentUrl)}" target="_blank" rel="noopener">${store.escapeHtml(submission?.id || "-")}</a>`
          : store.escapeHtml(submission?.id || "-");
        const authors = submission?.authors ? ` (${store.escapeHtml(submission.authors)})` : "";
        return `<li>${submissionId} - ${store.escapeHtml(submission?.title || "Unknown submission")}${authors}</li>`;
      }).join("")}
    </ul>
  `;
}

function renderGroupedSubmissionStatusList(assignments, emptyMessage) {
  if (!assignments.length) {
    return `<p class="muted">${store.escapeHtml(emptyMessage)}</p>`;
  }

  const groups = assignments.reduce((categoryGroups, assignment) => {
    const submission = findSubmission(assignment.submissionId);
    const category = submission?.submissionCategory || "Not specified";
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category).push(assignment);
    return categoryGroups;
  }, new Map());

  return `
    <div class="stack">
      ${Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([category, categoryAssignments]) => `
        <div>
          <p class="muted"><strong>${store.escapeHtml(category)}</strong></p>
          ${renderSubmissionStatusList(categoryAssignments, emptyMessage)}
        </div>
      `).join("")}
    </div>
  `;
}

function statusText(metrics) {
  if (metrics.reviewCount >= 2) {
    return "Ready";
  }
  if (metrics.assignmentCount > 0) {
    return "Under review";
  }
  return "Needs assignment";
}

function statusClass(metrics) {
  if (metrics.reviewCount >= 2) {
    return "status--good";
  }
  if (metrics.assignmentCount > 0) {
    return "status--warn";
  }
  return "status--muted";
}
