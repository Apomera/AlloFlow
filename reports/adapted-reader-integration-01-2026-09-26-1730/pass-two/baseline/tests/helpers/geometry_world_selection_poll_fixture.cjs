const { readFileSync } = require('node:fs');
const core = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const mathStart = core.indexOf('  function formatVolume(vol)');
const mathEnd = core.indexOf('  var ACHIEVEMENTS = [', mathStart);
const math = new Function(core.slice(mathStart, mathEnd) + '\nreturn {formatVolume,enrichMeasurement,countExposedCubeFaces,belongsToMeasuredComponent};')();
const measureStart = core.indexOf('        engine.measureStructure = function(');
const measureEnd = core.indexOf('        // ── 3D Dimension Lines', measureStart);
if (mathStart < 0 || mathEnd < 0 || measureStart < 0 || measureEnd < 0) throw new Error('Measurement runtime fixture boundaries not found');
const attachMeasurement = new Function('engine', 'MEASUREMENT_BLOCK_LIMIT', 'formatVolume', 'enrichMeasurement', 'countExposedCubeFaces', 'belongsToMeasuredComponent', core.slice(measureStart, measureEnd));

function makeSelectionEngine(positions) {
  const stats = { measurements: 0, candidateVisits: 0, acceptedBlockVisits: 0 };
  const engine = { blocks: {}, _builderSelection: { blocks: [] }, _undoStack: [], _redoStack: [], _currentLesson: {sandbox:true} };
  function addBlock(p, metadata = {}) {
    const point = {x:p.x,y:p.y,z:p.z};
    engine.blocks[[p.x,p.y,p.z].join(',')] = {userData:{gridPos:point,shape:'cube',rotation:0,blockType:'stone',volume:1,_measurementLayer:'student',...metadata}};
    return point;
  }
  positions.forEach(p => engine._builderSelection.blocks.push(addBlock(p)));
  attachMeasurement(engine,1500,math.formatVolume,math.enrichMeasurement,math.countExposedCubeFaces,(seed,candidate) => {
    stats.candidateVisits++;
    const included=math.belongsToMeasuredComponent(seed,candidate);
    if(included)stats.acceptedBlockVisits++;
    return included;
  });
  const measure = engine.measureStructure;
  engine.measureStructure = function(...args) {stats.measurements++;return measure.apply(engine,args);};
  return {engine,stats,addBlock};
}

module.exports = {makeSelectionEngine};
