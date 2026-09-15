const fs=require('node:fs');const file=__dirname+'/browser.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("const text=await panel.innerText();const entry=", "const study=panel.getByRole('button',{name:'Study Term (+5 RP)',exact:true});if(await study.count())await study.click();const text=await panel.innerText();const entry=");
fs.writeFileSync(file,s);
