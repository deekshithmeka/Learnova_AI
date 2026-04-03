/**
 * Dashboard Modules — Wires all dashboard cards to real APIs.
 * Loads automatically when included in dashboard.html.
 */

(function () {
  "use strict";

  // ────────────────────────────────────────────────────────────────
  // Utility helpers
  // ────────────────────────────────────────────────────────────────

  async function api(url, opts = {}) {
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...opts.headers },
        ...opts,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err) {
      console.error(`[API] ${url}:`, err);
      return null;
    }
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function setVal(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val ?? "—";
  }

  // ────────────────────────────────────────────────────────────────
  // Dashboard Summary — populates all card data on load
  // ────────────────────────────────────────────────────────────────

  async function loadDashboard() {
    const data = await api("/api/dashboard/summary");
    if (!data) return;

    // Coding Practice Card
    if (data.coding) {
      setVal("#coding-solved", data.coding.solved);
      setVal("#coding-total", data.coding.total_questions);
      setVal("#coding-streak", data.coding.streak + " days");
      const pct = Math.round((data.coding.solved / Math.max(data.coding.total_questions, 1)) * 100);
      const bar = $("#coding-progress-bar");
      if (bar) bar.style.width = pct + "%";
      setVal("#coding-pct", pct + "%");
    }

    // Pipeline Card
    if (data.pipeline) {
      setVal("#pipeline-applied", data.pipeline.applied);
      setVal("#pipeline-interview", data.pipeline.interviewing);
      setVal("#pipeline-offered", data.pipeline.offered);
      setVal("#pipeline-total", data.pipeline.total);
    }

    // Interview Card
    if (data.interview) {
      setVal("#interview-total", data.interview.total_interviews);
      setVal("#interview-avg", data.interview.avg_score);
      setVal("#interview-best", data.interview.best_score);
    }

    // Rank / XP Card
    if (data.rank) {
      setVal("#rank-position", "#" + data.rank.rank);
      setVal("#rank-xp", data.rank.xp_points + " XP");
    }

    // ATS Card
    if (data.ats) {
      setVal("#ats-score", data.ats.score != null ? data.ats.score + "%" : "Upload Resume");
      const sugg = $("#ats-suggestions");
      if (sugg && data.ats.suggestions && data.ats.suggestions.length) {
        sugg.innerHTML = data.ats.suggestions.map(s => `<li>${s}</li>`).join("");
      }
    }

    // Activity Feed
    if (data.activity && data.activity.length) {
      const feed = $("#activity-feed");
      if (feed) {
        feed.innerHTML = data.activity.map(a => {
          const icons = { coding: "💻", mock_test: "📝", interview: "🎤", pipeline: "📊" };
          const icon = icons[a.type] || "⚡";
          const time = timeAgo(a.created_at);
          return `<div class="activity-item"><span class="activity-icon">${icon}</span><div><span class="activity-title">${a.title}</span><span class="activity-detail">${a.detail} · ${time}</span></div></div>`;
        }).join("");
      }
    }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
  }

  // ────────────────────────────────────────────────────────────────
  // Coding Practice
  // ────────────────────────────────────────────────────────────────

  let currentQuestion = null;

  async function loadDailyQuestion() {
    const data = await api("/api/coding/daily");
    if (!data) return;
    if (data.completed) {
      showCodingModal({ completed: true });
      return;
    }
    currentQuestion = data;
    showCodingModal(data);
  }

  function showCodingModal(q) {
    let modal = $("#coding-modal");
    if (!modal) return;

    if (q.completed) {
      modal.querySelector(".modal-body").innerHTML = `
        <div class="modal-complete">
          <span class="complete-icon">🎉</span>
          <h3>All Questions Solved!</h3>
          <p>You've completed all 375 DSA questions. Incredible!</p>
        </div>`;
      modal.classList.add("active");
      return;
    }

    const diffColors = { Easy: "#4ade80", Medium: "#fbbf24", Hard: "#f87171" };
    modal.querySelector(".modal-body").innerHTML = `
      <div class="q-header">
        <span class="q-topic">${q.topic}</span>
        <span class="q-diff" style="color: ${diffColors[q.difficulty] || '#fff'}">${q.difficulty}</span>
      </div>
      <h3 class="q-title">${q.title}</h3>
      ${q.companies ? `<p class="q-companies"><strong>Companies:</strong> ${q.companies}</p>` : ""}
      ${q.remarks ? `<p class="q-remarks"><strong>Hint:</strong> ${q.remarks}</p>` : ""}
      <div class="q-actions">
        <button class="btn-solve" onclick="PrepPulse.solveQuestion(${q.id})">✅ Solved</button>
        <button class="btn-skip" onclick="PrepPulse.skipQuestion(${q.id})">⏭ Skip</button>
        <button class="btn-next" onclick="PrepPulse.nextQuestion()">🔄 Next</button>
      </div>
    `;
    modal.classList.add("active");
  }

  async function solveQuestion(id) {
    const data = await api(`/api/coding/solve/${id}`, { method: "POST", body: JSON.stringify({}) });
    if (data && data.success) {
      showToast(`+${data.xp_earned} XP earned! 🎯`);
      loadDashboard();
      nextQuestion();
    }
  }

  async function skipQuestion(id) {
    await api(`/api/coding/skip/${id}`, { method: "POST" });
    nextQuestion();
  }

  async function nextQuestion() {
    await loadDailyQuestion();
  }

  // Coding Topics Browse
  async function loadCodingTopics() {
    const data = await api("/api/coding/topics");
    if (!data) return;
    const modal = $("#coding-modal");
    if (!modal) return;

    modal.querySelector(".modal-body").innerHTML = `
      <h3 style="margin-bottom:16px">📚 DSA Topics (375 Questions)</h3>
      <div class="topics-grid">
        ${data.map(t => {
          const pct = Math.round((t.solved / Math.max(t.total, 1)) * 100);
          return `<div class="topic-card" onclick="PrepPulse.loadTopicQuestions('${t.topic}')">
            <div class="topic-name">${t.topic}</div>
            <div class="topic-progress-bar"><div class="topic-bar-fill" style="width:${pct}%"></div></div>
            <div class="topic-count">${t.solved}/${t.total}</div>
          </div>`;
        }).join("")}
      </div>`;
    modal.classList.add("active");
  }

  async function loadTopicQuestions(topic) {
    const data = await api(`/api/coding/topic/${encodeURIComponent(topic)}`);
    if (!data) return;
    const modal = $("#coding-modal");
    if (!modal) return;

    const diffColors = { Easy: "#4ade80", Medium: "#fbbf24", Hard: "#f87171" };
    modal.querySelector(".modal-body").innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3>${topic}</h3>
        <button class="btn-back" onclick="PrepPulse.loadCodingTopics()">← Back</button>
      </div>
      <div class="question-list">
        ${data.map(q => `
          <div class="question-item ${q.is_solved ? 'solved' : ''}">
            <span class="q-status">${q.is_solved ? '✅' : '⬜'}</span>
            <span class="q-title-sm">${q.title}</span>
            <span class="q-diff-sm" style="color:${diffColors[q.difficulty]}">${q.difficulty}</span>
            ${!q.is_solved ? `<button class="btn-solve-sm" onclick="PrepPulse.solveQuestion(${q.id})">Solve</button>` : ''}
          </div>`).join("")}
      </div>`;
    modal.classList.add("active");
  }

  // ────────────────────────────────────────────────────────────────
  // AI Mock Interview
  // ────────────────────────────────────────────────────────────────

  let interviewState = { sessionId: null, questionNum: 0, conversation: [], currentQuestion: "" };

  async function startInterview(type = "Technical") {
    const data = await api("/api/interview/start", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    if (!data) return;

    interviewState = {
      sessionId: data.session_id,
      questionNum: 1,
      conversation: [],
      currentQuestion: data.question,
    };

    showInterviewModal(data.question, 1);
  }

  function showInterviewModal(question, num) {
    const modal = $("#interview-modal");
    if (!modal) return;

    const convoHtml = interviewState.conversation.map(c => `
      <div class="iv-msg iv-q"><strong>Q:</strong> ${c.question}</div>
      <div class="iv-msg iv-a"><strong>You:</strong> ${c.answer}</div>
      ${c.feedback ? `<div class="iv-msg iv-f">${c.feedback}</div>` : ""}
    `).join("");

    modal.querySelector(".modal-body").innerHTML = `
      <div class="interview-header">
        <h3>🎤 Mock Interview</h3>
        <span class="iv-progress">Question ${num}/5</span>
      </div>
      <div class="interview-chat">
        ${convoHtml}
        <div class="iv-msg iv-q"><strong>Q${num}:</strong> ${question}</div>
      </div>
      <div class="iv-input-area">
        <textarea id="iv-answer" placeholder="Type your answer here..." rows="3"></textarea>
        <button class="btn-submit-answer" onclick="PrepPulse.submitAnswer()">Submit Answer</button>
      </div>
    `;
    modal.classList.add("active");
    setTimeout(() => {
      const ta = $("#iv-answer");
      if (ta) ta.focus();
    }, 200);
  }

  async function submitAnswer() {
    const answer = ($("#iv-answer")?.value || "").trim();
    if (!answer) return;

    // Save conversation
    interviewState.conversation.push({
      question: interviewState.currentQuestion,
      answer: answer,
    });

    if (interviewState.questionNum >= 5) {
      // End interview
      const result = await api("/api/interview/end", {
        method: "POST",
        body: JSON.stringify({
          session_id: interviewState.sessionId,
          conversation: interviewState.conversation,
        }),
      });
      if (result) showInterviewResult(result);
      return;
    }

    // Get next question
    const data = await api("/api/interview/respond", {
      method: "POST",
      body: JSON.stringify({
        session_id: interviewState.sessionId,
        answer: answer,
        question_num: interviewState.questionNum,
        previous_question: interviewState.currentQuestion,
      }),
    });

    if (!data) return;

    // Parse feedback
    interviewState.conversation[interviewState.conversation.length - 1].feedback = data.response;

    if (data.is_complete) {
      const result = await api("/api/interview/end", {
        method: "POST",
        body: JSON.stringify({
          session_id: interviewState.sessionId,
          conversation: interviewState.conversation,
        }),
      });
      if (result) showInterviewResult(result);
      return;
    }

    // Extract next question from response
    const lines = data.response.split("\n");
    let nextQ = lines.find(l => l.startsWith("Next Question:"));
    nextQ = nextQ ? nextQ.replace("Next Question:", "").trim() : data.response;
    interviewState.currentQuestion = nextQ;
    interviewState.questionNum = data.question_num;
    showInterviewModal(nextQ, data.question_num);
  }

  function showInterviewResult(result) {
    const modal = $("#interview-modal");
    if (!modal) return;
    modal.querySelector(".modal-body").innerHTML = `
      <div class="iv-result">
        <h3>📊 Interview Complete!</h3>
        <div class="iv-score-ring">
          <span class="iv-score-num">${result.score}</span>
          <span class="iv-score-label">/100</span>
        </div>
        <div class="iv-feedback-text">${result.feedback.replace(/\n/g, '<br>')}</div>
        <p class="iv-xp">+${result.xp_earned} XP earned! 🎉</p>
        <button class="btn-solve" onclick="PrepPulse.closeModal('interview-modal')">Close</button>
      </div>
    `;
    loadDashboard();
  }

  // ────────────────────────────────────────────────────────────────
  // Pipeline Tracker
  // ────────────────────────────────────────────────────────────────

  async function loadPipeline() {
    const data = await api("/api/pipeline");
    if (!data) return;
    showPipelineModal(data);
  }

  function showPipelineModal(data) {
    const modal = $("#pipeline-modal");
    if (!modal) return;

    const statusColors = {
      applied: "#60a5fa", interviewing: "#fbbf24",
      offered: "#4ade80", rejected: "#f87171",
    };

    const entriesHtml = data.entries.length
      ? data.entries.map(e => `
        <div class="pipe-entry">
          <div class="pipe-info">
            <strong>${e.company}</strong> — ${e.role}
            <span class="pipe-status" style="background:${statusColors[e.status] || '#666'}">${e.status}</span>
          </div>
          <div class="pipe-actions">
            <select onchange="PrepPulse.updatePipelineStatus(${e.id}, this.value)" class="pipe-select">
              ${["applied", "interviewing", "offered", "rejected"].map(s =>
                `<option value="${s}" ${s === e.status ? "selected" : ""}>${s}</option>`
              ).join("")}
            </select>
            <button class="btn-del" onclick="PrepPulse.deletePipelineEntry(${e.id})">🗑</button>
          </div>
        </div>`).join("")
      : '<p class="empty-state">No applications yet. Start tracking!</p>';

    modal.querySelector(".modal-body").innerHTML = `
      <h3 style="margin-bottom:16px">📊 Placement Pipeline</h3>
      <div class="pipe-summary-bar">
        <span style="color:${statusColors.applied}">Applied: ${data.summary.applied}</span>
        <span style="color:${statusColors.interviewing}">Interviews: ${data.summary.interviewing}</span>
        <span style="color:${statusColors.offered}">Offers: ${data.summary.offered}</span>
      </div>
      <div class="pipe-add-form">
        <input id="pipe-company" placeholder="Company Name" />
        <input id="pipe-role" placeholder="Role" value="SDE" />
        <button class="btn-solve" onclick="PrepPulse.addPipelineEntry()">+ Add</button>
      </div>
      <div class="pipe-entries">${entriesHtml}</div>
    `;
    modal.classList.add("active");
  }

  async function addPipelineEntry() {
    const company = ($("#pipe-company")?.value || "").trim();
    const role = ($("#pipe-role")?.value || "SDE").trim();
    if (!company) return showToast("Enter a company name");

    const data = await api("/api/pipeline", {
      method: "POST",
      body: JSON.stringify({ company, role }),
    });
    if (data && data.success) {
      showToast(`+${data.xp_earned} XP — Added ${company}!`);
      loadPipeline();
      loadDashboard();
    }
  }

  async function updatePipelineStatus(id, status) {
    await api(`/api/pipeline/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    loadPipeline();
    loadDashboard();
  }

  async function deletePipelineEntry(id) {
    await api(`/api/pipeline/${id}`, { method: "DELETE" });
    loadPipeline();
    loadDashboard();
  }

  // ────────────────────────────────────────────────────────────────
  // Leaderboard
  // ────────────────────────────────────────────────────────────────

  async function loadLeaderboard() {
    const data = await api("/api/leaderboard");
    if (!data) return;
    const modal = $("#leaderboard-modal");
    if (!modal) return;

    const medals = ["🥇", "🥈", "🥉"];
    modal.querySelector(".modal-body").innerHTML = `
      <h3 style="margin-bottom:16px">🏆 Campus Leaderboard</h3>
      <div class="lb-list">
        ${data.length ? data.map(u => `
          <div class="lb-entry ${u.rank <= 3 ? 'lb-top' : ''}">
            <span class="lb-rank">${medals[u.rank - 1] || '#' + u.rank}</span>
            <span class="lb-name">${u.name}</span>
            <span class="lb-xp">${u.xp_points} XP</span>
            <span class="lb-streak">🔥 ${u.coding_streak}d</span>
          </div>`).join("")
          : '<p class="empty-state">No users on the leaderboard yet. Be the first!</p>'}
      </div>`;
    modal.classList.add("active");
  }

  // ────────────────────────────────────────────────────────────────
  // Toast Notifications
  // ────────────────────────────────────────────────────────────────

  function showToast(msg) {
    let toast = $("#toast-container");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast-container";
      document.body.appendChild(toast);
    }
    const el = document.createElement("div");
    el.className = "toast-msg";
    el.textContent = msg;
    toast.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ────────────────────────────────────────────────────────────────
  // Modal Controls
  // ────────────────────────────────────────────────────────────────

  function closeModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.classList.remove("active");
  }

  // Close on overlay click
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("module-modal")) {
      e.target.classList.remove("active");
    }
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $$(".module-modal.active").forEach(m => m.classList.remove("active"));
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Public API — exposed globally for onclick handlers
  // ────────────────────────────────────────────────────────────────

  window.PrepPulse = {
    loadDashboard,
    loadDailyQuestion,
    solveQuestion,
    skipQuestion,
    nextQuestion,
    loadCodingTopics,
    loadTopicQuestions,
    startInterview,
    submitAnswer,
    loadPipeline,
    addPipelineEntry,
    updatePipelineStatus,
    deletePipelineEntry,
    loadLeaderboard,
    closeModal,
    showToast,
  };

  // ────────────────────────────────────────────────────────────────
  // Auto-initialize on DOM ready
  // ────────────────────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadDashboard);
  } else {
    loadDashboard();
  }

})();
