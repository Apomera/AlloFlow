const fs=require('fs');
const file='dev-tools/run_applied_challenge_live_pilot.cjs';let src=fs.readFileSync(file,'utf8');src=src.replace("plan:{procedure:'Compare equal soil amounts with equal water.'}","plan:{testQuestion:'Compare equal soil amounts with equal water.'}");fs.writeFileSync(file,src);
