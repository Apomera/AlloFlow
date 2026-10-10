const assert=require('node:assert/strict');
const changes=[
  {
    "label": "elapsed patrol steering helper",
    "before": "        var jellyfish = [];",
    "after": "        // Patrol decisions follow simulation time; rendering alone never consumes entropy.\n        function advanceCLHuntPatrolHeading(state,dt,random) {\n          if(!(dt>0))return;\n          state.patrolTurnIn=(state.patrolTurnIn===undefined?0:state.patrolTurnIn)-dt;\n          if(state.patrolTurnIn<=1e-9){\n            state.patrolTargetAngle=(state.patrolTargetAngle===undefined?state.patrolAngle:state.patrolTargetAngle)+(random()-.5)*.35;\n            state.patrolTurnIn+=1.5;\n          }\n          state.patrolAngle+=(state.patrolTargetAngle-state.patrolAngle)*(1-Math.exp(-2.4*dt));\n        }\n\n        var jellyfish = [];"
  },
  {
    "label": "pulse and glide helpers",
    "before": "        function makeJellyfish() {",
    "after": "        // A brief bell contraction drives thrust, followed by a longer relaxed glide.\n        function sampleCLHuntJellyPulse(phase) {\n          var cycle=((phase/(Math.PI*2))%1+1)%1;\n          var u=cycle<.24?cycle/.24:(cycle-.24)/.76;\n          var eased=u*u*u*(10+u*(-15+6*u));\n          return cycle<.24?1-eased:eased;\n        }\n        function sampleCLHuntJellyThrust(phase) {\n          var cycle=((phase/(Math.PI*2))%1+1)%1;\n          if(cycle>=.24)return 0;\n          var u=cycle/.24;\n          return 16*u*u*(1-u)*(1-u);\n        }\n        function advanceCLHuntMoonJellyMotion(jf,dt,reducedMotion) {\n          if(!(dt>0))return;\n          var ud=jf.userData;\n          if(reducedMotion){\n            jf.position.x+=Math.sin(ud.swimHeading)*ud.driftSpeed*dt;\n            jf.position.z+=Math.cos(ud.swimHeading)*ud.driftSpeed*dt;\n            return;\n          }\n          // Midpoint integration keeps the same stroke readable at different refresh rates.\n          var midPulse=ud.pulsePhase+dt*.8,midVertical=ud.verticalPhase+dt*.3;\n          var midHeading=ud.driftAngle+.20*Math.sin(midVertical*.55);\n          var speed=ud.driftSpeed*(.88+.9375*sampleCLHuntJellyThrust(midPulse));\n          jf.position.x+=Math.sin(midHeading)*speed*dt;\n          jf.position.z+=Math.cos(midHeading)*speed*dt;\n          ud.pulsePhase+=dt*1.6;\n          ud.verticalPhase+=dt*.6;\n          var pulse=sampleCLHuntJellyPulse(ud.pulsePhase);\n          ud.swimHeading=ud.driftAngle+.20*Math.sin(ud.verticalPhase*.55);\n          jf.position.y=4+Math.sin(ud.verticalPhase)*1.2+.08*(1-pulse);\n          var bank=.035+.04*sampleCLHuntJellyThrust(ud.pulsePhase);\n          jf.rotation.set(Math.cos(ud.swimHeading)*bank,0,-Math.sin(ud.swimHeading)*bank);\n          // Trailing arms lag the stroke and resume from the retained phase after reduced motion.\n          updateCLHuntMoonJellyVisual(ud,pulse,(ud.pulsePhase-.55)/.003);\n        }\n\n        function makeJellyfish() {"
  },
  {
    "label": "retained swim heading",
    "before": "          g.userData.jellyVisual=visual;",
    "after": "          g.userData.jellyVisual=visual;\n          g.userData.swimHeading=g.userData.driftAngle;"
  },
  {
    "label": "jellyfish production update",
    "before": "            jellyfish.forEach(function(jf) {\n              var ud = jf.userData;\n              ud.pulsePhase += dt * 1.6;       // bell pulses ~0.25Hz\n              var pulse = (Math.sin(ud.pulsePhase) + 1) * 0.5;  // 0..1\n              updateCLHuntMoonJellyVisual(ud,pulse,now);\n\n              // Drift horizontally (slow curve) + vertical bob\n              ud.driftAngle += (Math.random() - 0.5) * 0.05 * dt;\n              jf.position.x += Math.sin(ud.driftAngle) * ud.driftSpeed * dt;\n              jf.position.z += Math.cos(ud.driftAngle) * ud.driftSpeed * dt;\n              ud.verticalPhase += dt * 0.6;\n              jf.position.y = 4 + Math.sin(ud.verticalPhase) * 1.2;\n              // Jet upward on each pulse contraction (subtle vertical thrust)\n              if (Math.sin(ud.pulsePhase) > 0.85) {\n                jf.position.y += 0.04;\n              }\n              // Wrap if too far from player (keep ambient density constant)\n",
    "after": "            jellyfish.forEach(function(jf) {\n              advanceCLHuntMoonJellyMotion(jf,dt,gameState.a11y.reducedMotion);\n\n              // Wrap distant jellies only when simulation time advances.\n"
  },
  {
    "label": "jellyfish relocation time gate",
    "before": "              if (jdx * jdx + jdz * jdz > 90 * 90) {",
    "after": "              if (dt>0 && jdx * jdx + jdz * jdz > 90 * 90) {"
  },
  {
    "label": "patrol production update",
    "before": "                zpud.patrolAngle += (Math.random() - 0.5) * 0.05;",
    "after": "                advanceCLHuntPatrolHeading(zpud,dt,Math.random);"
  },
  {
    "label": "positive elapsed world update",
    "before": "          if (!gameState.gameOver && !gameState.paused) {",
    "after": "          // Render-only frames preserve world state; camera and presentation still render below.\n          if (!gameState.gameOver && !gameState.paused && dt>0) {"
  },
  {
    "label": "deformation helper documentation",
    "before": "        // The original pulse phase/formula is retained. Reuse native typed arrays and transforms;",
    "after": "        // Retain the bell deformation formula. Reuse native typed arrays and transforms;"
  },
  {
    "label": "ambient motion summary",
    "before": "            // sine offset. Wraps into a 70u radius around the player.",
    "after": "            // Phase-linked thrust, recovery and trailing arms. Relocate beyond 90 world units."
  },
  {
    "label": "continuous spawn height",
    "before": "          g.userData.swimHeading=g.userData.driftAngle;",
    "after": "          g.userData.swimHeading=g.userData.driftAngle;\n          // Keep the seeded spawn height continuous when the first stroke begins.\n          g.userData.verticalOffset=jy-(4+Math.sin(g.userData.verticalPhase)*1.2+.08*(1-sampleCLHuntJellyPulse(g.userData.pulsePhase)));"
  },
  {
    "label": "gradual spawn-to-bob transition",
    "before": "          jf.position.y=4+Math.sin(ud.verticalPhase)*1.2+.08*(1-pulse);",
    "after": "          ud.verticalOffset*=Math.exp(-.02*dt);\n          jf.position.y=4+Math.sin(ud.verticalPhase)*1.2+.08*(1-pulse)+ud.verticalOffset;"
  }
];
function restorePass46Source(source){for(const change of [...changes].reverse()){assert.equal(source.split(change.after).length-1,1,'Pass46 inverse guard: '+change.label);source=source.replace(change.after,change.before);}return source;}
module.exports={restorePass46Source};
