const STORAGE_KEY = "ctis-2026-review-portal";

const demoState = {
  submissions: [
    {
      id: crypto.randomUUID(),
      title: "Tactile Debugging Patterns for Middle School Learners",
      authors: "Anita Rao, Mehul Shah",
      schoolName: "Vision Empower Trust Learning Centre",
      schoolAddress: "Bengaluru, Karnataka",
      emails: "anita@vet.org, mehul@vet.org",
      implementationStart: "2022",
      weeklyPeriods: 3,
      teacherCount: 2,
      studentCount: 36,
      grades: "6 to 8",
      genderRatio: "18 girls, 18 boys",
      evidenceLink: "https://example.org/tactile-debugging",
      shortAbstract: "Students explored debugging through tactile flow cards and peer narration. The paper documents planning, facilitation, and classroom evidence from a visually inclusive computational thinking unit.",
      background: "The school serves mixed socio-economic groups and began structured CT instruction in 2022. The team wanted an unplugged method that allowed blind and low-vision students to reason through program behavior together.",
      implementation: "Teachers used embossed instruction cards, paired discussions, and table-top algorithm walks. Students predicted outcomes, corrected logic errors, and documented alternate solutions in audio notes.",
      challenges: "Teachers needed extra prep time to create tactile material sets.",
      impact: "Teachers recorded stronger student explanations, better debugging persistence, and improved collaborative vocabulary during classroom observation cycles.",
      conclusion: "Tactile debugging supported both access and rigor when routines were consistent across classes.",
      references: "Internal classroom observation notes",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Inclusive Story Sequencing as an Entry Point to Algorithms",
      authors: "Shalini Menon",
      schoolName: "National Association for the Blind School",
      schoolAddress: "Mumbai, Maharashtra",
      emails: "shalini@example.org",
      implementationStart: "2021",
      weeklyPeriods: 2,
      teacherCount: 1,
      studentCount: 28,
      grades: "4 to 6",
      genderRatio: "13 girls, 15 boys",
      evidenceLink: "",
      shortAbstract: "This paper describes a multilingual story-sequencing approach to teaching algorithms in early grades using tactile objects, oral retelling, and classroom role-play.",
      background: "The school sought low-cost strategies that would help learners connect daily routines with algorithmic thinking before transitioning to symbolic representation.",
      implementation: "Students decomposed stories into steps, sorted tactile cards, and tested alternate sequences as a class. Teachers documented misconceptions and adaptation strategies.",
      challenges: "Maintaining comparable pacing across mixed-age groups.",
      impact: "Learners became more confident in using step-by-step reasoning and teachers reported stronger participation from students who were previously hesitant.",
      conclusion: "Narrative structure helped bridge language, memory, and algorithm design.",
      references: "",
      createdAt: new Date().toISOString()
    }
  ],
  reviewers: [
    {
      id: crypto.randomUUID(),
      name: "Dr. Kavita Iyer",
      email: "kavita@example.org",
      expertise: "Accessible pedagogy, teacher development",
      capacity: 3
    },
    {
      id: crypto.randomUUID(),
      name: "Rohan D'Souza",
      email: "rohan@example.org",
      expertise: "Computational thinking curriculum, assessment",
      capacity: 3
    },
    {
      id: crypto.randomUUID(),
      name: "Mina Patel",
      email: "mina@example.org",
      expertise: "Inclusion, classroom research",
      capacity: 2
    }
  ],
  assignments: [],
  reviews: []
};

const state = loadState();
seedAssignmentsIfEmpty();

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  reviewerCount: document.querySelector("#reviewer-count"),
  reviewCount: document.querySelector("#review-count"),
  rankingsSummary: document.querySelector("#rankings-summary"),
  assignmentSummary: document.querySelector("#assignment-summary"),
  submissionForm: document.querySelector("#submission-form"),
  reviewerForm: document.querySelector("#reviewer-form"),
  assignmentForm: document.querySelector("#assignment-form"),
  reviewForm: document.querySelector("#review-form"),
  submissionList: document.querySelector("#submission-list"),
  reviewerList: document.querySelector("#reviewer-list"),
  assignmentList: document.querySelector("#assignment-list"),
  reviewList: document.querySelector("#review-list"),
  rankingsBody: document.querySelector("#rankings-body"),
  shortlistList: document.querySelector("#shortlist-list"),
  loadList: document.querySelector("#load-list"),
  submissionsSummary: document.querySelector("#submissions-summary"),
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
render();

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  elements.submissionForm.addEventListener("submit", handleSubmissionSave);
  elements.reviewerForm.addEventListener("submit", handleReviewerSave);
  elements.assignmentForm.addEventListener("submit", handleAssignmentSave);
  elements.reviewForm.addEventListener("submit", handleReviewSave);
  elements.exportData.addEventListener("click", exportState);
  elements.importData.addEventListener("change", importState);
  elements.resetData.addEventListener("click", resetState);
  document.querySelector("#auto-assign").addEventListener("click", autoAssignMissingReviews);
  elements.reviewerSelect.addEventListener("change", populateReviewSubmissionOptions);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function handleSubmissionSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.submissions.unshift({
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
    references: formData.get("references")?.toString().trim()
  });
  saveState();
  event.currentTarget.reset();
  render();
  activateTab("submissions");
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
  saveState();
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
  saveState();
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
    totalScore: average(Object.values(scores)),
    recommendation: formData.get("recommendation")?.toString(),
    comments: formData.get("comments")?.toString().trim(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.reviews.push(payload);
  }

  saveState();
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

  saveState();
  render();
}

function render() {
  persistState();
  renderCounts();
  renderSubmissionList();
  renderReviewerList();
  renderAssignmentList();
  renderReviewList();
  renderDashboard();
  populateAssignmentOptions();
  populateReviewerOptions();
  populateReviewSubmissionOptions();
}

function renderCounts() {
  elements.submissionCount.textContent = state.submissions.length;
  elements.reviewerCount.textContent = state.reviewers.length;
  elements.reviewCount.textContent = state.reviews.length;
  elements.submissionsSummary.textContent = `${state.submissions.length} saved`;
  elements.reviewersSummary.textContent = `${state.reviewers.length} active`;
  elements.matrixSummary.textContent = `${state.assignments.length} mapped`;
  elements.completedSummary.textContent = `${state.reviews.length} recorded`;
  elements.assignmentSummary.textContent = `${state.assignments.length} assignments`;
}

function renderSubmissionList() {
  renderCollection(elements.submissionList, state.submissions, "No submissions yet. Add the first teacher abstract to start the workflow.", (submission) => {
    const metrics = getSubmissionMetrics(submission.id);
    return `
      <article class="card">
        <h3>${escapeHtml(submission.title)}</h3>
        <div class="meta-row">
          <span><strong>Authors:</strong> ${escapeHtml(submission.authors)}</span>
          <span><strong>School:</strong> ${escapeHtml(submission.schoolName)}</span>
          <span><strong>Score:</strong> ${metrics.averageScore ? metrics.averageScore.toFixed(1) : "Pending"}</span>
        </div>
        <p>${escapeHtml(submission.shortAbstract)}</p>
        <p class="muted">Background: ${escapeHtml(truncate(submission.background, 180))}</p>
      </article>
    `;
  });
}

function renderReviewerList() {
  renderCollection(elements.reviewerList, state.reviewers, "No reviewers yet. Add your program committee members here.", (reviewer) => {
    const assigned = getAssignmentsForReviewer(reviewer.id).length;
    const completed = state.reviews.filter((review) => review.reviewerId === reviewer.id).length;
    return `
      <article class="card">
        <h3>${escapeHtml(reviewer.name)}</h3>
        <div class="meta-row">
          <span><strong>Email:</strong> ${escapeHtml(reviewer.email)}</span>
          <span><strong>Expertise:</strong> ${escapeHtml(reviewer.expertise || "General review")}</span>
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
  renderCollection(elements.assignmentList, state.submissions, "Assignments will appear here after you map reviewers to papers.", (submission) => {
    const assignments = getAssignmentsForSubmission(submission.id);
    const chips = assignments.length
      ? assignments.map((assignment) => {
          const reviewer = findReviewer(assignment.reviewerId);
          const reviewed = state.reviews.some((review) => review.reviewerId === assignment.reviewerId && review.submissionId === submission.id);
          return `<span class="status ${reviewed ? "status--good" : "status--warn"}">${escapeHtml(reviewer?.name || "Unknown")} ${reviewed ? "reviewed" : "assigned"}</span>`;
        }).join(" ")
      : `<span class="status status--muted">Unassigned</span>`;

    return `
      <article class="card">
        <h3>${escapeHtml(submission.title)}</h3>
        <p class="muted">${escapeHtml(submission.schoolName)}</p>
        <div class="meta-row">${chips}</div>
      </article>
    `;
  });
}

function renderReviewList() {
  const sortedReviews = [...state.reviews].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  renderCollection(elements.reviewList, sortedReviews, "Completed reviews will appear here.", (review) => {
    const reviewer = findReviewer(review.reviewerId);
    const submission = findSubmission(review.submissionId);
    return `
      <article class="card">
        <h3>${escapeHtml(submission?.title || "Unknown submission")}</h3>
        <div class="meta-row">
          <span><strong>Reviewer:</strong> ${escapeHtml(reviewer?.name || "Unknown reviewer")}</span>
          <span><strong>Average:</strong> ${review.totalScore.toFixed(1)}</span>
          <span><strong>Recommendation:</strong> ${escapeHtml(review.recommendation)}</span>
        </div>
        <p>${escapeHtml(review.comments)}</p>
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
          <td>${escapeHtml(entry.submission.title)}</td>
          <td>${escapeHtml(entry.submission.schoolName)}</td>
          <td>${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</td>
          <td>${entry.metrics.reviewCount}</td>
          <td><span class="status ${statusClass(entry.metrics)}">${statusText(entry.metrics)}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="6">No ranked papers yet. Add reviews to see the leaderboard.</td></tr>`;

  const shortlist = ranked.slice(0, 5);
  renderCollection(elements.shortlistList, shortlist, "Your top-ranked abstracts will appear here.", (entry, index) => `
    <article class="card">
      <h3>${index + 1}. ${escapeHtml(entry.submission.title)}</h3>
      <div class="meta-row">
        <span><strong>Score:</strong> ${entry.metrics.averageScore ? entry.metrics.averageScore.toFixed(1) : "-"}</span>
        <span><strong>Reviews:</strong> ${entry.metrics.reviewCount}</span>
        <span><strong>School:</strong> ${escapeHtml(entry.submission.schoolName)}</span>
      </div>
    </article>
  `);

  renderCollection(elements.loadList, state.reviewers, "Reviewer load appears here after you add the committee.", (reviewer) => {
    const assignments = getAssignmentsForReviewer(reviewer.id).length;
    const completed = state.reviews.filter((review) => review.reviewerId === reviewer.id).length;
    return `
      <article class="card">
        <h3>${escapeHtml(reviewer.name)}</h3>
        <div class="meta-row">
          <span><strong>Assigned:</strong> ${assignments}/${reviewer.capacity}</span>
          <span><strong>Completed:</strong> ${completed}</span>
        </div>
      </article>
    `;
  });
}

function populateAssignmentOptions() {
  populateSelect(elements.assignmentSubmission, state.submissions, "Choose a submission", (submission) => submission.title);
  populateSelect(elements.assignmentReviewer, state.reviewers, "Choose a reviewer", (reviewer) => `${reviewer.name} (${getAssignmentsForReviewer(reviewer.id).length}/${reviewer.capacity})`);
}

function populateReviewerOptions() {
  populateSelect(elements.reviewerSelect, state.reviewers, "Choose a reviewer", (reviewer) => reviewer.name);
}

function populateReviewSubmissionOptions() {
  const reviewerId = elements.reviewerSelect.value;
  const assignedSubmissionIds = reviewerId ? getAssignmentsForReviewer(reviewerId).map((entry) => entry.submissionId) : [];
  const assignedSubmissions = state.submissions.filter((submission) => assignedSubmissionIds.includes(submission.id));
  populateSelect(elements.reviewSubmission, assignedSubmissions, reviewerId ? "Choose an assigned submission" : "Choose a reviewer first", (submission) => submission.title);
}

function populateSelect(select, items, placeholder, labelGetter) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => `<option value="${item.id}">${escapeHtml(labelGetter(item))}</option>`).join("");
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
    averageScore: reviews.length ? average(reviews.map((review) => review.totalScore)) : 0
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

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ctis-2026-review-data.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importState(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(String(reader.result));
      state.submissions = incoming.submissions || [];
      state.reviewers = incoming.reviewers || [];
      state.assignments = incoming.assignments || [];
      state.reviews = incoming.reviews || [];
      saveState();
      render();
    } catch (error) {
      alert("That file could not be imported. Please choose a valid JSON export from this portal.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetState() {
  if (!window.confirm("Reset the portal back to the demo event data?")) {
    return;
  }

  state.submissions = structuredClone(demoState.submissions);
  state.reviewers = structuredClone(demoState.reviewers);
  state.assignments = [];
  state.reviews = [];
  seedAssignmentsIfEmpty();
  saveState();
  render();
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

function seedAssignmentsIfEmpty() {
  if (state.assignments.length || state.submissions.length < 2 || state.reviewers.length < 2) {
    return;
  }

  state.assignments = [
    { id: crypto.randomUUID(), submissionId: state.submissions[0].id, reviewerId: state.reviewers[0].id, assignedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), submissionId: state.submissions[0].id, reviewerId: state.reviewers[1].id, assignedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), submissionId: state.submissions[1].id, reviewerId: state.reviewers[1].id, assignedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), submissionId: state.submissions[1].id, reviewerId: state.reviewers[2].id, assignedAt: new Date().toISOString() }
  ];
}

function saveState() {
  persistState();
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
