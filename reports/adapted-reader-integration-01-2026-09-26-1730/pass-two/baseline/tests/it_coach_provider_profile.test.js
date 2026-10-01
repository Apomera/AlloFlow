import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildFirstWaveModule}=require('../_build_first_wave_view_modules.js');
describe('coach provider labels supplied by the app',()=>{
  it('exposes a safe whitelist and reads the current host configuration',()=>{
    const React={createElement:(type,props,...children)=>({type,props,children})};
    const window={React,AlloModules:{}};
    vm.runInNewContext(readFileSync('video_studio_host_bridge_module.js','utf8'),{window,console});
    const ref={current:{aiProviderProfile:{backend:'cloud',provider:'example',model:'text',visionModel:'vision',fallbackModel:'fallback',apiKey:'SECRET',baseUrl:'https://secret.example'}}};
    const tree=window.AlloModules.VideoStudioHostBridgeView({_alloCmdCtxRef:ref,_alloCmdCtx:()=>ref.current});
    const getInfo=tree.children[0]('VideoStudio').props.getCoachAiInfo;
    expect(getInfo()).toEqual({backend:'cloud',provider:'example',model:'text',visionModel:'vision',fallbackModel:'fallback'});
    ref.current={aiProviderProfile:{provider:'new',model:'new-model'}};expect(getInfo()).toEqual({provider:'new',model:'new-model'});
  });
  it('matches the source build and desktop mirror',()=>{
    const built=buildFirstWaveModule('VideoStudioHostBridgeView');
    expect(readFileSync('video_studio_host_bridge_module.js','utf8')).toBe(built);
    expect(readFileSync('desktop/web-app/public/video_studio_host_bridge_module.js','utf8')).toBe(built);
  });
});
