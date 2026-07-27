(()=>{
  const STORAGE_KEY='chronoglobeActiveGame';
  const SAVE_SCHEMA_VERSION=1;
  const APP_VERSION='1.8.0';
  const CONTENT_VERSION='legacy-150-v1';
  const MAX_AGE_MS=1000*60*60*24*30;
  function safeRead(){try{return localStorage.getItem(STORAGE_KEY)}catch{return null}}
  function safeWrite(value){try{localStorage.setItem(STORAGE_KEY,value);return true}catch{return false}}
  function clear(){try{localStorage.removeItem(STORAGE_KEY);return true}catch{return false}}
  function finite(value,fallback=0){return Number.isFinite(Number(value))?Number(value):fallback}
  function validGuess(guess){return guess&&Number.isFinite(guess.lat)&&Number.isFinite(guess.lng)&&guess.lat>=-90&&guess.lat<=90&&guess.lng>=-180&&guess.lng<=180}
  function stablePhase(phase,resumePhase){const candidate=phase==='paused'?resumePhase:phase;return candidate==='result'?'result':'guessing'}
  function serialize(state){
    if(!state?.config||!Array.isArray(state.roundDeck)||!state.roundDeck.length)return null;
    return {saveSchemaVersion:SAVE_SCHEMA_VERSION,appVersion:APP_VERSION,contentVersion:CONTENT_VERSION,savedAt:new Date().toISOString(),phase:stablePhase(state.phase,state.resumePhase),config:{difficulty:state.config.difficulty,totalRounds:state.totalRounds},round:state.round,score:state.score,originalMaximum:state.originalMaximum,adjustedMaximum:state.adjustedMaximum,hintsUsed:state.hintsUsed,streak:state.streak,bestStreak:state.bestStreak,guess:validGuess(state.guess)?{lat:state.guess.lat,lng:state.guess.lng}:null,hintUsed:Boolean(state.hintUsed),roundCap:state.roundCap,meaningfulProgress:Boolean(state.meaningfulProgress),distances:Array.isArray(state.distances)?state.distances.slice():[],roundResults:Array.isArray(state.roundResults)?state.roundResults.map(result=>({...result})):[],deck:state.roundDeck.map(item=>({roundNumber:item.roundNumber,eventId:item.eventId,variantId:item.variantId,difficulty:item.difficulty}))};
  }
  function save(state){const payload=serialize(state);return payload?safeWrite(JSON.stringify(payload)):false}
  function validate(raw,facts){
    if(!raw||raw.saveSchemaVersion!==SAVE_SCHEMA_VERSION)return {ok:false,reason:'version'};
    if(raw.contentVersion!==CONTENT_VERSION)return {ok:false,reason:'content'};
    const age=Date.now()-Date.parse(raw.savedAt);if(!Number.isFinite(age)||age<0||age>MAX_AGE_MS)return {ok:false,reason:'expired'};
    if(!raw.config||!['easy','medium','hard','expert','mixed'].includes(raw.config.difficulty))return {ok:false,reason:'config'};
    if(![5,10,15].includes(Number(raw.config.totalRounds)))return {ok:false,reason:'round-count'};
    if(!Array.isArray(raw.deck)||raw.deck.length!==Number(raw.config.totalRounds))return {ok:false,reason:'deck'};
    const byVariant=new Map(facts.map(fact=>[fact.variantId,fact])),eventIds=new Set(),deck=[];
    for(let index=0;index<raw.deck.length;index++){const item=raw.deck[index],fact=byVariant.get(item.variantId);if(!fact||fact.eventId!==item.eventId||fact.difficulty!==item.difficulty||eventIds.has(item.eventId))return {ok:false,reason:'deck-reference'};eventIds.add(item.eventId);deck.push(Object.freeze({roundNumber:index+1,eventId:item.eventId,variantId:item.variantId,difficulty:item.difficulty,fact}))}
    const round=finite(raw.round,1);if(round<1||round>deck.length)return {ok:false,reason:'round'};
    const results=Array.isArray(raw.roundResults)?raw.roundResults:[];if(results.length>round)return {ok:false,reason:'results'};
    const phase=stablePhase(raw.phase);
    if(phase==='result'&&(!results.length||results.at(-1).eventId!==deck[round-1].eventId))return {ok:false,reason:'result-reference'};
    return {ok:true,value:{phase,config:Object.freeze({difficulty:raw.config.difficulty,totalRounds:Number(raw.config.totalRounds)}),totalRounds:Number(raw.config.totalRounds),round,score:finite(raw.score),originalMaximum:finite(raw.originalMaximum,deck.length*10000),adjustedMaximum:finite(raw.adjustedMaximum,deck.length*10000),hintsUsed:finite(raw.hintsUsed),streak:finite(raw.streak),bestStreak:finite(raw.bestStreak),guess:validGuess(raw.guess)?{lat:raw.guess.lat,lng:raw.guess.lng}:null,hintUsed:Boolean(raw.hintUsed),roundCap:finite(raw.roundCap,raw.hintUsed?8000:10000),meaningfulProgress:Boolean(raw.meaningfulProgress),distances:Array.isArray(raw.distances)?raw.distances.map(Number).filter(Number.isFinite):[],roundResults:results.map(result=>Object.freeze({...result})),roundDeck:Object.freeze(deck),savedAt:raw.savedAt}};
  }
  function load(facts){const text=safeRead();if(!text)return {ok:false,reason:'missing'};try{const checked=validate(JSON.parse(text),facts);if(!checked.ok)clear();return checked}catch{clear();return {ok:false,reason:'parse'}}}
  window.ChronoPersistence=Object.freeze({STORAGE_KEY,SAVE_SCHEMA_VERSION,APP_VERSION,CONTENT_VERSION,save,load,clear,serialize});
})();