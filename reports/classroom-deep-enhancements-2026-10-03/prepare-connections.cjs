'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'), normalize=s=>s.replace(/\r\n/g,'\n'), hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const files=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const revision=process.argv[2] || '1';
assert(/^\d+$/.test(revision));
const operations=[];
function replace(code,before,after,label){ assert.equal(code.split(before).length,2,'Unique '+label);operations.push({before,after,label});return code.replace(before,after); }
const canonical=normalize(fs.readFileSync(path.join(root,files[0]),'utf8'));
function section(start,end,edit){const first=canonical.indexOf(start),last=canonical.indexOf(end,first);assert(first>=0&&last>first,'Effect section');return {before:canonical.slice(first,last),after:edit(canonical.slice(first,last))};}
const student=section('  // Real-time upgrade: the student offers','  // Mailbox-hosted homework entry', code=>{
 code=replace(code,'      let tries = 0;\n','      let tries = 0;\n      let activeHolder = null;\n','student owner');
 code=replace(code,`          const current = mbRtcRef.current;
          if (current) {`, `          const current = activeHolder;
          activeHolder = null;
          if (mbRtcRef.current === current) mbRtcRef.current = null;
          if (current) {`,'retire before close');
 code=replace(code,'          mbRtcRef.current = null;\n','', 'remove unconditional shared peer clear');
 code=replace(code,'          cleanupPeer();\n          try {','          cleanupPeer();\n          let holder = null;\n          const isCurrentPeer = () => !cancelled && activeHolder === holder && mbRtcRef.current === holder;\n          try {','attempt ownership');
 code=replace(code,'              const holder = {','              holder = {','capture holder');
 code=replace(code,'                  pc,\n                  dc,','                  pc,\n                  dc,\n                  offerId: Date.now().toString(36) + Math.random().toString(36).slice(2),','student offer correlation');
 code=replace(code,"                      if (!v || v.to !== mbStudent.uid", "                      if (!isCurrentPeer() || !v || v.to !== mbStudent.uid",'student answer callback');
 code=replace(code,"                      if (pc.signalingState !== 'have-local-offer') return;", "                      if (v.offerId != null && v.offerId !== holder.offerId) return;\n                      if (pc.signalingState !== 'have-local-offer') return;",'student stale answer correlation');
 code=replace(code,"v: { kind: 'rtc', uid: mbStudent.uid, sdp: pc.localDescription }", "v: { kind: 'rtc', uid: mbStudent.uid, offerId: holder.offerId, sdp: pc.localDescription }",'student offer token publish');
 code=replace(code,'              mbRtcRef.current = holder;','              activeHolder = holder;\n              mbRtcRef.current = holder;','publish owned peer');
 code=replace(code,'              dc.onopen = () => {\n                  tries = 0;','              dc.onopen = () => {\n                  if (!isCurrentPeer()) return;\n                  tries = 0;','student open callback');
 code=replace(code,'              dc.onmessage = (ev) => {\n                  try {','              dc.onmessage = (ev) => {\n                  if (!isCurrentPeer()) return;\n                  try {','student message callback');
 code=replace(code,'              dc.onclose = () => { if (!cancelled) scheduleRetry(); };','              dc.onclose = () => { if (isCurrentPeer()) scheduleRetry(); };','student close callback');
 code=replace(code,"if (pc.connectionState === 'failed' && !cancelled) scheduleRetry();", "if (pc.connectionState === 'failed' && isCurrentPeer()) scheduleRetry();",'student failure callback');
 code=replace(code,`              await pc.setLocalDescription(await pc.createOffer());
              await _alloWaitIceComplete(pc);
              if (cancelled) return;`, `              const offer = await pc.createOffer();
              if (!isCurrentPeer()) return;
              await pc.setLocalDescription(offer);
              if (!isCurrentPeer()) return;
              await _alloWaitIceComplete(pc);
              if (!isCurrentPeer()) return;`,'student async negotiation');
 code=replace(code,"          } catch (rtcErr) {\n              warnLog('RTC upgrade", "          } catch (rtcErr) {\n              if (cancelled || (holder && !isCurrentPeer())) return;\n              warnLog('RTC upgrade",'retired student negotiation error');
 return code;
});
const teacher=section("  useEffect(() => {\n      if (!mbLive || !mbConfig?.url) return undefined;",'  useEffect(() => {\n      let cancelled = false;\n      if (!mbLive?.joinUrl)',code=>{
 code=replace(code,"          if (!v || v.kind !== 'student'", "          if (cancelled || !v || v.kind !== 'student'",'teacher roster ownership');
 code=replace(code,"          if (!v || v.kind !== 'hw-evidence'", "          if (cancelled || !v || v.kind !== 'hw-evidence'",'teacher evidence ownership');
 code=replace(code,"          if (!uid || !v.sdp", "          if (cancelled || !uid || !v.sdp",'teacher offer ownership');
 code=replace(code,'          if (existing) { try { existing.dc?.close(); }', '          if (mbPeersRef.current[uid] === existing) delete mbPeersRef.current[uid];\n          if (existing) { try { existing.dc?.close(); }','retire teacher replacement');
 code=replace(code,'          try {\n              const pc = new RTCPeerConnection', '          let peer = null;\n          try {\n              const pc = new RTCPeerConnection','capture teacher negotiation owner');
 code=replace(code,'              const peer = { pc, dc: null };','              peer = { pc, dc: null };\n              const isCurrentPeer = () => !cancelled && mbPeersRef.current[uid] === peer;','teacher peer owner');
 code=replace(code,'              pc.ondatachannel = (ev) => {\n                  peer.dc = ev.channel;','              pc.ondatachannel = (ev) => {\n                  if (!isCurrentPeer()) { try { ev.channel?.close(); } catch (_) {} return; }\n                  peer.dc = ev.channel;','teacher channel registration');
 code=replace(code,'                  peer.dc.onmessage = (msgEv) => {\n                      try {','                  const channel = peer.dc;\n                  const isCurrentChannel = () => isCurrentPeer() && peer.dc === channel;\n                  peer.dc.onmessage = (msgEv) => {\n                      if (!isCurrentChannel()) return;\n                      try {','teacher message owner');
 code=replace(code,'                  peer.dc.onopen = () => {\n                      setMbRoster','                  peer.dc.onopen = () => {\n                      if (!isCurrentChannel()) return;\n                      setMbRoster','teacher open owner');
 code=replace(code,`                              for (const item of (mbPackItemsRef.current || [])) {
                                  const packItem = await prepareMailboxResourceImages(item);
                                  if (!packItem) continue;
                                  const encoded = await _alloEncodeAlloPack(JSON.stringify(packItem));
                                  const parts`, `                              for (const item of (mbPackItemsRef.current || [])) {
                                  if (!isCurrentChannel()) return;
                                  const packItem = await prepareMailboxResourceImages(item);
                                  if (!isCurrentChannel()) return;
                                  if (!packItem) continue;
                                  const encoded = await _alloEncodeAlloPack(JSON.stringify(packItem));
                                  if (!isCurrentChannel()) return;
                                  const parts`,'teacher welcome async stages');
 code=replace(code,"                                      await _alloDcSendDrained(peer.dc, JSON.stringify({ kind: 'res', rid, part: i + 1, of: parts.length, data: parts[i], open: false, quiet: true }));", "                                      if (!isCurrentChannel()) return;\n                                      await _alloDcSendDrained(channel, JSON.stringify({ kind: 'res', rid, part: i + 1, of: parts.length, data: parts[i], open: false, quiet: true }), 4 * 1024 * 1024, isCurrentChannel);",'teacher drained welcome owner');
 code=replace(code,"                          } catch (welcomeErr) {\n                              warnLog", "                          } catch (welcomeErr) {\n                              if (!isCurrentChannel()) return;\n                              warnLog",'teacher stale welcome error');
 code=replace(code,"                  peer.dc.onclose = () => setMbRoster(prev => (prev[uid] ? { ...prev, [uid]: { ...prev[uid], rtc: false } } : prev));", "                  peer.dc.onclose = () => {\n                      if (!isCurrentChannel()) return;\n                      setMbRoster(prev => (prev[uid] ? { ...prev, [uid]: { ...prev[uid], rtc: false } } : prev));\n                  };",'teacher close owner');
 code=replace(code,`              await pc.setRemoteDescription(v.sdp);
              await pc.setLocalDescription(await pc.createAnswer());
              await _alloWaitIceComplete(pc);
              await _alloMailboxCallWithRetry`, `              await pc.setRemoteDescription(v.sdp);
              if (!isCurrentPeer()) return;
              const answer = await pc.createAnswer();
              if (!isCurrentPeer()) return;
              await pc.setLocalDescription(answer);
              if (!isCurrentPeer()) return;
              await _alloWaitIceComplete(pc);
              if (!isCurrentPeer()) return;
              await _alloMailboxCallWithRetry`,'teacher async negotiation owner');
 code=replace(code,'                      for (const entry of box.m) {\n                          const msg','                      for (const entry of box.m) {\n                          if (cancelled) return;\n                          const msg','teacher poll batch owner');
 code=replace(code,"          } catch (rtcErr) {\n              warnLog('RTC answer", "          } catch (rtcErr) {\n              if (cancelled || (peer && mbPeersRef.current[uid] !== peer)) return;\n              warnLog('RTC answer",'retired teacher negotiation error');
 code=replace(code,"v: { kind: 'rtc', to: uid, sdp: pc.localDescription }", "v: { kind: 'rtc', to: uid, ...(typeof v.offerId === 'string' ? { offerId: v.offerId.slice(0, 120) } : {}), sdp: pc.localDescription }",'teacher echo offer token');
 code=replace(code,"              if (String(e?.code || '').includes('no-session')) {\n                  setMbLive(null);", "              if (String(e?.code || '').includes('no-session')) {\n                  cancelled = true;\n                  setMbLive(null);",'teacher terminal session retirement');
 code=replace(code,'      _alloMbSetNudgeSender(() => {\n          Object.values','      _alloMbSetNudgeSender(() => {\n          if (cancelled) return;\n          Object.values','teacher nudge owner');
 return serialPoll(code,true);
});
function serialPoll(code,isTeacher){
 code=replace(code,'      let timer = null;\n      let errorCount', '      let timer = null;\n      let polling = false;\n      let pollAgain = false;\n      let errorCount', (isTeacher?'teacher':'student')+' polling state');
 code=replace(code,'      const poll = async () => {\n          try {','      const poll = async () => {\n          if (cancelled) return;\n          if (polling) { pollAgain = true; return; }\n          polling = true;\n          try {','serial poll entry');
 const oldTail=isTeacher?`              errorCount = Math.min(errorCount + 1, 3);
          }
          if (!cancelled) {`:`              noteStall(stall.fail(mbRtcRef.current?.dc?.readyState === 'open'));
          }
          if (!cancelled) {`;
 code=replace(code,oldTail,oldTail.replace('          }\n          if','          } finally {\n              polling = false;\n          }\n          if'),'poll latch release');
 const timerLine=isTeacher?'              timer = setTimeout(poll, _alloNextPollDelay({ idleMs: Date.now() - lastActivity, errorCount, hidden }));':'              timer = setTimeout(poll, _alloNextPollDelay({ baseMs: rtcOpen ? 8000 : ALLO_MB_POLL_MS, idleMs: Date.now() - lastActivity, errorCount, hidden }));';
 code=replace(code,timerLine,timerLine.replace('              timer = setTimeout(poll, ','              if (timer) clearTimeout(timer);\n              timer = setTimeout(poll, pollAgain ? 50 : ')+'\n              pollAgain = false;','coalesced poll schedule');
 const marker=isTeacher?'      const onVisible = () => {':'      mbPollNowRef.current = () => { if (!cancelled) { if (timer) clearTimeout(timer); timer = setTimeout(poll, 50); } };';
 const request=`      const requestPoll = (delay) => {
          if (cancelled) return;
          if (polling) { pollAgain = true; return; }
          if (timer) clearTimeout(timer);
          timer = setTimeout(poll, delay);
      };
`;
 code=replace(code,marker,request+(isTeacher?marker:'      mbPollNowRef.current = () => requestPoll(50);'),'poll request helper');
 if(isTeacher){
  code=replace(code,`              if (timer) clearTimeout(timer);
              timer = setTimeout(poll, 100);`,'              requestPoll(100);','visible teacher wake');
  code=replace(code,'      const onNetBack = () => { if (!cancelled) { if (timer) clearTimeout(timer); timer = setTimeout(poll, 300); } };','      const onNetBack = () => requestPoll(300);','network teacher wake');
 }
 return code;
}
const studentPoll=section('  // Mailbox student loop: announce presence','  // Real-time upgrade: the student offers',code=>{
 code=replace(code,'      const announce = async () => {\n          lastAnnounce', '      const announce = async () => {\n          if (cancelled) return;\n          lastAnnounce','student presence ownership');
 code=replace(code,'      _alloMbSetNudgeSender(() => {\n          const dc', '      _alloMbSetNudgeSender(() => {\n          if (cancelled) return;\n          const dc','student nudge ownership');
 code=replace(code,'              if (Date.now() - lastAnnounce > 60000)', '              if (cancelled) return;\n              if (Date.now() - lastAnnounce > 60000)','student post-delivery ownership');
 code=replace(code,"              if (code.includes('no-session') || code.includes('denied')) {\n                  addToast", "              if (code.includes('no-session') || code.includes('denied')) {\n                  cancelled = true;\n                  addToast",'student terminal session retirement');
 return serialPoll(code,false);
});
// The drain helper must check ownership after backpressure awaits too.
const drainStart=canonical.indexOf('async function _alloDcSendDrained('), drainEnd=canonical.indexOf('\n}',drainStart)+2;
assert(drainStart>=0&&drainEnd>drainStart,'drain helper');
let drainBefore=canonical.slice(drainStart,drainEnd),drainAfter=drainBefore;
drainAfter=replace(drainAfter,'highWaterMark = 4 * 1024 * 1024)', 'highWaterMark = 4 * 1024 * 1024, isCurrent = () => true)','optional drain ownership');
// Remaining helper guard anchors are verified from the production body before application.
drainAfter=replace(drainAfter,"    while (dc.readyState === 'open'", "    while (isCurrent() && dc.readyState === 'open'",'drain waiting ownership');
drainAfter=replace(drainAfter,"    if (dc.readyState !== 'open')", "    if (!isCurrent()) return false;\n    if (dc.readyState !== 'open')",'drain initial ownership');
drainAfter=replace(drainAfter,'    dc.send(text);','    if (!isCurrent()) return false;\n    dc.send(text);','drain final ownership');
const teacherCleanup=section('  const _mbCloseTeacherPeers = useCallback(() => {','  const endMailboxLiveSession',code=>replace(code,`      Object.values(mbPeersRef.current || {}).forEach(peer => {`, `      const peers = mbPeersRef.current || {};
      mbPeersRef.current = {};
      Object.values(peers).forEach(peer => {`,'retire teacher peers before close').replace('      });\n      mbPeersRef.current = {};','      });'));
const clear=section('  const clearCanvasWorkspaceState = (options = {}) => {','  const hasMeaningfulWordSoundsWorkspace',code=>replace(code,'      setStudentProgressLog([]);','      setStudentResponses({});\n      setStudentProgressLog([]);','fresh response isolation'));
const regions=[{before:drainBefore,after:drainAfter},teacherCleanup,teacher,studentPoll,student,clear];
const rows=[];
for(const file of files){
 const before=fs.readFileSync(path.join(root,file)),text=normalize(before.toString());let after=text;
 for(const op of regions){assert.equal(after.split(op.before).length,2,'Unique effect in '+file);after=after.replace(op.before,op.after);}
 const bytes=Buffer.from(before.includes(Buffer.from('\r\n'))?after.replace(/\n/g,'\r\n'):after);
 const beforePath=path.join(__dirname,revision==='1'?'source-before':'source-before-r'+revision,file),candidatePath=path.join(__dirname,'candidate',file);
 fs.mkdirSync(path.dirname(beforePath),{recursive:true});fs.mkdirSync(path.dirname(candidatePath),{recursive:true});
 if(fs.existsSync(beforePath))assert.equal(hash(fs.readFileSync(beforePath)),hash(before),'Frozen source changed');else fs.writeFileSync(beforePath,before);
 fs.writeFileSync(candidatePath,bytes);rows.push({file,beforeSha256:hash(before),afterSha256:hash(bytes)});
}
const parser=require(path.join(root,'node_modules/@babel/parser'));
for(const row of rows)parser.parse(fs.readFileSync(path.join(__dirname,'candidate',row.file),'utf8'),{sourceType:'unambiguous',plugins:['jsx']});
const receipt={preparedAt:new Date().toISOString(),revision,files:rows,regions,operations};fs.writeFileSync(path.join(__dirname,'prepared-connections-r'+revision+'.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({prepared:true,files:rows.length,operations:operations.length}));
