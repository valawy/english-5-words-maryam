const TOTAL_WORDS=1040;
let vocabulary=[];
let state={
  week:1,day:1,step:0,activeWord:0,
  xp:0,streak:0,lastStudy:null,
  learned:{},completedLessons:{}
};
const STEPS=["see","hear","say","remember","use","play"];
const $=id=>document.getElementById(id);

async function load(){
  try{
    const r=await fetch("data/vocabulary.json?v=3",{cache:"no-store"});
    if(!r.ok)throw Error("Data error");
    vocabulary=await r.json();
    loadState(); renderHome(); setupEvents();
  }catch(e){console.error(e); alert("Data pembelajaran gagal dimuat.");}
}
function loadState(){
  try{
    const x=JSON.parse(localStorage.getItem("maryamEnglishEngine")||"{}");
    state={...state,...x,learned:x.learned||{},completedLessons:x.completedLessons||{}};
  }catch(e){console.warn("Progress reset");}
}
function saveState(){localStorage.setItem("maryamEnglishEngine",JSON.stringify(state))}
function lesson(w,d){return vocabulary.find(x=>x.week===w&&x.day===d)}
function wordKey(x){return x.id}
function current(){return lesson(state.week,state.day)}
function renderHome(){
  renderWeeks();renderCurrent();updateStats();
}
function renderWeeks(){
  const grid=$("weeksGrid");grid.innerHTML="";
  for(let w=1;w<=52;w++){
    const items=vocabulary.filter(x=>x.week===w);
    const topics=[...new Set(items.map(x=>x.topic))];
    const done=items.filter(x=>state.completedLessons[`${x.week}-${x.day}`]).length;
    const b=document.createElement("button");b.className="week-card";
    b.innerHTML=`<div class="week-number">WEEK ${w}</div><div class="week-title">${topics[0]||"Coming Soon"}</div><div class="week-info">${items.length?`${done}/4 lesson selesai`:"Belum tersedia"}</div>`;
    b.onclick=()=>openWeek(w);grid.appendChild(b);
  }
}
function renderCurrent(){
  const x=current();
  $("currentLessonTitle").textContent=`Week ${state.week} · Day ${state.day}`;
  $("currentLessonTopic").textContent=x?x.topic:"Materi tidak tersedia";
  $("dayBadge").textContent=`DAY ${state.day}`;
  $("wordPreview").innerHTML=x?x.words.map(y=>`<div class="word-chip">${y.word}</div>`).join(""):"";
}
function updateStats(){
  const learned=Object.keys(state.learned).filter(k=>state.learned[k]>=1).length;
  const mastered=Object.keys(state.learned).filter(k=>state.learned[k]>=3).length;
  const pct=Math.round(learned/TOTAL_WORDS*100);
  $("xpValue").textContent=state.xp;
  $("wordsLearned").textContent=learned;
  $("masteredValue").textContent=mastered;
  $("streakValue").textContent=state.streak;
  $("streakMini").textContent=state.streak;
  $("progressPercent").textContent=pct+"%";
  $("progressBar").style.width=pct+"%";
  $("progressLabel").textContent=`${learned.toLocaleString("id-ID")} dari 1.040 kata`;
}
function openWeek(w){
  const x=lesson(w,1);
  if(!x){alert("Materi minggu ini belum tersedia.");return}
  state.week=w;state.day=1;saveState();renderCurrent();openEngine();
}
function openEngine(){
  state.step=0;state.activeWord=0;
  const x=current();if(!x)return;
  $("engineWeekDay").textContent=`WEEK ${x.week} · DAY ${x.day}`;
  $("engineTitle").textContent=x.topic;
  $("lessonModal").classList.remove("hidden");
  $("lessonModal").setAttribute("aria-hidden","false");
  renderEngine();
}
function closeEngine(){
  $("lessonModal").classList.add("hidden");
  $("lessonModal").setAttribute("aria-hidden","true");
  if("speechSynthesis"in window)speechSynthesis.cancel();
  renderHome();
}
function speak(text){
  if(!("speechSynthesis"in window)){alert("Browser ini belum mendukung suara.");return}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="en-US";u.rate=.78;u.pitch=1;
  speechSynthesis.speak(u);
}
function renderEngine(){
  const x=current();if(!x)return;
  $("engineXp").textContent=state.xp;
  $("stepCounter").textContent=`${state.step+1} / ${STEPS.length}`;
  document.querySelectorAll(".step").forEach((b,i)=>{
    b.classList.toggle("active",i===state.step);
    b.classList.toggle("done",i<state.step);
  });
  $("prevStep").disabled=state.step===0;
  $("nextStep").textContent=state.step===STEPS.length-1?"Selesai ✓":"Lanjut →";
  $("engineContent").innerHTML=stepHTML(STEPS[state.step],x);
  bindStep();
}
function stepHTML(type,x){
  if(type==="see")return `
    <div><span class="eyebrow">STEP 1 · SEE IT</span><h3 class="quiz-title">Kenali 5 kata hari ini 👀</h3>
    <div class="word-grid">${x.words.map((w,i)=>`
      <article class="learning-word"><div class="word">${w.word}</div><div class="meaning">${w.meaning}</div>
      <div class="sound-row"><button class="sound-btn" data-speak="${esc(w.word)}">🔊 Dengarkan</button><span class="tiny">${w.pronunciation}</span></div></article>`).join("")}</div></div>`;
  if(type==="hear")return `
    <div><span class="eyebrow">STEP 2 · HEAR IT</span><h3 class="quiz-title">Dengarkan dan ulangi 🔊</h3>
    <div class="hear-list">${x.words.map((w,i)=>`<div class="hear-card"><div><strong>${w.word}</strong><div class="tiny">${w.meaning}</div></div><button class="sound-btn" data-speak="${esc(w.word)}">🔊 Listen</button></div>`).join("")}</div>
    <div class="support-note">Tip: dengarkan 2–3 kali, lalu coba ucapkan sendiri sebelum lanjut.</div></div>`;
  if(type==="say"){
    const w=x.words[state.activeWord];
    return `<div class="say-card"><span class="eyebrow">STEP 3 · SAY IT</span><div class="tiny">Kata ${state.activeWord+1} dari ${x.words.length}</div>
    <div class="say-word">${w.word}</div><div class="tiny">${w.meaning} · ${w.pronunciation}</div>
    <div style="margin:18px 0"><button id="micButton" class="mic-button">🎤</button></div>
    <button class="sound-btn" data-speak="${esc(w.word)}">🔊 Dengarkan contoh</button>
    <div id="sayResult" class="say-result">Tekan mikrofon, lalu ucapkan kata tersebut.</div>
    <div class="support-note">Jika browser tidak mendukung pengenalan suara, Maryam tetap bisa berlatih dengan mendengarkan dan mengulanginya.</div></div>`;
  if(type==="remember"){
    const w=x.words[state.activeWord];
    const opts=shuffle([w.meaning,...x.words.filter((_,i)=>i!==state.activeWord).map(y=>y.meaning)]).slice(0,4);
    return `<div><span class="eyebrow">STEP 4 · REMEMBER IT</span><div class="quiz-title">What does <b>${w.word}</b> mean?</div>
    <div class="options">${opts.map(o=>`<button class="option" data-answer="${esc(o)}">${o}</button>`).join("")}</div><div id="quizFeedback" class="feedback"></div></div>`;
  }
  if(type==="use"){
    const w=x.words[state.activeWord];
    const opts=shuffle([w.word,...x.words.filter((_,i)=>i!==state.activeWord).map(y=>y.word)]).slice(0,4);
    return `<div class="spelling"><span class="eyebrow">STEP 5 · USE IT</span><div class="quiz-title">Lengkapi kalimat</div>
    <div class="sentence">I can use the word <span class="blank" id="sentenceBlank">_____</span>.</div>
    <div class="sentence-options">${opts.map(o=>`<button class="sentence-option" data-sentence="${esc(o)}">${o}</button>`).join("")}</div>
    <div id="useFeedback" class="feedback"></div></div>`;
  }
  if(type==="play"){
    const w=x.words[state.activeWord];
    return `<div class="play-card"><span class="eyebrow">STEP 6 · PLAY IT</span><div class="play-emoji">🎮</div>
    <h3 class="quiz-title">Spell the word you hear!</h3><button class="sound-btn" data-speak="${esc(w.word)}">🔊 Play sound</button>
    <div class="spelling"><input id="spellInput" class="spell-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type the word..."><button id="spellCheck" class="check-btn">Check ✓</button></div>
    <div id="spellFeedback" class="feedback"></div></div>`;
  }
}
function bindStep(){
  document.querySelectorAll("[data-speak]").forEach(b=>b.onclick=()=>speak(b.dataset.speak));
  if(STEPS[state.step]==="say"){
    $("micButton").onclick=startSpeech;
  }
  if(STEPS[state.step]==="remember"){
    document.querySelectorAll(".option").forEach(b=>b.onclick=()=>checkMeaning(b));
  }
  if(STEPS[state.step]==="use"){
    document.querySelectorAll(".sentence-option").forEach(b=>b.onclick=()=>checkUse(b));
  }
  if(STEPS[state.step]==="play"){
    $("spellCheck").onclick=checkSpelling;
    $("spellInput").addEventListener("keydown",e=>{if(e.key==="Enter")checkSpelling()});
  }
}
function checkMeaning(btn){
  const x=current(),w=x.words[state.activeWord];
  document.querySelectorAll(".option").forEach(b=>b.disabled=true);
  if(btn.dataset.answer===w.meaning){
    btn.classList.add("correct");$("quizFeedback").textContent="🎉 Benar! Hebat!";
    award(w,1);nextWordOrStep();
  }else{
    btn.classList.add("wrong");
    document.querySelectorAll(".option").forEach(b=>{if(b.dataset.answer===w.meaning)b.classList.add("correct")});
    $("quizFeedback").textContent=`Belum tepat. Jawaban: ${w.meaning}`;
    setTimeout(nextWordOrStep,900);
  }
}
function checkUse(btn){
  const x=current(),w=x.words[state.activeWord];
  $("sentenceBlank").textContent=btn.dataset.sentence;
  document.querySelectorAll(".sentence-option").forEach(b=>b.disabled=true);
  if(btn.dataset.sentence===w.word){
    btn.classList.add("selected");$("useFeedback").textContent="🎯 Tepat!";
    award(w,1);nextWordOrStep();
  }else{
    $("useFeedback").textContent=`Coba lagi. Kata yang benar adalah "${w.word}".`;
    document.querySelectorAll(".sentence-option").forEach(b=>{if(b.dataset.sentence===w.word)b.classList.add("selected")});
    setTimeout(nextWordOrStep,900);
  }
}
function checkSpelling(){
  const x=current(),w=x.words[state.activeWord],input=$("spellInput"),val=input.value.trim().toLowerCase();
  if(!val)return;
  if(val===w.word.toLowerCase()){
    input.disabled=true;$("spellFeedback").innerHTML=`<span class="result-badge">🎉 Benar! +2 XP</span>`;
    award(w,2);setTimeout(nextWordOrStep,650);
  }else{
    $("spellFeedback").textContent=`Belum tepat. Dengarkan lagi dan coba sekali lagi.`;
    input.focus();
  }
}
function nextWordOrStep(){
  const x=current();
  if(state.activeWord<x.words.length-1){
    state.activeWord++;renderEngine();
  }else{
    state.activeWord=0;
    state.step++;
    if(state.step>=STEPS.length){completeLesson();return}
    renderEngine();
  }
}
function award(w,points){
  const k=wordKey(w);state.learned[k]=Math.min(3,(state.learned[k]||0)+1);state.xp+=points;saveState();updateStats();
}
function completeLesson(){
  const x=current();state.completedLessons[`${x.week}-${x.day}`]=true;state.xp+=10;
  touchStreak();saveState();
  $("engineContent").innerHTML=`<div class="complete-card"><div class="big">🏆</div><h3>Great job, Maryam!</h3><p>Week ${x.week} · Day ${x.day} selesai.<br>Kamu mendapatkan <b>+10 XP</b>. Besok kita lanjut lagi!</p><button id="completeClose" class="primary">Kembali ke Beranda</button></div>`;
  $("prevStep").disabled=true;$("nextStep").disabled=true;$("stepCounter").textContent="Selesai";
  document.querySelectorAll(".step").forEach(b=>b.classList.add("done"));
  $("completeClose").onclick=closeEngine;
}
function touchStreak(){
  const today=new Date().toISOString().slice(0,10);
  if(state.lastStudy===today)return;
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const y=yesterday.toISOString().slice(0,10);
  state.streak=state.lastStudy===y?state.streak+1:1;state.lastStudy=today;
}
function startSpeech(){
  const btn=$("micButton"),result=$("sayResult"),x=current(),w=x.words[state.activeWord];
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){result.textContent="Pengenalan suara belum didukung browser ini. Gunakan tombol 🔊 lalu ulangi dengan suara sendiri.";return}
  const rec=new Recognition();rec.lang="en-US";rec.interimResults=false;rec.maxAlternatives=3;
  btn.classList.add("listening");result.textContent="Mendengarkan...";
  rec.onresult=e=>{
    const heard=e.results[0][0].transcript.toLowerCase().trim();
    const target=w.word.toLowerCase();
    const ok=heard===target||heard.includes(target);
    result.textContent=ok?`🎉 Bagus! Terdengar: "${heard}"`:`Coba lagi. Terdengar: "${heard}"`;
    if(ok){award(w,2);setTimeout(nextWordOrStep,700)}
  };
  rec.onerror=()=>result.textContent="Suara belum terbaca. Coba lebih dekat dan ucapkan dengan jelas.";
  rec.onend=()=>btn.classList.remove("listening");
  rec.start();
}
function setupEvents(){
  $("lessonButton").onclick=openEngine;
  $("continueButton").onclick=openEngine;
  $("closeModal").onclick=closeEngine;
  document.querySelector(".modal-overlay").onclick=closeEngine;
  $("prevStep").onclick=()=>{if(state.step>0){state.step--;state.activeWord=0;renderEngine()}};
  $("nextStep").onclick=()=>{if(state.step<STEPS.length-1){state.step++;state.activeWord=0;renderEngine()}else completeLesson()};
  document.querySelectorAll(".step").forEach((b,i)=>b.onclick=()=>{state.step=i;state.activeWord=0;renderEngine()});
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installButton").classList.remove("hidden");$("installButton").onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installButton").classList.add("hidden")}});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
load();
