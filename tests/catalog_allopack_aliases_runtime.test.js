import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync(process.env.ALLO_CATALOG_ALIAS_SOURCE || 'catalog_module.js','utf8');
const alias = {slug:'topic_illustrated',share_slug:'topic-illustrated',path:'allopacks/illustrated/topic.allopack.json'};
const entry = {slug:'topic',path:'allopacks/topic.allopack.json',title:'One current topic',legacy_aliases:[alias]};
const lesson = {allopack:{spec:'0.1'},history:[{id:'reading',type:'simplified',title:'Reading',data:'Current canonical content.',meta:''}]};
let catalog, root, container, fetcher;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const win = {React,AlloModules:{createDocPipeline:()=>({generateFullPackHTML:()=>'<p>Current canonical content.</p>'})}};
  new Function('window',source)(win); catalog=win.AlloModules.CommunityCatalog;
  fetcher=vi.fn(async url=>url.includes('/catalog/index.json')?{ok:true,json:async()=>({entries:[entry]})}:{ok:true,text:async()=>JSON.stringify(lesson)});
  vi.stubGlobal('fetch',fetcher);
  container=document.createElement('div'); document.body.appendChild(container); root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
const render=async props=>act(async()=>root.render(React.createElement(catalog.BrowseTab,props)));
describe('canonical AlloPack alias runtime',()=>{
  it('keeps one browse entry and resolves both identifiers to its current path',()=>{
    const entries=catalog._parseCatalogManifest({entries:[entry]});
    expect(entries).toHaveLength(1);
    expect(catalog._catalogEntryForSlug(entries,'topic')).toBe(entry);
    expect(catalog._catalogEntryForSlug(entries,'topic_illustrated')).toBe(entry);
    expect(catalog._catalogEntryForSlug(entries,'unknown')).toBeUndefined();
  });
  it('opens an old illustrated query link from canonical bytes and loads that complete pack',async()=>{
    const load=vi.fn(); await render({selectedSlug:alias.slug,loadProjectFromJson:load});
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toContain('/allopacks/topic.allopack.json?t=');
    expect(fetcher.mock.calls[1][0]).not.toContain('/illustrated/');
    expect(container.querySelector('iframe'),container.textContent).not.toBeNull();
    expect(container.querySelector('iframe').getAttribute('srcdoc')).toContain('Current canonical content.');
    expect(load).not.toHaveBeenCalled();
    await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent==='Load in AlloFlow').click());
    expect(load).toHaveBeenCalledExactlyOnceWith(lesson);
  });
  it('fails malformed or colliding aliases before requesting any lesson',async()=>{
    for(const bad of [null,{},[null],[{...alias,slug:'../unsafe'}],[{...alias,share_slug:42}],[{...alias,path:'https://evil.test/pack.json'}],[{...alias,slug:entry.slug}],[{...alias,path:entry.path}]]) {
      expect(()=>catalog._parseCatalogManifest({entries:[{...entry,legacy_aliases:bad}]})).toThrow(/legacy lesson links/);
    }
    const other={slug:'other',path:'allopacks/other.allopack.json',legacy_aliases:[alias]};
    expect(()=>catalog._parseCatalogManifest({entries:[entry,other]})).toThrow(/duplicate legacy/);
    fetcher.mockImplementation(async()=>({ok:true,json:async()=>({entries:[{...entry,legacy_aliases:[{...alias,path:'../private.json'}]}]})}));
    await render({selectedSlug:alias.slug});
    expect(fetcher).toHaveBeenCalledTimes(1); expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('invalid legacy lesson links');
  });
});
