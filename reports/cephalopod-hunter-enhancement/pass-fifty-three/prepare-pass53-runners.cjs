const fs=require('fs');
let cpu=fs.readFileSync(__dirname+'/run-pass52-cpu.cjs','utf8').replaceAll('pass-fifty-two','pass-fifty-three');
cpu=cpu.replace("['octopus_propulsion','octopus_web','octopus_cups']","['octopus_grasp','octopus_propulsion','octopus_web','octopus_cups','squid_strike_clock','squid_strike_coordination','strike_feedback']");
cpu=cpu.replace(":['octopus_propulsion','octopus_web'", ":['octopus_grasp','squid_strike_clock','squid_strike_coordination','strike_feedback','octopus_propulsion','octopus_web'");
fs.writeFileSync(__dirname+'/run-pass53-cpu.cjs',cpu);
let native=fs.readFileSync(__dirname+'/run-pass52-native.cjs','utf8').replaceAll('pass-fifty-two','pass-fifty-three');
native=native.replace("['cephalopod-octopus-propulsion']:['cephalopod-octopus-propulsion','cephalopod-octopus-web','cephalopod-octopus-cups','cephalopod-target-presentation']","['cephalopod-octopus-grasp']:['cephalopod-octopus-grasp','cephalopod-octopus-propulsion','cephalopod-target-presentation','cephalopod-directed-strike']").replace('files.length===1?2:9','files.length===1?2:12');
fs.writeFileSync(__dirname+'/run-pass53-native.cjs',native);
console.log('Prepared serial verification runners.');
