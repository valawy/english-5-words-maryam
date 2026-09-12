let vocabulary=[];let state={week:1,day:1,learned:[]};let deferredPrompt;
const $=id=>document.getElementById(id);
async function load(){try{const r=await fetch("data/vocabulary.json");if(!r.ok)throw Error("Data error");vocabulary=await r.json();loadProgress();renderWeeks();renderLesson();updateProgress();events()}catch(e){console.error(e);$("wordPreview").innerHTML="<p>Data belum dapat dimuat.</p>"}}
function lesson(w,d){return vocabulary.find(x=>x.week===w&&x.day===d)}
function renderWeeks(){const grid=$("weeksGrid");grid.innerHTML="";for(let w=1;w<=52;w++){const items=vocabulary.filter(x=>x.week===w),topics=[...new Set(items.map(x=>x.topic))];const b=document.createElement("button");b.className="week-card";b.innerHTML=`<div class="week-number">WEEK ${w}</div><div class="week-title">${topics[0]||"Coming Soon"}</div><div class="week-info">${items.length?items.length+" lesson":"Belum dibuka"}</div>`;b.onclick=()=>openWeek(w);grid.appendChild(b)}}
function renderLesson(){const x=lesson(state.week,state.day);$("currentLessonTitle").textContent=`Week ${state.week} · Day ${state.day}`;$("currentLessonTopic").textContent=x?x.topic:"Materi akan segera tersedia.";$("wordPreview").innerHTML=x?x.words.map(y=>`<div class="word-chip">${y.word}</div>`).join(""):'<div class="word-chip">Coming Soon</div>'}
function openWeek(w){
  const x=lesson(w,1)||vocabulary.find(y=>y.week===w);
  if(!x){alert(`Week ${w} belum memiliki materi.`);return}
  state.week=w; state.day=x.day; renderLesson(); openLesson();
}
function openLesson(){const x=lesson(state.week,state.day);if(!x)return; $("modalWeek").textContent=`WEEK ${x.week} · DAY ${x.day}`;$("modalTitle").textContent=x.topic;$("lessonWords").innerHTML=x.words.map(y=>`<div class="lesson-word"><div><strong>${y.word}</strong><small>${y.meaning} · ${y.pronunciation}</small><small>${y.example}</small></div><button class="speak" data-word="${y.word}">🔊</button></div>`).join("");document.querySelectorAll(".speak").forEach(b=>b.onclick=()=>speak(b.dataset.word));$("lessonModal").classList.remove("hidden")}
function closeLesson(){$("lessonModal").classList.add("hidden")}
function speak(text){if(!("speechSynthesis"in window)){alert("Browser tidak mendukung pronunciation.");return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.78;speechSynthesis.speak(u)}
function loadProgress(){try{let x=JSON.parse(localStorage.getItem("maryamEnglishProgress")||"{}");state.learned=x.learned||[]}catch{}}
function saveProgress(){localStorage.setItem("maryamEnglishProgress",JSON.stringify({learned:state.learned}))}
function updateProgress(){let p=Math.round(state.learned.length/1040*100);$("progressPercent").textContent=p+"%";$("progressBar").style.width=p+"%";$("wordsLearned").textContent=state.learned.length+" kata dipelajari"}
function events(){$("lessonButton").onclick=openLesson;$("continueButton").onclick=openLesson;$("closeModal").onclick=closeLesson;document.querySelector(".modal-overlay").onclick=closeLesson}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installButton").classList.remove("hidden");$("installButton").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installButton").classList.add("hidden")}})
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
load();
