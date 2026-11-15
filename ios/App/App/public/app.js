// 大肥鱼 手机端：登录 → 她的形象 + 对话 + 语音
const $ = (id) => document.getElementById(id)
const loginEl = $('login'), appEl = $('app')
const loginUser = $('loginUser'), loginPass = $('loginPass'), loginBtn = $('loginBtn'), loginErr = $('loginErr')
const tabLogin = $('tabLogin'), tabReg = $('tabReg'), paneLogin = $('paneLogin'), paneReg = $('paneReg')
const regQq = $('regQq'), regName = $('regName'), regCall = $('regCall'), regPass = $('regPass'), regBtn = $('regBtn')
const herNameEl = $('herName'), meLineEl = $('meLine')
const logEl = $('log'), bubble = $('bubble'), input = $('input')
const sendBtn = $('sendBtn'), micBtn = $('micBtn'), camBtn = $('camBtn'), camEl = $('cam')
const statusEl = $('status'), meName = $('meName'), logoutBtn = $('logout'), charEl = $('char'), charFallback = $('charFallback')

// —— 角色动画：待机轮换 + 说话时连续比划 + 回应表情 ——
const IDLE_LOOP = '/art/videos/idle.webm'
const IDLE_ROTATION = ['/art/videos/drag.webm', '/art/videos/bag_normal.webm', '/art/videos/bag_jingle.webm', '/art/videos/bag_count.webm']
const SPEAK_CLIPS = ['/art/videos/wave.webm', '/art/videos/happy.webm', '/art/videos/laugh.webm']
const REACT = { wave: '/art/videos/wave.webm', happy: '/art/videos/happy.webm', shy: '/art/videos/shy.webm', tsun: '/art/videos/tsun.webm', laugh: '/art/videos/laugh.webm' }
let idleTimer = null, speakTimer = null, playing = false

function playOnce(url, done) {
  if (!charEl) return
  charEl.loop = false
  charEl.src = url
  charEl.play().catch(() => {})
  charEl.onended = () => { charEl.onended = null; done && done() }
}

function toIdleLoop() {
  if (!charEl) return
  if (charEl.src.endsWith('idle.webm') && charEl.loop) return
  charEl.loop = true
  charEl.src = IDLE_LOOP
  charEl.play().catch(() => {})
}

// 待机：每 9–16 秒随手做个小动作（悬空、数钱袋…），做完回呼吸
function scheduleIdleAction() {
  clearTimeout(idleTimer)
  const wait = 9000 + Math.random() * 7000
  idleTimer = setTimeout(() => {
    if (!playing && charEl) {
      const url = IDLE_ROTATION[Math.floor(Math.random() * IDLE_ROTATION.length)]
      playOnce(url, () => { if (!playing) toIdleLoop() })
    }
    scheduleIdleAction()
  }, wait)
}

// 回应表情（收到消息/回话时）
function react(name) {
  if (!charEl) return
  const url = REACT[name]
  if (!url) return
  if (playing) return
  playOnce(url, () => { if (!playing) toIdleLoop() })
}

// 说话：一直比划，说到哪比划到哪
function startTalking() {
  if (!charEl) return
  playing = true
  clearInterval(speakTimer)
  let i = 0
  const step = () => {
    if (!playing) return
    playOnce(SPEAK_CLIPS[i % SPEAK_CLIPS.length], () => { if (playing) step() })
    i++
  }
  step()
}
function stopTalking() {
  playing = false
  clearInterval(speakTimer)
  toIdleLoop()
}

scheduleIdleAction()

// —— 括号里的动作 -> 动画 ——
const ACTIONS = [
  [/尾巴|摆尾|甩尾|晃了晃|尾巴一摆/, '/art/videos/drag.webm'],
  [/笑|嘿嘿|哈哈|咯咯|偷笑/, '/art/videos/laugh.webm'],
  [/哼|才不|撇嘴|嘟嘴|别过头/, '/art/videos/tsun.webm'],
  [/脸红|害羞|低头|缩|捂脸/, '/art/videos/shy.webm'],
  [/跳|蹦|扑|举|欢呼|开心/, '/art/videos/happy.webm'],
  [/挥|招手|摆手|招了招/, '/art/videos/wave.webm'],
  [/钱|数|袋|憋/, '/art/videos/bag_count.webm'],
]
function playAction(paren) {
  for (const [re, url] of ACTIONS) {
    if (re.test(paren)) { if (!playing) playOnce(url, () => { if (!playing) toIdleLoop() }); return }
  }
}
function splitReply(text) {
  const actions = []
  const clean = String(text || '')
    .replace(/[（(【\[]([^）)】\]]{0,60})[）)】\]]/g, (m, inner) => { actions.push(inner); return '​' })
    .replace(/\*[^*]{0,40}\*/g, (m) => { actions.push(m.replace(/\*/g, '')); return '​' })
    .replace(/​/g, '')
  const sentences = clean.split(/(?<=[。！？!?；;…\n])/).map((x) => x.trim()).filter(Boolean)
  return { clean, sentences: sentences.length ? sentences : [clean], actions }
}

// —— 黑底抠图：把视频帧画到 canvas，黑色变透明 ——
const keyCanvas = document.createElement('canvas')
keyCanvas.className = 'char'
keyCanvas.width = 360; keyCanvas.height = 360
let keyOn = false
const kctx = keyCanvas.getContext('2d', { willReadFrequently: true })

function startKeying() {
  if (keyOn || !charEl) return
  keyOn = true
  if (charEl.parentNode) {
    charEl.style.display = 'none'
    charEl.parentNode.insertBefore(keyCanvas, charEl.nextSibling)
  }
  let frame = 0
  const draw = () => {
    if (!keyOn) return
    frame++
    try {
      if (charEl.readyState >= 2 && charEl.videoWidth && (frame % 2 === 0)) {
        const w = charEl.videoWidth, h = charEl.videoHeight
        if (keyCanvas.width !== w || keyCanvas.height !== h) { keyCanvas.width = w; keyCanvas.height = h }
        kctx.drawImage(charEl, 0, 0, w, h)
        const img = kctx.getImageData(0, 0, w, h)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          if (r < 26 && g < 26 && b < 30) { d[i + 3] = 0 }               // 纯黑 → 透明
          else if (r < 60 && g < 60 && b < 70) { d[i + 3] = Math.min(d[i + 3], (Math.max(r, g, b) - 26) * 6) } // 边缘羽化
        }
        kctx.putImageData(img, 0, 0)
      }
    } catch (e) { /* 跨域/解码异常忽略 */ }
    requestAnimationFrame(draw)
  }
  draw()
}

charEl?.addEventListener('loadeddata', () => setTimeout(startKeying, 300))
charEl?.addEventListener('error', () => { charEl.classList.add('hidden'); charFallback.classList.remove('hidden') })
setTimeout(() => { if (charEl && (!charEl.videoWidth || charEl.readyState < 2)) { charEl.classList.add('hidden'); charFallback.classList.remove('hidden') } }, 2500)

const TOKEN_KEY = 'dafeiyu_token'
// App 里（capacitor:// 或 https://localhost）页面不是从电脑加载的，接口地址要写死；浏览器里用相对路径
const SERVER_BASE = 'https://yu.nianhua520.cn:18443'
// 网页版（同源）走相对路径；App 壳里走绝对地址
const API_BASE = (/^https?:$/.test(location.protocol)
  && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  && location.port) ? '' : SERVER_BASE
let audioCtx = null, analyser = null, speaking = false

const token = () => localStorage.getItem(TOKEN_KEY) || ''
const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

async function api(path, opt = {}) {
  const headers = Object.assign({}, opt.headers || {})
  if (token()) headers.authorization = 'Bearer ' + token()
  const res = await fetch(API_BASE + path, Object.assign({}, opt, { headers }))
  if (res.status === 401) { showLogin(); throw new Error('未登录') }
  return res
}

function showLogin() { appEl.classList.add('hidden'); loginEl.classList.remove('hidden'); setToken('') }
function showApp(name, callMe) {
  loginEl.classList.add('hidden'); appEl.classList.remove('hidden')
  if (herNameEl) herNameEl.textContent = '大肥鱼'
  if (meLineEl) meLineEl.textContent = '你：' + (callMe || name || '')
  localStorage.setItem('dafeiyu_callme', callMe || '')
  /* 垫音已移除 */
}

// —— 登录 ——
loginBtn.addEventListener('click', async () => {
  loginErr.textContent = ''
  loginBtn.disabled = true
  try {
    const qq = String(loginUser.value || '').replace(/[^0-9]/g, '')
    const res = await fetch(API_BASE + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qq, pass: loginPass.value }) })
    const d = await res.json()
    if (!d.ok) { loginErr.textContent = d.error || '登录失败'; return }
    setToken(d.token); showApp(d.name, d.call_me)
    localStorage.setItem('dafeiyu_user', qq)
  } catch (e) { loginErr.textContent = '连不上电脑：' + e.message }
  finally { loginBtn.disabled = false }
})
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click() })

tabLogin?.addEventListener('click', () => { tabLogin.classList.add('on'); tabReg.classList.remove('on'); paneLogin.classList.remove('hidden'); paneReg.classList.add('hidden') })
tabReg?.addEventListener('click', () => { tabReg.classList.add('on'); tabLogin.classList.remove('on'); paneReg.classList.remove('hidden'); paneLogin.classList.add('hidden') })

regBtn?.addEventListener('click', async () => {
  loginErr.textContent = ''
  const qq = String(regQq.value || '').replace(/[^0-9]/g, '')
  const name = String(regName.value || '').trim()
  const call = String(regCall.value || '').trim()
  const pass = String(regPass.value || '')
  if (!qq || qq.length < 5) return (loginErr.textContent = 'QQ 号看起来不对')
  if (!name) return (loginErr.textContent = '填一下你的名字')
  if (!call) return (loginErr.textContent = '填一下她想怎么称呼你')
  if (pass.length < 6) return (loginErr.textContent = '密码至少 6 位')
  try {
    const r = await (await fetch(API_BASE + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qq, name, call_me: call, pass }) })).json()
    if (!r.ok) return (loginErr.textContent = r.error || '注册失败')
    setToken(r.token); showApp(r.name, r.call_me); localStorage.setItem('dafeiyu_user', qq)
  } catch (e) { loginErr.textContent = '连不上服务器：' + e.message }
})
logoutBtn.addEventListener('click', async () => { try { await api('/api/logout', { method: 'POST' }) } catch {} ; showLogin() })

// —— 聊天 ——
function addMsg(text, who) {
  const d = document.createElement('div')
  d.className = 'msg ' + who
  d.textContent = text
  logEl.appendChild(d)
  logEl.scrollTop = logEl.scrollHeight
  return d
}
function typing(on) {
  let el = logEl.querySelector('.typing')
  if (on && !el) { el = document.createElement('div'); el.className = 'typing'; el.textContent = '她正在想说…'; logEl.appendChild(el); logEl.scrollTop = logEl.scrollHeight }
  if (!on && el) el.remove()
}
function showBubble(text) {
  bubble.textContent = text
  bubble.classList.remove('hidden')
  clearTimeout(showBubble._t)
  showBubble._t = setTimeout(() => bubble.classList.add('hidden'), 7000)
}

async function speakPipelined(text) {
  const { sentences, actions } = splitReply(text)
  for (const a of actions.slice(0, 2)) playAction(a)
  startTalking()
  const sr = 22050
  for (const sen of sentences) {
    if (!sen) continue
    try {
      const res = await api('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: sen }) })
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      const audio = new AudioContext()
      const decoded = await audio.decodeAudioData(buf.slice(0))
      await new Promise((resolve) => {
        const src = audio.createBufferSource(); src.buffer = decoded; src.connect(audio.destination)
        src.onended = () => { try { audio.close() } catch {} ; resolve() }
        src.start()
      })
    } catch (e) { /* 单句失败继续 */ }
  }
  stopTalking()
}

async function speak(text) {
  try {
    const res = await api('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: String(text).slice(0, 300) }) })
    if (!res.ok) return
    const buf = await res.arrayBuffer()
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') await audioCtx.resume()
    const audio = await audioCtx.decodeAudioData(buf)
    const src = audioCtx.createBufferSource(); src.buffer = audio
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 256
    src.connect(analyser); analyser.connect(audioCtx.destination)
    speaking = true
    startTalking()
    src.onended = () => { speaking = false; analyser = null; stopTalking() }
    src.start()
  } catch (e) { speaking = false; stopTalking() }
}

// —— 整段回复：一句话一个请求，但情绪/音色统一，并行合成，按顺序播 ——
function emotionOf(text) {
  const t = String(text || '')
  if (/哼|才不|笨蛋|讨厌|不理你/.test(t)) return 'aojiao'
  if (/哈哈|嘿嘿|咯咯|笑|好玩/.test(t)) return 'happy'
  if (/嘛|啦|抱抱|陪我|好不好/.test(t)) return 'sajiao'
  if (/唉|累|困|没力气|不想动/.test(t)) return 'tired'
  return ''
}

// 用 <audio> 播放（和试听页完全同一套解码器，听感一致）
function playAudioElement(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const a = new Audio(url)
    a.onended = () => { URL.revokeObjectURL(url); resolve() }
    a.onerror = () => { URL.revokeObjectURL(url); resolve() }
    a.play().catch(() => { URL.revokeObjectURL(url); resolve() })
  })
}

async function playAudioBuffer(buf) {
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  await new Promise((resolve) => {
    const src = ctx.createBufferSource(); src.buffer = decoded; src.connect(ctx.destination)
    src.onended = () => { try { ctx.close() } catch {}; resolve() }
    src.start()
  })
}

async function voiceWithRetry(body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await api('/api/voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) return await res.arrayBuffer()
    } catch (e) { /* 重试 */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

async function speakReply(fullText) {
  const { actions } = splitReply(fullText)
  for (const a of actions.slice(0, 2)) playAction(a)
  const emotion = emotionOf(fullText) || 'neutral'
  startTalking()
  try {
    // 整段一次合成；失败自动重试，绝不换成别的音色
    const buf = await voiceWithRetry({ text: fullText, emotion })
    if (buf && buf.byteLength > 200) await playAudioElement(new Blob([buf], { type: 'audio/mpeg' }))
  } catch (e) { /* 静默 */ }
  stopTalking()
}

async function send(text) {
  const t = String(text || '').trim()
  if (!t) return
  addMsg(t, 'me'); input.value = ''
  react('wave')
  typing(true); statusEl.textContent = '她在想…'
  let acc = '', full = ''
  try {
    const res = await api('/api/replyStream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: t }),
    })
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    typing(false)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        const s = line.trim()
        if (!s.startsWith('data:')) continue
        let obj = null
        try { obj = JSON.parse(s.slice(5).trim()) } catch { continue }
        if (obj.delta) { acc += obj.delta; showBubble(acc.slice(-160)) }
        if (obj.full) { full = obj.full; addMsg(full, 'her') }
        if (obj.error) addMsg('（出错了：' + obj.error + '）', 'her')
      }
    }
    statusEl.textContent = '在线'
    const text2 = full || acc
    if (text2) {
      const mood = /[哼唔]|才不|笨蛋/.test(text2) ? 'tsun' : (/[哈嘿笑]/.test(text2) ? 'laugh' : 'happy')
      react(mood)
      await speakReply(text2)
    }
  } catch (e) {
    typing(false); addMsg('（连不上：' + e.message + '）', 'her'); statusEl.textContent = '断开'
  }
}

sendBtn.addEventListener('click', () => send(input.value))
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(input.value) })

// —— 按住说话 ——
let rec = null, chunks = [], pressAt = 0
micBtn.addEventListener('pointerdown', async (e) => {
  e.preventDefault(); pressAt = Date.now()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    rec = new MediaRecorder(stream); chunks = []
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data) }
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      micBtn.classList.remove('rec')
      if (Date.now() - pressAt < 400) { showBubble('说得太短啦，按住多说一会儿。'); return }
      const blob = new Blob(chunks, { type: 'audio/webm' })
      statusEl.textContent = '识别中…'
      try {
        const r = await (await api('/api/asr', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: blob })).json()
        statusEl.textContent = '在线'
        if (!r.ok) { showBubble('语音识别还没接通：' + (r.error || '')); return }
        send(r.text)
      } catch (err) { statusEl.textContent = '在线'; showBubble('识别失败：' + err.message) }
    }
    rec.start(); micBtn.classList.add('rec'); statusEl.textContent = '松手发送'
  } catch (err) { showBubble('拿不到麦克风：' + err.message) }
})
micBtn.addEventListener('pointerup', () => { if (rec && rec.state === 'recording') rec.stop() })
micBtn.addEventListener('pointercancel', () => { if (rec && rec.state === 'recording') rec.stop() })

// —— 摄像头 ——
let camStream = null
camBtn.addEventListener('click', async () => {
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; camEl.srcObject = null; camEl.classList.add('hidden'); return }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    camEl.srcObject = camStream; await camEl.play(); camEl.classList.remove('hidden')
    showBubble('现在只是你这边预览，画面还没传给她。等接上"看得见"我告诉你。')
  } catch (e) { showBubble('拿不到摄像头：' + e.message) }
})

// —— 启动 ——
;(async () => {
  if (!token()) return showLogin()
  try {
    const res = await api('/api/whoami')
    const d = await res.json()
    if (d.ok) showApp(d.name, d.call_me || localStorage.getItem('dafeiyu_callme') || ''); else showLogin()
  } catch { showLogin() }
})()


// ——— CALL MODE：像打电话一样一直听着（4 秒一段，说完就答）———
const callBtn = $('callBtn')
let callOn = false, callRec = null, callStream = null, callTimer = null

async function callLoop() {
  if (!callOn) return
  try {
    callStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (e) { showBubble('拿不到麦克风：' + e.message); callOn = false; return }
  const chunk = () => {
    if (!callOn) return
    const rec = new MediaRecorder(callStream)
    const parts = []
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data) }
    rec.onstop = async () => {
      if (!callOn) return
      const blob = new Blob(parts, { type: 'audio/webm' })
      if (blob.size < 4000) { schedule(); return }   // 太静，跳过
      try {
        const r = await (await api('/api/asr', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: blob })).json()
        if (r.ok && r.text && r.text.replace(/\s/g, '').length >= 2) {
          addMsg(r.text, 'me')
          const res = await api('/api/reply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: r.text }) })
          const d = await res.json()
          if (d.ok) { addMsg(d.reply, 'her'); showBubble(d.reply); await speak(d.reply) }
        }
      } catch (e) { /* 忽略单段失败，继续听 */ }
      schedule()
    }
    rec.start()
    setTimeout(() => { try { if (rec.state === 'recording') rec.stop() } catch {} }, 4000)
  }
  const schedule = () => { if (callOn) callTimer = setTimeout(chunk, 250) }
  chunk()
}

callBtn?.addEventListener('click', async () => {
  callOn = !callOn
  callBtn.classList.toggle('rec', callOn)
  if (callOn) {
    showBubble('通话中——你说话，我听着')
    statusEl.textContent = '通话中'
    await callLoop()
  } else {
    showBubble('通话结束')
    statusEl.textContent = '在线'
    clearTimeout(callTimer)
    try { callStream && callStream.getTracks().forEach((t) => t.stop()) } catch {}
    callStream = null
  }
})


// ——— PULL LOOP：她主动说的话，进来就显示并念出来 ———
let pullTimer = null
async function pullOnce() {
  if (!token()) return
  try {
    const r = await (await api('/api/pull')).json()
    if (!r.ok || !r.items || !r.items.length) return
    for (const it of r.items) {
      addMsg(it.text, 'her')
      showBubble(it.text)
      if (location.hash === '#call') await speak(it.text)
    }
    if (r.items.length) react('happy')
  } catch (e) { /* 静默 */ }
}
function startPull() {
  if (pullTimer) clearInterval(pullTimer)
  pullTimer = setInterval(pullOnce, 20000)
  setTimeout(pullOnce, 3000)
}
// 登录成功后启动
const _showApp = showApp
showApp = function (name) { _showApp(name); startPull() }


// —— 手机通知（Web Push）——
function b64ToU8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(s)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function enablePush(silent) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (!silent) showBubble('这个浏览器不支持通知（iPhone 要先“添加到主屏幕”）')
      return false
    }
    const reg = await navigator.serviceWorker.ready
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm !== 'granted') { if (!silent) showBubble('通知被拒绝了，去系统设置里打开'); return false }
    const { key } = await (await api('/api/push/pubkey')).json()
    if (!key) return false
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) })
    }
    const r = await (await api('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys, ua: navigator.userAgent }),
    })).json()
    if (!silent) showBubble(r.ok ? '好啦，她找你的时候手机会响' : '订阅失败：' + (r.error || ''))
    return Boolean(r.ok)
  } catch (e) {
    if (!silent) showBubble('通知设置失败：' + e.message)
    return false
  }
}

const bellBtn = $('bellBtn')
bellBtn?.addEventListener('click', () => enablePush(false))
