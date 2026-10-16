const React=window.React;

// These toy blueprints identify a saved construction assignment. They are not
// a lesson diagram, a payment, or an additional control on the board.
function CommissionInsignia({theme}){
  return theme==='space'?<><circle cx="48" cy="28" r="4"/><ellipse cx="48" cy="28" rx="9" ry="3" transform="rotate(-25 48 28)"/></>:theme==='garden'?<><path d="M45 34q-7-12 10-15 0 11-10 15Z"/><path d="m45 34 7-11"/></>:theme==='archive'?<path d="m40 22 8-3 8 3v13l-8-3-8 3Zm8-3v13"/>:theme==='workshop'?<><path d="m48 18 9 10-9 10-9-10Z"/><circle cx="48" cy="28" r="3"/></>:<><path d="M48 18q-12 14 0 18 12-4 0-18Z"/><path d="M44 28q-1 4 3 5"/></>;
}

export function CommissionMiniature({theme='river'}){
  return <svg className="lb-commission-miniature" data-commission-miniature={theme} viewBox="0 0 96 80" aria-hidden="true">
    <ellipse className="lb-commission-shadow" cx="49" cy="70" rx="40" ry="7"/>
    <path className="lb-commission-desk-side" d="m11 39 37-17 38 17v12L48 69 11 51Z"/>
    <path className="lb-commission-desk-leg" d="M17 48v19l7 4V51m48 1v18l7-3V48M44 61v15l8-1V60"/>
    <path className="lb-commission-desk-top" d="m9 35 39-18 40 18-40 19Z"/>
    <path className="lb-commission-blueprint-edge" d="m21 31 27-14 29 13v5L48 49 21 36Z"/>
    <path className="lb-commission-blueprint" d="m21 28 27-14 29 13-29 15Z"/>
    <path className="lb-commission-grid" d="m29 28 23-11m-16 15 23-11m-16 15 23-11m-33-5 28 13m-21-17 28 13"/>
    <g className="lb-commission-insignia"><CommissionInsignia theme={theme}/></g>
    <path className="lb-commission-roll" d="m24 25 4-2 7 4-1 5-3 1-2-5Z M63 32l4-2 7 3v5l-4 2-2-5Z"/>
    <path className="lb-commission-pencil" d="m22 44 17-8 4 2-17 8-6 1Z"/>
    <path className="lb-commission-ribbon" d="m64 42-3 12 6-2 3 5 3-13Z"/>
    <circle className="lb-commission-seal" cx="69" cy="42" r="7"/>
    <path className="lb-commission-seal-mark" d="m65 42 3 3 5-6"/>
  </svg>;
}

export function CommissionMarker({projectId,theme='river'}){
  return <span className="lb-commission-marker" data-commission-marker={projectId} data-commission-theme={theme} aria-hidden="true"><svg viewBox="0 0 38 36">
    <path className="lb-commission-blueprint-edge" d="M4 7h25v23H4Z"/>
    <path className="lb-commission-blueprint" d="M2 4h25v23H2Z"/>
    <path className="lb-commission-grid" d="M6 10h16M6 15h11M6 20h11"/>
    <path className="lb-commission-ribbon" d="m23 23-2 12 6-3 5 3-1-13Z"/>
    <circle className="lb-commission-seal" cx="27" cy="22" r="8"/>
    <path className="lb-commission-seal-mark" d="m23 22 3 3 5-6"/>
  </svg></span>;
}

export function CommissionStyles(){return <style>{`
.lb .lb-commission-miniature,.lb .lb-commission-marker{--commission-desk:#d6b986;--commission-desk-side:#8a6640;--commission-paper:#e7f1ef;--commission-paper-edge:#7d9992;--commission-ink:#365e58;--commission-seal:#aa7132;--commission-seal-ink:#fff4d5;--commission-ribbon:#e3bd6b}
.lb [data-commission-miniature=garden],.lb [data-commission-theme=garden]{--commission-desk:#c4c99a;--commission-desk-side:#727d4e;--commission-paper:#eff1d9;--commission-paper-edge:#8b9a68;--commission-ink:#4c653d}
.lb [data-commission-miniature=workshop],.lb [data-commission-theme=workshop]{--commission-desk:#d6b29a;--commission-desk-side:#86614e;--commission-paper:#e0e9f0;--commission-paper-edge:#839aa9;--commission-ink:#456477}
.lb [data-commission-miniature=archive],.lb [data-commission-theme=archive]{--commission-desk:#c7afd0;--commission-desk-side:#7e6389;--commission-paper:#f2e9d4;--commission-paper-edge:#b5a17d;--commission-ink:#70563e}
.lb [data-commission-miniature=space],.lb [data-commission-theme=space]{--commission-desk:#b8c6df;--commission-desk-side:#687c9d;--commission-paper:#d9e9ef;--commission-paper-edge:#7a9ba8;--commission-ink:#365c71;--commission-seal:#8a6daf;--commission-ribbon:#bca7d8}
.lb .lb-commission-miniature{display:block;width:96px;height:80px;flex:none;overflow:visible}.lb .lb-commission-shadow{fill:#1f263026}.lb .lb-commission-desk-side,.lb .lb-commission-desk-leg{fill:var(--commission-desk-side)}.lb .lb-commission-desk-top{fill:var(--commission-desk);stroke:var(--commission-desk-side);stroke-width:1.5}.lb .lb-commission-blueprint-edge{fill:var(--commission-paper-edge);stroke:var(--commission-ink);stroke-width:1}.lb .lb-commission-blueprint,.lb .lb-commission-roll{fill:var(--commission-paper);stroke:var(--commission-ink);stroke-width:1}.lb .lb-commission-grid{fill:none;stroke:var(--commission-paper-edge);stroke-width:1}.lb .lb-commission-insignia{fill:var(--commission-paper);stroke:var(--commission-ink);stroke-width:1.7;stroke-linejoin:round}.lb .lb-commission-pencil{fill:var(--commission-seal);stroke:var(--commission-ink);stroke-width:.8}.lb .lb-commission-ribbon{fill:var(--commission-ribbon);stroke:var(--commission-seal);stroke-width:1}.lb .lb-commission-seal{fill:var(--commission-seal);stroke:var(--commission-paper);stroke-width:1.5}.lb .lb-commission-seal-mark{fill:none;stroke:var(--commission-seal-ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.lb .lb-commission-marker{position:absolute;right:-9px;top:-16px;width:29px;height:28px;pointer-events:none;z-index:5;transform:translateZ(21px) rotateY(calc(-1 * var(--camera-turn))) rotateX(calc(-1 * var(--camera-angle)));filter:drop-shadow(0 2px 1px var(--board-shadow))}.lb .lb-commission-marker>svg{display:block;width:100%;height:100%;overflow:visible}.lb .lb-spatial-project[data-commission-project=true]{border-style:solid!important;outline:2px dashed var(--gold);outline-offset:3px}.lb .lb-spatial-project[data-commission-project=true][aria-pressed=true]{outline:3px solid var(--accent)}.lb .lb-spatial-commission-note{border-inline-start:3px solid var(--gold);padding:8px 10px;background:var(--gold-soft);border-radius:0 8px 8px 0}.lb .lb-commission-list-label{color:var(--gold);font-weight:650}.lb .lb-event-commission{display:flex;align-items:flex-start;gap:9px;margin:8px 0;padding:10px;border:1px dashed var(--gold);border-radius:9px;background:var(--panel);overflow-wrap:anywhere}.lb .lb-event-commission>div{min-width:0}.lb .lb-event-commission .lb-commission-miniature{width:48px;height:40px}.lb .lb-event-commission strong{display:block}.lb .lb-event-commission button{min-height:44px;max-width:100%;white-space:normal;text-align:start;font-size:.82em}.lb [data-encounter-compact=true] .lb-event-commission{margin:7px 0 0;padding:8px;border-width:0;background:transparent}.lb [data-encounter-compact=true] .lb-event-commission .lb-commission-miniature{width:42px;height:35px}.lb [data-encounter-compact=true] .lb-event-commission>div{width:100%}
.dark .lb .lb-commission-shadow{fill:#0005}.dark .lb .lb-commission-miniature,.dark .lb .lb-commission-marker{--commission-seal:#af8245}.dark .lb [data-commission-miniature=space],.dark .lb [data-commission-theme=space]{--commission-seal:#8e75ad}
@media(max-width:600px){.lb .lb-commission-marker{right:-6px;top:-13px;width:25px;height:24px}.lb [data-encounter-compact=true] .lb-event-commission{clear:both;padding:5px 0}.lb .lb-event-commission button{width:100%}.lb .lb-event-commission strong{font-size:.9em}.lb [data-encounter-compact=true] .lb-event-commission .lb-commission-miniature{width:35px;height:30px}}
@media(forced-colors:active){.lb .lb-commission-miniature,.lb .lb-commission-marker,.dark .lb .lb-commission-miniature,.dark .lb .lb-commission-marker{--commission-desk:Canvas;--commission-desk-side:CanvasText;--commission-paper:Canvas;--commission-paper-edge:CanvasText;--commission-ink:CanvasText;--commission-seal:Highlight;--commission-seal-ink:HighlightText;--commission-ribbon:Canvas}.lb .lb-commission-shadow{display:none}.lb .lb-commission-marker{filter:none}.lb .lb-event-commission,.lb .lb-spatial-commission-note{background:Canvas;border-color:Highlight}.lb .lb-commission-list-label{color:CanvasText}.lb .lb-spatial-project[data-commission-project=true]{outline-color:Highlight}.lb .lb-spatial-project[data-commission-project=true][aria-pressed=true]{outline-color:Highlight}}
`}</style>;}
