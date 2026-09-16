/* ======================================================================
   راهِ حفظ — منطق برنامه
   تمام داده‌ها فقط در همین مرورگر/گوشی (localStorage) ذخیره می‌شود.
   ====================================================================== */

/* ================= نورا — کاراکتر همراه (ستاره‌ی نورانی) ================= */
function MASCOT_SVG(size) {
  size = size || 120;
  return `
  <svg class="mascot-svg" width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="mascotGlowGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#E7B84E" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#E7B84E" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="mascotBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F6DFA0"/>
        <stop offset="55%" stop-color="#E7B84E"/>
        <stop offset="100%" stop-color="#C9932E"/>
      </linearGradient>
    </defs>
    <g class="mascot-wrap">
      <circle class="mascot-aura" cx="100" cy="100" r="88" fill="url(#mascotGlowGrad)"/>
      <g class="mascot-float">
        <g class="mascot-star-shape">
          <polygon fill="url(#mascotBodyGrad)" stroke="#C9932E" stroke-width="2" stroke-linejoin="round"
            points="100,0 122,40 164,24 160,70 200,86 170,116 188,156 144,148 130,190 100,160 70,190 56,148 12,156 30,116 0,86 40,70 36,24 78,40"/>
        </g>
        <ellipse cx="72" cy="112" rx="9" ry="5" fill="#F08A9B" opacity="0.4"/>
        <ellipse cx="128" cy="112" rx="9" ry="5" fill="#F08A9B" opacity="0.4"/>
        <ellipse class="mascot-eye mascot-eye-l" cx="82" cy="96" rx="6" ry="7" fill="#2A1E08"/>
        <ellipse class="mascot-eye mascot-eye-r" cx="118" cy="96" rx="6" ry="7" fill="#2A1E08"/>
        <path d="M84,116 Q100,128 116,116" stroke="#2A1E08" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      </g>
      <g class="mascot-sparkles">
        <circle cx="26" cy="50" r="4" fill="#9AF0E1"/>
        <circle cx="176" cy="66" r="3" fill="#F6DFA0"/>
        <circle cx="150" cy="176" r="3.5" fill="#9AF0E1"/>
      </g>
    </g>
  </svg>`;
}

function mountMascots() {
  const splashEl = document.getElementById("splash-mascot");
  if (splashEl) splashEl.innerHTML = MASCOT_SVG(150);
  const menuEl = document.getElementById("menu-mascot");
  if (menuEl) menuEl.innerHTML = MASCOT_SVG(68);
}

/* ================= جلوه‌ی موج (ripple) روی دکمه‌ها و کارت‌ها ================= */
document.addEventListener("click", function (e) {
  const el = e.target.closest(".btn, .menu-card, .lesson-card, .chip, .icon-btn");
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height) * 1.2;
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
  ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
  const prevPos = getComputedStyle(el).position;
  if (prevPos === "static") el.style.position = "relative";
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

const STORAGE_KEY = "qhifz_state_v1";
const REVIEW_INTERVALS = [1, 3, 7, 16, 35, 90]; // روزهای فاصله‌ی مرور (شبیه یادگیری فاصله‌دار)

const LEVEL_TARGETS = { beginner: 3, intermediate: 8, advanced: 15 };

function defaultState() {
  return {
    name: "",
    fontSize: 22,
    level: "beginner",
    dailyTarget: 5,
    progress: {},      // { [surahId]: {memorizedAyahs, status, reviewStage, nextReview, lastReviewed} }
    activityDates: [],
    lessonsCompleted: [], // شماره‌ی درس‌های تکمیل‌شده در بخش «شروع یادگیری»
    createdAt: todayStr()
  };
}

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/* ---------------- ناوبری بین صفحات ---------------- */
function goTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.page === pageId);
  });
  if (pageId === "dashboard") renderDashboard();
  if (pageId === "surahs") renderSurahList();
  if (pageId === "plan") renderPlan();
  if (pageId === "review") renderReviewList();
  if (pageId === "settings") renderSettings();
}

/* ---------------- کمکی‌های پیشرفت ---------------- */
function getProgress(id) {
  return state.progress[id] || { memorizedAyahs: 0, status: "none", reviewStage: -1, nextReview: null, lastReviewed: null };
}

function totalMemorizedAyahs() {
  let sum = 0;
  for (const s of SURAHS) {
    const p = getProgress(s.id);
    sum += p.status === "done" ? s.ayahs : (p.memorizedAyahs || 0);
  }
  return sum;
}

function countDoneSurahs() {
  return SURAHS.filter(s => getProgress(s.id).status === "done").length;
}

function markActivityToday() {
  const t = todayStr();
  if (!state.activityDates.includes(t)) state.activityDates.push(t);
}

function computeStreak() {
  const set = new Set(state.activityDates);
  let streak = 0;
  let cursor = 0;
  while (set.has(todayStr(-cursor))) {
    streak++;
    cursor++;
  }
  return streak;
}

function setSurahProgress(id, memorizedAyahs, status) {
  const surah = SURAHS.find(s => s.id === id);
  const prev = getProgress(id);
  const entry = {
    memorizedAyahs: Math.max(0, Math.min(memorizedAyahs, surah.ayahs)),
    status,
    reviewStage: prev.reviewStage,
    nextReview: prev.nextReview,
    lastReviewed: prev.lastReviewed
  };
  if (status === "done" && prev.status !== "done") {
    entry.reviewStage = 0;
    entry.nextReview = todayStr(REVIEW_INTERVALS[0]);
    entry.lastReviewed = todayStr();
    entry.memorizedAyahs = surah.ayahs;
  }
  if (status !== "done") {
    entry.reviewStage = -1;
    entry.nextReview = null;
  }
  state.progress[id] = entry;
  markActivityToday();
  saveState();
}

function advanceReview(id) {
  const p = getProgress(id);
  const nextStage = Math.min(p.reviewStage + 1, REVIEW_INTERVALS.length - 1);
  p.reviewStage = nextStage;
  p.lastReviewed = todayStr();
  p.nextReview = todayStr(REVIEW_INTERVALS[nextStage]);
  state.progress[id] = p;
  markActivityToday();
  saveState();
  renderReviewList();
  renderDashboard();
}

/* ================= داشبورد ================= */
function renderDashboard() {
  const pct = Math.round((totalMemorizedAyahs() / TOTAL_AYAHS) * 100);
  document.getElementById("star-fill").style.setProperty("--pct", pct);
  document.getElementById("dash-pct").textContent = toFa(pct) + "٪";
  document.getElementById("stat-streak").textContent = toFa(computeStreak());
  document.getElementById("stat-memorized").textContent = toFa(totalMemorizedAyahs());
  document.getElementById("stat-surahs").textContent = toFa(countDoneSurahs());

  const target = state.dailyTarget || LEVEL_TARGETS[state.level] || 5;
  document.getElementById("dash-goal-text").textContent =
    `هدف شما: ${toFa(target)} آیه در روز — تا این لحظه ${toFa(totalMemorizedAyahs())} آیه از ${toFa(TOTAL_AYAHS)} آیه‌ی قرآن را حفظ کرده‌اید.`;

  // ادامه‌ی حفظ: اولین سوره‌ی «در حال حفظ»
  const inProgress = SURAHS.find(s => getProgress(s.id).status === "progress");
  const cBody = document.getElementById("dash-continue-body");
  if (inProgress) {
    const p = getProgress(inProgress.id);
    cBody.innerHTML = `
      <div class="surah-item" onclick="openSurahModal(${inProgress.id})" style="border:none;padding:0;">
        <div class="surah-num"><span>${toFa(inProgress.id)}</span></div>
        <div class="surah-info">
          <div class="name-row"><span class="fa-name">${inProgress.fa}</span><span class="ar-name">${inProgress.ar}</span></div>
          <div class="meta">${toFa(p.memorizedAyahs)} از ${toFa(inProgress.ayahs)} آیه</div>
          <div class="progress-track"><div class="progress-fill" style="width:${(p.memorizedAyahs/inProgress.ayahs)*100}%"></div></div>
        </div>
      </div>`;
  } else {
    cBody.innerHTML = `<div class="empty" style="padding:6px 0;"><div class="mascot-wrap">${MASCOT_SVG(44)}</div>هنوز سوره‌ای را شروع نکرده‌اید. از تب «سوره‌ها» شروع کنید.</div>`;
  }

  // مرور امروز
  const due = SURAHS
    .filter(s => getProgress(s.id).status === "done" && getProgress(s.id).nextReview <= todayStr())
    .slice(0, 3);
  const rBody = document.getElementById("dash-review-body");
  if (due.length) {
    rBody.innerHTML = due.map(s => `
      <div class="review-item">
        <div>
          <div class="fa-name" style="font-weight:700;">${s.fa} <span class="ar-name">${s.ar}</span></div>
          <div class="due today">امروز</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="advanceReview(${s.id})">مرور شد</button>
      </div>`).join("");
  } else {
    rBody.innerHTML = `<div class="empty" style="padding:6px 0;">امروز مروری برایتان زمان‌بندی نشده 🌙</div>`;
  }
}

/* ================= فهرست سوره‌ها ================= */
function renderSurahList() {
  const q = (document.getElementById("surah-search").value || "").trim();
  const list = document.getElementById("surah-list");
  const filtered = SURAHS.filter(s => !q || s.fa.includes(q) || s.ar.includes(q) || String(s.id).includes(q));
  list.innerHTML = filtered.map((s, idx) => {
    const p = getProgress(s.id);
    const dotClass = p.status === "done" ? "done" : p.status === "progress" ? "progress" : "none";
    const pctW = p.status === "done" ? 100 : Math.round((p.memorizedAyahs / s.ayahs) * 100);
    return `
      <div class="surah-item" style="animation-delay:${Math.min(idx * 30, 400)}ms" onclick="openSurahModal(${s.id})">
        <div class="surah-num"><span>${toFa(s.id)}</span></div>
        <div class="surah-info">
          <div class="name-row">
            <span class="fa-name"><span class="status-dot ${dotClass}" style="display:inline-block;margin-left:6px;"></span>${s.fa}</span>
            <span class="ar-name">${s.ar}</span>
          </div>
          <div class="meta">${toFa(s.ayahs)} آیه · ${s.type}</div>
          <div class="progress-track"><div class="progress-fill" style="width:${pctW}%"></div></div>
        </div>
      </div>`;
  }).join("") || `<div class="empty">سوره‌ای یافت نشد</div>`;
}

function openSurahModal(id) {
  const s = SURAHS.find(x => x.id === id);
  const p = getProgress(id);
  const body = document.getElementById("surah-modal-body");
  body.innerHTML = `
    <h3>${s.fa} <span class="ar-name">${s.ar}</span></h3>
    <p style="font-size:12.5px;color:var(--parchment-dim);margin:-6px 0 16px;">${toFa(s.ayahs)} آیه · ${s.type}</p>
    <div class="field">
      <label>تا آیه‌ی شماره‌ی حفظ‌شده</label>
      <input type="number" id="modal-ayah" min="0" max="${s.ayahs}" value="${p.memorizedAyahs || 0}">
    </div>
    <div class="field">
      <label>وضعیت</label>
      <select id="modal-status">
        <option value="none" ${p.status === "none" ? "selected" : ""}>شروع نشده</option>
        <option value="progress" ${p.status === "progress" ? "selected" : ""}>در حال حفظ</option>
        <option value="done" ${p.status === "done" ? "selected" : ""}>حفظ کامل</option>
      </select>
    </div>
    ${p.status === "done" ? `<p style="font-size:12px;color:var(--gold-soft);">مرور بعدی: ${p.nextReview}</p>` : ""}
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeSurahModal()">انصراف</button>
      <button class="btn btn-primary" onclick="saveSurahModal(${id})">ذخیره</button>
    </div>
    <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px;">
      <button class="btn btn-ghost" id="load-text-btn" onclick="loadAyahText(${id})">📖 نمایش متن و ترجمه‌ی سوره</button>
      <div id="ayah-text-box" style="margin-top:12px;max-height:260px;overflow-y:auto;"></div>
    </div>`;
  document.getElementById("surah-modal").classList.add("active");
}
function closeSurahModal() {
  document.getElementById("surah-modal").classList.remove("active");
}
function saveSurahModal(id) {
  const ayah = parseInt(document.getElementById("modal-ayah").value || "0", 10);
  const status = document.getElementById("modal-status").value;
  setSurahProgress(id, ayah, status);
  closeSurahModal();
  renderSurahList();
  renderDashboard();
}

/* ================= نمایش متن آیات (زنده از اینترنت) ================= */
async function loadAyahText(id) {
  const btn = document.getElementById("load-text-btn");
  const box = document.getElementById("ayah-text-box");
  btn.textContent = "در حال بارگذاری…";
  btn.disabled = true;
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/editions/quran-uthmani,fa.makarem`);
    if (!res.ok) throw new Error("network");
    const json = await res.json();
    const arabic = json.data[0].ayahs;
    const farsi = json.data[1] ? json.data[1].ayahs : [];
    box.innerHTML = arabic.map((a, i) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--line);">
        <div style="font-family:var(--font-display);font-size:${state.fontSize || 22}px;line-height:2.1;color:var(--parchment);text-align:right;">
          ${a.text} <span style="color:var(--gold-soft);font-size:14px;">(${toFa(a.numberInSurah)})</span>
        </div>
        ${farsi[i] ? `<div style="font-size:13px;color:var(--parchment-dim);margin-top:6px;line-height:1.9;">${farsi[i].text}</div>` : ""}
      </div>`).join("");
    btn.style.display = "none";
  } catch (e) {
    box.innerHTML = `<div class="empty" style="padding:10px 0;">
      متن سوره بارگذاری نشد. لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
    </div>`;
    btn.textContent = "📖 تلاش دوباره";
    btn.disabled = false;
  }
}

/* ================= ماژول «شروع یادگیری» ================= */
function renderLearnList() {
  const done = state.lessonsCompleted || [];
  const pctDone = Math.round((done.length / LESSONS.length) * 100);
  document.getElementById("learn-progress-fill").style.width = pctDone + "%";
  document.getElementById("learn-progress-text").textContent = `${toFa(done.length)} از ${toFa(LESSONS.length)} درس کامل شد`;

  const list = document.getElementById("lesson-list");
  list.innerHTML = LESSONS.map((lesson, idx) => {
    const isDone = done.includes(lesson.id);
    const prevDone = idx === 0 || done.includes(LESSONS[idx - 1].id);
    const locked = !prevDone && !isDone;
    return `
      <div class="lesson-card ${locked ? "locked" : ""}" onclick="${locked ? "" : `openLesson(${lesson.id})`}">
        <div class="l-icon">${locked ? "🔒" : lesson.icon}</div>
        <div style="flex:1;">
          <div class="l-title">${toFa(lesson.id)}. ${lesson.title}</div>
          <div class="l-status">${isDone ? "تکمیل‌شده ✓" : locked ? "قفل — ابتدا درس قبلی را تمام کنید" : "آماده‌ی شروع"}</div>
        </div>
        ${isDone ? '<div class="l-check">✓</div>' : ""}
      </div>`;
  }).join("");
}

let currentLessonAnswers = {};

function openLesson(id) {
  const lesson = LESSONS.find(l => l.id === id);
  currentLessonAnswers = {};
  document.getElementById("lesson-view-title").textContent = `درس ${toFa(id)}`;
  const body = document.getElementById("lesson-view-body");
  body.innerHTML = `
    <div class="card">
      <h2>${lesson.title}</h2>
      ${lesson.content}
      <div class="quiz-block">
        <p class="eyebrow">تمرین کوتاه</p>
        ${lesson.quiz.map((q, qi) => `
          <div class="quiz-q">
            <p>${qi + 1}. ${q.q}</p>
            ${q.options.map((opt, oi) => `
              <button class="quiz-opt" onclick="selectQuizOption(${id},${qi},${oi})" id="opt-${id}-${qi}-${oi}">${opt}</button>
            `).join("")}
          </div>`).join("")}
        <div id="quiz-feedback-${id}"></div>
        <button class="btn btn-primary" onclick="checkQuiz(${id})" style="margin-top:6px;">بررسی پاسخ‌ها</button>
      </div>
    </div>`;
  showScreen("learn-lesson");
}

function selectQuizOption(lessonId, qIndex, oIndex) {
  currentLessonAnswers[qIndex] = oIndex;
  const lesson = LESSONS.find(l => l.id === lessonId);
  lesson.quiz[qIndex].options.forEach((_, oi) => {
    document.getElementById(`opt-${lessonId}-${qIndex}-${oi}`).classList.toggle("selected", oi === oIndex);
  });
}

function checkQuiz(lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  let allCorrect = true;
  lesson.quiz.forEach((q, qi) => {
    const chosen = currentLessonAnswers[qi];
    q.options.forEach((_, oi) => {
      const el = document.getElementById(`opt-${lessonId}-${qi}-${oi}`);
      el.classList.remove("correct", "wrong");
      if (oi === q.correct) el.classList.add("correct");
      else if (oi === chosen) el.classList.add("wrong");
    });
    if (chosen !== q.correct) allCorrect = false;
  });
  const feedback = document.getElementById(`quiz-feedback-${lessonId}`);
  if (allCorrect) {
    feedback.innerHTML = `<div class="quiz-feedback ok">آفرین! همه‌ی پاسخ‌ها درست بود 🎉</div>
      <button class="btn btn-primary" style="margin-top:10px;" onclick="completeLesson(${lessonId})">تکمیل درس و ادامه</button>`;
  } else {
    feedback.innerHTML = `<div class="quiz-feedback bad">یکی از پاسخ‌ها اشتباه بود؛ گزینه‌های درست با رنگ طلایی مشخص شدند. دوباره تلاش کنید.</div>`;
  }
}

function completeLesson(lessonId) {
  if (!state.lessonsCompleted.includes(lessonId)) {
    state.lessonsCompleted.push(lessonId);
    saveState();
  }
  const next = LESSONS.find(l => l.id === lessonId + 1);
  if (next) {
    openLesson(next.id);
  } else {
    showScreen("learn-list");
  }
}

/* ================= کمک به مدارس دینی ================= */
function copyCardNumber() {
  const raw = document.getElementById("card-number").textContent.replace(/-/g, "");
  const btn = document.getElementById("copy-card-btn");
  navigator.clipboard.writeText(raw).then(() => {
    btn.textContent = "✓ کپی شد";
    setTimeout(() => (btn.textContent = "📋 کپی شماره کارت"), 1800);
  }).catch(() => {
    btn.textContent = "کپی نشد — دستی کپی کنید";
  });
}

/* ================= مودال ثبت سریع (از داشبورد) ================= */
function openLogModal() {
  const sel = document.getElementById("log-surah-select");
  sel.innerHTML = SURAHS.map(s => `<option value="${s.id}">${toFa(s.id)}. ${s.fa} (${s.ar})</option>`).join("");
  document.getElementById("log-ayah-input").value = "";
  document.getElementById("log-modal").classList.add("active");
}
function closeLogModal() {
  document.getElementById("log-modal").classList.remove("active");
}
function confirmLog() {
  const id = parseInt(document.getElementById("log-surah-select").value, 10);
  const ayah = parseInt(document.getElementById("log-ayah-input").value || "0", 10);
  const status = document.getElementById("log-status-select").value;
  setSurahProgress(id, ayah, status);
  closeLogModal();
  renderDashboard();
}

/* ================= برنامه‌ی حفظ ================= */
function renderPlan() {
  document.querySelectorAll("#level-chips .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.level === state.level);
    c.onclick = () => {
      state.level = c.dataset.level;
      renderPlan();
    };
  });
  document.getElementById("daily-target").value = state.dailyTarget || LEVEL_TARGETS[state.level] || 5;
  renderForecast();
}

function savePlan() {
  const target = parseInt(document.getElementById("daily-target").value || "0", 10);
  state.dailyTarget = target > 0 ? target : LEVEL_TARGETS[state.level] || 5;
  saveState();
  renderForecast();
  renderDashboard();
}

function renderForecast() {
  const remaining = TOTAL_AYAHS - totalMemorizedAyahs();
  const target = state.dailyTarget || LEVEL_TARGETS[state.level] || 5;
  const days = Math.max(1, Math.ceil(remaining / target));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = days % 30;
  let text = "";
  if (years > 0) text += `${toFa(years)} سال `;
  if (months > 0) text += `${toFa(months)} ماه `;
  if (years === 0) text += `${toFa(remDays)} روز`;
  document.getElementById("plan-forecast-body").innerHTML = `
    با هدف روزانه‌ی <b style="color:var(--gold-soft)">${toFa(target)} آیه</b>،
    حدود <b style="color:var(--gold-soft)">${text}</b> دیگر تا حفظ کامل قرآن باقی مانده
    (${toFa(remaining)} آیه از ${toFa(TOTAL_AYAHS)} آیه).`;
}

/* ================= مرور فاصله‌دار ================= */
function renderReviewList() {
  const doneSurahs = SURAHS
    .map(s => ({ s, p: getProgress(s.id) }))
    .filter(x => x.p.status === "done")
    .sort((a, b) => (a.p.nextReview || "").localeCompare(b.p.nextReview || ""));

  const list = document.getElementById("review-list");
  if (!doneSurahs.length) {
    list.innerHTML = `<div class="empty"><div class="mascot-wrap">${MASCOT_SVG(56)}</div>هنوز سوره‌ای را «حفظ کامل» علامت نزده‌اید.<br>وقتی سوره‌ای را کامل حفظ کنید، اینجا برای مرور دوره‌ای زمان‌بندی می‌شود.</div>`;
    return;
  }
  const today = todayStr();
  list.innerHTML = doneSurahs.map(({ s, p }) => {
    const isDue = p.nextReview <= today;
    const dueLabel = isDue
      ? (p.nextReview < today ? "دیرشده" : "امروز")
      : `${toFa(daysBetween(today, p.nextReview))} روز دیگر`;
    return `
      <div class="review-item">
        <div>
          <div style="font-weight:700;">${s.fa} <span class="ar-name">${s.ar}</span></div>
          <div class="due ${isDue ? (p.nextReview < today ? "overdue" : "today") : ""}">${dueLabel}</div>
        </div>
        ${isDue ? `<button class="btn btn-primary btn-sm" onclick="advanceReview(${s.id})">مرور شد</button>`
                : `<span style="font-size:11px;color:var(--parchment-dim);">مرحله ${toFa(p.reviewStage + 1)}</span>`}
      </div>`;
  }).join("");
}

function daysBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

/* ================= تنظیمات ================= */
function renderSettings() {
  document.getElementById("setting-name").value = state.name || "";
  document.querySelectorAll("#font-chips .chip").forEach(c => {
    c.classList.toggle("active", parseInt(c.dataset.size, 10) === state.fontSize);
    c.onclick = () => {
      state.fontSize = parseInt(c.dataset.size, 10);
      renderSettings();
    };
  });
}
function saveSettings() {
  state.name = document.getElementById("setting-name").value.trim();
  saveState();
  goTo("dashboard");
}
function resetData() {
  if (confirm("آیا مطمئن هستید؟ تمام پیشرفت شما پاک خواهد شد.")) {
    state = defaultState();
    saveState();
    goTo("dashboard");
  }
}

/* ================= ابزار: تبدیل اعداد به فارسی ================= */
function toFa(n) {
  const map = { "0":"۰","1":"۱","2":"۲","3":"۳","4":"۴","5":"۵","6":"۶","7":"۷","8":"۸","9":"۹" };
  return String(n).replace(/[0-9]/g, d => map[d]);
}

/* ================= شروع برنامه ================= */
document.addEventListener("DOMContentLoaded", () => {
  mountMascots();
  renderDashboard();
  // ثبت سرویس‌ورکر برای نصب‌پذیری به‌عنوان اپ (PWA) در صورت پشتیبانی مرورگر
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // --- صفحه‌ی ورود سینمایی ---
  const name = state.name ? `${state.name} عزیز` : "";
  const menuName = document.getElementById("menu-profile-name");
  if (menuName) menuName.textContent = name ? `مسیر ${name}` : "شروع مسیر حفظ";
  document.getElementById("splash-status").textContent = "در حال آماده‌سازی مسیر شما…";
  setTimeout(() => {
    document.getElementById("splash-status").textContent = name ? `خوش آمدید، ${name} ✦` : "خوش آمدید ✦";
  }, 1050);
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    splash.classList.add("fade-out");
    showScreen("menu");
    setTimeout(() => splash.remove(), 650);
  }, 3000);
});

/* ================= ناوبری بین صفحات اصلی (منو / یادگیری / حفظ / کمک / سازنده) ================= */
function showScreen(name) {
  document.querySelectorAll(".top-screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  if (name === "learn-list") renderLearnList();
}
