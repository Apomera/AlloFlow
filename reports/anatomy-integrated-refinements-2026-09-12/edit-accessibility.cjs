const fs=require('fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
for(const [from,to]of [
 ['t("stem.anatomy.ref2_read_term","Read the term aloud"))','t("stem.anatomy.ref2_read_term","Read the term aloud")+\': \'+term.label)'],
 ["'data-anatomy-study-term':id,onClick:","'data-anatomy-study-term':id,'aria-label':t('stem.anatomy.study_term_5_rp','Study Term (+5 RP)')+': '+term.label,onClick:"],
 ['t("stem.anatomy.ref2_read_stage","Read this sleep stage aloud"))','t("stem.anatomy.ref2_read_stage","Read this sleep stage aloud")+\': \'+stage.stage)'],
 ['t("stem.anatomy.ref2_read_wave","Read this frequency band aloud"))','t("stem.anatomy.ref2_read_wave","Read this frequency band aloud")+\': \'+w.type)']
 ]){if(!s.includes(from))throw Error(from);s=s.replace(from,to);}
fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
