const fs=require('fs'),path=require('path');
const target=path.resolve('stem_lab/stem_tool_geometryworld_builder.js'),original=fs.readFileSync(target,'utf8'),crlf=original.includes('\r\n');let source=original.replace(/\r\n/g,'\n');
function change(anchor,next){if(source.split(anchor).length!==2)throw new Error('Selection editor anchor missing or duplicated: '+anchor.slice(0,100));source=source.replace(anchor,next);}
function snippet(name){return fs.readFileSync(path.join(__dirname,name),'utf8').trimEnd()+'\n';}
change('  function selectionMeasurement(engine) {',snippet('selection-helpers.txt')+'  function selectionMeasurement(engine) {');
change('    createSelectionFrame:createSelectionFrame, selectionNeedsReview:selectionNeedsReview,','    selectionEditSnapshot:selectionEditSnapshot, transformCreationBlocks:transformCreationBlocks, previewSelectionEdit:previewSelectionEdit, commitSelectionEdit:commitSelectionEdit,\n    normalizeBuildStamp:normalizeBuildStamp, readBuildStamps:readBuildStamps, saveSelectionStamp:saveSelectionStamp, removeBuildStamp:removeBuildStamp, previewBuildStamp:previewBuildStamp, BUILD_STAMP_KEY:BUILD_STAMP_KEY,\n    createSelectionFrame:createSelectionFrame, selectionNeedsReview:selectionNeedsReview,');
change('      var _hasStudentBuild = React.useState(null),',snippet('selection-ui-hooks.txt')+'      var _hasStudentBuild = React.useState(null),');
change('      function applyPrintScale(value) {',snippet('selection-ui-functions.txt')+'      function applyPrintScale(value) {');
change("          printEnvelope && h('section', { key:'gwe-print-ready',", "          renderCreationEditing(),\n          printEnvelope && h('section', { key:'gwe-print-ready',");
change('    style.textContent = [','    style.textContent = [\n      '+JSON.stringify(snippet('selection-editor.css').trim())+',');
new Function(source);
if(process.argv.includes('--check')){console.log('Selection editor patch parses and all anchors match.');process.exit(0);}
const output=crlf?source.replace(/\n/g,'\r\n'):source,fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}console.log('Applied selection editor to canonical builder; parent owns mirror sync.');
