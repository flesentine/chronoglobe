window.CHRONO_FACTS=[];

const CHRONO_TARGET_PER_LEVEL=150;
const CHRONO_SEED_SET=(window.CHRONO_SEEDS||[]).slice(0,CHRONO_TARGET_PER_LEVEL);

for(const s of CHRONO_SEED_SET){
  const[c,e,f,r,eh,mh,hh,p,lat,lng]=s;
  const context=f;

  window.CHRONO_FACTS.push(
    {
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

const CHRONO_VALID=
  window.CHRONO_FACTS.length===600&&
  ["easy","medium","hard","expert"].every(level=>CHRONO_COUNTS[level]===150)&&
  window.CHRONO_FACTS.every(item=>
    item.fact&&item.hint&&item.place&&
    Number.isFinite(item.lat)&&Number.isFinite(item.lng)
  );

if(!CHRONO_VALID){
  console.error("ChronoGlobe dataset validation failed",{
    total:window.CHRONO_FACTS.length,
    counts:CHRONO_COUNTS
  });
}
