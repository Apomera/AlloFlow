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
  React.useEffect(()=>{
    const toolId=kind==='sel'?'practiceJourneys':'fieldJourneys';
    const toolName=kind==='sel'?'Practice Journeys':'Field Journeys';
    const onFreeText=text=>{
      const trimmed=String(text||'').trim();
      if(!trimmed)return false;
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
        if(scan&&scan.triggered){
          blocked=true;
          if(onFlag){try{onFlag({toolId,tier:3,snippet:trimmed.slice(0,120)});}catch(_){}}
        }
      }
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
      :host([data-theme="contrast"]){--ink:#fff;--muted:#eee;--paper:#000;--line:#aaa;--control-line:#aaa;--accent:#fff;color-scheme:dark}
      :host([data-theme="contrast"]) :is(button,input,textarea,select,.scene,.campaign-card,.action,.location-info,.notice,.written-response,.encounter-panel,.encounter-feedback,.encounter-art){background:#000;color:#fff;border-color:#fff}
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
    const sessionStore=kind==='sel'?createSessionStore(ctx.toolData?.practiceJourneys?.records,records=>ctx.update('practiceJourneys','records',records)):undefined;
    const journey=mountFieldJourneys(root,{embedded:true,hub:kind,storage:sessionStore,sessionOnly:kind==='sel',ensureSound,adapters:kind==='sel'?[selfAdvocacyJourney]:undefined,initialCampaign:kind==='stem'?ctx.journeyEntry:null,returnToSource:ctx.journeyEntry?()=>ctx.setStemLabTool('waterCycle'):null,openRelatedTool:kind==='sel'?ctx.setSelHubTool:null,onFreeText});
    return ()=>{journey.destroy();window.removeEventListener('keydown',protectTyping,true);root.replaceChildren();};
  },[]);
  const crisisBanner=(crisisTier>=3&&window.SelHub&&typeof window.SelHub.renderCrisisResources==='function')
    ?window.SelHub.renderCrisisResources(React.createElement,ctx.gradeBand||'high'):null;
  return React.createElement(React.Fragment,null,
    crisisBanner,
    React.createElement('div',{
      ref:host,'data-field-journeys':'true','data-journey-hub':kind,'data-theme':typeof ctx.theme==='string'?ctx.theme:ctx.isContrast?'contrast':ctx.isDark?'dark':'light',
      style:{width:'100%',minWidth:0}
    })
  );
}
