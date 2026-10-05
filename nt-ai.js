/* NeuroTriage AI add-on: (1) Saathi text hybrid (2) Mental Health Trainer voice call. No API key here. */
(function(){
var API=(window.NT_API_BASE||"")+"/api", H=[], CR=/suicid|khudkushi|jaan de|marna chahta|marna chahti|mar jana|self.?harm|khud ko (hurt|nuksan)|end my life|kill myself/i;
var CRISIS="Aap akele nahi hain. Abhi Tele-MANAS 14416 ya emergency 112 par call karein, aur kisi bharosemand insaan ko apne paas bulayein.";
/* ---------- Saathi text ---------- */
function bub(c,t){var m=document.getElementById("ntasM");if(!m)return;var d=document.createElement("div");d.className="asb "+c;d.textContent=t;m.appendChild(d);m.scrollTop=m.scrollHeight}
document.addEventListener("submit",async function(e){
  var f=e.target;if(!f||f.id!=="ntasF")return;
  var i=document.getElementById("ntasI"),q=(i.value||"").trim();if(!q)return;
  e.preventDefault();e.stopImmediatePropagation();i.value="";bub("u",q);
  if(CR.test(q)){bub("b",CRISIS);return}
  for(var k=0;k<(window.NT_FAQ||[]).length;k++){if(NT_FAQ[k][0].test(q)){bub("b",NT_FAQ[k][1]);return}}
  var w=document.createElement("div");w.className="asb b";w.textContent="...";document.getElementById("ntasM").appendChild(w);
  try{
    var r=await fetch(API+"/saathi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q:q,history:H})});
    var j=await r.json();if(!r.ok||!j.text)throw 0;
    w.remove();bub("b",j.text);H.push({r:"u",t:q},{r:"b",t:j.text});
  }catch(x){w.remove();i.value=q;f.onsubmit&&f.onsubmit({preventDefault:function(){}})} /* offline fallback: old Saathi */
},true);
new MutationObserver(function(){var f=document.getElementById("ntasF");if(f&&f.classList.contains("off"))f.classList.remove("off")}).observe(document.body,{subtree:true,attributes:true,childList:true});
/* ---------- Trainer voice call ---------- */
var ws,mic,ctx,pctx,node,nextT=0,srcs=[],muted=false,tmr,sec=0,ui;
function css(){var s=document.createElement("style");s.textContent="#ntt{position:fixed;left:12px;bottom:84px;z-index:9998;border:0;border-radius:24px;padding:10px 14px;background:#0f766e;color:#fff;font:600 13px system-ui}#ntcall{position:fixed;inset:0;z-index:9999;background:#0b1220;color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:system-ui}#ntcall .av{width:110px;height:110px;border-radius:50%;background:#134e4a;display:flex;align-items:center;justify-content:center;font-size:48px}#ntcall .av.on{animation:ntp 1.4s infinite}@keyframes ntp{50%{box-shadow:0 0 0 22px #5eead433}}#ntcall .r{display:flex;gap:18px}#ntcall button{border:0;border-radius:50%;width:64px;height:64px;font-size:24px;color:#fff;background:#334155}#ntcall .e{background:#dc2626}#ntcall .s{background:#16a34a;width:auto;border-radius:30px;padding:0 26px;font-size:16px}#ntcall small{opacity:.7;max-width:80%;text-align:center}";document.head.appendChild(css=s)}
function build(){css();var b=document.createElement("button");b.id="ntt";b.textContent="📞 Mental Health Trainer";document.body.appendChild(b);
ui=document.createElement("div");ui.id="ntcall";ui.innerHTML='<div class="av" id="ntav">🧠</div><b>Mental Health Trainer</b><div id="ntst">Ready</div><small>AI education assistant. Doctor ya licensed psychologist nahi. Emergency: 112 · Tele-MANAS 14416</small><div class="r"><button class="s" id="ntgo">Start Call</button><button id="ntmu" style="display:none">🎤</button><button class="e" id="ntend">✕</button></div>';document.body.appendChild(ui);
b.onclick=function(){ui.style.display="flex"};document.getElementById("ntgo").onclick=start;document.getElementById("ntmu").onclick=function(){muted=!muted;this.textContent=muted?"🔇":"🎤";this.style.background=muted?"#b45309":"#334155"};document.getElementById("ntend").onclick=function(){stop();ui.style.display="none"}}
function st(t){document.getElementById("ntst").textContent=t}
function b64(buf){var a=new Uint8Array(buf),s="";for(var i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)}
async function start(){
  try{
    st("Microphone permission...");
    mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    st("Connecting...");
    var r=await fetch(API+"/token",{method:"POST"}),j=await r.json();if(!r.ok||!j.token)throw new Error(j.error||"token");
    ws=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token="+encodeURIComponent(j.token));
    ws.onopen=function(){ws.send(JSON.stringify({setup:{model:"models/"+j.model,generationConfig:{responseModalities:["AUDIO"]},systemInstruction:{parts:[{text:j.system}]}}}))};
    ws.onmessage=async function(ev){var d=ev.data;if(d instanceof Blob)d=await d.text();var m=JSON.parse(d);
      if(m.setupComplete){live();ws.send(JSON.stringify({realtimeInput:{text:"Hello, please greet me briefly."}}))}
      var c=m.serverContent;if(!c)return;
      if(c.interrupted){srcs.forEach(function(s){try{s.stop()}catch(e){}});srcs=[];nextT=0}
      ((c.modelTurn||{}).parts||[]).forEach(function(p){if(p.inlineData)play(p.inlineData.data)})};
    ws.onerror=function(){st("Connection error")};ws.onclose=function(e){if(ctx)st("Call ended"+(e.reason?": "+e.reason:""));stop(true)};
  }catch(e){st(e&&e.name==="NotAllowedError"?"Mic permission blocked. Chrome me lock icon > Microphone > Allow":"Error: "+(e.message||e));cleanup()}
}
async function live(){
  ctx=new AudioContext({sampleRate:16000});pctx=new AudioContext({sampleRate:24000});
  var code="class P extends AudioWorkletProcessor{process(i){var c=i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('p',P)";
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code],{type:"application/javascript"})));
  node=new AudioWorkletNode(ctx,"p");ctx.createMediaStreamSource(mic).connect(node);
  node.port.onmessage=function(e){if(muted||!ws||ws.readyState!==1)return;var f=e.data,p=new Int16Array(f.length);for(var i=0;i<f.length;i++){var v=Math.max(-1,Math.min(1,f[i]));p[i]=v<0?v*32768:v*32767}
    ws.send(JSON.stringify({realtimeInput:{audio:{data:b64(p.buffer),mimeType:"audio/pcm;rate=16000"}}}))};
  document.getElementById("ntgo").style.display="none";document.getElementById("ntmu").style.display="";document.getElementById("ntav").classList.add("on");
  sec=0;tmr=setInterval(function(){sec++;st("In call "+Math.floor(sec/60)+":"+("0"+sec%60).slice(-2))},1000);
}
function play(b){var s=atob(b),n=s.length/2,a=new Float32Array(n);for(var i=0;i<n;i++){var v=s.charCodeAt(2*i)|(s.charCodeAt(2*i+1)<<8);if(v>32767)v-=65536;a[i]=v/32768}
  var buf=pctx.createBuffer(1,n,24000);buf.copyToChannel(a,0);var src=pctx.createBufferSource();src.buffer=buf;src.connect(pctx.destination);
  nextT=Math.max(nextT,pctx.currentTime+.05);src.start(nextT);nextT+=buf.duration;srcs.push(src);src.onended=function(){srcs=srcs.filter(function(x){return x!==src})}}
function cleanup(){try{mic&&mic.getTracks().forEach(function(t){t.stop()})}catch(e){}mic=null}
function stop(q){clearInterval(tmr);try{ws&&ws.close()}catch(e){}ws=null;cleanup();try{node&&node.disconnect()}catch(e){}[ctx,pctx].forEach(function(c){try{c&&c.close()}catch(e){}});ctx=pctx=null;srcs=[];nextT=0;
  if(ui){document.getElementById("ntgo").style.display="";document.getElementById("ntmu").style.display="none";document.getElementById("ntav").classList.remove("on");if(!q)st("Ready")}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();
})();
