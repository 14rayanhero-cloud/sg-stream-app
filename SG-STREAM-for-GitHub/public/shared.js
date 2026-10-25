// Shared data + event bus for dashboard and overlays
const BUS = 'lsx-bus';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
function emit(ev) {
  ev.ts = Date.now();
  try { new BroadcastChannel(BUS).postMessage(ev); } catch {}
  store.set('lsx-last', ev); // fallback via 'storage' event
}
function listen(fn) {
  let last = 0;
  const h = (ev) => { if (ev && ev.ts !== last) { last = ev.ts; fn(ev); } };
  try { new BroadcastChannel(BUS).onmessage = (e) => h(e.data); } catch {}
  const k = new URLSearchParams(location.search).get('k'); // real events from the server
  if (k) { // long-poll the server (works through tunnels/proxies where Server-Sent Events don't)
    let seq = null;
    (async () => { for (;;) { try { const r = await fetch('/poll/' + k + (seq == null ? '' : '?after=' + seq)); const j = await r.json(); seq = j.seq; (j.events || []).forEach(ev => { last = 0; h(ev); }); } catch { await new Promise(r => setTimeout(r, 2000)); } } })();
  }
  addEventListener('storage', (e) => { if (e.key === 'lsx-last' && e.newValue) h(JSON.parse(e.newValue)); });
}

// ---- Social links widget (shared by dashboard builder and overlay) ----
const PLATFORMS = {
  tiktok: ['TikTok', 'TT', '#25f4ee'], instagram: ['Instagram', 'IG', '#e1306c'], telegram: ['Telegram', 'TG', '#29a9eb'],
  youtube: ['YouTube', 'YT', '#ff2d2d'], x: ['X', 'X', '#ffffff'], snapchat: ['Snapchat', 'SC', '#fffc00'],
  discord: ['Discord', 'DC', '#5865f2'], facebook: ['Facebook', 'FB', '#1877f2'], twitch: ['Twitch', 'TW', '#9146ff'], kick: ['Kick', 'KK', '#53fc18'],
  whatsapp: ['WhatsApp', 'WA', '#25d366'], kick: ['Kick', 'K', '#53fc18'], custom: ['منصة مخصصة', '★', '#2dd4bf'],
};
const SOC_STYLES = [['pro', 'Pro Compact'], ['neon', 'Neon Card'], ['glass', 'Glass Pill'], ['neontext', 'Neon Text'],
  ['minimal', 'Minimal Line'], ['cyber', 'Cyberpunk'], ['diamond', 'Diamond'], ['flat', 'Flat'], ['diagonal', 'Diagonal'], ['wave', 'Wave'],
  ['street', 'Street'], ['braid', 'Braid'], ['strip', 'Cyber Strip'], ['nexus', 'Social Nexus'], ['flux', 'Flux'], ['crown', 'Crown Inn']];
const SOC_CSS = `
.soc{--c:#2dd4bf;--fg:#fff;--bg:#080919;display:inline-flex;align-items:center;gap:12px;padding:12px 24px;font:700 24px/1.1 'Segoe UI',Tahoma,sans-serif;color:var(--fg);background:var(--bg);white-space:nowrap}
.soc .ic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--c);color:#06121a;font-size:15px;font-weight:800;flex:none}
.soc small{display:block;font-size:11px;font-weight:600;opacity:.7;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px}
.soc.glass{border-radius:999px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--c) 45%,transparent)}
.soc.pro{border-radius:12px;border-inline-start:6px solid var(--c)}
.soc.neon{border-radius:16px;border:2px solid var(--c);box-shadow:0 0 14px var(--c),inset 0 0 14px color-mix(in srgb,var(--c) 40%,transparent)}
.soc.neontext{background:transparent;color:var(--c);text-shadow:0 0 10px var(--c),0 0 26px var(--c)}
.soc.neontext .ic{background:transparent;color:var(--c);border:2px solid var(--c);box-shadow:0 0 12px var(--c)}
.soc.minimal{background:transparent;border-radius:0;border-bottom:3px solid var(--c);padding-inline:8px}
.soc.cyber{clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);border-inline:4px solid var(--c)}
.soc.diamond{background:var(--c);color:#06121a;clip-path:polygon(20px 0,100% 0,calc(100% - 20px) 100%,0 100%);padding-inline:40px}
.soc.diamond .ic{background:#06121a;color:var(--c)}
.soc.flat{background:var(--c);color:#06121a;border-radius:8px}
.soc.flat .ic{background:#06121a;color:var(--c)}
.soc.diagonal{clip-path:polygon(0 0,100% 0,calc(100% - 24px) 100%,0 100%);border-inline-start:5px solid var(--c);padding-inline-end:44px}
.soc.wave{border-radius:30px 30px 30px 4px;background:linear-gradient(120deg,var(--bg),color-mix(in srgb,var(--c) 38%,var(--bg)));border:1px solid var(--c)}
.soc.street{background:var(--c);color:#06121a;transform:rotate(-3deg);border:3px solid #06121a;box-shadow:5px 5px 0 #06121a;border-radius:4px;text-transform:uppercase}
.soc.street .ic{background:#06121a;color:var(--c)}
.soc.braid{border-radius:999px;border:4px double var(--c)}
.soc.strip{border-radius:0;background:linear-gradient(90deg,var(--c),transparent 85%);padding-inline-end:70px}
.soc.strip .ic{background:var(--bg);color:var(--c)}
.soc.nexus{border-radius:20px;border:1px solid var(--c);box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 25%,transparent),0 0 30px color-mix(in srgb,var(--c) 50%,transparent)}
.soc.flux{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 35%,#7c3aed));color:#06121a;border-radius:16px 4px 16px 4px}
.soc.flux .ic{background:#06121a;color:var(--c)}
.soc.crown{border-radius:14px;border:2px solid var(--c);position:relative;margin-top:14px}
.soc.crown::before{content:'👑';position:absolute;top:-20px;right:18px;font-size:22px}
`;
function injectSoc() { if (document.getElementById('soc-css')) return; const s = document.createElement('style'); s.id = 'soc-css'; s.textContent = SOC_CSS; document.head.appendChild(s); }
const escH = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function socHTML(it) {
  const P = PLATFORMS[it.p] || PLATFORMS.custom;
  const name = it.p === 'custom' && it.n ? it.n : P[0];
  return `<div class="soc ${it.st || 'glass'}" style="--c:${escH(it.c || P[2])};--fg:${escH(it.fg || '#ffffff')};--bg:${escH(it.bg || '#080919')}"><span class="ic">${P[1]}</span><span><small>${escH(name)}</small><span dir="ltr" style="unicode-bidi:isolate">${escH(it.h || '@your_name')}</span></span></div>`;
}

// ---- Sounds + TTS (shared by overlays and the dashboard preview) ----
const SOUNDS = { chime: '🔔 رنين', pop: '🫧 فقاعة', fanfare: '🎺 احتفال', coin: '🪙 عملة', laugh1: '😂 ضحكة', laugh2: '🤣 ضحكة طويلة', laugh3: '😈 ضحكة شريرة',
  trombone: '😢 ترومبون حزين', dramatic: '😱 دراما (دن دن دااان)', airhorn: '📯 بوق', boing: '🪀 بوينغ', boom: '💥 بووم', rimshot: '🥁 با-دم-تش', whoosh: '💨 ووش', ding: '🛎️ دنق',
  oud1: '🎶 عود (مقام حجاز)', oud2: '🎵 عود (مقام بياتي)', darbuka: '🥁 دربكة', applause: '👏 تصفيق', none: '🔇 بدون صوت' };
let _ac;
// --- synthesised sounds: no audio files, so nothing to download or license ---
function pluck(ctx, freq, t, dur = 1.1, vol = .5) { // Karplus-Strong plucked string: an oud-like tone
  const sr = ctx.sampleRate, n = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * dur), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0, k = 0; i < len; i++) { const j = (k + 1) % n; d[i] = ring[k]; ring[k] = (ring[k] + ring[j]) * .4985; k = j; }
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(ctx.destination); s.start(t);
}
function laughBurst(ctx, t, f0, dur, vol, formants = [750, 1250]) { // one "ha": a voiced burst shaped by two vowel formants
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * 1.15, t); o.frequency.linearRampToValueAtTime(f0, t + dur);
  formants.forEach(fr => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = 4; o.connect(f); f.connect(g); });
  g.connect(ctx.destination);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.start(t); o.stop(t + dur + .02);
}
function noiseHit(ctx, t, dur, vol, type, freq) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = type; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t);
}
function thump(ctx, t, f0, vol) { // low drum hit
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0 * 1.8, t); o.frequency.exponentialRampToValueAtTime(f0, t + .12);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .32);
}
function scheduleSound(ctx, name, t0) {
  const tone = (seq) => seq.forEach(([f, t, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t1 = t0 + t;
    o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(.0001, t1); g.gain.exponentialRampToValueAtTime(.25, t1 + .02); g.gain.exponentialRampToValueAtTime(.0001, t1 + d); o.start(t1); o.stop(t1 + d + .05);
  });
  if (name === 'chime') tone([[660, 0, .15], [880, .15, .3]]);
  else if (name === 'pop') tone([[520, 0, .08], [780, .08, .12]]);
  else if (name === 'coin') tone([[988, 0, .08], [1319, .08, .4]]);
  else if (name === 'fanfare') tone([[523, 0, .15], [659, .15, .15], [784, .3, .15], [1047, .45, .4]]);
  else if (name === 'laugh1') for (let i = 0; i < 6; i++) laughBurst(ctx, t0 + i * .17, 310 - i * 14, .13, 1.4 - i * .08);
  else if (name === 'laugh2') { let t = 0; for (let i = 0; i < 11; i++) { laughBurst(ctx, t0 + t, 330 - i * 9 + (i % 2) * 18, .12, 1.3, [800, 1300]); t += i === 5 ? .42 : .15 + (i % 3) * .015; } }
  else if (name === 'laugh3') for (let i = 0; i < 5; i++) laughBurst(ctx, t0 + i * .34, 150 - i * 6, .27, 1.25, [500, 900]);
  else if (name === 'oud1') { [293.66, 311.13, 369.99, 392, 369.99, 311.13, 293.66].forEach((f, i) => pluck(ctx, f, t0 + i * .27, 1.1, .5)); pluck(ctx, 146.83, t0 + 1.9, 1.6, .55); }
  else if (name === 'oud2') { [293.66, 320.24, 349.23, 392, 440, 392, 349.23, 320.24, 293.66].forEach((f, i) => pluck(ctx, f, t0 + i * .24, 1, .5)); pluck(ctx, 146.83, t0 + 2.2, 1.6, .55); }
  else if (name === 'darbuka') [[0, 'd'], [.3, 't'], [.45, 't'], [.75, 'd'], [.9, 't'], [1.05, 't'], [1.2, 'd']].forEach(([t, k]) => k === 'd' ? thump(ctx, t0 + t, 90, .9) : noiseHit(ctx, t0 + t, .07, .5, 'highpass', 3200));
  else if (name === 'trombone') [[233, 0, .4], [220, .45, .4], [208, .9, .4], [196, 1.35, 1.1]].forEach(([f, t, d], i) => { const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t1 = t0 + t; o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t1); if (i === 3) o.frequency.linearRampToValueAtTime(f * .8, t1 + d); fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, t1); fl.frequency.linearRampToValueAtTime(1100, t1 + d * .3); fl.frequency.linearRampToValueAtTime(400, t1 + d); o.connect(fl); fl.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.0001, t1); g.gain.exponentialRampToValueAtTime(.32, t1 + .05); g.gain.exponentialRampToValueAtTime(.0001, t1 + d); o.start(t1); o.stop(t1 + d + .05); });
  else if (name === 'dramatic') [[110, 0, .3], [110, .38, .3], [82.4, .8, 1.3]].forEach(([f, t, d]) => { [1, 1.5, 2].forEach((m) => { const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t1 = t0 + t; o.type = 'sawtooth'; o.frequency.value = f * m; fl.type = 'lowpass'; fl.frequency.value = 900; o.connect(fl); fl.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.0001, t1); g.gain.exponentialRampToValueAtTime(.16, t1 + .02); g.gain.exponentialRampToValueAtTime(.0001, t1 + d); o.start(t1); o.stop(t1 + d + .05); }); thump(ctx, t0 + t, 60, .8); });
  else if (name === 'airhorn') [[0, .28], [.34, .28], [.68, .7]].forEach(([t, d]) => [440, 554, 659, 880].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), t1 = t0 + t; o.type = 'sawtooth'; o.frequency.value = f * (1 + i * .002); o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.0001, t1); g.gain.exponentialRampToValueAtTime(.09, t1 + .02); g.gain.setValueAtTime(.09, t1 + d - .05); g.gain.exponentialRampToValueAtTime(.0001, t1 + d); o.start(t1); o.stop(t1 + d + .02); }));
  else if (name === 'boing') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(640, t0 + .12); o.frequency.exponentialRampToValueAtTime(230, t0 + .5); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.4, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .55); o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + .6); }
  else if (name === 'boom') { thump(ctx, t0, 52, 1); noiseHit(ctx, t0, .6, .55, 'lowpass', 700); }
  else if (name === 'rimshot') { thump(ctx, t0, 120, .8); thump(ctx, t0 + .16, 100, .8); noiseHit(ctx, t0 + .34, .9, .5, 'highpass', 6500); }
  else if (name === 'whoosh') { const len = Math.floor(ctx.sampleRate * .6), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len); const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(3200, t0 + .55); g.gain.value = .6; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t0); }
  else if (name === 'ding') tone([[1568, 0, .6], [2093, .06, .5]]);  else if (name === 'applause') for (let i = 0; i < 70; i++) noiseHit(ctx, t0 + Math.random() * 1.6, .03, .4 * Math.sin(Math.PI * Math.min(1, (i % 70) / 70 + .1)) + .15, 'bandpass', 1800 + Math.random() * 1400);
}
function playSound(name, custom) {
  try {
    if (custom) { const a = new Audio(custom); a.play().catch(() => {}); return; } // the streamer's own file (e.g. a song clip)
    if (!name || name === 'none') return;
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    scheduleSound(_ac, name, _ac.currentTime);
  } catch {}
}function speak(text) { speakAuto(text); } // alerts, wheel and tap celebrations all read through the cloud voice (with the browser voice as fallback)
// ---- FX / reactions: fireworks, confetti, emoji rain... fired by rules (event -> effect) on the «المؤثرات» overlay ----
const FX_EFFECTS = { fireworks: ['ألعاب نارية', '🎆'], megafireworks: ['ألعاب نارية ضخمة', '🎇'], heartworks: ['ألعاب نارية قلوب', '💖'], confetti: ['قصاصات ملونة', '🎉'], emojirain: ['مطر إيموجي', '🌧️'], emojiburst: ['نافورة إيموجي', '⛲'],
  hearts: ['قلوب وإيموجي صاعدة', '❤️'], balloons: ['بالونات', '🎈'], coins: ['مطر عملات', '🪙'], snow: ['ثلج', '❄️'], stars: ['نجوم متساقطة', '🌠'], lightning: ['برق', '⚡'], shockwave: ['موجة نيون', '🌀'], flash: ['وميض', '💥'], none: ['بدون مؤثر (صوت أو نص فقط)', '🔔'],
  welcome: ['بطاقة ترحيب (دخول مشاهد)', '👋'], reaction: ['ردة فعل بإيموجي كبير (تختاره)', '😮'], meme_laugh: ['ردة فعل: ضحك', '🤣'], meme_shock: ['ردة فعل: صدمة', '😱'], meme_cry: ['ردة فعل: بكاء', '😭'], meme_clap: ['ردة فعل: تصفيق', '👏'], meme_fire: ['ردة فعل: نار', '🔥'], meme_wow: ['ردة فعل: واااو', '🤩'], meme_boom: ['ردة فعل: بووم', '💥'], meme_facepalm: ['ردة فعل: ياخي', '🤦'], meme_sus: ['ردة فعل: مريب', '🤨'] };
const FX_REACT = { meme_laugh: ['🤣', 'ههههه ما أقدر!', 'laugh2', '#ffd23f'], meme_shock: ['😱', 'يا ساتر!!', 'dramatic', '#ff3d6e'], meme_cry: ['😭', 'يا حرام!', 'trombone', '#3dd6ff'], meme_clap: ['👏', 'برافو!', 'applause', '#7dff6b'], meme_fire: ['🔥', 'نااااار!', 'airhorn', '#ff9f1c'],
  meme_wow: ['🤩', 'وااااو!', 'fanfare', '#c77dff'], meme_boom: ['💥', 'بووووم!', 'boom', '#ff6bd6'], meme_facepalm: ['🤦', 'ياخي!!', 'boing', '#ffd23f'], meme_sus: ['🤨', 'مريب…', 'dramatic', '#b4b4c8'], welcome: ['👋', 'مرحباً {user}', 'whoosh', '#00F0FF'], reaction: ['😮', '', 'ding', '#00F0FF'] };const FX_EVENTS = { gift: 'هدية', follow: 'متابعة', like: 'إعجابات (كل N)', share: 'مشاركة', sub: 'اشتراك', chat: 'كلمة في الشات', join: 'دخول مشاهد', raid: 'غارة' };
const FX_PACK_RULES = [
  { on: true, name: 'دخول مشاهد', event: 'join', min: 0, match: '', effect: 'welcome', emoji: '', color: '', power: 1, text: '', sound: 'auto', audio: '', cd: 8 },
  { on: true, name: 'ردة فعل: ضحك', event: 'chat', min: 0, match: '!ضحك, !haha, !lol', effect: 'meme_laugh', emoji: '', color: '', power: 2, text: '', sound: 'auto', audio: '', cd: 6 },
  { on: true, name: 'ردة فعل: صدمة', event: 'chat', min: 0, match: '!ساتر, !shock, !omg', effect: 'meme_shock', emoji: '', color: '', power: 2, text: '', sound: 'auto', audio: '', cd: 6 },
  { on: true, name: 'ردة فعل: حزن', event: 'chat', min: 0, match: '!حزين, !cry, !sad', effect: 'meme_cry', emoji: '', color: '', power: 2, text: '', sound: 'auto', audio: '', cd: 6 },
  { on: true, name: 'ردة فعل: تصفيق', event: 'chat', min: 0, match: '!برافو, !clap', effect: 'meme_clap', emoji: '', color: '', power: 2, text: '', sound: 'auto', audio: '', cd: 6 },
  { on: true, name: 'ردة فعل: نار', event: 'chat', min: 0, match: '!نار, !fire', effect: 'meme_fire', emoji: '', color: '', power: 2, text: '', sound: 'auto', audio: '', cd: 6 },
  { on: true, name: 'هدية ضخمة: واااو', event: 'gift', min: 5000, match: '', effect: 'meme_wow', emoji: '', color: '', power: 3, text: '{user} أسطورة!', sound: 'auto', audio: '', cd: 5 },
];const FX_DEFAULT_RULES = [
  { on: true, name: 'هدية كبيرة', event: 'gift', min: 500, match: '', effect: 'megafireworks', emoji: '', color: '', power: 3, text: '🎆 {user} أهدى {gift}!', sound: 'fanfare', cd: 3 },
  { on: true, name: 'وردة', event: 'gift', min: 0, match: 'rose', effect: 'hearts', emoji: '🌹', color: '', power: 2, text: '', sound: 'none', cd: 2 },
  { on: true, name: 'أي هدية', event: 'gift', min: 1, match: '', effect: 'emojirain', emoji: '🎁', color: '', power: 1, text: '', sound: 'none', cd: 2 },
  { on: true, name: 'متابع جديد', event: 'follow', min: 0, match: '', effect: 'confetti', emoji: '', color: '', power: 2, text: '➕ {user} تابعك!', sound: 'pop', cd: 2 },
  { on: true, name: 'كل 100 إعجاب', event: 'like', min: 100, match: '', effect: 'heartworks', emoji: '', color: '', power: 1, text: '', sound: 'none', cd: 0 },
  { on: true, name: 'مشاركة', event: 'share', min: 0, match: '', effect: 'balloons', emoji: '', color: '', power: 1, text: '🔁 {user} شارك البث', sound: 'none', cd: 4 },
  { on: true, name: 'اشتراك', event: 'sub', min: 0, match: '', effect: 'coins', emoji: '', color: '', power: 2, text: '⭐ {user} اشترك!', sound: 'coin', cd: 2 },
  { on: true, name: 'كلمة !boom', event: 'chat', min: 0, match: '!boom', effect: 'fireworks', emoji: '', color: '', power: 2, text: '', sound: 'none', cd: 10 },
  ...FX_PACK_RULES,
];const DEFAULT_CFG = {
  goal: { title: 'هدف اليوم', cur: 0, target: 100, c1: '#00F0FF', c2: '#9d4edd', src: 'gifts' },
  alerts: {
    gift: { on: true, text: '{user} أرسل {gift} ×{count}', img: '', sound: 'chime', tts: true, color: '#ff007f' },
    follow: { on: true, text: '{user} تابعك! أهلاً فيك', img: '', sound: 'pop', tts: true, color: '#00F0FF' },
    sub: { on: true, text: '{user} اشترك في القناة!', img: '', sound: 'fanfare', tts: true, color: '#9d4edd' },
    bigGift: { on: true, text: '🔥 دعم كبير! {user} أرسل {gift} ×{count}', img: '', sound: 'fanfare', tts: true, color: '#fbbf24', min: 100 },
    like: { on: true, text: '{user} كبّس ×{count} ❤️', img: '', sound: 'pop', tts: false, color: '#ff007f', min: 50 },
    milestone: { on: true, text: '🎉 وصلنا {total} إعجاب!', img: '', sound: 'fanfare', tts: true, color: '#ec4899', min: 1000 },
    share: { on: true, text: '{user} شارك البث 🔁', img: '', sound: 'pop', tts: false, color: '#22d3ee' },
    join: { on: false, text: '{user} دخل البث 👋', img: '', sound: 'none', tts: false, color: '#8b9cff' },
    goal: { on: true, text: '🏆 تحقق الهدف: {title}!', img: '', sound: 'fanfare', tts: true, color: '#00F0FF' },
    raid: { on: true, text: '🚀 {user} غزا القناة بـ {count} مشاهد!', img: '', sound: 'fanfare', tts: true, color: '#9146ff' },
  },
  ticker: { on: true, mode: 'both', speed: 40, text: 'شكراً لكل الداعمين 💜' },
  social: [],
  taps: { on: true, title: 'التكبيس', targets: [1000, 5000, 10000], c1: '#ff2d8a', c2: '#9d4edd', text: '🎉 وصلنا {target} تكبيسة!', sound: 'fanfare', tts: true },
  tplOpts: {}, // per-template look: rows, background opacity, glow, size, entry animation
  canvas: { // the all-in-one screen: which overlays are on, and where (offsets from their natural position)
    mode: '16:9',
    layouts: {
      '16:9': { order: ['ticker', 'chat', 'recent', 'top', 'taps', 'goal', 'social', 'alerts'], layers: {
        goal: { on: true, x: 0, y: 0, s: 1 }, taps: { on: true, x: 0, y: 130, s: 1 }, top: { on: true, x: 0, y: 310, s: 1 }, alerts: { on: true, x: 0, y: 0, s: 1 },
        social: { on: false, x: 0, y: 0, s: 1 }, ticker: { on: true, x: 0, y: 0, s: 1 }, chat: { on: false, x: 0, y: 640, s: 1 }, recent: { on: false, x: 1520, y: 0, s: 1 } } },
      '9:16': { order: ['ticker', 'chat', 'recent', 'top', 'taps', 'goal', 'social', 'alerts'], layers: {
        goal: { on: true, x: 0, y: 60, s: 1 }, taps: { on: true, x: 0, y: 190, s: 1 }, top: { on: true, x: 0, y: 390, s: 1 }, alerts: { on: true, x: 0, y: 700, s: 1 },
        social: { on: false, x: 0, y: 0, s: 1 }, ticker: { on: true, x: 0, y: 0, s: 1 }, chat: { on: false, x: 0, y: 1380, s: 1 }, recent: { on: false, x: 700, y: 60, s: 1 } } },
    },
  },
  wheel: { title: 'عجلة الحظ', auto: true, gift: 'Rose', min: 0, cooldown: 8, sound: 'fanfare', tts: true,
    segments: [{ t: 'تحدي رقص 💃', c: '#ff2d8a' }, { t: 'ماء بارد 🧊', c: '#00F0FF' }, { t: 'غنّي أغنية 🎤', c: '#9d4edd' }, { t: 'جائزة مفاجأة 🎁', c: '#fbbf24' }, { t: 'ادعُ لمتابع 🙏', c: '#34d399' }, { t: 'حظ أوفر 😅', c: '#64748b' }] },
  tts: { on: true, scope: 'all', voice: '', lang: 'ar-SA', rate: 1, pitch: 1, volume: 1, banned: '', readName: true, maxLen: 120, ignoreCmds: true },
  games: { on: false, game: 'custom', rules: [] },
  fx: { on: true, rules: FX_DEFAULT_RULES },
  jar: { cap: 140, verb: 'أهدى', unit: 'عملة', bubble: true, top: true, total: true, sound: true }, // gift jar (الحصالة)
  uchat: { max: 5, fs: 22, tiktok: true, twitch: true, kick: true, hideBots: false, hideCmds: true, badge: 'icon', ttl: 20, ttlSet: false, maxSet: false }, // unified chat widget (TikTok + Twitch in one list)
  slots: {}, // per overlay type -> chosen template id, so the OBS link never has to change
};

// ---- Template library (generated from themes/variants) ----
const TOP_THEMES = {
  butterfly: ['Crystal Butterfly', '🦋', '#8b9cff', '#c4b5fd'], rose: ['Diamond Rose', '🌹', '#ec4899', '#f9a8d4'], bow: ['Pearl Bow', '🎀', '#f5d0fe', '#fbcfe8'],
  flame: ['Inferno', '🔥', '#ff7a18', '#ffd166'], ice: ['Frost', '❄️', '#38bdf8', '#bae6fd'], crown: ['Golden Crown', '👑', '#fbbf24', '#fde68a'],
  galaxy: ['Galaxy', '🌌', '#7c3aed', '#c4b5fd'], sakura: ['Sakura', '🌸', '#f472b6', '#fbcfe8'],
};
const TAP_STYLES = [['neon', 'Neon Bar'], ['heart', 'Heart Fill'], ['ring', 'Tap Ring'], ['rocket', 'Rocket Run'], ['battery', 'Battery'], ['thermo', 'Thermometer'], ['flame', 'Flame'], ['pill', 'Glass Pill'], ['gauge', 'Gauge'], ['cyber', 'Cyber Segments'], ['crown', 'Golden Crown'], ['minimal', 'Minimal'], ['vertical', 'Neon Tower'], ['galaxy', 'Galaxy']];
const ALERT_STYLES = { neon: 'Neon Pulse', glass: 'Glass Drop', comic: 'Comic Pop', cyber: 'Cyber Grid', minimal: 'Minimal Line', gold: 'Royal Gold', laser: 'Laser Cut', liquid: 'Liquid Metal', coins: 'Gold Coins', heartbeat: 'Heartbeat', fire: 'Fire', hologram: 'Hologram', lightning: 'Lightning' };
// ---- extra template families: Ramadan & dhikr, support-alert styles, coloured likes alerts, last-supporter panels, themed goals ----
const RAMADAN_STYLES = { lantern: ['Golden Lanterns', 0], mosque: ['Golden Mosque', 1], lattice: ['Mashrabiya', 1], tasbih: ['Prayer Beads', 1], manuscript: ['Manuscript', 1], stardust: ['Golden Dust', 1], crescent: ['Crescent Moon', 0], fanous: ['Fanous Glow', 0], arabesque: ['Arabesque', 1], night: ['Ramadan Night', 0], emerald: ['Emerald Light', 1], eid: ['Eid Mubarak', 0] };
const RSCENES = { stars: 'Falling Stars', lanterns: 'Rising Lanterns', crescent: 'Crescent Glow', dust: 'Golden Dust Rain' };
const DHIKR = ['سبحان الله وبحمده', 'سبحان الله العظيم', 'لا إله إلا الله وحده لا شريك له', 'الحمد لله رب العالمين', 'الله أكبر كبيراً', 'أستغفر الله وأتوب إليه', 'اللهم صلِّ وسلّم على نبينا محمد', 'لا حول ولا قوة إلا بالله', 'حسبي الله ونعم الوكيل', 'رمضان كريم', 'تقبّل الله منا ومنكم', 'اللهم إنك عفوٌّ تحب العفو فاعف عنا'];
const DHIKR_STYLES = { classic: 'Classic Cartouche', book: 'Open Book', brush: 'Brush Stroke', cards: 'Card Carousel', water: 'Water Reflection', d3: '3D Letters', bar: 'Dhikr Bar', medal: 'Geometric Medallion', light: 'Divine Light', star: 'Shooting Star', mosaic: 'Mosaic', neon: 'Neon Sign', fire: 'Burning Gold', glass: 'Glass Panel', scroll: 'Scroll', emerald: 'Emerald Plaque', sunrise: 'Sunrise' };
const LIKE_COLORS = { purple: ['Purple', '#a855f7'], red: ['Red', '#ef4444'], green: ['Green', '#22c55e'], blue: ['Blue', '#3b82f6'], pink: ['Pink', '#ec4899'], frost: ['Frost', '#7dd3fc'], rose: ['Rose Gold', '#f4a58a'], hearts: ['Hearts', '#ff4d8d'] };
// last supporter panels: [name, background, border, text, glow, extra css]
const LASTSUP_STYLES = {
  neon: ['Neon', 'rgba(8,10,24,.92)', '#00F0FF', '#e8fbff', '#00F0FF', ''], royal: ['Royal', 'linear-gradient(135deg,#2b1a05,#120b02)', '#fbbf24', '#fde68a', '#fbbf24', ''], glass: ['Glass', 'rgba(255,255,255,.12)', 'rgba(255,255,255,.45)', '#fff', '#8b9cff', 'backdrop-filter:blur(14px);'],
  hologram: ['Hologram', 'linear-gradient(180deg,rgba(0,240,255,.2),rgba(0,240,255,.05))', '#00F0FF', '#eaffff', '#00F0FF', 'background-image:repeating-linear-gradient(0deg,transparent 0 3px,#ffffff10 3px 4px);'], molten: ['Molten', 'linear-gradient(135deg,#ff6a00,#b91c00 60%,#3a0800)', '#ffb347', '#fff2d9', '#ff6a00', ''], crystal: ['Crystal', 'linear-gradient(135deg,#e0f2fe,#7dd3fc 50%,#0ea5e9)', '#fff', '#06324a', '#7dd3fc', ''],
  sand: ['Sand', 'linear-gradient(135deg,#e9d3a0,#c9a45c)', '#8a6a2b', '#3d2a08', '#c9a45c', ''], liquidgold: ['Liquid Gold', 'linear-gradient(135deg,#fff1a8,#f5b800 40%,#a86b00 70%,#ffd84d)', '#fff3b0', '#3a2300', '#f5b800', ''], fire: ['Fire', 'linear-gradient(0deg,#3a0800,#120200)', '#ff6a00', '#ffe9c2', '#ff3d00', ''],
  volt: ['Volt', '#08100a', '#d4ff00', '#f4ffb8', '#d4ff00', ''], galaxy: ['Galaxy', 'radial-gradient(circle at 30% 20%,#4c1d95,#0b0620 70%)', '#a78bfa', '#ede9fe', '#7c3aed', ''], ice: ['Ice', 'linear-gradient(135deg,#0c2d48,#145374)', '#9be7ff', '#e6faff', '#38bdf8', ''],
  lava: ['Lava', 'linear-gradient(135deg,#1a0500,#5a1200 55%,#ff4500)', '#ff7a2f', '#fff0e0', '#ff4500', ''], marble: ['Marble', 'linear-gradient(135deg,#f5f5f5,#cfcfd6 45%,#fafafa)', '#9a9aa6', '#23232a', '#bfbfcc', ''], cyber: ['Cyber', '#070b16', '#ff2bd6', '#ffe6fb', '#ff2bd6', 'clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);'],
  led: ['LED', '#050505', '#ff2d2d', '#ff5a5a', '#ff2d2d', 'font-family:monospace;letter-spacing:2px;'], laser: ['Laser', '#06060f', '#39ff14', '#eaffe3', '#39ff14', ''], matrix: ['Matrix', '#020a04', '#00ff66', '#9dffbf', '#00ff66', 'font-family:monospace;'],
};
// themed goal widgets: [name, emoji, colour 1, colour 2]
const GOAL_THEMES = {
  ghost: ['Ghost', '👻', '#a78bfa', '#e9d5ff'], crescent: ['Crescent', '🌙', '#fbbf24', '#fde68a'], rose: ['Rose', '🌹', '#e11d48', '#fda4af'], butterfly: ['Butterfly', '🦋', '#60a5fa', '#c4b5fd'], cat: ['Cat', '🐱', '#fb923c', '#fed7aa'], unicorn: ['Unicorn', '🦄', '#f472b6', '#c4b5fd'], panda: ['Panda', '🐼', '#9ca3af', '#f3f4f6'], dino: ['Dino', '🦖', '#22c55e', '#bbf7d0'],
  riyal: ['Saudi Riyal', '﷼', '#16a34a', '#86efac'], dirham: ['UAE Dirham', 'د.إ', '#dc2626', '#fecaca'], card: ['Playing Card', '🃏', '#ef4444', '#fca5a5'], rocket: ['Rocket', '🚀', '#38bdf8', '#a5f3fc'], heart: ['Heart', '💖', '#ec4899', '#fbcfe8'], crown: ['Crown', '👑', '#fbbf24', '#fef08a'], diamond: ['Diamond', '💎', '#22d3ee', '#a5f3fc'],
  fire: ['Fire', '🔥', '#f97316', '#fde047'], star: ['Star', '⭐', '#facc15', '#fef9c3'], sun: ['Sun', '☀️', '#f59e0b', '#fde68a'], snow: ['Snow', '❄️', '#7dd3fc', '#e0f2fe'], music: ['Music', '🎵', '#a855f7', '#f0abfc'], gamepad: ['Gamepad', '🎮', '#6366f1', '#a5b4fc'], trophy: ['Trophy', '🏆', '#eab308', '#fef08a'], clover: ['Clover', '🍀', '#16a34a', '#bbf7d0'], cherry: ['Cherry', '🍒', '#be123c', '#fda4af'], moon: ['Night Moon', '🌕', '#818cf8', '#c7d2fe'],
};
const JAR_THEMES = { glass: 'Crystal Glass', gold: 'Royal Gold', neon: 'Neon Cyan', rose: 'Rose Pink', emerald: 'Emerald', royal: 'Royal Purple' };
const JAR_MORE = [['tube-neon', 'Neon Beaker'], ['tube-glass', 'Crystal Beaker'], ['tube-rose', 'Rose Beaker'], ['bowl-glass', 'Crystal Fish Bowl'], ['bowl-emerald', 'Emerald Fish Bowl'], ['bowl-royal', 'Royal Fish Bowl'], ['vase-gold', 'Golden Vase'], ['vase-royal', 'Royal Vase'], ['vase-rose', 'Rose Vase'], ['trophy-gold', 'Gold Champion Cup'], ['trophy-glass', 'Silver Champion Cup'], ['trophy-rose', 'Rose Champion Cup'], ['chest-gold', 'Treasure Chest'], ['chest-emerald', 'Emerald Treasure Chest']];
const T_ = (id, cat, name, desc, o = {}) => ({ id, cat, name, desc, view: id, sub: false, ...o });
const TEMPLATES = [
  T_('gift-rocket', 'challenge', 'Gift Rocket', 'صاروخ يمتلئ مع كل هدية', { sub: true }),
  T_('gift-timer', 'challenge', 'Gift Timer Gold', 'مؤقت يزيد مع الهدايا', { view: 'gift-timer', v: 'gold', sub: true }),
  T_('timer-neon', 'challenge', 'Gift Timer Neon', 'مؤقت نيون سماوي', { view: 'gift-timer', v: 'neon', sub: true }),
  T_('timer-fire', 'challenge', 'Gift Timer Fire', 'مؤقت ناري', { view: 'gift-timer', v: 'fire', sub: true }),
  T_('wheel-neon', 'challenge', 'Lucky Wheel Neon', 'عجلة حظ تدور تلقائياً مع الهدايا', { view: 'wheel', v: 'neon', sub: true }),
  T_('wheel-gold', 'challenge', 'Lucky Wheel Gold', 'عجلة حظ ذهبية', { view: 'wheel', v: 'gold', sub: true }),
  T_('wheel-candy', 'challenge', 'Lucky Wheel Candy', 'عجلة حظ ملوّنة', { view: 'wheel', v: 'candy', sub: true }),
  T_('uchat-card', 'activity', 'Unified Chat Card', 'شات موحّد: تيك توك + تويتش مع شارة لكل منصة', { view: 'uchat', v: 'card' }),
  T_('uchat-clean', 'activity', 'Unified Chat Clean', 'شات موحّد شفاف بدون خلفية', { view: 'uchat', v: 'clean' }),
  T_('uchat-pill', 'activity', 'Unified Chat Pills', 'شات موحّد بفقاعات ملوّنة', { view: 'uchat', v: 'pill' }),
  T_('canvas-all', 'activity', 'All-in-One Canvas', 'شاشة شاملة بكل التراكبات في رابط واحد', { view: 'canvas', hidden: true }),
  T_('tts-reader', 'activity', 'TTS Reader', 'قارئ تعليقات صوتي', { view: 'tts', hidden: true }),
  T_('versus', 'challenge', 'Team Versus Neon', 'تحدي فريقين بالهدايا', { view: 'versus', v: 'neon', sub: true }),
  T_('versus-fire', 'challenge', 'Team Versus Fire', 'فريق ناري ضد فريق جليدي', { view: 'versus', v: 'fire', sub: true }),
  T_('versus-gold', 'challenge', 'Team Versus Royal', 'ذهبي ضد بنفسجي', { view: 'versus', v: 'gold', sub: true }),
  ...TAP_STYLES.map(([k, n]) => T_('taps-' + k, 'taps', n, 'عدّاد تكبيس يطلع للهدف: 1000 ثم 5000 ثم 10000', { view: 'taps', v: k })),
  ...['neon', 'glass', 'comic', 'cyber', 'minimal', 'gold'].map(k => T_('alerts-' + k, 'alerts', ALERT_STYLES[k], 'تنبيه هدايا ومتابعين واشتراكات', { view: 'alerts', v: k })),
  ...['neon', 'glass', 'cyber'].map(k => T_('follow-' + k, 'follow', 'Follow ' + ALERT_STYLES[k], 'تنبيه متابع جديد', { view: 'alerts', v: k, only: 'follow' })),
  ...['laser', 'liquid', 'coins', 'heartbeat', 'fire', 'hologram', 'lightning'].map(k => T_('alerts-' + k, 'alerts', ALERT_STYLES[k], 'تنبيه دعم بتصميم ' + ALERT_STYLES[k], { view: 'alerts', v: k })),
  ...['laser', 'coins', 'heartbeat', 'fire', 'hologram', 'lightning', 'liquid', 'gold', 'minimal', 'comic'].map(k => T_('follow-' + k, 'follow', 'Follow ' + ALERT_STYLES[k], 'تنبيه متابع جديد', { view: 'alerts', v: k, only: 'follow' })),
  ...Object.entries(LIKE_COLORS).map(([k, [n, c]]) => T_('likec-' + k, 'like', 'Likes ' + n, 'تنبيه إعجاب ملوّن', { view: 'alerts', v: k === 'hearts' ? 'heartbeat' : 'neon', only: 'like', c })),
  ...Object.entries(RAMADAN_STYLES).map(([k, [n, dh]]) => T_('ramadan-' + k, 'ramadan', n + (dh ? ' Dhikr Alert' : ' Alert'), dh ? 'تنبيه أذكار بتصميم ' + n : 'تنبيه رمضان كريم بتصميم ' + n, { view: 'alerts', v: k, txt: dh ? '{dhikr}' : k === 'eid' ? '🎉 عيدكم مبارك يا {user}' : '🌙 رمضان كريم يا {user}', c: '#f3c969' })),
  ...Object.entries(JAR_THEMES).map(([k, n]) => T_('jar-' + k, 'jar', n + ' Gift Jar', 'الحصالة: كل هدية تسقط داخل برطمان زجاجي وتتجمّع فيه مع فقاعة تبرع وأعلى داعم', { view: 'jar', v: k })),
  T_('fx-all', 'fx', 'Fireworks & Reactions', 'مؤثرات تفاعلية فوق البث: ألعاب نارية، قصاصات، مطر إيموجي، بالونات، برق… تنطلق حسب قواعد تحددها (هدية، متابعة، إعجابات، كلمة في الشات)', { view: 'fx', v: 'all' }),
  ...JAR_MORE.map(([v, n]) => T_('jar-' + v, 'jar', n, 'الحصالة: الهدايا تسقط داخل ' + n + ' وتتجمّع مع فقاعة تبرع وأعلى داعم', { view: 'jar', v })),
  ...Object.entries(RSCENES).map(([k, n]) => T_('rscene-' + k, 'ramadan', n + ' Ambience', 'أجواء رمضانية متحركة فوق البث', { view: 'rscene', v: k })),
  ...Object.entries(DHIKR_STYLES).map(([k, n]) => T_('dhikr-' + k, 'ramadan', n + ' Dhikr Loop', 'أذكار متحركة تتبدّل تلقائياً', { view: 'dhikr', v: k })),
  ...Object.entries(LASTSUP_STYLES).map(([k, a]) => T_('lastsup-' + k, 'lastsup', a[0] + ' Last Supporter', 'لوحة آخر داعم', { view: 'lastsup', v: k })),
  ...Object.entries(GOAL_THEMES).map(([k, a]) => T_('goalt-' + k, 'goal', a[0] + ' Goal', 'هدف بشكل ' + a[0], { view: 'goalt', v: k })),
  T_('like-burst', 'like', 'Like Burst', 'تنبيه الإعجابات', { view: 'alerts', v: 'comic', only: 'like' }),
  T_('like-hearts', 'like', 'Floating Hearts', 'قلوب تطير مع كل إعجاب', { view: 'hearts' }),
  T_('goal-bar', 'goal', 'Goal Neon', 'شريط هدف نيون', { view: 'goal-bar', v: 'neon' }),
  T_('goal-pill', 'goal', 'Goal Pill', 'شريط هدف كبسولة', { view: 'goal-bar', v: 'pill' }),
  T_('goal-segment', 'goal', 'Goal Segments', 'هدف بمقاطع', { view: 'goal-bar', v: 'segment' }),
  T_('goal-battery', 'goal', 'Goal Battery', 'هدف بشكل بطارية', { view: 'goal-bar', v: 'battery' }),
  T_('goal-ring', 'goal', 'Goal Ring', 'هدف دائري', { view: 'goal-bar', v: 'ring' }),
  ...Object.entries(TOP_THEMES).map(([k, [n]]) => T_('top-' + k, 'top', n, 'ترتيب أكثر المهدين • 5 مراكز', { view: 'top', v: k, mode: 'gifts', sub: true })),
  ...Object.entries(TOP_THEMES).map(([k, [n]]) => T_('likes-' + k, 'top', n + ' Likes', 'ترتيب أكثر المعجبين • 5 مراكز', { view: 'top', v: k, mode: 'likes' })),
  ...SOC_STYLES.map(([k, n]) => T_('social-' + k, 'social', n, 'روابط حساباتك تتبدّل على الشاشة', { view: 'social', v: k })),
  ...[['box', 'Chat Box'], ['neon', 'Chat Neon'], ['bubble', 'Chat Bubbles'], ['terminal', 'Chat Terminal']].map(([k, n]) => T_('chat-' + k, 'activity', n, 'عرض الشات فوق البث', { view: 'chat', v: k })),
  ...[['', 'Ticker Classic'], ['neon', 'Ticker Neon'], ['glass', 'Ticker Glass']].map(([k, n]) => T_('ticker' + (k ? '-' + k : ''), 'activity', n, 'شريط متحرك للأحداث والداعمين', { view: 'ticker', v: k })),
  T_('recent-list', 'activity', 'Recent Activity', 'قائمة آخر الأحداث', { view: 'recent', v: 'list' }),
  T_('recent-cards', 'activity', 'Recent Cards', 'بطاقات آخر الأحداث', { view: 'recent', v: 'cards' }),
  T_('counter-gifts', 'activity', 'Gifts Counter', 'عدّاد الهدايا', { view: 'counter', v: 'gifts' }),
  T_('counter-followers', 'activity', 'Followers Counter', 'عدّاد المتابعين', { view: 'counter', v: 'followers' }),
  T_('counter-likes', 'activity', 'Likes Counter', 'عدّاد الإعجابات', { view: 'counter', v: 'likes' }),
];
const CATS = [['all', 'المكتبة كاملة'], ['taps', 'التكبيس'], ['alerts', 'تنبيهات الهدايا'], ['follow', 'تنبيه متابعة'], ['like', 'تنبيه إعجاب'], ['goal', 'الأهداف'], ['top', 'الترتيب'],
  ['social', 'السوشيال'], ['challenge', 'تحدي'], ['activity', 'أحدث نشاط'], ['fx', 'المؤثرات والألعاب النارية'], ['jar', 'الحصالة'], ['ramadan', 'رمضان والأذكار'], ['lastsup', 'آخر داعم']];
// ---- Permanent overlay "slots": one OBS link per overlay type; the style is chosen in the dashboard ----
// seconds before a chat line fades away (0 = stays). Accounts saved before this existed (ttl 0, never touched) get the new 20s default.
const uchatTtl = (U) => (U && U.ttlSet) ? Math.max(0, +U.ttl || 0) : ((U && +U.ttl > 0) ? +U.ttl : 20);
// visible chat lines: 5 unless the streamer changed it (old accounts saved with the previous default 8 move to 5)
const uchatMax = (U) => (U && U.maxSet) ? Math.max(1, +U.max || 5) : 5;
const slotKey = (t) => [t.view, t.mode || t.only || (t.view === 'counter' ? t.v : '')].filter(Boolean).join(':');
const SLOT_LABELS = { 'gift-rocket': 'صاروخ الهدايا', 'gift-timer': 'مؤقت الهدايا', versus: 'تحدي الفريقين', alerts: 'تنبيهات الهدايا والمتابعين', 'alerts:follow': 'تنبيه المتابعة', 'alerts:like': 'تنبيه الإعجاب',
  wheel: 'عجلة الحظ', canvas: 'الشاشة الشاملة (رابط واحد)', tts: 'قارئ التعليقات الصوتي', uchat: 'الشات الموحّد (تيك توك + تويتش)', hearts: 'قلوب الإعجاب', taps: 'عدّاد التكبيس (1000، 5000…)', 'goal-bar': 'شريط الهدف', goalt: 'هدف بثيمة', fx: 'المؤثرات والألعاب النارية', jar: 'الحصالة (الهدايا تتجمع)', rscene: 'أجواء رمضان', dhikr: 'أذكار متحركة', lastsup: 'آخر داعم', 'top:gifts': 'ترتيب المهدين', 'top:likes': 'ترتيب المعجبين', social: 'روابط السوشيال', chat: 'الشات', ticker: 'الشريط المتحرك', recent: 'آخر الأحداث',
  'counter:gifts': 'عدّاد الهدايا', 'counter:followers': 'عدّاد المتابعين', 'counter:likes': 'عدّاد الإعجابات' };
const SLOTS = [...new Set(TEMPLATES.map(slotKey))];

// ---- Text-to-speech with the streamer's settings (used by the TTS reader overlay and the dashboard test) ----
const TTS_LANGS = { 'ar-SA': 'عربي - السعودية', 'ar-EG': 'عربي - مصر', 'ar-AE': 'عربي - الإمارات', 'ar-JO': 'عربي - الأردن', 'ar-LB': 'عربي - لبنان', 'ar-MA': 'عربي - المغرب', 'ar-DZ': 'عربي - الجزائر', 'ar-IQ': 'عربي - العراق', 'en-US': 'English' };
function speakWith(text, o = {}, onend) {
  try {
    if (!window.speechSynthesis) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = o.lang || (/[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'en-US'); u.rate = +o.rate || 1; u.pitch = o.pitch == null ? 1 : +o.pitch; u.volume = o.volume == null ? 1 : +o.volume;
    if (o.voice) { const v = speechSynthesis.getVoices().find(x => x.name === o.voice || x.voiceURI === o.voice); if (v) u.voice = v; }
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u); return true;
  } catch { return false; }
}
// decides whether a chat message gets read aloud: returns { read, text, why }
function ttsDecision(ev, o) {
  const text = String(ev.text || '').trim();
  if (!o.on) return { read: false, why: 'القارئ متوقف' };
  if (!text) return { read: false, why: 'رسالة فارغة' };
  if (o.scope === 'subs' && !ev.sub) return { read: false, why: 'مو مشترك (القراءة للمشتركين فقط)' };
  if (o.scope === 'supporters' && !ev.supporter) return { read: false, why: 'ما أرسل هدية (القراءة للداعمين فقط)' };
  if (o.ignoreCmds && text.startsWith('!')) return { read: false, why: 'أمر يبدأ بـ !' };
  const bad = String(o.banned || '').split(/[,،\n]/).map(s => s.trim().toLowerCase()).filter(Boolean).find(w => text.toLowerCase().includes(w));
  if (bad) return { read: false, why: 'فيه كلمة محظورة: ' + bad };
  const body = text.slice(0, +o.maxLen || 120);
  return { read: true, text: o.readName ? `${ev.user} يقول: ${body}` : body };
}

// ---- game bridge: which rules does one event trigger? (the local bridge program uses the same logic) ----
function gameRulesFor(ev, g) {
  const out = [];
  for (const r of (g && g.rules) || []) {
    if (r.on === false || r.event !== ev.type) continue;
    if (r.platform && r.platform !== 'any' && (ev.platform || 'tiktok') !== r.platform) continue; // a rule can be limited to TikTok or Twitch
    const m = String(r.match || '').trim().toLowerCase();
    if (r.event === 'gift') { if (m && String(ev.gift || '').toLowerCase() !== m) continue; if ((ev.diamonds || 0) < (+r.min || 0)) continue; }
    else if (r.event === 'like') { if ((ev.count || 1) < (+r.min || 0)) continue; }
    else if (r.event === 'chat') { const first = String(ev.text || '').trim().split(/\s+/)[0].toLowerCase(); if (m && first !== m) continue; }
    out.push({ ...r, timesNow: r.perCount ? Math.max(1, Math.min(20, ev.count || 1)) : (+r.times || 1) });
  }
  return out;
}

// ---- Cloud TTS: MP3 generated by our server (neural Arabic voices) and played through a real <audio> element, so it also works inside OBS.
// The browser's Web Speech voice is only the fallback (offline, server error, or chosen explicitly). ----
const CV_NAMES = { Hamed: 'حامد', Zariyah: 'زارية', Shakir: 'شاكر', Salma: 'سلمى', Hamdan: 'حمدان', Fatima: 'فاطمة', Taim: 'تيم', Sana: 'سناء', Fahed: 'فهد', Noura: 'نورة', Rami: 'رامي', Layla: 'ليلى', Jamal: 'جمال', Mouna: 'منى', Bassel: 'باسل', Rana: 'رنا', Moaz: 'معاذ', Amal: 'أمل', Abdullah: 'عبدالله', Aysha: 'عائشة', Ismael: 'إسماعيل', Amina: 'أمينة', Ali: 'علي', Laila: 'ليلى', Omar: 'عمر', Iman: 'إيمان', Laith: 'ليث', Amany: 'أماني', Hedi: 'هادي', Reem: 'ريم', Saleh: 'صالح', Maryam: 'مريم', Aria: 'Aria' };
const CV_COUNTRY = { SA: 'السعودية', EG: 'مصر', AE: 'الإمارات', JO: 'الأردن', KW: 'الكويت', LB: 'لبنان', MA: 'المغرب', IQ: 'العراق', QA: 'قطر', OM: 'عُمان', DZ: 'الجزائر', BH: 'البحرين', LY: 'ليبيا', SY: 'سوريا', TN: 'تونس', YE: 'اليمن', US: 'English' };
const CV_MALE = ['Hamed', 'Shakir', 'Hamdan', 'Taim', 'Fahed', 'Rami', 'Jamal', 'Bassel', 'Moaz', 'Abdullah', 'Ismael', 'Ali', 'Omar', 'Laith', 'Hedi', 'Saleh'];
const CLOUD_VOICES = ['ar-SA-HamedNeural', 'ar-SA-ZariyahNeural', 'ar-EG-ShakirNeural', 'ar-EG-SalmaNeural', 'ar-AE-HamdanNeural', 'ar-AE-FatimaNeural', 'ar-JO-TaimNeural', 'ar-JO-SanaNeural', 'ar-KW-FahedNeural', 'ar-KW-NouraNeural',
  'ar-LB-RamiNeural', 'ar-LB-LaylaNeural', 'ar-MA-JamalNeural', 'ar-MA-MounaNeural', 'ar-IQ-BasselNeural', 'ar-IQ-RanaNeural', 'ar-QA-MoazNeural', 'ar-QA-AmalNeural', 'ar-OM-AbdullahNeural', 'ar-OM-AyshaNeural',
  'ar-DZ-IsmaelNeural', 'ar-DZ-AminaNeural', 'ar-BH-AliNeural', 'ar-BH-LailaNeural', 'ar-LY-OmarNeural', 'ar-LY-ImanNeural', 'ar-SY-LaithNeural', 'ar-SY-AmanyNeural', 'ar-TN-HediNeural', 'ar-TN-ReemNeural', 'ar-YE-SalehNeural', 'ar-YE-MaryamNeural', 'en-US-AriaNeural']
  .map((id) => { const [, cc, rest] = id.split('-'), nm = rest.replace('Neural', ''); return { id, male: CV_MALE.includes(nm), label: `${CV_NAMES[nm] || nm} (${CV_COUNTRY[cc] || cc}) ${CV_MALE.includes(nm) ? '♂' : '♀'}` }; });
const SG_TTS_LOG = []; // recent outcomes: { engine: 'cloud'|'browser', ... }
const _ttsQ = []; let _ttsBusy = false;
const ttsBase = () => window.SG_TTS_BASE || '/api/tts'; // overlays set this to /tts/<token>; the dashboard uses the logged-in route
const ttsOpts = (o) => o || window.SG_TTS_OPTS || (typeof me !== 'undefined' && me && me.cfg && me.cfg.tts) || {};
function speakAuto(text, o, onend) {
  o = ttsOpts(o);
  if (o.engine === 'browser') { SG_TTS_LOG.push({ engine: 'browser', why: 'chosen' }); return speakWith(text, o, onend); }
  _ttsQ.push({ text: String(text).slice(0, 300), o, onend }); if (_ttsQ.length > 8) _ttsQ.shift(); // a busy chat must not build a long backlog
  _ttsPump(); return true;
}
async function _ttsPump() {
  if (_ttsBusy) return; _ttsBusy = true;
  while (_ttsQ.length) {
    const { text, o, onend } = _ttsQ.shift();
    try {
      const qs = new URLSearchParams({ text, voice: o.cloudVoice || 'ar-SA-HamedNeural', rate: o.rate || 1, pitch: o.pitch == null ? 1 : o.pitch }).toString();
      const r = await fetch(ttsBase() + (ttsBase().includes('?') ? '&' : '?') + qs);
      if (!r.ok) { const e = new Error('tts http ' + r.status); e.status = r.status; throw e; }
      const blob = await r.blob(), a = new Audio(URL.createObjectURL(blob));
      a.volume = o.volume == null ? 1 : Math.max(0, Math.min(1, +o.volume));
      await new Promise((ok, bad) => { a.onended = ok; a.onerror = () => bad(new Error('audio error')); a.play().catch(bad); });
      URL.revokeObjectURL(a.src); SG_TTS_LOG.push({ engine: 'cloud', voice: o.cloudVoice, bytes: blob.size });
    } catch (e) {
      SG_TTS_LOG.push({ engine: 'browser', why: e.message, status: e.status || 0 }); // fall back to the Web Speech voice
      if (e.status === 402 && typeof openPricing === 'function') openPricing('الصوت السحابي ميزة PRO');
      await new Promise((ok) => { if (!speakWith(text, o, ok)) ok(); });
    }
    if (onend) try { onend(); } catch {}
  }
  _ttsBusy = false;
}