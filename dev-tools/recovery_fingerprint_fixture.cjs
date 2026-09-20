// Extract the actual recovery initialization and observer for focused hook checks.
function extract(source) {
  source=source.replace(/\r\n/g,'\n');
  const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<0)throw Error('Missing recovery section: '+a);return source.slice(start,end);};
  const init=source.match(/  const canvasRecoverySelFingerprintRef = useRef\([^\n]+/);
  if(!init)throw Error('Missing fingerprint ref');
  return {
    init:init[0],
    capture:section('const _alloCaptureCanvasSelAuthoringState =','const _alloApplyCanvasSelAuthoringState ='),
    fingerprint:section('const _alloCanvasSelAuthoringFingerprint =','const _alloCreateDialogStateController ='),
    observer:section('  useEffect(() => {\n      if (!isCanvas || !canvasRecoveryDecisionMade','  }, [isCanvas, canvasRecoveryDecisionMade]);')+'  }, [isCanvas, canvasRecoveryDecisionMade]);'
  };
}
function fixtureCode(blocks) {
  return `${blocks.capture}
${blocks.fingerprint.replace('const _alloCanvasSelAuthoringFingerprint =','const computeFingerprint =')}
const _alloCanvasSelAuthoringFingerprint = () => { onFingerprint(); return computeFingerprint(); };
return function RecoveryFingerprintFixture({isCanvas=true,canvasRecoveryDecisionMade=true,tick=0}) {
  const useRef=React.useRef,useEffect=React.useEffect;
  const [revision,setCanvasRecoveryRevision]=React.useState(0);
  ${blocks.init}
  ${blocks.observer}
  return React.createElement('output',{'data-revision':revision},String(tick));
};`;
}
module.exports={extract,fixtureCode};
