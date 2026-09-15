const fs=require('node:fs');
const rows={
 recap_clue:['Clue ','Indice ','Pista ','دليل '],
 recap_correct:['Correct: ','Exact : ','Correcto: ','إجابة صحيحة: '],
 recap_incorrect:['Not quite. It was ','Pas tout à fait. Il s’agissait de : ','No exactamente. La respuesta era: ','ليست الإجابة الصحيحة. الإجابة هي: '],
 recap_score_suffix:[' recalled.',' structures reconnues.',' estructuras reconocidas.',' بنى تم التعرف عليها.'],
 recap_all:['You matched every clue. Try Spotter next to locate these structures.','Tu as associé chaque indice à la bonne structure. Essaie ensuite le mode Repérage pour les situer.','Relacionaste cada pista con la estructura correcta. Prueba el modo de identificación para ubicarlas.','ربطت كل دليل بالبنية الصحيحة. جرّب وضع تحديد البنى لتحديد مواقعها.'],
 recap_some:['The misses are in your review queue; open Cards to see them first.','Les structures manquées sont dans ta liste de révision ; ouvre les Cartes pour les revoir en premier.','Las estructuras que no acertaste están en tu lista de repaso; abre las tarjetas para revisarlas primero.','أُضيفت البنى التي أخطأت فيها إلى قائمة المراجعة؛ افتح البطاقات لمراجعتها أولاً.'],
 tour_recap_title:['✓ Check what you saw','✓ Vérifie ce que tu as observé','✓ Comprueba lo que viste','✓ اختبر ما شاهدته'],
 tour_recap_intro:['Match each location or function clue to a structure. Read the feedback, and revisit any step you want to review.','Associe chaque indice de localisation ou de fonction à une structure. Lis les explications et reviens aux étapes à revoir.','Relaciona cada pista de ubicación o función con una estructura. Lee la explicación y vuelve a los pasos que quieras repasar.','اربط كل دليل عن الموضع أو الوظيفة ببنية. اقرأ التعليق، ثم عد إلى أي خطوة تريد مراجعتها.'],
 recap_back:['← Back to the tour','← Revenir à la visite','← Volver al recorrido','العودة إلى الجولة →'],
 recap_skip:['Skip recap and complete','Terminer sans le bilan','Omitir el repaso y terminar','تخطي المراجعة وإنهاء الجولة'],
 tour_recap_open:['Check what you saw','Vérifie ce que tu as observé','Comprueba lo que viste','اختبر ما شاهدته'],
 tour_recap_open_2:['✓ Check what you saw →','✓ Vérifie ce que tu as observé →','✓ Comprueba lo que viste →','← اختبر ما شاهدته ✓'],
 read_tour_aloud:['Read this tour step aloud','Lire cette étape à voix haute','Leer este paso en voz alta','قراءة هذه الخطوة بصوت عالٍ'],
 tour_recap_announce:['Tour recap: answer a short clue for each structure you just saw.','Bilan de la visite : réponds à un court indice pour chaque structure observée.','Repaso del recorrido: responde una pista breve sobre cada estructura que viste.','مراجعة الجولة: أجب عن دليل قصير لكل بنية شاهدتها.'],
 next_tour_step:['Next tour step','Étape suivante de la visite','Siguiente paso del recorrido','الخطوة التالية في الجولة'],
 a11y_guided_tour_progress:['Guided tour progress','Progression de la visite guidée','Progreso del recorrido guiado','تقدم الجولة الإرشادية']
};
const file='stem_lab/stem_tool_anatomy.js';let source=fs.readFileSync(file,'utf8');
function replace(a,b){if(!source.includes(a))throw Error('Missing '+a);source=source.replace(a,b);}
replace('Each clue is a tour step with the structure name hidden. Misses are added to your review queue.',rows.tour_recap_intro[0]);
replace('Every structure stuck. Try the Spotter next to place them on the figure.',rows.recap_all[0]);
replace("recap.answered + ' / ' + recap.questions.length)","h('bdi',{dir:'ltr'},recap.answered + ' / ' + recap.questions.length))");
replace("h('strong', null, recap.correct + ' / ' + recap.questions.length + t('stem.anatomy.recap_score_suffix', ' recalled.'))", "h('strong', null,h('bdi',{dir:'ltr'},recap.correct + ' / ' + recap.questions.length),t('stem.anatomy.recap_score_suffix', ' recalled.'))");
replace('.anatomy-tour-answer{font-size:13px;', '.anatomy-tour-panel [data-anatomy-tour-option]{text-align:start}.anatomy-tour-answer{font-size:13px;');
fs.writeFileSync(file,source);fs.writeFileSync('desktop/web-app/public/'+file,source);
const englishFile=__dirname+'/english.json',en=JSON.parse(fs.readFileSync(englishFile,'utf8')),tableFile='dev-tools/i18n/handtl_anatomy_tours_20260912.json',table=JSON.parse(fs.readFileSync(tableFile,'utf8'));
for(const [key,values]of Object.entries(rows))en[key]=values[0];
['french','spanish_latin_america','arabic'].forEach((lang,index)=>{for(const [key,values]of Object.entries(rows))table[lang][key]=values[index+1];for(const prefix of ['', 'desktop/web-app/public/']){const file=prefix+'lang/'+lang+'.js',pack=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(pack.stem.anatomy,table[lang]);fs.writeFileSync(file,JSON.stringify(pack,null,2)+'\n');}});
const registryFile='dev-tools/i18n/stem_anatomy_en.json',registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));Object.assign(registry,en);fs.writeFileSync(registryFile,JSON.stringify(registry,null,2)+'\n');fs.writeFileSync(englishFile,JSON.stringify(en,null,2)+'\n');fs.writeFileSync(tableFile,JSON.stringify(table,null,2)+'\n');
const validationFile=__dirname+'/validate.cjs';let validation=fs.readFileSync(validationFile,'utf8');validation=validation.replace("key.startsWith('stem.anatomy.tour_ref_')","key.startsWith('stem.anatomy.')&&Object.hasOwn(en,key.slice(13))").replace('seen.size,90','seen.size,106');fs.writeFileSync(validationFile,validation);
console.log('Translated 16 existing tour controls and clarified recap instructions; aligned RTL answers and isolated score numbers.');
