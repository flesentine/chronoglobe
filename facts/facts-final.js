window.CHRONO_FACTS=[];

const CHRONO_TARGET_PER_LEVEL=150;
const CHRONO_SEED_SET=(window.CHRONO_SEEDS||[]).slice(0,CHRONO_TARGET_PER_LEVEL);

for(const [index,s] of CHRONO_SEED_SET.entries()){
  const[c,e,f,r,eh,mh,hh,p,lat,lng]=s;
  const context=f;
  const eventId=`chrono-event-${String(index+1).padStart(3,"0")}`;

  window.CHRONO_FACTS.push(
    {
      eventId,
      variantId:`${eventId}-easy`,
      difficulty:"easy",
      category:c,
      era:e,
      fact:r?`${f} This happened somewhere in ${r}.`:f,
      hint:eh,
      place:p,
      lat,
      lng,
      context
    },
    {
      eventId,
      variantId:`${eventId}-medium`,
      difficulty:"medium",
      category:c,
      era:e,
      fact:f,
      hint:mh,
      place:p,
      lat,
      lng,
      context
    },
    {
      eventId,
      variantId:`${eventId}-hard`,
      difficulty:"hard",
      category:c,
      era:e,
      fact:f,
      hint:hh,
      place:p,
      lat,
      lng,
      context
    },
    {
      eventId,
      variantId:`${eventId}-expert`,
      difficulty:"expert",
      category:"Mystery",
      era:"Hidden",
      fact:f,
      hint:"No regional clue at this level. Identify the exact historical site from the event itself.",
      place:p,
      lat,
      lng,
      context
    }
  );
}

const CHRONO_COUNTS=window.CHRONO_FACTS.reduce((counts,item)=>{
  counts[item.difficulty]=(counts[item.difficulty]||0)+1;
  return counts;
},{});

const CHRONO_EVENT_IDS=new Set(window.CHRONO_FACTS.map(item=>item.eventId));
const CHRONO_VARIANT_IDS=new Set(window.CHRONO_FACTS.map(item=>item.variantId));
const CHRONO_VALID=
  window.CHRONO_FACTS.length===600&&
  CHRONO_EVENT_IDS.size===150&&
  CHRONO_VARIANT_IDS.size===600&&
  ["easy","medium","hard","expert"].every(level=>CHRONO_COUNTS[level]===150)&&
  window.CHRONO_FACTS.every(item=>
    item.eventId&&item.variantId&&item.fact&&item.hint&&item.place&&
    Number.isFinite(item.lat)&&Number.isFinite(item.lng)&&
    item.lat>=-90&&item.lat<=90&&item.lng>=-180&&item.lng<=180
  );

if(!CHRONO_VALID){
  console.error("ChronoGlobe dataset validation failed",{
    total:window.CHRONO_FACTS.length,
    events:CHRONO_EVENT_IDS.size,
    variants:CHRONO_VARIANT_IDS.size,
    counts:CHRONO_COUNTS
  });
}