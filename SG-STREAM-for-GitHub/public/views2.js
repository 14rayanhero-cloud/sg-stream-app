// Dashboard pages: goal bar, alerts engine, ticker, live canvas, AI assistant.
// Loaded after index.html's main script, so it can use its globals (me, api, fire, emit, EXTRA, ...).

SAMPLES.sub = () => ({ type: 'sub', user: pick() });

let _saveT;
function saveCfg() {
  store.set('lsx-cfg', me.cfg);
  emit({ type: 'config', cfg: me.cfg }); // live update of every preview frame
  clearTimeout(_saveT);
  _saveT = setTimeout(() => api('/api/config', { cfg: me.cfg }).catch(() => {}), 400);
}
const stageHTML = (ids) => `<div class="stage">${ids.map(id => `<iframe src="overlay.html?${id.startsWith('slot:') ? 'slot=' + id.slice(5) : 't=' + id}" allow="autoplay"></iframe>`).join('')}</div>`;
function fitStages() {
  document.querySelectorAll('.stage').forEach(s => { const k = s.clientWidth / 1920; s.querySelectorAll('iframe').forEach(f => f.style.transform = `scale(${k})`); });
}
addEventListener('resize', fitStages);
const bind = (id, fn, ev = 'input') => { const e = document.getElementById(id); if (e) e.addEventListener(ev, () => { fn(e); saveCfg(); }); };
const opts = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join('');
const testBtn = (label, fn) => `<button class="btn ghost sm" data-fn="${fn}">${label}</button>`;
const obsCopy = (m, id) => { const b = m.querySelector('#copy-obs'); if (b) b.onclick = (e) => { store.set('lsx-obs', true); copy(ovUrl(id), e.target); }; };
const obsBlock = (id) => `<div class="panel"><h3>رابط OBS</h3><code>${ovUrl(id)}</code><button class="btn sm" id="copy-obs">نسخ الرابط</button>
  <span class="sub" style="margin:0 8px">أضفه في OBS أو TikTok Live Studio كـ Browser Source (1920×1080)</span></div>`;

// ---------- Goal bar ----------
EXTRA.goal = (m) => {
  const g = me.cfg.goal;
  m.innerHTML = `<h2>شريط الهدف</h2><div class="sub">خصّص الهدف وشاهد التغيير فوراً في المعاينة</div>
    <div class="panel"><div class="ctl">
      <label>عنوان الهدف<input id="g-title" value="${esc(g.title)}"></label>
      <label>المبلغ الحالي (نقطة البداية)<input id="g-cur" type="number" value="${+g.cur || 0}"></label>
      <label>الهدف الإجمالي<input id="g-target" type="number" min="1" value="${+g.target || 100}"></label>
      <label>مصدر العدّ<select id="g-src">${opts({ gifts: 'الهدايا', follows: 'المتابعين', manual: 'يدوي فقط' }, g.src)}</select></label>
      <label>اللون الأول<input id="g-c1" type="color" value="${g.c1}"></label>
      <label>اللون الثاني<input id="g-c2" type="color" value="${g.c2}"></label></div></div>
    <div class="panel"><h3>معاينة مباشرة</h3>${stageHTML(['goal-bar'])}
      <div class="row" style="margin-top:12px">${testBtn('🎁 هدية تجريبية', 'gift')}${testBtn('➕ متابع تجريبي', 'follow')}${testBtn('↺ إعادة ضبط', 'reset')}</div></div>
    ${obsBlock('goal-bar')}`;
  bind('g-title', e => g.title = e.value); bind('g-cur', e => g.cur = +e.value || 0); bind('g-target', e => g.target = +e.value || 1);
  bind('g-src', e => g.src = e.value, 'change'); bind('g-c1', e => g.c1 = e.value); bind('g-c2', e => g.c2 = e.value);
  wireTests(m); obsCopy(m, 'goal-bar'); fitStages();
};

// ---------- Alerts engine ----------
// key -> [title, sample used by the test button, label of the threshold field (if the alert has one)]
const ALERT_KINDS = {
  gift: ['🎁 دعم (هدية)', 'gift'],
  bigGift: ['🔥 دعم كبير', 'bigGift', 'يُعتبر دعماً كبيراً إذا قيمة الهدية (ألماس) ≥'],
  like: ['❤️ تكبيس (إعجابات)', 'tap', 'عدد تكبيسات المشاهد قبل ما يطلع التنبيه'],
  milestone: ['🎉 إنجاز الإعجابات', 'milestone', 'تنبيه كل كم إعجاب'],
  follow: ['➕ متابع جديد', 'follow'],
  sub: ['⭐ اشتراك', 'sub'],
  share: ['🔁 مشاركة البث', 'share'],
  join: ['👋 دخول مشاهد (اتركه مغلقاً في البثوث الكبيرة)', 'join'],
  goal: ['🏆 تحقق الهدف', 'goal'],
  raid: ['🚀 غارة (Twitch / Kick)', 'raid'],
};
SAMPLES.bigGift = () => ({ type: 'gift', user: pick(), gift: 'Lion', count: 1, diamonds: 1000 });
SAMPLES.tap = () => ({ type: 'like', user: pick(), count: 60 });
SAMPLES.share = () => ({ type: 'share', user: pick() });
SAMPLES.join = () => ({ type: 'join', user: pick() });
SAMPLES.raid = () => ({ type: 'raid', user: pick(), count: 25 + Math.floor(Math.random() * 200), platform: 'twitch' });
// milestone / goal need a clean counter first, so the test is: reset, then cross the line
function testAlert(k) {
  const a = me.cfg.alerts[k];
  if (k === 'milestone') { fire({ type: 'reset' }); setTimeout(() => fire({ type: 'like', user: pick(), count: 1, total: +a.min || 1000 }), 500); return; }
  if (k === 'goal') { fire({ type: 'reset' }); setTimeout(() => fire({ type: 'gift', user: pick(), gift: 'Rose', count: +me.cfg.goal.target || 100, diamonds: 0 }), 500); return; }
  fire(SAMPLES[ALERT_KINDS[k][1]]());
}
EXTRA.alerts = (m) => {
  const A = me.cfg.alerts;
  m.innerHTML = `<h2>محرّك التنبيهات</h2><div class="sub">صوت وصورة أو GIF ونص، مع قراءة النص بصوت عالٍ (TTS). المتغيرات: <bdi dir="ltr">{user} {gift} {count} {total} {title}</bdi></div>
    <div class="panel"><h3>معاينة مباشرة</h3>${stageHTML(['alerts'])}
      <div class="sub" style="margin:8px 0 0">الصوت والـ TTS يشتغلان في المعاينة بعد أول ضغطة على زر تجربة. في OBS فعّل «التحكم بالصوت عبر OBS».</div></div>
    ${Object.entries(ALERT_KINDS).map(([k, [name, , minLabel]]) => { const a = A[k]; return `
    <div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">${name}</h3>
      <label class="row"><input type="checkbox" id="a-${k}-on" ${a.on ? 'checked' : ''} style="width:auto"> مفعّل</label></div>
      <div class="ctl">
        <label style="grid-column:1/-1">نص التنبيه<input id="a-${k}-text" value="${esc(a.text)}"></label>
        ${minLabel ? `<label style="grid-column:1/-1">${minLabel}<input id="a-${k}-min" type="number" min="1" value="${+a.min || 1}"></label>` : ''}
        <label>الصوت<select id="a-${k}-sound">${opts(SOUNDS, a.sound)}</select></label>
        <label>لون التوهّج<input id="a-${k}-color" type="color" value="${a.color}"></label>
        <label>رابط صورة / GIF<input id="a-${k}-img" dir="ltr" placeholder="https://…" value="${a.img.startsWith('data:') ? '' : esc(a.img)}"></label>
        <label>أو ارفع ملفاً (حتى 250KB)<input id="a-${k}-file" type="file" accept="image/*"></label>
        <label>أغنية / مقطع صوتي خاص (mp3، حتى 250KB)<input id="a-${k}-afile" type="file" accept="audio/*"></label>
        <label>أو رابط ملف صوت<input id="a-${k}-aurl" dir="ltr" placeholder="https://…/song.mp3" value="${a.audio && !a.audio.startsWith('data:') ? esc(a.audio) : ''}"></label>
        <div class="row" style="align-self:end"><span class="sub" id="a-${k}-ainfo" style="margin:0">${a.audio ? '🎵 صوتك الخاص مفعّل (يحلّ محل الصوت المختار)' : ''}</span>${a.audio ? `<button class="btn ghost sm" data-aclr="${k}">إزالة</button>` : ''}</div>
        <label class="row" style="align-self:end"><input type="checkbox" id="a-${k}-tts" ${a.tts ? 'checked' : ''} style="width:auto"> قراءة النص (TTS)</label></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-k="${k}">🧪 تجربة التنبيه</button>
        <button class="btn ghost sm" data-snd="${k}">🔊 سماع الصوت</button><span class="sub" id="a-${k}-msg" style="margin:0"></span></div></div>`; }).join('')}
    ${obsBlock('alerts')}`;
  Object.keys(ALERT_KINDS).forEach(k => {
    const a = A[k];
    bind(`a-${k}-on`, e => a.on = e.target?.checked ?? e.checked, 'change');
    bind(`a-${k}-text`, e => a.text = e.value);
    bind(`a-${k}-min`, e => a.min = Math.max(1, +e.value || 1));
    bind(`a-${k}-sound`, e => { a.sound = e.value; playSound(a.sound); }, 'change');
    bind(`a-${k}-color`, e => a.color = e.value);
    bind(`a-${k}-img`, e => a.img = e.value.trim());
    bind(`a-${k}-tts`, e => a.tts = e.checked, 'change');
    bind(`a-${k}-aurl`, e => a.audio = /^https?:\/\//.test(e.value.trim()) ? e.value.trim() : (a.audio && a.audio.startsWith('data:') ? a.audio : ''));
    const afile = document.getElementById(`a-${k}-afile`);
    afile.onchange = () => {
      const f = afile.files[0]; if (!f) return; const info = document.getElementById(`a-${k}-ainfo`);
      if (f.size > 250 * 1024) { info.textContent = 'الملف أكبر من 250KB. قصّ المقطع أو استخدم رابطاً'; return; }
      const r = new FileReader(); r.onload = () => { a.audio = r.result; saveCfg(); render(); }; r.readAsDataURL(f);
    };
    const file = document.getElementById(`a-${k}-file`);
    file.onchange = () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 250 * 1024) { document.getElementById(`a-${k}-msg`).textContent = 'الملف أكبر من 250KB'; return; }
      const r = new FileReader(); r.onload = () => { a.img = r.result; document.getElementById(`a-${k}-msg`).textContent = 'تم رفع الصورة ✓'; saveCfg(); }; r.readAsDataURL(f);
    };
  });
  m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => testAlert(b.dataset.k));
  m.querySelectorAll('[data-snd]').forEach(b => b.onclick = () => playSound(A[b.dataset.snd].sound, A[b.dataset.snd].audio));
  m.querySelectorAll('[data-aclr]').forEach(b => b.onclick = () => { A[b.dataset.aclr].audio = ''; saveCfg(); render(); });
  obsCopy(m, 'alerts'); fitStages();
  setTimeout(() => { if (view === 'alerts') emit(SAMPLES.gift()); }, 900); // show a sample so the preview isn't empty
};

// ---------- Ticker & leaderboards ----------
EXTRA.ticker = (m) => {
  const k = me.cfg.ticker;
  m.innerHTML = `<h2>الشريط والمتصدرين</h2><div class="sub">شريط متحرك يعرض آخر الأحداث وأفضل الداعمين</div>
    <div class="panel"><div class="ctl">
      <label class="row" style="align-self:end"><input type="checkbox" id="t-on" ${k.on ? 'checked' : ''} style="width:auto"> مفعّل</label>
      <label>المحتوى<select id="t-mode">${opts({ both: 'آخر الأحداث + أفضل الداعمين', latest: 'آخر الأحداث', top: 'أفضل الداعمين فقط' }, k.mode)}</select></label>
      <label>السرعة (بكسل/ثانية)<input id="t-speed" type="number" min="10" max="300" value="${k.speed}"></label>
      <label style="grid-column:1/-1">نص ثابت يظهر أولاً<input id="t-text" value="${esc(k.text)}"></label></div></div>
    <div class="panel"><h3>معاينة مباشرة</h3>${stageHTML(['ticker'])}
      <div class="row" style="margin-top:12px">${testBtn('🎁 هدية', 'gift')}${testBtn('➕ متابع', 'follow')}${testBtn('⭐ اشتراك', 'sub')}${testBtn('↺ إعادة ضبط', 'reset')}</div></div>
    <div class="panel"><h3>قوائم المتصدرين</h3><div class="sub" style="margin:0">قوالب الترتيب الجاهزة (Crystal Butterfly وDiamond Rose وPearl Bow وTop Likers) في مكتبة القوالب.</div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="go-lib">فتح مكتبة القوالب</button></div></div>
    ${obsBlock('ticker')}`;
  bind('t-on', e => k.on = e.checked, 'change'); bind('t-mode', e => k.mode = e.value, 'change');
  bind('t-speed', e => k.speed = +e.value || 40); bind('t-text', e => k.text = e.value);
  $('#go-lib').onclick = () => { cat = 'top'; go('overlays'); };
  wireTests(m); obsCopy(m, 'ticker'); fitStages();
};

function wireTests(m) { m.querySelectorAll('[data-fn]').forEach(b => b.onclick = () => fire(b.dataset.fn === 'reset' ? { type: 'reset' } : SAMPLES[b.dataset.fn]())); }

// ---------- Live canvas ----------
EXTRA.canvas = (m) => {
  const g = me.cfg.goal, k = me.cfg.ticker;
  m.innerHTML = `<h2>الشاشة الحية</h2><div class="sub">هكذا تظهر التراكبات في OBS. عدّل أي خيار وشاهده فوراً.</div>
    <div class="panel">${stageHTML(['goal-bar', 'alerts', 'ticker'])}
      <div class="row" style="margin-top:12px">${testBtn('🎁 اختبار هدية', 'gift')}${testBtn('⭐ اختبار اشتراك جديد', 'sub')}${testBtn('➕ اختبار متابع', 'follow')}${testBtn('↺ إعادة ضبط', 'reset')}
        <button class="btn sm" id="cv-all">▶ اختبار الكل</button></div>
      <div class="sub" style="margin:10px 0 0">التنبيهات تشغّل الصوت وتقرأ النص تلقائياً (TTS). نفس الأحداث تصل لشاشات OBS المفتوحة.</div></div>
    <div class="panel"><h3>تعديل سريع</h3><div class="ctl">
      <label>عنوان الهدف<input id="q-title" value="${esc(g.title)}"></label>
      <label>الهدف الإجمالي<input id="q-target" type="number" min="1" value="${+g.target || 100}"></label>
      <label>لون الهدف<input id="q-c1" type="color" value="${g.c1}"></label>
      <label>نص الشريط<input id="q-tick" value="${esc(k.text)}"></label>
      <label>نص تنبيه الهدية<input id="q-gift" value="${esc(me.cfg.alerts.gift.text)}"></label></div></div>`;
  bind('q-title', e => g.title = e.value); bind('q-target', e => g.target = +e.value || 1); bind('q-c1', e => g.c1 = e.value);
  bind('q-tick', e => k.text = e.value); bind('q-gift', e => me.cfg.alerts.gift.text = e.value);
  $('#cv-all').onclick = () => ['gift', 'sub', 'follow'].forEach((t, i) => setTimeout(() => fire(SAMPLES[t]()), i * 6000));
  wireTests(m); fitStages();
  setTimeout(() => { if (view === 'canvas') { emit(SAMPLES.gift()); emit(SAMPLES.follow()); } }, 900);
};

// ---------- AI assistant ----------
const aiLog = [];
EXTRA.ai = (m) => {
  const ai = me.ai || {};
  m.innerHTML = `<h2>مساعد الذكاء الاصطناعي</h2><div class="sub">عناوين بث، أفكار تحديات، وردود على أسئلة المشاهدين</div>
    <div class="panel"><div class="row" style="margin-bottom:10px">
      <button class="btn sm" data-q="titles">✍️ عناوين للبث</button><button class="btn sm" data-q="challenges">🏆 أفكار تحديات</button><button class="btn sm" data-q="reply">💬 ردّ على سؤال</button></div>
      <div id="ai-log" style="max-height:380px;overflow:auto">${aiLog.map(x => `<div class="msg ${x.me ? 'me' : ''}">${esc(x.t)}</div>`).join('') || '<div class="sub">اكتب موضوع بثك أو سؤال مشاهد ثم اختر نوع المساعدة.</div>'}</div>
      <div class="row" style="margin-top:10px"><input id="ai-in" placeholder="موضوع البث، أو السؤال…" style="flex:1;margin:0"><button class="btn sm" id="ai-send">إرسال</button></div></div>
    <div class="panel"><h3>ربط مزوّد الذكاء الاصطناعي</h3>
      <div class="sub" style="margin-top:0">بدون مفتاح يعمل المساعد بوضع تجريبي (قوالب جاهزة). مع المفتاح تحصل على ردود ذكية حقيقية. المفتاح يُحفظ على خادمك ولا يظهر في المتصفح.</div>
      <div class="ctl"><label>المزوّد<select id="ai-p">${opts({ local: 'تجريبي (بدون مفتاح)', groq: 'Groq (مجاني)', gemini: 'Google Gemini (مجاني)', openai: 'OpenAI' }, ai.provider)}</select></label>
        <label>النموذج (اختياري)<input id="ai-m" dir="ltr" placeholder="llama-3.3-70b-versatile / gemini-2.0-flash / gpt-4o-mini" value="${esc(ai.model || '')}"></label>
        <label>مفتاح API<input id="ai-k" type="password" dir="ltr" placeholder="${ai.hasKey ? '•••••• محفوظ' : 'الصق المفتاح هنا'}" autocomplete="off"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="ai-save">حفظ</button>${ai.hasKey ? '<button class="btn ghost sm" id="ai-clear">حذف المفتاح</button>' : ''}<span class="sub" id="ai-msg" style="margin:0"></span></div></div>`;
  const log = $('#ai-log'); log.scrollTop = log.scrollHeight;
  const ask = async (kind) => {
    const p = $('#ai-in').value.trim(); if (!p && kind !== 'titles' && kind !== 'challenges') return;
    aiLog.push({ me: true, t: p || (kind === 'titles' ? 'عناوين للبث' : 'أفكار تحديات') }); $('#ai-in').value = '';
    aiLog.push({ t: '… جاري التفكير' }); render();
    try { const r = await api('/api/ai', { kind, prompt: p }); aiLog.pop(); aiLog.push({ t: r.text + (r.warning ? '\n\n⚠️ ' + r.warning : '') }); }
    catch (e) { aiLog.pop(); aiLog.push({ t: 'خطأ: ' + e.message }); }
    render();
  };
  m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
  $('#ai-send').onclick = () => ask('chat');
  $('#ai-in').onkeydown = (e) => { if (e.key === 'Enter') ask('chat'); };
  $('#ai-save').onclick = async () => {
    try { setMe({ ...(await api('/api/ai/settings', { provider: $('#ai-p').value, model: $('#ai-m').value, key: $('#ai-k').value })), cfg: me.cfg }); $('#ai-msg').textContent = 'تم الحفظ ✓'; $('#ai-k').value = ''; }
    catch (e) { $('#ai-msg').textContent = e.message; }
  };
  if ($('#ai-clear')) $('#ai-clear').onclick = async () => { setMe({ ...(await api('/api/ai/settings', { provider: 'local', clearKey: true })), cfg: me.cfg }); render(); };
};

// ---------- Tap ("تكبيس") counter ----------
EXTRA.taps = (m) => {
  const g = me.cfg.taps;
  store.set('lsx-cfg', me.cfg); // so the preview frames below resolve the same style/settings
  const cur = TEMPLATES.find(x => x.id === slotCur('taps')) || TEMPLATES.find(x => x.view === 'taps');
  m.innerHTML = `<h2>عدّاد التكبيس</h2><div class="sub">الرقم يطلع مع كل تكبيسة لين يوصل الهدف (1000 ثم 5000 ثم 10000…) ويحتفل لما يوصل</div>
    <div class="panel"><h3>معاينة مباشرة</h3>${stageHTML(['slot:taps'])}
      <div class="row" style="margin-top:12px">${[10, 100, 500, 1000, 5000].map(n => `<button class="btn ghost sm" data-tap="${n}">+${n} تكبيس</button>`).join('')}<button class="btn ghost sm" data-tap="0">↺ تصفير</button></div></div>
    <div class="panel"><h3>الشكل</h3><div class="ctl">
      <label>اختر الشكل (14 شكل)<select id="tp-style">${TEMPLATES.filter(x => x.view === 'taps').map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      <label>عنوان العدّاد<input id="tp-title" value="${esc(g.title)}"></label>
      <label>اللون الأول<input id="tp-c1" type="color" value="${g.c1}"></label>
      <label>اللون الثاني<input id="tp-c2" type="color" value="${g.c2}"></label></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="tp-lib">عرض كل الأشكال في المكتبة</button></div></div>
    <div class="panel"><h3>الأهداف والاحتفال</h3><div class="ctl">
      <label style="grid-column:1/-1">الأهداف (أرقام مفصولة بفاصلة، وبعد آخر رقم يكمّل بنفس الفرق)<input id="tp-targets" dir="ltr" value="${esc((g.targets || []).join(', '))}"></label>
      <label style="grid-column:1/-1">نص الاحتفال (استخدم {target} للرقم)<input id="tp-text" value="${esc(g.text)}"></label>
      <label>الصوت<select id="tp-sound">${opts(SOUNDS, g.sound)}</select></label>
      <label>أغنية / مقطع خاص (mp3، حتى 250KB)<input id="tp-afile" type="file" accept="audio/*"></label>
      <label>أو رابط صوت<input id="tp-aurl" dir="ltr" placeholder="https://…/song.mp3" value="${g.audio && !g.audio.startsWith('data:') ? esc(g.audio) : ''}"></label>
      <label class="row" style="align-self:end"><input type="checkbox" id="tp-tts" ${g.tts ? 'checked' : ''} style="width:auto"> قراءة النص (TTS)</label>
      <label class="row" style="align-self:end"><input type="checkbox" id="tp-on" ${g.on ? 'checked' : ''} style="width:auto"> الاحتفال مفعّل</label></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="tp-snd">🔊 سماع الصوت</button><span class="sub" id="tp-ainfo" style="margin:0">${g.audio ? '🎵 صوتك الخاص مفعّل' : ''}</span>${g.audio ? '<button class="btn ghost sm" id="tp-aclr">إزالة</button>' : ''}</div></div>
    ${obsBlock('taps-neon')}`;
  $('#tp-style').onchange = (e) => { useTpl(TEMPLATES.find(x => x.id === e.target.value)); setTimeout(() => EXTRA.taps($('#main')), 500); };
  $('#tp-lib').onclick = () => { cat = 'taps'; go('overlays'); };
  bind('tp-title', e => g.title = e.value); bind('tp-c1', e => g.c1 = e.value); bind('tp-c2', e => g.c2 = e.value);
  bind('tp-targets', e => g.targets = e.value.split(/[,،\s]+/).map(Number).filter(n => n > 0));
  bind('tp-text', e => g.text = e.value); bind('tp-sound', e => { g.sound = e.value; playSound(g.sound); }, 'change');
  bind('tp-tts', e => g.tts = e.checked, 'change'); bind('tp-on', e => g.on = e.checked, 'change');
  bind('tp-aurl', e => g.audio = /^https?:\/\//.test(e.value.trim()) ? e.value.trim() : (g.audio && g.audio.startsWith('data:') ? g.audio : ''));
  $('#tp-afile').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 250 * 1024) { $('#tp-ainfo').textContent = 'الملف أكبر من 250KB. قصّ المقطع أو استخدم رابطاً'; return; }
    const r = new FileReader(); r.onload = () => { g.audio = r.result; saveCfg(); EXTRA.taps($('#main')); }; r.readAsDataURL(f);
  };
  if ($('#tp-aclr')) $('#tp-aclr').onclick = () => { g.audio = ''; saveCfg(); EXTRA.taps($('#main')); };
  $('#tp-snd').onclick = () => playSound(g.sound, g.audio);
  m.querySelectorAll('[data-tap]').forEach(b => b.onclick = () => { const n = +b.dataset.tap; fire(n ? { type: 'like', user: pick(), count: n } : { type: 'reset' }); });
  obsCopy(m, 'taps-neon'); fitStages();
};
