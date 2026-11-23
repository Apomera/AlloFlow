/* Shared classroom presenter and portable HTML player. */
(function (root) {
  'use strict';
  const CSS = `
.awp,.awp *{box-sizing:border-box}.awp{font:1rem/1.5 system-ui,sans-serif;color:#14213d;background:#f5f7fb;overflow-wrap:anywhere;color-scheme:light}.awp-overlay{position:fixed;inset:0;z-index:2147483000;padding:20px;display:flex;align-items:center;justify-content:center;background:#14213dcc}.awp-dialog{width:min(100%,1100px);max-height:calc(100dvh - 40px);overflow:auto;border-radius:20px;background:#f5f7fb;padding:1.5rem;box-shadow:0 16px 80px #0005}.awp h1:not(.allo-anno-scope *),.awp .awp-head h2:not(.allo-anno-scope *),.awp p:not(.allo-anno-scope *){margin:0 0 .75rem}.awp h1{font-size:1.625rem;line-height:1.2}.awp .awp-head h2{font-size:1.625rem;line-height:1.2}.awp button:not(.allo-anno-scope *),.awp input:not(.allo-anno-scope *),.awp textarea:not(.allo-anno-scope *),.awp select:not(.allo-anno-scope *){font:inherit;color:#14213d}.awp button:not(.allo-anno-scope *){min-height:44px;padding:.5625rem .9375rem;border:1px solid #a8b4c7;border-radius:9px;background:white;cursor:pointer;white-space:normal}.awp button:hover:not(:disabled):not(.allo-anno-scope *){background:#e9effa}.awp button:disabled:not(.allo-anno-scope *){color:#596579;background:#e7ebf2;cursor:default}.awp .awp-primary{color:white;background:#294fc3;border-color:#294fc3}.awp .awp-primary:hover:not(:disabled){background:#1e3d99}.awp .awp-aa{min-width:44px;font-weight:700}.awp :focus-visible{outline:3px solid #bc4a00;outline-offset:3px}.awp input:not([type=checkbox]):not([type=radio]):not([type=range]):not(.awp-symbol-search):not(.allo-anno-scope *),.awp textarea:not(.allo-anno-scope *),.awp select:not(.allo-anno-scope *){width:100%;max-width:100%;border:1px solid #8191a9;background:white;border-radius:7px;padding:.5625rem}.awp textarea:not(.allo-anno-scope *){resize:vertical;min-height:10.625rem}.awp label:not(.allo-anno-scope *){display:block;font-weight:600}.awp label>span{display:block;margin-bottom:.3125rem}.awp label:has(input[type=checkbox]):not(.allo-anno-scope *){display:flex;align-items:center;gap:.5625rem;font-weight:400}.awp input[type=checkbox]:not(.allo-anno-scope *){width:1.25rem;height:1.25rem;flex-shrink:0;accent-color:#294fc3}.awp-head,.awp-row{display:flex;align-items:center;gap:.625rem;flex-wrap:wrap}.awp-head{justify-content:space-between;margin-bottom:1.25rem}.awp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.5rem}.awp-fields{display:grid;gap:.8125rem}.awp-note{font-size:.875rem;color:#45536a}.awp-status{min-height:1.5625rem;margin-top:.875rem!important;color:#263e6c}.awp-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.125rem}.awp-surface{border:1px solid #bdc8da;border-radius:14px;background:white;padding:1.125rem;min-width:0}.awp-player{width:100%;max-width:1400px;margin:auto;padding:1.25rem}.awp-stage{position:relative;display:flex;align-items:safe center;justify-content:center;min-height:48vh;max-height:60dvh;padding:2.125rem;border:1px solid #bac6d9;border-radius:16px;background:white;margin:1rem 0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}.awp-card{max-width:100%;width:100%;text-align:center;line-height:var(--allo-reader-line-height,1.5);letter-spacing:var(--allo-reader-letter-spacing,normal)}.awp-word{font-weight:750;font-size:clamp(2.125rem,9vw,7rem);line-height:var(--allo-reader-line-height,1.5);overflow-wrap:anywhere;white-space:normal}.awp-stage[data-position^=top]{align-items:flex-start}.awp-stage[data-position^=bottom]{align-items:safe flex-end}.awp-stage[data-position$=left] .awp-card{text-align:left}.awp-stage[data-position$=right] .awp-card{text-align:right}.awp-detail{font-size:clamp(1.25rem,3vw,2.125rem);line-height:var(--allo-reader-line-height,1.5);white-space:pre-wrap}.awp-phonemes{display:flex;justify-content:center;flex-wrap:wrap;gap:.875rem;font-size:clamp(1.75rem,6vw,4.5rem);font-weight:650}.awp-phoneme{padding:.125rem .75rem;border-bottom:4px solid #294fc3}.awp-choices{display:flex;justify-content:center;flex-wrap:wrap;gap:.625rem;margin-top:1.5rem}.awp-choices button{font-size:clamp(1.25rem,3vw,1.875rem);min-width:5.625rem}.awp-feedback{font-size:1.25rem;min-height:1.875rem;margin-top:.875rem!important}.awp-progress{font-variant-numeric:tabular-nums}.awp-footer{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap}.awp:fullscreen{overflow:auto;background:#f5f7fb}.awp:fullscreen .awp-stage{min-height:68dvh;max-height:78dvh}.awp [hidden]{display:none!important}.awp .awp-gap{margin-top:.875rem}.awp .awp-review[aria-pressed=true]{background:#fdf0cf;border-color:#926300;color:#664500}
.awp-anno-tools{margin-top:.5rem}.awp-anno-tools:empty{display:none}.awp-anno-layer{position:static;width:0;height:0;flex:none}
.awp-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.awp-card .awp-definition,.awp-card .awp-example,.awp-card .awp-origin{text-align:start}
.awp-card .awp-origin>span[lang],.awp-card-preview .awp-preview-origin>span[lang]{display:block;text-align:start}
.awp-round-actions:not(.awp-surface),.awp-round-actions:not(.awp-surface)>.awp-round-controls{display:contents}
.awp-round-actions.awp-surface{flex-basis:100%}.awp-round-actions h2{margin:0 0 .5rem}
.awp-stage .awp-card>.awp-detail,.awp-card-preview>.awp-preview-detail{max-inline-size:38em;margin-inline:auto}
.awp-stage .awp-card>.awp-detail:has(>.awp-translation),.awp-card-preview>.awp-preview-detail:has(>.awp-preview-translation){border-block-start:1px solid var(--awp-card-border,#bac6d9);padding-block-start:.4em}
.awp-stage .awp-detail:has(>.awp-translation:dir(rtl))>.awp-language-name,.awp-card-preview .awp-preview-detail:has(>.awp-preview-translation:dir(rtl))>.awp-preview-language-name{text-align:right}
.awp-stage .awp-detail:has(>.awp-translation:dir(ltr))>.awp-language-name,.awp-card-preview .awp-preview-detail:has(>.awp-preview-translation:dir(ltr))>.awp-preview-language-name{text-align:left}
.awp-size-details{grid-column:1/-1;min-width:0}.awp-size-details>summary{min-height:44px;cursor:pointer;font-weight:600}.awp-size-details[open]>.awp-appearance-controls{margin-block-start:.375rem}
.awp .awp-primary-appearance-controls{grid-template-columns:repeat(4,minmax(0,1fr))}.awp-appearance-reset{grid-column:1/-1;justify-self:start}.awp .awp-appearance-reset[aria-disabled=true]{color:#64748b;cursor:default}
@media(max-width:900px){.awp .awp-primary-appearance-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.awp .awp-primary-appearance-controls{grid-template-columns:minmax(0,1fr)}}
.awp-translation-menu{margin-block:.5rem;min-width:0}.awp-translation-menu>summary{min-height:44px;cursor:pointer;font-weight:600}.awp-translation-list{max-block-size:min(20rem,45vh);overflow:auto;overscroll-behavior:contain}.awp-translation-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:.25rem;padding-block:.125rem;border-block-end:1px solid #d5deeb}.awp-translation-row label{min-height:44px;min-width:0}.awp .awp-translation-row button{min-width:44px}.awp-translation-actions{display:flex;flex-wrap:wrap;gap:.375rem;margin-block:.25rem}
.awp .awp-translation-row button{inline-size:44px;padding-inline:0}.awp .awp-translation-row button[aria-disabled=true]{color:#64748b;border-color:#cbd5e1;cursor:default}.awp .awp-translation-actions button[aria-pressed=true]{background:#e8effd;border-color:#294fc3}
.awp-translation-menu{max-inline-size:36rem}
@media(max-width:640px){.awp-translation-row{grid-template-columns:44px 44px minmax(0,1fr)}.awp-translation-row>label{grid-column:1/-1}.awp .awp-translation-actions button{padding-inline:.25rem}}
.awp .awp-choices button[aria-disabled=true]{cursor:default}.awp .awp-choices button[data-awp-tried=true]{opacity:.72;text-decoration:line-through;border-style:dashed}.awp .awp-choices button[aria-disabled=true],.awp .awp-choices button:hover:not(:disabled){background:var(--awp-card-background,#fff);color:var(--awp-card-heading,#14213d)}.awp .awp-choices button:hover:not(:disabled):not([aria-disabled=true]){border-color:var(--awp-card-accent,#294fc3);box-shadow:inset 0 0 0 1px var(--awp-card-accent,#294fc3)}
.awp-preview-word{font-weight:750;line-height:var(--allo-reader-line-height,1.5);overflow-wrap:anywhere;white-space:normal}.awp-preview-detail{line-height:var(--allo-reader-line-height,1.5);white-space:pre-wrap}.awp-preview-definition,.awp-preview-example,.awp-preview-origin{text-align:start}
.awp .awp-sentence-prompt[data-prose=true],.awp .awp-preview-prompt[data-prose=true]{text-align:start}.awp-preview-picker{margin-bottom:.75rem}
.awp-stage .awp-language-name,.awp-card-preview .awp-preview-language-name{display:block;text-align:start;font-weight:650;margin-bottom:.25rem}.awp-stage .awp-translation,.awp-card-preview .awp-preview-translation{display:block;text-align:start}.awp-stage .awp-language-name,.awp-card-preview .awp-preview-language-name,.awp-card-preview .awp-note{color:var(--awp-card-muted,#45536a)}
.awp-preview-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem}.awp-preview-toolbar p{margin:0;font-variant-numeric:tabular-nums}.awp-preview-sounds{display:flex;justify-content:center;flex-wrap:wrap;gap:.875rem;font-weight:650}.awp-preview-sound{padding:.125rem .75rem;border-bottom:4px solid var(--awp-card-accent,#294fc3)}.awp-preview-choices{display:flex;justify-content:center;flex-wrap:wrap;gap:.625rem;list-style:none;padding:0;margin:1.5rem 0 0}.awp-preview-choice{max-width:100%;min-width:5.625rem;min-height:44px;padding:.5625rem .9375rem;border:1px solid var(--awp-card-border,#a8b4c7);border-radius:9px;background:white;color:var(--awp-card-heading,#14213d)}.awp-preview-feedback{margin-top:.875rem!important;color:var(--awp-card-accent,#294fc3)}
.awp-appearance{min-width:0;margin:1rem 0 0;padding:1rem;border:1px solid #bdc8da;border-radius:12px;background:white}.awp-appearance legend{font-weight:700;padding:0 .375rem}.awp-appearance-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}.awp-appearance-controls label{min-width:0}.awp-appearance-panel{margin:.5rem 0}.awp-appearance-panel summary{min-height:44px;cursor:pointer;font-weight:650}.awp-card-preview{margin-top:.75rem;padding:1rem;max-height:18rem;overflow:auto;border:1px solid #bac6d9;border-radius:12px;text-align:center;overscroll-behavior:contain}.awp-preview-heading{font-size:1rem;margin:1rem 0 .375rem}.awp-stage,.awp-card-preview{background:var(--awp-card-background,#fff);border-color:var(--awp-card-border,#bac6d9);color:var(--awp-card-text,#14213d)}.awp-stage .awp-word,.awp-card-preview .awp-preview-word{color:var(--awp-card-heading,#14213d)}.awp-stage .awp-note,.awp-card-preview .awp-preview-language-name{color:var(--awp-card-muted,#45536a)}.awp-stage .awp-phoneme{border-color:var(--awp-card-accent,#294fc3)}.awp-stage .awp-choices button{color:var(--awp-card-heading,#14213d);border-color:var(--awp-card-border,#a8b4c7)}.awp-stage .awp-feedback{color:var(--awp-card-accent,#294fc3)}.awp [data-awp-card-font]:not([data-awp-card-font=default]),.awp [data-awp-card-font]:not([data-awp-card-font=default]) *{font-family:var(--awp-card-font-family)!important}
.awp-meaning-choices{min-width:0;margin:0;padding:.75rem;border:1px solid #bdc8da;border-radius:9px}.awp-meaning-choices label{min-height:44px;padding:.375rem 0;align-items:flex-start!important}.awp-meaning-choices input{margin-top:.25rem}.awp-meaning-choices legend{font-weight:650;padding:0 .25rem}
.awp .awp-meaning-copy{min-width:0;flex:1;margin:0}.awp-meaning-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:.125em .375em;min-width:0;text-align:start}.awp-meaning-number{font-size:.875em;font-weight:500;color:#45536a}.awp-meaning-term{min-width:0;font-weight:650;unicode-bidi:isolate}.awp .awp-meaning-language{max-width:100%;padding:.0625em .375em;border:1px solid #cbd5e1;border-radius:999px;min-width:0;overflow-wrap:anywhere;font-size:.8125em;line-height:1.4;font-weight:500;unicode-bidi:isolate}.awp-meaning-excerpt{display:block;margin-block-start:.25rem;color:#45536a;text-align:start}
.awp-meaning-details{min-width:0;margin-inline-start:1.8125rem;margin-block-end:.5rem}.awp-meaning-details>summary{min-height:44px;cursor:pointer;font-weight:600}.awp-meaning-definition{max-block-size:min(16rem,45vh);overflow:auto;overscroll-behavior:contain;white-space:pre-wrap;text-align:start}
.awp-fields{align-content:start;min-width:0}.awp-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8125rem}.awp-options>label:first-child{grid-column:1/-1}.awp-checks{display:grid;gap:.375rem}.awp-checks label{min-height:44px}.awp-checks label>span{margin:0}.awp-audio-setup{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;margin-top:1rem;padding:.875rem 1rem;border:1px solid #bdc8da;border-radius:12px;background:#edf2fc}.awp-audio-setup .awp-note{margin:0;flex:1 1 25rem}.awp-format-note{margin-top:1rem!important}.awp-delivery{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr)}.awp-print-sheets{margin-top:.875rem;padding:.5rem .875rem;border:1px solid #bdc8da;border-radius:10px;background:white}.awp-print-sheets>summary{min-height:44px;cursor:pointer;font-weight:650;display:flex;align-items:center}.awp-print-sheets-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr));gap:.5rem;margin-top:.5rem!important}.awp-set-actions{padding-top:.875rem;border-top:1px solid #d5deeb}.awp-set-actions button{background:transparent}.awp-timing-note{grid-column:1/-1;margin:0!important}
.awp-audio-details{flex:1 1 25rem;min-width:0}.awp-audio-setup .awp-audio-mode{margin-top:.375rem;font-weight:600;color:#263e6c}.awp-plan{margin-top:1rem;padding:.875rem 1rem;border:1px solid #bdc8da;border-radius:12px;background:white}.awp-plan p{margin:0}.awp-plan-count{font-weight:650;font-variant-numeric:tabular-nums}.awp-plan .awp-plan-note{margin-top:.375rem;color:#784411}.awp-plan[data-needs-review=true]{border-inline-start:4px solid #a76918}
.awp-operation{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:1rem;padding:.75rem;background:#f5f7fb;border:1px solid #bdc8da;border-radius:10px}.awp-operation[data-active=true]{position:sticky;bottom:0;max-height:min(50dvh,18rem);overflow:auto}.awp-operation:has(.awp-status:empty):has(button[hidden]){display:none}.awp-operation .awp-status{flex:1 1 18rem;margin:0!important;min-height:0}.awp-operation progress{width:100%;height:.625rem;accent-color:#294fc3}.awp-review-details{margin-top:.75rem}.awp-review-details summary{cursor:pointer;min-height:44px;font-weight:650}.awp-review-details ul{max-height:12rem;overflow:auto;margin:.375rem 0;padding-inline-start:1.5rem;scrollbar-gutter:stable;overscroll-behavior:contain}.awp-review-details h2{font-size:.875rem;margin:.75rem 0 .25rem}.awp-review-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}
@media(max-width:640px){.awp-overlay{padding:6px}.awp-dialog{padding:.9375rem;max-height:calc(100dvh - 12px);border-radius:12px}.awp-grid{grid-template-columns:minmax(0,1fr);gap:1rem}.awp-player{padding:.5rem}.awp-dialog .awp-player{padding-inline:0}.awp-stage{padding:1.125rem .625rem;min-height:42vh}.awp-head{gap:.5rem}.awp h1{font-size:1.375rem}.awp button{padding:.5625rem .6875rem}.awp-word{font-size:clamp(1.875rem,11vw,4.5rem)}}
@media(max-width:640px){.awp-options{grid-template-columns:minmax(0,1fr)}.awp-delivery{grid-template-columns:repeat(2,minmax(0,1fr))}.awp-delivery .awp-primary{grid-column:1/-1}.awp-set-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.awp-audio-setup{padding:.75rem}.awp-audio-setup button{width:100%}.awp-operation{padding:.5rem}.awp-operation button{width:100%;padding-inline:.375rem}}
@media(max-width:640px){.awp-appearance-controls{grid-template-columns:minmax(0,1fr)}.awp-appearance{padding:.75rem}.awp-card-preview{padding:.75rem}}
.awp-stage{touch-action:pan-y}.awp-picture{margin:1rem auto 0;max-width:min(100%,32rem)}.awp-picture img{display:block;max-width:100%;max-height:34vh;margin:0 auto;object-fit:contain;border-radius:10px}.awp:fullscreen .awp-picture img{max-height:48dvh}.awp-picture figcaption{margin-top:.25rem;font-size:.75rem;color:var(--awp-card-muted,#45536a);text-align:center}.awp-card-preview .awp-picture img{max-height:8rem}
.awp [data-awp-reader-spacing=true],.awp [data-awp-reader-spacing=true] :is(div,p,span,button,b,figcaption):not(.allo-anno-scope *){line-height:var(--allo-reader-line-height,1.5)!important;letter-spacing:var(--allo-reader-letter-spacing,normal)!important}
.awp [data-awp-reader-font=true],.awp [data-awp-reader-font=true] :not(.allo-anno-scope *):not(svg):not(svg *){font-family:var(--awp-card-font-family)!important}
.awp [data-awp-reader-variant=true] :is(.awp-word,.awp-preview-word){--awp-text-weight:750}
.awp [data-awp-reader-variant=true] :is(.awp-phonemes,.awp-preview-sounds,.awp-language-name,.awp-preview-language-name){--awp-text-weight:650}
.awp [data-awp-reader-variant=true] [data-awp-bionic=true]:is(.awp-word,.awp-preview-word):has(b[data-awp-bionic]){--awp-text-weight:400}
.awp [data-awp-reader-variant=true] b[data-awp-bionic]{--awp-reader-weight:800}
.awp [data-awp-reader-variant=true],.awp [data-awp-reader-variant=true] :not(.allo-anno-scope):not(.allo-anno-scope *):not(svg):not(svg *){font-style:var(--awp-card-font-style,normal)!important;font-weight:var(--awp-reader-weight,var(--awp-text-weight,400))!important}
.awp-stage .awp-choices button,.awp-card-preview .awp-preview-choice{background:var(--awp-card-background,#fff);color:var(--awp-card-heading,#14213d)}
.awp [data-awp-reading-theme=dark] :focus-visible,.awp [data-awp-reading-theme=highContrast] :focus-visible{outline-color:var(--awp-card-accent)}
.awp [data-awp-bionic=true]:is(.awp-word,.awp-preview-word):has(b[data-awp-bionic]){font-weight:400}.awp b[data-awp-bionic]{font-weight:800}
.awp-inline{background:transparent}.awp-inline-dialog{width:100%;max-height:none;box-shadow:none;border:1px solid #bdc8da}
.awp-picture-manager{min-width:0;margin:.25rem 0 0;padding:.75rem;border:1px solid #bdc8da;border-radius:9px;background:#fff}
.awp-picture-manager>summary{min-height:44px;cursor:pointer;font-weight:650;display:flex;align-items:center}
.awp-picture-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
.awp-picture-list{display:grid;gap:.5rem;max-height:18rem;overflow:auto;overscroll-behavior:contain;margin-top:.5rem}
.awp-picture-row{display:grid;grid-template-columns:56px minmax(0,1fr);gap:.625rem;align-items:start;padding:.5rem;border:1px solid #d5deeb;border-radius:8px;background:#f8fafc}
.awp-text-edit{display:grid;gap:.5rem;margin-top:.5rem;min-width:0}.awp-text-edit label{display:grid;gap:.25rem;font-weight:600}.awp .awp-text-edit textarea{inline-size:100%;min-block-size:3.5rem;font:inherit;padding:.5rem;border:1px solid #64748b;border-radius:8px;background:white;color:#14213d}
.awp-picture-thumb{width:56px;height:56px;object-fit:contain;border:1px solid #cbd5e1;border-radius:6px;background:#fff}
.awp-picture-empty{width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:1px dashed #94a3b8;border-radius:6px;font-size:.75rem;color:#45536a;text-align:center;background:#fff;padding:.125rem}
.awp-picture-meta{min-width:0;display:grid;gap:.375rem}
.awp-picture-word-row{display:flex;flex-wrap:wrap;align-items:center;gap:.375rem;justify-content:space-between}
.awp-picture-word{font-weight:700;overflow-wrap:anywhere}
.awp-picture-actions{display:flex;flex-wrap:wrap;gap:.375rem}
.awp .awp-picture-actions button,.awp .awp-picture-toolbar button{min-height:44px;padding:.3125rem .625rem;font-size:.875rem}
.awp-picture-alt{font-size:.875rem}
.awp-symbol-picker{display:grid;gap:.5rem;margin-top:.5rem;padding:.625rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
.awp .awp-symbol-search{flex:1 1 12rem;width:auto;min-width:0;max-width:100%;border:1px solid #8191a9;background:white;border-radius:7px;padding:.5625rem}
.awp-symbol-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.5rem,1fr));gap:.375rem;max-height:11rem;overflow:auto}
.awp .awp-symbol-grid button{min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;padding:.35rem;font-size:.75rem}
.awp-symbol-grid img{width:28px;height:28px;object-fit:contain}
@media(prefers-reduced-motion:reduce){.awp *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

  // This factory is embedded verbatim in the offline file; keep it dependency-free.
  function styleCardSurface(surface, options, core) {
    const doc = surface.ownerDocument, win = doc.defaultView;
    let reader = win.__alloWordPracticeReader || {}, liveReader = false;
    try { if (win.__alloReadingSettings && typeof win.__alloReadingSettings.get === 'function') { reader = win.__alloReadingSettings.get() || reader; liveReader = true; } } catch (_) { /* use the portable snapshot */ }
    // The reader's base size (html font-size) scales the viewport part too; rem already follows it.
    const appearance = core.cardAppearance(options, reader), base = (() => { if (liveReader && Number(reader.baseFontSize) > 0) return Math.max(10, Math.min(48, Number(reader.baseFontSize))) / 16; try { return (parseFloat(win.getComputedStyle(doc.documentElement).fontSize) || 16) / 16; } catch (_) { return 1; } })(), scale = appearance.textScale;
    surface.dataset.awpCardFont = options.cardFont;
    surface.dataset.awpReaderFont = String(!!reader.fontFamily);
    // The host and portable reader CSS apply Andika variants to descendants.
    // Restore card weights when an explicit card font overrides that variant.
    surface.dataset.awpTextStyle = options.cardTextStyle || 'default';
    surface.dataset.awpReaderVariant = String(surface.dataset.awpTextStyle !== 'default' || ['font-andika-italic', 'font-andika-bold-italic'].includes(reader.fontClass));
    surface.style.setProperty('--awp-card-font-style', appearance.fontStyle || 'normal');
    if (appearance.fontWeight) surface.style.setProperty('--awp-reader-weight', appearance.fontWeight);
    else surface.style.removeProperty('--awp-reader-weight');
    surface.dataset.awpReaderSpacing = String(Number.isFinite(Number(reader.lineHeight)) || Number.isFinite(Number(reader.letterSpacing)));
    surface.dataset.awpReadingTheme = options.cardTheme === 'paper' ? reader.readingTheme || 'default' : 'default';
    surface.style.colorScheme = options.cardTheme === 'paper' && ['dark', 'highContrast'].includes(reader.readingTheme) ? 'dark' : 'light';
    if (Number.isFinite(Number(reader.lineHeight))) surface.style.setProperty('--allo-reader-line-height', Math.max(1, Math.min(4, Number(reader.lineHeight))));
    if (Number.isFinite(Number(reader.letterSpacing))) surface.style.setProperty('--allo-reader-letter-spacing', Math.max(-0.05, Math.min(0.5, Number(reader.letterSpacing))) + 'em');
    surface.style.setProperty('--awp-card-font-family', appearance.fontFamily);
    ['background', 'heading', 'text', 'accent', 'muted', 'border'].forEach(name => surface.style.setProperty('--awp-card-' + name, '#' + appearance[name]));
    const clamp = (minimum, viewport, maximum, factor = scale) => 'clamp(' + minimum * factor + 'rem,' + viewport * factor * base + 'vw,' + maximum * factor + 'rem)';
    surface.querySelectorAll('.awp-word,.awp-preview-word').forEach(word => { const variation = Number(word.dataset.awpWordScale) || 1; word.style.fontSize = clamp(1.875, 9 * variation, 7 * variation, appearance.wordScale); });
    surface.querySelectorAll('.awp-detail,.awp-preview-detail').forEach(node => {
      let factor = scale;
      if (node.querySelector('.awp-translation,.awp-preview-translation')) factor = appearance.translationScale;
      else if (node.matches('.awp-definition,.awp-example,.awp-origin,.awp-preview-definition,.awp-preview-example,.awp-preview-origin')) factor = appearance.meaningScale;
      node.style.fontSize = clamp(1.25, 3, 2.125, factor);
    });
    surface.querySelectorAll('.awp-phonemes,.awp-preview-sounds').forEach(node => { node.style.fontSize = clamp(1.75, 6, 4.5); });
    surface.querySelectorAll('.awp-choices button,.awp-preview-choice').forEach(node => { node.style.fontSize = clamp(1.25, 3, 1.875); });
    surface.querySelectorAll('.awp-feedback,.awp-preview-feedback').forEach(node => { node.style.fontSize = 1.25 * scale + 'rem'; });
    surface.querySelectorAll('.awp-note').forEach(node => { node.style.fontSize = .875 * scale + 'rem'; });
    surface.querySelectorAll('.awp-language-name,.awp-preview-language-name').forEach(node => { node.style.fontSize = clamp(.875, 2.1, 1.4875, appearance.translationScale); });
    surface.querySelectorAll('.awp-sentence-prompt,.awp-preview-prompt').forEach(node => {
      // CJK characters occupy roughly twice the width of a Latin letter. Keep
      // short prompts centered, but give longer prose a steady reading edge.
      const value = node.textContent, wide = /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]/u;
      const width = Array.from(value).reduce((sum, char) => sum + (wide.test(char) ? 2 : 1), 0);
      node.dataset.prose = String(/[\r\n]/.test(value) || width > 120);
    });
    // Bionic formatting touches only instructional text, leaving annotation
    // controls, language spans, event handlers and the original text intact.
    const continuousScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
    const segmenters = new Map();
    function segments(value, locale, granularity) {
      const key = granularity + ':' + locale;
      try {
        if (!segmenters.has(key)) segmenters.set(key, win.Intl?.Segmenter ? new win.Intl.Segmenter(locale || undefined, { granularity }) : null);
        const segmenter = segmenters.get(key);
        return segmenter ? Array.from(segmenter.segment(value)) : null;
      } catch (_) {
        segmenters.set(key, null);
        return null;
      }
    }
    const passages = surface.querySelectorAll('.awp-word,.awp-preview-word,.awp-detail,.awp-preview-detail,.awp-choices button,.awp-preview-choice');
    passages.forEach(passage => {
      if (passage.dataset.awpBionic === String(!!reader.bionic)) return;
      passage.querySelectorAll('b[data-awp-bionic]').forEach(bold => { const parent = bold.parentNode; bold.replaceWith(doc.createTextNode(bold.textContent)); parent.normalize(); });
      passage.dataset.awpBionic = String(!!reader.bionic);
      if (!reader.bionic) return;
      const walker = doc.createTreeWalker(passage, 4), nodes = [];
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('.allo-anno-scope,b,script,style')) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const value = node.nodeValue, fragment = doc.createDocumentFragment(); let end = 0;
        const locale = node.parentElement.closest('[lang]')?.lang || undefined;
        for (const match of value.matchAll(/\p{L}[\p{L}\p{M}\u200c\u200d]*/gu)) {
          // Keep writing without spaces intact when its word boundaries are unknown.
          const words = continuousScript.test(match[0])
            ? (segments(match[0], locale, 'word') || []).filter(part => part.isWordLike)
            : [{ segment: match[0], index: 0 }];
          for (const part of words) {
            const word = part.segment, start = match.index + part.index;
            let letters = segments(word, locale, 'grapheme')?.map(unit => unit.segment);
            // A basic alphabetic word can still be emphasized offline without
            // Intl. Leave complex scripts alone rather than split a grapheme.
            if (!letters && /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Hebrew}\p{Script=Arabic}\p{M}]+$/u.test(word)) letters = word.match(/\p{L}\p{M}*/gu);
            if (!letters?.length) continue;
            fragment.appendChild(doc.createTextNode(value.slice(end, start)));
            const split = Math.ceil(letters.length / 2), bold = doc.createElement('b');
            bold.dataset.awpBionic = 'true'; bold.textContent = letters.slice(0, split).join('');
            fragment.append(bold, doc.createTextNode(letters.slice(split).join(''))); end = start + word.length;
          }
        }
        if (!end) return;
        fragment.appendChild(doc.createTextNode(value.slice(end))); node.replaceWith(fragment);
      });
    });
  }
  function watchCardReading(surface, getOptions, core) {
    const win = surface.ownerDocument.defaultView, api = win.__alloReadingSettings;
    const refresh = () => styleCardSurface(surface, getOptions(), core);
    refresh();
    const unsubscribe = api && typeof api.subscribe === 'function' ? api.subscribe(refresh) : null;
    return typeof unsubscribe === 'function' ? unsubscribe : () => {};
  }
  function appearanceControls(parent, options, label, onChange, prefix, uiLanguage, core) {
    const doc = parent.ownerDocument, controls = {};
    parent.classList.add('awp-primary-appearance-controls');
    const defaults = core.normalizeOptions({}), reset = doc.createElement('button');
    let percent;
    try { percent = new doc.defaultView.Intl.NumberFormat(uiLanguage.tag || 'en', { style: 'percent' }); } catch (_) { /* use plain percentages */ }
    const sizeLabel = scale => percent ? percent.format(scale) : Math.round(scale * 100) + '%';
    const sizeFields = ['cardTextScale', 'wordTextScale', 'meaningTextScale', 'translationTextScale'];
    controls.read = () => ({
      cardFont: controls.cardFont.value, cardTextStyle: controls.cardTextStyle.value, cardTheme: controls.cardTheme.value,
      ...Object.fromEntries(sizeFields.map(name => [name, Number(controls[name].value)])),
    });
    const updateReset = () => reset.setAttribute('aria-disabled', String(Object.entries(controls.read()).every(([key, value]) => value === defaults[key])));
    const add = (name, key, fallback, choices, container = parent) => {
      const wrapper = doc.createElement('label'), caption = doc.createElement('span'), select = doc.createElement('select');
      label(caption, key, fallback); select.id = prefix + name; wrapper.htmlFor = select.id; caption.id = select.id + '-label'; select.setAttribute('aria-labelledby', caption.id);
      if (container !== parent) {
        const unit = doc.createElement('span'); label(unit, 'settings.text.size', 'Size');
        caption.append(' · ', unit);
      }
      wrapper.append(caption, select); container.appendChild(wrapper);
      choices.forEach(([value, text, translationKey]) => { const option = doc.createElement('option'); option.value = value; if (translationKey) label(option, translationKey, text); else option.textContent = text; select.appendChild(option); });
      select.addEventListener('change', () => { updateReset(); onChange(controls.read()); });
      controls[name] = select;
    };
    add('cardFont', 'card_font', 'Card font', [['default', 'Default font', 'font_default'], ['arial', 'Arial'], ['verdana', 'Verdana'], ['georgia', 'Georgia']]);
    add('cardTextStyle', 'card_text_style', 'Card text style', [
      ['default', 'Default', 'options.default'], ['regular', 'Regular', 'text_style_regular'], ['bold', 'Bold', 'text_style_bold'],
      ['italic', 'Italic', 'text_style_italic'], ['bold-italic', 'Bold Italic', 'text_style_bold_italic'],
    ]);
    const percentages = [0.85, 1, 1.2, 1.4].map(scale => [String(scale), sizeLabel(scale)]);
    add('cardTextScale', 'card_text_size', 'Card text size', percentages);
    add('cardTheme', 'card_style', 'Card style', [['paper', 'Plain', 'style_paper'], ['cream', 'Warm', 'style_cream'], ['mist', 'Blue tint', 'style_mist']]);
    const details = doc.createElement('details'), summary = doc.createElement('summary'), grid = doc.createElement('div');
    const summaryCaption = doc.createElement('bdi'); summary.appendChild(summaryCaption);
    details.className = 'awp-size-details'; grid.className = 'awp-appearance-controls'; details.append(summary, grid); parent.appendChild(details);
    const roles = [['wordTextScale', 'glossary.table_term', 'Term'], ['meaningTextScale', 'export.def_col', 'Definition'], ['translationTextScale', 'universal.translations', 'Translations']];
    roles.forEach(([name, key, fallback], index) => {
      const part = doc.createElement('span'); label(part, key, fallback);
      if (!index) { summaryCaption.lang = part.lang || 'und'; summaryCaption.dir = part.dir || 'auto'; }
      if (index) summaryCaption.append(' · '); summaryCaption.appendChild(part);
      add(name, key, fallback, percentages, grid);
    });
    reset.type = 'button'; reset.className = 'awp-appearance-reset';
    const action = doc.createElement('span'), scope = doc.createElement('span');
    label(action, 'common.reset', 'Reset'); label(scope, 'appearance', 'Card appearance');
    const resetCaption = doc.createElement('bdi'); resetCaption.lang = action.lang || 'und'; resetCaption.dir = action.dir || 'auto';
    resetCaption.append(action, ' · ', scope); reset.appendChild(resetCaption); parent.appendChild(reset);
    reset.onclick = () => {
      if (reset.getAttribute('aria-disabled') === 'true') return;
      controls.setOptions(defaults);
      // Use the same setup persistence / live styling path as a select change.
      controls.cardTextStyle.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
    };
    controls.setOptions = value => {
      controls.cardFont.value = value.cardFont; controls.cardTextStyle.value = value.cardTextStyle || 'default'; controls.cardTheme.value = value.cardTheme;
      for (const name of sizeFields) {
        const select = controls[name], size = value[name] ?? 1, scale = String(size);
        const previous = select.querySelector('[data-custom-size]');
        if (previous && previous.value !== scale) previous.remove();
        const sizes = [...select.options];
        if (!sizes.some(option => option.value === scale)) {
          const custom = doc.createElement('option'); custom.dataset.customSize = ''; custom.value = scale; custom.textContent = sizeLabel(size);
          select.insertBefore(custom, sizes.find(option => Number(option.value) > size) || null);
        }
        select.value = scale;
      }
      updateReset();
    };
    controls.setOptions(options); return controls;
  }
  // The selection is specific to this teaching set. Null preserves each entry's
  // authored order, including languages added later. [] deliberately hides all.
  function translationControls(parent, core, locale, label, onChange) {
    const doc = parent.ownerDocument;
    const make = (tag, owner, cls) => { const node = doc.createElement(tag); if (cls) node.className = cls; owner.appendChild(node); return node; };
    const menu = make('details', parent, 'awp-translation-menu'), summary = make('summary', menu);
    label(make('span', summary), 'universal.translations', 'Translations');
    let formatNumber = value => String(value), countLanguage = 'en';
    for (const language of [core.languageInfo(locale).tag || 'en', 'en']) {
      try {
        const number = new doc.defaultView.Intl.NumberFormat(language); number.format(0);
        countLanguage = core.languageInfo(number.resolvedOptions().locale).tag || 'en';
        formatNumber = value => number.format(value); break;
      } catch (_) { /* keep deterministic English counts without Intl support */ }
    }
    const ratio = (position, total) => formatNumber(position) + '/' + formatNumber(total);
    const count = make('bdi', summary), actions = make('div', menu, 'awp-translation-actions');
    count.lang = countLanguage; count.dir = 'ltr';
    const all = make('button', actions), none = make('button', actions);
    all.type = none.type = 'button'; label(all, 'readinglib_all_languages', 'All languages'); label(none, 'word_sounds.deselect_all', 'Deselect All');
    const list = make('div', menu, 'awp-translation-list'), status = make('span', menu, 'awp-sr'); status.setAttribute('role', 'status');
    let selection = null, lastItems = [], lastOptions = {}, signature = '';
    const change = next => {
      const normalized = core.normalizeOptions({ translationLanguages: next }).translationLanguages;
      // A legacy pack can have more languages than a portable explicit list.
      // Keep All intact until the teacher chooses a representable subset.
      if (next && normalized.length !== next.length) { signature = ''; update(lastItems, lastOptions); return; }
      update(lastItems, { ...lastOptions, translationLanguages: normalized }); onChange(selection);
    };
    all.onclick = () => change(null); none.onclick = () => change([]);
    function update(items, options) {
      lastItems = items; lastOptions = options; selection = options.translationLanguages ?? null;
      if (options.mode !== 'vocabulary') { menu.hidden = true; signature = ''; return; }
      const names = new Map();
      for (const item of items) for (const entry of item.translations) {
        const key = core.translationLanguageKey(entry.language);
        if (!names.has(key)) names.set(key, entry.language);
      }
      menu.hidden = !names.size;
      if (menu.hidden) { signature = ''; return; }
      const fingerprint = JSON.stringify([Array.from(names), selection]);
      if (fingerprint === signature) return;
      signature = fingerprint;
      const included = selection === null ? [...names.keys()] : selection.filter(key => names.has(key));
      const chosen = new Set(included), order = [...included, ...[...names.keys()].filter(key => !chosen.has(key))];
      const active = doc.activeElement, focused = list.contains(active) ? [active.closest('.awp-translation-row')?.dataset.key, active.dataset.action] : null;
      const scroll = list.scrollTop; list.replaceChildren(); count.textContent = ' · ' + ratio(included.length, names.size);
      all.setAttribute('aria-pressed', String(selection === null)); none.setAttribute('aria-pressed', String(selection !== null && !selection.length));
      let restore = null;
      for (const key of order) {
        const row = make('div', list, 'awp-translation-row'); row.dataset.key = key;
        const caption = make('label', row), checkbox = make('input', caption); checkbox.type = 'checkbox';
        checkbox.checked = chosen.has(key); checkbox.dataset.action = 'check';
        const name = make('span', caption);
        if (key) {
          const display = core.languageLabel(names.get(key), locale);
          name.textContent = display.text; name.lang = display.language.tag || 'und'; name.dir = display.language.dir || 'auto';
        } else label(name, 'word_sounds.pack_maint_language_unspecified', 'Unspecified');
        const selectedKeys = selection === null ? included : selection;
        checkbox.disabled = selection === null ? included.length - 1 > core.LIMITS.translationLanguages : !chosen.has(key) && selectedKeys.length >= core.LIMITS.translationLanguages;
        checkbox.onchange = () => change(checkbox.checked ? [...selectedKeys, key] : selectedKeys.filter(value => value !== key));
        if (focused?.[0] === key) restore = checkbox;
        if (!chosen.has(key) || included.length < 2) continue;
        const position = included.indexOf(key);
        for (const delta of [-1, 1]) {
          const move = make('button', row), action = delta < 0 ? 'up' : 'down';
          move.type = 'button'; move.dataset.action = action;
          const arrow = make('span', move); arrow.textContent = delta < 0 ? '↑' : '↓'; arrow.setAttribute('aria-hidden', 'true');
          const cue = make('span', move, 'awp-sr'); label(cue, 'common.move_' + action, delta < 0 ? 'Move up' : 'Move down');
          cue.append(' · ', name.cloneNode(true)); move.title = cue.textContent;
          const neighbour = included[position + delta], blocked = neighbour === undefined || selectedKeys.length > core.LIMITS.translationLanguages;
          move.setAttribute('aria-disabled', String(blocked));
          move.onclick = () => {
            if (blocked) return;
            const next = selectedKeys.slice(), a = next.indexOf(key), b = next.indexOf(neighbour);
            [next[a], next[b]] = [next[b], next[a]]; change(next);
            status.replaceChildren(name.cloneNode(true), doc.createTextNode(' · '));
            const positionLabel = make('bdi', status); positionLabel.lang = countLanguage; positionLabel.dir = 'ltr';
            positionLabel.textContent = ratio(position + delta + 1, included.length);
          };
          if (focused?.[0] === key && focused[1] === action) restore = move;
        }
      }
      list.scrollTop = scroll;
      if (restore) { restore.focus({ preventScroll: true }); restore.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
    }
    return { update, read: () => selection };
  }
  // Shared by the app and the self-contained player. Finish validation before
  // touching the current round, including its unsaved card annotations.
  async function readWordSetFile(file, core, label) {
    if (file.size > core.LIMITS.setFileBytes) throw new Error(label('set_too_large', 'This word set is too large. Use a file smaller than 32 MB.'));
    let raw;
    try { raw = JSON.parse(await file.text(), (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v); }
    catch (_) { throw new Error(label('set_invalid_file', 'Choose a valid word set JSON file.')); }
    const imported = core.normalizeInput(raw);
    if (!imported.items.length) throw new Error(label('set_no_words', 'This file does not contain a word list.'));
    if (Array.isArray(raw?.items) && imported.items.length !== raw.items.length) throw new Error(label('set_invalid_file', 'Choose a valid word set JSON file.'));
    return imported;
  }
  function trackWordSetEdits(review, cardNotes, core) {
    let savedMarks, savedNotes, readContent, savedContent;
    const edited = new Set();
    const signature = list => JSON.stringify(core.normalizeAnnotations(list).map(note => {
      if (note.kind !== 'highlight' || !note.anchor) return note;
      const { x, y, w, h, rects, ...anchored } = note;
      return anchored;
    }));
    function saved() {
      savedMarks = new Set(review);
      savedNotes = new Map([...cardNotes].filter(([, list]) => list?.length).map(([id, list]) => [id, signature(list)]));
      edited.clear();
      if (readContent) savedContent = readContent();
    }
    saved();
    return {
      saved,
      snapshot() { return JSON.stringify({ marks: [...review].sort(), notes: [...cardNotes].filter(([, list]) => list?.length).map(([id, list]) => [id, signature(list), list.some(note => note.pending)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))), content: readContent ? readContent() : null }); },
      watchContent(read) { readContent = read; savedContent = read(); },
      noteSaved(id, list) { if (!list.some(note => note.pending)) { savedNotes.set(id, signature(list)); edited.delete(id); } },
      noteChanged(id, list) {
        try {
          if (list.some(note => note.pending) || signature(list) !== (savedNotes.get(id) || '[]')) edited.add(id);
          else edited.delete(id);
        } catch (_) {
          // An unexportable edit still needs a choice before replacing the set.
          edited.add(id);
        }
      },
      dirty() { return (readContent && readContent() !== savedContent) || edited.size > 0 || savedMarks.size !== review.size || [...review].some(id => !savedMarks.has(id)); }
    };
  }

  function confirmWordSetDownload(doc, label, guard, snapshot, signal) {
    if (signal?.aborted) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const dialog = doc.createElement('dialog'), heading = doc.createElement('h2'), help = doc.createElement('p');
      heading.textContent = label('download_started', 'Download started');
      help.textContent = label('confirm_download_help', 'Check that the word set file is in your downloads before confirming. If the download was cancelled or blocked, keep editing and try again.');
      dialog.setAttribute('aria-label', heading.textContent); dialog.dir = 'auto'; dialog.append(heading, help);
      let settled = false;
      const finish = (saved, error) => {
        if (settled) return; settled = true; signal?.removeEventListener('abort', cancel);
        if (dialog.open && typeof dialog.close === 'function') dialog.close(); dialog.remove();
        if (error) reject(error); else resolve(saved);
      };
      const cancel = () => finish(false);
      const add = (key, fallback, action) => { const button = doc.createElement('button'); button.type = 'button'; button.textContent = label(key, fallback); button.style.margin = '4px'; button.style.minHeight = '44px'; button.onclick = action; dialog.appendChild(button); return button; };
      add('confirm_download_saved', 'I saved the file', () => {
        if (guard.snapshot() !== snapshot) { finish(false, new Error(label('download_newer_changes', 'More changes were made after this download. Download the updated word set before confirming it is saved.'))); return; }
        guard.saved(); finish(true);
      });
      const back = add('keep_editing', 'Keep editing', cancel);
      dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
      dialog.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Escape' && !(event.isComposing || event.keyCode === 229)) { event.preventDefault(); cancel(); } });
      signal?.addEventListener('abort', cancel, { once: true }); doc.body.appendChild(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); back.focus();
    });
  }

  function allowWordSetOpen(doc, label, guard, save, signal, intent = 'open') {
    if (signal.aborted) return Promise.resolve(false);
    if (!guard.dirty()) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      const dialog = doc.createElement('dialog');
      const heading = doc.createElement('h2');
      const saveController = new doc.defaultView.AbortController(); let settled = false, saving = false;
      heading.textContent = intent === 'close' ? label('unsaved_close', 'Save changes to this word set before closing?') : label('unsaved_set', 'Save changes to this word set before opening another?');
      dialog.setAttribute('aria-label', heading.textContent);
      dialog.appendChild(heading);
      const finish = (allow, error) => {
        if (settled) return; settled = true; saveController.abort();
        signal.removeEventListener('abort', cancel);
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        dialog.remove();
        if (error) reject(error); else resolve(allow);
      };
      const cancel = () => finish(false);
      const add = (key, fallback, action) => {
        const button = doc.createElement('button');
        button.type = 'button'; button.textContent = label(key, fallback);
        button.style.margin = '4px'; button.style.minHeight = '44px';
        button.onclick = action; dialog.appendChild(button); return button;
      };
      add(intent === 'close' ? 'save_and_close' : 'save_and_open', intent === 'close' ? 'Save and close' : 'Save and open', async () => { if (saving) return; saving = true; try { const saved = await save(saveController.signal); if (!settled) finish(saved === true); } catch (error) { finish(false, error); } });
      add(intent === 'close' ? 'close_without_saving' : 'open_without_saving', intent === 'close' ? 'Close without saving' : 'Open without saving', () => finish(true));
      const back = add('cancel', 'Cancel', cancel);
      dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
      dialog.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape' && !(event.isComposing || event.keyCode === 229)) { event.preventDefault(); cancel(); }
      });
      signal.addEventListener('abort', cancel, { once: true });
      doc.body.appendChild(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      back.focus();
    });
  }

  function mountPlayer(host, pack, options, initialSequence, core, hooks = {}) {
    const doc = host.ownerDocument, win = doc.defaultView;
    const labels = (hooks && hooks.labels) || {};
    const uiLanguage = core.languageInfo(hooks.uiLanguage || labels.__uiLanguage || (Object.keys(labels).length ? '' : 'English'));
    const labelLanguages = labels.__languages || {}, resolvedLabels = new Map();
    const language = (node, value) => { const info = typeof value === 'object' ? value : core.languageInfo(value); node.lang = info.tag || 'und'; node.dir = info.dir || 'auto'; return node; };
    const L = (key, fallback, params) => { const supplied = typeof labels[key] === 'string' && labels[key]; let text = supplied || fallback; Object.keys(params || {}).forEach(p => { text = text.split('{' + p + '}').join(String(params[p])); }); resolvedLabels.set(text, labelLanguages[key] || (supplied && supplied !== fallback ? uiLanguage : core.languageInfo('English'))); return text; };
    const setLabel = (node, key, fallback, params) => { node.textContent = L(key, fallback, params); return language(node, resolvedLabels.get(node.textContent)); };
    const fieldLanguage = (item, field) => core.fieldLanguage(item, field, pack.language);
    let sequence = initialSequence.slice(), index = 0, revealed = false, running = false, timer = null, dead = false, finished = false;
    let audio = null, audioRun = 0, finishAudio = null;
    const review = hooks.review || new Set(pack.reviewItemIds);
    const items = new Map(pack.items.map(item => [item.id, item]));
    const playable = core.playableItems(pack, options);
    const markedCards = () => playable.filter(item => review.has(item.id));
    host.classList.add('awp', 'awp-player');
    language(host, uiLanguage);
    const make = (tag, text, cls, parent) => { const node = doc.createElement(tag); if (text != null) { node.textContent = text; if (resolvedLabels.has(text)) language(node, resolvedLabels.get(text)); } if (cls) node.className = cls; (parent || host).appendChild(node); return node; };
    const passage = (parent, text, value, cls, tag = 'span') => language(make(tag, text, cls || '', parent), value);
    function labeledPassage(node, key, fallback, name, text, value) {
      const marker = '\ufff0', template = L(key, fallback, { [name]: marker });
      const parts = template.split(marker);
      node.replaceChildren(); language(node, resolvedLabels.get(template));
      if (parts.length === 2) { node.appendChild(doc.createTextNode(parts[0])); passage(node, text, value); node.appendChild(doc.createTextNode(parts[1])); }
      else { node.appendChild(doc.createTextNode(template + ' ')); passage(node, text, value); }
    }
    const button = (text, callback, parent, cls) => { const node = make('button', text, cls, parent); node.type = 'button'; node.addEventListener('click', callback); return node; };
    const header = make('div', null, 'awp-head');
    if (pack.title === 'Word Fluency Pop-Up') make('h1', L('mode_popup', 'Word Fluency Pop-Up'), '', header);
    else passage(header, pack.title, pack.language, '', 'h1');
    const headerActions = make('div', null, 'awp-row', header);
    if (hooks.onBack) button(L('back_to_setup', 'Back to setup'), () => { destroy(); hooks.onBack(); }, headerActions);
    const fullscreen = button(L('full_screen', 'Full screen'), async () => { try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (host.requestFullscreen) await host.requestFullscreen(); else setLabel(status, 'full_screen_unavailable', 'Full screen is unavailable in this browser.'); } catch (_) { setLabel(status, 'full_screen_unavailable', 'Full screen is unavailable in this browser.'); } }, headerActions);
    if (typeof hooks.openReadingSettings === 'function') { const reading = button('Aa', event => hooks.openReadingSettings(event.currentTarget), headerActions, 'awp-aa'); reading.setAttribute('aria-label', L('reading_settings', 'Reading settings')); reading.setAttribute('aria-haspopup', 'dialog'); }
    const appearancePanel = make('details', null, 'awp-appearance-panel');
    make('summary', L('appearance', 'Card appearance'), '', appearancePanel);
    const appearanceFields = make('div', null, 'awp-appearance-controls', appearancePanel);
    let appearancePrefix = 'awp-player-appearance-'; while (doc.getElementById(appearancePrefix + 'cardFont')) appearancePrefix += 'x';
    appearanceControls(appearanceFields, options, setLabel, patch => {
      options = core.normalizeOptions({ ...options, ...patch }); styleCardSurface(stage, options, core);
      if (typeof hooks.onAppearanceChange === 'function') hooks.onAppearanceChange(patch);
    }, appearancePrefix, uiLanguage, core);
    const translationSettings = translationControls(appearancePanel, core, hooks.uiLanguage || labels.__uiLanguage || 'English', setLabel, translationLanguages => {
      options = core.normalizeOptions({ ...options, translationLanguages });
      if (current() && !finished) renderCard();
      if (typeof hooks.onAppearanceChange === 'function') hooks.onAppearanceChange({ translationLanguages });
    });
    translationSettings.update(pack.items, options);
    const progress = make('p', '', 'awp-progress');
    const omitted = options.includeAudio ? (hooks.audioIssues || core.audioIssueCounts(pack)).staleLanguage : 0;
    if (omitted) { const warning = make('p', L(omitted === 1 ? 'audio_language_omitted_one' : 'audio_language_omitted', omitted === 1 ? '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.' : '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.', { count: omitted }), 'awp-note awp-audio-warning'); warning.setAttribute('role', 'status'); }
    if (hooks.allowWebPictures === false && options.includePictures && pack.items.some(item => /^https:/i.test(item.picture?.src || ''))) {
      make('p', L('set_linked_pictures', 'This offline file shows descriptions and credits instead of linked pictures.'), 'awp-note');
    }
    const stage = make('div', null, 'awp-stage');
    stage.tabIndex = 0; stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', L('practice_card', 'Practice card'));
    const card = make('div', null, 'awp-card', stage);
    const announcement = make('p', '', 'awp-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite'); announcement.setAttribute('aria-atomic', 'true');
    const toolbar = make('div', null, 'awp-row');
    const previous = button(L('previous', 'Previous'), () => move(-1), toolbar);
    const next = button(L('next', 'Next'), () => move(1), toolbar, 'awp-primary');
    const reveal = button(L('reveal_answer', 'Reveal answer'), () => { revealed = true; renderCard(); schedule(); }, toolbar);
    const wordButton = button(L('hear_word', 'Hear word'), () => playClips([current().wordAudio]), toolbar);
    const soundsButton = button(L('hear_sounds', 'Hear sounds'), () => playClips(current().phonemes.map(sound => sound.audio)), toolbar);
    const timerButton = button(L('start_timer', 'Start timer'), () => { running = !running; updateTimer(); schedule(); }, toolbar);
    timerButton.hidden = !options.autoAdvance;
    const reviewButton = button(L('add_to_review', 'Add to review'), () => { const id = current().id; if (review.has(id)) review.delete(id); else review.add(id); updateReview(); }, toolbar, 'awp-review');
    // Share the same suite in the app and in the bundled offline player.
    const suite = win.AlloModules && win.AlloModules.AnnotationSuite;
    const cardNotes = hooks.annotationStore || new Map(pack.items.map(item => [item.id, item.annotations || []]));
    const editGuard = hooks.editGuard || trackWordSetEdits(review, cardNotes, core);
    if (!hooks.editGuard) editGuard.watchContent(() => JSON.stringify(options));
    let openingSet, savingSet;
    let annotate = null, annotateOpen = false, visibleDocument = null, annotationFaceHelp = null;
    const documents = new Map();
    function annotationDocument(itemId, clue) {
      const key = JSON.stringify([itemId, clue]);
      if (!documents.has(key)) documents.set(key, { key, itemId, clue });
      return documents.get(key);
    }
    function faceNotes(scope) {
      return (cardNotes.get(scope.itemId) || []).filter(note => (note.recallClue === true) === scope.clue);
    }
    function mergeFace(scope, notes) {
      const others = (cardNotes.get(scope.itemId) || []).filter(note => (note.recallClue === true) !== scope.clue);
      const edited = notes.map(note => {
        if (scope.clue) return note.recallClue === true ? note : { ...note, recallClue: true };
        if (!note.recallClue) return note;
        const { recallClue, ...answerNote } = note; return answerNote;
      });
      return [...others, ...edited];
    }
    function captureCardGeometry() {
      if (!visibleDocument) return;
      const previous = faceNotes(visibleDocument);
      if (!previous.some(note => note.kind === 'highlight') || !annotate?.snapshotAnnotations) return;
      const visible = annotate.snapshotAnnotations();
      if (!Array.isArray(visible)) return;
      const list = mergeFace(visibleDocument, visible);
      const item = items.get(visibleDocument.itemId);
      if (!item) return;
      item.annotations = list;
      item.annotationViewport = { width: stage.clientWidth || 1000, height: stage.scrollHeight || 600 };
      cardNotes.set(visibleDocument.itemId, list);
      // Save a recovered text anchor once on card navigation. Changes to
      // rectangle geometry alone are only needed in the export snapshot.
      const oldHighlightIds = new Set(previous.filter(note => note.kind === 'highlight' && !note.anchor).map(note => note.id));
      const recoveredAnchor = visible.some(note => note.anchor && oldHighlightIds.has(note.id));
      hooks.onAnnotationsChange?.(visibleDocument.itemId, list, item.annotationViewport, recoveredAnchor);
    }
    if (suite && typeof suite.mountWorkspace === 'function') {
      const annotateButton = button(L('annotate', 'Annotate'), () => {
        annotateOpen = !annotateOpen; annotateButton.setAttribute('aria-expanded', String(annotateOpen));
        if (annotateOpen) { running = false; updateTimer(); schedule(); }
        if (annotationFaceHelp) annotationFaceHelp.hidden = !annotateOpen || !meaningFirst();
        if (annotate) annotate.update({ showTools: annotateOpen });
      }, toolbar);
      annotateButton.setAttribute('aria-expanded', 'false');
      annotationFaceHelp = make('p', L('recall_annotations_help', 'Annotations stay on this side of the card.'), 'awp-note');
      annotationFaceHelp.hidden = true;
      const tools = make('div', null, 'allo-anno-scope awp-anno-tools');
      const layer = make('div', null, 'allo-anno-scope awp-anno-layer', stage);
      const listLayer = make('div', null, 'allo-anno-scope', host);
      stage.setAttribute('data-allo-anno-host', 'true');
      annotate = suite.mountWorkspace(tools, {
        hostEl: stage, contentEl: card, layerEl: layer, sidebarEl: listLayer, showTools: false, annotations: [], documentKey: '',
        isTeacher: hooks.isTeacher !== false, t: hooks.t || ((key) => (hooks.annotationLabels || {})[key] || key), onToast: hooks.onToast,
        onChange: (edited, documentKey) => {
          const scope = documentKey ? documents.get(documentKey) : visibleDocument;
          if (!scope) return;
          const key = scope.itemId, list = mergeFace(scope, edited);
          cardNotes.set(key, list);
          const item = items.get(key);
          if (item) {
            item.annotations = list;
            if (scope === visibleDocument) item.annotationViewport = { width: stage.clientWidth || 1000, height: stage.scrollHeight || 600 };
          }
          editGuard.noteChanged(key, list);
          const saved = hooks.onAnnotationsChange?.(key, list, item && item.annotationViewport, true);
          if (saved === true) editGuard.noteSaved(key, list);
          if (typeof saved === 'boolean') {
            const message = saved ? L('annotations_saved', 'Saved to glossary') : L('annotations_not_saved', 'This card could not be saved to the glossary. Save the word set to keep your annotations.');
            if (status.textContent !== message) { status.textContent = message; language(status, resolvedLabels.get(message)); }
          }
          if (annotate && scope === visibleDocument) annotate.update({ annotations: faceNotes(scope) });
        },
        onModeChange: mode => { stage.dataset.awpAnnotating = mode ? 'true' : 'false'; },
      });
    }
    const footer = make('div', null, 'awp-footer awp-gap');
    const roundButtons = make('div', null, 'awp-row', footer);
    if (!hooks.onBack) {
      async function saveCurrentSet(signal) {
        if (savingSet || signal?.aborted) return false;
        const controller = new win.AbortController(); savingSet = controller;
        const cancel = () => controller.abort(); signal?.addEventListener('abort', cancel, { once: true });
        try {
        captureCardGeometry();
        if ([...cardNotes.values()].some(list => list.some(note => note.pending))) throw new Error(L('finish_recording_to_save', 'Finish the recording before saving this set.'));
        const saved = { ...pack, options, reviewItemIds: [...review], items: pack.items.map(item => ({ ...item, annotations: cardNotes.get(item.id) || item.annotations || [] })) };
        const blob = new win.Blob([core.serializePack(saved)], { type: 'application/json' });
        if (blob.size > core.LIMITS.setFileBytes) throw new Error(L('set_save_too_large', 'This set exceeds 32 MB. Use Save annotations on individual cards to keep your notes.'));
        const snapshot = editGuard.snapshot();
        const url = win.URL.createObjectURL(blob), link = doc.createElement('a');
        link.href = url; link.download = 'word-practice.json';
        try { doc.body.appendChild(link); link.click(); } finally { link.remove(); win.setTimeout(() => win.URL.revokeObjectURL(url), 30000); }
        setLabel(status, 'download_started', 'Download started');
        const confirmed = await confirmWordSetDownload(doc, L, editGuard, snapshot, controller.signal);
        if (!dead) setLabel(status, confirmed ? 'download_confirmed' : 'download_unconfirmed', confirmed ? 'Download confirmed. Your current word set changes are marked as saved.' : 'Download not confirmed. Your unsaved changes are still protected.');
        return confirmed;
        } finally { signal?.removeEventListener('abort', cancel); if (savingSet === controller) savingSet = null; }
      }
      button(L('save_set', 'Save word set'), async () => {
        try { await saveCurrentSet(); } catch (error) { status.textContent = error.message || L('set_invalid_file', 'Choose a valid word set JSON file.'); }
      }, roundButtons);
      const fileInput = make('input', null, '', roundButtons);
      fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
      fileInput.setAttribute('aria-label', L('open_set', 'Open word set'));
      let attempt = 0;
      const openSet = button(L('open_set', 'Open word set'), () => {
        attempt++; openingSet?.abort(); openSet.removeAttribute('aria-busy');
        running = false; updateTimer(); schedule(); stopAudio();
        fileInput.value = ''; fileInput.click();
      }, roundButtons);
      fileInput.addEventListener('cancel', () => { if (!dead) openSet.focus(); });
      fileInput.addEventListener('change', async () => {
        openingSet?.abort();
        openingSet = new win.AbortController();
        const signal = openingSet.signal;
        const token = ++attempt, file = fileInput.files?.[0];
        if (!file) { openSet.focus(); return; }
        openSet.setAttribute('aria-busy', 'true');
        try {
          const imported = await readWordSetFile(file, core, L);
          if (dead || token !== attempt) return;
          const nextSequence = core.createSequence(imported, imported.options);
          if (!nextSequence.length) throw new Error(L('empty', 'No words match this activity.'));
          if (!await allowWordSetOpen(doc, L, editGuard, saveCurrentSet, signal) || dead || token !== attempt) { if (!dead && token === attempt) openSet.focus(); return; }
          // Build the next player offscreen first so a failed import never
          // clears the visible deck or discards edits on its current card.
          const next = host.cloneNode(false);
          mountPlayer(next, imported, imported.options, nextSequence, core, { ...hooks, audioIssues: core.audioIssueCounts(imported) });
          destroy(); host.replaceWith(next); doc.title = imported.title;
          setLabel(next.querySelector('.awp-status'), 'set_opened', 'Word set opened.');
          const heading = next.querySelector('h1'); heading.tabIndex = -1; heading.focus();
        } catch (error) {
          if (!dead && token === attempt) { status.textContent = error.message || L('set_invalid_file', 'Choose a valid word set JSON file.'); openSet.focus(); }
        } finally {
          if (!dead && token === attempt) openSet.removeAttribute('aria-busy');
        }
      });
    }
    const roundPanel = make('div', null, 'awp-round-actions', roundButtons);
    const roundHeading = make('h2', L('round_finished', 'Round complete'), '', roundPanel);
    roundHeading.tabIndex = -1; roundHeading.hidden = true;
    const noMarks = make('p', L('no_marked_words', 'No words marked for review.'), 'awp-note', roundPanel);
    noMarks.hidden = true;
    const roundActions = make('div', null, 'awp-row awp-round-controls', roundPanel);
    const newRound = button(L('new_round', 'New round'), () => startRound(pack, options), roundActions);
    const reviewRound = button(L('start_review', 'Start review ({count})', { count: 0 }), () => startRound({ items: markedCards() }, { ...options, repetitions: 1 }), roundActions);
    make('p', options.autoAdvance ? L('keys_help_timed', 'Arrow keys or Page Up/Down: move · Space: start or pause timer · R: reveal · H/S: audio · M: review · F: full screen') : L('keys_help_manual', 'Arrow keys or Page Up/Down: move · Space: next card · R: reveal · H/S: audio · M: review · F: full screen'), 'awp-note', footer);
    const coarse = (() => { try { return !!(win.matchMedia && win.matchMedia('(any-pointer: coarse)').matches); } catch (_) { return false; } })();
    if (coarse) make('p', L('touch_help', 'Touch screens: tap the card to reveal, tap again for the next card, or swipe to move.'), 'awp-note awp-touch-help', footer);
    const status = make('p', '', 'awp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function current() { return items.get(sequence[index] && sequence[index].itemId); }
    // "Start with the meaning": the clue first, the word on reveal.
    function meaningFirst() { return options.mode === 'vocabulary' && options.vocabularyFirst === 'meaning' && core.hasMeaning(current(), options); }
    function blendPrompt() { return options.mode === 'blend' && !revealed && !!current()?.phonemes.length; }
    function updateAudioControls() {
      const item = current(), hideAnswer = (options.mode === 'sentence' || meaningFirst()) && !revealed;
      wordButton.hidden = !options.includeAudio || hideAnswer || blendPrompt(); soundsButton.hidden = !options.includeAudio || hideAnswer;
      wordButton.disabled = !item || !core.safeAudio(item.wordAudio);
      soundsButton.disabled = !item || !item.phonemes.length || item.phonemes.some(sound => !core.safeAudio(sound.audio));
    }
    function restoreToolbarFocus(focused) {
      if (focused && toolbar.contains(focused) && (focused.disabled || focused.hidden)) {
        stage.focus({ preventScroll: true }); stage.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    }
    function isGlobalMuted() {
      try {
        if (typeof win.__alloIsGlobalMuted === 'function' && win.__alloIsGlobalMuted()) return true;
        if (typeof win.isAlloMuted === 'function' && win.isAlloMuted()) return true;
        if (win._alloGlobalMute === true) return true;
        if (win.localStorage && (win.localStorage.getItem('alloflow-global-muted') === '1' || win.localStorage.getItem('alloflow_muted') === '1' || win.localStorage.getItem('alloflow_muted') === 'true')) return true;
      } catch (_) {}
      return false;
    }
    function stopAudio() { audioRun++; if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; } if (finishAudio) { finishAudio(); finishAudio = null; } }
    async function playClips(clips) {
      stopAudio();
      if (isGlobalMuted()) return;
      if (!clips.length || clips.some(clip => !core.safeAudio(clip))) { setLabel(status, 'recording_unavailable', 'The complete recording is not available for this word.'); return; }
      const run = audioRun;
      for (const clip of clips) {
        if (dead || run !== audioRun) return;
        const sound = new win.Audio(clip); audio = sound;
        const ok = await new Promise(resolve => {
          let settled = false;
          const done = value => { if (settled) return; settled = true; sound.onended = null; sound.onerror = null; resolve(value); };
          finishAudio = () => done(false); sound.onended = () => done(true); sound.onerror = () => done(false);
          try { const promise = sound.play(); if (promise && promise.catch) promise.catch(() => done(false)); } catch (_) { done(false); }
        });
        if (!ok) { if (!dead && run === audioRun) setLabel(status, 'recording_failed', 'This browser could not play the recording.'); return; }
      }
      if (run === audioRun) { audio = null; finishAudio = null; }
    }
    function updateTimer() { setLabel(timerButton, running ? 'pause_timer' : 'start_timer', running ? 'Pause timer' : 'Start timer'); timerButton.setAttribute('aria-pressed', String(running)); }
    function schedule() {
      if (timer) win.clearTimeout(timer); timer = null;
      if (!running || dead) return;
      if ((options.mode === 'sentence' || options.mode === 'spelling') && !revealed) return;
      // Timed meaning-first cards show the word before moving on.
      timer = win.setTimeout(() => { if ((meaningFirst() && !revealed) || blendPrompt()) { revealed = true; renderCard(); schedule(); } else move(1); }, options.intervalSeconds * 1000);
    }
    function updateReview() {
      const marked = current() && review.has(current().id);
      setLabel(reviewButton, marked ? 'remove_from_review' : 'add_to_review', marked ? 'Remove from review' : 'Add to review');
      reviewButton.setAttribute('aria-pressed', String(!!marked));
      const count = markedCards().length;
      if (finished && count) setLabel(reviewRound, count === 1 ? 'review_marked_one' : 'review_marked_many', count === 1 ? 'Review {count} marked word' : 'Review {count} marked words', { count });
      else setLabel(reviewRound, 'start_review', 'Start review ({count})', { count });
      reviewRound.disabled = !count; reviewRound.hidden = finished && !count;
      roundPanel.classList.toggle('awp-surface', finished); roundHeading.hidden = !finished;
      noMarks.hidden = !finished || count > 0;
      newRound.classList.toggle('awp-primary', finished && !count);
      reviewRound.classList.toggle('awp-primary', finished && count > 0);
    }
    function appendTranslation(parent, translation, clueWord) {
      if (translation.language) { const label = core.languageLabel(translation.language, hooks.uiLanguage || labels.__uiLanguage || 'English'); passage(parent, (clueWord ? core.maskWord(label.text, clueWord) : label.text) + ': ', label.language, 'awp-language-name'); }
      passage(parent, translation.text, translation.language, 'awp-translation');
    }
    // The glossary picture with its credit. A decorative picture is hidden from screen readers.
    function appendPicture(parent, picture) {
      const figure = make('figure', null, 'awp-picture', parent);
      const makeAltFallback = targetParent => {
        if (!picture.alt) return null;
        const description = make('span', picture.alt, 'awp-picture-fallback', targetParent);
        if (picture.usesClueLabel) language(description, labelLanguages.picture_clue || core.languageInfo('English'));
        return description;
      };
      if (hooks.allowWebPictures === false && /^https:/i.test(picture.src)) {
        makeAltFallback(figure);
      } else {
        const image = make('img', null, '', figure);
        image.src = picture.src; image.alt = picture.alt || ''; image.decoding = 'async';
        if (picture.usesClueLabel) language(image, labelLanguages.picture_clue || core.languageInfo('English'));
        if (!picture.alt) image.setAttribute('role', 'presentation');
        image.onerror = () => {
          image.onerror = null;
          if (!image.isConnected) return;
          if (picture.alt) {
            const description = doc.createElement('span');
            description.className = 'awp-picture-fallback';
            description.textContent = picture.alt;
            if (picture.usesClueLabel) language(description, labelLanguages.picture_clue || core.languageInfo('English'));
            image.replaceWith(description);
          } else {
            image.remove();
          }
        };
      }
      if (picture.credit) make('figcaption', picture.credit, '', figure);
    }
    function markHighlightFields(translations) {
      // Fields identify the selected occurrence even when the card's word,
      // translations or pictures appear/disappear on reveal. Masked clues are
      // different text from their unmasked answers.
      const authored = current().translations;
      card.dataset.alloHighlightComplete = String(options.mode === 'vocabulary' && revealed && translations.length === authored.length);
      const clue = meaningFirst() && !revealed ? 'clue-' : '';
      const fields = [
        ['.awp-word', 'word'], ['.awp-definition', clue + 'definition'], ['.awp-example', clue + 'example'],
        ['.awp-origin', 'origin'], ['.awp-sentence-prompt', 'sentence-prompt'], ['.awp-feedback', 'sentence-feedback'],
        ['.awp-meaning-prompt', 'meaning-prompt'], ['figcaption', clue + 'picture-credit']
      ];
      for (const [selector, name] of fields) {
        const field = card.querySelector(selector);
        if (field) field.dataset.alloHighlightField = name;
      }
      const sourceIndices = new Map(authored.map((entry, index) => [entry, index]));
      card.querySelectorAll('.awp-translation').forEach((text, i) => { text.parentElement.dataset.alloHighlightField = clue + 'translation:' + sourceIndices.get(translations[i]); });
      card.querySelectorAll('.awp-phoneme').forEach((text, i) => { text.dataset.alloHighlightField = 'phoneme:' + i; });
      card.querySelectorAll('.awp-choices button').forEach((button, i) => { button.dataset.alloHighlightField = 'choice:' + i; });
    }
    function renderCard() {
      // Choices are replaced on every card/reveal. Keep keyboard focus inside
      // the player when its focused choice is removed by that replacement.
      const focused = doc.activeElement, hadCardFocus = card.contains(focused);
      const choiceIndex = Array.from(card.querySelectorAll('.awp-choices button')).indexOf(doc.activeElement);
      captureCardGeometry();
      const item = current(), frame = sequence[index];
      const translations = core.visibleTranslations(item, options);
      const clue = meaningFirst() && !revealed ? core.recallClue({ ...item, translations }, L('picture_clue', 'Picture clue')) : null;
      visibleDocument = annotationDocument(item.id, !!clue);
      card.replaceChildren();
      stage.dataset.position = frame.position;
      const showWord = () => { const word = passage(card, item.word, fieldLanguage(item, 'term'), 'awp-word', 'div'); word.dataset.awpWordScale = String(frame.scale); };
      if (options.mode === 'sentence') {
        const activity = item.sentenceActivity;
        let wrongTries = 0;
        passage(card, activity.prompt, fieldLanguage(item, 'sentence'), 'awp-detail awp-sentence-prompt', 'p');
        const choices = make('div', null, 'awp-choices', card);
        const feedback = make('p', '', 'awp-feedback', card); feedback.setAttribute('role', 'status');
        if (revealed) labeledPassage(feedback, 'answer', 'Answer: {answer}', 'answer', activity.answer, fieldLanguage(item, 'term'));
        activity.choices.forEach(choice => {
          const choiceButton = language(button(choice, () => {
            if (revealed) return;
            if (core.key(choice) === core.key(activity.answer)) { labeledPassage(feedback, 'sentence_correct', 'Yes. {answer} completes the sentence.', 'answer', activity.answer, fieldLanguage(item, 'term')); revealed = true; reveal.disabled = true; choices.querySelectorAll('button').forEach(node => node.setAttribute('aria-disabled', 'true')); updateAudioControls(); schedule(); }
            else {
              wrongTries += 1;
              choiceButton.setAttribute('aria-disabled', 'true');
              choiceButton.dataset.awpTried = 'true';
              const base = L('sentence_try_again', 'Try another word. Read the whole sentence again.');
              feedback.replaceChildren();
              language(feedback, resolvedLabels.get(base));
              passage(feedback, choice, fieldLanguage(item, 'term'));
              feedback.appendChild(doc.createTextNode(' — ' + base + (wrongTries > 1 ? ' (' + wrongTries + ')' : '')));
            }
          }, choices), fieldLanguage(item, 'term'));
          // Keep a solved choice focusable for arrow-key navigation, while
          // exposing that further guesses no longer change this card.
          if (revealed) choiceButton.setAttribute('aria-disabled', 'true');
        });
      } else if (options.mode === 'spelling' && !revealed) {
        make('p', item.wordAudio && options.includeAudio ? L('spell_listen', 'Listen, then spell the word.') : L('spell_teacher', 'Ask your teacher to say the word, then spell it.'), 'awp-detail', card);
      } else if (blendPrompt()) {
        const sounds = language(make('div', null, 'awp-phonemes', card), fieldLanguage(item, 'term'));
        item.phonemes.forEach(sound => passage(sounds, sound.label, fieldLanguage(item, 'term'), 'awp-phoneme'));
        make('p', L('blend_help', 'Say the sounds, then blend the word.'), 'awp-note awp-gap', card);
      } else if (clue) {
        make('p', L('meaning_first_prompt', 'Which word matches this meaning?'), 'awp-note awp-meaning-prompt', card);
        if (options.includePictures && clue.picture) appendPicture(card, clue.picture);
        if (clue.definition) passage(card, clue.definition, fieldLanguage(item, 'definition'), 'awp-detail awp-gap awp-definition', 'p');
        if (clue.example) passage(card, clue.example, fieldLanguage(item, 'example'), 'awp-detail awp-example', 'p');
        clue.translations.forEach(translation => appendTranslation(make('p', null, 'awp-detail', card), translation, item.word));
      } else {
        showWord();
        if (options.mode === 'vocabulary' && revealed) {
          if (options.includePictures && item.picture) appendPicture(card, item.picture);
          if (item.definition) passage(card, item.definition, fieldLanguage(item, 'definition'), 'awp-detail awp-gap awp-definition', 'p');
          if (item.example) passage(card, item.example, fieldLanguage(item, 'example'), 'awp-detail awp-example', 'p');
          if (item.origin) labeledPassage(make('p', null, 'awp-detail awp-origin', card), 'word_origin', 'Word origin: {origin}', 'origin', item.origin, fieldLanguage(item, 'origin'));
          translations.forEach(translation => appendTranslation(make('p', null, 'awp-detail', card), translation));
          if (!item.definition && !item.example && !item.origin && !item.translations.length) make('p', L('no_meaning', 'No meaning or example has been prepared for this word.'), 'awp-note awp-gap', card);
        }
      }
      reveal.hidden = options.mode === 'popup' || (options.mode === 'blend' && !item.phonemes.length);
      const showsWord = options.mode === 'blend' || meaningFirst();
      setLabel(reveal, showsWord ? 'show_word' : options.mode === 'vocabulary' ? 'show_meaning' : 'reveal_answer', showsWord ? 'Show word' : options.mode === 'vocabulary' ? 'Show meaning' : 'Reveal answer'); reveal.disabled = revealed;
      // Keep every visible passage in its own language in the live announcement.
      // Hidden spelling/sentence answers are never added before reveal.
      markHighlightFields(translations);
      const marker = '\ufff0', template = L('card_announce', 'Card {n} of {total}. {visible}', { n: index + 1, total: sequence.length, visible: marker });
      const parts = template.split(marker); announcement.replaceChildren(); language(announcement, resolvedLabels.get(template));
      announcement.appendChild(doc.createTextNode(parts.length === 2 ? parts[0] : ''));
      const separator = () => announcement.appendChild(doc.createTextNode('. '));
      if (options.mode === 'spelling' && !revealed) {
        const recorded = item.wordAudio && options.includeAudio;
        make('span', recorded ? L('spell_listen', 'Listen, then spell the word.') : L('spell_teacher', 'Ask your teacher to say the word, then spell it.'), '', announcement);
      } else if (options.mode === 'sentence') {
        passage(announcement, item.sentenceActivity.prompt, fieldLanguage(item, 'sentence'));
        if (revealed) { separator(); labeledPassage(make('span', '', '', announcement), 'answer', 'Answer: {answer}', 'answer', item.sentenceActivity.answer, fieldLanguage(item, 'term')); }
      } else if (blendPrompt()) {
        passage(announcement, item.phonemes.map(sound => sound.label).join(', '), fieldLanguage(item, 'term')); separator();
        make('span', L('blend_help', 'Say the sounds, then blend the word.'), '', announcement);
      } else if (clue) {
        make('span', L('meaning_first_prompt', 'Which word matches this meaning?'), '', announcement);
        if (options.includePictures && clue.picture?.alt) {
          separator();
          const description = make('span', clue.picture.alt, '', announcement);
          if (clue.picture.usesClueLabel) language(description, labelLanguages.picture_clue || core.languageInfo('English'));
        }
        if (clue.definition) { separator(); passage(announcement, clue.definition, fieldLanguage(item, 'definition'), 'awp-definition'); }
        if (clue.example) { separator(); passage(announcement, clue.example, fieldLanguage(item, 'example'), 'awp-example'); }
        clue.translations.forEach(translation => { separator(); appendTranslation(announcement, translation, item.word); });
      } else {
        passage(announcement, item.word, fieldLanguage(item, 'term'), 'awp-announced-word');
        if (options.mode === 'vocabulary' && revealed) {
          if (item.definition) { separator(); passage(announcement, item.definition, fieldLanguage(item, 'definition'), 'awp-definition'); }
          if (item.example) { separator(); passage(announcement, item.example, fieldLanguage(item, 'example'), 'awp-example'); }
          if (item.origin) { separator(); labeledPassage(make('span', '', '', announcement), 'word_origin', 'Word origin: {origin}', 'origin', item.origin, fieldLanguage(item, 'origin')); }
          translations.forEach(translation => { separator(); appendTranslation(announcement, translation); });
        }
      }
      if (parts.length === 2) announcement.appendChild(doc.createTextNode(parts[1]));
      updateAudioControls();
      styleCardSurface(stage, options, core);
      if (annotationFaceHelp) annotationFaceHelp.hidden = !annotateOpen || !meaningFirst();
      if (annotate) annotate.update({ annotations: faceNotes(visibleDocument), documentKey: visibleDocument.key });
      if (hadCardFocus) {
        const choices = card.querySelectorAll('.awp-choices button');
        const target = choiceIndex >= 0 && choices.length ? choices[Math.min(choiceIndex, choices.length - 1)] : host;
        target.focus({ preventScroll: true });
        if (target !== host) target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      } else restoreToolbarFocus(focused);
    }
    function render() {
      const focused = doc.activeElement;
      stopAudio(); revealed = false; finished = false; status.textContent = '';
      stage.scrollTop = 0; stage.scrollLeft = 0;
      const item = current();
      if (!item) { stage.textContent = L('add_words', 'Add words to begin practice.'); [previous, next, reveal, wordButton, soundsButton, timerButton, reviewButton, newRound, reviewRound].forEach(button => button.disabled = true); return; }
      setLabel(progress, 'card_progress', 'Card {n} of {total}', { n: index + 1, total: sequence.length });
      const last = index === sequence.length - 1;
      previous.disabled = index === 0; next.disabled = last && options.autoAdvance;
      if (last && !options.autoAdvance) setLabel(next, 'finish_round', 'Finish round');
      else setLabel(next, 'next', 'Next');
      renderCard(); updateReview(); updateTimer(); schedule(); restoreToolbarFocus(focused);
    }
    function startRound(roundPack, roundOptions) {
      const fromEnd = finished;
      sequence = core.createSequence(roundPack, roundOptions); index = 0; running = false; render();
      if (fromEnd) stage.focus();
    }
    function finishRound() {
      if (finished) return;
      running = false; updateTimer(); schedule(); stopAudio();
      if (options.autoAdvance && hooks.onBack) { setLabel(status, 'round_complete', 'Round complete. Start a new round or review the words you marked.'); return; }
      finished = true; next.disabled = true;
      if (options.autoAdvance) setLabel(status, 'round_complete', 'Round complete. Start a new round or review the words you marked.');
      else status.textContent = '';
      updateReview(); roundHeading.focus();
    }
    function move(direction) {
      if (index + direction >= sequence.length) { finishRound(); return; }
      if (index + direction < 0) return;
      index += direction; render();
    }
    function keydown(event) {
      if (dead || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || (event.target && event.target.isContentEditable)) return;
      // A panel opened inside the full-screen player keeps its own keys.
      const panel = event.target.closest && event.target.closest('[role="dialog"]'); if (panel && host.contains(panel)) return;
      if (event.target.closest && event.target.closest('.awp-appearance-panel')) return;
      if (event.target.closest && event.target.closest('.allo-anno-scope')) return;
      if (!current()) return;
      const lower = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      if (event.key === 'ArrowRight') { event.preventDefault(); move(host.dir === 'rtl' ? -1 : 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(host.dir === 'rtl' ? 1 : -1); }
      else if (event.key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); if (options.autoAdvance) { running = !running; updateTimer(); schedule(); } else move(1); }
      else if (lower === 'r' && !reveal.hidden && !reveal.disabled) { event.preventDefault(); revealed = true; renderCard(); schedule(); }
      else if (lower === 'h' && !wordButton.hidden && !wordButton.disabled) { event.preventDefault(); wordButton.click(); }
      else if (lower === 's' && !soundsButton.hidden && !soundsButton.disabled) { event.preventDefault(); soundsButton.click(); }
      else if (lower === 'f' && !fullscreen.hidden && !fullscreen.disabled) { event.preventDefault(); fullscreen.click(); }
      else if (lower === 'm' && !reviewButton.hidden && !reviewButton.disabled) { event.preventDefault(); reviewButton.click(); }
      else if ((event.key === 'PageDown' || event.key === 'PageUp') && stage.scrollHeight <= stage.clientHeight + 2) { event.preventDefault(); move(event.key === 'PageDown' ? 1 : -1); }
      else if (options.mode === 'sentence' && !revealed && /^[1-9]$/.test(event.key)) {
        const choices = card.querySelectorAll('.awp-choices button');
        const target = choices[Number(event.key) - 1];
        if (target && !target.disabled && target.getAttribute('aria-disabled') !== 'true') { event.preventDefault(); target.click(); }
      }
    }
    // Touch and pen only (a mouse keeps its buttons and keys): a tap on the card reveals,
    // then moves on; a sideways swipe moves, mirrored for right-to-left interfaces.
    let touchStart = null;
    // A second finger (a pinch) cancels the gesture.
    // While an annotation tool is on, a tap places it and a stroke draws: no reveal or swipe.
    function pointerDown(event) { touchStart = event.isPrimary === false || annotateOpen || stage.dataset.awpAnnotating === 'true' || event.target.closest?.('.allo-anno-scope') ? null : { x: event.clientX, y: event.clientY, at: Date.now() }; }
    function pointerUp(event) {
      const start = touchStart; touchStart = null;
      if (!start || dead || !current() || event.pointerType === 'mouse') return;
      if (event.target && event.target.closest && event.target.closest('button,a,input,select,textarea,[role="button"]')) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - start.at < 1000) { move((dx < 0) !== (host.dir === 'rtl') ? 1 : -1); return; }
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
      if (!reveal.hidden && !reveal.disabled) { revealed = true; renderCard(); schedule(); }
      else move(1);
    }
    function pointerCancel() { touchStart = null; }
    stage.addEventListener('pointerdown', pointerDown); stage.addEventListener('pointerup', pointerUp); stage.addEventListener('pointercancel', pointerCancel);
    function visibility() { if (doc.hidden) { running = false; stopAudio(); updateTimer(); schedule(); } }
    function fullscreenChange() { setLabel(fullscreen, doc.fullscreenElement ? 'exit_full_screen' : 'full_screen', doc.fullscreenElement ? 'Exit full screen' : 'Full screen'); }
    const unwatchReading = watchCardReading(stage, () => options, core);
    function warnUnsavedExit(event) { if (editGuard.dirty()) { event.preventDefault(); event.returnValue = ''; } }
    function onMuteChanged() { if (isGlobalMuted()) stopAudio(); }
    win.addEventListener('beforeunload', warnUnsavedExit);
    win.addEventListener('alloflow-mute-changed', onMuteChanged);
    function destroy() { if (dead) return; savingSet?.abort(); win.removeEventListener('beforeunload', warnUnsavedExit); win.removeEventListener('alloflow-mute-changed', onMuteChanged); openingSet?.abort(); captureCardGeometry(); dead = true; unwatchReading(); if (timer) win.clearTimeout(timer); stopAudio(); if (annotate) { annotate.destroy(); annotate = null; } host.removeEventListener('keydown', keydown); doc.removeEventListener('visibilitychange', visibility); doc.removeEventListener('fullscreenchange', fullscreenChange); win.removeEventListener('pagehide', destroy); if (doc.fullscreenElement === host && doc.exitFullscreen) doc.exitFullscreen().catch(() => {}); }
    host.tabIndex = -1; host.addEventListener('keydown', keydown); doc.addEventListener('visibilitychange', visibility); doc.addEventListener('fullscreenchange', fullscreenChange); win.addEventListener('pagehide', destroy);
    try { render(); host.focus(); } catch (error) { destroy(); throw error; }
    return { destroy, captureCardGeometry };
  }

  function withoutAudio(pack, includeAudio) {
    if (includeAudio) return pack;
    return { ...pack, items: pack.items.map(item => {
      const clean = { ...item, wordAudio: '', wordAudioStatus: 'missing', phonemes: item.phonemes.map(sound => { const clean = { ...sound, audio: '', audioStatus: 'missing' }; delete clean.audioOriginal; delete clean.provenance; return clean; }) };
      delete clean.wordAudioOriginal; delete clean.wordAudioProvenance; return clean;
    }) };
  }
  function withoutOriginalAudio(pack) {
    return { ...pack, items: pack.items.map(item => {
      const clean = { ...item, phonemes: item.phonemes.map(sound => { const clean = { ...sound }; delete clean.audioOriginal; return clean; }) };
      delete clean.wordAudioOriginal; return clean;
    }) };
  }
  // reader: optional { css, fontCss } from the host's reading settings; an embedded font needs font-src data:.
  function buildHtml(input, value, suppliedSequence, labels, reader, uiLanguageName) {
    const core = root.AlloWordPracticeCore;
    const normalized = core.normalizeInput(input), options = core.normalizeOptions({ ...normalized.options, ...value });
    const withAudioChoice = withoutOriginalAudio(withoutAudio({ ...normalized, options }, options.includeAudio));
    const pack = options.includePictures ? withAudioChoice : { ...withAudioChoice, items: withAudioChoice.items.map(item => ({ ...item, picture: null })) };
    // The file stays network-free unless it shows a web-link picture.
    const webPictures = pack.items.some(item => item.picture && /^https:/i.test(item.picture.src));
    const sequence = suppliedSequence || core.createSequence(pack, options);
    const playerLabels = labels && typeof labels === 'object' ? labels : {};
    const uiName = uiLanguageName || playerLabels.__uiLanguage || (Object.keys(playerLabels).length ? '' : 'English');
    const uiLanguage = core.languageInfo(uiName), language = uiLanguage.tag || 'und';
    const audioIssues = options.includeAudio ? core.audioIssueCounts(normalized) : {};
    const cssText = part => typeof part === 'string' ? part.replace(/</g, '\\3c ') : '';
    const fontCss = reader ? cssText(reader.fontCss) : '', readerCss = reader ? cssText(reader.css) : '';
    const assets = root.AlloWordPracticeAnnotationAssets || {};
    const annotationRuntime = (assets.runtime || '').replace(/<\/script/gi, '<\\/script');
    const annotationLabels = { ...(assets.labels || {}), ...(playerLabels.__annotations || {}) };
    const annotationCss = cssText(assets.css);
    return '<!doctype html><html lang="' + core.escapeHtml(language) + '" dir="' + uiLanguage.dir + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; media-src data: blob:; img-src data:' + (webPictures ? ' https:' : '') + (fontCss ? '; font-src data:' : '') + '"><title>' + core.escapeHtml(pack.title) + '</title><style>body{margin:0;background:#f5f7fb}' + CSS + annotationCss + (fontCss || readerCss ? '\n' + fontCss + '\n' + readerCss : '') + '</style></head><body><main id="practice" aria-label="' + core.escapeHtml(playerLabels.practice_label || 'Word practice') + '"></main><script>\n' + annotationRuntime + '\n(function(){"use strict";window.__alloWordPracticeReader=' + core.safeJson(reader && reader.settings || null) + ';const trackWordSetEdits=' + trackWordSetEdits.toString() + ';const confirmWordSetDownload=' + confirmWordSetDownload.toString() + ';const allowWordSetOpen=' + allowWordSetOpen.toString() + ';const readWordSetFile=' + readWordSetFile.toString() + ';const styleCardSurface=' + styleCardSurface.toString() + ';const watchCardReading=' + watchCardReading.toString() + ';const appearanceControls=' + appearanceControls.toString() + ';const translationControls=' + translationControls.toString() + ';const core=(' + core.createCore.toString() + ')();const pack=core.normalizeInput(' + core.safeJson(pack) + ');const options=core.normalizeOptions(' + core.safeJson(options) + ');(' + mountPlayer.toString() + ')(document.getElementById("practice"),pack,options,' + core.safeJson(sequence) + ',core,{labels:' + core.safeJson(playerLabels) + ',uiLanguage:' + core.safeJson(uiName) + ',audioIssues:' + core.safeJson(audioIssues) + ',allowWebPictures:' + core.safeJson(webPictures) + ',annotationLabels:' + core.safeJson(annotationLabels) + '});})();\n</script></body></html>';
  }

  // The player's strings, translated once per dialog and handed to the player (and
  // to the offline file). English stays inline in the player as the fallback.
  const PLAYER_STRINGS = [["word_practice.back_to_setup","Back to setup"],["word_practice.annotate","Annotate"],["word_practice.word_origin","Word origin: {origin}"],["word_practice.full_screen","Full screen"],["word_practice.exit_full_screen","Exit full screen"],["word_practice.full_screen_unavailable","Full screen is unavailable in this browser."],["word_practice.practice_card","Practice card"],["word_practice.previous","Previous"],["word_practice.next","Next"],["word_practice.reveal_answer","Reveal answer"],["word_practice.hear_word","Hear word"],["word_practice.hear_sounds","Hear sounds"],["word_practice.start_timer","Start timer"],["word_practice.pause_timer","Pause timer"],["word_practice.add_to_review","Add to review"],["word_practice.remove_from_review","Remove from review"],["word_practice.new_round","New round"],["word_practice.start_review","Start review ({count})"],["word_practice.keys_help_timed","Arrow keys or Page Up/Down: move · Space: start or pause timer · R: reveal · H/S: audio · M: review · F: full screen"],["word_practice.keys_help_manual","Arrow keys or Page Up/Down: move · Space: next card · R: reveal · H/S: audio · M: review · F: full screen"],["word_practice.recording_unavailable","The complete recording is not available for this word."],["word_practice.recording_failed","This browser could not play the recording."],["word_practice.answer","Answer: {answer}"],["word_practice.sentence_correct","Yes. {answer} completes the sentence."],["word_practice.sentence_try_again","Try another word. Read the whole sentence again."],["word_practice.spell_listen","Listen, then spell the word."],["word_practice.spell_teacher","Ask your teacher to say the word, then spell it."],["word_practice.blend_help","Say the sounds, then blend the word."],["word_practice.no_meaning","No meaning or example has been prepared for this word."],["word_practice.show_meaning","Show meaning"],["word_practice.show_word","Show word"],["word_practice.card_announce","Card {n} of {total}. {visible}"],["word_practice.card_progress","Card {n} of {total}"],["word_practice.add_words","Add words to begin practice."],["word_practice.round_complete","Round complete. Start a new round or review the words you marked."],["word_practice.practice_label","Word practice"]];
  PLAYER_STRINGS.push(['word_practice.download_started', 'Download started'], ['word_practice.confirm_download_help', 'Check that the word set file is in your downloads before confirming. If the download was cancelled or blocked, keep editing and try again.'], ['word_practice.confirm_download_saved', 'I saved the file'], ['word_practice.keep_editing', 'Keep editing'], ['word_practice.download_newer_changes', 'More changes were made after this download. Download the updated word set before confirming it is saved.'], ['word_practice.download_confirmed', 'Download confirmed. Your current word set changes are marked as saved.'], ['word_practice.download_unconfirmed', 'Download not confirmed. Your unsaved changes are still protected.']);
  PLAYER_STRINGS.push(['word_practice.audio_language_omitted', '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.']);
  PLAYER_STRINGS.push(['word_practice.audio_language_omitted_one', '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.']);
  PLAYER_STRINGS.push(['word_practice.mode_popup', 'Word Fluency Pop-Up'], ['word_practice.picture_clue', 'Picture clue'], ['word_practice.recall_annotations_help', 'Annotations stay on this side of the card.']);
  PLAYER_STRINGS.push(['glossary.table_term', 'Term'], ['export.def_col', 'Definition'], ['universal.translations', 'Translations'], ['settings.text.size', 'Size']);
  PLAYER_STRINGS.push(['options.default', 'Default'], ['common.reset', 'Reset'], ['word_practice.card_text_style', 'Card text style'],
    ['word_practice.text_style_regular', 'Regular'], ['word_practice.text_style_bold', 'Bold'], ['word_practice.text_style_italic', 'Italic'], ['word_practice.text_style_bold_italic', 'Bold Italic']);
  PLAYER_STRINGS.push(['readinglib_all_languages', 'All languages'], ['word_sounds.deselect_all', 'Deselect All'], ['word_sounds.pack_maint_language_unspecified', 'Unspecified'], ['common.move_up', 'Move up'], ['common.move_down', 'Move down']);
  PLAYER_STRINGS.push(['word_practice.save_set', 'Save word set'], ['word_practice.open_set', 'Open word set'],
    ['word_practice.finish_round', 'Finish round'], ['word_practice.round_finished', 'Round complete'],
    ['word_practice.review_marked_one', 'Review {count} marked word'], ['word_practice.review_marked_many', 'Review {count} marked words'],
    ['word_practice.no_marked_words', 'No words marked for review.'],
    ['word_practice.unsaved_set', 'Save changes to this word set before opening another?'], ['word_practice.save_and_open', 'Save and open'],
    ['word_practice.open_without_saving', 'Open without saving'], ['word_practice.cancel', 'Cancel'], ['word_practice.finish_recording_to_save', 'Finish the recording before saving this set.'],
    ['word_practice.set_opened', 'Word set opened.'], ['word_practice.set_saved', 'Word set saved with its practice settings.'],
    ['word_practice.set_no_words', 'This file does not contain a word list.'], ['word_practice.set_too_large', 'This word set is too large. Use a file smaller than 32 MB.'],
    ['word_practice.set_invalid_file', 'Choose a valid word set JSON file.'], ['word_practice.set_save_too_large', 'This set exceeds 32 MB. Use Save annotations on individual cards to keep your notes.'],
    ['word_practice.set_linked_pictures', 'This offline file shows descriptions and credits instead of linked pictures.']);
PLAYER_STRINGS.push(['word_practice.annotations_saved', 'Saved to glossary']);
PLAYER_STRINGS.push(['word_practice.annotations_not_saved', 'This card could not be saved to the glossary. Save the word set to keep your annotations.']);
PLAYER_STRINGS.push(['word_practice.meaning_first_prompt', 'Which word matches this meaning?']);
PLAYER_STRINGS.push(['word_practice.touch_help', 'Touch screens: tap the card to reveal, tap again for the next card, or swipe to move.']);
  [['appearance', 'Card appearance'], ['card_font', 'Card font'], ['font_default', 'Default font'], ['card_text_size', 'Card text size'], ['card_style', 'Card style'], ['style_paper', 'Plain'], ['style_cream', 'Warm'], ['style_mist', 'Blue tint'], ['card_preview', 'Card preview']].forEach(([key, fallback]) => PLAYER_STRINGS.push(['word_practice.' + key, fallback]));
  function sanitizeSvgMarkup(raw) {
    const text = String(raw || '').trim();
    if (!/<(?:[a-z0-9_-]+:)?svg[\s>]/i.test(text) || text.length > 600000) return '';
    const decoded = text
      .replace(/&#x([0-9a-f]+);?/gi, (_, h) => { const cp = parseInt(h, 16); return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ''; })
      .replace(/&#([0-9]+);?/g, (_, d) => { const cp = parseInt(d, 10); return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ''; })
      .replace(/&(?:colon|tab|newline);/gi, m => (m.toLowerCase() === '&colon;' ? ':' : ' '));
    const check = text + '\n' + decoded;
    if (/<\s*(?:[a-z0-9_-]+:)?(?:script|foreignobject|iframe|object|embed|animate[a-z]*|set|handler|audio|video)\b|<!entity\b|<!doctype[\s\S]*?\[|<\?xml-stylesheet\b|\bon[a-z]+\s*=|\bsrcdoc\s*=|\bxml:base\s*=|(?:javascript|vbscript)\s*:|@import\b|image-set\s*\(|url\s*\(\s*["']?\s*(?!#)|(?:src|href|xlink:href)\s*=\s*["']?\s*(?:https?:|\/\/|data:|javascript:|vbscript:|file:)/i.test(check)) return '';
    return text.replace(/<svg(?=[\s>])(?![^>]*\bxmlns\s*=)/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  function parseSvgDimensions(svgText) {
    const open = (svgText.match(/<svg\b[^>]*>/i) || [''])[0];
    const vb = /\bviewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i.exec(open);
    const wMatch = /\bwidth\s*=\s*["']\s*([0-9.]+)/i.exec(open);
    const hMatch = /\bheight\s*=\s*["']\s*([0-9.]+)/i.exec(open);
    const w = Number(wMatch ? wMatch[1] : vb ? vb[1] : 256) || 256;
    const h = Number(hMatch ? hMatch[1] : vb ? vb[2] : 256) || 256;
    return { w: Math.max(1, Math.min(2048, w)), h: Math.max(1, Math.min(2048, h)) };
  }
  function minimalPngDataUrl(width, height) {
    const w = Math.max(1, Math.min(256, Math.round(width || 64))), h = Math.max(1, Math.min(256, Math.round(height || 64)));
    const rowLen = 1 + w * 4, raw = new Uint8Array(rowLen * h);
    for (let y = 0; y < h; y++) {
      const off = y * rowLen;
      raw[off] = 0;
      for (let x = 0; x < w; x++) { raw[off + 1 + x * 4] = 248; raw[off + 2 + x * 4] = 250; raw[off + 3 + x * 4] = 252; raw[off + 4 + x * 4] = 255; }
    }
    let a = 1, b = 0;
    for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
    const adler = ((b << 16) | a) >>> 0;
    const zblocks = [];
    for (let offset = 0; offset < raw.length; offset += 65535) {
      const len = Math.min(65535, raw.length - offset), last = offset + len >= raw.length ? 1 : 0;
      const head = new Uint8Array(5); head[0] = last; head[1] = len & 255; head[2] = (len >>> 8) & 255;
      const nlen = (~len) & 65535; head[3] = nlen & 255; head[4] = (nlen >>> 8) & 255;
      zblocks.push(head, raw.subarray(offset, offset + len));
    }
    const zLen = 2 + zblocks.reduce((s, p) => s + p.length, 0) + 4, z = new Uint8Array(zLen);
    z[0] = 0x78; z[1] = 0x01; let p = 2;
    zblocks.forEach(part => { z.set(part, p); p += part.length; });
    z[p] = (adler >>> 24) & 255; z[p + 1] = (adler >>> 16) & 255; z[p + 2] = (adler >>> 8) & 255; z[p + 3] = adler & 255;
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
    const chunk = (tag, data) => {
      const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
      view.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = tag.charCodeAt(i);
      out.set(data, 8); let crc = 0xffffffff;
      for (let i = 4; i < 8 + data.length; i++) crc = crcTable[(crc ^ out[i]) & 255] ^ (crc >>> 8);
      view.setUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0);
      return out;
    };
    const ihdr = new Uint8Array(13), iv = new DataView(ihdr.buffer);
    iv.setUint32(0, w); iv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
    const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
    const c1 = chunk('IHDR', ihdr), c2 = chunk('IDAT', z), c3 = chunk('IEND', new Uint8Array(0));
    const png = new Uint8Array(sig.length + c1.length + c2.length + c3.length);
    png.set(sig, 0); png.set(c1, sig.length); png.set(c2, sig.length + c1.length); png.set(c3, sig.length + c1.length + c2.length);
    let bin = ''; for (let i = 0; i < png.length; i += 8192) bin += String.fromCharCode.apply(null, png.subarray(i, i + 8192));
    return 'data:image/png;base64,' + root.btoa(bin);
  }
  async function rasterizeImageToPng(source, doc = root.document, opts = {}) {
    const core = root.AlloWordPracticeCore, maxDim = Number(opts.maxDim) || 512;
    let raw = '';
    if (typeof source === 'string') raw = source.trim();
    else if (source && typeof source === 'object') {
      if (Number(source.size) > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
      const isSvg = /svg/i.test(String(source.type || '')) || /\.svg$/i.test(String(source.name || ''));
      if (isSvg) {
        if (typeof source.text === 'function') raw = await source.text();
        else raw = await new Promise((resolve, reject) => { const r = new root.FileReader(); r.onload = () => resolve(String(r.result || '')); r.onerror = () => reject(new Error('Unable to read image.')); r.readAsText(source); });
      } else {
        if (typeof source.arrayBuffer === 'function') {
          const bytes = new Uint8Array(await source.arrayBuffer()), mime = String(source.type || 'image/png').toLowerCase().replace(/^image\/jpg$/, 'image/jpeg');
          let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
          raw = 'data:' + mime + ';base64,' + root.btoa(bin);
        } else {
          raw = await new Promise((resolve, reject) => { const r = new root.FileReader(); r.onload = () => resolve(String(r.result || '')); r.onerror = () => reject(new Error('Unable to read image.')); r.readAsDataURL(source); });
        }
      }
    }
    let svgText = '';
    if (/^<svg[\s>]/i.test(raw) || /^<\?xml/i.test(raw)) {
      svgText = sanitizeSvgMarkup(raw);
      if (!svgText) throw new Error('That SVG file contains unsupported markup.');
      raw = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    } else if (/^data:image\/svg\+xml/i.test(raw)) {
      const comma = raw.indexOf(',');
      const payload = comma >= 0 ? raw.slice(comma + 1) : '';
      let decoded = '';
      try { decoded = /;base64/i.test(raw.slice(0, comma)) ? root.atob(payload) : decodeURIComponent(payload); }
      catch (_) { throw new Error('That SVG image could not be decoded.'); }
      svgText = sanitizeSvgMarkup(decoded);
      if (!svgText) throw new Error('That SVG image contains unsupported markup.');
      raw = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    }
    const alreadySafe = core && core.safePicture ? core.safePicture(raw) : '';
    const isRaster = /^data:image\/(png|jpeg|gif);base64,/i.test(alreadySafe);
    if (isRaster && alreadySafe.length <= 350000) return alreadySafe;
    const win = doc && doc.defaultView ? doc.defaultView : root;
    const canvas = doc && typeof doc.createElement === 'function' ? doc.createElement('canvas') : null;
    const ctx = canvas && typeof canvas.getContext === 'function' ? (() => { try { return canvas.getContext('2d'); } catch (_) { return null; } })() : null;
    if (ctx && typeof win.Image === 'function') {
      try {
        const rendered = await new Promise((resolve, reject) => {
          const img = new win.Image();
          const timer = win.setTimeout(() => reject(new Error('timeout')), 1500);
          img.onload = () => {
            win.clearTimeout(timer);
            const natW = img.naturalWidth || img.width || (svgText ? parseSvgDimensions(svgText).w : 256);
            const natH = img.naturalHeight || img.height || (svgText ? parseSvgDimensions(svgText).h : 256);
            const scale = Math.min(1, maxDim / Math.max(natW, natH));
            canvas.width = Math.max(1, Math.round(natW * scale)); canvas.height = Math.max(1, Math.round(natH * scale));
            ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const out = canvas.toDataURL('image/png');
            resolve(core && core.safePicture ? core.safePicture(out) : out);
          };
          img.onerror = () => { win.clearTimeout(timer); reject(new Error('decode')); };
          if (/^https:/i.test(raw)) img.crossOrigin = 'anonymous';
          img.src = raw;
        });
        if (rendered) return rendered;
      } catch (_) {}
    }
    if (alreadySafe) return alreadySafe;
    if (svgText) throw new Error('That SVG image could not be converted to a picture. Try a PNG or JPEG image.');
    throw new Error('Choose a valid PNG, JPEG, GIF, WebP, or SVG image.');
  }
  let active = null, nextDialogId = 0;
  function open(context = {}) {
    if (context.signal && context.signal.aborted) return { close() {} };
    const inlineHost = context.container && context.container.nodeType === 1 ? context.container : null;
    if (!inlineHost && active) active.close();
    const core = root.AlloWordPracticeCore, doc = root.document, previousFocus = inlineHost ? null : doc.activeElement;
    const fieldPrefix = 'awp-' + (++nextDialogId) + '-'; let nextFieldId = 0;
    let pack = core.normalizeInput(context), player = null, closed = false, busy = false, operation = null;
    // A fresh launch starts from the teacher's last setup on this device. A launch that
    // brings its own options (a saved set, Word Sounds) keeps them.
    const SETUP_KEY = 'alloflow_word_practice_setup';
    const SETUP_FIELDS = ['mode', 'repetitions', 'autoAdvance', 'intervalSeconds', 'shuffle', 'varyPosition', 'varySize', 'includeAudio', 'includePictures', 'pictureSlides', 'vocabularyFirst', 'cardFont', 'cardTextStyle', 'cardTextScale', 'wordTextScale', 'meaningTextScale', 'translationTextScale', 'cardTheme'];
    if (!context.options) {
      try {
        const saved = JSON.parse(root.localStorage.getItem(SETUP_KEY) || 'null', (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v), chosen = {};
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) SETUP_FIELDS.forEach(name => { if (Object.prototype.hasOwnProperty.call(saved, name)) chosen[name] = saved[name]; });
        // Finish the Sentence needs prepared boards; never reopen a list onto an empty activity.
        if (chosen.mode === 'sentence' && !pack.items.some(item => item.sentenceActivity)) delete chosen.mode;
        if (Object.keys(chosen).length) pack = { ...pack, options: core.normalizeOptions({ ...pack.options, ...chosen }) };
      } catch (_) {}
    }
    function rememberSetup(value) {
      try { const chosen = {}; SETUP_FIELDS.forEach(name => { chosen[name] = value[name]; }); root.localStorage.setItem(SETUP_KEY, JSON.stringify(chosen)); } catch (_) {}
    }
    // The visible list is a selection, not the metadata store. A word removed
    // during editing can be restored without discarding its prepared content.
    const catalogue = new Map();
    const review = new Set(pack.reviewItemIds);
    const annotationStore = new Map(pack.items.map(item => [item.id, item.annotations || []]));
    const editGuard = trackWordSetEdits(review, annotationStore, core);
    let preparedAudioRevision = 0, preparedAudioPending = false, cardContentRevision = 0;
    const audioSnapshot = value => JSON.stringify(value.items.map(item => [item.id, item.wordAudio, item.wordAudioProvenance, item.wordAudioOriginal, item.phonemes.map(sound => [sound.label, sound.audio, sound.provenance, sound.audioOriginal])]));
    const glossaryEntryIds = new Set(typeof context.onSaveCardAnnotations === 'function' ? pack.items.map(item => item.id) : []);
    function remember(current) { current.items.forEach(item => catalogue.set(item.id, item)); }
    let nextEditedId = 0;
    const newEntryId = () => { let id; do { id = 'edit:' + (++nextEditedId); } while (catalogue.has(id)); return id; };
    remember(pack);
    // Names and equivalent tags identify the same bank, while a saved script,
    // dialect or region remains part of that identity.
    const languageKey = value => core.languageInfo(value).tag.toLowerCase() || core.key(value).replace(/_/g, '-');
    const sourceLanguage = languageKey(pack.language);
    // A saved set can replace the teaching language. Inherited recordings then
    // belong to the launcher, while the imported set's embedded clips stay valid.
    const inheritedBanks = () => languageKey(pack.language) === sourceLanguage
      ? { phonemeBank: context.phonemeBank, wordBank: context.wordBank }
      : { phonemeBank: {}, wordBank: {} };
    // Host t() echoes a missing key; the English beside each key is the fallback.
    const uiLanguageName = context.currentUiLanguage || context.uiLanguage || (typeof context.t === 'function' ? '' : 'English');
    const uiLanguage = core.languageInfo(uiLanguageName), dialogTextLanguages = new Map();
    const setLanguage = (node, value) => { const info = typeof value === 'object' ? value : core.languageInfo(value); node.lang = info.tag || 'und'; node.dir = info.dir; return node; };
    const tx = (key, fallback, params) => {
      let value = '';
      try { value = typeof context.t === 'function' ? context.t(key) : ''; } catch (_) { value = ''; }
      let text = typeof value === 'string' && value && value !== key ? value : fallback;
      Object.keys(params || {}).forEach(p => { text = text.split('{' + p + '}').join(String(params[p])); });
      dialogTextLanguages.set(text, value && value !== key && value !== fallback ? uiLanguage : core.languageInfo('English'));
      return text;
    };
    const playerLabels = () => {
      const labels = {}, languages = {};
      PLAYER_STRINGS.forEach(([key, english]) => { const name = key.replace('word_practice.', ''), text = tx(key, english); labels[name] = text; languages[name] = dialogTextLanguages.get(text); });
      const annotations = {}; Object.entries((root.AlloWordPracticeAnnotationAssets || {}).labels || {}).forEach(([key, fallback]) => { annotations[key] = tx(key, fallback); });
      return { ...labels, __uiLanguage: uiLanguageName, __languages: languages, __annotations: annotations };
    };
    const overlay = doc.createElement('div'); overlay.className = inlineHost ? 'awp awp-inline' : 'awp awp-overlay';
    const style = doc.createElement('style'); style.textContent = CSS + ((root.AlloWordPracticeAnnotationAssets || {}).css || ''); overlay.appendChild(style);
    const dialog = doc.createElement('section'); dialog.className = inlineHost ? 'awp-dialog awp-inline-dialog' : 'awp-dialog';
    if (!inlineHost) { dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
    dialog.setAttribute('aria-label', tx('word_practice.title', 'Present & Export')); overlay.appendChild(dialog);
    setLanguage(dialog, uiLanguage);
    const hiddenSiblings = inlineHost ? [] : Array.from(doc.body.children).filter(node => node !== overlay && !['SCRIPT', 'STYLE'].includes(node.tagName) && !(node.matches && node.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]')) && !(node.querySelector && node.querySelector('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))).map(node => ({ node, inert: node.inert }));
    hiddenSiblings.forEach(({ node }) => { node.inert = true; });
    const scrollLockState = !inlineHost ? (root.__alloScrollLockState = root.__alloScrollLockState || { count: 0, previousOverflow: '' }) : null;
    const focusTrapStack = !inlineHost ? (root.__alloFocusTrapStack = root.__alloFocusTrapStack || []) : null;
    const focusTrapEntry = !inlineHost ? { root: dialog } : null;
    if (inlineHost) inlineHost.replaceChildren(overlay);
    else {
      if (scrollLockState.count === 0) scrollLockState.previousOverflow = doc.body.style.overflow;
      scrollLockState.count += 1;
      doc.body.style.overflow = 'hidden';
      focusTrapStack.push(focusTrapEntry);
      doc.body.appendChild(overlay);
    }
    const make = (tag, text, parent, cls) => { const node = doc.createElement(tag); if (text != null) { node.textContent = text; if (dialogTextLanguages.has(text)) setLanguage(node, dialogTextLanguages.get(text)); } if (cls) node.className = cls; (parent || dialog).appendChild(node); return node; };
    const header = make('div', null, dialog, 'awp-head'); make(inlineHost ? 'h2' : 'h1', tx('word_practice.title', 'Present & Export'), header);
    const headerActions = make('div', null, header, 'awp-row');
    // The host's reading settings, checked now: a host without the bridge gets no button.
    const readingLibrary = () => { try { const lib = root.AlloModules && root.AlloModules.UIFontLibrary; return lib && typeof lib.openReadingSettings === 'function' && lib.readingSettingsAvailable() ? lib : null; } catch (_) { return null; } };
    const openReading = opener => { const lib = readingLibrary(); if (lib) lib.openReadingSettings({ opener, t: context.t }); };
    const closeReading = () => { const lib = root.AlloModules && root.AlloModules.UIFontLibrary; if (lib && typeof lib.closeReadingSettings === 'function' && overlay.querySelector('[data-allo-reading-settings]')) lib.closeReadingSettings(); };
    const readingButton = readingLibrary() ? make('button', 'Aa', headerActions, 'awp-aa') : null;
    if (readingButton) { readingButton.type = 'button'; readingButton.setAttribute('aria-label', tx('reading_settings.title', 'Reading settings')); readingButton.setAttribute('aria-haspopup', 'dialog'); readingButton.onclick = event => openReading(event.currentTarget); }
    const closeButton = make('button', tx('word_practice.close', 'Close'), headerActions); closeButton.type = 'button'; closeButton.onclick = requestClose; closeButton.hidden = !!inlineHost;
    const setup = make('div', null, dialog), playerHost = make('div', null, dialog); playerHost.hidden = true;
    make('p', tx('word_practice.intro', 'Turn a word list into a short class practice routine. Use prepared audio and activities when they are available.'), setup, 'awp-note');
    const grid = make('div', null, setup, 'awp-grid');
    const left = make('div', null, grid, 'awp-fields');
    function field(parent, labelText, tag, type) {
      const label = make('label', null, parent), name = make('span', labelText, label);
      const control = make(tag || 'input', null, label), id = fieldPrefix + (++nextFieldId);
      control.id = id; label.htmlFor = id; name.id = id + '-label'; control.setAttribute('aria-labelledby', name.id);
      if (type) control.type = type; return control;
    }
    const titleInput = field(left, tx('word_practice.practice_title', 'Practice title')); titleInput.maxLength = 160;
    const wordsInput = field(left, tx('word_practice.words_label', 'Words (one per line)'), 'textarea'); wordsInput.maxLength = 100000;
    setLanguage(wordsInput, '');
    make('p', tx('word_practice.words_note', 'Up to 200 words or short phrases. Existing meanings, activities and recordings stay with words you keep.'), left, 'awp-note');
    const meaningChoices = make('fieldset', null, left, 'awp-meaning-choices'); meaningChoices.hidden = true;
    const pictureDetails = make('details', null, left, 'awp-picture-manager');
    make('summary', tx('word_practice.cards_manage', 'Card pictures and meanings (edit)'), pictureDetails);
    const pictureToolbar = make('div', null, pictureDetails, 'awp-picture-toolbar');
    const autoFillPicturesBtn = make('button', tx('word_practice.auto_fill_pictures', 'Auto-fill missing pictures'), pictureToolbar); autoFillPicturesBtn.type = 'button'; autoFillPicturesBtn.dataset.awpAutoFillPictures = 'true';
    const batchImportBtn = make('button', tx('word_practice.import_matching_images', 'Import images…'), pictureToolbar); batchImportBtn.type = 'button';
    const exportPictureSlidesBtn = make('button', tx('word_practice.download_picture_slides', 'Export individual picture slides (.pptx)'), pictureToolbar); exportPictureSlidesBtn.type = 'button'; exportPictureSlidesBtn.dataset.awpPicturePptx = 'true';
    const pictureList = make('div', null, pictureDetails, 'awp-picture-list');
    const right = make('div', null, grid, 'awp-fields');
    const activityOptions = make('div', null, right, 'awp-options');
    const mode = field(activityOptions, tx('word_practice.activity', 'Practice activity'), 'select');
    [['popup', tx('word_practice.mode_popup', 'Word Fluency Pop-Up')], ['blend', tx('word_practice.mode_blend', 'Sound & Blend')], ['vocabulary', tx('word_practice.mode_vocabulary', 'Word Meaning')], ['spelling', tx('word_practice.mode_spelling', 'Listen & Spell')], ['sentence', tx('word_practice.mode_sentence', 'Finish the Sentence')]].forEach(([value, label]) => { const option = make('option', label, mode); option.value = value; });
    const vocabularyFirst = field(activityOptions, tx('word_practice.vocabulary_first', 'Show first'), 'select');
    [['word', tx('word_practice.vocabulary_first_word', 'The word, then its meaning')], ['meaning', tx('word_practice.vocabulary_first_meaning', 'The meaning, then recall the word')]].forEach(([value, label]) => { const option = make('option', label, vocabularyFirst); option.value = value; });
    const repetitions = field(activityOptions, tx('word_practice.repetitions', 'Repetitions per word'), 'input', 'number'); repetitions.min = '1'; repetitions.max = '10';
    const pacing = field(activityOptions, tx('word_practice.pacing', 'Pacing'), 'select'); [['manual', tx('word_practice.pacing_manual', 'Teacher advances')], ['timed', tx('word_practice.pacing_timed', 'Timed cards')]].forEach(([value, label]) => { const option = make('option', label, pacing); option.value = value; });
    const interval = field(activityOptions, tx('word_practice.seconds_per_card', 'Seconds per card'), 'input', 'number'); interval.min = '1'; interval.max = '30'; interval.step = '0.5';
    const timingNote = make('p', tx('word_practice.timing_formats', 'Timed cards work in the presenter and HTML. Advance PowerPoint slides manually.'), activityOptions, 'awp-note awp-timing-note');
    timingNote.id = pacing.id + '-help'; pacing.setAttribute('aria-describedby', timingNote.id);
    const checkboxes = make('div', null, right, 'awp-checks');
    function checkbox(text) {
      const label = make('label', null, checkboxes), input = make('input', null, label), name = make('span', text, label), id = fieldPrefix + (++nextFieldId);
      input.type = 'checkbox'; input.id = id; label.htmlFor = id; name.id = id + '-label'; input.setAttribute('aria-labelledby', name.id); return input;
    }
    const shuffle = checkbox(tx('word_practice.shuffle', 'Shuffle each repetition'));
    const position = checkbox(tx('word_practice.vary_position', 'Vary word position'));
    const size = checkbox(tx('word_practice.vary_size', 'Vary word size'));
    const includeAudio = checkbox(tx('word_practice.include_audio', 'Include prepared audio'));
    const includePictures = checkbox(tx('word_practice.include_pictures', 'Show pictures on Word Meaning cards'));
    const pictureSlides = checkbox(tx('word_practice.picture_slides', 'Include individual picture slides in PowerPoint'));
    const useReading = readingButton ? checkbox(tx('reading_settings.use_mine', 'Use my reading settings')) : null;
    if (useReading) {
      const help = make('p', tx('word_practice.use_mine_help', 'The HTML file uses your font, text size and spacing.'), right, 'awp-note');
      make('br', null, help);
      make('span', 'PowerPoint · ' + tx('settings.text.font_family', 'Font Family') + ' · ' + tx('settings.text.size', 'Size'), help);
      help.id = useReading.id + '-help'; useReading.setAttribute('aria-describedby', help.id);
    }
    const pictureNote = make('p', '', right, 'awp-note awp-picture-note'); pictureNote.hidden = true;
    pictureNote.id = includePictures.id + '-help'; includePictures.setAttribute('aria-describedby', pictureNote.id);
    const appearanceSection = make('fieldset', null, setup, 'awp-appearance');
    make('legend', tx('word_practice.appearance', 'Card appearance'), appearanceSection);
    const appearanceFields = make('div', null, appearanceSection, 'awp-appearance-controls');
    const appearance = appearanceControls(appearanceFields, pack.options, (node, key, fallback) => updateLabel(node, tx(key.includes('.') ? key : 'word_practice.' + key, fallback)), () => {}, fieldPrefix + 'appearance-', uiLanguage, core);
    const translationSettings = translationControls(appearanceSection, core, uiLanguageName, (node, key, fallback) => updateLabel(node, tx(key, fallback)), () => updateCoverage());
    const previewHeading = make('h2', tx('word_practice.card_preview', 'Card preview'), appearanceSection, 'awp-preview-heading'); previewHeading.id = fieldPrefix + 'preview';
    const previewReadingNote = useReading ? make('p', '', appearanceSection, 'awp-note awp-preview-reading-note') : null;
    const previewPicker = make('select', null, appearanceSection, 'awp-preview-picker'); previewPicker.setAttribute('aria-labelledby', previewHeading.id);
    const previewToolbar = make('div', null, appearanceSection, 'awp-preview-toolbar');
    const previewProgress = make('p', '', previewToolbar, 'awp-preview-progress'); previewProgress.setAttribute('role', 'status'); previewProgress.setAttribute('aria-live', 'polite'); previewProgress.setAttribute('aria-atomic', 'true');
    const previewActions = make('div', null, previewToolbar, 'awp-row');
    const previewPrevious = make('button', tx('word_practice.previous', 'Previous'), previewActions); previewPrevious.type = 'button';
    const previewNext = make('button', tx('word_practice.next', 'Next'), previewActions); previewNext.type = 'button';
    const previewReveal = make('button', '', previewActions); previewReveal.type = 'button';
    const preview = make('div', null, appearanceSection, 'awp-card-preview'); preview.id = fieldPrefix + 'preview-card'; preview.tabIndex = 0; preview.setAttribute('role', 'region'); preview.setAttribute('aria-labelledby', previewHeading.id);
    [previewPrevious, previewNext, previewReveal, previewPicker].forEach(control => control.setAttribute('aria-controls', preview.id));
    let previewItems = [], previewId = '', previewIndex = 0, previewMode = '', previewRevealed = false, previewContentKey = '', previewPickerKey = '';
    const focusPreview = () => { preview.focus({ preventScroll: true }); preview.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); };
    const movePreview = direction => {
      if (busy) return;
      const next = previewIndex + direction; if (next < 0 || next >= previewItems.length) return;
      const focused = doc.activeElement;
      previewId = previewItems[next].id; previewRevealed = false; updateAppearancePreview(pack);
      if ((focused === previewPrevious || focused === previewNext) && focused.disabled) focusPreview();
    };
    previewPrevious.onclick = () => movePreview(-1); previewNext.onclick = () => movePreview(1);
    previewReveal.onclick = () => { if (!busy && !previewReveal.disabled && !previewReveal.hidden) { const focused = doc.activeElement === previewReveal; previewRevealed = true; updateAppearancePreview(pack); if (focused) focusPreview(); } };
    previewPicker.onchange = event => { event.stopPropagation(); if (!busy && previewItems.some(item => item.id === previewPicker.value)) { previewId = previewPicker.value; previewRevealed = false; updateAppearancePreview(pack); } };
    const audioSetup = make('div', null, setup, 'awp-audio-setup');
    const audioDetails = make('div', null, audioSetup, 'awp-audio-details');
    const coverage = make('p', '', audioDetails, 'awp-note awp-gap');
    const audioModeNote = make('p', '', audioDetails, 'awp-note awp-audio-mode'); audioModeNote.hidden = true;
    const audioWarning = make('p', '', setup, 'awp-note awp-audio-warning'); audioWarning.hidden = true; audioWarning.setAttribute('role', 'status'); audioWarning.setAttribute('aria-live', 'polite');
    const plan = make('div', null, setup, 'awp-plan'); plan.setAttribute('role', 'status'); plan.setAttribute('aria-live', 'polite'); plan.setAttribute('aria-atomic', 'true');
    const planCount = make('p', '', plan, 'awp-plan-count');
    const planNote = make('p', '', plan, 'awp-note awp-plan-note'); planNote.hidden = true;
    const reviewDetails = make('details', null, setup, 'awp-review-details'); reviewDetails.hidden = true;
    const reviewSummary = make('summary', tx('word_practice.review_words', 'Words to review'), reviewDetails);
    const reviewGroups = make('div', null, reviewDetails);
    const reviewActions = make('div', null, reviewDetails, 'awp-review-actions');
    const reviewListButton = make('button', tx('word_practice.review_list', 'Review word list'), reviewActions); reviewListButton.type = 'button';
    reviewListButton.onclick = () => { wordsInput.focus(); wordsInput.scrollIntoView?.({ block: 'nearest' }); };
    const chooseActivityButton = make('button', tx('word_practice.choose_activity', 'Choose another activity'), reviewActions); chooseActivityButton.type = 'button';
    chooseActivityButton.onclick = () => { mode.focus(); mode.scrollIntoView?.({ block: 'nearest' }); };
    make('p', tx('word_practice.formats_note', 'HTML keeps interactive practice and works offline. PowerPoint uses fixed slides and embeds available recordings. Sentence activities use only prepared boards; PowerPoint includes prompt and answer slides.'), setup, 'awp-note awp-format-note');
    const actions = make('div', null, setup, 'awp-actions awp-delivery');
    let sheetButtonsHost = null;
    if (!context.hideInlineSheetButtons) {
      const sheetDetails = make('details', null, setup, 'awp-print-sheets');
      make('summary', tx('word_practice.printable_sheets', 'Printable classroom sheets (7)'), sheetDetails);
      sheetButtonsHost = make('div', null, sheetDetails, 'awp-actions awp-print-sheets-list');
    }
    const setActions = make('div', null, setup, 'awp-actions awp-set-actions');
    // Progress must stay outside the form's aria-busy subtree so updates can be announced during work.
    const operationPanel = make('div', null, dialog, 'awp-operation');
    const status = make('p', '', operationPanel, 'awp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    const cancelButton = make('button', tx('word_practice.cancel_preparation', 'Cancel preparation'), operationPanel); cancelButton.type = 'button'; cancelButton.hidden = true; cancelButton.onclick = cancelOperation;
    const operationProgress = make('progress', null, operationPanel); operationProgress.hidden = true; operationProgress.setAttribute('aria-label', tx('word_practice.preparation_progress', 'Preparation progress'));
    const fileInput = make('input', null, setup); fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
    const batchImageInput = make('input', null, setup); batchImageInput.type = 'file'; batchImageInput.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'; batchImageInput.multiple = true; batchImageInput.hidden = true; batchImageInput.setAttribute('aria-label', tx('word_practice.import_matching_images', 'Import images…'));
    const rowImageInput = make('input', null, setup); rowImageInput.type = 'file'; rowImageInput.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'; rowImageInput.hidden = true; rowImageInput.setAttribute('aria-label', tx('word_practice.import_word_image', 'Import image for word'));
    function options() { return core.normalizeOptions({ mode: mode.value, repetitions: repetitions.value, autoAdvance: pacing.value === 'timed', intervalSeconds: interval.value, shuffle: shuffle.checked, varyPosition: position.checked, varySize: size.checked, includeAudio: includeAudio.checked, includePictures: includePictures.checked, pictureSlides: pictureSlides.checked, vocabularyFirst: vocabularyFirst.value, ...appearance.read(), translationLanguages: translationSettings.read() }); }
    function updateAppearancePreview(current) {
      if (previewReadingNote) {
        if (useReading.checked) updateLabel(previewReadingNote, tx('word_practice.preview_reading_export_on', 'Reading settings are enabled for downloads.'));
        else {
          const marker = '\ufff0', template = tx('word_practice.preview_reading_export_off', 'Preview and live practice use your reading settings. Select {setting} to include them in downloads.', { setting: marker }), parts = template.split(marker);
          updateLabel(previewReadingNote, parts.length === 2 ? parts[0] : template + ' ');
          setLanguage(previewReadingNote, dialogTextLanguages.get(template) || 'English');
          make('span', tx('reading_settings.use_mine', 'Use my reading settings'), previewReadingNote);
          if (parts.length === 2) previewReadingNote.appendChild(doc.createTextNode(parts[1]));
        }
      }
      translationSettings.update(current.items, options());
      const opts = options();
      previewItems = opts.mode === 'sentence' ? current.items.filter(item => item.sentenceActivity) : current.items;
      const retained = previewItems.findIndex(item => item.id === previewId);
      const index = retained >= 0 ? retained : Math.min(previewIndex, Math.max(0, previewItems.length - 1));
      const item = previewItems[index];
      const modeKey = opts.mode === 'vocabulary' ? opts.mode + ':' + opts.vocabularyFirst : opts.mode;
      if (!item || item.id !== previewId || modeKey !== previewMode) previewRevealed = false;
      previewId = item ? item.id : ''; previewIndex = index; previewMode = modeKey;
      preview.hidden = false; previewToolbar.hidden = !item;
      const pickerFocused = doc.activeElement === previewPicker;
      previewPicker.hidden = previewItems.length < 2; previewPicker.disabled = busy || previewItems.length < 2;
      const hidePickerWord = row => opts.mode === 'vocabulary' && opts.vocabularyFirst === 'meaning' && core.hasMeaning(row, opts) && !(row.id === previewId && previewRevealed);
      const pickerKey = JSON.stringify([modeKey, previewItems.map(row => [row.id, row.word, hidePickerWord(row), core.fieldLanguage(row, 'term', current.language)])]);
      if (pickerKey !== previewPickerKey) {
        previewPickerKey = pickerKey; previewPicker.replaceChildren();
        const meanings = new Map(); catalogue.forEach(item => { const key = core.key(item.word); if (!meanings.has(key)) meanings.set(key, []); meanings.get(key).push(item.id); });
        previewItems.forEach((item, index) => {
          const label = core.languageLabel(core.fieldLanguage(item, 'term', current.language), uiLanguageName), duplicates = meanings.get(core.key(item.word)) || [];
          const parts = [String(index + 1)];
          const concealed = hidePickerWord(item);
          if (!concealed && (opts.mode === 'popup' || opts.mode === 'vocabulary')) parts.push('\u2068' + item.word + '\u2069');
          if (label.text) parts.push('\u2068' + (concealed ? core.maskWord(label.text, item.word) : label.text) + '\u2069');
          if (duplicates.length > 1) parts.push(tx('word_practice.meaning_number', 'Meaning {n}: ', { n: duplicates.indexOf(item.id) + 1 }).replace(/[:：]\s*$/, '').trim());
          // Native option labels cannot tag individual language parts. Keep
          // their mixed text neutral, with each authored word isolated above.
          const option = setLanguage(make('option', parts.join(' · '), previewPicker), ''); option.value = item.id;
        });
      }
      previewPicker.value = previewId;
      if (pickerFocused && previewPicker.hidden) focusPreview();
      previewPrevious.disabled = busy || index === 0; previewNext.disabled = busy || index >= previewItems.length - 1;
      updateLabel(previewProgress, item ? tx('word_practice.card_progress', 'Card {n} of {total}', { n: index + 1, total: previewItems.length }) : '');
      const previewMeaningFirst = opts.mode === 'vocabulary' && opts.vocabularyFirst === 'meaning' && core.hasMeaning(item, opts);
      const revealKey = previewMeaningFirst || opts.mode === 'blend' ? 'show_word' : opts.mode === 'vocabulary' ? 'show_meaning' : 'reveal_answer';
      updateLabel(previewReveal, tx('word_practice.' + revealKey, revealKey === 'show_word' ? 'Show word' : revealKey === 'show_meaning' ? 'Show meaning' : 'Reveal answer'));
      previewReveal.hidden = !item || opts.mode === 'popup' || (opts.mode === 'blend' && !item.phonemes.length);
      previewReveal.disabled = busy || !item || previewRevealed; previewReveal.setAttribute('aria-expanded', String(previewRevealed));
      const fieldLanguage = field => core.fieldLanguage(item, field, current.language);
      // Appearance-only changes keep the existing passages, focus and reading position.
      // Exclude audio data from this key: only its availability changes a spelling prompt.
      const contentKey = JSON.stringify([opts.mode, opts.vocabularyFirst, opts.translationLanguages, previewRevealed, item ? [item.id, item.word, item.definition, item.example, item.origin, item.translations, item.phonemes.map(sound => sound.label), item.sentenceActivity, ['term', 'definition', 'example', 'sentence', 'origin'].map(fieldLanguage), opts.mode === 'spelling' && opts.includeAudio && !!item.wordAudio, opts.includePictures && item.picture ? [item.picture.src.length, item.picture.alt, item.picture.credit] : null] : current.items.length]);
      const scrollTop = preview.scrollTop, scrollLeft = preview.scrollLeft;
      const sameContent = contentKey === previewContentKey;
      if (!sameContent) {
        previewContentKey = contentKey; preview.replaceChildren();
        const passage = (text, field, cls, parent = preview, tag = 'p') => setLanguage(make(tag, text, parent, cls), fieldLanguage(field));
        const label = (key, fallback, cls = 'awp-preview-detail') => updateLabel(make('p', '', preview, cls), tx('word_practice.' + key, fallback));
        if (!item) {
          label(opts.mode === 'sentence' && current.items.length ? 'plan_sentence_empty' : 'need_words', opts.mode === 'sentence' && current.items.length ? 'No prepared sentence activities are available. Choose another activity, or prepare sentences in Word Sounds.' : 'Add at least one word to begin.', 'awp-note');
        } else if (opts.mode === 'sentence') {
          passage(item.sentenceActivity.prompt, 'sentence', 'awp-preview-detail awp-preview-prompt');
          const choices = make('ul', null, preview, 'awp-preview-choices');
          item.sentenceActivity.choices.forEach(choice => passage(choice, 'term', 'awp-preview-choice', choices, 'li'));
          if (previewRevealed) {
            const marker = '\ufff0', template = tx('word_practice.answer', 'Answer: {answer}', { answer: marker }), parts = template.split(marker);
            const answer = make('p', '', preview, 'awp-preview-feedback'); setLanguage(answer, dialogTextLanguages.get(template) || 'English');
            answer.appendChild(doc.createTextNode(parts.length === 2 ? parts[0] : template + ' '));
            passage(item.sentenceActivity.answer, 'term', '', answer, 'span');
            if (parts.length === 2) answer.appendChild(doc.createTextNode(parts[1]));
          }
        } else if (opts.mode === 'spelling' && !previewRevealed) {
          if (opts.includeAudio && item.wordAudio) label('spell_listen', 'Listen, then spell the word.');
          else label('spell_teacher', 'Ask your teacher to say the word, then spell it.');
        } else if (opts.mode === 'blend' && !previewRevealed && item.phonemes.length) {
          const sounds = setLanguage(make('div', null, preview, 'awp-preview-sounds'), fieldLanguage('term'));
          item.phonemes.forEach(sound => passage(sound.label, 'term', 'awp-preview-sound', sounds, 'span'));
          label('blend_help', 'Say the sounds, then blend the word.', 'awp-note awp-gap');
        } else if (previewMeaningFirst && !previewRevealed) {
          const clue = core.recallClue({ ...item, translations: core.visibleTranslations(item, opts) }, tx('word_practice.picture_clue', 'Picture clue'));
          label('meaning_first_prompt', 'Which word matches this meaning?', 'awp-note awp-meaning-prompt');
          if (opts.includePictures && clue.picture) {
            const figure = make('figure', null, preview, 'awp-picture'), image = make('img', null, figure);
            image.src = clue.picture.src; image.alt = clue.picture.alt || '';
            if (clue.picture.usesClueLabel) setLanguage(image, dialogTextLanguages.get(tx('word_practice.picture_clue', 'Picture clue')));
            if (!clue.picture.alt) image.setAttribute('role', 'presentation');
            if (clue.picture.credit) make('figcaption', clue.picture.credit, figure);
          }
          if (clue.definition) passage(clue.definition, 'definition', 'awp-preview-detail awp-gap awp-preview-definition');
          if (clue.example) passage(clue.example, 'example', 'awp-preview-detail awp-preview-example');
          clue.translations.forEach(translation => {
            const row = make('p', '', preview, 'awp-preview-detail');
            if (translation.language) { const name = core.languageLabel(translation.language, uiLanguageName); setLanguage(make('span', core.maskWord(name.text, item.word) + ': ', row, 'awp-preview-language-name'), name.language); }
            setLanguage(make('span', translation.text, row, 'awp-preview-translation'), translation.language);
          });
        } else {
          passage(item.word, 'term', 'awp-preview-word', preview, 'div');
          if (opts.mode === 'vocabulary' && previewRevealed) {
            if (opts.includePictures && item.picture) {
              const figure = make('figure', null, preview, 'awp-picture'), image = make('img', null, figure);
              image.src = item.picture.src; image.alt = item.picture.alt || '';
              if (!item.picture.alt) image.setAttribute('role', 'presentation');
              if (item.picture.credit) make('figcaption', item.picture.credit, figure);
            }
            if (item.definition) passage(item.definition, 'definition', 'awp-preview-detail awp-gap awp-preview-definition');
            if (item.example) passage(item.example, 'example', 'awp-preview-detail awp-preview-example');
            if (item.origin) {
              const marker = '\ufff0', template = tx('word_practice.word_origin', 'Word origin: {origin}', { origin: marker }), parts = template.split(marker);
              const origin = make('p', '', preview, 'awp-preview-detail awp-preview-origin'); setLanguage(origin, dialogTextLanguages.get(template) || 'English');
              origin.appendChild(doc.createTextNode(parts.length === 2 ? parts[0] : template + ' '));
              passage(item.origin, 'origin', '', origin, 'span');
              if (parts.length === 2) origin.appendChild(doc.createTextNode(parts[1]));
            }
            core.visibleTranslations(item, opts).forEach(translation => {
              const row = make('p', '', preview, 'awp-preview-detail');
              if (translation.language) { const label = core.languageLabel(translation.language, uiLanguageName); setLanguage(make('span', label.text + ': ', row, 'awp-preview-language-name'), label.language); }
              setLanguage(make('span', translation.text, row, 'awp-preview-translation'), translation.language);
            });
            if (!item.definition && !item.example && !item.origin && !item.translations.length) label('no_meaning', 'No meaning or example has been prepared for this word.', 'awp-note awp-gap');
          }
        }
        preview.scrollTop = 0; preview.scrollLeft = 0;
      }
      styleCardSurface(preview, opts, core);
      if (sameContent) { preview.scrollTop = scrollTop; preview.scrollLeft = scrollLeft; }
    }
    function readPack() {
      // Match each written occurrence to a distinct authored entry. Current
      // selection order wins; removed entries remain available for restoration.
      const candidates = new Map(), seen = new Set();
      [...pack.items, ...catalogue.values()].forEach(item => { if (seen.has(item.id)) return; seen.add(item.id); const key = core.key(item.word); if (!candidates.has(key)) candidates.set(key, []); candidates.get(key).push(item); });
      const used = new Map(), newWords = new Map();
      const words = core.parseWords(wordsInput.value, { lineSeparated: true }).map(word => {
        const key = core.key(word), choices = candidates.get(key) || [], index = used.get(key) || 0; used.set(key, index + 1);
        if (choices.length) return index < choices.length ? { ...choices[index], word, ...(annotationStore.has(choices[index].id) ? { annotations: annotationStore.get(choices[index].id) } : {}) } : null;
        if (!newWords.has(key)) {
          let extra = null;
          if (typeof context.resolveEntry === 'function') {
            try { extra = context.resolveEntry(word); } catch (_) { extra = null; }
          }
          newWords.set(key, { ...(extra && typeof extra === 'object' ? extra : {}), id: newEntryId(), word });
        }
        return { ...newWords.get(key), word };
      }).filter(Boolean);
      pack = core.normalizeInput({ title: titleInput.value, language: pack.language, words, reviewItemIds: [...review], options: options(), phonemeBank: inheritedBanks().phonemeBank });
      remember(pack);
      return pack;
    }
    function meaningExcerpt(value, language) {
      if (value.length <= 160) return value;
      let end = 0;
      try {
        const segmenter = new root.Intl.Segmenter(core.languageInfo(language).tag || undefined, { granularity: 'grapheme' });
        for (const part of segmenter.segment(value)) {
          const next = part.index + part.segment.length;
          if (next > 157) break;
          end = next;
        }
      } catch (_) {
        // Without grapheme segmentation, keep marks and joined emoji together.
        // Conservatively retain the rest of a marked word as one cluster too.
        let offset = 0, previous = '', marked = false, regionalCount = 0;
        const hangul = /[\u1100-\u11ff\ua960-\ua97c\uac00-\ud7a3\ud7b0-\ud7fb]/u;
        for (const char of value) {
          const mark = /\p{M}/u.test(char), regional = /\p{Regional_Indicator}/u.test(char);
          const joined = offset && ((previous === '\r' && char === '\n') || (!/\s/u.test(char) && (mark || /[\u200c\u200d\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(char) || previous === '\u200d' || (marked && /\p{L}/u.test(char)) || (hangul.test(previous) && hangul.test(char)) || (regional && regionalCount % 2))));
          if (!joined) { if (offset > 157) break; end = offset; marked = false; }
          marked = marked || mark; offset += char.length; previous = char; regionalCount = regional ? regionalCount + 1 : 0;
        }
        if (offset <= 157) end = offset;
      }
      return value.slice(0, end) + '…';
    }
    function renderMeaningChoices() {
      const active = doc.activeElement;
      const focused = meaningChoices.contains(active) ? { id: active.dataset.entryId, tag: active.tagName } : null;
      const expanded = new Set([...meaningChoices.querySelectorAll('details[open]')].map(node => node.dataset.entryId));
      const scrollPositions = new Map([...meaningChoices.querySelectorAll('.awp-meaning-definition')].map(node => [node.dataset.entryId, node.scrollTop]));
      const groups = new Map(); catalogue.forEach(item => { const key = core.key(item.word); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
      const duplicates = [...groups.values()].filter(items => items.length > 1);
      meaningChoices.replaceChildren(); meaningChoices.hidden = !duplicates.length;
      if (!duplicates.length) return;
      make('legend', tx('word_practice.meaning_choices', 'Choose meanings'), meaningChoices);
      make('p', tx('word_practice.meaning_choices_help', 'Entries with the same spelling stay separate. Select the meanings to include.'), meaningChoices, 'awp-note');
      const selected = new Set(pack.items.map(item => item.id));
      let detailNumber = 0;
      duplicates.forEach(items => {
        const languageKeys = new Set(items.map(item => { const value = core.fieldLanguage(item, 'term', pack.language); return core.languageInfo(value).tag || core.key(value); }));
        items.forEach((item, index) => {
        const label = make('label', null, meaningChoices), input = make('input', null, label); input.type = 'checkbox'; input.checked = selected.has(item.id); input.disabled = busy; input.dataset.entryId = item.id;
        const labelText = make('span', null, label, 'awp-meaning-copy');
        const marker = tx('word_practice.meaning_number', 'Meaning {n}: ', { n: index + 1 });
        const heading = setLanguage(make('span', null, labelText, 'awp-meaning-heading'), dialogTextLanguages.get(marker) || 'English');
        make('span', marker, heading, 'awp-meaning-number');
        if (!/\s$/u.test(marker)) heading.append(doc.createTextNode(' '));
        setLanguage(make('bdi', item.word, heading, 'awp-meaning-term'), core.fieldLanguage(item, 'term', pack.language));
        if (languageKeys.size > 1 || (!item.definition && item.termLanguage)) {
          const languageLabel = core.languageLabel(core.fieldLanguage(item, 'term', pack.language), uiLanguageName);
          heading.append(doc.createTextNode(' · '));
          setLanguage(make('span', languageLabel.text, heading, 'awp-note awp-meaning-language'), languageLabel.language);
        }
        if (item.definition) {
          const language = core.fieldLanguage(item, 'definition', pack.language), excerpt = meaningExcerpt(item.definition, language);
          labelText.append(doc.createTextNode('\n'));
          setLanguage(make('span', excerpt, labelText, 'awp-meaning-excerpt'), language);
          if (excerpt !== item.definition) {
            const details = make('details', null, meaningChoices, 'awp-meaning-details'); details.dataset.entryId = item.id; details.open = expanded.has(item.id);
            const summary = make('summary', tx('word_practice.show_meaning', 'Show meaning'), details); summary.dataset.entryId = item.id;
            summary.id = fieldPrefix + 'meaning-detail-' + (++detailNumber); labelText.id = summary.id + '-label'; summary.setAttribute('aria-describedby', labelText.id);
            const body = setLanguage(make('p', item.definition, details, 'awp-meaning-definition'), language);
            body.dataset.entryId = item.id; body.tabIndex = 0; body.setAttribute('role', 'region'); body.setAttribute('aria-labelledby', summary.id + ' ' + labelText.id); body.scrollTop = scrollPositions.get(item.id) || 0;
          }
        }
        input.addEventListener('change', event => {
          event.stopPropagation();
          try {
            const current = readPack();
            const words = input.checked ? [...current.items.filter(value => value.id !== item.id), catalogue.get(item.id)] : current.items.filter(value => value.id !== item.id);
            pack = core.normalizeInput({ ...current, words, options: options() }); remember(pack); wordsInput.value = pack.items.map(value => value.word).join('\n'); updateCoverage();
          } catch (error) { updateCoverage(); status.textContent = error.message || tx('word_practice.action_failed', 'Unable to finish this action.'); setLanguage(status, 'English'); }
        });
        });
      });
      if (focused?.id) [...meaningChoices.querySelectorAll('[data-entry-id]')].find(node => node.dataset.entryId === focused.id && node.tagName === focused.tag)?.focus({ preventScroll: true });
    }
    function updateLabel(node, value) { if (node.textContent !== value) node.textContent = value; setLanguage(node, dialogTextLanguages.get(value) || 'English'); }
    function updatePlan(current) {
      const opts = options(), total = current.items.length;
      const selected = opts.mode === 'sentence' ? current.items.filter(item => item.sentenceActivity) : current.items;
      updateLabel(planCount, tx('word_practice.plan_count', 'Practice cards: {cards} · Words included: {words} · Repetitions: {repetitions}', { cards: selected.length * opts.repetitions, words: selected.length, repetitions: opts.repetitions }));
      let notice = '';
      if (!total) notice = tx('word_practice.need_words', 'Add at least one word to begin.');
      else if (opts.mode === 'sentence' && !selected.length) notice = tx('word_practice.plan_sentence_empty', 'No prepared sentence activities are available. Choose another activity, or prepare sentences in Word Sounds.');
      else if (opts.mode === 'sentence' && selected.length < total) notice = tx('word_practice.plan_sentence_subset', 'Words with prepared sentence activities: {included} of {total}. The other words will be left out of this activity.', { included: selected.length, total });
      else if (opts.mode === 'blend') {
        const missing = selected.filter(item => !item.phonemes.length).length;
        if (missing) notice = tx('word_practice.plan_sounds_missing', 'Words without a prepared sound sequence: {count}. They will appear as whole words.', { count: missing });
      } else if (opts.mode === 'vocabulary') {
        const missing = selected.filter(item => !item.definition && !item.example && !item.origin && !item.translations.length).length;
        if (missing) notice = tx('word_practice.plan_meanings_missing', 'Words without a meaning, example or translation: {count}. Add that content in the source glossary or choose another activity.', { count: missing });
      } else if (opts.mode === 'spelling') {
        const missing = selected.filter(item => !opts.includeAudio || !item.wordAudio).length;
        if (missing) notice = tx('word_practice.plan_teacher_voice', 'Words needing a teacher to say them aloud: {count} of {total}. Prepare and include audio for independent spelling practice.', { count: missing, total });
      }
      planNote.hidden = !notice; updateLabel(planNote, notice); plan.dataset.needsReview = String(!!notice);
      audioModeNote.hidden = opts.includeAudio;
      updateLabel(audioModeNote, opts.includeAudio ? '' : tx('word_practice.audio_excluded', 'Prepared audio will be left out of the presentation, downloads and saved word set.'));
      const groups = [];
      const addGroup = (key, fallback, items) => { if (items.length) groups.push({ key, title: tx(key, fallback), items }); };
      if (opts.mode === 'sentence') addGroup('word_practice.review_missing_sentences', 'No prepared sentence activity', current.items.filter(item => !item.sentenceActivity));
      if (opts.mode === 'vocabulary') addGroup('word_practice.review_missing_meanings', 'No meaning, example or translation', selected.filter(item => !item.definition && !item.example && !item.origin && !item.translations.length));
      if (opts.mode === 'blend') addGroup('word_practice.review_missing_sounds', 'No prepared sound sequence', selected.filter(item => !item.phonemes.length));
      if (opts.includeAudio) {
        addGroup('word_practice.review_missing_audio', 'No word recording', selected.filter(item => !item.wordAudio));
        if (opts.mode === 'blend') addGroup('word_practice.review_incomplete_audio', 'Incomplete sound recordings', selected.filter(item => item.phonemes.length && item.phonemes.some(sound => !sound.audio)));
      }
      const focusedGroup = reviewGroups.contains(doc.activeElement) ? doc.activeElement.dataset.reviewGroup : '';
      const scrollPositions = new Map([...reviewGroups.querySelectorAll('ul')].map(list => [list.dataset.reviewGroup, list.scrollTop]));
      reviewDetails.hidden = !groups.length; reviewGroups.replaceChildren();
      groups.forEach((group, index) => {
        const heading = make('h2', group.title, reviewGroups); heading.id = fieldPrefix + 'review-' + index;
        const list = make('ul', null, reviewGroups); list.tabIndex = 0; list.dataset.reviewGroup = group.key; list.setAttribute('aria-labelledby', heading.id);
        group.items.forEach(item => setLanguage(make('li', item.word, list), core.fieldLanguage(item, 'term', current.language)));
        list.scrollTop = scrollPositions.get(group.key) || 0;
      });
      if (focusedGroup) {
        const nextFocus = [...reviewGroups.querySelectorAll('ul')].find(list => list.dataset.reviewGroup === focusedGroup);
        (nextFocus || (groups.length ? reviewSummary : wordsInput)).focus({ preventScroll: true });
      }
    }
    // The picture choice appears only when a word has a picture. The note says what is
    // left out: pictures over the size budget, and links or WebP that slides cannot embed.
    function updatePictureNote(current) {
      const withPictures = current.items.filter(item => item.picture), omitted = current.picturesOmitted || 0;
      const hasPictures = !!(withPictures.length || omitted);
      includePictures.closest('label').hidden = !hasPictures;
      pictureSlides.closest('label').hidden = !hasPictures;
      const notes = [];
      if (includePictures.checked && omitted) notes.push(tx('word_practice.pictures_left_out', 'Pictures left out to keep this set a manageable size: {count}.', { count: omitted }));
      const notInSlides = withPictures.filter(item => !/^data:image\/(png|jpeg|gif);/i.test(item.picture.src)).length;
      if (includePictures.checked && notInSlides) notes.push(tx('word_practice.pictures_not_in_pptx', 'Pictures that are web links or WebP images, which PowerPoint cannot include: {count}. They still show when presenting and in the HTML file.', { count: notInSlides }));
      pictureNote.hidden = !notes.length; updateLabel(pictureNote, notes.join(' '));
    }
    let activeSymbolRowId = '', symbolSearchQuery = '', symbolTargetId = '', lastPictureKey = '';
    const getPictureMatcher = () => root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher) || null;
    const hasSymbolSource = () => typeof context.searchSymbols === 'function' || !!(root.AlloModules && root.AlloModules.WordSoundsSymbols) || !!getPictureMatcher();
    async function findSymbols(query) {
      if (typeof context.searchSymbols === 'function') return (await context.searchSymbols(query)) || [];
      const matcher = getPictureMatcher();
      const bank = root.AlloModules && root.AlloModules.WordSoundsSymbols;
      if (matcher && typeof matcher.searchSymbols === 'function') {
        return await matcher.searchSymbols(query, { symbols: bank, allowOnlineGlobalSymbols: !!context.allowOnlineSymbols });
      }
      if (!bank || typeof bank.words !== 'function') return [];
      if (typeof bank.ready === 'function') { try { await bank.ready(); } catch (_) {} }
      const q = String(query || '').trim().toLowerCase(), hits = [];
      for (const word of bank.words()) {
        if (q && !word.toLowerCase().includes(q)) continue;
        const entry = bank.get(word);
        if (entry && entry.svg) hits.push({ word, label: entry.label || word, svg: entry.svg, set: entry.set, credit: bank.credits && bank.credits[entry.set] });
        if (hits.length >= 24) break;
      }
      return hits;
    }
    // The teacher's own meaning and example sentence for one word (2026-11-16). The catalogue is updated too, so the
    // edit stays when the word list is read again; resolveEntry (a prepared word bank) only fills words it has not seen.
    let activeTextRowId = '';
    function applyWordText(entryId, definition, example) {
      const updateItem = entry => entry ? { ...entry, definition: core.text(definition, 1000), example: core.text(example, 1000), textEdited: true } : entry;
      if (catalogue.has(entryId)) catalogue.set(entryId, updateItem(catalogue.get(entryId)));
      pack = core.normalizeInput({ ...pack, words: pack.items.map(item => item.id === entryId ? updateItem(item) : item), options: options() });
      cardContentRevision += 1;
      remember(pack); lastPictureKey = ''; previewContentKey = ''; updateCoverage();
    }
    function applyWordPicture(entryId, src, alt, attribution) {
      const safe = core.safePicture(src);
      if (!safe) throw new Error(tx('word_practice.picture_invalid', 'That image could not be added. Choose a PNG, JPEG, GIF, WebP, or SVG image.'));
      const updateItem = entry => {
        if (!entry) return entry;
        const cleanAlt = core.text(alt || entry.word, 1000);
        const credit = typeof attribution === 'string' ? core.text(attribution, 400) : attribution && typeof attribution === 'object' ? ['set', 'author', 'license'].map(k => core.text(attribution[k], 160)).filter(Boolean).join(' · ') : '';
        return { ...entry, image: safe, imageAlt: cleanAlt, imageDecorative: false, imageAltHash: '', imageAttribution: attribution || { set: credit || 'Custom image' }, picture: { src: safe, alt: cleanAlt, decorative: false, credit } };
      };
      if (catalogue.has(entryId)) catalogue.set(entryId, updateItem(catalogue.get(entryId)));
      pack = core.normalizeInput({ ...pack, words: pack.items.map(item => item.id === entryId ? updateItem(item) : item), options: options() });
      cardContentRevision += 1;
      remember(pack); includePictures.checked = true; lastPictureKey = ''; previewContentKey = ''; updateCoverage();
    }
    function clearWordPicture(entryId) {
      const stripItem = entry => entry ? { ...entry, image: '', imageAlt: '', imageDecorative: false, imageAltHash: '', imageAttribution: null, picture: null } : entry;
      if (catalogue.has(entryId)) catalogue.set(entryId, stripItem(catalogue.get(entryId)));
      pack = core.normalizeInput({ ...pack, words: pack.items.map(item => item.id === entryId ? stripItem(item) : item), options: options() });
      cardContentRevision += 1;
      remember(pack); lastPictureKey = ''; previewContentKey = ''; updateCoverage();
    }
    async function populateSymbolGrid(gridNode, row, query) {
      const reqId = (Number(gridNode._awpSymReq) || 0) + 1;
      gridNode._awpSymReq = reqId;
      gridNode.replaceChildren();
      const empty = make('p', tx('word_practice.searching_symbols', 'Loading symbols…'), gridNode, 'awp-note');
      try {
        const list = await findSymbols(query);
        if (closed || !gridNode.isConnected || gridNode._awpSymReq !== reqId) return;
        gridNode.replaceChildren();
        if (!list.length) { make('p', tx('word_practice.no_symbols_found', 'No built-in symbols matched that search. Try Import image… to use your own picture.'), gridNode, 'awp-note'); return; }
        list.slice(0, 24).forEach(sym => {
          const btn = make('button', null, gridNode); btn.type = 'button';
          const safeSrc = sym.src ? (core && core.safePicture ? core.safePicture(sym.src) : '') : '';
          const safeSvg = !safeSrc && sym.svg ? sanitizeSvgMarkup(sym.svg) : '';
          if (safeSrc || safeSvg) {
            const img = make('img', null, btn);
            img.src = safeSrc || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(safeSvg));
            img.alt = '';
          }
          make('span', sym.label || sym.word || '', btn);
          btn.onclick = async () => {
            await action(async () => {
              const rasterizer = (root.AlloModules && root.AlloModules.WordPractice && typeof root.AlloModules.WordPractice.rasterizeImage === 'function')
                ? root.AlloModules.WordPractice.rasterizeImage : rasterizeImageToPng;
              const png = await rasterizer(sym.svg || sym.src, doc);
              const fallbackCredit = sym.set === 'openmoji' ? { set: 'OpenMoji', license: 'CC BY-SA 4.0' } : { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' };
              activeSymbolRowId = '';
              applyWordPicture(row.id, png, sym.label || row.word, sym.credit || fallbackCredit);
              status.textContent = tx('word_practice.picture_updated', 'Picture updated for {word}.', { word: row.word });
            }, btn);
            if (!closed && (!doc.activeElement || doc.activeElement === doc.body || !pictureList.contains(doc.activeElement))) {
              (findRowBtn(row.id, 'symbol') || findRowBtn(row.id, 'import') || pictureDetails.querySelector('summary'))?.focus();
            }
          };
        });
      } catch (err) {
        if (closed || !gridNode.isConnected || gridNode._awpSymReq !== reqId) return;
        gridNode.replaceChildren(); empty.textContent = (err && err.message) || 'Could not load symbols.'; gridNode.appendChild(empty);
      }
    }
    const findRow = targetId => Array.from(pictureList.querySelectorAll('.awp-picture-row')).find(node => node.dataset.wordId === targetId) || null;
    const findRowBtn = (targetId, actionName) => findRow(targetId)?.querySelector('[data-pic-action="' + actionName + '"]') || null;
    function renderPictureManager(current) {
      pictureDetails.hidden = !current.items.length;
      const key = JSON.stringify([activeSymbolRowId, activeTextRowId, current.items.map(item => [item.id, item.word, item.definition, item.example, item.picture ? [item.picture.src.length, item.picture.alt, item.picture.credit] : null])]);
      if (key === lastPictureKey) return;
      const activeEl = doc.activeElement;
      const prevRow = activeEl && pictureList.contains(activeEl) ? activeEl.closest('.awp-picture-row') : null;
      const prevFocus = prevRow ? {
        wordId: prevRow.dataset.wordId,
        action: activeEl.dataset?.picAction || '',
        isAlt: !!(activeEl.classList && activeEl.classList.contains('awp-picture-alt')),
      } : null;
      lastPictureKey = key;
      pictureList.replaceChildren();
      const symbolsAvailable = hasSymbolSource();
      autoFillPicturesBtn.hidden = !symbolsAvailable;
      current.items.forEach(item => {
        const row = make('div', null, pictureList, 'awp-picture-row'); row.dataset.wordId = item.id;
        if (item.picture) {
          const thumb = make('img', null, row, 'awp-picture-thumb');
          thumb.src = item.picture.src; thumb.alt = item.picture.alt || item.word;
        } else {
          make('div', tx('word_practice.no_picture', 'None'), row, 'awp-picture-empty');
        }
        const meta = make('div', null, row, 'awp-picture-meta');
        const top = make('div', null, meta, 'awp-picture-word-row');
        setLanguage(make('span', item.word, top, 'awp-picture-word'), core.fieldLanguage(item, 'term', current.language));
        if (item.picture && item.picture.credit) make('span', item.picture.credit, top, 'awp-note');
        const rowBtns = make('div', null, meta, 'awp-picture-actions');
        const importBtn = make('button', item.picture ? tx('word_practice.replace_image', 'Switch image…') : tx('word_practice.import_image', 'Import image…'), rowBtns); importBtn.type = 'button'; importBtn.dataset.picAction = 'import';
        importBtn.onclick = () => { if (!busy) { symbolTargetId = item.id; rowImageInput.value = ''; rowImageInput.click(); } };
        if (symbolsAvailable) {
          const symBtn = make('button', tx('word_practice.switch_symbol', 'Choose symbol…'), rowBtns); symBtn.type = 'button'; symBtn.dataset.picAction = 'symbol';
          symBtn.setAttribute('aria-expanded', String(activeSymbolRowId === item.id));
          symBtn.onclick = () => {
            const opening = activeSymbolRowId !== item.id;
            activeSymbolRowId = opening ? item.id : '';
            symbolSearchQuery = item.word; lastPictureKey = ''; renderPictureManager(pack);
            if (opening) findRow(item.id)?.querySelector('.awp-symbol-search')?.focus();
            else findRowBtn(item.id, 'symbol')?.focus();
          };
        }
        if (item.picture) {
          const clearBtn = make('button', tx('word_practice.remove_image', 'Remove'), rowBtns); clearBtn.type = 'button'; clearBtn.dataset.picAction = 'remove';
          clearBtn.onclick = () => {
            clearWordPicture(item.id);
            status.textContent = tx('word_practice.picture_removed', 'Picture removed from {word}.', { word: item.word });
            (findRowBtn(item.id, 'edit') || findRowBtn(item.id, 'symbol') || findRowBtn(item.id, 'import') || pictureDetails.querySelector('summary'))?.focus();
          };
          const altInput = make('input', null, meta, 'awp-picture-alt'); altInput.type = 'text'; altInput.value = item.picture.alt || '';
          altInput.placeholder = tx('word_practice.alt_placeholder', 'Describe this picture');
          altInput.setAttribute('aria-label', tx('word_practice.alt_label', 'Image description for {word}', { word: item.word }));
          altInput.addEventListener('change', event => {
            event.stopPropagation();
            const nextAlt = core.text(altInput.value, 1000) || item.word;
            applyWordPicture(item.id, item.picture.src, nextAlt, item.imageAttribution || item.picture.credit);
          });
        }
        const textBtn = make('button', tx('word_practice.edit_meaning', 'Edit meaning…'), rowBtns); textBtn.type = 'button';
        textBtn.dataset.editText = item.id; textBtn.dataset.picAction = 'edit';
        textBtn.setAttribute('aria-expanded', String(activeTextRowId === item.id));
        textBtn.setAttribute('aria-label', tx('word_practice.edit_meaning_for', 'Edit the meaning and sentence for {word}', { word: item.word }));
        const findEditBtn = targetId => Array.from(pictureList.querySelectorAll('[data-edit-text]')).find(el => el.dataset.editText === targetId);
        textBtn.onclick = () => { activeTextRowId = activeTextRowId === item.id ? '' : item.id; lastPictureKey = ''; renderPictureManager(pack); const again = findEditBtn(item.id); if (activeTextRowId) pictureList.querySelector('.awp-text-edit textarea')?.focus(); else again?.focus(); };
        if (activeTextRowId === item.id) {
          const editor = make('div', null, meta, 'awp-text-edit');
          const fieldFor = (labelText, value, name) => {
            const label = make('label', null, editor);
            make('span', labelText, label);
            const area = make('textarea', null, label); area.rows = 2; area.maxLength = 1000; area.value = value || ''; area.dataset.editField = name;
            setLanguage(area, core.fieldLanguage(item, name === 'definition' ? 'definition' : 'example', current.language));
            return area;
          };
          const meaningArea = fieldFor(tx('word_practice.meaning_label', 'Meaning'), item.definition, 'definition');
          const sentenceArea = fieldFor(tx('word_practice.sentence_label', 'Example sentence'), item.example, 'example');
          const editRow = make('div', null, editor, 'awp-row');
          const saveText = make('button', tx('word_practice.save_meaning', 'Save'), editRow, 'awp-primary'); saveText.type = 'button'; saveText.dataset.editSave = item.id;
          saveText.onclick = () => {
            applyWordText(item.id, meaningArea.value, sentenceArea.value);
            activeTextRowId = ''; lastPictureKey = ''; renderPictureManager(pack);
            status.textContent = tx('word_practice.meaning_updated', 'Meaning updated for {word}. It is used on the cards, the offline file and the printed sheets.', { word: item.word });
            findEditBtn(item.id)?.focus();
          };
          const closeText = make('button', tx('word_practice.close', 'Close'), editRow); closeText.type = 'button';
          closeText.onclick = () => { activeTextRowId = ''; lastPictureKey = ''; renderPictureManager(pack); findEditBtn(item.id)?.focus(); };
          [meaningArea, sentenceArea].forEach(area => area.addEventListener('change', event => event.stopPropagation()));
        }
        if (symbolsAvailable && activeSymbolRowId === item.id) {
          const picker = make('div', null, meta, 'awp-symbol-picker');
          const searchRow = make('div', null, picker, 'awp-row');
          const searchInput = make('input', null, searchRow, 'awp-symbol-search'); searchInput.type = 'search';
          searchInput.value = symbolSearchQuery || item.word;
          searchInput.setAttribute('aria-label', tx('word_practice.search_symbols', 'Search built-in symbols'));
          searchInput.placeholder = tx('word_practice.search_symbols_hint', 'Search symbols (e.g. cat, apple, sun)');
          const symGrid = make('div', null, picker, 'awp-symbol-grid');
          searchInput.addEventListener('input', () => { symbolSearchQuery = searchInput.value; populateSymbolGrid(symGrid, item, symbolSearchQuery); });
          const closeSym = make('button', tx('word_practice.close', 'Close'), searchRow); closeSym.type = 'button';
          closeSym.onclick = () => {
            activeSymbolRowId = ''; lastPictureKey = ''; renderPictureManager(pack);
            (findRowBtn(item.id, 'symbol') || findRowBtn(item.id, 'import') || pictureDetails.querySelector('summary'))?.focus();
          };
          populateSymbolGrid(symGrid, item, symbolSearchQuery || item.word);
        }
      });
      if (prevFocus && (!doc.activeElement || doc.activeElement === doc.body)) {
        const target = prevFocus.isAlt
          ? (findRow(prevFocus.wordId)?.querySelector('.awp-picture-alt') || findRowBtn(prevFocus.wordId, 'import'))
          : prevFocus.action
            ? (findRowBtn(prevFocus.wordId, prevFocus.action) || findRowBtn(prevFocus.wordId, 'edit') || findRowBtn(prevFocus.wordId, 'symbol') || findRowBtn(prevFocus.wordId, 'import'))
            : null;
        target?.focus?.({ preventScroll: true });
      }
    }
    batchImportBtn.onclick = () => { if (!busy) { batchImageInput.value = ''; batchImageInput.click(); } };
    autoFillPicturesBtn.onclick = () => action(async run => {
      const current = readPack();
      const missing = current.items.filter(it => !it.picture && !it.image);
      if (!missing.length) {
        status.textContent = tx('word_practice.pictures_already_complete', 'Every word in this set already has a picture.');
        return;
      }
      const matcher = getPictureMatcher();
      const rawBank = root.AlloModules && root.AlloModules.WordSoundsSymbols;
      const bank = matcher && typeof matcher.ensureSymbols === 'function'
        ? await matcher.ensureSymbols({ symbols: rawBank })
        : rawBank;
      if (bank && !matcher && typeof bank.ready === 'function') { try { await bank.ready(); } catch (_) {} }
      let matched = 0, failed = 0;
      for (const item of missing) {
        if (!isCurrentOperation(run)) return;
        let hit = null;
        if (matcher && typeof matcher.matchWord === 'function') {
          hit = matcher.matchWord({ word: item.word, lemma: item.lemma, definition: item.definition }, { symbols: bank, preferDiagrams: true });
        }
        if (!hit && bank && typeof bank.get === 'function') {
          const exact = bank.get(String(item.word || '').toLowerCase());
          if (exact && exact.svg) hit = { word: item.word, svg: exact.svg, label: exact.label || item.word, set: exact.set, alt: exact.label || item.word, credit: bank.credits && bank.credits[exact.set] };
        }
        if (!hit && typeof context.searchSymbols === 'function') {
          const list = await context.searchSymbols(item.word) || [];
          const cleanWord = String(item.word || '').trim().toLowerCase();
          hit = list.find(s => s && (s.svg || s.src) && String(s.word || '').trim().toLowerCase() === cleanWord) || list[0] || null;
        }
        if (!hit || (!hit.svg && !hit.src)) continue;
        let png = '';
        try {
          const rasterizer = (root.AlloModules && root.AlloModules.WordPractice && typeof root.AlloModules.WordPractice.rasterizeImage === 'function')
            ? root.AlloModules.WordPractice.rasterizeImage : rasterizeImageToPng;
          png = await rasterizer(hit.svg || hit.src, doc);
        } catch (_) {
          failed++;
          continue;
        }
        const fallbackCredit = hit.set === 'openmoji' ? { set: 'OpenMoji', license: 'CC BY-SA 4.0' } : { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' };
        applyWordPicture(item.id, png, hit.alt || hit.label || item.word, hit.credit || fallbackCredit);
        matched++;
      }
      if (matched) {
        status.textContent = tx('word_practice.pictures_auto_filled', 'Added pictures to {count} word(s).', { count: matched }) + (failed ? ' (' + failed + ' could not be converted.)' : '');
      } else if (failed) {
        status.textContent = tx('word_practice.pictures_convert_failed', 'Matched pictures could not be converted in this browser. Try Import image… with PNG or JPEG files.');
      } else {
        status.textContent = tx('word_practice.no_symbols_found', 'No built-in symbols matched that search. Try Import image… to use your own picture.');
      }
    }, autoFillPicturesBtn);
    rowImageInput.addEventListener('change', event => {
      event.stopPropagation();
      const file = rowImageInput.files && rowImageInput.files[0], targetId = symbolTargetId;
      if (!file || !targetId) return;
      action(async () => {
        const currentItem = pack.items.find(it => it.id === targetId) || catalogue.get(targetId);
        const rasterizer = (root.AlloModules && root.AlloModules.WordPractice && typeof root.AlloModules.WordPractice.rasterizeImage === 'function')
          ? root.AlloModules.WordPractice.rasterizeImage : rasterizeImageToPng;
        const png = await rasterizer(file, doc);
        applyWordPicture(targetId, png, (currentItem && currentItem.word) || file.name.replace(/\.[^.]+$/, ''), { set: 'Custom imported image' });
        status.textContent = tx('word_practice.picture_updated', 'Picture updated for {word}.', { word: currentItem ? currentItem.word : 'word' });
      }, rowImageInput);
    });
    batchImageInput.addEventListener('change', event => {
      event.stopPropagation();
      const files = Array.from(batchImageInput.files || []);
      if (!files.length) return;
      action(async () => {
        const current = readPack(); let matched = 0, failed = 0;
        const rasterizer = (root.AlloModules && root.AlloModules.WordPractice && typeof root.AlloModules.WordPractice.rasterizeImage === 'function')
          ? root.AlloModules.WordPractice.rasterizeImage : rasterizeImageToPng;
        for (const file of files) {
          const stem = file.name.replace(/\.[^.]+$/, '').replace(/^[0-9]+[-_\s]+/, '').trim().toLowerCase();
          const target = current.items.find(it => core.key(it.word) === core.key(stem)) || (current.items.length === 1 && files.length === 1 ? current.items[0] : null);
          if (!target) continue;
          let png = '';
          try { png = await rasterizer(file, doc); } catch (_) { failed++; continue; }
          applyWordPicture(target.id, png, target.word, { set: 'Custom imported image' });
          matched++;
        }
        status.textContent = matched
          ? tx('word_practice.batch_pictures_imported', 'Added custom pictures to {count} word(s).', { count: matched }) + (failed ? ' (' + failed + ' could not be converted.)' : '')
          : failed
            ? tx('word_practice.pictures_convert_failed', 'Matched pictures could not be converted in this browser. Try Import image… with PNG or JPEG files.')
            : tx('word_practice.batch_pictures_none', 'No filenames matched the words in your list. Name image files after words (for example, cat.png) or use Import image on a word row.');
      }, batchImportBtn);
    });
    function updateCoverage() {
      try { const current = readPack(), counts = core.audioCoverage(current), sentences = current.items.filter(item => item.sentenceActivity).length; coverage.textContent = tx('word_practice.coverage', '{count} words · Word audio: {audio}/{total} · Complete sound sequences: {complete}/{total} · Sentence activities: {sentences}', { count: current.items.length, audio: counts.words, total: counts.totalWords, complete: counts.completePhonemeWords, sentences: sentences }); setLanguage(coverage, dialogTextLanguages.get(coverage.textContent));
        const stale = includeAudio.checked ? core.audioIssueCounts(current).staleLanguage : 0; audioWarning.hidden = !stale;
        if (stale) { audioWarning.textContent = tx(stale === 1 ? 'word_practice.audio_language_omitted_one' : 'word_practice.audio_language_omitted', stale === 1 ? '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.' : '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.', { count: stale }); setLanguage(audioWarning, dialogTextLanguages.get(audioWarning.textContent)); }
        updatePictureNote(current); renderPictureManager(current); updatePlan(current); renderMeaningChoices(); updateAppearancePreview(current); }
      catch (error) { coverage.textContent = error.message; setLanguage(coverage, 'English'); planCount.textContent = ''; planNote.hidden = false; updateLabel(planNote, error.message); plan.dataset.needsReview = 'true'; reviewDetails.hidden = true; preview.hidden = true; previewToolbar.hidden = true; previewPicker.hidden = true; }
      interval.disabled = pacing.value !== 'timed';
      interval.parentElement.hidden = pacing.value !== 'timed';
      vocabularyFirst.parentElement.hidden = mode.value !== 'vocabulary';
      timingNote.hidden = pacing.value !== 'timed';
    }
    function fill() {
      titleInput.value = pack.title; wordsInput.value = pack.items.map(item => item.word).join('\n');
      const opts = pack.options; mode.value = opts.mode; repetitions.value = opts.repetitions; pacing.value = opts.autoAdvance ? 'timed' : 'manual'; interval.value = opts.intervalSeconds;
      shuffle.checked = opts.shuffle; position.checked = opts.varyPosition; size.checked = opts.varySize; includeAudio.checked = opts.includeAudio; includePictures.checked = opts.includePictures; pictureSlides.checked = opts.pictureSlides === true; vocabularyFirst.value = opts.vocabularyFirst;
      appearance.setOptions(opts);
      translationSettings.update(pack.items, opts);
      updateCoverage();
    }
    function setBusy(value) { busy = value; operationPanel.dataset.active = String(value); setup.setAttribute('aria-busy', String(value)); setup.querySelectorAll('button,input,textarea,select').forEach(control => { control.disabled = value; }); if (!value) interval.disabled = pacing.value !== 'timed'; }
    const isCurrentOperation = run => !closed && operation === run && !run.controller.signal.aborted;
    function reportProgress(run, value, progress) {
      if (!isCurrentOperation(run)) return;
      updateLabel(status, value);
      if (progress && Number.isFinite(progress.completed) && Number.isFinite(progress.total) && progress.total > 0) {
        operationProgress.max = progress.total; operationProgress.value = Math.max(0, Math.min(progress.completed, progress.total));
      } else operationProgress.removeAttribute('value');
    }
    function finishOperation(run) {
      if (operation !== run || closed) return;
      const restoreFocus = doc.activeElement === cancelButton;
      operation = null; setBusy(false); cancelButton.hidden = true; operationProgress.hidden = true; updateCoverage();
      if (restoreFocus && run.opener && run.opener.isConnected && !run.opener.disabled) run.opener.focus();
    }
    function cancelOperation() {
      const run = operation; if (!run || run.stopping) return;
      if (run.keepAudioOnStop) { run.stopping = true; run.controller.abort(); cancelButton.setAttribute('aria-disabled', 'true'); updateLabel(status, tx('word_practice.audio_stopping', 'Stopping preparation and keeping completed recordings…')); return; }
      run.controller.abort();
      updateLabel(status, tx('word_practice.preparation_cancelled', 'Preparation cancelled. Your words and settings are unchanged.'));
      finishOperation(run);
    }
    async function action(callback, opener) {
      if (busy || closed) return;
      const run = { controller: new root.AbortController(), opener: opener || doc.activeElement };
      operation = run; status.textContent = ''; setBusy(true); cancelButton.disabled = false; cancelButton.removeAttribute('aria-disabled'); updateLabel(cancelButton, tx('word_practice.cancel_preparation', 'Cancel preparation')); cancelButton.hidden = false; operationProgress.hidden = false; operationProgress.removeAttribute('value');
      root.setTimeout(() => { if (isCurrentOperation(run) && (doc.activeElement === doc.body || doc.activeElement === run.opener)) cancelButton.focus(); }, 0);
      try { await callback(run); } catch (error) { if (isCurrentOperation(run) && error.name !== 'AbortError') updateLabel(status, error.message || tx('word_practice.action_failed', 'Unable to finish this action.')); }
      finally { finishOperation(run); }
    }
    function actionButton(label, callback, primary, parent) { const button = make('button', label, parent || actions, primary ? 'awp-primary' : ''); button.type = 'button'; button.onclick = () => action(callback, button); return button; }
    function ready() { const current = readPack(); if (!current.items.length) throw new Error(tx('word_practice.need_words', 'Add at least one word to begin.')); return current; }
    function filename(extension) { return (pack.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 80).trim() || 'word-practice') + extension; }
    function download(contents, mime, extension) {
      if (closed) return;
      const url = root.URL.createObjectURL(new root.Blob([contents], { type: mime }));
      const link = doc.createElement('a'); link.href = url; link.download = filename(extension); doc.body.appendChild(link); link.click(); link.remove();
      // Not revoked on close: closing right after a click used to cancel the download.
      root.setTimeout(() => { root.URL.revokeObjectURL(url); }, 30000);
    }
    actionButton(tx('word_practice.present', 'Present'), () => {
      const current = ready(), opts = options(), sequence = core.createSequence(current, opts);
      setup.hidden = true; if (inlineHost) header.hidden = true; playerHost.hidden = false;
      const hooks = { onBack() { closeReading(); player = null; playerHost.replaceChildren(); playerHost.hidden = true; setup.hidden = false; header.hidden = false; if (readingButton) readingButton.hidden = false; present.focus(); }, onAppearanceChange(patch) { const next = core.normalizeOptions({ ...options(), ...patch }); appearance.setOptions(next); translationSettings.update(pack.items, next); updateCoverage(); }, labels: playerLabels(), uiLanguage: uiLanguageName,
        t: key => { const value = typeof context.t === 'function' && context.t(key); return value && value !== key ? value : ((root.AlloWordPracticeAnnotationAssets || {}).labels || {})[key] || key; }, isTeacher: context.isTeacher !== false, annotationStore, review, editGuard,
        onAnnotationsChange(key, list, viewport, edited) {
          const entry = catalogue.get(key);
          if (entry) { entry.annotations = list; if (viewport) entry.annotationViewport = viewport; }
          if (!edited || !entry || !glossaryEntryIds.has(key)) return;
          try {
            const accepted = context.onSaveCardAnnotations(key, core.normalizeAnnotations(list), viewport);
            // A voice recording is saved when the capture completes.
            return accepted && list.some(note => note.pending) ? undefined : accepted;
          } catch (_) { return false; }
        },
        onToast: (message, kind) => { status.textContent = message; if (typeof context.addToast === 'function') context.addToast(message, kind); } };
      // One "Aa" while presenting: the player's, which also works in full screen.
      if (readingButton) { closeReading(); readingButton.hidden = true; hooks.labels.reading_settings = tx('reading_settings.title', 'Reading settings'); hooks.openReadingSettings = openReading; }
      player = mountPlayer(playerHost, current, opts, sequence, core, hooks);
    }, true);
    const present = actions.lastChild;
    // The reader's CSS plus the font embedded as data; a font that cannot be embedded leaves the system font.
    async function readerStyles() {
      let css = '', fontCss = '', fontMissing = false, readerSettings = null;
      try {
        const lib = readingLibrary(), settings = lib && root.__alloReadingSettings.get();
        if (!settings) return { reader: null, fontMissing: true };
        readerSettings = { fontFamily: settings.fontFamily, fontClass: ['font-andika-italic', 'font-andika-bold-italic'].includes(settings.fontClass) ? settings.fontClass : '', baseFontSize: settings.baseFontSize, lineHeight: settings.lineHeight, letterSpacing: settings.letterSpacing, readingTheme: settings.readingTheme, bionic: settings.bionic };
        css = lib.readerExportCss(settings) || '';
        const linked = await lib.exportFontFaceCss(settings.fontId);
        if (linked && (linked.head || linked.css)) { const embedded = await lib.exportFontFaceCss(settings.fontId, { embed: true }); fontCss = (embedded && embedded.css) || ''; fontMissing = !fontCss; }
      } catch (_) { fontMissing = true; }
      return { reader: { css, fontCss, settings: readerSettings }, fontMissing };
    }
    actionButton(tx('word_practice.download_html', 'Download HTML'), async run => {
      const current = ready(), opts = options(), labels = playerLabels();
      let reader = null, fontMissing = false;
      if (useReading && useReading.checked) {
        status.textContent = tx('word_practice.preparing_reading', 'Adding your reading settings…');
        ({ reader, fontMissing } = await readerStyles());
        if (!isCurrentOperation(run)) return;
      }
      // Sounds go in as WAV so they also play on iPads and older Safari.
      let fileInput = current, audioNote = '';
      const media = root.AlloWordPracticeMedia;
      if (opts.includeAudio !== false && media && typeof media.everyDeviceAudio === 'function' && typeof media.needsEveryDeviceAudio === 'function' && media.needsEveryDeviceAudio(current)) {
        status.textContent = tx('word_practice.preparing_audio_every_device', 'Getting the sounds ready to play on every device…');
        const audio = await media.everyDeviceAudio(current, { signal: run.controller.signal });
        if (!isCurrentOperation(run)) return;
        fileInput = audio.pack;
        const left = audio.failed + audio.kept;
        if (left) audioNote = ' ' + tx('word_practice.audio_not_converted', '{count} sound(s) could not be converted and may not play on iPads.', { count: left });
      }
      download(buildHtml(fileInput, opts, undefined, labels, reader, uiLanguageName), 'text/html;charset=utf-8', '.html');
      status.textContent = tx('word_practice.html_downloaded', 'HTML downloaded. Open the file in a browser to practice offline.') + (fontMissing ? ' ' + tx('word_practice.font_not_embedded', 'Your font could not be added to the file, so it uses the system font.') : '') + audioNote;
    });
    async function exportPptxDeck(run, pictureSlidesOnly = false) {
      const current = ready(), opts = options();
      const media = root.AlloWordPracticeMedia;
      if (!media || !media.buildPptx) throw new Error(tx('word_practice.pptx_unavailable', 'The PowerPoint exporter is unavailable. Try reopening Present & Export.'));
      if (typeof context.ensurePptx === 'function') await context.ensurePptx();
      if (!isCurrentOperation(run)) return;
      status.textContent = tx('word_practice.building_pptx', 'Building PowerPoint…');
      const pptxCtx = { ...context, readerSettings: useReading && useReading.checked && root.__alloReadingSettings ? root.__alloReadingSettings.get() : null, labels: playerLabels(), signal: run.controller.signal, onProgress: progress => reportProgress(run, tx('word_practice.building_pptx_progress', 'Building PowerPoint. Cards: {completed} of {total}.', progress), progress) };
      const pptx = pictureSlidesOnly && typeof media.buildPictureSlidesPptx === 'function'
        ? await media.buildPictureSlidesPptx(current, opts, pptxCtx)
        : await media.buildPptx(current, opts, core.createSequence(current, opts), pptxCtx);
      if (!isCurrentOperation(run)) return;
      reportProgress(run, tx('word_practice.finishing_pptx', 'Finishing PowerPoint file…'));
      // Serialize without downloading: late compression results from a cancelled run are discarded.
      const blob = await pptx.write({ outputType: 'blob' });
      if (!isCurrentOperation(run)) return;
      download(blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pictureSlidesOnly ? '-picture-slides.pptx' : '.pptx');
      status.textContent = tx('word_practice.pptx_downloaded', 'PowerPoint downloaded.') + (pptx.wordPracticeWarnings && pptx.wordPracticeWarnings.length ? ' ' + pptx.wordPracticeWarnings.join(' ') : '');
    }
    actionButton(tx('word_practice.download_pptx', 'Download PowerPoint'), run => exportPptxDeck(run, false));
    exportPictureSlidesBtn.onclick = () => action(run => exportPptxDeck(run, true), exportPictureSlidesBtn);
    if (sheetButtonsHost) {
      actionButton(tx('word_practice.download_flashcards', 'Download 2-sided flashcards'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildFlashcardsHtml !== 'function') throw new Error(tx('word_practice.flashcards_unavailable', 'Flashcards export is unavailable. Try reopening Present & Export.'));
        download(media.buildFlashcardsHtml(current, opts), 'text/html;charset=utf-8', '-flashcards.html');
        status.textContent = tx('word_practice.flashcards_downloaded', '2-sided flashcards downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_frayer', 'Download Frayer study sheets'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildFrayerHtml !== 'function') throw new Error(tx('word_practice.frayer_unavailable', 'Frayer study sheets export is unavailable. Try reopening Present & Export.'));
        download(media.buildFrayerHtml(current, opts), 'text/html;charset=utf-8', '-frayer.html');
        status.textContent = tx('word_practice.frayer_downloaded', 'Frayer study sheets downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_sorting_cards', 'Download cut-out sorting cards'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildSortingCardsHtml !== 'function') throw new Error(tx('word_practice.sorting_cards_unavailable', 'Sorting cards export is unavailable. Try reopening Present & Export.'));
        download(media.buildSortingCardsHtml(current, opts), 'text/html;charset=utf-8', '-sorting-cards.html');
        status.textContent = tx('word_practice.sorting_cards_downloaded', 'Cut-out sorting cards downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_worksheet', 'Download cloze and matching worksheet'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildWorksheetHtml !== 'function') throw new Error(tx('word_practice.worksheet_unavailable', 'Worksheet export is unavailable. Try reopening Present & Export.'));
        download(media.buildWorksheetHtml(current, opts), 'text/html;charset=utf-8', '-worksheet.html');
        status.textContent = tx('word_practice.worksheet_downloaded', 'Cloze and matching worksheet downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_bingo', 'Download classroom Bingo boards'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildBingoHtml !== 'function') throw new Error(tx('word_practice.bingo_unavailable', 'Bingo boards export is unavailable. Try reopening Present & Export.'));
        download(media.buildBingoHtml(current, opts), 'text/html;charset=utf-8', '-bingo.html');
        status.textContent = tx('word_practice.bingo_downloaded', 'Classroom Bingo boards downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_loop_cards', 'Download I Have, Who Has cards'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildLoopGameHtml !== 'function') throw new Error(tx('word_practice.loop_cards_unavailable', 'Loop cards export is unavailable. Try reopening Present & Export.'));
        download(media.buildLoopGameHtml(current, opts), 'text/html;charset=utf-8', '-loop-cards.html');
        status.textContent = tx('word_practice.loop_cards_downloaded', 'I Have, Who Has loop cards downloaded.');
      }, false, sheetButtonsHost);
      actionButton(tx('word_practice.download_word_wall', 'Download classroom Word Wall cards'), () => {
        const current = ready(), opts = options(), media = root.AlloWordPracticeMedia;
        if (!media || typeof media.buildWordWallHtml !== 'function') throw new Error(tx('word_practice.word_wall_unavailable', 'Word Wall export is unavailable. Try reopening Present & Export.'));
        download(media.buildWordWallHtml(current, opts), 'text/html;charset=utf-8', '-word-wall.html');
        status.textContent = tx('word_practice.word_wall_downloaded', 'Classroom Word Wall cards downloaded.');
      }, false, sheetButtonsHost);
    }
    const prepareAudioButton = actionButton(tx('word_practice.prepare_audio', 'Prepare audio'), async run => {
      run.keepAudioOnStop = true; updateLabel(cancelButton, tx('word_practice.stop_keep_audio', 'Stop and keep completed audio')); 
      const current = ready(), media = root.AlloWordPracticeMedia;
      if (!media || !media.prepareAudio) throw new Error(tx('word_practice.audio_unavailable', 'Audio preparation is unavailable. Try reopening Present & Export.'));
      status.textContent = tx('word_practice.preparing_missing', 'Preparing missing recordings…');
      const prepared = await media.prepareAudio(current, { ...context, ...inheritedBanks(), signal: run.controller.signal, keepCompletedOnStop: true }, progress => {
        if (!isCurrentOperation(run)) return;
        const value = typeof progress === 'string' ? core.text(progress, 240) : progress && Number.isFinite(progress.completed) && Number.isFinite(progress.total) ? progress.word ? tx('word_practice.preparing_progress_word', 'Preparing recordings: {completed} of {total} — {word}.', { completed: progress.completed, total: progress.total, word: core.text(progress.word, 120) }) : tx('word_practice.preparing_progress', 'Preparing recordings: {completed} of {total}.', { completed: progress.completed, total: progress.total }) : tx('word_practice.preparing', 'Preparing recordings…');
        reportProgress(run, value, progress);
      });
      if (!isCurrentOperation(run) && !(run.stopping && !closed && operation === run)) return;
      const audioStatus = prepared.audioStatus || {}, errors = Array.isArray(audioStatus.errors) ? [...new Set(audioStatus.errors.map(value => core.text(value, 180)).filter(Boolean))] : [];
      const nextPack = core.normalizeInput(prepared);
      if (audioSnapshot(current) !== audioSnapshot(nextPack)) { preparedAudioRevision++; preparedAudioPending = true; }
      pack = nextPack; remember(pack); fill();
      // The lesson that opened Word Practice keeps the word clips made here, so they are not made again.
      if (typeof context.onSaveAudio === 'function') {
        const clips = Object.create(null);
        pack.items.forEach(item => { if (item && item.word && core.safeAudio(item.wordAudio)) clips[item.word] = item.wordAudio; });
        if (Object.keys(clips).length) { try { context.onSaveAudio(clips); } catch (_) { /* the lesson keeps working without them */ } }
      }
      updateLabel(prepareAudioButton, audioStatus.cancelled ? tx('word_practice.continue_audio', 'Continue preparation') : tx('word_practice.prepare_audio', 'Prepare audio'));
      if (audioStatus.cancelled) { updateLabel(status, tx('word_practice.audio_stopped_kept', 'Preparation stopped. Completed recordings are kept. Continue preparation to fill the remaining gaps.')); return; }
      const counts = core.audioCoverage(pack);
      status.textContent = tx('word_practice.audio_ready', 'Audio ready for {words} of {total} words. Complete sound sequences: {complete}.', { words: counts.words, total: counts.totalWords, complete: counts.completePhonemeWords }) + ' '
        + (core.text(audioStatus.message, 240) || (counts.words < counts.totalWords || counts.phonemes < counts.totalPhonemes ? tx('word_practice.missing_silent', 'Missing recordings remain silent.') : tx('word_practice.all_ready', 'All prepared recordings are ready.')))
        + (errors.length ? ' ' + errors.slice(0, 2).join(' ') + (errors.length > 2 ? ' ' + tx('word_practice.more_issues', '{count} more recording issues.', { count: errors.length - 2 }) : '') : '');
    }, false, audioSetup);
    async function saveCurrentSet(signal) {
      if (signal?.aborted) return false;
      player?.captureCardGeometry();
      if ([...annotationStore.values()].some(list => list.some(note => note.pending))) throw new Error(tx('word_practice.finish_recording_to_save', 'Finish the recording before saving this set.'));
      const current = ready();
      if (preparedAudioPending && !includeAudio.checked) throw new Error(tx('word_practice.save_prepared_audio', 'Turn on Include prepared audio to save your new recordings. They are still here.'));
      const serialized = core.serializePack(withoutAudio({ ...current, options: options() }, includeAudio.checked));
      if (new root.Blob([serialized]).size > core.LIMITS.setFileBytes) throw new Error(tx('word_practice.set_save_too_large', 'This set exceeds 32 MB. Use Save annotations on individual cards to keep your notes.'));
      const snapshot = editGuard.snapshot();
      download(serialized, 'application/json', '.json');
      status.textContent = tx('word_practice.download_started', 'Download started');
      const confirmed = await confirmWordSetDownload(doc, (key, fallback) => tx('word_practice.' + key, fallback), editGuard, snapshot, signal);
      if (confirmed) preparedAudioPending = false;
      status.textContent = confirmed ? tx('word_practice.download_confirmed', 'Download confirmed. Your current word set changes are marked as saved.') : tx('word_practice.download_unconfirmed', 'Download not confirmed. Your unsaved changes are still protected.');
      return confirmed;
    }
    actionButton(tx('word_practice.save_set', 'Save word set'), run => saveCurrentSet(run.controller.signal), false, setActions);
    const openSet = actionButton(tx('word_practice.open_set', 'Open word set'), () => {}, false, setActions);
    openSet.onclick = () => { if (!busy) { fileInput.value = ''; fileInput.click(); } };
    fileInput.addEventListener('change', () => action(async run => {
      const file = fileInput.files && fileInput.files[0]; if (!file) return;
      const imported = await readWordSetFile(file, core, (key, fallback) => tx('word_practice.' + key, fallback));
      if (!isCurrentOperation(run)) return;
      if (!await allowWordSetOpen(doc, (key, fallback) => tx('word_practice.' + key, fallback), editGuard, saveCurrentSet, run.controller.signal) || !isCurrentOperation(run)) return;
      // A file starts a new set, even when its language/word spelling matches.
      // Neither removed words nor their recordings belong to the imported set.
      review.clear(); imported.reviewItemIds?.forEach(id => review.add(id));
      preparedAudioRevision = 0; preparedAudioPending = false; cardContentRevision = 0;
      pack = imported; catalogue.clear(); annotationStore.clear(); glossaryEntryIds.clear(); pack.items.forEach(item => annotationStore.set(item.id, item.annotations || [])); remember(pack); previewId = ''; previewIndex = 0; previewMode = ''; previewRevealed = false; previewPickerKey = ''; fill(); editGuard.saved(); status.textContent = tx('word_practice.set_opened', 'Word set opened.');
    }));
    setup.addEventListener('change', event => { if (event.target === batchImageInput || event.target === rowImageInput || (event.target && event.target.classList && (event.target.classList.contains('awp-picture-alt') || event.target.classList.contains('awp-symbol-search')))) return; updateCoverage(); });
    // Only a teacher's own change is remembered, not the settings a saved set arrives with.
    setup.addEventListener('change', event => { if (event.target !== fileInput && event.target !== batchImageInput && event.target !== rowImageInput) rememberSetup(options()); });
    let coverageTimer = null;
    const scheduleCoverage = () => { root.clearTimeout(coverageTimer); coverageTimer = root.setTimeout(() => { coverageTimer = null; if (!closed && !busy) updateCoverage(); }, 180); };
    wordsInput.addEventListener('input', scheduleCoverage); repetitions.addEventListener('input', scheduleCoverage);
    function trap(event) {
      if (inlineHost) return;
      if (focusTrapStack && focusTrapStack.length && focusTrapStack[focusTrapStack.length - 1] !== focusTrapEntry) return;
      if (event.key === 'Escape' && !doc.fullscreenElement && !(event.isComposing || event.keyCode === 229)) { event.preventDefault(); event.stopPropagation(); requestClose(); return; }
      if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      const scope = doc.fullscreenElement && doc.fullscreenElement.contains(playerHost) ? doc.fullscreenElement : dialog;
      const candidates = Array.from(scope.querySelectorAll('button,input,textarea,select,summary,a[href],[tabindex="0"]')).filter(node => !node.disabled && !node.closest('[hidden],[inert],[aria-hidden="true"]') && (!node.closest('details:not([open])') || node.tagName === 'SUMMARY') && node.getClientRects().length && (typeof root.getComputedStyle !== 'function' || root.getComputedStyle(node).visibility !== 'hidden'));
      if (!candidates.length) { event.preventDefault(); return; }
      const first = candidates[0], last = candidates[candidates.length - 1];
      if (event.shiftKey && (doc.activeElement === first || !candidates.includes(doc.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (doc.activeElement === last || !candidates.includes(doc.activeElement))) { event.preventDefault(); first.focus(); }
    }
    const unwatchPreviewReading = watchCardReading(preview, options, core);
    let closingRequest = null, closeError = null;
    async function requestClose() {
      if (closed || closingRequest || inlineHost) return;
      if (operation?.keepAudioOnStop) { cancelOperation(); return; }
      const request = new root.AbortController(); closingRequest = request;
      try {
        if (await allowWordSetOpen(doc, (key, fallback) => tx('word_practice.' + key, fallback), editGuard, saveCurrentSet, request.signal, 'close') && !closed) close();
      } catch (error) {
        if (!closed) { closeError = closeError || make('p', '', dialog, 'awp-note'); closeError.setAttribute('role', 'alert'); closeError.textContent = error.message || tx('word_practice.save_failed', 'The word set could not be saved. Your changes are still open.'); }
      } finally { if (closingRequest === request) closingRequest = null; }
    }
    const warnUnsaved = event => { if (operation?.keepAudioOnStop || (!inlineHost && editGuard.dirty())) { event.preventDefault(); event.returnValue = ''; } };
    root.addEventListener('beforeunload', warnUnsaved);
    function close() {
      if (closed) return; closed = true; closingRequest?.abort(); root.removeEventListener('beforeunload', warnUnsaved); unwatchPreviewReading(); root.clearTimeout(coverageTimer); if (operation) { operation.controller.abort(); operation = null; } if (player) player.destroy(); overlay.removeEventListener('keydown', trap);
      if (context.signal) context.signal.removeEventListener('abort', close);
      closeReading(); overlay.remove();
      hiddenSiblings.forEach(({ node, inert }) => { if (node.isConnected) node.inert = inert; });
      if (focusTrapStack && focusTrapEntry) {
        const idx = focusTrapStack.lastIndexOf(focusTrapEntry);
        if (idx >= 0) focusTrapStack.splice(idx, 1);
      }
      if (scrollLockState) {
        scrollLockState.count = Math.max(0, scrollLockState.count - 1);
        if (scrollLockState.count === 0) doc.body.style.overflow = scrollLockState.previousOverflow;
      }
      if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus(); if (!inlineHost && active === controller) active = null;
    }
    overlay.addEventListener('keydown', trap); fill();
    editGuard.watchContent(() => JSON.stringify([titleInput.value.trim(), core.parseWords(wordsInput.value, { lineSeparated: true }), preparedAudioRevision, cardContentRevision]));
    if (!inlineHost) titleInput.focus();
    const controller = {
      close,
      getPack() { try { return readPack(); } catch (_) { return pack; } },
      setPack(next = {}) { pack = core.normalizeInput(next); catalogue.clear(); remember(pack); fill(); },
    };
    if (!inlineHost) active = controller;
    if (context.signal) context.signal.addEventListener('abort', close, { once: true });
    return controller;
  }
  function mount(container, context = {}) { return open({ ...context, container }); }
  const buildFlashcardsHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildFlashcardsHtml === 'function'
    ? root.AlloWordPracticeMedia.buildFlashcardsHtml(...args) : '';
  const buildFrayerHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildFrayerHtml === 'function'
    ? root.AlloWordPracticeMedia.buildFrayerHtml(...args) : '';
  const buildSortingCardsHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildSortingCardsHtml === 'function'
    ? root.AlloWordPracticeMedia.buildSortingCardsHtml(...args) : '';
  const buildWorksheetHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildWorksheetHtml === 'function'
    ? root.AlloWordPracticeMedia.buildWorksheetHtml(...args) : '';
  const buildWordSoundsWorksheetHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml === 'function'
    ? root.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml(...args) : '';
  const buildBingoHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildBingoHtml === 'function'
    ? root.AlloWordPracticeMedia.buildBingoHtml(...args) : '';
  const buildLoopGameHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildLoopGameHtml === 'function'
    ? root.AlloWordPracticeMedia.buildLoopGameHtml(...args) : '';
  const buildWordWallHtml = (...args) => root.AlloWordPracticeMedia && typeof root.AlloWordPracticeMedia.buildWordWallHtml === 'function'
    ? root.AlloWordPracticeMedia.buildWordWallHtml(...args) : '';
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.WordPractice = { open, mount, buildHtml, buildFlashcardsHtml, buildFrayerHtml, buildSortingCardsHtml, buildWorksheetHtml, buildWordSoundsWorksheetHtml, buildBingoHtml, buildLoopGameHtml, buildWordWallHtml, rasterizeImage: rasterizeImageToPng };
})(typeof window !== 'undefined' ? window : globalThis);
