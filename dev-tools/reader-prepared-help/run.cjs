// Repeatable current-source reader checks. No build, install, or live provider.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const playwright=require('playwright');
const root=process.cwd();
const sourceRoot=path.resolve(process.env.PREPARED_HELP_SOURCE_DIR||root);
const styleRoot=path.resolve(process.env.PREPARED_HELP_STYLE_DIR||sourceRoot);
const out=path.resolve(process.env.PREPARED_HELP_OUTPUT_DIR||'reports/reader-prepared-help');
const args=process.argv.slice(2);
if(args.some(arg=>!arg.startsWith('--browser=')))throw new Error('Usage: npm run test:reader:prepared -- --browser=chromium,webkit');
const browsers=(args.find(arg=>arg.startsWith('--browser='))?.slice(10)||'chromium').split(',');
for(const name of browsers) {
  if(!['chromium','webkit'].includes(name))throw new Error('Unsupported browser: '+name);
  if(!fs.existsSync(playwright[name].executablePath()))throw new Error('Requested browser is not installed: '+name+'. Install it separately before running this check.');
}
fs.mkdirSync(out,{recursive:true});
const inputs=['view_simplified_source.jsx','reader_place_store.js','reader_support_drafts.js','instructional_context_module.js','content_engine_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','alt_text_module.js']
  .map(file=>path.join(sourceRoot,file)).concat(['tailwind.config.js','src/index.css'].map(file=>path.join(styleRoot,'desktop/web-app',file)));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=Object.fromEntries(inputs.map(file=>[file,hash(file)]));
const summary={started:new Date().toISOString(),sourceRoot,styleRoot,browsers,inputs:before,phases:[],status:'running'};
const env={...process.env,PREPARED_HELP_SOURCE_DIR:sourceRoot,PREPARED_HELP_STYLE_DIR:styleRoot};
function run(name,command,extra={}) {
  console.log('\nPrepared reader check: '+name);
  const result=spawnSync(process.execPath,command,{cwd:root,env:{...env,...extra},stdio:'inherit'});
  summary.phases.push({name,status:result.status,error:result.error?.message});
  if(result.error||result.status!==0)throw new Error('Prepared reader check failed: '+name);
}
try {
  run('unit and prepared interactions',['node_modules/vitest/vitest.mjs','run','tests/prepared_help_popup_layout.test.js','tests/prepared_word_help_regressions.test.js',
    '--maxWorkers=1','--no-cache','--hookTimeout=30000','--reporter=default','--reporter=json','--outputFile='+path.join(out,'unit.json')]);
  for(const browser of browsers) for(const [name,flag] of [['interactions',null],['activation','--activation-probe'],['preview','--preview-probe'],['list-layout','--layout-probe'],['card-stress','--card-stress']]) {
    run(browser+' '+name,[path.join(__dirname,'browser-check.cjs'),...(flag?[flag]:[])],
      {PREPARED_HELP_BROWSER:browser,PREPARED_HELP_OUTPUT_DIR:path.join(out,browser,name)});
  }
  summary.status='passed';
} catch(error) {
  summary.status='failed';summary.error=error.message;process.exitCode=1;
  console.error(error.message);
} finally {
  summary.inputDrift=inputs.filter(file=>hash(file)!==before[file]);
  if(summary.inputDrift.length){summary.status='failed';process.exitCode=1;console.error('Reader inputs changed during verification');}
  summary.completed=new Date().toISOString();
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({status:summary.status,phases:summary.phases.length,inputDrift:summary.inputDrift,report:path.join(out,'summary.json')},null,2));
}
