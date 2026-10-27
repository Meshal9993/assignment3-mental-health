// Optional browser checks against the production build. All APIs/media are fake.
// Uses an existing Playwright installation; never installs or starts a provider.
import {after,before,test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve,sep,extname} from 'node:path'

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'playwright')
const dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)))
let server,browser,origin

before(async()=>{
  server=createServer(async(request,response)=>{
    try{
      const pathname=new URL(request.url,'http://localhost').pathname
      const file=resolve(dist,decodeURIComponent(pathname).replace(/^\//,'')||'index.html')
      if(!file.startsWith(dist+sep)&&file!==resolve(dist,'index.html'))throw new Error()
      const body=await readFile(file)
      response.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'})
      response.end(body)
    }catch{response.writeHead(404);response.end()}
  })
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',accept)})
  origin=`http://127.0.0.1:${server.address().port}`
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH})
})
after(async()=>{
  await browser?.close()
  if(server)await new Promise(accept=>server.close(accept))
})

async function setup(t,{configured=true,denied=false,providerFailure=false}={}){
  const context=await browser.newContext({serviceWorkers:'block'})
  t.after(()=>context.close())
  const calls=[],messages=[],pageErrors=[]
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin!==origin)return route.abort()
    if(!url.pathname.startsWith('/api/'))return route.continue()
    calls.push({path:url.pathname,method:request.method()})
    const send=(json,status=200)=>route.fulfill({status,json})
    if(url.pathname==='/api/health')return send({status:'ok',model_mode:'mock',live_calls:{used:0,limit:50}})
    if(url.pathname==='/api/conversations'&&request.method()==='POST')return send({id:'fictional-ui'})
    if(url.pathname==='/api/conversations/fictional-ui')return send({sessions:[],messages,reduced_motion:null})
    if(url.pathname==='/api/voice/config')return send({status:configured?'configured':'unconfigured',duration_seconds:45})
    if(url.pathname==='/api/voice/sessions')return providerFailure?
      send({detail:'Voice provider request failed.'},502):send({session_id:'live_fictional_ui',sdp_answer:'fictional answer',duration_seconds:45},201)
    if(/^\/api\/voice\/attempts\/[^/]+\/end$/.test(url.pathname))return send({status:'closed'})
    if(url.pathname==='/api/chat'){
      const content=request.postDataJSON().content
      messages.push({id:'fictional-user',role:'user',content,status:'succeeded',source:'user'},
        {id:'fictional-assistant',role:'assistant',content:'Stop ends the exercise immediately.',status:'succeeded',source:'mock'})
      return send({...messages.at(-1),support_recommended:false})
    }
    return send({detail:'Unexpected mocked API route'},500)
  })
  await context.addInitScript(({denied})=>{
    const mock={constraints:[],tracks:[],remoteTracks:[],peers:[],channels:[],audios:[],events:[]}
    window.__voiceMock=mock
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{async getUserMedia(constraints){
      mock.constraints.push(constraints)
      if(denied)throw new DOMException('Fictional permission denial','NotAllowedError')
      const track={enabled:true,stopped:false,stop(){this.stopped=true}}
      mock.tracks.push(track);return {getTracks:()=>[track]}
    }}})
    window.MediaStream=class{constructor(tracks){this.tracks=tracks}getTracks(){return this.tracks}}
    window.Audio=class{
      constructor(){this.pauses=0;this.plays=0;mock.audios.push(this)}
      async play(){this.plays++}pause(){this.pauses++}
    }
    window.RTCPeerConnection=class{
      constructor(){this.iceGatheringState='complete';this.connectionState='connected';this.closed=false;mock.peers.push(this)}
      addTrack(){}
      createDataChannel(name){
        const channel={name,readyState:'open',send(value){
          const event=JSON.parse(value);mock.events.push(event)
          if(event.type==='session.close')queueMicrotask(()=>this.onmessage?.({data:'{"type":"session.closed"}'}))
        },close(){this.readyState='closed'}}
        this.channel=channel;mock.channels.push(channel);return channel
      }
      async createOffer(){return {type:'offer',sdp:'fictional offer'}}
      async setLocalDescription(value){this.localDescription=value}
      async setRemoteDescription(value){
        this.answer=value
        const track={stopped:false,stop(){this.stopped=true}};mock.remoteTracks.push(track)
        this.ontrack?.({track})
      }
      close(){this.closed=true}
    }
    mock.ready=()=>mock.channels.at(-1).onmessage({data:'{"type":"session.started"}'})
    mock.snapshot=()=>({constraints:mock.constraints,microphones:mock.tracks.map(t=>({enabled:t.enabled,stopped:t.stopped})),
      peers:mock.peers.map(p=>({closed:p.closed,answer:p.answer})),channels:mock.channels.map(c=>({name:c.name,state:c.readyState})),
      audios:mock.audios.map(a=>({pauses:a.pauses,plays:a.plays,detached:a.srcObject===null})),events:mock.events,
      remoteStopped:mock.remoteTracks.every(t=>t.stopped)})
  },{denied})
  const page=await context.newPage()
  page.on('pageerror',error=>pageErrors.push(error.message))
  await page.goto(origin+'/#voice')
  await page.waitForFunction(()=>document.querySelector('.start')?.disabled===false)
  await page.waitForFunction(()=>!document.querySelector('.voice-status')?.textContent.includes('Checking'))
  t.after(()=>assert.deepEqual(pageErrors,[]))
  return {page,calls,messages,snapshot:()=>page.evaluate(()=>window.__voiceMock.snapshot())}
}

async function start(f){
  await f.page.getByRole('checkbox',{name:/I agree to send fictional microphone audio/}).check()
  await f.page.getByRole('button',{name:/Use microphone/}).click()
}
async function active(f){
  await start(f)
  await f.page.waitForFunction(()=>!!window.__voiceMock.peers[0]?.answer)
  await f.page.evaluate(()=>window.__voiceMock.ready())
  await f.page.waitForFunction(()=>document.querySelector('.voice-status').textContent.includes('Active'))
}
async function textReply(f){
  await f.page.getByLabel('Question about this app').fill('Fictional demo: How does Stop work?')
  assert.equal(await f.page.getByRole('button',{name:'Send',exact:true}).isEnabled(),true)
  await f.page.getByRole('button',{name:'Send',exact:true}).click()
  await f.page.getByText('Stop ends the exercise immediately.',{exact:true}).waitFor()
  assert.equal(f.calls.filter(c=>c.path==='/api/chat').length,1)
}

test('missing voice configuration leaves microphone untouched and text chat usable',async t=>{
  const f=await setup(t,{configured:false})
  assert.equal(await f.page.getByRole('button',{name:/Use microphone/}).isDisabled(),true)
  assert.deepEqual((await f.snapshot()).constraints,[])
  await textReply(f)
})
test('microphone denial leaves text chat usable without a session request',async t=>{
  const f=await setup(t,{denied:true});await start(f)
  await f.page.getByText('Microphone permission was denied. You can type instead.',{exact:true}).waitFor()
  assert.equal(f.calls.filter(c=>c.path==='/api/voice/sessions').length,0)
  await textReply(f)
})
test('offer and answer apply before session.started changes the interface to Active',async t=>{
  const f=await setup(t);await start(f)
  await f.page.waitForFunction(()=>!!window.__voiceMock.peers[0]?.answer)
  assert.match(await f.page.locator('.voice-status').innerText(),/^Connecting/)
  let snapshot=await f.snapshot()
  assert.deepEqual(snapshot.constraints,[{audio:true,video:false}])
  assert.deepEqual(snapshot.peers[0].answer,{type:'answer',sdp:'fictional answer'})
  assert.equal(snapshot.channels[0].name,'oai-events')
  await f.page.evaluate(()=>window.__voiceMock.ready())
  await f.page.waitForFunction(()=>document.querySelector('.voice-status').textContent.includes('Active'))
})
test('Mute and Unmute preserve playback and the session; End releases microphone and transports',async t=>{
  const f=await setup(t);await active(f)
  await f.page.getByRole('button',{name:'Mute microphone',exact:true}).click()
  let snapshot=await f.snapshot()
  assert.deepEqual(snapshot.microphones,[{enabled:false,stopped:false}])
  assert.equal(snapshot.audios[0].pauses,0);assert.deepEqual(snapshot.events,[])
  assert.equal(snapshot.peers[0].closed,false)
  await f.page.getByRole('button',{name:'Unmute microphone',exact:true}).click()
  assert.equal((await f.snapshot()).microphones[0].enabled,true)
  await f.page.getByRole('button',{name:'End voice',exact:true}).click()
  await f.page.waitForFunction(()=>document.querySelector('.voice-status').textContent.includes('Closed'))
  snapshot=await f.snapshot()
  assert.equal(snapshot.microphones[0].stopped,true);assert.equal(snapshot.peers[0].closed,true)
  assert.equal(snapshot.channels[0].state,'closed');assert.equal(snapshot.audios[0].detached,true)
  assert.equal(snapshot.remoteStopped,true);assert.deepEqual(snapshot.events,[{type:'session.close'}])
})
test('provider setup failure releases capture and a subsequent text message gets a reply',async t=>{
  const f=await setup(t,{providerFailure:true});await start(f)
  await f.page.getByText('Could not start voice. Microphone off. Check server setup or use text chat.',{exact:true}).waitFor()
  const snapshot=await f.snapshot()
  assert.equal(snapshot.microphones[0].stopped,true);assert.equal(snapshot.peers[0].closed,true)
  assert.equal(f.calls.filter(c=>c.path==='/api/voice/sessions').length,1)
  await textReply(f)
})
test('independent support opens after provider failure',async t=>{
  const f=await setup(t,{providerFailure:true});await start(f)
  await f.page.getByText('Could not start voice. Microphone off. Check server setup or use text chat.',{exact:true}).waitFor()
  await f.page.getByRole('button',{name:'Crisis / Support',exact:true}).click()
  assert.equal(await f.page.getByRole('dialog').isVisible(),true)
  assert.equal((await f.snapshot()).microphones[0].stopped,true)
})
