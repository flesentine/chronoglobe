(()=>{
  const RECENT_KEY='chronoglobeRecentEventsV1';
  const SESSION_KEY='chronoglobeReplaySessionV1';
  const DAILY_PREFIX='chronoglobeDailyCompleteV1:';
  const ACTIVE_SAVE_KEY='chronoglobeActiveGame';
  const DAILY_ALGORITHM_VERSION=1;
  const CONTENT_VERSION=window.ChronoPersistence?.CONTENT_VERSION||'canonical-150-expert-v1';
  const SITE_URL='https://flesentine.github.io/chronoglobe/';

  const safeGet=key=>{try{return localStorage.getItem(key)}catch{return null}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
  const safeRemove=key=>{try{localStorage.removeItem(key)}catch{}};
  const parseJson=(text,fallback)=>{try{return text?JSON.parse(text):fallback}catch{return fallback}};
  const utcDate=()=>new Date().toISOString().slice(0,10);
  const dailySeed=date=>`chronoglobe-daily-v${DAILY_ALGORITHM_VERSION}-${date}-${CONTENT_VERSION}`;

  let originalBuild=null;
  let pendingMode=null;
  let session=null;
  let currentDeck=[];
  let latestSavedGame=null;
  let finalPayload=null;
  let resultGlyphs=[];
  let endHandled=false;

  function recentIds(){
    const value=parseJson(safeGet(RECENT_KEY),[]);
    return Array.isArray(value)?value.filter(id=>typeof id==='string').slice(-60):[];
  }

  function rememberEvents(ids){
    const merged=[...recentIds(),...ids.filter(Boolean)];
    const unique=[];
    for(let i=merged.length-1;i>=0;i--)if(!unique.includes(merged[i]))unique.push(merged[i]);
    safeSet(RECENT_KEY,JSON.stringify(unique.reverse().slice(-60)));
  }

  function buildWithAvoidance(options){
    const recent=recentIds();
    for(const count of [30,20,10,0]){
      const excluded=new Set(count?recent.slice(-count):[]);
      const filtered=count?options.facts.filter(f=>!excluded.has(f.eventId)):options.facts;
      try{return originalBuild({...options,facts:filtered})}catch(error){if(count===0)throw error}
    }
  }

  function patchDeckBuilder(){
    if(!window.ChronoDeck||originalBuild)return;
    originalBuild=window.ChronoDeck.buildRoundDeck;
    const patched=(options={})=>{
      const mode=pendingMode;
      let deck;
      if(mode?.type==='daily')deck=originalBuild({...options,difficulty:'mixed',roundCount:5,seed:dailySeed(mode.date)});
      else deck=buildWithAvoidance(options);
      currentDeck=deck.map(item=>({eventId:item.eventId,variantId:item.variantId,difficulty:item.difficulty}));
      if(mode?.type==='daily'){
        session={type:'daily',date:mode.date,official:mode.official,deck:currentDeck};
        safeSet(SESSION_KEY,JSON.stringify(session));
        pendingMode=null;
      }else{
        session={type:'standard',deck:currentDeck};
        safeSet(SESSION_KEY,JSON.stringify(session));
      }
      return deck;
    };
    window.ChronoDeck=Object.freeze({...window.ChronoDeck,buildRoundDeck:patched});
  }

  function dailyCompleted(date){return safeGet(`${DAILY_PREFIX}${date}`)==='1'}

  function addDailyButton(){
    const actions=document.querySelector('.start-actions');
    if(!actions||document.getElementById('dailyChallengeBtn'))return;
    const date=utcDate();
    const button=document.createElement('button');
    button.type='button';
    button.id='dailyChallengeBtn';
    button.className='btn daily-challenge-btn';
    button.innerHTML=`<strong>Daily Challenge</strong><span>${dailyCompleted(date)?'Practice today’s 5 rounds':'Same 5 rounds for everyone'}</span>`;
    button.addEventListener('click',()=>startDaily(date));
    actions.before(button);
  }

  function startDaily(date){
    if(typeof window.startGame!=='function')return;
    const difficulty=document.querySelector('input[name="difficultyChoice"][value="mixed"]');
    const rounds=document.querySelector('input[name="roundChoice"][value="5"]');
    if(difficulty)difficulty.checked=true;
    if(rounds)rounds.checked=true;
    pendingMode={type:'daily',date,official:!dailyCompleted(date)};
    resultGlyphs=[];
    finalPayload=null;
    endHandled=false;
    window.startGame();
    setTimeout(updateDailyLabels,0);
  }

  function updateDailyLabels(){
    if(session?.type!=='daily')return;
    const label=document.getElementById('gameConfigText');
    if(label)label.textContent=`Daily Challenge · ${session.official?'Official':'Practice'}`;
    const status=document.getElementById('statusText');
    if(status&&status.textContent==='Choose a location')status.textContent=session.official?'Daily Challenge — official attempt':'Daily Challenge — practice';
  }

  function readActiveSave(){
    const raw=parseJson(safeGet(ACTIVE_SAVE_KEY),null);
    if(raw?.deck){latestSavedGame=raw;return raw}
    return null;
  }

  function sameDeck(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((item,i)=>item.eventId===b[i]?.eventId&&item.variantId===b[i]?.variantId)}

  function glyphForResult(result){
    const tier=result?.accuracyTier;
    const symbol=tier==='bullseye'?'🟩':tier==='excellent'?'🟦':tier==='strong'?'🟨':tier==='in-region'?'🟧':'⬛';
    return result?.hintUsed?`${symbol}*`:symbol;
  }

  function glyphsFromResults(results){return Array.isArray(results)?results.map(glyphForResult):[]}

  function inferSessionFromSave(){
    const saved=readActiveSave();
    const stored=parseJson(safeGet(SESSION_KEY),null);
    if(stored?.deck&&saved?.deck&&sameDeck(stored.deck,saved.deck)){
      session=stored;currentDeck=stored.deck;resultGlyphs=glyphsFromResults(saved.roundResults||[]);return;
    }
    if(saved?.deck){session={type:'standard',deck:saved.deck};currentDeck=saved.deck;resultGlyphs=glyphsFromResults(saved.roundResults||[])}
  }

  function isFinalAdvance(event){
    const button=document.getElementById('nextBtn');
    if(!button||button.hidden||button.disabled||!button.textContent.includes('final score'))return false;
    if(event.type==='click')return Boolean(event.target?.closest?.('#nextBtn'));
    return event.type==='keydown'&&(event.key===' '||event.key==='ArrowRight');
  }

  function captureFinalPayload(event){
    if(!isFinalAdvance(event)||finalPayload)return;
    const saved=readActiveSave();
    if(!saved||saved.phase!=='result'||saved.round!==saved.config?.totalRounds)return;
    currentDeck=Array.isArray(saved.deck)?saved.deck:currentDeck;
    resultGlyphs=glyphsFromResults(saved.roundResults||[]);
    finalPayload=Object.freeze({
      score:Number(saved.score)||0,
      originalMaximum:Number(saved.originalMaximum)||currentDeck.length*10000,
      adjustedMaximum:Number(saved.adjustedMaximum)||currentDeck.length*10000,
      hintsUsed:Number(saved.hintsUsed)||0,
      bestStreak:Number(saved.bestStreak)||0,
      deck:currentDeck.map(item=>({...item})),
      roundResults:(saved.roundResults||[]).map(result=>({...result})),
      session:session?{...session}:null
    });
    window.dispatchEvent(new CustomEvent('chronoglobe:finished',{detail:finalPayload}));
  }

  function watchResults(){
    document.addEventListener('click',captureFinalPayload,true);
    document.addEventListener('keydown',captureFinalPayload,true);
    const scoreDock=document.getElementById('scoreDock');
    const endScreen=document.getElementById('endScreen');
    if(scoreDock)new MutationObserver(()=>{
      if(scoreDock.classList.contains('show')){
        const saved=readActiveSave();
        if(saved?.roundResults)resultGlyphs=glyphsFromResults(saved.roundResults);
        updateDailyLabels();
      }
    }).observe(scoreDock,{attributes:true,attributeFilter:['class']});
    if(endScreen)new MutationObserver(()=>{
      if(endScreen.classList.contains('show')&&!endHandled){endHandled=true;handleCompletion()}
      if(!endScreen.classList.contains('show'))endHandled=false;
    }).observe(endScreen,{attributes:true,attributeFilter:['class']});
  }

  function handleCompletion(){
    const deck=finalPayload?.deck||currentDeck;
    if(deck.length)rememberEvents(deck.map(item=>item.eventId));
    const completedSession=finalPayload?.session||session;
    if(completedSession?.type==='daily'&&completedSession.official)safeSet(`${DAILY_PREFIX}${completedSession.date}`,'1');
    addShareButton();
    safeRemove(SESSION_KEY);
  }

  function shareText(){
    const domScore=document.getElementById('finalScore')?.textContent.trim().replace(/total points/i,'').trim()||'0';
    const domMaximum=document.getElementById('finalMaximum')?.textContent.trim().replace(/^out of\s*/i,'')||'50,000';
    const score=finalPayload?finalPayload.score.toLocaleString():domScore;
    const maximum=finalPayload?finalPayload.originalMaximum.toLocaleString():domMaximum;
    const hints=finalPayload?.hintsUsed??latestSavedGame?.hintsUsed??0;
    const completedSession=finalPayload?.session||session;
    const heading=completedSession?.type==='daily'?`ChronoGlobe Daily ${completedSession.date}${completedSession.official?'':' (Practice)'}`:'ChronoGlobe';
    const glyphs=finalPayload?glyphsFromResults(finalPayload.roundResults):resultGlyphs;
    const rows=glyphs.length?glyphs.join(' '):'🌍';
    return `${heading}\n${score} / ${maximum}\n${rows}\n${hints} hint${hints===1?'':'s'} used\n${SITE_URL}`;
  }

  async function shareResults(){
    const text=shareText();
    try{
      if(navigator.share){await navigator.share({title:'ChronoGlobe result',text});return}
      await navigator.clipboard.writeText(text);
      const button=document.getElementById('shareResultsBtn');
      if(button){button.textContent='Copied result';setTimeout(()=>button.textContent='Share result',1600)}
    }catch(error){if(error?.name!=='AbortError')console.warn('Unable to share ChronoGlobe result',error)}
  }

  function addShareButton(){
    const card=document.querySelector('#endScreen .end-card');
    const playAgain=document.getElementById('playAgainBtn');
    if(!card||!playAgain)return;
    let button=document.getElementById('shareResultsBtn');
    if(!button){
      button=document.createElement('button');button.id='shareResultsBtn';button.type='button';button.className='btn share-results-btn';button.textContent='Share result';button.addEventListener('click',shareResults);playAgain.before(button);
    }
    button.hidden=false;
    const completedSession=finalPayload?.session||session;
    if(completedSession?.type==='daily'){
      const subtitle=document.getElementById('endSubtitle');
      if(subtitle)subtitle.textContent=`Daily Challenge · ${completedSession.official?'Official attempt':'Practice round'}`;
    }
  }

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .daily-challenge-btn{width:100%;display:grid;gap:3px;margin:2px 0 14px;text-align:left;border-color:rgba(255,209,102,.36);background:linear-gradient(135deg,rgba(255,209,102,.13),rgba(101,233,255,.08))}
      .daily-challenge-btn strong{color:var(--gold);font-size:15px}.daily-challenge-btn span{color:var(--muted);font-size:11px;font-weight:600}
      .share-results-btn{width:100%;margin:0 0 10px;border-color:rgba(101,233,255,.34)}
      @media(max-width:700px){.daily-challenge-btn{margin-bottom:10px;min-height:54px}}
    `;
    document.head.appendChild(style);
  }

  function init(){patchDeckBuilder();inferSessionFromSave();addStyles();addDailyButton();watchResults();updateDailyLabels()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();