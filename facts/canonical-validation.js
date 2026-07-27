(()=>{
  'use strict';

  const DIFFICULTIES=['easy','medium','hard','expert'];
  const GENERIC_EXPERT_HINT='No regional clue at this level. Identify the exact historical site from the event itself.';
  function issue(severity,code,message,eventId=null){return {severity,code,message,eventId}}

  function validate(events,legacyFacts=[]){
    const issues=[];
    if(!Array.isArray(events))return {ok:false,issues:[issue('error','EVENTS_NOT_ARRAY','Canonical events must be an array.')],summary:{}};

    const eventIds=new Set(),variantIds=new Set(),placeCounts=new Map(),coordinateCounts=new Map();
    let reviewedExperts=0;

    for(const event of events){
      if(!event?.eventId)issues.push(issue('error','MISSING_EVENT_ID','Event is missing eventId.'));
      else if(eventIds.has(event.eventId))issues.push(issue('error','DUPLICATE_EVENT_ID',`Duplicate eventId: ${event.eventId}`,event.eventId));
      else eventIds.add(event.eventId);
      if(!event?.place)issues.push(issue('error','MISSING_PLACE','Event is missing place.',event?.eventId));
      if(!Number.isFinite(event?.lat)||event.lat<-90||event.lat>90)issues.push(issue('error','INVALID_LATITUDE','Latitude is invalid.',event?.eventId));
      if(!Number.isFinite(event?.lng)||event.lng<-180||event.lng>180)issues.push(issue('error','INVALID_LONGITUDE','Longitude is invalid.',event?.eventId));
      if(!event?.category)issues.push(issue('error','MISSING_CATEGORY','Event is missing category.',event?.eventId));
      if(!event?.era)issues.push(issue('error','MISSING_ERA','Event is missing era.',event?.eventId));
      if(!event?.context)issues.push(issue('error','MISSING_CONTEXT','Event is missing context.',event?.eventId));

      const placeKey=String(event?.place||'').trim().toLowerCase();
      if(placeKey)placeCounts.set(placeKey,(placeCounts.get(placeKey)||0)+1);
      if(Number.isFinite(event?.lat)&&Number.isFinite(event?.lng)){
        const coordinateKey=`${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
        coordinateCounts.set(coordinateKey,(coordinateCounts.get(coordinateKey)||0)+1);
      }

      for(const difficulty of DIFFICULTIES){
        const variant=event?.variants?.[difficulty];
        if(!variant)issues.push(issue('error','MISSING_VARIANT',`Missing ${difficulty} variant.`,event?.eventId));
        else{
          if(!variant.variantId)issues.push(issue('error','MISSING_VARIANT_ID',`${difficulty} variant is missing variantId.`,event?.eventId));
          else if(variantIds.has(variant.variantId))issues.push(issue('error','DUPLICATE_VARIANT_ID',`Duplicate variantId: ${variant.variantId}`,event?.eventId));
          else variantIds.add(variant.variantId);
          if(!variant.fact)issues.push(issue('error','MISSING_FACT',`${difficulty} fact is empty.`,event?.eventId));
          if(!variant.hint)issues.push(issue('error','MISSING_HINT',`${difficulty} hint is empty.`,event?.eventId));
        }
      }

      const expert=event?.variants?.expert;
      if(expert?.reviewed)reviewedExperts++;
      else issues.push(issue('error','EXPERT_NOT_REVIEWED','Expert clue has not completed editorial review.',event?.eventId));
      if(expert?.fact===event?.variants?.hard?.fact)issues.push(issue('error','EXPERT_REUSES_HARD','Expert clue still repeats the Hard clue.',event?.eventId));
      if(!expert?.hint||expert.hint===GENERIC_EXPERT_HINT)issues.push(issue('error','GENERIC_EXPERT_HINT','Expert requires a specific reviewed hint.',event?.eventId));
    }

    if(events.length!==150)issues.push(issue('error','EVENT_COUNT',`Expected 150 canonical events; found ${events.length}.`));
    if(reviewedExperts!==events.length)issues.push(issue('error','EXPERT_REVIEW_INCOMPLETE',`Reviewed ${reviewedExperts} of ${events.length} Expert clues.`));
    for(const [place,count] of placeCounts)if(count>1)issues.push(issue('info','DUPLICATE_PLACE',`${count} events use place “${place}”.`));
    for(const [coordinates,count] of coordinateCounts)if(count>1)issues.push(issue('warning','DUPLICATE_COORDINATES',`${count} events use coordinates ${coordinates}.`));

    let parityMismatches=0,approvedEditorialDifferences=0;
    if(window.ChronoCanonical&&Array.isArray(legacyFacts)&&legacyFacts.length){
      const expanded=window.ChronoCanonical.expandAll(events);
      const fields=['eventId','variantId','difficulty','category','era','fact','hint','place','lat','lng','context'];
      if(expanded.length!==legacyFacts.length){issues.push(issue('error','PARITY_LENGTH',`Canonical expansion has ${expanded.length} records; legacy has ${legacyFacts.length}.`));parityMismatches++}
      const count=Math.min(expanded.length,legacyFacts.length);
      for(let index=0;index<count;index++){
        const event=events[Math.floor(index/4)],difficulty=expanded[index].difficulty;
        for(const field of fields){
          if(expanded[index][field]!==legacyFacts[index][field]){
            const approved=difficulty==='expert'&&event?.variants?.expert?.reviewed&&(field==='fact'||field==='hint');
            if(approved){approvedEditorialDifferences++;continue}
            parityMismatches++;
            if(parityMismatches<=25)issues.push(issue('error','PARITY_MISMATCH',`Record ${index+1} field ${field} differs.`,expanded[index].eventId));
          }
        }
      }
      if(parityMismatches>25)issues.push(issue('error','PARITY_MISMATCH_MORE',`${parityMismatches-25} additional parity mismatches were suppressed.`));
    }

    const counts=issues.reduce((acc,item)=>{acc[item.severity]=(acc[item.severity]||0)+1;return acc},{error:0,warning:0,info:0});
    const summary={events:events.length,variants:variantIds.size,reviewedExperts,remainingExperts:Math.max(0,events.length-reviewedExperts),errors:counts.error,warnings:counts.warning,info:counts.info,parityMismatches,approvedEditorialDifferences};
    return {ok:counts.error===0,issues,summary};
  }

  window.ChronoCanonicalValidation=Object.freeze({validate,DIFFICULTIES,GENERIC_EXPERT_HINT});
})();