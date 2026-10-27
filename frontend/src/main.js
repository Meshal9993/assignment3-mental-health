import { createApp, ref, computed, onMounted, onBeforeUnmount } from 'vue/dist/vue.esm-bundler.js'
import { createVoice } from './voice.js'
import './style.css'

createApp({
  setup() {
    const screen=ref('entry'), ready=ref(false), starting=ref(false), saving=ref(false)
    const cid=ref(''), mode=ref('mock'), error=ref(''), notice=ref(''), elapsed=ref(0)
    const sessions=ref([]), messages=ref([]), question=ref(''), sending=ref(false)
    const failNext=ref(false), reduced=ref(matchMedia('(prefers-reduced-motion: reduce)').matches)
    const support=ref(null), last=ref(null), sessionId=ref(null), pending=ref(null)
    const voiceState=ref({phase:'checking',configured:false,duration:300,remaining:300,message:'Checking voice setup…'}),voiceConsent=ref(false)
    const voice=createVoice({changed:value=>{voiceState.value=value}})
    let releaseVoiceLifecycle=()=>voice.dispose('unmount')
    const voiceActive=computed(()=>['permission','connecting','active','muted','closing'].includes(voiceState.value.phase))
    const voiceLabel=computed(()=>({checking:'Checking setup',unconfigured:'Setup required',idle:'Ready',permission:'Permission',connecting:'Connecting',active:'Active',muted:'Muted',closing:'Closing',closed:'Closed',error:'Error'}[voiceState.value.phase]||'Voice'))
    let started=0, lastTick=0, timer=null
    const phase=computed(()=>elapsed.value % 10000 < 4000 ? 'Inhale' : 'Exhale')
    const cycle=computed(()=>Math.min(6,Math.floor(elapsed.value/10000)+1))
    const countdown=computed(()=>Math.ceil(((phase.value==='Inhale'?4000:10000)-elapsed.value%10000)/1000))
    async function api(path, data, method) {
      const response=await fetch('/api'+path, {method:method || (data?'POST':'GET'),headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)})
      if(!response.ok) throw new Error('Request failed ('+response.status+').')
      return response.json()
    }
    async function refresh() {
      const history=await api('/conversations/'+cid.value)
      sessions.value=history.sessions; messages.value=history.messages
      if(history.reduced_motion!==null) reduced.value=history.reduced_motion
      return history
    }
    function savePending(value) {
      pending.value=value
      try { value ? localStorage.setItem('breathing.pending',JSON.stringify(value)) : localStorage.removeItem('breathing.pending') } catch {}
    }
    async function retrySave() {
      if(!pending.value || saving.value) return
      saving.value=true; error.value=''
      try {
        const item=pending.value
        const result=await api('/sessions/'+item.id+'/finish',item.body)
        last.value=result; savePending(null); notice.value='Session saved.'; await refresh()
      } catch { error.value=pending.value?'The exercise has ended, but its record is not saved yet. Keep this page and choose Retry save when the server returns.':'Session saved, but history could not be refreshed.' }
      finally { saving.value=false }
    }
    function stop(status='stopped',reason='stop',beacon=false) {
      if(!sessionId.value) return
      clearInterval(timer)
      elapsed.value=Math.max(0,Math.round(performance.now()-started))
      const item={id:sessionId.value,body:{status,reason,client_duration_ms:elapsed.value}}
      sessionId.value=null; screen.value='finish'; error.value=''
      last.value={status,duration_ms:elapsed.value,reason}
      savePending(item)
      if(beacon) navigator.sendBeacon('/api/sessions/'+item.id+'/finish', new Blob([JSON.stringify(item.body)],{type:'application/json'}))
      else retrySave()
    }
    async function start() {
      if(starting.value || sessionId.value || pending.value) return
      voice.dispose('exercise_start')
      starting.value=true; error.value=''; notice.value=''
      try {
        const result=await api('/sessions',{conversation_id:cid.value})
        sessionId.value=result.id; elapsed.value=0; started=performance.now(); lastTick=started
        screen.value='exercise'
        timer=setInterval(()=>{
          const current=performance.now()
          if(current-lastTick>2000){stop('interrupted','timing_gap');return}
          lastTick=current; elapsed.value=current-started
          if(elapsed.value>=60000) stop('completed','finished')
        },50)
      } catch { error.value='Could not start a saved session. Check the server, then choose Reconnect.'; ready.value=false }
      finally { starting.value=false }
    }
    function openSupport(){voice.dispose('crisis_support');support.value.showModal()}
    function startVoice(){if(voiceConsent.value&&!voiceActive.value&&!sending.value&&screen.value!=='exercise')voice.start()}
    function voicePanelToggle(event){if(!event.target.open)voice.dispose('chat_collapse')}
    async function send() {
      if(!question.value.trim() || sending.value) return
      sending.value=true; error.value=''
      try {
        const result=await api('/chat',{conversation_id:cid.value,content:question.value,simulate_failure:failNext.value})
        question.value='';failNext.value=false;await refresh()
        if(result.support_recommended) openSupport()
      } catch { error.value='Could not reach the server. This question may not have been saved. Your exercise and Crisis / Support remain available.' }
      finally { sending.value=false }
    }
    async function preference() {
      try { await api('/conversations/'+cid.value+'/preferences',{reduced_motion:reduced.value},'PUT'); notice.value='Motion preference saved for this browser conversation.' }
      catch { error.value='Motion preference applies now, but could not be saved.' }
    }
    async function initialize() {
      error.value=''
      try {
        const health=await api('/health');mode.value=health.model_mode
        cid.value=localStorage.getItem('breathing.conversation')||''
        if(cid.value) {
          const response=await fetch('/api/conversations/'+cid.value)
          if(response.status===404) cid.value=''
          else if(!response.ok) throw new Error('History unavailable')
        }
        if(!cid.value) {cid.value=(await api('/conversations',{})).id;localStorage.setItem('breathing.conversation',cid.value)}
        const history=await refresh()
        try {pending.value=JSON.parse(localStorage.getItem('breathing.pending')||'null')}catch{}
        if(pending.value) await retrySave()
        // Abrupt browser termination may deliver no beacon. Reconcile on return.
        for(const item of history.sessions.filter(item=>item.status==='active')) {
          await api('/sessions/'+item.id+'/finish',{status:'interrupted',reason:'recovery',client_duration_ms:0})
          notice.value='An unfinished session was marked interrupted.'
        }
        await refresh();ready.value=true
      } catch {error.value='The server is unavailable. Crisis / Support still works. Start the backend, then choose Reconnect.';ready.value=false}
    }
    function pageHidden(){if(document.hidden)stop('interrupted','page_hidden',true)}
    function pageLeft(){stop('interrupted','page_leave',true)}
    onMounted(()=>{
      initialize()
      voice.check()
      releaseVoiceLifecycle=voice.bindLifecycle()
      document.addEventListener('visibilitychange',pageHidden)
      window.addEventListener('pagehide',pageLeft)
    })
    onBeforeUnmount(()=>{document.removeEventListener('visibilitychange',pageHidden);window.removeEventListener('pagehide',pageLeft);releaseVoiceLifecycle();clearInterval(timer)})
    return {screen,ready,starting,saving,mode,error,notice,elapsed,sessions,messages,question,sending,failNext,reduced,support,last,pending,phase,cycle,countdown,start,stop,send,preference,initialize,retrySave,openSupport,voice,voiceState,voiceConsent,voiceActive,voiceLabel,startVoice,voicePanelToggle,
      seconds:ms=>(ms/1000).toFixed(2),date:value=>new Date(value).toLocaleString()}
  },
  template:`
  <header class="site-header"><span>IST 402 · Assignment 3.2</span><span class="badge">Coursework prototype</span></header>
  <main>
    <section class="exercise-card" aria-labelledby="title" :class="{'no-motion':reduced}">
      <h1 id="title">Paced Breathing</h1>
      <div class="stage" v-if="screen==='entry'">
        <p>Six breaths, about one minute.</p>
        <button class="primary start" @click="start" :disabled="!ready||starting||!!pending">{{starting?'Starting…':'Start'}}</button>
      </div>
      <div class="stage" v-else-if="screen==='exercise'">
        <p class="eyebrow">Cycle {{cycle}} of 6</p>
        <h2 class="phase" aria-live="polite">{{phase}}</h2>
        <div class="breathing-circle" :class="{expand:phase==='Inhale'}" aria-hidden="true"></div>
        <p class="countdown">{{countdown}} seconds</p>
        <p>{{Math.floor(elapsed/1000)}} / 60 seconds</p>
        <button class="stop" @click="stop('stopped','stop')">Stop</button>
      </div>
      <div class="stage" v-else>
        <h2>{{last?.status==='completed'?'Six cycles finished.':last?.status==='interrupted'?'Exercise interrupted.':'Exercise stopped.'}}</h2>
        <p v-if="last">Measured duration: {{last.duration_ms===null?'unknown':seconds(last.duration_ms)+' seconds'}}</p>
        <p v-if="last?.status==='interrupted'">The exercise ends when you leave the page or its timing is interrupted.</p>
        <p role="status">{{pending?'Save pending':saving?'Saving…':'Saved to local history'}}</p>
        <div class="actions"><button @click="screen='entry'">Done</button><button class="primary" @click="start" :disabled="!!pending||starting||!ready">Repeat</button><button @click="screen='entry'">Back</button></div>
      </div>
      <button class="support-link" @click="openSupport">Crisis / Support</button>
    </section>
    <p class="disclaimer">A coursework skills prototype. No therapy, diagnosis, or human monitoring. Use fictional scenarios only.</p>
    <div v-if="error" class="error" role="alert">{{error}} <button v-if="!ready" @click="initialize">Reconnect</button></div>
    <button v-if="pending" @click="retrySave" :disabled="saving">Retry save</button>
    <p class="notice" role="status">{{notice}}</p>
    <section class="details" v-if="screen!=='exercise'">
      <details><summary>About this exercise & saved preference</summary>
        <p>Inhale for 4 seconds, exhale for 6 seconds, six times. The app controls this sequence. You choose when to start and stop.</p>
        <label><input type="checkbox" v-model="reduced" @change="preference"> Still circle (reduced motion)</label>
        <p>This choice is saved with this browser’s conversation. You can change it at any time. Hiding or leaving the page ends the exercise.</p>
      </details>
      <details open @toggle="voicePanelToggle"><summary>Ask about the app <span class="badge">{{mode==='mock'?'Mock model':'Live model'}}</span></summary>
        <p>Optional. Questions and replies are saved locally in SQLite. Live mode sends your question and a few recent records to OpenAI. Use fictional inputs only.</p>
        <div class="messages" aria-live="polite"><article v-for="message in messages" :key="message.id"><strong>{{message.role==='user'?'You':'App'}} <small>{{message.source}} · {{message.status}}</small></strong><p>{{message.content}}</p></article></div>
        <form @submit.prevent="send"><label for="question">Question about this app</label><textarea id="question" v-model="question" maxlength="1000" placeholder="How does Stop work?" :disabled="sending"></textarea>
          <label v-if="mode==='mock'"><input type="checkbox" v-model="failNext"> Fail the next model request (demo)</label>
          <button type="submit" :disabled="!ready||sending||!question.trim()">{{sending?'Requesting…':'Send'}}</button>
        </form>
        <section id="voice" class="voice-panel" aria-labelledby="voice-title">
          <div class="voice-heading"><h2 id="voice-title">Voice conversation</h2><span class="badge">{{voiceLabel}}</span></div>
          <div class="voice-cue" :class="{'voice-on':voiceState.phase==='active'}" aria-hidden="true">🎙</div>
          <p class="voice-status" role="status">{{voiceState.message}}</p>
          <p>Up to {{voiceState.duration/60}} minutes · microphone and spoken replies.</p>
          <p v-if="voiceActive">{{voiceState.remaining}} seconds remaining</p>
          <p>Mute silences your microphone only. Assistant playback, the session, and billing continue. Use End to close voice.</p>
          <p v-if="!voiceState.configured">Server setup: enable VOICE_ENABLED and add OPENAI_API_KEY in backend/.env. No microphone is active.</p>
          <label><input type="checkbox" v-model="voiceConsent" :disabled="voiceActive"> I agree to send fictional microphone audio to OpenAI for this paid voice session.</label>
          <div class="actions"><button class="primary" @click="startVoice" :disabled="!voiceState.configured||!voiceConsent||voiceActive||sending">🎙 Use microphone</button><button v-if="['active','muted'].includes(voiceState.phase)" @click="voice.mute()">{{voiceState.muted?'Unmute microphone':'Mute microphone'}}</button><button v-if="voiceActive" @click="voice.end()" :disabled="voiceState.phase==='closing'">{{voiceState.phase==='closing'?'Closing…':'End voice'}}</button><button v-else @click="voice.check()">Check setup</button></div>
          <button v-if="voiceState.playBlocked" @click="voice.play()">Enable assistant audio</button>
          <p class="voice-note">Voice is experimental. Voice transcripts are not saved yet; text messages still are. Opening support, starting the exercise, or leaving this page ends voice.</p>
        </section>
      </details>
      <details><summary>Session history <span class="badge">{{sessions.length}}</span></summary>
        <p>Local app activity for this browser conversation. It does not describe your emotional state.</p>
        <p v-if="!sessions.length">No sessions yet.</p>
        <ol class="history"><li v-for="session in sessions" :key="session.id"><strong>{{session.status}} · {{session.duration_ms===null?'duration unknown':seconds(session.duration_ms)+' s'}}</strong><span>{{date(session.start_time)}} · {{session.reason||'in progress'}}</span><code>{{session.id}}</code></li></ol>
      </details>
    </section>
  </main>
  <dialog ref="support" aria-labelledby="support-title">
    <h2 id="support-title">Crisis / Support</h2>
    <p>This prototype cannot provide crisis support. Nobody is monitoring this chat.</p>
    <h3>United States & territories</h3>
    <p>Independent resource: 988 Suicide & Crisis Lifeline</p>
    <div class="actions"><a href="tel:988?oai_link_source=model_response_hotline">Call 988</a><a href="sms:988?oai_link_source=model_response_hotline">Text 988</a><a href="https://988lifeline.org/chat/?oai_link_source=model_response_hotline" target="_blank" rel="noopener noreferrer">Online chat</a></div>
    <p>Outside the U.S., contact your local crisis service. If there is immediate danger, contact local emergency services.</p>
    <p>This panel is built into the interface and opens without the model or backend. Calling, texting, and online chat use independent services.</p>
    <button v-if="screen==='exercise'" class="stop" @click="stop('stopped','stop'); support.close()">Stop exercise</button>
    <button @click="support.close()" autofocus>Close support</button>
  </dialog>`
}).mount('#app')
