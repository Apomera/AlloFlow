const fs=require('node:fs');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');
function rep(a,b,n=1){const count=s.split(a).length-1;if(count!==n)throw Error(`Expected ${n}, got ${count}: ${a}`);s=s.split(a).join(b);}
rep("adrenal_endo: 'adrenals', hypothal_endo: 'hypothalamus', diaphragm_m", "adrenal_endo: 'adrenals', diaphragm_m");
rep('var SCIENCE_CONCEPT_IDS = ANATOMY_CONCEPT_ALIASES;',"var SCIENCE_CONCEPT_IDS = Object.assign({ hypothal_endo: 'hypothalamus' }, ANATOMY_CONCEPT_ALIASES);");
rep("var parentId = structure.id === 'islets' ? 'pancreas' : structure.id === 'pancreas' ? 'islets' : null;","var axisContext = structure.id === 'hypothalamus' || structure.id === 'hypothal_endo';\n          var parentId = structure.id === 'islets' ? 'pancreas' : structure.id === 'pancreas' ? 'islets' : structure.id === 'hypothalamus' ? 'hypothal_endo' : structure.id === 'hypothal_endo' ? 'hypothalamus' : null;");
rep(": t('stem.anatomy.parent_context_help',",": axisContext ? t('stem.anatomy.axis_context_help','The hypothalamus is one structure in the hypothalamic–pituitary axis. Study the organ and the wider signaling pathway separately.') : t('stem.anatomy.parent_context_help',");
rep("activateAnatomyTab('homeostasis')","activateAnatomyTab('homeoHunt')");
const strings={
 muscle_tension_fact:'Muscles generate pulling tension. They can shorten, hold a steady length, or lengthen while active. The biceps helps bend the elbow; the triceps helps straighten it.',
 motion_force_outcome:'Cross-bridge forces create tension; during the shortening phase of the climb, sarcomeres shorten.',
 motion_force_option:'Myosin cross-bridges pull on actin',
 motion_force_feedback:'Myosin cross-bridges generate pulling force on actin. An active muscle can generate tension while shortening, holding its length, or lengthening.'
};
for(const [key,value]of Object.entries(strings))rep("'"+value+"'","t('stem.anatomy."+key+"', '"+value+"')");
// Imported explanations must be visible again before a learner repeats a prediction.
rep("if (!systemsMotionPerturbation) return null;\n          return h('section', { className: 'anatomy-motion-learning', 'aria-labelledby': 'anatomy-motion-reflection-title'","if (!systemsMotionPerturbation && !motionLearning.explanation.trim() && !motionLearning.transferExplanation.trim()) return null;\n          return h('section', { className: 'anatomy-motion-learning', 'aria-labelledby': 'anatomy-motion-reflection-title'");
require('@babel/parser').parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);console.log('Scope and return navigation refined.');
