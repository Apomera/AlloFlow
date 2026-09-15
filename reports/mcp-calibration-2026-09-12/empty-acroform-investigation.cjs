const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const PDF = require('../../desktop/mcp/vendor/pdf-lib.min.js');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const begin = source.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
const end = source.indexOf('// ── S7', begin);
const scannerSource = source.slice(begin, end);
const baseline = new Function(scannerSource + '\nreturn _alloScanActiveContent;')();
// INVESTIGATION ONLY: this candidate runs in memory, never changes production or a PDF.
const proposal = String.raw`
    var rawAcroForm = catalog.get(nm('AcroForm'));
    if (rawAcroForm) {
      var formState = _newWalkState();
      var _formFail = function () { unexaminedStructures++; };
      var _resolveForm = function (o) { return _resolveScoped(o, _formFail); };
      var form = _resolveForm(rawAcroForm);
      var _isFormScalar = function (o) {
        return o === NS.PDFNull || ['PDFName','PDFString','PDFHexString','PDFNumber','PDFBool'].some(function (type) { return NS[type] && typeof NS[type] === 'function' && o instanceof NS[type]; });
      };
      var _walkPassiveFormGraph = function (raw, depth) {
        var value = _resolveForm(raw);
        if (!value || _isFormScalar(value)) return;
        if (!_claimWalkObject(formState, value, depth, _formFail)) return;
        if (_isArrayObject(value)) {
          var count = _arraySize(value);
          if (count > MAX_CONTAINER_ENTRIES) { _formFail(); count = MAX_CONTAINER_ENTRIES; }
          for (var fi = 0; fi < count; fi++) _walkPassiveFormGraph(_arrayGet(value, fi), depth + 1);
          return;
        }
        // Stream bodies and foreign object types are outside this narrow passive-graph proof.
        var dict = value.dict || value;
        if (value.dict) _formFail();
        if (!dict || typeof dict.get !== 'function' || typeof dict.keys !== 'function') { _formFail(); return; }
        _scanAssociatedFiles(dict, _resolveForm, _formFail);
        _scanActionEntries(dict, _resolveForm, _formFail, false);
        if (dict.get(nm('S'))) _classifyAction(dict, _resolveForm, _formFail, false);
        var subtype = String(dict.get(nm('Subtype')) || '');
        if (/^\/(?:RichMedia|3D|Movie|Sound|Screen)$/.test(subtype)) counts.multimedia++;
        if (subtype === '/FileAttachment') counts.embeddedFiles++;
        var keys = dict.keys();
        if (!Array.isArray(keys)) { _formFail(); return; }
        var keyCount = keys.length;
        if (keyCount > MAX_CONTAINER_ENTRIES) { _formFail(); keyCount = MAX_CONTAINER_ENTRIES; }
        for (var fk = 0; fk < keyCount; fk++) _walkPassiveFormGraph(dict.get(keys[fk]), depth + 1);
      };
      if (!form || form.dict || typeof form.get !== 'function' || typeof form.keys !== 'function') _formFail();
      else {
        var fields = _resolveForm(form.get(nm('Fields')));
        if (!_isArrayObject(fields) || _arraySize(fields) !== 0) _formFail();
        var formKeys = form.keys();
        if (!Array.isArray(formKeys) || formKeys.some(function (key) { return !/^(?:\/Fields|\/DA|\/DR|\/Q|\/NeedAppearances|\/SigFlags|\/CO)$/.test(String(key)); })) _formFail();
        var da = _resolveForm(form.get(nm('DA')));
        if (da && !(NS.PDFString && da instanceof NS.PDFString) && !(NS.PDFHexString && da instanceof NS.PDFHexString)) _formFail();
        var dr = _resolveForm(form.get(nm('DR')));
        if (dr && (dr.dict || typeof dr.get !== 'function' || typeof dr.keys !== 'function')) _formFail();
        var co = _resolveForm(form.get(nm('CO')));
        if (co && (!_isArrayObject(co) || _arraySize(co) !== 0)) _formFail();
        var q = _resolveForm(form.get(nm('Q')));
        if (q && !(NS.PDFNumber && q instanceof NS.PDFNumber && [0,1,2].indexOf(q.asNumber()) !== -1)) _formFail();
        var sig = _resolveForm(form.get(nm('SigFlags')));
        if (sig && !(NS.PDFNumber && sig instanceof NS.PDFNumber && sig.asNumber() === 0)) _formFail();
        var need = _resolveForm(form.get(nm('NeedAppearances')));
        if (need && !(NS.PDFBool && need instanceof NS.PDFBool)) _formFail();
        _walkPassiveFormGraph(form, 0);
      }
    }
`;
const candidateText = scannerSource.replace("    if (catalog.get(nm('AcroForm'))) unexaminedStructures++;\n", '').replace('    var pages = pdfDoc.getPages ? pdfDoc.getPages() : [];', proposal + '\n    var pages = pdfDoc.getPages ? pdfDoc.getPages() : [];');
assert.notEqual(candidateText, scannerSource);
const candidate = new Function(candidateText + '\nreturn _alloScanActiveContent;')();
const naive = new Function(scannerSource.replace("if (catalog.get(nm('AcroForm'))) unexaminedStructures++;", "if (catalog.get(nm('AcroForm'))) { var af = _resolve(catalog.get(nm('AcroForm'))); var ff = af && _resolve(af.get(nm('Fields'))); if (!ff || ff.size() !== 0) unexaminedStructures++; }") + '\nreturn _alloScanActiveContent;')();
const name = PDF.PDFName.of;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [];
async function runCase(label, setup, expected) {
  const doc = await PDF.PDFDocument.create(); doc.addPage([300,300]);
  const form = doc.context.obj({ Fields: [] });
  doc.catalog.set(name('AcroForm'), doc.context.register(form));
  await setup(doc, form);
  const before = doc.context.enumerateIndirectObjects().map(([ref,obj]) => ref.toString() + obj.toString()).join('\n');
  const base = baseline(doc, PDF), test = candidate(doc, PDF), shortcut = naive(doc, PDF);
  const after = doc.context.enumerateIndirectObjects().map(([ref,obj]) => ref.toString() + obj.toString()).join('\n');
  assert.equal(before, after, label + ': scanner mutated PDF objects');
  assert.equal(test.complete, expected.complete, label + ': complete');
  if (expected.any !== undefined) assert.equal(test.any, expected.any, label + ': any');
  if (expected.finding) assert(test.findings.some(f => f.type === expected.finding), label + ': expected finding');
  cases.push({label, baseline:base, naiveEmptyFieldsShortcut:shortcut, candidate:test, mutation:false});
}
(async () => {
  const sourcePdfPath = path.join(root,'mcp-testing/corpus/born-digital/ed-parent-guide-idea.pdf');
  const pdfBytes = fs.readFileSync(sourcePdfPath);
  const doc = await PDF.PDFDocument.load(pdfBytes);
  const pilot = { pdfSha256:hash(pdfBytes), baseline:baseline(doc,PDF), candidate:candidate(doc,PDF), form:String(doc.context.lookup(doc.catalog.get(name('AcroForm')))) };
  console.log(JSON.stringify({pilot, oldGuardRetained:candidateText.includes("if (catalog.get(nm('AcroForm'))) unexaminedStructures++;")})); assert.equal(pilot.baseline.complete,false); assert.equal(pilot.candidate.complete,true); assert.equal(pilot.candidate.any,false);
  await runCase('bare empty Fields',()=>{}, {complete:true,any:false});
  await runCase('indirect empty Fields', (d,f)=>f.set(name('Fields'),d.context.register(d.context.obj([]))), {complete:true,any:false});
  await runCase('empty default resources and passive defaults',(d,f)=>{f.set(name('DR'),d.context.obj({})); f.set(name('DA'),PDF.PDFString.of('/Helv 0 Tf 0 g')); f.set(name('Q'),PDF.PDFNumber.of(0));f.set(name('NeedAppearances'),PDF.PDFBool.False);f.set(name('SigFlags'),PDF.PDFNumber.of(0));f.set(name('CO'),d.context.obj([]));},{complete:true,any:false});
  await runCase('actual static Type1 font resource shape',(d,f)=>f.set(name('DR'),d.context.obj({Font:{Helv:{Type:'Font',Subtype:'Type1',BaseFont:'Helvetica',Encoding:'WinAnsiEncoding'}}})),{complete:true,any:false});
  await runCase('missing Fields',(d,f)=>f.delete(name('Fields')),{complete:false,any:false});
  await runCase('malformed Fields',(d,f)=>f.set(name('Fields'),d.context.obj({})),{complete:false,any:false});
  await runCase('unresolved Fields ref',(d,f)=>f.set(name('Fields'),PDF.PDFRef.of(999999)),{complete:false,any:false});
  await runCase('nonempty ordinary field tree',(d,f)=>f.set(name('Fields'),d.context.obj([{FT:'Tx',T:PDF.PDFString.of('answer')}])),{complete:false,any:false});
  await runCase('nonempty field tree with JavaScript AA',(d,f)=>f.set(name('Fields'),d.context.obj([{FT:'Tx',AA:{K:{S:'JavaScript',JS:PDF.PDFString.of('app.alert("probe")')}}}])),{complete:false,any:true,finding:'javascript'});
  await runCase('empty Fields with XFA script stream',(d,f)=>f.set(name('XFA'),d.context.register(d.context.stream('<xdp:xdp><template><event activity="initialize"><script contentType="application/x-javascript">app.alert("probe")</script></event></template></xdp:xdp>'))),{complete:false});
  await runCase('empty Fields with nonempty calculation order',(d,f)=>f.set(name('CO'),d.context.obj([{FT:'Tx',AA:{C:{S:'JavaScript',JS:PDF.PDFString.of('event.value=1')}}}])),{complete:false,any:true,finding:'javascript'});
  await runCase('empty Fields with additional-action root',(d,f)=>f.set(name('AA'),d.context.obj({WC:{S:'JavaScript',JS:PDF.PDFString.of('app.alert("probe")')}})),{complete:false,any:true,finding:'additional-actions'});
  await runCase('default resource Form XObject with Launch',(d,f)=>f.set(name('DR'),d.context.obj({XObject:{Form1:d.context.register(d.context.stream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,10,10],A:{S:'Launch',F:PDF.PDFString.of('probe.exe')}}))}})),{complete:false,any:true,finding:'launch'});
  await runCase('default resource Form XObject with attachment',(d,f)=>f.set(name('DR'),d.context.obj({XObject:{Form1:d.context.register(d.context.stream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,10,10],AF:[{Type:'Filespec',F:PDF.PDFString.of('probe.txt')}]}))}})),{complete:false,any:true,finding:'embedded-files'});
  await runCase('ordinary opaque font stream remains incomplete',(d,f)=>f.set(name('DR'),d.context.obj({Font:{F1:{Type:'Font',Subtype:'Type1',FontDescriptor:{FontFile:d.context.register(d.context.stream('opaque-font-bytes'))}}}})),{complete:false,any:false});
  await runCase('default resource broken reference',(d,f)=>f.set(name('DR'),d.context.obj({Font:{F1:PDF.PDFRef.of(999999)}})),{complete:false,any:false});
  await runCase('unexpected root extension',(d,f)=>f.set(name('PrivateExtension'),PDF.PDFString.of('unknown semantics')),{complete:false,any:false});
  await runCase('malformed DA default',(d,f)=>f.set(name('DA'),d.context.obj({})),{complete:false,any:false});
  await runCase('nonzero signature flags with no fields',(d,f)=>f.set(name('SigFlags'),PDF.PDFNumber.of(1)),{complete:false,any:false});
  await runCase('cyclic default dictionary graph',(d,f)=>{const r=d.context.obj({});const ref=d.context.register(r);r.set(name('Cycle'),ref);f.set(name('DR'),r);},{complete:true,any:false});
  await runCase('over-depth default resource graph',(d,f)=>{let r=d.context.obj({});for(let i=0;i<135;i++)r=d.context.obj({NextResource:r});f.set(name('DR'),r);},{complete:false,any:false});
  await runCase('oversized default resource array',(d,f)=>f.set(name('DR'),d.context.obj({Encoding:{Differences:Array.from({length:10001},()=>PDF.PDFName.of('A'))}})),{complete:false,any:false});
  await runCase('empty form does not hide page JavaScript',(d,f)=>d.getPages()[0].node.set(name('Annots'),d.context.obj([{Type:'Annot',Subtype:'Link',Rect:[0,0,10,10],A:{S:'JavaScript',JS:PDF.PDFString.of('app.alert("probe")')}}])),{complete:true,any:true,finding:'javascript'});
  const report={schema:1,sourceSha256:hash(source),productionSourceChanged:false,command:'node reports/mcp-calibration-2026-09-12/empty-acroform-investigation.cjs',candidateStatus:'investigative in-memory prototype; not shipping code or a delivery gate change',pilot,cases,testCount:cases.length+1,limitations:['Prototype action classifications can double-count direct action dictionaries; production proposal must preserve established counts.','Nonempty forms, XFA, unknown roots, streams, dangling refs and traversal-budget exhaustion remain incomplete.','No field values were extracted; no active action was executed.'],references:['https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.6.pdf','https://opensource.adobe.com/dc-acrobat-sdk-docs/library/pdfmark/pdfmark_Examples.html']};
  fs.writeFileSync(path.join(__dirname,'empty-acroform-investigation.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'empty-acroform-prototype.txt'),proposal);
  console.log(JSON.stringify({passed:report.testCount,pilotBaseline:pilot.baseline,pilotCandidate:pilot.candidate,sourceSha256:report.sourceSha256}));
})().catch(error=>{console.error(error);process.exitCode=1;});
