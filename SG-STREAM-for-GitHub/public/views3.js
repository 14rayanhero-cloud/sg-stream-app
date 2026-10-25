// Dashboard pages: all-in-one canvas, lucky wheel, TTS reader, game bridge, control deck.
// Loaded after ui.js and views2.js (uses me, api, fire, emit, saveCfg, EXTRA, copy, toast, ovUrl, ...).

(function injectStyle() {
  const s = document.createElement('style');
  s.textContent = `.cstage{position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--line);background:#05070e repeating-conic-gradient(#0a0f1d 0 25%,#070a14 0 50%) 0 0/24px 24px;margin:0 auto}
  .cstage iframe{position:absolute;left:0;top:0;border:0;transform-origin:0 0;pointer-events:none;background:transparent}
  .cstage .handle{z-index:5} .dk.tw{background:linear-gradient(160deg,#2a1a4d,#150f2e);border-color:#9146ff88}`;
  document.head.appendChild(s);
})();

const live = () => { store.set('lsx-cfg', me.cfg); emit({ type: 'config', cfg: me.cfg }); }; // update previews instantly, without waiting for the server

// =====================================================================
// ✨ All-in-One Canvas
// =====================================================================
const LAYER_NAMES = { goal: '🎯 شريط الهدف', taps: '❤️ عدّاد التكبيس', top: '🏆 قائمة المتصدرين', alerts: '🔔 تنبيهات الهدايا', social: '🔗 السوشيال', ticker: '📜 الشريط المتحرك', chat: '💬 الشات', recent: '🕒 آخر الأحداث' };
// where each layer sits before any offset, in canvas pixels: [x, y, w, h, originX, originY]
const layerBox = (k, W, H) => ({ goal: [20, 20, 580, 110, 20, 20], taps: [20, 20, 580, 135, 20, 20], top: [20, 20, 340, 280, 20, 20], alerts: [W / 2 - 380, 70, 760, 150, W / 2, 20], social: [W / 2 - 210, 30, 420, 70, W / 2, 20],
  ticker: [0, H - 58, W, 58, W / 2, H], chat: [20, 20, 400, 380, 20, 20], recent: [20, 20, 320, 300, 20, 20] })[k];

EXTRA.allinone = (m) => {
  const C = me.cfg.canvas, mode = C.mode, L = C.layouts[mode], [W, H] = mode === '9:16' ? [1080, 1920] : [1920, 1080];
  m.innerHTML = `<h2>✨ الشاشة الشاملة (All-in-One Canvas)</h2>
    <div class="sub">فعّل ورتّب كل التراكبات في شاشة واحدة، وانسخ <b>رابط OBS واحد</b> يغنيك عن نسخ عدة روابط. اسحب أي طبقة بالفأرة لتحريكها.</div>
    <div class="row" style="margin-bottom:14px"><div class="seg" style="min-width:340px"><button data-m="16:9" class="${mode === '16:9' ? 'on' : ''}">🖥️ شاشة الكمبيوتر 16:9</button><button data-m="9:16" class="${mode === '9:16' ? 'on' : ''}">📱 بث طولي 9:16</button></div></div>
    <div class="canvasbox">
      <div class="panel"><h3>المعاينة</h3><div class="cstage" id="cs"><iframe id="cs-f" src="overlay.html?slot=canvas&m=${encodeURIComponent(mode)}"></iframe></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-fire="gift">🎁 هدية</button><button class="btn ghost sm" data-fire="follow">➕ متابع</button><button class="btn ghost sm" data-fire="like100">❤️ 100 تكبيسة</button><button class="btn ghost sm" data-fire="reset">↺ تصفير</button></div></div>
      <div class="panel"><h3>الطبقات</h3><div id="layers"></div></div>
    </div>
    <div class="panel"><h3>رابط OBS الشامل</h3><code>${ovUrl('canvas-all')}</code>
      <div class="row"><button class="btn glow sm" id="cv-copy">🔗 نسخ رابط OBS</button><span class="sub" style="margin:0">أضفه كـ Browser Source بمقاس <b dir="ltr">${W}×${H}</b>. تغييرات الترتيب والتفعيل تنعكس فيه تلقائياً بدون ما تغيّر الرابط.</span></div></div>`;

  const stage = m.querySelector('#cs'), frame = m.querySelector('#cs-f'), layersBox = m.querySelector('#layers');
  const fit = () => {
    const maxW = mode === '9:16' ? Math.min(380, stage.parentElement.clientWidth - 36) : stage.parentElement.clientWidth - 36, k = maxW / W;
    stage.style.width = maxW + 'px'; stage.style.height = H * k + 'px';
    frame.style.width = W + 'px'; frame.style.height = H + 'px'; frame.style.transform = `scale(${k})`;
    drawHandles();
  };
  function drawHandles() {
    stage.querySelectorAll('.handle').forEach(h => h.remove());
    const k = stage.clientWidth / W;
    L.order.forEach((key) => {
      const l = L.layers[key]; if (!l.on) return;
      const [bx, by, bw, bh, ox, oy] = layerBox(key, W, H);
      const x = ox + (bx - ox) * l.s + l.x, y = oy + (by - oy) * l.s + l.y, w = bw * l.s, h = bh * l.s;
      const d = document.createElement('div'); d.className = 'handle'; d.dataset.k = key; d.textContent = LAYER_NAMES[key];
      d.style.cssText = `left:${x * k}px;top:${y * k}px;width:${w * k}px;height:${h * k}px`;
      d.onpointerdown = (e) => {
        e.preventDefault(); d.setPointerCapture(e.pointerId);
        const sx = e.clientX, sy = e.clientY, x0 = l.x, y0 = l.y;
        d.onpointermove = (ev) => { l.x = Math.round(x0 + (ev.clientX - sx) / k); l.y = Math.round(y0 + (ev.clientY - sy) / k); live(); const [bx2, by2] = [ox + (bx - ox) * l.s + l.x, oy + (by - oy) * l.s + l.y]; d.style.left = bx2 * k + 'px'; d.style.top = by2 * k + 'px'; };
        d.onpointerup = () => { d.onpointermove = null; d.onpointerup = null; saveCfg(); drawList(); };
      };
      stage.appendChild(d);
    });
  }
  function drawList() {
    layersBox.innerHTML = [...L.order].reverse().map((key) => { const l = L.layers[key]; return `<div class="layer" data-k="${key}">
      <input type="checkbox" ${l.on ? 'checked' : ''} data-on style="width:auto;margin:0">
      <div><b>${LAYER_NAMES[key]}</b><div class="row" style="margin-top:6px"><small>الحجم</small><input type="range" min="40" max="200" value="${Math.round(l.s * 100)}" data-s style="width:90px;padding:0;margin:0;accent-color:#9d4edd"><small dir="ltr">X</small><input type="number" value="${l.x}" data-x style="width:62px;margin:0;padding:4px"><small dir="ltr">Y</small><input type="number" value="${l.y}" data-y style="width:62px;margin:0;padding:4px"></div></div>
      <div class="row" style="flex-direction:column;gap:4px"><button class="btn ghost sm" data-up title="للأمام">▲</button><button class="btn ghost sm" data-down title="للخلف">▼</button></div></div>`; }).join('');
    layersBox.querySelectorAll('.layer').forEach((el) => {
      const key = el.dataset.k, l = L.layers[key];
      const upd = () => { live(); drawHandles(); };
      el.querySelector('[data-on]').onchange = (e) => { l.on = e.target.checked; upd(); saveCfg(); };
      el.querySelector('[data-s]').oninput = (e) => { l.s = +e.target.value / 100; upd(); };
      el.querySelector('[data-s]').onchange = () => saveCfg();
      el.querySelector('[data-x]').onchange = (e) => { l.x = +e.target.value || 0; upd(); saveCfg(); };
      el.querySelector('[data-y]').onchange = (e) => { l.y = +e.target.value || 0; upd(); saveCfg(); };
      const move = (dir) => { const i = L.order.indexOf(key), j = i + dir; if (j < 0 || j >= L.order.length) return; [L.order[i], L.order[j]] = [L.order[j], L.order[i]]; live(); saveCfg(); drawList(); drawHandles(); };
      el.querySelector('[data-up]').onclick = () => move(1); el.querySelector('[data-down]').onclick = () => move(-1);
    });
  }
  m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { C.mode = b.dataset.m; live(); saveCfg(); EXTRA.allinone(m); });
  m.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { const k = b.dataset.fire; fire(k === 'like100' ? { type: 'like', user: pick(), count: 100 } : k === 'reset' ? { type: 'reset' } : SAMPLES[k]()); });
  m.querySelector('#cv-copy').onclick = () => { store.set('lsx-obs', true); copyLink(ovUrl('canvas-all'), '✅ تم نسخ الرابط الشامل! ضعه في متصفح OBS'); };
  store.set('lsx-cfg', me.cfg); fit(); drawList(); addEventListener('resize', fit, { once: true });
};

// =====================================================================
// 🎡 Lucky wheel
// =====================================================================
const WHEEL_PRESETS = {
  fun: [['تحدي رقص 💃', '#ff2d8a'], ['ماء بارد 🧊', '#00F0FF'], ['غنّي أغنية 🎤', '#9d4edd'], ['جائزة مفاجأة 🎁', '#fbbf24'], ['ادعُ لمتابع 🙏', '#34d399'], ['حظ أوفر 😅', '#64748b']],
  prizes: [['100 نقطة 🏅', '#fbbf24'], ['هدية صغيرة 🎁', '#ff2d8a'], ['شاوتّ في البث 📣', '#00F0FF'], ['اسمك على الشاشة ✨', '#9d4edd'], ['لا شيء 😬', '#64748b'], ['جائزة كبرى 💎', '#34d399']],
  rules: [['ما تضحك دقيقة 😐', '#ff2d8a'], ['تتكلم بدون حرف الألف 🤐', '#00F0FF'], ['تقلّد صوت حيوان 🐑', '#9d4edd'], ['تتحدث بلهجة ثانية 🗣️', '#fbbf24'], ['تحط قناع 😎', '#34d399'], ['تعيد الجولة 🔁', '#64748b']],
};
EXTRA.wheel = (m) => {
  const w = me.cfg.wheel, curTpl = TEMPLATES.find(x => x.id === slotCur('wheel')) || TEMPLATES.find(x => x.view === 'wheel');
  store.set('lsx-cfg', me.cfg);
  m.innerHTML = `<h2>🎡 عجلة الحظ والتحديات</h2><div class="sub">عجلة تدور تلقائياً لما توصل هدية محددة، فيها الأحكام أو الجوائز اللي تكتبها. جرّب التدوير هنا وشوف النتيجة.</div>
    <div class="canvasbox">
      <div class="panel"><h3>المعاينة</h3><div class="cstage" id="ws"><iframe id="ws-f" src="overlay.html?slot=wheel"></iframe></div>
        <div class="row" style="margin-top:12px"><button class="btn glow sm" id="w-spin">🎡 تدوير تجريبي</button><button class="btn ghost sm" id="w-gift">🎁 أرسل هدية تشغّل العجلة</button></div></div>
      <div class="panel"><h3>الإعدادات</h3><div class="ctl" style="grid-template-columns:1fr">
        <label>عنوان العجلة<input id="w-title" value="${esc(w.title)}"></label>
        <label>شكل العجلة<select id="w-style">${TEMPLATES.filter(x => x.view === 'wheel').map(x => `<option value="${x.id}" ${x.id === curTpl.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="w-auto" ${w.auto ? 'checked' : ''} style="width:auto"> تدور تلقائياً عند وصول الهدية</label>
        <label>اسم الهدية اللي تشغّل العجلة (اتركه فاضي = أي هدية)<input id="w-gift-name" dir="ltr" value="${esc(w.gift)}" placeholder="Rose"></label>
        <label>أقل قيمة للهدية (ألماس)<input id="w-min" type="number" min="0" value="${+w.min || 0}"></label>
        <label>مهلة بين كل تدويرتين (ثانية)<input id="w-cd" type="number" min="0" value="${+w.cooldown || 0}"></label>
        <label>صوت الفوز<select id="w-sound">${opts(SOUNDS, w.sound)}</select></label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="w-tts" ${w.tts ? 'checked' : ''} style="width:auto"> قراءة النتيجة بصوت عالٍ (TTS)</label></div></div>
    </div>
    <div class="panel"><h3>الأحكام / الجوائز (حتى 12)</h3>
      <div class="row" style="margin-bottom:10px"><span class="sub" style="margin:0">قوالب جاهزة:</span><button class="btn ghost sm" data-pre="fun">تحديات مضحكة</button><button class="btn ghost sm" data-pre="prizes">جوائز</button><button class="btn ghost sm" data-pre="rules">أحكام</button></div>
      <div class="seglist" id="w-segs"></div><div class="row" style="margin-top:10px"><button class="btn ghost sm" id="w-add">+ إضافة خانة</button></div></div>
    ${obsBlock('wheel-neon')}`;
  const stage = m.querySelector('#ws'), frame = m.querySelector('#ws-f'), segs = m.querySelector('#w-segs');
  const fit = () => { const k = Math.min(1, (stage.parentElement.clientWidth - 36) / 700); stage.style.width = 700 * k + 'px'; stage.style.height = 640 * k + 'px'; frame.style.width = '700px'; frame.style.height = '640px'; frame.style.transform = `scale(${k})`; };
  fit();
  const drawSegs = () => {
    segs.innerHTML = w.segments.map((s, i) => `<div class="r"><input data-t="${i}" value="${esc(s.t)}" maxlength="40"><input type="color" data-c="${i}" value="${s.c}"><button class="btn ghost sm" data-d="${i}" ${w.segments.length <= 2 ? 'disabled' : ''}>🗑</button></div>`).join('');
    segs.querySelectorAll('[data-t]').forEach(e => e.oninput = () => { w.segments[e.dataset.t].t = e.value; live(); });
    segs.querySelectorAll('[data-t]').forEach(e => e.onchange = () => saveCfg());
    segs.querySelectorAll('[data-c]').forEach(e => e.oninput = () => { w.segments[e.dataset.c].c = e.value; live(); });
    segs.querySelectorAll('[data-c]').forEach(e => e.onchange = () => saveCfg());
    segs.querySelectorAll('[data-d]').forEach(e => e.onclick = () => { w.segments.splice(e.dataset.d, 1); live(); saveCfg(); drawSegs(); });
  };
  drawSegs();
  const COLORS = ['#ff2d8a', '#00F0FF', '#9d4edd', '#fbbf24', '#34d399', '#f97316', '#60a5fa', '#f43f5e'];
  m.querySelector('#w-add').onclick = () => { if (w.segments.length >= 12) { toast('الحد الأقصى 12 خانة', 'warn'); return; } w.segments.push({ t: 'خانة جديدة', c: COLORS[w.segments.length % COLORS.length] }); live(); saveCfg(); drawSegs(); };
  m.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { w.segments = WHEEL_PRESETS[b.dataset.pre].map(([t, c]) => ({ t, c })); live(); saveCfg(); drawSegs(); });
  bind('w-title', e => w.title = e.value); bind('w-auto', e => w.auto = e.checked, 'change'); bind('w-gift-name', e => w.gift = e.value.trim());
  bind('w-min', e => w.min = +e.value || 0); bind('w-cd', e => w.cooldown = +e.value || 0); bind('w-sound', e => { w.sound = e.value; playSound(w.sound); }, 'change'); bind('w-tts', e => w.tts = e.checked, 'change');
  m.querySelector('#w-style').onchange = (e) => { useTpl(TEMPLATES.find(x => x.id === e.target.value)); toast('تم تغيير شكل العجلة'); setTimeout(() => { if (view === 'wheel') frame.contentWindow.location.reload(); }, 600); };
  m.querySelector('#w-spin').onclick = () => fire({ type: 'spin' });
  m.querySelector('#w-gift').onclick = () => fire({ type: 'gift', user: pick(), gift: w.gift || 'Rose', count: 1, diamonds: Math.max(1, +w.min || 1) });
  obsCopy(m, 'wheel-neon');
};

// =====================================================================
// 🔊 TTS reader
// =====================================================================
EXTRA.tts = (m) => {
  const t = me.cfg.tts;
  m.innerHTML = `<h2>🔊 القراءة الصوتية (TTS)</h2><div class="sub">يقرأ تعليقات المشاهدين بصوت عالٍ أثناء بثك. تتحكم بمن يُقرأ له، والصوت، والسرعة، والكلمات المحظورة.</div>
    <div class="panel"><div class="ctl">
      <label class="row" style="color:var(--txt);align-self:end"><input type="checkbox" id="t-on" ${t.on ? 'checked' : ''} style="width:auto"> القارئ مفعّل</label>
      <label>من يُقرأ له<select id="t-scope">${opts({ all: 'الكل', subs: 'المشتركين فقط', supporters: 'الداعمين فقط (أرسلوا هدية)' }, t.scope)}</select></label>
      <label>محرّك الصوت<select id="t-engine">${opts({ cloud: '☁️ صوت سحابي عصبي (يشتغل داخل OBS)', browser: '🔈 صوت المتصفح / ويندوز' }, t.engine || 'cloud')}</select></label>
      <label>الصوت السحابي (32 صوتاً عربياً)<select id="t-cv">${CLOUD_VOICES.map(v => `<option value="${v.id}" ${v.id === (t.cloudVoice || 'ar-SA-HamedNeural') ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      <label>اللهجة (لصوت المتصفح)<select id="t-lang">${opts(TTS_LANGS, t.lang)}</select></label>
      <label>صوت المتصفح (الاحتياطي)<select id="t-voice"></select></label>
      <label>مستوى الصوت <b id="t-vv"></b><input type="range" id="t-vol" min="0" max="100"></label>
      <label>السرعة <b id="t-rv"></b><input type="range" id="t-rate" min="50" max="200"></label>
      <label>حدّة الصوت <b id="t-pv"></b><input type="range" id="t-pitch" min="0" max="200"></label>
      <label>أقصى طول للرسالة (حرف)<input id="t-max" type="number" min="20" max="300" value="${+t.maxLen || 120}"></label>
      <label class="row" style="color:var(--txt);align-self:end"><input type="checkbox" id="t-name" ${t.readName ? 'checked' : ''} style="width:auto"> قراءة اسم المشاهد قبل رسالته</label>
      <label class="row" style="color:var(--txt);align-self:end"><input type="checkbox" id="t-cmd" ${t.ignoreCmds ? 'checked' : ''} style="width:auto"> تجاهل الأوامر (اللي تبدأ بـ !)</label>
      <label style="grid-column:1/-1">الكلمات المحظورة (مفصولة بفاصلة أو سطر جديد)<textarea id="t-ban" rows="3">${esc(t.banned)}</textarea></label></div>
      <div id="t-novoice" class="sub" style="margin:10px 0 0;color:#fbbf24"></div></div>
    <div class="panel"><h3>جرّب الصوت</h3>
      <div class="row"><button class="btn glow sm" id="t-test">🔊 سماع صوت تجريبي</button><span class="sub" id="t-testmsg" style="margin:0"></span></div>
      <h3 style="margin-top:18px">اختبر رسالة مشاهد</h3>
      <div class="row"><input id="tt-user" value="سارة" style="width:130px;margin:0"><input id="tt-text" value="مرحبا بالجميع، بث رائع" style="flex:1;min-width:200px;margin:0">
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="tt-sub" style="width:auto"> مشترك</label><label class="row" style="color:var(--txt)"><input type="checkbox" id="tt-sup" style="width:auto"> داعم</label>
        <button class="btn ghost sm" id="tt-go">هل تنقرأ؟</button></div>
      <div id="tt-res" class="msg" style="margin-top:10px;display:none"></div></div>
    <div class="panel"><h3>تشغيل القارئ</h3>
      <div class="sub" style="margin-top:0">لازم يكون القارئ مفتوح عشان يقرأ. اختر طريقة:</div>
      <div class="row"><button class="btn glow sm" id="t-open">▶ فتح القارئ في تبويب (أسهل)</button></div>
      <p class="sub" style="margin:12px 0 4px">أو أضفه في OBS كـ Browser Source، وفعّل <b>«التحكم بالصوت عبر OBS»</b>:</p><code>${ovUrl('tts-reader')}</code><button class="btn ghost sm" id="t-copy">نسخ الرابط</button>
      <p class="sub" style="margin:10px 0 0">ملاحظة: صوت القراءة يعتمد على الأصوات المثبّتة في ويندوز. داخل OBS قد لا تتوفر أصوات (حسب نسخته)، فالتبويب أضمن.</p></div>`;
  const q = (s) => m.querySelector(s);
  const fillVoices = () => {
    const sel = q('#t-voice'), voices = (window.speechSynthesis ? speechSynthesis.getVoices() : []), pre = t.lang.split('-')[0];
    const list = voices.filter(v => v.lang.toLowerCase().startsWith(pre));
    sel.innerHTML = `<option value="">الصوت الافتراضي</option>` + (list.length ? list : voices).map(v => `<option value="${esc(v.name)}" ${v.name === t.voice ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
    q('#t-novoice').textContent = !voices.length ? 'ما لقيت أصوات في المتصفح بعد، انتظر ثانية أو حدّث الصفحة.' : !list.length ? `ما فيه صوت لهذه اللهجة في جهازك، تقدر تضيفها من إعدادات ويندوز (الوقت واللغة ← الكلام)، وبتظهر هنا كل الأصوات المتاحة.` : '';
  };
  fillVoices(); if (window.speechSynthesis) speechSynthesis.onvoiceschanged = fillVoices;
  const sync = () => { q('#t-vol').value = Math.round(t.volume * 100); q('#t-vv').textContent = Math.round(t.volume * 100) + '%'; q('#t-rate').value = Math.round(t.rate * 100); q('#t-rv').textContent = t.rate.toFixed(2) + '×'; q('#t-pitch').value = Math.round(t.pitch * 100); q('#t-pv').textContent = t.pitch.toFixed(2); };
  sync();
  bind('t-on', e => t.on = e.checked, 'change'); bind('t-scope', e => t.scope = e.value, 'change'); bind('t-engine', e => t.engine = e.value, 'change'); bind('t-cv', e => t.cloudVoice = e.value, 'change');
  bind('t-lang', e => { t.lang = e.value; t.voice = ''; fillVoices(); }, 'change'); bind('t-voice', e => t.voice = e.value, 'change');
  bind('t-vol', e => { t.volume = +e.value / 100; sync(); }); bind('t-rate', e => { t.rate = +e.value / 100; sync(); }); bind('t-pitch', e => { t.pitch = +e.value / 100; sync(); });
  bind('t-max', e => t.maxLen = Math.max(20, Math.min(300, +e.value || 120))); bind('t-name', e => t.readName = e.checked, 'change'); bind('t-cmd', e => t.ignoreCmds = e.checked, 'change'); bind('t-ban', e => t.banned = e.value);
  q('#t-test').onclick = async () => {
    const n0 = SG_TTS_LOG.length, msg = q('#t-testmsg'); msg.textContent = '🔊 جاري توليد الصوت…';
    speakAuto(t.readName ? 'سارة يقول: مرحبا بكم في البث، هذا صوت تجريبي' : 'مرحبا بكم في البث، هذا صوت تجريبي', t);
    for (let i = 0; i < 48 && SG_TTS_LOG.length === n0; i++) await new Promise(r => setTimeout(r, 250));
    const l = SG_TTS_LOG[SG_TTS_LOG.length - 1] || {};
    msg.textContent = l.engine === 'cloud' ? '☁️ صوت سحابي: ' + ((CLOUD_VOICES.find(v => v.id === l.voice) || {}).label || l.voice) : l.why === 'chosen' ? '🔈 صوت المتصفح' : '🔈 احتياطي (صوت المتصفح) لأن: ' + (l.status === 402 ? 'الصوت السحابي ميزة PRO' : l.status === 429 ? 'كثرة طلبات، انتظر شوي' : (l.why || 'لا يوجد اتصال'));
  };
  q('#tt-go').onclick = () => {
    const ev = { user: q('#tt-user').value || 'مشاهد', text: q('#tt-text').value, sub: q('#tt-sub').checked, supporter: q('#tt-sup').checked }, d = ttsDecision(ev, t), box = q('#tt-res');
    box.style.display = 'block'; box.textContent = d.read ? `✅ ينقرأ: «${d.text}»` : `🚫 ما ينقرأ: ${d.why}`; if (d.read) speakAuto(d.text, t);
  };
  q('#t-open').onclick = () => { const w = window.open(ovUrl('tts-reader'), '_blank'); if (!w) toast('المتصفح منع النافذة، اسمح بالنوافذ المنبثقة', 'warn'); else toast('تم فتح القارئ. اضغط فيه «تفعيل الصوت» وخله مفتوح أثناء البث'); };
  q('#t-copy').onclick = (e) => { store.set('lsx-obs', true); copy(ovUrl('tts-reader'), e.target); };
};

// =====================================================================
// 🎮 Interactive game bridge
// =====================================================================
const GAME_KEYS = ['SPACE', 'ENTER', 'SHIFT', 'CTRL', 'ALT', 'TAB', 'ESC', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'LMB', 'RMB', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), ...'0123456789'.split(''), ...Array.from({ length: 12 }, (_, i) => 'F' + (i + 1))];
const GAME_EV = { gift: 'هدية', like: 'تكبيس', follow: 'متابعة', sub: 'اشتراك', share: 'مشاركة', chat: 'تعليق/أمر', join: 'دخول', raid: 'غارة (Twitch / Kick)' };
// example mappings: keys follow each game's default controls, so edit them to match your own settings
const GAME_PRESETS = {
  gta: { name: 'GTA V', rules: [
    { label: 'وردة = قفز', event: 'gift', match: 'Rose', min: 0, key: 'SPACE', hold: 150, times: 1, perCount: false },
    { label: 'قلب = منبّه السيارة', event: 'gift', match: 'Heart', min: 0, key: 'H', hold: 400, times: 1, perCount: false },
    { label: 'أسد = الخروج من السيارة', event: 'gift', match: 'Lion', min: 0, key: 'F', hold: 150, times: 1, perCount: false },
    { label: 'كل 50 تكبيسة = يمشي للأمام', event: 'like', match: '', min: 50, key: 'W', hold: 1200, times: 1, perCount: false },
    { label: 'متابع جديد = إعادة تحميل', event: 'follow', match: '', min: 0, key: 'R', hold: 120, times: 1, perCount: false } ] },
  minecraft: { name: 'Minecraft', rules: [
    { label: 'وردة = قفز', event: 'gift', match: 'Rose', min: 0, key: 'SPACE', hold: 150, times: 1, perCount: true },
    { label: 'قلب = رمي الغرض', event: 'gift', match: 'Heart', min: 0, key: 'Q', hold: 120, times: 1, perCount: false },
    { label: 'أسد = فتح الحقيبة', event: 'gift', match: 'Lion', min: 0, key: 'E', hold: 150, times: 1, perCount: false },
    { label: 'كل 100 تكبيسة = ضرب', event: 'like', match: '', min: 100, key: 'LMB', hold: 900, times: 1, perCount: false },
    { label: 'متابع = خانة 2', event: 'follow', match: '', min: 0, key: '2', hold: 100, times: 1, perCount: false } ] },
  kick: { name: 'Kick (هدايا Kicks والاشتراكات)', rules: [
    { label: 'هدية Kicks = قفز', platform: 'kick', event: 'gift', match: '', min: 0, key: 'SPACE', hold: 150, times: 1, perCount: false },
    { label: 'اشتراك جديد = إعادة تعبئة', platform: 'kick', event: 'sub', match: '', min: 0, key: 'R', hold: 120, times: 1, perCount: false },
    { label: 'هدية اشتراكات = ضرب', platform: 'kick', event: 'gift', match: 'Gift Sub', min: 0, key: 'LMB', hold: 400, times: 1, perCount: true },
    { label: 'غارة = قفز ×3', platform: 'kick', event: 'raid', match: '', min: 0, key: 'SPACE', hold: 150, times: 3, perCount: false } ] },
  twitch: { name: 'Twitch (Bits والاشتراكات)', rules: [
    { label: 'كل 100 Bits = قفز', platform: 'twitch', event: 'gift', match: 'Bits', min: 100, key: 'SPACE', hold: 150, times: 1, perCount: false },
    { label: 'كل 500 Bits = قنبلة', platform: 'twitch', event: 'gift', match: 'Bits', min: 500, key: 'G', hold: 150, times: 1, perCount: false },
    { label: 'اشتراك جديد = إعادة تعبئة', platform: 'twitch', event: 'sub', match: '', min: 0, key: 'R', hold: 120, times: 1, perCount: false },
    { label: 'هدية اشتراكات = ضرب', platform: 'twitch', event: 'gift', match: 'Gift Sub', min: 0, key: 'LMB', hold: 400, times: 1, perCount: true },
    { label: 'غارة = قفز ×3', platform: 'twitch', event: 'raid', match: '', min: 0, key: 'SPACE', hold: 150, times: 3, perCount: false } ] },
  cod: { name: 'Call of Duty', rules: [
    { label: 'وردة = إعادة تعبئة', event: 'gift', match: 'Rose', min: 0, key: 'R', hold: 120, times: 1, perCount: false },
    { label: 'قلب = انبطاح/تقوّس', event: 'gift', match: 'Heart', min: 0, key: 'C', hold: 300, times: 1, perCount: false },
    { label: 'أسد = قنبلة', event: 'gift', match: 'Lion', min: 0, key: 'G', hold: 150, times: 1, perCount: false },
    { label: 'كل 100 تكبيسة = قفز', event: 'like', match: '', min: 100, key: 'SPACE', hold: 150, times: 3, perCount: false },
    { label: 'متابع = ضربة قريبة', event: 'follow', match: '', min: 0, key: 'V', hold: 120, times: 1, perCount: false } ] },
};
const newRule = () => ({ on: true, platform: 'any', label: 'قاعدة جديدة', event: 'gift', match: '', min: 0, key: 'SPACE', hold: 120, times: 1, perCount: false, cooldown: 0 });
EXTRA.games = (m) => {
  const g = me.cfg.games, base = baseUrl().origin;
  const cmd = `node game-bridge.js ${base} ${me.token}`;
  m.innerHTML = `<h2>🎮 ربط الألعاب التفاعلي</h2><div class="sub">اربط أحداث TikTok (هدية، تكبيس، متابع، أمر في الشات) بضغطات كيبورد أو ماوس داخل لعبتك، وسوّ تحديات مع جمهورك.</div>
    <div class="panel" style="border-color:${me.bridge ? '#14b8a6' : 'var(--line)'}"><h3>1) تشغيل جسر الألعاب على جهازك</h3>
      <p class="sub" style="margin-top:0">المتصفح ما يقدر يضغط أزرار داخل ألعابك بنفسه، فنحتاج برنامج صغير يشتغل على جهازك (ويندوز) ويستقبل الأحداث وينفّذ الضغطات. هو اللي يتصل بحسابك.</p>
      <div class="row" style="margin-bottom:12px"><a class="btn" href="/download/game-bridge.zip" id="g-zip" style="text-decoration:none">📥 تحميل برنامج ربط الألعاب الجاهز (Windows)</a></div>
      <ol class="sub" style="margin:0 0 12px;padding-inline-start:20px;line-height:1.9"><li>حمّل الملف وفك الضغط.</li><li>دبل كليك على <b dir="ltr">Start-Game-Bridge.bat</b>.</li><li>الصق مفتاحك هنا لما يطلبه: <code dir="ltr" id="g-key" style="display:inline-block;margin:0 4px">${esc(me.token)}</code><button class="btn ghost sm" id="g-keycopy">نسخ المفتاح</button></li><li>خلّ اللعبة هي النافذة الأمامية، وخلاص! (P إيقاف مؤقت، Q خروج)</li></ol>
      <details style="margin-bottom:10px"><summary class="sub" style="cursor:pointer">طريقة متقدمة (سطر أوامر)</summary>
      <div class="row"><a class="btn ghost sm" href="game-bridge.js" download style="text-decoration:none">⬇ تحميل game-bridge.js</a><span class="tag" id="g-st" style="${me.bridge ? 'background:#0f3a31;color:#5eead4' : 'background:#3a2a10;color:#fbbf24'}">${me.bridge ? '● الجسر متصل' : '○ الجسر غير متصل'}</span></div>
      <p class="sub" style="margin:12px 0 4px">افتح CMD في نفس مجلد الملف وشغّل (يحتاج Node.js؛ الحزمة اللي فيها مجلد node تشتغل بـ <span dir="ltr">node\\node.exe</span>):</p><code>${esc(cmd)}</code><button class="btn ghost sm" id="g-copy">نسخ الأمر</button>
      <p class="sub" style="margin:10px 0 0;color:#fbbf24">⚠ الضغطات تروح للنافذة اللي تكون مفتوحة ومركّزة. خلّ لعبتك هي النافذة الأمامية، وسوّ تجربة بدون ضغط أول: أضف <span dir="ltr">--dry</span> لآخر الأمر.</p></details></div>
    <div class="panel"><div class="row" style="justify-content:space-between"><h3 style="margin:0">2) القواعد</h3>
      <label class="row" style="color:var(--txt)"><input type="checkbox" id="g-on" ${g.on ? 'checked' : ''} style="width:auto"> الربط مفعّل <small style="color:var(--mut)">(إيقاف طارئ لو انغلبت: أطفئه)</small></label></div>
      <div class="row" style="margin:12px 0"><span class="sub" style="margin:0">قواعد جاهزة (أمثلة، عدّل المفاتيح حسب إعدادات لعبتك):</span>${Object.entries(GAME_PRESETS).map(([k, p]) => `<button class="btn ghost sm" data-pre="${k}">${p.name}</button>`).join('')}<button class="btn ghost sm" data-pre="clear">مسح الكل</button></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th></th><th>الوصف</th><th>الحدث</th><th>المنصة</th><th>الاسم/الأمر</th><th>الحد الأدنى</th><th>الزر</th><th>مدة الضغط (ms)</th><th>مرات</th><th>حسب العدد</th><th>مهلة (ms)</th><th></th></tr></thead><tbody id="g-rows"></tbody></table></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="g-add">+ قاعدة جديدة</button></div></div>
    <div class="panel"><h3>3) جرّب القواعد بدون ضغط</h3><div class="row"><select id="gs-ev" style="width:140px;margin:0">${Object.entries(GAME_EV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="gs-pl" style="width:110px;margin:0"><option value="tiktok">TikTok</option><option value="twitch">Twitch</option><option value="kick">Kick</option></select><input id="gs-match" placeholder="اسم الهدية أو الأمر (مثل Rose أو Bits أو !jump)" dir="ltr" style="width:230px;margin:0"><input id="gs-n" type="number" min="1" value="1" style="width:90px;margin:0" title="العدد أو الألماس"><button class="btn sm" id="gs-go">ماذا كان يصير؟</button></div>
      <div id="gs-res" class="msg" style="margin-top:10px;display:none"></div></div>`;
  const rows = m.querySelector('#g-rows');
  const drawRows = () => {
    rows.innerHTML = g.rules.map((r, i) => `<tr><td><input type="checkbox" data-f="on" data-i="${i}" ${r.on !== false ? 'checked' : ''} style="width:auto"></td>
      <td><input data-f="label" data-i="${i}" value="${esc(r.label)}" style="width:150px"></td>
      <td><select data-f="event" data-i="${i}">${Object.entries(GAME_EV).map(([k, v]) => `<option value="${k}" ${r.event === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td><select data-f="platform" data-i="${i}">${[['any', 'الكل'], ['tiktok', 'TikTok'], ['twitch', 'Twitch'], ['kick', 'Kick']].map(([k, v]) => `<option value="${k}" ${(r.platform || 'any') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td><input data-f="match" data-i="${i}" dir="ltr" value="${esc(r.match)}" style="width:110px" placeholder="(الكل)"></td>
      <td><input data-f="min" data-i="${i}" type="number" min="0" value="${+r.min || 0}" style="width:70px"></td>
      <td><select data-f="key" data-i="${i}">${GAME_KEYS.map(k => `<option ${r.key === k ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
      <td><input data-f="hold" data-i="${i}" type="number" min="20" max="5000" value="${+r.hold || 120}" style="width:76px"></td>
      <td><input data-f="times" data-i="${i}" type="number" min="1" max="20" value="${+r.times || 1}" style="width:56px"></td>
      <td><input type="checkbox" data-f="perCount" data-i="${i}" ${r.perCount ? 'checked' : ''} style="width:auto"></td>
      <td><input data-f="cooldown" data-i="${i}" type="number" min="0" value="${+r.cooldown || 0}" style="width:76px"></td>
      <td style="white-space:nowrap"><button class="btn ghost sm" data-test="${i}" title="يرسل حدثاً تجريبياً (لو الجسر شغّال راح يضغط فعلاً)">🧪</button><button class="btn ghost sm" data-del="${i}">🗑</button></td></tr>`).join('') || '<tr><td colspan="12" class="sub">لا توجد قواعد. اختر قالباً جاهزاً أو أضف قاعدة.</td></tr>';
    rows.querySelectorAll('[data-f]').forEach(el => el.onchange = () => {
      const r = g.rules[el.dataset.i], f = el.dataset.f;
      r[f] = el.type === 'checkbox' ? el.checked : (['min', 'hold', 'times', 'cooldown'].includes(f) ? (+el.value || 0) : el.value); saveCfg();
    });
    rows.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { g.rules.splice(b.dataset.del, 1); saveCfg(); drawRows(); });
    rows.querySelectorAll('[data-test]').forEach(b => b.onclick = () => {
      const r = g.rules[b.dataset.test], ev = ruleSample(r);
      if (me.bridge && g.on) toast('الجسر متصل: راح يضغط الزر فعلاً في النافذة المفتوحة!', 'warn'); else toast('أُرسل حدث تجريبي (الجسر غير متصل أو الربط مطفأ، فما راح يضغط)', 'warn');
      fire(ev);
    });
  };
  drawRows();
  m.querySelector('#g-on').onchange = (e) => { g.on = e.target.checked; saveCfg(); toast(g.on ? '🎮 الربط شغّال' : '⛔ تم إيقاف الربط', g.on ? 'ok' : 'warn'); };
  m.querySelector('#g-add').onclick = () => { if (g.rules.length >= 60) return toast('الحد الأقصى 60 قاعدة', 'warn'); g.rules.push(newRule()); saveCfg(); drawRows(); };
  m.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => {
    if (b.dataset.pre === 'clear') g.rules = [];
    else { g.rules = GAME_PRESETS[b.dataset.pre].rules.map(r => ({ on: true, cooldown: 0, ...r })); g.game = b.dataset.pre; }
    saveCfg(); drawRows(); toast(b.dataset.pre === 'clear' ? 'تم مسح القواعد' : `تم تحميل قواعد ${GAME_PRESETS[b.dataset.pre].name}`);
  });
  m.querySelector('#g-copy').onclick = (e) => copy(cmd, e.target);
  m.querySelector('#g-keycopy').onclick = (e) => copy(me.token, e.target);
  m.querySelector('#gs-go').onclick = () => {
    const ev = { platform: m.querySelector('#gs-pl').value, type: m.querySelector('#gs-ev').value, gift: m.querySelector('#gs-match').value.trim(), text: m.querySelector('#gs-match').value.trim(), count: +m.querySelector('#gs-n').value || 1, diamonds: +m.querySelector('#gs-n').value || 0 };
    const hits = gameRulesFor(ev, g), box = m.querySelector('#gs-res'); box.style.display = 'block';
    box.innerHTML = hits.length ? hits.map(h => `✅ <b>${esc(h.label || h.event)}</b> ← الزر <b dir="ltr">${esc(h.key)}</b> لمدة ${h.hold}ms × ${h.timesNow} مرة`).join('<br>') : '— ما تطابقت أي قاعدة مع هذا الحدث';
  };
  // keep the "bridge connected" badge fresh while this page is open
  const st = setInterval(() => { if (view !== 'games') return clearInterval(st); const b = m.querySelector('#g-st'); if (b) { b.textContent = me.bridge ? '● الجسر متصل' : '○ الجسر غير متصل'; b.style.cssText = me.bridge ? 'background:#0f3a31;color:#5eead4' : 'background:#3a2a10;color:#fbbf24'; } }, 2000);
};
// the sample event that would trigger a rule
function ruleSample(r) {
  const n = Math.max(1, +r.min || 1), platform = r.platform === 'twitch' ? 'twitch' : r.platform === 'kick' ? 'kick' : 'tiktok', tw = platform !== 'tiktok';
  if (r.event === 'gift') return { type: 'gift', user: pick(), gift: r.match || (tw ? 'Bits' : 'Rose'), count: tw ? Math.max(1, +r.min || 1) : 1, diamonds: +r.min || 0, platform };
  if (r.event === 'like') return { type: 'like', user: pick(), count: n, platform };
  if (r.event === 'chat') return { type: 'chat', user: pick(), text: r.match || '!go', platform };
  if (r.event === 'raid') return { type: 'raid', user: pick(), count: n, platform: platform === 'kick' ? 'kick' : 'twitch' };
  return { type: r.event, user: pick(), platform };
}

// =====================================================================
// 🧪 Control Deck (events test)
// =====================================================================
let deckLog = [], deckCount = 0;
EXTRA.test = (m) => {
  m.innerHTML = `<h2>🧪 لوحة التحكم السريع (Control Deck)</h2><div class="sub">اضغط أي زر والقوالب المفتوحة (هنا وفي OBS) تتفاعل فوراً.</div>
    <div class="panel"><h3>الحالة</h3><div id="vw" class="row"></div></div>
    <div class="deck" id="deck"></div>
    <div class="canvasbox" style="margin-top:16px">
      <div class="panel"><h3>معاينة حية للشاشة الشاملة</h3><div class="cstage" id="ds"><iframe id="ds-f" src="overlay.html?slot=canvas"></iframe></div></div>
      <div class="panel"><h3>آخر الأحداث <span class="tag" id="dk-n">${deckCount}</span></h3><div id="dk-log" style="font-size:13px"></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" id="dk-all">▶ اختبر كل شي</button><button class="btn ghost sm" id="dk-tpl">🧪 اختبر كل القوالب</button></div><span id="dk-r" class="sub"></span></div>
    </div>`;
  startStatus(); store.set('lsx-cfg', me.cfg);
  const stage = m.querySelector('#ds'), frame = m.querySelector('#ds-f');
  const fit = () => { const w = stage.parentElement.clientWidth - 36, k = w / 1920; stage.style.width = w + 'px'; stage.style.height = 1080 * k + 'px'; frame.style.width = '1920px'; frame.style.height = '1080px'; frame.style.transform = `scale(${k})`; };
  fit();
  const logEl = m.querySelector('#dk-log'), num = m.querySelector('#dk-n');
  const drawLog = () => { logEl.innerHTML = deckLog.slice(0, 12).map(l => `<div style="padding:3px 0;border-bottom:1px solid var(--line)"><span style="color:var(--mut)">${l.t}</span> ${esc(l.msg)}</div>`).join('') || '<div class="sub">ما أُرسل شي بعد.</div>'; num.textContent = deckCount; };
  drawLog();
  const sent = (msg, ev) => { fire(ev); deckCount++; deckLog.unshift({ t: new Date().toLocaleTimeString('ar-SA'), msg }); drawLog(); };
  const seq = (n, ms, fn) => { for (let i = 0; i < n; i++) setTimeout(() => fn(i), i * ms); };
  const BTN = [
    ['❤️', 'محاكاة 1000 تكبيسة', 'hot', () => { deckLog.unshift({ t: new Date().toLocaleTimeString('ar-SA'), msg: '❤️ 1000 تكبيسة (10 دفعات)' }); deckCount++; seq(10, 110, () => fire({ type: 'like', user: pick(), count: 100 })); drawLog(); }],
    ['🦁', 'محاكاة هدية أسد', 'gold', () => sent('🦁 هدية أسد (29,999 ألماس)', { type: 'gift', user: pick(), gift: 'Lion', count: 1, diamonds: 29999 })],
    ['➕', 'محاكاة متابع جديد', '', () => sent('➕ متابع جديد', { type: 'follow', user: pick() })],
    ['💬', 'محاكاة تعليق', '', () => sent('💬 تعليق', { type: 'chat', user: pick(), text: ['مرحبا من البث!', 'ما شاء الله 🔥', 'كم الهدف اليوم؟'][rnd(0, 2)], supporter: Math.random() < .5 })],
    ['🌹', 'محاكاة هدية وردة', '', () => sent('🌹 وردة ×5', { type: 'gift', user: pick(), gift: 'Rose', count: 5, diamonds: 5 })],
    ['⭐', 'محاكاة اشتراك', '', () => sent('⭐ اشتراك', { type: 'sub', user: pick() })],
    ['🔁', 'محاكاة مشاركة', '', () => sent('🔁 مشاركة', { type: 'share', user: pick() })],
    ['👋', 'محاكاة دخول مشاهد', '', () => sent('👋 دخول مشاهد', { type: 'join', user: pick() })],
    ['🎡', 'تدوير العجلة', 'gold', () => sent('🎡 تدوير العجلة', { type: 'spin' })],
    ['🏆', 'إكمال الهدف', 'hot', () => { deckLog.unshift({ t: new Date().toLocaleTimeString('ar-SA'), msg: '🏆 إكمال الهدف' }); deckCount++; fire({ type: 'reset' }); setTimeout(() => fire({ type: 'gift', user: pick(), gift: 'Rose', count: +me.cfg.goal.target || 100, diamonds: 0 }), 500); drawLog(); }],
    ['🔥', 'كومبو هدايا ×10', 'hot', () => { deckLog.unshift({ t: new Date().toLocaleTimeString('ar-SA'), msg: '🔥 كومبو 10 هدايا' }); deckCount += 10; seq(10, 180, (i) => fire({ type: 'gift', user: pick(), gift: ['Rose', 'Heart', 'Lion'][i % 3], count: rnd(1, 6), diamonds: rnd(1, 400) })); drawLog(); }],
    ['🟣', 'تويتش: Bits 500', 'tw', () => sent('🟣 Twitch: 500 Bits', { type: 'gift', platform: 'twitch', user: pick(), gift: 'Bits', count: 500, diamonds: 500 })],
    ['🟣', 'تويتش: اشتراك جديد', 'tw', () => sent('🟣 Twitch: اشتراك', { type: 'sub', platform: 'twitch', user: pick(), months: 7 })],
    ['🟣', 'تويتش: هدايا اشتراكات ×10', 'tw', () => sent('🟣 Twitch: 10 هدايا اشتراك', { type: 'gift', platform: 'twitch', user: pick(), gift: 'Gift Sub', count: 10, diamonds: 5000 })],
    ['🟣', 'تويتش: غارة', 'tw', () => sent('🟣 Twitch: غارة', { type: 'raid', platform: 'twitch', user: pick(), count: 150 })],
    ['🟣', 'تويتش: تعليق', 'tw', () => sent('🟣 Twitch: تعليق', { type: 'chat', platform: 'twitch', user: pick(), text: 'GG رائع!', sub: Math.random() < .5 })],
    ['🟩', 'كيك: هدية Kicks', 'kk', () => sent('🟩 Kick: هدية 500', { type: 'gift', platform: 'kick', user: pick(), gift: 'Kicks', count: 1, diamonds: 500 })],
    ['🟩', 'كيك: اشتراك جديد', 'kk', () => sent('🟩 Kick: اشتراك', { type: 'sub', platform: 'kick', user: pick(), months: 3 })],
    ['🟩', 'كيك: متابع جديد', 'kk', () => sent('🟩 Kick: متابع', { type: 'follow', platform: 'kick', user: pick() })],
    ['🟩', 'كيك: غارة', 'kk', () => sent('🟩 Kick: غارة', { type: 'raid', platform: 'kick', user: pick(), count: 90 })],
    ['🟩', 'كيك: تعليق', 'kk', () => sent('🟩 Kick: تعليق', { type: 'chat', platform: 'kick', user: pick(), text: 'KEKW رائع!', sub: Math.random() < .5 })],
    ['🧹', 'تصفير العدّادات', '', () => sent('🧹 تصفير', { type: 'reset' })],
  ];
  const deck = m.querySelector('#deck');
  deck.innerHTML = BTN.map(([ic, label, cls], i) => `<button class="dk ${cls}" data-i="${i}"><span>${ic}</span>${label}</button>`).join('');
  deck.querySelectorAll('.dk').forEach(b => b.onclick = () => { BTN[+b.dataset.i][3](); store.set('lsx-acted', true); });
  m.querySelector('#dk-all').onclick = () => { ['gift', 'follow', 'like', 'chat'].forEach((t, i) => setTimeout(() => sent(`▶ ${t}`, SAMPLES[t]()), i * 700)); m.querySelector('#dk-r').textContent = 'أُرسلت 4 أحداث ✓'; };
  m.querySelector('#dk-tpl').onclick = () => { TEMPLATES.filter(t => !t.hidden).forEach((t, i) => setTimeout(() => testTpl(t.id), i * 400)); m.querySelector('#dk-r').textContent = `جاري اختبار ${TEMPLATES.filter(t => !t.hidden).length} قالب…`; };
};
