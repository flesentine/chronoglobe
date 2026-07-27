(()=>{
  'use strict';

  const ACTIVE_EVENT_COUNT=150;
  const seeds=(window.CHRONO_SEEDS||[]).slice(0,ACTIVE_EVENT_COUNT);
  const supplementalOverrides={
    'chrono-event-101':{fact:'A port on the lower Ganges became the early capital of British India and a center of Bengali intellectual and cultural renewal.',hint:'The city was formerly known in English as Calcutta.'},
    'chrono-event-102':{fact:'A trading company defeated the nawab of Bengal in a battle that opened the way to territorial empire in India.',hint:'Robert Clive’s victory over Siraj ud-Daulah identifies the battlefield.'},
    'chrono-event-103':{fact:'A wandering seeker attained enlightenment beneath a sacred fig tree and became known as the Buddha.',hint:'The Mahabodhi Temple marks the site in Bihar.'},
    'chrono-event-104':{fact:'A vast Buddhist monastic university drew students and scholars from across Asia for centuries.',hint:'The Chinese pilgrim Xuanzang studied at this center in Bihar.'},
    'chrono-event-105':{fact:'A ruler built a fortified palace atop a towering rock, surrounding it with gardens, frescoes, and monumental approaches.',hint:'The Sri Lankan citadel is known as Lion Rock.'},
    'chrono-event-106':{fact:'An ancient Sri Lankan capital became a major center of Buddhist pilgrimage, stupas, and royal patronage.',hint:'Its sacred bodhi tree is among the site’s defining landmarks.'},
    'chrono-event-107':{fact:'Tradition identifies a garden marked by an Ashokan pillar as the birthplace of Siddhartha Gautama.',hint:'The pilgrimage site lies in southern Nepal near the Indian border.'},
    'chrono-event-108':{fact:'A high-altitude city became the political and religious seat of the Dalai Lamas.',hint:'The Potala Palace rises above this city on the Tibetan Plateau.'},
    'chrono-event-109':{fact:'Farmers digging a well uncovered thousands of life-sized clay soldiers arranged to guard the tomb of China’s first emperor.',hint:'The buried army belongs to Qin Shi Huang near Xi’an.'},
    'chrono-event-110':{fact:'Patrons carved vast numbers of Buddhist images into limestone cliffs beside a river near an imperial capital.',hint:'These are the Longmen Grottoes near Luoyang.'},
    'chrono-event-111':{fact:'A Ming emperor shifted the capital north and built an immense palace complex at its ceremonial center.',hint:'The Forbidden City identifies the modern capital.'},
    'chrono-event-112':{fact:'A student-led protest movement occupied a vast ceremonial square before a violent military crackdown in 1989.',hint:'The square lies immediately south of the Forbidden City.'},
    'chrono-event-113':{fact:'After capturing a former Chinese capital, invading troops committed mass killings and widespread atrocities.',hint:'The event is remembered as the Nanjing Massacre.'},
    'chrono-event-114':{fact:'A major harbor ended more than a century of British rule and returned to Chinese sovereignty under a special administrative arrangement.',hint:'The 1997 handover occurred on the South China coast.'},
    'chrono-event-115':{fact:'A former Portuguese-administered port returned to Chinese sovereignty at the end of the twentieth century.',hint:'The enclave lies west of Hong Kong on the Pearl River delta.'},
    'chrono-event-116':{fact:'A Mongol imperial capital welcomed envoys, craftsmen, merchants, and representatives of many religions.',hint:'Ögedei Khan established this center in central Mongolia.'},
    'chrono-event-117':{fact:'Peaceful demonstrations in a capital once known as Urga helped end one-party communist rule.',hint:'The city is now Mongolia’s capital.'},
    'chrono-event-118':{fact:'Negotiators signed an armistice that stopped major fighting on a divided peninsula without creating a peace treaty.',hint:'The truce village sits within the Korean Demilitarized Zone.'},
    'chrono-event-119':{fact:'A defensive perimeter around a southeastern port preserved the final major foothold before a United Nations counteroffensive.',hint:'The city gave its older English name to the perimeter.'},
    'chrono-event-120':{fact:'An emperor moved to the former city of Edo as Japan began rapid political, military, and industrial transformation.',hint:'The city’s new name means eastern capital.'},
    'chrono-event-121':{fact:'The first atomic bomb used in war destroyed much of a Japanese city in August 1945.',hint:'The Peace Memorial and its surviving dome identify the location.'},
    'chrono-event-122':{fact:'For more than a millennium, an imperial capital shaped Japanese court culture, temple architecture, gardens, and traditional arts.',hint:'Kiyomizu-dera and the Golden Pavilion stand in this former capital.'},
    'chrono-event-123':{fact:'An early Japanese capital built a monumental wooden temple housing a colossal bronze Buddha.',hint:'Tōdai-ji is the defining landmark.'},
    'chrono-event-124':{fact:'Japan’s first durable warrior government established its headquarters in a coastal city south of the imperial court.',hint:'The Kamakura shogunate took its name from this city.'},
    'chrono-event-125':{fact:'A long and costly island campaign became the final major land battle of the Pacific War.',hint:'The battle took place in the Ryukyu Islands south of Japan’s main islands.'}
  };
  const expertOverrides=Object.freeze({...supplementalOverrides,...(window.CHRONO_EXPERT_OVERRIDES||{})});

  function eventFromSeed(seed,index){
    const [category,era,baseFact,region,easyHint,mediumHint,hardHint,place,lat,lng]=seed;
    const eventId=`chrono-event-${String(index+1).padStart(3,'0')}`;
    const reviewedExpert=expertOverrides[eventId];
    return Object.freeze({
      eventId,
      place,
      lat,
      lng,
      category,
      era,
      context:baseFact,
      migration:Object.freeze({source:'legacy-seed',sourceIndex:index,status:reviewedExpert?'expert-reviewed':'generated'}),
      variants:Object.freeze({
        easy:Object.freeze({variantId:`${eventId}-easy`,fact:region?`${baseFact} This happened somewhere in ${region}.`:baseFact,hint:easyHint}),
        medium:Object.freeze({variantId:`${eventId}-medium`,fact:baseFact,hint:mediumHint}),
        hard:Object.freeze({variantId:`${eventId}-hard`,fact:baseFact,hint:hardHint}),
        expert:Object.freeze({
          variantId:`${eventId}-expert`,
          fact:reviewedExpert?.fact||baseFact,
          hint:reviewedExpert?.hint||'No regional clue at this level. Identify the exact historical site from the event itself.',
          reviewed:Boolean(reviewedExpert)
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

  function expandAll(source=events){return Object.freeze(source.flatMap(expandEvent))}

  window.CHRONO_CANONICAL_EVENTS=events;
  window.ChronoCanonical=Object.freeze({ACTIVE_EVENT_COUNT,eventFromSeed,expandEvent,expandAll});
})();