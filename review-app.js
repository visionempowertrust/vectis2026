const store = window.PortalStore;
let state = store.loadState();

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  reviewerCount: document.querySelector("#reviewer-count"),
  reviewCount: document.querySelector("#review-count"),
  debugStatus: document.querySelector("#debug-status"),
  rankingsSummary: document.querySelector("#rankings-summary"),
  assignmentSummary: document.querySelector("#assignment-summary"),
  reviewerForm: document.querySelector("#reviewer-form"),
  assignmentForm: document.querySelector("#assignment-form"),
  reviewForm: document.querySelector("#review-form"),
  reviewerList: document.querySelector("#reviewer-list"),
  assignmentList: document.querySelector("#assignment-list"),
  reviewList: document.querySelector("#review-list"),
  rankingsBody: document.querySelector("#rankings-body"),
  shortlistList: document.querySelector("#shortlist-list"),
  loadList: document.querySelector("#load-list"),
  reviewersSummary: document.querySelector("#reviewers-summary"),
  matrixSummary: document.querySelector("#matrix-summary"),
  completedSummary: document.querySelector("#completed-summary"),
  assignmentSubmission: document.querySelector("#assignment-submission"),
  assignmentReviewer: document.querySelector("#assignment-reviewer"),
  reviewerSelect: document.querySelector("#reviewer-select"),
  reviewSubmission: document.querySelector("#review-submission"),
  exportData: document.querySelector("#export-data"),
  importData: document.querySelector("#import-data"),
  resetData: document.querySelector("#reset-data")
};

bindEvents();
loadRemoteState();

async function loadRemoteState() {
  const debugMessages = [];
  const remoteState = await store.loadStateRemoteDetailed();
  if (remoteState.ok && remoteState.state) {
    state = remoteState.state;
    store.saveState(state);
  } else {
    state = store.loadState();
  }

  if (remoteState.ok) {
    debugMessages.push(`State file loaded: ${state.submissions.length} submissions, ${state.reviewers.length} reviewers, ${state.reviews.length} reviews.`);
  } else {
    debugMessages.push(`State file read failed: ${remoteState.error}`);
  }

  const remoteSubmissions = await store.listSubmissionsRemoteDetailed();
  if (remoteSubmissions.ok) {
    debugMessages.push(`Submission folder listed: ${remoteSubmissions.filesFound} files found, ${remoteSubmissions.submissions.length} valid submission records parsed.`);
  } else {
    debugMessages.push(`Submission folder read failed: ${remoteSubmissions.error}`);
  }

  if (remoteSubmissions.submissions.length) {
    const byId = new Map((state.submissions || []).map((submission) => [submission.id, submission]));
    remoteSubmissions.submissions.forEach((submission) => {
      byId.set(submission.id, { ...(byId.get(submission.id) || {}), ...submission });
    });
    state.submissions = Array.from(byId.values()).sort(
      (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    );
  }

  debugMessages.push(`Review portal final submission count: ${state.submissions.length}.`);

  store.saveState(state);
  renderDebugStatus(debugMessages);
  render();
}

function renderDebugStatus(messages) {
  if (!elements.debugStatus) {
    return;
  }

  elements.debugStatus.innerHTML = messages.map((message) => `<p>${store.escapeHtml(message)}</p>`).join("");
}

function bindEvents() {
  elements.reviewerForm.addEventListener("submit", handleReviewerSave);
  elements.assignmentForm.addEventListener("submit", handleAssignmentSave);
  elements.reviewForm.addEventListener("submit", handleReviewSave);
  document.querySelector("#auto-assign").addEventListener("click", autoAssignMissingReviews);
  elements.reviewerSelect.addEventListener("change", populateReviewSubmissionOptions);
}

function handleReviewerSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.reviewers.push({
    id: crypto.randomUUID(),
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    expertise: formData.get("expertise")?.toString().trim(),
    capacity: Number(formData.get("capacity")) || 1
  });
  persist();
  event.currentTarget.reset();
  render();
}

function handleAssignmentSave(event) {
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
  persist();
  render();
}

function handleReviewSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const reviewerId = formData.get("reviewerId")?.toString();
  const submissionId = formData.get("submissionId")?.toString();

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
    totalScore: store.average(Object.values(scores)),
    recommendation: formData.get("recommendation")?.toString(),
    comments: formData.get("comments")?.toString().trim(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.reviews.push(payload);
  }

  persist();
  event.currentTarget.reset();
  populateReviewSubmissionOptions();
  render();
}

function autoAssignMissingReviews() {
  const targetReviewsPerSubmission = 2;
  const reviewersByLoad = () => [...state.reviewers].sort((left, right) => getAssignmentsForReviewer(left.id).length - getAssignmentsForReviewer(right.id).length);

  state.submissions.forEach((submission) => {
    const currentAssignments = getAssignmentsForSubmission(submission.id);
    const needed = targetReviewsPerSubmission - currentAssignments.length;
    if (needed <= 0) {
      return;
    }

    const available = reviewersByLoad().filter((reviewer) => {
      const alreadyAssigned = currentAssignments.some((entry) => entry.reviewerId === reviewer.id);
      const hasCapacity = getAssignmentsForReviewer(reviewer.id).length < reviewer.capacity;
      return !alreadyAssigned && hasCapacity;
    });

    available.slice(0, needed).forEach((reviewer) => {
      state.assignments.push({
        id: crypto.randomUUID(),
        submissionId: submission.id,
        reviewerId: reviewer.id,
        assignedAt: new Date().toISOString()
      });
    });
  });

  persist();
  render();
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
  await store.saveStateRemote(state);
}

function render() {
  elements.submissionCount.textContent = state.submissions.length;
  elements.reviewerCount.textContent = state.reviewers.length;
  elements.reviewCount.textContent = state.reviews.length;
  elements.assignmentSummary.textContent = `${state.assignments.length} assignments`;

  renderDashboard();
  populateAssignmentOptions();
  populateReviewerOptions();
  populateReviewSubmissionOptions();
}

function renderReviewerList() {
  store.renderCollection(elements.reviewerList, state.reviewers, "No reviewers yet. Add your program committee members here.", (reviewer) => {
    const assigned = getAssignmentsForReviewer(reviewer.id).length;
    const completed = state.reviews.filter((review) => review.reviewerId === reviewer.id).length;
    return `
      <article class="card">
        <h3>${store.escapeHtml(reviewer.name)}</h3>
        <div class="meta-row">
          <span><strong>Email:</strong> ${store.escapeHtml(reviewer.email)}</span>
          <span><strong>Expertise:</strong> ${store.escapeHtml(reviewer.expertise || "General review")}</span>
        </div>
        <div class="meta-row">
          <span><strong>Load:</strong> ${assigned}/${reviewer.capacity}</span>
          <span><strong>Completed:</strong> ${completed}</span>
        </div>
      </article>
    `;
  });
}

function renderAssignmentList() {
  store.renderCollection(elements.assignmentList, state.submissions, "Assignments will appear here after you map reviewers to papers.", (submission) => {
    const assignments = getAssignmentsForSubmission(submission.id);
    const chips = assignments.length
      ? assignments.map((assignment) => {
          const reviewer = findReviewer(assignment.reviewerId);
          const reviewed = state.reviews.some((review) => review.reviewerId === assignment.reviewerId && review.submissionId === submission.id);
          return `<span class="status ${reviewed ? "status--good" : "status--warn"}">${store.escapeHtml(reviewer?.name || "Unknown")} ${reviewed ? "reviewed" : "assigned"}</span>`;
        }).join(" ")
      : `<span class="status status--muted">Unassigned</span>`;

    return `
      <article class="card">
        <h3>${store.escapeHtml(submission.title)}</h3>
        <p class="muted">${store.escapeHtml(submission.schoolName)}</p>
        <div class="meta-row">${chips}</div>
        ${submission.attachmentUrl ? `<a class="button button--ghost" href="${submission.attachmentUrl}" target="_blank" rel="noopener">Download attachment</a>` : ""}
      </article>
    `;
  });
}

function renderReviewList() {
  const sortedReviews = [...state.reviews].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  store.renderCollection(elements.reviewList, sortedReviews, "Completed reviews will appear here.", (review) => {
    const reviewer = findReviewer(review.reviewerId);
    const submission = findSubmission(review.submissionId);
    return `
      <article class="card">
        <h3>${store.escapeHtml(submission?.title || "Unknown submission")}</h3>
        <div class="meta-row">
          <span><strong>Reviewer:</strong> ${store.escapeHtml(reviewer?.name || "Unknown reviewer")}</span>
          <span><strong>Average:</strong> ${review.totalScore.toFixed(1)}</span>
          <span><strong>Recommendation:</strong> ${store.escapeHtml(review.recommendation)}</span>
        </div>
        <p>${store.escapeHtml(review.comments)}</p>
      </article>
    `;
  });
}

function renderDashboard() {
  const ranked = getRankedSubmissions();
  elements.rankingsSummary.textContent = `${ranked.length} ranked`;
  elements.rankingsBody.innerHTML = ranked.length
      ? ranked.map((entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${store.escapeHtml(entry.submission.id || "-")}</td>
          <td>${store.escapeHtml(entry.submission.title)}</td>
          <td>${store.escapeHtml(entry.submission.schoolName)}</td>
          <td>${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</td>
          <td>${entry.metrics.reviewCount}</td>
          <td><span class="status ${statusClass(entry.metrics)}">${statusText(entry.metrics)}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="7">No ranked papers yet. Add reviews to see the leaderboard.</td></tr>`;

  store.renderCollection(elements.loadList, state.reviewers, "Reviewer load appears here after you add the committee.", (reviewer) => {
    const assignments = getAssignmentsForReviewer(reviewer.id).length;
    const completed = state.reviews.filter((review) => review.reviewerId === reviewer.id).length;
    return `
      <article class="card">
        <h3>${store.escapeHtml(reviewer.name)}</h3>
        <div class="meta-row">
          <span><strong>Assigned:</strong> ${assignments}/${reviewer.capacity}</span>
          <span><strong>Completed:</strong> ${completed}</span>
        </div>
      </article>
    `;
  });
}

function populateAssignmentOptions() {
  populateSelect(elements.assignmentSubmission, state.submissions, "Choose a submission", (submission) => submission.title || submission.id);
  populateSelect(
    elements.assignmentReviewer,
    state.reviewers,
    "Choose a reviewer",
    (reviewer) => `${reviewer.name} (${getAssignmentsForReviewer(reviewer.id).length}/${reviewer.capacity})`
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
}

function populateSelect(select, items, placeholder, labelGetter) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => `<option value="${item.id}">${store.escapeHtml(labelGetter(item))}</option>`).join("");
  if (items.some((item) => item.id === currentValue)) {
    select.value = currentValue;
  }
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
  const reviews = state.reviews.filter((review) => review.submissionId === submissionId);
  const assignments = getAssignmentsForSubmission(submissionId);
  return {
    reviewCount: reviews.length,
    assignmentCount: assignments.length,
    averageScore: reviews.length ? store.average(reviews.map((review) => review.totalScore)) : 0
  };
}

function getAssignmentsForSubmission(submissionId) {
  return state.assignments.filter((entry) => entry.submissionId === submissionId);
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
