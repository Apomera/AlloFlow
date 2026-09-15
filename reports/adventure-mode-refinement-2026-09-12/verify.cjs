const fs=require('fs');
for(const name of ['adventure_handlers','adventure_session_handlers','view_adventure','view_sidebar_panels']) {
 const root=fs.readFileSync(name+'_module.js');
 const mirror=fs.readFileSync('desktop/web-app/public/'+name+'_module.js');
 if(!root.equals(mirror))throw new Error('Mirror differs: '+name);
 console.log('Bundle mirror matches: '+name);
}
if(!fs.readFileSync('ui_strings.js').equals(fs.readFileSync('desktop/web-app/public/ui_strings.js')))throw new Error('UI string mirrors differ');
const parser=require('@babel/parser');
for(const file of ['view_adventure_source.jsx','view_adventure_settings_source.jsx','adventure_handlers_source.jsx','adventure_session_handlers_source.jsx']) {
 parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'script',plugins:['jsx']});
 console.log('Parsed: '+file);
}
