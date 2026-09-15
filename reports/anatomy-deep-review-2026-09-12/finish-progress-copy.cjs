const fs=require('node:fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
const rows={
progress_map_title:['Whole-body study progress','Progression de l’étude du corps','Progreso del estudio del cuerpo','تقدم دراسة الجسم'],
progress_map_help:['Choose a collection to study. These counts summarize your confidence and review plan; they do not establish mastery.','Choisissez une collection à étudier. Ces nombres résument votre confiance et votre plan de révision ; ils ne prouvent pas la maîtrise.','Elige una colección para estudiar. Estos recuentos resumen tu confianza y plan de repaso; no demuestran dominio.','اختر مجموعة لدراستها. تلخّص هذه الأعداد ثقتك وخطة المراجعة، ولا تثبت الإتقان.'],
progress_by_collection:['Confidence by collection','Confiance par collection','Confianza por colección','الثقة حسب المجموعة'],
progress_legend:['Confidence status legend','Légende des niveaux de confiance','Leyenda de niveles de confianza','مفتاح حالات الثقة']
};
for(const [a,b] of [["'Whole-body mastery map'","t('stem.anatomy.progress_map_title', 'Whole-body study progress')"],["'Choose a system to study. Exact confidence counts drive the suggested focus.'","t('stem.anatomy.progress_map_help', '"+rows.progress_map_help[0]+"')"],["__alloT('stem.anatomy.a11y_mastery_by_body_system', 'Mastery by body system')","t('stem.anatomy.progress_by_collection', 'Confidence by collection')"],["__alloT('stem.anatomy.a11y_mastery_status_legend', 'Mastery status legend')","t('stem.anatomy.progress_legend', 'Confidence status legend')"]]){if(!s.includes(a))throw Error(a);s=s.replace(a,b);}
fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
let tests=fs.readFileSync('tests/anatomy_lab_science.test.js','utf8').replace("'Whole-body mastery map'","'Whole-body study progress'");fs.writeFileSync('tests/anatomy_lab_science.test.js',tests);
const enFile='dev-tools/i18n/stem_anatomy_en.json',tableFile='dev-tools/i18n/handtl_anatomy_enhancements_20260912.json';const en=JSON.parse(fs.readFileSync(enFile,'utf8')),table=JSON.parse(fs.readFileSync(tableFile,'utf8'));
['french','spanish_latin_america','arabic'].forEach((lang,i)=>{for(const [key,values] of Object.entries(rows)){en[key]=values[0];table[lang][key]=values[i+1];}for(const prefix of ['','desktop/web-app/public/']){const file=prefix+'lang/'+lang+'.js',raw=fs.readFileSync(file,'utf8'),dict=JSON.parse(raw);Object.assign(dict.stem.anatomy,table[lang]);fs.writeFileSync(file,JSON.stringify(dict,null,2)+(raw.endsWith('\n')?'\n':''));}});
fs.writeFileSync(enFile,JSON.stringify(en,null,2)+'\n');fs.writeFileSync(tableFile,JSON.stringify(table,null,2)+'\n');
console.log('Progress map now consistently identifies self-rated confidence.');
