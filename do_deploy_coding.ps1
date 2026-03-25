$ErrorActionPreference = "Stop"

Write-Host "1. Copying module files..."
Copy-Item -Path stem_lab\stem_lab_module.js -Destination prismflow-deploy\public\stem_lab_module.js -Force
Copy-Item -Path stem_lab\stem_tool_coding.js -Destination prismflow-deploy\public\stem_tool_coding.js -Force
Copy-Item -Path stem_lab\stem_tool_creative.js -Destination prismflow-deploy\public\stem_tool_creative.js -Force

Write-Host "2. Committing and pushing..."
git add -A
git commit -m "Architectural extraction: Fully modularize Coding Playground"
git push origin main

Write-Host "3. Verifying push..."
git log --oneline -1 HEAD
git log --oneline -1 origin/main

Write-Host "4. Running build.js --mode=prod..."
node build.js --mode=prod

Write-Host "5. Running npm run build..."
Push-Location prismflow-deploy
npm run build

Write-Host "6. Stamping Service Worker..."
node -e "const fs=require('fs');const ts=Date.now();const f='build/sw.js';let c=fs.readFileSync(f,'utf-8');c=c.replace('__BUILD_TS__',String(ts));fs.writeFileSync(f,c,'utf-8');console.log('SW stamped:',ts)"

Write-Host "7. Deploying to Firebase..."
npx firebase deploy --only hosting

Write-Host "8. Post-deploy commit..."
Pop-Location
git add -A
git commit -m "Post-deploy: update CDN hash refs"
git push origin main

Write-Host "Deployment Pipeline Finished!"
