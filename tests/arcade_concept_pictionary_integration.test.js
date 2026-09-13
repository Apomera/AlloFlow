import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>readFileSync(file,'utf8');
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
describe('Pictionary production integration',()=>{
 it('ships the same solo plugin and arcade provider context in desktop mirrors',()=>{for(const file of ['arcade_mode_concept_pictionary.js','allohaven_module.js'])expect(read('desktop/web-app/public/'+file)).toBe(read(file));});
 it('passes the configured vision function through each host and the arcade context',()=>{expect(read('allohaven_module.js')).toContain('callGeminiVision: props.callGeminiVision || null');for(const file of hosts){const text=read(file),start=text.indexOf('{(AlloHaven) => React.createElement(AlloHaven, {');expect(start).toBeGreaterThan(-1);expect(text.slice(start,start+500)).toContain('callGeminiVision,');}});
 it('versions the changed Pictionary plugin while retaining other plugin versions and retries',()=>{const hash=createHash('sha256').update(readFileSync('arcade_mode_concept_pictionary.js')).digest('hex').slice(0,10);for(const file of hosts){const text=read(file);expect(text).toContain("mod === 'arcade_mode_concept_pictionary.js' ? '"+hash+"' : pluginCdnVersion");expect(text).toContain("s.src = pluginCdnBase + mod + '?v=' + modeVersion + retrySuffix");}const havenHash=createHash('sha256').update(readFileSync('allohaven_module.js')).digest('hex').slice(0,10);expect(read('AlloFlowANTI.txt')).toContain('allohaven_module.js?v='+havenHash);});
});
