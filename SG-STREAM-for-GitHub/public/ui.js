// Small UI kit for the dashboard: toast, glass modal, slide-over drawer, quick-connect modal,
// live simulation of a template inside its card, and the "customise" drawer.
// Loaded after index.html's main script, so it can use its globals (me, api, setMe, esc, copy, ovUrl, useTpl, ...).

function toast(msg, kind = 'ok', ms = 3600) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 450); }, ms);
}

function openModal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="x" aria-label="إغلاق">✕</button>${html}</div>`;
  document.body.appendChild(bg);
  const close = () => { bg.classList.remove('in'); document.removeEventListener('keydown', onKey); setTimeout(() => bg.remove(), 250); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.querySelector('.x').onclick = close;
  requestAnimationFrame(() => bg.classList.add('in'));
  return { el: bg.querySelector('.modal'), close };
}

function openDrawer(title, html) {
  const bg = document.createElement('div'); bg.className = 'drawer-bg';
  bg.innerHTML = `<aside class="drawer"><div class="dh"><b>${title}</b><button class="x" aria-label="إغلاق">✕</button></div><div class="db">${html}</div></aside>`;
  document.body.appendChild(bg);
  const close = () => { bg.classList.remove('in'); document.removeEventListener('keydown', onKey); setTimeout(() => bg.remove(), 300); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.querySelector('.x').onclick = close;
  requestAnimationFrame(() => bg.classList.add('in'));
  return { el: bg.querySelector('.drawer'), body: bg.querySelector('.db'), close };
}

// ---------- connection hub (the button at the top left): TikTok and Twitch ----------
(function injectHubStyle() {
  const s = document.createElement('style');
  s.textContent = `.hub-tabs button{display:flex;gap:6px;align-items:center;justify-content:center} .hub-tabs button.on.tw{background:#2a1a4d;border-color:#9146ff;color:#d8c4ff} .hub-tabs button.on.kk{background:#0f2a0a;border-color:#53fc18;color:#b9ffa0}
  .chk{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:#0a0e1c;margin:8px 0 12px;min-height:64px} .chk img,.chk .av{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#1b2745;display:grid;place-items:center;font-size:22px;flex:none}
  .chk.live{border-color:#ff2d55;box-shadow:0 0 16px #ff2d5544} .badge-live{background:#ff2d55;color:#fff;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:800;animation:dotPulse 1.4s infinite} .badge-off{background:#2a3350;color:#aab3cf;border-radius:6px;padding:1px 8px;font-size:12px}
  .btn.tw{background:linear-gradient(90deg,#9146ff,#c084fc);color:#fff;box-shadow:0 6px 22px #9146ff55} .btn.kk{background:linear-gradient(90deg,#53fc18,#a3ff6b);color:#06210a;box-shadow:0 6px 22px #53fc1855} .tw-info{font-size:13px;line-height:1.9;color:var(--mut);background:#0a0e1c;border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:10px 0}
  .tw-info b.ok{color:#5eead4} .tw-info b.no{color:#fbbf24}`;
  document.head.appendChild(s);
})();
const twState = () => me.twitch || { connected: false, reconnecting: false, channel: '' };
const kkState = () => me.kick || { connected: false, reconnecting: false, channel: '' };
function openConnect(initial) {
  let tab = initial || (!me.connected && twState().connected ? 'twitch' : !me.connected && kkState().connected ? 'kick' : 'tiktok'), checkT, checkSeq = 0;
  const m = openModal(`<div class="mt">📡 مركز الاتصال بالبث</div><p class="mp">اختر منصتك واكتب حسابك. تقدر توصّل المنصتين مع بعض.</p>
    <div class="seg hub-tabs" id="hub-tabs"><button data-p="tiktok"></button><button data-p="twitch"></button><button data-p="kick"></button></div><div id="hub-body" style="margin-top:14px"></div>`);
  const body = m.el.querySelector('#hub-body');
  const refreshTabs = () => m.el.querySelectorAll('#hub-tabs button').forEach(b => { const p = b.dataset.p, on = p === 'tiktok' ? me.connected : p === 'twitch' ? twState().connected : kkState().connected; b.classList.toggle('on', p === tab); b.classList.toggle('tw', p === 'twitch'); b.classList.toggle('kk', p === 'kick'); b.innerHTML = p === 'tiktok' ? `${on ? '🟢' : '⚫'} تيك توك TikTok` : p === 'twitch' ? `${on ? '🟣' : '⚫'} تويتش Twitch` : `${on ? '🟩' : '⚫'} كيك Kick`; });
  const done = (msg) => { updateNav(); toast(msg); m.close(); if (view === 'conn' || view === 'home') render(); };
  function drawTikTok() {
    body.innerHTML = `${me.connected ? `<div class="okbox"><span class="pdot">🟢</span> متصل ببث: <b dir="ltr">@${esc(me.tiktok)}</b></div>` : me.reconnecting ? '<div class="okbox" style="border-color:#fbbf24;color:#fbbf24;background:#2a2108">🟡 انقطع الاتصال، يعيد المحاولة تلقائياً…</div>' : ''}
      <input id="cm-user" dir="ltr" placeholder="@username" value="${me.tiktok ? '@' + esc(me.tiktok) : ''}" autocomplete="off">
      <div id="cm-check" class="chk"><span class="av">👤</span><span class="sub" style="margin:0">اكتب يوزر حسابك وبفحص إذا هو في بث الآن</span></div>
      <div id="cm-err" class="err"></div>
      <button class="btn glow" id="cm-go">⚡ ${me.connected ? 'إعادة الاتصال' : 'اتصال فوري بالبث'}</button>${me.connected ? '<button class="btn ghost" id="cm-dc" style="margin-top:8px">قطع اتصال تيك توك</button>' : ''}`;
    const input = body.querySelector('#cm-user'), box = body.querySelector('#cm-check');
    const check = async () => {
      const u = input.value.trim().replace(/^@/, ''); const seq = ++checkSeq;
      if (!/^[A-Za-z0-9._]{2,30}$/.test(u)) { box.className = 'chk'; box.innerHTML = '<span class="av">👤</span><span class="sub" style="margin:0">اكتب يوزر حسابك وبفحص إذا هو في بث الآن</span>'; return; }
      box.className = 'chk'; box.innerHTML = '<span class="av">🔍</span><span class="sub" style="margin:0">جاري فحص الحساب…</span>';
      let d; try { d = await api('/api/tiktok/check?user=' + encodeURIComponent(u)); } catch (e) { d = { error: e.message }; }
      if (seq !== checkSeq || !box.isConnected) return; // a newer check superseded this one
      const av = d.avatar ? `<img src="${esc(d.avatar)}" referrerpolicy="no-referrer" alt="" onerror="this.outerHTML='<span class=&quot;av&quot;>👤</span>'">` : '<span class="av">👤</span>';
      if (d.error) { box.innerHTML = `<span class="av">⚠️</span><span class="sub" style="margin:0">تعذّر فحص الحساب (${esc(d.error)}). تقدر تحاول الاتصال مباشرة.</span>`; }
      else if (d.live) { box.className = 'chk live'; box.innerHTML = `${av}<div style="min-width:0"><b>${esc(d.nickname || u)}</b> <span dir="ltr" style="color:var(--mut)">@${esc(u)}</span> <span class="badge-live">● LIVE</span><div class="sub" style="margin:4px 0 0">👁 ${Number(d.viewers || 0).toLocaleString('en-US')} مشاهد الآن${d.title ? ' · ' + esc(String(d.title).slice(0, 50)) : ''}</div></div>`; }
      else { box.innerHTML = `${av}<div><span dir="ltr"><b>@${esc(u)}</b></span> <span class="badge-off">غير متصل حالياً</span><div class="sub" style="margin:4px 0 0">ما فيه بث مباشر الآن. ابدأ بثك ثم اتصل.</div></div>`; }
    };
    input.oninput = () => { clearTimeout(checkT); checkT = setTimeout(check, 700); }; if (input.value) check();
    const go = async () => {
      const btn = body.querySelector('#cm-go'), err = body.querySelector('#cm-err'); err.textContent = '';
      const u = input.value.trim().replace(/^@/, ''); if (!u) { err.textContent = 'اكتب يوزر TikTok أولاً'; return; }
      btn.disabled = true; btn.textContent = '… جاري الاتصال';
      try { setMe(await api('/api/connect', { username: u })); done(`🟢 تم الاتصال ببث @${u}`); }
      catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = '⚡ اتصال فوري بالبث'; }
    };
    body.querySelector('#cm-go').onclick = go; input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    const ul = body.querySelector('#tw-unlink'); if (ul) ul.onclick = async () => { setMe(await api('/api/twitch/unlink', {})); toast('تم إلغاء ربط تويتش', 'warn'); drawTwitch(); };
    const dc = body.querySelector('#cm-dc'); if (dc) dc.onclick = async () => { setMe(await api('/api/disconnect', { platform: 'tiktok' })); updateNav(); toast('تم قطع اتصال تيك توك', 'warn'); drawTikTok(); refreshTabs(); if (view === 'conn' || view === 'home') render(); };
  }
  function twAuthBox(a) {
    const redirect = baseUrl().origin + '/auth/twitch/callback';
    if (a.linked) return `<div class="okbox" style="margin-top:8px;border-color:#9146ff;color:#d8c4ff;background:#1d1238">✅ حساب تويتش مربوط: <b dir="ltr">${esc(a.login)}</b> · المتابعون ونقاط القناة ${a.live ? '<b>تعمل الآن 🟢</b>' : '<b style="color:#fbbf24">قيد الاتصال…</b>'}${a.error ? `<br><small>${esc(a.error)}</small>` : ''}</div><button class="btn ghost sm" id="tw-unlink" style="margin-top:6px;width:auto">إلغاء ربط الحساب</button>`;
    if (a.enabled) return `<b class="ok">⭐ المتابعون ونقاط القناة:</b> اربط حساب تويتش مرة وحدة وتظهر المتابعات الجديدة وجوائز نقاط القناة كتنبيهات (الجائزة تُعامل كهدية باسمها وسعرها).<br><a class="btn sm" href="/auth/twitch/start" style="display:inline-block;width:auto;margin-top:6px;text-decoration:none">🟣 ربط حساب تويتش (OAuth)</a>`;
    return `<div style="margin-top:6px;opacity:.9">ℹ️ <b>المتابعون ونقاط القناة (اختياري):</b> غير مفعّلة بعد من إدارة الموقع. الشات والاشتراكات والـ Bits والغارات تشتغل الآن بدون أي شي إضافي.</div><details style="margin-top:6px"><summary style="cursor:pointer;color:#c4b5fd">🔧 لصاحب الموقع: كيف أفعّلها؟ (مرة وحدة، 3 دقائق)</summary><ol style="margin:6px 18px;line-height:1.9"><li>افتح <span dir="ltr">dev.twitch.tv/console</span> ثم <b>Register Your Application</b>.</li><li>الاسم: أي اسم • <b>OAuth Redirect URL</b>: <code dir="ltr">${esc(redirect)}</code> • التصنيف: <span dir="ltr">Website Integration</span> ثم Create، ثم Manage: انسخ <span dir="ltr">Client ID</span> واضغط <span dir="ltr">New Secret</span> وانسخ <span dir="ltr">Client Secret</span>.</li><li>في Render: <span dir="ltr">Environment</span> ثم أضف <span dir="ltr">TWITCH_CLIENT_ID</span> و<span dir="ltr">TWITCH_CLIENT_SECRET</span> واحفظ (يعيد التشغيل تلقائياً). بعدها يظهر زر الربط لكل المستخدمين.</li></ol></details>`;
  }
  function drawTwitch() {
    const t = twState();
    body.innerHTML = `${t.connected ? `<div class="okbox" style="border-color:#9146ff;color:#d8c4ff;background:#1d1238"><span class="pdot">🟣</span> متصل بقناة تويتش: <b dir="ltr">#${esc(t.channel)}</b></div>` : t.reconnecting ? '<div class="okbox" style="border-color:#fbbf24;color:#fbbf24;background:#2a2108">🟡 انقطع الاتصال، يعيد المحاولة تلقائياً…</div>' : ''}
      <input id="cm-tw" dir="ltr" placeholder="اسم قناة تويتش (مثل xqc)" value="${t.channel ? esc(t.channel) : ''}" autocomplete="off">
      <div class="tw-info"><b class="ok">✓ يشتغل بدون تسجيل دخول:</b> الشات (مع علامة المشترك) • الاشتراكات (جديد وتجديد وهدايا) • دعم Bits (Cheers) • الغارات (Raids)<br>
        ${twAuthBox(me.twitchAuth || {})}
        <span>كل هذي الأحداث تظهر في القوالب والتنبيهات وعجلة الحظ والقارئ الصوتي وجسر الألعاب مثل تيك توك. ما نعرف إذا كانت القناة في بث، لكن الشات يوصل أول ما يبدأ.</span></div>
      <div class="tw-info" style="margin-top:8px"><b>🧪 اختبار الشات في OBS:</b> أضف هذا الرابط في OBS كـ Browser Source (للشات فقط، لا يُستخدم رابط التنبيهات)، ثم اضغط «إرسال رسالة اختبار» وتظهر فوراً.<br><code dir="ltr" style="word-break:break-all">${esc(ovUrl('uchat-card'))}</code><br><button class="btn ghost sm" id="tw-copy" style="width:auto;margin-top:6px">نسخ الرابط</button> <button class="btn sm" id="tw-test" style="width:auto;margin-top:6px">💬 إرسال رسالة اختبار</button></div>
      <div id="cm-err" class="err"></div>
      <button class="btn tw" id="cm-go">🟣 ${t.connected ? 'إعادة الاتصال' : 'اتصال بقناة تويتش'}</button>${t.connected ? '<button class="btn ghost" id="cm-dc" style="margin-top:8px">قطع اتصال تويتش</button>' : ''}`;
    const input = body.querySelector('#cm-tw');
    const go = async () => {
      const btn = body.querySelector('#cm-go'), err = body.querySelector('#cm-err'); err.textContent = '';
      const u = input.value.trim().replace(/^[#@]/, ''); if (!u) { err.textContent = 'اكتب اسم قناة تويتش أولاً'; return; }
      btn.disabled = true; btn.textContent = '… جاري الاتصال';
      try { setMe(await api('/api/connect', { platform: 'twitch', username: u })); done(`🟣 تم الاتصال بقناة تويتش #${u.toLowerCase()}`); }
      catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = '🟣 اتصال بقناة تويتش'; }
    };
    body.querySelector('#cm-go').onclick = go; input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    body.querySelector('#tw-copy').onclick = (e) => copy(ovUrl('uchat-card'), e.target);
    body.querySelector('#tw-test').onclick = () => { fire({ type: 'chat', user: 'TwitchViewer', text: '👋 اختبار شات تويتش — إذا شفت هذي الرسالة في OBS فالربط سليم', platform: 'twitch', sub: true }); toast('أُرسلت رسالة اختبار. إذا ما ظهرت في OBS تأكد أن المصدر هو رابط الشات أعلاه وأن OBS يشغّل الصفحة'); };
    const ul = body.querySelector('#tw-unlink'); if (ul) ul.onclick = async () => { setMe(await api('/api/twitch/unlink', {})); toast('تم إلغاء ربط تويتش', 'warn'); drawTwitch(); };
    const dc = body.querySelector('#cm-dc'); if (dc) dc.onclick = async () => { setMe(await api('/api/disconnect', { platform: 'twitch' })); updateNav(); toast('تم قطع اتصال تويتش', 'warn'); drawTwitch(); refreshTabs(); if (view === 'conn' || view === 'home') render(); };
  }
  function drawKick() {
    const k = kkState(), origin = baseUrl().origin;
    const head = k.connected ? `<div class="okbox" style="border-color:#53fc18;color:#b9ffa0;background:#0f2a0a"><span class="pdot">🟩</span> قناة كيك مربوطة: <b dir="ltr">${esc(k.channel)}</b> · الأحداث المستلمة <b>${k.events || 0}</b></div>` : k.linked ? `<div class="okbox" style="border-color:#fbbf24;color:#fbbf24;background:#2a2108">🟡 الحساب مربوط لكن الاشتراك بالأحداث لم يكتمل${k.error ? ' (' + esc(k.error) + ')' : ''}</div>` : '';
    let main;
    if (k.linked) main = `<div class="tw-info"><b class="ok">✓ كيك يرسل الأحداث لموقعك مباشرة:</b> الشات (مع علامة المشترك) • الاشتراكات وهدايا الاشتراكات • هدايا Kicks • المتابعون الجدد • جوائز النقاط<br><span>لو ما وصل أي حدث تأكد أن رابط الموقع عام ويبدأ بـ https (ويشتغل من الإنترنت) وأن رابط الـ Webhook في تطبيق كيك هو: <code dir="ltr">${esc(origin)}/kick/webhook</code></span></div><button class="btn ghost" id="kk-unlink">إلغاء ربط الحساب</button>`;
    else if (k.enabled) main = `<div class="tw-info"><b class="ok">✓ اربط حساب كيك مرة وحدة:</b> بعدها تصل الأحداث (شات، اشتراكات، هدايا Kicks، متابعين، جوائز) لكل القوالب والتنبيهات وعجلة الحظ والقارئ الصوتي وجسر الألعاب والشات الموحّد مثل تيك توك.</div><a class="btn kk" href="/auth/kick/start" style="display:block;text-align:center;text-decoration:none">🟩 ربط حساب كيك</a>`;
    else main = `<div class="tw-info"><b class="no">⚠ كيك أغلق الاتصال المجاني بالشات، وصار يحتاج تطبيق خاص من صاحب الموقع:</b> يسجّل تطبيقاً في <span dir="ltr">dev.kick.com</span> ويضع رابط العودة <code dir="ltr">${esc(origin)}/auth/kick/callback</code> ورابط الـ Webhook <code dir="ltr">${esc(origin)}/kick/webhook</code> (لازم https وعام) ثم يضيف <span dir="ltr">KICK_CLIENT_ID</span> و<span dir="ltr">KICK_CLIENT_SECRET</span> للسيرفر. بعدها يظهر هنا زر الربط.</div>`;
    body.innerHTML = head + main;
    const ul = body.querySelector('#kk-unlink'); if (ul) ul.onclick = async () => { setMe(await api('/api/kick/unlink', {})); updateNav(); toast('تم إلغاء ربط كيك', 'warn'); drawKick(); refreshTabs(); if (view === 'conn' || view === 'home') render(); };
  }
  const draw = () => { refreshTabs(); (tab === 'twitch' ? drawTwitch : tab === 'kick' ? drawKick : drawTikTok)(); const i = body.querySelector('input'); if (i && !i.value) i.focus(); };
  m.el.querySelectorAll('#hub-tabs button').forEach(b => b.onclick = () => { tab = b.dataset.p; draw(); });
  draw();
}
// ---------- live simulation: the template inside its card actually animates ----------
const SIM_NAMES = ['سارة', 'Ahmed', 'Lina', 'خالد', 'Noor', 'Zed', 'ريم', 'Omar'];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const simName = () => SIM_NAMES[rnd(0, SIM_NAMES.length - 1)];
// returns [[delayMs, event], ...] suited to the template
function simPlan(t) {
  const g = (i, extra = {}) => [i * 650, { type: 'gift', user: simName(), gift: ['Rose', 'Lion', 'Heart'][i % 3], count: rnd(1, 9), diamonds: 50, ...extra }];
  const lk = (i, n) => [i * 700, { type: 'like', user: simName(), count: n }];
  switch (t.view) {
    // fixed names and amounts on purpose: they are chosen so the ranking visibly reshuffles against the demo board
    case 'top': return t.mode === 'likes'
      ? [['خالد', 900], ['Ahmed', 700], ['Lina', 400], ['Zed', 1500], ['سارة', 300], ['Noor', 200], ['Omar', 800], ['خالد', 600], ['Lina', 500]].map(([u, n], i) => [i * 650, { type: 'like', user: u, count: n }])
      : [['Noor', 40], ['خالد', 50], ['Lina', 30], ['Zed', 100], ['Ahmed', 60], ['سارة', 20], ['Noor', 70], ['Lina', 45], ['Omar', 90]].map(([u, n], i) => [i * 650, { type: 'gift', user: u, gift: ['Rose', 'Lion', 'Heart'][i % 3], count: n, diamonds: 50 }]);
    case 'alerts': {
      const all = [{ type: 'gift', gift: 'Rose', count: 2, diamonds: 10 }, { type: 'gift', gift: 'Lion', count: 1, diamonds: 1000 }, { type: 'follow' }, { type: 'like', count: 60 }, { type: 'share' }, { type: 'sub' }];
      const use = t.only ? all.filter(e => e.type === t.only) : all;
      return (use.length ? use : all).map((e, i) => [i * 3000, { user: simName(), ...e }]);
    }
    case 'taps': return Array.from({ length: 5 }, (_, i) => lk(i, 400));
    case 'hearts': return Array.from({ length: 8 }, (_, i) => lk(i, rnd(5, 40)));
    case 'goal-bar': return Array.from({ length: 8 }, (_, i) => g(i, { count: 5 }));
    case 'counter': return Array.from({ length: 8 }, (_, i) => t.v === 'followers' ? [i * 600, { type: 'follow', user: simName() }] : t.v === 'likes' ? lk(i, rnd(20, 90)) : g(i));
    case 'uchat': return [['سارة', 'tiktok', 'أهلاً بالجميع 👋'], ['Ninja', 'twitch', 'GG what a play!'], ['خالد', 'tiktok', 'بث حلو والله'], ['Noor', 'twitch', 'LETS GOOO 🔥'], ['Lina', 'tiktok', 'وين الهدف؟'], ['Omar', 'twitch', 'nice stream'], ['ريم', 'tiktok', 'ما شاء الله'], ['Zed', 'twitch', 'Hi from Twitch!']].map(([u, pl, x], i) => [i * 800, { type: 'chat', user: u, platform: pl, text: x, sub: i % 3 === 1 }]);
    case 'chat': return ['أهلاً بالجميع 👋', 'بث حلو والله 🔥', 'كم الهدف اليوم؟', 'ما شاء الله عليك', 'وين الجائزة؟ 😄', 'نكمل التحدي!'].map((x, i) => [i * 900, { type: 'chat', user: simName(), text: x }]);
    case 'recent': case 'ticker': return Array.from({ length: 8 }, (_, i) => i % 3 === 1 ? [i * 700, { type: 'follow', user: simName() }] : g(i));
    case 'versus': return Array.from({ length: 10 }, (_, i) => g(i, { team: i % 2 ? 'B' : 'A', count: rnd(2, 9) }));
    case 'gift-rocket': case 'gift-timer': return Array.from({ length: 8 }, (_, i) => g(i));
    case 'wheel': return [[200, { type: 'spin' }]];
    default: return [];
  }
}
// plays the plan inside one preview frame; resolves when finished
function simulate(t, frame) {
  return new Promise((resolve) => {
    const plan = simPlan(t); if (!plan.length || !frame || !frame.contentWindow) return resolve(0);
    let last = 0;
    plan.forEach(([d, ev]) => { last = Math.max(last, d); setTimeout(() => { try { frame.contentWindow.postMessage({ sg: 'event', ev }, location.origin); } catch {} }, d); });
    setTimeout(() => resolve(plan.length), last + (t.view === 'wheel' ? 4500 : 1200));
  });
}
async function runSim(t, btn, frame) {
  if (btn.dataset.busy) return;
  const old = btn.innerHTML;
  if (!simPlan(t).length) { toast('هذا القالب يتبدّل تلقائياً بين حساباتك، ما يحتاج محاكاة', 'warn'); return; }
  btn.dataset.busy = '1'; btn.disabled = true; btn.innerHTML = '⚡ جاري المحاكاة…';
  await simulate(t, frame);
  btn.innerHTML = old; btn.disabled = false; delete btn.dataset.busy;
}

// ---------- customise drawer ----------
const ANIMS = { slide: 'انزلاق من الأعلى', zoom: 'تكبير', bounce: 'ارتداد', flip: 'قلب ثلاثي الأبعاد', fade: 'تلاشي' };
const DEF_OPTS = { rows: 5, bg: 82, glow: '', scale: 100, anim: 'slide' };
function openCustomize(t) {
  store.set('lsx-cfg', me.cfg); // the preview frame reads the saved settings
  const saved = (me.cfg.tplOpts || {})[t.id], opts = { ...DEF_OPTS, ...(saved || {}) };
  const hasRows = ['top', 'recent', 'chat'].includes(t.view);
  const d = openDrawer(`⚙️ تخصيص: ${esc(t.name)}`, `
    <div class="pvbox big"><iframe id="cz-pv" src="overlay.html?t=${t.id}&demo=1"></iframe></div>
    <div class="row" style="margin:10px 0"><button class="btn sm" id="cz-sim">⚡ محاكاة حية</button><button class="btn ghost sm" id="cz-reset">↺ الافتراضي</button></div>
    <div class="czgrid">
      <label class="czrow">عدد المراكز المعروضة ${hasRows ? '' : '<small>(للقوائم والشات فقط)</small>'}
        <div class="seg" id="cz-rows">${[3, 5, 10].map(n => `<button data-v="${n}" ${hasRows ? '' : 'disabled'}>${n} مراكز</button>`).join('')}</div></label>
      <label class="czrow">شفافية الخلفية <b id="cz-bgv"></b><input type="range" id="cz-bg" min="0" max="100"></label>
      <label class="czrow">حجم العنصر <b id="cz-scv"></b><input type="range" id="cz-sc" min="60" max="160"></label>
      <label class="czrow">لون التوهج
        <div class="row"><input type="color" id="cz-glow" style="width:56px;height:38px;padding:2px"><label class="row" style="color:var(--txt)"><input type="checkbox" id="cz-gon" style="width:auto"> تفعيل التوهج</label></div></label>
      <label class="czrow">أنيميشن دخول داعم جديد
        <select id="cz-anim">${Object.entries(ANIMS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    </div>
    <div class="row" style="margin-top:16px"><button class="btn glow" id="cz-save">💾 حفظ ونسخ الرابط المخصص</button><button class="btn ghost" id="cz-only">حفظ فقط</button></div>
    <p class="sub" style="margin-top:12px;font-size:12px">الرابط نفسه ما يتغيّر في OBS: التعديلات تنعكس عليه تلقائياً بعد الحفظ.</p>`);
  const el = d.el, $q = (s) => el.querySelector(s), pv = $q('#cz-pv');
  const fit = () => { const b = $q('.pvbox'); pv.style.transform = `scale(${b.clientWidth / 700})`; }; fit(); setTimeout(fit, 120);
  const sync = () => {
    el.querySelectorAll('#cz-rows button').forEach(b => b.classList.toggle('on', +b.dataset.v === +opts.rows));
    $q('#cz-bg').value = opts.bg; $q('#cz-bgv').textContent = opts.bg + '%'; $q('#cz-sc').value = opts.scale; $q('#cz-scv').textContent = opts.scale + '%';
    $q('#cz-glow').value = opts.glow || '#00F0FF'; $q('#cz-gon').checked = !!opts.glow; $q('#cz-anim').value = opts.anim;
  };
  const push = () => { try { pv.contentWindow.postMessage({ sg: 'opts', opts: { ...opts } }, location.origin); } catch {} };
  sync();
  el.querySelectorAll('#cz-rows button').forEach(b => b.onclick = () => { opts.rows = +b.dataset.v; sync(); push(); });
  $q('#cz-bg').oninput = (e) => { opts.bg = +e.target.value; sync(); push(); };
  $q('#cz-sc').oninput = (e) => { opts.scale = +e.target.value; sync(); push(); };
  $q('#cz-glow').oninput = (e) => { opts.glow = e.target.value; $q('#cz-gon').checked = true; push(); };
  $q('#cz-gon').onchange = (e) => { opts.glow = e.target.checked ? $q('#cz-glow').value : ''; push(); };
  $q('#cz-anim').onchange = (e) => { opts.anim = e.target.value; push(); };
  $q('#cz-reset').onclick = () => { Object.assign(opts, DEF_OPTS); sync(); push(); };
  $q('#cz-sim').onclick = (e) => runSim(t, e.currentTarget, pv);
  const save = () => { me.cfg.tplOpts = { ...(me.cfg.tplOpts || {}), [t.id]: { ...opts } }; saveCfg(); };
  $q('#cz-only').onclick = () => { save(); toast('✅ تم حفظ التخصيص'); };
  $q('#cz-save').onclick = () => { save(); useTpl(t); refreshBadges(); copyLink(ovUrl(t.id), '✅ تم حفظ التخصيص ونسخ الرابط! ضعه في متصفح OBS'); d.close(); };
}

// marks the card whose template is the one currently used in OBS for its slot
function refreshBadges() {
  document.querySelectorAll('.tpl[data-id]').forEach(c => {
    const t = TEMPLATES.find(x => x.id === c.dataset.id), on = t && t.id === slotCur(slotKey(t));
    c.classList.toggle('sel', !!on);
    const b = c.querySelector('.stat-badge'); if (b) b.innerHTML = on ? '<span class="tag live-tag">• مُفعل في OBS</span>' : (t.sub ? '<span class="tag">المشتركين</span>' : '');
  });
}
