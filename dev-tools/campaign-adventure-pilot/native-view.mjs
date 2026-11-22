import {mountFieldJourneys} from './app.mjs';
import styles from './styles.css';
import {selfAdvocacyJourney} from './sel-adapter.mjs';
import {createSessionStore} from './session-store.mjs';

// Capture this plugin's versioned asset location while its script executes.
const moduleUrl=typeof document!=='undefined'?document.currentScript?.src:undefined;
async function ensureSound(){
  if(typeof window.AlloModules?.playGenerativeSoundscape==='function')return;
  if(!moduleUrl)throw new Error('Sound asset location is unavailable.');
  const url=new URL('../adventure_module.js',moduleUrl);
  url.search=new URL(moduleUrl).search;
  await window.StemLab.loadScriptResilient([url.href],{
    cacheKey:'field-journeys-adventure-sound',timeoutMs:15000,
    check:()=>typeof window.AlloModules?.playGenerativeSoundscape==='function'
  });
}
export function JourneyHost({ctx,kind='stem'}){
  const React=ctx.React,host=React.useRef(null);
  const [crisisTier,setCrisisTier]=React.useState(0);
  const onSafetyFlagRef=React.useRef(ctx.onSafetyFlag||null);
  onSafetyFlagRef.current=ctx.onSafetyFlag||null;
  const updateRef=React.useRef(ctx.update||null);
  updateRef.current=ctx.update||null;
  const setSelToolRef=React.useRef(ctx.setSelHubTool||null);
  setSelToolRef.current=ctx.setSelHubTool||null;
  const setStemToolRef=React.useRef(ctx.setStemLabTool||null);
  setStemToolRef.current=ctx.setStemLabTool||null;
  const lastFlaggedRef=React.useRef({text:'',at:0,blocked:false});
  React.useEffect(()=>{
    if(!host.current)return;
    const toolId=kind==='sel'?'practiceJourneys':'fieldJourneys';
    const toolName=kind==='sel'?'Practice Journeys':'Field Journeys';
    const onFreeText=text=>{
      const trimmed=String(text||'').trim();
      if(!trimmed)return false;
      const now=Date.now();
      if(lastFlaggedRef.current.text===trimmed&&now-lastFlaggedRef.current.at<1500){
        return lastFlaggedRef.current.blocked;
      }
      const onFlag=typeof onSafetyFlagRef.current==='function'?onSafetyFlagRef.current:null;
      let blocked=false;
      if(window.SelHub&&typeof window.SelHub.safeRehearseCheck==='function'){
        const chk=window.SelHub.safeRehearseCheck(trimmed,{toolId,onSafetyFlag:onFlag});
        if(chk&&chk.action==='block')blocked=true;
      }else{
        const checker=(window.__alloShared&&window.__alloShared.SafetyContentChecker)||window.SafetyContentChecker||null;
        let flags=null;
        try{flags=(checker&&checker.check)?checker.check(trimmed):null;}catch(_){flags=null;}
        if(Array.isArray(flags)&&flags.length){
          const rank={low:1,medium:2,high:3,critical:4};
          const top=flags.reduce((a,f)=>(f&&(rank[f.severity]||0)>(rank[a.severity]||0))?f:a,flags[0]||{});
          if(onFlag){try{onFlag(Object.assign({},top,{source:(kind==='sel'?'sel_rehearse_':'stem_')+toolId,context:trimmed.slice(0,100),aiGenerated:false}));}catch(_){}}
          if(top.severity==='critical')blocked=true;
        }
      }
      if(!blocked&&window.SelHub&&typeof window.SelHub.scanForCrisis==='function'){
        const scan=window.SelHub.scanForCrisis(trimmed);
        if(scan&&(scan.triggered||scan.tier>=3)){
          blocked=true;
          if(onFlag){try{onFlag({toolId,tier:3,snippet:trimmed.slice(0,120)});}catch(_){}}
        }
      }
      lastFlaggedRef.current={text:trimmed,at:now,blocked};
      if(blocked){
        setCrisisTier(3);
        if(window.SelHub&&typeof window.SelHub.showCrisisModal==='function'){
          window.SelHub.showCrisisModal({toolName,contentSnippet:trimmed});
        }
      }
      return blocked;
    };
    const root=host.current.shadowRoot||host.current.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=styles.replace(':root{',':host{')+`
      :host{display:block;border-radius:12px;container-type:inline-size;line-height:1.5}
      main{min-height:0;padding:26px 0;margin:0 24px}
      .embedded-label{font-size:12px;letter-spacing:.06em;color:var(--muted);margin:0 0 20px}
      @container(max-width:720px){
        main{margin:0 16px;padding:22px 0}
        .campaign-grid,.journey,.journal{grid-template-columns:1fr;gap:22px}
        .journey-heading{display:block}.header-actions{margin-top:16px}
        .scene,.card-body{padding:20px}.card-body>p{min-height:0}
        .map-location{font-size:10px}.grove .map-location{min-height:44px}
        .grove .map-location span{max-width:58px;white-space:normal}
      }
      :host([data-theme="dark"]){--ink:#f1f5f9;--muted:#cbd5e1;--paper:#0f172a;--line:#334155;--control-line:#64748b;--accent:#34d399;color-scheme:dark}
      :host([data-theme="dark"]) :is(.scene,.campaign-card,.action,.written-response,.encounter-panel,input,textarea,select){background:#1e293b;color:#f1f5f9;border-color:#475569}
      :host([data-theme="dark"]) :is(.location-info,.encounter-feedback,.notice){background:#1e293b;color:#e2e8f0;border-color:#475569}
      :host([data-theme="dark"]) :is(.scene-body,.scene-meta .eyebrow,.location-info p){color:#cbd5e1}
      :host([data-theme="dark"]) .encounter-art{background:linear-gradient(135deg,#134e4a,#312e81);color:#f1f5f9}
      :host([data-theme="dark"]) button{background:#1e293b;color:#f1f5f9;border-color:#64748b}
      :host([data-theme="dark"]) button:hover:not(:disabled){background:#334155;color:#ffffff}
      :host([data-theme="dark"]) button.primary{background:#0d9488;color:#ffffff;border-color:#14b8a6}
      :host([data-theme="dark"]) button.primary:hover:not(:disabled){background:#0f766e;color:#ffffff}
      :host([data-theme="contrast"]){--ink:#fff;--muted:#eee;--paper:#000;--line:#ff0;--control-line:#ff0;--accent:#ff0;color-scheme:dark}
      :host([data-theme="contrast"]) :is(button,input,textarea,select,.scene,.campaign-card,.action,.location-info,.notice,.written-response,.encounter-panel,.encounter-feedback,.encounter-art){background:#000;color:#fff;border-color:#ff0}
      :host([data-theme="contrast"]) button:hover:not(:disabled),
      :host([data-theme="contrast"]) button.primary,
      :host([data-theme="contrast"]) button.primary:hover:not(:disabled){background:#ff0;color:#000;border-color:#ff0}
      :host([data-theme="contrast"]) button.primary .action-hint{color:#000}
      :host([data-theme="contrast"]) :is(p,.scene-meta .eyebrow,.action-hint,.map-caption,.location-info p){color:#eee}
      :host([data-theme="contrast"]) :is(button,a,input,textarea,select,summary,.receipts):focus-visible{outline:3px solid #ff0;outline-offset:4px}
      :host([data-theme="contrast"]) .map-location{background:#000;color:#fff}
      :host([data-theme="contrast"]) .map-location[aria-pressed=true]{outline:3px solid #ff0}
      @container(max-width:720px){.response-mode{align-items:start;flex-direction:column}.response-mode select{width:100%}}
    `;
    const main=document.createElement('main');main.id='main';main.tabIndex=-1;
    main.setAttribute('aria-label',kind==='sel'?'Practice Journeys pilot':'Field Journeys pilot');
    const announcer=document.createElement('div');announcer.id='announcer';announcer.className='sr-only';
    announcer.setAttribute('role','status');announcer.setAttribute('aria-live','polite');announcer.setAttribute('aria-atomic','true');
    root.replaceChildren(style,main,announcer);
    const protectTyping=event=>{
      const path=event.composedPath();
      if(path.includes(root.host)&&path.some(node=>node?.matches?.('input,textarea,select'))&&!['Tab','Escape'].includes(event.key))event.stopPropagation();
    };
    // Capture before document-level app shortcuts; native editing defaults still run.
    window.addEventListener('keydown',protectTyping,true);
    const sessionStore=kind==='sel'?createSessionStore(ctx.toolData?.practiceJourneys?.records,records=>{if(typeof updateRef.current==='function')updateRef.current('practiceJourneys','records',records);}):undefined;
    const journey=mountFieldJourneys(root,{embedded:true,hub:kind,storage:sessionStore,sessionOnly:kind==='sel',ensureSound,adapters:kind==='sel'?[selfAdvocacyJourney]:undefined,initialCampaign:kind==='stem'?ctx.journeyEntry:null,returnToSource:ctx.journeyEntry?()=>{if(typeof setStemToolRef.current==='function')setStemToolRef.current('waterCycle');}:null,openRelatedTool:kind==='sel'?(id=>{if(typeof setSelToolRef.current==='function')setSelToolRef.current(id);}):null,onFreeText});
    return ()=>{journey.destroy();window.removeEventListener('keydown',protectTyping,true);root.replaceChildren();};
  },[]);
  const crisisBanner=(crisisTier>=3&&window.SelHub&&typeof window.SelHub.renderCrisisResources==='function')
    ?window.SelHub.renderCrisisResources(React.createElement,ctx.gradeBand||'high'):null;
  const themeObj=ctx&&typeof ctx.theme==='object'&&ctx.theme!==null?ctx.theme:null;
  const resolvedTheme=typeof ctx.theme==='string'?ctx.theme:(ctx.isContrast||themeObj?.isContrast)?'contrast':(ctx.isDark||themeObj?.isDark)?'dark':'light';
  return React.createElement(React.Fragment,null,
    crisisBanner,
    React.createElement('div',{
      ref:host,'data-field-journeys':'true','data-journey-hub':kind,'data-theme':resolvedTheme,
      style:{width:'100%',minWidth:0}
    })
  );
}
