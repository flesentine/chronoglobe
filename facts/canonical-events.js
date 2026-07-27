(()=>{
  'use strict';

  const ACTIVE_EVENT_COUNT=150;
  const seeds=(window.CHRONO_SEEDS||[]).slice(0,ACTIVE_EVENT_COUNT);

  function eventFromSeed(seed,index){
    const [category,era,baseFact,region,easyHint,mediumHint,hardHint,place,lat,lng]=seed;
    const eventId=`chrono-event-${String(index+1).padStart(3,'0')}`;
    return Object.freeze({
      eventId,
      place,
      lat,
      lng,
      category,
      era,
      context:baseFact,
      migration:Object.freeze({source:'legacy-seed',sourceIndex:index,status:'generated'}),
      variants:Object.freeze({
        easy:Object.freeze({
          variantId:`${eventId}-easy`,
          fact:region?`${baseFact} This happened somewhere in ${region}.`:baseFact,
          hint:easyHint
        }),
        medium:Object.freeze({
          variantId:`${eventId}-medium`,
          fact:baseFact,
          hint:mediumHint
        }),
        hard:Object.freeze({
          variantId:`${eventId}-hard`,
          fact:baseFact,
          hint:hardHint
        }),
        expert:Object.freeze({
          variantId:`${eventId}-expert`,
          fact:baseFact,
          hint:'No regional clue at this level. Identify the exact historical site from the event itself.'
        })
      })
    });
  }

  const events=Object.freeze(seeds.map(eventFromSeed));

  function expandEvent(event){
    return ['easy','medium','hard','expert'].map(difficulty=>{
      const variant=event.variants[difficulty];
      return Object.freeze({
        eventId:event.eventId,
        variantId:variant.variantId,
        difficulty,
        category:difficulty==='expert'?'Mystery':event.category,
        era:difficulty==='expert'?'Hidden':event.era,
        fact:variant.fact,
        hint:variant.hint,
        place:event.place,
        lat:event.lat,
        lng:event.lng,
        context:event.context
      });
    });
  }

  function expandAll(source=events){
    return Object.freeze(source.flatMap(expandEvent));
  }

  window.CHRONO_CANONICAL_EVENTS=events;
  window.ChronoCanonical=Object.freeze({ACTIVE_EVENT_COUNT,eventFromSeed,expandEvent,expandAll});
})();