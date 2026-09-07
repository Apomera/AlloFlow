import {mountFieldJourneys} from './app.mjs';
import styles from './styles.css';
import {selfAdvocacyJourney} from './sel-adapter.mjs';
import {createSessionStore} from './session-store.mjs';

// Capture this plugin's versioned asset location while its script executes.
const moduleUrl=document.currentScript?.src;
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
  React.useEffect(()=>{
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
      :host([data-theme="contrast"]){--ink:#fff;--muted:#eee;--paper:#000;--line:#aaa;--accent:#fff;color-scheme:dark}
      :host([data-theme="contrast"]) :is(button,input,textarea,select,.scene,.campaign-card,.action,.location-info,.notice,.written-response,.encounter-panel,.encounter-feedback,.encounter-art){background:#000;color:#fff;border-color:#fff}
      :host([data-theme="contrast"]) :is(p,.scene-meta .eyebrow,.action-hint,.map-caption,.location-info p){color:#eee}
      :host([data-theme="contrast"]) button:focus-visible{outline-color:#ff0}
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
    const journey=mountFieldJourneys(root,{embedded:true,hub:kind,storage:sessionStore,sessionOnly:kind==='sel',ensureSound,adapters:kind==='sel'?[selfAdvocacyJourney]:undefined,initialCampaign:kind==='stem'?ctx.journeyEntry:null,returnToSource:ctx.journeyEntry?()=>ctx.setStemLabTool('waterCycle'):null,openRelatedTool:kind==='sel'?ctx.setSelHubTool:null});
    return ()=>{journey.destroy();window.removeEventListener('keydown',protectTyping,true);root.replaceChildren();};
  },[]);
  return React.createElement('div',{
    ref:host,'data-field-journeys':'true','data-journey-hub':kind,'data-theme':typeof ctx.theme==='string'?ctx.theme:ctx.isContrast?'contrast':ctx.isDark?'dark':'light',
    style:{width:'100%',minWidth:0}
  });
}
