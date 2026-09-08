import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from '@babel/core';
const require=createRequire(import.meta.url);
const React=require('../desktop/web-app/node_modules/react');
const {renderToStaticMarkup}=require('../desktop/web-app/node_modules/react-dom/server');
const source=fs.readFileSync('view_adventure_settings_source.jsx','utf8');
const compiled=transformSync(source,{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false}).code;
const {AdventureSetupFields,adventureSetupLocked,adventureSetupLimit}=new Function('React',compiled+';return {AdventureSetupFields,adventureSetupLocked,adventureSetupLimit};')(React);
function fixture(teacher=true,permissions={}) {
  const values={adventureInputMode:'system',adventureDifficulty:'Normal',adventureLanguageMode:'English',adventureFreeResponseEnabled:false,adventureChanceMode:false,isAdventureStoryMode:true,isSocialStoryMode:true,socialStoryFocus:'Sharing',enableFactionResources:true,factionResourceMode:'manual',adventureArtStyle:'custom',adventureCustomArtStyle:'Watercolour',adventureConsistentCharacters:true,useLowQualityVisuals:false,adventureCustomInstructions:'',adventureFluencyEnabled:true,adventureTypingPaceEnabled:false,isAdventureCloudEnabled:false};
  const props={...values,isTeacherMode:teacher,studentProjectSettings:{allowFreeResponse:true,adventurePermissions:permissions},adventureState:{episodeTurnLimit:null,enableAutoClimax:true,choiceCount:4,systemResources:[{name:'Budget',quantity:100,unit:'credits'}]},setAdventureState:()=>{},selectedLanguages:['Spanish'],t:k=>k};
  for(const key of Object.keys(values))props['set'+key[0].toUpperCase()+key.slice(1)]=()=>{};
  return props;
}
describe('Shared Adventure setup semantics',()=>{
  it('gives every editable control a real label and unique id in both entry points',()=>{
    document.body.innerHTML=renderToStaticMarkup(React.createElement(React.Fragment,null,
      React.createElement(AdventureSetupFields,{...fixture(),idPrefix:'launch'}),
      React.createElement(AdventureSetupFields,{...fixture(),idPrefix:'sidebar',compact:true})));
    for(const control of document.querySelectorAll('input,select,textarea'))expect(control.labels.length).toBeGreaterThan(0);
    const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelector('#launch-social-focus').value).toBe('Sharing');
    expect(document.querySelector('#sidebar-resource-0-name').value).toBe('Budget');
  });
  it('locks cloud storage as well as all other configuration controls',()=>{
    document.body.innerHTML=renderToStaticMarkup(React.createElement(AdventureSetupFields,fixture(false,{lockAllSettings:true,allowCloudImageStorage:true})));
    for(const control of document.querySelectorAll('input,select,textarea,button'))expect(control.disabled).toBe(true);
  });
  it('preserves partial permissions for student setup',()=>{
    const props=fixture(false,{allowLanguageSwitch:true,allowModeSwitch:false});
    expect(adventureSetupLocked(props,'allowLanguageSwitch')).toBe(false);
    expect(adventureSetupLocked(props,'allowModeSwitch')).toBe(true);
    expect(adventureSetupLocked(props,'freeResponse')).toBe(false);
    expect(adventureSetupLocked(props,'allowCloudImageStorage')).toBe(true);
    expect(adventureSetupLocked({...props,adventureState:{isLoading:true}},'allowLanguageSwitch')).toBe(true);
    expect(adventureSetupLocked({...props,isTeacherMode:true},'allowModeSwitch')).toBe(false);
  });
  it('retains legacy and explicitly open-ended episode settings',()=>{
    expect(adventureSetupLimit({enableAutoClimax:false,climaxMinTurns:9})).toBe(9);
    expect(adventureSetupLimit({episodeTurnLimit:null,enableAutoClimax:false})).toBeNull();
    expect(adventureSetupLimit({episodeTurnLimit:999})).toBe(50);
  });
  it('shares the settings source across both independently loadable bundles',()=>{
    for(const name of ['view_adventure','view_sidebar_panels']){
      const built=fs.readFileSync(name+'_module.js','utf8');
      expect(built).toContain('function AdventureSetupFields');
      expect(fs.readFileSync('desktop/web-app/public/'+name+'_module.js','utf8')).toBe(built);
    }
  });
});
