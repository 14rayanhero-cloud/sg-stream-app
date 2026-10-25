// Chat bot page: AI auto-reply (Groq / Gemini / OpenAI), commands, welcome message, banned words.
// Loaded after views3.js (uses me, api, fire, EXTRA, toast, esc, $, opts, ...).

const AI_PROVIDER_INFO = {
  groq: { name: 'Groq (مجاني وسريع جداً)', link: 'https://console.groq.com/keys', how: 'سجّل بحساب Google ثم Create API Key' },
  gemini: { name: 'Google Gemini (مجاني)', link: 'https://aistudio.google.com/apikey', how: 'سجّل بحساب Google ثم Create API key' },
  openai: { name: 'OpenAI (مدفوع)', link: 'https://platform.openai.com/api-keys', how: 'يحتاج رصيد في حسابك' },
};
const AI_PERSONA_NAMES = { hype: '🔥 قيمنق حماسي', friendly: '😄 ودود وساخر بلطف', formal: '🎩 مساعد رسمي', khaleeji: '🇸🇦 لهجة خليجية عامية', custom: '✍️ مخصّص (اكتب تعليماتك)' };
const AI_MODES = { questions: 'يرد على الأسئلة وعلى من ينادي البوت', all: 'يرد على كل التعليقات (مع حدود التكرار)', mention: 'يرد فقط لما ينادونه باسمه' };

EXTRA.bot = (m) => {
  const B = me.bot || (me.bot = { on: true, welcome: '', banned: '', cmds: [] });
  B.cmds = B.cmds || [];
  const A = B.aiReply = { ...me.botAi, ...(B.aiReply || {}) }; // resolved defaults + what the account saved
  const ai = me.ai || { provider: 'local', model: '', hasKey: false };
  const prov = ['groq', 'gemini', 'openai'].includes(ai.provider) ? ai.provider : 'groq';
  const personaText = (p) => (me.personas || {})[p] || '';
  let saveT; const saveBot = () => { clearTimeout(saveT); saveT = setTimeout(() => api('/api/bot', B).catch(() => {}), 450); };
  const log = store.get('lsx-botlog', []);

  m.innerHTML = `<div class="top"><div><h2>🤖 روبوت الدردشة</h2><div class="sub">رد ذكي بالذكاء الاصطناعي على تعليقات متابعيك، وأوامر وردود جاهزة وإشراف على الشات</div></div></div>

    <div class="panel" style="border-color:${A.on ? '#14b8a6' : 'var(--line)'}">
      <div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">🧠 الرد الذكي بالـ AI</h3>
        <label class="row" style="color:var(--txt);font-weight:800"><input type="checkbox" id="ai-on" ${A.on ? 'checked' : ''} style="width:auto;margin:0"> تفعيل الرد الذكي التلقائي</label></div>
      <div id="ai-status" class="sub" style="margin:0 0 12px"></div>

      <div class="ctl">
        <label>مزوّد الذكاء الاصطناعي<select id="ai-prov">${Object.entries(AI_PROVIDER_INFO).map(([k, v]) => `<option value="${k}" ${k === prov ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label>
        <label>مفتاح الـ API <span id="ai-keystate" style="color:#5eead4"></span><input id="ai-key" type="password" dir="ltr" autocomplete="off" placeholder="${ai.hasKey ? '•••••• محفوظ (اكتب مفتاحاً جديداً للتغيير)' : 'الصق المفتاح هنا'}"></label>
        <label>النموذج (اختياري)<input id="ai-model" dir="ltr" value="${esc(ai.model || '')}" placeholder="${esc((me.aiDefaults || {})[prov] || '')}"></label>
      </div>
      <div class="row" style="margin:10px 0 4px"><button class="btn sm" id="ai-savekey">💾 حفظ المفتاح</button><button class="btn ghost sm" id="ai-testkey">🔌 اختبار المفتاح</button>${ai.hasKey ? '<button class="btn ghost sm" id="ai-clear">حذف المفتاح</button>' : ''}<span id="ai-keymsg" class="sub" style="margin:0"></span></div>
      <div id="ai-howto" class="sub" style="margin:0 0 14px"></div>

      <div class="ctl">
        <label>شخصية البوت<select id="ai-persona">${Object.entries(AI_PERSONA_NAMES).map(([k, v]) => `<option value="${k}" ${A.persona === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>متى يرد؟<select id="ai-mode">${Object.entries(AI_MODES).map(([k, v]) => `<option value="${k}" ${A.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>اسم البوت (يظهر في الشات، وينادونه فيه)<input id="ai-name" value="${esc(A.name)}" maxlength="24"></label>
      </div>
      <label class="czrow" style="display:block;margin-top:12px;color:var(--mut);font-size:13px">تعليمات النظام (System Prompt): كيف يتصرف وماذا يقول <span id="ai-count" style="float:left"></span>
        <textarea id="ai-system" rows="4" maxlength="1200" style="width:100%;margin-top:6px;padding:10px;background:#0a0e1c;border:1px solid var(--line);border-radius:10px;color:var(--txt);font:inherit" placeholder="مثال: أنت مساعد للبث، رد باختصار وبحماس على المتابعين ولا تسب أبداً."></textarea></label>
      <div class="sub" style="margin:6px 0 14px">🔒 القواعد الأمنية ثابتة وتُضاف دائماً مهما كتبت: لا سب ولا إهانة، لا سياسة ولا دين، لا روابط، ويتجاهل التعليقات المسيئة والسبام.</div>

      <div class="ctl">
        <label>مهلة بين ردّين لنفس المشاهد (ثانية)<input id="ai-ucd" type="number" min="5" max="900" value="${A.userCooldown}"></label>
        <label>مهلة بين أي ردّين (ثانية)<input id="ai-gcd" type="number" min="0" max="120" value="${A.globalCooldown}"></label>
        <label>أقصى عدد ردود بالدقيقة<input id="ai-pm" type="number" min="1" max="30" value="${A.perMinute}"></label>
        <label>أقصى طول الرد (حرف)<input id="ai-max" type="number" min="40" max="300" value="${A.maxChars}"></label>
        <label class="row" style="color:var(--txt);align-self:end"><input type="checkbox" id="ai-cmd" ${A.ignoreCmds ? 'checked' : ''} style="width:auto"> تجاهل الأوامر (اللي تبدأ بـ !)</label>
        <label class="row" style="color:var(--txt);align-self:end"><input type="checkbox" id="ai-speak" ${A.speak ? 'checked' : ''} style="width:auto"> يقرأ الردود بصوت عالٍ (لو القارئ شغّال)</label>
      </div>
      <p class="sub" style="margin:12px 0 0">الرد يظهر في <b>شاشة الشات (Chat overlay)</b> ويقرأه القارئ الصوتي. ما يُكتب داخل شات تيك توك نفسه: هذا يحتاج كوكي جلسة حسابك ومفتاح مدفوع، فاخترنا نبعده عن حسابك.</p>
    </div>

    <div class="panel"><h3>🧪 جرّب الرد الذكي</h3>
      <div class="row"><input id="ait-user" value="سارة" style="width:120px;margin:0"><input id="ait-text" value="كم عمرك؟" style="flex:1;min-width:200px;margin:0"><button class="btn glow sm" id="ait-go">جرّب الرد</button><button class="btn ghost sm" id="ait-screen" title="يمرّ بنفس الطريق الحقيقي، بحدود التكرار">أرسل للشاشة</button></div>
      <div id="ait-res" class="msg" style="margin-top:10px;display:none"></div>
      <h3 style="margin-top:18px">آخر الردود <span class="tag" id="ai-n">0</span></h3><div id="ai-log" style="font-size:13px"><div class="sub">لا توجد ردود بعد.</div></div></div>

    <div class="panel"><div class="row" style="justify-content:space-between"><h3 style="margin:0">⚙️ الأوامر والإشراف</h3>
      <label class="row" style="color:var(--txt)"><input type="checkbox" id="on" ${B.on ? 'checked' : ''} style="width:auto;margin:0"> مفعّل (الأوامر + حذف الكلمات المحظورة)</label></div>
      <h3 style="margin-top:14px">الأوامر</h3>
      <div id="cmds"></div><button class="btn sm" id="add">+ أمر جديد</button>
      <div class="ctl" style="margin-top:14px"><label style="grid-column:1/-1">رسالة الترحيب ({user} = اسم المشاهد)<input id="wl" value="${esc(B.welcome || '')}"></label>
        <label style="grid-column:1/-1">كلمات محظورة (مفصولة بفاصلة) — تنحذف رسالتها ولا يرد عليها الذكاء الاصطناعي<input id="bn" value="${esc(B.banned || '')}"></label></div></div>

    <div class="panel"><h3>جرّب الأوامر والإشراف</h3>
      <div class="row"><input id="tu" value="سارة" style="width:120px;margin:0"><input id="tm" placeholder="اكتب رسالة أو !hello" style="flex:1;margin:0"><button class="btn sm" id="snd">إرسال</button></div>
      <div id="lg" style="margin-top:12px;font-size:14px">${log.map(l => `<div>${l}</div>`).join('')}</div></div>`;

  const q = (s) => m.querySelector(s);
  // ---------- AI panel ----------
  const setAi = (k, v) => { A[k] = v; B.aiReply = A; saveBot(); };
  const syncCount = () => { q('#ai-count').textContent = `${q('#ai-system').value.length}/1200`; };
  q('#ai-system').value = A.system || personaText(A.persona); syncCount();
  const refreshHowto = () => { const p = AI_PROVIDER_INFO[q('#ai-prov').value]; q('#ai-howto').innerHTML = `احصل على مفتاح ${esc(p.name.split(' ')[0])}: <a href="${p.link}" target="_blank" rel="noopener" style="color:var(--a)">${p.link.replace('https://', '')}</a> — ${esc(p.how)}`; q('#ai-model').placeholder = (me.aiDefaults || {})[q('#ai-prov').value] || ''; };
  refreshHowto();
  q('#ai-keystate').textContent = ai.hasKey ? '✓ محفوظ ومشفّر' : '';
  q('#ai-on').onchange = (e) => { setAi('on', e.target.checked); toast(e.target.checked ? '🧠 الرد الذكي شغّال' : '⏸ تم إيقاف الرد الذكي', e.target.checked ? 'ok' : 'warn'); drawStatus(); };
  q('#ai-prov').onchange = () => { refreshHowto(); };
  q('#ai-persona').onchange = (e) => { A.persona = e.target.value; if (A.persona !== 'custom') q('#ai-system').value = personaText(A.persona); A.system = q('#ai-system').value; B.aiReply = A; syncCount(); saveBot(); };
  q('#ai-system').oninput = (e) => { A.system = e.target.value; if (A.persona !== 'custom') { A.persona = 'custom'; q('#ai-persona').value = 'custom'; } B.aiReply = A; syncCount(); saveBot(); };
  q('#ai-mode').onchange = (e) => setAi('mode', e.target.value);
  q('#ai-name').oninput = (e) => setAi('name', e.target.value);
  const num = (id, k, lo, hi) => { q(id).onchange = (e) => { const v = Math.max(lo, Math.min(hi, +e.target.value || lo)); e.target.value = v; setAi(k, v); }; };
  num('#ai-ucd', 'userCooldown', 5, 900); num('#ai-gcd', 'globalCooldown', 0, 120); num('#ai-pm', 'perMinute', 1, 30); num('#ai-max', 'maxChars', 40, 300);
  q('#ai-cmd').onchange = (e) => setAi('ignoreCmds', e.target.checked); q('#ai-speak').onchange = (e) => setAi('speak', e.target.checked);
  const saveKey = async () => {
    const msg = q('#ai-keymsg'); msg.textContent = '…';
    try { setMe({ ...(await api('/api/ai/settings', { provider: q('#ai-prov').value, model: q('#ai-model').value.trim(), key: q('#ai-key').value.trim() })), cfg: me.cfg }); msg.textContent = '✓ تم الحفظ'; q('#ai-key').value = ''; q('#ai-keystate').textContent = '✓ محفوظ ومشفّر'; drawStatus(); return true; }
    catch (e) { msg.textContent = e.message; return false; }
  };
  q('#ai-savekey').onclick = saveKey;
  q('#ai-testkey').onclick = async (e) => {
    e.target.disabled = true; const msg = q('#ai-keymsg'); msg.textContent = '… جاري الاختبار';
    if (q('#ai-key').value.trim() || q('#ai-prov').value !== ai.provider) await saveKey();
    try { const r = await api('/api/bot/ai-test', { text: 'قل مرحبا بجملة قصيرة', aiReply: A }); msg.textContent = r.ok ? `✅ المفتاح يعمل (${r.ms}ms): «${(r.reply || '(تجاهل)').slice(0, 60)}»` : '❌ ' + r.error; msg.style.color = r.ok ? '#5eead4' : '#f87171'; }
    catch (err) { msg.textContent = err.message; }
    e.target.disabled = false;
  };
  if (q('#ai-clear')) q('#ai-clear').onclick = async () => { setMe({ ...(await api('/api/ai/settings', { provider: q('#ai-prov').value, clearKey: true })), cfg: me.cfg }); toast('تم حذف المفتاح', 'warn'); EXTRA.bot(m); };
  q('#ait-go').onclick = async (e) => {
    const box = q('#ait-res'), text = q('#ait-text').value.trim(); if (!text) return; box.style.display = 'block'; box.textContent = '… جاري التفكير'; e.target.disabled = true;
    try { const r = await api('/api/bot/ai-test', { text, name: q('#ait-user').value || 'سارة', aiReply: A }); box.innerHTML = r.ok ? (r.skipped ? '⏭ المزوّد قرّر تجاهل هذا التعليق (SKIP)' : `<b>${esc(A.name)}:</b> @${esc(q('#ait-user').value)} ${esc(r.reply)} <span class="sub" style="margin:0">(${r.ms}ms)</span>`) : `❌ ${esc(r.error)}`; }
    catch (err) { box.textContent = '❌ ' + err.message; }
    e.target.disabled = false;
  };
  q('#ait-screen').onclick = () => { fire({ type: 'chat', user: q('#ait-user').value || 'سارة', text: q('#ait-text').value }); toast('أُرسل كتعليق حقيقي. الرد يظهر في الشات خلال ثواني (يخضع لحدود التكرار)'); };

  // status line + reply log, refreshed while the page is open
  let lastLog = { lastError: '', replies1h: 0, log: [] };
  const drawStatus = () => {
    const s = q('#ai-status'); if (!s) return; const cur = me.ai || ai;
    const parts = [!cur.hasKey ? '<span style="color:#fbbf24">⚠ ما فيه مفتاح API محفوظ، الرد الذكي ما يشتغل بدونه</span>' : `🔑 ${esc((AI_PROVIDER_INFO[cur.provider] || {}).name || cur.provider)}`,
      A.on ? '<span style="color:#5eead4">● مفعّل</span>' : '○ متوقف', `ردود آخر ساعة: <b>${lastLog.replies1h}</b>`];
    if (lastLog.lastError) parts.push(`<span style="color:#f87171">❌ آخر خطأ: ${esc(lastLog.lastError)}</span>`);
    s.innerHTML = parts.join(' &nbsp;•&nbsp; ');
  };
  const drawLog = (j) => {
    lastLog = j; drawStatus(); const el = q('#ai-log'); if (!el) return; q('#ai-n').textContent = (j.log || []).filter(l => l.reply).length;
    el.innerHTML = (j.log || []).map(l => `<div style="padding:5px 0;border-bottom:1px solid var(--line)"><span style="color:var(--mut)">${new Date(l.t).toLocaleTimeString('ar-SA')}</span> <b>${esc(l.user)}</b>: ${esc(l.text)}<br>${l.reply ? `↳ 🤖 ${esc(l.reply)} <span style="color:var(--mut)">(${l.ms}ms)</span>` : l.skipped ? '↳ <span style="color:var(--mut)">تجاهله البوت</span>' : `↳ <span style="color:#f87171">❌ ${esc(l.error)}</span>`}</div>`).join('') || '<div class="sub">لا توجد ردود بعد.</div>';
  };
  const poll = () => { if (view !== 'bot' || !q('#ai-log')) return clearInterval(pt); api('/api/bot/ai-log').then(drawLog).catch(() => {}); };
  const pt = setInterval(poll, 4000); poll(); drawStatus();

  // ---------- commands / welcome / banned / simulator (unchanged behaviour) ----------
  const drawCmds = () => {
    q('#cmds').innerHTML = B.cmds.map((c, i) => `<div class="row" style="margin-bottom:8px"><input data-ct="${i}" value="${esc(c.t)}" style="width:150px;margin:0"><input data-cr="${i}" value="${esc(c.r)}" style="flex:1;margin:0"><button class="btn ghost sm" data-d="${i}">حذف</button></div>`).join('');
    m.querySelectorAll('[data-ct]').forEach(i => i.oninput = () => { B.cmds[i.dataset.ct].t = i.value; saveBot(); });
    m.querySelectorAll('[data-cr]').forEach(i => i.oninput = () => { B.cmds[i.dataset.cr].r = i.value; saveBot(); });
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { B.cmds.splice(b.dataset.d, 1); saveBot(); drawCmds(); });
  };
  drawCmds();
  q('#add').onclick = () => { B.cmds.push({ t: '!new', r: '' }); saveBot(); drawCmds(); };
  q('#on').onchange = (e) => { B.on = e.target.checked; saveBot(); };
  q('#wl').oninput = (e) => { B.welcome = e.target.value; saveBot(); }; q('#bn').oninput = (e) => { B.banned = e.target.value; saveBot(); };
  q('#snd').onclick = () => {
    const u = q('#tu').value || 'مشاهد', msg = q('#tm').value.trim(); if (!msg) return;
    const out = [`💬 <b>${esc(u)}:</b> ${esc(msg)}`];
    const bad = (B.banned || '').split(/[,،]/).map(s => s.trim()).filter(Boolean).find(w => msg.includes(w));
    if (B.on && bad) out.push(`🚫 تم حذف الرسالة (كلمة محظورة: ${esc(bad)})`);
    else {
      emit({ type: 'chat', user: u, text: msg }); api('/api/test', { type: 'chat', user: u, text: msg }).catch(() => {});
      const c = B.on && B.cmds.find(c => c.t && msg.split(' ')[0].toLowerCase() === c.t.toLowerCase());
      if (c) out.push(`🤖 ${esc(c.r.replace(/\{user\}/g, u))}`);
    }
    const nl = [...out.reverse(), ...log].slice(0, 12); store.set('lsx-botlog', nl); q('#lg').innerHTML = nl.map(l => `<div>${l}</div>`).join('');
  };
};

// =====================================================================
// 💬 Unified chat: TikTok + Twitch messages in one widget, with its own permanent OBS link
// =====================================================================
EXTRA.uchat = (m) => {
  const U = me.cfg.uchat, curTpl = TEMPLATES.find(x => x.id === slotCur('uchat')) || TEMPLATES.find(x => x.view === 'uchat');
  store.set('lsx-cfg', me.cfg);
  m.innerHTML = `<h2>💬 الشات الموحّد (تيك توك + تويتش)</h2>
    <div class="sub">رسائل المنصتين في قائمة وحدة بترتيب وصولها الفعلي، وكل سطر عليه شارة المنصة ولون مختلف لاسم المشاهد. لها رابط OBS مستقل.</div>
    <div class="canvasbox">
      <div class="panel"><h3>معاينة مباشرة</h3><div class="cstage" id="us"><iframe id="us-f" src="overlay.html?slot=uchat"></iframe></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-s="chat">🎵 رسالة تيك توك</button><button class="btn" style="background:linear-gradient(90deg,#9146ff,#c084fc);color:#fff" data-s="chatTw">🟣 رسالة تويتش</button><button class="btn ghost sm" data-mix>🔀 محادثة مختلطة</button></div></div>
      <div class="panel"><h3>الإعدادات</h3><div class="ctl" style="grid-template-columns:1fr">
        <label>الشكل<select id="u-style">${TEMPLATES.filter(x => x.view === 'uchat').map(x => `<option value="${x.id}" ${x.id === curTpl.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
        <label>شكل شارة المنصة<select id="u-badge">${opts({ icon: 'أيقونة (🎵 / 🟣)', text: 'نص (TIKTOK / TWITCH)' }, U.badge)}</select></label>
        <label>عدد الأسطر المعروضة (كل رسالة جديدة تُخفي الأقدم) <b id="u-maxv"></b><input type="range" id="u-max" min="1" max="20"></label>
        <label>حجم الخط <b id="u-fsv"></b><input type="range" id="u-fs" min="14" max="48"></label>
        <label>تختفي الرسالة بعد (ثانية، 0 = تبقى) — للشات والشات الموحّد<input id="u-ttl" type="number" min="0" max="600" value="${uchatTtl(U)}"></label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="u-tt" ${U.tiktok ? 'checked' : ''} style="width:auto"> إظهار رسائل تيك توك</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="u-tw" ${U.twitch ? 'checked' : ''} style="width:auto"> إظهار رسائل تويتش</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="u-kk" ${U.kick !== false ? 'checked' : ''} style="width:auto"> إظهار رسائل كيك</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="u-cmd" ${U.hideCmds ? 'checked' : ''} style="width:auto"> إخفاء الأوامر (اللي تبدأ بـ !)</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="u-bot" ${U.hideBots ? 'checked' : ''} style="width:auto"> إخفاء ردود البوت</label></div></div>
    </div>
    <div class="panel"><h3>رابط OBS للشات الموحّد</h3><code>${ovUrl('uchat-card')}</code>
      <div class="row"><button class="btn glow sm" id="u-copy">🔗 نسخ رابط OBS</button><span class="sub" style="margin:0">رابط دائم مستقل: أضفه كـ Browser Source. يظهر فيه شات المنصة اللي متصل فيها (أو الاثنتين) بدون ما تغيّر الرابط.</span></div>
      <div class="sub" style="margin:10px 0 0">الاتصال: <b>${me.connected ? '🟢 تيك توك @' + esc(me.tiktok) : '⚫ تيك توك'}</b> &nbsp;•&nbsp; <b>${(me.twitch || {}).connected ? '🟣 تويتش #' + esc(me.twitch.channel) : '⚫ تويتش'}</b> &nbsp;•&nbsp; <b>${(me.kick || {}).connected ? '🟩 كيك ' + esc(me.kick.channel) : '⚫ كيك'}</b> <a href="#" id="u-hub" style="color:var(--a)">(إدارة الاتصال)</a></div></div>`;
  const stage = m.querySelector('#us'), frame = m.querySelector('#us-f');
  const fit = () => { const w = Math.min(560, stage.parentElement.clientWidth - 36), k = w / 600; stage.style.width = w + 'px'; stage.style.height = 520 * k + 'px'; frame.style.width = '600px'; frame.style.height = '520px'; frame.style.transform = `scale(${k})`; };
  fit();
  const sync = () => { const mx = uchatMax(U); m.querySelector('#u-maxv').textContent = mx; m.querySelector('#u-fsv').textContent = U.fs + 'px'; m.querySelector('#u-max').value = mx; m.querySelector('#u-fs').value = U.fs; };
  sync();
  bind('u-max', e => { U.max = +e.value; U.maxSet = true; sync(); }); bind('u-fs', e => { U.fs = +e.value; sync(); }); bind('u-ttl', e => { U.ttl = Math.max(0, +e.value || 0); U.ttlSet = true; });
  bind('u-badge', e => U.badge = e.value, 'change'); bind('u-tt', e => U.tiktok = e.checked, 'change'); bind('u-tw', e => U.twitch = e.checked, 'change'); bind('u-kk', e => U.kick = e.checked, 'change');
  bind('u-cmd', e => U.hideCmds = e.checked, 'change'); bind('u-bot', e => U.hideBots = e.checked, 'change');
  m.querySelector('#u-style').onchange = (e) => { useTpl(TEMPLATES.find(x => x.id === e.target.value)); toast('تم تغيير شكل الشات'); setTimeout(() => { if (view === 'uchat') frame.contentWindow.location.reload(); }, 600); };
  m.querySelectorAll('[data-s]').forEach(b => b.onclick = () => fire(SAMPLES[b.dataset.s]()));
  m.querySelector('[data-mix]').onclick = () => simPlan({ view: 'uchat' }).forEach(([d, ev]) => setTimeout(() => fire(ev), d));
  m.querySelector('#u-copy').onclick = () => { store.set('lsx-obs', true); copyLink(ovUrl('uchat-card'), '✅ تم نسخ رابط الشات الموحّد! ضعه في متصفح OBS'); };
  m.querySelector('#u-hub').onclick = (e) => { e.preventDefault(); openConnect(); };
};

// =====================================================================
// 🫙 Gift jar (الحصالة): every gift drops into a glass jar and piles up
// =====================================================================
EXTRA.jar = (m) => {
  me.cfg.jar = { cap: 140, verb: 'أهدى', unit: 'عملة', bubble: true, top: true, total: true, sound: true, ...(me.cfg.jar || {}) };
  const J = me.cfg.jar, curTpl = TEMPLATES.find(x => x.id === slotCur('jar')) || TEMPLATES.find(x => x.view === 'jar');
  store.set('lsx-cfg', me.cfg);
  m.innerHTML = `<h2>🫙 الحصالة (الهدايا تتجمّع)</h2>
    <div class="sub">أي هدية يرسلها أي مشاهد (وردة، قلب، أسد…) تسقط داخل برطمان زجاجي وتتجمّع فوق بعضها بفيزياء حقيقية، مع فقاعة تبرع باسم المهدي وقيمة الهدية، وأعلى داعم، وإجمالي العملات. تبقى محفوظة حتى لو أعدت تحميل الصفحة.</div>
    <div class="canvasbox">
      <div class="panel"><h3>معاينة مباشرة</h3><div class="cstage" id="js"><iframe id="js-f" src="overlay.html?slot=jar"></iframe></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-g="rose1">🌹 وردة</button><button class="btn ghost sm" data-g="rose10">🌹 ×10</button><button class="btn ghost sm" data-g="heart">❤️ قلوب ×14</button><button class="btn ghost sm" data-g="lion">🦁 أسد</button><button class="btn ghost sm" data-g="mix">🎁 مجموعة هدايا</button><button class="btn ghost sm" id="j-clear">🗑 تفريغ الحصالة</button></div></div>
      <div class="panel"><h3>الإعدادات</h3><div class="ctl" style="grid-template-columns:1fr">
        <label>شكل الحصالة<select id="j-style">${TEMPLATES.filter(x => x.view === 'jar').map(x => `<option value="${x.id}" ${x.id === curTpl.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
        <label>أقصى عدد هدايا داخل الحصالة <b id="j-capv"></b><input type="range" id="j-cap" min="30" max="260"></label>
        <label>كلمة الإهداء في الفقاعة<input id="j-verb" maxlength="20" value="${esc(J.verb)}"></label>
        <label>اسم العملة<input id="j-unit" maxlength="20" value="${esc(J.unit)}"></label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="j-bub" ${J.bubble ? 'checked' : ''} style="width:auto"> إظهار فقاعة التبرع</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="j-top" ${J.top ? 'checked' : ''} style="width:auto"> إظهار أعلى داعم</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="j-tot" ${J.total ? 'checked' : ''} style="width:auto"> إظهار إجمالي العملات</label>
        <label class="row" style="color:var(--txt)"><input type="checkbox" id="j-snd" ${J.sound ? 'checked' : ''} style="width:auto"> صوت رنين خفيف مع كل هدية</label></div></div>
    </div>
    <div class="panel"><h3>رابط OBS للحصالة</h3><code>${ovUrl('jar-glass')}</code>
      <div class="row"><button class="btn glow sm" id="j-copy">🔗 نسخ رابط OBS</button><span class="sub" style="margin:0">رابط دائم: أضفه كـ Browser Source (يُفضّل عرض 520 وارتفاع 840 أو أكبر). يظهر فيه كل ما يُهدى في تيك توك وتويتش وكيك، وتغيير الشكل من هنا يطبّق عليه بدون تغيير الرابط.</span></div></div>`;
  const stage = m.querySelector('#js'), frame = m.querySelector('#js-f');
  const fit = () => { const w = Math.min(420, stage.parentElement.clientWidth - 36), k = w / 560; stage.style.width = w + 'px'; stage.style.height = 840 * k + 'px'; frame.style.width = '560px'; frame.style.height = '840px'; frame.style.transform = `scale(${k})`; };
  fit();
  const sync = () => { m.querySelector('#j-capv').textContent = J.cap; m.querySelector('#j-cap').value = J.cap; };
  sync();
  bind('j-cap', e => { J.cap = +e.value; sync(); }); bind('j-verb', e => J.verb = e.value.slice(0, 20)); bind('j-unit', e => J.unit = e.value.slice(0, 20));
  bind('j-bub', e => J.bubble = e.checked, 'change'); bind('j-top', e => J.top = e.checked, 'change'); bind('j-tot', e => J.total = e.checked, 'change'); bind('j-snd', e => J.sound = e.checked, 'change');
  const reload = () => setTimeout(() => { if (view === 'jar') frame.contentWindow.location.reload(); }, 700);
  ['j-cap', 'j-verb', 'j-unit'].forEach(id => m.querySelector('#' + id).addEventListener('change', reload)); ['j-bub', 'j-top', 'j-tot', 'j-snd'].forEach(id => m.querySelector('#' + id).addEventListener('change', reload));
  m.querySelector('#j-style').onchange = (e) => { useTpl(TEMPLATES.find(x => x.id === e.target.value)); toast('تم تغيير شكل الحصالة'); reload(); };
  const G = { rose1: () => [{ gift: 'Rose', count: 1, diamonds: 1 }], rose10: () => [{ gift: 'Rose', count: 10, diamonds: 10 }], heart: () => [{ gift: 'Heart', count: 14, diamonds: 14 }], lion: () => [{ gift: 'Lion', count: 1, diamonds: 29999 }],
    mix: () => [{ gift: 'Rose', count: 6, diamonds: 6 }, { gift: 'Diamond', count: 4, diamonds: 20 }, { gift: 'Doughnut', count: 3, diamonds: 90 }, { gift: 'Heart', count: 8, diamonds: 8 }, { gift: 'Crown', count: 1, diamonds: 1500 }] };
  m.querySelectorAll('[data-g]').forEach(b => b.onclick = () => G[b.dataset.g]().forEach((g, i) => setTimeout(() => fire({ type: 'gift', user: pick(), ...g }), i * 900)));
  m.querySelector('#j-clear').onclick = () => { fire({ type: 'jarreset' }); toast('تم تفريغ الحصالة'); };
  m.querySelector('#j-copy').onclick = () => { store.set('lsx-obs', true); copyLink(ovUrl('jar-glass'), '✅ تم نسخ رابط الحصالة! ضعه في متصفح OBS'); };
};

// =====================================================================
// 🎆 FX / reactions: fireworks, confetti, emoji rain... rules «when X happens -> play effect Y»
// =====================================================================
EXTRA.fx = (m) => {
  const F = me.cfg.fx = { on: true, ...(me.cfg.fx || {}) };
  if (!Array.isArray(F.rules)) F.rules = JSON.parse(JSON.stringify(FX_DEFAULT_RULES));
  store.set('lsx-cfg', me.cfg);
  const EFF = Object.fromEntries(Object.entries(FX_EFFECTS).map(([k, v]) => [k, v[1] + ' ' + v[0]])), EVT = FX_EVENTS;
  m.innerHTML = `<h2>🎆 المؤثرات والألعاب النارية (رياكشنات)</h2>
    <div class="sub">طبقة شفافة فوق البث: ألعاب نارية، قصاصات ملونة، مطر إيموجي، بالونات، قلوب صاعدة، برق وأكثر. حدّد قواعد «لما يصير كذا ← يشتغل مؤثر كذا» (هدية، متابعة، كل N إعجاب، كلمة في الشات…) مع نص وصوت اختياري.</div>
    <div class="canvasbox">
      <div class="panel"><h3>معاينة مباشرة</h3><div class="cstage" id="fxs"><iframe id="fxs-f" src="overlay.html?slot=fx"></iframe></div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap" id="fx-btns">${Object.entries(EFF).filter(([k]) => k !== 'none').map(([k, v]) => `<button class="btn ghost sm" data-e="${k}">${v}</button>`).join('')}</div>
        <div class="row" style="margin-top:10px"><label style="display:flex;gap:8px;align-items:center">قوة المؤثر <select id="fx-pw">${opts({ 1: 'خفيف', 2: 'متوسط', 3: 'قوي' }, '2')}</select></label></div></div>
      <div class="panel"><h3>اختبار الأحداث (تمر على قواعدك)</h3>
        <div class="row" style="flex-wrap:wrap"><button class="btn sm" data-ev="gift">🎁 هدية كبيرة (أسد)</button><button class="btn ghost sm" data-ev="rose">🌹 وردة</button><button class="btn ghost sm" data-ev="follow">➕ متابع</button><button class="btn ghost sm" data-ev="share">🔁 مشاركة</button><button class="btn ghost sm" data-ev="sub">⭐ اشتراك</button><button class="btn ghost sm" data-ev="like">❤️ 100 إعجاب</button><button class="btn ghost sm" data-ev="boom">💬 !boom</button><button class="btn ghost sm" data-ev="join">👋 دخول مشاهد</button><button class="btn ghost sm" data-ev="laugh">💬 !ضحك</button><button class="btn ghost sm" data-ev="shock">💬 !ساتر</button></div>
        <label class="row" style="color:var(--txt);margin-top:14px"><input type="checkbox" id="fx-on" ${F.on !== false ? 'checked' : ''} style="width:auto"> تشغيل المؤثرات (إيقاف كامل بدون حذف القواعد)</label>
        <h3 style="margin-top:16px">رابط OBS</h3><code>${ovUrl('fx-all')}</code>
        <div class="row"><button class="btn glow sm" id="fx-copy">🔗 نسخ رابط OBS</button></div>
        <div class="sub" style="margin:8px 0 0">أضفه كـ Browser Source بحجم شاشتك كاملة (مثلاً 1920×1080) وضعه <b>فوق كل الطبقات</b>. الخلفية شفافة تلقائياً.</div></div>
    </div>
    <div class="panel"><h3>القواعد (<span id="fx-n"></span>)</h3><div id="fx-rules"></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="fx-add">➕ قاعدة جديدة</button><button class="btn ghost sm" id="fx-pack">🎭 إضافة الرياكشنات الجاهزة (دخول مشاهد + كوميدي)</button><button class="btn ghost sm" id="fx-reset">↺ استرجاع القواعد الافتراضية</button></div></div>`;
  const stage = m.querySelector('#fxs'), frame = m.querySelector('#fxs-f');
  const fit = () => { const w = Math.min(560, stage.parentElement.clientWidth - 36), k = w / 960; stage.style.width = w + 'px'; stage.style.height = 540 * k + 'px'; frame.style.width = '960px'; frame.style.height = '540px'; frame.style.transform = `scale(${k})`; };
  fit();
  const power = () => +m.querySelector('#fx-pw').value;
  const lab = (t, inner) => `<label style="display:grid;gap:4px;font-size:12px;color:var(--mut)">${t}${inner}</label>`;
  const ruleHtml = (r, i) => {
    const g = r.event === 'gift', l = r.event === 'like', c = r.event === 'chat';
    return `<div class="card" style="margin-bottom:10px;padding:12px;${r.on === false ? 'opacity:.55' : ''}" data-i="${i}">
      <div class="row" style="gap:8px;align-items:center"><input type="checkbox" data-k="on" ${r.on !== false ? 'checked' : ''} style="width:auto" title="تشغيل القاعدة"><input data-k="name" value="${esc(r.name)}" placeholder="اسم القاعدة" style="flex:1;min-width:120px"><button class="btn ghost sm" data-act="try" title="تجربة المؤثر">🧪 تجربة</button><button class="btn ghost sm" data-act="del" title="حذف">🗑</button></div>
      <div class="ctl" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:8px">
        ${lab('عندما يحدث', `<select data-k="event">${opts(EVT, r.event)}</select>`)}
        ${g ? lab('أقل قيمة للهدية (ألماسة)', `<input type="number" min="0" data-k="min" value="${+r.min || 0}">`) + lab('اسم الهدية (اختياري، فاصلة بين أكثر من اسم)', `<input data-k="match" value="${esc(r.match || '')}" placeholder="rose, lion">`) : ''}
        ${l ? lab('كل كم إعجاب', `<input type="number" min="1" data-k="min" value="${+r.min || 100}">`) : ''}
        ${c ? lab('الكلمة أو الأمر (فاصلة بين أكثر من كلمة)', `<input data-k="match" value="${esc(r.match || '')}" placeholder="!boom">`) : ''}
        ${lab('المؤثر', `<select data-k="effect">${opts(EFF, r.effect)}</select>`)}
        ${lab('إيموجي (للمطر والقلوب والنافورة)', `<input data-k="emoji" value="${esc(r.emoji || '')}" placeholder="🌹 أو 🎁💎" maxlength="16">`)}
        ${lab('اللون (اختياري)', `<div class="row" style="gap:6px"><input type="color" data-k="color" value="${r.color || '#00F0FF'}" style="width:48px;padding:2px"><button class="btn ghost sm" data-act="nocolor" style="width:auto">تلقائي</button></div>`)}
        ${lab('القوة', `<select data-k="power">${opts({ 1: 'خفيف', 2: 'متوسط', 3: 'قوي' }, String(r.power || 1))}</select>`)}
        ${lab('نص يظهر فوق الشاشة (اختياري) — {user} {gift} {count}', `<input data-k="text" value="${esc(r.text || '')}" maxlength="80">`)}
        ${lab('الصوت', `<select data-k="sound">${opts({ auto: '🎭 صوت المؤثر (تلقائي)', ...SOUNDS }, r.sound || 'none')}</select>`)}
        ${lab('رابط صوتك الخاص (اختياري، رابط https لملف mp3 — يُشغَّل بدل الصوت)', `<input data-k="audio" value="${esc(r.audio || '')}" placeholder="https://…/sound.mp3" dir="ltr">`)}
        ${lab('فترة انتظار (ثانية)', `<input type="number" min="0" max="600" data-k="cd" value="${+r.cd || 0}">`)}</div></div>`;
  };
  const draw = () => { m.querySelector('#fx-n').textContent = F.rules.length; m.querySelector('#fx-rules').innerHTML = F.rules.length ? F.rules.map(ruleHtml).join('') : '<div class="sub">ما فيه قواعد. اضغط «قاعدة جديدة».</div>'; };
  draw();
  const box = m.querySelector('#fx-rules');
  const onEdit = (e) => {
    const el = e.target, card = el.closest('[data-i]'); if (!card || !el.dataset.k) return; const r = F.rules[+card.dataset.i], k = el.dataset.k;
    r[k] = el.type === 'checkbox' ? el.checked : (['min', 'cd', 'power'].includes(k) ? +el.value || 0 : el.value);
    if (k === 'color') r.color = el.value; saveCfg();
    if (k === 'event' || k === 'on') { draw(); }
  };
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return; const card = b.closest('[data-i]'), i = +card.dataset.i, r = F.rules[i];
    if (b.dataset.act === 'del') { F.rules.splice(i, 1); saveCfg(); draw(); }
    else if (b.dataset.act === 'nocolor') { r.color = ''; saveCfg(); toast('اللون تلقائي'); }
    else if (b.dataset.act === 'try') fire({ type: 'fxtest', effect: r.effect, emoji: r.emoji || '', color: r.color || '', power: +r.power || 2 });
  });
  m.querySelector('#fx-add').onclick = () => { F.rules.push({ on: true, name: 'قاعدة جديدة', event: 'gift', min: 1, match: '', effect: 'fireworks', emoji: '', color: '', power: 2, text: '', sound: 'none', cd: 2 }); saveCfg(); draw(); box.lastElementChild && box.lastElementChild.scrollIntoView({ block: 'center' }); };
  m.querySelector('#fx-pack').onclick = () => { let n = 0; FX_PACK_RULES.forEach((p) => { if (!F.rules.some((r) => r.name === p.name)) { F.rules.push(JSON.parse(JSON.stringify(p))); n++; } }); saveCfg(); draw(); toast(n ? 'تمت إضافة ' + n + ' قاعدة جاهزة' : 'القواعد الجاهزة موجودة من قبل', n ? 'ok' : 'warn'); };
  m.querySelector('#fx-reset').onclick = () => { if (!confirm('استرجاع القواعد الافتراضية؟ ستُحذف تعديلاتك على القواعد.')) return; F.rules = JSON.parse(JSON.stringify(FX_DEFAULT_RULES)); saveCfg(); draw(); toast('تم استرجاع القواعد الافتراضية'); };
  bind('fx-on', (el) => F.on = el.checked, 'change');
  m.querySelectorAll('[data-e]').forEach(b => b.onclick = () => fire({ type: 'fxtest', effect: b.dataset.e, power: power() }));
  const EV = { gift: () => ({ type: 'gift', user: pick(), gift: 'Lion', count: 1, diamonds: 29999 }), rose: () => ({ type: 'gift', user: pick(), gift: 'Rose', count: 3, diamonds: 3 }), follow: () => ({ type: 'follow', user: pick() }), share: () => ({ type: 'share', user: pick() }), sub: () => ({ type: 'sub', user: pick() }),
    like: () => ({ type: 'like', user: pick(), count: 100 }), boom: () => ({ type: 'chat', user: pick(), text: '!boom' }), join: () => ({ type: 'join', user: pick() }), laugh: () => ({ type: 'chat', user: pick(), text: '!ضحك' }), shock: () => ({ type: 'chat', user: pick(), text: '!ساتر' }) };
  m.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => fire(EV[b.dataset.ev]()));
  m.querySelector('#fx-copy').onclick = () => { store.set('lsx-obs', true); copyLink(ovUrl('fx-all'), '✅ تم نسخ رابط المؤثرات! ضعه في متصفح OBS فوق كل الطبقات'); };
};