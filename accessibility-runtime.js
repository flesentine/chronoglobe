(()=>{
  const openerIds=new Set(['startHowToBtn','howToBtn','menuHowToBtn']);
  const closerIds=new Set(['tutorialClose','tutorialGotIt']);
  const focusableSelector=[
    'button:not([disabled]):not([hidden])',
    'a[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  let tutorialInvoker=null;

  const isVisible=element=>{
    if(!element||element.hidden)return false;
    const style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
  };

  const activeDialog=()=>[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .reverse()
    .find(dialog=>dialog.classList.contains('show')&&isVisible(dialog))||null;

  const restoreFocus=()=>{
    const target=tutorialInvoker;
    tutorialInvoker=null;
    requestAnimationFrame(()=>{
      if(target?.isConnected&&!target.disabled)target.focus({preventScroll:true});
    });
  };

  const trapFocus=event=>{
    const dialog=activeDialog();
    if(!dialog)return;
    const controls=[...dialog.querySelectorAll(focusableSelector)].filter(isVisible);
    if(!controls.length){
      event.preventDefault();
      dialog.setAttribute('tabindex','-1');
      dialog.focus({preventScroll:true});
      return;
    }

    const first=controls[0];
    const last=controls.at(-1);
    const current=document.activeElement;
    if(event.shiftKey&&(current===first||!dialog.contains(current))){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&(current===last||!dialog.contains(current))){
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('click',event=>{
    const opener=event.target?.closest?.('button');
    if(opener&&openerIds.has(opener.id))tutorialInvoker=opener;

    const closer=event.target?.closest?.('button');
    const tutorial=document.getElementById('tutorial');
    if((closer&&closerIds.has(closer.id))||event.target===tutorial)restoreFocus();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Tab')trapFocus(event);
    if(event.key==='Escape'&&document.getElementById('tutorial')?.classList.contains('show'))restoreFocus();
  },true);
})();
