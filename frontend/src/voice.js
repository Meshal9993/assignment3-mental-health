// Native browser voice transport; dependency injection keeps checks offline.
export function createVoice({
  fetcher = (...args) => fetch(...args),
  media = globalThis.navigator?.mediaDevices,
  makePeer = () => new RTCPeerConnection(),
  makeAudio = () => new Audio(),
  makeStream = track => new MediaStream([track]),
  now = () => performance.now(),
  makeAttemptId = () => crypto.randomUUID(),
  beacon = (url) => globalThis.navigator?.sendBeacon?.(url) || false,
  closeWaitMs = 3000,
  changed = () => {},
} = {}) {
  let generation=0, resources=null, configRequest=null
  const state={phase:'checking',configured:false,duration:300,remaining:300,message:'Checking voice setup…',playBlocked:false,muted:false}
  const publish=values=>{Object.assign(state,values);changed({...state})}
  const isCurrent=r=>resources===r && r.generation===generation
  function stopCapture(r) {
    if(r.captureStopped)return
    r.captureStopped=true;r.stream?.getTracks().forEach(track=>track.stop())
  }
  function silence(r) {
    if(r.silenced)return
    r.silenced=true;r.audio?.pause()
  }
  function requestEnd(r,exiting=false) {
    if(!r?.requested||r.endRequested)return
    r.endRequested=true
    const url='/api/voice/attempts/'+r.attemptId+'/end'
    if(exiting&&beacon(url))return
    // Separate from setup's abort signal: cancellation must reach FastAPI even
    // after setup is aborted. It also catches sessions created after page exit.
    void fetcher(url,{method:'POST',keepalive:true,signal:AbortSignal.timeout(4500)})
      .then(async response=>{
        if(!response.ok)return
        const result=await response.json()
        if(result.status==='closed'&&isCurrent(r)&&r.ending){cleanup(r);publish({phase:'closed',message:'Closed · Microphone off.',playBlocked:false,muted:false})}
      }).catch(()=>{})
  }
  function cleanup(r) {
    if(!r || r.cleaned) return
    r.cleaned=true;r.abort.abort();clearTimeout(r.setupTimer);clearTimeout(r.closeTimer);clearInterval(r.timer)
    stopCapture(r);silence(r)
    if(r.peer) {r.peer.ontrack=null;r.peer.onconnectionstatechange=null;r.peer.onicegatheringstatechange=null}
    if(r.channel) {r.channel.onmessage=null;r.channel.onclose=null;r.channel.onerror=null;r.channel.close()}
    r.peer?.close()
    if(r.audio){r.audio.srcObject?.getTracks?.().forEach(track=>track.stop());r.audio.srcObject=null}
    if(resources===r) resources=null
  }
  function fail(r,message) {
    if(!isCurrent(r)) return
    requestEnd(r)
    cleanup(r);publish({phase:'error',message,playBlocked:false,muted:false})
  }
  async function check() {
    if(resources)return
    configRequest?.abort()
    const request=new AbortController();configRequest=request
    publish({phase:'checking',configured:false,message:'Checking voice setup…'})
    const timeout=setTimeout(()=>request.abort(),5000)
    try {
      const response=await fetcher('/api/voice/config',{signal:request.signal})
      if(!response.ok) throw new Error()
      const config=await response.json()
      if(configRequest!==request) return
      if(!['configured','unconfigured'].includes(config.status)||!Number.isInteger(config.duration_seconds)||config.duration_seconds<1||config.duration_seconds>300) throw new Error()
      const configured=config.status==='configured'
      publish({configured,duration:config.duration_seconds,remaining:config.duration_seconds,
        phase:configured?'idle':'unconfigured',message:configured?'Select Use microphone to start voice.':'Voice setup required. Add an API key and enable voice on the server, then check again.'})
    } catch {if(configRequest===request)publish({configured:false,phase:'error',message:'Could not check voice setup. Text chat is still available.'})}
    finally {clearTimeout(timeout);if(configRequest===request)configRequest=null}
  }
  function end() {
    const r=resources
    if(!r || r.ending) return
    r.ending=true
    // Privacy exit takes effect immediately, even while final usage is pending.
    stopCapture(r);silence(r)
    clearTimeout(r.setupTimer);clearInterval(r.timer);r.abort.abort()
    if(r.requested) {
      publish({phase:'closing',message:'Closing · Microphone off.',playBlocked:false,muted:false})
      r.closeTimer=setTimeout(()=>{if(isCurrent(r)){requestEnd(r);cleanup(r);publish({phase:'closed',message:'Closed · Final usage was not confirmed.'})}},closeWaitMs)
      if(r.channel?.readyState==='open'&&r.ready) {
        try {r.closeSent=true;r.channel.send(JSON.stringify({type:'session.close'}))}catch{requestEnd(r)}
      } else requestEnd(r)
    } else {++generation;cleanup(r);publish({phase:'closed',message:'Closed · Voice cancelled. Microphone off.',playBlocked:false,muted:false})}
  }
  async function start() {
    if(resources || !state.configured) return
    if(!media?.getUserMedia){publish({phase:'error',message:'Microphone access is unavailable in this browser. You can type instead.'});return}
    const r={generation:++generation,attemptId:makeAttemptId(),abort:new AbortController(),ready:false};resources=r
    publish({phase:'permission',message:'Permission · Waiting for microphone access…',playBlocked:false,muted:false})
    r.setupTimer=setTimeout(()=>fail(r,'Voice setup timed out. Microphone off. You can type instead.'),30000)
    try {
      const stream=await media.getUserMedia({audio:true,video:false})
      if(!isCurrent(r)){stream.getTracks().forEach(track=>track.stop());return}
      r.stream=stream;r.peer=makePeer();r.audio=makeAudio();r.audio.autoplay=true
      publish({phase:'connecting',message:'Connecting · Setting up voice…'})
      r.peer.ontrack=event=>{
        if(!isCurrent(r)||state.phase==='closing')return
        r.audio.srcObject=makeStream(event.track)
        r.audio.play().catch(()=>{if(isCurrent(r)&&state.phase!=='closing')publish({playBlocked:true})})
      }
      r.peer.onconnectionstatechange=()=>{
        if(isCurrent(r)&&['failed','disconnected','closed'].includes(r.peer.connectionState))fail(r,'Voice disconnected. Microphone off. Final usage is unconfirmed.')
      }
      stream.getTracks().forEach(track=>r.peer.addTrack(track,stream))
      r.channel=r.peer.createDataChannel('oai-events')
      r.channel.onmessage=({data})=>{
        if(!isCurrent(r))return
        let event;try{event=JSON.parse(data)}catch{return}
        if(!event||typeof event!=='object')return
        if(event.type==='session.started' && !r.ready && state.phase==='connecting') {
          r.ready=true;clearTimeout(r.setupTimer);r.started=now()
          publish({phase:'active',message:'Active · Microphone on.',muted:false})
        } else if(event.type==='session.closed') {
          cleanup(r);publish({phase:'closed',message:'Closed · Microphone off.',playBlocked:false,muted:false})
        }
      }
      r.channel.onclose=()=>fail(r,'Voice disconnected. Microphone off. Final usage is unconfirmed.')
      r.channel.onerror=()=>fail(r,'Voice connection failed. Microphone off.')
      await r.peer.setLocalDescription(await r.peer.createOffer())
      if(!isCurrent(r))return
      if(r.peer.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{
        r.abort.signal.addEventListener('abort',()=>reject(new Error()),{once:true})
        r.peer.onicegatheringstatechange=()=>{if(r.peer.iceGatheringState==='complete'){r.peer.onicegatheringstatechange=null;resolve()}}
        r.peer.onicegatheringstatechange()
      })
      if(!isCurrent(r))return
      r.requested=true
      const response=await fetcher('/api/voice/sessions',{method:'POST',headers:{'Content-Type':'application/json','X-Voice-Attempt-ID':r.attemptId},
        signal:r.abort.signal,body:JSON.stringify({sdp_offer:r.peer.localDescription.sdp})})
      if(!isCurrent(r)||r.ending){requestEnd(r);return}
      if(!response.ok)throw new Error()
      const session=await response.json()
      if(!isCurrent(r)||r.ending){requestEnd(r);return}
      if(typeof session.session_id!=='string'||!session.session_id||typeof session.sdp_answer!=='string'||!session.sdp_answer||!Number.isInteger(session.duration_seconds)||session.duration_seconds<1||session.duration_seconds>300)throw new Error()
      publish({duration:session.duration_seconds,remaining:session.duration_seconds})
      r.started=now()
      // Count from setup response, so delayed readiness cannot extend capture.
      r.deadline=r.started+session.duration_seconds*1000
      r.timer=setInterval(()=>{
        if(!isCurrent(r))return
        const remaining=Math.max(0,Math.ceil((r.deadline-now())/1000));publish({remaining})
        if(!remaining)end()
      },250)
      await r.peer.setRemoteDescription({type:'answer',sdp:session.sdp_answer})
    } catch(error) {
      if(r.ending){requestEnd(r);return}
      fail(r,error?.name==='NotAllowedError'?'Microphone permission was denied. You can type instead.':'Could not start voice. Microphone off. Check server setup or use text chat.')
    }
  }
  function dispose(reason='unmount') {
    configRequest?.abort();configRequest=null
    const r=resources
    if(r?.ready && !r.closeSent && r.channel?.readyState==='open')try{r.closeSent=true;r.channel.send(JSON.stringify({type:'session.close'}))}catch{}
    if(r){r.ending=true;stopCapture(r);silence(r);requestEnd(r,['page_exit','navigation'].includes(reason))}
    ++generation;cleanup(r)
    publish({phase:'closed',message:'Closed · Microphone off.',playBlocked:false,muted:false})
  }
  function mute() {
    const r=resources
    if(!r?.ready||!['active','muted'].includes(state.phase))return
    const muted=!state.muted
    r.stream.getTracks().forEach(track=>{track.enabled=!muted})
    publish({muted,phase:muted?'muted':'active',message:muted?'Muted · Assistant playback, session and billing continue.':'Active · Microphone on.'})
  }
  async function play() {
    const r=resources
    if(!r?.audio||state.phase==='closing')return
    try {await r.audio.play();if(isCurrent(r))publish({playBlocked:false})}
    catch {if(isCurrent(r)&&state.phase!=='closing')publish({playBlocked:true})}
  }
  function bindLifecycle({windowTarget=window,documentTarget=document}={}) {
    const hidden=()=>{if(documentTarget.hidden)dispose('hidden')}
    const exit=()=>dispose('page_exit'),navigate=()=>dispose('navigation')
    documentTarget.addEventListener('visibilitychange',hidden)
    windowTarget.addEventListener('pagehide',exit)
    windowTarget.addEventListener('beforeunload',exit)
    windowTarget.addEventListener('popstate',navigate)
    windowTarget.addEventListener('hashchange',navigate)
    windowTarget.navigation?.addEventListener('navigate',navigate)
    return ()=>{
      documentTarget.removeEventListener('visibilitychange',hidden)
      windowTarget.removeEventListener('pagehide',exit)
      windowTarget.removeEventListener('beforeunload',exit)
      windowTarget.removeEventListener('popstate',navigate)
      windowTarget.removeEventListener('hashchange',navigate)
      windowTarget.navigation?.removeEventListener('navigate',navigate)
      dispose('unmount')
    }
  }
  return {state,check,start,end,dispose,play,mute,bindLifecycle}
}
