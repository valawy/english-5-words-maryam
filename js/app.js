const TOTAL_WORDS = 1040;
const STEPS = ["see", "hear", "say", "remember", "use", "play"];

let vocabulary = [];
let state = {
  week: 1,
  day: 1,
  step: 0,
  activeWord: 0,
  xp: 0,
  streak: 0,
  lastStudy: null,
  learned: {},
  completedLessons: {}
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  loadState();
  try {
    const response = await fetch("data/vocabulary.json?v=5", { cache: "no-store" });
    if (!response.ok) throw new Error("Vocabulary HTTP " + response.status);
    vocabulary = await response.json();
  } catch (error) {
    console.error(error);
    showDataError();
    return;
  }

  renderHome();
  setupEvents();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=5").catch(() => {});
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("maryamEnglishEngine") || "{}");
    state = {
      ...state,
      ...saved,
      learned: saved.learned || {},
      completedLessons: saved.completedLessons || {}
    };
  } catch (_) {}
}

function saveState() {
  localStorage.setItem("maryamEnglishEngine", JSON.stringify(state));
}

function lesson(week, day) {
  return vocabulary.find((item) => item.week === week && item.day === day) || null;
}

function currentLesson() {
  return lesson(state.week, state.day);
}

function renderHome() {
  renderWeeks();
  renderCurrentLesson();
  updateStats();
}

function renderWeeks() {
  const grid = $("weeksGrid");
  grid.innerHTML = "";

  for (let week = 1; week <= 52; week++) {
    const items = vocabulary.filter((item) => item.week === week);
    const topics = [...new Set(items.map((item) => item.topic))];
    const completed = items.filter(
      (item) => state.completedLessons[`${item.week}-${item.day}`]
    ).length;

    const button = document.createElement("button");
    button.className = "week-card";
    button.type = "button";
    button.innerHTML = `
      <div class="week-number">WEEK ${week}</div>
      <div class="week-title">${escapeHTML(topics[0] || "Materi")}</div>
      <div class="week-info">${items.length ? `${completed}/4 lesson selesai` : "Belum tersedia"}</div>
    `;
    button.addEventListener("click", () => openWeek(week));
    grid.appendChild(button);
  }
}

function renderCurrentLesson() {
  const item = currentLesson();
  $("currentLessonTitle").textContent = item
    ? `Week ${item.week} · Day ${item.day}`
    : "Materi tidak tersedia";
  $("currentLessonTopic").textContent = item ? item.topic : "";
  $("dayBadge").textContent = item ? `DAY ${item.day}` : "DAY -";

  $("wordPreview").innerHTML = item
    ? item.words
        .map((word) => `<div class="word-chip">${escapeHTML(word.word)}</div>`)
        .join("")
    : "";
}

function updateStats() {
  const learnedCount = Object.values(state.learned).filter((value) => value >= 1).length;
  const masteredCount = Object.values(state.learned).filter((value) => value >= 3).length;
  const percent = Math.round((learnedCount / TOTAL_WORDS) * 100);

  $("xpValue").textContent = state.xp;
  $("wordsLearned").textContent = learnedCount;
  $("masteredValue").textContent = masteredCount;
  $("streakValue").textContent = state.streak;
  $("streakMini").textContent = state.streak;
  $("progressPercent").textContent = `${percent}%`;
  $("progressBar").style.width = `${percent}%`;
  $("progressLabel").textContent = `${learnedCount.toLocaleString("id-ID")} dari 1.040 kata`;
}

function openWeek(week) {
  const first = lesson(week, 1);
  if (!first) return;

  state.week = week;
  state.day = 1;
  saveState();
  renderCurrentLesson();
  openEngine();
}

function openEngine() {
  const item = currentLesson();
  if (!item) return;

  state.step = 0;
  state.activeWord = 0;

  $("engineWeekDay").textContent = `WEEK ${item.week} · DAY ${item.day}`;
  $("engineTitle").textContent = item.topic;
  $("lessonModal").classList.remove("hidden");
  $("lessonModal").setAttribute("aria-hidden", "false");

  renderEngine();
}

function closeEngine() {
  $("lessonModal").classList.add("hidden");
  $("lessonModal").setAttribute("aria-hidden", "true");

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  renderHome();
}

function renderEngine() {
  const item = currentLesson();
  if (!item) return;

  $("engineXp").textContent = state.xp;
  $("stepCounter").textContent = `${state.step + 1} / ${STEPS.length}`;

  document.querySelectorAll(".step").forEach((button, index) => {
    button.classList.toggle("active", index === state.step);
    button.classList.toggle("done", index < state.step);
  });

  $("prevStep").disabled = state.step === 0;
  $("nextStep").disabled = false;
  $("nextStep").textContent =
    state.step === STEPS.length - 1 ? "Selesai ✓" : "Lanjut →";

  $("engineContent").innerHTML = buildStep(STEPS[state.step], item);
  bindStep();
}

function buildStep(type, item) {
  if (type === "see") {
    return `
      <div>
        <span class="eyebrow">STEP 1 · SEE IT</span>
        <h3 class="quiz-title">Kenali 5 kata hari ini 👀</h3>
        <div class="word-grid">
          ${item.words.map((word) => `
            <article class="learning-word">
              <div class="word">${escapeHTML(word.word)}</div>
              <div class="meaning">${escapeHTML(word.meaning)}</div>
              <div class="sound-row">
                <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Dengarkan</button>
                <span class="tiny">${escapeHTML(word.pronunciation || "")}</span>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (type === "hear") {
    return `
      <div>
        <span class="eyebrow">STEP 2 · HEAR IT</span>
        <h3 class="quiz-title">Dengarkan dan ulangi 🔊</h3>
        <div class="hear-list">
          ${item.words.map((word) => `
            <div class="hear-card">
              <div>
                <strong>${escapeHTML(word.word)}</strong>
                <div class="tiny">${escapeHTML(word.meaning)}</div>
              </div>
              <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Listen</button>
            </div>
          `).join("")}
        </div>
        <div class="support-note">Dengarkan 2–3 kali, lalu ucapkan sendiri.</div>
      </div>
    `;
  }

  const word = item.words[state.activeWord];

  if (type === "say") {
    return `
      <div class="say-card">
        <span class="eyebrow">STEP 3 · SAY IT</span>
        <div class="tiny">Kata ${state.activeWord + 1} dari ${item.words.length}</div>
        <div class="say-word">${escapeHTML(word.word)}</div>
        <div class="tiny">${escapeHTML(word.meaning)} · ${escapeHTML(word.pronunciation || "")}</div>
        <div style="margin:18px 0">
          <button type="button" id="micButton" class="mic-button">🎤</button>
        </div>
        <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Dengarkan</button>
        <div id="sayResult" class="say-result">Tekan mikrofon lalu ucapkan kata tersebut.</div>
        <div class="support-note">Jika browser tidak mendukung speech recognition, gunakan tombol 🔊 dan ulangi dengan suara sendiri.</div>
      </div>
    `;
  }

  if (type === "remember") {
    const options = shuffle([
      word.meaning,
      ...item.words.filter((_, index) => index !== state.activeWord).map((x) => x.meaning)
    ]).slice(0, 4);

    return `
      <div>
        <span class="eyebrow">STEP 4 · REMEMBER IT</span>
        <div class="quiz-title">What does <b>${escapeHTML(word.word)}</b> mean?</div>
        <div class="options">
          ${options.map((option) => `
            <button type="button" class="option" data-answer="${escapeAttr(option)}">${escapeHTML(option)}</button>
          `).join("")}
        </div>
        <div id="quizFeedback" class="feedback"></div>
      </div>
    `;
  }

  if (type === "use") {
    const options = shuffle([
      word.word,
      ...item.words.filter((_, index) => index !== state.activeWord).map((x) => x.word)
    ]).slice(0, 4);

    return `
      <div class="spelling">
        <span class="eyebrow">STEP 5 · USE IT</span>
        <div class="quiz-title">Lengkapi kalimat</div>
        <div class="sentence">I can use the word <span class="blank" id="sentenceBlank">_____</span>.</div>
        <div class="sentence-options">
          ${options.map((option) => `
            <button type="button" class="sentence-option" data-sentence="${escapeAttr(option)}">${escapeHTML(option)}</button>
          `).join("")}
        </div>
        <div id="useFeedback" class="feedback"></div>
      </div>
    `;
  }

  return `
    <div class="play-card">
      <span class="eyebrow">STEP 6 · PLAY IT</span>
      <div class="play-emoji">🎮</div>
      <h3 class="quiz-title">Spell the word you hear!</h3>
      <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Play sound</button>
      <div class="spelling">
        <input id="spellInput" class="spell-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type the word...">
        <button type="button" id="spellCheck" class="check-btn">Check ✓</button>
      </div>
      <div id="spellFeedback" class="feedback"></div>
    </div>
  `;
}

function bindStep() {
  document.querySelectorAll("[data-speak]").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.speak));
  });

  if (STEPS[state.step] === "say") {
    $("micButton").addEventListener("click", startSpeech);
  }

  if (STEPS[state.step] === "remember") {
    document.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => checkMeaning(button));
    });
  }

  if (STEPS[state.step] === "use") {
    document.querySelectorAll(".sentence-option").forEach((button) => {
      button.addEventListener("click", () => checkUse(button));
    });
  }

  if (STEPS[state.step] === "play") {
    $("spellCheck").addEventListener("click", checkSpelling);
    $("spellInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") checkSpelling();
    });
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Browser ini belum mendukung suara.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.78;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function startSpeech() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const result = $("sayResult");

  if (!Recognition) {
    result.textContent = "Speech recognition belum didukung browser ini. Gunakan 🔊 lalu ulangi sendiri.";
    return;
  }

  const target = currentLesson().words[state.activeWord];
  const button = $("micButton");
  const recognition = new Recognition();

  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  button.classList.add("listening");
  result.textContent = "Mendengarkan...";

  recognition.onresult = (event) => {
    const heard = event.results[0][0].transcript.toLowerCase().trim();
    const expected = target.word.toLowerCase();
    const correct = heard === expected || heard.includes(expected);

    if (correct) {
      result.textContent = `🎉 Bagus! Terdengar: "${heard}"`;
      award(target, 2);
      setTimeout(nextWordOrStep, 700);
    } else {
      result.textContent = `Coba lagi. Terdengar: "${heard}"`;
    }
  };

  recognition.onerror = () => {
    result.textContent = "Suara belum terbaca. Coba lagi dengan lebih jelas.";
  };

  recognition.onend = () => button.classList.remove("listening");

  try {
    recognition.start();
  } catch (_) {
    button.classList.remove("listening");
    result.textContent = "Mikrofon sedang digunakan. Coba lagi.";
  }
}

function checkMeaning(button) {
  const item = currentLesson();
  const target = item.words[state.activeWord];

  document.querySelectorAll(".option").forEach((x) => (x.disabled = true));

  if (button.dataset.answer === target.meaning) {
    button.classList.add("correct");
    $("quizFeedback").textContent = "🎉 Benar! Hebat!";
    award(target, 1);
  } else {
    button.classList.add("wrong");
    document.querySelectorAll(".option").forEach((x) => {
      if (x.dataset.answer === target.meaning) x.classList.add("correct");
    });
    $("quizFeedback").textContent = `Belum tepat. Jawaban: ${target.meaning}`;
  }

  setTimeout(nextWordOrStep, 800);
}

function checkUse(button) {
  const item = currentLesson();
  const target = item.words[state.activeWord];

  $("sentenceBlank").textContent = button.dataset.sentence;
  document.querySelectorAll(".sentence-option").forEach((x) => (x.disabled = true));

  if (button.dataset.sentence === target.word) {
    button.classList.add("selected");
    $("useFeedback").textContent = "🎯 Tepat!";
    award(target, 1);
  } else {
    document.querySelectorAll(".sentence-option").forEach((x) => {
      if (x.dataset.sentence === target.word) x.classList.add("selected");
    });
    $("useFeedback").textContent = `Belum tepat. Jawaban: ${target.word}`;
  }

  setTimeout(nextWordOrStep, 800);
}

function checkSpelling() {
  const item = currentLesson();
  const target = item.words[state.activeWord];
  const input = $("spellInput");
  const value = input.value.trim().toLowerCase();

  if (!value) return;

  if (value === target.word.toLowerCase()) {
    input.disabled = true;
    $("spellFeedback").innerHTML = '<span class="result-badge">🎉 Benar! +2 XP</span>';
    award(target, 2);
    setTimeout(nextWordOrStep, 700);
  } else {
    $("spellFeedback").textContent = "Belum tepat. Dengarkan lagi dan coba sekali lagi.";
    input.focus();
  }
}

function nextWordOrStep() {
  const item = currentLesson();

  if (state.activeWord < item.words.length - 1) {
    state.activeWord += 1;
    renderEngine();
    return;
  }

  state.activeWord = 0;
  state.step += 1;

  if (state.step >= STEPS.length) {
    completeLesson();
    return;
  }

  renderEngine();
}

function award(word, points) {
  const key = word.id;
  state.learned[key] = Math.min(3, (state.learned[key] || 0) + 1);
  state.xp += points;
  saveState();
  updateStats();
  $("engineXp").textContent = state.xp;
}

function completeLesson() {
  const item = currentLesson();
  state.completedLessons[`${item.week}-${item.day}`] = true;
  state.xp += 10;
  updateStreak();
  saveState();
  updateStats();

  $("engineContent").innerHTML = `
    <div class="complete-card">
      <div class="big">🏆</div>
      <h3>Great job, Maryam!</h3>
      <p>Week ${item.week} · Day ${item.day} selesai.<br>Bonus <b>+10 XP</b>.</p>
      <button type="button" id="completeClose" class="primary">Kembali ke Beranda</button>
    </div>
  `;

  $("prevStep").disabled = true;
  $("nextStep").disabled = true;
  $("stepCounter").textContent = "Selesai";
  document.querySelectorAll(".step").forEach((button) => button.classList.add("done"));
  $("completeClose").addEventListener("click", closeEngine);
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastStudy === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  state.streak = state.lastStudy === yesterdayKey ? state.streak + 1 : 1;
  state.lastStudy = today;
}

function setupEvents() {
  $("lessonButton").addEventListener("click", openEngine);
  $("continueButton").addEventListener("click", openEngine);
  $("closeModal").addEventListener("click", closeEngine);
  document.querySelector(".modal-overlay").addEventListener("click", closeEngine);

  $("prevStep").addEventListener("click", () => {
    if (state.step > 0) {
      state.step -= 1;
      state.activeWord = 0;
      renderEngine();
    }
  });

  $("nextStep").addEventListener("click", () => {
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      state.activeWord = 0;
      renderEngine();
    } else {
      completeLesson();
    }
  });

  document.querySelectorAll(".step").forEach((button, index) => {
    button.addEventListener("click", () => {
      state.step = index;
      state.activeWord = 0;
      renderEngine();
    });
  });
}

function showDataError() {
  $("wordPreview").innerHTML = '<div class="support-note">Materi belum berhasil dimuat. Silakan refresh halaman.</div>';
  $("lessonButton").disabled = true;
  $("continueButton").disabled = true;
  $("weeksGrid").innerHTML = '<div class="support-note">Database vocabulary belum tersedia.</div>';
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}
