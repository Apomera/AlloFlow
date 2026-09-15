const fs=require('node:fs'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');
const rows=[
['air_crosses_the_vocal_cords_in_the_voi','route_air_2_detail',
'Air passes between the vocal folds in the larynx. Coordinated laryngeal closure, including movement of the epiglottis, helps protect the airway during swallowing.',
'L’air passe entre les plis vocaux du larynx. La fermeture coordonnée du larynx, avec notamment le mouvement de l’épiglotte, contribue à protéger les voies respiratoires pendant la déglutition.',
'El aire pasa entre los pliegues vocales de la laringe. El cierre coordinado de la laringe, incluido el movimiento de la epiglotis, ayuda a proteger la vía respiratoria durante la deglución.',
'يمر الهواء بين الطيتين الصوتيتين في الحنجرة. ويساعد انغلاق الحنجرة المنسق، بما فيه حركة لسان المزمار، على حماية المجرى التنفسي أثناء البلع.'],
['gastric_acid_ph_1_5_3_5_and_pepsin_bre','route_food_2_detail',
'Gastric acid helps unfold proteins and activate pepsin, the enzyme that begins their digestion. Muscular mixing combines food and gastric juices into chyme, which is gradually released into the duodenum.',
'L’acide gastrique aide à déplier les protéines et à activer la pepsine, l’enzyme qui commence leur digestion. Le brassage musculaire mélange les aliments aux sucs gastriques pour former le chyme, libéré progressivement dans le duodénum.',
'El ácido gástrico ayuda a desplegar las proteínas y activar la pepsina, la enzima que inicia su digestión. La mezcla muscular combina alimentos y jugos gástricos en quimo, que se libera gradualmente al duodeno.',
'يساعد حمض المعدة على فك طي البروتينات وتنشيط البيبسين، الإنزيم الذي يبدأ هضمها. ويمزج النشاط العضلي الطعام بالعصارات المعدية لتكوين الكيموس، الذي يُطلق تدريجيًا إلى الاثني عشر.'],
['the_first_25cm_of_the_small_intestine_','route_food_3_detail',
'The duodenum receives bile made by the liver and stored in the gallbladder, along with pancreatic enzymes and bicarbonate. These secretions support digestion and help neutralize acidic chyme.',
'Le duodénum reçoit la bile produite par le foie et stockée dans la vésicule biliaire, ainsi que des enzymes pancréatiques et du bicarbonate. Ces sécrétions favorisent la digestion et aident à neutraliser le chyme acide.',
'El duodeno recibe bilis producida por el hígado y almacenada en la vesícula biliar, junto con enzimas pancreáticas y bicarbonato. Estas secreciones favorecen la digestión y ayudan a neutralizar el quimo ácido.',
'يتلقى الاثنا عشر الصفراء التي ينتجها الكبد وتخزنها المرارة، إلى جانب إنزيمات البنكرياس والبيكربونات. تدعم هذه الإفرازات الهضم وتساعد على معادلة الكيموس الحمضي.'],
['the_four_pulmonary_veins_empty_oxygena','route_blood_5_detail',
'Blood from the pulmonary veins enters the left atrium and flows through the mitral valve into the relaxed left ventricle. Atrial contraction adds to ventricular filling.',
'Le sang des veines pulmonaires entre dans l’oreillette gauche et traverse la valve mitrale vers le ventricule gauche relâché. La contraction de l’oreillette complète le remplissage du ventricule.',
'La sangre de las venas pulmonares entra en la aurícula izquierda y pasa por la válvula mitral al ventrículo izquierdo relajado. La contracción auricular contribuye al llenado ventricular.',
'يدخل الدم من الأوردة الرئوية إلى الأذين الأيسر ويمر عبر الصمام التاجي إلى البطين الأيسر المرتخي. ويضيف انقباض الأذين إلى امتلاء البطين.']];
const replacements=[];traverse(parser.parse(s,{sourceType:'script'}),{CallExpression(p){const key=p.node.arguments[0]?.value;const row=rows.find(r=>key==='stem.anatomy.'+r[0]);if(row)replacements.push({start:p.node.start,end:p.node.end,text:"t('stem.anatomy."+row[1]+"', "+JSON.stringify(row[2])+")"});}});if(replacements.length!==4)throw Error('Content replacement count');for(const r of replacements.sort((a,b)=>b.start-a.start))s=s.slice(0,r.start)+r.text+s.slice(r.end);
s=s.replace("className: 'text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color", "className: 'anatomy-route-progress-label text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color");
s=s.replace('.anatomy-route-return{display:block','.theme-dark .anatomy-route-progress-label{color:#e2e8f0!important;background:#334155!important}.theme-dark .anatomy-pathway-panel [role=progressbar]{background:#334155!important}.theme-dark .anatomy-pathway-panel [role=progressbar]>div{background:#6ee7b7!important}.anatomy-route-return{display:block');
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);
for(const f of ['dev-tools/i18n/stem_anatomy_en.json','reports/anatomy-pathway-refinements-2026-09-12/content-english.json']){const pack=JSON.parse(fs.readFileSync(f,'utf8'));for(const row of rows)pack[row[1]]=row[2];fs.writeFileSync(f,JSON.stringify(pack,null,2)+'\n');}
const tableFile='dev-tools/i18n/handtl_anatomy_pathways_20260912.json',table=JSON.parse(fs.readFileSync(tableFile,'utf8'));['french','spanish_latin_america','arabic'].forEach((lang,i)=>{for(const row of rows)table[lang][row[1]]=row[i+3];for(const prefix of ['', 'desktop/web-app/public/']){const f=prefix+'lang/'+lang+'.js',pack=JSON.parse(fs.readFileSync(f,'utf8'));Object.assign(pack.stem.anatomy,table[lang]);fs.writeFileSync(f,JSON.stringify(pack,null,2)+'\n');}});fs.writeFileSync(tableFile,JSON.stringify(table,null,2)+'\n');
