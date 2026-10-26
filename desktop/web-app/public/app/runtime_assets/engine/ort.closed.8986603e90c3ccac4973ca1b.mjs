var g0=Object.defineProperty;var vt=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,i)=>(typeof require<"u"?require:t)[i]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var $o=(e,t,i)=>()=>{if(i)throw i[0];try{return e&&(t=e(e=0)),t}catch(r){throw i=[r],r}};var $i=(e,t)=>{for(var i in t)g0(e,i,{get:t[i],enumerable:!0})};var vo={};$i(vo,{createRequire:()=>vi,default:()=>y0,dirname:()=>vi,join:()=>vi,readFile:()=>vi,readFileSync:()=>vi,resolve:()=>vi});var vi,y0,bo=$o(()=>{vi=()=>{throw new Error("Node-only runtime branch is unavailable in this browser bundle")},y0={readFileSync:vi,readFile:vi}});var xo={};$i(xo,{createRequire:()=>bi,default:()=>_0,dirname:()=>bi,join:()=>bi,readFile:()=>bi,readFileSync:()=>bi,resolve:()=>bi});var bi,_0,So=$o(()=>{bi=()=>{throw new Error("Node-only runtime branch is unavailable in this browser bundle")},_0={readFileSync:bi,readFile:bi}});var un={};$i(un,{InferenceSession:()=>Oa,TRACE:()=>dr,TRACE_FUNC_BEGIN:()=>Ye,TRACE_FUNC_END:()=>Ge,Tensor:()=>Xe,default:()=>Uy,env:()=>$e,registerBackend:()=>Et});var ko=(()=>{var e="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.mjs";return(async function(t={}){var i,r=t,n,o,s=new Promise((a,u)=>{n=a,o=u}),l=typeof window=="object",p=typeof WorkerGlobalScope<"u",c=!1,f=p&&self.name?.startsWith("em-pthread");if(c){let{createRequire:a}=await Promise.resolve().then(()=>(bo(),vo));var m=a("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.mjs"),g=m("worker_threads");global.Worker=g.Worker,f=(p=!g.je)&&g.workerData=="em-pthread"}r.mountExternalData=(a,u)=>{a.startsWith("./")&&(a=a.substring(2)),(r.Bd||(r.Bd=new Map)).set(a,u)},r.unmountExternalData=()=>{delete r.Bd};var w=globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,shared:!0}).buffer.constructor;let _=()=>{let a=(d,h,y)=>(...x)=>{let C=tt,A=h?.();x=d(...x);let B=h?.();return A!==B&&(d=B,y(A),h=y=null),tt!=C?Rm():x},u=d=>async(...h)=>{try{if(r.Cd)throw Error("Session already started");let y=r.Cd={be:h[0],errors:[]},x=await d(...h);if(r.Cd!==y)throw Error("Session mismatch");r.Dd?.flush();let C=y.errors;if(0<C.length){let A=await Promise.all(C);if(A=A.filter(B=>B),0<A.length)throw Error(A.join(`
`))}return x}finally{r.Cd=null}};r._OrtCreateSession=a(r._OrtCreateSession,()=>r._OrtCreateSession,d=>r._OrtCreateSession=d),r._OrtRun=u(a(r._OrtRun,()=>r._OrtRun,d=>r._OrtRun=d)),r._OrtRunWithBinding=u(a(r._OrtRunWithBinding,()=>r._OrtRunWithBinding,d=>r._OrtRunWithBinding=d)),r._OrtBindInput=a(r._OrtBindInput,()=>r._OrtBindInput,d=>r._OrtBindInput=d),_=void 0};r.jsepInit=(a,u)=>{if(_?.(),a==="webgpu"){[r.Dd,r.Rd,r.Vd,r.Hd,r.Ud,r.hc,r.Wd,r.Zd,r.Sd,r.Td,r.Xd]=u;let d=r.Dd;r.jsepRegisterBuffer=(h,y,x,C)=>d.registerBuffer(h,y,x,C),r.jsepGetBuffer=h=>d.getBuffer(h),r.jsepCreateDownloader=(h,y,x)=>d.createDownloader(h,y,x),r.jsepOnCreateSession=h=>{d.onCreateSession(h)},r.jsepOnReleaseSession=h=>{d.onReleaseSession(h)},r.jsepOnRunStart=h=>d.onRunStart(h),r.$d=(h,y)=>{d.upload(h,y)}}else if(a==="webnn"){[r.Dd,r.Yd,r.Id,r.jsepEnsureTensor,r.Jd,r.jsepDownloadTensor]=u,r.jsepReleaseTensorId=r.Id,r.jsepUploadTensor=r.Jd;let d=r.Dd;r.jsepOnRunStart=h=>d.onRunStart(h),r.jsepOnRunEnd=d.onRunEnd.bind(d),r.jsepRegisterMLContext=(h,y)=>{d.registerMLContext(h,y)},r.jsepOnReleaseSession=h=>{d.onReleaseSession(h)},r.jsepCreateMLTensorDownloader=(h,y)=>d.createMLTensorDownloader(h,y),r.jsepRegisterMLTensor=(h,y,x,C)=>d.registerMLTensor(h,y,x,C),r.jsepCreateMLContext=h=>d.createMLContext(h),r.jsepRegisterMLConstant=(h,y,x,C,A)=>d.registerMLConstant(h,y,x,C,A,r.Bd),r.jsepRegisterGraphInput=d.registerGraphInput.bind(d),r.jsepIsGraphInput=d.isGraphInput.bind(d),r.jsepCreateTemporaryTensor=d.createTemporaryTensor.bind(d)}};var v=Object.assign({},r),S="./this.program",b=(a,u)=>{throw u},$="",k,T;if(c){var I=m("fs"),E=m("path");"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.mjs".startsWith("data:")||($=E.dirname(m("url").fileURLToPath("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.mjs"))+"/"),T=a=>(a=je(a)?new URL(a):a,I.readFileSync(a)),k=async a=>(a=je(a)?new URL(a):a,I.readFileSync(a,void 0)),!r.thisProgram&&1<(void 0).argv.length&&(S=(void 0).argv[1].replace(/\\/g,"/")),(void 0).argv.slice(2),b=(a,u)=>{throw(void 0).exitCode=a,u}}else(l||p)&&(p?$=self.location.href:typeof document<"u"&&document.currentScript&&($=document.currentScript.src),e&&($=e),$.startsWith("blob:")?$="":$=$.slice(0,$.replace(/[?#].*/,"").lastIndexOf("/")+1),c||(p&&(T=a=>{var u=new XMLHttpRequest;return u.open("GET",a,!1),u.responseType="arraybuffer",u.send(null),new Uint8Array(u.response)}),k=async a=>{if(je(a))return new Promise((d,h)=>{var y=new XMLHttpRequest;y.open("GET",a,!0),y.responseType="arraybuffer",y.onload=()=>{y.status==200||y.status==0&&y.response?d(y.response):h(y.status)},y.onerror=h,y.send(null)});var u=await fetch(a,{credentials:"same-origin"});if(u.ok)return u.arrayBuffer();throw Error(u.status+" : "+u.url)}));var z=console.log.bind(console),M=console.error.bind(console);c&&(z=(...a)=>I.writeSync(1,a.join(" ")+`
`),M=(...a)=>I.writeSync(2,a.join(" ")+`
`));var U=z,V=M;Object.assign(r,v),v=null;var X=r.wasmBinary,F,q,te=!1,oe,G,pe,de,Y,be,P,j,ue,we,Ce,je=a=>a.startsWith("file://");function ce(){return F.buffer!=G.buffer&&Pe(),G}function fe(){return F.buffer!=G.buffer&&Pe(),pe}function De(){return F.buffer!=G.buffer&&Pe(),de}function Gt(){return F.buffer!=G.buffer&&Pe(),Y}function D(){return F.buffer!=G.buffer&&Pe(),be}function _e(){return F.buffer!=G.buffer&&Pe(),P}function cr(){return F.buffer!=G.buffer&&Pe(),j}function Nt(){return F.buffer!=G.buffer&&Pe(),Ce}if(f){let a=function(u){try{var d=u.data,h=d.yd;if(h==="load"){let y=[];self.onmessage=x=>y.push(x),self.startWorker=()=>{postMessage({yd:"loaded"});for(let x of y)a(x);self.onmessage=a};for(let x of d.Od)(!r[x]||r[x].proxy)&&(r[x]=(...C)=>{postMessage({yd:"callHandler",Nd:x,args:C})},x=="print"&&(U=r[x]),x=="printErr"&&(V=r[x]));F=d.he,Pe(),ln(d.ie)}else if(h==="run"){Hf(d.xd),mi(d.xd,0,0,1,0,0),wn(),li(d.xd),Fr||(fs(),Fr=!0);try{Ff(d.de,d.Fd)}catch(y){if(y!="unwind")throw y}}else d.target!=="setimmediate"&&(h==="checkMailbox"?Fr&&fr():h&&(V(`worker: received unknown command ${h}`),V(d)))}catch(y){throw ms(),y}};var ln;if(c){var dn=g.parentPort;dn.on("message",u=>onmessage({data:u})),Object.assign(globalThis,{self:global,postMessage:u=>dn.postMessage(u)})}var Fr=!1;V=function(...u){u=u.join(" "),c?I.writeSync(2,u+`
`):console.error(u)},self.alert=function(...u){postMessage({yd:"alert",text:u.join(" "),fe:br()})},self.onunhandledrejection=u=>{throw u.reason||u},self.onmessage=a}function Pe(){var a=F.buffer;r.HEAP8=G=new Int8Array(a),r.HEAP16=de=new Int16Array(a),r.HEAPU8=pe=new Uint8Array(a),r.HEAPU16=Y=new Uint16Array(a),r.HEAP32=be=new Int32Array(a),r.HEAPU32=P=new Uint32Array(a),r.HEAPF32=j=new Float32Array(a),r.HEAPF64=Ce=new Float64Array(a),r.HEAP64=ue=new BigInt64Array(a),r.HEAPU64=we=new BigUint64Array(a)}f||(F=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),Pe());function pn(){f?startWorker(r):N.Bb()}var Mt=0,jt=null;function cn(){if(Mt--,Mt==0&&jt){var a=jt;jt=null,a()}}function at(a){throw a="Aborted("+a+")",V(a),te=!0,a=new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info."),o(a),a}var Kr;async function Uf(a){if(!X)try{var u=await k(a);return new Uint8Array(u)}catch{}if(a==Kr&&X)a=new Uint8Array(X);else if(T)a=T(a);else throw"both async and sync fetching of the wasm failed";return a}async function Wf(a,u){try{var d=await Uf(a);return await WebAssembly.instantiate(d,u)}catch(h){V(`failed to asynchronously prepare wasm: ${h}`),at(h)}}async function qf(a){var u=Kr;if(!X&&typeof WebAssembly.instantiateStreaming=="function"&&!je(u)&&!c)try{var d=fetch(u,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(d,a)}catch(h){V(`wasm streaming compile failed: ${h}`),V("falling back to ArrayBuffer instantiation")}return Wf(u,a)}function hn(){return cs={Ta:Vf,Va:Lf,W:Kf,la:Qf,b:Xf,u:Yf,R:Jf,Za:em,d:tm,pb:xn,g:Zf,T:Tn,Ga:Cn,lb:En,nb:zn,Ha:An,Ea:On,wb:Rn,Da:Bn,pa:Nn,mb:Mn,jb:Dn,Fa:Pn,kb:Un,Ma:rm,za:nm,eb:sm,cb:um,ya:dm,V:pm,N:cm,db:hm,ma:$m,fb:vm,zb:bm,hb:xm,qb:Sm,ab:km,Aa:Tm,yb:li,Ja:Cm,S:Im,Wa:Em,$:Dm,G:Pm,E:Wm,m:si,H:qm,B:jm,X:Hm,J:Fm,v:Km,O:Qm,D:Zm,t:Xm,A:Ym,z:Jm,w:eg,r:tg,tb:rg,ub:ig,vb:ag,rb:Jn,sb:es,bb:ts,Oa:sg,La:lg,y:dg,ja:pg,Ba:cg,Ka:og,qa:hg,Ia:fg,ib:mg,U:ng,fa:gg,Sa:yg,gb:_g,Qa:wg,Pa:$g,Ab:ns,Ca:ss,ob:Jr,aa:os,oa:us,xb:ls,na:ds,$a:Fg,ia:s0,sa:p0,ga:jg,da:Jg,ua:l0,p:Vg,e:Cg,c:kg,ea:Xg,f:Ig,n:zg,k:Ug,Y:Og,ka:Wg,j:Gg,wa:Zg,Ra:f0,ca:a0,Ua:h0,P:Yg,K:Bg,_:i0,Q:Hg,Z:o0,x:Rg,l:Tg,va:r0,i:Sg,h:Ag,ra:c0,ta:d0,o:Eg,q:Ng,s:Dg,I:Pg,C:Lg,L:qg,xa:Qg,_a:Kg,F:n0,Ya:e0,ba:u0,M:Mg,Xa:t0,ha:bg,a:F,Na:Yr},{a:cs}}var Qr={1319426:()=>typeof wasmOffsetConverter<"u",1319483:(a,u,d,h,y)=>{if(typeof r>"u"||!r.Bd)return 1;if(a=Te(Number(a>>>0)),a.startsWith("./")&&(a=a.substring(2)),a=r.Bd.get(a),!a)return 2;if(u=Number(u>>>0),d=Number(d>>>0),h=Number(h>>>0),u+d>a.byteLength)return 3;try{let x=a.subarray(u,u+d);switch(y){case 0:fe().set(x,h>>>0);break;case 1:r.$d(h,x);break;default:return 4}return 0}catch{return 4}},1320198:(a,u,d)=>{r.Jd(a,fe().subarray(u>>>0,u+d>>>0))},1320261:()=>r.Yd(),1320302:a=>{r.Id(a)},1320338:()=>{r.Sd()},1320369:()=>{r.Td()},1320398:()=>{r.Xd()},1320423:a=>r.Rd(a),1320456:a=>r.Vd(a),1320488:(a,u,d)=>{r.Hd(Number(a),Number(u),Number(d),!0)},1320551:(a,u,d)=>{r.Hd(Number(a),Number(u),Number(d))},1320608:a=>{r.hc("Abs",a,void 0)},1320659:a=>{r.hc("Neg",a,void 0)},1320710:a=>{r.hc("Floor",a,void 0)},1320763:a=>{r.hc("Ceil",a,void 0)},1320815:a=>{r.hc("Reciprocal",a,void 0)},1320873:a=>{r.hc("Sqrt",a,void 0)},1320925:a=>{r.hc("Exp",a,void 0)},1320976:a=>{r.hc("Erf",a,void 0)},1321027:a=>{r.hc("Sigmoid",a,void 0)},1321082:(a,u,d)=>{r.hc("HardSigmoid",a,{alpha:u,beta:d})},1321161:a=>{r.hc("Log",a,void 0)},1321212:a=>{r.hc("Sin",a,void 0)},1321263:a=>{r.hc("Cos",a,void 0)},1321314:a=>{r.hc("Tan",a,void 0)},1321365:a=>{r.hc("Asin",a,void 0)},1321417:a=>{r.hc("Acos",a,void 0)},1321469:a=>{r.hc("Atan",a,void 0)},1321521:a=>{r.hc("Sinh",a,void 0)},1321573:a=>{r.hc("Cosh",a,void 0)},1321625:a=>{r.hc("Asinh",a,void 0)},1321678:a=>{r.hc("Acosh",a,void 0)},1321731:a=>{r.hc("Atanh",a,void 0)},1321784:a=>{r.hc("Tanh",a,void 0)},1321836:a=>{r.hc("Not",a,void 0)},1321887:(a,u,d)=>{r.hc("Clip",a,{min:u,max:d})},1321956:a=>{r.hc("Clip",a,void 0)},1322008:(a,u)=>{r.hc("Elu",a,{alpha:u})},1322066:a=>{r.hc("Gelu",a,void 0)},1322118:a=>{r.hc("Relu",a,void 0)},1322170:(a,u)=>{r.hc("LeakyRelu",a,{alpha:u})},1322234:(a,u)=>{r.hc("ThresholdedRelu",a,{alpha:u})},1322304:(a,u)=>{r.hc("Cast",a,{to:u})},1322362:a=>{r.hc("Add",a,void 0)},1322413:a=>{r.hc("Sub",a,void 0)},1322464:a=>{r.hc("Mul",a,void 0)},1322515:a=>{r.hc("Div",a,void 0)},1322566:a=>{r.hc("Pow",a,void 0)},1322617:a=>{r.hc("Equal",a,void 0)},1322670:a=>{r.hc("Greater",a,void 0)},1322725:a=>{r.hc("GreaterOrEqual",a,void 0)},1322787:a=>{r.hc("Less",a,void 0)},1322839:a=>{r.hc("LessOrEqual",a,void 0)},1322898:(a,u,d,h,y)=>{r.hc("ReduceMean",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323073:(a,u,d,h,y)=>{r.hc("ReduceMax",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323247:(a,u,d,h,y)=>{r.hc("ReduceMin",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323421:(a,u,d,h,y)=>{r.hc("ReduceProd",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323596:(a,u,d,h,y)=>{r.hc("ReduceSum",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323770:(a,u,d,h,y)=>{r.hc("ReduceL1",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1323943:(a,u,d,h,y)=>{r.hc("ReduceL2",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1324116:(a,u,d,h,y)=>{r.hc("ReduceLogSum",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1324293:(a,u,d,h,y)=>{r.hc("ReduceSumSquare",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1324473:(a,u,d,h,y)=>{r.hc("ReduceLogSumExp",a,{keepDims:!!u,noopWithEmptyAxes:!!d,axes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1324653:a=>{r.hc("Where",a,void 0)},1324706:(a,u,d)=>{r.hc("Transpose",a,{perm:u?Array.from(D().subarray(Number(u)>>>0,Number(d)>>>0)):[]})},1324830:(a,u,d,h)=>{r.hc("DepthToSpace",a,{blocksize:u,mode:Te(d),format:h?"NHWC":"NCHW"})},1324963:(a,u,d,h)=>{r.hc("DepthToSpace",a,{blocksize:u,mode:Te(d),format:h?"NHWC":"NCHW"})},1325096:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve,We)=>{r.hc("ConvTranspose",a,{format:B?"NHWC":"NCHW",autoPad:u,dilations:[d],group:h,kernelShape:[y],pads:[x,C],strides:[A],wIsConst:()=>!!ce()[L>>>0],outputPadding:H?Array.from(D().subarray(Number(H)>>>0,Number(J)>>>0)):[],outputShape:le?Array.from(D().subarray(Number(le)>>>0,Number(ve)>>>0)):[],activation:Te(We)})},1325529:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("ConvTranspose",a,{format:A?"NHWC":"NCHW",autoPad:u,dilations:Array.from(D().subarray(Number(d)>>>0,(Number(d)>>>0)+2>>>0)),group:h,kernelShape:Array.from(D().subarray(Number(y)>>>0,(Number(y)>>>0)+2>>>0)),pads:Array.from(D().subarray(Number(x)>>>0,(Number(x)>>>0)+4>>>0)),strides:Array.from(D().subarray(Number(C)>>>0,(Number(C)>>>0)+2>>>0)),wIsConst:()=>!!ce()[B>>>0],outputPadding:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],outputShape:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[],activation:Te(ve)})},1326190:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve,We)=>{r.hc("ConvTranspose",a,{format:B?"NHWC":"NCHW",autoPad:u,dilations:[d],group:h,kernelShape:[y],pads:[x,C],strides:[A],wIsConst:()=>!!ce()[L>>>0],outputPadding:H?Array.from(D().subarray(Number(H)>>>0,Number(J)>>>0)):[],outputShape:le?Array.from(D().subarray(Number(le)>>>0,Number(ve)>>>0)):[],activation:Te(We)})},1326623:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("ConvTranspose",a,{format:A?"NHWC":"NCHW",autoPad:u,dilations:Array.from(D().subarray(Number(d)>>>0,(Number(d)>>>0)+2>>>0)),group:h,kernelShape:Array.from(D().subarray(Number(y)>>>0,(Number(y)>>>0)+2>>>0)),pads:Array.from(D().subarray(Number(x)>>>0,(Number(x)>>>0)+4>>>0)),strides:Array.from(D().subarray(Number(C)>>>0,(Number(C)>>>0)+2>>>0)),wIsConst:()=>!!ce()[B>>>0],outputPadding:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],outputShape:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[],activation:Te(ve)})},1327284:(a,u)=>{r.hc("GlobalAveragePool",a,{format:u?"NHWC":"NCHW"})},1327375:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("AveragePool",a,{format:ve?"NHWC":"NCHW",auto_pad:u,ceil_mode:d,count_include_pad:h,storage_order:y,dilations:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[],kernel_shape:A?Array.from(D().subarray(Number(A)>>>0,Number(B)>>>0)):[],pads:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],strides:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[]})},1327854:(a,u)=>{r.hc("GlobalAveragePool",a,{format:u?"NHWC":"NCHW"})},1327945:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("AveragePool",a,{format:ve?"NHWC":"NCHW",auto_pad:u,ceil_mode:d,count_include_pad:h,storage_order:y,dilations:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[],kernel_shape:A?Array.from(D().subarray(Number(A)>>>0,Number(B)>>>0)):[],pads:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],strides:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[]})},1328424:(a,u)=>{r.hc("GlobalMaxPool",a,{format:u?"NHWC":"NCHW"})},1328511:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("MaxPool",a,{format:ve?"NHWC":"NCHW",auto_pad:u,ceil_mode:d,count_include_pad:h,storage_order:y,dilations:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[],kernel_shape:A?Array.from(D().subarray(Number(A)>>>0,Number(B)>>>0)):[],pads:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],strides:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[]})},1328986:(a,u)=>{r.hc("GlobalMaxPool",a,{format:u?"NHWC":"NCHW"})},1329073:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>{r.hc("MaxPool",a,{format:ve?"NHWC":"NCHW",auto_pad:u,ceil_mode:d,count_include_pad:h,storage_order:y,dilations:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[],kernel_shape:A?Array.from(D().subarray(Number(A)>>>0,Number(B)>>>0)):[],pads:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],strides:J?Array.from(D().subarray(Number(J)>>>0,Number(le)>>>0)):[]})},1329548:(a,u,d,h,y)=>{r.hc("Gemm",a,{alpha:u,beta:d,transA:h,transB:y})},1329652:a=>{r.hc("MatMul",a,void 0)},1329706:(a,u,d,h)=>{r.hc("ArgMax",a,{keepDims:!!u,selectLastIndex:!!d,axis:h})},1329814:(a,u,d,h)=>{r.hc("ArgMin",a,{keepDims:!!u,selectLastIndex:!!d,axis:h})},1329922:(a,u)=>{r.hc("Softmax",a,{axis:u})},1329985:(a,u)=>{r.hc("Concat",a,{axis:u})},1330045:(a,u,d,h,y)=>{r.hc("Split",a,{axis:u,numOutputs:d,splitSizes:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1330201:a=>{r.hc("Expand",a,void 0)},1330255:(a,u)=>{r.hc("Gather",a,{axis:Number(u)})},1330326:(a,u)=>{r.hc("GatherElements",a,{axis:Number(u)})},1330405:(a,u)=>{r.hc("GatherND",a,{batch_dims:Number(u)})},1330484:(a,u,d,h,y,x,C,A,B,L,H)=>{r.hc("Resize",a,{antialias:u,axes:d?Array.from(D().subarray(Number(d)>>>0,Number(h)>>>0)):[],coordinateTransformMode:Te(y),cubicCoeffA:x,excludeOutside:C,extrapolationValue:A,keepAspectRatioPolicy:Te(B),mode:Te(L),nearestMode:Te(H)})},1330846:(a,u,d,h,y,x,C)=>{r.hc("Slice",a,{starts:u?Array.from(D().subarray(Number(u)>>>0,Number(d)>>>0)):[],ends:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[],axes:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[]})},1331110:a=>{r.hc("Tile",a,void 0)},1331162:(a,u,d)=>{r.hc("InstanceNormalization",a,{epsilon:u,format:d?"NHWC":"NCHW"})},1331276:(a,u,d)=>{r.hc("InstanceNormalization",a,{epsilon:u,format:d?"NHWC":"NCHW"})},1331390:a=>{r.hc("Range",a,void 0)},1331443:(a,u)=>{r.hc("Einsum",a,{equation:Te(u)})},1331524:(a,u,d,h,y)=>{r.hc("Pad",a,{mode:u,value:d,pads:h?Array.from(D().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},1331667:(a,u,d,h,y,x)=>{r.hc("BatchNormalization",a,{epsilon:u,momentum:d,spatial:!!y,trainingMode:!!h,format:x?"NHWC":"NCHW"})},1331836:(a,u,d,h,y,x)=>{r.hc("BatchNormalization",a,{epsilon:u,momentum:d,spatial:!!y,trainingMode:!!h,format:x?"NHWC":"NCHW"})},1332005:(a,u,d)=>{r.hc("CumSum",a,{exclusive:Number(u),reverse:Number(d)})},1332102:(a,u,d)=>{r.hc("DequantizeLinear",a,{axis:u,blockSize:d})},1332192:(a,u,d,h,y)=>{r.hc("GridSample",a,{align_corners:u,mode:Te(d),padding_mode:Te(h),format:y?"NHWC":"NCHW"})},1332362:(a,u,d,h,y)=>{r.hc("GridSample",a,{align_corners:u,mode:Te(d),padding_mode:Te(h),format:y?"NHWC":"NCHW"})},1332532:(a,u)=>{r.hc("ScatterND",a,{reduction:Te(u)})},1332617:(a,u,d,h,y,x,C,A,B)=>{r.hc("Attention",a,{numHeads:u,isUnidirectional:d,maskFilterValue:h,scale:y,doRotary:x,qkvHiddenSizes:C?Array.from(D().subarray(Number(A)>>>0,Number(A)+C>>>0)):[],pastPresentShareBuffer:!!B})},1332889:a=>{r.hc("BiasAdd",a,void 0)},1332944:a=>{r.hc("BiasSplitGelu",a,void 0)},1333005:a=>{r.hc("FastGelu",a,void 0)},1333061:(a,u,d,h,y,x,C,A,B,L,H,J,le,ve,We,Qt)=>{r.hc("Conv",a,{format:J?"NHWC":"NCHW",auto_pad:u,dilations:d?Array.from(D().subarray(Number(d)>>>0,Number(h)>>>0)):[],group:y,kernel_shape:x?Array.from(D().subarray(Number(x)>>>0,Number(C)>>>0)):[],pads:A?Array.from(D().subarray(Number(A)>>>0,Number(B)>>>0)):[],strides:L?Array.from(D().subarray(Number(L)>>>0,Number(H)>>>0)):[],w_is_const:()=>!!ce()[Number(le)>>>0],activation:Te(ve),activation_params:We?Array.from(cr().subarray(Number(We)>>>0,Number(Qt)>>>0)):[]})},1333645:a=>{r.hc("Gelu",a,void 0)},1333697:(a,u,d,h,y,x,C,A,B)=>{r.hc("GroupQueryAttention",a,{numHeads:u,kvNumHeads:d,scale:h,softcap:y,doRotary:x,rotaryInterleaved:C,smoothSoftmax:A,localWindowSize:B})},1333914:(a,u,d,h)=>{r.hc("LayerNormalization",a,{axis:u,epsilon:d,simplified:!!h})},1334025:(a,u,d,h)=>{r.hc("LayerNormalization",a,{axis:u,epsilon:d,simplified:!!h})},1334136:(a,u,d,h,y,x)=>{r.hc("MatMulNBits",a,{k:u,n:d,accuracyLevel:h,bits:y,blockSize:x})},1334263:(a,u,d,h,y,x)=>{r.hc("MultiHeadAttention",a,{numHeads:u,isUnidirectional:d,maskFilterValue:h,scale:y,doRotary:x})},1334422:(a,u)=>{r.hc("QuickGelu",a,{alpha:u})},1334486:(a,u,d,h,y)=>{r.hc("RotaryEmbedding",a,{interleaved:!!u,numHeads:d,rotaryEmbeddingDim:h,scale:y})},1334625:(a,u,d)=>{r.hc("SkipLayerNormalization",a,{epsilon:u,simplified:!!d})},1334727:(a,u,d)=>{r.hc("SkipLayerNormalization",a,{epsilon:u,simplified:!!d})},1334829:(a,u,d,h)=>{r.hc("GatherBlockQuantized",a,{gatherAxis:u,quantizeAxis:d,blockSize:h})},1334950:a=>{r.Wd(a)},1334984:(a,u)=>r.Zd(Number(a),Number(u),r.Cd.be,r.Cd.errors)};function Lf(a,u,d){return Fn(async()=>{await r.Ud(Number(a),Number(u),Number(d))})}function Vf(){return typeof wasmOffsetConverter<"u"}class Zr{name="ExitStatus";constructor(u){this.message=`Program terminated with exit(${u})`,this.status=u}}var fn=a=>{a.terminate(),a.onmessage=()=>{}},Xr=[],mn=a=>{dt.length==0&&(vn(),$n(dt[0]));var u=dt.pop();if(!u)return 6;Ht.push(u),pt[a.xd]=u,u.xd=a.xd;var d={yd:"run",de:a.ce,Fd:a.Fd,xd:a.xd};return c&&u.unref(),u.postMessage(d,a.Ld),0},lt=0,xe=(a,u,...d)=>{for(var h=2*d.length,y=ie(),x=yi(8*h),C=x>>>3,A=0;A<d.length;A++){var B=d[A];typeof B=="bigint"?(ue[C+2*A]=1n,ue[C+2*A+1]=B):(ue[C+2*A]=0n,Nt()[C+2*A+1>>>0]=B)}return a=gs(a,0,h,x,u),re(y),a};function Yr(a){if(f)return xe(0,1,a);if(oe=a,!(0<lt)){for(var u of Ht)fn(u);for(u of dt)fn(u);dt=[],Ht=[],pt={},te=!0}b(a,new Zr(a))}function gn(a){if(f)return xe(1,0,a);Jr(a)}var Jr=a=>{if(oe=a,f)throw gn(a),"unwind";Yr(a)},dt=[],Ht=[],yn=[],pt={};function Gf(){for(var a=r.numThreads-1;a--;)vn();Xr.unshift(()=>{Mt++,jf(()=>cn())})}var _n=a=>{var u=a.xd;delete pt[u],dt.push(a),Ht.splice(Ht.indexOf(a),1),a.xd=0,ys(u)};function wn(){yn.forEach(a=>a())}var $n=a=>new Promise(u=>{a.onmessage=x=>{x=x.data;var C=x.yd;if(x.Ed&&x.Ed!=br()){var A=pt[x.Ed];A?A.postMessage(x,x.Ld):V(`Internal error! Worker sent a message "${C}" to target pthread ${x.Ed}, but that thread no longer exists!`)}else C==="checkMailbox"?fr():C==="spawnThread"?mn(x):C==="cleanupThread"?_n(pt[x.ee]):C==="loaded"?(a.loaded=!0,c&&!a.xd&&a.unref(),u(a)):C==="alert"?alert(`Thread ${x.fe}: ${x.text}`):x.target==="setimmediate"?a.postMessage(x):C==="callHandler"?r[x.Nd](...x.args):C&&V(`worker sent an unknown command ${C}`)},a.onerror=x=>{throw V(`worker sent an error! ${x.filename}:${x.lineno}: ${x.message}`),x},c&&(a.on("message",x=>a.onmessage({data:x})),a.on("error",x=>a.onerror(x)));var d=[],h=[],y;for(y of h)r.propertyIsEnumerable(y)&&d.push(y);a.postMessage({yd:"load",Od:d,he:F,ie:q})});function jf(a){f?a():Promise.all(dt.map($n)).then(a)}function vn(){var a=(()=>{throw new Error("This verified runtime supports the single-thread backend only")})();dt.push(a)}var Hf=a=>{Pe();var u=_e()[a+52>>>2>>>0];a=_e()[a+56>>>2>>>0],$s(u,u-a),re(u)},Ff=(a,u)=>{lt=0,a=_i(a,u),0<lt?oe=a:gi(a)},hr=[],ei=0;function Kf(a){a>>>=0;var u=new ti(a);if(ce()[u.wd+12>>>0]==0){var d=1;ce()[u.wd+12>>>0]=d,ei--}return d=0,ce()[u.wd+13>>>0]=d,hr.push(u),bs(a),Ss(a)}var ct=0,Qf=()=>{ae(0,0);var a=hr.pop();vs(a.Gd),ct=0};class ti{constructor(u){this.Gd=u,this.wd=u-24}}function Zf(a){throw ct||=a>>>0,ct}var ri=a=>{var u=ct;if(!u)return Kt(0),0;var d=new ti(u);_e()[d.wd+16>>>2>>>0]=u;var h=_e()[d.wd+4>>>2>>>0];if(!h)return Kt(0),u;for(var y of a){if(y===0||y===h)break;if(xs(y,h,d.wd+16))return Kt(y),u}return Kt(h),u};function Xf(){return ri([])}function Yf(a){return ri([a>>>0])}function Jf(a,u){return ri([a>>>0,u>>>0])}var em=()=>{var a=hr.pop();a||at("no exception to throw");var u=a.Gd;if(ce()[a.wd+13>>>0]==0){hr.push(a);var d=1;ce()[a.wd+13>>>0]=d,d=0,ce()[a.wd+12>>>0]=d,ei++}throw ct=u,ct};function tm(a,u,d){a>>>=0;var h=new ti(a);throw u>>>=0,d>>>=0,_e()[h.wd+16>>>2>>>0]=0,_e()[h.wd+4>>>2>>>0]=u,_e()[h.wd+8>>>2>>>0]=d,ct=a,ei++,ct}function bn(a,u,d,h){return f?xe(2,1,a,u,d,h):xn(a,u,d,h)}function xn(a,u,d,h){if(a>>>=0,u>>>=0,d>>>=0,h>>>=0,typeof w>"u")return 6;var y=[];return f&&y.length===0?bn(a,u,d,h):(a={ce:d,xd:a,Fd:h,Ld:y},f?(a.yd="spawnThread",postMessage(a,y),0):mn(a))}var Sn=typeof TextDecoder<"u"?new TextDecoder:void 0,kn=(a,u=0,d=NaN)=>{u>>>=0;var h=u+d;for(d=u;a[d]&&!(d>=h);)++d;if(16<d-u&&a.buffer&&Sn)return Sn.decode(a.buffer instanceof ArrayBuffer?a.subarray(u,d):a.slice(u,d));for(h="";u<d;){var y=a[u++];if(y&128){var x=a[u++]&63;if((y&224)==192)h+=String.fromCharCode((y&31)<<6|x);else{var C=a[u++]&63;y=(y&240)==224?(y&15)<<12|x<<6|C:(y&7)<<18|x<<12|C<<6|a[u++]&63,65536>y?h+=String.fromCharCode(y):(y-=65536,h+=String.fromCharCode(55296|y>>10,56320|y&1023))}}else h+=String.fromCharCode(y)}return h},Te=(a,u)=>(a>>>=0)?kn(fe(),a,u):"";function Tn(a,u,d){return f?xe(3,1,a,u,d):0}function Cn(a,u){if(f)return xe(4,1,a,u)}var In=a=>{for(var u=0,d=0;d<a.length;++d){var h=a.charCodeAt(d);127>=h?u++:2047>=h?u+=2:55296<=h&&57343>=h?(u+=4,++d):u+=3}return u},Dt=(a,u,d)=>{var h=fe();if(u>>>=0,0<d){var y=u;d=u+d-1;for(var x=0;x<a.length;++x){var C=a.charCodeAt(x);if(55296<=C&&57343>=C){var A=a.charCodeAt(++x);C=65536+((C&1023)<<10)|A&1023}if(127>=C){if(u>=d)break;h[u++>>>0]=C}else{if(2047>=C){if(u+1>=d)break;h[u++>>>0]=192|C>>6}else{if(65535>=C){if(u+2>=d)break;h[u++>>>0]=224|C>>12}else{if(u+3>=d)break;h[u++>>>0]=240|C>>18,h[u++>>>0]=128|C>>12&63}h[u++>>>0]=128|C>>6&63}h[u++>>>0]=128|C&63}}h[u>>>0]=0,a=u-y}else a=0;return a};function En(a,u){if(f)return xe(5,1,a,u)}function zn(a,u,d){if(f)return xe(6,1,a,u,d)}function An(a,u,d){return f?xe(7,1,a,u,d):0}function On(a,u){if(f)return xe(8,1,a,u)}function Rn(a,u,d){if(f)return xe(9,1,a,u,d)}function Bn(a,u,d,h){if(f)return xe(10,1,a,u,d,h)}function Nn(a,u,d,h){if(f)return xe(11,1,a,u,d,h)}function Mn(a,u,d,h){if(f)return xe(12,1,a,u,d,h)}function Dn(a){if(f)return xe(13,1,a)}function Pn(a,u){if(f)return xe(14,1,a,u)}function Un(a,u,d){if(f)return xe(15,1,a,u,d)}var rm=()=>at(""),Wn,et=a=>{for(var u="";fe()[a>>>0];)u+=Wn[fe()[a++>>>0]];return u},ii={},ai={},im={},ht;function am(a,u,d={}){var h=u.name;if(!a)throw new ht(`type "${h}" must have a positive integer typeid pointer`);if(ai.hasOwnProperty(a)){if(d.Pd)return;throw new ht(`Cannot register type '${h}' twice`)}ai[a]=u,delete im[a],ii.hasOwnProperty(a)&&(u=ii[a],delete ii[a],u.forEach(y=>y()))}function nt(a,u,d={}){return am(a,u,d)}var qn=(a,u,d)=>{switch(u){case 1:return d?h=>ce()[h>>>0]:h=>fe()[h>>>0];case 2:return d?h=>De()[h>>>1>>>0]:h=>Gt()[h>>>1>>>0];case 4:return d?h=>D()[h>>>2>>>0]:h=>_e()[h>>>2>>>0];case 8:return d?h=>ue[h>>>3]:h=>we[h>>>3];default:throw new TypeError(`invalid integer width (${u}): ${a}`)}};function nm(a,u,d){a>>>=0,d>>>=0,u=et(u>>>0),nt(a,{name:u,fromWireType:h=>h,toWireType:function(h,y){if(typeof y!="bigint"&&typeof y!="number")throw y===null?y="null":(h=typeof y,y=h==="object"||h==="array"||h==="function"?y.toString():""+y),new TypeError(`Cannot convert "${y}" to ${this.name}`);return typeof y=="number"&&(y=BigInt(y)),y},zd:ft,readValueFromPointer:qn(u,d,u.indexOf("u")==-1),Ad:null})}var ft=8;function sm(a,u,d,h){a>>>=0,u=et(u>>>0),nt(a,{name:u,fromWireType:function(y){return!!y},toWireType:function(y,x){return x?d:h},zd:ft,readValueFromPointer:function(y){return this.fromWireType(fe()[y>>>0])},Ad:null})}var ni=[],st=[];function si(a){a>>>=0,9<a&&--st[a+1]===0&&(st[a]=void 0,ni.push(a))}var Be=a=>{if(!a)throw new ht("Cannot use deleted val. handle = "+a);return st[a]},Ue=a=>{switch(a){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let u=ni.pop()||st.length;return st[u]=a,st[u+1]=1,u}};function oi(a){return this.fromWireType(_e()[a>>>2>>>0])}var om={name:"emscripten::val",fromWireType:a=>{var u=Be(a);return si(a),u},toWireType:(a,u)=>Ue(u),zd:ft,readValueFromPointer:oi,Ad:null};function um(a){return nt(a>>>0,om)}var lm=(a,u)=>{switch(u){case 4:return function(d){return this.fromWireType(cr()[d>>>2>>>0])};case 8:return function(d){return this.fromWireType(Nt()[d>>>3>>>0])};default:throw new TypeError(`invalid float width (${u}): ${a}`)}};function dm(a,u,d){a>>>=0,d>>>=0,u=et(u>>>0),nt(a,{name:u,fromWireType:h=>h,toWireType:(h,y)=>y,zd:ft,readValueFromPointer:lm(u,d),Ad:null})}function pm(a,u,d,h,y){if(a>>>=0,d>>>=0,u=et(u>>>0),y===-1&&(y=4294967295),y=A=>A,h===0){var x=32-8*d;y=A=>A<<x>>>x}var C=u.includes("unsigned")?function(A,B){return B>>>0}:function(A,B){return B};nt(a,{name:u,fromWireType:y,toWireType:C,zd:ft,readValueFromPointer:qn(u,d,h!==0),Ad:null})}function cm(a,u,d){function h(x){var C=_e()[x>>>2>>>0];return x=_e()[x+4>>>2>>>0],new y(ce().buffer,x,C)}a>>>=0;var y=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][u];d=et(d>>>0),nt(a,{name:d,fromWireType:h,zd:ft,readValueFromPointer:h},{Pd:!0})}function hm(a,u){a>>>=0,u=et(u>>>0),nt(a,{name:u,fromWireType:function(d){for(var h=_e()[d>>>2>>>0],y=d+4,x,C=y,A=0;A<=h;++A){var B=y+A;(A==h||fe()[B>>>0]==0)&&(C=Te(C,B-C),x===void 0?x=C:(x+="\0",x+=C),C=B+1)}return rt(d),x},toWireType:function(d,h){h instanceof ArrayBuffer&&(h=new Uint8Array(h));var y=typeof h=="string";if(!(y||h instanceof Uint8Array||h instanceof Uint8ClampedArray||h instanceof Int8Array))throw new ht("Cannot pass non-string to std::string");var x=y?In(h):h.length,C=xr(4+x+1),A=C+4;if(_e()[C>>>2>>>0]=x,y)Dt(h,A,x+1);else if(y)for(y=0;y<x;++y){var B=h.charCodeAt(y);if(255<B)throw rt(C),new ht("String has UTF-16 code units that do not fit in 8 bits");fe()[A+y>>>0]=B}else for(y=0;y<x;++y)fe()[A+y>>>0]=h[y];return d!==null&&d.push(rt,C),C},zd:ft,readValueFromPointer:oi,Ad(d){rt(d)}})}var Ln=typeof TextDecoder<"u"?new TextDecoder("utf-16le"):void 0,fm=(a,u)=>{for(var d=a>>1,h=d+u/2;!(d>=h)&&Gt()[d>>>0];)++d;if(d<<=1,32<d-a&&Ln)return Ln.decode(fe().slice(a,d));for(d="",h=0;!(h>=u/2);++h){var y=De()[a+2*h>>>1>>>0];if(y==0)break;d+=String.fromCharCode(y)}return d},mm=(a,u,d)=>{if(d??=2147483647,2>d)return 0;d-=2;var h=u;d=d<2*a.length?d/2:a.length;for(var y=0;y<d;++y){var x=a.charCodeAt(y);De()[u>>>1>>>0]=x,u+=2}return De()[u>>>1>>>0]=0,u-h},gm=a=>2*a.length,ym=(a,u)=>{for(var d=0,h="";!(d>=u/4);){var y=D()[a+4*d>>>2>>>0];if(y==0)break;++d,65536<=y?(y-=65536,h+=String.fromCharCode(55296|y>>10,56320|y&1023)):h+=String.fromCharCode(y)}return h},_m=(a,u,d)=>{if(u>>>=0,d??=2147483647,4>d)return 0;var h=u;d=h+d-4;for(var y=0;y<a.length;++y){var x=a.charCodeAt(y);if(55296<=x&&57343>=x){var C=a.charCodeAt(++y);x=65536+((x&1023)<<10)|C&1023}if(D()[u>>>2>>>0]=x,u+=4,u+4>d)break}return D()[u>>>2>>>0]=0,u-h},wm=a=>{for(var u=0,d=0;d<a.length;++d){var h=a.charCodeAt(d);55296<=h&&57343>=h&&++d,u+=4}return u};function $m(a,u,d){if(a>>>=0,u>>>=0,d>>>=0,d=et(d),u===2)var h=fm,y=mm,x=gm,C=A=>Gt()[A>>>1>>>0];else u===4&&(h=ym,y=_m,x=wm,C=A=>_e()[A>>>2>>>0]);nt(a,{name:d,fromWireType:A=>{for(var B=_e()[A>>>2>>>0],L,H=A+4,J=0;J<=B;++J){var le=A+4+J*u;(J==B||C(le)==0)&&(H=h(H,le-H),L===void 0?L=H:(L+="\0",L+=H),H=le+u)}return rt(A),L},toWireType:(A,B)=>{if(typeof B!="string")throw new ht(`Cannot pass non-string to C++ string type ${d}`);var L=x(B),H=xr(4+L+u);return _e()[H>>>2>>>0]=L/u,y(B,H+4,L+u),A!==null&&A.push(rt,H),H},zd:ft,readValueFromPointer:oi,Ad(A){rt(A)}})}function vm(a,u){a>>>=0,u=et(u>>>0),nt(a,{Qd:!0,name:u,zd:0,fromWireType:()=>{},toWireType:()=>{}})}function bm(a){mi(a>>>0,!p,1,!l,131072,!1),wn()}var ui=a=>{if(!te)try{if(a(),!(0<lt))try{f?gi(oe):Jr(oe)}catch(u){u instanceof Zr||u=="unwind"||b(1,u)}}catch(u){u instanceof Zr||u=="unwind"||b(1,u)}};function li(a){a>>>=0,typeof Atomics.ge=="function"&&(Atomics.ge(D(),a>>>2,a).value.then(fr),a+=128,Atomics.store(D(),a>>>2,1))}var fr=()=>{var a=br();a&&(li(a),ui(ws))};function xm(a,u){a>>>=0,a==u>>>0?setTimeout(fr):f?postMessage({Ed:a,yd:"checkMailbox"}):(a=pt[a])&&a.postMessage({yd:"checkMailbox"})}var di=[];function Sm(a,u,d,h,y){for(u>>>=0,h/=2,di.length=h,d=y>>>0>>>3,y=0;y<h;y++)di[y]=ue[d+2*y]?ue[d+2*y+1]:Nt()[d+2*y+1>>>0];return(u?Qr[u]:xg[a])(...di)}var km=()=>{lt=0};function Tm(a){a>>>=0,f?postMessage({yd:"cleanupThread",ee:a}):_n(pt[a])}function Cm(a){c&&pt[a>>>0].ref()}var mr=(a,u)=>{var d=ai[a];if(d===void 0)throw a=hs(a),d=et(a),rt(a),new ht(`${u} has unknown type ${d}`);return d},Vn=(a,u,d)=>{var h=[];return a=a.toWireType(h,d),h.length&&(_e()[u>>>2>>>0]=Ue(h)),a};function Im(a,u,d){return u>>>=0,d>>>=0,a=Be(a>>>0),u=mr(u,"emval::as"),Vn(u,d,a)}function Em(a,u){return u>>>=0,a=Be(a>>>0),u=mr(u,"emval::as"),u.toWireType(null,a)}var gr=a=>{try{a()}catch(u){at(u)}};function zm(){var a=N,u={};for(let[d,h]of Object.entries(a))u[d]=typeof h=="function"?(...y)=>{yr.push(d);try{return h(...y)}finally{te||(yr.pop(),tt&&mt===1&&yr.length===0&&(mt=0,lt+=1,gr(yo),typeof Fibers<"u"&&Fibers.le()))}}:h;return u}var mt=0,tt=null,Gn=0,yr=[],jn={},Hn={},Am=0,pi=null,Om=[];function Rm(){return new Promise((a,u)=>{pi={resolve:a,reject:u}})}function Bm(){var a=xr(65548),u=a+12;_e()[a>>>2>>>0]=u,_e()[a+4>>>2>>>0]=u+65536,u=yr[0];var d=jn[u];return d===void 0&&(d=Am++,jn[u]=d,Hn[d]=u),u=d,D()[a+8>>>2>>>0]=u,a}function Nm(){var a=D()[tt+8>>>2>>>0];return a=N[Hn[a]],--lt,a()}function Mm(a){if(!te){if(mt===0){var u=!1,d=!1;a((h=0)=>{if(!te&&(Gn=h,u=!0,d)){mt=2,gr(()=>_o(tt)),typeof MainLoop<"u"&&MainLoop.Md&&MainLoop.resume(),h=!1;try{var y=Nm()}catch(A){y=A,h=!0}var x=!1;if(!tt){var C=pi;C&&(pi=null,(h?C.reject:C.resolve)(y),x=!0)}if(h&&!x)throw y}}),d=!0,u||(mt=1,tt=Bm(),typeof MainLoop<"u"&&MainLoop.Md&&MainLoop.pause(),gr(()=>go(tt)))}else mt===2?(mt=0,gr(wo),rt(tt),tt=null,Om.forEach(ui)):at(`invalid state: ${mt}`);return Gn}}function Fn(a){return Mm(u=>{a().then(u)})}function Dm(a){return a>>>=0,Fn(async()=>{var u=await Be(a);return Ue(u)})}var _r=[];function Pm(a,u,d,h){return d>>>=0,h>>>=0,a=_r[a>>>0],u=Be(u>>>0),a(null,u,d,h)}var Um={},wr=a=>{var u=Um[a];return u===void 0?et(a):u};function Wm(a,u,d,h,y){return d>>>=0,h>>>=0,y>>>=0,a=_r[a>>>0],u=Be(u>>>0),d=wr(d),a(u,u[d],h,y)}var Kn=()=>typeof globalThis=="object"?globalThis:Function("return this")();function qm(a){return a>>>=0,a===0?Ue(Kn()):(a=wr(a),Ue(Kn()[a]))}var Lm=a=>{var u=_r.length;return _r.push(a),u},Vm=(a,u)=>{for(var d=Array(a),h=0;h<a;++h)d[h]=mr(_e()[u+4*h>>>2>>>0],"parameter "+h);return d},Qn=(a,u)=>Object.defineProperty(u,"name",{value:a});function Gm(a){var u=Function;if(!(u instanceof Function))throw new TypeError(`new_ called with constructor type ${typeof u} which is not a function`);var d=Qn(u.name||"unknownFunctionName",function(){});return d.prototype=u.prototype,d=new d,a=u.apply(d,a),a instanceof Object?a:d}function jm(a,u,d){u=Vm(a,u>>>0);var h=u.shift();a--;var y=`return function (obj, func, destructorsRef, args) {
`,x=0,C=[];d===0&&C.push("obj");for(var A=["retType"],B=[h],L=0;L<a;++L)C.push("arg"+L),A.push("argType"+L),B.push(u[L]),y+=`  var arg${L} = argType${L}.readValueFromPointer(args${x?"+"+x:""});
`,x+=u[L].zd;return y+=`  var rv = ${d===1?"new func":"func.call"}(${C.join(", ")});
`,h.Qd||(A.push("emval_returnValue"),B.push(Vn),y+=`  return emval_returnValue(retType, destructorsRef, rv);
`),A.push(y+`};
`),a=Gm(A)(...B),d=`methodCaller<(${u.map(H=>H.name).join(", ")}) => ${h.name}>`,Lm(Qn(d,a))}function Hm(a){return a=wr(a>>>0),Ue(r[a])}function Fm(a,u){return u>>>=0,a=Be(a>>>0),u=Be(u),Ue(a[u])}function Km(a){a>>>=0,9<a&&(st[a+1]+=1)}function Qm(){return Ue([])}function Zm(a){a=Be(a>>>0);for(var u=Array(a.length),d=0;d<a.length;d++)u[d]=a[d];return Ue(u)}function Xm(a){return Ue(wr(a>>>0))}function Ym(){return Ue({})}function Jm(a){a>>>=0;for(var u=Be(a);u.length;){var d=u.pop();u.pop()(d)}si(a)}function eg(a,u,d){u>>>=0,d>>>=0,a=Be(a>>>0),u=Be(u),d=Be(d),a[u]=d}function tg(a,u){return u>>>=0,a=mr(a>>>0,"_emval_take_value"),a=a.readValueFromPointer(u),Ue(a)}function rg(a,u){a=-9007199254740992>a||9007199254740992<a?NaN:Number(a),u>>>=0,a=new Date(1e3*a),D()[u>>>2>>>0]=a.getUTCSeconds(),D()[u+4>>>2>>>0]=a.getUTCMinutes(),D()[u+8>>>2>>>0]=a.getUTCHours(),D()[u+12>>>2>>>0]=a.getUTCDate(),D()[u+16>>>2>>>0]=a.getUTCMonth(),D()[u+20>>>2>>>0]=a.getUTCFullYear()-1900,D()[u+24>>>2>>>0]=a.getUTCDay(),a=(a.getTime()-Date.UTC(a.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,D()[u+28>>>2>>>0]=a}var Zn=a=>a%4===0&&(a%100!==0||a%400===0),Xn=[0,31,60,91,121,152,182,213,244,274,305,335],Yn=[0,31,59,90,120,151,181,212,243,273,304,334];function ig(a,u){a=-9007199254740992>a||9007199254740992<a?NaN:Number(a),u>>>=0,a=new Date(1e3*a),D()[u>>>2>>>0]=a.getSeconds(),D()[u+4>>>2>>>0]=a.getMinutes(),D()[u+8>>>2>>>0]=a.getHours(),D()[u+12>>>2>>>0]=a.getDate(),D()[u+16>>>2>>>0]=a.getMonth(),D()[u+20>>>2>>>0]=a.getFullYear()-1900,D()[u+24>>>2>>>0]=a.getDay();var d=(Zn(a.getFullYear())?Xn:Yn)[a.getMonth()]+a.getDate()-1|0;D()[u+28>>>2>>>0]=d,D()[u+36>>>2>>>0]=-(60*a.getTimezoneOffset()),d=new Date(a.getFullYear(),6,1).getTimezoneOffset();var h=new Date(a.getFullYear(),0,1).getTimezoneOffset();a=(d!=h&&a.getTimezoneOffset()==Math.min(h,d))|0,D()[u+32>>>2>>>0]=a}function ag(a){a>>>=0;var u=new Date(D()[a+20>>>2>>>0]+1900,D()[a+16>>>2>>>0],D()[a+12>>>2>>>0],D()[a+8>>>2>>>0],D()[a+4>>>2>>>0],D()[a>>>2>>>0],0),d=D()[a+32>>>2>>>0],h=u.getTimezoneOffset(),y=new Date(u.getFullYear(),6,1).getTimezoneOffset(),x=new Date(u.getFullYear(),0,1).getTimezoneOffset(),C=Math.min(x,y);return 0>d?D()[a+32>>>2>>>0]=+(y!=x&&C==h):0<d!=(C==h)&&(y=Math.max(x,y),u.setTime(u.getTime()+6e4*((0<d?C:y)-h))),D()[a+24>>>2>>>0]=u.getDay(),d=(Zn(u.getFullYear())?Xn:Yn)[u.getMonth()]+u.getDate()-1|0,D()[a+28>>>2>>>0]=d,D()[a>>>2>>>0]=u.getSeconds(),D()[a+4>>>2>>>0]=u.getMinutes(),D()[a+8>>>2>>>0]=u.getHours(),D()[a+12>>>2>>>0]=u.getDate(),D()[a+16>>>2>>>0]=u.getMonth(),D()[a+20>>>2>>>0]=u.getYear(),a=u.getTime(),BigInt(isNaN(a)?-1:a/1e3)}function Jn(a,u,d,h,y,x,C){return f?xe(16,1,a,u,d,h,y,x,C):-52}function es(a,u,d,h,y,x){if(f)return xe(17,1,a,u,d,h,y,x)}var Ft={},ng=()=>performance.timeOrigin+performance.now();function ts(a,u){if(f)return xe(18,1,a,u);if(Ft[a]&&(clearTimeout(Ft[a].id),delete Ft[a]),!u)return 0;var d=setTimeout(()=>{delete Ft[a],ui(()=>_s(a,performance.timeOrigin+performance.now()))},u);return Ft[a]={id:d,ke:u},0}function sg(a,u,d,h){a>>>=0,u>>>=0,d>>>=0,h>>>=0;var y=new Date().getFullYear(),x=new Date(y,0,1).getTimezoneOffset();y=new Date(y,6,1).getTimezoneOffset();var C=Math.max(x,y);_e()[a>>>2>>>0]=60*C,D()[u>>>2>>>0]=+(x!=y),u=A=>{var B=Math.abs(A);return`UTC${0<=A?"-":"+"}${String(Math.floor(B/60)).padStart(2,"0")}${String(B%60).padStart(2,"0")}`},a=u(x),u=u(y),y<x?(Dt(a,d,17),Dt(u,h,17)):(Dt(a,h,17),Dt(u,d,17))}var og=()=>Date.now(),ug=1;function lg(a,u,d){if(!(0<=a&&3>=a))return 28;if(a===0)a=Date.now();else if(ug)a=performance.timeOrigin+performance.now();else return 52;return ue[d>>>0>>>3]=BigInt(Math.round(1e6*a)),0}var ci=[],rs=(a,u)=>{ci.length=0;for(var d;d=fe()[a++>>>0];){var h=d!=105;h&=d!=112,u+=h&&u%8?4:0,ci.push(d==112?_e()[u>>>2>>>0]:d==106?ue[u>>>3]:d==105?D()[u>>>2>>>0]:Nt()[u>>>3>>>0]),u+=h?8:4}return ci};function dg(a,u,d){return a>>>=0,u=rs(u>>>0,d>>>0),Qr[a](...u)}function pg(a,u,d){return a>>>=0,u=rs(u>>>0,d>>>0),Qr[a](...u)}var cg=()=>{};function hg(a,u){return V(Te(a>>>0,u>>>0))}var fg=()=>{throw lt+=1,"unwind"};function mg(){return 4294901760}var gg=()=>c?m("os").cpus().length:navigator.hardwareConcurrency;function yg(){return at("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER"),0}function _g(a){a>>>=0;var u=fe().length;if(a<=u||4294901760<a)return!1;for(var d=1;4>=d;d*=2){var h=u*(1+.2/d);h=Math.min(h,a+100663296);e:{h=(Math.min(4294901760,65536*Math.ceil(Math.max(a,h)/65536))-F.buffer.byteLength+65535)/65536|0;try{F.grow(h),Pe();var y=1;break e}catch{}y=void 0}if(y)return!0}return!1}var $r=()=>(at("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER"),0),Pt={},is=a=>{a.forEach(u=>{var d=$r();d&&(Pt[d]=u)})};function wg(){var a=Error().stack.toString().split(`
`);return a[0]=="Error"&&a.shift(),is(a),Pt.Kd=$r(),Pt.ae=a,Pt.Kd}function $g(a,u,d){if(a>>>=0,u>>>=0,Pt.Kd==a)var h=Pt.ae;else h=Error().stack.toString().split(`
`),h[0]=="Error"&&h.shift(),is(h);for(var y=3;h[y]&&$r()!=a;)++y;for(a=0;a<d&&h[a+y];++a)D()[u+4*a>>>2>>>0]=$r();return a}var hi={},as=()=>{if(!fi){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:S||"./this.program"},u;for(u in hi)hi[u]===void 0?delete a[u]:a[u]=hi[u];var d=[];for(u in a)d.push(`${u}=${a[u]}`);fi=d}return fi},fi;function ns(a,u){if(f)return xe(19,1,a,u);a>>>=0,u>>>=0;var d=0;return as().forEach((h,y)=>{var x=u+d;for(y=_e()[a+4*y>>>2>>>0]=x,x=0;x<h.length;++x)ce()[y++>>>0]=h.charCodeAt(x);ce()[y>>>0]=0,d+=h.length+1}),0}function ss(a,u){if(f)return xe(20,1,a,u);a>>>=0,u>>>=0;var d=as();_e()[a>>>2>>>0]=d.length;var h=0;return d.forEach(y=>h+=y.length+1),_e()[u>>>2>>>0]=h,0}function os(a){return f?xe(21,1,a):52}function us(a,u,d,h){return f?xe(22,1,a,u,d,h):52}function ls(a,u,d,h){return f?xe(23,1,a,u,d,h):70}var vg=[null,[],[]];function ds(a,u,d,h){if(f)return xe(24,1,a,u,d,h);u>>>=0,d>>>=0,h>>>=0;for(var y=0,x=0;x<d;x++){var C=_e()[u>>>2>>>0],A=_e()[u+4>>>2>>>0];u+=8;for(var B=0;B<A;B++){var L=fe()[C+B>>>0],H=vg[a];L===0||L===10?((a===1?U:V)(kn(H)),H.length=0):H.push(L)}y+=A}return _e()[h>>>2>>>0]=y,0}function bg(a){return a>>>0}f||Gf();for(var ps=Array(256),vr=0;256>vr;++vr)ps[vr]=String.fromCharCode(vr);Wn=ps,ht=r.BindingError=class extends Error{constructor(a){super(a),this.name="BindingError"}},r.InternalError=class extends Error{constructor(a){super(a),this.name="InternalError"}},st.push(0,1,void 0,1,null,1,!0,1,!1,1),r.count_emval_handles=()=>st.length/2-5-ni.length;var xg=[Yr,gn,bn,Tn,Cn,En,zn,An,On,Rn,Bn,Nn,Mn,Dn,Pn,Un,Jn,es,ts,ns,ss,os,us,ls,ds],cs,N;(async function(){function a(h,y){return N=h.exports,N=zm(),N=m0(),yn.push(N.jc),q=y,cn(),N}Mt++;var u=hn();if(r.instantiateWasm)return new Promise(h=>{r.instantiateWasm(u,(y,x)=>{a(y,x),h(y.exports)})});if(f)return new Promise(h=>{ln=y=>{var x=new WebAssembly.Instance(y,hn());h(a(x,y))}});Kr??=r.locateFile?r.locateFile?r.locateFile("ort-wasm-simd-threaded.jsep.wasm",$):$+"ort-wasm-simd-threaded.jsep.wasm":new URL("ort-wasm-simd-threaded.jsep.wasm","https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.mjs").href;try{var d=await qf(u);return a(d.instance,d.module)}catch(h){return o(h),Promise.reject(h)}})();var hs=a=>(hs=N.Cb)(a),fs=()=>(fs=N.Db)();r._OrtInit=(a,u)=>(r._OrtInit=N.Eb)(a,u),r._OrtGetLastError=(a,u)=>(r._OrtGetLastError=N.Fb)(a,u),r._OrtCreateSessionOptions=(a,u,d,h,y,x,C,A,B,L)=>(r._OrtCreateSessionOptions=N.Gb)(a,u,d,h,y,x,C,A,B,L),r._OrtAppendExecutionProvider=(a,u)=>(r._OrtAppendExecutionProvider=N.Hb)(a,u),r._OrtAddFreeDimensionOverride=(a,u,d)=>(r._OrtAddFreeDimensionOverride=N.Ib)(a,u,d),r._OrtAddSessionConfigEntry=(a,u,d)=>(r._OrtAddSessionConfigEntry=N.Jb)(a,u,d),r._OrtReleaseSessionOptions=a=>(r._OrtReleaseSessionOptions=N.Kb)(a),r._OrtCreateSession=(a,u,d)=>(r._OrtCreateSession=N.Lb)(a,u,d),r._OrtReleaseSession=a=>(r._OrtReleaseSession=N.Mb)(a),r._OrtGetInputOutputCount=(a,u,d)=>(r._OrtGetInputOutputCount=N.Nb)(a,u,d),r._OrtGetInputName=(a,u)=>(r._OrtGetInputName=N.Ob)(a,u),r._OrtGetOutputName=(a,u)=>(r._OrtGetOutputName=N.Pb)(a,u),r._OrtFree=a=>(r._OrtFree=N.Qb)(a),r._OrtCreateTensor=(a,u,d,h,y,x)=>(r._OrtCreateTensor=N.Rb)(a,u,d,h,y,x),r._OrtGetTensorData=(a,u,d,h,y)=>(r._OrtGetTensorData=N.Sb)(a,u,d,h,y),r._OrtReleaseTensor=a=>(r._OrtReleaseTensor=N.Tb)(a),r._OrtCreateRunOptions=(a,u,d,h)=>(r._OrtCreateRunOptions=N.Ub)(a,u,d,h),r._OrtAddRunConfigEntry=(a,u,d)=>(r._OrtAddRunConfigEntry=N.Vb)(a,u,d),r._OrtReleaseRunOptions=a=>(r._OrtReleaseRunOptions=N.Wb)(a),r._OrtCreateBinding=a=>(r._OrtCreateBinding=N.Xb)(a),r._OrtBindInput=(a,u,d)=>(r._OrtBindInput=N.Yb)(a,u,d),r._OrtBindOutput=(a,u,d,h)=>(r._OrtBindOutput=N.Zb)(a,u,d,h),r._OrtClearBoundOutputs=a=>(r._OrtClearBoundOutputs=N._b)(a),r._OrtReleaseBinding=a=>(r._OrtReleaseBinding=N.$b)(a),r._OrtRunWithBinding=(a,u,d,h,y)=>(r._OrtRunWithBinding=N.ac)(a,u,d,h,y),r._OrtRun=(a,u,d,h,y,x,C,A)=>(r._OrtRun=N.bc)(a,u,d,h,y,x,C,A),r._OrtEndProfiling=a=>(r._OrtEndProfiling=N.cc)(a),r._JsepOutput=(a,u,d)=>(r._JsepOutput=N.dc)(a,u,d),r._JsepGetNodeName=a=>(r._JsepGetNodeName=N.ec)(a);var br=()=>(br=N.fc)(),rt=r._free=a=>(rt=r._free=N.gc)(a),xr=r._malloc=a=>(xr=r._malloc=N.ic)(a),mi=(a,u,d,h,y,x)=>(mi=N.kc)(a,u,d,h,y,x),ms=()=>(ms=N.lc)(),gs=(a,u,d,h,y)=>(gs=N.mc)(a,u,d,h,y),ys=a=>(ys=N.nc)(a),gi=a=>(gi=N.oc)(a),_s=(a,u)=>(_s=N.pc)(a,u),ws=()=>(ws=N.qc)(),ae=(a,u)=>(ae=N.rc)(a,u),Kt=a=>(Kt=N.sc)(a),$s=(a,u)=>($s=N.tc)(a,u),re=a=>(re=N.uc)(a),yi=a=>(yi=N.vc)(a),ie=()=>(ie=N.wc)(),vs=a=>(vs=N.xc)(a),bs=a=>(bs=N.yc)(a),xs=(a,u,d)=>(xs=N.zc)(a,u,d),Ss=a=>(Ss=N.Ac)(a),ks=r.dynCall_iii=(a,u,d)=>(ks=r.dynCall_iii=N.Bc)(a,u,d),Ts=r.dynCall_vi=(a,u)=>(Ts=r.dynCall_vi=N.Cc)(a,u),_i=r.dynCall_ii=(a,u)=>(_i=r.dynCall_ii=N.Dc)(a,u),Cs=r.dynCall_vii=(a,u,d)=>(Cs=r.dynCall_vii=N.Ec)(a,u,d),Is=r.dynCall_iiii=(a,u,d,h)=>(Is=r.dynCall_iiii=N.Fc)(a,u,d,h),Es=r.dynCall_viii=(a,u,d,h)=>(Es=r.dynCall_viii=N.Gc)(a,u,d,h),zs=r.dynCall_iiiii=(a,u,d,h,y)=>(zs=r.dynCall_iiiii=N.Hc)(a,u,d,h,y),As=r.dynCall_viiii=(a,u,d,h,y)=>(As=r.dynCall_viiii=N.Ic)(a,u,d,h,y),Os=r.dynCall_viiiiii=(a,u,d,h,y,x,C)=>(Os=r.dynCall_viiiiii=N.Jc)(a,u,d,h,y,x,C),Rs=r.dynCall_viiiiiii=(a,u,d,h,y,x,C,A)=>(Rs=r.dynCall_viiiiiii=N.Kc)(a,u,d,h,y,x,C,A),Bs=r.dynCall_ji=(a,u)=>(Bs=r.dynCall_ji=N.Lc)(a,u),Ns=r.dynCall_v=a=>(Ns=r.dynCall_v=N.Mc)(a),Ms=r.dynCall_viiiii=(a,u,d,h,y,x)=>(Ms=r.dynCall_viiiii=N.Nc)(a,u,d,h,y,x),Ds=r.dynCall_i=a=>(Ds=r.dynCall_i=N.Oc)(a),Ps=r.dynCall_fii=(a,u,d)=>(Ps=r.dynCall_fii=N.Pc)(a,u,d),Us=r.dynCall_viiiiiiii=(a,u,d,h,y,x,C,A,B)=>(Us=r.dynCall_viiiiiiii=N.Qc)(a,u,d,h,y,x,C,A,B),Ws=r.dynCall_viiiiiiiiii=(a,u,d,h,y,x,C,A,B,L,H)=>(Ws=r.dynCall_viiiiiiiiii=N.Rc)(a,u,d,h,y,x,C,A,B,L,H),qs=r.dynCall_jiii=(a,u,d,h)=>(qs=r.dynCall_jiii=N.Sc)(a,u,d,h),Ls=r.dynCall_dii=(a,u,d)=>(Ls=r.dynCall_dii=N.Tc)(a,u,d),Vs=r.dynCall_viiiiiiiii=(a,u,d,h,y,x,C,A,B,L)=>(Vs=r.dynCall_viiiiiiiii=N.Uc)(a,u,d,h,y,x,C,A,B,L),Gs=r.dynCall_viiiiiiiiiii=(a,u,d,h,y,x,C,A,B,L,H,J)=>(Gs=r.dynCall_viiiiiiiiiii=N.Vc)(a,u,d,h,y,x,C,A,B,L,H,J),js=r.dynCall_iiiiii=(a,u,d,h,y,x)=>(js=r.dynCall_iiiiii=N.Wc)(a,u,d,h,y,x),Hs=r.dynCall_iij=(a,u,d)=>(Hs=r.dynCall_iij=N.Xc)(a,u,d),Fs=r.dynCall_iiiiiiiiii=(a,u,d,h,y,x,C,A,B,L)=>(Fs=r.dynCall_iiiiiiiiii=N.Yc)(a,u,d,h,y,x,C,A,B,L),Ks=r.dynCall_iiiiiiiiiii=(a,u,d,h,y,x,C,A,B,L,H)=>(Ks=r.dynCall_iiiiiiiiiii=N.Zc)(a,u,d,h,y,x,C,A,B,L,H),Qs=r.dynCall_vij=(a,u,d)=>(Qs=r.dynCall_vij=N._c)(a,u,d),Zs=r.dynCall_iiif=(a,u,d,h)=>(Zs=r.dynCall_iiif=N.$c)(a,u,d,h),Xs=r.dynCall_iiij=(a,u,d,h)=>(Xs=r.dynCall_iiij=N.ad)(a,u,d,h),Ys=r.dynCall_fiii=(a,u,d,h)=>(Ys=r.dynCall_fiii=N.bd)(a,u,d,h),Js=r.dynCall_viiiiiiiiiiiii=(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)=>(Js=r.dynCall_viiiiiiiiiiiii=N.cd)(a,u,d,h,y,x,C,A,B,L,H,J,le,ve),eo=r.dynCall_vjiii=(a,u,d,h,y)=>(eo=r.dynCall_vjiii=N.dd)(a,u,d,h,y),to=r.dynCall_vif=(a,u,d)=>(to=r.dynCall_vif=N.ed)(a,u,d),ro=r.dynCall_iiiiiii=(a,u,d,h,y,x,C)=>(ro=r.dynCall_iiiiiii=N.fd)(a,u,d,h,y,x,C),io=r.dynCall_iiiij=(a,u,d,h,y)=>(io=r.dynCall_iiiij=N.gd)(a,u,d,h,y),ao=r.dynCall_iiiiiiii=(a,u,d,h,y,x,C,A)=>(ao=r.dynCall_iiiiiiii=N.hd)(a,u,d,h,y,x,C,A),no=r.dynCall_viiiiiiiiiiii=(a,u,d,h,y,x,C,A,B,L,H,J,le)=>(no=r.dynCall_viiiiiiiiiiii=N.id)(a,u,d,h,y,x,C,A,B,L,H,J,le),so=r.dynCall_diii=(a,u,d,h)=>(so=r.dynCall_diii=N.jd)(a,u,d,h),oo=r.dynCall_jiiii=(a,u,d,h,y)=>(oo=r.dynCall_jiiii=N.kd)(a,u,d,h,y),uo=r.dynCall_viiij=(a,u,d,h,y)=>(uo=r.dynCall_viiij=N.ld)(a,u,d,h,y),lo=r.dynCall_fiiii=(a,u,d,h,y)=>(lo=r.dynCall_fiiii=N.md)(a,u,d,h,y),po=r.dynCall_viiif=(a,u,d,h,y)=>(po=r.dynCall_viiif=N.nd)(a,u,d,h,y),co=r.dynCall_diiii=(a,u,d,h,y)=>(co=r.dynCall_diiii=N.od)(a,u,d,h,y),ho=r.dynCall_viiid=(a,u,d,h,y)=>(ho=r.dynCall_viiid=N.pd)(a,u,d,h,y),fo=r.dynCall_iiiijii=(a,u,d,h,y,x,C)=>(fo=r.dynCall_iiiijii=N.qd)(a,u,d,h,y,x,C),mo=r.dynCall_iiiiiij=(a,u,d,h,y,x,C)=>(mo=r.dynCall_iiiiiij=N.rd)(a,u,d,h,y,x,C),go=a=>(go=N.sd)(a),yo=()=>(yo=N.td)(),_o=a=>(_o=N.ud)(a),wo=()=>(wo=N.vd)();function Sg(a,u,d){var h=ie();try{Cs(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function kg(a,u,d){var h=ie();try{return ks(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function Tg(a,u){var d=ie();try{Ts(a,u)}catch(h){if(re(d),h!==h+0)throw h;ae(1,0)}}function Cg(a,u){var d=ie();try{return _i(a,u)}catch(h){if(re(d),h!==h+0)throw h;ae(1,0)}}function Ig(a,u,d,h){var y=ie();try{return Is(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function Eg(a,u,d,h,y){var x=ie();try{As(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function zg(a,u,d,h,y){var x=ie();try{return zs(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function Ag(a,u,d,h){var y=ie();try{Es(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function Og(a,u,d,h,y,x,C){var A=ie();try{return ro(a,u,d,h,y,x,C)}catch(B){if(re(A),B!==B+0)throw B;ae(1,0)}}function Rg(a){var u=ie();try{Ns(a)}catch(d){if(re(u),d!==d+0)throw d;ae(1,0)}}function Bg(a,u,d){var h=ie();try{return Hs(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function Ng(a,u,d,h,y,x){var C=ie();try{Ms(a,u,d,h,y,x)}catch(A){if(re(C),A!==A+0)throw A;ae(1,0)}}function Mg(a,u,d){var h=ie();try{Qs(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function Dg(a,u,d,h,y,x,C){var A=ie();try{Os(a,u,d,h,y,x,C)}catch(B){if(re(A),B!==B+0)throw B;ae(1,0)}}function Pg(a,u,d,h,y,x,C,A){var B=ie();try{Rs(a,u,d,h,y,x,C,A)}catch(L){if(re(B),L!==L+0)throw L;ae(1,0)}}function Ug(a,u,d,h,y,x){var C=ie();try{return js(a,u,d,h,y,x)}catch(A){if(re(C),A!==A+0)throw A;ae(1,0)}}function Wg(a,u,d,h,y,x,C,A){var B=ie();try{return ao(a,u,d,h,y,x,C,A)}catch(L){if(re(B),L!==L+0)throw L;ae(1,0)}}function qg(a,u,d,h,y,x,C,A,B,L){var H=ie();try{Vs(a,u,d,h,y,x,C,A,B,L)}catch(J){if(re(H),J!==J+0)throw J;ae(1,0)}}function Lg(a,u,d,h,y,x,C,A,B){var L=ie();try{Us(a,u,d,h,y,x,C,A,B)}catch(H){if(re(L),H!==H+0)throw H;ae(1,0)}}function Vg(a){var u=ie();try{return Ds(a)}catch(d){if(re(u),d!==d+0)throw d;ae(1,0)}}function Gg(a,u,d,h,y,x,C,A,B,L){var H=ie();try{return Fs(a,u,d,h,y,x,C,A,B,L)}catch(J){if(re(H),J!==J+0)throw J;ae(1,0)}}function jg(a,u,d){var h=ie();try{return Ps(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function Hg(a,u,d,h){var y=ie();try{return qs(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;return ae(1,0),0n}}function Fg(a,u,d){var h=ie();try{return Ls(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function Kg(a,u,d,h,y,x,C,A,B,L,H,J){var le=ie();try{Gs(a,u,d,h,y,x,C,A,B,L,H,J)}catch(ve){if(re(le),ve!==ve+0)throw ve;ae(1,0)}}function Qg(a,u,d,h,y,x,C,A,B,L,H){var J=ie();try{Ws(a,u,d,h,y,x,C,A,B,L,H)}catch(le){if(re(J),le!==le+0)throw le;ae(1,0)}}function Zg(a,u,d,h,y,x,C,A,B,L,H){var J=ie();try{return Ks(a,u,d,h,y,x,C,A,B,L,H)}catch(le){if(re(J),le!==le+0)throw le;ae(1,0)}}function Xg(a,u,d,h){var y=ie();try{return Zs(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function Yg(a,u,d,h){var y=ie();try{return Xs(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function Jg(a,u,d,h){var y=ie();try{return Ys(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function e0(a,u,d,h,y,x,C,A,B,L,H,J,le,ve){var We=ie();try{Js(a,u,d,h,y,x,C,A,B,L,H,J,le,ve)}catch(Qt){if(re(We),Qt!==Qt+0)throw Qt;ae(1,0)}}function t0(a,u,d,h,y){var x=ie();try{eo(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function r0(a,u,d){var h=ie();try{to(a,u,d)}catch(y){if(re(h),y!==y+0)throw y;ae(1,0)}}function i0(a,u){var d=ie();try{return Bs(a,u)}catch(h){if(re(d),h!==h+0)throw h;return ae(1,0),0n}}function a0(a,u,d,h,y){var x=ie();try{return io(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function n0(a,u,d,h,y,x,C,A,B,L,H,J,le){var ve=ie();try{no(a,u,d,h,y,x,C,A,B,L,H,J,le)}catch(We){if(re(ve),We!==We+0)throw We;ae(1,0)}}function s0(a,u,d,h){var y=ie();try{return so(a,u,d,h)}catch(x){if(re(y),x!==x+0)throw x;ae(1,0)}}function o0(a,u,d,h,y){var x=ie();try{return oo(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;return ae(1,0),0n}}function u0(a,u,d,h,y){var x=ie();try{uo(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function l0(a,u,d,h,y){var x=ie();try{return lo(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function d0(a,u,d,h,y){var x=ie();try{po(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function p0(a,u,d,h,y){var x=ie();try{return co(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function c0(a,u,d,h,y){var x=ie();try{ho(a,u,d,h,y)}catch(C){if(re(x),C!==C+0)throw C;ae(1,0)}}function h0(a,u,d,h,y,x,C){var A=ie();try{return fo(a,u,d,h,y,x,C)}catch(B){if(re(A),B!==B+0)throw B;ae(1,0)}}function f0(a,u,d,h,y,x,C){var A=ie();try{return mo(a,u,d,h,y,x,C)}catch(B){if(re(A),B!==B+0)throw B;ae(1,0)}}function m0(){var a=N;a=Object.assign({},a);var u=h=>y=>h(y)>>>0,d=h=>()=>h()>>>0;return a.Cb=u(a.Cb),a.fc=d(a.fc),a.ic=u(a.ic),a.vc=u(a.vc),a.wc=d(a.wc),a.Ac=u(a.Ac),a}r.stackSave=()=>ie(),r.stackRestore=a=>re(a),r.stackAlloc=a=>yi(a),r.setValue=function(a,u,d="i8"){switch(d.endsWith("*")&&(d="*"),d){case"i1":ce()[a>>>0]=u;break;case"i8":ce()[a>>>0]=u;break;case"i16":De()[a>>>1>>>0]=u;break;case"i32":D()[a>>>2>>>0]=u;break;case"i64":ue[a>>>3]=BigInt(u);break;case"float":cr()[a>>>2>>>0]=u;break;case"double":Nt()[a>>>3>>>0]=u;break;case"*":_e()[a>>>2>>>0]=u;break;default:at(`invalid type for setValue: ${d}`)}},r.getValue=function(a,u="i8"){switch(u.endsWith("*")&&(u="*"),u){case"i1":return ce()[a>>>0];case"i8":return ce()[a>>>0];case"i16":return De()[a>>>1>>>0];case"i32":return D()[a>>>2>>>0];case"i64":return ue[a>>>3];case"float":return cr()[a>>>2>>>0];case"double":return Nt()[a>>>3>>>0];case"*":return _e()[a>>>2>>>0];default:at(`invalid type for getValue: ${u}`)}},r.UTF8ToString=Te,r.stringToUTF8=Dt,r.lengthBytesUTF8=In;function wi(){if(0<Mt)jt=wi;else if(f)n(r),pn();else{for(;0<Xr.length;)Xr.shift()(r);0<Mt?jt=wi:(r.calledRun=!0,te||(pn(),n(r)))}}return wi(),r.PTR_SIZE=4,i=s,i})})(),To=ko,Co=globalThis.self?.name?.startsWith("em-pthread"),w0=typeof globalThis.process?.versions?.node=="string";w0&&(Co=(await Promise.resolve().then(()=>(So(),xo))).workerData==="em-pthread");Co&&ko();var Ea=Object.defineProperty,$0=Object.getOwnPropertyDescriptor,v0=Object.getOwnPropertyNames,b0=Object.prototype.hasOwnProperty,x0=(e=>typeof vt<"u"?vt:typeof Proxy<"u"?new Proxy(e,{get:(t,i)=>(typeof vt<"u"?vt:t)[i]}):e)(function(e){if(typeof vt<"u")return vt.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),W=(e,t)=>()=>(e&&(t=e(e=0)),t),Hr=(e,t)=>{for(var i in t)Ea(e,i,{get:t[i],enumerable:!0})},S0=(e,t,i,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of v0(t))!b0.call(e,n)&&n!==i&&Ea(e,n,{get:()=>t[n],enumerable:!(r=$0(t,n))||r.enumerable});return e},za=e=>S0(Ea({},"__esModule",{value:!0}),e),Zt,gt,Et,Io,sp,op=W(()=>{"use strict";Zt=new Map,gt=[],Et=(e,t,i)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let r=Zt.get(e);if(r===void 0)Zt.set(e,{backend:t,priority:i});else{if(r.priority>i)return;if(r.priority===i&&r.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${i}`)}if(i>=0){let n=gt.indexOf(e);n!==-1&&gt.splice(n,1);for(let o=0;o<gt.length;o++)if(Zt.get(gt[o]).priority<=i){gt.splice(o,0,e);return}gt.push(e)}return}throw new TypeError("not a valid backend")},Io=async e=>{let t=Zt.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let i=!!t.initPromise;try{return i||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(r){return i||(t.error=`${r}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},sp=async e=>{let t=e.executionProviders||[],i=t.map(p=>typeof p=="string"?p:p.name),r=i.length===0?gt:i,n,o=[],s=new Set;for(let p of r){let c=await Io(p);typeof c=="string"?o.push({name:p,err:c}):(n||(n=c),n===c&&s.add(p))}if(!n)throw new Error(`no available backend found. ERR: ${o.map(p=>`[${p.name}] ${p.err}`).join(", ")}`);for(let{name:p,err:c}of o)i.includes(p)&&console.warn(`removing requested execution provider "${p}" from session options because it is not available: ${c}`);let l=t.filter(p=>s.has(typeof p=="string"?p:p.name));return[n,new Proxy(e,{get:(p,c)=>c==="executionProviders"?l:Reflect.get(p,c)})]}}),k0=W(()=>{"use strict";op()}),up,T0=W(()=>{"use strict";up="1.21.0"}),xi,Ve,lp=W(()=>{"use strict";T0(),xi="warning",Ve={wasm:{},webgl:{},webgpu:{},versions:{common:up},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);xi=e}},get logLevel(){return xi}},Object.defineProperty(Ve,"logLevel",{enumerable:!0})}),$e,C0=W(()=>{"use strict";lp(),$e=Ve}),dp,pp,I0=W(()=>{"use strict";dp=(e,t)=>{let i=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);i.width=e.dims[3],i.height=e.dims[2];let r=i.getContext("2d");if(r!=null){let n,o;t?.tensorLayout!==void 0&&t.tensorLayout==="NHWC"?(n=e.dims[2],o=e.dims[3]):(n=e.dims[3],o=e.dims[2]);let s=t?.format!==void 0?t.format:"RGB",l=t?.norm,p,c;l===void 0||l.mean===void 0?p=[255,255,255,255]:typeof l.mean=="number"?p=[l.mean,l.mean,l.mean,l.mean]:(p=[l.mean[0],l.mean[1],l.mean[2],0],l.mean[3]!==void 0&&(p[3]=l.mean[3])),l===void 0||l.bias===void 0?c=[0,0,0,0]:typeof l.bias=="number"?c=[l.bias,l.bias,l.bias,l.bias]:(c=[l.bias[0],l.bias[1],l.bias[2],0],l.bias[3]!==void 0&&(c[3]=l.bias[3]));let f=o*n,m=0,g=f,w=f*2,_=-1;s==="RGBA"?(m=0,g=f,w=f*2,_=f*3):s==="RGB"?(m=0,g=f,w=f*2):s==="RBG"&&(m=0,w=f,g=f*2);for(let v=0;v<o;v++)for(let S=0;S<n;S++){let b=(e.data[m++]-c[0])*p[0],$=(e.data[g++]-c[1])*p[1],k=(e.data[w++]-c[2])*p[2],T=_===-1?255:(e.data[_++]-c[3])*p[3];r.fillStyle="rgba("+b+","+$+","+k+","+T+")",r.fillRect(S,v,1,1)}if("toDataURL"in i)return i.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},pp=(e,t)=>{let i=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),r;if(i!=null){let n,o,s;t?.tensorLayout!==void 0&&t.tensorLayout==="NHWC"?(n=e.dims[2],o=e.dims[1],s=e.dims[3]):(n=e.dims[3],o=e.dims[2],s=e.dims[1]);let l=t!==void 0&&t.format!==void 0?t.format:"RGB",p=t?.norm,c,f;p===void 0||p.mean===void 0?c=[255,255,255,255]:typeof p.mean=="number"?c=[p.mean,p.mean,p.mean,p.mean]:(c=[p.mean[0],p.mean[1],p.mean[2],255],p.mean[3]!==void 0&&(c[3]=p.mean[3])),p===void 0||p.bias===void 0?f=[0,0,0,0]:typeof p.bias=="number"?f=[p.bias,p.bias,p.bias,p.bias]:(f=[p.bias[0],p.bias[1],p.bias[2],0],p.bias[3]!==void 0&&(f[3]=p.bias[3]));let m=o*n;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let g=4,w=0,_=1,v=2,S=3,b=0,$=m,k=m*2,T=-1;l==="RGBA"?(b=0,$=m,k=m*2,T=m*3):l==="RGB"?(b=0,$=m,k=m*2):l==="RBG"&&(b=0,k=m,$=m*2),r=i.createImageData(n,o);for(let I=0;I<o*n;w+=g,_+=g,v+=g,S+=g,I++)r.data[w]=(e.data[b++]-f[0])*c[0],r.data[_]=(e.data[$++]-f[1])*c[1],r.data[v]=(e.data[k++]-f[2])*c[2],r.data[S]=T===-1?255:(e.data[T++]-f[3])*c[3]}else throw new Error("Can not access image data");return r}}),Sr,cp,hp,fp,mp,gp,E0=W(()=>{"use strict";Aa(),Sr=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:i,width:r}=t,n=t.norm??{mean:255,bias:0},o,s;typeof n.mean=="number"?o=[n.mean,n.mean,n.mean,n.mean]:o=[n.mean[0],n.mean[1],n.mean[2],n.mean[3]??255],typeof n.bias=="number"?s=[n.bias,n.bias,n.bias,n.bias]:s=[n.bias[0],n.bias[1],n.bias[2],n.bias[3]??0];let l=t.format!==void 0?t.format:"RGBA",p=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",c=i*r,f=p==="RGBA"?new Float32Array(c*4):new Float32Array(c*3),m=4,g=0,w=1,_=2,v=3,S=0,b=c,$=c*2,k=-1;l==="RGB"&&(m=3,g=0,w=1,_=2,v=-1),p==="RGBA"?k=c*3:p==="RBG"?(S=0,$=c,b=c*2):p==="BGR"&&($=0,b=c,S=c*2);for(let T=0;T<c;T++,g+=m,_+=m,w+=m,v+=m)f[S++]=(e[g]+s[0])/o[0],f[b++]=(e[w]+s[1])/o[1],f[$++]=(e[_]+s[2])/o[2],k!==-1&&v!==-1&&(f[k++]=(e[v]+s[3])/o[3]);return p==="RGBA"?new Ne("float32",f,[1,4,i,r]):new Ne("float32",f,[1,3,i,r])},cp=async(e,t)=>{let i=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,r=typeof ImageData<"u"&&e instanceof ImageData,n=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,o=typeof e=="string",s,l=t??{},p=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},c=f=>typeof HTMLCanvasElement<"u"&&f instanceof HTMLCanvasElement||f instanceof OffscreenCanvas?f.getContext("2d"):null;if(i){let f=p();f.width=e.width,f.height=e.height;let m=c(f);if(m!=null){let g=e.height,w=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(g=t.resizedHeight,w=t.resizedWidth),t!==void 0){if(l=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");l.tensorFormat="RGBA",l.height=g,l.width=w}else l.tensorFormat="RGBA",l.height=g,l.width=w;m.drawImage(e,0,0),s=m.getImageData(0,0,w,g).data}else throw new Error("Can not access image data")}else if(r){let f,m;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(f=t.resizedHeight,m=t.resizedWidth):(f=e.height,m=e.width),t!==void 0&&(l=t),l.format="RGBA",l.height=f,l.width=m,t!==void 0){let g=p();g.width=m,g.height=f;let w=c(g);if(w!=null)w.putImageData(e,0,0),s=w.getImageData(0,0,m,f).data;else throw new Error("Can not access image data")}else s=e.data}else if(n){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let f=p();f.width=e.width,f.height=e.height;let m=c(f);if(m!=null){let g=e.height,w=e.width;return m.drawImage(e,0,0,w,g),s=m.getImageData(0,0,w,g).data,l.height=g,l.width=w,Sr(s,l)}else throw new Error("Can not access image data")}else{if(o)return new Promise((f,m)=>{let g=p(),w=c(g);if(!e||!w)return m();let _=new Image;_.crossOrigin="Anonymous",_.src=e,_.onload=()=>{g.width=_.width,g.height=_.height,w.drawImage(_,0,0,g.width,g.height);let v=w.getImageData(0,0,g.width,g.height);l.height=g.height,l.width=g.width,f(Sr(v.data,l))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return Sr(s,l);throw new Error("Input data provided is not supported - aborted tensor creation")},hp=(e,t)=>{let{width:i,height:r,download:n,dispose:o}=t,s=[1,r,i,4];return new Ne({location:"texture",type:"float32",texture:e,dims:s,download:n,dispose:o})},fp=(e,t)=>{let{dataType:i,dims:r,download:n,dispose:o}=t;return new Ne({location:"gpu-buffer",type:i??"float32",gpuBuffer:e,dims:r,download:n,dispose:o})},mp=(e,t)=>{let{dataType:i,dims:r,download:n,dispose:o}=t;return new Ne({location:"ml-tensor",type:i??"float32",mlTensor:e,dims:r,download:n,dispose:o})},gp=(e,t,i)=>new Ne({location:"cpu-pinned",type:e,data:t,dims:i??[t.length]})}),Tt,nr,Si,yp,z0=W(()=>{"use strict";Tt=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),nr=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Si=!1,yp=()=>{if(!Si){Si=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,i=globalThis.Float16Array,r=typeof i<"u"&&i.from;e&&(Tt.set("int64",BigInt64Array),nr.set(BigInt64Array,"int64")),t&&(Tt.set("uint64",BigUint64Array),nr.set(BigUint64Array,"uint64")),r?(Tt.set("float16",i),nr.set(i,"float16")):Tt.set("float16",Uint16Array)}}}),_p,wp,A0=W(()=>{"use strict";Aa(),_p=e=>{let t=1;for(let i=0;i<e.length;i++){let r=e[i];if(typeof r!="number"||!Number.isSafeInteger(r))throw new TypeError(`dims[${i}] must be an integer, got: ${r}`);if(r<0)throw new RangeError(`dims[${i}] must be a non-negative integer, got: ${r}`);t*=r}return t},wp=(e,t)=>{switch(e.location){case"cpu":return new Ne(e.type,e.data,t);case"cpu-pinned":return new Ne({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Ne({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Ne({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Ne({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Ne,Aa=W(()=>{"use strict";I0(),E0(),z0(),A0(),Ne=class{constructor(e,t,i){yp();let r,n;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,r=e.type,n=e.dims,e.location){case"cpu-pinned":{let s=Tt.get(r);if(!s)throw new TypeError(`unsupported type "${r}" to create tensor from pinned buffer`);if(!(e.data instanceof s))throw new TypeError(`buffer should be of type ${s.name}`);this.cpuData=e.data;break}case"texture":{if(r!=="float32")throw new TypeError(`unsupported type "${r}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(r!=="float32"&&r!=="float16"&&r!=="int32"&&r!=="int64"&&r!=="uint32"&&r!=="uint8"&&r!=="bool"&&r!=="uint4"&&r!=="int4")throw new TypeError(`unsupported type "${r}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(r!=="float32"&&r!=="float16"&&r!=="int32"&&r!=="int64"&&r!=="uint32"&&r!=="uint64"&&r!=="int8"&&r!=="uint8"&&r!=="bool"&&r!=="uint4"&&r!=="int4")throw new TypeError(`unsupported type "${r}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let s,l;if(typeof e=="string")if(r=e,l=i,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");s=t}else{let p=Tt.get(e);if(p===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&p===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${p.name} as data.`);e==="uint64"||e==="int64"?s=p.from(t,BigInt):s=p.from(t)}else if(t instanceof p)s=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")s=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&p!==Uint16Array)s=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${r} tensor's data must be type of ${p}`)}else if(l=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let p=typeof e[0];if(p==="string")r="string",s=e;else if(p==="boolean")r="bool",s=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${p}.`)}else if(e instanceof Uint8ClampedArray)r="uint8",s=Uint8Array.from(e);else{let p=nr.get(e.constructor);if(p===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);r=p,s=e}if(l===void 0)l=[s.length];else if(!Array.isArray(l))throw new TypeError("A tensor's dims must be a number array");n=l,this.cpuData=s,this.dataLocation="cpu"}let o=_p(n);if(this.cpuData&&o!==this.cpuData.length&&!((r==="uint4"||r==="int4")&&Math.ceil(o/2)===this.cpuData.length))throw new Error(`Tensor's size(${o}) does not match data length(${this.cpuData.length}).`);this.type=r,this.dims=n,this.size=o}static async fromImage(e,t){return cp(e,t)}static fromTexture(e,t){return hp(e,t)}static fromGpuBuffer(e,t){return fp(e,t)}static fromMLTensor(e,t){return mp(e,t)}static fromPinnedBuffer(e,t,i){return gp(e,t,i)}toDataURL(e){return dp(this,e)}toImageData(e){return pp(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return wp(this,e)}}}),Xe,$p=W(()=>{"use strict";Aa(),Xe=Ne}),dr,ki,Ye,Ge,vp=W(()=>{"use strict";lp(),dr=(e,t)=>{(typeof Ve.trace>"u"?!Ve.wasm.trace:!Ve.trace)||console.timeStamp(`${e}::ORT::${t}`)},ki=(e,t)=>{let i=new Error().stack?.split(/\r\n|\r|\n/g)||[],r=!1;for(let n=0;n<i.length;n++){if(r&&!i[n].includes("TRACE_FUNC")){let o=`FUNC_${e}::${i[n].trim().split(" ")[1]}`;t&&(o+=`::${t}`),dr("CPU",o);return}i[n].includes("TRACE_FUNC")&&(r=!0)}},Ye=e=>{(typeof Ve.trace>"u"?!Ve.wasm.trace:!Ve.trace)||ki("BEGIN",e)},Ge=e=>{(typeof Ve.trace>"u"?!Ve.wasm.trace:!Ve.trace)||ki("END",e)}}),bp,O0=W(()=>{"use strict";op(),$p(),vp(),bp=class xp{constructor(t){this.handler=t}async run(t,i,r){Ye();let n={},o={};if(typeof t!="object"||t===null||t instanceof Xe||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof i=="object"){if(i===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(i instanceof Xe)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(i)){if(i.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let c of i){if(typeof c!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(c)===-1)throw new RangeError(`'fetches' contains invalid output name: ${c}.`);n[c]=null}if(typeof r=="object"&&r!==null)o=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else{let c=!1,f=Object.getOwnPropertyNames(i);for(let m of this.outputNames)if(f.indexOf(m)!==-1){let g=i[m];(g===null||g instanceof Xe)&&(c=!0,s=!1,n[m]=g)}if(c){if(typeof r=="object"&&r!==null)o=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else o=i}}else if(typeof i<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let c of this.inputNames)if(typeof t[c]>"u")throw new Error(`input '${c}' is missing in 'feeds'.`);if(s)for(let c of this.outputNames)n[c]=null;let l=await this.handler.run(t,n,o),p={};for(let c in l)if(Object.hasOwnProperty.call(l,c)){let f=l[c];f instanceof Xe?p[c]=f:p[c]=new Xe(f.type,f.data,f.dims)}return Ge(),p}async release(){return this.handler.dispose()}static async create(t,i,r,n){Ye();let o,s={};if(typeof t=="string"){if(o=t,typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(o=t,typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let f=t,m=0,g=t.byteLength;if(typeof i=="object"&&i!==null)s=i;else if(typeof i=="number"){if(m=i,!Number.isSafeInteger(m))throw new RangeError("'byteOffset' must be an integer.");if(m<0||m>=f.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${f.byteLength}).`);if(g=t.byteLength-m,typeof r=="number"){if(g=r,!Number.isSafeInteger(g))throw new RangeError("'byteLength' must be an integer.");if(g<=0||m+g>f.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${f.byteLength-m}].`);if(typeof n=="object"&&n!==null)s=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(typeof r<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof i<"u")throw new TypeError("'options' must be an object.");o=new Uint8Array(f,m,g)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[l,p]=await sp(s),c=await l.createInferenceSessionHandler(o,p);return Ge(),new xp(c)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}}}),Oa,R0=W(()=>{"use strict";O0(),Oa=bp}),B0=W(()=>{"use strict"}),N0=W(()=>{"use strict"}),M0=W(()=>{"use strict"}),D0=W(()=>{"use strict"}),Sp={};Hr(Sp,{InferenceSession:()=>Oa,TRACE:()=>dr,TRACE_FUNC_BEGIN:()=>Ye,TRACE_FUNC_END:()=>Ge,Tensor:()=>Xe,env:()=>$e,registerBackend:()=>Et});var Je=W(()=>{"use strict";k0(),C0(),R0(),$p(),B0(),N0(),vp(),M0(),D0()}),Ra=W(()=>{"use strict"}),kp={};Hr(kp,{default:()=>Tp});var Eo,Ti,Tp,P0=W(()=>{"use strict";Cf(),Rt(),Na(),Eo="ort-wasm-proxy-worker",Ti=globalThis.self?.name===Eo,Ti&&(self.onmessage=e=>{let{type:t,in:i}=e.data;try{switch(t){case"init-wasm":Ma(i.wasm).then(()=>{en(i).then(()=>{postMessage({type:t})},r=>{postMessage({type:t,err:r})})},r=>{postMessage({type:t,err:r})});break;case"init-ep":{let{epName:r,env:n}=i;tn(n,r).then(()=>{postMessage({type:t})},o=>{postMessage({type:t,err:o})});break}case"copy-from":{let{buffer:r}=i,n=jr(r);postMessage({type:t,out:n});break}case"create":{let{model:r,options:n}=i;rn(r,n).then(o=>{postMessage({type:t,out:o})},o=>{postMessage({type:t,err:o})});break}case"release":an(i),postMessage({type:t});break;case"run":{let{sessionId:r,inputIndices:n,inputs:o,outputIndices:s,options:l}=i;nn(r,n,o,s,new Array(s.length).fill(null),l).then(p=>{p.some(c=>c[3]!=="cpu")?postMessage({type:t,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:t,out:p},on([...o,...p]))},p=>{postMessage({type:t,err:p})});break}case"end-profiling":sn(i),postMessage({type:t});break;default:}}catch(r){postMessage({type:t,err:r})}}),Tp=Ti?null:e=>(()=>{throw new Error("This verified runtime supports the single-thread backend only")})()}),Ci,zo,qe,Ba,kr,Ao,Oo,Ii,Ro,Ei,Cp,zi,Ip,Na=W(()=>{"use strict";Ra(),Ci=typeof location>"u"?void 0:location.origin,zo=()=>"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs".startsWith("file:")?new URL(new URL("ort.webgpu.min.mjs","https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs").href,Ci).href:"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs",qe=zo(),Ba=()=>{if(qe&&!qe.startsWith("blob:"))return qe.substring(0,qe.lastIndexOf("/")+1)},kr=(e,t)=>{try{let i=t??qe;return(i?new URL(e,i):new URL(e)).origin===Ci}catch{return!1}},Ao=(e,t)=>{let i=t??qe;try{return(i?new URL(e,i):new URL(e)).href}catch{return}},Oo=(e,t)=>`${t??"./"}${e}`,Ii=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Ro=async e=>(await Promise.resolve({default:To})).default,Ei=(P0(),za(kp)).default,Cp=async()=>{if(!qe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(kr(qe))return[void 0,Ei()];let e=await Ii(qe);return[e,Ei(e)]},zi=void 0,Ip=async(e,t,i)=>{if(!e&&!t&&zi&&qe&&kr(qe))return[void 0,zi];{let r="ort-wasm-simd-threaded.jsep.mjs",n=e??Ao(r,t),o=i&&n&&!kr(n,t),s=o?await Ii(n):n??Oo(r,t);return[o?s:void 0,await Ro(s)]}}}),Ai,Tr,Xt,Oi,Bo,No,Ma,Ie,Rt=W(()=>{"use strict";Na(),Tr=!1,Xt=!1,Oi=!1,Bo=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},No=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Ma=async e=>{if(Tr)return Promise.resolve();if(Xt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Oi)throw new Error("previous call to 'initializeWebAssembly()' failed.");Xt=!0;let t=e.initTimeout,i=e.numThreads;if(!No())throw new Error("WebAssembly SIMD is not supported in the current environment.");let r=Bo();i>1&&!r&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+i+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=i=1);let n=e.wasmPaths,o=typeof n=="string"?n:void 0,s=n?.mjs,l=s?.href??s,p=n?.wasm,c=p?.href??p,f=e.wasmBinary,[m,g]=await Ip(l,o,i>1),w=!1,_=[];if(t>0&&_.push(new Promise(v=>{setTimeout(()=>{w=!0,v()},t)})),_.push(new Promise((v,S)=>{let b={numThreads:i};if(f)b.wasmBinary=f;else if(c||o)b.locateFile=$=>c??o+$;else if(l&&l.indexOf("blob:")!==0)b.locateFile=$=>new URL($,l).href;else if(m){let $=Ba();$&&(b.locateFile=k=>$+k)}g(b).then($=>{Xt=!1,Tr=!0,Ai=$,v(),m&&URL.revokeObjectURL(m)},$=>{Xt=!1,Oi=!0,S($)})})),await Promise.race(_),w)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},Ie=()=>{if(Tr&&Ai)return Ai;throw new Error("WebAssembly is not initialized yet.")}}),Ae,Wr,ge,Da=W(()=>{"use strict";Rt(),Ae=(e,t)=>{let i=Ie(),r=i.lengthBytesUTF8(e)+1,n=i._malloc(r);return i.stringToUTF8(e,n,r),t.push(n),n},Wr=(e,t,i,r)=>{if(typeof e=="object"&&e!==null){if(i.has(e))throw new Error("Circular reference in options");i.add(e)}Object.entries(e).forEach(([n,o])=>{let s=t?t+n:n;if(typeof o=="object")Wr(o,s+".",i,r);else if(typeof o=="string"||typeof o=="number")r(s,o.toString());else if(typeof o=="boolean")r(s,o?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof o}`)})},ge=e=>{let t=Ie(),i=t.stackSave();try{let r=t.PTR_SIZE,n=t.stackAlloc(2*r);t._OrtGetLastError(n,n+r);let o=Number(t.getValue(n,r===4?"i32":"i64")),s=t.getValue(n+r,"*"),l=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${o}, ERROR_MESSAGE: ${l}`)}finally{t.stackRestore(i)}}}),Ep,U0=W(()=>{"use strict";Rt(),Da(),Ep=e=>{let t=Ie(),i=0,r=[],n=e||{};try{if(e?.logSeverityLevel===void 0)n.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if(e?.logVerbosityLevel===void 0)n.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);e?.terminate===void 0&&(n.terminate=!1);let o=0;return e?.tag!==void 0&&(o=Ae(e.tag,r)),i=t._OrtCreateRunOptions(n.logSeverityLevel,n.logVerbosityLevel,!!n.terminate,o),i===0&&ge("Can't create run options."),e?.extra!==void 0&&Wr(e.extra,"",new WeakSet,(s,l)=>{let p=Ae(s,r),c=Ae(l,r);t._OrtAddRunConfigEntry(i,p,c)!==0&&ge(`Can't set a run config entry: ${s} - ${l}.`)}),[i,r]}catch(o){throw i!==0&&t._OrtReleaseRunOptions(i),r.forEach(s=>t._free(s)),o}}}),Mo,Do,Po,Uo,zp,W0=W(()=>{"use strict";Rt(),Da(),Mo=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Do=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Po=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(i=>(typeof i=="string"?i:i.name)==="webgpu")&&(e.enableMemPattern=!1)},Uo=(e,t,i)=>{for(let r of t){let n=typeof r=="string"?r:r.name;switch(n){case"webnn":if(n="WEBNN",typeof r!="string"){let s=r?.deviceType;if(s){let l=Ae("deviceType",i),p=Ae(s,i);Ie()._OrtAddSessionConfigEntry(e,l,p)!==0&&ge(`Can't set a session config entry: 'deviceType' - ${s}.`)}}break;case"webgpu":if(n="JS",typeof r!="string"){let s=r;if(s?.preferredLayout){if(s.preferredLayout!=="NCHW"&&s.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${s.preferredLayout}`);let l=Ae("preferredLayout",i),p=Ae(s.preferredLayout,i);Ie()._OrtAddSessionConfigEntry(e,l,p)!==0&&ge(`Can't set a session config entry: 'preferredLayout' - ${s.preferredLayout}.`)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${n}`)}let o=Ae(n,i);Ie()._OrtAppendExecutionProvider(e,o)!==0&&ge(`Can't append execution provider: ${n}.`)}},zp=e=>{let t=Ie(),i=0,r=[],n=e||{};Po(n);try{let o=Mo(n.graphOptimizationLevel??"all"),s=Do(n.executionMode??"sequential"),l=typeof n.logId=="string"?Ae(n.logId,r):0,p=n.logSeverityLevel??2;if(!Number.isInteger(p)||p<0||p>4)throw new Error(`log serverity level is not valid: ${p}`);let c=n.logVerbosityLevel??0;if(!Number.isInteger(c)||c<0||c>4)throw new Error(`log verbosity level is not valid: ${c}`);let f=typeof n.optimizedModelFilePath=="string"?Ae(n.optimizedModelFilePath,r):0;if(i=t._OrtCreateSessionOptions(o,!!n.enableCpuMemArena,!!n.enableMemPattern,s,!!n.enableProfiling,0,l,p,c,f),i===0&&ge("Can't create session options."),n.executionProviders&&Uo(i,n.executionProviders,r),n.enableGraphCapture!==void 0){if(typeof n.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${n.enableGraphCapture}`);let m=Ae("enableGraphCapture",r),g=Ae(n.enableGraphCapture.toString(),r);t._OrtAddSessionConfigEntry(i,m,g)!==0&&ge(`Can't set a session config entry: 'enableGraphCapture' - ${n.enableGraphCapture}.`)}if(n.freeDimensionOverrides)for(let[m,g]of Object.entries(n.freeDimensionOverrides)){if(typeof m!="string")throw new Error(`free dimension override name must be a string: ${m}`);if(typeof g!="number"||!Number.isInteger(g)||g<0)throw new Error(`free dimension override value must be a non-negative integer: ${g}`);let w=Ae(m,r);t._OrtAddFreeDimensionOverride(i,w,g)!==0&&ge(`Can't set a free dimension override: ${m} - ${g}.`)}return n.extra!==void 0&&Wr(n.extra,"",new WeakSet,(m,g)=>{let w=Ae(m,r),_=Ae(g,r);t._OrtAddSessionConfigEntry(i,w,_)!==0&&ge(`Can't set a session config entry: ${m} - ${g}.`)}),[i,r]}catch(o){throw i!==0&&t._OrtReleaseSessionOptions(i)!==0&&ge("Can't release session options."),r.forEach(s=>t._free(s)),o}}}),Wt,Ct,It,Pa,qr,Ua,Wa,ma,ee=W(()=>{"use strict";Wt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},Ct=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},It=(e,t)=>{let i=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],r=typeof t=="number"?t:t.reduce((n,o)=>n*o,1);return i>0?Math.ceil(r*i):void 0},Pa=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},qr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Ua=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Wa=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",ma=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),qa,Ap=W(()=>{"use strict";Ra(),qa=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let i=t.headers.get("Content-Length"),r=i?parseInt(i,10):0;if(r<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let n=t.body.getReader(),o;try{o=new ArrayBuffer(r)}catch(l){if(l instanceof RangeError){let p=Math.ceil(r/65536);o=new WebAssembly.Memory({initial:p,maximum:p}).buffer}else throw l}let s=0;for(;;){let{done:l,value:p}=await n.read();if(l)break;let c=p.byteLength;new Uint8Array(o,s,c).set(p),s+=c}return new Uint8Array(o,0,r)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Wo,qo,Lo,Vo,La,Go,he,ut=W(()=>{"use strict";ee(),Wo=["V","I","W","E","F"],qo=(e,t)=>{console.log(`[${Wo[e]},${new Date().toISOString()}]${t}`)},La=(e,t)=>{Lo=e,Vo=t},Go=(e,t)=>{let i=qr(e),r=qr(Lo);i>=r&&qo(i,typeof t=="function"?t():t)},he=(...e)=>{Vo&&Go(...e)}}),Va,Op=W(()=>{"use strict";ee(),Va=(e,t)=>new(Pa(t))(e)}),Ga=W(()=>{"use strict"}),Ri,Cr,Ir,jo,Ho,Bi,ga,Fo,Rp,q0=W(()=>{"use strict";ut(),Ga(),Ri=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),Cr=[],Ir=e=>Math.ceil(Number(e)/16)*16,jo=e=>{for(let t=0;t<Cr.length;t++){let i=Cr[t];if(e<=i)return i}return Math.ceil(e/16)*16},Ho=1,Bi=()=>Ho++,ga=async(e,t,i,r)=>{let n=Ir(i),o=e.device.createBuffer({size:n,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,o,0,n),e.flush(),await o.mapAsync(GPUMapMode.READ);let l=o.getMappedRange();if(r){let p=r();return p.set(new Uint8Array(l,0,i)),p}else return new Uint8Array(l.slice(0,i))}finally{o.destroy()}},Fo=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of Ri)Cr.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let i=t.buffer,r=t.byteOffset,n=t.byteLength,o=Ir(n),s=this.storageCache.get(e);if(!s)throw new Error("gpu data for uploading does not exist");if(Number(s.originalSize)!==n)throw new Error(`inconsistent data size. gpu data size=${s.originalSize}, data size=${n}`);let l=this.backend.device.createBuffer({mappedAtCreation:!0,size:o,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),p=l.getMappedRange();new Uint8Array(p).set(new Uint8Array(i,r,n)),l.unmap();let c=this.backend.device.createCommandEncoder();c.copyBufferToBuffer(l,0,s.gpuData.buffer,0,o),this.backend.device.queue.submit([c.finish()]),l.destroy(),he("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let i=this.storageCache.get(e);if(!i)throw new Error("source gpu data for memcpy does not exist");let r=this.storageCache.get(t);if(!r)throw new Error("destination gpu data for memcpy does not exist");if(i.originalSize!==r.originalSize)throw new Error("inconsistent source and destination gpu data size");let n=Ir(i.originalSize),o=this.backend.getCommandEncoder();this.backend.endComputePass(),o.copyBufferToBuffer(i.gpuData.buffer,0,r.gpuData.buffer,0,n)}registerExternalBuffer(e,t,i){let r;if(i){if(r=i[0],e===i[1])return he("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, buffer is the same, skip.`),r;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else r=Bi();return this.storageCache.set(r,{gpuData:{id:r,type:0,buffer:e},originalSize:t}),he("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, registered.`),r}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),he("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let i=jo(e),r,n=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,o=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(n||o){let l=(n?this.freeBuffers:this.freeUniformBuffers).get(i);l?l.length>0?r=l.pop():r=this.backend.device.createBuffer({size:i,usage:t}):r=this.backend.device.createBuffer({size:i,usage:t})}else r=this.backend.device.createBuffer({size:i,usage:t});let s={id:Bi(),type:0,buffer:r};return this.storageCache.set(s.id,{gpuData:s,originalSize:Number(e)}),he("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${s.id}`),s}get(e){return this.storageCache.get(e)?.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,i=this.storageCache.get(t);if(!i){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return he("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${i.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(i.gpuData.buffer),i.originalSize}async download(e,t){let i=this.storageCache.get(Number(e));if(!i)throw new Error("data does not exist");await ga(this.backend,i.gpuData.buffer,i.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=Ri.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let i=this.freeBuffers.get(e.size)||[];t===void 0||i.length>=t?e.destroy():i.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let i=this.freeUniformBuffers.get(e.size)||[];t===void 0||i.length>=t?e.destroy():i.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(i=>{i.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(he("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(i=>{i.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Rp=(...e)=>new Fo(...e)}),Ko,ye,ke=W(()=>{"use strict";Ko=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},ye=e=>new Ko(e)}),Qo,Lt,O,Lr,Bp,Np,Mp,ne=W(()=>{"use strict";Qo=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},Lt=class{static calcShape(e,t,i=!1){let r=e.length,n=t.length;if(r===0)return t;if(n===0)return e;let o=Math.max(e.length,t.length),s=new Array(o);if(i){if(r<2||n<2)return;let l=Qo.calcMatMulShape([e[r-2],e[r-1]],[t[n-2],t[n-1]]);if(l===void 0)return;[s[o-2],s[o-1]]=l}for(let l=i?3:1;l<=o;l++){let p=r-l<0?1:e[r-l],c=n-l<0?1:t[n-l];if(p!==c&&p>1&&c>1)return;let f=Math.max(p,c);if(p&&c)s[o-l]=Math.max(p,c);else{if(f>1)return;s[o-l]=0}}return s}static isValidBroadcast(e,t){let i=e.length,r=t.length;if(i>r)return!1;for(let n=1;n<=i;n++)if(e[i-n]!==1&&e[i-n]!==t[r-n])return!1;return!0}},O=class Pr{static size(t){return Pr.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,i=4){let r=t.length;if(r===0)return[];let n=new Array(r),o=r-1;for(;o>=0;){if(t[o]%i===0){n[o]=t[o]/i;break}if(i%t[o]!==0)throw new Error("cannot convert shape");n[o]=1,i/=t[o],o--}for(o--;o>=0;o--)n[o]=t[o];return n}static sizeFromDimension(t,i){if(i<0||i>t.length)throw new Error(`invalid dimension of ${i} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Pr.getSizeFromDimensionRange(t,i,t.length)}static sizeToDimension(t,i){if(i<0||i>t.length)throw new Error(`invalid dimension of ${i} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Pr.getSizeFromDimensionRange(t,0,i)}static getSizeFromDimensionRange(t,i,r){let n=1;for(let o=i;o<r;o++){if(t[o]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");n*=Number(t[o])}return n}static computeStrides(t){let i=t.length;if(i===0)return[];if(i===1)return[1];let r=new Array(i);r[i-1]=1,r[i-2]=t[i-1];for(let n=i-3;n>=0;--n)r[n]=r[n+1]*t[n+1];return r}static normalizeAxis(t,i){if(t<-i&&t>=i)throw new Error("unsupported axis for this operation.");return t<0?t+i:t}static normalizeAxes(t,i){return t.map(r=>this.normalizeAxis(r,i??t.length))}static sortBasedOnPerm(t,i){return i?i.map(r=>t[r]):t.slice().reverse()}static padShape(t,i){let r=t.length;return t.map((n,o)=>n+i[o]+i[o+r])}static areEqual(t,i){return t.length!==i.length?!1:t.every((r,n)=>r===i[n])}},Lr=class sr{static adjustPoolAttributes(t,i,r,n,o,s){if(!t&&r.length!==i.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let l=0;l<i.length-2;l++)l>=r.length?r.push(i[l+2]):r[l]=i[l+2];for(let l=0;l<r.length;l++)if(l<n.length){if(n[l]<0)throw new Error("strides should be greater than or equal to 1")}else n.push(1);for(let l=0;l<r.length;l++)if(l<o.length){if(o[l]<0)throw new Error("dilations should be greater than or equal to 1")}else o.push(1);for(let l=0;l<r.length*2;l++)if(l<s.length){if(s[l]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let l=0;l<r.length;l++){if(r[l]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[l]>=r[l]||s[l+r.length]>=r[l])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,i,r,n,o,s,l){if(l){if(o.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(i.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(n.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let p=0;p<t.length-2;p++)sr.adjustPadAndReturnShape(t[p+(s?1:2)],i[p],r[p],n[p],o,p,p+t.length-2,l)}}static computePoolOutputShape(t,i,r,n,o,s,l){if(i.length<=0)throw new Error("input shape must be of size greater than 0");let p=[i[0],i[1]];return sr.computeShapeHelper(t,i,p,r,n,o,s,l),p}static computeConvOutputShape(t,i,r,n,o,s,l){if(t.length<=0||i.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let p=[t[0],i[0]];return sr.computeShapeHelper(!1,t,p,r,n,o,s,l),p}static computeShapeHelper(t,i,r,n,o,s,l,p){if(t)for(let c=0;c<i.length-2;c++)r.push(1);else for(let c=0;c<i.length-2;c++)r.push(sr.adjustPadAndReturnShape(i[c+2],n[c],o[c],s[c],l,c,c+i.length-2,p))}static adjustPadAndReturnShape(t,i,r,n,o,s,l,p){let c=r*(n-1)+1;if(p&&p!=="NOTSET")switch(p){case"VALID":return o[s]=0,o[l]=0,Math.floor((t-c)/i+1);case"SAME_LOWER":case"SAME_UPPER":if(r!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let f=((t+i-1)/i-1)*i+n-t;return o[s]=Math.floor(p==="SAME_LOWER"?(f+1)/2:f/2),o[l]=f-o[s],Math.floor((t+f-n)/i+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+o[s]+o[l]-c)/i+1)}},Bp=class{static getShapeOfGemmResult(e,t,i,r,n){if(e.length!==2||i.length!==2)throw new Error("shape need to be of size 2");let o,s,l;t?(o=e[1],s=e[0]):(o=e[0],s=e[1]);let p=-1;if(r?(l=i[0],p=1):(l=i[1],p=0),i[p]!==s)throw new Error("dimension mismatch");if(o<=0||l<=0||s<=0)throw new Error("invalid shape specified");if(n&&!Lt.isValidBroadcast(n,[o,l]))throw new Error("gemm: invalid bias shape for broadcast");return[o,l,s]}},Np=-34028234663852886e22,Mp=34028234663852886e22}),Vt,Er,Ee,Oe,Z,Se,ya,qt,wt,Q,Yt,R,K,Dp,ja,Zo,Pp,se=W(()=>{"use strict";ee(),ne(),Vt=64,Er=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},Ee=(e,t=1)=>{let i=Er(e,t);return typeof i=="string"?i:i[0]},Oe=(e,t=1)=>{let i=Er(e,t);return typeof i=="string"?i:i[1]},Z=(...e)=>{let t=[];return e.forEach(i=>{i.length!==0&&t.push({type:12,data:i},{type:12,data:O.computeStrides(i)})}),t},Se=e=>e%4===0?4:e%2===0?2:1,ya=(e="f32",t,i="0")=>!t||t===1?`${e}(${i})`:`vec${t}<${e}>(${i})`,qt=(e,t,i)=>e==="f32"?i:t===1?`f32(${i})`:`vec${t}<f32>(${i})`,wt=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,Q=(e,t,i,r)=>e.startsWith("uniforms.")&&i>4?typeof t=="string"?r==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:r==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:i>1?`${e}[${t}]`:e,Yt=(e,t,i,r,n)=>{let o=typeof i=="number",s=o?i:i.length,l=[...new Array(s).keys()],p=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,c=Er(t,n),f=typeof c=="string"?c:c[1],m=typeof c=="string"?c:c[0],g={indices:p,value:f,storage:m,tensor:t},w=P=>typeof P=="string"?P:`${P}u`,_={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},v=o?"uniforms.":"",S=`${v}${e}_shape`,b=`${v}${e}_strides`,$="";for(let P=0;P<s-1;P++)$+=`
    let dim${P} = current / ${Q(b,P,s)};
    let rest${P} = current % ${Q(b,P,s)};
    indices[${P}] = dim${P};
    current = rest${P};
    `;$+=`indices[${s-1}] = current;`;let k=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${g.indices} {
    var indices: ${g.indices};
    var current = offset;
    ${$}
    return indices;
  }`,T=P=>(_.offsetToIndices=!0,s<2?P:`o2i_${e}(${P})`),I=[];if(s>=2)for(let P=s-1;P>=0;P--)I.push(`${Q(b,P,s)} * (indices[${P}])`);let E=s<2?"":`
  fn i2o_${e}(indices: ${g.indices}) -> u32 {
    return ${I.join("+")};
  }`,z=P=>(_.indicesToOffset=!0,s<2?P:`i2o_${e}(${P})`),M=(...P)=>s===0?"0u":`${g.indices}(${P.map(w).join(",")})`,U=(P,j)=>s<2?`${P}`:`${Q(P,j,s)}`,V=(P,j,ue)=>s<2?`${P}=${ue};`:`${Q(P,j,s)}=${ue};`,X={},F=(P,j)=>{_.broadcastedIndicesToOffset=!0;let ue=`${j.name}broadcastedIndicesTo${e}Offset`;if(ue in X)return`${ue}(${P})`;let we=[];for(let Ce=s-1;Ce>=0;Ce--){let je=j.indicesGet("outputIndices",Ce+j.rank-s);we.push(`${U(b,Ce)} * (${je} % ${U(S,Ce)})`)}return X[ue]=`fn ${ue}(outputIndices: ${j.type.indices}) -> u32 {
             return ${we.length>0?we.join("+"):"0u"};
           }`,`${ue}(${P})`},q=(P,j)=>(()=>{if(g.storage===g.value)return`${e}[${P}]=${j};`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`${e}[${P}]=vec2<u32>(u32(${j}), select(0u, 0xFFFFFFFFu, ${j} < 0));`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`${e}[${P}]=vec2<u32>(u32(${j}), 0u);`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`${e}[${P}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${j}));`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),te=P=>(()=>{if(g.storage===g.value)return`${e}[${P}]`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`i32(${e}[${P}].x)`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`u32(${e}[${P}].x)`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${P}] & 0xFFu), bool(${e}[${P}] & 0xFF00u), bool(${e}[${P}] & 0xFF0000u), bool(${e}[${P}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),oe=s<2?"":`
  fn get_${e}ByIndices(indices: ${g.indices}) -> ${f} {
    return ${te(`i2o_${e}(indices)`)};
  }`,G=s<2?"":(()=>{let P=l.map(ue=>`d${ue}: u32`).join(", "),j=l.map(ue=>`d${ue}`).join(", ");return`
  fn get_${e}(${P}) -> ${f} {
    return get_${e}ByIndices(${M(j)});
  }`})(),pe=(...P)=>{if(P.length!==s)throw new Error(`indices length must be ${s}`);let j=P.map(w).join(",");return s===0?te("0u"):s===1?te(j[0]):(_.get=!0,_.getByIndices=!0,_.indicesToOffset=!0,`get_${e}(${j})`)},de=P=>s<2?te(P):(_.getByIndices=!0,_.indicesToOffset=!0,`get_${e}ByIndices(${P})`),Y=s<2?"":`
  fn set_${e}ByIndices(indices: ${g.indices}, value: ${f}) {
    ${q(`i2o_${e}(indices)`,"value")}
  }`,be=s<2?"":(()=>{let P=l.map(ue=>`d${ue}: u32`).join(", "),j=l.map(ue=>`d${ue}`).join(", ");return`
  fn set_${e}(${P}, value: ${f}) {
    set_${e}ByIndices(${M(j)}, value);
  }`})();return{impl:()=>{let P=[],j=!1;return _.offsetToIndices&&(P.push(k),j=!0),_.indicesToOffset&&(P.push(E),j=!0),_.broadcastedIndicesToOffset&&(Object.values(X).forEach(ue=>P.push(ue)),j=!0),_.set&&(P.push(be),j=!0),_.setByIndices&&(P.push(Y),j=!0),_.get&&(P.push(G),j=!0),_.getByIndices&&(P.push(oe),j=!0),!o&&j&&P.unshift(`const ${S} = ${g.indices}(${i.join(",")});`,`const ${b} = ${g.indices}(${O.computeStrides(i).join(",")});`),P.join(`
`)},type:g,offsetToIndices:T,indicesToOffset:z,broadcastedIndicesToOffset:F,indices:M,indicesGet:U,indicesSet:V,set:(...P)=>{if(P.length!==s+1)throw new Error(`indices length must be ${s}`);let j=P[s];if(typeof j!="string")throw new Error("value must be string");let ue=P.slice(0,s).map(w).join(",");return s===0?q("0u",j):s===1?q(ue[0],j):(_.set=!0,_.setByIndices=!0,_.indicesToOffset=!0,`set_${e}(${ue}, ${j})`)},setByOffset:q,setByIndices:(P,j)=>s<2?q(P,j):(_.setByIndices=!0,_.indicesToOffset=!0,`set_${e}ByIndices(${P}, ${j});`),get:pe,getByOffset:te,getByIndices:de,usage:r,name:e,strides:b,shape:S,rank:s}},R=(e,t,i,r=1)=>Yt(e,t,i,"input",r),K=(e,t,i,r=1)=>Yt(e,t,i,"output",r),Dp=(e,t,i)=>Yt(e,t,i,"atomicOutput",1),ja=(e,t,i,r=1)=>Yt(e,t,i,"internal",r),Zo=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=Vt){let t=typeof e=="number"?e:e[0],i=typeof e=="number"?1:e[1],r=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||i>this.limits.maxComputeWorkgroupSizeY||r>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${i}, ${r}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*i*r>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${i}, ${r}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let n=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,o=n?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,s=n?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*i*r}u + local_idx;`;return`@compute @workgroup_size(${t}, ${i}, ${r})
  fn main(${o}) {
    ${s}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let i=e.usage==="input"?"read":"read_write",r=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${t}) var<storage, ${i}> ${e.name}: array<${r}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,i=1){return this.uniforms.push({name:e,type:t,length:i}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:i,length:r}of this.uniforms)if(r&&r>4)i==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${i}>, ${Math.ceil(r/8)}>`):e.push(`${t}:array<vec4<${i}>, ${Math.ceil(r/4)}>`);else{let n=r==null||r===1?i:`vec${r}<${i}>`;e.push(`${t}:${n}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Pp=(e,t)=>new Zo(e,t)}),Xo,Ni,Yo,Jo,eu,tu,Me,Up,Wp,$t=W(()=>{"use strict";ee(),ne(),ke(),se(),Xo=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Ni=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),Yo=(e,t)=>O.sortBasedOnPerm(e,Ni(e.length,t)),Jo=(e,t,i,r)=>{let n=`fn perm(i: ${r.type.indices}) -> ${i.type.indices} {
    var a: ${i.type.indices};`;for(let o=0;o<t;++o)n+=`a[${e[o]}]=i[${o}];`;return n+="return a;}"},eu=(e,t)=>{let i=[],r=[];for(let n=0;n<e.length;++n)e[n]!==1&&i.push(e[n]),e[t[n]]!==1&&r.push(t[n]);return{newShape:i,newPerm:r}},tu=(e,t)=>{let i=0;for(let r=0;r<e.length;++r)if(t[e[r]]!==1){if(e[r]<i)return!1;i=e[r]}return!0},Me=(e,t)=>{let i=e.dataType,r=e.dims.length,n=Ni(r,t),o=Yo(e.dims,n),s=e.dims,l=o,p=r<2||tu(n,e.dims),c;if(p)return c=_=>{let v=R("input",i,s,4),S=K("output",i,l,4);return`
  ${_.registerUniform("output_size","u32").declareVariables(v,S)}
  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let _=O.size(o);return{outputs:[{dims:o,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(_/64/4)},programUniforms:[{type:12,data:Math.ceil(_/4)}]}},getShaderSource:c};let{newShape:f,newPerm:m}=eu(e.dims,n),g=O.areEqual(m,[2,3,1]),w=O.areEqual(m,[3,1,2]);if(f.length===2||g||w){s=g?[f[0],f[1]*f[2]]:w?[f[0]*f[1],f[2]]:f,l=[s[1],s[0]];let _=16;return c=v=>{let S=R("a",i,s.length),b=K("output",i,l.length);return`
  ${v.registerUniform("output_size","u32").declareVariables(S,b)}
  var<workgroup> tile : array<array<${b.type.value}, ${_+1}>, ${_}>;
  ${v.mainStart([_,_,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${_} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${_}u + local_id.x;
    let input_row = workgroup_id_x * ${_}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${S.getByIndices(`${S.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${_}u + local_id.x;
    let output_row = workgroup_id_y * ${_}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${b.setByIndices(`${b.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let v=O.size(o);return{outputs:[{dims:o,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(l[1]/_),y:Math.ceil(l[0]/_)},programUniforms:[{type:12,data:v},...Z(s,l)]}},getShaderSource:c}}return c=_=>{let v=R("a",i,s.length),S=K("output",i,l.length);return`
  ${_.registerUniform("output_size","u32").declareVariables(v,S)}

  ${Jo(n,r,v,S)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${S.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${S.setByOffset("global_idx",v.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let _=O.size(o);return{outputs:[{dims:o,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:[{type:12,data:_},...Z(s,l)]}},getShaderSource:c}},Up=(e,t)=>{Xo(e.inputs,t.perm),e.compute(Me(e.inputs[0],t.perm))},Wp=e=>ye({perm:e.perm})}),ru,iu,au,nu,su,ou,uu,lu,du,pu,He,qp,Lp,Vp,Gp,jp,Hp,Fp,Kp,Qp,Zp,L0=W(()=>{"use strict";ee(),ne(),se(),Ha(),$t(),ru={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},iu={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},au={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},nu={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},su=(e,t)=>{let i=[];for(let r=t-e;r<t;++r)i.push(r);return i},ou=(e,t)=>{let i=[],r=e.length;for(let o=0;o<r;o++)t.indexOf(o)===-1&&i.push(e[o]);let n=t.map(o=>e[o]);return[i,n]},uu=(e,t)=>{let i=e.length+t.length,r=[],n=0;for(let o=0;o<i;o++)t.indexOf(o)===-1?r.push(e[n++]):r.push(1);return r},lu=(e,t)=>{for(let i=0;i<e.length;++i)if(e[e.length-i-1]!==t-1-i)return!1;return!0},du=(e,t)=>{let i=[];if(!lu(e,t)){for(let r=0;r<t;++r)e.indexOf(r)===-1&&i.push(r);e.forEach(r=>i.push(r))}return i},pu=(e,t,i,r,n,o,s)=>{let l=i[0].dims,p=O.size(o),c=O.size(s),f=R("_A",i[0].dataType,l),m=K("output",n,o),g=64;p===1&&(g=256);let w=`
          var<workgroup> aBestValues : array<f32, ${g}>;
       `,_=v=>`
        ${v.registerUniform("reduceSize","u32").declareVariables(f,m)}
        ${w}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${v.mainStart(g)}

          let outputIndex = global_idx / ${g};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${au[r]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${g}) {
           let candidate = f32(${f.getByOffset("offset + k")});
           bestValue = ${ru[r]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${g}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${iu[r]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${m.setByOffset("outputIndex",`${r==="mean"?`${m.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${m.type.storage}(${nu[r]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${g}`,inputDependencies:["type"]},getShaderSource:_,getRunData:()=>({outputs:[{dims:o,dataType:n}],dispatchGroup:{x:p},programUniforms:[{type:12,data:c}]})}},He=(e,t,i,r)=>{let n=e.inputs.length===1?i:_a(e.inputs,i),o=n.axes;o.length===0&&!n.noopWithEmptyAxes&&(o=e.inputs[0].dims.map((w,_)=>_));let s=O.normalizeAxes(o,e.inputs[0].dims.length),l=s,p=e.inputs[0],c=du(l,e.inputs[0].dims.length);c.length>0&&(p=e.compute(Me(e.inputs[0],c),{inputs:[0],outputs:[-1]})[0],l=su(l.length,p.dims.length));let[f,m]=ou(p.dims,l),g=f;n.keepDims&&(g=uu(f,s)),e.compute(pu(t,n.cacheKey,[p],r,e.inputs[0].dataType,g,m),{inputs:[p]})},qp=(e,t)=>{He(e,"ReduceMeanShared",t,"mean")},Lp=(e,t)=>{He(e,"ReduceL1Shared",t,"l1")},Vp=(e,t)=>{He(e,"ReduceL2Shared",t,"l2")},Gp=(e,t)=>{He(e,"ReduceLogSumExpShared",t,"logSumExp")},jp=(e,t)=>{He(e,"ReduceMaxShared",t,"max")},Hp=(e,t)=>{He(e,"ReduceMinShared",t,"min")},Fp=(e,t)=>{He(e,"ReduceProdShared",t,"prod")},Kp=(e,t)=>{He(e,"ReduceSumShared",t,"sum")},Qp=(e,t)=>{He(e,"ReduceSumSquareShared",t,"sumSquare")},Zp=(e,t)=>{He(e,"ReduceLogSumShared",t,"logSum")}}),Fe,cu,Vr,_a,Ke,hu,fu,mu,gu,yu,_u,wu,$u,vu,bu,Qe,Xp,Yp,Jp,ec,tc,rc,ic,ac,nc,sc,Ha=W(()=>{"use strict";ee(),ne(),ke(),se(),L0(),Fe=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},cu=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Vr=(e,t,i,r,n,o,s=!1,l=!1)=>{let p=[],c=i[0].dims,f=c.length,m=O.normalizeAxes(n,f),g=!l&&m.length===0;c.forEach((v,S)=>{g||m.indexOf(S)>=0?s&&p.push(1):p.push(v)});let w=p.length,_=O.size(p);return{name:e,shaderCache:t,getShaderSource:v=>{let S=[],b=R("_A",i[0].dataType,f),$=K("output",o,w),k=r(b,$,m),T=k[2];for(let I=0,E=0;I<f;I++)g||m.indexOf(I)>=0?(s&&E++,T=`for(var j${I}: u32 = 0; j${I} < ${c[I]}; j${I}++) {
                  ${k[2].includes("last_index")?`let last_index = j${I};`:""}
                  ${b.indicesSet("input_indices",I,`j${I}`)}
                  ${T}
                }`):(S.push(`${b.indicesSet("input_indices",I,$.indicesGet("output_indices",E))};`),E++);return`

        ${v.registerUniform("output_size","u32").declareVariables(b,$)}

        ${v.mainStart()}
          ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${b.type.indices};
          let output_indices = ${$.offsetToIndices("global_idx")};

          ${S.join(`
`)}
          ${k[0]}       // init ops for reduce max/min
          ${k[1]}
          ${T}
          ${k[3]}
          ${k.length===4?$.setByOffset("global_idx","value"):k.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:p,dataType:o}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:[{type:12,data:_},...Z(c,p)]})}},_a=(e,t)=>{let i=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(r=>i.push(Number(r))),ye({axes:i,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Ke=(e,t,i,r)=>{let n=e.inputs,o=n.length===1?i:_a(n,i);e.compute(Vr(t,{hint:o.cacheKey,inputDependencies:["rank"]},[n[0]],o.noopWithEmptyAxes&&o.axes.length===0?cu:r,o.axes,n[0].dataType,o.keepDims,o.noopWithEmptyAxes),{inputs:[0]})},hu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceLogSum",t,(i,r)=>[`var value = ${r.type.storage}(0);`,"",`value += ${i.getByIndices("input_indices")};`,"value = log(value);"])},fu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceL1",t,(i,r)=>[`var value = ${r.type.storage}(0);`,"",`value += abs(${i.getByIndices("input_indices")});`,""])},mu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceL2",t,(i,r)=>[`var t = ${r.type.value}(0); var value = ${r.type.value}(0);`,"",`t = ${i.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},gu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceLogSumExp",t,(i,r)=>[`var value = ${r.type.storage}(0);`,"",`value += exp(${i.getByIndices("input_indices")});`,"value = log(value);"])},yu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceMax",t,(i,r,n)=>{let o=[];for(let s=0;s<i.rank;s++)(n.indexOf(s)>=0||n.length===0)&&o.push(i.indicesSet("input_indices",s,0));return[`${o.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};`,`value = max(value, ${i.getByIndices("input_indices")});`,""]})},_u=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceMean",t,(i,r,n)=>{let o=1;for(let s=0;s<i.rank;s++)(n.indexOf(s)>=0||n.length===0)&&(o*=e.inputs[0].dims[s]);return["var sum = f32(0);","",`sum += f32(${i.getByIndices("input_indices")});`,`let value = ${r.type.value}(sum / ${o});`]})},wu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceMin",t,(i,r,n)=>{let o=[];for(let s=0;s<i.rank;s++)(n.indexOf(s)>=0||n.length===0)&&o.push(`input_indices[${s}] = 0;`);return[`${o.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};`,`value = min(value, ${i.getByIndices("input_indices")});`,""]})},$u=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceProd",t,(i,r)=>[`var value = ${r.type.storage}(1);`,"",`value *= ${i.getByIndices("input_indices")};`,""])},vu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceSum",t,(i,r)=>[`var value = ${r.type.storage}(0);`,"",`value += ${i.getByIndices("input_indices")};`,""])},bu=(e,t)=>{Fe(e.inputs),Ke(e,"ReduceSumSquare",t,(i,r)=>[`var t = ${r.type.value}(0); var value = ${r.type.value}(0);`,"",`t = ${i.getByIndices("input_indices")}; value += t * t;`,""])},Qe=(e,t,i)=>{if(t.length===0)return i;let r=1,n=1;for(let o=0;o<t.length;o++)t.indexOf(o)===-1?r*=e[o]:n*=e[o];return n<32&&r>1024},Xp=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?_u(e,t):qp(e,t)},Yp=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?fu(e,t):Lp(e,t)},Jp=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?mu(e,t):Vp(e,t)},ec=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?gu(e,t):Gp(e,t)},tc=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?yu(e,t):jp(e,t)},rc=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?wu(e,t):Hp(e,t)},ic=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?$u(e,t):Fp(e,t)},ac=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vu(e,t):Kp(e,t)},nc=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bu(e,t):Qp(e,t)},sc=(e,t)=>{Qe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?hu(e,t):Zp(e,t)}}),Mi,oc,uc,wa,V0=W(()=>{"use strict";ee(),ke(),Ha(),Mi=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},oc=(e,t)=>{Mi(e.inputs);let i=(r,n,o)=>{let s=[];for(let l=0;l<r.rank;l++)(o.indexOf(l)>=0||o.length===0)&&s.push(`input_indices[${l}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${r.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${r.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",n.setByOffset("global_idx","best_index")]};e.compute(Vr("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],i,[t.axis],7,t.keepDims),{inputs:[0]})},uc=(e,t)=>{Mi(e.inputs);let i=(r,n,o)=>{let s=[];for(let l=0;l<r.rank;l++)(o.indexOf(l)>=0||o.length===0)&&s.push(`input_indices[${l}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${r.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${r.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",n.setByOffset("global_idx","best_index")]};e.compute(Vr("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],i,[t.axis],7,t.keepDims),{inputs:[0]})},wa=e=>ye(e)}),xu,zr,Su,ku,Tu,pr,Cu,lc,Fa=W(()=>{"use strict";ee(),ne(),Ga(),se(),xu=(e,t)=>{let i=e[0],r=e[1],n=e[2],o=e[3],s=e[4],l=e[5];if(s&&l)throw new Error("Attention cannot have both past and attention_bias");if(i.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let p=i.dims[0],c=i.dims[1],f=i.dims[2];if(n.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(r.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(r.dims[0]!==f)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(n.dims[0]!==r.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let m=n.dims[0]/3,g=m,w=g;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let k of t.qkvHiddenSizes)if(k%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");m=t.qkvHiddenSizes[0],g=t.qkvHiddenSizes[1],w=t.qkvHiddenSizes[2]}let _=c;if(m!==g)throw new Error("qkv_hidden_sizes first element should be same as the second");if(n.dims[0]!==m+g+w)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let v=0;if(s){if(g!==w)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==p)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==g/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(v=s.dims[3])}let S=_+v,b=-1,$=0;if(o)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(l){if(l.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(l.dims[0]!==p||l.dims[1]!==t.numHeads||l.dims[2]!==c||l.dims[3]!==S)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:p,sequenceLength:c,pastSequenceLength:v,kvSequenceLength:_,totalSequenceLength:S,maxSequenceLength:b,inputHiddenSize:f,hiddenSize:m,vHiddenSize:w,headSize:Math.floor(m/t.numHeads),vHeadSize:Math.floor(w/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:$,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},zr=(e,t,i)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e?.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${i?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,Su=(e,t,i,r,n,o,s,l)=>{let p=Se(s?1:o),c=64,f=o/p;f<c&&(c=32);let m=Math.ceil(o/p/c),g=[{type:12,data:t},{type:12,data:i},{type:12,data:r},{type:12,data:n},{type:12,data:f},{type:12,data:m}],w=Ee(e.dataType,p),_=Oe(1,p),v=["type"];s&&v.push("type"),l&&v.push("type");let S=b=>{let $=K("x",e.dataType,e.dims,p),k=[$],T=s?R("seq_lens",s.dataType,s.dims):void 0;T&&k.push(T);let I=l?R("total_sequence_length_input",l.dataType,l.dims):void 0;I&&k.push(I);let E=Oe(e.dataType),z=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${c}>;
  var<workgroup> thread_sum: array<f32, ${c}>;
  ${b.registerUniforms(z).declareVariables(...k)}
  ${b.mainStart([c,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${zr(T,I,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${c}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${s?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${_}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${_}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(p){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${p}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${c}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${_}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${_}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(p){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${p}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${c}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${$.type.value}(${E}(1.0) / ${E}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${_}(x[offset + i]);
        x[offset + i] = ${$.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${s?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${$.type.value}(${E}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${c};${w};${p}`,inputDependencies:v},getShaderSource:S,getRunData:()=>({outputs:[],dispatchGroup:{x:Math.ceil(o/c),y:n,z:t*i},programUniforms:g})}},ku=(e,t,i,r,n,o,s,l,p)=>{let c=s+o.kvSequenceLength,f=[o.batchSize,o.numHeads,o.sequenceLength,c],m=e>1&&r,g=o.kvNumHeads?o.kvNumHeads:o.numHeads,w=m?[o.batchSize,g,c,o.headSize]:void 0,_=o.nReps?o.nReps:1,v=o.scale===0?1/Math.sqrt(o.headSize):o.scale,S=Se(o.headSize),b=o.headSize/S,$=12,k={x:Math.ceil(c/$),y:Math.ceil(o.sequenceLength/$),z:o.batchSize*o.numHeads},T=[{type:12,data:o.sequenceLength},{type:12,data:b},{type:12,data:c},{type:12,data:o.numHeads},{type:12,data:o.headSize},{type:1,data:v},{type:12,data:s},{type:12,data:o.kvSequenceLength},{type:12,data:_}],I=m&&r&&O.size(r.dims)>0,E=["type","type"];I&&E.push("type"),n&&E.push("type"),l&&E.push("type"),p&&E.push("type");let z=[{dims:f,dataType:t.dataType,gpuDataType:0}];m&&z.push({dims:w,dataType:t.dataType,gpuDataType:0});let M=U=>{let V=R("q",t.dataType,t.dims,S),X=R("key",i.dataType,i.dims,S),F=[V,X];if(I){let Y=R("past_key",r.dataType,r.dims,S);F.push(Y)}n&&F.push(R("attention_bias",n.dataType,n.dims));let q=l?R("seq_lens",l.dataType,l.dims):void 0;q&&F.push(q);let te=p?R("total_sequence_length_input",p.dataType,p.dims):void 0;te&&F.push(te);let oe=K("output",t.dataType,f),G=[oe];m&&G.push(K("present_key",t.dataType,w,S));let pe=Oe(1,S),de=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${$}u;

  var<workgroup> tileQ: array<${V.type.storage}, ${$*$}>;
  var<workgroup> tileK: array<${V.type.storage}, ${$*$}>;
  ${U.registerUniforms(de).declareVariables(...F,...G)}
  ${U.mainStart([$,$,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${_===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${_===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${zr(q,te,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${I&&m?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${m?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${pe}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${I&&m?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${m?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${pe}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(S){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${S}`)}})()};
        output[outputIdx] = ${oe.type.value} (sum * uniforms.alpha) + ${n?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${S};${n!==void 0};${r!==void 0};${e}`,inputDependencies:E},getRunData:()=>({outputs:z,dispatchGroup:k,programUniforms:T}),getShaderSource:M}},Tu=(e,t,i,r,n,o,s=void 0,l=void 0)=>{let p=o+n.kvSequenceLength,c=n.nReps?n.nReps:1,f=n.vHiddenSize*c,m=e>1&&r,g=n.kvNumHeads?n.kvNumHeads:n.numHeads,w=m?[n.batchSize,g,p,n.headSize]:void 0,_=[n.batchSize,n.sequenceLength,f],v=12,S={x:Math.ceil(n.vHeadSize/v),y:Math.ceil(n.sequenceLength/v),z:n.batchSize*n.numHeads},b=[{type:12,data:n.sequenceLength},{type:12,data:p},{type:12,data:n.vHeadSize},{type:12,data:n.numHeads},{type:12,data:n.headSize},{type:12,data:f},{type:12,data:o},{type:12,data:n.kvSequenceLength},{type:12,data:c}],$=m&&r&&O.size(r.dims)>0,k=["type","type"];$&&k.push("type"),s&&k.push("type"),l&&k.push("type");let T=[{dims:_,dataType:t.dataType,gpuDataType:0}];m&&T.push({dims:w,dataType:t.dataType,gpuDataType:0});let I=E=>{let z=R("probs",t.dataType,t.dims),M=R("v",i.dataType,i.dims),U=[z,M];$&&U.push(R("past_value",r.dataType,r.dims));let V=s?R("seq_lens",s.dataType,s.dims):void 0;s&&U.push(V);let X=l?R("total_sequence_length_input",l.dataType,l.dims):void 0;l&&U.push(X);let F=[K("output",t.dataType,_)];m&&F.push(K("present_value",t.dataType,w));let q=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${v}u;
  var<workgroup> tileQ: array<${z.type.value}, ${v*v}>;
  var<workgroup> tileV: array<${z.type.value}, ${v*v}>;
  ${E.registerUniforms(q).declareVariables(...U,...F)}
  ${E.mainStart([v,v,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${c===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${c===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${zr(V,X,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${$&&m?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${m?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${z.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${$&&m?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${m?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${r!==void 0};${e}`,inputDependencies:k},getRunData:()=>({outputs:T,dispatchGroup:S,programUniforms:b}),getShaderSource:I}},pr=(e,t,i,r,n,o,s,l,p,c,f=void 0,m=void 0)=>{let g=Math.min(e.outputCount,1+(s?1:0)+(l?1:0)),w=g>1?c.pastSequenceLength:0,_=w+c.kvSequenceLength,v=p&&O.size(p.dims)>0?p:void 0,S=[t,i];g>1&&s&&O.size(s.dims)>0&&S.push(s),v&&S.push(v),f&&S.push(f),m&&S.push(m);let b=e.compute(ku(g,t,i,s,v,c,w,f,m),{inputs:S,outputs:g>1?[-1,1]:[-1]})[0];e.compute(Su(b,c.batchSize,c.numHeads,w,c.sequenceLength,_,f,m),{inputs:f&&m?[b,f,m]:[b],outputs:[]});let $=[b,r];g>1&&l&&O.size(l.dims)>0&&$.push(l),f&&$.push(f),m&&$.push(m),e.compute(Tu(g,b,r,l,c,w,f,m),{inputs:$,outputs:g>1?[0,2]:[0]})},Cu=(e,t)=>{let i=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],r=t.sequenceLength,n=t.inputHiddenSize,o=t.headSize,s=12,l={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},p=[e.inputs[0],e.inputs[1],e.inputs[2]],c=[{type:12,data:r},{type:12,data:n},{type:12,data:o},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],f=m=>{let g=K("output_q",p[0].dataType,i),w=K("output_k",p[0].dataType,i),_=K("output_v",p[0].dataType,i),v=R("input",p[0].dataType,p[0].dims),S=R("weight",p[1].dataType,p[1].dims),b=R("bias",p[2].dataType,p[2].dims),$=v.type.storage,k=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${$}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${$}, ${s*s}>;
  var<workgroup> tileWeightK: array<${$}, ${s*s}>;
  var<workgroup> tileWeightV: array<${$}, ${s*s}>;
  ${m.registerUniforms(k).declareVariables(v,S,b,g,w,_)}
  ${m.mainStart([s,s,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${$}(0);
    var valueK = ${$}(0);
    var valueV = ${$}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:l,programUniforms:c}),getShaderSource:f},{inputs:p,outputs:[-1,-1,-1]})},lc=(e,t)=>{let i=xu(e.inputs,t),[r,n,o]=Cu(e,i);return pr(e,r,n,o,e.inputs[4],void 0,void 0,void 0,e.inputs[5],i)}}),Iu,Eu,zu,dc,G0=W(()=>{"use strict";Je(),ee(),ne(),ke(),se(),Iu=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let i=(r,n,o)=>{let s=n.length;if(s!==r.length)throw new Error(`${o}: num dimensions != ${s}`);n.forEach((l,p)=>{if(l!==r[p])throw new Error(`${o}: dim[${p}] do not match`)})};if(e[0].dims.length>1){let r=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);i(e[1].dims,r,"Invalid input scale"),i(e[2].dims,r,"Invalid input B"),i(e[3].dims,r,"Invalid input mean"),i(e[4].dims,r,"Invalid input var")}else i(e[1].dims,[1],"Invalid input scale"),i(e[2].dims,[1],"Invalid input B"),i(e[3].dims,[1],"Invalid input mean"),i(e[4].dims,[1],"Invalid input var")},Eu=(e,t)=>{let{epsilon:i,spatial:r,format:n}=t,o=e[0].dims,s=r?Se(o[o.length-1]):1,l=n==="NHWC"&&o.length>1?s:1,p=O.size(o)/s,c=r,f=c?o.length:o,m=R("x",e[0].dataType,e[0].dims,s),g=R("scale",e[1].dataType,e[1].dims,l),w=R("bias",e[2].dataType,e[2].dims,l),_=R("inputMean",e[3].dataType,e[3].dims,l),v=R("inputVar",e[4].dataType,e[4].dims,l),S=K("y",e[0].dataType,f,s),b=()=>{let k="";if(r)k=`let cOffset = ${o.length===1?"0u":n==="NHWC"?`outputIndices[${o.length-1}] / ${s}`:"outputIndices[1]"};`;else if(n==="NCHW")k=`
            ${S.indicesSet("outputIndices","0","0")}
            let cOffset = ${S.indicesToOffset("outputIndices")};`;else{k=`var cIndices = ${g.type.indices}(0);
                       cIndices[0] = outputIndices[${o.length-1}];`;for(let T=1;T<g.rank;T++)k+=`cIndices[${T}] = outputIndices[${T}];`;k+=`let cOffset = ${g.indicesToOffset("cIndices")};`}return k},$=k=>`
  const epsilon = ${i};
  ${k.registerUniform("outputSize","u32").declareVariables(m,g,w,_,v,S)}
  ${k.mainStart()}
  ${k.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${S.offsetToIndices(`global_idx * ${s}`)};
    ${b()}
    let scale = ${g.getByOffset("cOffset")};
    let bias = ${w.getByOffset("cOffset")};
    let inputMean = ${_.getByOffset("cOffset")};
    let inputVar = ${v.getByOffset("cOffset")};
    let x = ${m.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${S.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${r}_${s}`,inputDependencies:c?["rank","type","type","type","type"]:void 0},getShaderSource:$,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:c?[{type:12,data:p},...Z(o)]:[{type:12,data:p}]})}},zu=e=>ye(e),dc=(e,t)=>{let{inputs:i,outputCount:r}=e,n=zu({...t,outputCount:r});if($e.webgpu.validateInputContent&&Iu(i,n),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(Eu(i,n))}}),Au,Ou,pc,j0=W(()=>{"use strict";ne(),se(),Au=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Ou=e=>{let t=e[0].dims,i=e[0].dims[2],r=O.size(t)/4,n=e[0].dataType,o=R("input",n,t,4),s=R("bias",n,[i],4),l=R("residual",n,t,4),p=K("output",n,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)}}),getShaderSource:c=>`
  const channels = ${i}u / 4;
  ${c.declareVariables(o,s,l,p)}

  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes(r)}
    let value = ${o.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${l.getByOffset("global_idx")};
    ${p.setByOffset("global_idx","value")}
  }`}},pc=e=>{Au(e.inputs),e.compute(Ou(e.inputs))}}),Ru,me,cc,hc,fc,mc,gc,yc,_c,wc,$c,Bu,vc,bc,xc,Sc,or,kc,Ur,Tc,Cc,Ic,Ec,zc,Ac,Oc,Rc,Bc,Nc,Mc,Dc,Pc,Uc,Wc,qc,Di,Lc,$a,va,Vc,Gc,jc,Nu,Mu,Hc,Ka=W(()=>{"use strict";ee(),ne(),ke(),se(),Ru=(e,t,i,r,n,o,s)=>{let l=Math.ceil(t/4),p="";typeof n=="string"?p=`${n}(a)`:p=n("a");let c=R("inputData",i,[l],4),f=K("outputData",r,[l],4),m=[{name:"vec_size",type:"u32"}];return s&&m.push(...s),`
      ${e.registerUniforms(m).declareVariables(c,f)}

  ${o??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${c.getByOffset("global_idx")};
    ${f.setByOffset("global_idx",p)}
  }`},me=(e,t,i,r,n,o=e.dataType,s,l)=>{let p=[{type:12,data:Math.ceil(O.size(e.dims)/4)}];return s&&p.push(...s),{name:t,shaderCache:{hint:n,inputDependencies:["type"]},getShaderSource:c=>Ru(c,O.size(e.dims),e.dataType,o,i,r,l),getRunData:c=>({outputs:[{dims:e.dims,dataType:o}],dispatchGroup:{x:Math.ceil(O.size(c[0].dims)/64/4)},programUniforms:p})}},cc=e=>{e.compute(me(e.inputs[0],"Abs","abs"))},hc=e=>{e.compute(me(e.inputs[0],"Acos","acos"))},fc=e=>{e.compute(me(e.inputs[0],"Acosh","acosh"))},mc=e=>{e.compute(me(e.inputs[0],"Asin","asin"))},gc=e=>{e.compute(me(e.inputs[0],"Asinh","asinh"))},yc=e=>{e.compute(me(e.inputs[0],"Atan","atan"))},_c=e=>{e.compute(me(e.inputs[0],"Atanh","atanh"))},wc=e=>ye(e),$c=(e,t)=>{let i;switch(t.to){case 10:i="vec4<f16>";break;case 1:i="vec4<f32>";break;case 12:i="vec4<u32>";break;case 6:i="vec4<i32>";break;case 9:i="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(me(e.inputs[0],"Cast",i,void 0,t.cacheKey,t.to))},Bu=e=>{let t,i,r=e.length>=2&&e[1].data!==0,n=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=r?e[1].getFloat32Array()[0]:-34028234663852886e22,i=n?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=r?e[1].getUint16Array()[0]:64511,i=n?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return ye({min:t,max:i})},vc=(e,t)=>{let i=t||Bu(e.inputs),r=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"Clip",n=>`clamp(${n}, vec4<${r}>(uniforms.min), vec4<${r}>(uniforms.max))`,void 0,i.cacheKey,void 0,[{type:e.inputs[0].dataType,data:i.min},{type:e.inputs[0].dataType,data:i.max}],[{name:"min",type:r},{name:"max",type:r}]),{inputs:[0]})},bc=e=>{e.compute(me(e.inputs[0],"Ceil","ceil"))},xc=e=>{e.compute(me(e.inputs[0],"Cos","cos"))},Sc=e=>{e.compute(me(e.inputs[0],"Cosh","cosh"))},or=e=>ye(e),kc=(e,t)=>{let i=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"Elu",r=>`elu_vf32(${r})`,`
  const elu_alpha_ = ${i}(${t.alpha});

  fn elu_f32(a: ${i}) -> ${i} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${i}>) -> vec4<${i}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Ur=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Tc=e=>{let t=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"Erf",i=>`erf_vf32(${i})`,Ur(t)))},Cc=e=>{e.compute(me(e.inputs[0],"Exp","exp"))},Ic=e=>{e.compute(me(e.inputs[0],"Floor","floor"))},Ec=e=>{let t=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"Gelu",i=>`0.5 * ${i} * (1.0 + erf_vf32(${i} * 0.7071067811865475))`,Ur(t)))},zc=(e,t)=>{let i=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"LeakyRelu",r=>`select(leaky_relu_alpha_ * ${r}, ${r}, ${r} >= vec4<${i}>(0.0))`,`const leaky_relu_alpha_ = ${i}(${t.alpha});`,t.cacheKey))},Ac=e=>{e.compute(me(e.inputs[0],"Not",t=>`!${t}`))},Oc=e=>{e.compute(me(e.inputs[0],"Neg",t=>`-${t}`))},Rc=e=>{e.compute(me(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Bc=e=>{let t=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"Relu",i=>`select(vec4<${t}>(0.0), ${i}, ${i} > vec4<${t}>(0.0))`))},Nc=e=>{e.compute(me(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},Mc=e=>ye(e),Dc=(e,t)=>{let i=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"HardSigmoid",r=>`max(vec4<${i}>(0.0), min(vec4<${i}>(1.0), ${t.alpha} * ${r} + vec4<${i}>(${t.beta})))`,void 0,t.cacheKey))},Pc=e=>{e.compute(me(e.inputs[0],"Sin","sin"))},Uc=e=>{e.compute(me(e.inputs[0],"Sinh","sinh"))},Wc=e=>{e.compute(me(e.inputs[0],"Sqrt","sqrt"))},qc=e=>{e.compute(me(e.inputs[0],"Tan","tan"))},Di=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Lc=e=>{e.compute(me(e.inputs[0],"Tanh",Di))},$a=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${Di("v")};
}
`,va=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Vc=e=>{let t=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"FastGelu",va,$a(t),void 0,e.inputs[0].dataType))},Gc=(e,t)=>{let i=Oe(e.inputs[0].dataType);return e.compute(me(e.inputs[0],"ThresholdedRelu",r=>`select(vec4<${i}>(0.0), ${r}, ${r} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${i}>(${t.alpha});`,t.cacheKey)),0},jc=e=>{e.compute(me(e.inputs[0],"Log","log"))},Nu=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,Mu=e=>`quick_gelu_impl(${e})`,Hc=(e,t)=>{let i=Oe(e.inputs[0].dataType);e.compute(me(e.inputs[0],"QuickGelu",Mu,Nu(i,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Du,Pu,Fc,H0=W(()=>{"use strict";ne(),se(),Ka(),Du=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Pu=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let i=R("input",e[0].dataType,e[0].dims,4),r=R("bias",e[0].dataType,[e[0].dims[2]],4),n=K("output",e[0].dataType,t,4),o=O.size(t)/4,s=Ee(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)}}),getShaderSource:l=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${l.declareVariables(i,r,n)}

  ${Ur(s)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(o)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${n.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},Fc=e=>{Du(e.inputs),e.compute(Pu(e.inputs))}}),Uu,Wu,Ze,Kc,Qc,Zc,Xc,Yc,Jc,eh,th,rh,ih,F0=W(()=>{"use strict";ee(),ne(),se(),Uu=(e,t,i,r,n,o,s,l,p,c,f,m)=>{let g,w;typeof l=="string"?g=w=($,k)=>`${l}((${$}),(${k}))`:typeof l=="function"?g=w=l:(g=l.scalar,w=l.vector);let _=K("outputData",f,r.length,4),v=R("aData",p,t.length,4),S=R("bData",c,i.length,4),b;if(n)if(o){let $=O.size(t)===1,k=O.size(i)===1,T=t.length>0&&t[t.length-1]%4===0,I=i.length>0&&i[i.length-1]%4===0;$||k?b=_.setByOffset("global_idx",w($?`${v.type.value}(${v.getByOffset("0")}.x)`:v.getByOffset("global_idx"),k?`${S.type.value}(${S.getByOffset("0")}.x)`:S.getByOffset("global_idx"))):b=`
            let outputIndices = ${_.offsetToIndices("global_idx * 4u")};
            let offsetA = ${v.broadcastedIndicesToOffset("outputIndices",_)};
            let offsetB = ${S.broadcastedIndicesToOffset("outputIndices",_)};
            ${_.setByOffset("global_idx",w(s||T?v.getByOffset("offsetA / 4u"):`${v.type.value}(${v.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||I?S.getByOffset("offsetB / 4u"):`${S.type.value}(${S.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else b=_.setByOffset("global_idx",w(v.getByOffset("global_idx"),S.getByOffset("global_idx")));else{if(!o)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let $=(k,T,I="")=>{let E=`aData[indexA${T}][componentA${T}]`,z=`bData[indexB${T}][componentB${T}]`;return`
            let outputIndices${T} = ${_.offsetToIndices(`global_idx * 4u + ${T}u`)};
            let offsetA${T} = ${v.broadcastedIndicesToOffset(`outputIndices${T}`,_)};
            let offsetB${T} = ${S.broadcastedIndicesToOffset(`outputIndices${T}`,_)};
            let indexA${T} = offsetA${T} / 4u;
            let indexB${T} = offsetB${T} / 4u;
            let componentA${T} = offsetA${T} % 4u;
            let componentB${T} = offsetB${T} % 4u;
            ${k}[${T}] = ${I}(${g(E,z)});
          `};f===9?b=`
            var data = vec4<u32>(0);
            ${$("data",0,"u32")}
            ${$("data",1,"u32")}
            ${$("data",2,"u32")}
            ${$("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:b=`
            ${$("outputData[global_idx]",0)}
            ${$("outputData[global_idx]",1)}
            ${$("outputData[global_idx]",2)}
            ${$("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(v,S,_)}

        ${m??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${b}
      }`},Wu=(e,t,i,r,n,o,s=i.dataType)=>{let l=i.dims.map(v=>Number(v)??1),p=r.dims.map(v=>Number(v)??1),c=!O.areEqual(l,p),f=l,m=O.size(l),g=!1,w=!1,_=[c];if(c){let v=Lt.calcShape(l,p,!1);if(!v)throw new Error("Can't perform binary op on the given tensors");f=v.slice(),m=O.size(f);let S=O.size(l)===1,b=O.size(p)===1,$=l.length>0&&l[l.length-1]%4===0,k=p.length>0&&p[p.length-1]%4===0;_.push(S),_.push(b),_.push($),_.push(k);let T=1;for(let I=1;I<f.length;I++){let E=l[l.length-I],z=p[p.length-I];if(E===z)T*=E;else break}T%4===0?(w=!0,g=!0):(S||b||$||k)&&(g=!0)}else g=!0;return _.push(g),{name:e,shaderCache:{hint:t+_.map(v=>v.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:v=>Uu(v,l,p,f,g,c,w,n,i.dataType,r.dataType,s,o),getRunData:()=>({outputs:[{dims:f,dataType:s}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(O.size(f)/4)},...Z(l,p,f)]})}},Ze=(e,t,i,r,n,o)=>{e.compute(Wu(t,n??"",e.inputs[0],e.inputs[1],i,r,o))},Kc=e=>{Ze(e,"Add",(t,i)=>`${t}+${i}`)},Qc=e=>{Ze(e,"Div",(t,i)=>`${t}/${i}`)},Zc=e=>{Ze(e,"Equal",{scalar:(t,i)=>`u32(${t}==${i})`,vector:(t,i)=>`vec4<u32>(${t}==${i})`},void 0,void 0,9)},Xc=e=>{Ze(e,"Mul",(t,i)=>`${t}*${i}`)},Yc=e=>{let t=R("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Ze(e,"Pow",{scalar:(i,r)=>`pow_custom(${i},${r})`,vector:(i,r)=>`pow_vector_custom(${i},${r})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},Jc=e=>{Ze(e,"Sub",(t,i)=>`${t}-${i}`)},eh=e=>{Ze(e,"Greater",{scalar:(t,i)=>`u32(${t}>${i})`,vector:(t,i)=>`vec4<u32>(${t}>${i})`},void 0,void 0,9)},th=e=>{Ze(e,"Less",{scalar:(t,i)=>`u32(${t}<${i})`,vector:(t,i)=>`vec4<u32>(${t}<${i})`},void 0,void 0,9)},rh=e=>{Ze(e,"GreaterOrEqual",{scalar:(t,i)=>`u32(${t}>=${i})`,vector:(t,i)=>`vec4<u32>(${t}>=${i})`},void 0,void 0,9)},ih=e=>{Ze(e,"LessOrEqual",{scalar:(t,i)=>`u32(${t}<=${i})`,vector:(t,i)=>`vec4<u32>(${t}<=${i})`},void 0,void 0,9)}}),qu,Lu,Vu,Gu,ah,nh,K0=W(()=>{"use strict";ee(),ne(),ke(),se(),qu=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let i=0,r=e[i],n=r.dataType,o=r.dims.length;e.forEach((s,l)=>{if(l!==i){if(s.dataType!==n)throw new Error("input tensors should be one type");if(s.dims.length!==o)throw new Error("input tensors should have the same shape");s.dims.forEach((p,c)=>{if(c!==t&&p!==r.dims[c])throw new Error("non concat dimensions must match")})}})},Lu=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,Vu=(e,t)=>{let i=e.length,r=[];for(let n=0;n<i;++n){let o=t.setByOffset("global_idx",e[n].getByIndices("indices"));i===1?r.push(o):n===0?r.push(`if (inputIndex == ${n}u) { ${o} }`):n===i-1?r.push(`else { ${o} }`):r.push(`else if (inputIndex == ${n}) { ${o} }`)}return r.join(`
`)},Gu=(e,t,i,r)=>{let n=O.size(i),o=new Array(e.length),s=new Array(e.length),l=0,p=[],c=[],f=[{type:12,data:n}];for(let v=0;v<e.length;++v)l+=e[v].dims[t],o[v]=l,c.push(e[v].dims.length),s[v]=R(`input${v}`,r,c[v]),p.push("rank"),f.push({type:12,data:o[v]});for(let v=0;v<e.length;++v)f.push(...Z(e[v].dims));f.push(...Z(i));let m=K("output",r,i.length),g=m.indicesGet("indices",t),w=Array.from(Array(o.length).keys()).map(v=>`uniforms.sizeInConcatAxis${v}`).join(","),_=v=>`

  ${(()=>{v.registerUniform("outputSize","u32");for(let S=0;S<e.length;S++)v.registerUniform(`sizeInConcatAxis${S}`,"u32");return v.declareVariables(...s,m)})()}

  ${Lu(o.length,w)}

  ${v.mainStart()}
    ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${m.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${g});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${o.length}u>(${w});
      ${g} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${Vu(s,m)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:i,dataType:r}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:f}),getShaderSource:_}},ah=(e,t)=>{let i=e.inputs,r=i[0].dims,n=O.normalizeAxis(t.axis,r.length);qu(i,n);let o=r.slice();o[n]=i.reduce((l,p)=>l+(p.dims.length>n?p.dims[n]:0),0);let s=i.filter(l=>O.size(l.dims)>0);e.compute(Gu(s,n,o,i[0].dataType),{inputs:s})},nh=e=>ye({axis:e.axis})}),zt,At,Ot,Qa,Bt=W(()=>{"use strict";ee(),ne(),zt=(e,t,i="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${i}(uniforms.clip_min)), ${t}(${i}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${i}(uniforms.alpha) * value + ${i}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${i}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},At=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},Ot=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Qa=e=>{let t=e?.activation||"";if(t==="HardSigmoid"){let[i,r]=e?.activation_params||[.2,.5];return{activation:t,alpha:i,beta:r}}else if(t==="Clip"){let[i,r]=e?.activation_params||[Np,Mp];return{activation:t,clipMax:r,clipMin:i}}else if(t==="LeakyRelu"){let[i]=e?.activation_params||[.01];return{activation:t,alpha:i}}return{activation:t}}}),ze,sh,Za=W(()=>{"use strict";ze=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},sh=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),oh,Q0=W(()=>{"use strict";oh=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),lr,Xa,Ya=W(()=>{"use strict";ee(),ne(),se(),Bt(),lr=(e,t,i,r,n)=>{let o=r-i;return`
      ${Array.from({length:i}).map((s,l)=>`
      if (${Q(t.shape,l,t.rank)} != 1) {
        ${t.indicesSet(e,l,Q(n,l+o,r))}
      } else {
        ${t.indicesSet(e,l,0)}
      }`).join("")}
`},Xa=(e,t,i,r,n=!1,o)=>{let s=e[0].dims,l=e[1].dims,p=s[s.length-2],c=l[l.length-1],f=s[s.length-1],m=Se(c),g=Se(f),w=Se(p),_=O.size(i)/m/w,v=e.length>2,S=r?r.slice(0,-2):i.slice(0,-2),b=[O.size(S),p,c],$=[{type:12,data:_},{type:12,data:p},{type:12,data:c},{type:12,data:f}];At(t,$),$.push(...Z(S,s,l)),v&&$.push(...Z(e[2].dims)),$.push(...Z(b));let k=T=>{let I=ja("batch_dims",e[0].dataType,S.length),E=R("a",e[0].dataType,s.length,g),z=R("b",e[1].dataType,l.length,m),M=K("output",e[0].dataType,b.length,m),U=Ee(M.type.tensor),V=zt(t,M.type.value,U),X=[E,z],F="";if(v){let oe=n?m:1;X.push(R("bias",e[2].dataType,e[2].dims.length,oe)),F=`${n?`value += bias[col / ${oe}];`:`value += ${M.type.value}(bias[row + i]);`}`}let q=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];Ot(t,q);let te=()=>{let oe=`var a_data: ${E.type.value};`;for(let G=0;G<g;G++)oe+=`
              let b_data${G} = b[(b_offset + (k + ${G}) * uniforms.N + col) / ${m}];`;for(let G=0;G<w;G++){oe+=`a_data = a[(a_offset + (row + ${G}) * uniforms.K + k) / ${g}];`;for(let pe=0;pe<g;pe++)oe+=`
            values[${G}] = fma(${z.type.value}(a_data${g===1?"":`[${pe}]`}), b_data${pe}, values[${G}]);
`}return oe};return`
  ${T.registerUniforms(q).registerInternalVariables(I).declareVariables(...X,M)}
  ${T.mainStart()}
    ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${m})) * ${m};
    var index1 = global_idx / (uniforms.N / ${m});
    let stride1 = uniforms.M / ${w};
    let row = (index1 % stride1) * ${w};
    let batch = index1 / stride1;

    ${i.length===2?"":`let batch_indices = ${I.offsetToIndices("batch")};`}

    var a_indices: ${E.type.indices};
    ${lr("a_indices",E,E.rank-2,I.rank,"batch_indices")}
    ${E.indicesSet("a_indices",E.rank-2,0)}
    ${E.indicesSet("a_indices",E.rank-1,0)}
    let a_offset = ${E.indicesToOffset("a_indices")};

    var b_indices: ${z.type.indices};
    ${lr("b_indices",z,z.rank-2,I.rank,"batch_indices")}
    ${z.indicesSet("b_indices",z.rank-2,0)}
    ${z.indicesSet("b_indices",z.rank-1,0)}
    let b_offset = ${z.indicesToOffset("b_indices")};
    var values: array<${M.type.value}, ${w}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${g}) {
      ${te()}
    }
    for (var i = 0u; i < ${w}u; i++) {
      var value = values[i];
      ${F}
      ${V}
      let cur_indices = ${M.type.indices}(batch, row + i, col);
      let offset = ${M.indicesToOffset("cur_indices")};
      ${M.setByOffset(`offset / ${m}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${m};${g};${w};${n}`,inputDependencies:v?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:o?o(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:$}),getShaderSource:k}}}),ju,Hu,ba,Pi,Fu,xa,Ku,Gr,Ja=W(()=>{"use strict";ee(),ne(),se(),Bt(),Ya(),Za(),ju=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Hu=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,ba=(e,t,i="f32",r,n=!1,o=32,s=!1,l=32)=>{let p=t[1]*e[1],c=t[0]*e[0],f=n?p:o,m=n?o:p,g=f/t[0],w=o/t[1];if(!((n&&g===4&&e[1]===4||!n&&(g===3||g===4))&&f%t[0]===0&&o%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${n} is true, innerElementSize ${g} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${g} must be 3 or 4.
  tileAWidth ${f} must be divisible by workgroupSize[0]${t[0]}. tileInner ${o} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${g}<${i}>, ${f/g}>, ${m}>;
var<workgroup> mm_Bsub: array<array<vec4<${i}>, ${c/e[0]}>, ${o}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${g};
const tileInner = ${o};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${s?"0":"i32(globalId.z)"};
  ${r?`let batchIndices = ${r.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${p};

  let num_tiles = ${s?`${Math.ceil(l/o)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${s?`i32(globalId.z) * ${l}`:"0"};

  var acc: array<vec4<${i}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${w};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${ju(n,r)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${w}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${r?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${g===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Hu(n,g)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Pi=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,Fu=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",xa=(e,t,i="f32",r,n=!1,o=32,s=!1,l=32,p=!1)=>{let c=e[1]*t[1],f=e[0]*t[0],m=n?c:o,g=n?o:c;if(!(g%t[1]===0&&m%t[0]===0&&o%t[1]===0))throw new Error(`tileAHight ${g} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${m} must be divisible by workgroupSize[0]${t[0]}, tileInner ${o} must be divisible by workgroupSize[1]${t[1]}`);let w=g/t[1],_=m/t[0],v=o/t[1],S=p?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${c};
    let globalColStart = i32(workgroupId.x) * ${f};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${g}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${m}; inputCol = inputCol + ${t[0]}) {
          ${Pi(n,r)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${o}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${f}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${r?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${i}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${n?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${c};

let tileRowA = i32(localId.y) * ${w};
let tileColA = i32(localId.x) * ${_};
let tileRowB = i32(localId.y) * ${v};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${w}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${_}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Pi(n,r)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${v}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${r?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${i}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${Fu(n)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${i}, ${m}>, ${g}>;
  var<workgroup> mm_Bsub : array<array<${i}, ${f}>, ${o}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${o};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${s?"0":"i32(globalId.z)"};
    ${r?`let batchIndices = ${r.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${s?`${Math.ceil(l/o)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${s?`i32(globalId.z) * ${l}`:"0"};

    var acc : array<array<${i}, colPerThread>, rowPerThread>;
    ${S}
  }
`},Ku=(e,t,i,r,n=!1)=>{let[o,s,l,p]=r,c=Ee(r[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${o.type.indices}) -> ${ze(e,c)} {
      var value = ${ze(e,c)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${s.type.indices};
        ${lr("aIndices",s,s.rank-2,o.rank,"batchIndices")}
        ${s.indicesSet("aIndices",s.rank-2,"u32(row)")}
        ${s.indicesSet("aIndices",s.rank-1,"u32(colIn)")}
        value = ${s.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${o.type.indices}) -> ${ze(e,c)} {
      var value = ${ze(e,c)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${l.type.indices};
        ${lr("bIndices",l,l.rank-2,o.rank,"batchIndices")}
        ${l.indicesSet("bIndices",l.rank-2,"u32(row)")}
        ${l.indicesSet("bIndices",l.rank-1,"u32(colIn)")}
        value = ${l.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${ze(e,c)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${n?"bias[colIn]":`${ze(e,c)}(bias[row])`};`:""}
        ${i}
        ${p.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Gr=(e,t,i,r,n=!1,o)=>{let s=e[0].dims,l=e[1].dims,p=s.slice(0,-2),c=l.slice(0,-2),f=r?r.slice(0,-2):i.slice(0,-2),m=O.size(f),g=s[s.length-2],w=s[s.length-1],_=l[l.length-1],v=w%4===0&&_%4===0,S=g<=8?[4,1,1]:[4,4,1],b=[8,8,1],$=[Math.ceil(_/b[0]/S[0]),Math.ceil(g/b[1]/S[1]),Math.ceil(m/b[2]/S[2])],k=v?4:1,T=[...p,g,w/k],I=T.length,E=[...c,w,_/k],z=E.length,M=[m,g,_/k],U=[{type:6,data:g},{type:6,data:_},{type:6,data:w}];At(t,U),U.push(...Z(f,T,E));let V=["rank","rank"],X=e.length>2;X&&(U.push(...Z(e[2].dims)),V.push("rank")),U.push(...Z(M));let F=q=>{let te=f.length,oe=ja("batchDims",e[0].dataType,te,1),G=Ee(e[0].dataType),pe=R("a",e[0].dataType,I,k),de=R("b",e[1].dataType,z,k),Y=K("result",e[0].dataType,M.length,k),be=[pe,de];if(X){let Ce=n?k:1;be.push(R("bias",e[2].dataType,e[2].dims.length,Ce))}let P=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];Ot(t,P);let j=Ee(Y.type.tensor),ue=zt(t,Y.type.value,j),we=Ku(k,X,ue,[oe,pe,de,Y],n);return`
  ${q.registerUniforms(P).registerInternalVariables(oe).declareVariables(...be,Y)}
  ${we}
  ${v?ba(S,b,G,oe):xa(S,b,G,oe)}
                   `};return{name:"MatMul",shaderCache:{hint:`${S};${t.activation};${v};${n}`,inputDependencies:V},getRunData:()=>({outputs:[{dims:o?o(i):i,dataType:e[0].dataType}],dispatchGroup:{x:$[0],y:$[1],z:$[2]},programUniforms:U}),getShaderSource:F}}}),Qu,uh,Z0=W(()=>{"use strict";ee(),ut(),se(),Bt(),Za(),Q0(),Ja(),Qu=(e,t,i,r,n=!1,o,s=4,l=4,p=4,c="f32")=>{let f=U=>{switch(U){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${c}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${U} is not supported.`)}},m=U=>{switch(U){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${U} is not supported.`)}},g=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,w=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,_=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",v=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",S=e?"row":"col",b=e?"col":"row",$=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${S} / outWidth;
    let outCol = ${S} % outWidth;

    let WRow = ${b} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${b} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${b} % inChannels;
    var resData = ${ze(s,c)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${_} && xCol >= 0 && xCol < ${v}) {
      ${g}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${f(s)}
    }
    return resData;`,k=e?t&&r?`
    let col = colIn * ${s};
    ${$}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${$}
    }
    return ${ze(s,c)}(0.0);`:r&&i?`
    let col = colIn * ${s};
    ${$}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${$}
    }
    return ${ze(s,c)}(0.0);`,T=e?r&&i?m(l):`
    let col = colIn * ${l};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${m(l)}
    }
    return ${ze(l,c)}(0.0);`:`
    let col = colIn * ${l};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${m(l)}
    }
    return ${ze(l,c)}(0.0);`,I=ze(p,c),E=ze(e?s:l,c),z=ze(e?l:s,c),M=zt(o,I,c);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${E} {
      ${e?k:T}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${z} {
      ${e?T:k}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${I}) {
      let col = colIn * ${p};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${w}
      ${sh(n)}
      ${M}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},uh=(e,t,i,r,n,o,s,l,p)=>{let c=t.format==="NHWC",f=c?e[0].dims[3]:e[0].dims[1],m=i[0],g=c?i[2]:i[3],w=c?i[1]:i[2],_=c?i[3]:i[1],v=c&&(f%4===0||f%3===0)&&_%4===0,S=c?_:g*w,b=c?g*w:_,$=[8,8,1],k=r<=8?[4,1,1]:[4,4,1],T=[Math.ceil(S/$[0]/k[0]),Math.ceil(b/$[1]/k[1]),Math.ceil(m/$[2]/k[2])];he("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${T}`);let I=v?c&&f%4!==0?3:4:1,E=$[1]*k[1],z=$[0]*k[0],M=Math.max($[0]*I,$[1]),U=r%E===0,V=n%z===0,X=o%M===0,F=v?[I,4,4]:[1,1,1],q=[{type:6,data:r},{type:6,data:n},{type:6,data:o},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];At(t,q),q.push(...Z(e[0].dims,e[1].dims));let te=["rank","rank"];s&&(q.push(...Z(e[2].dims)),te.push("rank")),q.push(...Z(i));let oe=G=>{let pe=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];Ot(t,pe);let de=v?4:1,Y=Ee(e[0].dataType),be=`
      fn setOutputAtIndex(flatIndex : i32, value : ${v?`vec4<${Y}>`:Y}) {
        result[flatIndex] = ${v?`vec4<${Y}>`:Y}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${v?`vec4<${Y}>`:Y}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${v?"/ 4":""}, value);
      }`,P=R("x",e[0].dataType,e[0].dims.length,I===3?1:I),j=R("w",e[1].dataType,e[1].dims.length,de),ue=[P,j],we=K("result",e[0].dataType,i.length,de);if(s){let Ce=R("bias",e[2].dataType,e[2].dims.length,de);ue.push(Ce),be+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${v?`vec4<${Y}>`:Y} {
          return bias[coords.${c?"w":"y"}${v?"/ 4":""}];
        }`}return`
        ${oh("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${G.registerUniforms(pe).declareVariables(...ue,we)}
        ${be}
        ${Qu(c,U,V,X,s,t,F[0],F[1],F[2],Y)}
        ${v?ba(k,$,Y,void 0,!c,M):xa(k,$,Y,void 0,!c,M,!1,void 0,l)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${I};${v};${U};${V};${X};${E};${z};${M}`,inputDependencies:te},getRunData:()=>({outputs:[{dims:p?p(i):i,dataType:e[0].dataType}],dispatchGroup:{x:T[0],y:T[1],z:T[2]},programUniforms:q}),getShaderSource:oe}}}),Zu,Ui,Jt,Xu,Wi,Yu,lh,dh,X0=W(()=>{"use strict";ee(),ut(),ne(),se(),Bt(),Za(),Zu=e=>{let t=1;for(let i=0;i<e.length;i++)t*=e[i];return t},Ui=e=>typeof e=="number"?[e,e,e]:e,Jt=(e,t)=>t<=1?e:e+(e-1)*(t-1),Xu=(e,t,i,r=1)=>{let n=Jt(t,r);return Math.floor((e[0]*(i-1)-i+n)/2)},Wi=(e,t,i,r,n)=>{n==null&&(n=Xu(e,t[0],r[0]));let o=[0,0,0,i];for(let s=0;s<3;s++)e[s]+2*n>=t[s]&&(o[s]=Math.trunc((e[s]-t[s]+2*n)/r[s]+1));return o},Yu=(e,t,i,r,n,o,s,l,p,c)=>{let f,m,g,w;if(e==="VALID"&&(e=0),typeof e=="number"){f={top:e,bottom:e,left:e,right:e,front:e,back:e};let _=Wi([t,i,r,1],[l,p,c],1,[n,o,s],e);m=_[0],g=_[1],w=_[2]}else if(Array.isArray(e)){if(!e.every((v,S,b)=>v===b[0]))throw Error(`Unsupported padding parameter: ${e}`);f={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let _=Wi([t,i,r,1],[l,p,c],1,[n,o,s],e[0]);m=_[0],g=_[1],w=_[2]}else if(e==="SAME_UPPER"){m=Math.ceil(t/n),g=Math.ceil(i/o),w=Math.ceil(r/s);let _=(m-1)*n+l-t,v=(g-1)*o+p-i,S=(w-1)*s+c-r,b=Math.floor(_/2),$=_-b,k=Math.floor(v/2),T=v-k,I=Math.floor(S/2),E=S-I;f={top:k,bottom:T,left:I,right:E,front:b,back:$}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:f,outDepth:m,outHeight:g,outWidth:w}},lh=(e,t,i,r,n,o=!1,s="channelsLast")=>{let l,p,c,f,m;if(s==="channelsLast")[l,p,c,f,m]=e;else if(s==="channelsFirst")[l,m,p,c,f]=e;else throw new Error(`Unknown dataFormat ${s}`);let[g,,w,_,v]=t,[S,b,$]=Ui(i),[k,T,I]=Ui(r),E=Jt(w,k),z=Jt(_,T),M=Jt(v,I),{padInfo:U,outDepth:V,outHeight:X,outWidth:F}=Yu(n,p,c,f,S,b,$,E,z,M),q=o?g*m:g,te=[0,0,0,0,0];return s==="channelsFirst"?te=[l,q,V,X,F]:s==="channelsLast"&&(te=[l,V,X,F,q]),{batchSize:l,dataFormat:s,inDepth:p,inHeight:c,inWidth:f,inChannels:m,outDepth:V,outHeight:X,outWidth:F,outChannels:q,padInfo:U,strideDepth:S,strideHeight:b,strideWidth:$,filterDepth:w,filterHeight:_,filterWidth:v,effectiveFilterDepth:E,effectiveFilterHeight:z,effectiveFilterWidth:M,dilationDepth:k,dilationHeight:T,dilationWidth:I,inShape:e,outShape:te,filterShape:t}},dh=(e,t,i,r,n,o)=>{let s=o==="channelsLast",l=s?e[0].dims[3]:e[0].dims[1],p=!1,c=[64,1,1],f={x:i.map(($,k)=>k)},m=[Math.ceil(Zu(f.x.map($=>i[$]))/c[0]),1,1];he("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${m}`);let g=p?s&&l%4!==0?3:4:1,w=O.size(i),_=[{type:12,data:w},{type:12,data:r},{type:12,data:n},{type:12,data:t.strides},{type:12,data:t.dilations}];At(t,_),_.push(...Z(e[0].dims,e[1].dims));let v=["rank","rank"],S=e.length===3;S&&(_.push(...Z(e[2].dims)),v.push("rank")),_.push(...Z(i));let b=$=>{let k=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:r.length},{name:"pads",type:"u32",length:n.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];Ot(t,k);let T=p?4:1,I=Ee(e[0].dataType),E=R("x",e[0].dataType,e[0].dims.length,g===3?1:g),z=R("W",e[1].dataType,e[1].dims.length,T),M=[E,z],U=K("result",e[0].dataType,i.length,T),V="";if(S){let q=R("bias",e[2].dataType,e[2].dims.length,T);M.push(q),V+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${p?`vec4<${I}>`:I} {
          return bias[${s?Q("coords",4,5):Q("coords",1,5)}${p?"/ 4":""}];
        }`}let X=ze(g,I),F=zt(t,X,I);return`
            ${V}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${E.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${z.getByIndices("aIndices")};
            }
          ${$.registerUniforms(k).declareVariables(...M,U)}
          ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${U.offsetToIndices("global_idx")};
              let batch = ${Q("coords",0,E.rank)};
              let d2 = ${s?Q("coords",E.rank-1,E.rank):Q("coords",1,E.rank)};
              let xFRCCorner = vec3<u32>(${s?Q("coords",1,E.rank):Q("coords",2,E.rank)},
              ${s?Q("coords",2,E.rank):Q("coords",3,E.rank)},
              ${s?Q("coords",3,E.rank):Q("coords",4,E.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?Q("uniforms.x_shape",1,E.rank):Q("uniforms.x_shape",2,E.rank)};
              let xShapeZ = ${s?Q("uniforms.x_shape",2,E.rank):Q("uniforms.x_shape",3,E.rank)};
              let xShapeW = ${s?Q("uniforms.x_shape",3,E.rank):Q("uniforms.x_shape",4,E.rank)};
              let xShapeU = ${s?Q("uniforms.x_shape",4,E.rank):Q("uniforms.x_shape",1,E.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${s?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${s?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${s?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${s?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${S?"value = value + getBiasByOutputCoords(coords)":""};
              ${F}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${g};${S}`,inputDependencies:v},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:m[0],y:m[1],z:m[2]},programUniforms:_}),getShaderSource:b}}}),ph,ch,Y0=W(()=>{"use strict";ee(),ne(),se(),Bt(),ph=(e,t,i,r)=>{let n=e.length>2,o=n?"value += b[output_channel];":"",s=e[0].dims,l=e[1].dims,p=t.format==="NHWC",c=p?i[3]:i[1],f=c/t.group,m=p&&f>=4?Se(c):1,g=O.size(i)/m,w=[{type:12,data:g},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:f}];At(t,w),w.push(...Z(s,[l[0],l[1],l[2],l[3]/m]));let _=n?["rank","rank","rank"]:["rank","rank"];w.push(...Z([i[0],i[1],i[2],i[3]/m]));let v=S=>{let b=K("output",e[0].dataType,i.length,m),$=Ee(b.type.tensor),k=zt(t,b.type.value,$),T=R("x",e[0].dataType,s.length),I=R("w",e[1].dataType,l.length,m),E=[T,I];n&&E.push(R("b",e[2].dataType,e[2].dims,m));let z=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];Ot(t,z);let M=p?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${T.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${I.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${T.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${I.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${S.registerUniforms(z).declareVariables(...E,b)}

  ${S.mainStart()}
    ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${b.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${p?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${p?1:2}], outputIndices[${p?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${m} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${p?2:1}];

    var value: ${b.type.value} = ${b.type.value}(0);
    ${M}
    ${o}
    ${k}
    ${b.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${m}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:r?r(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:w}),getShaderSource:v}},ch=(e,t,i,r)=>{let n=e.length>2,o=Se(i[3]),s=Se(i[2]),l=O.size(i)/o/s,p=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/o],c=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/o],f=[i[0],i[1],i[2],i[3]/o],m=[{type:12,data:l},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];At(t,m),m.push(...Z(p,c,f));let g=(s-1)*t.strides[1]+c[1],w=_=>{let v=K("output",e[0].dataType,f.length,o),S=Ee(v.type.tensor),b=zt(t,v.type.value,S),$=R("x",e[0].dataType,p.length,o),k=R("w",e[1].dataType,c.length,o),T=[$,k];n&&T.push(R("b",e[2].dataType,e[2].dims,o));let I=n?"value += b[output_channel];":"",E=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return Ot(t,E),`
  ${_.registerUniforms(E).declareVariables(...T,v)}
  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${s}u;
    let col = (index1 % width1) * ${s}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${$.type.value}, ${g}>;
    var values: array<${v.type.value}, ${s}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${c[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${g}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${$.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${$.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${c[1]}; w_width++) {
          let w_val = ${k.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${s}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${s}u; i++) {
      var value = values[i];
      ${I}
      ${b}
      ${v.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${o};${s};${g};${c[0]};${c[1]}`,inputDependencies:n?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:r?r(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:m}),getShaderSource:w}}}),Ju,Ar,el,Or,Sa,qi,tl,rl,ka,J0=W(()=>{"use strict";ne(),Z0(),X0(),Ja(),Y0(),Bt(),Ya(),$t(),Ju=(e,t,i,r,n,o)=>{let s=e[0],l=e.slice(o?1:2,o?3:4),p=l.length,c=t[0],f=t.slice(2).map((g,w)=>g+(g-1)*(i[w]-1)),m=l.map((g,w)=>g+r[w]+r[w+p]).map((g,w)=>Math.floor((g-f[w]+n[w])/n[w]));return m.splice(0,0,s),m.splice(o?3:1,0,c),m},Ar=[2,3,1,0],el=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let i=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],r=e[1].dims[1]*t.group;if(i!==r)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let n=e[0].dims.length-2;if(t.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(t.strides.length!==n)throw new Error(`strides should be ${n}D`);if(t.pads.length!==n*2)throw new Error(`pads should be ${n*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Or=(e,t)=>{let i=e.kernelShape.slice();i.length<t[1].dims.length-2&&i.push(...Array(t[1].dims.length-2-i.length).fill(0));for(let o=2;o<t[1].dims.length;++o)i[o-2]===0&&(i[o-2]=t[1].dims[o]);let r=e.pads.slice();Lr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,i,r,e.format==="NHWC",e.autoPad);let n=Object.assign({},e);return Object.assign(n,{kernelShape:i,pads:r}),n},Sa=e=>{let t=Qa(e),i=e.format,r=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],n=e.dilations,o=e.group,s=e.kernel_shape,l=e.pads,p=e.strides,c=e.w_is_const();return{autoPad:r,format:i,dilations:n,group:o,kernelShape:s,pads:l,strides:p,wIsConst:c,...t,cacheKey:`${e.format};${t.activation};`}},qi=(e,t,i,r)=>{let n=i.format==="NHWC",o=Ju(t[0].dims,t[1].dims,i.dilations,i.pads,i.strides,n);if(i.group!==1){let E=[t[0]];if(n){let z=e.kernelCustomData.wT??e.compute(Me(t[1],Ar),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=z),E.push(z)}else E.push(t[1]);t.length===3&&E.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&n&&t[1].dims[0]===i.group&&t[1].dims[1]===1&&i.dilations[0]===1&&i.dilations[1]===1?e.compute(ch(E,i,o,r),{inputs:E}):e.compute(ph(E,i,o,r),{inputs:E});return}let s=t.length===3,l=t[0].dims[n?1:2],p=t[0].dims[n?2:3],c=t[0].dims[n?3:1],f=t[1].dims[2],m=t[1].dims[3],g=o[n?1:2],w=o[n?2:3],_=o[n?3:1],v=n&&f===l&&m===p&&i.pads[0]===0&&i.pads[1]===0;if(v||f===1&&m===1&&i.dilations[0]===1&&i.dilations[1]===1&&i.strides[0]===1&&i.strides[1]===1&&i.pads[0]===0&&i.pads[1]===0){let E=o[0],z,M,U,V=[];if(n){let q=e.kernelCustomData.wT??e.compute(Me(t[1],Ar),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];if(i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=q),v){let te=l*p*c;z=t[0].reshape([1,E,te]),M=q.reshape([1,te,_]),U=[1,E,_]}else z=t[0].reshape([E,l*p,c]),M=q.reshape([1,c,_]),U=[E,g*w,_];V.push(z),V.push(M)}else z=t[0].reshape([E,c,l*p]),M=t[1].reshape([1,_,c]),U=[E,_,g*w],V.push(M),V.push(z);s&&V.push(t[2]);let X=U[2],F=V[0].dims[V[0].dims.length-1];X<8&&F<8?e.compute(Xa(V,i,o,U,n,r),{inputs:V}):e.compute(Gr(V,i,o,U,n,r),{inputs:V});return}let S=!0,b=e.kernelCustomData.wT??e.compute(Me(t[1],Ar),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=b);let $=[t[0],b];s&&$.push(t[2]);let k=n?g*w:_,T=n?_:g*w,I=f*m*c;e.compute(uh($,i,o,k,T,I,s,S,r),{inputs:$})},tl=(e,t)=>{let i=t.format==="NHWC",r=[e.inputs[0].reshape(i?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let n=[0,t.pads[0],0,t.pads[1]],o=[1].concat(t.strides),s=[1].concat(t.dilations),l=[1].concat(t.kernelShape),p=Or({...t,pads:n,strides:o,dilations:s,kernelShape:l},r);qi(e,r,p,c=>i?[c[0],c[2],c[3]]:[c[0],c[1],c[3]])},rl=(e,t,i)=>{let r=i.format==="NHWC"?"channelsLast":"channelsFirst",n=Or(i,t),o=i.autoPad==="NOTSET"?i.pads:i.autoPad,s=lh(t[0].dims,t[1].dims,i.strides,i.dilations,o,!1,r);e.compute(dh(t,n,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],r))},ka=(e,t)=>{if(el(e.inputs,t),e.inputs[0].dims.length===3)tl(e,t);else if(e.inputs[0].dims.length===5)rl(e,e.inputs,t);else{let i=Or(t,e.inputs);qi(e,e.inputs,i)}}}),hh,ey=W(()=>{"use strict";ee(),ut(),ne(),se(),hh=(e,t,i)=>{let r=e.length>2,n=t.outputShape,o=t.format==="NHWC",s=t.group,l=e[1].dims,p=l[2]/s,c=l[3],f=o?Se(p):1,m=o?Se(c):1,g=o?c===1?f:m:1,w=O.size(n)/m,_=[Math.ceil(w/64),1,1];he("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${_}`);let v=["rank","rank"],S=[t.strides[0],t.strides[1]],b=[t.kernelShape[o?1:2],t.kernelShape[o?2:3]],$=[t.dilations[0],t.dilations[1]],k=[b[0]+(t.dilations[0]<=1?0:(t.kernelShape[o?1:2]-1)*(t.dilations[0]-1)),b[1]+(t.dilations[1]<=1?0:(t.kernelShape[o?2:3]-1)*(t.dilations[1]-1))],T=[k[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),k[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],I=[{type:12,data:w},{type:12,data:S},{type:12,data:b},{type:12,data:$},{type:12,data:k},{type:6,data:T},{type:12,data:p},{type:12,data:c},...Z(e[0].dims,e[1].dims)];r&&(I.push(...Z(e[2].dims)),v.push("rank")),I.push(...Z(n));let E=z=>{let M=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:S.length},{name:"filter_dims",type:"u32",length:b.length},{name:"dilations",type:"u32",length:b.length},{name:"effective_filter_dims",type:"u32",length:k.length},{name:"pads",type:"i32",length:T.length},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],U=Ee(e[0].dataType),V=o?1:2,X=o?2:3,F=o?3:1,q=R("W",e[1].dataType,e[1].dims.length,g),te=R("Dy",e[0].dataType,e[0].dims.length,f),oe=[te,q];r&&oe.push(R("bias",e[2].dataType,[n[F]].length,m));let G=K("result",e[0].dataType,n.length,m),pe=()=>{let Y="";if(f===1)Y+=`
        let w_offset = ${q.indicesToOffset(`${q.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
        let wValue = ${q.getByOffset(`w_offset / ${g}`)};
        dotProd = dotProd + xValue * wValue;`;else if(c===1)Y+=`
          let wValue = ${q.getByOffset(`${q.indicesToOffset(`${q.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)} / ${g}`)};
          dotProd = dotProd + dot(xValue, wValue);`;else for(let be=0;be<f;be++)Y+=`
            let wValue${be} = ${q.getByOffset(`${q.indicesToOffset(`${q.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${be}, wOutChannel)`)} / ${g}`)};
            dotProd = dotProd + xValue[${be}] * wValue${be};`;return Y},de=`
            let outputIndices = ${G.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${G.indicesGet("outputIndices",0)};
            let d1 = ${G.indicesGet("outputIndices",F)};
            let r = ${G.indicesGet("outputIndices",V)};
            let c = ${G.indicesGet("outputIndices",X)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${G.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${U}(dyRCorner) + ${U}(wR)) / ${U}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${U}(uniforms.Dy_shape[${V}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }

              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${U}(dyCCorner) + ${U}(wC)) / ${U}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${U}(uniforms.Dy_shape[${X}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group; d2 = d2 + ${f}) {
                  let xValue = ${o?te.getByOffset(`${te.indicesToOffset(`${te.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${f}`):te.get("batch","inputChannel","idyR","idyC")};
                  ${pe()}
                  inputChannel = inputChannel + ${f};
                }
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${r?` + bias[d1 / ${m}]`:""};
            ${G.setByOffset("global_idx","value")};
          `;return`
    ${z.registerUniforms(M).declareVariables(...oe,G)}
      ${z.mainStart()}
      ${z.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${de}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${f}${g}${m}${c===1}`,inputDependencies:v},getRunData:()=>({dispatchGroup:{x:_[0],y:_[1],z:_[2]},outputs:[{dims:i?i(n):n,dataType:e[0].dataType}],programUniforms:I}),getShaderSource:E}}}),il,al,nl,Li,fh,sl,Vi,ol,mh,ty=W(()=>{"use strict";ey(),Bt(),$t(),il=(e,t,i,r,n,o)=>(e-1)*t+i+(r-1)*n+1-o,al=(e,t,i,r,n)=>{let o=Math.floor(e/2);t==="SAME_UPPER"?(i[r]=o,i[n]=e-o):t==="SAME_LOWER"&&(i[r]=e-o,i[n]=o)},nl=(e,t,i,r,n,o,s,l,p,c)=>{let f=e.length-2,m=c.length===0;p.length<f&&p.push(...Array(f-p.length).fill(0));let g=e[0],w=t[l?3:1]*n;for(let _=0,v=e.length-f-(l?1:0);_<f;++_,++v){let S=e[v],b=m?S*s[_]:c[_],$=il(S,s[_],o[_],t[v],i[_],b);al($,r,o,_,_+f),m&&c.push(s[_]*(S-1)+p[_]+(t[v]-1)*i[_]+1-o[_]-o[_+f])}c.splice(0,0,g),c.splice(l?3:1,0,w)},Li=(e,t)=>{let i=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((m,g)=>m*g,1)===0){i.length=0;for(let m=2;m<t[1].dims.length;++m)i.push(t[1].dims[m])}let r=e.format==="NHWC";i.splice(0,0,t[1].dims[0]),i.splice(r?3:1,0,t[1].dims[1]);let n=e.pads.slice(),o=e.outputShape.slice(),s=e.outputPadding.slice(),l=t[0].dims,p=e.dilations.slice();if(p.reduce((m,g)=>m+g,0)===0){let m=t[0].dims.length-2;p=new Array(m).fill(1)}let c=e.strides.slice();if(c.reduce((m,g)=>m+g,0)===0){let m=t[0].dims.length-2;c=new Array(m).fill(1)}nl(l,i,p,e.autoPad,e.group,n,c,r,s,o);let f=Object.assign({},e);return Object.assign(f,{kernelShape:i,pads:n,outputPadding:s,outputShape:o,dilations:p,strides:c}),f},fh=e=>{let t=Qa(e),i=e.format,r=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],n=e.dilations,o=e.group,s=e.kernelShape,l=e.pads,p=e.strides,c=e.wIsConst(),f=e.outputPadding,m=e.outputShape;return{autoPad:r,format:i,dilations:n,group:o,kernelShape:s,outputPadding:f,outputShape:m,pads:l,strides:p,wIsConst:c,...t,cacheKey:`${e.format};${t.activation};`}},sl=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let i=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],r=e[1].dims[0];if(i!==r)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let n=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==n))throw new Error("invalid bias");let o=e[0].dims.length-2;if(t.dilations.reduce((s,l)=>s+l,0)>0&&t.dilations.length!==o)throw new Error(`dilations should be ${o}D`);if(t.strides.reduce((s,l)=>s+l,0)>0&&t.strides.length!==o)throw new Error(`strides should be ${o}D`);if(t.pads.reduce((s,l)=>s+l,0)>0&&t.pads.length!==o*2)throw new Error(`pads should be ${o*2}D`);if(t.outputPadding.length!==o&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${o}D`);if(t.kernelShape.reduce((s,l)=>s+l,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Vi=(e,t,i,r)=>{let n=e.kernelCustomData.wT??e.compute(Me(t[1],[2,3,0,1]),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=n);let o=[t[0],n];t.length===3&&o.push(t[2]),e.compute(hh(o,i,r),{inputs:o})},ol=(e,t)=>{let i=t.format==="NHWC",r=[e.inputs[0].reshape(i?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let n=t.kernelShape;(n.length===0||n[0]===0)&&(n=[e.inputs[1].dims[2]]);let o=t.dilations;(o.length===0||o[0]===0)&&(o=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let l=t.pads;l.length===0&&(l=[0,0]),l=[0,l[0],0,l[1]],s=[1].concat(s),o=[1].concat(o),n=[1].concat(n);let p=t.outputPadding;p=[0].concat(p);let c=Li({...t,pads:l,strides:s,dilations:o,kernelShape:n,outputPadding:p},r);Vi(e,r,c,f=>i?[f[0],f[2],f[3]]:[f[0],f[1],f[3]])},mh=(e,t)=>{if(sl(e.inputs,t),e.inputs[0].dims.length===3)ol(e,t);else{let i=Li(t,e.inputs);Vi(e,e.inputs,i)}}}),ul,gh,yh,ry=W(()=>{"use strict";ee(),ne(),ke(),se(),ul=(e,t,i,r)=>{let n=O.size(t),o=t.length,s=R("input",e,o),l=K("output",e,o),p=i.dataType===6?i.getInt32Array()[0]:Number(i.getBigInt64Array()[0]),c=O.normalizeAxis(p,o),f=m=>{let g=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,w=Q("uniforms.input_shape","uniforms.axis",o),_=r.reverse?g+(r.exclusive?" + 1":""):"0",v=r.reverse?w:g+(r.exclusive?"":" + 1");return`
                ${m.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(s,l)}
                ${m.mainStart()}
                  ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${l.offsetToIndices("global_idx")};
                  var sum = ${l.type.value}(0);
                  let first : i32 = ${_};
                  let last : i32 = ${v};
                  for (var i : i32 = first; i < last; i++) {
                    ${s.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${s.getByIndices("inputIndices")};
                  }
                  ${l.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:r.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:[{type:12,data:n},{type:12,data:c},...Z(t,t)]}),getShaderSource:f}},gh=(e,t)=>{let i=e.inputs[0].dims,r=e.inputs[0].dataType,n=e.inputs[1];e.compute(ul(r,i,n,t),{inputs:[0]})},yh=e=>{let t=e.exclusive===1,i=e.reverse===1;return ye({exclusive:t,reverse:i})}}),ll,dl,pl,_h,wh,iy=W(()=>{"use strict";ee(),ne(),ke(),se(),ll=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},dl=(e,t,i,r)=>{let n=[];n.push(`fn perm(i: ${r.type.indices}) -> ${i.type.indices} {
    var a: ${i.type.indices};`);for(let o=0;o<t;++o)n.push(i.indicesSet("a",e[o],`i[${o}]`));return n.push("return a;}"),n.join(`
`)},pl=(e,t)=>{let i,r,n,o,s,l,p=t.format==="NHWC",c=t.blocksize,f=t.mode==="DCR";p?([i,r,n,o]=e.dims,s=f?[i,r,n,c,c,o/c**2]:[i,r,n,o/c**2,c,c],l=f?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([i,r,n,o]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=f?[i,c,c,o/c**2,r,n]:[i,o/c**2,c,c,r,n],l=f?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let m=e.reshape(s),g=m.dims.length,w=e.dataType,_=R("a",w,g),v=K("output",w,g),S=b=>`
  ${b.registerUniform("output_size","u32").declareVariables(_,v)}

  ${dl(l,g,_,v)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${v.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${v.setByOffset("global_idx",_.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:b=>{let $=p?[i,r*c,n*c,o/c**2]:[i,o/c**2,r*c,n*c],k=O.size($),T=m.dims,I=O.sortBasedOnPerm(T,l);return{outputs:[{dims:$,dataType:b[0].dataType}],dispatchGroup:{x:Math.ceil(k/64)},programUniforms:[{type:12,data:k},...Z(T,I)]}},getShaderSource:S}},_h=(e,t)=>{ll(e.inputs),e.compute(pl(e.inputs[0],t))},wh=e=>ye({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Rr,er,Gi,cl,hl,fl,ml,ji,gl,$h,vh,ay=W(()=>{"use strict";ee(),ne(),ke(),se(),Rr="[a-zA-Z]|\\.\\.\\.",er="("+Rr+")+",Gi="^"+er+"$",cl="("+er+",)*"+er,hl="^"+cl+"$",fl=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let i=this.symbolToIndices.get(e);i===void 0?i=[t]:i.push(t),this.symbolToIndices.set(e,i)}},ml=class{constructor(e,t){this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[i,r]=t.includes("->")?t.split("->",2):[t,""];if(!i.match(RegExp(hl)))throw new Error("Invalid LHS term");if(i.split(",").forEach((n,o)=>{let s=e[o].dims.slice();if(!n.match(RegExp(Gi)))throw new Error("Invalid LHS term");let l=this.processTerm(n,!0,s,o);this.lhs.push(l)}),r==="")r+=[...this.symbolToInfo.entries()].filter(([n,o])=>o.count===1||n==="...").map(([n])=>n).join("");else if(!r.match(RegExp(er)))throw new Error("Invalid RHS");r.match(RegExp(Rr,"g"))?.forEach(n=>{if(n==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let o=this.symbolToInfo.get(n);if(o===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(o.dimValue)}}),this.rhs=this.processTerm(r,!1,this.outputDims)}addSymbol(e,t,i){let r=this.symbolToInfo.get(e);if(r!==void 0){if(r.dimValue!==t&&r.count!==1)throw new Error("Dimension mismatch");r.count++,r.inputIndices.push(i)}else r={count:1,dimValue:t,inputIndices:[i]};this.symbolToInfo.set(e,r)}processTerm(e,t,i,r=-1){let n=i.length,o=!1,s=[],l=0;if(!e.match(RegExp(Gi))&&!t&&e!=="")throw new Error("Invalid LHS term");let p=e.match(RegExp(Rr,"g")),c=new fl(r);return p?.forEach((f,m)=>{if(f==="..."){if(o)throw new Error("Only one ellipsis is allowed per input term");o=!0;let g=n-p.length+1;if(g<0)throw new Error("Ellipsis out of bounds");if(s=i.slice(l,l+g),this.hasEllipsis){if(this.ellipsisDims.length!==s.length||this.ellipsisDims.toString()!==s.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=s;else throw new Error("Ellipsis must be specified in the LHS");for(let w=0;w<s.length;w++){let _=String.fromCharCode(48+w);c.addSymbol(_,m+w),this.addSymbol(_,i[l++],r)}}else c.addSymbol(f,m+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(f,i[l++],r)}),c}},ji=e=>e+"_max",gl=(e,t,i,r)=>{let n=e.map(c=>c.length).map((c,f)=>R(`input${f}`,t,c)),o=O.size(r),s=K("output",t,r.length),l=[...i.symbolToInfo.keys()].filter(c=>!i.rhs.symbolToIndices.has(c)),p=c=>{let f=[],m="var prod = 1.0;",g="var sum = 0.0;",w="sum += prod;",_=[],v=[],S=[],b=[],$=i.symbolToInfo.size===i.rhs.symbolToIndices.size;i.symbolToInfo.forEach((T,I)=>{if(i.rhs.symbolToIndices.has(I)){let E=i.rhs.symbolToIndices.get(I)?.[0];E!==void 0&&i.lhs.forEach((z,M)=>{if(T.inputIndices.includes(M)){let U=z.symbolToIndices.get(I);if(U===void 0)throw new Error("Invalid symbol error");U.forEach(V=>{f.push(`${n[M].indicesSet(`input${M}Indices`,V,s.indicesGet("outputIndices",E))}`)})}})}else i.lhs.forEach((E,z)=>{if(T.inputIndices.includes(z)){let M=E.symbolToIndices.get(I);if(M===void 0)throw new Error("Invalid symbol error");M.forEach(U=>{_.push(`${n[z].indicesSet(`input${z}Indices`,U,`${I}`)}`)}),b.push(`prod *= ${n[z].getByIndices(`input${z}Indices`)};`)}}),v.push(`for(var ${I}: u32 = 0; ${I} < uniforms.${ji(I)}; ${I}++) {`),S.push("}")});let k=$?[...f,`let sum = ${n.map((T,I)=>T.getByIndices(`input${I}Indices`)).join(" * ")};`]:[...f,g,...v,..._,m,...b,w,...S];return`
            ${c.registerUniforms(l.map(T=>({name:`${ji(T)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...n,s)}

            ${c.mainStart()}
            ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${s.offsetToIndices("global_idx")};
            ${n.map((T,I)=>`var input${I}Indices: ${n[I].type.indices};`).join(`
`)}
            ${k.join(`
`)};
            ${s.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:i.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let c=l.filter(m=>i.symbolToInfo.has(m)).map(m=>({type:12,data:i.symbolToInfo.get(m)?.dimValue||0}));c.push({type:12,data:o});let f=e.map((m,g)=>[...Z(m)]).reduce((m,g)=>m.concat(g),c);return f.push(...Z(r)),{outputs:[{dims:r,dataType:t}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:f}},getShaderSource:p}},$h=(e,t)=>{let i=new ml(e.inputs,t.equation),r=i.outputDims,n=e.inputs.map((o,s)=>o.dims);e.compute(gl(n,e.inputs[0].dataType,i,r))},vh=e=>{let t=e.equation.replace(/\s+/g,"");return ye({equation:t})}}),yl,Hi,_l,wl,bh,ny=W(()=>{"use strict";ee(),ne(),se(),yl=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,i=Array.from(e[1].getBigInt64Array(),Number),r=i.length<t.length?0:i.length-t.length,n=t.length<i.length?0:t.length-i.length;for(;r<i.length&&n<t.length;++r,++n)if(i[r]!==t[n]&&i[r]!==1&&t[n]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Hi=(e,t)=>{let i=e.length-t.length,r=[];for(let n=0;n<i;++n)r.push(e[n]);for(let n=0;n<t.length;++n)r.push(t[n]===1?e[n+i]:t[n]);return r},_l=(e,t)=>e.length>t.length?Hi(e,t):Hi(t,e),wl=e=>{let t=e[0].dims,i=Array.from(e[1].getBigInt64Array(),Number),r=_l(t,i),n=e[0].dataType,o=n===9||O.size(t)===1,s=n===9||t.length>0&&t[t.length-1]%4===0?4:1,l=o||r.length>0&&r[r.length-1]%4===0?4:1,p=Math.ceil(O.size(r)/l),c=m=>{let g=R("input",n,t.length,s),w=K("output",n,r.length,l),_;if(n===9){let v=(S,b,$="")=>`
          let outputIndices${b} = ${w.offsetToIndices(`outputOffset + ${b}u`)};
          let offset${b} = ${g.broadcastedIndicesToOffset(`outputIndices${b}`,w)};
          let index${b} = offset${b} / 4u;
          let component${b} = offset${b} % 4u;
          ${S}[${b}] = ${$}(${g.getByOffset(`index${b}`)}[component${b}]);
        `;_=`
        let outputOffset = global_idx * ${l};
        var data = vec4<u32>(0);
        ${v("data",0,"u32")}
        ${v("data",1,"u32")}
        ${v("data",2,"u32")}
        ${v("data",3,"u32")}
        ${w.setByOffset("global_idx","data")}
      }`}else _=`
        let outputIndices = ${w.offsetToIndices(`global_idx * ${l}`)};
        let inputOffset = ${g.broadcastedIndicesToOffset("outputIndices",w)};
        let data = ${w.type.value}(${g.getByOffset(`inputOffset / ${s}`)});
        ${w.setByOffset("global_idx","data")}
      }`;return`
    ${m.registerUniform("vec_size","u32").declareVariables(g,w)}
    ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${_}`},f=[{type:12,data:p},...Z(t,r)];return{name:"Expand",shaderCache:{hint:`${r.length};${s}${l}`,inputDependencies:["rank"]},getShaderSource:c,getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f})}},bh=e=>{yl(e.inputs),e.compute(wl(e.inputs),{inputs:[0]})}}),$l,xh,sy=W(()=>{"use strict";ee(),ne(),se(),Ka(),$l=e=>{let t=e[0].dataType,i=O.size(e[0].dims),r=O.size(e[1].dims),n=r%4===0,o=s=>{let l=R("x",t,[1],4),p=R("bias",t,[1],4),c=K("y",t,[1],4),f=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],m=w=>`
      let bias${w}_offset: u32 = (global_idx * 4 + ${w}) % uniforms.bias_size;
      let bias${w} = ${p.getByOffset(`bias${w}_offset / 4`)}[bias${w}_offset % 4];`,g=n?`
      let bias = ${p.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${m(0)}${m(1)}${m(2)}${m(3)}
      let bias = ${l.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(f).declareVariables(l,p,c)}

    ${$a(Oe(t))}

    ${s.mainStart(Vt)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${l.getByOffset("global_idx")};
      ${g}
      let x_in = x + bias;
      ${c.setByOffset("global_idx",va("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${n}`,inputDependencies:["type","type"]},getShaderSource:o,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(i/4)},{type:12,data:r}],dispatchGroup:{x:Math.ceil(i/Vt/4)}})}},xh=e=>{e.inputs.length<2||O.size(e.inputs[1].dims)===0?Vc(e):e.compute($l(e.inputs))}}),vl,bl,Sh,kh,oy=W(()=>{"use strict";ee(),ne(),ke(),se(),vl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},bl=(e,t)=>{let i=e[0].dims,r=e[1].dims,n=i.length,o=O.normalizeAxis(t.axis,n),s=i.slice(0);s.splice(o,1,...r);let l=i[o],p=e[0].dataType===9?4:1,c=Math.ceil(O.size(s)/p),f=[{type:12,data:c},{type:6,data:l},{type:12,data:o},...Z(e[0].dims,e[1].dims,s)],m=g=>{let w=R("data",e[0].dataType,e[0].dims.length,p),_=R("inputIndices",e[1].dataType,e[1].dims.length),v=K("output",e[0].dataType,s.length,p),S=$=>{let k=r.length,T=`var indicesIndices${$}  = ${_.type.indices}(0);`;for(let I=0;I<k;I++)T+=`${k>1?`indicesIndices${$}[${I}]`:`indicesIndices${$}`} = ${s.length>1?`outputIndices${$}[uniforms.axis + ${I}]`:`outputIndices${$}`};`;T+=`
          var idx${$} = ${_.getByIndices(`indicesIndices${$}`)};
          if (idx${$} < 0) {
            idx${$} = idx${$} + uniforms.axisDimLimit;
          }
          var dataIndices${$} : ${w.type.indices};
        `;for(let I=0,E=0;I<n;I++)I===o?(T+=`${n>1?`dataIndices${$}[${I}]`:`dataIndices${$}`} = u32(idx${$});`,E+=k):(T+=`${n>1?`dataIndices${$}[${I}]`:`dataIndices${$}`} = ${s.length>1?`outputIndices${$}[${E}]`:`outputIndices${$}`};`,E++);return T},b;if(e[0].dataType===9){let $=(k,T,I="")=>`
          let outputIndices${T} = ${v.offsetToIndices(`outputOffset + ${T}u`)};
          ${S(T)};
          let offset${T} = ${w.indicesToOffset(`dataIndices${T}`)};
          let index${T} = offset${T} / 4u;
          let component${T} = offset${T} % 4u;
          ${k}[${T}] = ${I}(${w.getByOffset(`index${T}`)}[component${T}]);
        `;b=`
        let outputOffset = global_idx * ${p};
        var value = vec4<u32>(0);
        ${$("value",0,"u32")}
        ${$("value",1,"u32")}
        ${$("value",2,"u32")}
        ${$("value",3,"u32")}
        ${v.setByOffset("global_idx","value")}
      `}else b=`
      let outputIndices = ${v.offsetToIndices("global_idx")};
      ${S("")};
      let value = ${w.getByIndices("dataIndices")};
      ${v.setByOffset("global_idx","value")};
      `;return`
      ${g.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(w,_,v)}
      ${g.mainStart()}
        ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${b}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:f}),getShaderSource:m}},Sh=e=>ye({axis:e.axis}),kh=(e,t)=>{let i=e.inputs;vl(i),e.compute(bl(e.inputs,t))}}),xl,Th,Ch,uy=W(()=>{"use strict";ee(),ne(),se(),xl=(e,t,i,r,n,o,s,l,p)=>{let c=[{type:12,data:o},{type:12,data:r},{type:12,data:n},{type:12,data:i},{type:12,data:s},{type:12,data:l},{type:12,data:p}],f=[o];c.push(...Z(t.dims,f));let m=g=>{let w=R("indices_data",t.dataType,t.dims.length),_=K("input_slice_offsets_data",12,1,1),v=[w,_],S=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:n.length},{name:"sizes_from_slice_dims_data",type:"u32",length:i.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${g.registerUniforms(S).declareVariables(...v)}
  ${g.mainStart()}
    ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${n.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${i.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${n.length}_${i.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:f,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:c}),getShaderSource:m},{inputs:[t],outputs:[-1]})[0]},Th=(e,t)=>{let i=e.inputs,r=i[0].dims,n=i[0].dataType,o=i[1].dims,s=o[o.length-1],l=O.sizeToDimension(o,o.length-1),p=O.sizeFromDimension(r,t.batchDims+s),c=O.sizeToDimension(r,t.batchDims),f=O.sizeFromDimension(r,t.batchDims),m=l/c,g=new Array(s),w=p;for(let T=0;T<s;++T)g[s-1-T]=w,w*=r[t.batchDims+s-1-T];let _=xl(e,i[1],g,t.batchDims,r,l,m,f,s),v=t.batchDims+s;if(v>r.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let S=o.slice(0,-1).concat(r.slice(v)),b=O.size(S),$=[{type:12,data:b},{type:12,data:p},...Z(i[0].dims,_.dims,S)],k=T=>{let I=R("data",i[0].dataType,i[0].dims.length),E=R("slice_offsets",12,_.dims.length),z=K("output",i[0].dataType,S.length);return`
          ${T.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(I,E,z)}
            ${T.mainStart()}
            ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:S,dataType:n}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:$}),getShaderSource:k},{inputs:[i[0],_]})},Ch=e=>({batchDims:e.batch_dims,cacheKey:""})}),Sl,kl,Ih,Eh,ly=W(()=>{"use strict";ee(),ne(),ke(),se(),Sl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let i=O.normalizeAxis(t.quantizeAxis,e[0].dims.length),r=t.blockSize,n=e[0],o=e[2],s=e.length===4?e[3]:void 0;if(o.dims.length!==n.dims.length||!n.dims.map((l,p)=>p===i?Math.ceil(l/r)===o.dims[p]:l===o.dims[p]).reduce((l,p)=>l&&p,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==n.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==o.dims.length||!s.dims.map((l,p)=>l===o.dims[p]).reduce((l,p)=>l&&p,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},kl=(e,t)=>{let i=e[0].dims,r=e[1].dims,n=i.length,o=O.normalizeAxis(t.gatherAxis,n),s=O.normalizeAxis(t.quantizeAxis,n),l=i.slice(0);l.splice(o,1,...r);let p=O.size(l),c=e[2].dataType,f=e[0].dataType===22,m=[{type:12,data:p},{type:12,data:s},{type:12,data:o},{type:12,data:t.blockSize},...Z(...e.map((w,_)=>w.dims),l)],g=w=>{let _=R("data",e[0].dataType,e[0].dims.length),v=R("inputIndices",e[1].dataType,e[1].dims.length),S=R("scales",e[2].dataType,e[2].dims.length),b=e.length>3?R("zeroPoint",e[3].dataType,e[3].dims.length):void 0,$=K("output",c,l.length),k=[_,v,S];b&&k.push(b);let T=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${w.registerUniforms(T).declareVariables(...k,$)}
        ${w.mainStart()}
        let output_indices = ${$.offsetToIndices("global_idx")};
        var indices_indices = ${v.type.indices}(0);
        ${r.length>1?`
          for (var i: u32 = 0; i < ${r.length}; i++) {
            let index = ${$.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${v.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${$.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${_.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${$.indicesGet("output_indices","i")};
          ${_.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${v.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${i[o]};
        }
        ${_.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${l.length}; i++) {
          let index = ${$.indicesGet("output_indices",`i + ${r.length} - 1`)};
          ${_.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${_.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${_.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${S.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${S.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${S.getByIndices("scale_indices")};
        ${b?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${b.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${b.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${Oe(c)}(quantized_data - zero_point) * scale;
        ${$.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((w,_)=>_!==1).map(w=>w.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(w,_)=>"rank")},getRunData:()=>({outputs:[{dims:l,dataType:c}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:m}),getShaderSource:g}},Ih=(e,t)=>{let i=e.inputs;Sl(i,t),e.compute(kl(e.inputs,t))},Eh=e=>ye({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),Tl,Cl,zh,Ah,dy=W(()=>{"use strict";ee(),ne(),ke(),se(),Tl=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Cl=(e,t)=>{let i=e[0].dims,r=e[0].dataType,n=i.length,o=e[1].dims,s=e[1].dataType,l=O.normalizeAxis(t.axis,n),p=i[l],c=o.slice(0),f=O.size(c),m=R("input",r,n),g=R("indicesInput",s,o.length),w=K("output",r,c.length),_=[{type:12,data:f},{type:6,data:p},{type:12,data:l}];return _.push(...Z(i,o,c)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:c,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:_}),getShaderSource:v=>`
      ${v.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(m,g,w)}
      ${v.mainStart()}
      ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${w.offsetToIndices("global_idx")};

      var idx = ${g.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${m.type.indices}(outputIndices);
      ${m.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${m.getByIndices("inputIndices")};

      ${w.setByOffset("global_idx","value")};
  }`}},zh=e=>ye({axis:e.axis}),Ah=(e,t)=>{let i=e.inputs;Tl(i),e.compute(Cl(e.inputs,t))}}),Il,El,Oh,Rh,py=W(()=>{"use strict";ee(),ne(),se(),Il=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},El=(e,t)=>{let i=e[0].dims.slice(),r=e[1].dims.slice(),[n,o,s]=Bp.getShapeOfGemmResult(i,t.transA,r,t.transB,e.length===3?e[2].dims:void 0),l=[n,o];if(!l)throw new Error("Can't use gemm on the given tensors");let p=16,c=Math.ceil(o/p),f=Math.ceil(n/p),m=!0,g=O.size(l),w=[{type:12,data:m?c:g},{type:12,data:n},{type:12,data:o},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],_=["type","type"];e.length===3&&(w.push(...Z(e[2].dims)),_.push("rank")),w.push(...Z(l));let v=b=>{let $="";t.transA&&t.transB?$="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?$="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?$="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&($="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let k=t.alpha===1?"":"value *= uniforms.alpha;",T=R("a",e[0].dataType,e[0].dims),I=R("b",e[1].dataType,e[1].dims),E=T.type.value,z=null,M=[T,I];e.length===3&&(z=R("c",e[2].dataType,e[2].dims.length),M.push(z));let U=K("output",e[0].dataType,l.length);M.push(U);let V=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${b.registerUniforms(V).declareVariables(...M)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${E}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${$}
    }

    ${k}
    ${z!=null?`let cOffset = ${z.broadcastedIndicesToOffset("vec2(m, n)",U)}; value += ${E}(uniforms.beta) * ${z.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},S=b=>{let $=R("a",e[0].dataType,e[0].dims),k=R("b",e[1].dataType,e[1].dims),T=null,I=[$,k];e.length===3&&(T=R("c",e[2].dataType,e[2].dims.length),I.push(T));let E=K("output",e[0].dataType,l.length);I.push(E);let z=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],M="",U="";t.transA&&t.transB?(U=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${k.type.value}(0);
      }
      `,M="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(U=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${k.type.value}(0);
      }
      `,M="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(U=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${k.type.value}(0);
      }
      `,M="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(U=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${k.type.value}(0);
      }
      `,M="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let V=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${b.registerUniforms(z).declareVariables(...I)}
  var<workgroup> tile_a: array<array<${$.type.storage}, ${p}>, ${p}>;
  var<workgroup> tile_b: array<array<${k.type.storage}, ${p}>, ${p}>;
  ${b.mainStart([p,p,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${p};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${p};
    let num_tiles = (uniforms.K - 1) / ${p} + 1;
    var k_start = 0u;
    var value = ${E.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${U}
      k_start = k_start + ${p};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${p}; k++) {
        ${M}
      }
      workgroupBarrier();
    }

    ${V}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${T!=null?`let cOffset = ${T.broadcastedIndicesToOffset("vec2(m, n)",E)}; value += ${E.type.value}(uniforms.beta) * ${T.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return m?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:c*f},programUniforms:w}),getShaderSource:S}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:w}),getShaderSource:v}},Oh=e=>{let t=e.transA,i=e.transB,r=e.alpha,n=e.beta;return{transA:t,transB:i,alpha:r,beta:n,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},Rh=(e,t)=>{Il(e.inputs),e.compute(El(e.inputs,t))}}),it,ot,bt,xt,zl,Al,Ol,Rl,Bl,Nl,Ml,Dl,Bh,Nh,cy=W(()=>{"use strict";ee(),ne(),ke(),se(),[it,ot,bt,xt]=[0,1,2,3],zl=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},Al=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Ol=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Rl=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Bl=e=>`
  ${e.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,Nl=(e,t,i)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${it}] = batch;
     indices[${ot}] = channel;`+(()=>{switch(i.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${bt}] = u32(r);
            indices[${xt}] = u32(c);
          }
        `;case"border":return`
          indices[${bt}] = u32(clamp(r, 0, H - 1));
          indices[${xt}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${bt}] = gs_reflect(r, border[1], border[3]);
          indices[${xt}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${i.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices("indices")};
  }
`,Ml=(e,t,i)=>(()=>{switch(i.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${it}], indices[${ot}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${it}], indices[${ot}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${it}], indices[${ot}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${it}], indices[${ot}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${it}], indices[${ot}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${it}], indices[${ot}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${i.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,Dl=(e,t)=>{let i=R("x",e[0].dataType,e[0].dims.length),r=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],n=R("grid",e[1].dataType,r.length,2),o=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(o=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[it,ot,bt,xt]=[0,3,1,2]);let s=K("output",e[0].dataType,o.length),l=i.type.value,p=O.size(o),c=[{type:12,data:p},...Z(e[0].dims,r,o)],f=m=>`
  ${m.registerUniform("output_size","u32").declareVariables(i,n,s)}
  ${Al}
  ${Ol(l)}
  ${Rl(t)}
  ${Bl(t)}
  ${Nl(i,l,t)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${bt}]);
      let W_in = i32(uniforms.x_shape[${xt}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${s.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${it}], indices[${bt}], indices[${xt}]);
      let nxy = ${n.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${Ml(s,l,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:m=>{let g=O.size(o);return{outputs:[{dims:o,dataType:m[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:c}},getShaderSource:f}},Bh=(e,t)=>{zl(e.inputs),e.compute(Dl(e.inputs,t))},Nh=e=>ye({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),Re,Pl,Mh,Fi,Ul,ur,Dh,Ph=W(()=>{"use strict";ee(),ne(),ke(),Ga(),Fa(),se(),$t(),Re=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,Pl=(e,t)=>{let i=e[0],r=Re(e,1),n=Re(e,2),o=Re(e,3),s=Re(e,4),l=Re(e,5),p=Re(e,6),c=Re(e,7);if(i.dims.length!==3&&i.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let f=i.dims[0],m=i.dims[1],g=i.dims.length===3?i.dims[2]:t.numHeads*i.dims[4],w=m,_=0,v=0,S=Math.floor(g/t.numHeads);if(p&&c&&O.size(p.dims)&&O.size(c.dims)){if(p.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(p.dims[0]!==f||p.dims[1]!==t.numHeads||p.dims[3]!==S)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(c.dims[0]!==f||c.dims[1]!==t.numHeads||c.dims[3]!==S)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(p.dims[2]!==c.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(c.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');_=p.dims[2],v=p.dims[2]}else if(p&&O.size(p.dims)||c&&O.size(c.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let b;if(r&&O.size(r.dims)>0){if(i.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(r.dims.length<3||r.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(i.dims[0]!==r.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(r.dims.length===3){if(r.dims[2]!==i.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');b=2,w=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==S)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(n)throw new Error('Expect "value" be none when "key" has packed kv format.');b=5,w=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==S)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');b=0,w=r.dims[2]}}else{if(i.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(i.dims[2]!==t.numHeads||i.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');b=3}if(o&&O.size(o.dims)>0){if(o.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(r&&r.dims.length===5&&r.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let $=_+w,k=0;if(s&&O.size(s.dims)>0){k=8;let z=s.dims;throw z.length===1?z[0]===f?k=1:z[0]===3*f+2&&(k=3):z.length===2&&z[0]===f&&z[1]===$&&(k=5),k===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let T=!1,I=g;if(n&&O.size(n.dims)>0){if(n.dims.length!==3&&n.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(i.dims[0]!==n.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(n.dims.length===3){if(w!==n.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');I=n.dims[2]}else{if(w!==n.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');I=n.dims[1]*n.dims[3],T=!0}}let E=!1;if(s&&O.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(l&&O.size(l.dims)>0){if(l.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(l.dims[0]!==f||l.dims[1]!==t.numHeads||l.dims[2]!==m||l.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:f,sequenceLength:m,pastSequenceLength:_,kvSequenceLength:w,totalSequenceLength:$,maxSequenceLength:v,inputHiddenSize:0,hiddenSize:g,vHiddenSize:I,headSize:S,vHeadSize:Math.floor(I/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:k,scale:t.scale,broadcastResPosBias:E,passPastInKv:T,qkvFormat:b}},Mh=e=>ye({...e}),Fi=ye({perm:[0,2,1,3]}),Ul=(e,t,i,r,n,o,s)=>{let l=[r,n,o],p=O.size(l),c=[{type:12,data:p},{type:12,data:s},{type:12,data:o}],f=m=>{let g=K("qkv_with_bias",t.dataType,l),w=R("qkv",t.dataType,l),_=R("bias",i.dataType,l),v=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${m.registerUniforms(v).declareVariables(w,_,g)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:l,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:c}),getShaderSource:f},{inputs:[t,i],outputs:[-1]})[0]},ur=(e,t,i,r,n,o,s,l)=>{let p=o;if(s&&O.size(s.dims)>0){if(r===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return p=Ul(e,o,s,t,r,i*n,l),p=p.reshape([t,r,i,n]),i===1||r===1?p:e.compute(Me(p,Fi.perm),{inputs:[p],outputs:[-1]})[0]}else return o.dims.length===3&&(p=o.reshape([t,r,i,n])),i===1||r===1?p:e.compute(Me(p,Fi.perm),{inputs:[p],outputs:[-1]})[0]},Dh=(e,t)=>{let i=Pl(e.inputs,t),r=e.inputs[0],n=Re(e.inputs,1),o=Re(e.inputs,2),s=Re(e.inputs,3),l=Re(e.inputs,4),p=Re(e.inputs,5),c=Re(e.inputs,6),f=Re(e.inputs,7);if(r.dims.length===5)throw new Error("Packed QKV is not implemented");if(n?.dims.length===5)throw new Error("Packed KV is not implemented");let m=n&&o&&n.dims.length===4&&o.dims.length===4,g=ur(e,i.batchSize,i.numHeads,i.sequenceLength,i.headSize,r,s,0);if(m)return pr(e,g,n,o,l,void 0,c,f,p,i);if(!n||!o)throw new Error("key and value must be provided");let w=ur(e,i.batchSize,i.numHeads,i.kvSequenceLength,i.headSize,n,s,i.hiddenSize),_=ur(e,i.batchSize,i.numHeads,i.kvSequenceLength,i.vHeadSize,o,s,2*i.hiddenSize);pr(e,g,w,_,l,void 0,c,f,p,i)}}),Wl,ql,Ll,Vl,Ta,Uh,Wh,qh=W(()=>{"use strict";ee(),ne(),ke(),se(),Wl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},ql=(e,t)=>{let i=[],r=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(n=>i.push(Number(n))),r=i.length),ye({numOutputs:r,axis:t.axis,splitSizes:i})},Ll=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${Q("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,Vl=e=>{let t=e.length,i=[];for(let r=0;r<t;++r){let n=e[r].setByIndices("indices","input[global_idx]");t===1?i.push(n):r===0?i.push(`if (output_number == ${r}u) { ${n} }`):r===t-1?i.push(`else { ${n} }`):i.push(`else if (output_number == ${r}) { ${n} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${i.join(`
`)}
      }`},Ta=(e,t)=>{let i=e[0].dims,r=O.size(i),n=e[0].dataType,o=O.normalizeAxis(t.axis,i.length),s=new Array(t.numOutputs),l=R("input",n,i.length),p=new Array(t.numOutputs),c=[],f=[],m=0,g=[{type:12,data:r}];for(let _=0;_<t.numOutputs;_++){m+=t.splitSizes[_],p[_]=m;let v=i.slice();v[o]=t.splitSizes[_],f.push(v),s[_]=K(`output${_}`,n,v.length),c.push({dims:f[_],dataType:e[0].dataType})}g.push({type:12,data:p},...Z(i,...f));let w=_=>`
  ${_.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",p.length).declareVariables(l,...s)}
  ${Ll(p.length)}
  ${Vl(s)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${l.offsetToIndices("global_idx")};
    var index = ${l.indicesGet("indices",o)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${Q("uniforms.size_in_split_axis","output_number - 1u",p.length)};
      ${l.indicesSet("indices",o,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:w,getRunData:()=>({outputs:c,dispatchGroup:{x:Math.ceil(r/64)},programUniforms:g})}},Uh=(e,t)=>{Wl(e.inputs);let i=e.inputs.length===1?t:ql(e.inputs,t);e.compute(Ta(e.inputs,i),{inputs:[0]})},Wh=e=>{let t=e.axis,i=e.splitSizes,r=e.numOutputs<0?i.length:e.numOutputs;if(r!==i.length)throw new Error("numOutputs and splitSizes lengh must be equal");return ye({axis:t,numOutputs:r,splitSizes:i})}}),Gl,jl,Ki,Lh,hy=W(()=>{"use strict";ke(),Fa(),Ph(),qh(),$t(),Gl=(e,t)=>{if(t.doRotary)throw new Error("GroupQuerryAttention do_rotary attribute is not supported");if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let i=e[0],r=e[1],n=e[2],o=e[3],s=e[4];if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(i.dims.length!==3&&i.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let l=!1,p=i.dims[0],c=i.dims[1],f=i.dims.length===3?l?i.dims[2]/3:i.dims[2]:t.numHeads*i.dims[4],m=c,g=0,w=!r||r.dims.length===0,_=Math.floor(w?f/(t.numHeads+2*t.kvNumHeads):f/t.numHeads);w&&(f=_*t.numHeads);let v=o&&o.dims.length!==0,S=s&&s.dims.length!==0;if(v&&o.dims.length===4&&o.dims[0]===p&&o.dims[1]!==t.kvNumHeads&&o.dims[2]===t.kvNumHeads&&o.dims[3]===_)throw new Error("BSNH pastKey/pastValue is not supported");if(v&&S){if(o.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');g=o.dims[2]}else if(v||S)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let b=1;if(r&&r.dims.length>0){if(i.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(r.dims.length<3||r.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(i.dims[0]!==r.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(r.dims.length===3){if(i.dims[2]%r.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');m=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==_)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(n)throw new Error('Expect "value" be none when "key" has packed kv format.');m=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==_)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');m=r.dims[2]}}else{if(i.dims.length!==3&&i.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(i.dims.length===5&&(i.dims[2]!==t.numHeads||i.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');b=3}let $=0,k=!1,T=t.kvNumHeads?_*t.kvNumHeads:f;if(n&&n.dims.length>0){if(n.dims.length!==3&&n.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(i.dims[0]!==n.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(n.dims.length===3){if(m!==n.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');T=n.dims[2]}else{if(m!==n.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');T=n.dims[1]*n.dims[3],k=!0}}let I=e.length>4?e[5]:void 0;if(I&&I.dims.length!==1&&I.dims[0]!==p)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:p,sequenceLength:c,pastSequenceLength:g,kvSequenceLength:m,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:f,vHiddenSize:T,headSize:_,vHeadSize:Math.floor(T/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:$,scale:t.scale,broadcastResPosBias:!1,passPastInKv:k,qkvFormat:b}},jl=ye({perm:[0,2,1,3]}),Ki=(e,t,i)=>{let r=t,n=i.kvNumHeads;return t.dims.length===3&&i.kvSequenceLength!==0&&(r=t.reshape([i.batchSize,i.kvSequenceLength,n,i.headSize]),r=e.compute(Me(r,jl.perm),{inputs:[r],outputs:[-1]})[0]),r},Lh=(e,t)=>{let i=Gl(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(e.inputs[1]?.dims.length===5)throw new Error("Packed KV is not implemented");let r=e.inputs[0],n=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,o=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,s=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,l=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,p=e.inputs.length>4?e.inputs[5]:void 0,c=e.inputs.length>5?e.inputs[6]:void 0,f=i.kvNumHeads?i.kvNumHeads:i.numHeads,m=ye({axis:2,numOutputs:3,splitSizes:[i.numHeads*i.headSize,f*i.headSize,f*i.headSize]}),[g,w,_]=!n&&!o?e.compute(Ta([r],m),{inputs:[r],outputs:[-1,-1,-1]}):[r,n,o],v=ur(e,i.batchSize,i.numHeads,i.sequenceLength,i.headSize,g,void 0,0);pr(e,v,Ki(e,w,i),Ki(e,_,i),void 0,void 0,s,l,void 0,i,p,c)}}),Qi,Hl,Fl,Vh,fy=W(()=>{"use strict";ee(),ne(),$t(),se(),Qi=(e,t,i,r,n,o,s,l)=>{let p=Se(o),c=p===1?"f32":`vec${p}f`,f=p===1?"vec2f":`mat2x${p}f`,m=n*s,g=64;m===1&&(g=256);let w=[n,s,o/p],_=[n,s,2],v=["rank","type","type"],S=[];S.push(...Z(w,_));let b=$=>{let k=R("x",t.dataType,3,p),T=R("scale",i.dataType,i.dims),I=R("bias",r.dataType,r.dims),E=K("output",1,3,2),z=[k,T,I,E];return`
  var<workgroup> workgroup_shared : array<${f}, ${g}>;
  const workgroup_size = ${g}u;
  ${$.declareVariables(...z)}
  ${$.mainStart(g)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${c}(0);
    var squared_sum = ${c}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${c}(${k.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${f}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${wt("workgroup_shared[0][0]",p)} / f32(hight * ${p});
      let squared_sum_final = ${wt("workgroup_shared[0][1]",p)} / f32(hight * ${p});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${l}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${p};${l};${g}`,inputDependencies:v},getRunData:()=>({outputs:[{dims:_,dataType:1}],dispatchGroup:{x:m},programUniforms:S}),getShaderSource:b},{inputs:[t,i,r],outputs:[-1]})[0]},Hl=(e,t,i)=>{let r=t[0].dims,n=r,o=2,s=r[0],l=r[1],p=O.sizeFromDimension(r,o),c=Se(p),f=O.size(n)/c,m=Qi(e,t[0],t[1],t[2],s,p,l,i.epsilon),g=[s,l,p/c],w=[s,l],_=["type","none"],v=S=>{let b=R("x",t[0].dataType,g.length,c),$=R("scale_shift",1,w.length,2),k=K("output",t[0].dataType,g.length,c),T=[b,$,k];return`
  ${S.registerUniform("output_size","u32").declareVariables(...T)}
  ${S.mainStart()}
  ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${k.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${$.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${b.getByOffset("global_idx")} * ${k.type.value}(scale_shift.x) + ${k.type.value}(scale_shift.y);
      ${k.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${c}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:n,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...Z(g,w,g)]}),getShaderSource:v},{inputs:[t[0],m]})},Fl=(e,t,i)=>{let r=t[0].dims,n=r,o=r[0],s=r[r.length-1],l=O.sizeFromDimension(r,1)/s,p=Se(s),c=O.size(n)/p,f=[{type:12,data:l},{type:12,data:Math.floor(s/p)}],m=["type","type"],g=!1,w=[0,r.length-1];for(let b=0;b<r.length-2;b++)g=g||r[b+1]!==1,w.push(b+1);g=g&&r[r.length-1]!==1;let _=g?e.compute(Me(e.inputs[0],w),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:r.length},(b,$)=>r[w[$]])),v=Qi(e,_,t[1],t[2],o,l,s,i.epsilon),S=b=>{let $=Ee(t[0].dataType),k=p===1?"vec2f":`mat${p}x2f`,T=z=>{let M=z===0?"x":"y",U=p===1?"f32":`vec${p}f`;switch(p){case 1:return`${$}(${U}(scale.${M}))`;case 2:return`vec2<${$}>(${U}(scale[0].${M}, scale[1].${M}))`;case 4:return`vec4<${$}>(${U}(scale[0].${M}, scale[1].${M}, scale[2].${M}, scale[3].${M}))`;default:throw new Error(`Not supported compoents ${p}`)}},I=R("input",t[0].dataType,t[0].dims,p),E=K("output",t[0].dataType,n,p);return`
  @group(0) @binding(0) var<storage, read> input : array<${I.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${k}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${E.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${b.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${T(0)}, ${T(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:n,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:f}),getShaderSource:S},{inputs:[t[0],v]})},Vh=(e,t)=>{t.format==="NHWC"?Fl(e,e.inputs,t):Hl(e,e.inputs,t)}}),Kl,Ql,Gh,my=W(()=>{"use strict";ee(),ne(),se(),Kl=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},Ql=(e,t,i)=>{let r=t.simplified,n=e[0].dims,o=e[1],s=!r&&e[2],l=n,p=O.normalizeAxis(t.axis,n.length),c=O.sizeToDimension(n,p),f=O.sizeFromDimension(n,p),m=O.size(o.dims),g=s?O.size(s.dims):0;if(m!==f||s&&g!==f)throw new Error(`Size of X.shape()[axis:] == ${f}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${m} and bias size of ${g}`);let w=[];for(let I=0;I<n.length;++I)I<p?w.push(n[I]):w.push(1);let _=Se(f),v=["type","type"],S=[{type:12,data:c},{type:1,data:f},{type:12,data:Math.floor(f/_)},{type:1,data:t.epsilon}];s&&v.push("type");let b=i>1,$=i>2,k=I=>{let E=Ee(e[0].dataType),z=[R("x",e[0].dataType,e[0].dims,_),R("scale",o.dataType,o.dims,_)];s&&z.push(R("bias",s.dataType,s.dims,_)),z.push(K("output",e[0].dataType,l,_)),b&&z.push(K("mean_data_output",1,w)),$&&z.push(K("inv_std_output",1,w));let M=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${I.registerUniforms(M).declareVariables(...z)}
  ${I.mainStart()}
    ${I.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${ya("f32",_)};
    var mean_square_vector = ${ya("f32",_)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${qt(E,_,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${wt("mean_vector",_)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${wt("mean_square_vector",_)} / uniforms.norm_size ${r?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${qt(E,_,"x[j + offset]")};
      let f32scale = ${qt(E,_,"scale[j]")};
      output[j + offset] = ${z[0].type.value}((f32input ${r?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${qt(E,_,"bias[j]")}`:""}
      );
    }

    ${b?"mean_data_output[global_idx] = mean":""};
    ${$?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},T=[{dims:l,dataType:e[0].dataType}];return b&&T.push({dims:w,dataType:1}),$&&T.push({dims:w,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${_};${i};${r}`,inputDependencies:v},getRunData:()=>({outputs:T,dispatchGroup:{x:Math.ceil(c/64)},programUniforms:S}),getShaderSource:k}},Gh=(e,t)=>{Kl(e.inputs),e.compute(Ql(e.inputs,t,e.outputCount))}}),Zl,jh,gy=W(()=>{"use strict";ne(),Ya(),Ja(),Zl=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},jh=e=>{Zl(e.inputs);let t=Lt.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let i=t[t.length-1],r=e.inputs[0].dims[e.inputs[0].dims.length-1];if(i<8&&r<8)e.compute(Xa(e.inputs,{activation:""},t));else{let n=t[t.length-2],o=O.size(e.inputs[0].dims.slice(0,-2)),s=O.size(e.inputs[1].dims.slice(0,-2));if(o!==1&&n===1&&s===1){let l=e.inputs[0].reshape([1,o,r]),p=e.inputs[1].reshape([1,r,i]),c=[1,o,i],f=[l,p];e.compute(Gr(f,{activation:""},t,c),{inputs:f})}else e.compute(Gr(e.inputs,{activation:""},t))}}}),Xl,Yl,Jl,Hh,Fh,yy=W(()=>{"use strict";ee(),ne(),ke(),se(),Xl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let i=e[0],r=i.dims.length;if(i.dims[r-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let n=Math.floor((t.k+t.blockSize-1)/t.blockSize),o=t.blockSize/8*t.bits,s=e[1];if(!O.areEqual(s.dims,[t.n,n,o]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let l=e[2].dims;if(O.size(l)!==t.n*n)throw new Error("scales input size error.");if(e.length===4){let p=e[3].dims,c=t.bits>4?t.n*n:t.n*Math.floor((n+1)/2);if(O.size(p)!==c)throw new Error("zeroPoints input size error.")}},Yl=(e,t)=>{let i=e[0].dims,r=i.length,n=i[r-2],o=t.k,s=t.n,l=i.slice(0,r-2),p=O.size(l),c=e[1].dims[2]/4,f=e[0].dataType,m=Se(t.k),g=Se(c),w=Se(s),_=l.concat([n,s]),v=n>1&&s/w%2===0?2:1,S=O.size(_)/w/v,b=64,$=[],k=[p,n,o/m],T=O.convertShape(e[1].dims).slice();T.splice(-1,1,c/g),$.push(...Z(k)),$.push(...Z(T)),$.push(...Z(e[2].dims)),e.length===4&&$.push(...Z(O.convertShape(e[3].dims)));let I=[p,n,s/w];$.push(...Z(I));let E=z=>{let M=k.length,U=R("a",e[0].dataType,M,m),V=R("b",12,T.length,g),X=R("scales",e[2].dataType,e[2].dims.length),F=[U,V,X],q=e.length===4?R("zero_points",12,e[3].dims.length):void 0;q&&F.push(q);let te=I.length,oe=K("output",e[0].dataType,te,w),G=Ee(e[0].dataType),pe=(()=>{switch(m){case 1:return`array<${G}, 8>`;case 2:return`mat4x2<${G}>`;case 4:return`mat2x4<${G}>`;default:throw new Error(`${m}-component is not supported.`)}})(),de=()=>{let P=`
          // reuse a data
            var input_offset = ${U.indicesToOffset(`${U.type.indices}(batch, row, word_offset)`)};
            var a_data: ${pe};
            for (var j: u32 = 0; j < ${8/m}; j++) {
              a_data[j] = ${U.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let j=0;j<w*v;j++)P+=`
            b_value = ${g===1?`b${j}_data`:`b${j}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${pe}(${Array.from({length:4},(ue,we)=>`${G}(b_value_lower[${we}]), ${G}(b_value_upper[${we}])`).join(", ")});
            b_dequantized_values = ${m===1?`${pe}(${Array.from({length:8},(ue,we)=>`(b_quantized_values[${we}] - ${q?`zero_point${j}`:"zero_point"}) * scale${j}`).join(", ")});`:`(b_quantized_values - ${pe}(${Array(8).fill(`${q?`zero_point${j}`:"zero_point"}`).join(",")})) * scale${j};`};
            workgroup_shared[local_id.x * ${v} + ${Math.floor(j/w)}]${w>1?`[${j%w}]`:""} += ${Array.from({length:8/m},(ue,we)=>`${m===1?`a_data[${we}] * b_dequantized_values[${we}]`:`dot(a_data[${we}], b_dequantized_values[${we}])`}`).join(" + ")};
          `;return P},Y=()=>{let P=`
            var col_index = col * ${w};
            ${q?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${G}(8);`}
            `;for(let j=0;j<w*v;j++)P+=`
            let scale${j} = ${X.getByOffset("col_index * nBlocksPerCol + block")};
            ${q?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${q.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${j} = ${G}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return P},be=()=>{let P=`col_index = col * ${w};`;for(let j=0;j<w*v;j++)P+=`
            let b${j}_data = ${V.getByIndices(`${V.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return P+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${pe};
            var b_dequantized_values: ${pe};`,P};return`
        var<workgroup> workgroup_shared: array<${oe.type.value}, ${v*b}>;
        ${z.declareVariables(...F,oe)}
        ${z.mainStart([b,1,1])}
          let output_indices = ${oe.offsetToIndices(`(global_idx / ${b}) * ${v}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${b}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/m};
            ${Y()}
            for (var word: u32 = 0; word < ${c}; word += ${g}) {
              ${be()}
              for (var i: u32 = 0; i < ${g}; i++) {
                ${de()}
                word_offset += ${8/m};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${v}) {
            var output_value: ${oe.type.value} = ${oe.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${b}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${v};
            }
            ${oe.setByIndices(`${oe.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${m};${g};${w};${v};${b}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:_,dataType:f}],dispatchGroup:{x:S},programUniforms:$}),getShaderSource:E}},Jl=(e,t)=>{let i=e[0].dims,r=i.length,n=i[r-2],o=t.k,s=t.n,l=i.slice(0,r-2),p=O.size(l),c=e[1].dims[2]/4,f=e[0].dataType,m=Se(t.k),g=Se(c),w=l.concat([n,s]),_=128,v=s%8===0?8:s%4===0?4:1,S=_/v,b=S*g*8,$=b/m,k=b/t.blockSize,T=O.size(w)/v,I=[],E=[p,n,o/m],z=O.convertShape(e[1].dims).slice();z.splice(-1,1,c/g),I.push(...Z(E)),I.push(...Z(z)),I.push(...Z(e[2].dims)),e.length===4&&I.push(...Z(O.convertShape(e[3].dims)));let M=[p,n,s];I.push(...Z(M));let U=V=>{let X=E.length,F=R("a",e[0].dataType,X,m),q=R("b",12,z.length,g),te=R("scales",e[2].dataType,e[2].dims.length),oe=[F,q,te],G=e.length===4?R("zero_points",12,e[3].dims.length):void 0;G&&oe.push(G);let pe=M.length,de=K("output",e[0].dataType,pe),Y=Ee(e[0].dataType),be=()=>{switch(m){case 1:return`
          let a_data0 = vec4<${Y}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Y}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Y}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Y}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${m}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${F.type.value}, ${$}>;
        var<workgroup> inter_results: array<array<${de.type.value}, ${S}>, ${v}>;
        ${V.declareVariables(...oe,de)}
        ${V.mainStart([S,v,1])}
          let output_indices = ${de.offsetToIndices(`workgroup_index * ${v}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${k} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${$};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${$}; a_offset += ${_})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${F.getByIndices(`${F.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${F.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${k} + local_id.x;
            ${G?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${G.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Y}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Y}(8);`}
            let scale = ${te.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${q.getByIndices(`${q.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/m};
            for (var i: u32 = 0; i < ${g}; i++) {
              ${be()}
              let b_value = ${g===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${Y}>(${Array.from({length:4},(P,j)=>`${Y}(b_value_lower[${j}]), ${Y}(b_value_upper[${j}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${Y}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(P,j)=>`${`dot(a_data${j}, b_dequantized_values[${j}])`}`).join(" + ")};
              word_offset += ${8/m};
            }
            workgroupBarrier();
          }

          if (local_idx < ${v}) {
            var output_value: ${de.type.value} = ${de.type.value}(0);
            for (var b = 0u; b < ${S}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${de.setByIndices(`${de.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${m};${g};${S};${v}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:w,dataType:f}],dispatchGroup:{x:T},programUniforms:I}),getShaderSource:U}},Hh=(e,t)=>{Xl(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(Jl(e.inputs,t)):e.compute(Yl(e.inputs,t))},Fh=e=>ye(e)}),ed,td,rd,id,ad,nd,sd,od,Kh,_y=W(()=>{"use strict";ee(),ne(),se(),ed=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},td=(e,t,i)=>{let r="";for(let n=t-1;n>=0;--n)r+=`
            k = i32(${e.indicesGet("indices",n)}) - ${Q("uniforms.pads",n,i)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${Q("uniforms.x_shape",n,t)})) {
              break;
            }
            offset += k * i32(${Q("uniforms.x_strides",n,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${r}
            value = x[offset];
          }
      `},rd=(e,t,i)=>{let r="";for(let n=t-1;n>=0;--n)r+=`
                k = i32(${e.indicesGet("indices",n)}) - ${Q("uniforms.pads",n,i)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${Q("uniforms.x_shape",n,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${Q("uniforms.x_shape",n,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${Q("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},id=(e,t,i)=>{let r="";for(let n=t-1;n>=0;--n)r+=`
                k = i32(${e.indicesGet("indices",n)}) - ${Q("uniforms.pads",n,i)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${Q("uniforms.x_shape",n,t)})) {
                  k = i32(${Q("uniforms.x_shape",n,t)}) - 1;
                }
                offset += k * i32(${Q("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},ad=(e,t,i)=>{let r="";for(let n=t-1;n>=0;--n)r+=`
                k = i32(${e.indicesGet("indices",n)}) - ${Q("uniforms.pads",n,i)};
                if (k < 0)  {
                  k += i32(${Q("uniforms.x_shape",n,t)}]);
                }
                if (k >= i32(${Q("uniforms.x_shape",n,t)})) {
                  k -= i32(${Q("uniforms.x_shape",n,t)});
                }
                offset += k * i32(${Q("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},nd=(e,t,i)=>{switch(i.mode){case 0:return td(e,t,i.pads.length);case 1:return rd(e,t,i.pads.length);case 2:return id(e,t,i.pads.length);case 3:return ad(e,t,i.pads.length);default:throw new Error("Invalid mode")}},sd=(e,t)=>{let i=O.padShape(e[0].dims.slice(),t.pads),r=e[0].dims,n=O.size(i),o=[{type:12,data:n},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&o.push({type:s?e[2].dataType:1,data:t.value}),o.push(...Z(e[0].dims,i));let l=["rank"],p=c=>{let f=K("output",e[0].dataType,i.length),m=R("x",e[0].dataType,r.length),g=m.type.value,w=nd(f,r.length,t),_=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&_.push({name:"constant_value",type:s?g:"f32"}),`
            ${c.registerUniforms(_).declareVariables(m,f)}
            ${c.mainStart()}
            ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${f.offsetToIndices("global_idx")};

            var value = ${g}(0);
            ${w}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(i)/64)},programUniforms:o}),getShaderSource:p}},od=(e,t)=>{if(e.length>1){let i=e[1].getBigInt64Array(),r=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,n=e[0].dims.length,o=new Int32Array(2*n).fill(0);if(e.length>=4){let l=e[3].getBigInt64Array();for(let p=0;p<l.length;p++)o[Number(l[p])]=Number(i[p]),o[Number(l[p])+n]=Number(i[p+l.length])}else i.forEach((l,p)=>o[Number(p)]=Number(l));let s=[];return o.forEach(l=>s.push(l)),{mode:t.mode,value:r,pads:s}}else return t},Kh=(e,t)=>{ed(e.inputs);let i=od(e.inputs,t);e.compute(sd(e.inputs,i),{inputs:[0]})}}),tr,Zi,Xi,Yi,Ji,ud,ld,ea,ta,Qh,Zh,ra,Xh,Yh,ia,Jh,ef,tf,rf,wy=W(()=>{"use strict";Je(),ee(),ne(),se(),tr=e=>{if($e.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Zi=(e,t,i)=>{let r=t.format==="NHWC",n=e.dims.slice();r&&n.splice(1,0,n.pop());let o=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),l=t.strides.slice(),p=o?t.dilations.slice():[],c=t.pads.slice();Lr.adjustPoolAttributes(i,n,s,l,p,c);let f=Lr.computePoolOutputShape(i,n,l,p,s,c,t.autoPad),m=Object.assign({},t);o?Object.assign(m,{kernelShape:s,strides:l,pads:c,dilations:p,cacheKey:t.cacheKey}):Object.assign(m,{kernelShape:s,strides:l,pads:c,cacheKey:t.cacheKey});let g=f.slice();return g.push(g.splice(1,1)[0]),[m,r?g:f]},Xi=(e,t)=>{let i=t.format==="NHWC",r=O.size(e),n=O.size(t.kernelShape),o=[{type:12,data:r},{type:12,data:n}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let l=t.kernelShape[t.kernelShape.length-1],p=t.strides[t.strides.length-1],c=t.pads[t.pads.length/2-1],f=t.pads[t.pads.length-1],m=!!(c+f);o.push({type:12,data:l},{type:12,data:p},{type:12,data:c},{type:12,data:f}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let g=!1;if(t.kernelShape.length===2){let w=t.kernelShape[t.kernelShape.length-2],_=t.strides[t.strides.length-2],v=t.pads[t.pads.length/2-2],S=t.pads[t.pads.length-2];g=!!(v+S),o.push({type:12,data:w},{type:12,data:_},{type:12,data:v},{type:12,data:S}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[o,s,!0,m,g]}else{if(i)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let l=O.computeStrides(t.kernelShape);o.push({type:12,data:l},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:l.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let p=t.pads.reduce((c,f)=>c+f);return[o,s,!!p,!1,!1]}},Yi=(e,t,i,r,n,o,s,l,p,c,f,m)=>{let g=n.format==="NHWC",w=t.type.value,_=K("output",t.type.tensor,r);if(n.kernelShape.length<=2){let v="",S="",b="",$=i-(g?2:1);if(f?v=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${$}] < 0 || xIndices[${$}]
                      >= uniforms.x_shape[${$}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${o}
                }`:v=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${o}
                }`,n.kernelShape.length===2){let k=i-(g?3:2);m?S=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${k}] = indices[${k}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${k}] < 0 || xIndices[${k}] >= uniforms.x_shape[${k}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:S=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${k}] = indices[${k}] * uniforms.sh - uniforms.phStart + j;
                `,b=`
              }
            `}return`
            ${e.registerUniforms(p).declareVariables(t,_)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${_.offsetToIndices("global_idx")};
              var xIndices = ${_.offsetToIndices("global_idx")};

              var value = ${w}(${l});
              var pad = 0;
              ${S}
              ${v}
              ${b}
              ${s}

              output[global_idx] = value;
            }`}else{if(g)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let v=n.kernelShape.length,S=n.pads.length,b="";return c?b=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${o}
              }`:b=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${o}
            `,`
            ${e.registerUniforms(p).declareVariables(t,_)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${_.offsetToIndices("global_idx")};
              var xIndices = ${_.offsetToIndices("global_idx")};

              var offsets: array<u32, ${v}>;

              var value = ${w}(${l});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${v-1}u; j++) {
                  offsets[j] = offset / ${Q("uniforms.kernelStrides","j",v)};
                  offset -= offsets[j] * ${Q("uniforms.kernelStrides","j",v)};
                }
                offsets[${v-1}] = offset;

                isPad = false;
                for (var j = ${i-v}u; j < ${i}u; j++) {
                  xIndices[j] = indices[j] * ${Q("uniforms.strides",`j - ${i-v}u`,v)}
                    + offsets[j - ${i-v}u] - ${Q("uniforms.pads","j - 2u",S)};
                  ${b}
              }
              ${s}

              output[global_idx] = value;
            }`}},Ji=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,ud=e=>`${Ji(e)};${e.countIncludePad}`,ld=e=>`${Ji(e)};${e.storageOrder};${e.dilations}`,ea=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),ta=(e,t,i,r)=>{let[n,o]=Zi(t,r,i),s=R("x",t.dataType,t.dims.length),l=s.type.value,p="value += x_val;",c="";n.countIncludePad?c+=`value /= ${l}(uniforms.kernelSize);`:c+=`value /= ${l}(i32(uniforms.kernelSize) - pad);`;let[f,m,g,w,_]=Xi(o,n);f.push(...Z(t.dims,o));let v=["rank"];return{name:e,shaderCache:{hint:`${r.cacheKey};${g};${w};${_}`,inputDependencies:v},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(o)/64)},programUniforms:f}),getShaderSource:S=>Yi(S,s,t.dims.length,o.length,n,p,c,0,m,g,w,_)}},Qh=e=>{let t=e.count_include_pad!==0,i=ea(e);if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let r={countIncludePad:t,...i,cacheKey:""};return{...r,cacheKey:ud(r)}},Zh=(e,t)=>{tr(e.inputs),e.compute(ta("AveragePool",e.inputs[0],!1,t))},ra={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},Xh=e=>{let t=e.format;return{format:t,...ra,cacheKey:t}},Yh=(e,t)=>{tr(e.inputs),e.compute(ta("GlobalAveragePool",e.inputs[0],!0,t))},ia=(e,t,i,r)=>{let[n,o]=Zi(t,r,i),s=`
      value = max(x_val, value);
    `,l="",p=R("x",t.dataType,t.dims.length),c=["rank"],[f,m,g,w,_]=Xi(o,n);return f.push(...Z(t.dims,o)),{name:e,shaderCache:{hint:`${r.cacheKey};${g};${w};${_}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(o)/64)},programUniforms:f}),getShaderSource:v=>Yi(v,p,t.dims.length,o.length,n,s,l,t.dataType===10?-65504:-1e5,m,g,w,_)}},Jh=(e,t)=>{tr(e.inputs),e.compute(ia("MaxPool",e.inputs[0],!1,t))},ef=e=>{let t=e.storage_order,i=e.dilations,r=ea(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let n={storageOrder:t,dilations:i,...r,cacheKey:""};return{...n,cacheKey:ld(n)}},tf=e=>{let t=e.format;return{format:t,...ra,cacheKey:t}},rf=(e,t)=>{tr(e.inputs),e.compute(ia("GlobalMaxPool",e.inputs[0],!0,t))}}),dd,pd,af,nf,$y=W(()=>{"use strict";ee(),ne(),ke(),se(),dd=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((i,r)=>i===e[2].dims[r]).reduce((i,r)=>i&&r,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((n,o)=>o===t.axis||n===e[0].dims[o]).reduce((n,o)=>n&&o,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let i=e[0].dims[t.axis],r=e[1].dims[t.axis];if(t.blockSize<Math.ceil(i/r)||t.blockSize>Math.ceil(i/(r-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},pd=(e,t)=>{let i=O.normalizeAxis(t.axis,e[0].dims.length),r=e[0].dataType,n=r===3,o=e[0].dims,s=e[1].dataType,l=O.size(o),p=r===3||r===2,c=p?[Math.ceil(O.size(e[0].dims)/4)]:e[0].dims,f=e[1].dims,m=e.length>2?e[2]:void 0,g=m?p?[Math.ceil(O.size(m.dims)/4)]:m.dims:void 0,w=f.length===0||f.length===1&&f[0]===1,_=w===!1&&f.length===1,v=Se(l),S=w&&(!p||v===4),b=S?v:1,$=S&&!p?v:1,k=R("input",p?12:r,c.length,$),T=R("scale",s,f.length),I=m?R("zero_point",p?12:r,g.length):void 0,E=K("output",s,o.length,b),z=[k,T];I&&z.push(I);let M=[c,f];m&&M.push(g);let U=[{type:12,data:l/b},{type:12,data:i},{type:12,data:t.blockSize},...Z(...M,o)],V=X=>{let F=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${X.registerUniforms(F).declareVariables(...z,E)}
      ${X.mainStart()}
          ${X.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${E.offsetToIndices("global_idx")};

          // Set input x
          ${p?`
            let input = ${k.getByOffset("global_idx / 4")};
            let x_vec = ${n?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${b===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${k.getByOffset("global_idx")};`};

          // Set scale input
          ${w?`let scale_value= ${T.getByOffset("0")}`:_?`
            let scale_index = ${E.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${T.getByOffset("scale_index")};`:`
            var scale_indices: ${T.type.indices} = output_indices;
            let index = ${T.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${T.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${T.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${I?w?p?`
                let zero_point_input = ${I.getByOffset("0")};
                let zero_point_vec =  ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${I.getByOffset("0")}`:_?p?`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${I.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${I.getByOffset("zero_point_index")};`:p?`
                let zero_point_offset = ${T.indicesToOffset("scale_indices")};
                let zero_point_input = ${I.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${I.getByIndices("scale_indices")};`:`let zero_point_value = ${p?n?"i32":"u32":k.type.value}(0);`};
      // Compute and write output
      ${E.setByOffset("global_idx",`${E.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:I?["rank","rank","rank"]:["rank","rank"]},getShaderSource:V,getRunData:()=>({outputs:[{dims:o,dataType:s}],dispatchGroup:{x:Math.ceil(l/b/64),y:1,z:1},programUniforms:U})}},af=(e,t)=>{dd(e.inputs,t),e.compute(pd(e.inputs,t))},nf=e=>ye({axis:e.axis,blockSize:e.blockSize})}),cd,hd,sf,vy=W(()=>{"use strict";Je(),ee(),se(),cd=(e,t,i)=>{let r=e===t,n=e<t&&i<0,o=e>t&&i>0;if(r||n||o)throw new Error("Range these inputs' contents are invalid.")},hd=(e,t,i,r)=>{let n=Math.abs(Math.ceil((t-e)/i)),o=[n],s=n,l=[{type:12,data:s},{type:r,data:e},{type:r,data:i},...Z(o)],p=c=>{let f=K("output",r,o.length),m=f.type.value,g=[{name:"outputSize",type:"u32"},{name:"start",type:m},{name:"delta",type:m}];return`
        ${c.registerUniforms(g).declareVariables(f)}
        ${c.mainStart()}
        ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${m}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${r}`},getShaderSource:p,getRunData:()=>({outputs:[{dims:o,dataType:r}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:l})}},sf=e=>{let t=0,i=0,r=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],i=e.inputs[1].getInt32Array()[0],r=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],i=e.inputs[1].getFloat32Array()[0],r=e.inputs[2].getFloat32Array()[0]),$e.webgpu.validateInputContent&&cd(t,i,r),e.compute(hd(t,i,r,e.inputs[0].dataType),{inputs:[]})}}),fd,md,of,uf,by=W(()=>{"use strict";ee(),ne(),ke(),se(),fd=(e,t,i,r)=>{if(e!=="none"&&r!=="i32"&&r!=="u32"&&r!=="f32")throw new Error(`Input ${r} is not supported with reduction ${e}.`);let n=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,o=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case"none":return`${t}=${i};`;case"add":return r==="i32"||r==="u32"?`atomicAdd(&${t}, bitcast<${r}>(${i}));`:`
              ${n}bitcast<${r}>(oldValue) + (${i})${o}`;case"max":return r==="i32"||r==="u32"?`atomicMax(&${t}, bitcast<${r}>(${i}));`:`
                ${n}max(bitcast<f32>(oldValue), (${i}))${o}`;case"min":return r==="i32"||r==="u32"?`atomicMin(&${t}, bitcast<${r}>(${i}));`:`${n}min(bitcast<${r}>(oldValue), (${i}))${o}`;case"mul":return`${n}(bitcast<${r}>(oldValue) * (${i}))${o}`;default:throw new Error(`Reduction ${e} is not supported.`)}},md=(e,t)=>{let i=e[0].dims,r=e[1].dims,n=i,o=1,s=Math.ceil(O.size(r)/o),l=r[r.length-1],p=O.sizeFromDimension(i,l),c=[{type:12,data:s},{type:12,data:l},{type:12,data:p},...Z(e[1].dims,e[2].dims,n)],f=m=>{let g=R("indices",e[1].dataType,e[1].dims.length),w=R("updates",e[2].dataType,e[2].dims.length,o),_=t.reduction!=="none"&&t.reduction!==""?Dp("output",e[0].dataType,n.length):K("output",e[0].dataType,n.length,o);return`
      ${m.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(g,w,_)}
      ${m.mainStart()}
        ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var hasDuplicates = false;
  if (${t.reduction==="none"}) {
    let n = ${O.size(r)};
    for (var i = 0; i < n; i = i + 1) {
      for (var j = i + 1; j < n; j = j + 1) {
        var index_i = i32(indices[i].x);
        var index_j = i32(indices[j].x);
        if (index_i == index_j) {
          hasDuplicates = true;
          break;
        }
      }
      if (hasDuplicates) {
        break;
      }
    }
  }

  var data_offset = 0u;
  var indices_start = uniforms.last_index_dimension * global_idx;
  if (${t.reduction==="none"} && hasDuplicates) {
    if (global_idx != 0u) {
      return;
    }
    indices_start = 0u;
  }
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${e[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start + uniforms.last_index_dimension];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${fd(t.reduction,"output[data_offset + i]","value",_.type.value)}
  }

      }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:c}),getShaderSource:f}},of=e=>ye({reduction:e.reduction}),uf=(e,t)=>{e.compute(md(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),gd,yd,_d,aa,wd,$d,vd,bd,xd,Sd,kd,Td,na,Cd,Id,Ed,zd,Ad,lf,df,xy=W(()=>{"use strict";ee(),ne(),ke(),se(),gd=(e,t)=>{if(e.every(i=>i>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},yd=(e,t,i)=>{t.every(n=>n>=0&&n<i||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let r=new Array(i).fill(1);return t.forEach((n,o)=>r[n]=e[o]),r},_d=(e,t,i,r,n,o)=>{let[s,l,p]=i>10?[1,2,3]:[-1,e.length>1?1:-1,-1],c=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(f=>o.push(f));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(l>0&&e.length>l&&e[l].dims.length===1&&e[l].dims[0]>0){if(e[l].getFloat32Array().forEach(f=>r.push(f)),r.length!==0&&r.length!==c&&i>=18&&r.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");gd(r,t),t.axes.length>0&&yd(r,t.axes,c).forEach((f,m)=>r[m]=f)}if(p>0&&e.length>p&&e[p].dims.length===1&&e[p].dims[0]>0&&(e[p].getBigInt64Array().forEach(f=>n.push(Number(f))),n.length!==0&&n.length!==c&&i>=18&&n.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(r.length!==0&&r.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(n.length!==0&&n.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof r<"u"&&typeof n<"u"&&r.length>0&&n.length>c)throw new Error("Resize requires only of scales or sizes to be specified")},aa=(e,t,i,r)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${r}(big / (${i}));
  let fract = ${r}(big % (${i})) / ${r}(${i});
  return whole + fract;
`,wd=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${aa("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${aa("xResized","lengthOriginal - 1","lengthResized - 1",t)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",$d=(e,t,i)=>`fn getNearestPixelFromOriginal(xOriginal: ${i}, isDownSample: bool) -> ${i} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",vd=(e,t,i)=>{let r=new Array(i).fill(0).concat(new Array(i).fill(1)),n=e.length===0?r:e.slice();return t.length>0?(t.forEach((o,s)=>{r[o]=n[s],r[s+i]=n[t.length+s]}),r):n},bd=(e,t,i,r)=>{let n=[];if(i.length>0)if(r.length>0){if(e.forEach(o=>n.push(o)),Math.max(...r)>e.length)throw new Error("axes is out of bound");r.forEach((o,s)=>n[o]=i[s])}else i.forEach(o=>n.push(o));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");n=e.map((o,s)=>Math.round(o*t[s]))}return n},xd=(e,t,i)=>{let r=(()=>{switch(i.keepAspectRatioPolicy){case"not_larger":return i.axes.length>0?Math.min(...i.axes.map(o=>t[o]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return i.axes.length>0?Math.max(...i.axes.map(o=>t[o]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${i.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let n=e.slice();return i.axes.length>0?(i.axes.forEach(o=>t[o]=r),i.axes.forEach(o=>n[o]=Math.round(e[o]*t[o]))):(t.fill(r,0,t.length),n.forEach((o,s)=>n[s]=Math.round(o*t[s]))),n},Sd=(e,t,i,r,n)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${i.length}> {
      var original_indices: array<${e.type.value}, ${i.length}>;
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${Q("uniforms.scales","i",r)};
        var roi_low = ${Q("uniforms.roi","i",n)};
        var roi_hi = ${Q("uniforms.roi",`i + ${t.length}`,n)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${Q("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${Q("uniforms.output_shape","i",i.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,kd=(e,t,i,r,n,o,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${Q("uniforms.scales","i",n)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${Q("uniforms.roi","i",o)};
          var roi_hi = ${Q("uniforms.roi",`i + ${i.length}`,o)};
          var input_shape_i = ${Q("uniforms.input_shape","i",i.length)};
          var output_shape_i = ${Q("uniforms.output_shape","i",r.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${s} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,Td=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${Q("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,na=(e,t,i,r)=>e.rank>r?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",i,"batch")};
`:"",Cd=(e,t,i,r,n)=>{let[o,s,l,p]=i.length===2?[-1,0,1,-1]:[0,2,3,1],c=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${c} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(row, ${i[s]} - 1))`)};
      ${e.indicesSet("input_indices",l,`max(0, min(col, ${i[l]} - 1))`)};
      ${na(e,p,o,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${c} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${c} = originalIndices[${s}];
      var col:${c} = originalIndices[${l}];
      ${r?`if (row < 0 || row > (${i[s]} - 1) || col < 0 || col > (${i[l]} - 1)) {
        return ${n};
      }`:""};
      row = max(0, min(row, ${i[s]} - 1));
      col = max(0, min(col, ${i[l]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${i.length>2?`u32(originalIndices[${p}])`:"0"};
      var batch: u32 =  ${i.length>2?`u32(originalIndices[${o}])`:"0"};
      var x11: ${c} = getInputValue(batch, channel, row1, col1);
      var x12: ${c} = getInputValue(batch, channel, row1, col2);
      var x21: ${c} = getInputValue(batch, channel, row2, col1);
      var x22: ${c} = getInputValue(batch, channel, row2, col2);
      var dx1: ${c} = abs(row - ${c}(row1));
      var dx2: ${c} = abs(${c}(row2) - row);
      var dy1: ${c} = abs(col - ${c}(col1));
      var dy2: ${c} = abs(${c}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Id=(e,t,i,r,n,o,s,l,p,c)=>{let f=i.length===2,m=!0,[g,w]=f?[0,1]:m?[2,3]:[1,2],_=e.type.value,v=S=>{let b=S===g?"row":"col";return`
      fn ${b}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${_} {
        var output_index = ${t.indicesGet("output_indices",S)};
        var originalIdx: ${_} = getOriginalCoordinateFromResizedCoordinate(output_index, ${n[S]},
        ${r[S]}, ${i[S]}, ${o[S]}, ${o[S]} + ${i.length});
        var fractOriginalIdx: ${_} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${l} && (originalIdx < 0 || originalIdx > (${i[S]} - 1))) {
          return ${p};
        }
        var data: array<${_}, 4> = array<${_}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${b}: ${_} = originalIdx + ${_}(i);
          if (${b} < 0 || ${b} >= ${i[S]}) {
            ${c?`coefs[i + 1] = 0.0;
                        continue;`:l?`return ${p};`:`${b} = max(0, min(${b}, ${i[S]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",S,`u32(${b})`)};
          data[i + 1] = ${S===g?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${v(g)};
    ${v(w)};
  fn getCubicInterpolationCoefs(s: ${_}) -> array<${_}, 4> {
    var absS = abs(s);
    var coeffs: array<${_}, 4> = array<${_}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${_} = 1.0 - absS;
    var twoMinusAbsS: ${_} = 2.0 - absS;
    var onePlusAbsS: ${_} = 1.0 + absS;
    coeffs[0] = ((${s} * onePlusAbsS - 5 * ${s}) * onePlusAbsS + 8 * ${s}) * onePlusAbsS - 4 * ${s};
    coeffs[1] = ((${s} + 2) * absS - (${s} + 3)) * absS * absS + 1;
    coeffs[2] = ((${s} + 2) * oneMinusAbsS - (${s} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${s} * twoMinusAbsS - 5 * ${s}) * twoMinusAbsS + 8 * ${s}) * twoMinusAbsS - 4 * ${s};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${_}, 4>, coefs: array<${_}, 4>) -> ${_} {
    var coefsSum: ${_} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${_} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},Ed=(e,t,i,r,n)=>{let[o,s,l,p,c]=i.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],f=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${f} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(depth, ${i[s]} - 1))`)};
      ${e.indicesSet("input_indices",l,`max(0, min(height, ${i[l]} - 1))`)};
      ${e.indicesSet("input_indices",p,`max(0, min(width, ${i[p]} - 1))`)};
      ${na(e,c,o,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${f} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${f} = originalIndices[${s}];
      var height:${f} = originalIndices[${l}];
      var width:${f} = originalIndices[${p}];
      ${r?`if (depth < 0 || depth > (${i[s]} - 1) || height < 0 || height > (${i[l]} - 1) || width < 0 || (width > ${i[p]} - 1)) {
      return ${n};
        }`:""};

    depth = max(0, min(depth, ${i[s]} - 1));
      height = max(0, min(height, ${i[l]} - 1));
      width = max(0, min(width, ${i[p]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${i.length>3?`u32(originalIndices[${c}])`:"0"};
      var batch: u32 =  ${i.length>3?`u32(originalIndices[${o}])`:"0"};

      var x111: ${f} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${f} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${f} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${f} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${f} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${f} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${f} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${f} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${f} = abs(depth - ${f}(depth1));
      var dx2: ${f} = abs(${f}(depth2) - depth);
      var dy1: ${f} = abs(height - ${f}(height1));
      var dy2: ${f} = abs(${f}(height2) - height);
      var dz1: ${f} = abs(width - ${f}(width1));
      var dz2: ${f} = abs(${f}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},zd=(e,t,i,r,n,o)=>{let s=e.dims,l=vd(o,t.axes,s.length),p=bd(s,r,n,t.axes),c=r.slice();r.length===0&&(c=s.map(($,k)=>$===0?1:p[k]/$),t.keepAspectRatioPolicy!=="stretch"&&(p=xd(s,c,t)));let f=K("output",e.dataType,p.length),m=R("input",e.dataType,s.length),g=O.size(p),w=s.length===p.length&&s.every(($,k)=>$===p[k]),_=t.coordinateTransformMode==="tf_crop_and_resize",v=t.extrapolationValue,S=m.type.value,b=$=>`
      ${w?"":`
      ${wd(t.coordinateTransformMode,S)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Td(m,s)};
              ${$d(t.nearestMode,i,S)};
              ${kd(m,f,s,p,c.length,l.length,_)};
              `;case"linear":return`
              ${Sd(f,s,p,c.length,l.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${Cd(m,f,s,_,v)}`;if(s.length===3||s.length===5)return`${Ed(m,f,s,_,v)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${Id(m,f,s,p,c,l,t.cubicCoeffA,_,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${$.registerUniform("output_size","u32").registerUniform("scales","f32",c.length).registerUniform("roi","f32",l.length).declareVariables(m,f)}
      ${$.mainStart()}
        ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${w?"output[global_idx] = input[global_idx];":`
        let output_indices = ${f.offsetToIndices("global_idx")};
        var input_indices: ${m.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${m.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${s.length===2||s.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${i}|${c.length>0?t.mode==="cubic"?c:c.length:""}|${n.length>0?n:""}|${l.length>0?l:""}|${w}|${t.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:b,getRunData:()=>({outputs:[{dims:p,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:[{type:12,data:g},{type:1,data:c},{type:1,data:l},...Z(s,p)]})}},Ad=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},lf=(e,t)=>{let i=[],r=[],n=[],o=Ad(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");_d(e.inputs,t,o,i,r,n),e.compute(zd(e.inputs[0],t,o,i,r,n),{inputs:[0]})},df=e=>{let t=e.antialias,i=e.axes,r=e.coordinateTransformMode,n=e.cubicCoeffA,o=e.excludeOutside!==0,s=e.extrapolationValue,l=e.keepAspectRatioPolicy,p=e.mode,c=e.nearestMode===""?"simple":e.nearestMode;return ye({antialias:t,axes:i,coordinateTransformMode:r,cubicCoeffA:n,excludeOutside:o,extrapolationValue:s,keepAspectRatioPolicy:l,mode:p,nearestMode:c})}}),Od,Rd,pf,Sy=W(()=>{"use strict";ee(),ne(),ke(),se(),Od=(e,t)=>{let[i,r,n,o]=e,{numHeads:s,rotaryEmbeddingDim:l}=t;if(i.dims.length!==3&&i.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${i.dims.length}`);if(!O.areEqual(r.dims,[])&&!O.areEqual(r.dims,[1])&&r.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${r.dims.length}`);if(n.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${n.dims.length}`);if(o.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${o.dims.length}`);if(!O.areEqual(n.dims,o.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(l>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let p=i.dims[0],c=i.dims[i.dims.length-2],f=n.dims[0],m=O.sizeFromDimension(i.dims,1)/c,g=l===0?n.dims[1]*2:m/s;if(l>g)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(r.dims.length===2){if(p!==r.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${r.dims[0]}`);if(c!==r.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${r.dims[1]}`)}if(g/2!==n.dims[1]&&l/2!==n.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${n.dims[1]}`);if(c>f)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Rd=(e,t)=>{let{interleaved:i,numHeads:r,rotaryEmbeddingDim:n,scale:o}=t,s=e[0].dims[0],l=O.sizeFromDimension(e[0].dims,1),p=e[0].dims[e[0].dims.length-2],c=l/p,f=e[2].dims[1],m=n===0?f*2:c/r,g=new Array(s,p,c/m,m-f),w=O.computeStrides(g),_=[{type:1,data:o},{type:12,data:g},{type:12,data:w},...e[0].dims.length===3?new Array({type:12,data:[l,c,m,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[l,m,p*m,1]}):[],...Z(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],v=S=>{let b=R("input",e[0].dataType,e[0].dims.length),$=R("position_ids",e[1].dataType,e[1].dims.length),k=R("cos_cache",e[2].dataType,e[2].dims.length),T=R("sin_cache",e[3].dataType,e[3].dims.length),I=K("output",e[0].dataType,e[0].dims.length);return S.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:g.length},{name:"global_strides",type:"u32",length:w.length},{name:"input_output_strides",type:"u32",length:w.length}]),`
        ${S.declareVariables(b,$,k,T,I)}

        ${S.mainStart(Vt)}
          let half_rotary_emb_dim = uniforms.${k.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${S.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${$.broadcastedIndicesToOffset("bsnh.xy",K("",$.type.tensor,2))};
            let position_id =
                u32(${$.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${i});
            let j = i + select(half_rotary_emb_dim, 1, ${i});
            let re = ${b.getByOffset("i")} * ${k.get("position_id","bsnh[3]")} -
                ${b.getByOffset("j")} * ${T.get("position_id","bsnh[3]")};
            ${I.setByOffset("i","re")}
            let im = ${b.getByOffset("i")} * ${T.get("position_id","bsnh[3]")} +
                ${b.getByOffset("j")} * ${k.get("position_id","bsnh[3]")};
            ${I.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${I.setByOffset("k",b.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:ye({interleaved:i}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:v,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(g)/Vt)},programUniforms:_})}},pf=(e,t)=>{Od(e.inputs,t),e.compute(Rd(e.inputs,t))}}),Bd,Nd,cf,ky=W(()=>{"use strict";ee(),ne(),se(),Bd=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],i=e[1],r=e[2];if(t.dataType!==i.dataType||t.dataType!==r.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(i.dims.length!==3&&i.dims.length!==2)throw new Error("Skip must be 2D or 3D");let n=t.dims[t.dims.length-1],o=t.dims[t.dims.length-2];if(i.dims[i.dims.length-1]!==n)throw new Error("Skip must have the same hidden size as input");if(i.dims[i.dims.length-2]!==o)throw new Error("Skip must have the same sequence length as input");if(r.dims.length!==1)throw new Error("Gamma must be 1D");if(r.dims[r.dims.length-1]!==n)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==n)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==n)throw new Error("Bias must have the same hidden size as input")}},Nd=(e,t,i,r)=>{let n=t.simplified,o=e[0].dims,s=O.size(o),l=o,p=s,c=o.slice(-1)[0],f=r?o.slice(0,-1).concat(1):[],m=!n&&e.length>3,g=e.length>4,w=r&&i>1,_=r&&i>2,v=i>3,S=64,b=Se(c),$=[{type:12,data:p},{type:12,data:b},{type:12,data:c},{type:1,data:t.epsilon}],k=I=>{let E=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],z=[R("x",e[0].dataType,e[0].dims,b),R("skip",e[1].dataType,e[1].dims,b),R("gamma",e[2].dataType,e[2].dims,b)];m&&z.push(R("beta",e[3].dataType,e[3].dims,b)),g&&z.push(R("bias",e[4].dataType,e[4].dims,b)),z.push(K("output",e[0].dataType,l,b)),w&&z.push(K("mean_output",1,f)),_&&z.push(K("inv_std_output",1,f)),v&&z.push(K("input_skip_bias_sum",e[0].dataType,l,b));let M=Ee(e[0].dataType),U=Ee(1,b);return`

      ${I.registerUniforms(E).declareVariables(...z)}
      var<workgroup> sum_shared : array<${U}, ${S}>;
      var<workgroup> sum_squared_shared : array<${U}, ${S}>;

      ${I.mainStart([S,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${S};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${S};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${S-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${g?"bias[offset1d + i]":M+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${v?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${qt(M,b,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${S};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${wt("sum",b)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${wt("square_sum",b)} / f32(uniforms.hidden_size) ${n?"":"- mean * mean"} + uniforms.epsilon);
        ${w?"mean_output[global_idx] = mean;":""}
        ${_?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${n?"":`- ${M}(mean)`}) *
            ${M}(inv_std_dev) * gamma[offset1d + i]
            ${m?"+ beta[offset1d + i]":""};
        }
      }`},T=[{dims:l,dataType:e[0].dataType}];return i>1&&T.push({dims:f,dataType:1}),i>2&&T.push({dims:f,dataType:1}),i>3&&T.push({dims:o,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${b};${w};${_};${v}`,inputDependencies:e.map((I,E)=>"type")},getShaderSource:k,getRunData:()=>({outputs:T,dispatchGroup:{x:Math.ceil(p/c)},programUniforms:$})}},cf=(e,t)=>{Bd(e.inputs);let i=[0];e.outputCount>1&&i.push(-3),e.outputCount>2&&i.push(-3),e.outputCount>3&&i.push(3),e.compute(Nd(e.inputs,t,e.outputCount,!1),{outputs:i})}}),Md,rr,Dd,sa,Pd,Ud,hf,ff,Ty=W(()=>{"use strict";ee(),ne(),ke(),se(),Md=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((i,r)=>{if(e[r+1].dataType!==6&&e[r+1].dataType!==7)throw new Error(`Input ${r} must be an array of int32 or int64`)})},rr=(e,t)=>{let i=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(r=>i.push(Number(r)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(r=>i.push(Number(r)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return i},Dd=(e,t)=>{if(e.length>1){let i=rr(e,1),r=rr(e,2),n=rr(e,3);return n.length===0&&(n=[...Array(e[0].dims.length).keys()]),ye({starts:i,ends:r,axes:n})}else return t},sa=(e,t,i,r,n)=>{let o=e;return e<0&&(o+=i[r[t]]),n[t]<0?Math.max(0,Math.min(o,i[r[t]]-1)):Math.max(0,Math.min(o,i[r[t]]))},Pd=(e,t,i)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${i.length}; i >= 0; i--) {
            let input_shape_i = ${Q("uniforms.input_shape","i",i.length)};
            let steps_i = ${Q("uniforms.steps","i",i.length)};
            let signs_i = ${Q("uniforms.signs","i",i.length)};
            let starts_i = ${Q("uniforms.starts","i",i.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,Ud=(e,t)=>{let i=e[0].dims,r=O.size(i),n=t.axes.length>0?O.normalizeAxes(t.axes,i.length):[...Array(i.length).keys()],o=rr(e,4);o.forEach(b=>b!==0||(()=>{throw new Error("step cannot be 0")})),o.length===0&&(o=Array(n.length).fill(1));let s=t.starts.map((b,$)=>sa(b,$,i,n,o)),l=t.ends.map((b,$)=>sa(b,$,i,n,o));if(n.length!==s.length||n.length!==l.length)throw new Error("start, ends and axes should have the same number of elements");if(n.length!==i.length)for(let b=0;b<i.length;++b)n.includes(b)||(s.splice(b,0,0),l.splice(b,0,i[b]),o.splice(b,0,1));let p=o.map(b=>Math.sign(b));o.forEach((b,$,k)=>{if(b<0){let T=(l[$]-s[$])/b,I=s[$],E=I+T*o[$];s[$]=E,l[$]=I,k[$]=-b}});let c=i.slice(0);n.forEach((b,$)=>{c[b]=Math.ceil((l[b]-s[b])/o[b])});let f={dims:c,dataType:e[0].dataType},m=K("output",e[0].dataType,c.length),g=R("input",e[0].dataType,e[0].dims.length),w=O.size(c),_=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:p.length},{name:"steps",type:"u32",length:o.length}],v=[{type:12,data:w},{type:12,data:s},{type:6,data:p},{type:12,data:o},...Z(e[0].dims,c)],S=b=>`
      ${b.registerUniforms(_).declareVariables(g,m)}
        ${Pd(g,m,i)}
        ${b.mainStart()}
          ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${m.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${m.setByOffset("global_idx",g.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${p.length}_${s.length}_${o.length}`,inputDependencies:["rank"]},getShaderSource:S,getRunData:()=>({outputs:[f],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:v})}},hf=(e,t)=>{Md(e.inputs,t);let i=Dd(e.inputs,t);e.compute(Ud(e.inputs,i),{inputs:[0]})},ff=e=>{let t=e.starts,i=e.ends,r=e.axes;return ye({starts:t,ends:i,axes:r})}}),Wd,qd,mf,gf,Cy=W(()=>{"use strict";ee(),ne(),ke(),$t(),se(),Wd=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},qd=(e,t)=>{let i=e.inputs[0],r=i.dims,n=O.size(r),o=r.length,s=O.normalizeAxis(t.axis,o),l=s<r.length-1,p,c=[];l?(c=Array.from({length:o},(z,M)=>M),c[s]=o-1,c[o-1]=s,p=e.compute(Me(i,c),{inputs:[i],outputs:[-1]})[0]):p=i;let f=p.dims,m=f[o-1],g=n/m,w=Se(m),_=m/w,v=64;g===1&&(v=256);let S=(z,M)=>M===4?`max(max(${z}.x, ${z}.y), max(${z}.z, ${z}.w))`:M===2?`max(${z}.x, ${z}.y)`:M===3?`max(max(${z}.x, ${z}.y), ${z}.z)`:z,b=R("x",p.dataType,p.dims,w),$=K("result",p.dataType,p.dims,w),k=b.type.value,T=Ee(p.dataType)==="f32"?`var threadMax = ${k}(-3.402823e+38f);`:`var threadMax = ${k}(-65504.0h);`,I=z=>`
      var<workgroup> rowMaxShared : ${k};
      var<workgroup> rowSumShared : ${k};
      var<workgroup> threadShared : array<${k}, ${v}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${k} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${k}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${z.registerUniform("packedCols","i32").declareVariables(b,$)}
      ${z.mainStart(v)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${v};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${T}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${k}(${S("threadShared[0]",w)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${k}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${k}(${wt("threadShared[0]",w)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`,E=e.compute({name:"Softmax",shaderCache:{hint:`${w};${v}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:f,dataType:p.dataType}],dispatchGroup:{x:g},programUniforms:[{type:6,data:_}]}),getShaderSource:I},{inputs:[p],outputs:[l?-1:0]})[0];l&&e.compute(Me(E,c),{inputs:[E]})},mf=(e,t)=>{Wd(e.inputs),qd(e,t)},gf=e=>ye({axis:e.axis})}),oa,Ld,Vd,Gd,yf,Iy=W(()=>{"use strict";ee(),ne(),se(),oa=e=>Array.from(e.getBigInt64Array(),Number),Ld=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(oa(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},Vd=(e,t)=>{let i=[];for(let r=0;r<e.length;++r)i.push(e[r]*t[r]);return i},Gd=(e,t)=>{let i=e[0].dims,r=t??oa(e[1]),n=Vd(i,r),o=O.size(n),s=e[0].dataType,l=R("input",s,i.length),p=K("output",s,n.length),c=f=>`
      const inputShape = ${l.indices(...i)};
      ${f.registerUniform("output_size","u32").declareVariables(l,p)}
      ${f.mainStart()}
      ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${p.offsetToIndices("global_idx")};
      var input_indices: ${l.type.indices};
      for (var i = 0; i < ${i.length}; i++) {
        let input_dim_i = ${l.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${p.indicesGet("output_indices","i")}  % input_dim_i;

        ${l.indicesSet("input_indices","i","input_dim_value")}
      }
      ${p.setByOffset("global_idx",l.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${r}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},...Z(e[0].dims,n)]}),getShaderSource:c}},yf=e=>{Ld(e.inputs),e.compute(Gd(e.inputs),{inputs:[0]})}}),jd,Hd,_f,Ey=W(()=>{"use strict";ee(),ne(),se(),jd=(e,t,i,r,n)=>{let o=K("output_data",n,i.length,4),s=R("a_data",t[1].dataType,t[1].dims.length,4),l=R("b_data",t[2].dataType,t[2].dims.length,4),p=R("c_data",t[0].dataType,t[0].dims.length,4),c,f=(m,g,w)=>`select(${g}, ${m}, ${w})`;if(!r)c=o.setByOffset("global_idx",f(s.getByOffset("global_idx"),l.getByOffset("global_idx"),p.getByOffset("global_idx")));else{let m=(g,w,_="")=>{let v=`a_data[index_a${w}][component_a${w}]`,S=`b_data[index_b${w}][component_b${w}]`,b=`bool(c_data[index_c${w}] & (0xffu << (component_c${w} * 8)))`;return`
            let output_indices${w} = ${o.offsetToIndices(`global_idx * 4u + ${w}u`)};
            let offset_a${w} = ${s.broadcastedIndicesToOffset(`output_indices${w}`,o)};
            let offset_b${w} = ${l.broadcastedIndicesToOffset(`output_indices${w}`,o)};
            let offset_c${w} = ${p.broadcastedIndicesToOffset(`output_indices${w}`,o)};
            let index_a${w} = offset_a${w} / 4u;
            let index_b${w} = offset_b${w} / 4u;
            let index_c${w} = offset_c${w} / 4u;
            let component_a${w} = offset_a${w} % 4u;
            let component_b${w} = offset_b${w} % 4u;
            let component_c${w} = offset_c${w} % 4u;
            ${g}[${w}] = ${_}(${f(v,S,b)});
          `};n===9?c=`
            var data = vec4<u32>(0);
            ${m("data",0,"u32")}
            ${m("data",1,"u32")}
            ${m("data",2,"u32")}
            ${m("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:c=`
            ${m("output_data[global_idx]",0)}
            ${m("output_data[global_idx]",1)}
            ${m("output_data[global_idx]",2)}
            ${m("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(p,s,l,o)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${c}
      }`},Hd=e=>{let t=e[1].dims,i=e[2].dims,r=e[0].dims,n=e[1].dataType,o=!(O.areEqual(t,i)&&O.areEqual(i,r)),s=t,l=O.size(t);if(o){let c=Lt.calcShape(Lt.calcShape(t,i,!1),r,!1);if(!c)throw new Error("Can't perform where op on the given tensors");s=c,l=O.size(s)}let p=Math.ceil(l/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:c=>jd(c,e,s,o,n),getRunData:()=>({outputs:[{dims:s,dataType:n}],dispatchGroup:{x:Math.ceil(l/64/4)},programUniforms:[{type:12,data:p},...Z(r,t,i,s)]})}},_f=e=>{e.compute(Hd(e.inputs))}}),wf,zy=W(()=>{"use strict";V0(),Fa(),G0(),j0(),H0(),F0(),K0(),J0(),ty(),ry(),iy(),ay(),ny(),sy(),oy(),uy(),ly(),dy(),py(),cy(),hy(),fy(),my(),gy(),yy(),Ph(),_y(),wy(),$y(),vy(),by(),Ha(),xy(),Sy(),ky(),Ty(),Cy(),qh(),Iy(),$t(),Ka(),Ey(),wf=new Map([["Abs",[cc]],["Acos",[hc]],["Acosh",[fc]],["Add",[Kc]],["ArgMax",[uc,wa]],["ArgMin",[oc,wa]],["Asin",[mc]],["Asinh",[gc]],["Atan",[yc]],["Atanh",[_c]],["Attention",[lc]],["AveragePool",[Zh,Qh]],["BatchNormalization",[dc]],["BiasAdd",[pc]],["BiasSplitGelu",[Fc]],["Cast",[$c,wc]],["Ceil",[bc]],["Clip",[vc]],["Concat",[ah,nh]],["Conv",[ka,Sa]],["ConvTranspose",[mh,fh]],["Cos",[xc]],["Cosh",[Sc]],["CumSum",[gh,yh]],["DepthToSpace",[_h,wh]],["DequantizeLinear",[af,nf]],["Div",[Qc]],["Einsum",[$h,vh]],["Elu",[kc,or]],["Equal",[Zc]],["Erf",[Tc]],["Exp",[Cc]],["Expand",[bh]],["FastGelu",[xh]],["Floor",[Ic]],["FusedConv",[ka,Sa]],["Gather",[kh,Sh]],["GatherElements",[Ah,zh]],["GatherBlockQuantized",[Ih,Eh]],["GatherND",[Th,Ch]],["Gelu",[Ec]],["Gemm",[Rh,Oh]],["GlobalAveragePool",[Yh,Xh]],["GlobalMaxPool",[rf,tf]],["Greater",[eh]],["GreaterOrEqual",[rh]],["GridSample",[Bh,Nh]],["GroupQueryAttention",[Lh]],["HardSigmoid",[Dc,Mc]],["InstanceNormalization",[Vh]],["LayerNormalization",[Gh]],["LeakyRelu",[zc,or]],["Less",[th]],["LessOrEqual",[ih]],["Log",[jc]],["MatMul",[jh]],["MatMulNBits",[Hh,Fh]],["MaxPool",[Jh,ef]],["Mul",[Xc]],["MultiHeadAttention",[Dh,Mh]],["Neg",[Oc]],["Not",[Ac]],["Pad",[Kh]],["Pow",[Yc]],["QuickGelu",[Hc,or]],["Range",[sf]],["Reciprocal",[Rc]],["ReduceMin",[rc]],["ReduceMean",[Xp]],["ReduceMax",[tc]],["ReduceSum",[ac]],["ReduceProd",[ic]],["ReduceL1",[Yp]],["ReduceL2",[Jp]],["ReduceLogSum",[sc]],["ReduceLogSumExp",[ec]],["ReduceSumSquare",[nc]],["Relu",[Bc]],["Resize",[lf,df]],["RotaryEmbedding",[pf]],["ScatterND",[uf,of]],["Sigmoid",[Nc]],["Sin",[Pc]],["Sinh",[Uc]],["Slice",[hf,ff]],["SkipLayerNormalization",[cf]],["Split",[Uh,Wh]],["Sqrt",[Wc]],["Softmax",[mf,gf]],["Sub",[Jc]],["Tan",[qc]],["Tanh",[Lc]],["ThresholdedRelu",[Gc,or]],["Tile",[yf]],["Transpose",[Up,Wp]],["Where",[_f]]])}),$f,Ay=W(()=>{"use strict";Je(),ut(),se(),$f=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,i,r,n){Ye(e.programInfo.name);let o=this.backend.device,s=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let l=[];for(let c of t)l.push({binding:l.length,resource:{buffer:c.buffer}});for(let c of i)l.push({binding:l.length,resource:{buffer:c.buffer}});n&&l.push({binding:l.length,resource:n});let p=o.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:l,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let c={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:p,dispatchGroup:r};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(c)}s.setPipeline(e.computePipeline),s.setBindGroup(0,p),s.dispatchWorkgroups(...r),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),Ge(e.programInfo.name)}dispose(){}build(e,t){Ye(e.name);let i=this.backend.device,r=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"},{feature:"subgroups-f16",extension:"subgroups_f16"}].forEach(c=>{i.features.has(c.feature)&&r.push(`enable ${c.extension};`)});let n=Pp(t,this.backend.device.limits),o=e.getShaderSource(n),s=`${r.join(`
`)}
${n.additionalImplementations}
${o}`,l=i.createShaderModule({code:s,label:e.name});he("verbose",()=>`[WebGPU] ${e.name} shader code: ${s}`);let p=i.createComputePipeline({compute:{module:l,entryPoint:"main"},layout:"auto",label:e.name});return Ge(e.name),{programInfo:e,computePipeline:p,uniformVariablesInfo:n.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,i=typeof e=="number"?1:e.y||1,r=typeof e=="number"?1:e.z||1,n=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=n&&i<=n&&r<=n)return[t,i,r];let o=t*i*r,s=Math.ceil(Math.sqrt(o));if(s>n){if(s=Math.ceil(Math.cbrt(o)),s>n)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[s,s,s]}else return[s,s,1]}}}),Fd,Kd,Qd,Zd,vf,Oy=W(()=>{"use strict";Je(),ee(),ut(),Op(),q0(),zy(),Ay(),Fd=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let i=[];for(let r=0;r<e.length;++r){let n=e[r].dataType;switch(t[r]){case"none":{i.push("");break}case"type":{i.push(`${n}`);break}case"rank":{let o=e[r].dims.length;i.push(`${n};${o}`);break}case"dims":{let o=e[r].dims.join(",");i.push(`${n};${o}`);break}default:throw new Error(`unsupported input dependency: ${t[r]}`)}}return i.join("|")},Kd=(e,t,i)=>{let r=e.name;return e.shaderCache?.hint&&(r+="["+e.shaderCache.hint+"]"),r+=":"+i+`:${Fd(t,e.shaderCache?.inputDependencies??new Array(t.length).fill("dims"))}`,r},Qd=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Zd=class{constructor(e){this.subgroupsSupported=e.features.has("subgroups"),this.subgroupsF16Supported=e.features.has("subgroups");let t=e.limits;!this.subgroupsSupported||!t.minSubgroupSize||!t.maxSubgroupSize?this.subgroupSizeRange=void 0:this.subgroupSizeRange=[t.minSubgroupSize,t.maxSubgroupSize]}},vf=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let i=[],r={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:i},n=o=>t.features.has(o)&&i.push(o)&&!0;n("chromium-experimental-timestamp-query-inside-passes")||n("timestamp-query"),n("shader-f16"),n("subgroups")&&n("subgroups-f16"),this.device=await t.requestDevice(r),this.deviceInfo=new Zd(this.device),this.adapterInfo=new Qd(t.info||await t.requestAdapterInfo()),this.gpuDataManager=Rp(this),this.programManager=new $f(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,La(e.logLevel,!!e.debug),this.device.onuncapturederror=o=>{o.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${o.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;Ye(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{let t=new BigUint64Array(e.getMappedRange()),i=this.pendingQueries.get(e);for(let r=0;r<t.length/2;r++){let n=i[r],o=n.kernelId,s=this.kernels.get(o),l=s.kernelType,p=s.kernelName,c=n.programName,f=n.inputTensorViews,m=n.outputTensorViews,g=t[r*2],w=t[r*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=g);let _=Number(g-this.queryTimeBase),v=Number(w-this.queryTimeBase);if(!Number.isSafeInteger(_)||!Number.isSafeInteger(v))throw new RangeError("incorrect timestamp range");if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:f.map(S=>({dims:S.dims,dataType:Ct(S.dataType)})),outputsMetadata:m.map(S=>({dims:S.dims,dataType:Ct(S.dataType)})),kernelId:o,kernelType:l,kernelName:p,programName:c,startTime:_,endTime:v});else{let S="";f.forEach(($,k)=>{S+=`input[${k}]: [${$.dims}] | ${Ct($.dataType)}, `});let b="";m.forEach(($,k)=>{b+=`output[${k}]: [${$.dims}] | ${Ct($.dataType)}, `}),console.log(`[profiling] kernel "${o}|${l}|${p}|${c}" ${S}${b}execution time: ${v-_} ns`)}dr("GPU",`${c}::${g}::${w}`)}e.unmap(),this.pendingQueries.delete(e)}),Ge()}run(e,t,i,r,n,o){Ye(e.name);let s=[];for(let $=0;$<t.length;++$){let k=t[$].data;if(k===0)continue;let T=this.gpuDataManager.get(k);if(!T)throw new Error(`no GPU data for input: ${k}`);s.push(T)}let{outputs:l,dispatchGroup:p,programUniforms:c}=e.getRunData(t),f=i.length===0?l.map(($,k)=>k):i;if(f.length!==l.length)throw new Error(`Output size ${f.length} must be equal to ${l.length}.`);let m=[],g=[];for(let $=0;$<l.length;++$){if(!Number.isInteger(f[$])||f[$]<-3||f[$]>=o)throw new Error(`Invalid output index: ${f[$]}`);if(f[$]===-3)continue;let k=f[$]===-1,T=f[$]===-2,I=k||T?n(l[$].dataType,l[$].dims):r(f[$],l[$].dataType,l[$].dims);if(m.push(I),I.data===0)continue;let E=this.gpuDataManager.get(I.data);if(!E)throw new Error(`no GPU data for output: ${I.data}`);if(k&&this.temporaryData.push(E),T){let z=this.kernelPersistentData.get(this.currentKernelId);z||(z=[],this.kernelPersistentData.set(this.currentKernelId,z)),z.push(E)}g.push(E)}if(s.length!==t.length||g.length!==m.length){if(g.length===0)return Ge(e.name),m;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let w;if(c){let $=0,k=[];c.forEach(z=>{let M=typeof z.data=="number"?[z.data]:z.data;if(M.length===0)return;let U=z.type===10?2:4,V,X;z.type===10?(X=M.length>4?16:M.length>2?8:M.length*U,V=M.length>4?16:U*M.length):(X=M.length<=2?M.length*U:16,V=16),$=Math.ceil($/X)*X,k.push($);let F=z.type===10?8:4;$+=M.length>4?Math.ceil(M.length/F)*V:M.length*U});let T=16;$=Math.ceil($/T)*T;let I=new ArrayBuffer($);c.forEach((z,M)=>{let U=k[M],V=typeof z.data=="number"?[z.data]:z.data;if(z.type===6)new Int32Array(I,U,V.length).set(V);else if(z.type===12)new Uint32Array(I,U,V.length).set(V);else if(z.type===10)new Uint16Array(I,U,V.length).set(V);else if(z.type===1)new Float32Array(I,U,V.length).set(V);else throw new Error(`Unsupported uniform type: ${Ct(z.type)}`)});let E=this.gpuDataManager.create($,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(E.buffer,0,I,0,$),this.gpuDataManager.release(E.id),w={offset:0,size:$,buffer:E.buffer}}let _=this.programManager.normalizeDispatchGroupSize(p),v=_[1]===1&&_[2]===1,S=Kd(e,t,v),b=this.programManager.getArtifact(S);if(b||(b=this.programManager.build(e,_),this.programManager.setArtifact(S,b),he("info",()=>`[artifact] key: ${S}, programName: ${e.name}`)),c&&b.uniformVariablesInfo){if(c.length!==b.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${b.uniformVariablesInfo.length}, got ${c.length} in program "${b.programInfo.name}".`);for(let $=0;$<c.length;$++){let k=c[$],T=k.type,I=typeof k.data=="number"?1:k.data.length,[E,z]=b.uniformVariablesInfo[$];if(T!==E||I!==z)throw new Error(`Uniform variable ${$} mismatch: expect type ${E} with size ${z}, got type ${T} with size ${I} in program "${b.programInfo.name}".`)}}if(he("info",()=>`[ProgramManager] run "${e.name}" (key=${S}) with ${_[0]}x${_[1]}x${_[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let $={kernelId:this.currentKernelId,programName:b.programInfo.name,inputTensorViews:t,outputTensorViews:m};this.pendingKernels.push($),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push($)}return this.programManager.run(b,s,g,_,w),Ge(e.name),m}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,i,r){let n=wf.get(e);if(!n)throw new Error(`kernel not implemented: ${e}`);let o={kernelType:e,kernelName:r,kernelEntry:n[0],attributes:[n[1],i]};this.kernels.set(t,o)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let i of t)this.gpuDataManager.release(i.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,i){let r=this.kernels.get(e);if(!r)throw new Error(`kernel not created: ${e}`);let n=r.kernelType,o=r.kernelName,s=r.kernelEntry,l=r.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${n}] ${o}" is not allowed to be called recursively`);this.currentKernelId=e,l[0]&&(l[1]=l[0](l[1]),l[0]=void 0),he("info",()=>`[WebGPU] Start to run kernel "[${n}] ${o}"...`);let p=this.env.debug;this.temporaryData=[];try{return p&&this.device.pushErrorScope("validation"),s(t,l[1]),0}catch(c){return i.push(Promise.resolve(`[WebGPU] Kernel "[${n}] ${o}" failed. ${c}`)),1}finally{p&&i.push(this.device.popErrorScope().then(c=>c?`GPU validation error for kernel "[${n}] ${o}": ${c.message}`:null));for(let c of this.temporaryData)this.gpuDataManager.release(c.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,i,r){let n=this.sessionExternalDataMapping.get(e);n||(n=new Map,this.sessionExternalDataMapping.set(e,n));let o=n.get(t),s=this.gpuDataManager.registerExternalBuffer(i,r,o);return n.set(t,[s,i]),s}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(i=>this.gpuDataManager.unregisterExternalBuffer(i[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,i){return async()=>{let r=await ga(this,e,t);return Va(r.buffer,i)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){this.queryType="none",(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){he("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){he("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){he("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),i=e.length;this.pendingKernels=[];for(let r=0;r<i;r++){let n=this.getComputePassEncoder(),o=e[r];this.writeTimestamp(this.pendingDispatchNumber*2),n.setPipeline(o.computePipeline),n.setBindGroup(0,o.bindGroup),n.dispatchWorkgroups(...o.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[r]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Xd,ua,Yd,la,da,pa,Jd,bf,Ry=W(()=>{"use strict";ut(),Xd=1,ua=()=>Xd++,Yd=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),la=(e,t)=>{let i=Yd.get(e);if(!i)throw new Error("Unsupported data type.");return t.length>0?Math.ceil(t.reduce((r,n)=>r*n)*i/8):0},da=class{constructor(e){this.sessionId=e.sessionId,this.mlContext=e.context,this.mlTensor=e.tensor,this.dataType=e.dataType,this.tensorShape=e.shape}get tensor(){return this.mlTensor}get type(){return this.dataType}get shape(){return this.tensorShape}get byteLength(){return la(this.dataType,this.tensorShape)}destroy(){he("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,i){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===i.length&&this.tensorShape.every((r,n)=>r===i[n])}},pa=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,i,r){let n=this.tensorManager.getMLContext(e);if(this.wrapper){if(this.wrapper.canReuseTensor(n,t,i))return this.wrapper.tensor;if(r){if(this.wrapper.byteLength!==la(t,i))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let o=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,i,o,!0,!0),r&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){if(this.wrapper)if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(e);return}else he("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor();this.activeUpload?this.activeUpload.set(e):this.activeUpload=new Uint8Array(e)}async download(e){if(this.activeUpload)if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(this.activeUpload):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(this.activeUpload);return}else return this.activeUpload.buffer;if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},Jd=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=ua();return this.tensorTrackersById.set(e,new pa(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,i,r,n){he("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${i}, shape: ${r}, copyOld: ${n}}`);let o=this.tensorTrackersById.get(t);if(!o)throw new Error("Tensor not found.");return o.ensureTensor(e,i,r,n)}upload(e,t){let i=this.tensorTrackersById.get(e);if(!i)throw new Error("Tensor not found.");i.upload(t)}async download(e,t){he("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t?.byteLength}}`);let i=this.tensorTrackersById.get(e);if(!i)throw new Error("Tensor not found.");return i.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,i,r){let n=this.getMLContext(e),o=ua(),s=new da({sessionId:e,context:n,tensor:t,dataType:i,shape:r});return this.tensorTrackersById.set(o,new pa(this,s)),this.externalTensors.add(s),o}async getCachedTensor(e,t,i,r,n,o){let s=this.getMLContext(e);for(let[p,c]of this.freeTensors.entries())if(c.canReuseTensor(s,t,i)){he("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, shape: ${i}}`);let f=this.freeTensors.splice(p,1)[0];return f.sessionId=e,f}he("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, shape: ${i}}`);let l=await s.createTensor({dataType:t,shape:i,dimensions:i,usage:r,writable:n,readable:o});return new da({sessionId:e,context:s,tensor:l,dataType:t,shape:i})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},bf=(...e)=>new Jd(...e)}),Br,ep,xf,By=W(()=>{"use strict";ee(),Rt(),Op(),Ry(),ut(),Br=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),ep=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let i=Object.keys(e).sort(),r=Object.keys(t).sort();return i.length===r.length&&i.every((n,o)=>n===r[o]&&e[n]===t[n])},xf=class{constructor(e){this.tensorManager=bf(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.temporaryGraphInputs=[],this.temporarySessionTensorIds=new Map,La(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){he("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){he("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let i of t)he("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${i}}`),this.tensorManager.releaseTensorId(i);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let i=this.mlContextCache.findIndex(r=>r.gpuDevice===e);if(i!==-1)return this.mlContextCache[i].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:r}),r}}else if(e===void 0){let i=this.mlContextCache.findIndex(r=>r.options===void 0&&r.gpuDevice===void 0);if(i!==-1)return this.mlContextCache[i].mlContext;{let r=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:r}),r}}let t=this.mlContextCache.findIndex(i=>ep(i.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:i}),i}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let i=this.sessionIdsByMLContext.get(t);i||(i=new Set,this.sessionIdsByMLContext.set(t,i)),i.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let i=this.sessionIdsByMLContext.get(t);if(i.delete(e),i.size===0){this.sessionIdsByMLContext.delete(t);let r=this.mlContextCache.findIndex(n=>n.mlContext===t);r!==-1&&this.mlContextCache.splice(r,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){he("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,i,r,n){let o=Br.get(i);if(!o)throw new Error(`Unsupported ONNX data type: ${i}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,o,r,n)}async createTemporaryTensor(e,t,i){he("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${i}}`);let r=Br.get(t);if(!r)throw new Error(`Unsupported ONNX data type: ${t}`);let n=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,n,r,i,!1);let o=this.temporarySessionTensorIds.get(e);return o?o.push(n):this.temporarySessionTensorIds.set(e,[n]),n}uploadTensor(e,t){if(!Ie().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");he("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let i=await this.tensorManager.download(e);return Va(i,t)}}registerMLTensor(e,t,i,r){let n=Br.get(i);if(!n)throw new Error(`Unsupported ONNX data type: ${i}`);let o=this.tensorManager.registerTensor(e,t,n,r);return he("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${n}, dimensions: ${r}} -> {tensorId: ${o}}`),o}registerMLConstant(e,t,i,r,n,o){if(!o)throw new Error("External mounted files are not available.");let s=e;e.startsWith("./")&&(s=e.substring(2));let l=o.get(s);if(!l)throw new Error(`File with name ${s} not found in preloaded files.`);if(t+i>l.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let p=l.slice(t,t+i).buffer,c;switch(n.dataType){case"float32":c=new Float32Array(p);break;case"float16":c=new Uint16Array(p);break;case"int32":c=new Int32Array(p);break;case"uint32":c=new Uint32Array(p);break;case"int64":c=new BigInt64Array(p);break;case"uint64":c=new BigUint64Array(p);break;case"int8":c=new Int8Array(p);break;case"int4":case"uint4":case"uint8":c=new Uint8Array(p);break;default:throw new Error(`Unsupported data type: ${n.dataType} in creating WebNN Constant from external data.`)}return he("verbose",()=>`[WebNN] registerMLConstant {dataType: ${n.dataType}, shape: ${n.shape}}}`),r.constant(n,c)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}isGraphInput(e,t){let i=this.sessionGraphInputs.get(e);return i?i.includes(t):!1}flush(){}}}),Sf={};Hr(Sf,{init:()=>kf});var Nr,tp,kf,Ny=W(()=>{"use strict";ee(),Oy(),ut(),ne(),By(),Nr=class Tf{constructor(t,i,r,n){this.module=t,this.dataType=i,this.data=r,this.dims=n}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(O.size(t)!==O.size(this.dims))throw new Error("Invalid new shape");return new Tf(this.module,this.dataType,this.data,t)}},tp=class{constructor(e,t,i){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo,this.deviceInfo=t.deviceInfo;let r=e.PTR_SIZE,n=i/e.PTR_SIZE,o=r===4?"i32":"i64";this.opKernelContext=Number(e.getValue(r*n++,o));let s=Number(e.getValue(r*n++,o));this.outputCount=Number(e.getValue(r*n++,o)),this.customDataOffset=Number(e.getValue(r*n++,"*")),this.customDataSize=Number(e.getValue(r*n++,o));let l=[];for(let p=0;p<s;p++){let c=Number(e.getValue(r*n++,o)),f=Number(e.getValue(r*n++,"*")),m=Number(e.getValue(r*n++,o)),g=[];for(let w=0;w<m;w++)g.push(Number(e.getValue(r*n++,o)));l.push(new Nr(e,c,f,g))}this.inputs=l}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){let i=t?.inputs?.map(s=>typeof s=="number"?this.inputs[s]:s)??this.inputs,r=t?.outputs??[],n=(s,l,p)=>new Nr(this.module,l,this.output(s,p),p),o=(s,l)=>{let p=It(s,l);if(!p)throw new Error(`Unsupported data type: ${s}`);let c=p>0?this.backend.gpuDataManager.create(p).id:0;return new Nr(this.module,s,c,l)};return this.backend.run(e,i,r,n,o,this.outputCount)}output(e,t){let i=this.module.stackSave();try{let r=this.module.PTR_SIZE,n=r===4?"i32":"i64",o=this.module.stackAlloc((1+t.length)*r);this.module.setValue(o,t.length,n);for(let s=0;s<t.length;s++)this.module.setValue(o+r*(s+1),t[s],n);return this.module._JsepOutput(this.opKernelContext,e,o)}catch(r){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${r}`)}finally{this.module.stackRestore(i)}}},kf=async(e,t,i,r)=>{let n=t.jsepInit;if(!n)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let o=new vf;await o.initialize(i,r),n("webgpu",[o,s=>o.alloc(Number(s)),s=>o.free(s),(s,l,p,c=!1)=>{if(c)he("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(s)}, dst=${Number(l)}, size=${Number(p)}`),o.memcpy(Number(s),Number(l));else{he("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(s)}, gpuDataId=${Number(l)}, size=${Number(p)}`);let f=t.HEAPU8.subarray(Number(s>>>0),Number(s>>>0)+Number(p));o.upload(Number(l),f)}},async(s,l,p)=>{he("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${s}, dataOffset=${l}, size=${p}`),await o.download(Number(s),()=>t.HEAPU8.subarray(Number(l)>>>0,Number(l+p)>>>0))},(s,l,p)=>o.createKernel(s,Number(l),p,t.UTF8ToString(t._JsepGetNodeName(Number(l)))),s=>o.releaseKernel(s),(s,l,p,c)=>{he("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${p}, kernel=${s}, contextDataOffset=${l}`);let f=new tp(t,o,Number(l));return o.computeKernel(Number(s),f,c)},()=>o.captureBegin(),()=>o.captureEnd(),()=>o.replay()])}else{let o=new xf(i);n("webnn",[o,()=>o.reserveTensorId(),s=>o.releaseTensorId(s),async(s,l,p,c,f)=>o.ensureTensor(s,l,p,c,f),(s,l)=>{o.uploadTensor(s,l)},async(s,l)=>o.downloadTensor(s,l)])}}}),rp,en,tn,yt,ip,jr,rn,an,ca,nn,sn,on,Cf=W(()=>{"use strict";U0(),W0(),ee(),Rt(),Da(),Ap(),rp=(e,t)=>{Ie()._OrtInit(e,t)!==0&&ge("Can't initialize onnxruntime.")},en=async e=>{rp(e.wasm.numThreads,qr(e.logLevel))},tn=async(e,t)=>{{let i=(Ny(),za(Sf)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let r=e.webgpu.adapter;if(r){if(typeof r.limits!="object"||typeof r.features!="object"||typeof r.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let n=e.webgpu.powerPreference;if(n!==void 0&&n!=="low-power"&&n!=="high-performance")throw new Error(`Invalid powerPreference setting: "${n}"`);let o=e.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(r=await navigator.gpu.requestAdapter({powerPreference:n,forceFallbackAdapter:o}),!r)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await i("webgpu",Ie(),e,r)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await i("webnn",Ie(),e)}}},yt=new Map,ip=e=>{let t=Ie(),i=t.stackSave();try{let r=t.PTR_SIZE,n=t.stackAlloc(2*r);t._OrtGetInputOutputCount(e,n,n+r)!==0&&ge("Can't get session input/output count.");let o=r===4?"i32":"i64";return[Number(t.getValue(n,o)),Number(t.getValue(n+r,o))]}finally{t.stackRestore(i)}},jr=e=>{let t=Ie(),i=t._malloc(e.byteLength);if(i===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,i),[i,e.byteLength]},rn=async(e,t)=>{let i,r,n=Ie();Array.isArray(e)?[i,r]=e:e.buffer===n.HEAPU8.buffer?[i,r]=[e.byteOffset,e.byteLength]:[i,r]=jr(e);let o=0,s=0,l=0,p=[],c=[],f=[];try{if([s,p]=zp(t),t?.externalData&&n.mountExternalData){let $=[];for(let k of t.externalData){let T=typeof k=="string"?k:k.path;$.push(qa(typeof k=="string"?k:k.data).then(I=>{n.mountExternalData(T,I)}))}await Promise.all($)}for(let $ of t?.executionProviders??[])if((typeof $=="string"?$:$.name)==="webnn"){if(n.shouldTransferToMLTensor=!1,typeof $!="string"){let k=$,T=k?.context,I=k?.gpuDevice,E=k?.deviceType,z=k?.powerPreference;T?n.currentContext=T:I?n.currentContext=await n.jsepCreateMLContext(I):n.currentContext=await n.jsepCreateMLContext({deviceType:E,powerPreference:z})}else n.currentContext=await n.jsepCreateMLContext();break}o=await n._OrtCreateSession(i,r,s),o===0&&ge("Can't create a session."),n.jsepOnCreateSession?.(),n.currentContext&&(n.jsepRegisterMLContext(o,n.currentContext),n.currentContext=void 0,n.shouldTransferToMLTensor=!0);let[m,g]=ip(o),w=!!t?.enableGraphCapture,_=[],v=[],S=[];for(let $=0;$<m;$++){let k=n._OrtGetInputName(o,$);k===0&&ge("Can't get an input name."),c.push(k),_.push(n.UTF8ToString(k))}for(let $=0;$<g;$++){let k=n._OrtGetOutputName(o,$);k===0&&ge("Can't get an output name."),f.push(k);let T=n.UTF8ToString(k);v.push(T);{if(w&&t?.preferredOutputLocation===void 0){S.push("gpu-buffer");continue}let I=typeof t?.preferredOutputLocation=="string"?t.preferredOutputLocation:t?.preferredOutputLocation?.[T]??"cpu";if(I!=="cpu"&&I!=="cpu-pinned"&&I!=="gpu-buffer"&&I!=="ml-tensor")throw new Error(`Not supported preferred output location: ${I}.`);if(w&&I!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${I}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);S.push(I)}}let b=null;return S.some($=>$==="gpu-buffer"||$==="ml-tensor")&&(l=n._OrtCreateBinding(o),l===0&&ge("Can't create IO binding."),b={handle:l,outputPreferredLocations:S,outputPreferredLocationsEncoded:S.map($=>ma($))}),yt.set(o,[o,c,f,b,w,!1]),[o,_,v]}catch(m){throw c.forEach(g=>n._OrtFree(g)),f.forEach(g=>n._OrtFree(g)),l!==0&&n._OrtReleaseBinding(l)!==0&&ge("Can't release IO binding."),o!==0&&n._OrtReleaseSession(o)!==0&&ge("Can't release session."),m}finally{n._free(i),s!==0&&n._OrtReleaseSessionOptions(s)!==0&&ge("Can't release session options."),p.forEach(m=>n._free(m)),n.unmountExternalData?.()}},an=e=>{let t=Ie(),i=yt.get(e);if(!i)throw new Error(`cannot release session. invalid session id: ${e}`);let[r,n,o,s,l]=i;s&&(l&&t._OrtClearBoundOutputs(s.handle)!==0&&ge("Can't clear bound outputs."),t._OrtReleaseBinding(s.handle)!==0&&ge("Can't release IO binding.")),t.jsepOnReleaseSession?.(e),n.forEach(p=>t._OrtFree(p)),o.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(r)!==0&&ge("Can't release session."),yt.delete(e)},ca=async(e,t,i,r,n,o=!1)=>{if(!e){t.push(0);return}let s=Ie(),l=s.PTR_SIZE,p=e[0],c=e[1],f=e[3],m=f,g,w;if(p==="string"&&(f==="gpu-buffer"||f==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(o&&f!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${n} when enableGraphCapture is true.`);if(f==="gpu-buffer"){let S=e[2].gpuBuffer;w=It(Wt(p),c);let b=s.jsepRegisterBuffer;if(!b)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');g=b(r,n,S,w)}else if(f==="ml-tensor"){let S=e[2].mlTensor;w=It(Wt(p),c);let b=s.jsepRegisterMLTensor;if(!b)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');g=b(r,S,Wt(p),c)}else{let S=e[2];if(Array.isArray(S)){w=l*S.length,g=s._malloc(w),i.push(g);for(let b=0;b<S.length;b++){if(typeof S[b]!="string")throw new TypeError(`tensor data at index ${b} is not a string`);s.setValue(g+b*l,Ae(S[b],i),"*")}}else{let b=s.jsepIsGraphInput;if(p!=="string"&&b){let $=s._OrtGetInputName(r,n),k=s.UTF8ToString($);if(b(r,k)){let T=Wt(p);w=It(T,c),m="ml-tensor";let I=s.jsepCreateTemporaryTensor,E=s.jsepUploadTensor;if(!I||!E)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let z=await I(r,T,c);E(z,new Uint8Array(S.buffer,S.byteOffset,S.byteLength)),g=z}else w=S.byteLength,g=s._malloc(w),i.push(g),s.HEAPU8.set(new Uint8Array(S.buffer,S.byteOffset,w),g)}else w=S.byteLength,g=s._malloc(w),i.push(g),s.HEAPU8.set(new Uint8Array(S.buffer,S.byteOffset,w),g)}}let _=s.stackSave(),v=s.stackAlloc(4*c.length);try{c.forEach((b,$)=>s.setValue(v+$*l,b,l===4?"i32":"i64"));let S=s._OrtCreateTensor(Wt(p),g,w,v,c.length,ma(m));S===0&&ge(`Can't create tensor for input/output. session=${r}, index=${n}.`),t.push(S)}finally{s.stackRestore(_)}},nn=async(e,t,i,r,n,o)=>{let s=Ie(),l=s.PTR_SIZE,p=yt.get(e);if(!p)throw new Error(`cannot run inference. invalid session id: ${e}`);let c=p[0],f=p[1],m=p[2],g=p[3],w=p[4],_=p[5],v=t.length,S=r.length,b=0,$=[],k=[],T=[],I=[],E=s.stackSave(),z=s.stackAlloc(v*l),M=s.stackAlloc(v*l),U=s.stackAlloc(S*l),V=s.stackAlloc(S*l);try{[b,$]=Ep(o);for(let q=0;q<v;q++)await ca(i[q],k,I,e,t[q],w);for(let q=0;q<S;q++)await ca(n[q],T,I,e,v+r[q],w);for(let q=0;q<v;q++)s.setValue(z+q*l,k[q],"*"),s.setValue(M+q*l,f[t[q]],"*");for(let q=0;q<S;q++)s.setValue(U+q*l,T[q],"*"),s.setValue(V+q*l,m[r[q]],"*");if(g&&!_){let{handle:q,outputPreferredLocations:te,outputPreferredLocationsEncoded:oe}=g;if(f.length!==v)throw new Error(`input count from feeds (${v}) is expected to be always equal to model's input count (${f.length}).`);for(let G=0;G<v;G++){let pe=t[G];await s._OrtBindInput(q,f[pe],k[G])!==0&&ge(`Can't bind input[${G}] for session=${e}.`)}for(let G=0;G<S;G++){let pe=r[G];n[G]?.[3]?s._OrtBindOutput(q,m[pe],T[G],0)!==0&&ge(`Can't bind pre-allocated output[${G}] for session=${e}.`):s._OrtBindOutput(q,m[pe],0,oe[pe])!==0&&ge(`Can't bind output[${G}] to ${te[G]} for session=${e}.`)}yt.set(e,[c,f,m,g,w,!0])}s.jsepOnRunStart?.(c);let X;g?X=await s._OrtRunWithBinding(c,g.handle,S,U,b):X=await s._OrtRun(c,M,z,v,V,S,U,b),X!==0&&ge("failed to call OrtRun().");let F=[];for(let q=0;q<S;q++){let te=Number(s.getValue(U+q*l,"*"));if(te===T[q]){F.push(n[q]);continue}let oe=s.stackSave(),G=s.stackAlloc(4*l),pe=!1,de,Y=0;try{s._OrtGetTensorData(te,G,G+l,G+2*l,G+3*l)!==0&&ge(`Can't access output tensor data on index ${q}.`);let be=l===4?"i32":"i64",P=Number(s.getValue(G,be));Y=s.getValue(G+l,"*");let j=s.getValue(G+l*2,"*"),ue=Number(s.getValue(G+l*3,be)),we=[];for(let ce=0;ce<ue;ce++)we.push(Number(s.getValue(j+ce*l,be)));s._OrtFree(j)!==0&&ge("Can't free memory for tensor dims.");let Ce=we.reduce((ce,fe)=>ce*fe,1);de=Ct(P);let je=g?.outputPreferredLocations[r[q]];if(de==="string"){if(je==="gpu-buffer"||je==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let ce=[];for(let fe=0;fe<Ce;fe++){let De=s.getValue(Y+fe*l,"*"),Gt=s.getValue(Y+(fe+1)*l,"*"),D=fe===Ce-1?void 0:Gt-De;ce.push(s.UTF8ToString(De,D))}F.push([de,we,ce,"cpu"])}else if(je==="gpu-buffer"&&Ce>0){let ce=s.jsepGetBuffer;if(!ce)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let fe=ce(Y),De=It(P,Ce);if(De===void 0||!Ua(de))throw new Error(`Unsupported data type: ${de}`);pe=!0,F.push([de,we,{gpuBuffer:fe,download:s.jsepCreateDownloader(fe,De,de),dispose:()=>{s._OrtReleaseTensor(te)!==0&&ge("Can't release tensor.")}},"gpu-buffer"])}else if(je==="ml-tensor"&&Ce>0){let ce=s.jsepEnsureTensor;if(!ce)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(It(P,Ce)===void 0||!Wa(de))throw new Error(`Unsupported data type: ${de}`);let fe=await ce(e,Y,P,we,!1);pe=!0,F.push([de,we,{mlTensor:fe,download:s.jsepCreateMLTensorDownloader(Y,de),dispose:()=>{s.jsepReleaseTensorId(Y),s._OrtReleaseTensor(te)}},"ml-tensor"])}else{let ce=Pa(de),fe=new ce(Ce);new Uint8Array(fe.buffer,fe.byteOffset,fe.byteLength).set(s.HEAPU8.subarray(Y,Y+fe.byteLength)),F.push([de,we,fe,"cpu"])}}finally{s.stackRestore(oe),de==="string"&&Y&&s._free(Y),pe||s._OrtReleaseTensor(te),s.jsepOnRunEnd?.(c)}}return g&&!w&&(s._OrtClearBoundOutputs(g.handle)!==0&&ge("Can't clear bound outputs."),yt.set(e,[c,f,m,g,w,!1])),F}finally{s.stackRestore(E),k.forEach(X=>s._OrtReleaseTensor(X)),T.forEach(X=>s._OrtReleaseTensor(X)),I.forEach(X=>s._free(X)),b!==0&&s._OrtReleaseRunOptions(b),$.forEach(X=>s._free(X))}},sn=e=>{let t=Ie(),i=yt.get(e);if(!i)throw new Error("invalid session id");let r=i[0],n=t._OrtEndProfiling(r);n===0&&ge("Can't get an profile file name."),t._OrtFree(n)},on=e=>{let t=[];for(let i of e){let r=i[2];!Array.isArray(r)&&"buffer"in r&&t.push(r.buffer)}return t}}),_t,Le,Ut,ir,ar,Mr,ha,Dr,St,kt,ap,If,Ef,zf,Af,Of,Rf,Bf,Nf=W(()=>{"use strict";Je(),Cf(),Rt(),Na(),_t=()=>!!$e.wasm.proxy&&typeof document<"u",Ut=!1,ir=!1,ar=!1,Dr=new Map,St=(e,t)=>{let i=Dr.get(e);i?i.push(t):Dr.set(e,[t])},kt=()=>{if(Ut||!ir||ar||!Le)throw new Error("worker not ready")},ap=e=>{switch(e.data.type){case"init-wasm":Ut=!1,e.data.err?(ar=!0,ha[1](e.data.err)):(ir=!0,ha[0]()),Mr&&(URL.revokeObjectURL(Mr),Mr=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Dr.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}default:}},If=async()=>{if(!ir){if(Ut)throw new Error("multiple calls to 'initWasm()' detected.");if(ar)throw new Error("previous call to 'initWasm()' failed.");if(Ut=!0,_t())return new Promise((e,t)=>{Le?.terminate(),Cp().then(([i,r])=>{try{Le=r,Le.onerror=o=>t(o),Le.onmessage=ap,ha=[e,t];let n={type:"init-wasm",in:$e};if(!n.in.wasm.wasmPaths&&i){let o=Ba();o&&(n.in.wasm.wasmPaths=o)}Le.postMessage(n),Mr=i}catch(n){t(n)}},t)});try{await Ma($e.wasm),await en($e),ir=!0}catch(e){throw ar=!0,e}finally{Ut=!1}}},Ef=async e=>{if(_t())return kt(),new Promise((t,i)=>{St("init-ep",[t,i]);let r={type:"init-ep",in:{epName:e,env:$e}};Le.postMessage(r)});await tn($e,e)},zf=async e=>_t()?(kt(),new Promise((t,i)=>{St("copy-from",[t,i]);let r={type:"copy-from",in:{buffer:e}};Le.postMessage(r,[e.buffer])})):jr(e),Af=async(e,t)=>{if(_t()){if(t?.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return kt(),new Promise((i,r)=>{St("create",[i,r]);let n={type:"create",in:{model:e,options:{...t}}},o=[];e instanceof Uint8Array&&o.push(e.buffer),Le.postMessage(n,o)})}else return rn(e,t)},Of=async e=>{if(_t())return kt(),new Promise((t,i)=>{St("release",[t,i]);let r={type:"release",in:e};Le.postMessage(r)});an(e)},Rf=async(e,t,i,r,n,o)=>{if(_t()){if(i.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(n.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return kt(),new Promise((s,l)=>{St("run",[s,l]);let p=i,c={type:"run",in:{sessionId:e,inputIndices:t,inputs:p,outputIndices:r,options:o}};Le.postMessage(c,on(p))})}else return nn(e,t,i,r,n,o)},Bf=async e=>{if(_t())return kt(),new Promise((t,i)=>{St("end-profiling",[t,i]);let r={type:"end-profiling",in:e};Le.postMessage(r)});sn(e)}}),fa,np,Mf,My=W(()=>{"use strict";Je(),Nf(),ee(),Ra(),Ap(),fa=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},np=e=>{switch(e[3]){case"cpu":return new Xe(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Ua(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:i,download:r,dispose:n}=e[2];return Xe.fromGpuBuffer(i,{dataType:t,dims:e[1],download:r,dispose:n})}case"ml-tensor":{let t=e[0];if(!Wa(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:i,download:r,dispose:n}=e[2];return Xe.fromMLTensor(i,{dataType:t,dims:e[1],download:r,dispose:n})}default:throw new Error(`invalid data location: ${e[3]}`)}},Mf=class{async fetchModelAndCopyToWasmMemory(e){return zf(await qa(e))}async loadModel(e,t){Ye();let i;typeof e=="string"?i=await this.fetchModelAndCopyToWasmMemory(e):i=e,[this.sessionId,this.inputNames,this.outputNames]=await Af(i,t),Ge()}async dispose(){return Of(this.sessionId)}async run(e,t,i){Ye();let r=[],n=[];Object.entries(e).forEach(m=>{let g=m[0],w=m[1],_=this.inputNames.indexOf(g);if(_===-1)throw new Error(`invalid input '${g}'`);r.push(w),n.push(_)});let o=[],s=[];Object.entries(t).forEach(m=>{let g=m[0],w=m[1],_=this.outputNames.indexOf(g);if(_===-1)throw new Error(`invalid output '${g}'`);o.push(w),s.push(_)});let l=r.map((m,g)=>fa(m,()=>`input "${this.inputNames[n[g]]}"`)),p=o.map((m,g)=>m?fa(m,()=>`output "${this.outputNames[s[g]]}"`):null),c=await Rf(this.sessionId,n,l,s,p,i),f={};for(let m=0;m<c.length;m++)f[this.outputNames[s[m]]]=o[m]??np(c[m]);return Ge(),f}startProfiling(){}endProfiling(){Bf(this.sessionId)}}}),Df={};Hr(Df,{OnnxruntimeWebAssemblyBackend:()=>Ia,initializeFlags:()=>Ca,wasmBackend:()=>Pf});var Ca,Ia,Pf,Dy=W(()=>{"use strict";Je(),Nf(),My(),Ca=()=>{if((typeof $e.wasm.initTimeout!="number"||$e.wasm.initTimeout<0)&&($e.wasm.initTimeout=0),$e.wasm.simd===!1&&console.warn('Deprecated property "env.wasm.simd" is set to false. non-SIMD build is no longer provided, and this setting will be ignored.'),typeof $e.wasm.proxy!="boolean"&&($e.wasm.proxy=!1),typeof $e.wasm.trace!="boolean"&&($e.wasm.trace=!1),typeof $e.wasm.numThreads!="number"||!Number.isInteger($e.wasm.numThreads)||$e.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)$e.wasm.numThreads=1;else{let e=typeof navigator>"u"?x0("node:os").cpus().length:navigator.hardwareConcurrency;$e.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}},Ia=class{async init(e){Ca(),await If(),await Ef(e)}async createInferenceSessionHandler(e,t){let i=new Mf;return await i.loadModel(e,t),Promise.resolve(i)}},Pf=new Ia});Je();Je();Je();var Py="1.21.0",Uy=Sp;{let e=(Dy(),za(Df)).wasmBackend;Et("webgpu",e,5),Et("webnn",e,5),Et("cpu",e,10),Et("wasm",e,10)}Object.defineProperty($e.versions,"web",{value:Py,enumerable:!0});function c_(e){let t=r=>{let n=e[r];if(typeof n!="string"||!n.startsWith("blob:"))throw Error("Verified runtime Blob URL required: "+r);return n},i=$e.wasm;return i.numThreads=1,i.proxy=!1,i.wasmBinary=void 0,i.wasmPaths={wasm:t("ort121.wasm")},un}export{Oa as InferenceSession,dr as TRACE,Ye as TRACE_FUNC_BEGIN,Ge as TRACE_FUNC_END,Xe as Tensor,c_ as __alloflowConfigureRuntime,$e as env,Et as registerBackend};
/*!
 * ONNX Runtime Web v1.21.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
