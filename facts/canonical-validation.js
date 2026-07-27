(()=>{
  'use strict';

  const DIFFICULTIES=['easy','medium','hard','expert'];

  function issue(severity,code,message,eventId=null){return {severity,code,message,eventId}}

  function validate(events,legacyFacts=[]){
    const issues=[];
    if(!Array.isArray(events))return {ok:false,issues:[issue('error','EVENTS_NOT_ARRAY','Canonical events must be an array.')],summary:{}};

    const eventIds=new Set();
    const variantIds=new Set();
    const placeCounts=new Map();
    const coordinateCounts=new Map();

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

      if(event?.variants?.expert?.fact===event?.variants?.hard?.fact){
        issues.push(issue('warning','EXPERT_REUSES_HARD','Expert currently reuses the Hard clue.',event?.eventId));
      }
      if(event?.variants?.expert?.hint==='No regional clue at this level. Identify the exact historical site from the event itself.'){
        issues.push(issue('warning','GENERIC_EXPERT_HINT','Expert uses the generic migration hint.',event?.eventId));
      }
    }

    for(const [place,count] of placeCounts)if(count>1)issues.push(issue('info','DUPLICATE_PLACE',`${count} events use place “${place}”.`));
    for(const [coordinates,count] of coordinateCounts)if(count>1)issues.push(issue('warning','DUPLICATE_COORDINATES',`${count} events use coordinates ${coordinates}.`));

    let parityMismatches=0;
    if(window.ChronoCanonical&&Array.isArray(legacyFacts)&&legacyFacts.length){
      const expanded=window.ChronoCanonical.expandAll(events);
      const fields=['eventId','variantId','difficulty','category','era','fact','hint','place','lat','lng','context'];
      if(expanded.length!==legacyFacts.length){
        issues.push(issue('error','PARITY_LENGTH',`Canonical expansion has ${expanded.length} records; legacy has ${legacyFacts.length}.`));
        parityMismatches++;
      }
      const count=Math.min(expanded.length,legacyFacts.length);
      for(let index=0;index<count;index++){
        for(const field of fields){
          if(expanded[index][field]!==legacyFacts[index][field]){
            parityMismatches++;
            if(parityMismatches<=25)issues.push(issue('error','PARITY_MISMATCH',`Record ${index+1} field ${field} differs.`,expanded[index].eventId));
          }
        }
      }
      if(parityMismatches>25)issues.push(issue('error','PARITY_MISMATCH_MORE',`${parityMismatches-25} additional parity mismatches were suppressed.`));
    }

    const counts=issues.reduce((acc,item)=>{acc[item.severity]=(acc[item.severity]||0)+1;return acc},{error:0,warning:0,info:0});
    const summary={events:events.length,variants:variantIds.size,errors:counts.error,warnings:counts.warning,info:counts.info,parityMismatches};
    return {ok:counts.error===0,issues,summary};
  }

  window.ChronoCanonicalValidation=Object.freeze({validate,DIFFICULTIES});
})();