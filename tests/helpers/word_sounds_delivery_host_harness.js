import { readFileSync } from 'node:fs';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const between = (start, end) => {
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0) throw Error('Missing host delivery boundary: '+start);
  return source.slice(a,b);
};
const {getContract,resolveWordSoundsTtsSpeed} = new Function(between('const getWordSoundsResourceSessionContract =','const WS_INITIAL_STATE =')+'\nreturn {getContract:getWordSoundsResourceSessionContract,resolveWordSoundsTtsSpeed};')();
const hydration = between('const hydrateWordSoundsFromSync =','// Hydration safety net.');

// For serializer/restore tests that observe shell setters. The mounted delivery
// contract suite separately exercises the actual reducer and run lifecycle.
export function loadWordSoundsDeliveryHydrator(deps) {
  const resource={current:null},mode={current:false};
  const setter=name=>typeof deps[name]==='function'?deps[name]:(()=>{});
  const scope={
    latestWordSoundsResourceRef:resource,latestIsWordSoundsModeRef:mode,
    getWordSoundsResourceSessionContract:getContract,resolveWordSoundsTtsSpeed,WS_INITIAL_STATE:{wordSoundsDifficulty:'auto'},
    isTeacherMode:deps.isTeacherMode!==false,user:null,studentNickname:null,
    setIsWordSoundsMode:value=>{mode.current=value;setter('setIsWordSoundsMode')(value);},
    setGeneratedContent:value=>{resource.current=value;setter('setGeneratedContent')(value);},
    setWsPreloadedWords:setter('setWsPreloadedWords'),setWsActivitySequence:setter('setWsActivitySequence'),
    setIsProbeMode:setter('setIsProbeMode'),setProbeTargetStudent:setter('setProbeTargetStudent'),
    setProbeActivity:setter('setProbeActivity'),setProbeGradeLevel:setter('setProbeGradeLevel'),setMathProbeForm:setter('setMathProbeForm'),
    setWordSoundsAutoReview:setter('setWordSoundsAutoReview'),prepareWordSoundsSession:setter('prepareWordSoundsSession'),
    setWordSoundsActivity:setter('setWordSoundsActivity'),warnLog:(...args)=>{throw Error(args.join(' '));},
  };
  return new Function(...Object.keys(scope),hydration+'\nreturn hydrateWordSoundsFromSync;')(...Object.values(scope));
}
