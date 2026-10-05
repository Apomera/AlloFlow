const {edit,candidate}=require('./edit.cjs');
edit('.sx-stage.sx-stage-space{height:clamp(1100px,96vh,1370px);container-type:inline-size;container-name:orion-stage}', '.sx-stage.sx-stage-space{height:auto;min-height:clamp(1100px,96vh,1370px);container-type:inline-size;container-name:orion-stage}.sx-stage-space .sx-viewport{min-height:360px}.sx-explorer:fullscreen .sx-stage.sx-stage-space{height:auto}');
edit('.sx-stage.sx-stage-space{height:1370px}', '.sx-stage.sx-stage-space{height:auto;min-height:1370px}');
candidate();
console.log('Space stage expands with the console while retaining a 360px world viewport.');
require('./final-check.cjs');
