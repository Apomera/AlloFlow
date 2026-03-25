Write-Host "Copying files to public dir..."
if (!(Test-Path -Path "prismflow-deploy\public\stem_lab")) {
    New-Item -ItemType Directory -Force -Path "prismflow-deploy\public\stem_lab"
}
Copy-Item -Path "stem_lab\*" -Destination "prismflow-deploy\public\stem_lab\" -Recurse -Force
Copy-Item -Path "stem_lab\stem_lab_module.js" -Destination "prismflow-deploy\public\stem_lab_module.js" -Force

Write-Host "Committing code changes..."
git add -A
git commit -m "Deploy: sync files for Architecture Studio shapes"
git push origin main

Write-Host "Running build.js in prod mode..."
node build.js --mode=prod

Write-Host "Building React app..."
Set-Location -Path "prismflow-deploy"
npm run build

Write-Host "Stamping SW..."
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"

Write-Host "Deploying to Firebase..."
npx firebase deploy --only hosting

Write-Host "Committing hash changes..."
Set-Location -Path ".."
git add -A
git commit -m "Post-deploy: update CDN hash refs for Arch Studio"
git push origin main

Write-Host "Done!"
