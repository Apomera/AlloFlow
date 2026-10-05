// Exact Pass30 literal reversal for protected goldens and paired fin references.
// This is test-only source preparation; the live production factory stays current.
const approvedFin={"before":"          var travelingWave=Math.sin(squidFinPhase-t*6.8)*motion*(1-jet*0.58);\n          for(var row=0;row<=f.span;row++){\n            var across=row/f.span,at=(k*(f.span+1)+row)*3;\n            var camber=0.060*Math.sin(across*Math.PI)*envelope;\n            var flex=0.105*Math.pow(across,1.5)*envelope*travelingWave;\n            p[at]=f.side*(rootWidth+across*edge)*scale;\n            p[at+1]=(0.10+camber+flex)*scale;\n            p[at+2]=(z+0.09*envelope*across*across)*scale;\n          }","after":"          var travelingWave=Math.sin(squidFinPhase-t*6.8)*motion*(1-jet*0.58);\n          // A shallow rolling stroke and eased jet tuck flex the existing membrane around its fixed seam.\n          var finRoll=motion*(0.15*travelingWave+0.24*jet),finRollCos=Math.cos(finRoll),finRollSin=Math.sin(finRoll);\n          for(var row=0;row<=f.span;row++){\n            var across=row/f.span,at=(k*(f.span+1)+row)*3;\n            var camber=0.060*Math.sin(across*Math.PI)*envelope;\n            var flex=0.105*Math.pow(across,1.5)*envelope*travelingWave;\n            if(row===0||motion===0){\n              // Preserve the original attachment and reduced-motion/rest arithmetic exactly.\n              p[at]=f.side*(rootWidth+across*edge)*scale;\n              p[at+1]=(0.10+camber+flex)*scale;\n            }else{\n              var finReach=across*edge,finLift=camber+flex;\n              p[at]=f.side*(rootWidth+finReach*finRollCos-finLift*finRollSin)*scale;\n              p[at+1]=(0.10+finReach*finRollSin+finLift*finRollCos)*scale;\n            }\n            p[at+2]=(z+0.09*envelope*across*across)*scale;\n          }"};
const approvedFinish={"before":"var squidBaseCompiler=skin.onBeforeCompile;skin.roughness=0.39;","after":"var squidBaseCompiler=skin.onBeforeCompile;skin.roughness=0.50;"};
// Exact Pass35 reversal removes only the approved strike brace before the original fin reference.
const approvedStrikeFin={"id":"fin-brace-at-updated-mantle-seam","before":"          var finRoll=motion*(0.15*travelingWave+0.24*jet),finRollCos=Math.cos(finRoll),finRollSin=Math.sin(finRoll);\n          for(var row=0;row<=f.span;row++){","after":"          var finRoll=motion*(0.15*travelingWave+0.24*jet),finRollCos=Math.cos(finRoll),finRollSin=Math.sin(finRoll);\n          // The fixed seam already follows mantle.scale.x above; only the free membrane receives the brace roll.\n          if(squidStrikeEnvelope){finRoll+=0.035*squidStrikeBrace;finRollCos=Math.cos(finRoll);finRollSin=Math.sin(finRoll);}\n          for(var row=0;row<=f.span;row++){"};
function reverseUnique(source,guard,name){
  if(source.split(guard.after).length!==2||source.includes(guard.before))throw Error('Exact approved squid '+name+' reference guard is missing, duplicated or changed');
  return source.replace(guard.after,guard.before);
}
export function restoreCLSquidFinReference(source,restoreFinish=false){
  if(typeof source!=='string')throw TypeError('Squid reference source must be a string');
  let prepared=source.replace(/\r\n/g,'\n');
  if(prepared.includes('var squidStrikePreparation=0,squidStrikeBrace=0,squidStrikeEnvelope=false;'))prepared=reverseUnique(prepared,approvedStrikeFin,'strike-fin-brace');
  let restored=reverseUnique(prepared,approvedFin,'fin-roll');
  if(restoreFinish)restored=reverseUnique(restored,approvedFinish,'skin-finish');
  return restored;
}
