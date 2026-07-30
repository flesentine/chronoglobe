(()=>{
  const runtimeScripts=[...document.querySelectorAll('script[src="accessibility-runtime.js"]')];
  runtimeScripts.slice(1).forEach(script=>script.remove());
  if(window.__CHRONO_ACCESSIBILITY_RUNTIME__)return;
  window.__CHRONO_ACCESSIBILITY_RUNTIME__=true;

  const openerIds=new Set(['startHowToBtn','howToBtn','menuHowToBtn']);
  const closerIds=new Set(['tutorialClose','tutorialGotIt']);
  const dialogCloseIds=new Set(['tutorialClose','tutorialGotIt','menuClose','resumeBtn','cancelNewGameBtn','confirmNewGameBtn','cancelHintBtn','confirmHintBtn','resumeSavedBtn','discardSavedBtn','playAgainBtn']);
  const dialogTransitionIds=new Set(['newGameBtn','menuHowToBtn']);
  const focusableSelector=['button:not([disabled]):not([hidden])','a[href]','input:not([disabled]):not([type="hidden"])','select:not([disabled])','textarea:not([disabled])','[tabindex]:not([tabindex="-1"])'].join(',');
  const isolated=new Map();
  let tutorialInvoker=null;

  const isVisible=element=>{
    if(!element||element.hidden)return false;
    const style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
  };

  const activeDialog=()=>[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].reverse().find(dialog=>dialog.classList.contains('show')&&isVisible(dialog))||null;

  const restoreBackground=()=>{
    for(const [element,previous] of isolated){
      if(previous.inert)element.setAttribute('inert','');else element.removeAttribute('inert');
      if(previous.ariaHidden===null)element.removeAttribute('aria-hidden');else element.setAttribute('aria-hidden',previous.ariaHidden);
    }
    isolated.clear();
  };

  const syncModalIsolation=()=>{
    restoreBackground();
    const dialog=activeDialog();
    if(!dialog)return;
    for(const element of document.body.children){
      if(element===dialog||element.tagName==='SCRIPT'||element.tagName==='STYLE')continue;
      isolated.set(element,{inert:element.hasAttribute('inert'),ariaHidden:element.getAttribute('aria-hidden')});
      element.setAttribute('inert','');
      element.setAttribute('aria-hidden','true');
    }
  };

  const restoreFocus=()=>{
    const target=tutorialInvoker;
    tutorialInvoker=null;
    requestAnimationFrame(()=>{if(target?.isConnected&&!target.disabled)target.focus({preventScroll:true});});
  };

  const trapFocus=event=>{
    const dialog=activeDialog();
    if(!dialog)return;
    const controls=[...dialog.querySelectorAll(focusableSelector)].filter(isVisible);
    if(!controls.length){event.preventDefault();dialog.setAttribute('tabindex','-1');dialog.focus({preventScroll:true});return;}
    const first=controls[0],last=controls.at(-1),current=document.activeElement;
    if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(current===last||!dialog.contains(current))){event.preventDefault();first.focus();}
  };

  const watchDialogs=()=>{
    const endScreen=document.getElementById('endScreen');
    const endTitle=document.getElementById('endTitle');
    const observer=new MutationObserver(records=>{
      syncModalIsolation();
      if(records.some(record=>record.target===endScreen)&&endScreen?.classList.contains('show'))requestAnimationFrame(()=>endTitle?.focus({preventScroll:true}));
    });
    document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['class']}));
    syncModalIsolation();
  };

  document.addEventListener('click',event=>{
    const dialog=activeDialog();
    const button=event.target?.closest?.('button');
    if(dialog&&((button&&(dialogCloseIds.has(button.id)||dialogTransitionIds.has(button.id)))||(dialog.id==='tutorial'&&event.target===dialog)))restoreBackground();
  },true);

  document.addEventListener('click',event=>{
    const opener=event.target?.closest?.('button');
    if(opener&&openerIds.has(opener.id))tutorialInvoker=opener;
    const closer=event.target?.closest?.('button');
    const tutorial=document.getElementById('tutorial');
    if((closer&&closerIds.has(closer.id))||event.target===tutorial)restoreFocus();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeDialog()?.id!=='endScreen')restoreBackground();
    if(event.key==='Tab')trapFocus(event);
    if(event.key==='Escape'&&document.getElementById('tutorial')?.classList.contains('show'))restoreFocus();
  },true);

  watchDialogs();
})();