const fs=require('node:fs');const parser=require('@babel/parser');
const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');
function rep(a,b,n=1){const count=s.split(a).length-1;if(count!==n)throw Error(`Expected ${n}, got ${count}: ${a.slice(0,90)}`);s=s.split(a).join(b);}
const aliases="{ adrenal_endo: 'adrenals', hypothal_endo: 'hypothalamus', diaphragm_m: 'diaphragm', ovaries_endo: 'ovaries', ovaries_repro: 'ovaries', testes_endo: 'testes', testes_repro: 'testes' }";
rep('        var SCIENCE_CONCEPT_IDS = '+aliases+';','        var SCIENCE_CONCEPT_IDS = ANATOMY_CONCEPT_ALIASES;');
const helper=`  // Shared organ identity is independent of navigation. Pancreatic islets remain
  // a substructure of the pancreas, not an alias for the whole organ.
  var ANATOMY_CONCEPT_ALIASES = ${aliases};
  function anatomyConceptId(id) { return ANATOMY_CONCEPT_ALIASES[id] || id; }
  function anatomyConceptPeers(id, knownIds) { var concept = anatomyConceptId(id); return knownIds.filter(function(candidate) { return anatomyConceptId(candidate) === concept; }); }
  function anatomyEvidenceId(id, knownIds) { var concept = anatomyConceptId(id); return knownIds.indexOf(concept) !== -1 ? concept : (anatomyConceptPeers(id, knownIds)[0] || id); }
  function anatomyRecallRecord(state, id, knownIds) {
    var raw = state && state._retrievalEvidence && typeof state._retrievalEvidence === 'object' && !Array.isArray(state._retrievalEvidence) ? state._retrievalEvidence : {};
    var result = { attempts: 0, correct: 0 };
    anatomyConceptPeers(id, knownIds).forEach(function(peer) {
      var row = raw[peer];
      var attempts = row && typeof row.attempts === 'number' && Number.isFinite(row.attempts) ? Math.max(0, Math.min(1000000, Math.floor(row.attempts))) : 0;
      var correct = row && typeof row.correct === 'number' && Number.isFinite(row.correct) ? Math.max(0, Math.min(attempts, Math.floor(row.correct))) : 0;
      var accepted = Math.min(attempts, 1000000 - result.attempts);
      result.attempts += accepted; result.correct += Math.min(correct, accepted);
    });
    return result;
  }
  function anatomySharedRatings(state, knownIds, now) {
    state = state || {}; now = Number.isFinite(now) ? now : Date.now();
    var raw = state._structureConfidence || {}, times = state._confidenceAt || {}, chosen = {}, confidence = {}, at = {};
    var levels = ['practice', 'learning', 'mastered'];
    knownIds.forEach(function(id) {
      var level = raw[id]; if (levels.indexOf(level) < 0) return;
      var stamp = Number(times[id]); stamp = Number.isFinite(stamp) && stamp > 0 && stamp <= now ? stamp : 0;
      var key = anatomyConceptId(id), old = chosen[key];
      // Newer evidence wins. Undated ties use the more cautious rating.
      if (!old || stamp > old.at || (stamp === old.at && levels.indexOf(level) < levels.indexOf(old.level))) chosen[key] = { level: level, at: stamp };
    });
    knownIds.forEach(function(id) { var row = chosen[anatomyConceptId(id)]; if (row) { confidence[id] = row.level; if (row.at) at[id] = row.at; } });
    return { confidence: confidence, at: at };
  }

`;
rep('  // A portable study record contains structure evidence only, never active tests,',helper+'  // A portable study record contains structure evidence only, never active tests,');
rep("        var quizConfidenceRaw = d._structureConfidence && typeof d._structureConfidence === 'object' && !Array.isArray(d._structureConfidence) ? d._structureConfidence : {};\n        var quizConfidenceAtRaw = d._confidenceAt && typeof d._confidenceAt === 'object' && !Array.isArray(d._confidenceAt) ? d._confidenceAt : {};", "        var quizSharedRatings = anatomySharedRatings(d, knownStructureIds, Date.now());\n        var quizConfidenceRaw = quizSharedRatings.confidence;\n        var quizConfidenceAtRaw = quizSharedRatings.at;");
const start=s.indexOf('        var structureConfidence = safeEnumMap(d._structureConfidence, knownStructureIds, CONFIDENCE_LEVELS);');
const end=s.indexOf('        var reviewNow = Date.now();',start);if(start<0||end<0)throw Error('Shared ratings boundary');
s=s.slice(0,start)+`        var sharedRatings = anatomySharedRatings(d, knownStructureIds, Date.now());
        var structureConfidence = sharedRatings.confidence;
        var confidenceAt = sharedRatings.at;
`+s.slice(end);
rep('          next[structureId] = Date.now();','          var stamp = Date.now();\n          anatomyConceptPeers(structureId, knownStructureIds).forEach(function(id) { next[id] = stamp; });');
const rs=s.indexOf('        function getRecallEvidence(structureId) {'),re=s.indexOf('        function recallEvidenceText(',rs);
if(rs<0||re<0)throw Error('Recall boundary');s=s.slice(0,rs)+`        function getRecallEvidence(structureId) { return anatomyRecallRecord(d, structureId, knownStructureIds); }
`+s.slice(re);
rep('          nextConfidence[structureId] = nextLevel;', '          anatomyConceptPeers(structureId, knownStructureIds).forEach(function(id) { nextConfidence[id] = nextLevel; });');
rep('          nextConfidence[structureId] = level;', '          anatomyConceptPeers(structureId, knownStructureIds).forEach(function(id) { nextConfidence[id] = level; });');
rep('if (record.attempts) nextEvidence[id] = record;', 'if (record.attempts) nextEvidence[anatomyEvidenceId(id, knownStructureIds)] = record;');
rep('          nextEvidence[structureId] = { attempts: previous.attempts + 1, correct: previous.correct + (correct ? 1 : 0) };', '          var increment = previous.attempts < 1000000 ? 1 : 0;\n          nextEvidence[anatomyEvidenceId(structureId, knownStructureIds)] = { attempts: previous.attempts + increment, correct: previous.correct + (correct ? increment : 0) };');

rep('        function renderScienceSources(structure) {',`        function renderSharedStructureContexts(structure) {
          var peers = anatomyConceptPeers(structure.id, knownStructureIds).filter(function(id) { return id !== structure.id; });
          var parentId = structure.id === 'islets' ? 'pancreas' : structure.id === 'pancreas' ? 'islets' : null;
          if (!peers.length && !parentId) return null;
          return h('div', { className: 'anatomy-shared-context', 'data-anatomy-shared-context': structure.id },
            h('p', null, peers.length ? t('stem.anatomy.shared_context_help', 'The same structure appears in another collection. Confidence, review dates, and scored answers are shared; your notes stay with each entry.') : t('stem.anatomy.parent_context_help', 'Pancreatic islets are hormone-producing clusters within the pancreas. Study them separately from the whole organ.')),
            (peers.length ? peers : [parentId]).map(function(id) { var context = findStructureContext(id); if (!context) return null;
              return h('button', { key: id, type: 'button', 'data-anatomy-open-context': id,
                onClick: function() { updMulti(structureFocusPatch(id, { _activeTab: 'explore', quizMode: false })); announceStructure(id); focusAnatomyStructureDetail(); } }, context.structure.name + ' · ' + SYSTEMS[context.systemId].name);
            })
          );
        }
        function renderScienceSources(structure) {`);
rep('                        renderScienceSources(sel),','                        renderSharedStructureContexts(sel),\n                        renderScienceSources(sel),');

// Reuse the actual cellular muscle schematic, without relabeling an arm as a leg.
rep('        var SYSTEMS_IN_MOTION_SCENARIOS = {',`        REGIONAL_ATLASES.quads = Object.assign({}, REGIONAL_ATLASES.biceps, {
          subtitle: t('stem.anatomy.quads_mechanism_scope', 'Representative skeletal-muscle fiber mechanism, also used by the quadriceps. This is a cellular schematic, not a drawing of the thigh.')
        });
        var SYSTEMS_IN_MOTION_SCENARIOS = {`);
rep("if (sel.id === 'biceps') return renderNeuromuscularAtlas();", "if (sel.id === 'biceps' || sel.id === 'quads') return renderNeuromuscularAtlas();");
rep("'data-anatomy-atlas': 'biceps',", "'data-anatomy-atlas': sel.id === 'quads' ? 'quads' : 'biceps',");
// Correct a repeated contraction misconception while retaining the shortening animation's scope.
rep('Muscles only pull by shortening. The biceps bends the elbow, and its partner the triceps pulls the other way to straighten it.', 'Muscles generate pulling tension. They can shorten, hold a steady length, or lengthen while active. The biceps helps bend the elbow; the triceps helps straighten it.');
rep('Sarcomeres shorten and tendon tension rises.', 'Cross-bridge forces create tension; during the shortening phase of the climb, sarcomeres shorten.');
rep("options: ['Calcium expands the tendon', 'Actin slides past myosin', 'Cartilage contracts around the joint']", "options: ['Calcium expands the tendon', 'Myosin cross-bridges pull on actin', 'Cartilage contracts around the joint']");
rep('Cross-bridge cycling pulls actin past myosin, shortening sarcomeres and generating tension.', 'Myosin cross-bridges generate pulling force on actin. An active muscle can generate tension while shortening, holding its length, or lengthening.');
rep("          triceps: { title: 'Zhang", "          biceps: { title: 'OpenStax: Control of muscle tension', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension' },\n          quads: { title: 'OpenStax: Control of muscle tension', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension' },\n          triceps: { title: 'Zhang");
const css='.anatomy-shared-context{border:1px solid #94a3b8;border-radius:10px;padding:10px;margin:10px 0;font-size:12px;line-height:1.5;color:var(--allo-stem-text,#0f172a);background:var(--allo-stem-panel,#f8fafc)}.anatomy-shared-context button{min-height:44px;margin:6px 6px 0 0;padding:8px;border:1px solid #64748b;border-radius:8px;color:#0f766e;background:#fff;font-weight:800}.anatomy-shared-context button:focus-visible{outline:3px solid #0891b2;outline-offset:3px}.theme-dark .anatomy-shared-context{background:#1e293b;color:#e2e8f0}.theme-dark .anatomy-shared-context button{background:#0f172a;color:#99f6e4}';
rep("      '.theme-dark .anatomy-tool-shell{color:", '      '+JSON.stringify(css)+',\n'+"      '.theme-dark .anatomy-tool-shell{color:");
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);
console.log('Shared study identity and the quadriceps mechanism bridge implemented.');
