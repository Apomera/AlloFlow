import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const E=createRequire(import.meta.url)('../life_skills_outing/engine.js');
const play=(run,ids)=>ids.reduce((r,id)=>E.dispatch(r,id),run);

describe('Life Skills action rehearsal',()=>{
  it('shows immediate bottle and clock changes without changing the outing',()=>{
    const run=E.createRun(),before=JSON.stringify(run),preview=E.previewAction(run,'fill_water');
    expect(preview).toMatchObject({actionId:'fill_water',revision:0,forecastMayChange:true});
    expect(preview.changes).toContainEqual({label:'Practice clock',before:'09:00',after:'09:01'});
    expect(preview.changes).toContainEqual({label:'Water bottle',before:'Empty · on the counter',after:'Filled · on the counter'});
    expect(preview.feedback).toContain('still needs to go in your bag');
    expect(JSON.stringify(run)).toBe(before);
    expect(E.materialize(run).observations).toEqual([]);
    expect(Object.isFrozen(preview.changes)).toBe(true);
  });
  it('does not disclose the future forecast or delayed bus during a rehearsal',()=>{
    const previews=['rain','warm','bus-delay'].map(variation=>{
      const run=play(E.createRun({variation}),['fill_water','pack_water']);
      return E.previewAction(run,'wear_ready');
    });
    expect(previews[0]).toEqual(previews[1]);expect(previews[0]).toEqual(previews[2]);
    expect(JSON.stringify(previews)).not.toContain('09:45');
    const actual=play(E.createRun({variation:'bus-delay'}),['fill_water','pack_water','wear_ready']);
    expect(E.view(actual).event.title).toBe('Rain and a bus delay');
  });
  it('uses the actual updated travel facts when rehearsing a later choice',()=>{
    const run=play(E.createRun({variation:'bus-delay'}),['fill_water','pack_water','wear_ready']);
    const preview=E.previewAction(run,'choose_bus');
    expect(preview.forecastMayChange).toBe(false);
    expect(preview.feedback).toContain('09:45');
    expect(preview.changes).toContainEqual({label:'Travel plan',before:'No route selected',after:'09:20 bus, arriving 09:45'});
    expect(E.view(run).travel).toBeNull();
  });
  it('shows a zero-time weather swap and keeps the original bag intact',()=>{
    const run=play(E.createRun(),['wear_ready','fill_water','pack_water','pack_hat']);
    const preview=E.previewAction(run,'pack_raincoat');
    expect(preview.changes.some(change=>change.label==='Practice clock')).toBe(false);
    expect(preview.changes).toContainEqual({label:'Sun hat',before:'In your bag',after:'On the hook'});
    expect(preview.changes).toContainEqual({label:'Raincoat',before:'On the hook',after:'In your bag'});
    expect(E.materialize(run).weatherItem).toBe('hat');
  });
  it('requires actual prerequisites and does not offer a rehearsal of support',()=>{
    const run=E.createRun();
    expect(()=>E.previewAction(run,'pack_water')).toThrow(/Fill/);
    expect(()=>E.previewAction(run,'depart')).toThrow(/Before leaving/);
    expect(()=>E.previewAction(run,'hint')).toThrow(/available practice action/);
    expect(()=>E.previewAction(run,'invented_action')).toThrow(/available practice action/);
  });
  it('previews an allowed departure using the selected route while retaining an unfinished run',()=>{
    const run=play(E.createRun(),['wear_ready','fill_water','pack_water','pack_document','pack_raincoat','choose_ride']);
    const preview=E.previewAction(run,'depart');
    expect(preview.changes).toContainEqual({label:'Practice clock',before:'09:06',after:'09:21'});
    expect(preview.feedback).toBe(E.view(E.dispatch(run,'depart')).feedback);
    expect(E.materialize(run).departed).toBe(false);
    expect(()=>E.previewAction(E.dispatch(run,'depart'),'choose_walk')).toThrow(/available/);
  });
  it('keeps version-one route limits during a rehearsal',()=>{
    const legacy={...E.createRun(),manifestVersion:1};
    expect(()=>E.previewAction(legacy,'choose_ride')).toThrow(/available/);
    expect(E.previewAction(legacy,'choose_bus').feedback).toContain('09:30');
  });
});
