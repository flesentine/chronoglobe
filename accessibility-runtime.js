(()=>{
  const openerIds=new Set(['startHowToBtn','howToBtn','menuHowToBtn']);
  const closerIds=new Set(['tutorialClose','tutorialGotIt']);
  let tutorialInvoker=null;

  const restoreFocus=()=>{
    const target=tutorialInvoker;
    tutorialInvoker=null;
    requestAnimationFrame(()=>{
      if(target?.isConnected&&!target.disabled)target.focus({preventScroll:true});
    });
  };

  document.addEventListener('click',event=>{
    const opener=event.target?.closest?.('button');
    if(opener&&openerIds.has(opener.id))tutorialInvoker=opener;

    const closer=event.target?.closest?.('button');
    const tutorial=document.getElementById('tutorial');
    if((closer&&closerIds.has(closer.id))||event.target===tutorial)restoreFocus();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.getElementById('tutorial')?.classList.contains('show'))restoreFocus();
  });
})();
