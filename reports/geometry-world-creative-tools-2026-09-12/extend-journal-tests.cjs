const fs=require('node:fs'),path=require('node:path');const file=path.resolve(__dirname,'../../tests/geometry_world_activity_build_journal.test.js');let s=fs.readFileSync(file,'utf8');
function replace(a,b){if(s.indexOf(a)<0||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Expected one test anchor');s=s.replace(a,b);}
replace("goal('height',.25),goal('width',2,'approximately')","goal('height',.25),goal('occupiedVolume',1.5,'eq',true),goal('height',2.5,'eq',true),goal('width',2,'approximately')");
const anchor="  it('produces an escaped offline portfolio with full geometry JSON and derived snapshot facts',()=>{";
replace(anchor,`  it('preserves negative coordinates and shape rotations in the full saved geometry and sketch',()=>{
    const engine=fixtureEngine(),b=block(-7,1,-4,'halfA');b.rotation=1;engine.blocks['-7,1,-4']={userData:{gridPos:{x:-7,y:1,z:-4},shape:b.shape,rotation:1,blockType:'gold',_lessonBlock:false,_measurementLayer:'student'}};engine._builderSelection={blocks:[b]};
    const snapshot=api.captureActivityBuild(engine).snapshot;expect(snapshot.blocks[0]).toEqual({...b,type:'gold'});expect(snapshot.facts).toMatchObject({occupiedVolume:.5,footprintArea:1,width:1,depth:1,height:1});
    const rotated=api.activitySnapshotSvg(snapshot),straight=api.activitySnapshotSvg({...snapshot,blocks:[{...snapshot.blocks[0],rotation:0}]});expect(rotated).not.toBe(straight);expect(rotated).toContain('<polygon');expect(rotated).not.toContain('NaN');expect(rotated).not.toContain('Infinity');
  });
`+anchor);
const final="  it('presents open-ended activities without a fake grade and supports clearing only snapshots',()=>{";
replace(final,`  it('downloads the mounted before/after portfolio and geometry journal using only local Blob URLs',()=>{
    const app=mount(),downloads=[];const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
    URL.createObjectURL=vi.fn(blob=>{downloads.push(blob);return 'blob:local-portfolio';});URL.revokeObjectURL=vi.fn();const linkClick=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    try{app.click(app.button('Save before snapshot'));app.engine.blocks['1,1,0'].userData.shape='quarter';app.click(app.button('Save after snapshot'));app.click(app.button('Download portfolio'));app.click(app.button('Download journal'));
      expect(downloads).toHaveLength(2);expect(downloads[0].type).toBe('text/html;charset=utf-8');expect(downloads[1].type).toBe('application/json');expect(linkClick).toHaveBeenCalledTimes(2);expect(downloads.every(blob=>blob.size>100)).toBe(true);expect(app.entry().before.facts.occupiedVolume).toBe(2);expect(app.entry().after.facts.occupiedVolume).toBe(1.25);
    }finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
  });
`+final);
const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,s,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}console.log('Added fractional full-cube rejection, negative-coordinate sketch, and mounted download checks.');
