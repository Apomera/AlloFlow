const fs=require('fs');const p=__dirname+'/pass5-browser.cjs';let s=fs.readFileSync(p,'utf8');s=s.replace('.studio.fields.evidenceLedger','.studio.evidenceLedger');fs.writeFileSync(p,s);
