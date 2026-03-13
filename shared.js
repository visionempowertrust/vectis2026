(function () {
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

    state.assignments = [
      { id: crypto.randomUUID(), submissionId: state.submissions[0].id, reviewerId: state.reviewers[0].id, assignedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), submissionId: state.submissions[0].id, reviewerId: state.reviewers[1].id, assignedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), submissionId: state.submissions[1].id, reviewerId: state.reviewers[1].id, assignedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), submissionId: state.submissions[1].id, reviewerId: state.reviewers[2].id, assignedAt: new Date().toISOString() }
    ];
  }

  function resetState() {
    const state = structuredClone(demoState);
    seedAssignmentsIfEmpty(state);
    saveState(state);
    return state;
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
    importState
  };
})();
