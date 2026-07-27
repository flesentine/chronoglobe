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
    'chrono-event-125':{fact:'A long and costly island campaign became the final major land battle of the Pacific War.',hint:'The battle took place in the Ryukyu Islands south of Japan’s main islands.'},
    'chrono-event-126':{fact:'A surprise carrier-based air attack devastated a United States naval base and brought the country directly into the Second World War.',hint:'The attack occurred on Oahu on December 7, 1941.'},
    'chrono-event-127':{fact:'American carrier aircraft sank four Japanese fleet carriers in a battle that shifted the strategic balance in the Pacific.',hint:'The engagement took its name from a remote atoll northwest of Hawaii.'},
    'chrono-event-128':{fact:'A European expedition commander was killed while intervening in a conflict between island communities in the central Philippines.',hint:'Ferdinand Magellan died on an island beside Cebu.'},
    'chrono-event-129':{fact:'A month of street fighting, artillery fire, and massacres devastated a major capital during the closing months of the Pacific War.',hint:'The battle destroyed much of the capital of the Philippines.'},
    'chrono-event-130':{fact:'Generations of mountain farmers shaped steep slopes into vast irrigated rice terraces.',hint:'The terraces are associated with the Ifugao people of northern Luzon.'},
    'chrono-event-131':{fact:'A Khmer ruler created an immense temple complex whose towers became a national emblem.',hint:'The best-known monument is Angkor Wat.'},
    'chrono-event-132':{fact:'Thousands of massive stone vessels lie scattered across upland fields, while their original function remains uncertain.',hint:'The megalithic landscape lies near Phonsavan in Laos.'},
    'chrono-event-133':{fact:'A revolutionary leader proclaimed independence before a crowd after Japanese surrender ended the Second World War.',hint:'Ho Chi Minh read the declaration in the capital of northern Vietnam.'},
    'chrono-event-134':{fact:'A French colonial garrison surrendered after a prolonged siege in a remote valley, accelerating the end of French rule in Indochina.',hint:'The 1954 battlefield lies in northwestern Vietnam.'},
    'chrono-event-135':{fact:'An imperial citadel became the scene of prolonged urban combat and mass death during a major 1968 offensive.',hint:'The fighting occurred in Vietnam’s former imperial capital during Tet.'},
    'chrono-event-136':{fact:'A new royal capital was founded beside a major river and organized around a fortified palace complex.',hint:'The city grew on the Chao Phraya after 1782.'},
    'chrono-event-137':{fact:'Kings and patrons filled a broad plain beside a great river with thousands of Buddhist temples and stupas.',hint:'The archaeological landscape lies beside the Irrawaddy in Myanmar.'},
    'chrono-event-138':{fact:'Mass demonstrations challenged military rule in a former colonial capital during the nationwide uprising of 1988.',hint:'The city was formerly known as Rangoon.'},
    'chrono-event-139':{fact:'A Hindu temple complex dedicated to Shiva, Vishnu, and Brahma rose on the plains of central Java.',hint:'The tall sanctuary stands east of Borobudur near Yogyakarta.'},
    'chrono-event-140':{fact:'A Dutch chartered company established its Asian headquarters in a fortified port once called Batavia.',hint:'The colonial city later became Indonesia’s capital.'},
    'chrono-event-141':{fact:'A British trading post founded at a strategic maritime choke point grew into one of the world’s busiest ports.',hint:'Stamford Raffles established the settlement in 1819.'},
    'chrono-event-142':{fact:'A wealthy sultanate controlled a narrow sea passage that connected the Indian Ocean with East Asian trade.',hint:'The port gave its name to the strait.'},
    'chrono-event-143':{fact:'A European expedition made an early recorded landing on Australia’s eastern coast and collected unfamiliar plant specimens.',hint:'The bay’s modern name reflects the expedition’s botanical collecting.'},
    'chrono-event-144':{fact:'Gold miners built a defensive stockade during a confrontation over mining licenses and demands for political representation.',hint:'The 1854 rebellion occurred near Ballarat in Victoria.'},
    'chrono-event-145':{fact:'Representatives of the British Crown and many Māori chiefs signed an agreement that became foundational to New Zealand’s constitutional history.',hint:'The treaty took the name of its signing place in the Bay of Islands.'},
    'chrono-event-146':{fact:'Geysers, hot springs, and nearby Māori communities made a geothermal district a major center of tourism and cultural performance.',hint:'The North Island city is closely associated with the Whakarewarewa thermal area.'},
    'chrono-event-147':{fact:'An Andean imperial capital organized distant territories through roads, storehouses, temples, and royal estates.',hint:'The city was the political heart of the Inca Empire.'},
    'chrono-event-148':{fact:'An Inca royal estate occupied a dramatic ridge above the winding Urubamba River and survived the Spanish conquest largely unknown to outsiders.',hint:'The mountain sanctuary is reached from the former Inca capital.'},
    'chrono-event-149':{fact:'Desert communities created immense animals, lines, and geometric figures by removing dark surface stones.',hint:'The geoglyphs spread across an arid plain in southern Peru.'},
    'chrono-event-150':{fact:'A monumental high-altitude city near a great lake became the center of a powerful pre-Inca state.',hint:'The Gateway of the Sun is its best-known monument.'}
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