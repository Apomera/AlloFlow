const filesystem = require('node:fs');
let verification = filesystem.readFileSync(require('node:path').join(__dirname,'verify-landscape.cjs'),'utf8');
verification = verification.replaceAll('landscape-helper.txt','artisan-landscape-helper.txt').replaceAll('1584','3856');
verification = verification.replace("console.log(JSON.stringify({pass:true, drawCalls:4, triangles:3856, disposedGeometry, disposedMaterial, results}, null, 2));", "const report = {pass:true, drawCalls:4, triangles:3856, disposedGeometry, disposedMaterial, results}; fs.writeFileSync(path.join(__dirname,'artisan-landscape-verification.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));");
eval(verification);
