const TOTAL_WORDS = 1040;
const STEPS = ["see", "hear", "say", "remember", "use", "play"];

let vocabulary = [];
let state = {
  week: 1, day: 1, step: 0, activeWord: 0,
  xp: 0, streak: 0, lastStudy: null,
  learned: {}, completedLessons: {}, completedReviews: {}
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  loadState();
  try {
    const response = await fetch("data/vocabulary.json?v=10", { cache: "no-store" });
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
    navigator.serviceWorker.register("sw.js?v=10").catch(() => {});
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("maryamEnglishEngine") || "{}");
    state = {
      ...state, ...saved,
      learned: saved.learned || {},
      completedLessons: saved.completedLessons || {},
      completedReviews: saved.completedReviews || {}
    };
  } catch (_) {}
}
function saveState() { localStorage.setItem("maryamEnglishEngine", JSON.stringify(state)); }

function lesson(week, day) {
  return vocabulary.find(x => x.week === week && x.day === day) || null;
}
function weekWords(week) {
  return vocabulary.filter(x => x.week === week).flatMap(x => x.words);
}
function currentLesson() { return lesson(state.week, state.day); }

function renderHome() {
  renderWeeks();
  renderCurrentLesson();
  updateStats();
}

function renderWeeks() {
  const grid = $("weeksGrid");
  grid.innerHTML = "";
  for (let week = 1; week <= 52; week++) {
    const items = vocabulary.filter(x => x.week === week);
    const topics = [...new Set(items.map(x => x.topic))];
    const completed = items.filter(x => state.completedLessons[`${x.week}-${x.day}`]).length;
    const reviewDone = !!state.completedReviews[week];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-card";
    button.innerHTML = `
      <div class="week-number">WEEK ${week}</div>
      <div class="week-title">${escapeHTML(topics[0] || "Materi")}</div>
      <div class="week-info">${items.length ? `${completed}/4 lesson${reviewDone ? " · Review ✓" : ""}` : "Belum tersedia"}</div>
    `;
    button.addEventListener("click", () => openDaySelector(week));
    grid.appendChild(button);
  }
}

function renderCurrentLesson() {
  const item = currentLesson();
  $("currentLessonTitle").textContent = item
    ? `Week ${state.week} · Day ${state.day}`
    : `Week ${state.week} · Day ${state.day}`;
  $("currentLessonTopic").textContent = item ? item.topic : "Weekly Review";
  $("dayBadge").textContent = `DAY ${state.day}`;

  if (item) {
    $("wordPreview").innerHTML = item.words
      .map(w => `<div class="word-chip">${escapeHTML(w.word)}</div>`).join("");
  } else {
    const words = weekWords(state.week);
    $("wordPreview").innerHTML = words.slice(0, 20)
      .map(w => `<div class="word-chip">${escapeHTML(w.word)}</div>`).join("");
  }
}

function updateStats() {
  const learnedCount = Object.values(state.learned).filter(v => v >= 1).length;
  const masteredCount = Object.values(state.learned).filter(v => v >= 3).length;
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

function openWeek(week) { openDaySelector(week); }

function openDaySelector(week) {
  const items = vocabulary.filter(x => x.week === week);
  if (!items.length) return;

  const topic = items[0].topic || "Materi";
  $("selectorWeekLabel").textContent = `WEEK ${week}`;
  $("selectorWeekTitle").textContent = topic;
  $("dayList").innerHTML = "";

  for (let day = 1; day <= 5; day++) {
    const item = lesson(week, day);
    const done = day === 5
      ? !!state.completedReviews[week]
      : !!state.completedLessons[`${week}-${day}`];

    let title, subtitle;
    if (day === 5) {
      title = "Weekly Review";
      subtitle = `Ulangi ${weekWords(week).length} kata dari Week ${week}`;
    } else {
      title = item ? item.topic : `Day ${day}`;
      subtitle = item ? "5 kata baru · See → Hear → Say → Remember → Use → Play" : "Materi belum tersedia";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-choice${done ? " completed" : ""}${day === 5 ? " review" : ""}`;
    button.innerHTML = `
      <div class="day-number">${done ? "✓" : day}</div>
      <div class="day-main">
        <strong>Day ${day} · ${escapeHTML(title)}</strong>
        <span>${escapeHTML(subtitle)}</span>
      </div>
      <div class="day-arrow">→</div>
    `;
    button.disabled = !item && day !== 5;
    button.addEventListener("click", () => {
      closeDaySelector();
      state.week = week;
      state.day = day;
      saveState();
      renderCurrentLesson();
      openEngine();
    });
    $("dayList").appendChild(button);
  }

  $("dayModal").classList.remove("hidden");
  $("dayModal").setAttribute("aria-hidden", "false");
}

function closeDaySelector() {
  $("dayModal").classList.add("hidden");
  $("dayModal").setAttribute("aria-hidden", "true");
}

function openEngine() {
  const item = currentLesson();
  const review = state.day === 5;
  if (!review && !item) return;

  state.step = 0;
  state.activeWord = 0;
  $("engineWeekDay").textContent = `WEEK ${state.week} · DAY ${state.day}`;
  $("engineTitle").textContent = review ? "Weekly Review" : item.topic;
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

function reviewItems(week) {
  const words = weekWords(week);
  return [{
    week,
    day: 5,
    topic: "Weekly Review",
    words: words.map((w, i) => ({ ...w, reviewIndex: i }))
  }];
}

function reviewWordsForEngine() {
  // Five randomly selected words per review step keep the review manageable.
  return shuffle(weekWords(state.week)).slice(0, 5);
}

function getEngineItem() {
  if (state.day === 5) {
    return {
      week: state.week, day: 5, topic: "Weekly Review",
      words: state.reviewSessionWords || reviewWordsForEngine()
    };
  }
  return currentLesson();
}

function renderEngine() {
  const item = getEngineItem();
  if (!item) return;

  if (state.day === 5 && (!state.reviewSessionWords || state.reviewSessionWords.length !== 5)) {
    state.reviewSessionWords = item.words;
    saveState();
  }

  $("engineXp").textContent = state.xp;
  $("stepCounter").textContent = `${state.step + 1} / ${STEPS.length}`;
  document.querySelectorAll(".step").forEach((button, index) => {
    button.classList.toggle("active", index === state.step);
    button.classList.toggle("done", index < state.step);
  });
  $("prevStep").disabled = state.step === 0;
  $("nextStep").disabled = false;
  $("nextStep").textContent = state.step === STEPS.length - 1 ? "Selesai ✓" : "Lanjut →";
  $("engineContent").innerHTML = buildStep(STEPS[state.step], item);
  bindStep();
}

function buildStep(type, item) {
  if (type === "see") {
    return `
      <div><span class="eyebrow">STEP 1 · SEE IT</span>
      <h3 class="quiz-title">${item.day === 5 ? "Review 5 kata minggu ini 👀" : "Kenali 5 kata hari ini 👀"}</h3>
      <div class="word-grid">${item.words.map(w => `
        <article class="learning-word">
          ${w.image ? `<div class="word-image-wrap"><img class="word-image" src="${escapeAttr(w.image)}" alt="${escapeAttr(w.word)}" loading="lazy"></div>` : ""}
          <div class="word">${escapeHTML(w.word)}</div>
          <div class="meaning">${escapeHTML(w.meaning)}</div>
          <div class="sound-row">
            <button type="button" class="sound-btn" data-speak="${escapeAttr(w.word)}">🔊 Dengarkan</button>
            <span class="tiny">${escapeHTML(w.pronunciation || "")}</span>
          </div>
        </article>`).join("")}</div></div>`;
  }

  if (type === "hear") {
    return `
      <div><span class="eyebrow">STEP 2 · HEAR IT</span>
      <h3 class="quiz-title">Dengarkan dan ulangi 🔊</h3>
      <div class="hear-list">${item.words.map(w => `
        <div class="hear-card"><div class="hear-word-wrap">${w.image ? `<img class="hear-image" src="${escapeAttr(w.image)}" alt="">` : ""}<div><strong>${escapeHTML(w.word)}</strong><div class="tiny">${escapeHTML(w.meaning)}</div></div></div>
        <button type="button" class="sound-btn" data-speak="${escapeAttr(w.word)}">🔊 Listen</button></div>`).join("")}</div>
      <div class="support-note">Dengarkan 2–3 kali, lalu ucapkan sendiri.</div></div>`;
  }

  const word = item.words[state.activeWord];

  if (type === "say") {
    return `
      <div class="say-card"><span class="eyebrow">STEP 3 · SAY IT</span>
      <div class="tiny">Kata ${state.activeWord + 1} dari ${item.words.length}</div>
      <div class="say-word">${escapeHTML(word.word)}</div>
      <div class="tiny">${escapeHTML(word.meaning)} · ${escapeHTML(word.pronunciation || "")}</div>
      <div style="margin:18px 0"><button type="button" id="micButton" class="mic-button">🎤</button></div>
      <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Dengarkan</button>
      <div id="sayResult" class="say-result">Tekan mikrofon lalu ucapkan kata tersebut.</div>
      <div class="support-note">Jika browser tidak mendukung speech recognition, gunakan tombol 🔊.</div></div>`;
  }

  if (type === "remember") {
    const options = shuffle([
      word.meaning,
      ...item.words.filter((_, i) => i !== state.activeWord).map(w => w.meaning)
    ]).slice(0, 4);
    return `
      <div><span class="eyebrow">STEP 4 · REMEMBER IT</span>
      <div class="quiz-title">What does <b>${escapeHTML(word.word)}</b> mean?</div>
      <div class="options">${options.map(o => `
        <button type="button" class="option" data-answer="${escapeAttr(o)}">${escapeHTML(o)}</button>`).join("")}</div>
      <div id="quizFeedback" class="feedback"></div></div>`;
  }

  if (type === "use") {
    const options = shuffle([
      word.word,
      ...item.words.filter((_, i) => i !== state.activeWord).map(w => w.word)
    ]).slice(0, 4);
    return `
      <div class="spelling"><span class="eyebrow">STEP 5 · USE IT</span>
      <div class="quiz-title">Lengkapi kalimat</div>
      <div class="sentence">I can use the word <span class="blank" id="sentenceBlank">_____</span>.</div>
      <div class="sentence-options">${options.map(o => `
        <button type="button" class="sentence-option" data-sentence="${escapeAttr(o)}">${escapeHTML(o)}</button>`).join("")}</div>
      <div id="useFeedback" class="feedback"></div></div>`;
  }

  return `
    <div class="play-card"><span class="eyebrow">STEP 6 · PLAY IT</span>
    <div class="play-emoji">🎮</div><h3 class="quiz-title">Spell the word you hear!</h3>
    <button type="button" class="sound-btn" data-speak="${escapeAttr(word.word)}">🔊 Play sound</button>
    <div class="spelling"><input id="spellInput" class="spell-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type the word...">
    <button type="button" id="spellCheck" class="check-btn">Check ✓</button></div>
    <div id="spellFeedback" class="feedback"></div></div>`;
}

function bindStep() {
  document.querySelectorAll("[data-speak]").forEach(b => b.addEventListener("click", () => speak(b.dataset.speak)));
  if (STEPS[state.step] === "say") $("micButton").addEventListener("click", startSpeech);
  if (STEPS[state.step] === "remember") document.querySelectorAll(".option").forEach(b => b.addEventListener("click", () => checkMeaning(b)));
  if (STEPS[state.step] === "use") document.querySelectorAll(".sentence-option").forEach(b => b.addEventListener("click", () => checkUse(b)));
  if (STEPS[state.step] === "play") {
    $("spellCheck").addEventListener("click", checkSpelling);
    $("spellInput").addEventListener("keydown", e => { if (e.key === "Enter") checkSpelling(); });
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) { alert("Browser ini belum mendukung suara."); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.78; u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function startSpeech() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const result = $("sayResult");
  if (!Recognition) {
    result.textContent = "Speech recognition belum didukung browser ini. Gunakan 🔊 lalu ulangi sendiri.";
    return;
  }
  const target = getEngineItem().words[state.activeWord];
  const button = $("micButton");
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  button.classList.add("listening");
  result.textContent = "Mendengarkan...";
  recognition.onresult = event => {
    const heard = event.results[0][0].transcript.toLowerCase().trim();
    const expected = target.word.toLowerCase();
    if (heard === expected || heard.includes(expected)) {
      result.textContent = `🎉 Bagus! Terdengar: "${heard}"`;
      award(target, 2);
      setTimeout(nextWordOrStep, 700);
    } else {
      result.textContent = `Coba lagi. Terdengar: "${heard}"`;
    }
  };
  recognition.onerror = () => { result.textContent = "Suara belum terbaca. Coba lagi dengan lebih jelas."; };
  recognition.onend = () => button.classList.remove("listening");
  try { recognition.start(); } catch (_) {
    button.classList.remove("listening");
    result.textContent = "Mikrofon sedang digunakan. Coba lagi.";
  }
}

function checkMeaning(button) {
  const item = getEngineItem(), target = item.words[state.activeWord];
  document.querySelectorAll(".option").forEach(x => x.disabled = true);
  if (button.dataset.answer === target.meaning) {
    button.classList.add("correct");
    $("quizFeedback").textContent = "🎉 Benar! Hebat!";
    award(target, 1);
  } else {
    button.classList.add("wrong");
    document.querySelectorAll(".option").forEach(x => { if (x.dataset.answer === target.meaning) x.classList.add("correct"); });
    $("quizFeedback").textContent = `Belum tepat. Jawaban: ${target.meaning}`;
  }
  setTimeout(nextWordOrStep, 800);
}

function checkUse(button) {
  const item = getEngineItem(), target = item.words[state.activeWord];
  $("sentenceBlank").textContent = button.dataset.sentence;
  document.querySelectorAll(".sentence-option").forEach(x => x.disabled = true);
  if (button.dataset.sentence === target.word) {
    button.classList.add("selected");
    $("useFeedback").textContent = "🎯 Tepat!";
    award(target, 1);
  } else {
    document.querySelectorAll(".sentence-option").forEach(x => { if (x.dataset.sentence === target.word) x.classList.add("selected"); });
    $("useFeedback").textContent = `Belum tepat. Jawaban: ${target.word}`;
  }
  setTimeout(nextWordOrStep, 800);
}

function checkSpelling() {
  const item = getEngineItem(), target = item.words[state.activeWord];
  const input = $("spellInput"), value = input.value.trim().toLowerCase();
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
  const item = getEngineItem();
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
  state.learned[word.id] = Math.min(3, (state.learned[word.id] || 0) + 1);
  state.xp += points;
  saveState();
  updateStats();
  $("engineXp").textContent = state.xp;
}

function completeLesson() {
  const item = getEngineItem();
  if (state.day === 5) {
    state.completedReviews[state.week] = true;
    state.xp += 10;
    updateStreak();
    saveState();
    updateStats();
    showCompletion("Weekly Review selesai!", `Week ${state.week} berhasil direview.`, "Kembali ke Pilihan Materi");
  } else {
    state.completedLessons[`${item.week}-${item.day}`] = true;
    state.xp += 10;
    updateStreak();
    saveState();
    updateStats();
    showCompletion("Great job, Maryam!", `Week ${item.week} · Day ${item.day} selesai.`, "Kembali ke Pilihan Materi");
  }
}

function showCompletion(title, text, buttonText) {
  $("engineContent").innerHTML = `
    <div class="complete-card"><div class="big">🏆</div><h3>${escapeHTML(title)}</h3>
    <p>${escapeHTML(text)}<br>Bonus <b>+10 XP</b>.</p>
    <button type="button" id="completeClose" class="primary">${escapeHTML(buttonText)}</button></div>`;
  $("prevStep").disabled = true;
  $("nextStep").disabled = true;
  $("stepCounter").textContent = "Selesai";
  document.querySelectorAll(".step").forEach(b => b.classList.add("done"));
  $("completeClose").addEventListener("click", closeEngine);
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastStudy === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = yesterday.toISOString().slice(0, 10);
  state.streak = state.lastStudy === key ? state.streak + 1 : 1;
  state.lastStudy = today;
}

function setupEvents() {
  // Use event delegation for the Learning Engine controls.
  // This prevents buttons from losing their handlers when engineContent is re-rendered.
  document.addEventListener("click", (event) => {
    const stepButton = event.target.closest("#stepper .step");
    if (stepButton) {
      event.preventDefault();
      event.stopPropagation();
      const index = [...document.querySelectorAll("#stepper .step")].indexOf(stepButton);
      if (index >= 0) {
        state.step = index;
        state.activeWord = 0;
        renderEngine();
      }
      return;
    }

    if (event.target.closest("#nextStep")) {
      event.preventDefault();
      event.stopPropagation();
      if (state.step < STEPS.length - 1) {
        state.step += 1;
        state.activeWord = 0;
        renderEngine();
      } else {
        completeLesson();
      }
      return;
    }

    if (event.target.closest("#prevStep")) {
      event.preventDefault();
      event.stopPropagation();
      if (state.step > 0) {
        state.step -= 1;
        state.activeWord = 0;
        renderEngine();
      }
      return;
    }

    if (event.target.closest("#lessonButton")) {
      event.preventDefault();
      openDaySelector(state.week);
      return;
    }

    if (event.target.closest("#continueButton")) {
      event.preventDefault();
      openDaySelector(state.week);
      return;
    }

    if (event.target.closest("#closeModal")) {
      event.preventDefault();
      closeEngine();
      return;
    }

    if (event.target.closest("#closeDayModal")) {
      event.preventDefault();
      closeDaySelector();
      return;
    }

    if (event.target.closest("#dayModal .day-overlay")) {
      closeDaySelector();
      return;
    }

    if (event.target.closest("#lessonModal .modal-overlay")) {
      closeEngine();
      return;
    }
  });
}

function showDataError() {
  $("wordPreview").innerHTML = '<div class="support-note">Database vocabulary gagal dimuat. Silakan refresh halaman.</div>';
  $("lessonButton").disabled = true;
  $("continueButton").disabled = true;
  $("weeksGrid").innerHTML = '<div class="support-note">Database vocabulary belum tersedia.</div>';
}

function shuffle(array) { return [...array].sort(() => Math.random() - 0.5); }
function escapeHTML(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(value) { return escapeHTML(value); }
