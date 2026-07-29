(()=>{
  const SELECTOR=[
    'button:not([disabled]):not([hidden])',
    'a[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function isVisible(element){
    if(!element||element.hidden)return false;
    const style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
  }

  function activeDialog(){
    return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
      .reverse()
      .find(dialog=>dialog.classList.contains('show')&&isVisible(dialog))||null;
  }

  function focusable(dialog){
    return [...dialog.querySelectorAll(SELECTOR)].filter(isVisible);
  }

  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const dialog=activeDialog();
    if(!dialog)return;
    const controls=focusable(dialog);
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
  },true);
})();
