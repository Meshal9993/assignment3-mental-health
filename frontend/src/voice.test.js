import test from 'node:test'
import assert from 'node:assert/strict'
import {createVoice} from './voice.js'

function fixture({configured=true,getMedia,closeWaitMs=3000}={}) {
  const calls=[], sent=[], order=[], constraints=[]
  let time=0, attempts=0
  let stopped=0, closed=0, paused=0
  const track={enabled:true,stop(){stopped++}},stream={getTracks:()=>[track]}
  const channel={readyState:'open',send:value=>sent.push(JSON.parse(value)),close(){this.readyState='closed'}}
  const peer={iceGatheringState:'complete',connectionState:'connected',localDescription:{sdp:'fictional offer'},
    addTrack(){order.push('addTrack')},createDataChannel:name=>{order.push('channel:'+name);return channel},createOffer:async()=>{order.push('offer');return {type:'offer',sdp:'fictional offer'}},
    setLocalDescription:async()=>{order.push('local')},setRemoteDescription:async value=>{order.push('remote:'+value.type)},close(){closed++}}
  const audio={play:async()=>{},pause(){paused++}}
  let handler=async path=>path.endsWith('/config')?
    {ok:true,json:async()=>({status:configured?'configured':'unconfigured',duration_seconds:300})}:
    {ok:true,json:async()=>({session_id:'live_fictional',sdp_answer:'fictional answer',duration_seconds:300})}
  const voice=createVoice({fetcher:async(path,options)=>{calls.push({path,options});order.push('request:'+path);return path.includes('/attempts/')?{ok:true,json:async()=>({status:'pending'})}:handler(path,options)},
    media:{getUserMedia:async value=>{constraints.push(value);return getMedia?getMedia(value):stream}},makePeer:()=>peer,makeAudio:()=>audio,makeStream:()=>({getTracks:()=>[]}),now:()=>time,closeWaitMs,beacon:()=>false,makeAttemptId:()=>`00000000-0000-4000-8000-${String(++attempts).padStart(12,'0')}`})
  return {voice,calls,channel,peer,audio,sent,stream,track,order,constraints,advance:value=>{time=value},counts:()=>({stopped,closed,paused}),handler:value=>{handler=value}}
}

test('unconfigured voice cannot open the microphone or create a session',async()=>{
  let microphones=0
  const f=fixture({configured:false,getMedia:async()=>{microphones++;throw new Error()}})
  await f.voice.check();await f.voice.start()
  assert.equal(f.voice.state.phase,'unconfigured');assert.equal(microphones,0);assert.equal(f.calls.length,1)
  f.voice.dispose()
})

test('permission denial preserves a usable error without a provider request',async()=>{
  const f=fixture({getMedia:async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'})}})
  await f.voice.check();await f.voice.start()
  assert.match(f.voice.state.message,/denied/);assert.equal(f.calls.length,1);f.voice.dispose()
})

test('late microphone permission after cancellation stops the returned tracks',async()=>{
  let accept
  const f=fixture({getMedia:()=>new Promise(resolve=>{accept=resolve})})
  await f.voice.check();const start=f.voice.start();f.voice.end();accept(f.stream);await start
  assert.equal(f.counts().stopped,1);assert.equal(f.calls.length,1);assert.equal(f.voice.state.phase,'closed')
  f.voice.dispose()
})

test('only SDP is posted and lifecycle events control readiness',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  assert.equal(f.voice.state.phase,'connecting')
  assert.deepEqual(JSON.parse(f.calls[1].options.body),{sdp_offer:'fictional offer'})
  f.channel.onmessage({data:JSON.stringify({type:'session.started'})})
  assert.equal(f.voice.state.phase,'active');assert.equal(f.voice.state.duration,300)
  f.voice.end();assert.equal(f.voice.state.phase,'closing');assert.ok(f.counts().stopped>=1)
  assert.deepEqual(f.sent,[{type:'session.close'}])
  f.channel.onmessage({data:JSON.stringify({type:'session.closed'})})
  assert.equal(f.voice.state.phase,'closed');assert.equal(f.counts().closed,1);f.voice.dispose()
})

test('provider setup failure closes resources and does not retry',async()=>{
  const f=fixture();await f.voice.check();f.handler(async()=>({ok:false}))
  await f.voice.start()
  assert.equal(f.voice.state.phase,'error');assert.equal(f.calls.filter(call=>call.path==='/api/voice/sessions').length,1)
  assert.equal(f.counts().stopped,1);assert.equal(f.counts().closed,1);f.voice.dispose()
})

test('dispose is idempotent and clears playback',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.voice.dispose();f.voice.dispose()
  assert.equal(f.counts().closed,1);assert.equal(f.counts().stopped,1);assert.equal(f.audio.srcObject,null)
})

test('stale session response after cancellation cannot reopen the peer',async()=>{
  let answer
  const f=fixture();await f.voice.check()
  f.handler(()=>new Promise(resolve=>{answer=resolve}))
  const start=f.voice.start()
  for(let i=0;i<8&&!answer;i++)await Promise.resolve()
  assert.ok(answer);f.voice.dispose()
  answer({ok:true,json:async()=>({session_id:'late',sdp_answer:'late',duration_seconds:300})})
  await start;assert.equal(f.voice.state.phase,'closed');assert.equal(f.counts().closed,1)
})

test('malformed session response closes capture',async()=>{
  const f=fixture();await f.voice.check()
  f.handler(async()=>({ok:true,json:async()=>({api_key:'not-a-session'})}))
  await f.voice.start();assert.equal(f.voice.state.phase,'error');assert.equal(f.counts().stopped,1)
  f.voice.dispose()
})

test('blocked playback exposes a manual play option',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.audio.play=async()=>{throw new Error()}
  f.peer.ontrack({track:{}});await Promise.resolve();await Promise.resolve()
  assert.equal(f.voice.state.playBlocked,true);f.voice.dispose()
})

test('duration limit stops capture and sends graceful close',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:JSON.stringify({type:'session.started'})})
  f.advance(300001)
  await new Promise(resolve=>setTimeout(resolve,280))
  assert.equal(f.voice.state.phase,'closing');assert.equal(f.voice.state.remaining,0)
  assert.ok(f.counts().stopped>=1);assert.deepEqual(f.sent,[{type:'session.close'}]);f.voice.dispose()
})

test('configuration discovery does not request permission; start shows permission',async()=>{
  let grant
  const f=fixture({getMedia:()=>new Promise(resolve=>{grant=resolve})})
  await f.voice.check();assert.equal(f.constraints.length,0)
  const start=f.voice.start()
  assert.equal(f.voice.state.phase,'permission')
  assert.deepEqual(f.constraints,[{audio:true,video:false}])
  f.voice.end();grant(f.stream);await start;assert.equal(f.voice.state.phase,'closed')
})

test('channel precedes offer, ICE completes before POST, answer does not mean Active',async()=>{
  const f=fixture();await f.voice.check();f.peer.iceGatheringState='gathering'
  const start=f.voice.start()
  for(let i=0;i<20&&!f.peer.onicegatheringstatechange;i++)await Promise.resolve()
  assert.equal(typeof f.peer.onicegatheringstatechange,'function')
  assert.equal(f.voice.state.phase,'connecting');assert.equal(f.calls.length,1)
  assert.deepEqual(f.order.slice(1),['addTrack','channel:oai-events','offer','local'])
  f.peer.localDescription.sdp='gathered fictional offer'
  f.peer.iceGatheringState='complete';f.peer.onicegatheringstatechange()
  await start
  assert.deepEqual(JSON.parse(f.calls[1].options.body),{sdp_offer:'gathered fictional offer'})
  assert.equal(f.order.at(-1),'remote:answer')
  assert.equal(f.voice.state.phase,'connecting')
  f.peer.onconnectionstatechange();assert.equal(f.voice.state.phase,'connecting')
  for(const value of ('null|{"type":"response.done"}|malformed').split('|'))f.channel.onmessage({data:value})
  assert.equal(f.voice.state.phase,'connecting')
  f.channel.onmessage({data:'{"type":"session.started"}'})
  assert.equal(f.voice.state.phase,'active');f.voice.dispose()
})

test('mute disables microphone tracks and unmute restores them only when active',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.voice.mute();assert.equal(f.track.enabled,true);assert.equal(f.voice.state.phase,'connecting')
  f.channel.onmessage({data:'{"type":"session.started"}'})
  f.voice.mute();assert.equal(f.voice.state.phase,'muted');assert.equal(f.track.enabled,false)
  assert.equal(f.counts().paused,0)
  assert.equal(f.counts().stopped,0);assert.equal(f.counts().closed,0)
  assert.deepEqual(f.sent,[]);assert.equal(f.calls.filter(call=>call.path.includes('/attempts/')).length,0)
  f.voice.mute();assert.equal(f.voice.state.phase,'active');assert.equal(f.track.enabled,true)
  f.voice.end();f.voice.mute();assert.equal(f.voice.state.phase,'closing');f.voice.dispose()
})

test('Enable assistant audio retries play and keeps the action after another rejection',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  let attempts=0
  f.audio.play=async()=>{attempts++;if(attempts<3)throw new Error('Autoplay blocked')}
  f.peer.ontrack({track:{}});await Promise.resolve();await Promise.resolve()
  assert.equal(f.voice.state.playBlocked,true)
  await f.voice.play();assert.equal(f.voice.state.playBlocked,true)
  await f.voice.play();assert.equal(f.voice.state.playBlocked,false)
  assert.equal(attempts,3);assert.equal(f.voice.state.phase,'active');f.voice.dispose()
})

test('remote SDP failure releases capture and remains retryable',async()=>{
  const f=fixture();await f.voice.check()
  f.peer.setRemoteDescription=async()=>{throw new Error('fictional SDP failure')}
  await f.voice.start()
  assert.equal(f.voice.state.phase,'error');assert.equal(f.counts().stopped,1)
  assert.equal(f.voice.state.configured,true);assert.equal(f.calls.filter(call=>call.path==='/api/voice/sessions').length,1);f.voice.dispose()
})

test('connection failure after mute closes resources without retry',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  f.voice.mute();f.peer.connectionState='failed';f.peer.onconnectionstatechange()
  assert.equal(f.voice.state.phase,'error');assert.equal(f.voice.state.muted,false)
  assert.equal(f.counts().closed,1);assert.equal(f.calls.filter(call=>call.path==='/api/voice/sessions').length,1);f.voice.dispose()
})

test('configuration refresh cannot overwrite an active session',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  await f.voice.check();assert.equal(f.voice.state.phase,'active');assert.equal(f.calls.length,2)
  f.voice.end();f.voice.end();f.voice.dispose()
  assert.deepEqual(f.sent,[{type:'session.close'}])
})

test('duplicate Start creates only one permission request and one provider attempt',async()=>{
  let grant
  const f=fixture({getMedia:()=>new Promise(resolve=>{grant=resolve})})
  await f.voice.check();const first=f.voice.start();await f.voice.start()
  assert.equal(f.constraints.length,1);grant(f.stream);await first
  await f.voice.start();assert.equal(f.calls.filter(call=>call.path==='/api/voice/sessions').length,1)
  f.voice.dispose()
})

test('repeated End stops tracks immediately, sends one close, and tears down once',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  f.voice.end();f.voice.end()
  assert.equal(f.counts().stopped,1);assert.equal(f.counts().paused,1);assert.equal(f.counts().closed,0)
  assert.deepEqual(f.sent,[{type:'session.close'}])
  f.channel.onmessage({data:'{"type":"session.closed"}'})
  f.voice.end();assert.equal(f.counts().closed,1);assert.equal(f.counts().stopped,1)
  f.voice.dispose()
})

test('End deadline releases transports and requests server closure if no final event arrives',async()=>{
  const f=fixture({closeWaitMs:5});await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  f.voice.end();await new Promise(resolve=>setTimeout(resolve,15))
  assert.equal(f.voice.state.phase,'closed');assert.equal(f.counts().closed,1)
  assert.equal(f.calls.filter(call=>call.path.includes('/attempts/')).length,1)
  assert.equal(f.audio.srcObject,null);f.voice.dispose()
})

test('late SDP after End is cancelled server-side without applying its answer or restoring Active',async()=>{
  let release
  const f=fixture({closeWaitMs:5});await f.voice.check()
  f.handler(()=>new Promise(resolve=>{release=resolve}))
  const pending=f.voice.start()
  for(let i=0;i<20&&!release;i++)await Promise.resolve()
  assert.ok(release);f.voice.end();f.voice.end()
  await new Promise(resolve=>setTimeout(resolve,15))
  release({ok:true,json:async()=>({session_id:'late_session',sdp_answer:'late_answer',duration_seconds:300})})
  await pending
  assert.equal(f.voice.state.phase,'closed')
  assert.equal(f.order.includes('remote:answer'),false)
  const create=f.calls.find(call=>call.path==='/api/voice/sessions')
  const ending=f.calls.filter(call=>call.path.includes('/attempts/'))
  assert.equal(ending.length,1);assert.ok(ending[0].path.includes(create.options.headers['X-Voice-Attempt-ID']))
  f.voice.dispose()
})

test('a new conversation uses a fresh attempt and fresh setup, without history payloads',async()=>{
  const f=fixture();await f.voice.check();await f.voice.start()
  f.channel.onmessage({data:'{"type":"session.started"}'})
  f.voice.end();f.channel.onmessage({data:'{"type":"session.closed"}'})
  await f.voice.start()
  const requests=f.calls.filter(call=>call.path==='/api/voice/sessions')
  assert.equal(requests.length,2)
  assert.notEqual(requests[0].options.headers['X-Voice-Attempt-ID'],requests[1].options.headers['X-Voice-Attempt-ID'])
  for(const request of requests)assert.deepEqual(Object.keys(JSON.parse(request.options.body)),['sdp_offer'])
  f.voice.dispose()
})

test('late SDP and close acknowledgement from an ended conversation cannot affect fresh resources',async t=>{
  const tracks=[],streams=[],peers=[],channels=[],audios=[],requests=[]
  let offerResult,closeResult,attempt=0
  const voice=createVoice({
    media:{getUserMedia:async()=>{
      const track={enabled:true,stopped:0,stop(){this.stopped++}}
      const stream={getTracks:()=>[track]};tracks.push(track);streams.push(stream);return stream
    }},
    makePeer:()=>{
      const channel={readyState:'open',close(){this.readyState='closed'},send(){}}
      const peer={iceGatheringState:'complete',connectionState:'connected',closed:false,answers:[],
        addTrack(){},createDataChannel:()=>channel,createOffer:async()=>({type:'offer',sdp:'fictional offer'}),
        async setLocalDescription(value){this.localDescription=value},
        async setRemoteDescription(value){this.answers.push(value)},close(){this.closed=true}}
      channels.push(channel);peers.push(peer);return peer
    },
    makeAudio:()=>{const audio={pause(){},play:async()=>{}};audios.push(audio);return audio},
    makeAttemptId:()=>`00000000-0000-4000-8000-${String(++attempt).padStart(12,'0')}`,
    closeWaitMs:5,
    fetcher:async(path,options)=>{
      if(path.endsWith('/config'))return {ok:true,json:async()=>({status:'configured',duration_seconds:300})}
      if(path.includes('/attempts/'))return new Promise(resolve=>{closeResult=resolve})
      requests.push(options)
      if(requests.length===1)return new Promise(resolve=>{offerResult=resolve})
      return {ok:true,json:async()=>({session_id:'fresh_session',sdp_answer:'fresh_answer',duration_seconds:300})}
    },
  })
  t.after(()=>voice.dispose())
  await voice.check();const oldStart=voice.start()
  for(let i=0;i<20&&!offerResult;i++)await Promise.resolve()
  assert.ok(offerResult)
  voice.end();assert.equal(tracks[0].stopped,1)
  await new Promise(resolve=>setTimeout(resolve,15))
  assert.equal(voice.state.phase,'closed');assert.equal(peers[0].closed,true)
  await voice.start();channels[1].onmessage({data:'{"type":"session.started"}'})
  assert.equal(voice.state.phase,'active')
  for(const allocated of [tracks,streams,peers,channels,audios])assert.notEqual(allocated[0],allocated[1])
  assert.notEqual(requests[0].headers['X-Voice-Attempt-ID'],requests[1].headers['X-Voice-Attempt-ID'])
  for(const request of requests)assert.deepEqual(Object.keys(JSON.parse(request.body)),['sdp_offer'])
  offerResult({ok:true,json:async()=>({session_id:'late_session',sdp_answer:'stale_answer',duration_seconds:1})})
  await oldStart
  assert.equal(peers[0].answers.length,0)
  assert.deepEqual(peers[1].answers,[{type:'answer',sdp:'fresh_answer'}])
  assert.ok(closeResult)
  closeResult({ok:true,json:async()=>({status:'closed'})})
  for(let i=0;i<10;i++)await Promise.resolve()
  assert.equal(voice.state.phase,'active');assert.equal(voice.state.duration,300)
  assert.equal(tracks[1].stopped,0);assert.equal(peers[1].closed,false)
})

for(const event of ['pagehide','beforeunload','popstate','hashchange','navigate','hidden','unmount']) {
  test(`cleanup on ${event} stops capture, playback and transports`,async()=>{
    const f=fixture();await f.voice.check();await f.voice.start()
    f.channel.onmessage({data:'{"type":"session.started"}'})
    const windowTarget=new EventTarget(),documentTarget=new EventTarget()
    windowTarget.navigation=new EventTarget();documentTarget.hidden=false
    const unmount=f.voice.bindLifecycle({windowTarget,documentTarget})
    if(event==='unmount')unmount()
    else if(event==='hidden'){documentTarget.hidden=true;documentTarget.dispatchEvent(new Event('visibilitychange'))}
    else if(event==='navigate')windowTarget.navigation.dispatchEvent(new Event('navigate'))
    else windowTarget.dispatchEvent(new Event(event))
    assert.equal(f.voice.state.phase,'closed');assert.equal(f.counts().stopped,1)
    assert.equal(f.counts().closed,1);assert.equal(f.audio.srcObject,null)
    assert.equal(f.calls.filter(call=>call.path.includes('/attempts/')).length,1)
    unmount();assert.equal(f.counts().closed,1)
  })
}

for(const reason of ['crisis_support','exercise_start','chat_collapse']) {
  test(`${reason} disposes voice without blocking the independent action`,async()=>{
    const f=fixture();await f.voice.check();await f.voice.start()
    f.channel.onmessage({data:'{"type":"session.started"}'})
    let continued=false;f.voice.dispose(reason);continued=true
    assert.equal(continued,true);assert.equal(f.voice.state.phase,'closed')
    assert.equal(f.counts().closed,1);assert.equal(f.counts().stopped,1)
    f.voice.dispose()
  })
}
