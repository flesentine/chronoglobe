(()=>{
  const LEVELS=['easy','medium','hard','expert'];
  const MIXED_COUNTS={
    5:{easy:1,medium:2,hard:1,expert:1},
    10:{easy:2,medium:3,hard:3,expert:2},
    15:{easy:3,medium:4,hard:4,expert:4}
  };

  function hashSeed(value){
    let h=2166136261;
    for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return h>>>0;
  }

  function seededRandom(seed){
    let state=hashSeed(seed||`${Date.now()}-${Math.random()}`)||1;
    return ()=>{
      state+=0x6D2B79F5;
      let t=state;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function shuffle(items,random){
    const copy=items.slice();
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function validPacing(levels){
    if(levels[0]==='expert')return false;
    for(let i=1;i<levels.length;i++){
      if(levels[i]==='expert'&&levels[i-1]==='expert')return false;
      if(i>=2&&levels[i]===levels[i-1]&&levels[i]===levels[i-2])return false;
    }
    return true;
  }

  function pacingScore(levels){
    let score=0;
    if(levels[0]==='easy'||levels[0]==='medium')score+=4;
    if(levels.at(-1)!=='easy')score+=2;
    for(let i=1;i<levels.length;i++)if(levels[i]!==levels[i-1])score+=1;
    return score;
  }

  function arrangeMixed(counts,random){
    const bag=[];
    for(const level of LEVELS)for(let i=0;i<(counts[level]||0);i++)bag.push(level);
    let best=null,bestScore=-Infinity;
    for(let attempt=0;attempt<300;attempt++){
      const candidate=shuffle(bag,random);
      if(!validPacing(candidate))continue;
      const score=pacingScore(candidate);
      if(score>bestScore){best=candidate;bestScore=score}
    }
    if(best)return best;
    const fallback=[];
    const remaining={...counts};
    while(fallback.length<bag.length){
      const choices=LEVELS.filter(level=>remaining[level]>0&&!(level==='expert'&&(fallback.length===0||fallback.at(-1)==='expert'))&&!(fallback.length>=2&&fallback.at(-1)===level&&fallback.at(-2)===level));
      const level=(choices.length?choices:LEVELS.filter(l=>remaining[l]>0)).sort((a,b)=>remaining[b]-remaining[a])[0];
      fallback.push(level);remaining[level]--;
    }
    return fallback;
  }

  function groupFacts(facts){
    const events=new Map();
    for(const fact of facts){
      if(!fact.eventId||!fact.variantId)continue;
      if(!events.has(fact.eventId))events.set(fact.eventId,new Map());
      events.get(fact.eventId).set(fact.difficulty,fact);
    }
    return events;
  }

  function buildRoundDeck({facts,difficulty='medium',roundCount=10,seed}){
    if(!Array.isArray(facts))throw new TypeError('facts must be an array');
    if(![5,10,15].includes(Number(roundCount)))throw new Error(`Unsupported round count: ${roundCount}`);
    const random=seededRandom(seed);
    const events=groupFacts(facts);
    const eligible=[...events.entries()].filter(([,variants])=>difficulty==='mixed'?LEVELS.every(level=>variants.has(level)):variants.has(difficulty));
    if(eligible.length<roundCount)throw new Error(`Not enough unique events for ${difficulty}: need ${roundCount}, found ${eligible.length}`);
    const chosen=shuffle(eligible,random).slice(0,roundCount);
    const levels=difficulty==='mixed'?arrangeMixed(MIXED_COUNTS[roundCount],random):Array(roundCount).fill(difficulty);
    const deck=chosen.map(([eventId,variants],index)=>{
      const level=levels[index];
      const fact=variants.get(level);
      return Object.freeze({roundNumber:index+1,eventId,variantId:fact.variantId,difficulty:level,fact});
    });
    const ids=new Set(deck.map(item=>item.eventId));
    if(ids.size!==deck.length)throw new Error('Round deck contains a repeated event');
    return Object.freeze(deck);
  }

  window.ChronoDeck=Object.freeze({buildRoundDeck,groupFacts,MIXED_COUNTS,LEVELS});
})();