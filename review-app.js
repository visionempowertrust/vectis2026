const store = window.PortalStore;
let state = store.loadState();
store.seedAssignmentsIfEmpty(state);
store.saveState(state);

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  reviewerCount: document.querySelector("#reviewer-count"),
  reviewCount: document.querySelector("#review-count"),
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
loadAndRender();

function bindEvents() {
  elements.reviewerForm.addEventListener("submit", handleReviewerSave);
  elements.assignmentForm.addEventListener("submit", handleAssignmentSave);
  elements.reviewForm.addEventListener("submit", handleReviewSave);
  elements.exportData.addEventListener("click", () => store.exportState(state));
  elements.importData.addEventListener("change", handleImport);
  elements.resetData.addEventListener("click", handleReset);
  document.querySelector("#auto-assign").addEventListener("click", autoAssignMissingReviews);
  elements.reviewerSelect.addEventListener("change", populateReviewSubmissionOptions);
}

async function loadAndRender() {
  const remoteSubs = await store.listSubmissionsRemote();
  state.submissions = remoteSubs;
  render();
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
    relevance: Number(formData.get("relevance")) || 0,
    clarity: Number(formData.get("clarity")) || 0,
    implementation: Number(formData.get("implementation")) || 0,
    impact: Number(formData.get("impact")) || 0,
    inclusion: Number(formData.get("inclusion")) || 0
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
  render();
}

function persist() {
  store.saveState(state);
}

function render() {
  elements.submissionCount.textContent = state.submissions.length;
  elements.reviewerCount.textContent = state.reviewers.length;
  elements.reviewCount.textContent = state.reviews.length;
  elements.reviewersSummary.textContent = `${state.reviewers.length} active`;
  elements.matrixSummary.textContent = `${state.assignments.length} mapped`;
  elements.completedSummary.textContent = `${state.reviews.length} recorded`;
  elements.assignmentSummary.textContent = `${state.assignments.length} assignments`;

  renderReviewerList();
  renderAssignmentList();
  renderReviewList();
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
          <td>${store.escapeHtml(entry.submission.title)}</td>
          <td>${store.escapeHtml(entry.submission.schoolName)}</td>
          <td>${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</td>
          <td>${entry.metrics.reviewCount}</td>
          <td><span class="status ${statusClass(entry.metrics)}">${statusText(entry.metrics)}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="6">No ranked papers yet. Add reviews to see the leaderboard.</td></tr>`;

  const shortlist = ranked.slice(0, 5);
  store.renderCollection(elements.shortlistList, shortlist, "Your top-ranked abstracts will appear here.", (entry, index) => `
    <article class="card">
      <h3>${index + 1}. ${store.escapeHtml(entry.submission.title)}</h3>
      <div class="meta-row">
        <span><strong>Score:</strong> ${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</span>
        <span><strong>Reviews:</strong> ${entry.metrics.reviewCount}</span>
        <span><strong>School:</strong> ${store.escapeHtml(entry.submission.schoolName)}</span>
      </div>
      ${entry.submission.attachmentUrl ? `<a class="button button--ghost" href="${entry.submission.attachmentUrl}" target="_blank" rel="noopener">Download attachment</a>` : ""}
    </article>
  `);

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
*** End Patch
