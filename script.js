const state = {
  screen: "home",
  selectedGame: null,
  mode: "friends",
  playerCount: 3,
  players: [],
  currentPlayer: 0,
  round: 0,
  maxRounds: 5,
  sound: true,
  quizQuestions: [],
  quizIndex: 0,
  musicRounds: [],
  musicIndex: 0,
  governorIndex: 0,
  roles: []
};

// ===================== بيانات محلية احتياطية (Fallback) =====================
// تُستخدم هذه القوائم تلقائيًا إذا كان الخادم (Worker) غير مُعد بعد،
// أو إذا تعذّر الاتصال بالإنترنت أو بخدمات Groq / Spotify.

const questionBank = [
  {q:"ما هو أكبر كوكب في المجموعة الشمسية؟",a:["الأرض","المشتري","زحل","المريخ"],c:1},
  {q:"كم عدد ألوان قوس قزح التقليدية؟",a:["5","6","7","8"],c:2},
  {q:"ما هي عاصمة اليابان؟",a:["طوكيو","كيوتو","أوساكا","هيروشيما"],c:0},
  {q:"أي حيوان يُعرف بأنه ملك الغابة؟",a:["النمر","الفيل","الأسد","الذئب"],c:2},
  {q:"كم دقيقة في الساعة؟",a:["50","60","70","100"],c:1},
  {q:"أي محيط هو الأكبر؟",a:["الأطلسي","الهندي","الهادئ","المتجمد"],c:2},
  {q:"ما هو العنصر الذي رمزه O؟",a:["ذهب","أكسجين","حديد","فضة"],c:1},
  {q:"كم عدد أيام السنة العادية؟",a:["360","364","365","366"],c:2},
  {q:"ما اللغة الأكثر انتشارًا من حيث عدد المتحدثين الأصليين؟",a:["العربية","الإنجليزية","الإسبانية","الصينية المندرينية"],c:3},
  {q:"أي دولة تشتهر ببرج إيفل؟",a:["إيطاليا","فرنسا","إسبانيا","بلجيكا"],c:1},
  {q:"ما أسرع حيوان بري؟",a:["الفهد","الحصان","النسر","الأسد"],c:0},
  {q:"كم ضلعًا للمربع؟",a:["3","4","5","6"],c:1}
];

const musicBank = [
  {clue:"أغنية عربية رومانسية مشهورة — صوت نسائي — لحن هادئ",a:["تملي معاك","أنا بعشقك","بالبنط العريض","أما براوة"],c:0},
  {clue:"أغنية حفلات شهيرة — إيقاع سريع — الجميع يعرفها تقريبًا",a:["3 دقات","بشرة خير","سهران","حبيبي يا نور العين"],c:1},
  {clue:"أغنية كلاسيكية عربية — طابع طربي واضح",a:["الأطلال","الغزالة رايقة","شو حلو","حلو المكان"],c:0},
  {clue:"أغنية حديثة — عنوانها مرتبط بالابتسامة والفرح",a:["بالبنط العريض","الغزالة رايقة","ممكن","اختراع"],c:0},
  {clue:"أغنية معروفة جدًا في الوطن العربي وتصلح للغناء الجماعي",a:["نور العين","سيدي وصالك","أماكن السهر","يا بنت السلطان"],c:0}
];

const botNames = ["بوت أبو الهبد","بوت شكاك","بوت أبو ضحكة","بوت سريع","بوت فنان","بوت الزعيم"];

const roleData = [
  {name:"الحاكم 👑",desc:"أنت الحاكم. لديك سلطة القرار في هذه الجولة. لا تكشف دورك."},
  {name:"المفتش 🕵️",desc:"أنت المفتش. حاول اكتشاف السارق والجلاد من تصرفات اللاعبين."},
  {name:"السارق 🥷",desc:"أنت السارق. مهمتك أن تنجو ولا يتم اكتشافك."},
  {name:"الجلاد ⚔️",desc:"أنت الجلاد. لديك مهمة سرية، ولا يعرفها الآخرون."}
];

// ===================== تصنيفات API =====================
// هبد الأسئلة: تصنيفات تُرسل إلى Groq لتوليد أسئلة عربية جديدة.
const quizCategories = [
  {id:"عام", label:"🧩 عام"},
  {id:"رياضة", label:"⚽ رياضة"},
  {id:"تاريخ", label:"📜 تاريخ"},
  {id:"علوم", label:"🔬 علوم"},
  {id:"جغرافيا", label:"🌍 جغرافيا"},
  {id:"ترفيه وأفلام", label:"🎬 ترفيه وأفلام"}
];

// خمن الأغنية: أنواع موسيقية تُستخدم للبحث عبر Spotify (المعرّف id يجب أن يطابق GENRE_QUERIES في worker.js).
const musicGenres = [
  {id:"arabic-pop", label:"🎤 عربي"},
  {id:"khaleeji", label:"🪘 خليجي"},
  {id:"egyptian", label:"🇪🇬 مصري"},
  {id:"english-pop", label:"🌍 أجنبي"},
  {id:"hiphop", label:"🎧 راب"},
  {id:"tarab", label:"🎻 طرب كلاسيكي"}
];

function $(id){return document.getElementById(id)}
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $(id).classList.add("active");
  state.screen=id;
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg){
  $("toast").textContent=msg;
  $("toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2600);
}
function toggleSound(){
  state.sound=!state.sound;
  $("soundBtn").textContent=state.sound?"🔊":"🔇";
}
function beep(type="click"){
  if(!state.sound)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.value=type==="good"?650:type==="bad"?180:400;
    g.gain.value=.035;o.connect(g);g.connect(ctx.destination);o.start();
    setTimeout(()=>{o.stop();ctx.close()},110);
  }catch(e){}
}

// ===================== إعداد اللعبة (Setup) =====================
function openSetup(game){
  state.selectedGame=game;
  const data={
    quiz:["🧠","هبد الأسئلة","أسئلة عامة متنوعة. كل إجابة صحيحة تمنحك نقاطًا."],
    music:["🎵","خمن الأغنية","اقرأ التلميح أو شاهد الغلاف ثم اختر الإجابة الصحيحة."],
    governor:["👑","الحاكم والجلاد","لعبة أدوار سرية. مرر الهاتف بين اللاعبين."]
  }[game];
  $("setupIcon").textContent=data[0];
  $("setupTitle").textContent=data[1];
  $("setupDescription").textContent=data[2];

  setupAiOptions(game);
  renderNames();
  showScreen("setup");
}

function setupAiOptions(game){
  const box=$("aiOptionsBox");
  if(game==="governor"){
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");

  const sel=$("categorySelect");
  sel.innerHTML="";
  const list = game==="quiz" ? quizCategories : musicGenres;
  list.forEach(item=>{
    const opt=document.createElement("option");
    opt.value=item.id;
    opt.textContent=item.label;
    sel.appendChild(opt);
  });

  $("categoryLabel").textContent = game==="quiz" ? "تصنيف الأسئلة" : "نوع الموسيقى";
  $("aiToggleLabel").textContent = game==="quiz"
    ? "توليد أسئلة جديدة بالذكاء الاصطناعي (Groq)"
    : "جلب أغانٍ حقيقية من Spotify";

  const configured=isWorkerConfigured();
  const toggle=$("useAiToggle");
  toggle.disabled=!configured;
  toggle.checked=configured;
  $("aiHint").textContent = configured
    ? ""
    : "لتفعيل هذه الميزة: انشر الخادم (Worker) وضع رابطه في ملف config.js — راجع README.md.";
}

function setMode(mode){
  state.mode=mode;
  $("friendsMode").classList.toggle("active",mode==="friends");
  $("botsMode").classList.toggle("active",mode==="bots");
  renderNames();
}
function changePlayers(delta){
  state.playerCount=Math.max(2,Math.min(8,state.playerCount+delta));
  $("playerCount").textContent=state.playerCount;
  renderNames();
}
function renderNames(){
  $("playerCount").textContent=state.playerCount;
  const box=$("namesBox");box.innerHTML="";
  for(let i=0;i<state.playerCount;i++){
    const input=document.createElement("input");
    input.className="name-input";input.id="name"+i;
    input.placeholder=state.mode==="bots"?(i===0?"اسمك":"سيتم اختيار بوت"):`اسم اللاعب ${i+1}`;
    input.value=i===0?"أنت":(state.mode==="friends"?"":"");
    if(state.mode==="bots"&&i>0) input.value=botNames[i-1]||`بوت ${i}`;
    box.appendChild(input);
  }
}
function buildPlayers(){
  state.players=[];
  for(let i=0;i<state.playerCount;i++){
    const input=$("name"+i);
    let name=input?.value.trim();
    if(!name) name=state.mode==="bots"?(botNames[i-1]||`بوت ${i}`):`لاعب ${i+1}`;
    state.players.push({name,score:0,bot:state.mode==="bots"&&i>0});
  }
}
function launchSelectedGame(){
  buildPlayers();state.round=0;state.currentPlayer=0;state.quizIndex=0;state.musicIndex=0;state.governorIndex=0;
  if(state.selectedGame==="quiz") startQuiz();
  if(state.selectedGame==="music") startMusic();
  if(state.selectedGame==="governor") startGovernor();
}
function startGame(game){openSetup(game)}

function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}

function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),ms))
  ]);
}

// ===================== إعدادات الاتصال بالخادم (Worker) =====================
function isWorkerConfigured(){
  return typeof WORKER_BASE_URL==="string"
    && WORKER_BASE_URL.trim().length>0
    && !WORKER_BASE_URL.includes("YOUR-WORKER-NAME");
}

// ===================== هبد الأسئلة =====================
function isValidQuestion(item){
  return item
    && typeof item.q==="string" && item.q.trim().length>0
    && Array.isArray(item.a) && item.a.length===4 && item.a.every(x=>typeof x==="string" && x.trim().length>0)
    && Number.isInteger(item.c) && item.c>=0 && item.c<4;
}

async function fetchAIQuestions(category,count){
  const res=await fetch(`${WORKER_BASE_URL}/api/quiz`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({category,count})
  });
  if(!res.ok) throw new Error("quiz_api_failed");
  const data=await res.json();
  if(!data||!Array.isArray(data.questions)) throw new Error("bad_shape");
  const valid=data.questions.filter(isValidQuestion);
  if(valid.length===0) throw new Error("empty_questions");
  return valid;
}

async function startQuiz(){
  showScreen("quiz");
  renderQuizPlayers();
  $("questionText").textContent="جارٍ تحضير الأسئلة...";
  $("questionText").classList.add("loading-text");
  $("answers").innerHTML="";
  $("questionFeedback").textContent="";

  const useAi = !!$("useAiToggle")?.checked;
  const category = $("categorySelect")?.value || "عام";
  let questions=null;

  if(useAi && isWorkerConfigured()){
    try{
      questions=await withTimeout(fetchAIQuestions(category,state.maxRounds),15000);
    }catch(e){
      toast("تعذر توليد الأسئلة بالذكاء الاصطناعي، تم استخدام الأسئلة المحلية 🧩");
    }
  }

  if(!questions || questions.length<Math.min(3,state.maxRounds)){
    questions=shuffle(questionBank).slice(0,state.maxRounds);
  }

  $("questionText").classList.remove("loading-text");
  state.quizQuestions=questions.slice(0,state.maxRounds);
  state.quizIndex=0;
  nextQuizQuestion();
}
function renderQuizPlayers(){
  $("quizPlayers").innerHTML=state.players.map((p,i)=>`<span class="player-pill">${i===state.currentPlayer?"▶ ":""}${escapeHtml(p.name)}: ${p.score}</span>`).join("");
}
function nextQuizQuestion(){
  if(state.quizIndex>=state.quizQuestions.length){finishGame();return}
  const item=state.quizQuestions[state.quizIndex];
  $("quizRound").textContent=`الجولة ${state.quizIndex+1} / ${state.quizQuestions.length}`;
  $("quizScore").textContent=`${state.players[0]?.score||0} نقطة`;
  $("quizProgress").style.width=((state.quizIndex)/state.quizQuestions.length*100)+"%";
  $("questionText").textContent=item.q;$("questionFeedback").textContent="";
  const answers=$("answers");answers.innerHTML="";
  item.a.forEach((text,i)=>{
    const b=document.createElement("button");b.className="answer";b.textContent=text;
    b.onclick=()=>answerQuiz(i,b);answers.appendChild(b);
  });
}
function answerQuiz(choice,button){
  const item=state.quizQuestions[state.quizIndex];
  document.querySelectorAll("#answers .answer").forEach(b=>b.classList.add("disabled"));
  const correct=choice===item.c;
  button.classList.add(correct?"correct":"wrong");
  if(!correct)document.querySelectorAll("#answers .answer")[item.c].classList.add("correct");
  const player=state.players[state.currentPlayer];
  if(correct){
    const points=100+Math.max(0,50-state.quizIndex*8);
    player.score+=points;
    $("questionFeedback").textContent=`✅ صح! +${points} نقطة`;
    beep("good");
  }else{$("questionFeedback").textContent=`❌ مو صح! الإجابة: ${item.a[item.c]}`;beep("bad")}
  renderQuizPlayers();$("quizScore").textContent=`${state.players[0].score} نقطة`;
  state.currentPlayer=(state.currentPlayer+1)%state.players.length;
  setTimeout(()=>{state.quizIndex++;nextQuizQuestion()},850);
}

// ===================== خمن الأغنية =====================
async function fetchSpotifyTracks(genreId){
  const res=await fetch(`${WORKER_BASE_URL}/api/songs?genre=${encodeURIComponent(genreId)}`);
  if(!res.ok) throw new Error("songs_api_failed");
  const data=await res.json();
  if(!data||!Array.isArray(data.tracks) || data.tracks.length<4) throw new Error("not_enough_tracks");
  return data.tracks;
}

function buildMusicRoundsFromTracks(tracks){
  const pool=shuffle(tracks.filter(t=>t && t.name && t.artist));
  const count=Math.min(state.maxRounds,pool.length);
  const rounds=[];
  for(let i=0;i<count;i++){
    const correct=pool[i];
    const distractors=shuffle(pool.filter(t=>t!==correct)).slice(0,3);
    if(distractors.length<3) break;
    const options=shuffle([correct,...distractors]);
    rounds.push({
      clue:"خمن اسم الأغنية من صورة الغلاف 🎧",
      image:correct.image||null,
      a:options.map(o=>`${o.name} — ${o.artist}`),
      c:options.indexOf(correct)
    });
  }
  return rounds;
}

async function startMusic(){
  showScreen("music");
  $("musicClue").textContent="جارٍ تحضير الأغاني...";
  $("musicClue").classList.add("loading-text");
  $("musicAnswers").innerHTML="";
  $("musicFeedback").textContent="";

  const useApi = !!$("useAiToggle")?.checked;
  const genreId = $("categorySelect")?.value || "arabic-pop";
  let rounds=null;

  if(useApi && isWorkerConfigured()){
    try{
      const tracks=await withTimeout(fetchSpotifyTracks(genreId),15000);
      rounds=buildMusicRoundsFromTracks(tracks);
    }catch(e){
      toast("تعذر جلب الأغاني من Spotify، تم استخدام الأغاني المحلية 🎵");
    }
  }

  if(!rounds || rounds.length<Math.min(3,state.maxRounds)){
    rounds=musicBank.map(item=>({clue:item.clue,a:item.a,c:item.c,image:null}));
  }

  $("musicClue").classList.remove("loading-text");
  state.musicRounds=rounds;
  state.musicIndex=0;
  nextMusic();
}
function nextMusic(){
  const rounds=state.musicRounds;
  if(state.musicIndex>=rounds.length){finishGame();return}
  const item=rounds[state.musicIndex];
  $("musicRound").textContent=`الجولة ${state.musicIndex+1} / ${rounds.length}`;
  $("musicScore").textContent=`${state.players[0]?.score||0} نقطة`;
  $("musicClue").textContent=item.clue;$("musicFeedback").textContent="";
  $("vinyl").classList.remove("playing");$("playMusicBtn").textContent="▶ تشغيل المقطع";

  const cover=$("songCover");
  if(item.image){
    cover.src=item.image;
    cover.classList.remove("hidden");
    $("vinyl").classList.add("hidden");
  }else{
    cover.classList.add("hidden");
    $("vinyl").classList.remove("hidden");
  }

  const box=$("musicAnswers");box.innerHTML="";
  item.a.map((v,i)=>({v,i})).forEach(x=>{
    const b=document.createElement("button");b.className="answer";b.textContent=x.v;
    b.onclick=()=>answerMusic(x.i,b);box.appendChild(b);
  });
}
function playFakeMusic(){
  const v=$("vinyl");
  if(v.classList.contains("hidden"))return;
  v.classList.toggle("playing");
  $("playMusicBtn").textContent=v.classList.contains("playing")?"⏸ إيقاف المقطع":"▶ تشغيل المقطع";
  beep("click");
}
function answerMusic(choice,button){
  const rounds=state.musicRounds;
  const item=rounds[state.musicIndex];
  document.querySelectorAll("#musicAnswers .answer").forEach(b=>b.classList.add("disabled"));
  const correct=choice===item.c;button.classList.add(correct?"correct":"wrong");
  if(!correct){
    document.querySelectorAll("#musicAnswers .answer")[item.c].classList.add("correct");
  }
  const player=state.players[state.currentPlayer];
  if(correct){player.score+=150;$("musicFeedback").textContent="🎉 عرفتَها! +150 نقطة";beep("good")}
  else{$("musicFeedback").textContent=`❌ الإجابة الصحيحة: ${item.a[item.c]}`;beep("bad")}
  $("musicScore").textContent=`${state.players[0].score} نقطة`;
  state.currentPlayer=(state.currentPlayer+1)%state.players.length;
  setTimeout(()=>{state.musicIndex++;nextMusic()},1000);
}

// ===================== الحاكم والجلاد =====================
function startGovernor(){
  state.roles=shuffle(roleData);
  while(state.roles.length<state.players.length)state.roles.push(roleData[state.roles.length%4]);
  state.governorIndex=0;state.round=1;showScreen("governor");prepareGovernor();
}
function prepareGovernor(){
  $("govRound").textContent=`اللاعب ${state.governorIndex+1} / ${state.players.length}`;
  $("govScore").textContent=`${state.players[state.governorIndex]?.name||""}`;
  $("roleReveal").classList.add("hidden");
}
function revealRole(){
  const p=state.players[state.governorIndex];
  const role=state.roles[state.governorIndex%state.roles.length];
  $("roleName").textContent=role.name;$("roleDescription").textContent=role.desc;
  $("roleReveal").classList.remove("hidden");beep("click");
}
function nextGovernorPlayer(){
  state.governorIndex++;
  if(state.governorIndex>=state.players.length){
    state.players.forEach((p,i)=>p.score+=Math.floor(Math.random()*201));
    finishGame();return;
  }
  prepareGovernor();
}

// ===================== نتائج مشتركة =====================
function finishGame(){
  const sorted=[...state.players].sort((a,b)=>b.score-a.score);
  $("resultMessage").textContent=`مبروك لـ ${sorted[0]?.name||"الفائز"} 🎉`;
  $("leaderboard").innerHTML=sorted.map((p,i)=>`
    <div class="rank"><span>${["🥇","🥈","🥉"][i]||"🏅"} ${escapeHtml(p.name)}</span><b>${p.score} نقطة</b></div>
  `).join("");
  showScreen("results");beep("good");
}
function confirmExit(){
  if(confirm("متأكد أنك تريد الخروج من الجولة؟"))showScreen("games");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

document.addEventListener("DOMContentLoaded",()=>{
  renderNames();
  $("toast").classList.remove("show");
});
