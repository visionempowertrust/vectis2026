const store = window.PortalStore;
const state = store.loadState();
store.seedAssignmentsIfEmpty(state);
store.saveState(state);

const elements = {
  submissionCount: document.querySelector("#submission-count"),
  submissionsSummary: document.querySelector("#submissions-summary"),
  submissionForm: document.querySelector("#submission-form"),
  submissionList: document.querySelector("#submission-list")
};

elements.submissionForm.addEventListener("submit", handleSubmissionSave);
render();

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
  store.saveState(state);
  event.currentTarget.reset();
  render();
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
        <p>${store.escapeHtml(submission.shortAbstract)}</p>
        <p class="muted">Background: ${store.escapeHtml(store.truncate(submission.background, 180))}</p>
      </article>
    `
  );
}
