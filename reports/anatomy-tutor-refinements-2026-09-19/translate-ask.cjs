const fs=require('fs'),file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');s=s.replaceAll("t('stem.anatomy.a11y_ask','Ask')","t('stem.anatomy.tutor_ref_ask','Ask')");fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);
const trFile=__dirname+'/translations.json',tr=JSON.parse(fs.readFileSync(trFile,'utf8'));tr.french.ask='Demander';tr.spanish_latin_america.ask='Preguntar';tr.arabic.ask='اسأل';fs.writeFileSync(trFile,JSON.stringify(tr,null,2)+'\n');
const test='tests/anatomy_tutor_refinements.test.js';s=fs.readFileSync(test,'utf8').replace("dict?.a11y_ask||'Ask'","dict?.tutor_ref_ask||'Ask'");fs.writeFileSync(test,s);
const browser=__dirname+'/browser.cjs';s=fs.readFileSync(browser,'utf8').replace("dict.a11y_ask||'Ask'","dict.tutor_ref_ask||'Ask'");fs.writeFileSync(browser,s);
const readme=__dirname+'/README.md';s=fs.readFileSync(readme,'utf8').replace('31 active new text keys','32 active new text keys');fs.writeFileSync(readme,s);
