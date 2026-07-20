window.CHRONO_FACTS=[];
for(const s of window.CHRONO_SEEDS){
  const[c,e,f,r,eh,mh,hh,p,lat,lng]=s;
  const context=f;
  window.CHRONO_FACTS.push(
    {difficulty:"easy",category:c,era:e,fact:r?`${f} This happened somewhere in ${r}.`:f,hint:eh,place:p,lat,lng,context},
    {difficulty:"medium",category:c,era:e,fact:f,hint:mh,place:p,lat,lng,context},
    {difficulty:"hard",category:c,era:e,fact:f,hint:hh,place:p,lat,lng,context}
  );
}
