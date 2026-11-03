/* Local reader shared by Geometry World and Print Lab. Packages contain a
 * final-size print mesh and, when available, a separately editable world. */
(function () {
  'use strict';
  var MiB = 1024 * 1024;
  var entryLimits = {'manifest.json':256 * 1024, 'model.stl':5 * MiB, 'editable-world.json':512 * 1024};
  var archiveLimit = 10 * MiB, expandedLimit = 12 * MiB, entryLimit = 16;
  var lab = window.StemLab = window.StemLab || {};
  var sidecarUrl = document.currentScript && document.currentScript.src;

  async function zipLibrary() {
    if (typeof window.JSZip === 'function') return window.JSZip;
    if (typeof lab.loadScriptResilient !== 'function') throw new Error('The local ZIP reader is unavailable. Try opening the extracted files instead.');
    var paths = ['jszip/3.10.1/jszip.min.js','vendor/jszip-3.10.1.min.js'];
    if (sidecarUrl) paths = paths.map(function(path){return new URL('../'+path,sidecarUrl).href;}).concat(paths);
    await lab.loadScriptResilient(paths,{
      cacheKey:'print-lab-zip', check:function(){return typeof window.JSZip === 'function';},
      failMessage:'The local ZIP reader could not load. Try opening the extracted files instead.'
    });
    return window.JSZip;
  }

  function invalidArchive() {
    return new Error('This file is not a supported Geometry World print ZIP. Choose the original print package.');
  }
  // These packages use ordinary ZIP headers. Alternative path and ZIP64
  // records could make the decompressor interpret different names or sizes.
  function checkExtraFields(view, start, end) {
    while (start < end) {
      if (start+4 > end) throw invalidArchive();
      var kind = view.getUint16(start,true), length = view.getUint16(start+2,true);
      if (kind === 0x7075 || kind === 0x0001 || start+4+length > end) throw invalidArchive();
      start += 4+length;
    }
  }
  async function fileBytes(file) {
    if (!file || !Number.isSafeInteger(file.size) || file.size < 22) throw invalidArchive();
    if (file.size > archiveLimit) throw new Error('Choose a print package no larger than 10 MiB.');
    var buffer = file.arrayBuffer ? await file.arrayBuffer() : await new Promise(function(resolve,reject){
      var reader = new FileReader();
      reader.onload = function(){resolve(reader.result);};
      reader.onerror = function(){reject(new Error('The print package could not be read. Choose the file again.'));};
      reader.readAsArrayBuffer(file);
    });
    if (!buffer || buffer.byteLength !== file.size) throw invalidArchive();
    return new Uint8Array(buffer);
  }

  // Check the directory before handing it to JSZip. Its sanitized file map
  // cannot distinguish duplicate names or a path that aliases a required file.
  function packageDirectory(bytes) {
    var view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    var get16 = function(pos){return view.getUint16(pos,true);};
    var get32 = function(pos){return view.getUint32(pos,true);};
    // JSZip uses the last end-of-directory signature. Validate that same
    // record, including its comment length, so the two parsers cannot diverge.
    var end = bytes.length-4, earliest = Math.max(0,bytes.length-65557);
    while (end >= earliest && get32(end)!==0x06054b50) end--;
    if (end < earliest || end+22 > bytes.length || end+22+get16(end+20)!==bytes.length ||
        get16(end+4) || get16(end+6)) throw invalidArchive();
    var count = get16(end+10), start = get32(end+16);
    if (!count || count > entryLimit || get16(end+8) !== count || start+get32(end+12) !== end) throw invalidArchive();
    var cursor = start, expanded = 0, entries = new Map(), aliases = new Set();
    var decoder = new TextDecoder('utf-8',{fatal:true});
    for (var i=0;i<count;i++) {
      if (cursor+46 > end || get32(cursor) !== 0x02014b50) throw invalidArchive();
      var nameLength = get16(cursor+28), next = cursor+46+nameLength+get16(cursor+30)+get16(cursor+32);
      if (next > end || !nameLength || nameLength > 256 || get16(cursor+34)) throw invalidArchive();
      var name = decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
      checkExtraFields(view,cursor+46+nameLength,cursor+46+nameLength+get16(cursor+30));
      if (name.includes('\\') || name.startsWith('/') || /[:\x00-\x1f]/.test(name) || name.split('/').some(function(part){return part==='.' || part==='..';}) || aliases.has(name.toLowerCase())) throw invalidArchive();
      aliases.add(name.toLowerCase());
      var size = get32(cursor+24), compressed = get32(cursor+20), local = get32(cursor+42);
      expanded += size;
      if (expanded > expandedLimit || (Object.prototype.hasOwnProperty.call(entryLimits,name) && size > entryLimits[name])) {
        throw new Error('This ZIP expands beyond the supported print-package size. Choose a smaller package.');
      }
      var method = get16(cursor+10);
      if ((method!==0 && method!==8) || (get16(cursor+8) & 1) || local+30 > start || get32(local) !== 0x04034b50) throw invalidArchive();
      var dataOffset = local+30+get16(local+26)+get16(local+28);
      if (get16(local+26) !== nameLength || dataOffset+compressed > start || get16(local+8)!==method || get16(local+6)!==get16(cursor+8) ||
          decoder.decode(bytes.subarray(local+30,local+30+nameLength))!==name) throw invalidArchive();
      checkExtraFields(view,local+30+nameLength,dataOffset);
      entries.set(name,{size:size,crc:get32(cursor+16)});
      cursor = next;
    }
    if (cursor !== end) throw invalidArchive();
    return entries;
  }

  var crcTable = Uint32Array.from({length:256},function(_,value){
    for (var bit=0;bit<8;bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    return value;
  });
  function crc32(bytes) {
    var crc = -1;
    for (var i=0;i<bytes.length;i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 255];
    return (crc ^ -1) >>> 0;
  }
  function readEntry(zip, directory, name) {
    var info = directory.get(name), entry = zip.file(name);
    if (!info || !entry || entry.dir || !info.size) throw new Error('The print package is missing a usable '+name+'.');
    // Stop expanding at the verified budget even if the entry's declared
    // size is false. Never inflate unused members such as optional notes.
    return new Promise(function(resolve,reject){
      var out = new Uint8Array(info.size), used = 0, stopped = false;
      var stream = entry.internalStream('uint8array');
      stream.on('data',function(chunk){
        if (stopped) return;
        if (used+chunk.length > out.length) {
          stopped = true; stream.pause(); reject(new Error(name+' expands beyond its declared size.')); return;
        }
        out.set(chunk,used); used += chunk.length;
      }).on('error',function(){stopped = true; reject(new Error(name+' could not be unpacked.'));})
        .on('end',function(){
          if (stopped) return;
          if (used!==out.length || crc32(out)!==info.crc) {reject(new Error(name+' is damaged. Choose the original package.'));return;}
          resolve(out);
        }).resume();
    });
  }
  function json(bytes,name) {
    try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
    catch (_) {throw new Error(name+' does not contain readable JSON.');}
  }
  function validateManifest(manifest) {
    if (!manifest || manifest.schema!=='alloflow-print-package/1') throw new Error('Choose a Geometry World print package with a supported manifest.');
    var model = manifest.model, source = manifest.source;
    if (!model || model.file!=='model.stl' || model.units!=='mm' || model.coordinateSystem!=='z-up' ||
        typeof model.sha256!=='string' || !/^[a-f0-9]{64}$/i.test(model.sha256)) throw new Error('The package must identify a millimeter, Z-up model.stl and its SHA-256 hash.');
    if (!source || source.tool!=='geometryWorld' || !Number.isFinite(source.millimetersPerBlock) ||
        source.millimetersPerBlock<0.01 || source.millimetersPerBlock>1000 ||
        (source.printTurnDegrees!==undefined && source.printTurnDegrees!==0 && source.printTurnDegrees!==90) ||
        (source.editableFile!=null && source.editableFile!=='editable-world.json')) throw new Error('The package has an unsupported Geometry World scale, orientation, or editable file.');
  }
  function meshDimensions(bytes) {
    if (bytes.length < 84) throw new Error('The package model.stl is incomplete.');
    var view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), count = view.getUint32(80,true);
    if (!count || 84+50*count!==bytes.length) throw new Error('The package model.stl has an invalid triangle count.');
    var min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
    for (var triangle=0;triangle<count;triangle++) {
      var start=84+triangle*50;
      for (var component=0;component<12;component++) {
        var value=view.getFloat32(start+component*4,true);
        if (!Number.isFinite(value)) throw new Error('The package model.stl contains an invalid coordinate.');
        if (component<3) continue; // facet normal
        var axis=component%3; min[axis]=Math.min(min[axis],value); max[axis]=Math.max(max[axis],value);
      }
    }
    return {width:max[0]-min[0],depth:max[1]-min[1],height:max[2]-min[2]};
  }
  async function read(file) {
    var bytes = await fileBytes(file), directory = packageDirectory(bytes);
    var Zip = await zipLibrary(), zip = await Zip.loadAsync(bytes);
    var manifest = json(await readEntry(zip,directory,'manifest.json'),'manifest.json');
    validateManifest(manifest);
    var model = await readEntry(zip,directory,'model.stl');
    if (!window.crypto || !window.crypto.subtle) throw new Error('This browser cannot verify the model hash. Open the package in a browser with local file verification.');
    var digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256',model));
    var hash = Array.from(digest,function(value){return value.toString(16).padStart(2,'0');}).join('');
    if (hash!==manifest.model.sha256.toLowerCase()) throw new Error('The STL does not match the hash in the package manifest. Choose the original package.');
    var dimensions = meshDimensions(model), editableWorld = null;
    if (manifest.source.editableFile) {
      editableWorld = json(await readEntry(zip,directory,'editable-world.json'),'editable-world.json');
      if (!editableWorld || editableWorld.schema!=='alloflow-geometry-world/2' || !Array.isArray(editableWorld.blocks) || !editableWorld.blocks.length) {
        throw new Error('The package does not contain a valid editable Geometry World file.');
      }
    }
    return {manifest:manifest,modelBytes:model,editableWorld:editableWorld,dimensions:dimensions};
  }
  lab.geometryPrintPackage = {read:read};
})();
