from pathlib import Path
from zipfile import ZipFile
from datetime import datetime,timezone
import hashlib,json
TRACE=Path('C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/jurisdiction-validation/host-only-01/artifacts/maine-sld-practice-full-so-751b3--protects-Leadership-return-chromium/trace.zip')
with ZipFile(TRACE) as z:
    print(json.dumps({'traceMembers':[n for n in z.namelist() if n.endswith('.trace')]}))
    for member in z.namelist():
        if not member.endswith('.trace'):continue
        events=[json.loads(line) for line in z.read(member).decode('utf-8').splitlines() if line]
        actions={e['callId']:e for e in events if e.get('type')=='before'}
        ends={e['callId']:e for e in events if e.get('type')=='after'}
        rows=[]
        for action in actions.values():
            end=ends.get(action['callId'],{})
            rows.append({'callId':action['callId'],'api':action.get('apiName'),'method':action.get('method'),'title':action.get('title'),'start':action.get('startTime'),'durationMs':None if not end else end.get('endTime',0)-action.get('startTime',0),'params':action.get('params'),'error':end.get('error'),'unfinished':not bool(end)})
        print(json.dumps({'member':member,'lastActions':rows[-25:]},indent=2))
        if member=='0-trace.trace':
            expectations=[r for r in rows if r['method']=='expect']
            assert expectations and all(not r['error'] and not r['unfinished'] for r in expectations)
            assert rows[-1]['method']=='close' and rows[-1]['unfinished']
            analysis={'reviewedAt':datetime.now(timezone.utc).isoformat(),'traceFile':str(TRACE),'traceSha256':hashlib.sha256(TRACE.read_bytes()).hexdigest(),'actualTimeoutMs':120000,'allRecordedExpectationsCompletedWithoutError':True,'completedExpectationCount':len(expectations),'lastAction':rows[-1],'lastActions':rows[-8:],'interpretation':'The actual host assertions completed; the cumulative test budget expired during the final ungated page close. This is a failed invocation retained as history, not a passing host scenario.','proposedRecovery':'One justified invocation of the exact same host body, setup,120-second limit, one worker and zero automatic retries; no product/test changes.'}
            report=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/maine-sld-case-lab-federal-maine-2026-10-04/browser-validation')
            assert not (report/'host-timeout-analysis.json').exists()
            (report/'host-timeout-analysis.json').write_text(json.dumps(analysis,indent=2))
            (report/'host-timeout-analysis-helper.py').write_bytes(Path(__file__).read_bytes())
