const FACTS = window.CHRONO_FACTS || [];
const $ = id => document.getElementById(id);

const state = {
  phase:'start',resumePhase:null,round:1,totalRounds:5,
  score:0,originalMaximum:50000,adjustedMaximum:50000,hintsUsed:0,
  streak:0,bestStreak:0,current:null,guess:null,hintUsed:false,roundCap:10000,
  revealed:false,currentRoundCommitted:false,roundDeck:[],roundResults:[],distances:[],
  sound:true,config:null,meaningfulProgress:false,toastTimer:null
};

const els = {
  gameApp:$('gameApp'),startScreen:$('startScreen'),startGameBtn:$('startGameBtn'),startHowToBtn:$('startHowToBtn'),difficultyDescription:$('difficultyDescription'),setupError:$('setupError'),
  roundStat:$('roundStat'),scoreStat:$('scoreStat'),streakStat:$('streakStat'),progressFill:$('progressFill'),categoryPill:$('categoryPill'),eraPill:$('eraPill'),factText:$('factText'),hintBox:$('hintBox'),hintBtn:$('hintBtn'),roundCapText:$('roundCapText'),lockBtn:$('lockBtn'),nextBtn:$('nextBtn'),resultPanel:$('resultPanel'),locationName:$('locationName'),pointsEarned:$('pointsEarned'),distanceText:$('distanceText'),contextText:$('contextText'),globeStage:$('globeStage'),statusText:$('statusText'),guessToast:$('guessToast'),endScreen:$('endScreen'),finalScore:$('finalScore'),finalMaximum:$('finalMaximum'),hintSummary:$('hintSummary'),bestGuess:$('bestGuess'),avgDistance:$('avgDistance'),bestStreak:$('bestStreak'),playAgainBtn:$('playAgainBtn'),soundBtn:$('soundBtn'),endTitle:$('endTitle'),endSubtitle:$('endSubtitle'),zoomInBtn:$('zoomInBtn'),zoomOutBtn:$('zoomOutBtn'),actionDock:$('actionDock'),scoreDock:$('scoreDock'),hudLocation:$('hudLocation'),hudContext:$('hudContext'),hudDistance:$('hudDistance'),hudScore:$('hudScore'),hudScoreDetail:$('hudScoreDetail'),hudRating:$('hudRating'),howToBtn:$('howToBtn'),tutorial:$('tutorial'),tutorialClose:$('tutorialClose'),tutorialGotIt:$('tutorialGotIt'),gameConfigText:$('gameConfigText'),menuBtn:$('menuBtn'),gameMenu:$('gameMenu'),menuClose:$('menuClose'),resumeBtn:$('resumeBtn'),menuHowToBtn:$('menuHowToBtn'),menuSoundBtn:$('menuSoundBtn'),newGameBtn:$('newGameBtn'),confirmNewGame:$('confirmNewGame'),cancelNewGameBtn:$('cancelNewGameBtn'),confirmNewGameBtn:$('confirmNewGameBtn'),confirmHint:$('confirmHint'),cancelHintBtn:$('cancelHintBtn'),confirmHintBtn:$('confirmHintBtn')
};

const descriptions={
  easy:'Borders, labels, and more direct clues. Recommended for your first game.',
  medium:'Country borders remain visible, with standard clue detail.',
  hard:'No political overlays, with more indirect location guidance.',
  expert:'No borders or labels. Category and era are hidden, with minimal clues.',
  mixed:'A balanced mix of all four levels, including Expert, with no repeated event.'
};

function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
function safeSet(key,value){try{localStorage.setItem(key,value)}catch{}}
function selectedValue(name){return document.querySelector(`input[name="${name}"]:checked`)?.value}
function setSelected(name,value){const input=document.querySelector(`input[name="${name}"][value="${value}"]`);if(input)input.checked=true}
function titleCase(value){return value.charAt(0).toUpperCase()+value.slice(1)}

const globe=Globe()(document.getElementById('globe'))
  .backgroundColor('rgba(0,0,0,0)').globeImageUrl('streaming-tiles').bumpImageUrl(null).showAtmosphere(true).atmosphereColor('#5bdcf7').atmosphereAltitude(.18)
  .pointLat('lat').pointLng('lng').pointAltitude('altitude').pointRadius('radius').pointColor('color')
  .ringLat('lat').ringLng('lng').ringColor('color').ringMaxRadius('maxRadius').ringPropagationSpeed('speed').ringRepeatPeriod('repeat')
  .arcStartLat('startLat').arcStartLng('startLng').arcEndLat('endLat').arcEndLng('endLng').arcColor('color').arcAltitudeAutoScale(.35).arcStroke(.7).arcDashLength(.55).arcDashGap(1.2).arcDashAnimateTime(1700)
  .onGlobeClick(({lat,lng})=>placeGuess(lat,lng));
const controls=globe.controls();
Object.assign(controls,{autoRotate:true,autoRotateSpeed:.45,enableDamping:true,dampingFactor:.08,minDistance:30,maxDistance:1600});
function resizeGlobe(){const r=els.globeStage.getBoundingClientRect();globe.width(r.width).height(r.height)}
window.addEventListener('resize',resizeGlobe);requestAnimationFrame(resizeGlobe);

function updateSetupCopy(){
  const difficulty=selectedValue('difficultyChoice')||'easy';
  const rounds=Number(selectedValue('roundChoice')||5);
  els.difficultyDescription.textContent=descriptions[difficulty];
  els.startGameBtn.textContent=difficulty==='easy'&&rounds===5?'Start a quick Easy game':`Start ${rounds}-round ${titleCase(difficulty)} game`;
}

function restorePreferences(){
  const savedDifficulty=safeGet('chronoglobeDifficulty');
  const savedRounds=safeGet('chronoglobeRounds');
  const savedSound=safeGet('chronoglobeSound');
  if(savedDifficulty)setSelected('difficultyChoice',savedDifficulty);
  if(savedRounds)setSelected('roundChoice',savedRounds);
  if(savedSound!==null)state.sound=savedSound!=='off';
  updateSoundUI();updateSetupCopy();
}

function startGame(){
  const difficulty=selectedValue('difficultyChoice')||'easy';
  const totalRounds=Number(selectedValue('roundChoice')||5);
  let roundDeck;
  try{roundDeck=window.ChronoDeck.buildRoundDeck({facts:FACTS,difficulty,roundCount:totalRounds})}
  catch(error){console.error('Unable to build ChronoGlobe round deck',error);els.setupError.textContent='This game could not be prepared. Please choose another setup.';return}
  const originalMaximum=totalRounds*window.ChronoScoring.ROUND_MAX;
  state.config=Object.freeze({difficulty,totalRounds});
  Object.assign(state,{phase:'guessing',resumePhase:null,round:1,totalRounds,score:0,originalMaximum,adjustedMaximum:originalMaximum,hintsUsed:0,streak:0,bestStreak:0,distances:[],roundResults:[],roundDeck,currentRoundCommitted:false,meaningfulProgress:false});
  safeSet('chronoglobeDifficulty',difficulty);safeSet('chronoglobeRounds',String(totalRounds));
  els.setupError.textContent='';els.startScreen.classList.remove('show');els.gameApp.setAttribute('aria-hidden','false');els.endScreen.classList.remove('show');
  els.gameConfigText.textContent=`${titleCase(difficulty)} · ${totalRounds} rounds`;
  requestAnimationFrame(()=>{resizeGlobe();loadRound();els.menuBtn.focus({preventScroll:true})});
}

function loadRound(){
  const deckItem=state.roundDeck[state.round-1];
  if(!deckItem){console.error('Missing round deck item',state.round);return}
  Object.assign(state,{phase:'guessing',current:deckItem.fact,guess:null,hintUsed:false,roundCap:window.ChronoScoring.ROUND_MAX,revealed:false,currentRoundCommitted:false});
  if(typeof globe.setMapAidMode==='function')globe.setMapAidMode(deckItem.difficulty);
  els.gameApp.classList.toggle('expert-mode',deckItem.difficulty==='expert');
  els.categoryPill.textContent=state.current.category;els.eraPill.textContent=state.current.era;els.factText.textContent=state.current.fact;
  els.hintBox.textContent=state.current.hint;els.hintBox.classList.remove('show');els.roundCapText.hidden=true;
  els.hintBtn.disabled=false;els.hintBtn.textContent='Use hint — max 8,000';els.lockBtn.disabled=true;els.lockBtn.hidden=false;els.nextBtn.hidden=true;
  els.statusText.textContent='Choose a location';els.guessToast.classList.remove('show','reposition');
  els.hudDistance.textContent='—';els.hudScore.textContent='Up to 10,000';els.hudScoreDetail.textContent='';els.hudRating.textContent='';els.hudLocation.textContent='—';els.hudContext.textContent='';
  els.scoreDock.classList.remove('show');els.actionDock.classList.remove('with-score');
  globe.pointsData([]).ringsData([]).arcsData([]);controls.autoRotate=true;globe.pointOfView({lat:20,lng:0,altitude:1.45},900);updateStats();
}

function showGuessToast(moved){
  clearTimeout(state.toastTimer);els.guessToast.textContent=moved?'Guess moved — lock it in when ready':'Guess placed — tap elsewhere to move it';els.guessToast.classList.toggle('reposition',moved);els.guessToast.classList.add('show');state.toastTimer=setTimeout(()=>els.guessToast.classList.remove('show'),1800);
}

function placeGuess(lat,lng){
  if(state.phase!=='guessing')return;
  const moved=Boolean(state.guess);state.guess={lat,lng};state.meaningfulProgress=true;controls.autoRotate=false;
  globe.pointsData([{lat,lng,altitude:.012,radius:.45,color:'#65e9ff'}]);globe.ringsData([{lat,lng,color:()=> 'rgba(101,233,255,.65)',maxRadius:4,speed:2.2,repeat:900}]);
  els.lockBtn.disabled=false;els.statusText.textContent=`${formatCoord(lat,'N','S')}, ${formatCoord(lng,'E','W')}`;showGuessToast(moved);ping(moved?480:420,.035,'sine');
}

function revealHint(){
  if(state.phase!=='guessing'||state.hintUsed)return;
  state.hintUsed=true;state.roundCap=window.ChronoScoring.HINT_CAP;state.hintsUsed++;state.adjustedMaximum-=window.ChronoScoring.ROUND_MAX-window.ChronoScoring.HINT_CAP;state.meaningfulProgress=true;
  els.hintBox.classList.add('show');els.roundCapText.hidden=false;els.hintBtn.disabled=true;els.hintBtn.textContent='Hint revealed · max 8,000';els.hudScore.textContent='Up to 8,000';ping(550,.05);
}

function requestHint(){
  if(state.phase!=='guessing'||state.hintUsed)return;
  if(safeGet('chronoglobeHintCostSeen')==='1')return revealHint();
  state.resumePhase='guessing';state.phase='paused';controls.autoRotate=false;els.globeStage.classList.add('paused-map');els.confirmHint.classList.add('show');els.cancelHintBtn.focus();
}
function closeHintDialog(){
  if(!els.confirmHint.classList.contains('show'))return;
  els.confirmHint.classList.remove('show');els.globeStage.classList.remove('paused-map');state.phase=state.resumePhase||'guessing';state.resumePhase=null;els.hintBtn.focus();
}
function confirmHintUse(){safeSet('chronoglobeHintCostSeen','1');closeHintDialog();revealHint()}

function revealAnswer(){
  if(state.phase!=='guessing'||!state.guess||state.currentRoundCommitted)return;
  state.phase='revealing';state.currentRoundCommitted=true;state.revealed=true;state.meaningfulProgress=true;
  const a=state.current;const km=haversine(state.guess.lat,state.guess.lng,a.lat,a.lng);const result=window.ChronoScoring.roundResult(km,state.hintUsed);
  state.score+=result.awardedScore;state.distances.push(km);state.streak=result.streakContinued?state.streak+1:0;state.bestStreak=Math.max(state.bestStreak,state.streak);
  state.roundResults.push(Object.freeze({eventId:a.eventId,variantId:a.variantId,difficulty:a.difficulty,...result}));
  globe.pointsData([{...state.guess,altitude:.012,radius:.35,color:'#65e9ff'},{lat:a.lat,lng:a.lng,altitude:.018,radius:.55,color:'#ffd166'}]);
  globe.ringsData([{lat:a.lat,lng:a.lng,color:()=> 'rgba(255,209,102,.78)',maxRadius:7,speed:2.6,repeat:650}]);
  globe.arcsData([{startLat:state.guess.lat,startLng:state.guess.lng,endLat:a.lat,endLng:a.lng,color:['rgba(101,233,255,.85)','rgba(255,209,102,.95)']}]);globe.pointOfView({lat:a.lat,lng:a.lng,altitude:.08},1800);
  els.statusText.textContent=a.place;els.locationName.textContent=a.place;els.pointsEarned.innerHTML=`${result.awardedScore.toLocaleString()}<small>points</small>`;
  els.distanceText.textContent=km<.25?'Less than 250 meters away — perfect!':km<1?'Less than 1 km away — bullseye!':`${Math.round(km).toLocaleString()} km from the correct location`;
  els.contextText.textContent=a.context;els.hudLocation.textContent=a.place;els.hudContext.textContent=a.context;els.hudDistance.textContent=km<1?`${Math.round(km*1000)} m`:`${Math.round(km).toLocaleString()} km`;
  els.hudScore.textContent=`${result.awardedScore.toLocaleString()} / ${result.roundCap.toLocaleString()}`;
  els.hudScoreDetail.textContent=result.hintUsed?(result.distanceScore>result.roundCap?`Accuracy score ${result.distanceScore.toLocaleString()} · hint cap applied`:`Hint used · round maximum ${result.roundCap.toLocaleString()}`):'No hint used';
  els.hudRating.textContent=result.streakContinued?`${result.accuracyLabel} · streak continued (${state.streak})`:state.streak===0?`${result.accuracyLabel} · streak ended`:result.accuracyLabel;
  els.scoreDock.classList.add('show');els.actionDock.classList.add('with-score');els.lockBtn.hidden=true;els.hintBtn.disabled=true;els.nextBtn.hidden=false;els.nextBtn.textContent=state.round>=state.totalRounds?'See final score →':'Next fact →';state.phase='result';updateStats();scoreSound(result.awardedScore);
}

function nextRound(){if(state.phase!=='result')return;if(state.round>=state.totalRounds)return showEndScreen();state.round++;loadRound()}
function showEndScreen(){
  if(state.phase!=='result')return;state.phase='finished';
  const best=Math.min(...state.distances),avg=state.distances.reduce((a,b)=>a+b,0)/state.distances.length,ratio=state.score/state.originalMaximum;let title='Curious Traveler',subtitle='You found history across the globe.';
  if(ratio>=.86){title='Master Historian';subtitle='You navigate the past like you were there.'}else if(ratio>=.68){title='History Hunter';subtitle='Your geographic instincts are seriously sharp.'}else if(ratio>=.48){title='Time Traveler';subtitle='A strong trip through human history.'}
  els.endTitle.textContent=title;els.endSubtitle.textContent=subtitle;els.finalScore.innerHTML=`${state.score.toLocaleString()}<small>total points</small>`;els.finalMaximum.textContent=`out of ${state.originalMaximum.toLocaleString()}`;
  els.hintSummary.textContent=state.hintsUsed?`${state.hintsUsed} hint${state.hintsUsed===1?'':'s'} used · ${state.adjustedMaximum.toLocaleString()} points available after hints`:'No hints used.';
  els.bestGuess.textContent=`${Math.round(best).toLocaleString()} km`;els.avgDistance.textContent=`${Math.round(avg).toLocaleString()} km`;els.bestStreak.textContent=state.bestStreak;els.endScreen.classList.add('show');flourish();
}
function updateStats(){els.roundStat.textContent=`${state.round} / ${state.totalRounds}`;els.scoreStat.textContent=state.score.toLocaleString();els.streakStat.textContent=state.streak;els.progressFill.style.width=`${state.round/state.totalRounds*100}%`}
function haversine(a,b,c,d){const R=6371,r=x=>x*Math.PI/180,x=r(c-a),y=r(d-b),q=Math.sin(x/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function formatCoord(v,p,n){return `${Math.abs(v).toFixed(1)}°${v>=0?p:n}`}

let audioCtx;
function ping(freq=440,duration=.06,type='sine',delay=0){if(!state.sound)return;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime+delay;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+duration+.02)}catch{}}
function scoreSound(p){if(p>=4000){ping(523,.12,'triangle');ping(659,.14,'triangle',.11);ping(784,.2,'triangle',.23)}else if(p>=2000){ping(440,.1);ping(587,.13,'sine',.12)}else{ping(260,.1);ping(220,.16,'sine',.11)}}
function flourish(){[392,523,659,784].forEach((f,i)=>ping(f,.18,'triangle',i*.12))}
function updateSoundUI(){const label=state.sound?'Sound on':'Sound off';els.soundBtn.textContent=state.sound?'🔊':'🔇';els.soundBtn.setAttribute('aria-label',label);els.soundBtn.title=label;els.menuSoundBtn.textContent=label}
function toggleSound(){state.sound=!state.sound;safeSet('chronoglobeSound',state.sound?'on':'off');updateSoundUI();if(state.sound)ping(500,.05)}

function openMenu(){if(!['guessing','result'].includes(state.phase))return;state.resumePhase=state.phase;state.phase='paused';controls.autoRotate=false;els.globeStage.classList.add('paused-map');els.gameMenu.classList.add('show');els.resumeBtn.focus()}
function closeMenu(){if(state.phase!=='paused'||!els.gameMenu.classList.contains('show'))return;state.phase=state.resumePhase||'guessing';state.resumePhase=null;els.globeStage.classList.remove('paused-map');els.gameMenu.classList.remove('show');els.menuBtn.focus()}
function requestNewGame(){if(!state.meaningfulProgress&&state.round===1){openStartScreen();return}els.gameMenu.classList.remove('show');els.confirmNewGame.classList.add('show');els.cancelNewGameBtn.focus()}
function openStartScreen(){state.phase='start';state.resumePhase=null;els.gameMenu.classList.remove('show');els.confirmNewGame.classList.remove('show');els.confirmHint.classList.remove('show');els.endScreen.classList.remove('show');els.globeStage.classList.remove('paused-map');els.gameApp.setAttribute('aria-hidden','true');els.startScreen.classList.add('show');updateSetupCopy();els.startGameBtn.focus()}
function cancelNewGame(){els.confirmNewGame.classList.remove('show');els.gameMenu.classList.add('show');els.newGameBtn.focus()}
function openTutorial(){els.tutorial.classList.add('show');els.tutorialGotIt.focus()}
function closeTutorial(){els.tutorial.classList.remove('show');safeSet('chronoglobeTutorialSeen','1')}

for(const input of document.querySelectorAll('input[name="difficultyChoice"],input[name="roundChoice"]'))input.addEventListener('change',updateSetupCopy);
els.startGameBtn.addEventListener('click',startGame);els.startHowToBtn.addEventListener('click',openTutorial);els.hintBtn.addEventListener('click',requestHint);
els.cancelHintBtn.addEventListener('click',closeHintDialog);els.confirmHintBtn.addEventListener('click',confirmHintUse);
els.lockBtn.addEventListener('click',revealAnswer);els.nextBtn.addEventListener('click',nextRound);els.playAgainBtn.addEventListener('click',openStartScreen);
els.zoomInBtn.addEventListener('click',()=>{if(state.phase==='paused')return;controls.autoRotate=false;globe.zoomBy(1.85)});els.zoomOutBtn.addEventListener('click',()=>{if(state.phase==='paused')return;controls.autoRotate=false;globe.zoomBy(1/1.85)});
els.soundBtn.addEventListener('click',toggleSound);els.menuSoundBtn.addEventListener('click',toggleSound);
els.menuBtn.addEventListener('click',openMenu);els.menuClose.addEventListener('click',closeMenu);els.resumeBtn.addEventListener('click',closeMenu);els.newGameBtn.addEventListener('click',requestNewGame);els.cancelNewGameBtn.addEventListener('click',cancelNewGame);els.confirmNewGameBtn.addEventListener('click',openStartScreen);
els.howToBtn.addEventListener('click',openTutorial);els.menuHowToBtn.addEventListener('click',openTutorial);els.tutorialClose.addEventListener('click',closeTutorial);els.tutorialGotIt.addEventListener('click',closeTutorial);els.tutorial.addEventListener('click',e=>{if(e.target===els.tutorial)closeTutorial()});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(els.tutorial.classList.contains('show'))return closeTutorial();
    if(els.confirmHint.classList.contains('show'))return closeHintDialog();
    if(els.confirmNewGame.classList.contains('show'))return cancelNewGame();
    if(els.gameMenu.classList.contains('show'))return closeMenu();
  }
  if(e.key==='Enter'&&state.phase==='guessing'&&!els.lockBtn.disabled)revealAnswer();
  if((e.key===' '||e.key==='ArrowRight')&&state.phase==='result'){e.preventDefault();nextRound()}
});

restorePreferences();els.gameApp.setAttribute('aria-hidden','true');els.startScreen.classList.add('show');