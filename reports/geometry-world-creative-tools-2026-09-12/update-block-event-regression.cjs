const fs=require('node:fs'),assert=require('node:assert/strict'),file='tests/geometry_world_block_fidelity.test.js';
const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
const before=`      expect(src).toContain("if (!had && engine.blocks[key] && !engine._placingLessonBlocks) {");
      expect(src).toContain("if (had && !engine.blocks[key]) {");`;
const after=`      const events = [];
      const engine = {
        blocks: {}, logEvent: (type, data) => events.push({type, data}),
        placeBlock(x, y, z, type, shape, rotation) {
          const key = [x, y, z].join(',');
          if (this.blocks[key]) return false;
          this.blocks[key] = {type, shape, rotation}; return true;
        },
        removeBlock(x, y, z, force) {
          const key = [x, y, z].join(',');
          if (this.blocks[key]?.protected && !force) return;
          delete this.blocks[key];
        },
      };
      const start = src.indexOf('        var origPlace = engine.placeBlock;');
      const end = src.indexOf('        // Export session data as CSV for research', start);
      expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
      new Function('engine', src.slice(start, end))(engine);
      expect(engine.placeBlock(1, 1, 1, 'wood', 'quarter', 3)).toBe(true);
      expect(engine.placeBlock(1, 1, 1, 'stone', 'cube', 0)).toBe(false);
      engine._placingLessonBlocks = true; engine.placeBlock(2, 1, 1, 'stone', 'cube', 0);
      engine._placingLessonBlocks = false; engine._batchSuppressEvents = true;
      engine.placeBlock(3, 1, 1, 'stone', 'cube', 0); engine._batchSuppressEvents = false;
      engine.blocks['2,1,1'].protected = true; engine.removeBlock(2, 1, 1);
      engine.removeBlock(9, 1, 1); engine.removeBlock(1, 1, 1);
      expect(events).toEqual([
        {type: 'block_place', data: {x: 1, y: 1, z: 1, type: 'wood', shape: 'quarter', rotation: 3}},
        {type: 'block_remove', data: {x: 1, y: 1, z: 1}},
      ]);
      expect(engine.blocks['2,1,1']).toBeDefined();
      engine.removeBlock(2, 1, 1, true); expect(events.at(-1).type).toBe('block_remove');`;
assert.equal(source.split(before).length,2);source=source.replace(before,after);
const bytes=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('Block-event regression now executes the production wrappers, including deferred batch logging.');
