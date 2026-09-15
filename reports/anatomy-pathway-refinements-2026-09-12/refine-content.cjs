const fs=require('node:fs'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');const english={};
function T(key,value){english[key]=value;return "t('stem.anatomy."+key+"', "+JSON.stringify(value)+")";}
function rep(a,b,n=1){if(s.split(a).length-1!==n)throw Error('Missing/duplicate '+a.slice(0,90));s=s.split(a).join(b);}
const ast=parser.parse(s,{sourceType:'script'});let pathways;traverse(ast,{VariableDeclarator(p){if(p.node.id.name==='PATHWAYS')pathways=p.node.init;}});if(!pathways)throw Error('No pathways');
const revisions={
 path_blood:{reference:'19-1-heart-anatomy',steps:{
 0:{structure:'heart',scope:'The marker shows the whole heart; this step follows its right atrium.'},
 1:{scope:'The right ventricle is a chamber inside the heart shown by this marker.'},
 3:{scope:'The alveoli marker locates the exchange region. Blood stays in surrounding capillaries; it does not enter the air sacs.'},
 4:{scope:'The lungs marker locates the region. Pulmonary veins carry blood from the lungs to the left atrium; individual veins are not drawn here.'},
 5:{scope:'The marker shows the whole heart; this step follows its left atrium.'},
 6:{detail:'The left ventricle fills through the mitral valve and generates pressure to send blood into the systemic circulation.',scope:'The left ventricle is a chamber inside the heart shown by this marker.'},
 8:{scope:'The femoral artery is one example of a delivery vessel. Exchange with body tissues happens downstream in capillaries, not in this artery.'}
 }},
 path_air:{reference:'22-3-the-process-of-breathing',steps:{
 1:{detail:'Air passes through the pharynx toward the larynx. The oropharynx and laryngopharynx also carry swallowed food; the nasopharynx carries air.'},
 3:{detail:'Cartilage helps hold the trachea open. Mucus traps particles, and cilia move the mucus toward the throat.'},
 5:{detail:'Many tiny alveoli provide a large, thin exchange surface. Oxygen diffuses into nearby capillary blood, while carbon dioxide diffuses toward alveolar air.'},
 6:{label:'Quiet exhalation',detail:'During quiet breathing, the inspiratory muscles relax and elastic recoil reduces lung volume. Alveolar pressure rises above atmospheric pressure, so air flows out. Forced exhalation also recruits muscles.',scope:'The diaphragm marker shows a breathing muscle. Air travels through the airways, not through the diaphragm.'}
 }},
 path_food:{reference:'23-5-the-small-and-large-intestines',steps:{
 0:{scope:'The mandible is a jaw-bone landmark that supports chewing. Food stays in the mouth cavity; it does not travel through the bone.'},
 1:{detail:'Swallowing moves the food bolus through the pharynx into the esophagus. Coordinated muscle contractions propel it toward the stomach while the airway is protected.',scope:'The marker shows the pharynx. The esophagus continues below it and is not a separate marker in this catalog.'},
 3:{scope:'The duodenum is the first part of the small intestine; the marker represents the larger organ.'},
 4:{detail:'Folds, villi, and microvilli increase the small intestine’s absorptive surface. Most nutrient absorption occurs in the small intestine.',scope:'The jejunum and ileum are regions of the small intestine; the marker represents the larger organ.'},
 5:{detail:'The large intestine absorbs remaining water and electrolytes and helps form feces. Gut microbes ferment some material that escaped digestion.'},
 6:{label:'Rectum and defecation',detail:'Feces are held in the rectum, the final storage region of the large intestine, before leaving through the anal canal and anus. The bladder stores urine and is not part of this food route.',structure:'lg_intestine',scope:'The marker shows the large intestine. The rectum is its terminal storage region; this marker is not a separate rectal outline.'}
 }},
 path_nerve:{reference:'14-3-motor-responses',steps:{
 0:{detail:'In this hand-withdrawal example, a potentially damaging stimulus on the palm side of the index finger activates sensory nerve endings in the skin.',scope:'The skin marker represents a tissue type. The example stimulus is on the finger, not at the marker’s body location.'},
 1:{detail:'Sensory axons from this part of the finger travel in the median nerve toward the cervical spinal cord, entering through dorsal roots. A peripheral nerve contains many axons, not just one neuron.',structure:'median',scope:'The median nerve carries the sensory fibers used in this example. Its motor fibers have other roles.'},
 2:{detail:'Sensory input reaches spinal circuits. A withdrawal response can begin without waiting for a conscious decision, while information also travels toward the brain.',scope:'The marker shows the spinal cord as a whole. This upper-limb example uses cervical spinal circuits.'},
 3:{detail:'Spinal interneurons link sensory input to motor output, helping activate withdrawal muscles and inhibit opposing muscles.',scope:'Interneurons lie within spinal gray matter; the whole-cord marker does not show individual cells.'},
 4:{detail:'Motor axons leave the spinal cord through ventral roots. Axons to the biceps travel through the brachial plexus and its musculocutaneous nerve branch.',structure:'brachial_plexus',scope:'The marker shows the brachial plexus network. The musculocutaneous nerve branch to the biceps is not separately drawn.'},
 5:{detail:'Acetylcholine signaling at neuromuscular junctions activates muscle fibers. Biceps contraction contributes to elbow flexion as the arm withdraws; other muscles also take part.'},
 6:{detail:'Ascending pathways carry information toward the brain for conscious perception. Brain pathways can also modify spinal reflexes; awareness and withdrawal are not separated by one fixed delay.',scope:'The marker shows the brain as a whole. Perception involves networks, not a single point at this marker.'}
 }}
};
const changes=[];function prop(node,key){return node.properties.find(p=>p.key.name===key||p.key.value===key);}
for(const node of pathways.elements){const id=prop(node,'id').value.value,rev=revisions[id];if(!rev)continue;changes.push({start:node.end-1,end:node.end-1,text:", reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/"+rev.reference+"' "});
 for(const [i,row]of Object.entries(rev.steps)){const step=prop(node,'steps').value.elements[Number(i)];for(const field of ['label','detail','structure'])if(row[field]){const original=prop(step,field).value;changes.push({start:original.start,end:original.end,text:field==='structure'?JSON.stringify(row[field]):T('route_'+id.slice(5)+'_'+i+'_'+field,row[field])});}if(row.scope)changes.push({start:step.end-1,end:step.end-1,text:', scope: '+T('route_'+id.slice(5)+'_'+i+'_scope',row.scope)+' '});}}
changes.sort((a,b)=>b.start-a.start).forEach(c=>{s=s.slice(0,c.start)+c.text+s.slice(c.end);});
rep("fact: 'It is called small because it is narrow. At about 6 metres it is the longest part of the digestive tract, and its inner surface would cover a tennis court.'","fact: "+T('route_intestine_fact','Small refers to its narrower diameter. Its folded lining, villi, and microvilli increase the area available for absorption; length and surface-area estimates depend on how they are measured.'));
rep("clinical: 'Weakness \\u2192 Trendelenburg gait (compensatory trunk lean). Inferior gluteal nerve (L5\\u2013S2).'","clinical: "+T('route_gluteal_fact','Gluteus maximus weakness impairs forceful hip extension, such as rising from a chair. Trendelenburg gait is associated with hip-abductor dysfunction, especially gluteus medius and minimus. The inferior gluteal nerve supplies gluteus maximus.'));
// Oxygenation is not the definition of an artery or vein.
rep("heart: { label: 'Blood oxygenation key', items: [{ symbol: 'V', label: 'oxygen-poor blood', color: '#2563eb' }, { symbol: 'A', label: 'oxygen-rich blood', color: '#dc2626' }] }","heart: { label: 'Blood oxygenation key', items: [{ symbol: 'O₂−', label: 'oxygen-poor blood', color: '#2563eb' }, { symbol: 'O₂+', label: 'oxygen-rich blood', color: '#dc2626' }] }");
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);fs.writeFileSync('reports/anatomy-pathway-refinements-2026-09-12/content-english.json',JSON.stringify(english,null,2)+'\n');console.log(Object.keys(english).length+' scientific content and marker-scope strings updated.');
