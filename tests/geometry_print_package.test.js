import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { File } from 'node:buffer';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

let JSZip, reader;
const originalDimensions = { width:20, depth:80, height:10 };
const turnedDimensions = { width:80, depth:20, height:10 };
const editableWorld = {
  schema:'alloflow-geometry-world/2', title:'Class model', coordinateSystem:'x-right,y-up,z-depth',
  blocks:[{x:-3,y:1,z:4,type:'wood',shape:'halfB',rotation:0}]
};

beforeAll(() => {
  const module = {exports:{}};
  new Function('module','exports',readFileSync('app/vendor/jszip-3.10.1.min.js','utf8'))(module,module.exports);
  JSZip = module.exports;
});

beforeEach(() => {
  vi.stubGlobal('StemLab',{});
  vi.stubGlobal('JSZip',JSZip);
  vi.stubGlobal('crypto',webcrypto);
  new Function(readFileSync('stem_lab/geometry_print_package.js','utf8'))();
  reader = window.StemLab.geometryPrintPackage;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function binaryStl(turned) {
  const vertices = [[0,0,0],[20,80,0],[10,30,10]];
  const rawNormal = [800,-200,-200];
  const normal = rawNormal.map(value => value / Math.hypot(...rawNormal));
  const vectors = [normal,...vertices];
  const bytes = new Uint8Array(134), view = new DataView(bytes.buffer);
  view.setUint32(80,1,true);
  vectors.forEach(([x,y,z],index) => {
    const offset = 84+12*index;
    view.setFloat32(offset,turned ? -y : x,true);
    view.setFloat32(offset+4,turned ? x : y,true);
    view.setFloat32(offset+8,z,true);
  });
  return bytes;
}

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

async function packageBytes({turned=false, legacy=false, withEditable=true, customizeManifest, customizeFiles, zipOptions={}} = {}) {
  const zip = new JSZip(), model = binaryStl(turned);
  const manifest = {
    schema:'alloflow-print-package/1',title:'Class model',description:'For staff review',
    model:{file:'model.stl',sha256:sha256(model),units:'mm',coordinateSystem:'z-up',dimensionsMm:turned ? turnedDimensions : originalDimensions},
    source:{tool:'geometryWorld',millimetersPerBlock:10,editableFile:withEditable?'editable-world.json':null,recipeFile:'block-source.json'},
    reviewStatus:'AWAITING_SLICER_AND_STAFF_REVIEW',material:'PLA'
  };
  if (turned) manifest.source.printTurnDegrees = 90;
  if (!legacy) manifest.reviewFile = 'review.alloflow-print.json';
  if (customizeManifest) customizeManifest(manifest,model);
  zip.file('manifest.json',JSON.stringify(manifest));
  zip.file('model.stl',model);
  zip.file('block-source.json',JSON.stringify({schema:'alloflow-geometry-world-build/1',coordinateSystem:'x-right,y-up,z-depth',blocks:editableWorld.blocks}));
  if (withEditable) zip.file('editable-world.json',JSON.stringify(editableWorld));
  if (!legacy) zip.file('review.alloflow-print.json',JSON.stringify({schema:'alloflow-print-submission/1',contentHash:sha256(model),unitDeclaration:'1 STL unit = 1 mm'}));
  if (customizeFiles) customizeFiles(zip,model,manifest);
  const bytes = await zip.generateAsync({type:'uint8array',compression:'DEFLATE',...zipOptions});
  return {bytes,model,manifest};
}

function openBytes(bytes) {
  return reader.read(new File([bytes],'class-project.zip',{type:'application/zip'}));
}

// Change ZIP metadata while leaving the compressed payload intact. JSZip's
// writer always records correct lengths and deduplicates file names, so it
// cannot produce these adversarial cases through its public writer API.
function zipRecord(bytes, name) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const end = bytes.length-22, count = view.getUint16(end+10,true);
  let offset = view.getUint32(end+16,true);
  for (let i=0; i<count; i++) {
    expect(view.getUint32(offset,true)).toBe(0x02014b50);
    const nameSize = view.getUint16(offset+28,true);
    const filename = new TextDecoder().decode(bytes.subarray(offset+46,offset+46+nameSize));
    if (filename === name) return {view,central:offset,local:view.getUint32(offset+42,true)};
    offset += 46+nameSize+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
  }
  throw new Error('Missing fixture entry '+name);
}

function declaredSize(bytes, name, size) {
  const {view,central,local} = zipRecord(bytes,name);
  view.setUint32(central+24,size,true);
  view.setUint32(local+22,size,true);
}

describe('reading Geometry World print packages', () => {
  it('opens a current print package as a local File using the turned millimeter mesh and original editable world',async () => {
    const {bytes,model} = await packageBytes({turned:true});
    const result = await reader.read(new File([bytes],'class-project.zip',{type:'application/zip'}));
    expect(result.dimensions).toEqual(turnedDimensions);
    expect(result.modelBytes).toBeInstanceOf(Uint8Array);
    expect(result.modelBytes).toEqual(model);
    expect(result.editableWorld).toEqual(editableWorld);
    expect(result.manifest.source).toMatchObject({millimetersPerBlock:10,printTurnDegrees:90});
  });

  it('reads an older package with neither a review JSON nor an editable-world file',async () => {
    const {bytes,model} = await packageBytes({legacy:true,withEditable:false});
    const result = await openBytes(bytes);
    expect(result.modelBytes).toEqual(model);
    expect(result.dimensions).toEqual(originalDimensions);
    expect(result.editableWorld).toBeNull();
  });

  it('derives the size from placed millimeter triangles even when saved report and manifest dimensions disagree',async () => {
    const {bytes,model} = await packageBytes({turned:true,customizeManifest(manifest) {
      manifest.model.dimensionsMm = {width:2,depth:8,height:1};
      manifest.preflight = {status:'PASS',dimensionsMm:originalDimensions};
    }});
    const result = await openBytes(bytes);
    expect(result.dimensions).toEqual(turnedDimensions);
    expect(result.modelBytes).toEqual(model);
  });

  it('accepts an explicit original orientation and both supported unit endpoints',async () => {
    for (const scale of [0.01,1000]) {
      const {bytes,model} = await packageBytes({customizeManifest(manifest) {
        manifest.source.printTurnDegrees = 0;
        manifest.source.millimetersPerBlock = scale;
      }});
      const result = await openBytes(bytes);
      expect(result.dimensions).toEqual(originalDimensions);
      expect(result.modelBytes).toEqual(model);
    }
  });

  it('only returns an editable world when the manifest declares one',async () => {
    const {bytes} = await packageBytes({customizeManifest(manifest){ delete manifest.source.editableFile; }});
    expect((await openBytes(bytes)).editableWorld).toBeNull();
  });

  it.each([
    ['missing',zip=>zip.remove('editable-world.json')],
    ['not JSON',zip=>zip.file('editable-world.json','{broken')],
    ['wrong schema',zip=>zip.file('editable-world.json',JSON.stringify({...editableWorld,schema:'unrecognized'}))],
    ['missing blocks',zip=>zip.file('editable-world.json',JSON.stringify({...editableWorld,blocks:null}))]
  ])('rejects a declared editable world that is %s',async (_label,modify) => {
    const {bytes} = await packageBytes({customizeFiles:modify});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('only opens named package inputs and never fetches embedded URLs',async () => {
    const touched = new Set(), fetch = vi.fn(() => { throw new Error('Unexpected network access'); });
    vi.stubGlobal('fetch',fetch);
    const {bytes} = await packageBytes({customizeFiles(zip) {
      zip.file('irrelevant/document.html','<img src="https://example.invalid/private">');
      zip.file('nested/model.stl','not the print copy');
      zip.file('README.txt','https://example.invalid/file.stl');
    }});
    // Track requested inflation, not just final output. Unrelated archive
    // members must not be decompressed or interpreted by the reader.
    const probe = new JSZip().file('probe','1').file('probe');
    const prototype = Object.getPrototypeOf(probe), stream = prototype.internalStream;
    vi.spyOn(prototype,'internalStream').mockImplementation(function(...args){ touched.add(this.name);return stream.apply(this,args); });
    expect((await openBytes(bytes)).dimensions).toEqual(originalDimensions);
    expect(fetch).not.toHaveBeenCalled();
    for (const name of ['irrelevant/document.html','nested/model.stl','README.txt']) expect(touched.has(name)).toBe(false);
  });

  it('rejects a changed STL even when both meshes are valid and have exactly the same envelope',async () => {
    const {bytes} = await packageBytes({customizeFiles(zip,model) {
      const modified = model.slice();
      new DataView(modified.buffer).setFloat32(84+9*4,11,true);
      zip.file('model.stl',modified);
    }});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('does not return an edit or print copy when hash verification is unavailable',async () => {
    const {bytes} = await packageBytes();
    vi.stubGlobal('crypto',{});
    await expect(openBytes(bytes)).rejects.toThrow(/verify|hash/i);
  });

  it('opens a browser File using FileReader when arrayBuffer is unavailable',async () => {
    const {bytes,model} = await packageBytes();
    const file = new window.File([bytes],'class-project.zip',{type:'application/zip'});
    Object.defineProperty(file,'arrayBuffer',{value:undefined});
    const result = await reader.read(file);
    expect(result.modelBytes).toEqual(model);
  });

  it.each([
    ['unknown schema',m=>{m.schema='other/1';}],['wrong tool',m=>{m.source.tool='otherTool';}],
    ['inches',m=>{m.model.units='in';}],['wrong coordinate system',m=>{m.model.coordinateSystem='y-up';}],
    ['unknown orientation',m=>{m.source.printTurnDegrees=45;}],['negative scale',m=>{m.source.millimetersPerBlock=-1;}],
    ['out-of-range scale',m=>{m.source.millimetersPerBlock=1001;}],['scalar source',m=>{m.source=123;}],
    ['absent digest',m=>{delete m.model.sha256;}],['malformed digest',m=>{m.model.sha256='z'.repeat(64);}],
    ['remote model path',m=>{m.model.file='https://example.invalid/model.stl';}]
  ])('rejects a manifest with %s',async (_label,modify) => {
    const {bytes} = await packageBytes({customizeManifest:modify});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it.each([
    ['missing manifest',zip=>zip.remove('manifest.json')],['malformed manifest',zip=>zip.file('manifest.json','{"tool":')],
    ['array instead of manifest',zip=>zip.file('manifest.json','[]')],['missing model',zip=>zip.remove('model.stl')]
  ])('rejects an archive with %s',async (_label,modify) => {
    const {bytes} = await packageBytes({customizeFiles:modify});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it.each(['manifest.json','model.stl'])('does not resolve a traversal alias as the required root %s',async name => {
    const {bytes} = await packageBytes({customizeFiles(zip,model,manifest) {
      const data = name === 'model.stl' ? model : JSON.stringify(manifest);
      zip.remove(name);
      zip.file('nested/../'+name,data,{createFolders:false});
    }});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it.each(['truncated','nonfinite coordinate'])('rejects a correctly hashed but %s STL',async problem => {
    const model = binaryStl(false), view = new DataView(model.buffer);
    if (problem === 'nonfinite coordinate') view.setFloat32(84+6*4,NaN,true);
    const invalid = problem === 'truncated' ? model.slice(0,-1) : model;
    const {bytes} = await packageBytes({customizeManifest(manifest){ manifest.model.sha256=sha256(invalid); },customizeFiles(zip){ zip.file('model.stl',invalid); }});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it.each([null,'package.zip',new Uint8Array([0x50,0x4b])])('rejects invalid package input',async input => {
    await expect(reader.read(input)).rejects.toThrow();
  });
});

describe('the package reader bounds archive work before using its contents', () => {
  it('rejects a file above 10 MiB before requesting the archive bytes',async () => {
    const file = {size:10*1024*1024+1,name:'oversize.zip',arrayBuffer:vi.fn()};
    await expect(reader.read(file)).rejects.toThrow();
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it.each([
    ['model.stl',5*1024*1024+1],['manifest.json',256*1024+1],['editable-world.json',512*1024+1]
  ])('rejects a declared %s inflation above its limit before unpacking any archive entries',async (name,size) => {
    const {bytes} = await packageBytes();
    declaredSize(bytes,name,size);
    const unpack = vi.spyOn(JSZip,'loadAsync');
    await expect(openBytes(bytes)).rejects.toThrow();
    expect(unpack).not.toHaveBeenCalled();
  });

  it('detects a damaged editable-world CRC even when the STL remains byte-identical and the editable JSON parses',async () => {
    const {bytes} = await packageBytes();
    const {view,central,local} = zipRecord(bytes,'editable-world.json');
    const incorrect = (view.getUint32(central+16,true)^1) >>> 0;
    view.setUint32(central+16,incorrect,true);
    view.setUint32(local+14,incorrect,true);
    await expect(openBytes(bytes)).rejects.toThrow(/damaged|unpack/i);
  });

  it('accounts for all declared decompressed bytes, including ignored files',async () => {
    const {bytes} = await packageBytes({customizeFiles(zip){ zip.file('extra-a.txt','A');zip.file('extra-b.txt','B'); }});
    declaredSize(bytes,'extra-a.txt',7*1024*1024);
    declaredSize(bytes,'extra-b.txt',7*1024*1024);
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('bounds actual inflation when a compressed manifest lies about its uncompressed size',async () => {
    const {bytes} = await packageBytes({customizeFiles(zip,_model,manifest){ zip.file('manifest.json',JSON.stringify(manifest)+' '.repeat(3*1024*1024)); }});
    declaredSize(bytes,'manifest.json',2048);
    expect(bytes.length).toBeLessThan(16*1024);
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('rejects a ZIP above the allowed entry count',async () => {
    const {bytes} = await packageBytes({customizeFiles(zip){ for (let i=0; i<17; i++) zip.file('note-'+i+'.txt','note'); }});
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('rejects duplicate canonical names even when both model entries match the expected digest',async () => {
    const {bytes} = await packageBytes({customizeFiles(zip,model){ zip.file('m0del.stl',model); }});
    const {central,local} = zipRecord(bytes,'m0del.stl');
    bytes[central+47] = 'o'.charCodeAt(0);
    bytes[local+31] = 'o'.charCodeAt(0);
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('rejects an optional file whose Unicode path metadata would replace the canonical STL',async () => {
    const utf8 = new TextEncoder();
    const {bytes} = await packageBytes({
      customizeFiles(zip,model){ zip.file('méde.stl',model); },
      zipOptions:{encodeFileName(name){ return name === 'méde.stl' ? 'other.stl' : name; }}
    });
    const {view,central} = zipRecord(bytes,'other.stl');
    const extra = central+46+view.getUint16(central+28,true);
    expect(view.getUint16(extra,true)).toBe(0x7075);
    // JSZip uses this alternate name when the archive's UTF-8 flag is off.
    // Preserve its version and CRC32 of the raw name so it is a valid alias.
    bytes.set(utf8.encode('model.stl'),extra+9);
    await expect(openBytes(bytes)).rejects.toThrow();
  });

  it('rejects a truncated archive before accepting its otherwise complete members',async () => {
    const {bytes} = await packageBytes();
    await expect(openBytes(bytes.slice(0,-17))).rejects.toThrow();
  });
  it('rejects an ambiguous end marker in the ZIP comment before JSZip reads a different directory',async () => {
    const {bytes} = await packageBytes({zipOptions:{comment:'PK\x05\x06'}});
    const load = vi.spyOn(JSZip,'loadAsync');
    await expect(openBytes(bytes)).rejects.toThrow();
    expect(load).not.toHaveBeenCalled();
  });
});
