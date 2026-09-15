const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
fs.writeFileSync(path.join(root,'desktop/web-app/src/generate_dispatcher_source.jsx'),fs.readFileSync(path.join(root,'generate_dispatcher_source.jsx')));
process.argv=['node',path.join(root,'build.js'),'--mode=dev','--shell-only'];
require(path.join(root,'build.js'));
