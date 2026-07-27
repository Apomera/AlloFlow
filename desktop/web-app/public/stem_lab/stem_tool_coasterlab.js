// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Coaster Lab (3-D roller coaster physics & simulation inspection)
//
// Design a coaster in full 3-D (drag nodes, bank turns, heartline rolls,
// chain lift or LSM launch), then test it in an educational simulation:
//   • Certify (Engineer): predict speeds/g/bank from energy conservation and
//     circular motion; an ideal-conditions inspection run must match your math
//   • Explore (MS band): qualitative predictions graded against measured data
//   • Ride & Solve: onboard fluency mode — the train freezes at checkpoints
//     with quick questions generated from the live ride state; pick physics,
//     grade-tuned arithmetic grounded in the real element, both alternating,
//     or any subject via the host AI. Each stop draws a different question.
//   • 🎲 Generate a coaster: a seeded procedural designer (star-shaped ground
//     plan, energy budget charged metre by metre, banking solved against the
//     real sampled track) — the same number always rebuilds the same coaster
//   • Telemetry traces + CSV export, g-heat X-ray view, on-ride photo,
//     park economics, missions, six templates (looper, accelerator,
//     wild mouse, barrel roll…)
// Physics: 1-D arc-length model on a filleted spline; horizon-anchored
// frames (transport through inversions); friction ∝ normal force.
// NGSS MS-PS2/PS3, HS-PS2/PS3 (energy conservation, circular motion, F=ma).
//
// Canonical source: stem_lab/stem_tool_coasterlab.js in this repository.
// build.js mirrors this file into desktop/web-app/public during builds.
// House rules: host-mediated AI only when enabled; localStorage design state.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var CLAB_CSS = ".clab-root{\n    --bg:#0f151c; --panel:#161f29; --panel2:#1c2836; --card:#19242f;\n    --line:#26364a; --line2:#31465e;\n    --ink:#e8eef4; --ink2:#9fb0c1; --ink3:#66788a;\n    --accent:#f2a63c; --accent-dim:#8a5f22;\n    --ke:#3f8fd2; --pe:#c05fa0; --heat:#c47c2f;\n    --good:#59c98d; --warn:#f2c14e; --bad:#e5484d;\n    --mono:\"Cascadia Code\",Consolas,\"SF Mono\",ui-monospace,Menlo,monospace;\n    --sans:\"Segoe UI\",system-ui,-apple-system,\"Helvetica Neue\",sans-serif;\n  }.clab-root *{box-sizing:border-box}.clab-root [hidden]{display:none !important}.clab-root #clab-app{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--bg);\n       color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.45}.clab-root /* ---------- top bar ---------- */\n  #clab-top{display:flex;align-items:center;justify-content:space-between;gap:12px;\n       padding:0 14px;height:52px;flex:none;background:var(--panel);\n       border-bottom:1px solid var(--line)}.clab-root .brand{display:flex;align-items:baseline;gap:10px;white-space:nowrap}.clab-root .brand .name{font-weight:700;letter-spacing:.14em;font-size:15px}.clab-root .brand .name em{color:var(--accent);font-style:normal}.clab-root .brand .sub{color:var(--ink3);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.clab-root .controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.clab-root button{font-family:var(--sans);font-size:13px;color:var(--ink);\n         background:var(--panel2);border:1px solid var(--line2);border-radius:6px;\n         padding:6px 12px;cursor:pointer}.clab-root button:hover{border-color:var(--accent-dim)}.clab-root button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.clab-root button.primary{background:var(--accent);border-color:var(--accent);color:#22160a;font-weight:700}.clab-root button.primary:hover{filter:brightness(1.08)}.clab-root button.ghost{background:transparent;border-color:var(--line);color:var(--ink2)}.clab-root button:disabled{opacity:.45;cursor:default}.clab-root button.danger{color:var(--bad);border-color:var(--bad)}.clab-root .clab-sel{font-family:var(--sans);font-size:12.5px;color:var(--ink);\n         background:var(--panel2);border:1px solid var(--line2);border-radius:6px;\n         padding:5px 8px;cursor:pointer}.clab-root .clab-sel:hover{border-color:var(--accent-dim)}.clab-root .clab-sel:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.clab-root /* ---------- main split ---------- */\n  #clab-main{display:flex;flex:1;min-height:0}.clab-root #clab-side{width:346px;flex:none;display:flex;flex-direction:column;background:var(--panel);\n        border-right:1px solid var(--line);min-height:0}.clab-root #clab-tabs{display:flex;flex:none;border-bottom:1px solid var(--line)}.clab-root #clab-tabs button{flex:1;border:0;border-radius:0;background:transparent;color:var(--ink3);\n               padding:10px 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;\n               border-bottom:2px solid transparent}.clab-root #clab-tabs button.on{color:var(--accent);border-bottom-color:var(--accent)}.clab-root #clab-side section{overflow-y:auto;padding:14px;flex:1;min-height:0}.clab-root .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);\n           margin:0 0 6px;font-weight:600}.clab-root .card{background:var(--card);border:1px solid var(--line);border-radius:8px;\n        padding:12px;margin-bottom:12px}.clab-root .card h3{margin:0 0 6px;font-size:13px;font-weight:600}.clab-root .hint{color:var(--ink2);font-size:12.5px;margin:0 0 10px}.clab-root .hint b{color:var(--ink)}.clab-root kbd{font-family:var(--mono);font-size:11px;background:var(--panel2);\n      border:1px solid var(--line2);border-radius:4px;padding:0 5px}.clab-root .row{display:flex;gap:8px;align-items:center;margin:8px 0}.clab-root .row label{flex:none;width:64px;color:var(--ink2);font-size:12px}.clab-root .row input[type=range]{flex:1;accent-color:var(--accent)}.clab-root .row .val{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:12px;\n            width:64px;text-align:right;color:var(--ink)}.clab-root .btnrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.clab-root .coords{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--ink3)}.clab-root /* ---------- certification ---------- */\n  .marker-legend{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 10px}.clab-root .marker-legend span{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--ink2)}.clab-root .dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}.clab-root .prob .given{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:12px;\n               color:var(--ink2);background:var(--panel2);border-radius:6px;padding:7px 9px;margin:8px 0}.clab-root .prob .ask{font-size:13px;margin:6px 0}.clab-root .ansrow{display:flex;gap:8px;align-items:center;margin-top:8px}.clab-root .ansrow input[type=number]{font-family:var(--mono);font-variant-numeric:tabular-nums;\n      width:110px;background:var(--panel2);color:var(--ink);border:1px solid var(--line2);\n      border-radius:6px;padding:6px 8px;font-size:13px}.clab-root .ansrow input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.clab-root .ansrow .unit{color:var(--ink3);font-size:12px;width:40px}.clab-root .verdict{font-size:12px;font-weight:600;margin-left:auto}.clab-root .verdict.ok{color:var(--good)}.clab-root .verdict.no{color:var(--bad)}.clab-root details.work{margin-top:8px}.clab-root details.work summary{cursor:pointer;color:var(--ink3);font-size:12px}.clab-root details.work div{font-family:var(--mono);font-size:11.5px;color:var(--ink2);\n                   padding:6px 0 0;line-height:1.7}.clab-root table.cert{width:100%;border-collapse:collapse;font-family:var(--mono);\n             font-variant-numeric:tabular-nums;font-size:11.5px;margin-top:8px}.clab-root table.cert th{color:var(--ink3);font-weight:600;text-align:right;padding:4px 6px;\n                border-bottom:1px solid var(--line);font-size:10.5px;letter-spacing:.06em}.clab-root table.cert td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);color:var(--ink)}.clab-root table.cert th:first-child,.clab-root table.cert td:first-child{text-align:left}.clab-root .certbanner{border-radius:8px;padding:12px;margin-top:12px;font-weight:600;font-size:14px;\n              border:1px solid var(--line2);background:var(--panel2)}.clab-root .certbanner.pass{border-color:var(--good);color:var(--good)}.clab-root .certbanner.fail{border-color:var(--bad);color:var(--bad)}.clab-root /* ---------- report ---------- */\n  .stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.clab-root .stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:9px 11px}.clab-root .stat .k{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}.clab-root .stat .v{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:17px;margin-top:2px}.clab-root .stat .v small{font-size:11px;color:var(--ink3)}.clab-root .rating{margin:10px 0}.clab-root .rating .lbl{display:flex;justify-content:space-between;font-size:12px;color:var(--ink2);margin-bottom:4px}.clab-root .rating .lbl .num{font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}.clab-root .rbar{height:8px;background:var(--panel2);border-radius:4px;overflow:hidden}.clab-root .rbar i{display:block;height:100%;border-radius:4px}.clab-root .modebtn.on{border-color:var(--accent);color:var(--accent)}.clab-root .choice button{display:block;width:100%;text-align:left;margin-top:6px}.clab-root .choice button.on{border-color:var(--accent);color:var(--accent);background:rgba(242,166,60,.08)}.clab-root .exline{font-size:12.5px;margin:6px 0;color:var(--ink2)}.clab-root .exline b.ok{color:var(--good)}.clab-root .exline b.no{color:var(--bad)}.clab-root .mission{display:flex;gap:10px;align-items:flex-start;background:var(--card);\n           border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px}.clab-root .mission .mi{font-size:19px;flex:none;width:26px;text-align:center;filter:grayscale(1);opacity:.55}.clab-root .mission.done .mi{filter:none;opacity:1}.clab-root .mission .mt{font-size:13px;font-weight:600}.clab-root .mission.done .mt{color:var(--good)}.clab-root .mission .md{font-size:12px;color:var(--ink2)}.clab-root .mission .stamp{margin-left:auto;flex:none;font-size:11px;color:var(--good);font-weight:700}.clab-root #clab-gball{width:64px;height:64px;display:block;margin-top:4px;border-radius:6px}.clab-root .chart{width:100%;height:74px;display:block;margin:2px 0 6px}.clab-root .chlabel{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-top:6px}.clab-root .chnote{font-family:var(--mono);font-size:10px;color:var(--ink3);margin:2px 0 0}.clab-root .viol{display:flex;flex-direction:column;gap:6px;margin-top:10px}.clab-root .viol span{font-size:12px;color:var(--bad);background:rgba(229,72,77,.08);\n             border:1px solid rgba(229,72,77,.35);border-radius:6px;padding:5px 9px}.clab-root .viol span.okline{color:var(--good);background:rgba(89,201,141,.07);border-color:rgba(89,201,141,.3)}.clab-root /* ---------- viewport & HUD ---------- */\n  #clab-viewport{flex:1;position:relative;min-width:0;min-height:0;background:#121a24}.clab-root #clab-gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}.clab-root #clab-hud{position:absolute;left:12px;bottom:12px;display:flex;gap:14px;align-items:flex-end;\n       background:rgba(15,21,28,.82);border:1px solid var(--line);border-radius:10px;\n       padding:10px 14px;pointer-events:none;backdrop-filter:blur(3px)}.clab-root .hudcol{display:flex;flex-direction:column;gap:2px}.clab-root .hudk{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);font-weight:600}.clab-root .hudv{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:21px;line-height:1.1}.clab-root .hudv small{font-size:10.5px;color:var(--ink3)}.clab-root .gmeter{width:120px}.clab-root .gtrack{position:relative;height:9px;background:var(--panel2);border-radius:5px;margin-top:5px;overflow:hidden}.clab-root .gtrack .zone{position:absolute;top:0;bottom:0;background:rgba(229,72,77,.28)}.clab-root .gtrack .zero{position:absolute;top:-1px;bottom:-1px;width:1px;background:var(--ink3)}.clab-root .gtrack .fill{position:absolute;top:1px;bottom:1px;background:var(--accent);border-radius:4px}.clab-root .gval{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:12px;margin-top:3px}.clab-root .gval.hot{color:var(--bad)}.clab-root .ebar{display:flex;width:170px;height:12px;border-radius:6px;overflow:hidden;\n        background:var(--panel2);margin-top:5px}.clab-root .ebar i{display:block;height:100%}.clab-root .ebar i+i{border-left:2px solid var(--bg)}.clab-root .elegend{display:flex;gap:8px;margin-top:4px;font-size:9.5px;letter-spacing:.1em;color:var(--ink3)}.clab-root .elegend b{font-weight:600}.clab-root .elegend .ke{color:var(--ke)}.clab-root .elegend .pe{color:var(--pe)}.clab-root .elegend .heat{color:var(--heat)}.clab-root #clab-xrayLegend{position:absolute;top:12px;right:12px;background:rgba(15,21,28,.85);\n              border:1px solid var(--line);border-radius:8px;padding:8px 12px;width:190px;\n              pointer-events:none;backdrop-filter:blur(3px)}.clab-root .xbar{height:10px;border-radius:5px;margin-top:6px;\n        background:linear-gradient(90deg,#c05fa0 0%,#3f8fd2 18%,#4a5865 28%,#f2a63c 57%,#e5484d 100%)}.clab-root .xlabels{display:flex;justify-content:space-between;font-family:var(--mono);\n           font-size:9.5px;color:var(--ink3);margin-top:3px}.clab-root .photo img{width:100%;border-radius:6px;display:block}.clab-root .photo a{color:var(--accent);font-size:12px}.clab-root #clab-guide{position:absolute;inset:24px;max-width:820px;margin:0 auto;overflow-y:auto;\n         background:rgba(15,21,28,.96);border:1px solid var(--line2);border-radius:14px;\n         padding:16px 18px;backdrop-filter:blur(5px);z-index:8}.clab-root .gd-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.clab-root .gd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.clab-root .gd-grid .card{margin:0}.clab-root .gd-grid h3{margin:0 0 6px;font-size:13px}@media (max-width:900px){.clab-root .gd-grid{grid-template-columns:1fr} }.clab-root .swatch{width:26px;height:26px;border-radius:50%;border:2px solid var(--line2);\n          padding:0;cursor:pointer}.clab-root .swatch.on{border-color:var(--ink);outline:2px solid var(--accent)}.clab-root #clab-rideQ{position:absolute;left:50%;bottom:132px;transform:translateX(-50%);\n         width:min(470px,92%);background:rgba(15,21,28,.95);border:1px solid var(--line2);\n         border-radius:12px;padding:14px 16px;backdrop-filter:blur(4px)}.clab-root .rq-top{display:flex;justify-content:space-between;align-items:baseline}.clab-root .rq-pts{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:12px;color:var(--accent)}.clab-root #clab-rqTimer{display:block;height:4px;background:var(--panel2);border-radius:2px;margin:8px 0 10px;overflow:hidden}.clab-root #clab-rqTimerFill{display:block;height:100%;background:var(--accent);width:100%}.clab-root #clab-rqText{margin:0 0 10px;font-size:14px}.clab-root #clab-rqText b{color:var(--accent)}.clab-root .clab-viz{height:74px;margin:0 0 10px;display:none}.clab-root .clab-viz svg{display:block;height:100%;width:100%}.clab-root .clab-viz.on{display:block}.clab-root .clab-viz .clab-ans{transform-box:fill-box;transform-origin:center}.clab-root .clab-viz .clab-ans.reveal{fill:var(--good) !important;filter:drop-shadow(0 0 5px rgba(89,201,141,.75));animation:clabAnsPop .62s cubic-bezier(.2,.8,.2,1)}@keyframes clabAnsPop{0%{transform:scaleX(.06) scale(.72)}58%{transform:scaleX(1) scale(1.42)}100%{transform:scaleX(1) scale(1)}}.clab-root .clab-spark{position:absolute;width:var(--sz,7px);height:var(--sz,7px);border-radius:50%;pointer-events:none;opacity:0;animation:clabSpark .8s ease-out var(--delay,0ms) forwards}.clab-root .clab-spark.diamond{border-radius:1px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}.clab-root .clab-spark.streak{width:calc(var(--sz,7px) * 1.8);height:3px;border-radius:3px}@keyframes clabSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.25)}}@media (prefers-reduced-motion:reduce){.clab-root .clab-viz .clab-ans.reveal{animation:none}.clab-root .clab-spark{display:none}}.clab-root #clab-rideQ{max-height:calc(100% - 156px);overflow-y:auto;overscroll-behavior:contain;z-index:6}@media (max-width:760px),(max-height:620px){.clab-root #clab-rideQ{top:8px;bottom:auto;max-height:calc(100% - 16px)}}.clab-root .clab-build-start{border-color:rgba(242,166,60,.5);background:linear-gradient(145deg,rgba(242,166,60,.12),rgba(63,143,210,.08)),var(--card);box-shadow:inset 3px 0 0 var(--accent)}.clab-root .clab-build-start h3{font-size:16px}.clab-root .clab-build-steps{display:grid;gap:5px;margin:10px 0 12px;padding:0;list-style:none;counter-reset:build}.clab-root .clab-build-steps li{display:flex;align-items:center;gap:8px;color:var(--ink2);font-size:12px}.clab-root .clab-build-steps li:before{counter-increment:build;content:counter(build);display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#22160a;font:700 11px var(--mono)}.clab-root .clab-node-prompt{border-style:dashed}.clab-root .clab-build-coach{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(242,166,60,.6);border-radius:999px;background:rgba(15,21,28,.88);box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none}.clab-root .clab-build-coach small{display:block;color:var(--ink2);font-size:10px}.clab-root .clab-node-beacon{width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px rgba(242,166,60,.14);animation:clabBeacon 1.8s ease-in-out infinite}@keyframes clabBeacon{50%{box-shadow:0 0 0 10px rgba(242,166,60,0)}}.clab-root #clab-viewport.ride-question-open:after{content:\"\";position:absolute;inset:0;z-index:5;background:radial-gradient(circle at 50% 55%,rgba(15,21,28,.18),rgba(15,21,28,.62));pointer-events:none}.clab-root #clab-rideQ:not([hidden]){animation:clabCardIn .28s ease-out}.clab-root #clab-rideQ.is-correct{border-color:rgba(89,201,141,.85);box-shadow:0 0 0 1px rgba(89,201,141,.18),0 16px 44px rgba(0,0,0,.38),0 0 28px rgba(89,201,141,.12)}.clab-root #clab-rideQ.is-wrong{border-color:rgba(229,72,77,.8);box-shadow:0 0 0 1px rgba(229,72,77,.14),0 16px 44px rgba(0,0,0,.38)}@keyframes clabCardIn{0%{opacity:0;transform:translateX(-50%) translateY(10px) scale(.98)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}.clab-root .rq-scorebox{position:relative;display:flex;align-items:center;gap:7px}.clab-root .rq-streak{padding:2px 7px;border-radius:999px;background:rgba(242,166,60,.14);border:1px solid rgba(242,166,60,.34);color:var(--accent);font:700 10px var(--mono)}.clab-root .rq-delta{position:absolute;right:0;top:16px;color:var(--good);font:800 13px var(--mono);opacity:0}.clab-root .rq-delta.on{animation:clabScoreGain .75s ease-out}@keyframes clabScoreGain{0%{opacity:0;transform:translateY(4px) scale(.8)}25%{opacity:1}100%{opacity:0;transform:translateY(-18px) scale(1.12)}}.clab-root #clab-rqTimerFill{transition:width .1s linear,background .2s}.clab-root #clab-rqTimer.urgent #clab-rqTimerFill{background:#e98436}.clab-root #clab-rqTimer.critical #clab-rqTimerFill{background:var(--bad);animation:clabTimerPulse .55s ease-in-out infinite alternate}.clab-root #clab-rqTimer.done #clab-rqTimerFill{background:var(--good)}@keyframes clabTimerPulse{to{filter:brightness(1.5)}}.clab-root .choice button{position:relative;min-height:40px;padding-left:42px;transition:border-color .18s,background .18s,color .18s,transform .18s}.clab-root .choice button:before{content:attr(data-key);position:absolute;left:10px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:var(--panel);border:1px solid var(--line2);color:var(--ink2);font:700 10px var(--mono)}.clab-root .choice button.picked{border-color:var(--accent)}.clab-root .choice button.correct{border-color:var(--good);color:var(--good);background:rgba(89,201,141,.11)}.clab-root .choice button.correct:before{content:\"✓\";border-color:var(--good);color:var(--good)}.clab-root .choice button.wrong{border-color:var(--bad);color:#ffb4b6;background:rgba(229,72,77,.1)}.clab-root .choice button.wrong:before{content:\"×\";border-color:var(--bad);color:var(--bad)}.clab-root .choice button:disabled{opacity:1}.clab-root #clab-rqTimer.failed #clab-rqTimerFill{background:var(--bad)}.clab-root #clab-rqNumRow.correct input{border-color:var(--good);box-shadow:0 0 0 2px rgba(89,201,141,.12)}.clab-root #clab-rqNumRow.wrong input{border-color:var(--bad);box-shadow:0 0 0 2px rgba(229,72,77,.1)}.clab-root #clab-rqFeed:not(:empty){padding:8px 10px;border-radius:7px;background:rgba(255,255,255,.035);border-left:3px solid var(--line2)}.clab-root #clab-rideQ.is-correct #clab-rqFeed{border-left-color:var(--good);background:rgba(89,201,141,.07)}.clab-root #clab-rideQ.is-wrong #clab-rqFeed{border-left-color:var(--bad);background:rgba(229,72,77,.06)}.clab-root .clab-viz.on{padding:4px 8px;border:1px solid rgba(49,70,94,.72);border-radius:8px;background:linear-gradient(180deg,rgba(63,143,210,.055),rgba(89,201,141,.025))}.clab-root .ride-result-grid{display:grid;grid-template-columns:96px 1fr;gap:14px;align-items:center;margin:10px 0}.clab-root .ride-accuracy{--pct:0;display:grid;place-items:center;width:90px;height:90px;border-radius:50%;background:conic-gradient(var(--good) calc(var(--pct) * 1%),var(--panel2) 0);position:relative}.clab-root .ride-accuracy:before{content:\"\";position:absolute;inset:8px;border-radius:50%;background:var(--panel)}.clab-root .ride-accuracy span{position:relative;text-align:center;font:800 20px var(--mono)}.clab-root .ride-accuracy small{display:block;color:var(--ink3);font:600 9px var(--sans);text-transform:uppercase;letter-spacing:.08em}.clab-root .ride-checkpoints{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.clab-root .ride-checkpoints i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-style:normal;font-size:11px;background:var(--panel2);border:1px solid var(--line2)}.clab-root .ride-checkpoints i.ok{color:var(--good);border-color:rgba(89,201,141,.5);background:rgba(89,201,141,.08)}.clab-root .ride-checkpoints i.no{color:var(--bad);border-color:rgba(229,72,77,.45);background:rgba(229,72,77,.07)}@media (prefers-reduced-motion:reduce){.clab-root .clab-node-beacon,.clab-root #clab-rideQ:not([hidden]),.clab-root .rq-delta.on,.clab-root #clab-rqTimer.critical #clab-rqTimerFill{animation:none}}@media (max-width:760px){.clab-root .clab-build-coach{top:48px;max-width:90%}.clab-root .ride-result-grid{grid-template-columns:1fr}.clab-root .ride-accuracy{margin:auto}}.clab-root #clab-rideEnd{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);\n           width:min(400px,92%);background:rgba(15,21,28,.96);border:1px solid var(--line2);\n           border-radius:12px;padding:16px 18px;backdrop-filter:blur(4px)}.clab-root #clab-rideEnd .big{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:26px;color:var(--accent)}.clab-root #clab-rideEnd .exline{margin:4px 0}.clab-root #clab-banner{position:absolute;top:14px;left:50%;transform:translateX(-50%);\n          background:rgba(22,31,41,.94);border:1px solid var(--line2);border-radius:8px;\n          padding:9px 18px;font-size:13.5px;pointer-events:none;max-width:70%;text-align:center}.clab-root #clab-banner.pass{border-color:var(--good);color:var(--good)}.clab-root #clab-banner.fail{border-color:var(--bad);color:var(--bad)}.clab-root #clab-err{position:absolute;inset:auto 12px 12px 12px;background:#2a1214;border:1px solid var(--bad);\n       color:#ffb4b6;border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:12px;z-index:9}@media (prefers-reduced-motion:reduce){.clab-root *{scroll-behavior:auto} }@media (max-width:760px){.clab-root #clab-main{flex-direction:column}.clab-root #clab-side{width:100%;max-height:46%;border-right:0;border-bottom:1px solid var(--line)}\n  }.clab-root .clab-start-note,.clab-root .clab-element-note,.clab-root .clab-safety-note{margin:8px 0 0;color:var(--ink3);font-size:11px}.clab-root .clab-element-card{border-color:rgba(63,143,210,.38)}.clab-root .clab-element-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.clab-root .clab-element-btn{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-height:48px;padding:7px 9px;text-align:left}.clab-root .clab-element-btn b{font-size:12px}.clab-root .clab-element-btn small{color:var(--ink3);font-size:10px}.clab-root .clab-element-wide{grid-column:1/-1}.clab-root .clab-safety-card{border-color:rgba(242,193,78,.34)}.clab-root .clab-safety-summary{display:flex;align-items:center;gap:8px;font-weight:700;font-size:12.5px}.clab-root .clab-safety-summary:before{content:\"!\";display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:rgba(242,193,78,.14);border:1px solid rgba(242,193,78,.45);color:var(--warn);font:800 12px var(--mono)}.clab-root .clab-safety-summary.safe{color:var(--good)}.clab-root .clab-safety-summary.safe:before{content:\"✓\";background:rgba(89,201,141,.12);border-color:rgba(89,201,141,.42);color:var(--good)}.clab-root .clab-safety-list{display:grid;gap:7px;margin-top:9px}.clab-root .clab-safety-item{display:grid;grid-template-columns:22px 1fr auto;gap:7px;align-items:start;padding:8px;border:1px solid rgba(242,193,78,.28);border-radius:7px;background:rgba(242,193,78,.055)}.clab-root .clab-safety-item.bad{border-color:rgba(229,72,77,.34);background:rgba(229,72,77,.055)}.clab-root .clab-safety-num{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--warn);color:#241b08;font:800 10px var(--mono)}.clab-root .clab-safety-item.bad .clab-safety-num{background:var(--bad);color:white}.clab-root .clab-safety-copy b{display:block;font-size:11.5px}.clab-root .clab-safety-copy small{display:block;color:var(--ink2);font-size:10.5px;line-height:1.35;margin-top:2px}.clab-root .clab-safety-jump{padding:4px 7px;font-size:10px;white-space:nowrap}@media (max-width:760px){.clab-root .clab-element-btn{min-height:44px}}\n";
  var CLAB_HTML = "<div id=\"clab-app\">\n  <header id=\"clab-top\">\n    <div class=\"brand\">\n      <span class=\"name\">COASTER<em>LAB</em></span>\n      <span class=\"sub\">ride design &amp; physics lab</span>\n    </div>\n    <div class=\"controls\">\n      <button id=\"clab-btnRun\" class=\"primary\">▶ Test run</button>\n      <button id=\"clab-btnRide\" class=\"primary\" title=\"Ride onboard — the train pauses at checkpoints with quick problems you choose\">🧠 Ride &amp; Solve</button>\n      <select id=\"clab-rideTopic\" class=\"clab-sel\" title=\"What kind of checkpoint questions to ask during Ride &amp; Solve\" aria-label=\"Ride and Solve question topic\">\n        <option value=\"physics\">🎢 Physics</option>\n        <option value=\"addition\">➕ Addition</option>\n        <option value=\"subtraction\">➖ Subtraction</option>\n        <option value=\"multiplication\">✖️ Multiplication</option>\n        <option value=\"division\">➗ Division</option>\n        <option value=\"arithmetic\">🔢 Mixed math</option>\n        <option value=\"mix\">🎲 Physics + math</option>\n        <option value=\"ai\">🤖 Any topic (AI)</option>\n      </select>\n      <select id=\"clab-rideGrade\" class=\"clab-sel\" title=\"Grade level the questions are tuned to\" aria-label=\"Question grade level\">\n        <option value=\"auto\">🎚 Grade: auto</option>\n        <option value=\"k2\">Grades K–2</option>\n        <option value=\"g35\">Grades 3–5</option>\n        <option value=\"g68\">Grades 6–8</option>\n        <option value=\"g912\">Grades 9–12</option>\n      </select>\n      <input id=\"clab-rideAiSubject\" class=\"clab-sel\" type=\"text\" maxlength=\"60\" placeholder=\"Type a topic for the AI…\" aria-label=\"AI question topic\" hidden style=\"width:168px\">\n      <button id=\"clab-btnCam\" title=\"Cycle camera: orbit, onboard, chase\">Camera: Orbit</button>\n      <select id=\"clab-seatSel\" class=\"clab-sel\" title=\"Which row of the train you ride in — rows do not feel the same ride\" aria-label=\"Row you ride in\">\n        <option value=\"0\">🚃 Front row</option>\n        <option value=\"2\">🚃 Middle row</option>\n        <option value=\"4\">🚃 Back row</option>\n      </select>\n      <button id=\"clab-btnView\" title=\"Color the track spine by predicted seat g\">View: Track</button>\n      <button id=\"clab-btnFric\" title=\"Toggle rolling friction and air drag\">Friction: Realistic</button>\n      <button id=\"clab-btnSound\" title=\"Wind, chain and launch sounds (synthesized)\">🔇 Sound</button>\n      <button id=\"clab-btnFx\" title=\"Lite mode disables shadows and trees for slower devices\">FX: Full</button>\n      <button id=\"clab-btnVR\" hidden title=\"Ride in a VR headset — intense! Short sessions recommended\">🥽 VR ride</button>\n      <button id=\"clab-btnResetDesign\" class=\"ghost\" title=\"Restore the starter layout\">Reset design</button>\n      <button id=\"clab-btnGuide\" class=\"ghost\" title=\"Quick guide (H)\" aria-controls=\"clab-guide\" aria-expanded=\"false\">❓</button>\n    </div>\n  </header>\n\n  <div id=\"clab-main\">\n    <aside id=\"clab-side\">\n      <nav id=\"clab-tabs\" role=\"tablist\" aria-label=\"Coaster Lab panels\">\n        <button id=\"clab-tab-build-btn\" role=\"tab\" aria-controls=\"clab-tab-build\" aria-selected=\"true\" tabindex=\"0\" data-tab=\"build\" class=\"on\">Build</button>\n        <button id=\"clab-tab-cert-btn\" role=\"tab\" aria-controls=\"clab-tab-cert\" aria-selected=\"false\" tabindex=\"-1\" data-tab=\"cert\">Certify</button>\n        <button id=\"clab-tab-report-btn\" role=\"tab\" aria-controls=\"clab-tab-report\" aria-selected=\"false\" tabindex=\"-1\" data-tab=\"report\">Report</button>\n        <button id=\"clab-tab-missions-btn\" role=\"tab\" aria-controls=\"clab-tab-missions\" aria-selected=\"false\" tabindex=\"-1\" data-tab=\"missions\">Missions</button>\n      </nav>\n\n      <section id=\"clab-tab-build\" role=\"tabpanel\" aria-labelledby=\"clab-tab-build-btn\" tabindex=\"0\">\n        <div class=\"card clab-build-start\" id=\"clab-buildStart\">\n          <p class=\"eyebrow\">Your coaster · fully editable</p>\n          <h3>Shape the track yourself</h3>\n          <p class=\"hint\">The coaster in the 3-D view is your design—not a fixed demo.\n            Move its glowing nodes, change their height and banking, or add and remove track sections.</p>\n          <ol class=\"clab-build-steps\">\n            <li><b>Choose</b> a glowing track node</li>\n            <li><b>Shape</b> it with drag or sliders</li>\n            <li><b>Test</b> your design and revise</li>\n          </ol>\n          <button id=\"clab-btnStartSimple\">Start simple</button>\n          <button class=\"primary clab-edit-track\">✦ Edit a track node</button>\n        </div>\n\n        <p class=\"hint clab-build-hint\">Drag a <b>track node</b> across the ground.\n          Hold <kbd>Shift</kbd> while dragging to change <b>height</b>.\n          Drag empty space to orbit · scroll to zoom · <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd> undo/redo.</p>\n\n        <div class=\"card\" id=\"clab-ptCard\" hidden>\n          <p class=\"eyebrow\">Selected node <span id=\"clab-ptIdx\"></span></p>\n          <div class=\"coords\" id=\"clab-ptCoords\"></div>\n          <div class=\"btnrow\" aria-label=\"Track node selection\">\n            <button id=\"clab-btnPrevPt\" type=\"button\" title=\"Select the previous track node\">&larr; Previous node</button>\n            <button id=\"clab-btnNextPt\" type=\"button\" title=\"Select the next track node\">Next node &rarr;</button>\n          </div>\n          <p class=\"hint\" id=\"clab-coordinateHelp\" style=\"margin:8px 0 4px\">Use arrow keys on any slider, or choose a nudge size and move across the ground plane.</p>\n          <div class=\"row\"><label for=\"clab-slX\">X</label>\n            <input type=\"range\" id=\"clab-slX\" min=\"-260\" max=\"260\" step=\"0.5\" aria-label=\"X position in meters\" aria-describedby=\"clab-coordinateHelp\">\n            <span class=\"val\" id=\"clab-slXV\"></span></div>\n          <div class=\"row\"><label for=\"clab-slZ\">Z</label>\n            <input type=\"range\" id=\"clab-slZ\" min=\"-260\" max=\"260\" step=\"0.5\" aria-label=\"Z position in meters\" aria-describedby=\"clab-coordinateHelp\">\n            <span class=\"val\" id=\"clab-slZV\"></span></div>\n          <div class=\"row\"><label for=\"clab-nodeStep\">Nudge</label>\n            <select id=\"clab-nodeStep\" class=\"clab-sel\" aria-label=\"Ground movement nudge distance\">\n              <option value=\"0.5\">0.5 m - fine</option><option value=\"2\" selected>2 m - normal</option><option value=\"5\">5 m - coarse</option>\n            </select>\n          </div>\n          <div class=\"btnrow\" aria-label=\"Move selected node across the ground\">\n            <button id=\"clab-btnXMinus\" type=\"button\" aria-label=\"Move selected node in the negative X direction\">X &minus;</button>\n            <button id=\"clab-btnXPlus\" type=\"button\" aria-label=\"Move selected node in the positive X direction\">X +</button>\n            <button id=\"clab-btnZMinus\" type=\"button\" aria-label=\"Move selected node in the negative Z direction\">Z &minus;</button>\n            <button id=\"clab-btnZPlus\" type=\"button\" aria-label=\"Move selected node in the positive Z direction\">Z +</button>\n          </div>\n          <div class=\"row\"><label for=\"clab-slHeight\">Height</label>\n            <input type=\"range\" id=\"clab-slHeight\" min=\"0.5\" max=\"45\" step=\"0.1\">\n            <span class=\"val\" id=\"clab-slHeightV\"></span></div>\n          <div class=\"row\"><label for=\"clab-slBank\">Bank</label>\n            <input type=\"range\" id=\"clab-slBank\" min=\"-180\" max=\"180\" step=\"1\">\n            <span class=\"val\" id=\"clab-slBankV\"></span></div>\n          <div class=\"btnrow\">\n            <button id=\"clab-btnAddPt\">＋ Add node after</button>\n            <button id=\"clab-btnDelPt\" class=\"ghost\">Delete</button>\n            <button id=\"clab-btnFlagPt\" class=\"ghost\" title=\"Certification problems use this turn\">⚑ Certify this turn</button>\n          </div>\n        </div>\n\n        <div class=\"card clab-node-prompt\" id=\"clab-noSel\">\n          <p class=\"eyebrow\">Build mode</p>\n          <h3>Choose a glowing track node</h3>\n          <p class=\"hint\">Every glowing sphere is editable. Select one to move it, change\n            height and banking, insert another node, or remove a section.</p>\n          <button class=\"primary clab-edit-track\">Select a node for me</button>\n        </div>\n\n        <div class=\"card clab-element-card\" id=\"clab-elementPalette\">\n          <p class=\"eyebrow\">Add track elements</p>\n          <h3>Build with pieces</h3>\n          <p class=\"hint\">Select a node, then insert an editable shape into the segment after it.</p>\n          <div class=\"clab-element-grid\">\n            <button class=\"clab-element-btn\" data-element=\"hill\" disabled><b>Hill</b><small>airtime crest</small></button>\n            <button class=\"clab-element-btn\" data-element=\"drop\" disabled><b>Drop</b><small>crest + plunge</small></button>\n            <button class=\"clab-element-btn\" data-element=\"turn-left\" disabled><b>Left turn</b><small>banked curve</small></button>\n            <button class=\"clab-element-btn\" data-element=\"turn-right\" disabled><b>Right turn</b><small>banked curve</small></button>\n            <button class=\"clab-element-btn clab-element-wide\" data-element=\"loop\" disabled><b>Vertical loop</b><small>ten-node editable loop</small></button>\n          </div>\n          <p class=\"clab-element-note\" id=\"clab-elementNote\">Choose a glowing node to unlock these pieces.</p>\n        </div>\n\n        <div class=\"card clab-safety-card\" id=\"clab-safetyCoach\">\n          <p class=\"eyebrow\">Design preflight coach</p>\n          <div id=\"clab-safetySummary\" class=\"clab-safety-summary\" role=\"status\" aria-live=\"polite\"></div>\n          <div id=\"clab-safetyList\" class=\"clab-safety-list\"></div>\n          <p class=\"clab-safety-note\">Educational geometry + ideal-dynamics preview—not structural approval. Numbered markers show where to revise.</p>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Surprise me</p>\n          <h3>Generate a coaster</h3>\n          <p class=\"hint\" style=\"margin:0 0 8px\">Builds a brand-new circuit: ground plan, lift, hills sized to the energy budget, and turns banked from the physics. No inversions — add those yourself with the loop piece. Every node is still yours to reshape.</p>\n          <div class=\"row\"><label for=\"clab-randomStyle\">Style</label>\n            <select id=\"clab-randomStyle\" class=\"clab-sel\" style=\"flex:1\" aria-label=\"Random coaster style\">\n              <option value=\"auto\">🎲 Any style</option>\n              <option value=\"family\">🌄 Family</option>\n              <option value=\"classic\">🎢 Classic</option>\n              <option value=\"thrill\">😱 Thrill</option>\n              <option value=\"launch\">⚡ Launched</option>\n            </select>\n          </div>\n          <div class=\"row\"><label for=\"clab-randomSeed\">Number</label>\n            <input type=\"number\" id=\"clab-randomSeed\" min=\"1\" max=\"999999\" step=\"1\" placeholder=\"any\" style=\"flex:1;min-width:0\" aria-describedby=\"clab-randomNote\">\n          </div>\n          <div class=\"btnrow\" style=\"margin-top:4px\">\n            <button id=\"clab-btnRandom\" class=\"primary\">🎲 Generate</button>\n          </div>\n          <p class=\"hint\" id=\"clab-randomNote\" style=\"margin:8px 0 0\">Leave the number blank for a surprise. Type the same number to rebuild the same coaster, so a whole class can ride one design.</p>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Optional starting layouts</p>\n          <p class=\"hint\" style=\"margin:0\">Templates only change your starting shape. Every node stays editable.</p>\n          <div class=\"btnrow\" style=\"margin-top:8px\">\n            <button class=\"tpl\" data-tpl=\"looper\">🎢 Classic Looper</button>\n            <button class=\"tpl\" data-tpl=\"accelerator\">⚡ Accelerator</button>\n            <button class=\"tpl\" data-tpl=\"family\">🌄 Family Camelback</button>\n            <button class=\"tpl\" data-tpl=\"twister\">🐭 Wild Mouse</button>\n            <button class=\"tpl\" data-tpl=\"barrel\">🌀 Barrel Roll</button>\n            <button class=\"tpl\" data-tpl=\"oval\">◻ Starter Oval</button>\n          </div>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Train colors</p>\n          <div class=\"btnrow\" id=\"clab-trainColors\" style=\"margin-top:4px\">\n            <button class=\"swatch\" data-c=\"#f2a63c\" style=\"background:#f2a63c\" aria-label=\"amber train\"></button>\n            <button class=\"swatch\" data-c=\"#e5484d\" style=\"background:#e5484d\" aria-label=\"red train\"></button>\n            <button class=\"swatch\" data-c=\"#3fb5b0\" style=\"background:#3fb5b0\" aria-label=\"teal train\"></button>\n            <button class=\"swatch\" data-c=\"#b07ce8\" style=\"background:#b07ce8\" aria-label=\"violet train\"></button>\n            <button class=\"swatch\" data-c=\"#8bc34a\" style=\"background:#8bc34a\" aria-label=\"lime train\"></button>\n          </div>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Share your design</p>\n          <div class=\"btnrow\" style=\"margin-top:2px\">\n            <button id=\"clab-btnExport\">⬆ Export</button>\n            <button id=\"clab-btnImport\">⬇ Import</button>\n          </div>\n          <p class=\"hint\" style=\"margin:8px 0 0\">Export copies your design as text —\n            paste it to a classmate or teacher; Import loads one back in.</p>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Propulsion</p>\n          <div class=\"btnrow\" style=\"margin-top:2px\">\n            <button id=\"clab-btnChain\" class=\"modebtn on\">⛓ Chain lift</button>\n            <button id=\"clab-btnLaunch\" class=\"modebtn\">⚡ LSM launch</button>\n          </div>\n          <div class=\"row\" id=\"clab-launchRow\" hidden>\n            <label for=\"clab-slLaunch\">Thrust</label>\n            <input type=\"range\" id=\"clab-slLaunch\" min=\"5\" max=\"14\" step=\"0.5\">\n            <span class=\"val\" id=\"clab-slLaunchV\"></span>\n          </div>\n          <p class=\"hint\" id=\"clab-propNote\" style=\"margin:8px 0 0\"></p>\n        </div>\n\n        <div class=\"card\">\n          <p class=\"eyebrow\">Design brief</p>\n          <p class=\"hint\" style=\"margin:0\">The chain lift releases the train at the first\n            crest at <b>3.5 m/s</b>. After that, gravity is in charge: every hill, loop\n            and turn has to be paid for out of the energy bank you see in the HUD.\n            Stall on a hill and the train rolls back. Pull more than <b>+6 g</b>,\n            less than <b>−1.5 g</b>, or over <b>±1.3 g sideways</b> and the safety\n            report flags your ride.</p>\n        </div>\n      </section>\n\n      <section id=\"clab-tab-cert\" role=\"tabpanel\" aria-labelledby=\"clab-tab-cert-btn\" tabindex=\"0\" hidden>\n        <div class=\"btnrow\" style=\"margin-bottom:10px\">\n          <button id=\"clab-btnExplore\" class=\"modebtn\">🔍 Explore</button>\n          <button id=\"clab-btnEngineer\" class=\"modebtn on\">📐 Engineer</button>\n        </div>\n        <p class=\"hint\" id=\"clab-certIntro\">To pass this educational simulation, file predictions\n          for the flagged checkpoints — then run the inspection and see if the track agrees\n          with your math. Inspection runs are made under <b>ideal conditions</b>\n          (friction off), so conservation of energy holds exactly.</p>\n        <div class=\"marker-legend\" id=\"clab-markerLegend\"></div>\n        <div id=\"clab-problems\"></div>\n        <div class=\"btnrow\" id=\"clab-engineerBtns\">\n          <button id=\"clab-btnCheck\">Check predictions</button>\n          <button id=\"clab-btnCert\" class=\"primary\">🎢 Run inspection</button>\n        </div>\n        <div id=\"clab-certResult\"></div>\n        <div class=\"card\" id=\"clab-aiCard\" hidden>\n          <p class=\"eyebrow\">Stuck? Ask the inspector</p>\n          <p class=\"hint\" style=\"margin:0 0 8px\">Get a nudge in the right direction —\n            the inspector never hands you the answer.</p>\n          <div class=\"btnrow\">\n            <button id=\"clab-btnAiHint\">🤖 Hint, please</button>\n          </div>\n          <p class=\"exline\" id=\"clab-aiHintOut\" style=\"min-height:0\"></p>\n        </div>\n      </section>\n\n      <section id=\"clab-tab-report\" role=\"tabpanel\" aria-labelledby=\"clab-tab-report-btn\" tabindex=\"0\" hidden>\n        <div id=\"clab-reportBody\">\n          <p class=\"hint\">No completed runs yet. Press <b>▶ Test run</b> and the\n            telemetry report will land here.</p>\n        </div>\n      </section>\n\n      <section id=\"clab-tab-missions\" role=\"tabpanel\" aria-labelledby=\"clab-tab-missions-btn\" tabindex=\"0\" hidden>\n        <p class=\"hint\">Engineering challenges, graded automatically from real telemetry.\n          Finish a run — or an inspection — and any mission you satisfied is stamped.</p>\n        <p class=\"eyebrow\" id=\"clab-missionProgress\"></p>\n        <div id=\"clab-missionList\"></div>\n        <div class=\"btnrow\" style=\"margin-top:4px\">\n          <button id=\"clab-btnSummary\">📋 Copy student summary</button>\n          <button id=\"clab-btnRideCard\" class=\"primary\">🎫 Save ride card</button>\n        </div>\n        <p class=\"hint\" style=\"margin:8px 0 0\">The summary copies as plain text for an email, doc, or LMS.\n          The <b>ride card</b> saves a picture of your coaster — your on-ride photo, its\n          vitals, and the restraint your own forces earned — to hand in.</p>\n      </section>\n    </aside>\n\n    <div id=\"clab-viewport\">\n      <canvas id=\"clab-gl\" role=\"img\" aria-label=\"Interactive 3-D coaster track visualization. Use the Build panel controls to select and edit track nodes.\"></canvas>\n      <div id=\"clab-buildCoach\" class=\"clab-build-coach\" aria-hidden=\"true\">\n        <span class=\"clab-node-beacon\"></span>\n        <span><b>Build your own track</b><small>Glowing spheres are editable nodes</small></span>\n      </div>\n\n      <div id=\"clab-hud\">\n        <div class=\"hudcol\">\n          <span class=\"hudk\">Speed</span>\n          <span class=\"hudv\" id=\"clab-hudSpeed\">0.0 <small>m/s</small></span>\n          <span class=\"gval\" id=\"clab-hudKmh\">0 km/h</span>\n        </div>\n        <div class=\"hudcol\">\n          <span class=\"hudk\">Height</span>\n          <span class=\"hudv\" id=\"clab-hudH\">0.0 <small>m</small></span>\n        </div>\n        <div class=\"hudcol gmeter\">\n          <span class=\"hudk\" id=\"clab-gvLabel\">Seat g (vertical)</span>\n          <div class=\"gtrack\" id=\"clab-gvTrack\">\n            <span class=\"zone\" style=\"left:0;width:5.6%\"></span>\n            <span class=\"zone\" style=\"right:0;width:11.1%\"></span>\n            <span class=\"zero\" style=\"left:22.2%\"></span>\n            <span class=\"fill\" id=\"clab-gvFill\"></span>\n          </div>\n          <span class=\"gval\" id=\"clab-gvVal\">+1.00 g</span>\n        </div>\n        <div class=\"hudcol gmeter\">\n          <span class=\"hudk\">Side g (lateral)</span>\n          <div class=\"gtrack\" id=\"clab-glTrack\">\n            <span class=\"zone\" style=\"left:0;width:17%\"></span>\n            <span class=\"zone\" style=\"right:0;width:17%\"></span>\n            <span class=\"zero\" style=\"left:50%\"></span>\n            <span class=\"fill\" id=\"clab-glFill\"></span>\n          </div>\n          <span class=\"gval\" id=\"clab-glVal\">+0.00 g</span>\n        </div>\n        <div class=\"hudcol\">\n          <span class=\"hudk\">G-map</span>\n          <canvas id=\"clab-gball\"></canvas>\n        </div>\n        <div class=\"hudcol\">\n          <span class=\"hudk\">Energy budget</span>\n          <div class=\"ebar\">\n            <i id=\"clab-eKE\" style=\"background:var(--ke);width:33%\"></i>\n            <i id=\"clab-ePE\" style=\"background:var(--pe);width:33%\"></i>\n            <i id=\"clab-eHeat\" style=\"background:var(--heat);width:0%\"></i>\n          </div>\n          <div class=\"elegend\"><b class=\"ke\">KINETIC</b><b class=\"pe\">POTENTIAL</b><b class=\"heat\">HEAT</b></div>\n        </div>\n      </div>\n\n      <div id=\"clab-banner\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\" hidden></div>\n\n      <div id=\"clab-rideQ\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"clab-rqText\" hidden>\n        <div class=\"rq-top\">\n          <span class=\"eyebrow\" id=\"clab-rqTag\" style=\"margin:0\">Checkpoint</span>\n          <span class=\"rq-scorebox\"><span class=\"rq-pts\" id=\"clab-rqScore\">0 pts</span><span class=\"rq-streak\" id=\"clab-rqStreak\" hidden></span><span class=\"rq-delta\" id=\"clab-rqDelta\" aria-hidden=\"true\"></span></span>\n        </div>\n        <span id=\"clab-rqTimer\" role=\"progressbar\" aria-label=\"Time remaining\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"100\"><i id=\"clab-rqTimerFill\"></i></span>\n        <p id=\"clab-rqText\"></p>\n        <div id=\"clab-rqViz\" class=\"clab-viz\" aria-hidden=\"true\"></div>\n        <div id=\"clab-rqChoices\" class=\"choice\"></div>\n        <div class=\"ansrow\" id=\"clab-rqNumRow\">\n          <input type=\"number\" id=\"clab-rqNum\" step=\"0.1\" inputmode=\"decimal\" aria-label=\"your answer\">\n          <span class=\"unit\" id=\"clab-rqUnit\"></span>\n          <button id=\"clab-rqGo\" class=\"primary\">Answer</button>\n        </div>\n        <p id=\"clab-rqFeed\" class=\"exline\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\" style=\"min-height:18px;margin:8px 0 0\"></p>\n      </div>\n\n      <div id=\"clab-rideEnd\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"clab-rideEndTitle\" hidden>\n        <p class=\"eyebrow\" id=\"clab-rideEndTitle\">Ride complete</p>\n        <div id=\"clab-rideEndBody\"></div>\n        <div class=\"btnrow\" style=\"margin-top:12px\">\n          <button id=\"clab-btnRideAgain\" class=\"primary\">🎢 Ride again</button>\n          <button id=\"clab-btnRideClose\" class=\"ghost\">Done</button>\n        </div>\n      </div>\n      <div id=\"clab-xrayLegend\" hidden>\n        <span class=\"hudk\">Predicted seat g</span>\n        <div class=\"xbar\"></div>\n        <div class=\"xlabels\"><span>−1</span><span>0</span><span>+1</span><span>+3</span><span>+6</span></div>\n      </div>\n      <div id=\"clab-guide\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"clab-guide-title\" tabindex=\"-1\" hidden>\n        <div class=\"gd-head\">\n          <span class=\"eyebrow\" id=\"clab-guide-title\" style=\"margin:0\">Coaster Lab · quick guide</span>\n          <button id=\"clab-btnGuideClose\" class=\"ghost\">✕ close</button>\n        </div>\n        <div class=\"gd-grid\">\n          <div class=\"card\"><h3>🔧 Build</h3><p class=\"hint\" style=\"margin:0\">\n            The visible coaster is editable: choose a glowing node, drag it to reshape the track · <kbd>Shift</kbd>-drag for height · sliders set\n            height &amp; banking · insert editable hills, drops, turns, and loops ·\n            follow numbered safety markers · flag a turn ⚑ for certification ·\n            🎲 <b>Generate a coaster</b> builds a whole new circuit from a number ·\n            <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd> undo/redo · templates &amp; Export/Import\n            to share designs · chain lift or ⚡ LSM launch.</p></div>\n          <div class=\"card\"><h3>🎢 Run &amp; ride</h3><p class=\"hint\" style=\"margin:0\">\n            <kbd>Space</kbd> test run · <kbd>R</kbd> Ride &amp; Solve (checkpoint\n            questions — pick the <b>topic</b> &amp; <b>grade</b> in the top bar: physics,\n            addition, subtraction, multiplication, division, mixed math,\n            🎲 physics <i>and</i> math alternating, or 🤖 <b>any topic</b> the AI\n            writes from a subject you type — every checkpoint asks a different one) ·\n            <kbd>C</kbd> camera: orbit → onboard → chase, and pick the <b>row</b>\n            you ride in — front, middle and back do not feel the same ride ·\n            <kbd>X</kbd> g-heat X-ray · <kbd>P</kbd> save a snapshot ·\n            🔊 sound &amp; 🥽 VR where supported.</p></div>\n          <div class=\"card\"><h3>📐 Certify</h3><p class=\"hint\" style=\"margin:0\">\n            Explore = quick predictions, Engineer = real numbers. File predictions\n            for the marked checkpoints, then run the inspection — under ideal\n            (frictionless) conditions your math must match the measurements.\n            Explore also asks the two that transfer off the screen: which\n            <b>restraint</b> your ride will need, and which <b>row</b> gets pulled\n            hardest out of its seat.</p></div>\n          <div class=\"card\"><h3>📊 Learn from it</h3><p class=\"hint\" style=\"margin:0\">\n            HUD: energy bar (kinetic/potential/heat) &amp; G-MAP (side × seat g) ·\n            Report: <b>rider safety</b> (which restraint your forces demand, how hard\n            it has to pull, and why rides post a height), telemetry traces, on-ride\n            photo, park economics, ⬇ CSV for graphing · run with friction on\n            <i>and</i> off to see the loss · Missions tab tracks challenges.</p></div>\n        </div>\n      </div>\n      <div id=\"clab-err\" hidden></div>\n    </div>\n  </div>\n</div>";
  CLAB_CSS += `
  .clab-root[data-visual-theme="daylight"]{--accent:#61d39a;--accent-dim:#2d7c5a;--line:#385063;--line2:#4d6b80}
  .clab-root[data-visual-theme="neon"]{--accent:#55e8ff;--accent-dim:#277d91;--ke:#55e8ff;--pe:#ff62c7;--heat:#ff9d4d}
  .clab-root[data-visual-theme="blueprint"]{--accent:#8bd7ff;--accent-dim:#397ba0;--line:#315d83;--line2:#477da8;--ke:#8bd7ff;--pe:#d2a8ff}
  .clab-root #clab-top{position:relative;z-index:9;box-shadow:0 8px 30px rgba(0,0,0,.22)}
  .clab-root #clab-top{height:auto;min-height:52px;padding-block:7px}.clab-root #clab-top .controls{justify-content:flex-end}
  @media (max-width:1180px){.clab-root #clab-top .brand .sub{display:none}}
  .clab-root #clab-viewport:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 50% 42%,transparent 48%,rgba(4,8,13,.28) 100%)}
  .clab-root[data-visual-theme="daylight"] #clab-viewport:before{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(22,46,32,.12))}
  .clab-root[data-visual-theme="neon"] #clab-viewport:before{background:radial-gradient(circle at 50% 45%,rgba(46,228,255,.035),rgba(2,3,12,.42) 82%)}
  .clab-root[data-visual-theme="blueprint"] #clab-viewport:before{background:linear-gradient(rgba(79,157,211,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(79,157,211,.035) 1px,transparent 1px);background-size:24px 24px}
  .clab-root #clab-hud{z-index:3;max-width:calc(100% - 24px);overflow:hidden;background:linear-gradient(135deg,rgba(12,18,25,.9),rgba(21,32,43,.78));border-color:rgba(116,145,171,.34);box-shadow:0 14px 42px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.045);backdrop-filter:blur(10px) saturate(1.18)}
  .clab-root #clab-hud .hudcol{position:relative;padding-left:12px;border-left:1px solid rgba(118,146,170,.18)}
  .clab-root #clab-hud .hudcol:first-child{padding-left:0;border-left:0}
  .clab-root .hudv{text-shadow:0 0 18px color-mix(in srgb,var(--accent) 25%,transparent)}
  .clab-root .gtrack,.clab-root .ebar{box-shadow:inset 0 1px 4px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.025)}
  .clab-root .clab-minimap{width:112px}.clab-root #clab-minimap{display:block;width:112px;height:64px;border:1px solid rgba(118,146,170,.24);border-radius:7px;background:rgba(5,10,15,.5)}
  .clab-root #clab-vectorLegend{position:absolute;left:12px;top:12px;z-index:3;width:172px;padding:9px 11px;border:1px solid rgba(116,145,171,.34);border-radius:9px;background:rgba(10,16,23,.82);box-shadow:0 10px 30px rgba(0,0,0,.25);backdrop-filter:blur(8px);pointer-events:none}
  .clab-root .vkey{display:flex;align-items:center;gap:7px;margin-top:5px;color:var(--ink2);font-size:11px}.clab-root .vkey i{display:block;width:20px;height:3px;border-radius:2px;box-shadow:0 0 8px currentColor}
  .clab-root #clab-btnVectors[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--panel2))}
  .clab-root #clab-visualTheme,.clab-root #clab-trackViz{max-width:122px}
  .clab-root .clab-build-coach{box-shadow:0 12px 34px rgba(0,0,0,.32),0 0 24px rgba(242,166,60,.08)}
  .clab-root .clab-workbench-card{border-color:color-mix(in srgb,var(--accent) 38%,var(--line))}
  .clab-root .clab-history-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 12px}
  .clab-root .clab-challenge-meter{height:7px;overflow:hidden;border-radius:5px;background:var(--panel2);box-shadow:inset 0 1px 3px rgba(0,0,0,.45)}
  .clab-root .clab-challenge-meter i{display:block;width:0;height:100%;border-radius:inherit;background:var(--accent);transition:width .25s ease}
  .clab-root #clab-challengeStatus{display:block;margin-top:7px;color:var(--ink2);font-size:12px}
  .clab-root #clab-challengeStatus.done{color:var(--good)}
  .clab-root #clab-dispatch{position:absolute;left:50%;top:13%;z-index:4;transform:translateX(-50%);min-width:148px;padding:10px 18px;border:1px solid color-mix(in srgb,var(--accent) 60%,var(--line));border-radius:999px;background:rgba(10,16,23,.86);box-shadow:0 12px 34px rgba(0,0,0,.34),0 0 24px color-mix(in srgb,var(--accent) 14%,transparent);text-align:center;pointer-events:none;backdrop-filter:blur(8px)}
  .clab-root #clab-dispatch b{display:block;color:var(--accent);font:700 22px var(--mono);letter-spacing:.08em}
  .clab-root #clab-dispatch small{display:block;color:var(--ink2);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
  .clab-root .clab-state-pill{display:inline-flex;align-items:center;width:max-content;padding:2px 7px;border:1px solid var(--line2);border-radius:999px;color:var(--good);font:700 10px var(--mono);letter-spacing:.08em}
  .clab-root .clab-state-pill.caution{color:var(--warn);border-color:var(--warn)}.clab-root .clab-state-pill.hot{color:var(--bad);border-color:var(--bad)}
  .clab-root .clab-insights{display:grid;gap:7px;margin:0;padding:0;list-style:none}
  .clab-root .clab-insights li{padding:7px 9px;border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 6%,var(--panel2));color:var(--ink2);font-size:12px}
  .clab-root .clab-node-lens{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px;margin:9px 0 3px;padding:8px 0;border-block:1px solid var(--line)}
  .clab-root .clab-node-lens span{display:flex;justify-content:space-between;gap:7px;color:var(--ink3);font-size:10px;text-transform:uppercase;letter-spacing:.07em}
  .clab-root .clab-node-lens b{color:var(--ink);font:600 11px var(--mono);letter-spacing:0;text-transform:none}
  .clab-root .clab-replay{display:grid;grid-template-columns:auto 1fr;gap:7px 9px;align-items:center;margin:8px 0 10px}
  .clab-root .clab-replay input{width:100%;accent-color:var(--accent)}
  .clab-root .clab-replay label{color:var(--ink3);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
  .clab-root .clab-replay output{color:var(--ink2);font:11px var(--mono);font-variant-numeric:tabular-nums;text-align:right}
  .clab-root #clab-btnComfort[aria-pressed="true"]{border-color:var(--good);color:var(--good)}
  .clab-root .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  @media (max-width:1120px){.clab-root .clab-minimap{display:none}.clab-root #clab-hud{gap:10px}.clab-root #clab-hud .hudcol{padding-left:8px}}
  @media (max-width:820px){.clab-root #clab-hud{right:8px;left:8px;bottom:8px;overflow-x:auto}.clab-root #clab-vectorLegend{top:8px;left:8px}.clab-root #clab-visualTheme,.clab-root #clab-trackViz{max-width:98px}}
  @media (prefers-reduced-motion:reduce){.clab-root .hudv{text-shadow:none}.clab-root .clab-challenge-meter i{transition:none}}
  `;
  var fxControl = '<button id="clab-btnFx" title="Lite mode disables shadows and trees for slower devices">FX: Full</button>';
  CLAB_HTML = CLAB_HTML.replace(fxControl, fxControl + '\n      <select id="clab-visualTheme" class="clab-sel" aria-label="Environment theme" title="Change the coaster environment"><option value="dusk">Dusk park</option><option value="daylight">Daylight</option><option value="neon">Neon night</option><option value="blueprint">Blueprint</option></select>\n      <select id="clab-trackViz" class="clab-sel" aria-label="Track analysis overlay" title="Color the track by a predicted physics measure"><option value="track">Track colors</option><option value="speed">Speed heatmap</option><option value="vertical">Vertical g heatmap</option><option value="lateral">Lateral g heatmap</option><option value="curvature">Curvature heatmap</option></select>\n      <button id="clab-btnVectors" aria-pressed="false" title="Show velocity, seat-force, and gravity arrows on the lead car">Vectors: Off</button>\n      <button id="clab-btnComfort" aria-pressed="false" title="Reduce camera movement, pulses, and decorative animation">Motion: Standard</button>');
  var safetyCard = '<div class="card clab-safety-card" id="clab-safetyCoach">';
  CLAB_HTML = CLAB_HTML.replace(safetyCard, '<div class="card clab-workbench-card" id="clab-workbench"><p class="eyebrow">Designer workbench</p><div class="clab-history-row"><button id="clab-btnUndo" type="button">Undo</button><button id="clab-btnRedo" type="button">Redo</button></div><label class="hint" for="clab-designChallenge" style="display:block;margin-bottom:5px">Guided design challenge</label><select id="clab-designChallenge" class="clab-sel" style="width:100%"><option value="hill20">Build a smooth 20 m hill</option><option value="airtime3">Create 3 seconds of airtime</option><option value="gentle4">Finish below 4.0 vertical g</option></select><div class="clab-challenge-meter" aria-hidden="true" style="margin-top:9px"><i id="clab-challengeFill"></i></div><span id="clab-challengeStatus" role="status" aria-live="polite">Choose a challenge to begin.</span><button id="clab-btnChallengeRun" class="primary" type="button" style="margin-top:9px">Test this challenge</button></div>\n\n        ' + safetyCard);
  var pointCoords = '<div class="coords" id="clab-ptCoords"></div>';
  CLAB_HTML = CLAB_HTML.replace(pointCoords, pointCoords + '\n          <div class="clab-node-lens" id="clab-nodeLens" aria-label="Predicted physics at this track node"><span>Section <b id="clab-nodeSection">?</b></span><span>Speed <b id="clab-nodeSpeed">?</b></span><span>Vertical <b id="clab-nodeGV">?</b></span><span>Suggested bank <b id="clab-nodeBank">?</b></span></div>');
  var energyHud = '<div class="hudcol">\n          <span class="hudk">Energy budget</span>';
  CLAB_HTML = CLAB_HTML.replace(energyHud, '<div class="hudcol clab-ride-state">\n          <span class="hudk">Ride state</span>\n          <span class="clab-state-pill" id="clab-hudState">READY</span>\n          <span class="gval" id="clab-hudPeak">Peak +1.00 g</span>\n        </div>\n        <div class="hudcol clab-minimap">\n          <span class="hudk">Track map</span>\n          <canvas id="clab-minimap" width="224" height="128" role="img" aria-label="Top-down map of the track and train position"></canvas>\n        </div>\n        ' + energyHud);
  var xrayLegend = '<div id="clab-xrayLegend" hidden>';
  CLAB_HTML = CLAB_HTML.replace(xrayLegend, '<div id="clab-dispatch" role="status" aria-live="polite" aria-atomic="true" hidden><small>Dispatch</small><b id="clab-dispatchValue">3</b></div>\n      <div id="clab-telemetryAnnouncer" class="sr-only" aria-live="polite" aria-atomic="true"></div>\n      <div id="clab-vectorLegend" hidden><span class="hudk">Live physics vectors</span><span class="vkey"><i style="background:#55b7ff;color:#55b7ff"></i>Velocity</span><span class="vkey"><i style="background:#f2a63c;color:#f2a63c"></i>Seat force</span><span class="vkey"><i style="background:#d38bff;color:#d38bff"></i>Gravity</span></div>\n      ' + xrayLegend);

  function bootCoasterLab(rootEl, THREE, bridge){
'use strict';
function __clabGet(id){ return rootEl.querySelector('#' + id); }
/* @clab-cleanup-start */
let __clabDead = false;
const __clabResources = {
  renderer: null,
  rideTimerId: null,
  rideResumeId: null,
  rideBurstId: null,
  bannerTimerId: null,
  audioCtx: null,
  xrSession: null,
  sceneRoot: null
};
function __clabIgnoreRejection(result){
  if(result && typeof result.catch === 'function') result.catch(() => {});
}
function __clabDisposeScene(sceneRoot){
  if(!sceneRoot || typeof sceneRoot.traverse !== 'function') return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const disposeTexture = texture => {
    if(!texture || !texture.isTexture || textures.has(texture)) return;
    textures.add(texture);
    if(typeof texture.dispose === 'function') texture.dispose();
  };
  const disposeMaterial = material => {
    if(!material || materials.has(material)) return;
    materials.add(material);
    Object.keys(material).forEach(key => disposeTexture(material[key]));
    if(typeof material.dispose === 'function') material.dispose();
  };
  sceneRoot.traverse(object => {
    if(object.geometry && !geometries.has(object.geometry)){
      geometries.add(object.geometry);
      if(typeof object.geometry.dispose === 'function') object.geometry.dispose();
    }
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach(disposeMaterial);
  });
}
function __clabDestroy(){
  if(__clabDead) return;
  __clabDead = true;
  const resources = { ...__clabResources };
  Object.keys(__clabResources).forEach(key => { __clabResources[key] = null; });
  try{ if(resources.renderer) resources.renderer.setAnimationLoop(null); }catch(_e){}
  try{ if(resources.rideTimerId != null) clearInterval(resources.rideTimerId); }catch(_e){}
  try{ if(resources.rideResumeId != null) clearTimeout(resources.rideResumeId); }catch(_e){}
  try{ if(resources.rideBurstId != null) clearTimeout(resources.rideBurstId); }catch(_e){}
  try{ if(resources.bannerTimerId != null) clearTimeout(resources.bannerTimerId); }catch(_e){}
  try{
    if(resources.xrSession && typeof resources.xrSession.end === 'function'){
      __clabIgnoreRejection(resources.xrSession.end());
    }
  }catch(_e){}
  try{
    if(resources.audioCtx && typeof resources.audioCtx.close === 'function'){
      __clabIgnoreRejection(resources.audioCtx.close());
    }
  }catch(_e){}
  try{ __clabDisposeScene(resources.sceneRoot); }catch(_e){}
  try{
    if(resources.renderer && resources.renderer.renderLists && typeof resources.renderer.renderLists.dispose === 'function'){
      resources.renderer.renderLists.dispose();
    }
  }catch(_e){}
  try{ if(resources.renderer) resources.renderer.dispose(); }catch(_e){}
  try{
    if(resources.renderer && typeof resources.renderer.forceContextLoss === 'function') resources.renderer.forceContextLoss();
  }catch(_e){}
}
/* @clab-cleanup-end */
rootEl._clabCleanup = __clabDestroy;
/* ============================================================
   COASTER LAB — 3D coaster design + physics certification
   Single-file STEM tool. Physics: a coaster on rails is a 1-D
   problem in arc length s, embedded in 3-D space. Energy does
   the speeds; the Frenet-style transported frame does the g's.
   ============================================================ */
'use strict';

/* ---------------- constants & palette ---------------- */
const G0 = 9.81;                 // m/s^2
const M = 2000;                  // track samples
const LIFT_V = 3.5;              // chain release speed, m/s
const MU_ROLL = 0.0065;          // rolling resistance coeff (scaled by normal force)
const K_DRAG = 0.00045;          // quadratic drag, 1/m
const BRAKE_LEN = 55, STOP_AT = 4;   // brake run starts before the final turn (m from lap end)
const TRAIN_CARS = 5, CAR_GAP = 2.6;  // a real train is a LENGTH, not a point: 10.4 m nose to tail
const LIM = { gvMax: 6.0, gvMin: -1.5, glat: 1.3 };  // comfort limits (ASTM-ish)
const TOL = { v: 0.06, g: 0.35, bank: 5 };           // grading tolerances
const COL = {
  accent: 0xf2a63c, ke: 0x3f8fd2, pe: 0xc05fa0, heat: 0xc47c2f,
  good: 0x59c98d, bad: 0xe5484d, ink: 0xe8eef4
};
const VISUAL_THEMES = {
  dusk: {
    fog: 0x241f26, fogNear: 240, fogFar: 820, exposure: 1.15,
    hemiSky: 0x35506e, hemiGround: 0x191f16, hemi: 0.9,
    sun: 0xffb877, sunPower: 1.35, fill: 0x46658a, fillPower: 0.28,
    zen: 0x051024, mid: 0x111b2b, horizon: 0x5c3426, sunGlow: 0xff8a38, stars: 0.45,
    ground: 0xd9e2cc, rail: 0xf2a63c, railGlow: 0x3a2408, spine: 0x31424f, support: 0x3a4a58
  },
  daylight: {
    fog: 0xb7d6e2, fogNear: 300, fogFar: 980, exposure: 1.02,
    hemiSky: 0xcbe9ff, hemiGround: 0x55764d, hemi: 1.12,
    sun: 0xfff0c7, sunPower: 1.55, fill: 0x8bb9d4, fillPower: 0.34,
    zen: 0x2f84c8, mid: 0x78bce0, horizon: 0xf2d6a2, sunGlow: 0xffe0a0, stars: 0,
    ground: 0xe3eccd, rail: 0xf0a235, railGlow: 0x251300, spine: 0x425666, support: 0x536777
  },
  neon: {
    fog: 0x050713, fogNear: 190, fogFar: 690, exposure: 1.25,
    hemiSky: 0x16255c, hemiGround: 0x10081e, hemi: 0.72,
    sun: 0xff4fbf, sunPower: 0.9, fill: 0x28d8ff, fillPower: 0.55,
    zen: 0x02030d, mid: 0x0b1230, horizon: 0x32104c, sunGlow: 0xff3ca6, stars: 0.85,
    ground: 0x223044, rail: 0x55e8ff, railGlow: 0x0b6575, spine: 0x3a2454, support: 0x283a5c
  },
  blueprint: {
    fog: 0x071b30, fogNear: 230, fogFar: 760, exposure: 1.08,
    hemiSky: 0x285f91, hemiGround: 0x06111f, hemi: 0.78,
    sun: 0x9bdcff, sunPower: 0.85, fill: 0x4b9cd3, fillPower: 0.42,
    zen: 0x041326, mid: 0x092542, horizon: 0x12466a, sunGlow: 0x8bd7ff, stars: 0.18,
    ground: 0x244866, rail: 0xeaf7ff, railGlow: 0x2b799f, spine: 0x3979a3, support: 0x315f7e
  }
};
let visualTheme = (() => {
  try{ const v = localStorage.getItem('coaster_lab_theme') || 'dusk'; return VISUAL_THEMES[v] ? v : 'dusk'; }
  catch(_e){ return 'dusk'; }
})();
rootEl.dataset.visualTheme = visualTheme;

let __clabBridge = bridge;
function bridgeReport(ev){
  if(__clabBridge){ try{ __clabBridge(ev); }catch(_e){} }
}
const MARKER_COL = { L: 0x59c98d, A: 0xf2a63c, B: 0x3f8fd2, C: 0xc05fa0, D: 0xe8eef4 };
const MARKER_KEYS = ['L', 'A', 'B', 'C', 'D'];

/* ---------------- error surface (critical for smoke tests) --- */
const errBox = __clabGet('clab-err');
function showFatal(msg){ errBox.hidden = false; errBox.textContent = '⚠ ' + msg; }

/* ---------------- design state ---------------- */
const STORE_KEY = 'coaster_lab_design_v2';

function defaultDesign(){
  /* The loop is generated as a clothoid teardrop: curvature radius eases from
     13 m at the base to 6.5 m at the apex — like real steel, so base g stays
     civil while the apex keeps its speed demand low. */
  const loopPts = [];
  const R_BASE = 13, R_EASE = 6.5, LX = 86, LY = 7.0, LZ0 = 4.2, LZ1 = 8.0, NSEG = 10;
  let lx = LX, ly = LY;
  loopPts.push({ x: lx, y: ly, z: LZ0, bank: 0 });
  for(let k = 0; k < NSEG; k++){
    const steps = 16, dth = (2 * Math.PI / NSEG) / steps;
    for(let j = 0; j < steps; j++){
      const th = (k * 2 * Math.PI / NSEG) + (j + 0.5) * dth;
      const r = R_BASE - R_EASE * Math.sin(th / 2) ** 2;
      lx += Math.cos(th) * r * dth;
      ly += Math.sin(th) * r * dth;
    }
    loopPts.push({
      x: +lx.toFixed(2), y: +ly.toFixed(2),
      z: +(LZ0 + (LZ1 - LZ0) * (k + 1) / NSEG).toFixed(2), bank: 0
    });
  }
  return {
    certTurnIdx: 7 + loopPts.length + 2,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:    0, y:  3.0, z:  0,   bank:  0 },  // station
      { x:   14, y:  4.0, z:  0,   bank:  0 },  // lift base
      { x:   44, y: 34.0, z:  0,   bank:  0 },  // crest (lift top)
      { x:   52, y: 17.0, z:  0.5, bank:  0 },  // drop face
      { x:   61, y:  6.5, z:  1.2, bank:  0 },  // pull-out
      { x:   70, y:  4.4, z:  2,   bank:  0 },  // valley
      { x:   79, y:  5.5, z:  3,   bank:  0 },  // valley exit
      ...loopPts,                               // clothoid vertical loop
      { x:  118, y:  7.0, z: 11,   bank:  0 },  // runout
      { x:  136, y:  8.5, z: 20,   bank: 55 },  // turn entry
      { x:  144, y:  8.5, z: 38,   bank: 50 },  // turn apex  ⚑ cert turn
      { x:  134, y:  8.5, z: 56,   bank: 58 },  // turn exit
      { x:  106, y: 16.0, z: 60,   bank:  0 },  // camelback
      { x:   82, y:  6.0, z: 58,   bank:  0 },  // dip
      { x:   54, y: 11.0, z: 55,   bank: 18 },  // hill w/ bank
      { x:   28, y:  7.0, z: 47,   bank: 33 },  // return turn
      { x:    8, y:  5.0, z: 32,   bank: 15 },  // return turn (brake run)
      { x:   -6, y:  4.0, z: 14,   bank:  0 }   // final approach (brake run)
    ]
  };
}
function simpleDesign(){
  /* A deliberately sparse six-node circuit: enough structure to run, but open
     enough that students are composing the ride instead of editing a finished one. */
  return {
    certTurnIdx: 4,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:  0, y: 3.0, z:  0, bank:  0 },
      { x: 18, y: 4.0, z:  0, bank:  0 },
      { x: 52, y: 18,  z:  2, bank:  0 },
      { x: 96, y: 5.0, z: 24, bank: 18 },
      { x: 66, y: 6.0, z: 58, bank: 35 },
      { x:  4, y: 4.0, z: 38, bank: 20 }
    ]
  };
}
function acceleratorDesign(){
  /* flat LSM launch straight into a top-hat tower — classic accelerator */
  return {
    certTurnIdx: 11,
    propulsion: { mode: 'launch', accel: 10 },
    points: [
      { x:   0, y: 3.0, z:  0,   bank:  0 },  //  0 station
      { x:  22, y: 3.0, z:  0.5, bank:  0 },  //  1 launch straight
      { x:  46, y: 3.0, z:  1,   bank:  0 },  //  2 launch straight
      { x:  70, y: 3.5, z:  1.5, bank:  0 },  //  3 launch runout
      { x:  96, y: 7.0, z:  2.5, bank:  0 },  //  4 tower approach
      { x: 104, y: 22,  z:  3.2, bank:  0 },  //  5 tower up
      { x: 110, y: 36,  z:  4.2, bank:  0 },  //  6 top-hat crest (rounded pair)
      { x: 116, y: 36,  z:  5.2, bank:  0 },  //  7 top-hat crest
      { x: 122, y: 22,  z:  6.2, bank:  0 },  //  8 tower down
      { x: 132, y: 8.0, z:  7.5, bank:  0 },  //  9 pull-out (eased)
      { x: 145, y: 5.0, z: 13,   bank: 30 },  // 10 valley → turn entry
      { x: 158, y: 6.0, z: 30,   bank: 68 },  // 11 big turn  ⚑ (legal but uncertified)
      { x: 149, y: 7.0, z: 48,   bank: 66 },  // 12 turn exit
      { x: 118, y: 13,  z: 55,   bank:  0 },  // 13 camelback
      { x:  88, y: 5.0, z: 53,   bank:  0 },  // 14 dip
      { x:  58, y: 10,  z: 49,   bank: 45 },  // 15 hill
      { x:  30, y: 9.0, z: 42,   bank: 62 },  // 16 helix-up turn
      { x:   8, y: 4.5, z: 28,   bank: 35 },  // 17 turn (brake run)
      { x:  -6, y: 3.5, z: 12,   bank:  0 }   // 18 approach
    ]
  };
}
function familyDesign(){
  /* gentle chain out-and-back with airtime camelbacks, no inversion */
  return {
    certTurnIdx: 8,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:   0, y: 3.0, z:  0,   bank:  0 },
      { x:  14, y: 4.0, z:  0,   bank:  0 },
      { x:  40, y: 20,  z:  0.5, bank:  0 },  // 2 crest
      { x:  60, y: 6.0, z:  2,   bank:  0 },
      { x:  78, y: 13,  z:  4,   bank:  0 },
      { x:  96, y: 5.0, z:  6,   bank:  0 },
      { x: 114, y: 11,  z:  8,   bank:  0 },
      { x: 132, y: 5.0, z: 12,   bank: 10 },
      { x: 146, y: 6.0, z: 26,   bank: 35 },  // 8 turn  ⚑
      { x: 139, y: 7.0, z: 42,   bank: 30 },
      { x: 114, y: 10,  z: 48,   bank:  0 },
      { x:  88, y: 5.0, z: 50,   bank:  0 },
      { x:  62, y: 9.0, z: 48,   bank: 10 },
      { x:  36, y: 5.0, z: 43,   bank: 25 },
      { x:  12, y: 4.5, z: 32,   bank: 20 },
      { x:  -6, y: 3.5, z: 14,   bank:  0 }
    ]
  };
}
function ovalDesign(){
  /* nearly blank canvas: one small hill and a plain circuit */
  return {
    certTurnIdx: 5,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:   0, y: 3.0, z:  0,  bank:  0 },
      { x:  20, y: 4.0, z:  0,  bank:  0 },
      { x:  48, y: 14,  z:  1,  bank:  0 },  // 2 crest
      { x:  78, y: 5.0, z:  4,  bank:  0 },
      { x: 105, y: 6.0, z: 12,  bank: 20 },
      { x: 120, y: 6.0, z: 30,  bank: 40 },  // 5 turn  ⚑
      { x: 108, y: 7.0, z: 47,  bank: 30 },
      { x:  78, y: 6.0, z: 53,  bank:  0 },
      { x:  45, y: 7.0, z: 51,  bank: 10 },
      { x:  15, y: 5.0, z: 42,  bank: 30 },
      { x:  -4, y: 4.0, z: 22,  bank: 15 },
      { x:  -8, y: 3.5, z:  8,  bank:  0 }
    ]
  };
}
function twisterDesign(){
  /* Wild Mouse: slow flat hairpins on a high deck — the classic lateral-jolt
     gag, and the perfect banking exercise. (A true corkscrew needs heartline
     rolls: any circular roll safe at the top pulls ~6 g at its base.) */
  return {
    certTurnIdx: 16,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:    0, y: 3.0,   z:  0,   bank: 0 },  //  0 station
      { x:   12, y: 4.0,   z:  0,   bank: 0 },  //  1 lift base
      { x:   34, y: 20.0,  z:  0.5, bank: 0 },  //  2 crest → hairpin deck
      { x:   46, y: 17.10, z:  2,   bank: 0 },  //  3 row 1 (slow creep)
      { x:   58, y: 17.75, z:  2,   bank: 0 },  //  4
      { x: 61.5, y: 16.90, z:  3.5, bank: 0 },  //  5 hairpin 1 — wide U
      { x:   63, y: 17.65, z:  7,   bank: 0 },  //  6
      { x: 61.5, y: 16.70, z: 10.5, bank: 0 },  //  7
      { x:   58, y: 16.50,  z: 12,   bank: 0 },  //  8 row 2
      { x:   44, y: 17.40, z: 12,   bank: 0 },  //  9
      { x: 40.5, y: 17.3,  z: 13.5, bank: 0 },  // 10 hairpin 2
      { x:   39, y: 17.20, z: 17,   bank: 0 },  // 11
      { x: 40.5, y: 17.8,  z: 20.5, bank: 0 },  // 12
      { x:   44, y: 17.0, z: 22,   bank: 0 },  // 13 row 3
      { x:   58, y: 17.7,  z: 22,   bank: 0 },  // 14
      { x: 61.5, y: 16.80, z: 23.5, bank: 0 },  // 15 hairpin 3
      { x:   63, y: 17.6,  z: 27,   bank: 0 },  // 16  ⚑ (bank me!)
      { x: 61.5, y: 16.60, z: 30.5, bank: 0 },  // 17
      { x:   58, y: 17.5,  z: 32,   bank: 0 },  // 18 row 4
      { x:   44, y: 16.40, z: 32,   bank: 0 },  // 19 deck exit
      { x:   34, y: 11.5,  z: 33,   bank: 0 },  // 20 the drop
      { x:   20, y: 4.5,   z: 30,   bank: 0 },  // 21 valley — pull out flat
      { x:    9, y: 6.0,   z: 25,   bank: 45 }, // 22 sweep home
      { x:    0, y: 5.0,   z: 17,   bank: 40 }, // 23 sweep (brake run)
      { x:   -6, y: 4.0,   z:  8,   bank:  5 }  // 24 approach
    ]
  };
}
function barrelDesign(){
  /* heartline barrel roll: banks walk 0→90→180→−90→0 along a straight
     elevated section — the rider rolls fully around while the path barely
     curves. Hanging at −1 g upside-down, ±1 g sideways at the quarter points. */
  return {
    certTurnIdx: 13,
    propulsion: { mode: 'chain', accel: 7.5 },
    points: [
      { x:   0, y: 3.0,  z:  0,   bank:   0 },  //  0 station
      { x:  14, y: 4.0,  z:  0,   bank:   0 },  //  1 lift base
      { x:  34, y: 24.0, z:  0.5, bank:   0 },  //  2 crest
      { x:  44, y: 12.0, z:  1,   bank:   0 },  //  3 drop face
      { x:  56, y: 3.8,  z:  2,   bank:   0 },  //  4 valley (clearly the lowest)
      { x:  68, y: 10.0, z:  4,   bank:   0 },  //  5 rise to the roll
      { x:  80, y: 11.5, z:  6,   bank:   0 },  //  6 roll in
      { x:  94, y: 11.3, z:  7,   bank:  90 },  //  7 ¼ roll — on your side
      { x: 108, y: 11.1, z:  8,   bank: 180 },  //  8 ½ roll — inverted
      { x: 122, y: 10.9, z:  9,   bank: -90 },  //  9 ¾ roll
      { x: 136, y: 10.7, z: 10,   bank:   0 },  // 10 roll out
      { x: 150, y: 6.5,  z: 14,   bank:   0 },  // 11 runout
      { x: 162, y: 7.0,  z: 28,   bank:  55 },  // 12 turn entry
      { x: 168, y: 7.5,  z: 44,   bank:  48 },  // 13 turn apex  ⚑
      { x: 158, y: 8.0,  z: 58,   bank:  55 },  // 14 turn exit
      { x: 128, y: 13.0, z: 62,   bank:   0 },  // 15 camelback
      { x: 100, y: 5.5,  z: 60,   bank:   0 },  // 16 dip
      { x:  70, y: 9.0,  z: 56,   bank:  15 },  // 17 hill
      { x:  40, y: 6.5,  z: 50,   bank:  40 },  // 18 return turn
      { x:  14, y: 6.0,  z: 38,   bank:  30 },  // 19 return
      { x:  -2, y: 5.0,  z: 22,   bank:  10 },  // 20 brake run
      { x:  -8, y: 3.5,  z: 10,   bank:   0 }   // 21 approach
    ]
  };
}
const TEMPLATES = {
  simple: simpleDesign,
  looper: defaultDesign,
  accelerator: acceleratorDesign,
  family: familyDesign,
  twister: twisterDesign,
  barrel: barrelDesign,
  oval: ovalDesign
};

/* @clab-random-start — procedural coaster generator (pure; eval-sliced by tests)
   Turns a number into a whole, buildable coaster. Three ideas keep the output
   rideable instead of random noise:
     1. GROUND PLAN — a closed star-shaped loop (radius positive at every angle,
        angles strictly increasing), which cannot cross itself.
     2. ENERGY BUDGET — the lift fixes an energy ceiling, and every metre after
        it is charged rolling resistance plus quadratic air drag, so hills get
        lower as the lap goes on and the train always clears them with speed in
        hand instead of stalling.
     3. PHYSICS-DERIVED BANKING — each turn is banked at atan(v²/gr) using the
        speed energy conservation predicts there, faded out across a pull-out
        (banking one rotates seat-g into side-g) and through the brake run (the
        train is slow there, so a steep bank would over-bank). A second pass,
        autoBankDesign(), then solves the remaining side-g against the real
        sampled track, which is where the spline fillet and the rider frame
        actually live.
   Same seed, same coaster: a class can all ride "coaster #4821". */
function _clabRng(seed){
  /* mulberry32 — small, fast, and repeatable across machines */
  let a = (Math.abs(Math.trunc(Number(seed) || 1)) >>> 0) || 1;
  return function(){
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const RANDOM_STYLES = {
  family:  { label: 'Family',   crest: [15, 20], dropHead: 15, bankF: 1.00, launch: false },
  classic: { label: 'Classic',  crest: [23, 29], dropHead: 22, bankF: 0.96, launch: false },
  thrill:  { label: 'Thrill',   crest: [28, 34], dropHead: 27, bankF: 0.90, launch: false },
  launch:  { label: 'Launched', crest: [16, 23], dropHead: 26, bankF: 0.94, launch: true }
};
const RANDOM_STYLE_KEYS = Object.keys(RANDOM_STYLES);
/* NO procedural inversions, deliberately. A teardrop loop can only stay inside
   the comfort limits if the apex is still loaded, and that costs roughly a 34 m
   drop of head. Measured against this engine, a drop that deep on a
   procedurally-spaced ground plan pulls over +6 g out of the valley: the valley
   radius comes from the node spacing, and the generator cannot hand-shape it.
   Inversions are therefore a BUILD-tab job — the Vertical loop element and the
   Classic Looper template both place hand-shaped nodes for exactly this reason. */
function randomDesign(seed, opts){
  const G = 9.81, LIFTV = 3.5;
  const o = opts || {};
  const rnd = _clabRng(seed);
  const R = (lo, hi) => lo + rnd() * (hi - lo);
  const RI = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r2 = v => +v.toFixed(2);
  const styleName = RANDOM_STYLES[o.style] ? o.style
    : RANDOM_STYLE_KEYS[Math.min(RANDOM_STYLE_KEYS.length - 1, Math.floor(rnd() * RANDOM_STYLE_KEYS.length))];
  const S = RANDOM_STYLES[styleName];

  /* ---- 1. ground plan ---- */
  const N = RI(15, 19);
  const Rb = R(56, 86);
  const rot = R(0, Math.PI * 2);
  const hand = rnd() < 0.5 ? 1 : -1;
  const w1 = R(0.05, 0.15), w2 = R(0.04, 0.11), w3 = R(0.02, 0.07);
  const f1 = R(0, 6.2832), f2 = R(0, 6.2832), f3 = R(0, 6.2832);
  const radAt = t => Rb * (1 + w1 * Math.sin(t + f1) + w2 * Math.sin(2 * t + f2) + w3 * Math.sin(3 * t + f3));
  const gx = [], gz = [];
  for(let i = 0; i < N; i++){
    const t = 2 * Math.PI * (i + (i ? R(-0.2, 0.2) : 0)) / N;
    const r = radAt(t);
    gx.push(r * Math.cos(t + rot));
    gz.push(hand * r * Math.sin(t + rot));
  }
  const segLen = [], cum = [0];
  for(let i = 0; i < N; i++){
    const j = (i + 1) % N;
    segLen.push(Math.hypot(gx[j] - gx[i], gz[j] - gz[i]));
    if(i < N - 1) cum.push(cum[i] + segLen[i]);
  }
  const lap = cum[N - 1] + segLen[N - 1];

  /* ---- 2. energy budget ---- */
  const stationY = R(3.0, 4.2);
  const crestH = R(S.crest[0], S.crest[1]);
  const iCrest = clamp(Math.round(N * R(0.15, 0.22)), 2, 4);
  let accel = 7.5, crestV2 = LIFTV * LIFTV;
  if(S.launch){
    // work-energy: the launch has to deliver the crest plus some head to spare
    const zone = Math.max(10, Math.min(42, cum[iCrest] - 6) - 2);
    accel = clamp((2 * G * R(7, 13) + 2 * G * (crestH - stationY)) / (2 * zone), 5, 14);
    crestV2 = Math.max(4, 2 * accel * zone - 2 * G * (crestH - stationY));
  }
  const head = crestH + crestV2 / (2 * G);          // ideal energy ceiling, in metres
  const valleyY = clamp(head - S.dropHead * R(0.9, 1.06), 2.6, crestH - 8);
  const brakeZone = Math.min(55, Math.max(18, lap * 0.12)) + 10;
  let iBrake = N - 1;
  while(iBrake > iCrest + 4 && cum[iBrake - 1] > lap - brakeZone) iBrake--;

  const iValley = iCrest + 2;

  /* Heights, assigned in the order the train meets them, against a RUNNING energy
     budget. Friction is charged metre by metre as the sim charges it — rolling
     resistance plus quadratic air drag — because drag goes as v² and a fast
     coaster spends its height far quicker than a flat allowance would suggest.
     (The two coefficients mirror MU_ROLL / K_DRAG; kept local so the generator
     stays a pure function of its seed.) */
  const MU = 0.0065, KD = 0.00045;
  const y = new Array(N).fill(stationY);
  for(let i = 1; i <= iCrest; i++) y[i] = stationY + (crestH - stationY) * Math.pow(i / iCrest, 1.1);
  y[iCrest + 1] = valleyY + (crestH - valleyY) * R(0.42, 0.56);   // drop face
  y[iValley] = valleyY;
  let headNow = head;
  const spend = (dist, atY) => {
    const v2 = Math.max(4, 2 * G * (headNow - atY));
    headNow -= Math.max(0, dist) * (MU * 2.0 + KD * v2 / G);
  };
  for(let i = iCrest + 1; i <= iValley; i++) spend(segLen[i - 1], Math.min(y[i], y[i - 1]));

  const iFeature = iValley + 1;
  let hill = true;
  for(let i = iFeature; i < iBrake; i++){
    spend(segLen[i - 1], Math.max(valleyY, Math.min(y[i - 1], y[i - 2] == null ? y[i - 1] : y[i - 2]) - 1));
    const ceil = headNow - 5.5;                 // 5.5 m of head = ~10 m/s over any crest
    if(hill) y[i] = clamp(valleyY + (ceil - valleyY) * R(0.62, 0.9), valleyY + 6, Math.max(valleyY + 6, ceil));
    // dips stay well above the main valley: a second deep dip means a second big
    // pull-out, and the seat-g there stacks up fast
    else y[i] = clamp(valleyY + R(5, 12), valleyY + 4, Math.max(valleyY + 4, ceil - 5));
    hill = !hill;
  }
  // brake run eases back down to the station without dipping under the valley
  for(let i = Math.max(iBrake, iFeature); i < N; i++){
    const t = (i - iBrake + 1) / Math.max(1, N - iBrake);
    y[i] = Math.max(valleyY + 0.4, y[i - 1] + (stationY - y[i - 1]) * Math.min(1, t));
  }

  /* ---- 3. assemble ---- */
  const pts = [];
  for(let i = 0; i < N; i++) pts.push({ x: gx[i], y: y[i], z: gz[i], bank: 0 });

  /* ---- 4. banking from the physics at each node ---- */
  const K = pts.length;
  const brakeStart = lap - brakeZone;
  let certIdx = 0, certBank = 0;
  for(let i = 0; i < K; i++){
    const ri = i;
    // no banking on the lift or across the pull-out: banking a valley rotates the
    // seat-g the student just paid for into side-g
    if(ri <= iCrest || Math.abs(ri - iValley) <= 1) continue;
    const p = pts[i], a = pts[(i - 1 + K) % K], b = pts[(i + 1) % K];
    const abx = p.x - a.x, abz = p.z - a.z, bcx = b.x - p.x, bcz = b.z - p.z;
    const la = Math.hypot(abx, abz), lb = Math.hypot(bcx, bcz);
    const cross = abx * bcz - abz * bcx;
    const chord = Math.hypot(b.x - a.x, b.z - a.z);
    const area = Math.abs(cross) / 2;
    if(!(area > 1e-3) || !(la > 1e-3) || !(lb > 1e-3)) continue;
    const turnR = la * lb * chord / (4 * area);
    const v2 = Math.max(9, 2 * G * (head - p.y));
    // Predicted seat-g here, from the curvature of the height profile through the
    // node. Banking a pull-out rotates that seat-g straight into side-g, so the
    // bank has to fade out wherever the track is already pressing hard.
    const kVert = 2 * ((b.y - p.y) / lb - (p.y - a.y) / la) / (la + lb);
    const gV = 1 + v2 * kVert / G;
    const pullOut = clamp((2.3 - gV) / 1.3, 0, 1);
    const slow = clamp((brakeStart - cum[ri]) / 45, 0, 1);      // ease off into the brakes
    const ideal = Math.atan(v2 / (G * turnR)) * 180 / Math.PI;
    const bank = clamp(ideal * S.bankF * pullOut * slow * Math.sign(cross), -58, 58);
    p.bank = bank;
    if(Math.abs(bank) > Math.abs(certBank)){ certBank = bank; certIdx = i; }
  }

  const points = pts.map(p => ({
    x: r2(clamp(p.x, -258, 258)), y: r2(clamp(p.y, 0.6, 44.5)),
    z: r2(clamp(p.z, -258, 258)), bank: r2(p.bank)
  }));
  // nodes a second, track-aware banking pass is allowed to touch: everything
  // except the lift (a chain lift is never banked) and the brake run (the train
  // is slow there, so a bank sized for full speed would over-bank it)
  const bankable = [];
  for(let i = 0; i < K; i++) if(i > iCrest && i < iBrake) bankable.push(i);
  return {
    coasterlab: 1,
    points,
    certTurnIdx: certIdx,
    propulsion: { mode: S.launch ? 'launch' : 'chain', accel: r2(accel) },
    meta: { seed: Math.abs(Math.trunc(Number(seed) || 1)) >>> 0, style: styleName, label: S.label,
            crestH: r2(crestH), head: r2(head), valleyY: r2(valleyY), bankable }
  };
}
/* @clab-random-end */

/* @clab-design-normalize-start */
const DESIGN_SCHEMA = 1;
const DESIGN_MIN_POINTS = 6, DESIGN_MAX_POINTS = 80;
const DESIGN_MAX_JSON_CHARS = 64 * 1024;
const DESIGN_BOUNDS = { xz: 260, yMin: 0.5, yMax: 45, bank: 180, accelMin: 5, accelMax: 14 };
function normalizeDesign(input){
  if(!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('not a design');
  if(Object.prototype.hasOwnProperty.call(input, 'coasterlab') && input.coasterlab !== DESIGN_SCHEMA){
    throw new Error('unsupported design version');
  }
  if(!Array.isArray(input.points) ||
     input.points.length < DESIGN_MIN_POINTS || input.points.length > DESIGN_MAX_POINTS){
    throw new Error(`design needs ${DESIGN_MIN_POINTS}-${DESIGN_MAX_POINTS} nodes`);
  }
  const points = input.points.map((p, i) => {
    if(!p || typeof p !== 'object' || Array.isArray(p)) throw new Error(`bad node ${i}`);
    const bank = p.bank == null ? 0 : p.bank;
    if(![p.x, p.y, p.z, bank].every(Number.isFinite)) throw new Error(`bad node ${i}`);
    if(Math.abs(p.x) > DESIGN_BOUNDS.xz || Math.abs(p.z) > DESIGN_BOUNDS.xz ||
       p.y < DESIGN_BOUNDS.yMin || p.y > DESIGN_BOUNDS.yMax ||
       Math.abs(bank) > DESIGN_BOUNDS.bank){
      throw new Error(`node ${i} is outside the editable world`);
    }
    return { x: p.x, y: p.y, z: p.z, bank };
  });
  const rawIdx = Number.isFinite(input.certTurnIdx) ? Math.trunc(input.certTurnIdx) : 0;
  const certTurnIdx = Math.max(0, Math.min(points.length - 1, rawIdx));
  const rawProp = input.propulsion && typeof input.propulsion === 'object' ? input.propulsion : null;
  const mode = rawProp && (rawProp.mode === 'chain' || rawProp.mode === 'launch') ? rawProp.mode : 'chain';
  const accel = rawProp && Object.prototype.hasOwnProperty.call(rawProp, 'accel') ? rawProp.accel : 7.5;
  if(!Number.isFinite(accel) || accel < DESIGN_BOUNDS.accelMin || accel > DESIGN_BOUNDS.accelMax){
    throw new Error('launch acceleration is outside the editable range');
  }
  return { points, certTurnIdx, propulsion: { mode, accel } };
}
function parseDesignJson(raw){
  if(typeof raw !== 'string' || !raw.length) throw new Error('empty design');
  if(raw.length > DESIGN_MAX_JSON_CHARS) throw new Error('design is too large');
  return normalizeDesign(JSON.parse(raw));
}
/* @clab-design-normalize-end */
const DESIGN_BACKUP_KEY = 'coaster_lab_design_recovery_v1';
let designRecovery = null;
function loadDesign(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return null;
    return parseDesignJson(raw);
  }catch(e){
    let raw = null, backedUp = false;
    try{
      raw = localStorage.getItem(STORE_KEY);
      if(raw && raw.length <= DESIGN_MAX_JSON_CHARS){
        localStorage.setItem(DESIGN_BACKUP_KEY, raw);
        backedUp = true;
      }
      localStorage.removeItem(STORE_KEY);
    }catch(_e){}
    designRecovery = { raw: backedUp ? raw : null, reason: String(e && e.message || e) };
    return null;
  }
}
/* @clab-design-storage-end */
/* undo/redo history — every recorded save is a restorable snapshot */
let history = [], hIdx = -1;
function snapshot(){
  const s = JSON.stringify(design);
  if(history[hIdx] === s) return;
  history = history.slice(0, hIdx + 1);
  history.push(s);
  if(history.length > 60) history.shift();
  hIdx = history.length - 1;
  syncHistoryButtons();
}
function saveDesign(record = true){
  if(record) snapshot();
  try{ localStorage.setItem(STORE_KEY, JSON.stringify({ coasterlab: DESIGN_SCHEMA, ...design })); }catch(_e){}
}
let design = loadDesign() || normalizeDesign(defaultDesign());

/* ---------------- three.js scene ---------------- */
const canvas = __clabGet('clab-gl');
let renderer;
try{
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
}catch(e){
  showFatal('WebGL is not available in this browser: ' + e.message);
  throw e;
}
__clabResources.renderer = renderer;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
__clabResources.sceneRoot = scene;
scene.fog = new THREE.Fog(VISUAL_THEMES[visualTheme].fog, VISUAL_THEMES[visualTheme].fogNear, VISUAL_THEMES[visualTheme].fogFar);

const camera = new THREE.PerspectiveCamera(55, 2, 0.1, 2600);

/* dusk lighting: one low warm sun, cool hemisphere, faint cool fill */
const hemi = new THREE.HemisphereLight(VISUAL_THEMES[visualTheme].hemiSky, VISUAL_THEMES[visualTheme].hemiGround, VISUAL_THEMES[visualTheme].hemi);
scene.add(hemi);
const sun = new THREE.DirectionalLight(VISUAL_THEMES[visualTheme].sun, VISUAL_THEMES[visualTheme].sunPower);
sun.position.set(260, 74, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
sun.shadow.camera.near = 20; sun.shadow.camera.far = 720;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(VISUAL_THEMES[visualTheme].fill, VISUAL_THEMES[visualTheme].fillPower);
fill.position.set(-140, 90, -120);
scene.add(fill);

/* sky dome: gradient dusk, sun glow + disc, sparse stars overhead */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2200, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      sunDir: { value: new THREE.Vector3(260, 74, 50).normalize() },
      zenColor: { value: new THREE.Color(VISUAL_THEMES[visualTheme].zen) },
      midColor: { value: new THREE.Color(VISUAL_THEMES[visualTheme].mid) },
      horizonColor: { value: new THREE.Color(VISUAL_THEMES[visualTheme].horizon) },
      sunGlow: { value: new THREE.Color(VISUAL_THEMES[visualTheme].sunGlow) },
      starStrength: { value: VISUAL_THEMES[visualTheme].stars }
    },
    vertexShader:
      'varying vec3 vDir;' +
      'void main(){ vDir = normalize(position);' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'varying vec3 vDir; uniform vec3 sunDir, zenColor, midColor, horizonColor, sunGlow; uniform float starStrength;' +
      'float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0;' +
      ' return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }' +
      'void main(){' +
      ' float h = clamp(vDir.y, -0.05, 1.0);' +
      ' vec3 zen = zenColor;' +
      ' vec3 mid = midColor;' +
      ' vec3 hor = horizonColor;' +
      ' vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));' +
      ' col = mix(col, zen, smoothstep(0.22, 0.75, h));' +
      ' float sd = max(dot(vDir, sunDir), 0.0);' +
      ' col += sunGlow * pow(sd, 22.0) * 0.50;' +
      ' col += sunGlow * pow(sd, 350.0) * 1.40;' +
      ' float st = step(0.9982, hash(floor(vDir * 460.0))) * smoothstep(0.12, 0.45, h);' +
      ' gl_FragColor = vec4(col + vec3(st) * starStrength, 1.0); }'
  })
);
sky.renderOrder = -1;
scene.add(sky);

/* ground: generated grass texture with mowing stripes */
const groundTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#101c12'; g.fillRect(0, 0, 256, 256);
  for(let st = 0; st < 8; st++){
    if(st % 2){ g.fillStyle = 'rgba(255,255,255,0.030)'; g.fillRect(0, st * 32, 256, 32); }
  }
  const rnd = (() => { let s = 77; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; })();
  for(let i = 0; i < 5200; i++){
    const v = rnd();
    g.fillStyle = v > 0.5 ? 'rgba(140,190,120,0.05)' : 'rgba(0,0,0,0.09)';
    g.fillRect(rnd() * 256, rnd() * 256, 1.6, 1.6);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
})();
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1400, 56).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: groundTex, color: 0xd9e2cc, roughness: 1, metalness: 0 })
);
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);
const terrainGrid = new THREE.GridHelper(1200, 120, 0x5fb9e8, 0x2f7199);
terrainGrid.position.y = 0.025;
terrainGrid.material.transparent = true;
terrainGrid.material.opacity = 0.16;
terrainGrid.visible = visualTheme === 'blueprint';
scene.add(terrainGrid);

/* materials shared across rebuilds; the scene registry disposes them on teardown */
const MAT = {
  rail:    new THREE.MeshStandardMaterial({ color: COL.accent, metalness: 0.35, roughness: 0.4, emissive: 0x3a2408 }),
  spine:   new THREE.MeshStandardMaterial({ color: 0x31424f, metalness: 0.3, roughness: 0.7 }),
  tie:     new THREE.MeshStandardMaterial({ color: 0x243240, metalness: 0.2, roughness: 0.8 }),
  support: new THREE.MeshStandardMaterial({ color: 0x3a4a58, metalness: 0.25, roughness: 0.8 }),
  footing: new THREE.MeshStandardMaterial({ color: 0x202a31, metalness: 0.05, roughness: 0.95 }),
  cap:     new THREE.MeshStandardMaterial({ color: 0x526879, metalness: 0.35, roughness: 0.62 }),
  car:     new THREE.MeshStandardMaterial({ color: 0xcfd8e0, metalness: 0.3, roughness: 0.45 }),
  carHead: new THREE.MeshStandardMaterial({ color: COL.accent, metalness: 0.3, roughness: 0.45 }),
  seat:    new THREE.MeshStandardMaterial({ color: 0x1c2836, metalness: 0.1, roughness: 0.9 }),
  chain:   new THREE.MeshStandardMaterial({ color: 0x5a6672, metalness: 0.7, roughness: 0.45 }),
  railDim: new THREE.MeshStandardMaterial({ color: 0x39434e, metalness: 0.3, roughness: 0.6 }),
  xray:    new THREE.MeshBasicMaterial({ vertexColors: true }),
  trunk:   new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 1 }),
  leaf:    new THREE.MeshStandardMaterial({ color: 0x14261a, roughness: 1 }),
  handle:  new THREE.MeshStandardMaterial({ color: 0x6e91bd, emissive: 0x183550, emissiveIntensity: 0.7, metalness: 0.1, roughness: 0.4 }),
  handleSel:  new THREE.MeshStandardMaterial({ color: COL.accent, emissive: 0x6b4207, metalness: 0.1, roughness: 0.4 }),
  handleFlag: new THREE.MeshStandardMaterial({ color: COL.pe, emissive: 0x4a1c3c, metalness: 0.1, roughness: 0.4 }),
  launchFin: new THREE.MeshBasicMaterial({ color: 0x58a6e8 }),
  runningLight: new THREE.MeshBasicMaterial({ color: 0xffc873, toneMapped: false })
};

/* station: platform + canopy + lit sign (repositioned on rebuild) */
const stationEdgeMat = new THREE.MeshBasicMaterial({ color: 0xffc873, transparent: true, opacity: 0.82, toneMapped: false });
const stationAccentMat = new THREE.MeshStandardMaterial({ color: 0xf2a63c, emissive: 0x4a2805, emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.42 });
const stationSignalMats = {
  red: new THREE.MeshStandardMaterial({ color: 0x401010, emissive: 0xff3030, emissiveIntensity: 0.12, roughness: 0.35 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x402d08, emissive: 0xffb62e, emissiveIntensity: 0.12, roughness: 0.35 }),
  green: new THREE.MeshStandardMaterial({ color: 0x0b3524, emissive: 0x46e39a, emissiveIntensity: 0.12, roughness: 0.35 })
};
const stationFlags = [];
const stationGates = [];
let stationLamp = null;
const station = new THREE.Group();
{
  const matPlat = new THREE.MeshStandardMaterial({ color: 0x22303e, metalness: 0.15, roughness: 0.85 });
  const matPost = new THREE.MeshStandardMaterial({ color: 0x3a4a58, metalness: 0.3, roughness: 0.7 });
  const plat = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 3.4), matPlat);
  plat.castShadow = plat.receiveShadow = true;
  station.add(plat);
  /* illuminated platform edges and a compact entrance arch */
  const edgeGeo = new THREE.BoxGeometry(11.8, 0.055, 0.09);
  for(const dz of [-1.68, 1.68]){
    const edge = new THREE.Mesh(edgeGeo, stationEdgeMat); edge.position.set(0, 0.58, dz); station.add(edge);
    for(let i = -5; i <= 5; i++){
      const puck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.14), stationEdgeMat);
      puck.position.set(i, 0.64, dz); station.add(puck);
    }
  }
  /* platform gates open with dispatch, reinforcing the station state */
  const gateGeo = new THREE.BoxGeometry(1.45, 0.11, 0.13);
  for(const dz of [-1.46, 1.46]) for(const dx of [-2.7, 0, 2.7]){
    const pivot = new THREE.Group();
    pivot.position.set(dx, 1.25, dz);
    const arm = new THREE.Mesh(gateGeo, stationAccentMat);
    arm.position.x = 0.72;
    pivot.add(arm);
    station.add(pivot);
    stationGates.push({ pivot, sign: dz > 0 ? -1 : 1 });
  }
  for(const dz of [-2.05, 2.05]){
    const archPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.8, 0.16), stationAccentMat);
    archPost.position.set(-5.55, 2.45, dz); station.add(archPost);
  }
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.3), stationAccentMat);
  archBeam.position.set(-5.55, 4.35, 0); station.add(archBeam);
  /* animated station pennants make the loading platform feel alive */
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xf2a63c, emissive: 0x3a2107, emissiveIntensity: 0.45, side: THREE.DoubleSide, roughness: 0.72 });
  const flagGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.15, -0.32, 0), new THREE.Vector3(0, -0.64, 0)
  ]);
  flagGeo.setIndex([0, 1, 2]); flagGeo.computeVertexNormals();
  for(const dz of [-2.12, 2.12]) for(const dx of [-3.8, -1.2, 1.4, 4.0]){
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), matPost);
    pole.position.set(dx, 5.9, dz); station.add(pole);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(dx, 6.92, dz); flag.rotation.y = dz > 0 ? Math.PI : 0;
    station.add(flag); stationFlags.push(flag);
  }
  for(const dx of [-5, 5]) for(const dz of [-1.4, 1.4]){
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), matPost);
    post.position.set(dx, 2.6, dz);
    station.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.18, 4.6), matPost);
  roof.position.y = 4.8;
  roof.castShadow = true;
  station.add(roof);
  /* three-aspect dispatch signal at the station exit */
  const signalMast = new THREE.Group();
  const mastPole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), matPost);
  mastPole.position.y = 1.7; signalMast.add(mastPole);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.25, 0.54), matPost);
  housing.position.y = 3.5; signalMast.add(housing);
  [['red', 4.18], ['amber', 3.50], ['green', 2.82]].forEach(([key, y]) => {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), stationSignalMats[key]);
    lens.position.set(0, y, -0.31); signalMast.add(lens);
  });
  signalMast.position.set(4.8, 0, -2.0); station.add(signalMast);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#141b23'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#f2a63c'; g.lineWidth = 5; g.strokeRect(7, 7, 498, 82);
  g.font = '700 52px Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f2a63c'; g.fillText('COASTER LAB', 256, 52);
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 1.4),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  sign.position.y = 5.9;
  station.add(sign);
  stationLamp = new THREE.PointLight(0xffb066, 1.0, 46, 2);
  stationLamp.position.set(0, 4.2, 0);
  station.add(stationLamp);
}
scene.add(station);

/* distant park atmosphere: low-poly ridge line and a landmark Ferris wheel */
const atmosphereGroup = new THREE.Group();
const atmosphereMat = new THREE.MeshBasicMaterial({ color: 0x101827, transparent: true, opacity: 0.62, depthWrite: false });
const ferrisMat = new THREE.MeshBasicMaterial({ color: 0xf2a63c, transparent: true, opacity: 0.78, toneMapped: false });
const ferrisCabinMat = new THREE.MeshBasicMaterial({ color: 0x59c98d, toneMapped: false });
const ridgeGeo = new THREE.ConeGeometry(24, 44, 5);
for(let i = 0; i < 16; i++){
  const a = i / 16 * Math.PI * 2, rr = 250 + (i % 3) * 24;
  const peak = new THREE.Mesh(ridgeGeo, atmosphereMat);
  peak.position.set(Math.cos(a) * rr, 20 + (i % 4) * 4, Math.sin(a) * rr);
  peak.scale.set(1 + (i % 3) * 0.35, 0.75 + (i % 4) * 0.12, 1 + ((i + 1) % 3) * 0.28);
  peak.rotation.y = a * 1.7; atmosphereGroup.add(peak);
}
const ferrisWheel = new THREE.Group();
const ferrisRotor = new THREE.Group();
ferrisRotor.position.y = 20; ferrisWheel.add(ferrisRotor);
const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(14, 0.28, 8, 64), ferrisMat);
ferrisRotor.add(wheelRing);
for(let i = 0; i < 10; i++){
  const a = i / 10 * Math.PI * 2;
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.11, 0.11), ferrisMat);
  spoke.rotation.z = a; ferrisRotor.add(spoke);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 1.0), ferrisCabinMat);
  cabin.position.set(Math.cos(a) * 14, Math.sin(a) * 14, 0); ferrisRotor.add(cabin);
}
for(const side of [-1, 1]){
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 31, 0.42), atmosphereMat);
  leg.position.set(side * 6.6, 8.3, 0); leg.rotation.z = side * -0.43; ferrisWheel.add(leg);
}
ferrisWheel.position.set(110, 0, -94); ferrisWheel.rotation.y = -0.34;
atmosphereGroup.add(ferrisWheel);
/* theme-aware clouds and a distant bird flock add depth without dense geometry */
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xdde9f4, transparent: true, opacity: 0.18, depthWrite: false });
const cloudGroup = new THREE.Group();
for(let i = 0; i < 6; i++){
  const cluster = new THREE.Group();
  for(let j = 0; j < 4; j++){
    const puff = new THREE.Mesh(new THREE.SphereGeometry(5 + (j % 2) * 2, 8, 5), cloudMat);
    puff.position.set(j * 5.2, (j % 2) * 2.1, (j - 1.5) * 1.8);
    cluster.add(puff);
  }
  cluster.position.set(Math.cos(i * 1.73) * (150 + i * 13), 58 + (i % 3) * 9, Math.sin(i * 1.73) * (150 + i * 13));
  cloudGroup.add(cluster);
}
atmosphereGroup.add(cloudGroup);
const birdVerts = [];
for(let i = 0; i < 9; i++){
  const a = i * 0.71, x = Math.cos(a) * (70 + i * 4), y = 42 + (i % 3) * 2, z = Math.sin(a) * (70 + i * 4);
  birdVerts.push(
    new THREE.Vector3(x - 1.4, y, z), new THREE.Vector3(x, y + 0.7, z),
    new THREE.Vector3(x, y + 0.7, z), new THREE.Vector3(x + 1.4, y, z)
  );
}
const birdGeo = new THREE.BufferGeometry().setFromPoints(birdVerts);
const birdMat = new THREE.LineBasicMaterial({ color: 0xb9cedd, transparent: true, opacity: 0.5 });
const birdFlock = new THREE.LineSegments(birdGeo, birdMat);
birdFlock.position.set(-20, 0, 20);
atmosphereGroup.add(birdFlock);
scene.add(atmosphereGroup);

/* groups whose contents are rebuilt (geometry disposed each time) */
const trackGroup = new THREE.Group();
const supportGroup = new THREE.Group();
const markerGroup = new THREE.Group();
const sectionGroup = new THREE.Group();
const safetyGroup = new THREE.Group();
const handleGroup = new THREE.Group();
const previewGroup = new THREE.Group();
scene.add(trackGroup, supportGroup, markerGroup, sectionGroup, safetyGroup, handleGroup, previewGroup);

/* train: shaped cars, wheels, headlights on the lead car, brake light aft */
const trainGroup = new THREE.Group();
const cars = [];
const trainWheels = [], restraintBars = [], harnessRigs = [], riderCars = [], allRiders = [];
/* A classroom rides this thing, so the crowd looks like one. */
const RIDER_SKIN = [0xf0c8a0, 0x9c6b45, 0x5d3a24, 0xe8b48c, 0x7a4b2e, 0xc98f63];
const RIDER_SHIRT = [0x3f8fd2, 0xe5484d, 0x59c98d, 0xc05fa0, 0xf2c14e, 0x8b6ce8];
let riderSeed = 0;
{
  const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10).rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x161d26, metalness: 0.4, roughness: 0.6 });
  const glowHead = new THREE.MeshBasicMaterial({ color: 0xffe4b0 });
  const glowTail = new THREE.MeshBasicMaterial({ color: 0xff5a4d });
  const restraintMat = new THREE.MeshStandardMaterial({ color: 0x25384a, metalness: 0.48, roughness: 0.46 });
  const restraintGeo = new THREE.BoxGeometry(1.15, 0.09, 0.09);
  for(let c = 0; c < TRAIN_CARS; c++){
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.0), c === 0 ? MAT.carHead : MAT.car);
    body.position.y = 0.32;
    body.castShadow = true;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 1.1), MAT.seat);
    seat.position.set(0, 0.72, -0.2);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.44, 0.22), MAT.seat);
    back.position.set(0, 0.82, -0.72);
    car.add(body, seat, back);
    const restraint = new THREE.Mesh(restraintGeo, restraintMat);
    restraint.position.set(0, 0.95, -0.18);
    restraint.rotation.x = -0.22;
    car.add(restraint);
    restraintBars.push(restraint);
    if(c === 0){
      const nose = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.34, 0.6), MAT.carHead);
      nose.position.set(0, 0.44, 1.05);
      nose.rotation.x = -0.42;
      nose.castShadow = true;
      car.add(nose);
      for(const dx of [-0.42, 0.42]){
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), glowHead);
        lamp.position.set(dx, 0.38, 1.18);
        car.add(lamp);
      }
      const head = new THREE.PointLight(0xffd9a0, 1.1, 42, 2);
      head.position.set(0, 0.5, 1.6);
      car.add(head);
    }
    if(c === TRAIN_CARS - 1){
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glowTail);
      tail.position.set(0, 0.42, -1.05);
      car.add(tail);
    }
    /* An over-the-shoulder harness, built alongside the lap bar and shown only
       when the ride's own forces call for one. Same pivot, same swing. */
    const harness = new THREE.Group();
    harness.position.set(0, 0.84, -0.6);
    for(const hx of [-0.24, 0.24]){
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), restraintMat);
      post.position.set(hx, 0.31, 0.12);
      post.rotation.x = 0.22;
      harness.add(post);
    }
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.1), restraintMat);
    yoke.position.set(0, 0.6, 0.26);
    harness.add(yoke);
    harness.visible = false;
    car.add(harness);
    harnessRigs.push(harness);

    /* Two riders per car. They are the readout: in airtime they come off the
       seat with their arms up, under heavy g they are pressed down into it, and
       in a hard turn they lean. Each row answers to its OWN seat force. */
    const rowRiders = [];
    for(const rx of [-0.29, 0.29]){
      const who = riderSeed++;
      const g = new THREE.Group();
      g.position.set(rx, 0.86, -0.18);
      const skin = new THREE.MeshStandardMaterial({ color: RIDER_SKIN[who % RIDER_SKIN.length], roughness: 0.85 });
      const shirt = new THREE.MeshStandardMaterial({ color: RIDER_SHIRT[who % RIDER_SHIRT.length], roughness: 0.8 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.22), shirt);
      torso.position.y = 0.2;
      torso.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), skin);
      head.position.y = 0.52;
      head.castShadow = true;
      g.add(torso, head);
      const arms = [];
      for(const ax of [-0.19, 0.19]){
        // pivot at the shoulder so the arm swings from hanging down to overhead
        const armGeo = new THREE.BoxGeometry(0.075, 0.34, 0.075).translate(0, -0.17, 0);
        const arm = new THREE.Mesh(armGeo, skin);
        arm.position.set(ax, 0.36, 0);
        g.add(arm);
        arms.push(arm);
      }
      car.add(g);
      rowRiders.push({ g, arms, baseY: g.position.y });
      allRiders.push(g);
    }
    riderCars.push(rowRiders);

    for(const dz of [-0.68, 0.68]) for(const dx of [-0.62, 0.62]){
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(dx, 0.05, dz);
      trainWheels.push(w);
      car.add(w);
    }
    trainGroup.add(car);
    cars.push(car);
  }
}
scene.add(trainGroup);

/* live physics vectors: velocity, seat force, and gravity at the lead car */
const vectorGroup = new THREE.Group();
const vectorVelocity = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 8, 0x55b7ff, 1.5, 0.8);
const vectorSeat = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 7, 0xf2a63c, 1.5, 0.8);
const vectorGravity = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 6, 0xd38bff, 1.4, 0.75);
vectorGroup.add(vectorVelocity, vectorSeat, vectorGravity);
vectorGroup.visible = false;
scene.add(vectorGroup);
let vectorsOn = (() => { try{ return localStorage.getItem('coaster_lab_vectors') === 'on'; }catch(_e){ return false; } })();
const vectorPos = new THREE.Vector3(), vectorTan = new THREE.Vector3(), vectorUp = new THREE.Vector3();
const vectorSeatDir = new THREE.Vector3(), vectorGravityDir = new THREE.Vector3(0, -1, 0);

/* speed streaks are world-space line segments around the train, never a screen filter */
const SPEED_STREAK_COUNT = 42;
const speedStreakPositions = new Float32Array(SPEED_STREAK_COUNT * 6);
const speedStreakGeo = new THREE.BufferGeometry();
speedStreakGeo.setAttribute('position', new THREE.BufferAttribute(speedStreakPositions, 3));
const speedStreakMat = new THREE.LineBasicMaterial({ color: 0xffc873, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const speedStreaks = new THREE.LineSegments(speedStreakGeo, speedStreakMat);
speedStreaks.visible = false; speedStreaks.frustumCulled = false; scene.add(speedStreaks);
const speedStreakSeed = Array.from({ length: SPEED_STREAK_COUNT }, (_, i) => ({
  phase: ((i * 37) % SPEED_STREAK_COUNT) / SPEED_STREAK_COUNT,
  angle: ((i * 2.399963) % (Math.PI * 2)),
  radius: 2.4 + (i % 7) * 0.62
}));
const streakPos = new THREE.Vector3(), streakTan = new THREE.Vector3(), streakUp = new THREE.Vector3(), streakSide = new THREE.Vector3();
const streakHead = new THREE.Vector3(), streakTail = new THREE.Vector3();

/* ---------------- track geometry & frames ---------------- */
let track = null;      // sampled track data
let analysis = null;   // certification analysis

function computeTrackData(pts){
  const vecs = pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(vecs, true, 'centripetal', 0.5);
  const K = pts.length;

  const pos = [], T = [];
  for(let i = 0; i < M; i++) pos.push(curve.getPoint(i / M));

  /* fillet the spline: cyclic box-blur so curvature doesn't spike at nodes
     (real track is smooth steel — design nodes are guides, not kinks) */
  const R_SM = 25, PASSES = 3;
  for(let p = 0; p < PASSES; p++){
    for(const comp of ['x', 'y', 'z']){
      const src = pos.map(v => v[comp]);
      let sum = 0;
      for(let k = -R_SM; k <= R_SM; k++) sum += src[(k + M) % M];
      for(let i = 0; i < M; i++){
        pos[i][comp] = sum / (2 * R_SM + 1);
        sum += src[(i + R_SM + 1) % M] - src[(i - R_SM + M) % M];
      }
    }
  }

  for(let i = 0; i < M; i++){
    T.push(new THREE.Vector3().subVectors(pos[(i + 1) % M], pos[(i - 1 + M) % M]).normalize());
  }

  const s = new Float64Array(M + 1);
  for(let i = 1; i <= M; i++) s[i] = s[i - 1] + pos[i % M].distanceTo(pos[i - 1]);
  const L = s[M];

  /* parallel-transported normal (rotation-minimizing frame) */
  const N = [];
  let n = new THREE.Vector3(0, 1, 0).addScaledVector(T[0], -T[0].y).normalize();
  if(n.lengthSq() < 1e-6) n = new THREE.Vector3(1, 0, 0);
  const q = new THREE.Quaternion(), axis = new THREE.Vector3();
  for(let i = 0; i < M; i++){
    N.push(n.clone());
    const t0 = T[i], t1 = T[(i + 1) % M];
    axis.crossVectors(t0, t1);
    const alen = axis.length();
    if(alen > 1e-9){
      const ang = Math.atan2(alen, THREE.MathUtils.clamp(t0.dot(t1), -1, 1));
      q.setFromAxisAngle(axis.divideScalar(alen), ang);
      n = n.clone().applyQuaternion(q);
      n.addScaledVector(t1, -n.dot(t1)).normalize();
    }
  }
  /* Base frame: anchored to the horizon wherever the track is normal, so a
     "45° bank" always means 45° from horizontal. Parallel transport alone
     accumulates roll drift (holonomy) through a helical loop; the transported
     frame is kept only through inverted/vertical sections where the
     horizon-projected normal is undefined or flipped. */
  const BASE = [];
  for(let i = 0; i < M; i++){
    const nh = new THREE.Vector3(0, 1, 0).addScaledVector(T[i], -T[i].y);
    const lh = nh.length();
    let base = N[i].clone();
    if(lh > 0.15){
      nh.divideScalar(lh);
      const w = THREE.MathUtils.smoothstep(base.dot(nh), 0.1, 0.7);
      base.lerp(nh, w).addScaledVector(T[i], -base.dot(T[i])).normalize();
    }
    BASE.push(base);
  }
  /* relax the base frame so blend boundaries don't kink */
  for(let p = 0; p < 12; p++){
    const prev = BASE.map(v => v.clone());
    for(let i = 0; i < M; i++){
      BASE[i].copy(prev[(i - 1 + M) % M]).multiplyScalar(0.25)
        .addScaledVector(prev[i], 0.5)
        .addScaledVector(prev[(i + 1) % M], 0.25);
      BASE[i].addScaledVector(T[i], -BASE[i].dot(T[i])).normalize();
    }
  }

  /* per-sample bank angle, cosine-smoothed and SHORTEST-PATH between nodes:
     0→90→180→−90→0 walks a full 360° heartline roll instead of unwinding */
  const bankAt = t => {
    const f = t * K, i0 = ((Math.floor(f)) % K + K) % K, i1 = (i0 + 1) % K;
    const u = f - Math.floor(f);
    const b0 = pts[i0].bank || 0, b1 = pts[i1].bank || 0;
    const d = ((b1 - b0) % 360 + 540) % 360 - 180;
    return (b0 + d * (0.5 - 0.5 * Math.cos(Math.PI * u))) * Math.PI / 180;
  };

  const up = [], side = [];
  const tw = new THREE.Quaternion();
  for(let i = 0; i < M; i++){
    const u = BASE[i].clone().applyQuaternion(tw.setFromAxisAngle(T[i], bankAt(i / M)));
    up.push(u);
    side.push(new THREE.Vector3().crossVectors(u, T[i]).normalize());
  }

  /* curvature components: dT/ds projected on rider frame */
  const kUp = new Float64Array(M), kSide = new Float64Array(M), kH = new Float64Array(M);
  const y = new Float64Array(M), Ty = new Float64Array(M);
  const upY = new Float64Array(M), sideY = new Float64Array(M);
  const dT = new THREE.Vector3();
  for(let i = 0; i < M; i++){
    const ip = (i - 1 + M) % M, inx = (i + 1) % M;
    const ds = (s[i + 1] - s[i]) + (i === 0 ? (L - s[M - 1]) : (s[i] - s[i - 1]));
    dT.subVectors(T[inx], T[ip]).divideScalar(Math.max(ds, 1e-6));
    kUp[i] = dT.dot(up[i]);
    kSide[i] = dT.dot(side[i]);
    kH[i] = Math.hypot(dT.x, dT.z);
    y[i] = pos[i].y; Ty[i] = T[i].y;
    upY[i] = up[i].y; sideY[i] = side[i].y;
  }

  /* lift crest: first local max of y after the station */
  let sCrest = null, crestIdx = null;
  const w = 25;
  for(let i = 40; i < M - w; i++){
    if(y[i] < y[0] + 4) continue;
    let isMax = true;
    for(let k = -w; k <= w; k++){ if(y[i + k] > y[i]){ isMax = false; break; } }
    if(isMax){ sCrest = s[i]; crestIdx = i; break; }
  }

  return { curve, pos, T, up, side, s, L, y, Ty, kUp, kSide, kH, upY, sideY, sCrest, crestIdx, K };
}

/* brake run scales with circuit length so compact layouts keep their drop */
function brakeLen(){
  return track ? Math.min(BRAKE_LEN, Math.max(18, track.L * 0.12)) : BRAKE_LEN;
}

/* interpolated lookup by arc length (mod L) */
const TMP = { y:0, Ty:0, kUp:0, kSide:0, upY:0, sideY:0, i:0, f:0 };
function trackAt(S){
  const t = track;
  let sq = S % t.L; if(sq < 0) sq += t.L;
  let lo = 0, hi = M;
  while(hi - lo > 1){ const mid = (lo + hi) >> 1; if(t.s[mid] <= sq) lo = mid; else hi = mid; }
  const seg = Math.max(t.s[lo + 1] - t.s[lo], 1e-9);
  const f = (sq - t.s[lo]) / seg, i2 = (lo + 1) % M;
  TMP.i = lo; TMP.f = f;
  TMP.y     = t.y[lo]     + (t.y[i2]     - t.y[lo])     * f;
  TMP.Ty    = t.Ty[lo]    + (t.Ty[i2]    - t.Ty[lo])    * f;
  TMP.kUp   = t.kUp[lo]   + (t.kUp[i2]   - t.kUp[lo])   * f;
  TMP.kSide = t.kSide[lo] + (t.kSide[i2] - t.kSide[lo]) * f;
  TMP.upY   = t.upY[lo]   + (t.upY[i2]   - t.upY[lo])   * f;
  TMP.sideY = t.sideY[lo] + (t.sideY[i2] - t.sideY[lo]) * f;
  return TMP;
}
function frameAt(S, outPos, outT, outUp){
  const t = track;
  trackAt(S);
  const i = TMP.i, f = TMP.f, i2 = (i + 1) % M;
  outPos.lerpVectors(t.pos[i], t.pos[i2], f);
  outT.lerpVectors(t.T[i], t.T[i2], f).normalize();
  outUp.lerpVectors(t.up[i], t.up[i2], f).normalize();
}

/* ---------------- track meshes ---------------- */
function disposeGroup(g){
  for(let i = g.children.length - 1; i >= 0; i--){
    const c = g.children[i];
    if(c.geometry) c.geometry.dispose();
    if(c.material && c.material.map) c.material.map.dispose();
    if(c.isSprite && c.material) c.material.dispose();
    g.remove(c);
  }
}

function rebuildTrackMeshes(){
  disposeGroup(trackGroup);
  disposeGroup(supportGroup);
  const t = track;

  /* offset curves for rails & spine */
  const step = 4, RP = [], LP = [], SP = [];
  const tmp = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  for(let i = 0; i < M; i += step){
    RP.push(tmp.copy(t.pos[i]).addScaledVector(t.side[i],  0.9).addScaledVector(t.up[i], 0.10).clone());
    LP.push(tmp.copy(t.pos[i]).addScaledVector(t.side[i], -0.9).addScaledVector(t.up[i], 0.10).clone());
    SP.push(tmp.copy(t.pos[i]).addScaledVector(t.up[i], -0.30).clone());
  }
  const seg = Math.min(900, RP.length * 2);
  const railMat = xrayMode ? MAT.railDim : MAT.rail;
  const spineR = xrayMode ? 0.30 : 0.17;
  for(const [ptsArr, r, mat, isSpine] of
      [[RP, 0.09, railMat, false], [LP, 0.09, railMat, false], [SP, spineR, MAT.spine, true]]){
    const c = new THREE.CatmullRomCurve3(ptsArr, true, 'catmullrom', 0.5);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 6, true), mat);
    mesh.castShadow = true;
    trackGroup.add(mesh);
    if(isSpine) trackGroup.userData.spine = mesh;
  }
  if(xrayMode && analysis) colorizeSpine();

  /* propulsion dressing: chain up the lift, or glowing LSM fins */
  if(t.sCrest != null && design.propulsion.mode === 'chain'){
    const CP = [];
    for(let i = 0; i < M; i += 4){
      if(t.s[i] > t.sCrest) break;
      CP.push(tmp.copy(t.pos[i]).addScaledVector(t.up[i], 0.06).clone());
    }
    if(CP.length > 3){
      const c = new THREE.CatmullRomCurve3(CP, false, 'catmullrom', 0.5);
      trackGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c, CP.length * 2, 0.07, 5, false), MAT.chain));
    }
  }
  if(t.sCrest != null && design.propulsion.mode === 'launch'){
    const sEnd = Math.max(12, Math.min(42, t.sCrest - 6));
    const fins = [];
    for(let i = 0; i < M; i += 6){
      if(t.s[i] > sEnd) break;
      if(t.s[i] < 1) continue;
      fins.push(i);
    }
    if(fins.length){
      const fin = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.5, 0.1, 1.0),
        MAT.launchFin,
        fins.length
      );
      fins.forEach((i, k) => {
        m4.makeBasis(t.side[i], t.up[i], t.T[i])
          .setPosition(tmp.copy(t.pos[i]).addScaledVector(t.up[i], 0.14));
        fin.setMatrixAt(k, m4);
      });
      fin.instanceMatrix.needsUpdate = true;
      trackGroup.add(fin);
    }
  }

  /* ties */
  const tieEvery = 8, tieCount = Math.floor(M / tieEvery);
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.09, 0.42), MAT.tie, tieCount);
  for(let k = 0; k < tieCount; k++){
    const i = k * tieEvery;
    m4.makeBasis(t.side[i], t.up[i], t.T[i]).setPosition(t.pos[i]);
    ties.setMatrixAt(k, m4);
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.castShadow = true;
  trackGroup.add(ties);

  /* supports down to the ground: columns, concrete footings, and cross caps */
  const supEvery = 20, maxSup = Math.ceil(M / supEvery);
  const sup = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.2, 1, 8), MAT.support, maxSup);
  const foot = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), MAT.footing, maxSup);
  const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(2.45, 0.16, 0.24), MAT.cap, maxSup);
  let used = 0;
  const sc = new THREE.Vector3(), pp = new THREE.Vector3();
  for(let i = 0; i < M; i += supEvery){
    const attachY = t.pos[i].y - 0.5;
    if(t.up[i].y < 0.35 || attachY < 0.9) continue;
    pp.set(t.pos[i].x, attachY / 2, t.pos[i].z);
    sc.set(1, attachY, 1);
    m4.identity().makeScale(sc.x, sc.y, sc.z).setPosition(pp.x, pp.y, pp.z);
    const supportIdx = used++;
    sup.setMatrixAt(supportIdx, m4);
    m4.identity().setPosition(t.pos[i].x, 0.11, t.pos[i].z); foot.setMatrixAt(supportIdx, m4);
    m4.makeBasis(t.side[i], t.up[i], t.T[i])
      .setPosition(tmp.copy(t.pos[i]).addScaledVector(t.up[i], -0.46));
    cap.setMatrixAt(supportIdx, m4);
  }
  for(const mesh of [sup, foot, cap]){
    mesh.count = used;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    supportGroup.add(mesh);
  }

  /* running lights under the spine — the dusk payoff */
  const liteEvery = 24, liteCount = Math.ceil(M / liteEvery);
  const lites = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 6), MAT.runningLight, liteCount);
  let ln = 0;
  for(let i = 0; i < M; i += liteEvery){
    m4.identity().setPosition(
      t.pos[i].x - t.up[i].x * 0.46,
      t.pos[i].y - t.up[i].y * 0.46,
      t.pos[i].z - t.up[i].z * 0.46);
    lites.setMatrixAt(ln++, m4);
  }
  lites.count = ln;
  lites.instanceMatrix.needsUpdate = true;
  trackGroup.add(lites);

  /* station beside sample 0, aligned with the track heading */
  station.position.copy(t.pos[0]).addScaledVector(t.side[0], 2.6);
  station.position.y = Math.max(t.pos[0].y - 0.9, 0.55);
  station.rotation.y = Math.atan2(-t.T[0].z, t.T[0].x);
}

/* ---------------- X-ray view: spine heat-colored by predicted seat g ---- */
let heatmapMode = (() => { try{ return localStorage.getItem('coaster_lab_track_viz') || 'track'; }catch(_e){ return 'track'; } })();
let xrayMode = heatmapMode !== 'track';
const XSTOPS = [
  [-1, new THREE.Color(0xc05fa0).convertSRGBToLinear()],   // ejector airtime
  [0.3, new THREE.Color(0x3f8fd2).convertSRGBToLinear()],  // floater
  [1, new THREE.Color(0x39424c).convertSRGBToLinear()],    // cruising — neutral
  [3, new THREE.Color(0xf2a63c).convertSRGBToLinear()],    // firm pull
  [6, new THREE.Color(0xe5484d).convertSRGBToLinear()]     // at the limit
];
MAT.xray.toneMapped = false;
function gvColor(g, out){
  if(g <= XSTOPS[0][0]) return out.copy(XSTOPS[0][1]);
  for(let k = 1; k < XSTOPS.length; k++){
    if(g <= XSTOPS[k][0]){
      const g0 = XSTOPS[k - 1][0], c0 = XSTOPS[k - 1][1];
      return out.copy(c0).lerp(XSTOPS[k][1], (g - g0) / (XSTOPS[k][0] - g0));
    }
  }
  return out.copy(XSTOPS[XSTOPS.length - 1][1]);
}
function idealGV(i){
  if(!analysis || track.s[i] < track.sCrest) return 1;
  const v2 = Math.max(0, analysis.A.v ** 2 + 2 * G0 * (analysis.A.h - track.y[i]));
  return track.upY[i] + v2 * track.kUp[i] / G0;
}
const HEAT_RAMP = [
  new THREE.Color(0x472d7b).convertSRGBToLinear(),
  new THREE.Color(0x2f7ed8).convertSRGBToLinear(),
  new THREE.Color(0x23a884).convertSRGBToLinear(),
  new THREE.Color(0xf4d35e).convertSRGBToLinear()
];
const HEAT_CONFIG = {
  speed: { label: 'Predicted speed', min: 0, max: 40, unit: 'm/s' },
  vertical: { label: 'Predicted vertical g', min: -1, max: 6, unit: 'g' },
  lateral: { label: 'Predicted lateral g', min: 0, max: 2, unit: 'g' },
  curvature: { label: 'Track curvature', min: 0, max: 12, unit: '1/100 m' }
};
function idealV2(i){
  if(!analysis || track.s[i] < track.sCrest) return LIFT_V * LIFT_V;
  return Math.max(0, analysis.A.v ** 2 + 2 * G0 * (analysis.A.h - track.y[i]));
}
function idealGLat(i){
  const v2 = idealV2(i);
  return track.sideY[i] + v2 * track.kSide[i] / G0;
}
function rampColor(t, out){
  const x = Math.max(0, Math.min(0.999, t)) * (HEAT_RAMP.length - 1), k = Math.floor(x);
  return out.copy(HEAT_RAMP[k]).lerp(HEAT_RAMP[k + 1], x - k);
}
function heatColor(i, out){
  if(heatmapMode === 'vertical') return gvColor(idealGV(i), out);
  const cfg = HEAT_CONFIG[heatmapMode] || HEAT_CONFIG.speed;
  let value = 0;
  if(heatmapMode === 'speed') value = Math.sqrt(idealV2(i));
  else if(heatmapMode === 'lateral') value = Math.abs(idealGLat(i));
  else value = Math.hypot(track.kUp[i], track.kSide[i]) * 100;
  return rampColor((value - cfg.min) / (cfg.max - cfg.min), out);
}
function colorizeSpine(){
  const spine = trackGroup.userData.spine;
  if(!spine || !analysis) return;
  const geo = spine.geometry;
  const tub = geo.parameters.tubularSegments, rad = geo.parameters.radialSegments;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const cTmp = new THREE.Color();
  for(let i = 0; i <= tub; i++){
    const si = Math.min(M - 1, Math.round(i / tub * M)) % M;
    heatColor(si, cTmp);
    for(let j = 0; j <= rad; j++){
      const vi = (i * (rad + 1) + j) * 3;
      colors[vi] = cTmp.r; colors[vi + 1] = cTmp.g; colors[vi + 2] = cTmp.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  spine.material = MAT.xray;
}

/* ---------------- trees (deterministic scatter, avoids the track) ------- */
const treeGroup = new THREE.Group();
scene.add(treeGroup);
function rebuildTrees(){
  disposeGroup(treeGroup);
  if(!track) return;
  let seed = 20260716;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const box = new THREE.Box3();
  for(let i = 0; i < M; i += 20) box.expandByPoint(track.pos[i]);
  const ctr = box.getCenter(new THREE.Vector3());
  const rad = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5;
  const spots = [];
  for(let tries = 0; tries < 170 && spots.length < 46; tries++){
    const ang = rnd() * Math.PI * 2;
    const rr = rad * (0.5 + rnd() * 1.5) + 12;
    const x = ctr.x + Math.cos(ang) * rr, z = ctr.z + Math.sin(ang) * rr * 0.85;
    if(Math.hypot(x - ctr.x, z - ctr.z) > 300) continue;
    let ok = Math.hypot(x - track.pos[0].x, z - track.pos[0].z) > 16;
    for(let i = 0; ok && i < M; i += 12){
      if(Math.hypot(x - track.pos[i].x, z - track.pos[i].z) < 10) ok = false;
    }
    if(ok) spots.push({ x, z, th: 1.4 + rnd() * 2.2, ch: 3 + rnd() * 3.4, cr: 1.5 + rnd() * 1.7 });
  }
  const n = spots.length;
  if(!n) return;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.38, 1, 6), MAT.trunk, n);
  const con1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), MAT.leaf, n);
  const con2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), MAT.leaf, n);
  const m4 = new THREE.Matrix4();
  spots.forEach((p, i) => {
    m4.makeScale(1, p.th, 1).setPosition(p.x, p.th / 2, p.z); trunk.setMatrixAt(i, m4);
    m4.makeScale(p.cr, p.ch, p.cr).setPosition(p.x, p.th + p.ch * 0.42, p.z); con1.setMatrixAt(i, m4);
    m4.makeScale(p.cr * 0.66, p.ch * 0.72, p.cr * 0.66).setPosition(p.x, p.th + p.ch * 0.88, p.z); con2.setMatrixAt(i, m4);
  });
  for(const im of [trunk, con1, con2]){
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    treeGroup.add(im);
  }
}

/* ---------------- editor handles ---------------- */
const handleGeo = new THREE.SphereGeometry(0.85, 16, 12);
let selIdx = -1;
function refreshHandles(){
  while(handleGroup.children.length > design.points.length){
    handleGroup.remove(handleGroup.children[handleGroup.children.length - 1]);
  }
  while(handleGroup.children.length < design.points.length){
    handleGroup.add(new THREE.Mesh(handleGeo, MAT.handle));
  }
  design.points.forEach((p, i) => {
    const h = handleGroup.children[i];
    h.position.set(p.x, p.y, p.z);
    h.userData.idx = i;
    h.material = i === selIdx ? MAT.handleSel : (i === design.certTurnIdx ? MAT.handleFlag : MAT.handle);
    h.scale.setScalar(i === selIdx ? 1.45 : (i === design.certTurnIdx ? 1.18 : 1));
  });
}

/* ---------------- markers (A/B/C/D) ---------------- */
function makeLabelSprite(letter, hex){
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const g = cv.getContext('2d');
  g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2);
  g.fillStyle = 'rgba(22,31,41,0.92)'; g.fill();
  g.lineWidth = 5; g.strokeStyle = '#' + hex.toString(16).padStart(6, '0'); g.stroke();
  g.font = '700 46px Consolas, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#' + hex.toString(16).padStart(6, '0');
  g.fillText(letter, 48, 51);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  sp.scale.set(2.6, 2.6, 1);
  return sp;
}
function renderMarkers(){
  disposeGroup(markerGroup);
  if(!analysis) return;
  for(const key of MARKER_KEYS){
    const mk = analysis[key];
    if(!mk) continue;
    const sp = makeLabelSprite(key, MARKER_COL[key]);
    sp.position.copy(track.pos[mk.idx]).add(new THREE.Vector3(0, 3.2, 0));
    markerGroup.add(sp);
  }
}
function makeSectionSprite(label){
  const cfg = VISUAL_THEMES[visualTheme] || VISUAL_THEMES.dusk;
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 96;
  const g = cv.getContext('2d');
  const accent = '#' + cfg.rail.toString(16).padStart(6, '0');
  const bg = visualTheme === 'daylight' ? 'rgba(20,42,36,0.9)' : visualTheme === 'blueprint' ? 'rgba(7,34,55,0.92)' : 'rgba(10,16,23,0.9)';
  g.fillStyle = bg; g.fillRect(4, 4, 376, 88);
  g.strokeStyle = accent; g.lineWidth = 4;
  g.strokeRect(5, 5, 374, 86);
  g.font = '600 34px Segoe UI, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = accent;
  g.fillText(label.toUpperCase(), 192, 50);
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(7.8, 1.95, 1);
  sp.renderOrder = 4;
  return sp;
}
function renderSectionLabels(){
  disposeGroup(sectionGroup);
  if(!track || !analysis || fxLite) return;
  const feature = analysis.C ? ['Inversion', analysis.C.s] : analysis.D ? ['Banked turn', analysis.D.s] : ['Valley', analysis.B.s];
  const defs = [
    [design.propulsion.mode === 'launch' ? 'Launch' : 'Lift hill', track.sCrest * 0.5],
    ['First drop', (analysis.A.s + analysis.B.s) * 0.5],
    feature,
    ['Brake run', track.L - brakeLen() * 0.5]
  ];
  for(const [label, arc] of defs){
    trackAt(arc);
    const idx = TMP.i;
    const sp = makeSectionSprite(label);
    sp.position.copy(track.pos[idx]).add(new THREE.Vector3(0, 4.8, 0));
    sectionGroup.add(sp);
  }
}


/* @clab-geometry-preflight-start — pure sampled-geometry checks */
function geometryPreflightSamples(pos, s, L, nodes = [], options = {}){
  const findings = [];
  const n = pos && typeof pos.length === 'number' ? pos.length : 0;
  const clearance = Number.isFinite(options.clearance) ? options.clearance : 2.4;
  const adjacentArc = Number.isFinite(options.adjacentArc) ? options.adjacentArc : 14;
  const groundMin = Number.isFinite(options.groundMin) ? options.groundMin : 0.32;
  const maxSamples = Number.isFinite(options.maxSamples) ? Math.max(40, options.maxSamples) : 700;
  if(n < 4 || !s || s.length < n || !Number.isFinite(L) || L <= 0){
    return [{ kind: 'geometry-invalid', severity: 'bad', sampleIdx: 0,
      title: 'Track geometry could not be checked', detail: 'Reset or revise the design before running it.' }];
  }
  let ground = null, collapsed = null, prevArc = -Infinity;
  for(let i = 0; i < n; i++){
    const p = pos[i], arc = s[i];
    if(!p || ![p.x, p.y, p.z, arc].every(Number.isFinite) || arc < prevArc || arc > L + 1e-6){
      return [{ kind: 'geometry-invalid', severity: 'bad', sampleIdx: i,
        title: 'Track geometry is not finite', detail: 'A node arrangement produced invalid track coordinates. Undo the last edit.' }];
    }
    if(i > 0 && arc - prevArc <= 1e-5 && !collapsed) collapsed = { idx: i };
    if(!ground || p.y < ground.y) ground = { idx: i, y: p.y };
    prevArc = arc;
  }
  if(collapsed){
    findings.push({ kind: 'geometry-degenerate', severity: 'bad', sampleIdx: collapsed.idx,
      title: 'Track collapses into itself', detail: 'Neighboring track samples occupy the same place. Separate the nearby build nodes.' });
  }
  if(ground && ground.y < groundMin){
    findings.push({ kind: 'ground-clearance', severity: 'bad', sampleIdx: ground.idx,
      title: 'Track dips into the ground',
      detail: `Centerline height reaches ${ground.y.toFixed(2)} m. Raise the nearby node to clear the terrain.` });
  }
  let closeNodes = null;
  if(nodes && nodes.length > 1){
    for(let i = 0; i < nodes.length; i++){
      const a = nodes[i], b = nodes[(i + 1) % nodes.length];
      if(!a || !b) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if(Number.isFinite(d) && d < 1.25 && (!closeNodes || d < closeNodes.distance)){
        closeNodes = { nodeIdx: i, relatedNodeIdx: (i + 1) % nodes.length, distance: d };
      }
    }
  }
  if(closeNodes){
    findings.push({ kind: 'node-spacing', severity: 'warn', sampleIdx: null, ...closeNodes,
      title: 'Adjacent build nodes are too close',
      detail: `These nodes are only ${closeNodes.distance.toFixed(2)} m apart. Separate them for a smoother track.` });
  }

  const stride = Math.max(1, Math.ceil(n / maxSamples));
  const cells = new Map(), cellSize = Math.max(clearance, 0.25);
  let closest = null;
  const key = (x, y, z) => `${x},${y},${z}`;
  for(let i = 0; i < n; i += stride){
    const p = pos[i];
    const cx = Math.floor(p.x / cellSize), cy = Math.floor(p.y / cellSize), cz = Math.floor(p.z / cellSize);
    for(let dx = -1; dx <= 1; dx++) for(let dy = -1; dy <= 1; dy++) for(let dz = -1; dz <= 1; dz++){
      const bucket = cells.get(key(cx + dx, cy + dy, cz + dz));
      if(!bucket) continue;
      for(const other of bucket){
        const rawArc = Math.abs(s[i] - other.arc);
        const arcGap = Math.min(rawArc, Math.max(0, L - rawArc));
        if(arcGap < adjacentArc) continue;
        const d2 = (p.x - other.p.x) ** 2 + (p.y - other.p.y) ** 2 + (p.z - other.p.z) ** 2;
        if(d2 < clearance * clearance && (!closest || d2 < closest.d2)){
          closest = { sampleIdx: i, relatedSampleIdx: other.i, d2 };
        }
      }
    }
    const ownKey = key(cx, cy, cz);
    if(!cells.has(ownKey)) cells.set(ownKey, []);
    cells.get(ownKey).push({ i, arc: s[i], p });
  }
  if(closest){
    const distance = Math.sqrt(closest.d2);
    const overlaps = distance < 0.65;
    findings.push({ kind: overlaps ? 'track-overlap' : 'track-clearance', severity: 'bad',
      sampleIdx: closest.sampleIdx, relatedSampleIdx: closest.relatedSampleIdx, distance,
      title: overlaps ? 'Track centerline intersects itself' : 'Track sections are too close',
      detail: overlaps
        ? 'Non-adjacent track sections occupy nearly the same space. Move the nearby nodes apart.'
        : `Non-adjacent sections pass within ${distance.toFixed(2)} m. Separate them to leave room for track and train.` });
  }
  return findings.slice(0, 4);
}
/* @clab-geometry-preflight-end */
/* ---------------- predictive safety coach ---------------- */
let safetyFindings = [];
function nearestNodeForSample(sampleIdx){
  const pos = track.pos[((sampleIdx % M) + M) % M];
  let best = 0, bestD = Infinity;
  for(let i = 0; i < design.points.length; i++){
    const p = design.points[i];
    const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 + (p.z - pos.z) ** 2;
    if(d < bestD){ bestD = d; best = i; }
  }
  return best;
}
function predictSafetyFindings(){
  const out = [];
  const add = (kind, severity, sampleIdx, title, detail, nodeIdx) => out.push({
    kind, severity, sampleIdx,
    nodeIdx: nodeIdx == null ? nearestNodeForSample(sampleIdx) : nodeIdx,
    title, detail
  });
  for(const finding of geometryPreflightSamples(track.pos, track.s, track.L, design.points)){
    out.push({ ...finding, nodeIdx: finding.nodeIdx == null
      ? nearestNodeForSample(finding.sampleIdx == null ? 0 : finding.sampleIdx)
      : finding.nodeIdx });
  }
  if(!analysis){
    add('lift', 'warn', 0, 'Build a first lift hill',
      'Raise an early node at least 4 m above the station so the train has an energy source.',
      Math.min(2, design.points.length - 1));
    return out;
  }
  const a = analysis;
  if(a.L && !a.clears){
    add('clearance', 'bad', a.A.idx, 'Launch cannot clear the crest',
      'Increase thrust or lower this first hill before testing.');
    return out;
  }
  const topEnergyH = a.A.h + a.A.v ** 2 / (2 * G0);
  let stall = null;
  let hi = { value: -Infinity, idx: a.A.idx };
  let lo = { value: Infinity, idx: a.A.idx };
  let lat = { value: 0, idx: a.A.idx };
  const endS = Math.max(a.A.s + 5, track.L - brakeLen() - 4);
  for(let i = a.A.idx + 4; i < M && track.s[i] < endS; i += 2){
    const rawV2 = a.A.v ** 2 + 2 * G0 * (a.A.h - track.y[i]);
    if(rawV2 <= 0.25){
      const deficit = track.y[i] - topEnergyH;
      if(!stall || deficit > stall.deficit) stall = { idx: i, deficit };
      continue;
    }
    const gV = track.upY[i] + rawV2 * track.kUp[i] / G0;
    const gLat = track.sideY[i] + rawV2 * track.kSide[i] / G0;
    if(gV > hi.value) hi = { value: gV, idx: i };
    if(gV < lo.value) lo = { value: gV, idx: i };
    if(Math.abs(gLat) > lat.value) lat = { value: Math.abs(gLat), idx: i };
  }
  if(stall) add('stall', 'bad', stall.idx, 'Train may stall here',
    'This hill is above the ideal energy ceiling. Lower or smooth the nearby node.');
  if(a.C && a.ans.vC < a.ans.vCmin) add('loop', 'bad', a.C.idx, 'Loop apex is too slow',
    'Riders hang in their restraints over the top. Lower or shrink the loop, or add starting energy.');
  if(hi.value > LIM.gvMax) add('vertical-high', 'bad', hi.idx, 'Too much positive seat-g',
    `Predicted +${fmt(hi.value, 1)} g. Broaden this valley or reduce the drop into it.`);
  if(lo.value < LIM.gvMin) add('vertical-low', 'bad', lo.idx, 'Too much negative seat-g',
    `Predicted ${fmt(lo.value, 1)} g. Broaden this crest or reduce the speed over it.`);
  if(lat.value > LIM.glat) add('lateral', 'bad', lat.idx, 'Side force is too high',
    `Predicted ±${fmt(lat.value, 1)} g sideways. Widen or bank this turn.`);
  return out.slice(0, 7);
}
function makeSafetySprite(n, severity){
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const g = cv.getContext('2d');
  const col = severity === 'bad' ? '#e5484d' : '#f2c14e';
  g.beginPath(); g.arc(48, 48, 38, 0, Math.PI * 2);
  g.fillStyle = 'rgba(15,21,28,.94)'; g.fill();
  g.lineWidth = 6; g.strokeStyle = col; g.stroke();
  g.font = '800 42px Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col; g.fillText(String(n), 48, 51);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(3.2, 3.2, 1); sp.renderOrder = 8;
  return sp;
}
function renderSafetyCoach(){
  const summary = __clabGet('clab-safetySummary');
  const list = __clabGet('clab-safetyList');
  if(!summary || !list) return;
  safetyFindings = predictSafetyFindings();
  disposeGroup(safetyGroup);
  summary.className = 'clab-safety-summary' + (safetyFindings.length ? '' : ' safe');
  summary.textContent = safetyFindings.length
    ? `${safetyFindings.length} design ${safetyFindings.length === 1 ? 'issue' : 'issues'} to investigate`
    : 'Geometry and ideal dynamics look clear';
  list.innerHTML = safetyFindings.map((f, i) => `
    <div class="clab-safety-item ${f.severity}">
      <span class="clab-safety-num">${i + 1}</span>
      <span class="clab-safety-copy"><b>${f.title}</b><small>${f.detail}</small></span>
      <button class="clab-safety-jump" data-safety-index="${i}">Show node ${f.nodeIdx}</button>
    </div>`).join('');
  safetyFindings.forEach((f, i) => {
    const sp = makeSafetySprite(i + 1, f.severity);
    const pos = f.sampleIdx == null
      ? new THREE.Vector3(design.points[f.nodeIdx].x, design.points[f.nodeIdx].y, design.points[f.nodeIdx].z)
      : track.pos[((f.sampleIdx % M) + M) % M];
    sp.position.copy(pos).add(new THREE.Vector3(0, 4.1, 0));
    safetyGroup.add(sp);
  });
  safetyGroup.visible = !sim.running && !__clabGet('clab-tab-build').hidden;
}
function focusSafetyFinding(index){
  const f = safetyFindings[index];
  if(!f || sim.running) return;
  camMode = 'orbit';
  __clabGet('clab-btnCam').textContent = 'Camera: Orbit';
  selectPoint(f.nodeIdx);
  const p = design.points[f.nodeIdx];
  orbit.target.set(p.x, p.y, p.z);
  orbit.radius = Math.min(orbit.radius, 105);
  userTouched = true;
  try{ ptCard.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }catch(_e){}
  banner(`Node ${f.nodeIdx} selected — ${f.title.toLowerCase()}.`, f.severity === 'bad' ? 'fail' : '', 3200);
}

/* ---------------- certification analysis ---------------- */
function analyze(){
  const t = track;
  if(t.sCrest == null) return null;
  const iC = t.crestIdx;
  const A = { idx: iC, s: t.sCrest, h: t.y[iC], v: LIFT_V };

  /* L: LSM launch section — work-energy anchor replaces the chain */
  const prop = design.propulsion;
  let Lm = null, clears = true;
  if(prop.mode === 'launch'){
    const sEnd = Math.max(12, Math.min(42, t.sCrest - 6));
    let iL = 0;
    while(iL < M - 1 && t.s[iL] < sEnd) iL++;
    const h0 = trackAt(2).y, len = sEnd - 2;
    const vEnd2 = Math.max(0, 2 * prop.accel * len - 2 * G0 * (t.y[iL] - h0));
    Lm = { idx: iL, s: sEnd, h: t.y[iL], h0, a: prop.accel, len, v: Math.sqrt(vEnd2) };
    const vA2 = vEnd2 - 2 * G0 * (A.h - Lm.h);
    clears = vA2 > 0.25;
    A.v = clears ? Math.sqrt(vA2) : 0;
  }

  /* B: lowest point of the ride after the crest (and before the brake run) */
  let iB = -1, yMin = Infinity;
  let iEnd = Math.floor(M * 0.86);
  while(iEnd > 0 && t.s[iEnd] > t.L - brakeLen() - 8) iEnd--;
  for(let i = iC + 10; i < iEnd; i++){ if(t.y[i] < yMin){ yMin = t.y[i]; iB = i; } }
  const B = iB < 0 ? null : { idx: iB, s: t.s[iB], h: t.y[iB], r: 1 / Math.max(Math.abs(t.kUp[iB]), 1e-4) };

  /* C: apex of a LOOP inversion — path must actually curve (a heartline
     barrel roll inverts the rider on a straight path: restraints hold you,
     and v_min = √(gr) simply doesn't apply, so no loop problem there) */
  let iApex = -1, yApex = -Infinity;
  for(let i = iC; i < M; i++){
    if(t.upY[i] < -0.5 && t.y[i] > yApex && Math.abs(t.kUp[i]) > 1 / 60){
      yApex = t.y[i]; iApex = i;
    }
  }
  const C = iApex < 0 ? null :
    { idx: iApex, s: t.s[iApex], h: t.y[iApex], r: 1 / Math.max(Math.abs(t.kUp[iApex]), 1e-4) };

  /* D: the flagged certification turn */
  let D = null;
  const fp = design.points[design.certTurnIdx];
  if(fp){
    let iD = 0, best = Infinity;
    const v = new THREE.Vector3(fp.x, fp.y, fp.z);
    for(let i = 0; i < M; i++){
      const d = t.pos[i].distanceToSquared(v);
      if(d < best){ best = d; iD = i; }
    }
    D = { idx: iD, s: t.s[iD], h: t.y[iD], r: 1 / Math.max(t.kH[iD], 1e-4) };
  }

  const vAt = h => Math.sqrt(Math.max(0, A.v * A.v + 2 * G0 * (A.h - h)));
  const ans = {
    vL: Lm ? Lm.v : null,
    vB: B ? vAt(B.h) : null,
    vCmin: C ? Math.sqrt(G0 * C.r) : null,
    vC: C ? vAt(C.h) : null,
    gB: B ? 1 + vAt(B.h) ** 2 * Math.abs(track.kUp[B.idx]) / G0 : null,
    vD: D ? vAt(D.h) : null,
    bankD: D ? Math.atan(vAt(D.h) ** 2 / (G0 * D.r)) * 180 / Math.PI : null
  };
  return { L: Lm, A, B, C, D, ans, clears };
}

/* ---------------- certification UI ---------------- */
const fmt = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : x.toFixed(d);
const problemsEl = __clabGet('clab-problems');
const certResultEl = __clabGet('clab-certResult');
let preds = {};   // student's checked predictions
let level = (() => {
  try{
    const saved = localStorage.getItem('coaster_lab_level');
    if(saved) return saved;
  }catch(_e){}
  /* first open inside AlloFlow: middle-schoolers start in Explore */
  return (__clabBridge && __clabBridge.suggestLevel) || 'engineer';
})();
let exploreAns = {};

function renderProblems(){
  const legend = __clabGet('clab-markerLegend');
  __clabGet('clab-engineerBtns').hidden = level !== 'engineer';
  __clabGet('clab-certIntro').innerHTML = level === 'engineer'
    ? 'To pass this educational simulation, file predictions for the flagged checkpoints — ' +
      'then run the inspection and see if the track agrees with your math. Inspection runs ' +
      'are made under <b>ideal conditions</b> (friction off), so conservation of energy holds exactly.'
    : 'Look at your track, make your predictions — then run the ride and see if the ' +
      'measurements agree with you!';
  if(!analysis){
    legend.innerHTML = '';
    problemsEl.innerHTML = '<div class="card"><h3>No lift crest found</h3>' +
      '<p class="hint" style="margin:0">The chain lift needs a first high point at least 4 m ' +
      'above the station. Raise an early node in the Build tab.</p></div>';
    certResultEl.innerHTML = '';
    return;
  }
  const a = analysis;
  const dots = [];
  for(const [k, label] of [['L', 'launch end'], ['A', 'crest'], ['B', 'valley'], ['C', 'loop apex'], ['D', 'cert. turn']]){
    if(!a[k]) continue;
    dots.push(`<span><i class="dot" style="background:#${MARKER_COL[k].toString(16).padStart(6,'0')}"></i>${k} · ${label}</span>`);
  }
  legend.innerHTML = dots.join('');
  if(level === 'explore'){ renderExplore(); return; }

  let html = '';
  if(a.L){
    html += `
    <div class="card prob" data-p="p0">
      <p class="eyebrow">Problem 0 · Launch (work–energy)</p>
      <div class="given">LSM thrust a = ${fmt(a.L.a)} m/s² over ${fmt(a.L.len)} m of track<br>launch start: h = ${fmt(a.L.h0)} m → end (L): h = ${fmt(a.L.h)} m</div>
      <p class="ask">From a standing start, how fast is the train at <b>L</b>, the end of the launch?</p>
      <div class="ansrow"><input type="number" step="0.1" id="inP0" inputmode="decimal" aria-label="speed at launch end"><span class="unit">m/s</span><span class="verdict" id="vP0"></span></div>
      <details class="work"><summary>Show the physics</summary><div>
        work–energy: thrust adds a·d, gravity takes g·Δh<br>
        v_L = √(2a·d − 2g·(h_L − h₀))
      </div></details>
    </div>`;
    if(!a.clears){
      html += `<div class="card"><p class="eyebrow">⚠ Launch too weak</p>
        <p class="hint" style="margin:0">At this thrust the train can't clear the first crest —
        it will roll back and relaunch forever. Raise the thrust in Build, or lower the crest.
        (The problems below assume it clears.)</p></div>`;
    }
  }
  html += `
    <div class="card prob" data-p="p1">
      <p class="eyebrow">Problem 1 · Conservation of energy</p>
      <div class="given">crest A: h = ${fmt(a.A.h)} m, ${a.L ? 'crossed' : 'released'} at v = ${fmt(a.A.v)} m/s<br>valley B: h = ${fmt(a.B.h)} m</div>
      <p class="ask">How fast is the train moving at <b>B</b>, the lowest point of your ride?</p>
      <div class="ansrow"><input type="number" step="0.1" id="inP1" inputmode="decimal" aria-label="speed at B"><span class="unit">m/s</span><span class="verdict" id="vP1"></span></div>
      <details class="work"><summary>Show the physics</summary><div>
        ½v² + gh is conserved (ideal conditions)<br>
        v_B = √(v_A² + 2g·(h_A − h_B))
      </div></details>
    </div>`;
  if(a.C){
    html += `
    <div class="card prob" data-p="p2">
      <p class="eyebrow">Problem 2 · Loop safety</p>
      <div class="given">loop apex C: h = ${fmt(a.C.h)} m, radius of curvature r = ${fmt(a.C.r)} m</div>
      <p class="ask">(a) Slowest speed at <b>C</b> that still presses riders into their seats?
         (b) How fast will your train actually be going there?</p>
      <div class="ansrow"><input type="number" step="0.1" id="inP2a" inputmode="decimal" aria-label="minimum speed at loop apex"><span class="unit">m/s</span><span class="verdict" id="vP2a"></span></div>
      <div class="ansrow"><input type="number" step="0.1" id="inP2b" inputmode="decimal" aria-label="predicted speed at loop apex"><span class="unit">m/s</span><span class="verdict" id="vP2b"></span></div>
      <details class="work"><summary>Show the physics</summary><div>
        weightless limit: gravity alone supplies v²/r → v_min = √(g·r)<br>
        actual: v_C = √(v_A² + 2g·(h_A − h_C)) — design is safe if v_C ≥ v_min
      </div></details>
    </div>`;
  } else {
    html += `<div class="card"><p class="eyebrow">Problem 2 · Loop safety</p>
      <p class="hint" style="margin:0">No inversion detected — add a vertical loop to unlock this problem.</p></div>`;
  }
  html += `
    <div class="card prob" data-p="p3">
      <p class="eyebrow">Problem 3 · Circular motion</p>
      <div class="given">valley B: radius of curvature r = ${fmt(a.B.r)} m</div>
      <p class="ask">How many g's does a rider feel pressed into the seat at <b>B</b>?</p>
      <div class="ansrow"><input type="number" step="0.01" id="inP3" inputmode="decimal" aria-label="seat g at valley"><span class="unit">g</span><span class="verdict" id="vP3"></span></div>
      <details class="work"><summary>Show the physics</summary><div>
        seat force = weight + centripetal: n = 1 + v_B²/(g·r)
      </div></details>
    </div>`;
  if(a.D){
    html += `
    <div class="card prob" data-p="p4">
      <p class="eyebrow">Problem 4 · Banked turn ⚑</p>
      <div class="given">flagged turn D: h = ${fmt(a.D.h)} m, turn radius r = ${fmt(a.D.r)} m</div>
      <p class="ask">What bank angle makes the turn feel like <b>zero</b> sideways force?
        (Then set node ${design.certTurnIdx}'s bank to your answer in Build.)</p>
      <div class="ansrow"><input type="number" step="1" id="inP4" inputmode="decimal" aria-label="ideal bank angle"><span class="unit">deg</span><span class="verdict" id="vP4"></span></div>
      <details class="work"><summary>Show the physics</summary><div>
        speed there: v_D = √(v_A² + 2g·(h_A − h_D))<br>
        ideal bank: tan θ = v_D²/(g·r)
      </div></details>
    </div>`;
  }
  problemsEl.innerHTML = html;
  certResultEl.innerHTML = '';
  preds = {};
}

/* ---------------- Explore level: qualitative predictions ---------------- */
function renderExplore(){
  const a = analysis;
  exploreAns = {};
  const card = (q, eyebrow, ask, opts) => {
    let h = `<div class="card prob"><p class="eyebrow">${eyebrow}</p><p class="ask">${ask}</p>
             <div class="choice" data-q="${q}">`;
    for(const [v, label] of opts) h += `<button data-v="${v}">${label}</button>`;
    return h + '</div></div>';
  };
  let html = '';
  const q1opts = [['A', 'At the top of the first big hill (A)'], ['B', 'At the bottom of the valley (B)']];
  if(a.D) q1opts.push(['D', 'In the banked turn (D)']);
  html += card('q1', 'Prediction 1 · Speed', 'Where will the train be moving <b>fastest</b>?', q1opts);
  html += card('q2', 'Prediction 2 · Energy',
    'Watch the energy bar: as the train <b>climbs</b> a hill, the blue <b>kinetic</b> part…',
    [['grows', 'Grows — climbing speeds you up'], ['shrinks', 'Shrinks — speed trades for height'],
     ['same', 'Stays the same']]);
  const q3opts = [['A', 'Cresting the first hill (A)'], ['B', 'At the bottom of the valley (B)']];
  if(a.C) q3opts.push(['C', 'Upside-down at the loop top (C)']);
  html += card('q3', 'Prediction 3 · Feeling heavy',
    'Where will riders feel <b>heaviest</b> — squashed into the seat?', q3opts);
  if(a.C){
    html += card('q4', 'Prediction 4 · The loop',
      'At the very top of the loop, riders briefly feel…',
      [['heavier', 'Heavier than normal'], ['lighter', 'Light — almost floating'], ['same', 'The same as sitting still']]);
  }
  /* The safety pair. These are the ones that transfer off the screen: the next
     time a student stands in front of a real ride's height sign, this is the
     reasoning behind it. */
  html += card('q5', 'Prediction 5 · What holds you in',
    'Look at the track you built. What will riders need to keep them in their seats?',
    [['simple', 'Just a lap bar across the legs'],
     ['ratchet', 'A lap bar that locks shut, plus a seat belt'],
     ['harness', 'A harness over the shoulders']]);
  html += card('q6', 'Prediction 6 · Where you sit',
    'Your train is five rows long. Which row gets pulled <b>hardest out of its seat</b>?',
    [['front', 'The front row'], ['mid', 'Somewhere in the middle'],
     ['back', 'The back row'], ['same', 'About the same in every row']]);
  html += '<div class="btnrow"><button id="btnExploreRun" class="primary">🎢 Run &amp; check</button></div>';
  problemsEl.innerHTML = html;
  certResultEl.innerHTML = '';
  for(const grp of problemsEl.querySelectorAll('.choice')){
    for(const b of grp.querySelectorAll('button')){
      b.addEventListener('click', () => {
        grp.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        exploreAns[grp.dataset.q] = b.dataset.v;
      });
    }
  }
  __clabGet('btnExploreRun').addEventListener('click', () => {
    if(sim.running) return;
    const need = ['q1', 'q2', 'q3', 'q5', 'q6'].concat(analysis && analysis.C ? ['q4'] : []);
    if(need.some(q => !exploreAns[q])){
      banner('Answer every prediction first!', 'fail', 2500);
      return;
    }
    startRun(false);
    sim.exploreCheck = true;
  });
}

function gradeExplore(tele){
  const m = tele.markers || {};
  const rows = [];
  const judge = (q, truth, explain) => {
    if(truth == null || !exploreAns[q]) return;
    const ok = exploreAns[q] === truth;
    rows.push({ ok, explain });
  };
  const speedKeys = ['A', 'B', 'D'].filter(k => m[k]);
  if(speedKeys.length > 1){
    const fastest = speedKeys.reduce((p, k) => (m[k].v > m[p].v ? k : p), speedKeys[0]);
    judge('q1', fastest,
      `Fastest measured: <b>${fastest}</b> at ${fmt(m[fastest].v)} m/s — the lowest point turns the most height into speed.`);
  }
  judge('q2', 'shrinks', 'Climbing trades kinetic energy for potential — the blue bar shrinks and the violet bar grows.');
  const heavyKeys = ['A', 'B', 'C'].filter(k => m[k]);
  if(heavyKeys.length > 1){
    const heaviest = heavyKeys.reduce((p, k) => (m[k].gV > m[p].gV ? k : p), heavyKeys[0]);
    judge('q3', heaviest,
      `Heaviest measured: <b>${heaviest}</b> at ${fmt(m[heaviest].gV, 1)} g — gravity plus the curve pressing the seat up into you.`);
  }
  if(analysis && analysis.C && m.C){
    const truth = m.C.gV < 0.7 ? 'lighter' : (m.C.gV > 1.3 ? 'heavier' : 'same');
    judge('q4', truth, `Measured ${fmt(m.C.gV, 2)} g at the loop top — ${truth === 'lighter' ? 'almost floating!' : 'surprisingly, not floating on this loop.'}`);
  }
  /* Graded from what the ride actually did to the riders, same as the rest. */
  const spec = restraintSpec(tele);
  judge('q5', spec.key, `Your ride needs <b>${spec.name.toLowerCase()}</b>. ${spec.why}` +
    (spec.holdKg > 0
      ? ` At its worst it lifts a ${spec.riderKg} kg rider with about ${spec.holdKg} kg of pull.`
      : ' Nothing on this ride ever lifts anyone off the seat.'));
  const seats = spec.seats;
  if(seats){
    const rows = seats.rows;
    // "about the same" is the honest answer on a symmetrical layout, and it is
    // the answer worth earning: even rows mean even hills
    const truth = seats.gSpread < 0.08 ? 'same'
      : (seats.worstIdx === 0 ? 'front' : (seats.worstIdx === seats.n - 1 ? 'back' : 'mid'));
    judge('q6', truth, truth === 'same'
      ? `Every row measured within ${fmt(seats.gSpread, 2)} g of the others — your hills are close to symmetrical, so the ride is the same wherever you sit.`
      : `The ${seatLabel(seats.worstIdx, seats.n).toLowerCase()} measured ${fmt(seats.worstMin, 2)} g against ${fmt(rows[0].minGV, 2)} g in the front. Lopsided hills pull the rows apart.`);
  }
  const good = rows.filter(r => r.ok).length;
  const all = good === rows.length && rows.length > 0;
  let html = '<div class="card"><p class="eyebrow">How did your predictions do?</p>';
  for(const r of rows){
    html += `<p class="exline"><b class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'}</b> ${r.explain}</p>`;
  }
  html += `<div class="certbanner ${all ? 'pass' : 'fail'}">${
    all ? '🎖 Junior Ride Engineer — every prediction correct!'
        : `${good}/${rows.length} correct — rethink the misses and run it again!`}</div></div>`;
  certResultEl.innerHTML = html;
  banner(all ? '🎖 All predictions correct!' : `${good}/${rows.length} predictions correct`, all ? 'pass' : '', 3500);
  if(all){ jingle(true); spawnFireworks(); missionEvent('explore', {}); bridgeReport({ event: 'explore' }); }
}

function checkPredictions(){
  if(!analysis) return;
  const a = analysis.ans;
  const grade = (id, truth, tolAbs, tolRel) => {
    const el = __clabGet('clab-in' + id);
    const v = __clabGet('clab-v' + id);
    if(!el || truth == null) return null;
    const x = parseFloat(el.value);
    if(!isFinite(x)){ v.textContent = 'enter a value'; v.className = 'verdict no'; return null; }
    const rel = Math.abs(x - truth) / Math.max(Math.abs(truth), 1e-6);
    const ok = tolRel != null ? rel <= tolRel : Math.abs(x - truth) <= tolAbs;
    v.textContent = ok ? '✓ matches physics' : `✗ off by ${fmt(rel * 100, 0)}% — recheck`;
    v.className = 'verdict ' + (ok ? 'ok' : 'no');
    return { x, truth, ok };
  };
  preds.p0  = grade('P0',  a.vL,    null, TOL.v);
  preds.p1  = grade('P1',  a.vB,    null, TOL.v);
  preds.p2a = grade('P2a', a.vCmin, null, TOL.v);
  preds.p2b = grade('P2b', a.vC,    null, TOL.v);
  preds.p3  = grade('P3',  a.gB,    TOL.g, null);
  preds.p4  = grade('P4',  a.bankD, TOL.bank, null);
}

function gradeCertRun(tele){
  const a = analysis;
  if(!a){ return; }
  const cap = tele.markers;
  const rows = [];
  const row = (name, pred, meas, unit, tolAbs, tolRel) => {
    if(pred == null || meas == null) return;
    const ok = tolRel != null
      ? Math.abs(pred.x - meas) / Math.max(Math.abs(meas), 1e-6) <= tolRel
      : Math.abs(pred.x - meas) <= tolAbs;
    rows.push({ name, pred: pred.x, meas, unit, ok });
  };
  if(a.L) row('v after launch', preds.p0, cap.L && cap.L.v, 'm/s', null, TOL.v);
  row('v at B',      preds.p1,  cap.B && cap.B.v,  'm/s', null, TOL.v);
  if(a.C) row('v at C (apex)', preds.p2b, cap.C && cap.C.v, 'm/s', null, TOL.v);
  row('seat g at B', preds.p3,  cap.B && cap.B.gV, 'g',   TOL.g, null);
  if(a.D && preds.p4 && cap.D){
    rows.push({ name: 'side g at D', pred: 0, meas: cap.D.gLat, unit: 'g',
                ok: Math.abs(cap.D.gLat) <= TOL.g });
  }

  const anyMissing = ['p1', 'p3'].some(k => !preds[k]) || (a.C && !preds.p2b) || (a.L && !preds.p0);
  const loopSafe = !a.C || (cap.C && cap.C.v >= Math.sqrt(G0 * a.C.r) - 0.05);
  const completed = tele.status === 'complete';
  const comfy = tele.violations.length === 0;
  const geometryProblems = geometryPreflightSamples(track.pos, track.s, track.L, design.points)
    .filter(f => f.severity === 'bad');
  const geometryClear = geometryProblems.length === 0;
  const allOk = rows.length > 0 && rows.every(r => r.ok);
  const pass = completed && comfy && geometryClear && allOk && loopSafe && !anyMissing;

  let html = '<div class="card"><p class="eyebrow">Inspection report</p>';
  html += '<table class="cert"><tr><th>checkpoint</th><th>your prediction</th><th>measured</th><th></th></tr>';
  for(const r of rows){
    html += `<tr><td>${r.name}</td><td>${fmt(r.pred, 2)} ${r.unit}</td><td>${fmt(r.meas, 2)} ${r.unit}</td>
             <td style="color:var(--${r.ok ? 'good' : 'bad'})">${r.ok ? '✓' : '✗'}</td></tr>`;
  }
  html += '</table>';
  if(anyMissing) html += '<p class="hint" style="margin-top:8px">Some predictions were never checked — fill them in and press “Check predictions”.</p>';
  if(!completed) html += `<p class="hint" style="margin-top:8px">The train never made it home (${tele.status}).</p>`;
  if(!loopSafe)  html += '<p class="hint" style="margin-top:8px">The train crossed the loop apex below the weightless limit. Its upstop wheels grip the underside of the rail, so the train stays on — but riders hang in their restraints over the top. Raise the crest or shrink the loop.</p>';
  if(!comfy)     html += `<p class="hint" style="margin-top:8px">Comfort limits exceeded: ${tele.violations.join('; ')}.</p>`;
  if(!geometryClear) html += `<p class="hint" style="margin-top:8px">Geometry preflight unresolved: ${geometryProblems.map(f => f.title).join('; ')}.</p>`;
  html += `<div class="certbanner ${pass ? 'pass' : 'fail'}">${
    pass ? '★ SIMULATION CERTIFIED — your math and this educational model agree.'
         : 'NOT SIMULATION CERTIFIED — resolve the findings above and inspect again.'}</div></div>`;
  certResultEl.innerHTML = html;
  banner(pass ? '★ Simulation certified!' : 'Inspection failed — see the report.', pass ? 'pass' : 'fail', 4000);
  jingle(pass);
  if(pass){
    spawnFireworks();
    missionEvent('cert', {});
    bridgeReport({ event: 'cert' });
    try{ localStorage.setItem('coaster_lab_certified', new Date().toISOString().slice(0, 10)); }catch(_e){}
  }
}

/* ---------------- simulation ---------------- */
const sim = {
  running: false, cert: false, S: 2, v: 0, t: 0,
  sMax: 0, tAtMax: 0, prevS: 2, done: true, tele: null
};
function freshTele(){
  return {
    maxV: 0, maxGV: -Infinity, minGV: Infinity, maxLat: 0,
    airtime: 0, latSec: 0, inversions: 0, wasInverted: false,
    heat: 0, status: null, duration: 0, violations: [], markers: {},
    trace: [], lastTraceS: -9, rolledBack: false, markSs: null, photos: [],
    sus: freshSustain(), seats: freshSeats(TRAIN_CARS)
  };
}
function startRun(cert){
  stopTelemetryReplay(true);
  if(!track || track.sCrest == null){
    banner('Add a lift hill first — the track needs a first crest.', 'fail', 3000);
    return;
  }
  sim.running = true; sim.cert = cert; sim.done = false;
  if(buildCoach) buildCoach.hidden = true;
  sim.paused = false; sim.ride = false; sim.exploreCheck = false;
  sim.S = 2; sim.prevS = 2; sim.v = 0; sim.t = 0; sim.sMax = 2; sim.tAtMax = 0;
  sim.tele = freshTele();
  sim.tele.designKey = JSON.stringify(design.points);
  sim.tele.fricUsed = cert ? false : friction;
  sim.tele.L = track.L;
  if(analysis){
    sim.tele.markSs = {};
    for(const k of MARKER_KEYS){
      if(analysis[k]) sim.tele.markSs[k] = analysis[k].s;
    }
  }
  handleGroup.visible = false; markerGroup.visible = true; safetyGroup.visible = false;
  syncElementPalette();
  syncHistoryButtons();
  __clabGet('clab-btnRun').textContent = '■ Stop';
  banner(cert ? 'Inspection run — ideal conditions (friction off)' : 'Test run started', '', 2200);
}
function stopRun(){
  sim.running = false; sim.done = true;
  handleGroup.visible = true;
  safetyGroup.visible = !__clabGet('clab-tab-build').hidden;
  syncElementPalette();
  syncHistoryButtons();
  if(buildCoach) buildCoach.hidden = selIdx >= 0;
  __clabGet('clab-btnRun').textContent = '▶ Test run';
}
function finishRun(status){
  const tele = sim.tele;
  tele.status = status; tele.duration = sim.t;
  /* ride/explore runs are always ideal — record them under 'ideal' */
  if(sim.ride || sim.exploreCheck) tele.fricUsed = false;
  if(status === 'complete'){
    runHistory[tele.fricUsed ? 'real' : 'ideal'] = tele;
    bridgeReport({ event: 'run' });
  }
  if(tele.maxGV > LIM.gvMax) tele.violations.push(`+${fmt(tele.maxGV, 1)} g vertical (limit +${LIM.gvMax})`);
  if(tele.minGV < LIM.gvMin) tele.violations.push(`${fmt(tele.minGV, 1)} g vertical (limit ${LIM.gvMin})`);
  if(tele.maxLat > LIM.glat) tele.violations.push(`±${fmt(tele.maxLat, 1)} g lateral (limit ±${LIM.glat})`);
  stopRun();
  const sc = renderReport(tele);
  if(ride.active) cleanupRide(true);
  missionEvent('run', { tele, sc, seats: seatSummary(tele.seats) });
  if(sim.cert){
    gradeCertRun(tele);
  } else if(sim.exploreCheck){
    sim.exploreCheck = false;
    if(status === 'complete') gradeExplore(tele);
    else banner(`Train ${status} — it never finished, so nothing to check. Fix the ride first!`, 'fail', 3600);
  } else {
    banner(status === 'complete' ? 'Run complete — telemetry in the Report tab.'
                                 : `Train ${status} — see Report tab.`,
           status === 'complete' ? '' : 'fail', 3200);
  }
}

function stepSim(dtFrame){
  if(sim.paused) return;
  const t = track, tele = sim.tele;
  /* inspection, explore-check and fluency rides use ideal conditions so the
     analytic truths (lowest = fastest, energy conservation) hold exactly */
  const frictionOn = (sim.cert || sim.exploreCheck || sim.ride) ? false : friction;
  const launch = design.propulsion.mode === 'launch';
  const sLaunchEnd = launch && analysis && analysis.L ? analysis.L.s : null;
  let dt = Math.min(dtFrame, 0.05);
  const sub = 8, h = dt / sub;
  for(let k = 0; k < sub; k++){
    const tr = trackAt(sim.S);
    const gV = tr.upY + sim.v * sim.v * tr.kUp / G0;
    const gLat = tr.sideY + sim.v * sim.v * tr.kSide / G0;
    const yRef = tr.y;      // captured now: the seat pass below clobbers the shared lookup
    if(!launch && sim.S < t.sCrest){
      sim.v = LIFT_V;                       // chain-locked on the lift
    } else {
      let a = -G0 * tr.Ty;
      if(launch && sLaunchEnd != null && sim.S < sLaunchEnd){
        a += design.propulsion.accel;       // LSM thrust — catches rollbacks too
      }
      if(frictionOn){
        /* rolling resistance scales with how hard the wheels press the rail */
        const fr = MU_ROLL * G0 * Math.min(Math.abs(gV), 6) + K_DRAG * sim.v * sim.v;
        a -= Math.sign(sim.v) * fr;
        tele.heat += fr * Math.abs(sim.v) * h;
      }
      sim.v += a * h;
    }
    if(sim.S > t.L - brakeLen() && sim.v > 3.0) sim.v = Math.max(3.0, sim.v - 8 * h);

    sim.prevS = sim.S;
    sim.S += sim.v * h;
    sim.t += h;

    tele.maxV = Math.max(tele.maxV, Math.abs(sim.v));
    tele.maxGV = Math.max(tele.maxGV, gV);
    tele.minGV = Math.min(tele.minGV, gV);
    tele.maxLat = Math.max(tele.maxLat, Math.abs(gLat));
    if(gV < 0.25) tele.airtime += h;
    if(Math.abs(gLat) > 0.7) tele.latSec += h;
    // duration-aware envelope: how long each force is HELD, not just how big it got
    sustainStep(tele.sus, 'pos', gV, h, 2.0);
    sustainStep(tele.sus, 'neg', -gV, h, 0.3);
    sustainStep(tele.sus, 'lat', Math.abs(gLat), h, 0.6);
    const inv = tr.upY < -0.5;
    if(inv && !tele.wasInverted) tele.inversions++;
    tele.wasInverted = inv;
    /* Seat by seat. A rigid train shares ONE speed, and that speed belongs to the
       whole train, not to whichever single point the sim integrates from. Taking
       the reference car's speed straight across would be badly wrong exactly
       where it matters: the moment the front car tips over the lift crest the
       integrator starts accelerating down the drop, while the back car is still
       ON the crest — crest curvature times drop speed, and the seat force blows
       up. So the shared speed is restated at the train's mean height, which is
       the rigid-train energy statement.
       NOTE: `tr` is the shared TMP lookup, so nothing above may read it below. */
    const vSeat2 = trainSpeed2(yRef);
    for(let c = 0; c < TRAIN_CARS; c++){
      const sc = sim.S - c * CAR_GAP;
      const trc = trackAt(sc);
      seatStep(tele.seats, c,
        trc.upY + vSeat2 * trc.kUp / G0,
        trc.sideY + vSeat2 * trc.kSide / G0, h, sc);
    }

    if(sim.S - tele.lastTraceS >= 2){
      tele.lastTraceS = sim.S;
      tele.trace.push({ s: sim.S, v: Math.abs(sim.v), g: gV, gl: gLat });
    }
    if(!tele.rolledBack && sim.S > t.sCrest && sim.S < sim.sMax - 0.8){
      tele.rolledBack = true;
      banner('Rolled back — not enough energy to clear that hill!', 'fail', 3000);
    }

    if(analysis){
      for(const key of MARKER_KEYS){
        const mk = analysis[key];
        if(mk && sim.prevS < mk.s && sim.S >= mk.s && !tele.markers[key]){
          tele.markers[key] = { v: sim.v, gV, gLat };
          // a shot at each checkpoint — the launch marker is skipped because the
          // train has barely left the station and there is nothing to see yet
          if(key !== 'L' && tele.photos.length + 1 < 5) sim.wantPhoto = key;
        }
      }
    }

    if(sim.ride && ride.idx < ride.stops.length && sim.S >= ride.stops[ride.idx].s){
      pauseForQuestion();
      return;
    }
    if(sim.S >= t.L - STOP_AT){ finishRun('complete'); return; }
    if(sim.S > sim.sMax){ sim.sMax = sim.S; sim.tAtMax = sim.t; }
    else if(sim.t - sim.tAtMax > 7){ finishRun('stalled — not enough energy'); return; }
    if(!launch && sim.v < 0 && sim.S < t.sCrest + 0.5) sim.v = 0;   // chain anti-rollback dogs
  }
}

/* ---------------- report & ratings ---------------- */
/* @clab-safety-start — rider safety model (pure; eval-sliced by the test suite)

   TWO ideas the peak-g limits alone cannot express.

   1. HOW LONG a force is held. +6 g for a twentieth of a second is a snap; +6 g
      held for two seconds is an injury, and real ride design standards limit g
      as a function of exposure time for exactly that reason. SUSTAIN_CURVES is a
      simplified, clearly-labelled version of that idea, not a reproduction of
      any published standard. It is ADVISORY: certification still grades on the
      peak limits, so nothing a student has already certified changes grade.

   2. WHAT RESTRAINT the forces demand. A real train cannot leave the track — its
      upstop wheels grip the underside of the rail — so the question is never
      "does the train fall off", it is "what has to hold the RIDER down". Airtime
      needs a latching bar; hanging upside down needs a harness. That is a
      decision the measured run can make honestly.

   And the thing this model deliberately does NOT do: compute a height
   requirement. A posted height comes from the geometry of the restraint (can the
   bar close far enough on this torso, can a small rider slip under it), which is
   the train manufacturer's number, not the track's. The same track with a
   different train posts a different height. What IS teachable is the chain —
   forces decide the restraint, the restraint decides the torso sizes it fits,
   and that is what gets posted — so the bands below are what rides of each class
   typically post, always shown with that reasoning attached. */
const SUSTAIN_CURVES = {
  pos: [[0.2, 6.0], [1.0, 4.5], [2.0, 3.5], [4.0, 3.0]],   // pressed into the seat
  neg: [[0.2, 1.5], [1.0, 1.2], [2.0, 1.0]],               // lifted out of it
  lat: [[0.2, 1.3], [1.0, 1.2], [2.0, 1.0], [4.0, 0.8]]    // thrown sideways
};
function sustainLimit(axis, dur){
  const c = SUSTAIN_CURVES[axis];
  if(!c) return Infinity;
  if(!(dur > c[0][0])) return c[0][1];
  for(let i = 1; i < c.length; i++){
    if(dur <= c[i][0]){
      const t0 = c[i - 1][0], g0 = c[i - 1][1], t1 = c[i][0], g1 = c[i][1];
      return g0 + (g1 - g0) * (dur - t0) / (t1 - t0);
    }
  }
  return c[c.length - 1][1];
}
function freshSustain(){
  return { pos: null, neg: null, lat: null,
    worst: { pos: { ratio: 0, level: 0, dur: 0 }, neg: { ratio: 0, level: 0, dur: 0 },
             lat: { ratio: 0, level: 0, dur: 0 } } };
}
/* One time-step of the sustained-force tracker. `level` is the running MINIMUM
   inside an episode, so it answers "this much force has been held for this long"
   — which is what the duration curve grades. A brief spike inside a long mild
   episode is therefore not double-counted here; the peak limits already own it. */
function sustainStep(sus, axis, mag, dt, floor){
  if(!sus || !sus.worst) return;
  if(!(mag >= floor) || !(dt > 0)){ sus[axis] = null; return; }
  let e = sus[axis];
  if(!e){ e = { dur: 0, level: mag }; sus[axis] = e; }
  e.dur += dt;
  e.level = Math.min(e.level, mag);
  const ratio = e.level / sustainLimit(axis, e.dur);
  const w = sus.worst[axis];
  if(ratio > w.ratio){ w.ratio = ratio; w.level = e.level; w.dur = e.dur; }
}
/* Seat by seat.

   The sim drives the train from ONE point on the track, and that stays true: the
   certification problems are built on point-mass energy conservation, and a full
   distributed-mass model would move the measured speeds away from the numbers a
   student predicts. What a rigid train does let us do exactly is the forces. All
   the cars share one speed along the track — they are bolted together — so each
   car's force is v² times ITS OWN curvature, at ITS OWN position.

   That is enough to reproduce the thing every rider knows. The back row crosses a
   crest a moment LATER than the front, by which point the front of the train has
   already tipped over and pulled everyone faster — so the back row meets the same
   crest at a higher speed, and gets thrown further out of its seat. */
function freshSeats(n){
  const out = [];
  for(let i = 0; i < n; i++) out.push({ maxGV: -Infinity, minGV: Infinity, maxLat: 0, airtime: 0, sMin: null });
  return out;
}
function seatStep(seats, i, gV, gLat, dt, atS){
  const s = seats && seats[i];
  if(!s || !Number.isFinite(gV)) return;
  if(gV > s.maxGV) s.maxGV = gV;
  if(gV < s.minGV){ s.minGV = gV; s.sMin = atS; }
  const lat = Math.abs(gLat);
  if(lat > s.maxLat) s.maxLat = lat;
  if(gV < 0.25) s.airtime += dt;
}
function seatLabel(i, n){
  if(n <= 1) return 'Your seat';
  if(i === 0) return 'Front row';
  if(i === n - 1) return 'Back row';
  return 'Row ' + (i + 1);
}
function seatSummary(seats){
  const rows = (seats || []).filter(s => s && Number.isFinite(s.minGV));
  if(!rows.length) return null;
  const n = rows.length;
  let bestIdx = 0, worstIdx = 0;
  for(let i = 1; i < n; i++){
    if(rows[i].airtime > rows[bestIdx].airtime + 1e-9) bestIdx = i;
    if(rows[i].minGV < rows[worstIdx].minGV) worstIdx = i;
  }
  return {
    n, rows, bestIdx, worstIdx,
    worstMin: rows[worstIdx].minGV,
    // how much more the best seat gets than the worst — the whole point of the model
    gSpread: Math.max(...rows.map(r => r.minGV)) - Math.min(...rows.map(r => r.minGV)),
    airSpread: Math.max(...rows.map(r => r.airtime)) - Math.min(...rows.map(r => r.airtime))
  };
}
const RIDER_KG = 45;   // a typical 12-year-old — the age band these rides are built around
const RESTRAINT_CLASSES = {
  simple: {
    name: 'Simple lap bar',
    why: 'Nothing on this ride ever lifts riders off the seat, so gravity does the holding and a plain bar is enough.',
    band: { inLo: 36, inHi: 42, cmLo: 91, cmHi: 107 }
  },
  ratchet: {
    name: 'Ratcheting lap bar + seat belt',
    why: 'This ride has airtime — riders come off the seat — so the bar has to latch shut and stay shut, with a belt as the backup.',
    band: { inLo: 42, inHi: 48, cmLo: 107, cmHi: 122 }
  },
  harness: {
    name: 'Over-the-shoulder harness',
    why: 'Riders go inverted or get pulled hard off the seat, so the restraint has to hold the upper body, not just the lap.',
    band: { inLo: 48, inHi: 54, cmLo: 122, cmHi: 137 }
  }
};
function restraintSpec(tele){
  const t = tele || {};
  // Sized for the WORST SEAT, not the average one. A restraint that only holds
  // the front row is not a restraint.
  const seats = seatSummary(t.seats);
  let minG = Number.isFinite(t.minGV) ? t.minGV : 1;
  if(seats && seats.worstMin < minG) minG = seats.worstMin;
  const inversions = t.inversions || 0;
  const airtime = Math.max(t.airtime || 0, seats ? seats.rows[seats.bestIdx].airtime : 0);
  let key;
  if(inversions > 0 || minG < -1.0) key = 'harness';
  else if(minG < 0.25 || airtime > 0.4) key = 'ratchet';
  else key = 'simple';
  const spec = RESTRAINT_CLASSES[key];
  // What the restraint physically has to hold at the strongest airtime moment.
  // At n g of negative seat force the rider is pulled up with n·m·g newtons.
  const pull = Math.max(0, -minG);
  const holdN = pull * RIDER_KG * 9.81;
  return {
    key, name: spec.name, why: spec.why, band: spec.band,
    inversions, minG, riderKg: RIDER_KG, seats,
    worstSeat: seats ? seatLabel(seats.worstIdx, seats.n) : null,
    holdN: Math.round(holdN),
    holdKg: Math.round(pull * RIDER_KG)
  };
}
/* @clab-safety-end */
/* The seat card: the same ride, measured row by row. */
function renderSeatCard(tele){
  const sum = seatSummary(tele && tele.seats);
  if(!sum || sum.n < 2) return '';
  const worst = sum.rows[sum.worstIdx], best = sum.rows[sum.bestIdx];
  const bars = sum.rows.map((s, i) => {
    const air = s.airtime;
    const lift = Math.max(0, 0.25 - s.minGV);            // how far below the airtime line it goes
    const pct = Math.min(100, lift / 1.5 * 100);
    const mine = (i === sum.worstIdx) ? ' style="color:var(--accent)"' : '';
    return `<div class="rating"><div class="lbl"><span${mine}>${seatLabel(i, sum.n)}</span>
      <span class="num">${(s.maxGV > 0 ? '+' : '') + fmt(s.maxGV, 1)} / ${fmt(s.minGV, 1)} g${air > 0.05 ? ' · ' + fmt(air, 1) + ' s air' : ''}</span></div>
      <div class="rbar"><i style="width:${pct}%;background:var(--pe)"></i></div></div>`;
  }).join('');
  const front = sum.rows[0];
  const liftsOut = worst.minGV < 0.25 && sum.gSpread >= 0.06;
  const moreAir = sum.airSpread >= 0.15 && best !== front;
  let lede;
  if(liftsOut){
    lede = `The <b>${seatLabel(sum.worstIdx, sum.n).toLowerCase()}</b> is thrown hardest out of the seat —
      ${fmt(worst.minGV, 2)} g against ${fmt(front.minGV, 2)} g up front` +
      (moreAir ? `, with ${fmt(sum.airSpread, 1)} s more airtime.` : '.');
  } else if(moreAir){
    lede = `Every row stays in its seat, but the <b>${seatLabel(sum.bestIdx, sum.n).toLowerCase()}</b>
      gets ${fmt(sum.airSpread, 1)} s more airtime than the front.`;
  } else if(sum.gSpread >= 0.06){
    lede = `The rows differ by ${fmt(sum.gSpread, 2)} g — small, but the back is always the lighter ride
      over a crest.`;
  }
  return `<div class="card">
    <p class="eyebrow">Where you sit · row by row</p>
    ${bars}
    <p class="hint" style="margin:8px 0 0">${lede
      ? `${lede}
         Every car is bolted to one train, so they all share a single speed — and that speed belongs to
         the train as a whole, not to any one car. What differs is the track underneath each row. The
         rows pull apart wherever the profile is <b>lopsided</b>: after a crest with a steep drop, the
         front of the train is already falling away as the back row reaches the top, so the back row
         takes the sharper kick. Over a symmetrical hill every row feels much the same.`
      : 'Every row feels almost the same ride on this layout — a sign the hills are close to symmetrical. Put a steep drop straight after a crest and the rows come apart, and the longer the train, the bigger the difference.'}</p>
    <p class="chnote">Certification and the headline figures above use the point-mass physics your
      predictions are built on. These row-by-row numbers add the one thing a real train has that a point
      does not — length: the whole train shares one speed, set by where its middle sits, while each row
      feels its own piece of track.</p>
  </div>`;
}
/* The rider-safety card: what has to hold the rider down, how hard it has to
   pull, whether any force was HELD too long, and why real rides post a height. */
function renderRiderSafety(tele){
  const r = restraintSpec(tele);
  const w = (tele.sus && tele.sus.worst) || freshSustain().worst;
  const AX = {
    pos: ['Pressed into the seat', 'Broaden the valley, or come into it slower.'],
    neg: ['Lifted out of the seat', 'Round off that crest, or cross it slower.'],
    lat: ['Thrown sideways', 'Bank the turn further, or widen it.']
  };
  const held = [];
  for(const axis of ['pos', 'neg', 'lat']){
    const x = w[axis];
    if(!x || x.ratio <= 1 || x.dur < 0.25) continue;
    held.push(`<span>⚠ <b>${AX[axis][0]}</b> at ${fmt(x.level, 1)} g for ${fmt(x.dur, 1)} s —
      held that long the guideline is ${fmt(sustainLimit(axis, x.dur), 1)} g. ${AX[axis][1]}</span>`);
  }
  const b = r.band;
  return `<div class="card">
    <p class="eyebrow">Rider safety · what holds you in</p>
    <h3 style="margin:0 0 6px">${r.name}</h3>
    <p class="hint" style="margin:0 0 8px">${r.why}</p>
    ${r.holdKg > 0
      ? `<p class="hint" style="margin:0 0 8px">At the strongest airtime moment${r.worstSeat ? ` — in the <b>${r.worstSeat.toLowerCase()}</b>` : ''} the restraint has to
           hold a <b>${r.riderKg} kg</b> rider with about <b>${r.holdN} N</b> — the pull of roughly
           <b>${r.holdKg} kg</b> hanging upward. Every seat gets the same restraint, so it is sized for
           the worst one. That force is what decides the restraint, not comfort.</p>`
      : '<p class="hint" style="margin:0 0 8px">Seat force never goes negative in any row on this ride, so the restraint is never loaded upward at all.</p>'}
    <p class="eyebrow" style="margin:10px 0 4px">Forces held over time</p>
    ${held.length
      ? `<div class="viol" style="margin-top:0">${held.join('')}</div>
         <p class="chnote">Advisory: certification still grades on peak force. Real standards limit g by how long it is held, and this is a simplified version of that idea.</p>`
      : '<div class="viol" style="margin-top:0"><span class="okline">✓ No force is held long enough to matter</span></div>'}
    <p class="eyebrow" style="margin:12px 0 4px">Why rides post a height</p>
    <p class="hint" style="margin:0">A height sign is really a <b>restraint</b> sign. The forces decide
      which restraint the ride needs; the restraint has a fixed range of travel, so it only closes
      properly on torsos within a certain size; height is the quick thing a park can measure at the gate.
      Rides needing a ${r.name.toLowerCase()} typically post around
      <b>${b.inLo}–${b.inHi} in (${b.cmLo}–${b.cmHi} cm)</b>.</p>
    <p class="chnote">That band is what rides of this class usually post — it is not calculated from your
      track. The real number comes from the train manufacturer's restraint, so the same track with a
      different train can post a different height.</p>
  </div>`;
}
function computeScores(tele){
  const clamp10 = x => Math.max(0, Math.min(10, x));
  const excitement = clamp10(tele.maxV * 0.12 + tele.airtime * 1.0 + tele.inversions * 1.2 + Math.max(0, tele.maxGV - 1) * 0.45);
  const intensity  = clamp10(Math.max(0, tele.maxGV) * 1.15 + Math.abs(Math.min(0, tele.minGV)) * 1.6 + tele.maxLat * 1.1);
  const nausea     = clamp10(tele.latSec * 1.6 + tele.inversions * 0.9 + Math.max(0, intensity - 7));
  const maxH = Math.max(...design.points.map(p => p.y));
  const cost = Math.round((track.L * 1300 + maxH * 16000 +
    (analysis && analysis.C ? 70000 : 0) +
    (design.propulsion.mode === 'launch' ? 95000 : 30000)) / 1000) * 1000;
  const ticket = Math.max(2, 1.5 + excitement * 0.8 - nausea * 0.35);
  const riders = Math.max(40, Math.round(excitement * 130 - nausea * 45));
  const daily = riders * ticket;
  return { excitement, intensity, nausea, cost, ticket, riders, daily, payback: Math.ceil(cost / daily) };
}

let lastTele = null;
const runHistory = { ideal: null, real: null };   // last completed run per friction mode
function buildCsv(tele){
  const rows = ['s_m,v_ms,seat_g,side_g'];
  for(const p of tele.trace){
    rows.push(`${p.s.toFixed(1)},${p.v.toFixed(2)},${p.g.toFixed(3)},${(p.gl || 0).toFixed(3)}`);
  }
  return rows.join('\n');
}
function buildRideInsights(tele, sc){
  const tips = [];
  if(tele.status !== 'complete') tips.push('Lower the tallest unresolved hill or increase launch work so the train can complete the circuit.');
  if(tele.maxGV > 4) tips.push(`Broaden the strongest valley: peak vertical force reached ${fmt(tele.maxGV, 1)} g.`);
  if(tele.minGV < -1) tips.push(`Smooth the sharpest crest: minimum vertical force reached ${fmt(tele.minGV, 1)} g.`);
  if(tele.maxLat > 0.8) tips.push(`Bank or widen the strongest turn: lateral force reached ${fmt(tele.maxLat, 1)} g.`);
  if(tele.airtime < 1 && tele.status === 'complete') tips.push('For more airtime, add a broad camelback after a faster valley.');
  if(sc.excitement < 5 && tele.status === 'complete') tips.push('Raise excitement with one purposeful drop or inversion while watching the force heatmaps.');
  if(sc.nausea > 6) tips.push('Reduce repeated lateral transitions; smoother banking lowers the nausea estimate.');
  if(!tips.length) tips.push('This layout is well balanced. Compare realistic and ideal friction runs to study where energy becomes heat.');
  return tips.slice(0, 4);
}
const telemetryReplay = { tele: null, index: 0, playing: false, lastStep: 0 };
function stopTelemetryReplay(clear = false){
  telemetryReplay.playing = false;
  if(clear) telemetryReplay.tele = null;
  const btn = __clabGet('clab-btnReplay');
  if(btn) btn.textContent = 'Replay ride';
}
function applyTelemetryFrame(index){
  const tele = telemetryReplay.tele;
  if(!tele || !tele.trace.length || sim.running) return;
  const idx = Math.max(0, Math.min(tele.trace.length - 1, Math.round(index)));
  const point = tele.trace[idx];
  telemetryReplay.index = idx;
  sim.S = point.s;
  sim.prevS = point.s;
  sim.v = point.v;
  sim.tele = tele;
  sim.done = true;
  const scrub = __clabGet('clab-replayScrub');
  if(scrub){
    scrub.value = String(idx);
    scrub.setAttribute('aria-valuetext', `${fmt(point.s, 0)} meters, ${fmt(point.v * 3.6, 0)} kilometers per hour`);
  }
  const out = __clabGet('clab-replayReadout');
  if(out) out.textContent = `${fmt(point.s, 0)} m ? ${fmt(point.v * 3.6, 0)} km/h ? ${(point.g >= 0 ? '+' : '')}${fmt(point.g, 2)} g ? side ${(point.gl >= 0 ? '+' : '')}${fmt(point.gl, 2)} g`;
  if(__clabGet('chV')) drawTraces(tele);
}
function bindTelemetryReplay(tele){
  telemetryReplay.tele = tele;
  telemetryReplay.index = tele.trace.length - 1;
  telemetryReplay.playing = false;
  const scrub = __clabGet('clab-replayScrub'), btn = __clabGet('clab-btnReplay'), out = __clabGet('clab-replayReadout');
  if(!scrub || !btn || !out) return;
  scrub.max = String(tele.trace.length - 1);
  scrub.value = String(telemetryReplay.index);
  const point = tele.trace[telemetryReplay.index];
  out.textContent = `${fmt(point.s, 0)} m ? ${fmt(point.v * 3.6, 0)} km/h ? ${(point.g >= 0 ? '+' : '')}${fmt(point.g, 2)} g ? side ${(point.gl >= 0 ? '+' : '')}${fmt(point.gl, 2)} g`;
  scrub.setAttribute('aria-valuetext', `${fmt(point.s, 0)} meters, ${fmt(point.v * 3.6, 0)} kilometers per hour`);
  btn.textContent = 'Replay ride';
  scrub.addEventListener('input', () => {
    stopTelemetryReplay();
    applyTelemetryFrame(Number(scrub.value));
  });
  btn.addEventListener('click', () => {
    if(telemetryReplay.playing){ stopTelemetryReplay(); return; }
    if(reducedMotion()){
      banner('Autoplay is off in Steady Motion mode. Use the ride-position slider to inspect the run.', '', 3400);
      return;
    }
    if(telemetryReplay.index >= tele.trace.length - 1) applyTelemetryFrame(0);
    telemetryReplay.playing = true;
    telemetryReplay.lastStep = performance.now();
    btn.textContent = 'Pause replay';
  });
}
function updateTelemetryReplay(now){
  if(!telemetryReplay.playing || sim.running || !telemetryReplay.tele) return;
  if(now - telemetryReplay.lastStep < 90) return;
  telemetryReplay.lastStep = now;
  const next = telemetryReplay.index + 1;
  applyTelemetryFrame(next);
  if(next >= telemetryReplay.tele.trace.length - 1) stopTelemetryReplay();
}

function renderReport(tele){
  lastTele = tele;
  const sc = computeScores(tele);
  const { excitement, intensity, nausea } = sc;
  const adj = (x, words) => words[Math.min(words.length - 1, Math.floor(x / 2.51))];

  const stat = (k, v, unit) =>
    `<div class="stat"><div class="k">${k}</div><div class="v">${v} <small>${unit}</small></div></div>`;
  const rating = (name, x, note) => `
    <div class="rating"><div class="lbl"><span>${name} · ${note}</span><span class="num">${fmt(x, 1)}/10</span></div>
    <div class="rbar"><i style="width:${x * 10}%;background:var(--accent)"></i></div></div>`;

  let html = '';
  html += `<p class="eyebrow">Last run · ${tele.status}</p><div class="stats">`;
  html += stat('Top speed', fmt(tele.maxV * 3.6, 0), 'km/h');
  html += stat('Ride time', fmt(tele.duration, 1), 's');
  html += stat('Max seat g', (tele.maxGV > 0 ? '+' : '') + fmt(tele.maxGV, 2), 'g');
  html += stat('Min seat g', fmt(tele.minGV, 2), 'g');
  html += stat('Max side g', '±' + fmt(tele.maxLat, 2), 'g');
  html += stat('Airtime', fmt(tele.airtime, 1), 's');
  html += '</div>';
  html += '<div class="card"><p class="eyebrow">Park rating</p>';
  html += rating('Excitement', excitement, adj(excitement, ['dull', 'gentle', 'fun', 'thrilling', 'legendary']));
  html += rating('Intensity',  intensity,  adj(intensity,  ['mild', 'moderate', 'strong', 'extreme', 'brutal']));
  html += rating('Nausea',     nausea,     adj(nausea,     ['calm', 'queasy', 'spinny', 'rough', 'lawsuit']));
  html += '</div>';
  syncRestraintStyle();
  html += renderRiderSafety(tele);
  html += renderSeatCard(tele);
  const insights = buildRideInsights(tele, sc);
  html += `<div class="card"><p class="eyebrow">Engineer next steps</p><ul class="clab-insights">${insights.map(tip => `<li>${tip}</li>`).join('')}</ul></div>`;
  const shots = (tele.photos && tele.photos.length) ? tele.photos
    : (tele.photo ? [{ key: 'B', url: tele.photo, where: 'the valley', kmh: null, gV: null }] : []);
  if(shots.length){
    /* Trackside shots at each checkpoint. Worth looking at now that there are
       riders in the train: the same crowd is pressed into the seats at the
       valley and out of them over a crest, in the same run. */
    html += '<div class="card photo"><p class="eyebrow">Ride photos · one at each checkpoint</p>' +
      `<div style="display:grid;grid-template-columns:${shots.length > 1 ? '1fr 1fr' : '1fr'};gap:8px">` +
      shots.map(s => {
        const facts = [s.kmh != null ? s.kmh + ' km/h' : '', (s.gV != null && isFinite(s.gV)) ? ((s.gV >= 0 ? '+' : '') + fmt(s.gV, 1) + ' g') : '']
          .filter(Boolean).join(' · ');
        return `<figure style="margin:0">
          <img src="${s.url}" alt="Trackside photo of your train at ${s.where}${facts ? ', ' + facts : ''}">
          <figcaption class="chnote" style="display:flex;justify-content:space-between;gap:6px">
            <span>${s.where}${facts ? ' · ' + facts : ''}</span>
            <a href="${s.url}" download="coaster_lab_${s.key}.jpg">⬇</a>
          </figcaption></figure>`;
      }).join('') + '</div>' +
      (shots.length > 1
        ? '<p class="chnote" style="margin-top:8px">Same riders, same run. Compare what the forces are doing to them.</p>'
        : '') +
      '</div>';
  }
  /* park economics — playful, derived from geometry and ratings */
  html += `<div class="card"><p class="eyebrow">Park economics (est.)</p>
    <p class="hint" style="margin:0">Build cost <b>$${sc.cost.toLocaleString()}</b> ·
    ticket <b>$${sc.ticket.toFixed(2)}</b> · <b>${sc.riders.toLocaleString()}</b> riders/day
    → <b>$${Math.round(sc.daily).toLocaleString()}</b>/day.
    Breaks even in <b>${sc.payback}</b> days.</p></div>`;
  if(tele.trace.length > 5){
    const other = runHistory[tele.fricUsed ? 'ideal' : 'real'];
    const ghost = (other && other !== tele && Math.abs((other.L || 0) - (tele.L || 0)) < 2) ? other : null;
    html += '<div class="card"><p class="eyebrow">Telemetry trace · whole circuit ' +
      '<a id="csvDl" href="#" style="float:right;color:var(--accent);font-size:11px">⬇ CSV</a></p>' +
      '<div class="clab-replay"><label for="clab-replayScrub">Ride position</label><input id="clab-replayScrub" type="range" min="0" value="0"><button id="clab-btnReplay" type="button">Replay ride</button><output id="clab-replayReadout" for="clab-replayScrub">Select a point on the run</output></div>' +
      `<div class="chlabel">Speed (m/s)${ghost
        ? ` — solid: ${tele.fricUsed ? 'realistic' : 'ideal'}, dashed: ${tele.fricUsed ? 'ideal' : 'realistic'}`
        : ''}</div><canvas id="chV" class="chart" role="img" aria-label="Speed over the full coaster circuit in meters per second"></canvas>` +
      '<div class="chlabel">Seat g</div><canvas id="chG" class="chart" role="img" aria-label="Vertical seat force over the full coaster circuit in g"></canvas>' +
      '<div class="chlabel">Side g</div><canvas id="chL" class="chart" role="img" aria-label="Lateral seat force over the full coaster circuit in g"></canvas>' +
      '<p class="chnote">A crest · B valley · C loop apex · D cert turn · red = beyond limits</p></div>';
    tele.ghostTrace = ghost ? ghost.trace : null;
  }
  html += '<div class="viol">';
  if(tele.violations.length === 0){
    html += '<span class="okline">✓ All simulated force limits respected</span>';
  } else {
    for(const v of tele.violations) html += `<span>⚠ ${v}</span>`;
  }
  html += '</div>';
  __clabGet('clab-reportBody').innerHTML = html;
  if(tele.trace.length > 5){
    bindTelemetryReplay(tele);
    drawTraces(tele);
    const dl = __clabGet('csvDl');
    if(dl) dl.addEventListener('click', e => {
      e.preventDefault();
      const blob = new Blob([buildCsv(tele)], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'coaster_lab_telemetry.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  }
  updateDesignChallenge(tele);
  return sc;
}

/* ---------------- missions: auto-graded engineering challenges ---------- */
const MISSIONS = [
  { id: 'first', icon: '🎢', name: 'First ride', desc: 'Complete a full circuit.',
    ev: 'run', check: x => x.tele.status === 'complete' },
  { id: 'loop', icon: '➰', name: 'Loop the loop', desc: 'A clean run with an inversion — no comfort violations.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.inversions >= 1 && x.tele.violations.length === 0 },
  { id: 'floater', icon: '🪶', name: 'Floater', desc: 'At least 3 seconds of airtime in one clean run.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.airtime >= 3 && x.tele.violations.length === 0 },
  { id: 'feather', icon: '🕊', name: 'Feather touch', desc: 'Finish with max seat g ≤ 3.0 yet excitement ≥ 5.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.maxGV <= 3 && x.sc.excitement >= 5 },
  { id: 'thrill', icon: '🔥', name: 'Thrill machine', desc: 'Excitement ≥ 8.5 with nausea ≤ 5 and no violations.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.sc.excitement >= 8.5 && x.sc.nausea <= 5 && x.tele.violations.length === 0 },
  { id: 'rocket', icon: '⚡', name: 'Rocket start', desc: 'A clean circuit under LSM launch power.',
    ev: 'run', check: x => x.tele.status === 'complete' && design.propulsion.mode === 'launch' && x.tele.violations.length === 0 },
  { id: 'tycoon', icon: '💰', name: 'Tycoon', desc: 'A ride that breaks even in 21 days or less.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.sc.payback <= 21 },
  { id: 'certified', icon: '★', name: 'Certified engineer', desc: 'Pass a full inspection — every prediction matches.',
    ev: 'cert' },
  { id: 'lean', icon: '📉', name: 'Lean lift', desc: 'Certify a looping ride whose crest is under 28 m.',
    ev: 'cert', check: () => !!(analysis && analysis.C && analysis.A.h < 28) },
  { id: 'junior', icon: '🎖', name: 'Junior engineer', desc: 'Earn the Explore badge — every prediction correct.',
    ev: 'explore' },
  { id: 'fluent', icon: '🧠', name: 'Quick thinker', desc: 'Answer 4 ride questions correctly in one Ride & Solve.',
    ev: 'ride', check: x => x.correct >= 4 },
  { id: 'lightning', icon: '⏱', name: 'Lightning round', desc: 'A perfect ride with average answer time under 12 s.',
    ev: 'ride', check: x => x.total >= 3 && x.correct === x.total && x.avgT < 12 },
  /* the three below are graded row by row, so they can only be won by shaping
     hills — the seat-by-seat physics turned into design goals */
  { id: 'lapbar', icon: '🎟', name: 'Lap-bar licence', desc: 'A clean circuit where no row ever leaves its seat.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.violations.length === 0 &&
      !!x.seats && x.seats.rows.every(r => r.minGV >= 0) },
  { id: 'ejector', icon: '💺', name: 'Ejector seat', desc: 'Build a hill lopsided enough that the back row is pulled 0.6 g harder than the front.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.violations.length === 0 &&
      !!x.seats && (x.seats.rows[0].minGV - x.seats.rows[x.seats.n - 1].minGV) >= 0.6 },
  { id: 'evenkeel', icon: '⚖', name: 'Even keel', desc: 'Give every row at least 1 s of airtime, within 0.25 g of each other.',
    ev: 'run', check: x => x.tele.status === 'complete' && x.tele.violations.length === 0 &&
      !!x.seats && x.seats.rows.every(r => r.airtime >= 1) && x.seats.gSpread <= 0.25 }
];
const MISSION_KEY = 'coaster_lab_missions_v1';
let missionsDone = {};
try{ missionsDone = JSON.parse(localStorage.getItem(MISSION_KEY) || '{}') || {}; }catch(_e){}

function renderMissions(){
  const list = __clabGet('clab-missionList');
  const done = MISSIONS.filter(m => missionsDone[m.id]).length;
  __clabGet('clab-missionProgress').textContent = `${done} of ${MISSIONS.length} complete`;
  list.innerHTML = MISSIONS.map(m => `
    <div class="mission ${missionsDone[m.id] ? 'done' : ''}">
      <span class="mi">${m.icon}</span>
      <span><span class="mt">${m.name}</span><br><span class="md">${m.desc}</span></span>
      ${missionsDone[m.id] ? '<span class="stamp">DONE</span>' : ''}
    </div>`).join('');
}
function missionEvent(ev, ctx){
  const fresh = [];
  for(const m of MISSIONS){
    if(m.ev !== ev || missionsDone[m.id]) continue;
    let ok = true;
    try{ ok = m.check ? !!m.check(ctx) : true; }catch(_e){ ok = false; }
    if(ok){ missionsDone[m.id] = Date.now(); fresh.push(m); }
  }
  if(fresh.length){
    try{ localStorage.setItem(MISSION_KEY, JSON.stringify(missionsDone)); }catch(_e){}
    renderMissions();
    banner('🏆 Mission complete: ' + fresh.map(m => m.name).join(' · '), 'pass', 4200);
    jingle(true);
    bridgeReport({ event: 'missions', count: Object.keys(missionsDone).length });
  }
}

/* run-trace strip charts: one measure per chart, shared distance axis */
function drawChart(cv, pts, key, yMin, yMax, color, opts){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 300, hh = cv.clientHeight || 72;
  cv.width = w * dpr; cv.height = hh * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const sMax = Math.max(pts[pts.length - 1].s, 1);
  const X = s => 2 + (w - 4) * s / sMax;
  const Y = v => hh - 4 - (hh - 16) * (v - yMin) / (yMax - yMin);
  for(const [b0, b1] of (opts.bands || [])){
    const y0 = Y(Math.min(b1, yMax)), y1 = Y(Math.max(b0, yMin));
    g.fillStyle = 'rgba(229,72,77,0.13)';
    g.fillRect(2, y0, w - 4, Math.max(1, y1 - y0));
  }
  for(const [val, dashed] of (opts.lines || [])){
    if(val < yMin || val > yMax) continue;
    g.strokeStyle = 'rgba(159,176,193,0.28)'; g.lineWidth = 1;
    g.setLineDash(dashed ? [3, 3] : []);
    g.beginPath(); g.moveTo(2, Y(val)); g.lineTo(w - 2, Y(val)); g.stroke();
    g.setLineDash([]);
  }
  if(opts.marks) for(const [k, sv] of Object.entries(opts.marks)){
    if(sv == null) continue;
    const col = '#' + MARKER_COL[k].toString(16).padStart(6, '0');
    g.strokeStyle = col; g.lineWidth = 1; g.globalAlpha = 0.5;
    g.beginPath(); g.moveTo(X(sv), 11); g.lineTo(X(sv), hh - 4); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = col; g.font = '600 9px Consolas, monospace'; g.textAlign = 'center';
    g.fillText(k, X(sv), 9);
  }
  if(opts.ghost){
    g.strokeStyle = 'rgba(159,176,193,0.55)'; g.lineWidth = 1.5;
    g.setLineDash([4, 3]);
    g.beginPath();
    opts.ghost.forEach((p, i) => {
      const x = X(p.s), y = Y(Math.max(yMin, Math.min(yMax, p[key])));
      if(i) g.lineTo(x, y); else g.moveTo(x, y);
    });
    g.stroke();
    g.setLineDash([]);
  }
  g.strokeStyle = color; g.lineWidth = 2; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach((p, i) => {
    const x = X(p.s), y = Y(Math.max(yMin, Math.min(yMax, p[key])));
    if(i) g.lineTo(x, y); else g.moveTo(x, y);
  });
  g.stroke();
  if(Number.isFinite(opts.cursorS)){
    const x = X(opts.cursorS);
    g.strokeStyle = getComputedStyle(rootEl).getPropertyValue('--ink').trim() || '#e8eef4';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, 11); g.lineTo(x, hh - 4); g.stroke();
    g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x, 11, 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#66788a'; g.font = '9px Consolas, monospace'; g.textAlign = 'left';
  g.fillText(String(yMax), 4, Y(yMax) + 9);
  g.fillText(String(yMin), 4, Y(yMin) - 2);
}
function drawTraces(tele){
  const cvV = __clabGet('chV'), cvG = __clabGet('chG'), cvL = __clabGet('chL');
  if(!cvV || !cvG || !cvL) return;
  const vTop = Math.ceil(Math.max(5, ...tele.trace.map(p => p.v)) + 2);
  const cursorS = telemetryReplay.tele === tele && tele.trace[telemetryReplay.index] ? tele.trace[telemetryReplay.index].s : null;
  drawChart(cvV, tele.trace, 'v', 0, vTop, '#3f8fd2', { marks: tele.markSs, ghost: tele.ghostTrace, cursorS });
  drawChart(cvG, tele.trace, 'g', -2.5, 7.5, '#f2a63c', {
    bands: [[LIM.gvMax, 7.5], [-2.5, LIM.gvMin]],
    lines: [[1, true], [0, false]],
    marks: tele.markSs, cursorS
  });
  drawChart(cvL, tele.trace, 'gl', -2, 2, '#23a884', {
    bands: [[LIM.glat, 2], [-2, -LIM.glat]],
    lines: [[0, false]],
    marks: tele.markSs, cursorS
  });
}

/* ---------------- HUD ---------------- */
const hud = {
  speed: __clabGet('clab-hudSpeed'), kmh: __clabGet('clab-hudKmh'),
  h: __clabGet('clab-hudH'),
  state: __clabGet('clab-hudState'), peak: __clabGet('clab-hudPeak'),
  gvFill: __clabGet('clab-gvFill'), gvVal: __clabGet('clab-gvVal'),
  gvLabel: __clabGet('clab-gvLabel'),
  glFill: __clabGet('clab-glFill'), glVal: __clabGet('clab-glVal'),
  eKE: __clabGet('clab-eKE'), ePE: __clabGet('clab-ePE'), eHeat: __clabGet('clab-eHeat')
};
/* g-map: rider-frame acceleration plotted live (side g × seat g) */
const gball = __clabGet('clab-gball');
const gbCtx = gball.getContext('2d');
gball.width = 128; gball.height = 128;
const gbTrail = [];
const minimap = __clabGet('clab-minimap');
const miniCtx = minimap.getContext('2d');
const miniBase = document.createElement('canvas');
miniBase.width = minimap.width; miniBase.height = minimap.height;
const miniBaseCtx = miniBase.getContext('2d');
const miniState = { minX: 0, maxX: 1, minZ: 0, maxZ: 1, pad: 12 };
const miniPos = new THREE.Vector3(), miniTan = new THREE.Vector3(), miniUp = new THREE.Vector3();
function miniXY(x, z){
  const w = minimap.width, h = minimap.height, p = miniState.pad;
  const sx = (w - p * 2) / Math.max(1, miniState.maxX - miniState.minX);
  const sz = (h - p * 2) / Math.max(1, miniState.maxZ - miniState.minZ);
  const s = Math.min(sx, sz);
  const ox = (w - (miniState.maxX - miniState.minX) * s) / 2;
  const oz = (h - (miniState.maxZ - miniState.minZ) * s) / 2;
  return [ox + (x - miniState.minX) * s, h - (oz + (z - miniState.minZ) * s)];
}
function rebuildMiniMap(){
  if(!track || !minimap) return;
  miniState.minX = miniState.minZ = Infinity;
  miniState.maxX = miniState.maxZ = -Infinity;
  for(let i = 0; i < M; i += 8){
    const p = track.pos[i];
    miniState.minX = Math.min(miniState.minX, p.x); miniState.maxX = Math.max(miniState.maxX, p.x);
    miniState.minZ = Math.min(miniState.minZ, p.z); miniState.maxZ = Math.max(miniState.maxZ, p.z);
  }
  const c = miniBaseCtx, cfg = VISUAL_THEMES[visualTheme];
  c.clearRect(0, 0, miniBase.width, miniBase.height);
  c.fillStyle = visualTheme === 'daylight' ? '#183328' : visualTheme === 'blueprint' ? '#061a2d' : '#070c13';
  c.fillRect(0, 0, miniBase.width, miniBase.height);
  c.strokeStyle = 'rgba(134,170,196,0.10)'; c.lineWidth = 1;
  for(let x = 16; x < miniBase.width; x += 24){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, miniBase.height); c.stroke(); }
  for(let y = 8; y < miniBase.height; y += 24){ c.beginPath(); c.moveTo(0, y); c.lineTo(miniBase.width, y); c.stroke(); }
  c.strokeStyle = '#' + cfg.rail.toString(16).padStart(6, '0');
  c.lineWidth = 5; c.lineJoin = c.lineCap = 'round'; c.shadowColor = c.strokeStyle; c.shadowBlur = 8;
  c.beginPath();
  for(let i = 0; i < M; i += 5){
    const q = miniXY(track.pos[i].x, track.pos[i].z);
    if(i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]);
  }
  c.closePath(); c.stroke(); c.shadowBlur = 0;
  c.fillStyle = '#e8eef4';
  for(const p of design.points){ const q = miniXY(p.x, p.z); c.beginPath(); c.arc(q[0], q[1], 2.3, 0, Math.PI * 2); c.fill(); }
  const start = miniXY(track.pos[0].x, track.pos[0].z);
  c.fillStyle = '#59c98d'; c.fillRect(start[0] - 3, start[1] - 3, 6, 6);
}
function drawMiniMap(){
  if(!track || !minimap) return;
  miniCtx.clearRect(0, 0, minimap.width, minimap.height);
  miniCtx.drawImage(miniBase, 0, 0);
  frameAt(sim.S, miniPos, miniTan, miniUp);
  const q = miniXY(miniPos.x, miniPos.z), ang = Math.atan2(miniTan.z, miniTan.x);
  miniCtx.save(); miniCtx.translate(q[0], q[1]); miniCtx.rotate(-ang);
  miniCtx.fillStyle = '#ffffff'; miniCtx.shadowColor = '#ffffff'; miniCtx.shadowBlur = 10;
  miniCtx.beginPath(); miniCtx.moveTo(7, 0); miniCtx.lineTo(-5, -4.5); miniCtx.lineTo(-3, 0); miniCtx.lineTo(-5, 4.5); miniCtx.closePath(); miniCtx.fill();
  miniCtx.restore();
}
function drawGBall(gl, gv){
  const c = gbCtx, W = 64, H = 64;
  const cl = THREE.MathUtils.clamp;
  c.setTransform(2, 0, 0, 2, 0, 0);
  c.fillStyle = '#1c2836';
  c.fillRect(0, 0, W, H);
  const X = g => W / 2 + g * (W / 2 - 4) / 2;     // ±2 g lateral
  const Y = g => 3 + (7 - g) / 9 * (H - 6);       // +7 … −2 g seat
  c.fillStyle = 'rgba(229,72,77,0.16)';
  c.fillRect(0, 0, X(-LIM.glat), H);
  c.fillRect(X(LIM.glat), 0, W - X(LIM.glat), H);
  c.fillRect(0, 0, W, Y(LIM.gvMax));
  c.fillRect(0, Y(LIM.gvMin), W, H - Y(LIM.gvMin));
  c.strokeStyle = 'rgba(159,176,193,0.3)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
  c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.stroke();
  c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(0, Y(1)); c.lineTo(W, Y(1)); c.stroke();
  c.setLineDash([]);
  gbTrail.push({ gl, gv });
  if(gbTrail.length > 30) gbTrail.shift();
  c.strokeStyle = 'rgba(242,166,60,0.35)';
  c.beginPath();
  gbTrail.forEach((p, i) => {
    const x = X(cl(p.gl, -2, 2)), y = Y(cl(p.gv, -2, 7));
    if(i) c.lineTo(x, y); else c.moveTo(x, y);
  });
  c.stroke();
  const hot = gv > LIM.gvMax || gv < LIM.gvMin || Math.abs(gl) > LIM.glat;
  c.fillStyle = hot ? '#e5484d' : '#f2a63c';
  c.beginPath();
  c.arc(X(cl(gl, -2, 2)), Y(cl(gv, -2, 7)), 3, 0, Math.PI * 2);
  c.fill();
}

function meter(fillEl, x, lo, hi, zeroFrac){
  const span = hi - lo;
  const zf = zeroFrac, xf = Math.max(0, Math.min(1, (x - lo) / span));
  const a = Math.min(zf, xf), b = Math.max(zf, xf);
  fillEl.style.left = (a * 100) + '%';
  fillEl.style.width = Math.max(1.5, (b - a) * 100) + '%';
}
const telemetryAnnouncer = __clabGet('clab-telemetryAnnouncer');
let lastTelemetryAnnouncement = -Infinity, lastTelemetryState = '';
function announceRideTelemetry(v, gV, gLat, state){
  if(!telemetryAnnouncer || !sim.running || sim.paused) return;
  const now = performance.now();
  const urgent = state === 'LIMIT';
  if(!urgent && state === lastTelemetryState && now - lastTelemetryAnnouncement < 4500) return;
  lastTelemetryAnnouncement = now;
  lastTelemetryState = state;
  telemetryAnnouncer.textContent = `${state}. Speed ${fmt(v * 3.6, 0)} kilometers per hour. Vertical force ${fmt(gV, 1)} g. Lateral force ${fmt(gLat, 1)} g.`;
}

/* ---- which row you are riding in ------------------------------------------
   Row 0 sits exactly where the simulation integrates from, so the front row is
   the reference the certification problems predict against — riding it changes
   nothing. Choose any other row and the HUD switches to what THAT row feels,
   using the rigid-train speed (one speed for the whole train, restated at its
   mean height). Certification and Ride & Solve always read the front row, so a
   student's predictions and the meter they are told to watch never disagree. */
let rideSeat = (() => {
  try{ const v = parseInt(localStorage.getItem('coaster_lab_seat'), 10); return (v >= 0 && v < TRAIN_CARS) ? v : 0; }
  catch(_e){ return 0; }
})();
function activeSeat(){ return (sim.cert || sim.ride) ? 0 : Math.min(rideSeat, TRAIN_CARS - 1); }
/* The speed a rigid train really has: every car shares it, and it belongs to the
   train's mean height, not to whichever point the integrator runs from. */
function trainSpeed2(yRef){
  let ySum = 0;
  for(let c = 0; c < TRAIN_CARS; c++) ySum += trackAt(sim.S - c * CAR_GAP).y;
  return Math.max(0, sim.v * sim.v + 2 * G0 * (yRef - ySum / TRAIN_CARS));
}
function updateHUD(){
  const seat = activeSeat();
  const yRef = trackAt(sim.S).y;
  const v = Math.abs(sim.v);
  let gV, gLat, ySeat;
  if(seat === 0){
    // the reference point itself — left bit-for-bit as it always was
    const tr0 = trackAt(sim.S);
    gV = tr0.upY + sim.v * sim.v * tr0.kUp / G0;
    gLat = tr0.sideY + sim.v * sim.v * tr0.kSide / G0;
    ySeat = tr0.y;
  } else {
    const v2 = trainSpeed2(yRef);
    const ts = trackAt(sim.S - seat * CAR_GAP);
    gV = ts.upY + v2 * ts.kUp / G0;
    gLat = ts.sideY + v2 * ts.kSide / G0;
    ySeat = ts.y;
  }
  const overLimit = gV > LIM.gvMax || gV < LIM.gvMin || Math.abs(gLat) > LIM.glat;
  const caution = !overLimit && (gV > 4 || gV < -1 || Math.abs(gLat) > 0.8);
  const state = !sim.running ? 'READY' : sim.paused ? 'HOLD' : overLimit ? 'LIMIT' : caution ? 'CAUTION' : 'SAFE';
  hud.state.textContent = state;
  hud.state.className = 'clab-state-pill' + (overLimit ? ' hot' : caution ? ' caution' : '');
  const seatTele = sim.tele && sim.tele.seats && sim.tele.seats[seat];
  const peakG = (seatTele && Number.isFinite(seatTele.maxGV)) ? seatTele.maxGV
    : (sim.tele && Number.isFinite(sim.tele.maxGV) ? sim.tele.maxGV : gV);
  hud.peak.textContent = `Peak ${peakG >= 0 ? '+' : ''}${fmt(peakG, 2)} g`;
  announceRideTelemetry(v, gV, gLat, state);
  hud.speed.innerHTML = `${fmt(v, 1)} <small>m/s</small>`;
  hud.kmh.textContent = `${fmt(v * 3.6, 0)} km/h`;
  hud.h.innerHTML = `${fmt(ySeat, 1)} <small>m</small>`;
  if(hud.gvLabel) hud.gvLabel.textContent = seat === 0 ? 'Seat g (vertical)' : 'Seat g · ' + seatLabel(seat, TRAIN_CARS);
  meter(hud.gvFill, gV, -2, 7, 2 / 9);
  meter(hud.glFill, gLat, -2, 2, 0.5);
  hud.gvVal.textContent = (gV >= 0 ? '+' : '') + fmt(gV, 2) + ' g';
  hud.gvVal.className = 'gval' + (gV > LIM.gvMax || gV < LIM.gvMin ? ' hot' : '');
  hud.glVal.textContent = (gLat >= 0 ? '+' : '') + fmt(gLat, 2) + ' g';
  hud.glVal.className = 'gval' + (Math.abs(gLat) > LIM.glat ? ' hot' : '');
  drawGBall(gLat, gV);

  /* energy budget vs release at the crest (per unit mass) */
  if(track.sCrest != null && analysis && analysis.B){
    const yMin = analysis.B.h;
    const eTot = 0.5 * analysis.A.v * analysis.A.v + G0 * (analysis.A.h - yMin);
    const ke = 0.5 * sim.v * sim.v, pe = G0 * Math.max(0, yRef - yMin);
    const heat = Math.min(sim.tele ? sim.tele.heat : 0, Math.max(0, eTot - ke - pe));
    const sum = Math.max(ke + pe + heat, 1e-6), w = x => (100 * x / Math.max(eTot, sum));
    hud.eKE.style.width = w(ke) + '%';
    hud.ePE.style.width = w(pe) + '%';
    hud.eHeat.style.width = w(heat) + '%';
  }
  drawMiniMap();
}

/* ---------------- banner ---------------- */
const bannerEl = __clabGet('clab-banner');
let bannerTimer = null;
function banner(msg, cls = '', ms = 2500){
  const usesBridgeAnnouncer = !!(__clabBridge && __clabBridge.announce);
  bannerEl.setAttribute('aria-live', usesBridgeAnnouncer ? 'off' : 'polite');
  if(usesBridgeAnnouncer){ try{ __clabBridge.announce(msg); }catch(_e){} }
  bannerEl.textContent = msg;
  bannerEl.className = cls;
  bannerEl.hidden = false;
  clearTimeout(bannerTimer);
  __clabResources.bannerTimerId = null;
  bannerTimer = setTimeout(() => {
    bannerTimer = null;
    __clabResources.bannerTimerId = null;
    if(!__clabDead) bannerEl.hidden = true;
  }, ms);
  __clabResources.bannerTimerId = bannerTimer;
}

/* ---------------- cameras & pointer input ---------------- */
let camMode = 'orbit';
const orbit = { theta: -0.95, phi: 0.42, radius: 175, target: new THREE.Vector3(60, 8, 28) };
function applyOrbit(){
  const { theta, phi, radius, target } = orbit;
  camera.position.set(
    target.x + radius * Math.cos(phi) * Math.sin(theta),
    target.y + radius * Math.sin(phi),
    target.z + radius * Math.cos(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
  camera.up.set(0, 1, 0);
}
function updateOrbitTarget(){
  if(!track) return;
  const box = new THREE.Box3();
  for(let i = 0; i < M; i += 25) box.expandByPoint(track.pos[i]);
  box.getCenter(orbit.target);
  sun.target.position.copy(orbit.target);
  sun.position.set(orbit.target.x + 240, 74, orbit.target.z + 46);
  sky.material.uniforms.sunDir.value.copy(sun.position).normalize();
  atmosphereGroup.position.set(orbit.target.x, 0, orbit.target.z);
}

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hitPt = new THREE.Vector3();
let dragging = null;   // {idx, mode:'xz'|'y'}
let orbiting = false, lastPX = 0, lastPY = 0;

function setNDC(e){
  const r = canvas.getBoundingClientRect();
  mouseNDC.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}

const REDUCED_MOTION_QUERY = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let motionComfort = (() => { try{ return localStorage.getItem('coaster_lab_motion') === 'steady'; }catch(_e){ return false; } })();
function reducedMotion(){ return motionComfort || !!(REDUCED_MOTION_QUERY && REDUCED_MOTION_QUERY.matches); }
function syncMotionUi(){
  const b = __clabGet('clab-btnComfort');
  if(!b) return;
  b.setAttribute('aria-pressed', String(motionComfort));
  b.textContent = motionComfort ? 'Motion: Steady' : 'Motion: Standard';
  rootEl.dataset.cameraMotion = motionComfort ? 'steady' : 'standard';
}
let userTouched = false;

canvas.addEventListener('pointerdown', e => {
  if(e.button !== 0) return;
  userTouched = true;
  canvas.setPointerCapture(e.pointerId);
  setNDC(e);
  if(!sim.running && camMode === 'orbit'){
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(handleGroup.children, false);
    if(hits.length){
      const idx = hits[0].object.userData.idx;
      selectPoint(idx);
      const p = design.points[idx];
      if(e.shiftKey){
        const nrm = new THREE.Vector3();
        camera.getWorldDirection(nrm); nrm.y = 0;
        if(nrm.lengthSq() < 1e-6) nrm.set(0, 0, 1);
        nrm.normalize();
        dragPlane.setFromNormalAndCoplanarPoint(nrm, new THREE.Vector3(p.x, p.y, p.z));
        dragging = { idx, mode: 'y' };
      } else {
        dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(p.x, p.y, p.z));
        dragging = { idx, mode: 'xz' };
      }
      return;
    }
  }
  orbiting = true; lastPX = e.clientX; lastPY = e.clientY;
});
canvas.addEventListener('pointermove', e => {
  if(dragging){
    setNDC(e);
    raycaster.setFromCamera(mouseNDC, camera);
    if(raycaster.ray.intersectPlane(dragPlane, hitPt)){
      const p = design.points[dragging.idx];
      if(dragging.mode === 'xz'){
        p.x = THREE.MathUtils.clamp(hitPt.x, -260, 260);
        p.z = THREE.MathUtils.clamp(hitPt.z, -260, 260);
      } else {
        p.y = THREE.MathUtils.clamp(hitPt.y, 0.5, 45);
      }
      handleGroup.children[dragging.idx].position.set(p.x, p.y, p.z);
      syncPointCard();
      throttledRebuild();
    }
    return;
  }
  if(orbiting && camMode === 'orbit'){
    orbit.theta -= (e.clientX - lastPX) * 0.005;
    orbit.phi = THREE.MathUtils.clamp(orbit.phi + (e.clientY - lastPY) * 0.004, 0.06, 1.35);
    lastPX = e.clientX; lastPY = e.clientY;
  }
});
function endPointer(){
  if(dragging){
    dragging = null;
    fullRebuild();
    saveDesign();
  }
  orbiting = false;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  orbit.radius = THREE.MathUtils.clamp(orbit.radius * (1 + e.deltaY * 0.001), 15, 480);
}, { passive: false });

/* ---------------- rebuild orchestration ---------------- */
let rebuildTimer = 0;
function lightRebuild(){
  track = computeTrackData(design.points);
  rebuildTrackMeshes();
  rebuildMiniMap();
}
function throttledRebuild(){
  const now = performance.now();
  if(now - rebuildTimer > 140){ rebuildTimer = now; lightRebuild(); }
}
function fullRebuild(){
  stopTelemetryReplay(true);
  track = computeTrackData(design.points);
  rebuildTrackMeshes();
  rebuildMiniMap();
  refreshHandles();
  analysis = analyze();
  renderMarkers();
  renderSectionLabels();
  renderSafetyCoach();
  renderProblems();
  updateOrbitTarget();
  rebuildTrees();
  if(xrayMode) colorizeSpine();
  if(__clabGet('clab-btnChain')) syncPropUI();
  updateDesignChallenge();
  syncHistoryButtons();
  hideElementPreview();
}

/* ---------------- build-tab UI ---------------- */
const ptCard = __clabGet('clab-ptCard');
const noSel = __clabGet('clab-noSel');
const slX = __clabGet('clab-slX');
const slZ = __clabGet('clab-slZ');
const slHeight = __clabGet('clab-slHeight');
const slBank = __clabGet('clab-slBank');
const nodeStep = __clabGet('clab-nodeStep');
const buildCoach = __clabGet('clab-buildCoach');
const elementButtons = [...rootEl.querySelectorAll('.clab-element-btn')];
const elementNote = __clabGet('clab-elementNote');
const safetyList = __clabGet('clab-safetyList');
const challengeSelect = __clabGet('clab-designChallenge');
const challengeFill = __clabGet('clab-challengeFill');
const challengeStatus = __clabGet('clab-challengeStatus');
let activeChallenge = (() => { try{ return localStorage.getItem('coaster_lab_challenge') || 'hill20'; }catch(_e){ return 'hill20'; } })();
if(!['hill20', 'airtime3', 'gentle4'].includes(activeChallenge)) activeChallenge = 'hill20';
function updateDesignChallenge(tele = lastTele){
  if(!challengeSelect || !challengeFill || !challengeStatus) return;
  const sameDesign = !!(tele && tele.designKey === JSON.stringify(design.points));
  let pct = 0, done = false, text = '';
  if(activeChallenge === 'hill20'){
    const maxH = Math.max(...design.points.map(p => p.y));
    pct = Math.min(100, maxH / 20 * 100);
    done = maxH >= 20 && safetyFindings.length === 0;
    text = done ? 'Complete: the hill reaches 20 m and preflight is clear.' : `${fmt(maxH, 1)} of 20 m; ${safetyFindings.length ? 'resolve the numbered preflight findings too.' : 'preflight is clear.'}`;
  } else if(activeChallenge === 'airtime3'){
    const airtime = sameDesign && tele.status === 'complete' ? tele.airtime : 0;
    pct = Math.min(100, airtime / 3 * 100);
    done = airtime >= 3;
    text = done ? `Complete: ${fmt(airtime, 1)} seconds of airtime.` : sameDesign ? `${fmt(airtime, 1)} of 3.0 seconds. Add a smooth camelback or increase crest speed.` : 'Run this design to measure airtime.';
  } else {
    const maxG = sameDesign && tele.status === 'complete' ? tele.maxGV : null;
    pct = maxG == null ? 0 : Math.min(100, 400 / Math.max(4, maxG) * 100);
    done = maxG != null && maxG <= 4;
    text = done ? `Complete: peak vertical force is ${fmt(maxG, 2)} g.` : maxG == null ? 'Run this design to measure its peak vertical force.' : `Peak is ${fmt(maxG, 2)} g. Broaden the strongest valley to get below 4.0 g.`;
  }
  challengeFill.style.width = pct + '%';
  challengeStatus.textContent = text;
  challengeStatus.classList.toggle('done', done);
  challengeSelect.value = activeChallenge;
}
challengeSelect.value = activeChallenge;
challengeSelect.addEventListener('change', () => {
  activeChallenge = challengeSelect.value;
  try{ localStorage.setItem('coaster_lab_challenge', activeChallenge); }catch(_e){}
  updateDesignChallenge();
});
__clabGet('clab-btnChallengeRun').addEventListener('click', () => {
  if(sim.running) banner('Finish or stop the current run first.', 'fail', 2200);
  else startRun(false);

});
/* @clab-keyboard-edit-start */
function nudgeNodeXZ(point, dx, dz){
  const x = Number(point && point.x), z = Number(point && point.z);
  const nx = Number(dx), nz = Number(dz);
  return {
    x: Math.max(-260, Math.min(260, (Number.isFinite(x) ? x : 0) + (Number.isFinite(nx) ? nx : 0))),
    z: Math.max(-260, Math.min(260, (Number.isFinite(z) ? z : 0) + (Number.isFinite(nz) ? nz : 0)))
  };
}
/* @clab-keyboard-edit-end */

function nodePhysics(idx){
  if(!track || !analysis || idx < 0 || idx >= design.points.length) return null;
  const p = design.points[idx];
  let best = 0, bestD = Infinity;
  for(let i = 0; i < M; i++){
    const q = track.pos[i];
    const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
    if(d < bestD){ bestD = d; best = i; }
  }
  const arc = track.s[best];
  const near = marker => marker && Math.abs(marker.s - arc) < Math.max(5, track.L * 0.035);
  let section = 'Track';
  if(arc < track.sCrest) section = design.propulsion.mode === 'launch' ? 'Launch' : 'Lift hill';
  else if(near(analysis.A)) section = 'Crest';
  else if(near(analysis.B)) section = 'Valley';
  else if(near(analysis.C)) section = 'Inversion';
  else if(near(analysis.D)) section = 'Banked turn';
  else if(Math.abs(track.kSide[best]) > 0.025) section = 'Turn';
  else if(track.Ty[best] < -0.18) section = 'Drop';
  const v2 = idealV2(best);
  const bank = Math.min(80, Math.atan(Math.abs(v2 * track.kH[best]) / G0) * 180 / Math.PI);
  return { section, speed: Math.sqrt(v2), gv: idealGV(best), bank };
}
function syncNodeLens(idx){
  const d = nodePhysics(idx);
  const put = (id, value) => { const el = __clabGet(id); if(el) el.textContent = value; };
  if(!d){
    for(const id of ['clab-nodeSection', 'clab-nodeSpeed', 'clab-nodeGV', 'clab-nodeBank']) put(id, '?');
    return;
  }
  put('clab-nodeSection', d.section);
  put('clab-nodeSpeed', fmt(d.speed, 1) + ' m/s');
  put('clab-nodeGV', (d.gv >= 0 ? '+' : '') + fmt(d.gv, 2) + ' g');
  put('clab-nodeBank', fmt(d.bank, 0) + '?');
}
function selectPoint(idx){
  selIdx = idx;
  refreshHandles();
  syncPointCard();
  if(buildCoach) buildCoach.hidden = true;
}
function syncPointCard(){
  syncElementPalette();
  if(selIdx < 0 || selIdx >= design.points.length){
    ptCard.hidden = true; noSel.hidden = false;
    if(buildCoach) buildCoach.hidden = !!sim.running;
    return;
  }
  const p = design.points[selIdx];
  ptCard.hidden = false; noSel.hidden = true;
  __clabGet('clab-ptIdx').textContent =
    '#' + selIdx + (selIdx === design.certTurnIdx ? ' ⚑' : '');
  __clabGet('clab-ptCoords').textContent =
    `x ${fmt(p.x)}   z ${fmt(p.z)}   height ${fmt(p.y)} m   bank ${fmt(p.bank, 0)}°`;
  syncNodeLens(selIdx);
  slX.value = p.x;
  slZ.value = p.z;
  slHeight.value = p.y;
  slBank.value = p.bank || 0;
  __clabGet('clab-slXV').textContent = fmt(p.x) + ' m';
  __clabGet('clab-slZV').textContent = fmt(p.z) + ' m';
  slX.setAttribute('aria-valuetext', fmt(p.x) + ' meters');
  slZ.setAttribute('aria-valuetext', fmt(p.z) + ' meters');
  __clabGet('clab-slHeightV').textContent = fmt(p.y) + ' m';
  slHeight.setAttribute('aria-valuetext', fmt(p.y) + ' meters');
  __clabGet('clab-slBankV').textContent = fmt(p.bank || 0, 0) + '°';
  slBank.setAttribute('aria-valuetext', fmt(p.bank || 0, 0) + ' degrees');
}
function enterTrackEditor(){
  if(sim.running){ banner('Stop the train before reshaping the track.', 'fail', 2400); return; }
  camMode = 'orbit';
  __clabGet('clab-btnCam').textContent = 'Camera: Orbit';
  let idx = 0;
  for(let i = 1; i < design.points.length; i++) if(design.points[i].y > design.points[idx].y) idx = i;
  selectPoint(idx);
  userTouched = true;
  try{ ptCard.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }catch(_e){}
  try{ slHeight.focus({ preventScroll: true }); }catch(_e){ slHeight.focus(); }
  banner('Track node selected — drag it in 3-D or use the X, Z, height, and bank controls.', 'pass', 3200);
}
for(const b of rootEl.querySelectorAll('.clab-edit-track')) b.addEventListener('click', enterTrackEditor);
function selectAdjacentPoint(delta){
  if(sim.running){ banner('Stop the train before selecting another node.', 'fail', 2200); return; }
  const count = design.points.length;
  if(!count) return;
  const next = selIdx < 0 ? (delta < 0 ? count - 1 : 0) : (selIdx + delta + count) % count;
  selectPoint(next);
  const p = design.points[next];
  banner(`Node ${next} selected. X ${fmt(p.x)} meters; Z ${fmt(p.z)} meters; height ${fmt(p.y)} meters; bank ${fmt(p.bank || 0, 0)} degrees.`, 'pass', 1800);
}
function nudgeSelectedNode(dx, dz){
  if(sim.running || selIdx < 0) return;
  const step = Math.max(0.5, Number(nodeStep.value) || 0.5);
  const p = design.points[selIdx];
  const moved = nudgeNodeXZ(p, dx * step, dz * step);
  p.x = moved.x; p.z = moved.z;
  handleGroup.children[selIdx].position.x = p.x;
  handleGroup.children[selIdx].position.z = p.z;
  userTouched = true;
  fullRebuild(); syncPointCard(); saveDesign();
  banner(`Node ${selIdx} moved to X ${fmt(p.x)} meters, Z ${fmt(p.z)} meters.`, 'pass', 1800);
}
__clabGet('clab-btnPrevPt').addEventListener('click', () => selectAdjacentPoint(-1));
__clabGet('clab-btnNextPt').addEventListener('click', () => selectAdjacentPoint(1));
__clabGet('clab-btnXMinus').addEventListener('click', () => nudgeSelectedNode(-1, 0));
__clabGet('clab-btnXPlus').addEventListener('click', () => nudgeSelectedNode(1, 0));
__clabGet('clab-btnZMinus').addEventListener('click', () => nudgeSelectedNode(0, -1));
__clabGet('clab-btnZPlus').addEventListener('click', () => nudgeSelectedNode(0, 1));
function syncGroundPositionFromControls(){
  if(selIdx < 0) return;
  const p = design.points[selIdx];
  p.x = Math.max(-260, Math.min(260, parseFloat(slX.value)));
  p.z = Math.max(-260, Math.min(260, parseFloat(slZ.value)));
  handleGroup.children[selIdx].position.x = p.x;
  handleGroup.children[selIdx].position.z = p.z;
  userTouched = true;
  syncPointCard(); throttledRebuild();
}
slX.addEventListener('input', syncGroundPositionFromControls);
slZ.addEventListener('input', syncGroundPositionFromControls);
slHeight.addEventListener('input', () => {
  if(selIdx < 0) return;
  design.points[selIdx].y = parseFloat(slHeight.value);
  handleGroup.children[selIdx].position.y = design.points[selIdx].y;
  syncPointCard(); throttledRebuild();
});
slBank.addEventListener('input', () => {
  if(selIdx < 0) return;
  design.points[selIdx].bank = parseFloat(slBank.value);
  syncPointCard(); throttledRebuild();
});
for(const sl of [slX, slZ, slHeight, slBank]) sl.addEventListener('change', () => { fullRebuild(); saveDesign(); });

__clabGet('clab-btnAddPt').addEventListener('click', () => {
  if(selIdx < 0) return;
  const K = design.points.length;
  const mid = track.curve.getPoint(((selIdx + 0.5) / K) % 1);
  const b = (design.points[selIdx].bank + design.points[(selIdx + 1) % K].bank) / 2;
  design.points.splice(selIdx + 1, 0, { x: mid.x, y: Math.max(0.5, mid.y), z: mid.z, bank: b });
  if(design.certTurnIdx > selIdx) design.certTurnIdx++;
  selIdx = selIdx + 1;
  fullRebuild(); syncPointCard(); saveDesign();
});
__clabGet('clab-btnDelPt').addEventListener('click', () => {
  if(selIdx < 0 || design.points.length <= 6){ banner('A circuit needs at least 6 nodes.', 'fail'); return; }
  design.points.splice(selIdx, 1);
  if(design.certTurnIdx >= design.points.length) design.certTurnIdx = 0;
  else if(design.certTurnIdx > selIdx) design.certTurnIdx--;
  selIdx = -1;
  fullRebuild(); syncPointCard(); saveDesign();
});
__clabGet('clab-btnFlagPt').addEventListener('click', () => {
  if(selIdx < 0) return;
  design.certTurnIdx = selIdx;
  fullRebuild(); syncPointCard(); saveDesign();
});

/* @clab-elements-start — pure element geometry, exercised by focused tests */
function buildElementPoints(kind, p0, p1){
  const dx = p1.x - p0.x, dz = p1.z - p0.z;
  const len = Math.max(1, Math.hypot(dx, dz));
  const ux = dx / len, uz = dz / len, sx = -uz, sz = ux;
  const bank0 = Number.isFinite(p0.bank) ? p0.bank : 0;
  const bank1 = Number.isFinite(p1.bank) ? p1.bank : 0;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round = v => +v.toFixed(2);
  const at = (t, rise = 0, side = 0, bank = null) => ({
    x: round(clamp(p0.x + dx * t + sx * side, -260, 260)),
    y: round(clamp(p0.y + (p1.y - p0.y) * t + rise, 0.5, 45)),
    z: round(clamp(p0.z + dz * t + sz * side, -260, 260)),
    bank: round(bank == null ? bank0 + (bank1 - bank0) * t : bank)
  });
  if(kind === 'hill'){
    const lift = clamp(len * .34, 7, 13);
    return [at(.24, lift * .28), at(.5, lift), at(.76, lift * .28)];
  }
  if(kind === 'drop'){
    const lift = clamp(len * .32, 7, 12), dip = clamp(len * .2, 4, 8);
    return [at(.18, lift * .45), at(.38, lift), at(.64, -dip), at(.82, -dip * .2)];
  }
  if(kind === 'turn-left' || kind === 'turn-right'){
    const sign = kind === 'turn-left' ? 1 : -1;
    const sweep = sign * clamp(len * .55, 10, 24);
    return [at(.24, 0, sweep * .45, sign * 24), at(.52, 0, sweep, sign * 42), at(.78, 0, sweep * .45, sign * 24)];
  }
  if(kind === 'loop'){
    const r = clamp(len * .22, 5, 8);
    const centerD = len * .5;
    const baseY = clamp((p0.y + p1.y) * .5, .5, 45 - 2 * r);
    const out = [at(.16, 0, 0, 0)];
    for(let k = 1; k <= 8; k++){
      const th = -Math.PI / 2 + k * Math.PI / 4;
      const along = centerD + r * Math.cos(th);
      out.push({
        x: round(clamp(p0.x + ux * along, -260, 260)),
        y: round(clamp(baseY + r + r * Math.sin(th), .5, 45)),
        z: round(clamp(p0.z + uz * along, -260, 260)),
        bank: 0
      });
    }
    out.push(at(.84, 0, 0, 0));
    return out;
  }
  return [];
}
/* @clab-elements-end */
const previewMat = new THREE.MeshBasicMaterial({ color: 0x78d8ff, transparent: true, opacity: 0.46, depthWrite: false, toneMapped: false });
const previewNodeMat = new THREE.MeshBasicMaterial({ color: 0xf4d35e, transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false });
function hideElementPreview(){
  disposeGroup(previewGroup);
  previewGroup.visible = false;
}
function showElementPreview(kind){
  hideElementPreview();
  if(sim.running || selIdx < 0 || !design.points[selIdx]) return;
  const nextIdx = (selIdx + 1) % design.points.length;
  const added = buildElementPoints(kind, design.points[selIdx], design.points[nextIdx]);
  if(!added.length) return;
  const pts = [design.points[selIdx], ...added, design.points[nextIdx]].map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 8), 0.16, 6, false), previewMat);
  tube.renderOrder = 7;
  previewGroup.add(tube);
  for(const p of added){
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 7), previewNodeMat);
    node.position.set(p.x, p.y, p.z);
    previewGroup.add(node);
  }
  previewGroup.visible = true;
}
function syncElementPalette(){
  const ready = selIdx >= 0 && selIdx < design.points.length && !sim.running;
  for(const b of elementButtons) b.disabled = !ready;
  if(elementNote) elementNote.textContent = ready
    ? `New pieces will be inserted after node ${selIdx}; every new node remains editable.`
    : 'Choose a glowing node to unlock these pieces.';
}
function insertTrackElement(kind){
  if(sim.running){ banner('Stop the train before adding track.', 'fail', 2400); return; }
  if(selIdx < 0){ banner('Choose the node where the new element should begin.', 'fail', 2600); return; }
  const nextIdx = (selIdx + 1) % design.points.length;
  const added = buildElementPoints(kind, design.points[selIdx], design.points[nextIdx]);
  if(!added.length) return;
  if(design.points.length + added.length > 80){ banner('That design is at the 80-node limit.', 'fail', 2600); return; }
  const startIdx = selIdx;
  design.points.splice(startIdx + 1, 0, ...added);
  if(design.certTurnIdx > startIdx) design.certTurnIdx += added.length;
  selIdx = startIdx + Math.ceil(added.length / 2);
  fullRebuild(); syncPointCard(); saveDesign();
  const label = { hill: 'Hill', drop: 'Drop', 'turn-left': 'Left turn', 'turn-right': 'Right turn', loop: 'Vertical loop' }[kind] || 'Track element';
  banner(`${label} added — reshape any of its glowing nodes.`, 'pass', 3000);
}
for(const b of elementButtons){
  b.addEventListener('click', () => insertTrackElement(b.dataset.element));
  b.addEventListener('mouseenter', () => showElementPreview(b.dataset.element));
  b.addEventListener('focus', () => showElementPreview(b.dataset.element));
  b.addEventListener('mouseleave', hideElementPreview);
  b.addEventListener('blur', hideElementPreview);
}
if(safetyList) safetyList.addEventListener('click', e => {
  const b = e.target.closest('[data-safety-index]');
  if(b) focusSafetyFinding(+b.dataset.safetyIndex);
});
const startSimpleBtn = __clabGet('clab-btnStartSimple');
if(startSimpleBtn) startSimpleBtn.addEventListener('click', () => {
  if(sim.running){ banner('Stop the train before starting a new design.', 'fail', 2400); return; }
  if(!confirm('Start with a sparse six-node circuit? Your current design will be replaced (Undo is available).')) return;
  design = normalizeDesign(simpleDesign());
  selIdx = 2;
  fullRebuild(); syncPointCard(); saveDesign();
  userTouched = true;
  banner('Simple circuit ready — select a segment and add your first element.', 'pass', 3400);
});

/* ---------------- propulsion UI ---------------- */
const slLaunch = __clabGet('clab-slLaunch');
function syncPropUI(){
  const prop = design.propulsion;
  __clabGet('clab-btnChain').classList.toggle('on', prop.mode === 'chain');
  __clabGet('clab-btnLaunch').classList.toggle('on', prop.mode === 'launch');
  __clabGet('clab-launchRow').hidden = prop.mode !== 'launch';
  slLaunch.value = prop.accel;
  __clabGet('clab-slLaunchV').textContent = fmt(prop.accel) + ' m/s²';
  const note = __clabGet('clab-propNote');
  if(prop.mode === 'chain'){
    note.textContent = 'The chain hauls the train to the first crest and lets go at 3.5 m/s.';
  } else {
    const L = analysis && analysis.L;
    note.textContent = L
      ? `Motors shove the train at ${fmt(prop.accel)} m/s² over the first ${fmt(L.len)} m — after that, physics is on its own. ` +
        (analysis.clears ? `It crosses the crest at ${fmt(analysis.A.v)} m/s.` : 'Right now it can’t clear the crest!')
      : 'Motors shove the train along the launch section — then physics is on its own.';
  }
}
__clabGet('clab-btnChain').addEventListener('click', () => {
  design.propulsion.mode = 'chain';
  fullRebuild(); syncPropUI(); saveDesign();
});
__clabGet('clab-btnLaunch').addEventListener('click', () => {
  design.propulsion.mode = 'launch';
  fullRebuild(); syncPropUI(); saveDesign();
});
slLaunch.addEventListener('input', () => {
  design.propulsion.accel = parseFloat(slLaunch.value);
  __clabGet('clab-slLaunchV').textContent = fmt(design.propulsion.accel) + ' m/s²';
});
slLaunch.addEventListener('change', () => { fullRebuild(); syncPropUI(); saveDesign(); });

/* ---------------- sound (synthesized, off by default) ---------------- */
const audio = { enabled: false, ctx: null, master: null, windFilt: null, windGain: null,
                humOsc: null, humGain: null, chainAcc: 0 };
function initAudio(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  audio.ctx = new Ctx();
  __clabResources.audioCtx = audio.ctx;
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.8;
  audio.master.connect(audio.ctx.destination);
  const buf = audio.ctx.createBuffer(1, audio.ctx.sampleRate * 2, audio.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  audio.windFilt = audio.ctx.createBiquadFilter();
  audio.windFilt.type = 'lowpass'; audio.windFilt.frequency.value = 250;
  audio.windGain = audio.ctx.createGain(); audio.windGain.gain.value = 0;
  src.connect(audio.windFilt); audio.windFilt.connect(audio.windGain);
  audio.windGain.connect(audio.master);
  src.start();
  audio.humOsc = audio.ctx.createOscillator();
  audio.humOsc.type = 'sawtooth'; audio.humOsc.frequency.value = 55;
  const humFilt = audio.ctx.createBiquadFilter();
  humFilt.type = 'lowpass'; humFilt.frequency.value = 160;
  audio.humGain = audio.ctx.createGain(); audio.humGain.gain.value = 0;
  audio.humOsc.connect(humFilt); humFilt.connect(audio.humGain);
  audio.humGain.connect(audio.master);
  audio.humOsc.start();
}
function chainTick(){
  const c = audio.ctx, t0 = c.currentTime;
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 900 + Math.random() * 250;
  const g = c.createGain();
  g.gain.setValueAtTime(0.06, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
  o.connect(g); g.connect(audio.master);
  o.start(t0); o.stop(t0 + 0.05);
}
function blip(freq, dur = 0.12, vol = 0.1){
  if(!audio.enabled || !audio.ctx) return;
  try{
    const c = audio.ctx, t0 = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }catch(_e){}
}
function jingle(ok){
  if(!audio.enabled) return;
  const c = audio.ctx, t0 = c.currentTime;
  const notes = ok ? [523, 659, 784] : [220, 160];
  notes.forEach((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0 + i * 0.13);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + i * 0.13 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.13 + 0.3);
    o.connect(g); g.connect(audio.master);
    o.start(t0 + i * 0.13); o.stop(t0 + i * 0.13 + 0.35);
  });
}
function updateAudio(dt){
  if(!audio.enabled || !audio.ctx) return;
  try{
    const v = Math.abs(sim.v);
    const windTarget = sim.running ? Math.min(0.5, Math.pow(v / 40, 1.4)) : 0;
    const wg = audio.windGain.gain;
    wg.value += (windTarget - wg.value) * Math.min(1, dt * 5);
    audio.windFilt.frequency.value = 220 + v * 52;
    const launch = design.propulsion.mode === 'launch';
    const inLaunch = launch && analysis && analysis.L && sim.running && sim.S < analysis.L.s;
    const humTarget = inLaunch ? 0.22 : 0;
    audio.humGain.gain.value += (humTarget - audio.humGain.gain.value) * Math.min(1, dt * 8);
    if(inLaunch) audio.humOsc.frequency.value = 50 + v * 7;
    if(!launch && sim.running && sim.S < track.sCrest && track.sCrest != null){
      audio.chainAcc += v * dt;
      if(audio.chainAcc > 0.8){ audio.chainAcc = 0; chainTick(); }
    }
  }catch(_e){ audio.enabled = false; }
}
__clabGet('clab-btnSound').addEventListener('click', e => {
  audio.enabled = !audio.enabled;
  if(audio.enabled && !audio.ctx){
    try{ initAudio(); }catch(_err){ audio.enabled = false; }
  }
  if(audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  e.target.textContent = audio.enabled ? '🔊 Sound' : '🔇 Sound';
});

/* ---------------- top-bar UI ---------------- */
let friction = true;
__clabGet('clab-btnRun').addEventListener('click', () => {
  if(sim.running){ stopRun(); cleanupRide(false); }
  else startRun(false);
});
(function wireSeatSelect(){
  const sel = __clabGet('clab-seatSel');
  if(!sel) return;
  sel.value = String(rideSeat);
  if(sel.value !== String(rideSeat)) sel.value = '0';   // train got shorter than a saved choice
  sel.addEventListener('change', () => {
    rideSeat = Math.max(0, Math.min(TRAIN_CARS - 1, parseInt(sel.value, 10) || 0));
    try{ localStorage.setItem('coaster_lab_seat', String(rideSeat)); }catch(_e){}
    if(camMode !== 'onboard' && !sim.running){
      banner('Riding in the ' + seatLabel(rideSeat, TRAIN_CARS).toLowerCase() +
        '. Press C for the onboard view, then run it.', '', 3000);
    } else {
      banner('Riding in the ' + seatLabel(rideSeat, TRAIN_CARS).toLowerCase() + '.', '', 2200);
    }
  });
})();
__clabGet('clab-btnCam').addEventListener('click', e => {
  camMode = camMode === 'orbit' ? 'onboard' : (camMode === 'onboard' ? 'chase' : 'orbit');
  e.target.textContent = 'Camera: ' + { orbit: 'Orbit', onboard: 'Onboard', chase: 'Chase' }[camMode];
});
__clabGet('clab-btnView').addEventListener('click', e => {
  const modes = ['track', 'speed', 'vertical', 'lateral', 'curvature'];
  applyTrackViz(modes[(modes.indexOf(heatmapMode) + 1) % modes.length]);
  __clabGet('clab-xrayLegend').hidden = !xrayMode;
  rebuildTrackMeshes();
  if(xrayMode) colorizeSpine();
});
__clabGet('clab-btnFric').addEventListener('click', e => {
  friction = !friction;
  e.target.textContent = 'Friction: ' + (friction ? 'Realistic' : 'Off (ideal)');
});
/* ---------------- share: export / import a design ---------------- */
function exportDesign(){
  return JSON.stringify({ coasterlab: DESIGN_SCHEMA, ...design });
}
function importDesign(str){
  design = parseDesignJson(str);
  selIdx = -1;
  fullRebuild(); syncPointCard(); saveDesign();
}
function showDesignRecovery(){
  if(!designRecovery) return;
  const kept = !!designRecovery.raw;
  banner(kept
    ? 'Saved design was invalid. Starter restored; a recovery copy is available beside Import.'
    : 'Saved design was invalid or too large. Starter restored safely.', 'fail', 6500);
  if(!kept || __clabGet('clab-btnRecovery')) return;
  const anchor = __clabGet('clab-btnImport');
  if(!anchor) return;
  const btn = document.createElement('button');
  btn.id = 'clab-btnRecovery'; btn.className = 'ghost'; btn.textContent = 'Copy recovered save';
  btn.title = 'Copy the original invalid save before replacing it';
  btn.addEventListener('click', () => {
    const done = () => banner('Recovered save copied. Keep it somewhere safe before editing.', 'pass', 3200);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(designRecovery.raw).then(done, () => window.prompt('Copy the recovered save:', designRecovery.raw));
    } else window.prompt('Copy the recovered save:', designRecovery.raw);
  });
  anchor.insertAdjacentElement('afterend', btn);
}
__clabGet('clab-btnExport').addEventListener('click', () => {
  const s = exportDesign();
  const done = () => banner('Design copied — paste it anywhere to share.', 'pass', 2800);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(s).then(done, () => window.prompt('Copy your design:', s));
  } else {
    window.prompt('Copy your design:', s);
  }
});
__clabGet('clab-btnImport').addEventListener('click', () => {
  const s = window.prompt('Paste a Coaster Lab design:');
  if(!s) return;
  try{ importDesign(s); banner('Design imported!', 'pass', 2500); }
  catch(_e){ banner('That doesn’t look like a Coaster Lab design.', 'fail', 3000); }
});

/* ---------------- FX quality toggle ---------------- */
let fxLite = localStorage.getItem('coaster_lab_fx') === 'lite';
const themeSelect = __clabGet('clab-visualTheme');
const vectorButton = __clabGet('clab-btnVectors');
const vectorLegend = __clabGet('clab-vectorLegend');
const trackVizSelect = __clabGet('clab-trackViz');
const comfortButton = __clabGet('clab-btnComfort');
function updateTrackVizLegend(){
  const legend = __clabGet('clab-xrayLegend');
  if(!legend) return;
  const cfg = HEAT_CONFIG[heatmapMode];
  if(!cfg){
    legend.hidden = true;
    return;
  }
  const mid = (cfg.min + cfg.max) / 2;
  legend.innerHTML = `<span class="hudk">${cfg.label}</span><div class="xbar"></div><div class="xlabels"><span>${fmt(cfg.min, cfg.min % 1 ? 1 : 0)}</span><span>${fmt(mid, mid % 1 ? 1 : 0)} ${cfg.unit}</span><span>${fmt(cfg.max, cfg.max % 1 ? 1 : 0)}</span></div>`;
}
function applyTrackViz(mode, announce = true){
  if(mode !== 'track' && !HEAT_CONFIG[mode]) mode = 'track';
  heatmapMode = mode;
  xrayMode = mode !== 'track';
  if(trackVizSelect) trackVizSelect.value = mode;
  const viewButton = __clabGet('clab-btnView');
  if(viewButton) viewButton.textContent = xrayMode ? 'View: ' + HEAT_CONFIG[mode].label : 'View: Track';
  updateTrackVizLegend();
  const legend = __clabGet('clab-xrayLegend');
  if(legend) legend.hidden = !xrayMode;
  if(track){
    rebuildTrackMeshes();
    if(xrayMode) colorizeSpine();
  }
  try{ localStorage.setItem('coaster_lab_track_viz', mode); }catch(_e){}
  if(announce) banner(xrayMode ? HEAT_CONFIG[mode].label + ' overlay on.' : 'Track analysis overlay off.', '', 2400);
}
function applyVisualTheme(name, announce = true){
  if(!VISUAL_THEMES[name]) name = 'dusk';
  visualTheme = name;
  const cfg = VISUAL_THEMES[name], u = sky.material.uniforms;
  rootEl.dataset.visualTheme = name;
  scene.fog.color.setHex(cfg.fog); scene.fog.near = cfg.fogNear; scene.fog.far = cfg.fogFar;
  renderer.toneMappingExposure = cfg.exposure;
  hemi.color.setHex(cfg.hemiSky); hemi.groundColor.setHex(cfg.hemiGround); hemi.intensity = cfg.hemi;
  sun.color.setHex(cfg.sun); sun.intensity = cfg.sunPower;
  fill.color.setHex(cfg.fill); fill.intensity = cfg.fillPower;
  u.zenColor.value.setHex(cfg.zen); u.midColor.value.setHex(cfg.mid); u.horizonColor.value.setHex(cfg.horizon);
  u.sunGlow.value.setHex(cfg.sunGlow); u.starStrength.value = cfg.stars;
  ground.material.color.setHex(cfg.ground);
  ground.material.map = name === 'blueprint' ? null : groundTex;
  ground.material.needsUpdate = true;
  terrainGrid.visible = !fxLite && name === 'blueprint';
  treeGroup.visible = !fxLite && name !== 'blueprint';
  MAT.rail.color.setHex(cfg.rail); MAT.rail.emissive.setHex(cfg.railGlow);
  MAT.spine.color.setHex(cfg.spine); MAT.support.color.setHex(cfg.support);
  MAT.railDim.color.setHex(name === 'blueprint' ? 0x386b8c : 0x39434e);
  MAT.runningLight.color.setHex(name === 'neon' ? 0xff62c7 : name === 'blueprint' ? 0x8bd7ff : 0xffc873);
  MAT.footing.color.setHex(name === 'daylight' ? 0x606b69 : name === 'blueprint' ? 0x24445d : 0x202a31);
  MAT.cap.color.setHex(cfg.support).offsetHSL(0, 0, 0.08);
  stationEdgeMat.color.setHex(cfg.rail); stationAccentMat.color.setHex(cfg.rail); stationAccentMat.emissive.setHex(cfg.railGlow);
  if(stationLamp){ stationLamp.color.setHex(cfg.sunGlow); stationLamp.intensity = name === 'daylight' ? 0.45 : 1.0; }
  atmosphereMat.color.setHex(name === 'daylight' ? 0x66808a : name === 'neon' ? 0x110b2c : name === 'blueprint' ? 0x17486a : 0x101827);
  atmosphereMat.opacity = name === 'daylight' ? 0.36 : 0.62;
  atmosphereMat.wireframe = name === 'blueprint'; atmosphereMat.needsUpdate = true;
  ferrisMat.color.setHex(cfg.rail); ferrisCabinMat.color.setHex(name === 'neon' ? 0xff62c7 : 0x59c98d);
  cloudMat.color.setHex(name === 'daylight' ? 0xf3f8fb : name === 'neon' ? 0x7869b8 : 0xdde9f4);
  cloudMat.opacity = name === 'daylight' ? 0.3 : 0.18; birdMat.color.setHex(name === 'blueprint' ? 0x8bd7ff : 0xb9cedd);
  for(const flag of stationFlags){ flag.material.color.setHex(cfg.rail); flag.material.emissive.setHex(cfg.railGlow); }
  speedStreakMat.color.setHex(name === 'neon' ? 0x55e8ff : cfg.rail);
  atmosphereGroup.visible = !fxLite;
  if(themeSelect) themeSelect.value = name;
  try{ localStorage.setItem('coaster_lab_theme', name); }catch(_e){}
  if(track){ rebuildMiniMap(); renderSectionLabels(); }
  if(announce) banner('Environment: ' + themeSelect.options[themeSelect.selectedIndex].textContent + '.', 'pass', 2200);
}
function syncVectorUi(){
  vectorGroup.visible = vectorsOn;
  vectorButton.setAttribute('aria-pressed', String(vectorsOn));
  vectorButton.textContent = vectorsOn ? 'Vectors: On' : 'Vectors: Off';
  vectorLegend.hidden = !vectorsOn;
}
themeSelect.value = visualTheme;
themeSelect.addEventListener('change', () => applyVisualTheme(themeSelect.value));
vectorButton.addEventListener('click', () => {
  vectorsOn = !vectorsOn;
  try{ localStorage.setItem('coaster_lab_vectors', vectorsOn ? 'on' : 'off'); }catch(_e){}
  syncVectorUi();
  banner(vectorsOn ? 'Live vectors on: velocity, seat force, and gravity.' : 'Live physics vectors hidden.', '', 2400);
});
trackVizSelect.value = heatmapMode;
trackVizSelect.addEventListener('change', () => applyTrackViz(trackVizSelect.value));
comfortButton.addEventListener('click', () => {
  motionComfort = !motionComfort;
  try{ localStorage.setItem('coaster_lab_motion', motionComfort ? 'steady' : 'standard'); }catch(_e){}
  syncMotionUi();
  banner(motionComfort ? 'Steady motion on: camera shake, pulses, and decorative motion reduced.' : 'Standard motion restored.', 'pass', 3000);
});
syncMotionUi();
applyTrackViz(heatmapMode, false);
applyVisualTheme(visualTheme, false);
syncVectorUi();
function applyFx(){
  renderer.shadowMap.enabled = !fxLite;
  sun.castShadow = !fxLite;
  treeGroup.visible = !fxLite && visualTheme !== 'blueprint';
  terrainGrid.visible = !fxLite && visualTheme === 'blueprint';
  atmosphereGroup.visible = !fxLite;
  if(fxLite) speedStreaks.visible = false;
  if(track && analysis) renderSectionLabels();
  renderer.setPixelRatio(fxLite ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  scene.traverse(o => { if(o.material) o.material.needsUpdate = true; });
  __clabGet('clab-btnFx').textContent = fxLite ? 'FX: Lite' : 'FX: Full';
}
__clabGet('clab-btnFx').addEventListener('click', () => {
  fxLite = !fxLite;
  try{ localStorage.setItem('coaster_lab_fx', fxLite ? 'lite' : 'full'); }catch(_e){}
  applyFx();
});

for(const b of rootEl.querySelectorAll('button.tpl')){
  b.addEventListener('click', () => {
    if(!confirm(`Load the “${b.textContent.trim()}” template? Your current design will be replaced.`)) return;
    design = normalizeDesign(TEMPLATES[b.dataset.tpl]());
    selIdx = -1;
    fullRebuild(); syncPointCard(); saveDesign();
    banner('Starting layout loaded — every glowing node is yours to reshape.', 'pass', 3000);
  });
}
__clabGet('clab-btnResetDesign').addEventListener('click', () => {
  if(!confirm('Restore the starter layout? Your current design will be lost.')) return;
  design = normalizeDesign(defaultDesign());
  selIdx = -1;
  fullRebuild(); syncPointCard(); saveDesign();
});

/* ---- generated coasters -------------------------------------------------
   randomDesign() is pure geometry + an energy budget; it cannot know what the
   filleted spline will actually do. So the preflight coach is the referee: try
   a few seeds and keep the first layout that comes back with no "bad" finding.
   If none does we still hand over the last one and say so, because a coaster
   with a flagged problem is a legitimate thing for a student to go fix. */
/* Second banking pass, run against the REAL sampled track rather than the node
   polygon. randomDesign banks each turn from atan(v²/gr), which is right for a
   flat turn but blind to everything the spline does in between: the fillet, the
   frame carried through an inversion, the cosine blend of bank between nodes.
   So: build the track, ask it how much side-g each node actually predicts, and
   roll the seat by exactly the angle that cancels it.
     gLat = side·W and gUp = up·W, and rolling by δ about the tangent gives
     gLat' = gLat·cos δ + gUp·sin δ, so δ = −atan2(gLat, gUp) zeroes it.
   Where the seat is already pressing hard (a pull-out) gUp is large and δ comes
   out small on its own, which is the behaviour we want: you cannot bank away
   side-g in a valley without dragging the pull-out g sideways with it. */
function autoBankDesign(pts, head, editable, passes = 3){
  const K = pts.length;
  const half = Math.max(2, Math.floor(M / (2 * K)));   // the node "owns" half a segment either side
  for(let pass = 0; pass < passes; pass++){
    const t = computeTrackData(pts);
    const banks = pts.map((p, n) => {
      if(!editable(n)) return p.bank || 0;
      // aim at the WORST side-g the node is responsible for, not the value at the
      // node itself: bank blends between nodes, so the peak sits between them
      const centre = Math.round(n * M / K);
      let worst = 0, gLat = 0, gUp = 1;
      for(let k = -half; k <= half; k++){
        const i = ((centre + k) % M + M) % M;
        const v2 = Math.max(9, 2 * G0 * (head - t.y[i]));
        const lat = t.sideY[i] + v2 * t.kSide[i] / G0;
        if(Math.abs(lat) > worst){
          worst = Math.abs(lat);
          gLat = lat;
          gUp = t.upY[i] + v2 * t.kUp[i] / G0;
        }
      }
      const delta = -Math.atan2(gLat, Math.max(0.5, Math.abs(gUp))) * 180 / Math.PI;
      return Math.max(-70, Math.min(70, (p.bank || 0) + delta * 0.8));
    });
    for(let n = 0; n < K; n++) pts[n].bank = +banks[n].toFixed(2);
  }
}

/* Would a REALISTIC run make it round? The preflight coach only checks the ideal
   (frictionless) energy ceiling, which is the right thing for a student's own
   design — but a generated coaster that rolls back on its first test run is a
   bad handover, so the generator holds itself to the harder standard. This walks
   the sampled track from the crest with exactly the friction stepSim applies
   (rolling resistance scaled by seat-g, plus quadratic drag) and reports whether
   the train runs out of speed. Read-only: it touches no sim state. */
function generatedRunStalls(){
  const a = analysis;
  if(!a || !a.A || !track) return true;
  let v2 = a.A.v * a.A.v;
  const endS = track.L - brakeLen() - 4;
  for(let i = a.A.idx; i < M - 1; i++){
    if(track.s[i] > endS) break;
    const ds = Math.max(0.01, track.s[i + 1] - track.s[i]);
    const gV = track.upY[i] + v2 * track.kUp[i] / G0;
    const fr = MU_ROLL * G0 * Math.min(Math.abs(gV), 6) + K_DRAG * v2;
    v2 -= 2 * G0 * (track.y[i + 1] - track.y[i]) + 2 * fr * ds;
    if(v2 <= 0.3) return true;
  }
  return false;
}

let lastGeneratedSeed = null;
function generateCoaster(seed, style){
  const styleOpt = style && style !== 'auto' ? { style } : null;
  let best = null;
  for(let attempt = 0; attempt < 6; attempt++){
    const trySeed = (seed != null && attempt === 0)
      ? seed
      : ((seed == null ? Math.floor(Math.random() * 900000) + 1000 : seed + attempt * 7919) % 1000000) || 1;
    let raw;
    try{ raw = randomDesign(trySeed, styleOpt); }catch(_e){ continue; }
    let candidate;
    try{
      const editable = new Set(raw.meta.bankable || []);
      autoBankDesign(raw.points, raw.meta.head, n => editable.has(n));
      candidate = normalizeDesign(raw);
    }catch(_e){ continue; }
    design = candidate;
    selIdx = -1;
    fullRebuild();
    const bad = safetyFindings.filter(f => f.severity === 'bad').length;
    const stalls = generatedRunStalls();
    // keep the best attempt so far, so a run of unlucky seeds still hands over
    // the least-broken coaster rather than the last one
    const score = bad + (stalls ? 1 : 0);
    if(!best || score < best.score) best = { seed: trySeed, meta: raw.meta, bad, stalls, score, points: candidate };
    if(!score) break;
  }
  if(best && best.points !== design){
    design = best.points;
    selIdx = -1;
    fullRebuild();
  }
  if(!best) return null;
  lastGeneratedSeed = best.seed;
  syncPointCard();
  saveDesign();
  return best;
}
const randomBtn = __clabGet('clab-btnRandom');
if(randomBtn) randomBtn.addEventListener('click', () => {
  if(sim.running){ banner('Stop the train before generating a new coaster.', 'fail', 2400); return; }
  if(!confirm('Generate a new coaster? Your current design will be replaced (Ctrl+Z undoes it).')) return;
  const seedEl = __clabGet('clab-randomSeed');
  const styleEl = __clabGet('clab-randomStyle');
  const typed = seedEl && seedEl.value.trim() !== '' ? Math.abs(Math.trunc(+seedEl.value)) : null;
  const res = generateCoaster(Number.isFinite(typed) && typed > 0 ? typed : null, styleEl ? styleEl.value : 'auto');
  if(!res){ banner('The generator could not build a track that time — try again.', 'fail', 2800); return; }
  if(seedEl) seedEl.value = String(res.seed);
  const note = __clabGet('clab-randomNote');
  const drop = res.meta ? Math.round(res.meta.crestH - res.meta.valleyY) : 0;
  if(note) note.innerHTML = `Coaster <b>#${res.seed}</b> · ${res.meta ? res.meta.label : 'generated'}, ` +
    `${Math.round(res.meta ? res.meta.crestH : 0)} m lift and a ${drop} m first drop. ` +
    'Share that number and a classmate gets the same coaster. Change it and press Generate for another.';
  banner(res.bad
    ? `Coaster #${res.seed} built — the preflight coach flagged something. See the Build tab and fix it.`
    : res.stalls
      ? `Coaster #${res.seed} built, but it runs out of energy with friction on. Lower a hill and try again.`
      : `Coaster #${res.seed} · ${res.meta ? res.meta.label : ''} — preflight is clear. Take it for a run!`,
    (res.bad || res.stalls) ? 'fail' : 'pass', 3600);
});
/* AI inspector hint — appears only when the host app provides gated AI */
(function wireAiHint(){
  const card = __clabGet('clab-aiCard');
  if(!card) return;
  const ai = __clabBridge && __clabBridge.ai;
  if(!ai) return;
  card.hidden = false;
  const out = __clabGet('clab-aiHintOut');
  const btn = __clabGet('clab-btnAiHint');
  let busy = false;
  btn.addEventListener('click', () => {
    if(busy || !analysis) return;
    busy = true;
    out.textContent = 'The inspector is thinking…';
    const a = analysis;
    const missed = Object.entries(preds)
      .filter(([, p]) => p && !p.ok)
      .map(([k]) => k.toUpperCase())
      .join(', ');
    const prompt =
      'You are a friendly roller coaster inspection engineer coaching a student in a physics sandbox. ' +
      'Give ONE short Socratic hint (3-4 sentences, no formulas solved through, never the final number). ' +
      'Point them at the right physics idea. No em dashes. ' +
      'RIDE DATA: crest h=' + fmt(a.A.h) + ' m crossed at v=' + fmt(a.A.v) + ' m/s; ' +
      'valley h=' + fmt(a.B && a.B.h) + ' m, radius ' + fmt(a.B && a.B.r) + ' m' +
      (a.C ? '; loop apex h=' + fmt(a.C.h) + ' m, radius ' + fmt(a.C.r) + ' m' : '') +
      (a.D ? '; flagged turn h=' + fmt(a.D.h) + ' m, radius ' + fmt(a.D.r) + ' m' : '') +
      (a.L ? '; LSM launch a=' + fmt(a.L.a) + ' m/s2 over ' + fmt(a.L.len) + ' m' : '') +
      '. ' + (missed ? 'The student\'s wrong answers so far: ' + missed + '.' : 'The student has not checked answers yet.');
    ai(prompt, (err, text) => {
      if(__clabDead) return;
      busy = false;
      out.textContent = err
        ? 'The inspector is off duty right now (AI unavailable). Try again shortly.'
        : String(text || '(no response — try again)').slice(0, 900);
    });
  });
})();

function setLevel(l){
  level = l;
  try{ localStorage.setItem('coaster_lab_level', l); }catch(_e){}
  __clabGet('clab-btnExplore').classList.toggle('on', l === 'explore');
  __clabGet('clab-btnEngineer').classList.toggle('on', l === 'engineer');
  renderProblems();
}
__clabGet('clab-btnExplore').addEventListener('click', () => setLevel('explore'));
__clabGet('clab-btnEngineer').addEventListener('click', () => setLevel('engineer'));

/* Ride & Solve topic + grade controls (header selects) */
function initRideControls(){
  const tSel = __clabGet('clab-rideTopic');
  const gSel = __clabGet('clab-rideGrade');
  const aiInput = __clabGet('clab-rideAiSubject');
  // The 🤖 AI topic only works when the host app provides gated AI. In standalone
  // (or with AI hints off) drop the option so it can't be picked, and reset a
  // saved 'ai' choice to physics.
  if(tSel && !aiAvailable()){
    const opt = tSel.querySelector('option[value="ai"]');
    if(opt) opt.remove();
    if(rideTopic === 'ai') rideTopic = 'physics';
  }
  const syncAiInput = () => {
    if(!aiInput) return;
    aiInput.hidden = !(rideTopic === 'ai' && aiAvailable());
  };
  if(aiInput){ aiInput.value = rideAiSubject; syncAiInput(); }
  if(tSel){
    tSel.value = rideTopic;
    tSel.addEventListener('change', () => {
      rideTopic = tSel.value;
      try{ localStorage.setItem('coaster_lab_ride_topic', rideTopic); }catch(_e){}
      syncAiInput();
      if(rideTopic === 'ai'){
        if(aiInput){ try{ aiInput.focus(); }catch(_e){} }
        if(rideAiSubject && aiAvailable() && aiQ.buffer.length < 2) fetchAiQuestions(rideAiSubject, rideBand());
        banner(rideAiSubject ? ('AI questions on: ' + rideAiSubject) : 'Type any topic in the box and the AI will quiz on it.', '', 2600);
      } else {
        resetAiQuestionBuffer();
        const label = tSel.options[tSel.selectedIndex].textContent.replace(/^[^A-Za-z]+/, '').trim();
        banner('Ride & Solve questions: ' + (rideTopic === 'physics' ? 'coaster physics' : label.toLowerCase()), '', 2400);
      }
    });
  }
  if(aiInput){
    const commit = () => {
      const v = aiInput.value.trim().slice(0, 60);
      if(v === rideAiSubject) return;
      rideAiSubject = v;
      try{ localStorage.setItem('coaster_lab_ride_ai_subject', rideAiSubject); }catch(_e){}
      resetAiQuestionBuffer(); // topic changed — invalidate in-flight and buffered questions
      if(rideAiSubject && aiAvailable()){
        const requestedSubject = rideAiSubject;
        banner('Writing ' + requestedSubject + ' questions…', '', 2000);
        fetchAiQuestions(requestedSubject, rideBand(), n => {
          if(__clabDead || rideTopic !== 'ai' || rideAiSubject !== requestedSubject) return;
          banner(n ? ('Ready: ' + n + ' ' + requestedSubject + ' questions loaded.') : 'The AI could not make questions for that — try rewording.', n ? 'pass' : 'fail', 2600);
        });
      }
    };
    aiInput.addEventListener('change', commit);
    aiInput.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); commit(); } });
  }
  if(gSel){
    gSel.value = rideGradeSel;
    gSel.addEventListener('change', () => {
      rideGradeSel = gSel.value;
      try{ localStorage.setItem('coaster_lab_ride_grade', rideGradeSel); }catch(_e){}
      // Grade also nudges the physics difficulty so "Grades K–2 / 3–5" reads as
      // Explore and "6–8 / 9–12" as Engineer. The manual toggle still overrides.
      const band = rideBand();
      if(rideTopic === 'physics' || rideTopic === 'mix') setLevel((band === 'k2' || band === 'g35') ? 'explore' : 'engineer');
      // grade changed → the AI batch was tuned to the old band; refetch
      if(rideTopic === 'ai' && rideAiSubject && aiAvailable()){ resetAiQuestionBuffer(); fetchAiQuestions(rideAiSubject, band); }
      const auto = gSel.value === 'auto';
      banner('Question level: ' + (auto ? 'auto (from class grade)' : gSel.options[gSel.selectedIndex].textContent.trim()), '', 2400);
    });
  }
}

__clabGet('clab-btnCheck').addEventListener('click', checkPredictions);
__clabGet('clab-btnCert').addEventListener('click', () => {
  if(sim.running) return;
  checkPredictions();
  startRun(true);
});

/* ---------------- guide, shortcuts, train colors, snapshot -------------- */
const guideEl = __clabGet('clab-guide');
const guideBtn = __clabGet('clab-btnGuide');
const guideCloseBtn = __clabGet('clab-btnGuideClose');
let guideReturnFocus = null;
function toggleGuide(force){
  const opening = force != null ? !!force : guideEl.hidden;
  const wasOpen = !guideEl.hidden;
  if(opening){
    guideReturnFocus = rootEl.contains(document.activeElement) ? document.activeElement : guideBtn;
    guideEl.hidden = false;
    guideBtn.setAttribute('aria-expanded', 'true');
    try{ guideCloseBtn.focus({ preventScroll: true }); }catch(_e){ guideCloseBtn.focus(); }
  } else {
    guideEl.hidden = true;
    guideBtn.setAttribute('aria-expanded', 'false');
    if(wasOpen && guideReturnFocus && guideReturnFocus.isConnected){
      try{ guideReturnFocus.focus({ preventScroll: true }); }catch(_e){ guideReturnFocus.focus(); }
    }
    guideReturnFocus = null;
  }
}
guideBtn.addEventListener('click', () => toggleGuide());
guideCloseBtn.addEventListener('click', () => toggleGuide(false));

function snapshotView(){
  try{
    renderer.render(scene, camera);
    const a = document.createElement('a');
    a.href = renderer.domElement.toDataURL('image/png');
    a.download = 'coaster_lab_view.png';
    a.click();
    banner('Snapshot saved.', '', 1800);
  }catch(_e){ banner('Snapshot failed on this browser.', 'fail', 2200); }
}

const TRAIN_KEY = 'coaster_lab_train';
function applyTrainColor(hex){
  MAT.carHead.color.set(hex);
  for(const b of rootEl.querySelectorAll('#clab-trainColors .swatch')){
    b.classList.toggle('on', b.dataset.c === hex);
  }
}
for(const b of rootEl.querySelectorAll('#clab-trainColors .swatch')){
  b.addEventListener('click', () => {
    applyTrainColor(b.dataset.c);
    try{ localStorage.setItem(TRAIN_KEY, b.dataset.c); }catch(_e){}
  });
}
applyTrainColor((() => {
  try{ return localStorage.getItem(TRAIN_KEY) || '#f2a63c'; }catch(_e){ return '#f2a63c'; }
})());

/* @clab-shortcut-target-start */
function isGlobalShortcutTarget(target){
  if(!target || typeof target.closest !== 'function') return false;
  return !!target.closest('button, input, select, textarea, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="tab"], [role="option"]');
}
function isTextEditingTarget(target){
  if(!target || typeof target.closest !== 'function') return false;
  return !!target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])');
}
/* @clab-shortcut-target-end */
rootEl.addEventListener('keydown', e => {
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if(k === 'escape' && !guideEl.hidden){ e.preventDefault(); toggleGuide(false); return; }
  if(isGlobalShortcutTarget(e.target)) return;
  if(k === ' '){ e.preventDefault(); __clabGet('clab-btnRun').click(); }
  else if(k === 'r'){ startRide(); }
  else if(k === 'c'){ __clabGet('clab-btnCam').click(); }
  else if(k === 'x'){ __clabGet('clab-btnView').click(); }
  else if(k === 'p'){ snapshotView(); }
  else if(k === 'h' || k === '?'){ toggleGuide(); }
});

/* undo / redo */
function syncHistoryButtons(){
  const undo = __clabGet('clab-btnUndo'), redo = __clabGet('clab-btnRedo');
  if(undo) undo.disabled = hIdx <= 0 || sim.running;
  if(redo) redo.disabled = hIdx >= history.length - 1 || sim.running;
}

function applyHistory(idx){
  if(idx < 0 || idx >= history.length) return;
  hIdx = idx;
  design = normalizeDesign(JSON.parse(history[idx]));
  selIdx = -1;
  fullRebuild(); syncPointCard(); saveDesign(false);
}
rootEl.addEventListener('keydown', e => {
  if(!(e.ctrlKey || e.metaKey)) return;
  if(isTextEditingTarget(e.target)) return;
  const k = e.key.toLowerCase();
  if(k === 'z' && !e.shiftKey){ e.preventDefault(); applyHistory(hIdx - 1); }
  else if(k === 'y' || (k === 'z' && e.shiftKey)){ e.preventDefault(); applyHistory(hIdx + 1); }
});

__clabGet('clab-btnUndo').addEventListener('click', () => applyHistory(hIdx - 1));
__clabGet('clab-btnRedo').addEventListener('click', () => applyHistory(hIdx + 1));
/* accessible sidebar tabs */
const tabButtons = [...rootEl.querySelectorAll('#clab-tabs [role="tab"]')];
function activateTab(b){
  if(!b) return;
  if(b.dataset.tab !== 'report') stopTelemetryReplay();
  tabButtons.forEach(x => {
    const active = x === b;
    x.classList.toggle('on', active);
    x.setAttribute('aria-selected', String(active));
    x.tabIndex = active ? 0 : -1;
  });
  for(const name of ['build', 'cert', 'report', 'missions']){
    __clabGet('clab-tab-' + name).hidden = name !== b.dataset.tab;
  }
  if(buildCoach) buildCoach.hidden = b.dataset.tab !== 'build' || sim.running || selIdx >= 0;
  safetyGroup.visible = b.dataset.tab === 'build' && !sim.running;
  if(b.dataset.tab === 'report' && lastTele && lastTele.trace.length > 5){
    requestAnimationFrame(() => drawTraces(lastTele));
  }
}
for(const b of tabButtons){
  b.addEventListener('click', () => activateTab(b));
  b.addEventListener('keydown', e => {
    let idx = tabButtons.indexOf(b);
    if(e.key === 'ArrowRight') idx = (idx + 1) % tabButtons.length;
    else if(e.key === 'ArrowLeft') idx = (idx - 1 + tabButtons.length) % tabButtons.length;
    else if(e.key === 'Home') idx = 0;
    else if(e.key === 'End') idx = tabButtons.length - 1;
    else return;
    e.preventDefault();
    const next = tabButtons[idx];
    next.focus();
    activateTab(next);
  });
}

/* ---------------- on-ride photo: snapped as the train hits the valley --- */
const PHOTO_W = 520, PHOTO_H = 330;
const PHOTO_LABEL = { A: 'the first crest', B: 'the valley', C: 'the loop apex', D: 'the marked turn' };
let photoTarget = null;
const photoCam = new THREE.PerspectiveCamera(46, PHOTO_W / PHOTO_H, 0.1, 1200);
function capturePhoto(tele, key){
  try{
    const mk = analysis && analysis[key || 'B'];
    if(!mk) return;
    if(!photoTarget){
      photoTarget = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H);
      photoTarget.texture.encoding = THREE.sRGBEncoding;
    }
    // pose the riders for this exact instant: a synchronous fastRun never runs
    // the render loop, so without this the crowd would be photographed stale
    updateRiders();
    const iB = mk.idx;
    // Frame the MIDDLE of the train, close enough that riders read — a trackside
    // camera, the way a real park shoots it.
    frameAt(sim.S - (TRAIN_CARS - 1) * CAR_GAP / 2, _p, _t, _u);
    photoCam.position.copy(track.pos[iB]).addScaledVector(track.side[iB], 10);
    photoCam.position.y = track.pos[iB].y + 2.6;
    photoCam.lookAt(_p.x, _p.y + 1.1, _p.z);
    renderer.setRenderTarget(photoTarget);
    renderer.render(scene, photoCam);
    const px = new Uint8Array(PHOTO_W * PHOTO_H * 4);
    renderer.readRenderTargetPixels(photoTarget, 0, 0, PHOTO_W, PHOTO_H, px);
    renderer.setRenderTarget(null);
    const cv = document.createElement('canvas');
    cv.width = PHOTO_W; cv.height = PHOTO_H + 46;
    const g = cv.getContext('2d');
    const img = g.createImageData(PHOTO_W, PHOTO_H);
    for(let y = 0; y < PHOTO_H; y++){
      img.data.set(px.subarray((PHOTO_H - 1 - y) * PHOTO_W * 4, (PHOTO_H - y) * PHOTO_W * 4), y * PHOTO_W * 4);
    }
    g.putImageData(img, 0, 0);
    const where = PHOTO_LABEL[key] || 'the valley';
    const shot = tele.markers && tele.markers[key];
    const gTxt = shot && Number.isFinite(shot.gV) ? `${shot.gV >= 0 ? '+' : ''}${shot.gV.toFixed(1)} g` : '';
    g.fillStyle = '#161f29'; g.fillRect(0, PHOTO_H, PHOTO_W, 46);
    g.fillStyle = '#f2a63c'; g.font = '700 15px Segoe UI, sans-serif';
    g.fillText('COASTERLAB · ' + where.toUpperCase(), 12, PHOTO_H + 28);
    g.fillStyle = '#9fb0c1'; g.font = '12px Consolas, monospace'; g.textAlign = 'right';
    g.fillText(`${(Math.abs(sim.v) * 3.6).toFixed(0)} km/h${gTxt ? ' · ' + gTxt : ''}`, PHOTO_W - 12, PHOTO_H + 28);
    const url = cv.toDataURL('image/jpeg', 0.82);
    tele.photos.push({ key, url, where, kmh: Math.round(Math.abs(sim.v) * 3.6), gV: shot ? shot.gV : null });
    if(key === 'B' || !tele.photo) tele.photo = url;   // the valley stays the headline shot
  }catch(_e){ /* photo is a bonus — never let it break a run */ }
}

/* ================= Ride & Solve: onboard fluency mode =================
   The train freezes at checkpoints; a quick physics problem about what's
   AHEAD appears (never about the frozen HUD values). Answer, resume, and
   the HUD then shows the real value you predicted. ==================== */
const ride = {
  active: false, stops: [], idx: 0, score: 0, streak: 0, bestStreak: 0, results: [],
  correct: 0, total: 0, times: [], qStart: 0, timerId: null, timerLen: 30,
  resumeId: null, burstId: null, current: null, prevCam: 'orbit', usedKeys: []
};
/* @clab-ridepick-start — pure question chooser (eval-sliced by the test suite)
   Pick a question the ride has not asked yet, so a four-stop ride covers four
   different ideas instead of the same one twice. Falls back to the whole pool
   once every idea has been used. */
function pickRideQuestion(pool, used){
  const cands = (Array.isArray(pool) ? pool : [pool]).filter(Boolean);
  if(!cands.length) return null;
  const seen = used || [];
  const fresh = cands.filter(c => !c.key || seen.indexOf(c.key) < 0);
  const from = fresh.length ? fresh : cands;
  return from[Math.floor(Math.random() * from.length)];
}
/* @clab-ridepick-end */
function clearRideQuestionTimer(){
  clearInterval(ride.timerId);
  ride.timerId = null;
  __clabResources.rideTimerId = null;
}
function clearRideResumeTimer(){
  clearTimeout(ride.resumeId);
  ride.resumeId = null;
  __clabResources.rideResumeId = null;
}
function clearRideBurstTimer(){
  clearTimeout(ride.burstId);
  ride.burstId = null;
  __clabResources.rideBurstId = null;
}
const rq = {
  box: __clabGet('clab-rideQ'), tag: __clabGet('clab-rqTag'),
  text: __clabGet('clab-rqText'), choices: __clabGet('clab-rqChoices'),
  viz: __clabGet('clab-rqViz'),
  numRow: __clabGet('clab-rqNumRow'), num: __clabGet('clab-rqNum'),
  unit: __clabGet('clab-rqUnit'), feed: __clabGet('clab-rqFeed'),
  score: __clabGet('clab-rqScore'), streak: __clabGet('clab-rqStreak'), delta: __clabGet('clab-rqDelta'),
  timer: __clabGet('clab-rqTimer'), fill: __clabGet('clab-rqTimerFill'), viewport: __clabGet('clab-viewport'),
  go: __clabGet('clab-rqGo'), end: __clabGet('clab-rideEnd'), endBody: __clabGet('clab-rideEndBody')
};

/* ---- Ride & Solve: topic + grade adaptation --------------------------------
   Checkpoint questions can pose arithmetic (add / subtract / multiply / divide /
   mixed) instead of physics, tuned to a grade band. Physics stays the default
   (conceptual "explore" or formula "engineer"); the math topics ask about the
   SAME checkpoint element — the drop you're about to take, this train's cars,
   your speed right now — as plain arithmetic on the real numbers. The grade band
   is 'auto' (from the host app's grade level, via the bridge) or a manual
   override; it scales any invented operand and picks tap-choices vs typing. */
let rideTopic = (() => { try { return localStorage.getItem('coaster_lab_ride_topic') || 'physics'; } catch(_e){ return 'physics'; } })();
let rideGradeSel = (() => { try { return localStorage.getItem('coaster_lab_ride_grade') || 'auto'; } catch(_e){ return 'auto'; } })();
function rideBand(){
  if(rideGradeSel === 'k2' || rideGradeSel === 'g35' || rideGradeSel === 'g68' || rideGradeSel === 'g912') return rideGradeSel;
  const b = __clabBridge && __clabBridge.gradeBand;
  return (b === 'k2' || b === 'g35' || b === 'g68' || b === 'g912') ? b : 'g68';
}
/* @clab-mathgen-start — pure question generator (eval-sliced by the test suite) */
function _ri(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function _bandCfg(band){
  // choices = youngest riders answer by tapping; partner = range for any invented
  // second operand (seats per car, laps, speed boost) layered onto real numbers.
  switch(band){
    case 'k2':  return { choices: true,  timer: 26, partner: [1, 5] };
    case 'g35': return { choices: false, timer: 24, partner: [2, 12] };
    case 'g68': return { choices: false, timer: 22, partner: [2, 20] };
    default:    return { choices: false, timer: 22, partner: [5, 40] }; // g912
  }
}
function _mathChoices(ans){
  // three friendly numeric options for the youngest riders (incl. the answer)
  const opts = new Set([ans]);
  let guard = 0;
  while(opts.size < 3 && guard++ < 30){ const d = ans + _ri(-3, 3); if(d >= 0) opts.add(d); }
  let bump = 1;
  while(opts.size < 3){ opts.add(ans + bump++); }
  const arr = Array.from(opts).sort(() => Math.random() - 0.5);
  return { choices: arr.map(n => [String(n), String(n)]), correct: String(ans) };
}
const _MATH_OP_NAME = { '+': 'addition', '−': 'subtraction', '×': 'multiplication', '÷': 'division' };
// _mathViz — a small bar / area model of the PROBLEM (a and b), with a "?" where
// the answer goes, so the picture shows the structure without giving it away. A
// second, visual way to read every math question (UDL). Pure: returns an SVG
// string sized to a 300x88 viewBox; the card scales it to fit. Decorative
// (aria-hidden) — the question text + explanation carry the same facts for SR.
function _mathViz(op, a, b, ans){
  const W = 300, H = 88, pad = 12, maxW = 220;
  const INK = '#e8eef4', T = '#9fb0c1', BLUE = '#3f8fd2', AMBER = '#f2a63c', GREEN = '#59c98d', RED = '#e5484d', LINE = '#31465e';
  const txt = (x, y, s, col, size, anchor, cls) => '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + ' fill="' + (col || T) + '" font-size="' + (size || 11) + '" font-weight="700" font-family="Segoe UI,system-ui,sans-serif" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  const box = (x, y, w, h, fill, stroke) => '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + h + '" rx="3" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.5"' : '') + '/>';
  const vline = (x, y1, y2, col, op2) => '<line x1="' + x.toFixed(1) + '" y1="' + y1 + '" x2="' + x.toFixed(1) + '" y2="' + y2 + '" stroke="' + col + '"' + (op2 ? ' stroke-opacity="' + op2 + '"' : '') + '/>';
  const bx = pad + 6, by = 34, bh = 26;
  let body = '';
  if(op === '×'){
    // area / array: width shows a, height shows b, centre "?" = the product
    const gw = Math.min(maxW * 0.72, 168), gh = 46, gx = pad + 20, gy = 20;
    body += box(gx, gy, gw, gh, 'rgba(63,143,210,.16)', BLUE);
    if(a <= 12 && b <= 12){
      for(let i = 1; i < a; i++) body += vline(gx + gw * i / a, gy, gy + gh, BLUE, '.4');
      for(let j = 1; j < b; j++) body += '<line x1="' + gx + '" y1="' + (gy + gh * j / b).toFixed(1) + '" x2="' + (gx + gw) + '" y2="' + (gy + gh * j / b).toFixed(1) + '" stroke="' + BLUE + '" stroke-opacity=".4"/>';
    }
    body += txt(gx + gw / 2, gy - 5, String(a), AMBER, 12);
    body += '<text x="' + (gx - 7) + '" y="' + (gy + gh / 2 + 4) + '" fill="' + AMBER + '" font-size="12" font-weight="700" text-anchor="middle" transform="rotate(-90 ' + (gx - 7) + ' ' + (gy + gh / 2 + 4) + ')">' + b + '</text>';
    body += txt(gx + gw + 20, gy + gh / 2 + 5, '=', GREEN, 16);
    body += txt(gx + gw + 40, gy + gh / 2 + 5, '?', GREEN, 16, 'middle', 'clab-ans');
  } else if(op === '÷'){
    // total bar split into b groups; one group marked "?" = per group
    const bw = Math.min(maxW, 216), seg = Math.min(b, 16);
    body += box(bx, by, bw, bh, 'rgba(63,143,210,.14)', LINE);
    for(let i = 1; i < seg; i++) body += vline(bx + bw * i / seg, by, by + bh, LINE);
    body += box(bx, by, bw / seg, bh, 'rgba(89,201,141,.32)', GREEN);
    body += txt(bx + bw / (seg * 2), by + bh / 2 + 4, '?', GREEN, 12, 'middle', 'clab-ans');
    body += txt(bx + bw / 2, by - 7, String(a), T, 11);
    body += txt(bx + bw / 2, by + bh + 15, '← ' + b + ' equal groups →', T, 10);
  } else if(op === '−'){
    // whole bar a; the removed part b hatched at the end; remainder marked "?"
    const bw = Math.min(maxW, 216), remW = bw * Math.max(0, ans) / Math.max(a, 1), takeW = bw * b / Math.max(a, 1);
    body += box(bx, by, remW, bh, 'rgba(89,201,141,.34)', GREEN);
    body += box(bx + remW, by, takeW, bh, 'rgba(229,72,77,.16)', RED);
    body += txt(bx + remW / 2, by + bh / 2 + 4, '?', INK, 13, 'middle', 'clab-ans');
    if(takeW > 20) body += txt(bx + remW + takeW / 2, by + bh / 2 + 4, '−' + b, '#f0a8aa', 11);
    body += txt(bx + bw / 2, by - 7, String(a) + ' total', T, 10);
  } else {
    // addition: bar a (blue) + bar b (amber), total under a brace = "?"
    const bw = Math.min(maxW, 216), aw = bw * a / Math.max(a + b, 1), bwd = bw * b / Math.max(a + b, 1);
    body += box(bx, by, aw, bh, 'rgba(63,143,210,.4)', BLUE);
    body += box(bx + aw, by, bwd, bh, 'rgba(242,166,60,.4)', AMBER);
    if(aw > 18) body += txt(bx + aw / 2, by + bh / 2 + 4, String(a), INK, 11);
    if(bwd > 18) body += txt(bx + aw + bwd / 2, by + bh / 2 + 4, String(b), INK, 11);
    body += '<path d="M' + bx + ' ' + (by + bh + 5) + ' V' + (by + bh + 9) + ' H' + (bx + bw) + ' V' + (by + bh + 5) + '" fill="none" stroke="' + T + '"/>';
    body += txt(bx + bw / 2, by + bh + 22, '?', GREEN, 13, 'middle', 'clab-ans');
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
}
// genElementMath — arithmetic GROUNDED in the real coaster element at this
// checkpoint. `f` carries whole-number facts read from the live sim + track
// analysis (crest / valley / live height, live speed, this checkpoint's own
// feature + radius, car count), so the numbers the student computes describe the
// ride they are actually on — the drop they are about to take, THIS loop's size,
// their speed right now. It's the same physics moment as the "engineer" question,
// posed as plain arithmetic instead of a formula.
// Dynamism: many candidate templates per operation, each with randomized invented
// operands (seats, laps, boost) and feature-specific questions that differ from
// checkpoint to checkpoint; `avoid` (a key, or the list of keys this ride has
// already used) is filtered out so one ride asks a different question at every
// checkpoint. Every result is a non-negative integer and the arithmetic is exact.
function genElementMath(topic, band, f, avoid){
  f = f || {};
  const cfg = _bandCfg(band);
  const rp = () => _ri(cfg.partner[0], cfg.partner[1]);
  const has = v => (typeof v === 'number' && isFinite(v) && v >= 0);
  const cars = (has(f.cars) && f.cars > 0) ? f.cars : 3;
  const feat = f.feat || 'hill';       // crest | valley | loop | turn | hill
  const hereR = has(f.hereR) ? f.hereR : null;  // this checkpoint's curve radius
  // a whole-number way to split `total` into equal parts, so division stays exact
  const splitOf = (total, lo, hi) => {
    const ok = [];
    for(let n = lo; n <= hi; n++) if(total >= n && total % n === 0) ok.push(n);
    return ok.length ? ok[_ri(0, ok.length - 1)] : null;
  };
  const cand = [];
  const add = (key, op, a, b, ans, text, unit) => cand.push({ key, op, a, b, ans, text, unit });
  const wantSub = topic === 'subtraction' || topic === 'arithmetic';
  const wantAdd = topic === 'addition' || topic === 'arithmetic';
  const wantMul = topic === 'multiplication' || topic === 'arithmetic';
  // sharing is fair game in the mixed topic too, but not for the youngest riders
  const wantDiv = topic === 'division' || (topic === 'arithmetic' && band !== 'k2');
  if(wantSub){
    if(has(f.crestH) && has(f.valleyH) && f.crestH > f.valleyH)
      add('sub-drop', '−', f.crestH, f.valleyH, f.crestH - f.valleyH,
        'You\'re cresting at <b>' + f.crestH + ' m</b> and the valley below sits at <b>' + f.valleyH + ' m</b>. How many metres will you drop?', 'm');
    if(has(f.liveH) && has(f.valleyH) && f.liveH > f.valleyH)
      add('sub-here', '−', f.liveH, f.valleyH, f.liveH - f.valleyH,
        'Right now at this ' + feat + ' you\'re <b>' + f.liveH + ' m</b> up and the valley ahead is <b>' + f.valleyH + ' m</b>. How many more metres will you fall?', 'm');
    if(has(f.loopH) && has(f.crestH) && f.crestH > f.loopH)
      add('sub-loop', '−', f.crestH, f.loopH, f.crestH - f.loopH,
        'The loop tops out at <b>' + f.loopH + ' m</b>, below the first crest of <b>' + f.crestH + ' m</b>. How much lower is the loop?', 'm');
    if(has(f.trackLen) && has(f.liveS) && f.trackLen > f.liveS)
      add('sub-left', '−', f.trackLen, f.liveS, f.trackLen - f.liveS,
        'This circuit is <b>' + f.trackLen + ' m</b> of track and you have covered <b>' + f.liveS + ' m</b>. How many metres are left in the lap?', 'm');
    const seats = rp(), cap = cars * seats, boarded = _ri(0, cap);
    add('sub-seats', '−', cap, boarded, cap - boarded,
      'The train\'s <b>' + cars + '</b> cars each seat <b>' + seats + '</b> (<b>' + cap + '</b> seats). Only <b>' + boarded + '</b> riders boarded. How many empty seats?', 'seats');
  }
  if(wantAdd){
    if(has(f.liveV)){ const boost = rp(); add('add-speed', '+', f.liveV, boost, f.liveV + boost,
      'You\'re moving <b>' + f.liveV + ' m/s</b> and this drop will add about <b>' + boost + ' m/s</b>. How fast at the bottom?', 'm/s'); }
    if(has(f.crestH)){ const climb = rp(); add('add-climb', '+', f.crestH, climb, f.crestH + climb,
      'This crest is <b>' + f.crestH + ' m</b> high. The next hill climbs <b>' + climb + ' m</b> higher. How tall is that next crest?', 'm'); }
    if(has(f.turnH)){ const rise = rp(); add('add-turn', '+', f.turnH, rise, f.turnH + rise,
      'The banked turn sits at <b>' + f.turnH + ' m</b>. A new hill after it climbs <b>' + rise + ' m</b> more. How high is that?', 'm'); }
    if(has(f.crestH) && has(f.loopH))
      add('add-tops', '+', f.crestH, f.loopH, f.crestH + f.loopH,
        'The first crest is <b>' + f.crestH + ' m</b> up and the loop tops out at <b>' + f.loopH + ' m</b>. Stack those two heights: how tall together?', 'm');
    if(has(f.trackLen)){ const spur = rp() * 10; add('add-track', '+', f.trackLen, spur, f.trackLen + spur,
      'The circuit is <b>' + f.trackLen + ' m</b> long and the park wants to add a <b>' + spur + ' m</b> extension. How much track then?', 'm'); }
  }
  if(wantMul){
    const seats = rp(); add('mul-cap', '×', cars, seats, cars * seats,
      'This train has <b>' + cars + '</b> cars with <b>' + seats + '</b> seats each. How many riders can it carry?', 'riders');
    const laps = rp(), capL = cars * _ri(2, 5); add('mul-laps', '×', capL, laps, capL * laps,
      'Each full ride carries <b>' + capL + '</b> riders and the coaster runs <b>' + laps + '</b> rides tonight. How many riders in all?', 'riders');
    if(hereR) add('mul-diam', '×', hereR, 2, hereR * 2,
      'This ' + feat + ' curves with a <b>' + hereR + ' m</b> radius. How wide is it right across (2 × radius)?', 'm');
    if(has(f.trackLen)){ const laps = _ri(2, 6); add('mul-lap', '×', f.trackLen, laps, f.trackLen * laps,
      'One lap of this circuit is <b>' + f.trackLen + ' m</b>. How far does the train travel in <b>' + laps + '</b> laps?', 'm'); }
  }
  if(wantDiv){
    const seats = rp(), cap = cars * seats; add('div-seats', '÷', cap, cars, seats,
      'The train\'s <b>' + cap + '</b> seats are spread evenly over its <b>' + cars + '</b> cars. How many seats per car?', 'seats');
    const per = rp(), lines = _ri(2, Math.max(2, Math.min(9, cfg.partner[1]))), tot = per * lines;
    add('div-lines', '÷', tot, lines, per,
      '<b>' + tot + '</b> riders wait in <b>' + lines + '</b> equal lines for the coaster. How many riders per line?', 'riders');
    // exact splits of the REAL numbers on this track
    if(has(f.crestH) && has(f.valleyH) && f.crestH > f.valleyH){
      const drop = f.crestH - f.valleyH, n = splitOf(drop, 2, 9);
      if(n) add('div-drop', '÷', drop, n, drop / n,
        'This drop falls <b>' + drop + ' m</b> (from ' + f.crestH + ' m down to ' + f.valleyH + ' m) and is marked with <b>' + n + '</b> equally spaced height flags. How many metres apart?', 'm');
    }
    if(has(f.trackLen)){
      const n = splitOf(f.trackLen, 2, 8);
      if(n) add('div-track', '÷', f.trackLen, n, f.trackLen / n,
        'The <b>' + f.trackLen + ' m</b> circuit is split into <b>' + n + '</b> equal safety blocks. How long is each block?', 'm');
    }
  }
  // drop templates this ride has already used, as long as something else remains
  const skip = avoid == null ? [] : (Array.isArray(avoid) ? avoid : [avoid]);
  let pool = cand;
  if(skip.length && cand.length > 1){ const filt = cand.filter(c => skip.indexOf(c.key) < 0); if(filt.length) pool = filt; }
  // pick a grounded candidate; if none fit (e.g. a flat track has no drop) fall
  // back to the always-available capacity question so a ride never stalls
  let p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if(!p){ const seats = rp(); p = { key: 'mul-cap', op: '×', a: cars, b: seats, ans: cars * seats,
    text: 'This train has <b>' + cars + '</b> cars with <b>' + seats + '</b> seats each. How many riders can it carry?', unit: 'riders' }; }
  const q = {
    text: p.text, unit: p.unit, answer: p.ans, tolAbs: 0.4, key: p.key,
    explain: p.a.toLocaleString() + ' ' + p.op + ' ' + p.b.toLocaleString() + ' = ' + p.ans.toLocaleString() + '.',
    tag: (f.tag ? '🔢 ' + f.tag : '🔢 Checkpoint · ride math'),
    timerLen: cfg.timer, mathOp: _MATH_OP_NAME[p.op] || 'addition',
    vizSvg: _mathViz(p.op, p.a, p.b, p.ans)  // bar / area model of the problem (UDL)
  };
  if(cfg.choices){ const c = _mathChoices(p.ans); q.choices = c.choices; q.correct = c.correct; delete q.unit; }
  return q;
}
/* @clab-mathgen-end */
// Read the whole-number facts of the checkpoint the train is frozen at, so the
// math questions describe the real ride. Impure (reads analysis/cars/track).
function _coasterFacts(live, stop){
  const a = analysis || {};
  const R = v => (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.round(v)) : null;
  // Which feature is this checkpoint about? Read it from the stop tag so the
  // question can use THIS element's own radius (loop/turn) — different checkpoints
  // ask about different real numbers within one ride.
  const tag = (stop && stop.tag) ? stop.tag : 'Checkpoint';
  let feat = 'hill', hereR = null;
  if(/valley/i.test(tag)) feat = 'valley';
  else if(/inversion|loop/i.test(tag)){ feat = 'loop'; hereR = a.C ? R(a.C.r) : null; }
  else if(/turn/i.test(tag)){ feat = 'turn'; hereR = a.D ? R(a.D.r) : null; }
  else if(/crest/i.test(tag)) feat = 'crest';
  return {
    crestH: a.A ? R(a.A.h) : null,
    valleyH: a.B ? R(a.B.h) : null,
    loopH: a.C ? R(a.C.h) : null,
    turnH: a.D ? R(a.D.h) : null,
    liveH: R(live && live.h),
    liveV: R(live && live.v),
    liveS: R(live && live.s),
    cars: (typeof cars !== 'undefined' && cars) ? cars.length : 3,
    trackLen: (typeof track !== 'undefined' && track) ? Math.round(track.L) : null,
    feat: feat, hereR: hereR,
    tag: tag
  };
}

/* ---- Ride & Solve: AI "any topic" questions --------------------------------
   With the 🤖 topic, the teacher types a subject and the host app's Gemini
   bridge writes grade-tuned multiple-choice questions about it. Network calls
   can't block a checkpoint, so a batch is pre-fetched into a buffer and served
   as the train freezes; if the buffer is empty (still loading, or AI is off) the
   checkpoint falls back to a math question so the ride never stalls. */
let rideAiSubject = (() => { try { return localStorage.getItem('coaster_lab_ride_ai_subject') || ''; } catch(_e){ return ''; } })();
/* @clab-aiqueue-start */
const aiQ = { buffer: [], loading: false, subject: '', band: '', requestId: 0 };
function aiAvailable(){ return !!(__clabBridge && typeof __clabBridge.ai === 'function'); }
function resetAiQuestionBuffer(){
  aiQ.buffer = [];
  aiQ.requestId++;
  aiQ.loading = false;
  aiQ.subject = '';
  aiQ.band = '';
}
/* @clab-aiparse-start — pure AI-response parser (eval-sliced by the test suite) */
function _escapeRideHtml(value){
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => entities[ch]);
}
function _parseAiQuestions(text, subject){
  let arr;
  try {
    const s = String(text || '');
    const a = s.indexOf('['), b = s.lastIndexOf(']');
    if(a < 0 || b <= a) return [];
    arr = JSON.parse(s.slice(a, b + 1));
  } catch(_e){ return []; }
  if(!Array.isArray(arr)) return [];
  const out = [];
  for(const o of arr){
    if(!o || typeof o.q !== 'string' || !Array.isArray(o.choices)) continue;
    const choices = o.choices.map(c => String(c).trim()).filter(Boolean).slice(0, 4)
      .map(c => _escapeRideHtml(c.slice(0, 100)));
    if(choices.length < 2) continue;
    let ci = Number(o.answer);
    if(!Number.isInteger(ci) || ci < 0 || ci >= choices.length) ci = 0;
    out.push({
      text: _escapeRideHtml(String(o.q).trim().slice(0, 240)),
      choices: choices.map((c, i) => [String(i), c]),
      correct: String(ci),
      explain: _escapeRideHtml(String(o.explain || '').trim().slice(0, 240)) || 'Good thinking!',
      tag: '🤖 ' + (subject ? String(subject).slice(0, 30) : 'Quiz'),
      timerLen: 30
    });
  }
  return out;
}
/* @clab-aiparse-end */
function fetchAiQuestions(subject, band, cb){
  const ai = __clabBridge && __clabBridge.ai;
  if(!ai || !subject){ if(cb) cb(0); return; }
  if(aiQ.loading && aiQ.subject === subject && aiQ.band === band){ if(cb) cb(0); return; }
  const requestId = ++aiQ.requestId;
  aiQ.loading = true;
  aiQ.subject = subject; aiQ.band = band;
  const gradeName = { k2: 'grades K-2', g35: 'grades 3-5', g68: 'grades 6-8', g912: 'grades 9-12' }[band] || 'middle school';
  const prompt =
    'You are writing quick multiple-choice quiz questions for students riding a virtual roller coaster in a classroom app. ' +
    'Topic: "' + subject + '". Audience: ' + gradeName + '. ' +
    'Return ONLY a JSON array of 6 questions, with no prose and no code fences. ' +
    'Each item must be {"q": "the question, one sentence, 20 words or fewer", "choices": ["opt1","opt2","opt3","opt4"], ' +
    '"answer": the 0-based index of the correct choice, "explain": "one short sentence saying why"}. ' +
    'Make them age-appropriate, factually correct, and self-contained (no images). Vary which index is correct. No em dashes.';
  ai(prompt, (err, text) => {
    if(requestId !== aiQ.requestId || __clabDead) return;
    aiQ.loading = false;
    if(err){ if(cb) cb(0); return; }
    const qs = _parseAiQuestions(text, subject);
    if(qs.length) aiQ.buffer = aiQ.buffer.concat(qs);
    if(cb) cb(qs.length);
  });
}
/* @clab-aiqueue-end */

// All Ride & Solve lexical state must be initialized before these controls
// read saved selections and attach their event handlers.
initRideControls();

/* Ride & Solve checkpoints.
   Every stop returns a POOL of questions rather than one, and each carries a
   `key` so a single ride can pick a different idea at every checkpoint (and a
   repeat ride can pick different ones again). Engineer questions are numeric,
   Explore questions are qualitative multiple choice, and both pools are built
   from the student's own track and their live state at the freeze — the
   question is always about what is AHEAD, because the HUD already shows now. */
function buildRideStops(){
  const a = analysis;
  if(!a || !a.B) return [];
  const stops = [];
  const eng = level === 'engineer';
  const g2 = x => fmt(x, 1);
  const vAt = (live, h) => Math.sqrt(Math.max(0, live.v ** 2 + 2 * G0 * (live.h - h)));

  /* L: just past the LSM launch — only exists on launched designs */
  if(a.L && a.L.s + 2.5 < a.A.s - 8){
    stops.push({ s: a.L.s + 2.5, tag: 'Checkpoint · launch', make: live => eng
      ? [
        { key: 'lsm-crest', text: `The launch is done — you're at <b>${g2(live.v)} m/s</b>, h = ${g2(live.h)} m.
             The first crest ahead is at h = ${g2(a.A.h)} m. How fast will you cross it?`,
          unit: 'm/s', answer: vAt(live, a.A.h), tolRel: 0.07,
          explain: 'Climbing spends speed: v = √(v₀² − 2gΔh).' },
        { key: 'lsm-hmax', text: `Nothing is pushing you now (<b>${g2(live.v)} m/s</b> at h = ${g2(live.h)} m).
             How high could this train coast before it ran out of speed?`,
          unit: 'm', answer: live.h + live.v ** 2 / (2 * G0), tolRel: 0.07,
          explain: 'All kinetic turns into potential: h_max = h + v²/2g.' },
        { key: 'lsm-work', text: `The launch pushed at <b>${g2(a.L.a)} m/s²</b> over about ${g2(a.L.len)} m.
             Ignoring the climb, what top speed would that alone give from a standstill?`,
          unit: 'm/s', answer: Math.sqrt(2 * a.L.a * a.L.len), tolRel: 0.08,
          explain: 'v² = 2ad, straight from the work-energy theorem.' }
      ]
      : [
        { key: 'lsm-x-push', text: 'The launch motor is behind you now. What keeps the train going?',
          choices: [['energy', 'The energy it already has'], ['motor', 'The motor keeps pushing'], ['air', 'The air pushes it along']],
          correct: 'energy', explain: 'After the launch it is gravity and the energy bank, nothing else.' },
        { key: 'lsm-x-climb', text: 'Climbing towards the first crest, the speedometer will…',
          choices: [['drop', 'Drop'], ['grow', 'Grow'], ['same', 'Stay the same']], correct: 'drop',
          explain: 'Going up trades speed for height.' }
      ] });
  }

  /* A: the lift crest, looking down at the deepest valley */
  stops.push({ s: a.A.s + 1.5, tag: 'Checkpoint · crest', make: live => eng
    ? [
      { key: 'crest-vB', text: `You're cresting at <b>h = ${g2(live.h)} m</b> moving <b>${g2(live.v)} m/s</b>.
           The lowest valley ahead is at h = ${g2(a.B.h)} m. How fast will you be there?`,
        unit: 'm/s', answer: vAt(live, a.B.h), tolRel: 0.07,
        explain: 'v = √(v₀² + 2gΔh) — watch the speedometer at the valley!' },
      { key: 'crest-gB', text: `You're at <b>h = ${g2(live.h)} m</b> moving <b>${g2(live.v)} m/s</b>.
           The valley ahead: h = ${g2(a.B.h)} m, radius of curvature ${g2(a.B.r)} m.
           How many g will press you into the seat down there?`,
        unit: 'g', answer: 1 + vAt(live, a.B.h) ** 2 / (G0 * a.B.r), tolAbs: 0.4,
        explain: 'Speed from energy, then n = 1 + v²/(gr) — watch the seat-g meter!' },
      { key: 'crest-gain', text: `You're doing <b>${g2(live.v)} m/s</b> at h = ${g2(live.h)} m and the valley
           ahead is at h = ${g2(a.B.h)} m. How much SPEED does the drop add?`,
        unit: 'm/s', answer: Math.max(0, vAt(live, a.B.h) - live.v), tolAbs: 1.1,
        explain: 'Find v at the bottom with v = √(v₀² + 2gΔh), then subtract the speed you have now.' },
      { key: 'crest-ke', text: `Take the valley ahead (h = ${g2(a.B.h)} m) as the floor. Right now you're
           <b>${g2(live.h)} m</b> up doing <b>${g2(live.v)} m/s</b>. What percentage of your energy is
           kinetic (the blue bar)?`,
        unit: '%', answer: 100 * live.v ** 2 / Math.max(1e-6, live.v ** 2 + 2 * G0 * (live.h - a.B.h)),
        tolAbs: 7, timerLen: 34,
        explain: 'KE ÷ (KE + PE) = v² ÷ (v² + 2gΔh) — the mass cancels out.' },
      { key: 'crest-hmax', text: `From here (<b>${g2(live.v)} m/s</b> at h = ${g2(live.h)} m), how HIGH
           could this train coast before it stalled?`,
        unit: 'm', answer: live.h + live.v ** 2 / (2 * G0), tolRel: 0.07,
        explain: 'All kinetic → potential: h_max = h + v²/2g.' }
    ]
    : [
      { key: 'crest-x-fast', text: 'The big valley is coming up. Compared to right now, down there you\'ll be moving…',
        choices: [['faster', 'Faster'], ['slower', 'Slower'], ['same', 'The same']], correct: 'faster',
        explain: 'Falling turns height into speed — watch the speedometer!' },
      { key: 'crest-x-mass', text: 'A heavier train runs this same track under ideal conditions. At the valley it would be moving…',
        choices: [['same', 'Exactly as fast'], ['faster', 'Faster'], ['slower', 'Slower']], correct: 'same',
        explain: 'Mass cancels: ½mv² = mgh, so every train reaches the same speed.' },
      { key: 'crest-x-bar', text: 'On the way down, the blue KINETIC part of the energy bar will…',
        choices: [['grow', 'Grow'], ['shrink', 'Shrink'], ['same', 'Not change']], correct: 'grow',
        explain: 'Height (purple) turns into motion (blue). The total stays put.' },
      { key: 'crest-x-seat', text: 'At the bottom of the drop, the seat will push you…',
        choices: [['harder', 'Harder than normal'], ['less', 'Less than normal'], ['same', 'Exactly as now']],
        correct: 'harder', explain: 'Curving upward needs extra force, so the seat pushes above 1 g.' }
    ] });

  if(a.C){
    /* B: the valley, looking up at the inversion */
    stops.push({ s: a.B.s + 1.5, tag: 'Checkpoint · valley', make: live => eng
      ? [
        { key: 'loop-vmin', text: `The inversion is ahead — apex radius <b>r = ${g2(a.C.r)} m</b>.
             What's the slowest speed at the top that still presses you into your seat?`,
          unit: 'm/s', answer: Math.sqrt(G0 * a.C.r), tolRel: 0.07,
          explain: 'Weightless limit — gravity alone bends the path: v = √(gr). Slower than that and you hang in the restraint, while the upstop wheels hold the train on.' },
        { key: 'loop-vtop', text: `The inversion tops out at <b>h = ${g2(a.C.h)} m</b>. From here
             (${g2(live.v)} m/s at h = ${g2(live.h)} m), how fast will you actually be up there?`,
          unit: 'm/s', answer: vAt(live, a.C.h), tolRel: 0.07,
          explain: 'Energy again: v = √(v₀² − 2gΔh) — check it at the top!' },
        { key: 'loop-gtop', text: `Upside down at the apex (h = ${g2(a.C.h)} m, r = ${g2(a.C.r)} m), from
             ${g2(live.v)} m/s at h = ${g2(live.h)} m — how many g will the seat press with up there?`,
          unit: 'g', answer: Math.max(0, vAt(live, a.C.h) ** 2 / (G0 * a.C.r) - 1), tolAbs: 0.4, timerLen: 34,
          explain: 'Inverted, gravity helps turn you: n = v²/(gr) − 1.' },
        { key: 'loop-margin', text: `Apex radius <b>${g2(a.C.r)} m</b>, apex height ${g2(a.C.h)} m, and you're at
             ${g2(live.v)} m/s / h = ${g2(live.h)} m. How much FASTER than the bare minimum will you cross the top?`,
          unit: 'm/s', answer: Math.max(0, vAt(live, a.C.h) - Math.sqrt(G0 * a.C.r)), tolAbs: 1.2, timerLen: 34,
          explain: 'Your actual apex speed minus √(gr) — that gap is the safety margin.' }
      ]
      : [
        { key: 'loop-x-light', text: 'Upside-down at the very top, you\'ll feel…',
          choices: [['heavy', 'Extra heavy'], ['light', 'Light — almost floating'], ['same', 'Normal']], correct: 'light',
          explain: 'Near the weightless limit the seat barely pushes — watch the seat-g meter!' },
        { key: 'loop-x-slow', text: 'Where on the loop will the train be moving slowest?',
          choices: [['top', 'At the very top'], ['bottom', 'At the bottom'], ['side', 'Halfway up the side']],
          correct: 'top', explain: 'The top is the highest point, so the most speed has been traded for height.' },
        { key: 'loop-x-hold', text: 'What keeps the train on the rail at the top of a loop?',
          choices: [['circle', 'It needs a downward pull to keep curving, and gravity supplies it'],
                    ['nothing', 'Nothing — it is weightless up there'],
                    ['strap', 'Only the shoulder restraints']],
          correct: 'circle', explain: 'Going in a circle needs a force toward the centre. At the top, that is downward — gravity.' }
      ] });

    /* C: past the inversion, looking at the flagged turn */
    stops.push({ s: a.C.s + 1.5, tag: 'Checkpoint · inversion', make: live => eng && a.D
      ? [
        { key: 'turn-bank', text: `Turn <b>D</b> ahead: radius ${g2(a.D.r)} m at h = ${g2(a.D.h)} m.
             You're at h = ${g2(live.h)} m doing ${g2(live.v)} m/s.
             What bank angle would make that turn feel level?`,
          unit: 'deg', answer: Math.atan(vAt(live, a.D.h) ** 2 / (G0 * a.D.r)) * 180 / Math.PI,
          tolAbs: 6, timerLen: 34,
          explain: 'Speed there from energy, then tan θ = v²/(gr).' },
        { key: 'turn-vD', text: `Turn <b>D</b> ahead at h = ${g2(a.D.h)} m. From here
             (${g2(live.v)} m/s at h = ${g2(live.h)} m), how fast will you hit it?`,
          unit: 'm/s', answer: vAt(live, a.D.h), tolRel: 0.07,
          explain: 'Pure energy bookkeeping: v = √(v₀² + 2gΔh).' },
        { key: 'turn-lat', text: `Suppose turn <b>D</b> (radius ${g2(a.D.r)} m, h = ${g2(a.D.h)} m) were built
             dead flat. From ${g2(live.v)} m/s at h = ${g2(live.h)} m, how many g SIDEWAYS would riders feel?`,
          unit: 'g', answer: vAt(live, a.D.h) ** 2 / (G0 * a.D.r), tolAbs: 0.35, timerLen: 34,
          explain: 'Unbanked, the whole turn is lateral: n = v²/(gr). That is why turns get banked.' },
        { key: 'turn-accel', text: `Turn <b>D</b>: radius ${g2(a.D.r)} m at h = ${g2(a.D.h)} m, and you're at
             ${g2(live.v)} m/s / h = ${g2(live.h)} m. What centripetal acceleration does that turn need?`,
          unit: 'm/s²', answer: vAt(live, a.D.h) ** 2 / a.D.r, tolRel: 0.09, timerLen: 34,
          explain: 'a = v²/r — the acceleration that bends the path, in m/s² not g.' }
      ]
      : [
        { key: 'inv-x-ke', text: 'Heading back down the other side, your kinetic energy…',
          choices: [['grows', 'Grows — the blue bar swells'], ['shrinks', 'Shrinks'], ['same', 'Stays the same']],
          correct: 'grows', explain: 'Height turns back into speed on the way down.' },
        { key: 'inv-x-bank', text: 'Why do engineers bank the turns?',
          choices: [['seat', 'So the seat pushes riders toward the middle of the turn instead of sideways'],
                    ['fast', 'To make the train go faster'], ['track', 'To use less track']],
          correct: 'seat', explain: 'Tilting the track turns an uncomfortable sideways push into a push through the seat.' },
        { key: 'inv-x-tight', text: 'A tighter turn taken at the same speed needs…',
          choices: [['more', 'More bank'], ['less', 'Less bank'], ['same', 'The same bank']],
          correct: 'more', explain: 'tan θ = v²/(gr): a smaller radius means a bigger angle.' }
      ] });
  } else {
    /* no inversion: the valley stop asks about coasting and the turn ahead */
    stops.push({ s: a.B.s + 1.5, tag: 'Checkpoint · valley', make: live => eng
      ? [
        { key: 'val-hmax', text: `From here (<b>${g2(live.v)} m/s</b> at h = ${g2(live.h)} m):
             how HIGH could this train coast before stalling?`,
          unit: 'm', answer: live.h + live.v ** 2 / (2 * G0), tolRel: 0.07,
          explain: 'All kinetic → potential: h_max = h + v²/2g.' },
        { key: 'val-half', text: `You're doing <b>${g2(live.v)} m/s</b> at h = ${g2(live.h)} m. At what height
             will you have dropped to HALF this speed?`,
          unit: 'm', answer: live.h + 0.75 * live.v ** 2 / (2 * G0), tolRel: 0.08, timerLen: 34,
          explain: 'Half the speed keeps a quarter of the kinetic energy, so three quarters of it becomes height.' },
        ...(a.D ? [{ key: 'val-vD', text: `The marked turn ahead sits at h = ${g2(a.D.h)} m. From here
             (${g2(live.v)} m/s at h = ${g2(live.h)} m), how fast will you enter it?`,
          unit: 'm/s', answer: vAt(live, a.D.h), tolRel: 0.07,
          explain: 'v = √(v₀² + 2gΔh) — energy is the whole story.' }] : [])
      ]
      : [
        { key: 'val-x-slow', text: 'Climbing the next hill, your speed will…',
          choices: [['grow', 'Grow'], ['drop', 'Drop'], ['same', 'Stay the same']], correct: 'drop',
          explain: 'Climbing trades speed for height.' },
        { key: 'val-x-pe', text: 'Climbing the next hill, the purple POTENTIAL part of the energy bar…',
          choices: [['grows', 'Grows'], ['shrinks', 'Shrinks'], ['same', 'Stays put']], correct: 'grows',
          explain: 'Height is stored energy — the purple bar fills as you climb.' },
        { key: 'val-x-stall', text: 'If the next hill were TALLER than the first crest, the train would…',
          choices: [['stall', 'Stall part way up and roll back'], ['over', 'Just make it over'], ['faster', 'Speed up to get over']],
          correct: 'stall', explain: 'You can never coast higher than you started. That is the whole energy budget.' }
      ] });
  }

  if(a.D){
    /* if the flagged turn comes before the big valley, brakes are far away —
       ask about the drop instead so the question's premise stays true */
    const lateTurn = a.D.s > a.B.s;
    stops.push({ s: a.D.s + 1.5, tag: 'Checkpoint · the turn', make: live => eng
      ? (lateTurn ? [
        { key: 'brk-a', text: `Brake run ahead: it takes you from <b>${g2(live.v)} m/s</b> down to 3 m/s
             over about 45 m. What average deceleration is that?`,
          unit: 'm/s²', answer: Math.max(0, (live.v ** 2 - 9) / (2 * 45)), tolRel: 0.09,
          explain: 'v² = v₀² − 2ad → a = (v₀² − 9)/(2·45).' },
        { key: 'brk-d', text: `If the brakes ahead pull a steady <b>6 m/s²</b>, what distance do they need
             to take you from <b>${g2(live.v)} m/s</b> down to 3 m/s?`,
          unit: 'm', answer: Math.max(0, (live.v ** 2 - 9) / 12), tolRel: 0.09,
          explain: 'v² = v₀² − 2ad → d = (v₀² − 9)/(2·6).' },
        { key: 'brk-t', text: `The brakes ahead pull a steady <b>6 m/s²</b>. How many seconds to go from
             <b>${g2(live.v)} m/s</b> down to 3 m/s?`,
          unit: 's', answer: Math.max(0, (live.v - 3) / 6), tolRel: 0.09,
          explain: 'Steady deceleration: t = (v₀ − v)/a.' },
        { key: 'brk-pct', text: `You're doing <b>${g2(live.v)} m/s</b> and the brakes have to get you to 3 m/s.
             What percentage of your kinetic energy do they have to soak up as heat?`,
          unit: '%', answer: Math.max(0, 100 * (1 - 9 / Math.max(live.v ** 2, 1e-6))), tolAbs: 7, timerLen: 34,
          explain: 'KE goes as v², so the fraction left is 3²/v² — the rest becomes heat.' }
      ] : [
        { key: 'd-vB', text: `The big drop ahead bottoms out at <b>h = ${g2(a.B.h)} m</b>. From here
             (${g2(live.v)} m/s at h = ${g2(live.h)} m), how fast at the bottom?`,
          unit: 'm/s', answer: vAt(live, a.B.h), tolRel: 0.07,
          explain: 'v = √(v₀² + 2gΔh) — check the speedometer at the bottom!' },
        { key: 'd-gB', text: `The drop ahead bottoms out at h = ${g2(a.B.h)} m with radius ${g2(a.B.r)} m.
             From ${g2(live.v)} m/s at h = ${g2(live.h)} m, how many g into the seat down there?`,
          unit: 'g', answer: 1 + vAt(live, a.B.h) ** 2 / (G0 * a.B.r), tolAbs: 0.4, timerLen: 34,
          explain: 'Speed from energy, then n = 1 + v²/(gr).' }
      ])
      : (lateTurn ? [
        { key: 'brk-x-heat', text: 'The brakes ahead will slow the train. Where does its energy of motion go?',
          choices: [['heat', 'Into heat in the brakes'], ['height', 'Into height'], ['gone', 'It just disappears']],
          correct: 'heat', explain: 'Energy never disappears — brakes turn motion into heat.' },
        { key: 'brk-x-sq', text: 'If the train arrived at the brakes twice as fast, they would need…',
          choices: [['four', 'About four times the distance'], ['two', 'About twice the distance'], ['same', 'The same distance']],
          correct: 'four', explain: 'Stopping distance goes as v², so doubling the speed quadruples it.' }
      ] : [
        { key: 'd-x-fast', text: 'The big drop is next. At the bottom you\'ll be moving…',
          choices: [['faster', 'Faster than now'], ['slower', 'Slower'], ['same', 'The same']],
          correct: 'faster', explain: 'Height turns into speed on the way down.' },
        { key: 'd-x-bar', text: 'Watch the energy bar on the way down. The purple POTENTIAL part will…',
          choices: [['shrink', 'Shrink'], ['grow', 'Grow'], ['same', 'Stay the same']], correct: 'shrink',
          explain: 'Height is being spent to buy speed.' }
      ]) });
  }
  return stops.filter(st => st.s > 4 && st.s < track.L - STOP_AT - 2).sort((p, q) => p.s - q.s);
}

function startRide(){
  if(sim.running) return;
  if(!analysis || !analysis.B){
    banner('The track needs a lift crest and a valley first.', 'fail', 2800);
    return;
  }
  ride.stops = buildRideStops();
  if(!ride.stops.length){ banner('No checkpoints found on this layout.', 'fail', 2600); return; }
  // Top up the AI question buffer for this ride (async; the fallback covers any
  // checkpoint that arrives before the batch lands).
  if(rideTopic === 'ai' && aiAvailable() && rideAiSubject && aiQ.buffer.length < 2){
    fetchAiQuestions(rideAiSubject, rideBand());
  }
  ride.active = true; ride.idx = 0; ride.score = 0; ride.streak = 0; ride.bestStreak = 0; ride.usedKeys = [];
  ride.correct = 0; ride.total = 0; ride.times = []; ride.results = [];
  ride.prevCam = camMode;
  camMode = 'onboard';
  __clabGet('clab-btnCam').textContent = 'Camera: Onboard';
  rq.end.hidden = true;
  startRun(false);
  sim.ride = true;
  const _rideMsg = rideTopic === 'ai'
    ? (rideAiSubject ? ('Ride & Solve — quick ' + rideAiSubject + ' questions. Buckle up!') : 'Type a topic in the top bar for AI questions. Using math for now — buckle up!')
    : 'Ride & Solve — quick questions at the checkpoints. Buckle up!';
  banner(_rideMsg, '', 3000);
}
function pauseForQuestion(){
  sim.paused = true;
  clearRideResumeTimer();
  clearRideBurstTimer();
  rq.box.querySelectorAll('.clab-spark').forEach(p => p.remove());
  const stop = ride.stops[ride.idx];
  const tr = trackAt(sim.S);
  // Physics keeps the live, track-derived question; any other topic swaps in a
  // grade-tuned math problem at the same checkpoint (the freeze choreography is
  // unchanged — only the question content differs).
  const liveState = { v: Math.abs(sim.v), h: tr.y, s: sim.S };
  // 'mix' alternates the two kinds of thinking across one ride: the physics of
  // the element you are riding, then the arithmetic of the same element.
  const asPhysics = rideTopic === 'physics' || (rideTopic === 'mix' && ride.idx % 2 === 0);
  if(asPhysics){
    ride.current = pickRideQuestion(stop.make(liveState), ride.usedKeys);
    ride.timerLen = (ride.current && ride.current.timerLen) || (level === 'engineer' ? 32 : 18);
  } else if(rideTopic === 'ai'){
    // serve a pre-fetched AI question; if the buffer is empty (still loading or
    // AI unavailable), keep the ride moving with a grounded math question
    if(aiQ.buffer.length){
      ride.current = aiQ.buffer.shift();
    } else {
      ride.current = genElementMath('arithmetic', rideBand(), _coasterFacts(liveState, stop), ride.usedKeys);
    }
    ride.timerLen = ride.current.timerLen || 26;
  } else {
    const mathTopic = rideTopic === 'mix' ? 'arithmetic' : rideTopic;
    ride.current = genElementMath(mathTopic, rideBand(), _coasterFacts(liveState, stop), ride.usedKeys);
    ride.timerLen = ride.current.timerLen || 24;
  }
  if(!ride.current){
    // no question could be built for this checkpoint — skip it rather than freeze
    ride.idx++;
    sim.paused = false;
    return;
  }
  if(ride.current.key) ride.usedKeys.push(ride.current.key);
  ride.total++;
  ride.qStart = performance.now();
  rq.tag.textContent = (ride.current && ride.current.tag) || stop.tag;
  rq.text.innerHTML = ride.current.text;
  // bar / area model of the problem — only the math topics carry one
  if(rq.viz){
    if(ride.current.vizSvg){ rq.viz.innerHTML = ride.current.vizSvg; rq.viz.classList.add('on'); }
    else { rq.viz.innerHTML = ''; rq.viz.classList.remove('on'); }
  }
  rq.feed.textContent = '';
  rq.box.classList.remove('is-correct', 'is-wrong');
  rq.viewport.classList.add('ride-question-open');
  rq.timer.classList.remove('urgent', 'critical', 'done', 'failed');
  rq.numRow.classList.remove('correct', 'wrong');
  rq.score.textContent = `${ride.score} pts`;
  rq.streak.hidden = ride.streak < 2;
  rq.streak.textContent = ride.streak > 1 ? `⚡ ${ride.streak} streak` : '';
  rq.delta.classList.remove('on'); rq.delta.textContent = '';
  rq.num.disabled = false;
  rq.go.disabled = false;
  let focusTarget = null;
  if(ride.current.choices){
    rq.numRow.hidden = true;
    rq.choices.hidden = false;
    rq.choices.innerHTML = ride.current.choices
      .map(([v, label], i) => `<button data-v="${v}" data-key="${String.fromCharCode(65 + i)}">${label}</button>`).join('');
    for(const b of rq.choices.querySelectorAll('button')){
      b.addEventListener('click', () => submitRideAnswer(b.dataset.v, false));
    }
    focusTarget = rq.choices.querySelector('button');
  } else {
    rq.choices.hidden = true;
    rq.choices.innerHTML = '';
    rq.numRow.hidden = false;
    rq.num.value = '';
    rq.unit.textContent = ride.current.unit || '';
    focusTarget = rq.num;
  }
  rq.fill.style.width = '100%';
  rq.timer.setAttribute('aria-valuenow', '100');
  rq.timer.setAttribute('aria-valuetext', `${ride.timerLen} seconds remaining`);
  rq.box.hidden = false;
  setTimeout(() => {
    if(ride.current && focusTarget && focusTarget.isConnected) focusTarget.focus();
  }, 60);
  blip(660, 0.1); blip(880, 0.14);
  clearRideQuestionTimer();
  ride.timerId = setInterval(() => {
    const left = 1 - (performance.now() - ride.qStart) / (ride.timerLen * 1000);
    const pct = Math.max(0, left * 100);
    rq.fill.style.width = pct + '%';
    rq.timer.setAttribute('aria-valuenow', String(Math.round(pct)));
    rq.timer.setAttribute('aria-valuetext', `${Math.max(0, Math.ceil(left * ride.timerLen))} seconds remaining`);
    rq.timer.classList.toggle('urgent', pct <= 25 && pct > 10);
    rq.timer.classList.toggle('critical', pct <= 10);
    if(left <= 0) submitRideAnswer(null, false);
  }, 100);
  __clabResources.rideTimerId = ride.timerId;
}
function spawnAnswerBurst(anchor){
  if(reducedMotion()) return;
  const host = rq.box; if(!host) return;
  const hostRect = host.getBoundingClientRect();
  const anchorRect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  const originX = anchorRect ? anchorRect.left + anchorRect.width / 2 - hostRect.left : hostRect.width / 2;
  const originY = anchorRect ? anchorRect.top + anchorRect.height / 2 - hostRect.top : hostRect.height * 0.42;
  const colors = ['#f2a63c', '#59c98d', '#3f8fd2', '#c05fa0'];
  for(let i = 0; i < 12; i++){
    const p = document.createElement('span');
    p.className = 'clab-spark ' + (i % 3 === 1 ? 'diamond' : (i % 3 === 2 ? 'streak' : 'dot'));
    p.setAttribute('aria-hidden', 'true');
    p.style.setProperty('--sz', (5 + i % 4) + 'px');
    p.style.setProperty('--delay', (i % 4 * 18) + 'ms');
    const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 46;
    p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(ang) * dist - 20).toFixed(1) + 'px');
    p.style.background = colors[i % colors.length];
    p.style.left = (originX - 3.5).toFixed(1) + 'px';
    p.style.top = (originY - 3.5).toFixed(1) + 'px';
    host.appendChild(p);
    setTimeout(() => { try{ p.remove(); }catch(_e){} }, 920);
  }
}
function submitRideAnswer(val, instant){
  if(!ride.current) return;
  clearRideQuestionTimer();
  clearRideResumeTimer();
  clearRideBurstTimer();
  const answerIdx = ride.idx;
  const q = ride.current;
  const dt = (performance.now() - ride.qStart) / 1000;
  ride.times.push(Math.min(dt, ride.timerLen));
  let ok = false;
  if(q.choices){
    ok = val === q.correct;
  } else if(val != null){
    const x = parseFloat(val);
    ok = isFinite(x) && (q.tolAbs != null
      ? Math.abs(x - q.answer) <= q.tolAbs
      : Math.abs(x - q.answer) / Math.max(Math.abs(q.answer), 1e-6) <= (q.tolRel || 0.07));
  }
  const shown = q.choices ? '' : ` It's ${fmt(q.answer, 1)} ${q.unit}.`;
  const scoreBefore = ride.score;
  rq.choices.querySelectorAll('button').forEach(b => {
    const picked = val != null && b.dataset.v === String(val);
    const correct = q.choices && b.dataset.v === q.correct;
    b.classList.toggle('picked', picked);
    b.classList.toggle('correct', !!correct);
    b.classList.toggle('wrong', picked && !correct);
    b.disabled = true;
  });
  rq.num.disabled = true;
  rq.go.disabled = true;
  rq.timer.setAttribute('aria-valuetext', val == null ? 'Time expired' : 'Question answered');
  rq.timer.classList.remove('urgent', 'critical');
  rq.timer.classList.add(ok ? 'done' : 'failed');
  rq.box.classList.add(ok ? 'is-correct' : 'is-wrong');
  rq.numRow.classList.add(ok ? 'correct' : 'wrong');
  ride.results.push(ok);
  if(ok){
    const timeFrac = Math.max(0, 1 - dt / ride.timerLen);
    ride.score += Math.round((60 + 40 * timeFrac) * (1 + 0.2 * Math.min(ride.streak, 5)));
    ride.streak++; ride.correct++;
    ride.bestStreak = Math.max(ride.bestStreak, ride.streak);
    rq.feed.innerHTML = `<b class="ok">✓</b> ${q.explain}`;
    blip(1047, 0.16, 0.12);
    // payoff: flip the diagram's "?" to the real number, then a spark burst
    if(rq.viz && q.answer != null){
      const _ansEl = rq.viz.querySelector('.clab-ans');
      if(_ansEl){
        _ansEl.textContent = q.answer.toLocaleString();
        _ansEl.classList.add('reveal');
        if(!reducedMotion() && !instant){
          ride.burstId = setTimeout(() => {
            ride.burstId = null;
            __clabResources.rideBurstId = null;
            if(ride.active && _ansEl.isConnected) spawnAnswerBurst(_ansEl);
          }, 170);
          __clabResources.rideBurstId = ride.burstId;
        }
      }
    }
  } else {
    ride.streak = 0;
    rq.feed.innerHTML = `<b class="no">✗</b>${val == null ? ' Time!' : ''}${shown} ${q.explain}`;
    blip(196, 0.25, 0.1);
  }
  rq.score.textContent = `${ride.score} pts`;
  rq.streak.hidden = ride.streak < 2;
  rq.streak.textContent = ride.streak > 1 ? `⚡ ${ride.streak} streak` : '';
  const gained = ride.score - scoreBefore;
  if(gained > 0){
    rq.delta.textContent = `+${gained}`;
    rq.delta.classList.remove('on'); void rq.delta.offsetWidth; rq.delta.classList.add('on');
  }
  ride.current = null;
  const resume = () => {
    ride.resumeId = null;
    __clabResources.rideResumeId = null;
    if(!ride.active || ride.idx !== answerIdx) return;
    rq.box.hidden = true;
    rq.viewport.classList.remove('ride-question-open');
    ride.idx++;
    sim.paused = false;
  };
  if(instant) resume();
  else {
    ride.resumeId = setTimeout(resume, ok ? 1300 : 2600);
    __clabResources.rideResumeId = ride.resumeId;
  }
}
function cleanupRide(showEnd){
  clearRideQuestionTimer();
  clearRideResumeTimer();
  clearRideBurstTimer();
  ride.current = null;
  rq.box.querySelectorAll('.clab-spark').forEach(p => p.remove());
  rq.box.hidden = true;
  rq.viewport.classList.remove('ride-question-open');
  sim.paused = false;
  sim.ride = false;
  if(!ride.active) return;
  ride.active = false;
  camMode = ride.prevCam;
  __clabGet('clab-btnCam').textContent =
    'Camera: ' + { orbit: 'Orbit', onboard: 'Onboard', chase: 'Chase' }[camMode];
  if(showEnd){
    const avgT = ride.times.length ? ride.times.reduce((p, c) => p + c, 0) / ride.times.length : 0;
    let best = 0;
    try{ best = +localStorage.getItem('coaster_lab_ride_best') || 0; }catch(_e){}
    const record = ride.score > best;
    if(record){ try{ localStorage.setItem('coaster_lab_ride_best', String(ride.score)); }catch(_e){} }
    const accuracy = ride.total ? Math.round(ride.correct / ride.total * 100) : 0;
    const checkpoints = ride.results.map((ok, i) => `<i class="${ok ? 'ok' : 'no'}" title="Checkpoint ${i + 1}: ${ok ? 'correct' : 'incorrect'}">${ok ? '✓' : '×'}</i>`).join('');
    rq.endBody.innerHTML = `
      <div class="ride-result-grid">
        <div class="ride-accuracy" style="--pct:${accuracy}"><span>${accuracy}%<small>accuracy</small></span></div>
        <div>
          <p class="big">${ride.score} pts${record ? ' · new best!' : ''}</p>
          <p class="exline">${ride.correct}/${ride.total} correct · best streak ${ride.bestStreak}</p>
          <p class="exline">average answer time ${fmt(avgT, 1)} s${best && !record ? ` · best score ${best}` : ''}</p>
          <div class="ride-checkpoints" aria-label="Checkpoint results">${checkpoints}</div>
        </div>
      </div>`;
    rq.end.hidden = false;
    setTimeout(() => { const b = __clabGet('clab-btnRideAgain'); if(b) b.focus(); }, 0);
    if(ride.correct === ride.total && ride.total > 0){ jingle(true); spawnFireworks(); }
    missionEvent('ride', { correct: ride.correct, total: ride.total, avgT });
    bridgeReport({ event: 'ride', correct: ride.correct, total: ride.total, score: ride.score });
  }
}
__clabGet('clab-btnRide').addEventListener('click', startRide);

/* student summary — plain text for email / doc / LMS */
/* Everything a teacher would want to see about one student's coaster, gathered
   once and rendered two ways: as text to paste, and as a card to hand in. */
function rideCardFacts(){
  const get = k => { try{ return localStorage.getItem(k); }catch(_e){ return null; } };
  const spec = lastTele ? restraintSpec(lastTele) : null;
  const seats = spec && spec.seats;
  return {
    date: new Date().toLocaleDateString(),
    nodes: design.points.length,
    prop: design.propulsion.mode === 'launch' ? 'LSM launch' : 'chain lift',
    length: track ? Math.round(track.L) : 0,
    crest: analysis && analysis.A ? analysis.A.h : null,
    inverts: !!(analysis && analysis.C),
    seed: lastGeneratedSeed,
    done: MISSIONS.filter(m => missionsDone[m.id]).map(m => m.name),
    total: MISSIONS.length,
    certDate: get('coaster_lab_certified'),
    best: get('coaster_lab_ride_best'),
    tele: lastTele,
    spec, seats
  };
}
/* The ride card: one PNG a student can hand in and a teacher can read at a
   glance — the photo, the vitals, and the safety verdict the run earned. */
function buildRideCard(cb){
  const W = 900, H = 560, PAD = 24;
  const C = { bg: '#0f151c', panel: '#161f29', line: '#26364a', ink: '#e8eef4', ink2: '#9fb0c1', ink3: '#66788a', accent: '#f2a63c', good: '#59c98d' };
  const f = rideCardFacts();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const PHOTO_X = PAD, PHOTO_Y = 84, PHOTO_CW = 420, PHOTO_CH = 304;

  const text = (s, x, y, col, font, align) => {
    g.fillStyle = col; g.font = font; g.textAlign = align || 'left';
    g.fillText(s, x, y);
  };
  const wrap = (s, x, y, maxW, lh, col, font) => {
    g.fillStyle = col; g.font = font; g.textAlign = 'left';
    let line = '', yy = y;
    for(const word of String(s).split(' ')){
      const test = line ? line + ' ' + word : word;
      if(g.measureText(test).width > maxW && line){ g.fillText(line, x, yy); yy += lh; line = word; }
      else line = test;
    }
    if(line) g.fillText(line, x, yy);
    return yy + lh;
  };

  function draw(img){
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    // the photo goes down FIRST — the background above would paint straight over it
    if(img){
      const s = Math.min(PHOTO_CW / img.width, PHOTO_CH / img.height);
      g.drawImage(img, PHOTO_X, PHOTO_Y, img.width * s, img.height * s);
    } else {
      g.fillStyle = C.panel; g.fillRect(PHOTO_X, PHOTO_Y, PHOTO_CW, PHOTO_CH);
      g.strokeStyle = C.line; g.strokeRect(PHOTO_X + 0.5, PHOTO_Y + 0.5, PHOTO_CW - 1, PHOTO_CH - 1);
      text('No ride photo yet', PHOTO_X + PHOTO_CW / 2, PHOTO_Y + PHOTO_CH / 2, C.ink3, '14px Segoe UI, sans-serif', 'center');
    }
    text('COASTER', PAD, 46, C.ink, '700 26px Segoe UI, sans-serif');
    text('LAB', PAD + g.measureText('COASTER').width, 46, C.accent, '700 26px Segoe UI, sans-serif');
    text('RIDE CARD', PAD + 168, 46, C.ink3, '600 13px Segoe UI, sans-serif');
    text(f.date, W - PAD, 46, C.ink3, '13px Consolas, monospace', 'right');
    g.strokeStyle = C.line; g.lineWidth = 1;
    g.beginPath(); g.moveTo(PAD, 60); g.lineTo(W - PAD, 60); g.stroke();

    // vitals column
    const RX = PHOTO_X + PHOTO_CW + 28;
    let ry = 108;
    const t = f.tele;
    const rows = [
      ['Track', `${f.length} m · ${f.nodes} nodes`],
      ['Lift', `${f.crest != null ? fmt(f.crest, 1) + ' m · ' : ''}${f.prop}`],
      ['Inversions', f.inverts ? 'yes' : 'none'],
      ['Top speed', t ? `${fmt(t.maxV * 3.6, 0)} km/h` : '—'],
      ['Seat g', t ? `${fmt(t.maxGV, 1)} max · ${fmt(t.minGV, 1)} min` : '—'],
      ['Airtime', t ? `${fmt(t.airtime, 1)} s` : '—'],
      ['Inspection', f.certDate ? 'CERTIFIED ' + f.certDate : 'not yet certified'],
      ['Ride & Solve', f.best ? f.best + ' best' : '—']
    ];
    if(f.seed) rows.push(['Generated', '#' + f.seed]);
    text('THE RIDE', RX, 88, C.ink3, '600 11px Segoe UI, sans-serif');
    for(const [k, v] of rows){
      text(k, RX, ry, C.ink3, '12px Segoe UI, sans-serif');
      text(v, W - PAD, ry, k === 'Inspection' && f.certDate ? C.good : C.ink, '600 13px Consolas, monospace', 'right');
      ry += 25;
    }

    // safety verdict — the part that took a whole session to earn
    const by = PHOTO_Y + PHOTO_CH + 24;
    g.fillStyle = C.panel; g.fillRect(PAD, by, W - PAD * 2, H - by - PAD);
    g.strokeStyle = C.line; g.strokeRect(PAD + 0.5, by + 0.5, W - PAD * 2 - 1, H - by - PAD - 1);
    text('RIDER SAFETY', PAD + 14, by + 24, C.ink3, '600 11px Segoe UI, sans-serif');
    if(f.spec){
      text(f.spec.name, PAD + 14, by + 48, C.accent, '700 17px Segoe UI, sans-serif');
      const b = f.spec.band;
      let ty = wrap(`${f.spec.why} Rides of this class typically post ${b.inLo}–${b.inHi} in (${b.cmLo}–${b.cmHi} cm) — the restraint's number, not the track's.`,
        PAD + 14, by + 72, W - PAD * 2 - 28, 18, C.ink2, '13px Segoe UI, sans-serif');
      if(f.seats && f.seats.n > 1){
        wrap(`Rows: front ${fmt(f.seats.rows[0].minGV, 2)} g, worst ${seatLabel(f.seats.worstIdx, f.seats.n).toLowerCase()} ${fmt(f.seats.worstMin, 2)} g.` +
          `  Missions ${f.done.length}/${f.total}.`, PAD + 14, ty + 2, W - PAD * 2 - 28, 18, C.ink2, '13px Segoe UI, sans-serif');
      }
    } else {
      wrap('No completed run yet — press Test run, then save the card again.', PAD + 14, by + 48, W - PAD * 2 - 28, 18, C.ink2, '13px Segoe UI, sans-serif');
    }
    text('Educational physics simulation — not a structural safety approval.', W - PAD - 14, H - PAD - 12, C.ink3, '11px Segoe UI, sans-serif', 'right');
    cb(cv.toDataURL('image/png'));
  }

  const url = f.tele && f.tele.photo;
  if(url){
    const img = new Image();
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = url;
  } else draw(null);
}
__clabGet('clab-btnRideCard').addEventListener('click', () => {
  buildRideCard(url => {
    try{
      const a = document.createElement('a');
      a.href = url; a.download = 'coaster_lab_ride_card.png';
      a.click();
      banner('Ride card saved — hand it in or drop it in a doc.', 'pass', 2800);
    }catch(_e){ banner('Could not save the card here.', 'fail', 2400); }
  });
});
__clabGet('clab-btnSummary').addEventListener('click', () => {
  const f = rideCardFacts();
  const doneList = f.done;
  const certDate = f.certDate;
  const best = f.best;
  const lines = [
    'COASTER LAB — student summary · ' + f.date,
    `Design: ${f.nodes} nodes · ${f.prop} · track ${f.length} m` +
      (f.inverts ? ' · has inversion' : '') + (f.seed ? ' · generated #' + f.seed : ''),
    `Missions: ${doneList.length}/${f.total}` + (doneList.length ? ' — ' + doneList.join(', ') : ''),
    `Inspection: ${certDate ? 'CERTIFIED (' + certDate + ')' : 'not yet certified'}`,
    `Best Ride & Solve score: ${best || '—'}`,
    lastTele ? `Last run: ${lastTele.status} · top ${fmt(lastTele.maxV * 3.6, 0)} km/h · max ${fmt(lastTele.maxGV, 1)} g` : 'Last run: none',
    f.spec ? `Restraint the forces demand: ${f.spec.name}` +
      (f.spec.holdKg > 0 ? ` (holds a ${f.spec.riderKg} kg rider with ~${f.spec.holdKg} kg of pull)` : '') +
      ` · rides like this typically post ${f.spec.band.inLo}-${f.spec.band.inHi} in` : null,
    (f.seats && f.seats.n > 1)
      ? `Rows: front ${fmt(f.seats.rows[0].minGV, 2)} g, worst ${seatLabel(f.seats.worstIdx, f.seats.n).toLowerCase()} ${fmt(f.seats.worstMin, 2)} g`
      : null
  ].filter(Boolean);
  const s = lines.join('\n');
  const done = () => banner('Summary copied — paste it anywhere.', 'pass', 2600);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(s).then(done, () => window.prompt('Copy your summary:', s));
  } else {
    window.prompt('Copy your summary:', s);
  }
});
__clabGet('clab-rqGo').addEventListener('click', () => submitRideAnswer(rq.num.value, false));
rq.num.addEventListener('keydown', e => { if(e.key === 'Enter') submitRideAnswer(rq.num.value, false); });
__clabGet('clab-btnRideAgain').addEventListener('click', () => { rq.end.hidden = true; startRide(); });
__clabGet('clab-btnRideClose').addEventListener('click', () => {
  rq.end.hidden = true;
  __clabGet('clab-btnRide').focus();
});

/* ---------------- fireworks (certification payoff) ---------------- */
const fxList = [];
function spawnFireworks(){
  if(reducedMotion()) return;
  const origin = station.position.clone().add(new THREE.Vector3(0, 12, 0));
  [0xf2a63c, 0x59c98d, 0x3f8fd2].forEach((col, b) => {
    const N = 90;
    const posArr = new Float32Array(N * 3);
    const vel = [];
    for(let i = 0; i < N; i++){
      posArr[i * 3] = origin.x + (b - 1) * 7;
      posArr[i * 3 + 1] = origin.y + b * 4;
      posArr[i * 3 + 2] = origin.z + (b - 1) * 5;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const sp = 6 + Math.random() * 7;
      vel.push(new THREE.Vector3(
        Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)
      ).multiplyScalar(sp));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({
      color: col, size: 0.55, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.visible = false;
    scene.add(pts);
    fxList.push({ pts, vel, t: 0, delay: b * 0.35 });
  });
}
function updateFx(dt){
  for(let i = fxList.length - 1; i >= 0; i--){
    const f = fxList[i];
    if(f.delay > 0){ f.delay -= dt; continue; }
    f.pts.visible = true;
    f.t += dt;
    const p = f.pts.geometry.attributes.position;
    for(let k = 0; k < f.vel.length; k++){
      f.vel[k].y -= 9.81 * dt * 0.55;
      p.array[k * 3] += f.vel[k].x * dt;
      p.array[k * 3 + 1] += f.vel[k].y * dt;
      p.array[k * 3 + 2] += f.vel[k].z * dt;
    }
    p.needsUpdate = true;
    f.pts.material.opacity = Math.max(0, 1 - f.t / 2.2);
    if(f.t > 2.2){
      scene.remove(f.pts);
      f.pts.geometry.dispose();
      f.pts.material.dispose();
      fxList.splice(i, 1);
    }
  }
}

/* ---------------- render loop ---------------- */
const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _u = new THREE.Vector3();
const _m = new THREE.Matrix4(), _side = new THREE.Vector3(), _chase = new THREE.Vector3(), cameraShakeSide = new THREE.Vector3();

function placeTrain(){
  for(let c = 0; c < cars.length; c++){
    const Sc = sim.S - c * CAR_GAP;
    frameAt(Sc, _p, _t, _u);
    _side.crossVectors(_u, _t).normalize();
    _m.makeBasis(_side, _u, _t).setPosition(
      _p.x + _u.x * 0.55, _p.y + _u.y * 0.55, _p.z + _u.z * 0.55);
    cars[c].matrixAutoUpdate = false;
    cars[c].matrix.copy(_m);
  }
}
function updatePhysicsVectors(){
  vectorGroup.visible = vectorsOn && !xrOn;
  if(!vectorGroup.visible || !track) return;
  frameAt(sim.S, vectorPos, vectorTan, vectorUp);
  const tr = trackAt(sim.S);
  const gV = tr.upY + sim.v * sim.v * tr.kUp / G0;
  const origin = vectorPos.addScaledVector(vectorUp, 2.0);
  vectorVelocity.position.copy(origin);
  vectorVelocity.setDirection(vectorTan);
  vectorVelocity.setLength(3.5 + Math.min(14, Math.abs(sim.v) * 0.38), 1.5, 0.8);
  vectorSeatDir.copy(vectorUp).multiplyScalar(gV < 0 ? -1 : 1).normalize();
  vectorSeat.position.copy(origin);
  vectorSeat.setDirection(vectorSeatDir);
  vectorSeat.setLength(3 + Math.min(12, Math.abs(gV) * 1.75), 1.5, 0.8);
  vectorGravity.position.copy(origin);
  vectorGravity.setDirection(vectorGravityDir);
  vectorGravity.setLength(6, 1.4, 0.75);
}
function updateStationVisuals(now){
  const phase = sim.running ? sim.t : -1;
  const active = phase < 0 ? 'red' : phase < 0.65 ? 'red' : phase < 1.3 ? 'amber' : 'green';
  for(const key of ['red', 'amber', 'green']){
    stationSignalMats[key].emissiveIntensity = key === active ? 1.8 : 0.1;
  }
  const gateOpen = sim.running && phase >= 1.3;
  const gateBlend = reducedMotion() ? 1 : 0.12;
  for(const gate of stationGates){
    const target = gateOpen ? gate.sign * Math.PI * 0.48 : 0;
    gate.pivot.rotation.y += (target - gate.pivot.rotation.y) * gateBlend;
  }
  const motionPulse = reducedMotion() ? 0 : Math.sin(now * 0.004) * 0.13;
  stationEdgeMat.opacity = (sim.running ? 0.78 : 0.62) + motionPulse;
  if(stationLamp){
    const base = visualTheme === 'daylight' ? 0.45 : 1.0;
    stationLamp.intensity = base + (sim.running && phase < 1.5 ? 0.35 : 0);
  }
}
const dispatchEl = __clabGet('clab-dispatch');
const dispatchValue = __clabGet('clab-dispatchValue');
function updateDispatchOverlay(){
  if(!dispatchEl || !sim.running || sim.t >= 2.25){
    if(dispatchEl) dispatchEl.hidden = true;
    return;
  }
  dispatchEl.hidden = false;
  const value = sim.t < 0.55 ? '3'
    : sim.t < 1.1 ? '2'
    : sim.t < 1.65 ? '1' : 'GO';
  dispatchValue.textContent = value;
}
function updateTrainPresentation(){
  const wheelSpin = sim.S * 3.4;
  for(const wheel of trainWheels) wheel.rotation.x = wheelSpin;
  const restraintTarget = sim.running ? 0.28 : -0.58;
  const blend = reducedMotion() ? 1 : 0.12;
  for(const restraint of restraintBars){
    restraint.rotation.x += (restraintTarget - restraint.rotation.x) * blend;
  }
  for(const harness of harnessRigs){
    harness.rotation.x += ((sim.running ? 0.1 : -0.5) - harness.rotation.x) * blend;
  }
  updateRiders();
}
/* Show the restraint the ride's own measured forces demand: a lap bar until the
   design earns a harness. The Report explains why; the train just shows it. */
function syncRestraintStyle(){
  const wantsHarness = !!(lastTele && restraintSpec(lastTele).key === 'harness');
  for(const h of harnessRigs) h.visible = wantsHarness;
  for(const b of restraintBars) b.visible = !wantsHarness;
}
/* Riders that answer to the physics. Each car reads ITS OWN seat force, so the
   row-by-row model is visible in the 3-D view and not only in the report: the
   back row's arms fly up over a lopsided crest while the front row is already
   being pressed back down into the seat. */
function updateRiders(){
  const show = !fxLite;
  for(const r of allRiders) if(r.visible !== show) r.visible = show;
  if(!show || !riderCars.length) return;
  // Posed whenever the train is actually moving through the track — which keeps
  // the pose held during a Ride & Solve freeze and while scrubbing the telemetry
  // replay, and relaxes it in the station.
  const still = reducedMotion() || !track || Math.abs(sim.v) < 0.5;
  const v2 = still ? 0 : trainSpeed2(trackAt(sim.S).y);
  for(let c = 0; c < riderCars.length; c++){
    let gV = 1, gLat = 0;
    if(!still){
      const trc = trackAt(sim.S - c * CAR_GAP);
      gV = trc.upY + v2 * trc.kUp / G0;
      gLat = trc.sideY + v2 * trc.kSide / G0;
    }
    const clamp01 = (x, hi) => Math.max(0, Math.min(hi, x));
    const lift = clamp01((0.35 - gV) * 0.10, 0.13);          // out of the seat
    const press = clamp01((gV - 1.6) * 0.020, 0.05);         // squashed into it
    const armUp = clamp01((0.75 - gV) * 1.5, 2.3);           // hands up!
    const lean = Math.max(-0.24, Math.min(0.24, -gLat * 0.17));
    for(const r of riderCars[c]){
      r.g.position.y = r.baseY + lift - press;
      r.g.rotation.z = lean;
      r.arms[0].rotation.x = -armUp;
      r.arms[1].rotation.x = -armUp;
    }
  }
}
function updateSpeedStreaks(){
  const v = Math.abs(sim.v);
  const enabled = sim.running && !sim.paused && v > 9 && (camMode === 'onboard' || camMode === 'chase') && !fxLite && !xrOn && !reducedMotion();
  speedStreaks.visible = enabled;
  if(!enabled) return;
  frameAt(sim.S + 2.5, streakPos, streakTan, streakUp);
  streakSide.crossVectors(streakUp, streakTan).normalize();
  const length = 1.8 + Math.min(9, (v - 9) * 0.28);
  for(let i = 0; i < SPEED_STREAK_COUNT; i++){
    const seed = speedStreakSeed[i];
    const phase = (seed.phase + sim.S * 0.028) % 1;
    const forward = 4 + phase * 28;
    const side = Math.cos(seed.angle) * seed.radius;
    const up = Math.sin(seed.angle) * seed.radius * 0.72 + 1.0;
    streakHead.copy(streakPos).addScaledVector(streakTan, forward)
      .addScaledVector(streakSide, side).addScaledVector(streakUp, up);
    streakTail.copy(streakHead).addScaledVector(streakTan, -length);
    const j = i * 6;
    speedStreakPositions[j] = streakHead.x; speedStreakPositions[j + 1] = streakHead.y; speedStreakPositions[j + 2] = streakHead.z;
    speedStreakPositions[j + 3] = streakTail.x; speedStreakPositions[j + 4] = streakTail.y; speedStreakPositions[j + 5] = streakTail.z;
  }
  speedStreakGeo.attributes.position.needsUpdate = true;
  speedStreakMat.opacity = Math.min(0.72, 0.18 + (v - 9) * 0.025);
}
function updateParkAtmosphere(dt){
  if(fxLite || reducedMotion()) return;
  const step = Math.min(dt, 0.05);
  ferrisRotor.rotation.z += step * 0.035;
  cloudGroup.rotation.y += step * 0.0025;
  birdFlock.rotation.y += step * 0.018;
  const now = performance.now() * 0.002;
  stationFlags.forEach((flag, i) => { flag.rotation.z = Math.sin(now + i * 0.63) * 0.08; });
}
function placeCamera(){
  if(camMode === 'onboard'){
    // The front row rides on the nose. Any other row sits back at its own seat
    // and a little higher, so it looks OVER the car ahead instead of into the
    // back of it — the cars are 2 m long in a 2.6 m gap.
    const camSeat = activeSeat();
    frameAt(sim.S + (camSeat ? -0.2 : 1.4) - camSeat * CAR_GAP, _p, _t, _u);
    camera.position.copy(_p).addScaledVector(_u, camSeat ? 1.78 : 1.25).addScaledVector(_t, 0.2);
    if(sim.running && !sim.paused && !reducedMotion()){
      const live = trackAt(sim.S), force = Math.abs(live.upY + sim.v * sim.v * live.kUp / G0 - 1);
      const shake = Math.min(0.12, Math.abs(sim.v) * 0.0018 + force * 0.012);
      cameraShakeSide.crossVectors(_u, _t).normalize();
      camera.position.addScaledVector(cameraShakeSide, Math.sin(sim.t * 17) * shake).addScaledVector(_u, Math.sin(sim.t * 23) * shake * 0.45);
    }
    camera.up.copy(_u);
    const look = _p.clone().addScaledVector(_t, 12).addScaledVector(_u, 1.2);
    camera.lookAt(look);
  } else if(camMode === 'chase'){
    frameAt(sim.S - 2, _p, _t, _u);
    const th = Math.atan2(_t.x, _t.z);
    _chase.set(_p.x - Math.sin(th) * 13, _p.y + 5.5, _p.z - Math.cos(th) * 13);
    camera.position.lerp(_chase, 0.09);
    camera.up.set(0, 1, 0);
    camera.lookAt(_p.x, _p.y + 1, _p.z);
  } else {
    applyOrbit();
  }
  /* speed widens the onboard field of view — cheap, honest sense of pace */
  const wantFov = camMode === 'onboard' ? 66 + Math.min(12, Math.abs(sim.v) * 0.3)
                : camMode === 'chase' ? 62 : 55;
  if(Math.abs(camera.fov - wantFov) > 0.05){
    camera.fov += (wantFov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
  }
}

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
     canvas.height !== Math.floor(h * renderer.getPixelRatio())){
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
}

/* ---------------- WebXR: ride the coaster in a headset ---------------- */
const xrRig = new THREE.Group();
scene.add(xrRig);
let xrOn = false;
if(navigator.xr && navigator.xr.isSessionSupported){
  navigator.xr.isSessionSupported('immersive-vr').then(ok => {
    if(!ok || __clabDead) return;
    const vrButton = __clabGet('clab-btnVR');
    if(vrButton) vrButton.hidden = false;
  }).catch(() => {});
}
__clabGet('clab-btnVR').addEventListener('click', async () => {
  try{
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor']
    });
    if(__clabDead){
      if(typeof session.end === 'function') __clabIgnoreRejection(session.end());
      return;
    }
    __clabResources.xrSession = session;
    renderer.xr.enabled = true;
    await renderer.xr.setSession(session);
    if(__clabDead) return;
    xrOn = true;
    xrRig.add(camera);
    if(!sim.running) startRun(false);
    session.addEventListener('end', () => {
      if(__clabResources.xrSession === session) __clabResources.xrSession = null;
      xrOn = false;
      renderer.xr.enabled = false;
      xrRig.remove(camera);
      if(sim.running){ stopRun(); cleanupRide(false); }
    });
  }catch(e){
    if(!__clabDead) banner('Could not start VR: ' + (e && e.message || e), 'fail', 3200);
  }
});
const _xrM = new THREE.Matrix4(), _xrSide = new THREE.Vector3();
function placeXrRig(){
  frameAt(sim.S + 0.6, _p, _t, _u);
  _xrSide.crossVectors(_u, _t).normalize();
  _xrM.makeBasis(_xrSide, _u, _t);
  xrRig.quaternion.setFromRotationMatrix(_xrM);
  xrRig.position.copy(_p).addScaledVector(_u, 0.6);
  /* run continuously while presenting: relaunch shortly after each lap */
  if(!sim.running && sim.done){
    if(!placeXrRig.wait){ placeXrRig.wait = performance.now(); }
    else if(performance.now() - placeXrRig.wait > 3000){
      placeXrRig.wait = 0;
      startRun(false);
    }
  } else placeXrRig.wait = 0;
}

let lastT = performance.now();
let fpsAcc = 0, fpsN = 0, fpsSuggested = false;
function animate(){
  if(!rootEl.isConnected){ __clabDestroy(); return; }
  const now = performance.now();
  updateTelemetryReplay(now);
  const dt = (now - lastT) / 1000;
  lastT = now;
  /* gentle nudge toward FX Lite on struggling machines (once per session) */
  if(!fpsSuggested && !fxLite && !xrOn && dt > 0 && dt < 1){
    fpsAcc += dt; fpsN++;
    if(fpsAcc > 5){
      if(fpsN / fpsAcc < 22){
        fpsSuggested = true;
        banner('Running slow? Try FX: Lite in the top bar.', '', 4200);
      }
      fpsAcc = 0; fpsN = 0;
    }
  }
  resize();
  if(sim.running && !sim.paused) stepSim(dt);
  if(!userTouched && !sim.running && camMode === 'orbit' && !reducedMotion()){
    orbit.theta += dt * 0.04;   // gentle showcase drift until first interaction
  }
  sectionGroup.visible = !fxLite && !sim.running && camMode === 'orbit';
  handleGroup.visible = !sim.running && camMode === 'orbit';
  placeTrain();
  updateTrainPresentation();
  updateStationVisuals(now);
  updateDispatchOverlay();
  updateSpeedStreaks();
  updateParkAtmosphere(dt);
  if(handleGroup.visible && selIdx >= 0 && handleGroup.children[selIdx]){
    const pulse = reducedMotion() ? 1.45 : 1.45 + Math.sin(now * 0.0045) * 0.12;
    handleGroup.children[selIdx].scale.setScalar(pulse);
  }

  if(sim.wantPhoto){ const k = sim.wantPhoto; sim.wantPhoto = null; capturePhoto(sim.tele, k); }
  updatePhysicsVectors();
  if(xrOn && renderer.xr.isPresenting) placeXrRig();
  else placeCamera();
  updateHUD();
  updateAudio(dt);
  updateFx(dt);
  renderer.render(scene, camera);
}

/* ---------------- self test (headless smoke reads this) ------ */
function selfTest(){
  try{
    if(!analysis || !analysis.B) return { pass: false, why: 'no analysis' };
    const a = analysis;
    let S = track.sCrest + 0.05, v = analysis.A.v;
    const h = 0.0005;
    for(let i = 0; i < 900000 && S < a.B.s; i++){
      const tr = trackAt(S);
      v += (-G0 * tr.Ty) * h;
      S += Math.max(v, 0.01) * h;
    }
    const vAna = Math.sqrt(analysis.A.v ** 2 + 2 * G0 * (a.A.h - a.B.h));
    const err = Math.abs(v - vAna) / vAna;
    return {
      pass: err < 0.02 && track.L > 100,
      vSim: +v.toFixed(3), vAna: +vAna.toFixed(3), err: +err.toFixed(4),
      L: +track.L.toFixed(1),
      loop: !!a.C, rB: a.B ? +a.B.r.toFixed(1) : null,
      rC: a.C ? +a.C.r.toFixed(1) : null,
      bankD: a.ans ? +(a.ans.bankD || 0).toFixed(1) : null
    };
  }catch(e){ return { pass: false, why: String(e && e.message || e) }; }
}

/* ---------------- init ---------------- */
fullRebuild();
setLevel(level);
syncPointCard();
snapshot();
renderMissions();
if(fxLite) applyFx();
placeTrain();
showDesignRecovery();
rootEl._selftest = selfTest();
/* tiny hooks for automated smoke tests */
rootEl._lab = {
  analysis: () => analysis,
  setCertBank: deg => {
    design.points[design.certTurnIdx].bank = deg;
    fullRebuild();
  },
  /* run the whole sim synchronously — physics identical, render-rate-free */
  fastRun: (cert, exploreCheck) => {
    startRun(!!cert);
    if(exploreCheck) sim.exploreCheck = true;
    let guard = 0;
    while(sim.running && guard++ < 40000){
      stepSim(0.05);
      if(sim.wantPhoto){ const k = sim.wantPhoto; sim.wantPhoto = null; placeTrain(); capturePhoto(sim.tele, k); }
    }
    if(sim.running) stopRun();
    return sim.tele && sim.tele.status;
  },
  designInfo: () => ({ pts: design.points.length, mode: design.propulsion.mode }),
  randomize: (seed, style) => generateCoaster(seed == null ? null : seed, style || 'auto'),
  genOnce: (seed, style) => {
    const raw = randomDesign(seed, style && style !== 'auto' ? { style } : null);
    const editable = new Set(raw.meta.bankable || []);
    autoBankDesign(raw.points, raw.meta.head, n => editable.has(n));
    design = normalizeDesign(raw);
    selIdx = -1;
    fullRebuild();
    return { meta: raw.meta, bad: safetyFindings.filter(f => f.severity === 'bad').length };
  },
  csv: () => lastTele ? buildCsv(lastTele) : '',
  ys: (s0, s1, ds = 4) => {
    const out = [];
    for(let s = s0; s <= s1; s += ds){
      const tr = trackAt(s);
      out.push([+s.toFixed(0), +tr.y.toFixed(2)]);
    }
    return { L: +track.L.toFixed(1), pts: out };
  },
  exportDesign, importDesign,
  elementPreview: kind => buildElementPoints(kind, design.points[Math.max(0, selIdx)], design.points[(Math.max(0, selIdx) + 1) % design.points.length]),
  safetyFindings: () => safetyFindings.map(f => ({ ...f })),
  missions: () => Object.keys(missionsDone),
  /* drive a full Ride & Solve synchronously; pauseOnly stops at 1st question */
  rideTest: pauseOnly => {
    if(!ride.active) startRide();
    let guard = 0;
    while(sim.running && guard++ < 40000){
      if(sim.paused){
        if(pauseOnly) return { paused: true, tag: rq.tag.textContent };
        const q = ride.current;
        submitRideAnswer(q.choices ? q.correct : String(q.answer), true);
      } else {
        stepSim(0.05);
      }
    }
    return { score: ride.score, correct: ride.correct, total: ride.total,
             status: sim.tele && sim.tele.status };
  },
  setLevel,
  lastTele: () => lastTele,
  /* physics invariant battery — smoke harness asserts every row passes */
  runTests: () => {
    const out = [];
    const T = (name, pass, detail) => out.push({ name, pass: !!pass, detail });
    try{
      let worstDot = 0, worstLen = 0;
      for(let i = 0; i < M; i += 7){
        worstDot = Math.max(worstDot, Math.abs(track.T[i].dot(track.up[i])));
        worstLen = Math.max(worstLen, Math.abs(track.up[i].length() - 1));
      }
      T('frame orthonormal', worstDot < 1e-3 && worstLen < 1e-3, `T·up ${worstDot.toExponential(1)}`);
      const wrapAng = track.up[M - 1].angleTo(track.up[0]) * 180 / Math.PI;
      T('frame closure', wrapAng < 4, `${wrapAng.toFixed(2)}° at wrap`);
      const tr0 = trackAt(3);
      T('rest g ≈ 1', Math.abs(tr0.upY - 1) < 0.03, `${tr0.upY.toFixed(3)} g at station`);
      /* synthetic flat circle: measured horizontal curvature must match 1/R */
      const R = 25, cpts = [];
      for(let k = 0; k < 12; k++){
        const ang = k / 12 * Math.PI * 2;
        cpts.push({ x: Math.cos(ang) * R, y: 5, z: Math.sin(ang) * R, bank: 0 });
      }
      const ct = computeTrackData(cpts);
      let kAvg = 0, n = 0;
      for(let i = 0; i < M; i += 10){ kAvg += ct.kH[i]; n++; }
      kAvg /= n;
      T('circle curvature', Math.abs(kAvg * R - 1) < 0.12, `κ·R = ${(kAvg * R).toFixed(3)}`);
      const st = selfTest();
      T('energy integration', st.pass, `rel err ${st.err}`);
      /* shortest-path bank interp: a 0→90→180→−90→0 ramp must invert the rider */
      const rpts = [
        { x: 0, y: 10, z: 0, bank: 0 }, { x: 25, y: 10, z: 0, bank: 90 },
        { x: 50, y: 10, z: 0, bank: 180 }, { x: 75, y: 10, z: 0, bank: -90 },
        { x: 100, y: 10, z: 0, bank: 0 }, { x: 100, y: 10, z: 50, bank: 0 },
        { x: 50, y: 10, z: 55, bank: 0 }, { x: 0, y: 10, z: 50, bank: 0 }
      ];
      const rt = computeTrackData(rpts);
      let minUpY = 1;
      for(let i = 0; i < M; i += 4) minUpY = Math.min(minUpY, rt.upY[i]);
      T('heartline roll inverts', minUpY < -0.9, `min upY ${minUpY.toFixed(2)}`);
      if(analysis && analysis.D){
        const i = analysis.D.idx;
        const nh = new THREE.Vector3(0, 1, 0).addScaledVector(track.T[i], -track.T[i].y).normalize();
        const roll = Math.acos(THREE.MathUtils.clamp(track.up[i].dot(nh), -1, 1)) * 180 / Math.PI;
        const want = Math.abs(design.points[design.certTurnIdx].bank || 0);
        T('bank realized', Math.abs(roll - want) < 5, `${roll.toFixed(1)}° vs designed ${want}°`);
      }
    }catch(e){
      T('battery crashed', false, String(e && e.message || e));
    }
    return out;
  },
  /* park the train at arc length s for deterministic screenshots */
  place: (s, v) => { sim.S = s; if(v != null) sim.v = v; placeTrain(); updateHUD(); },
  setCam: mode => { camMode = mode; },
  settleCam: (n = 60) => { for(let i = 0; i < n; i++) placeCamera(); },
  setProp: (mode, accel) => {
    design.propulsion.mode = mode;
    if(accel != null) design.propulsion.accel = accel;
    fullRebuild(); syncPropUI();
  },
  /* ideal-run g profile: worst spots + suggested bank per node (dev tool) */
  profile: () => {
    if(!analysis) return null;
    const a = analysis, t = track;
    const vAt = i => Math.sqrt(Math.max(0, a.A.v ** 2 + 2 * G0 * (a.A.h - t.y[i])));
    const spots = [];
    for(let i = t.crestIdx + 5; i < M - 30; i++){
      const v = vAt(i);
      spots.push({ i, s: +t.s[i].toFixed(0), y: +t.y[i].toFixed(1),
        gV: +(t.upY[i] + v * v * t.kUp[i] / G0).toFixed(2),
        gL: +(t.sideY[i] + v * v * t.kSide[i] / G0).toFixed(2) });
    }
    const worstGVhi = [...spots].sort((p, q) => q.gV - p.gV).slice(0, 4);
    const worstGVlo = [...spots].sort((p, q) => p.gV - q.gV).slice(0, 4);
    const worstGL = [...spots].sort((p, q) => Math.abs(q.gL) - Math.abs(p.gL)).slice(0, 4);
    const nodes = design.points.map((p, k) => {
      let iN = 0, best = Infinity;
      const v3 = new THREE.Vector3(p.x, p.y, p.z);
      for(let i = 0; i < M; i += 4){
        const d = t.pos[i].distanceToSquared(v3);
        if(d < best){ best = d; iN = i; }
      }
      const v = vAt(iN);
      return { k, bank: p.bank, suggest: +(Math.atan(v * v * t.kH[iN] / G0) * 180 / Math.PI).toFixed(0) };
    });
    return { worstGVhi, worstGVlo, worstGL, nodes };
  }
};
console.log('[coasterlab] selftest ' + JSON.stringify(rootEl._selftest));
renderer.setAnimationLoop(animate);

return { destroy: __clabDestroy };
}

  function loadThreeAnd(cb){
    // Shared resilient loader: multi-CDN fallback + timeout (host provides it).
    window.StemLab.ensureThree({ orbit: false }).then(function () { cb(window.THREE || null); }).catch(function () { cb(null); });
  }

  window.StemLab.registerTool('coasterLab', {
    icon: '🎢',
    label: 'Coaster Lab',
    desc: 'Design a roller coaster in full 3-D, predict speeds, g-forces, and bank angles with an educational physics model, pass its simulation inspection, ride onboard with checkpoint questions, and read your own telemetry like an engineer.',
    color: 'amber',
    category: 'science',
    questHooks: [
      { id: 'clab_run', label: 'Complete a full coaster circuit', icon: '🎢', check: function (d) { var s = (d && d.coasterLab) || {}; return (s.runs || 0) >= 1; } },
      { id: 'clab_cert', label: 'Pass a simulation inspection', icon: '★', check: function (d) { var s = (d && d.coasterLab) || {}; return !!s.certified; } },
      { id: 'clab_explore', label: 'Earn the Explore prediction badge', icon: '🎖', check: function (d) { var s = (d && d.coasterLab) || {}; return !!s.explored; } },
      { id: 'clab_ride', label: 'Answer 4 Ride & Solve questions in one ride', icon: '🧠', check: function (d) { var s = (d && d.coasterLab) || {}; return (s.rideBestCorrect || 0) >= 4; } },
      { id: 'clab_missions', label: 'Complete 6 engineering missions', icon: '🏆', check: function (d) { var s = (d && d.coasterLab) || {}; return (s.missionCount || 0) >= 6; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var setToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : null;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : null;
      var callGemini = ctx.callGemini;
      var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');

      // Milestone tracker seeded from persisted state. Award decisions read from
      // THIS closure — never from inside the setToolData reducer. The old code
      // called awardXP()/addToast() inside the reducer; React runs a reducer
      // during the host's (AlloFlowContent's) render pass, so those setters fired
      // mid-render → "Cannot update a component (StemLabModal) while rendering a
      // different component (AlloFlowContent)". A reducer must be pure; side
      // effects run AFTER it, below.
      var _clabPersist = (ctx.toolData && ctx.toolData.coasterLab) || {};
      var _clabMs = {
        certified: !!_clabPersist.certified,
        explored: !!_clabPersist.explored,
        rideBestCorrect: _clabPersist.rideBestCorrect || 0,
        missionCount: _clabPersist.missionCount || 0
      };
      function bridge(ev){
        if (typeof setToolData !== 'function') return;
        // Decide awards from the milestone tracker (pure read, no setState).
        // awardXP signature is (activityId, points, reason); the tool caps at
        // 100 XP per activityId, so a single 'coasterLab' id is the whole tool.
        var _awards = []; // [pts, reason, toastMsgOrNull]
        if (ev.event === 'cert') {
          if (!_clabMs.certified) { _clabMs.certified = true; _awards.push([25, 'Coaster certified', '★ Coaster certified!']); }
        } else if (ev.event === 'explore') {
          if (!_clabMs.explored) { _clabMs.explored = true; _awards.push([15, 'Coaster predictions badge', null]); }
        } else if (ev.event === 'ride') {
          var _c = ev.correct || 0;
          if (_c >= 4 && _clabMs.rideBestCorrect < 4) _awards.push([10, 'Ride & Solve streak', null]);
          _clabMs.rideBestCorrect = Math.max(_clabMs.rideBestCorrect, _c);
        } else if (ev.event === 'missions') {
          var _nc = Math.max(_clabMs.missionCount, ev.count || 0);
          if (_nc > _clabMs.missionCount) _awards.push([5 * (_nc - _clabMs.missionCount), 'Coaster missions', null]);
          _clabMs.missionCount = _nc;
        }
        // Persist coaster progress — PURE updater, no side effects.
        setToolData(function (prev) {
          var s = Object.assign({}, (prev && prev.coasterLab) || {});
          if (ev.event === 'run') s.runs = (s.runs || 0) + 1;
          else if (ev.event === 'cert') s.certified = true;
          else if (ev.event === 'explore') s.explored = true;
          else if (ev.event === 'ride') {
            s.rideBestCorrect = Math.max(s.rideBestCorrect || 0, ev.correct || 0);
            s.rideBestScore = Math.max(s.rideBestScore || 0, ev.score || 0);
          }
          else if (ev.event === 'missions') {
            s.missionCount = Math.max(s.missionCount || 0, ev.count || 0);
          }
          return Object.assign({}, prev, { coasterLab: s });
        });
        // Side effects now — outside the reducer, in the engine's event context
        // (not a render pass), so these setStates are safe.
        _awards.forEach(function (a) {
          if (a[2] && typeof addToast === 'function') { try { addToast(a[2], 'success'); } catch (e) {} }
          if (awardXP) { try { awardXP('coasterLab', a[0], a[1]); } catch (e) {} }
        });
      }
      if (announceToSR) bridge.announce = function (msg) { announceToSR(msg); };
      var gl = parseInt(String(ctx.gradeLevel || ''), 10);
      if (gl && gl <= 8) bridge.suggestLevel = 'explore';
      // Grade band ('k2'|'g35'|'g68'|'g912') drives Ride & Solve question
      // difficulty when the teacher leaves the grade control on "auto". The host
      // derives this from the app's grade level; a manual override lives in-tool.
      bridge.gradeBand = (typeof ctx.gradeBand === 'string') ? ctx.gradeBand : null;
      bridge.gradeLabel = (typeof ctx.gradeLevel === 'string') ? ctx.gradeLevel : '';
      if (aiOn) bridge.ai = function (prompt, cb) {
        Promise.resolve().then(function () { return callGemini(prompt, false); }).then(function (resp) {
          var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output)) || '');
          cb(null, text);
        }).catch(function (err) { cb(err || new Error('ai unavailable')); });
      };

      function refCb(el){
        if (!el) {
          var detachedEl = refCb._el;
          if (detachedEl) Promise.resolve().then(function () {
            if (!detachedEl.isConnected && typeof detachedEl._clabCleanup === 'function') {
              try { detachedEl._clabCleanup(); } catch (_cleanupErr) {}
              detachedEl._clabCleanup = null;
              detachedEl._clabInit = false;
            }
          });
          return;
        }
        refCb._el = el;
        if (el._clabInit) return;
        el._clabInit = true;
        el.tabIndex = 0;
        el.addEventListener('pointerdown', function () { try { el.focus({ preventScroll: true }); } catch (e) {} });
        var note = document.createElement('div');
        note.style.cssText = 'padding:28px;text-align:center;color:#9fb0c1;font-family:Segoe UI,system-ui,sans-serif;font-size:14px';
        note.textContent = '🎢 Building the midway…';
        el.appendChild(note);
        loadThreeAnd(function (THREE) {
          if (!el.isConnected) return;
          if (!THREE) { note.textContent = 'The 3-D engine failed to load — check your connection and reopen the tool.'; return; }
          try {
            note.remove();
            el.innerHTML = CLAB_HTML;
            var eng = bootCoasterLab(el, THREE, bridge);
            el._clabCleanup = eng && eng.destroy;
          } catch (err) {
            try { if (typeof el._clabCleanup === 'function') el._clabCleanup(); } catch (_cleanupErr) {}
            el._clabCleanup = null;
            el.innerHTML = '';
            el.appendChild(note);
            note.textContent = 'Coaster Lab could not start here: ' + ((err && err.message) || err);
          }
        });
      }

      return h('div', {
        className: 'clab-root',
        style: { position: 'relative', height: '78vh', minHeight: 540, borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', background: '#0f151c' }
      },
        h('style', { dangerouslySetInnerHTML: { __html: CLAB_CSS } }),
        h('div', { ref: refCb, 'aria-label': 'Coaster Lab 3-D designer', style: { position: 'absolute', inset: 0, outline: 'none' } })
      );
    }
  });
})();
