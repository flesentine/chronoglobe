(()=>{
  const ROUND_MAX=10000;
  const HINT_CAP=8000;

  function distanceScore(distanceKm){
    if(!Number.isFinite(distanceKm)||distanceKm<0)throw new TypeError('distanceKm must be a non-negative number');
    if(distanceKm<.25)return 10000;
    if(distanceKm<1)return 9000;
    return Math.max(0,Math.round(10000*Math.exp(-distanceKm/1800)));
  }

  function accuracyTier(score){
    if(score>=9000)return {id:'bullseye',label:'Bullseye'};
    if(score>=7000)return {id:'excellent',label:'Excellent'};
    if(score>=5000)return {id:'strong',label:'Strong'};
    if(score>=2000)return {id:'in-region',label:'In the region'};
    return {id:'far-off',label:'Far off'};
  }

  function roundResult(distanceKm,hintUsed=false){
    const rawScore=distanceScore(distanceKm);
    const roundCap=hintUsed?HINT_CAP:ROUND_MAX;
    const awardedScore=Math.min(rawScore,roundCap);
    const tier=accuracyTier(rawScore);
    return Object.freeze({
      distanceKm,
      distanceScore:rawScore,
      roundCap,
      awardedScore,
      accuracyTier:tier.id,
      accuracyLabel:tier.label,
      hintUsed:Boolean(hintUsed),
      streakContinued:rawScore>=5000
    });
  }

  window.ChronoScoring=Object.freeze({ROUND_MAX,HINT_CAP,distanceScore,accuracyTier,roundResult});
})();