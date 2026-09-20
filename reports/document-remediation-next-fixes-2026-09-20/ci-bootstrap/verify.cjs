const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {JSDOM} = require('jsdom');
const root = path.resolve('reports/document-remediation-next-fixes-2026-09-20/ci-bootstrap');
const files = ['react/umd/react.development.js','react-dom/umd/react-dom.development.js'];
const evidence = {checkedAt: new Date().toISOString(), command: 'npm install --no-audit --no-fund --no-save --prefix desktop/web-app react@^18.2.0 react-dom@^18.2.0', fixture: 'Fresh minimal private package in an isolated desktop/web-app directory; not a full repository dependency installation or GitHub run.', exitCode: Number(fs.readFileSync(path.join(root,'exit-code.txt'),'utf8').trim()), files: {}};
if(evidence.exitCode !== 0) throw new Error('Installation failed');
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {runScripts:'outside-only', pretendToBeVisual:true});
for(const file of files){const bytes=fs.readFileSync(path.join(root,'desktop/web-app/node_modules',file));evidence.files[file]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};dom.window.eval(bytes.toString('utf8'));}
const react=dom.window.React,reactDom=dom.window.ReactDOM;
const app=reactDom.createRoot(dom.window.document.getElementById('app'));
reactDom.flushSync(()=>app.render(react.createElement('button',{type:'button'},'React harness loaded')));
evidence.reactVersion=react.version;evidence.reactDomVersion=reactDom.version;evidence.renderedHtml=dom.window.document.getElementById('app').innerHTML;
if(evidence.renderedHtml!=='<button type="button">React harness loaded</button>')throw new Error('React harness did not render');
app.unmount();dom.window.close();
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
