// PRO plans: upgrade button + pricing modal for everyone, and the owner panel (prices, enforcement, grant plans).
// Loaded after views4.js (uses me, api, EXTRA, openModal, toast, esc, $, copy, go).

(() => {
  const st = document.createElement('style');
  st.textContent = `
  .pro-btn{border:0;cursor:pointer;font:inherit;font-weight:800;color:#2a1a00;padding:8px 14px;border-radius:999px;background:linear-gradient(90deg,#fbbf24,#f59e0b,#fde68a);background-size:200% 100%;animation:proShine 3s linear infinite;box-shadow:0 0 18px rgba(251,191,36,.35);white-space:nowrap}
  .pro-btn:hover{transform:translateY(-1px);box-shadow:0 0 26px rgba(251,191,36,.6)}
  .pro-btn.have{background:linear-gradient(90deg,#14b8a6,#22d3ee);color:#042f2e;animation:none;box-shadow:none}
  @keyframes proShine{0%{background-position:0 0}100%{background-position:200% 0}}
  .nav.pro-nav{color:#fbbf24;font-weight:700}
  .modal:has(.pr-wrap){width:min(880px,100%);max-height:92vh;overflow:auto}.pr-wrap{width:100%}
  .pr-hd{text-align:center;margin-bottom:14px}.pr-hd h2{margin:0 0 4px;font-size:24px}
  .pr-cur{margin:0 auto 14px;padding:8px 12px;border-radius:10px;background:#0f2a2f;color:#5eead4;text-align:center;font-size:13px}
  .pr-cur.warn{background:#3a2a10;color:#fbbf24}
  .pr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media(max-width:720px){.pr-grid{grid-template-columns:1fr}}
  .pr-card{position:relative;border:1px solid var(--line);border-radius:16px;padding:18px 14px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:8px}
  .pr-card.best{border-color:#fbbf24;box-shadow:0 0 0 1px #fbbf24 inset,0 8px 30px rgba(251,191,36,.15)}
  .pr-card.now{border-color:#14b8a6}
  .pr-flag{position:absolute;top:-11px;inset-inline-start:50%;transform:translateX(50%);padding:2px 12px;border-radius:999px;background:#fbbf24;color:#2a1a00;font-size:12px;font-weight:800;white-space:nowrap}
  [dir=rtl] .pr-flag{transform:translateX(50%)}
  .pr-name{font-weight:800;font-size:17px}
  .pr-price{font-size:30px;font-weight:900;line-height:1.1}.pr-price small{font-size:13px;font-weight:600;color:var(--mut)}
  .pr-per{font-size:12px;color:var(--mut);min-height:16px}
  .pr-card ul{list-style:none;margin:6px 0 10px;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;flex:1}
  .pr-card li.no{color:var(--mut);text-decoration:line-through;opacity:.7}
  .pr-b{display:inline-block;margin-inline-start:6px;padding:0 7px;border-radius:999px;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#2a1a00;font-size:10.5px;font-weight:800;vertical-align:middle}
  .pr-note{margin-top:14px;font-size:12px;color:var(--mut);text-align:center;line-height:1.8}
  .ow-t{width:100%;border-collapse:collapse;font-size:13px}.ow-t th,.ow-t td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:start}
  `;
  document.head.appendChild(st);
})();

const PRO_FEATURES = [
  ['الصوت السحابي (أصوات عربية طبيعية)', true], ['مساعد AI وروبوت الرد التلقائي', true], ['ربط الألعاب التفاعلي (GTA / Minecraft / COD)', true],
];
const FREE_FEATURES = ['كل القوالب (89 قالب) وروابط OBS الدائمة', 'التكبيس والتنبيهات والأهداف والمتصدرين', 'الشات الموحّد (TikTok + Twitch)', 'عجلة الحظ والتحديات', 'القراءة الصوتية بصوت المتصفح'];

function planLabel(p) { return p.tier === 'weekly' ? 'أسبوعية' : p.tier === 'monthly' ? 'شهرية' : 'مجانية'; }
function daysLeft(p) { return Math.max(0, Math.ceil((p.until - Date.now()) / 86400000)); }

function openPricing(reason) {
  if (!me) return;
  const P = me.plans || {}, cur = me.plan || { tier: 'free' }, cc = esc(P.currency || 'SAR');
  const wk = +P.priceWeekly || 0, mo = +P.priceMonthly || 0, save = wk && mo ? Math.max(0, Math.round((1 - mo / (wk * 4.3)) * 100)) : 0;
  const pro = cur.tier !== 'free', owner = me.isOwner;
  const feats = (on) => PRO_FEATURES.map(([t]) => `<li class="${on ? '' : 'no'}">${on ? '✅' : '✖'} ${t} <span class="pr-b">👑 PRO</span></li>`).join('');
  const card = (tier, name, price, per, extra) => `<div class="pr-card ${tier === 'monthly' ? 'best' : ''} ${cur.tier === tier ? 'now' : ''}">${tier === 'monthly' ? `<span class="pr-flag">⭐ الأكثر توفيراً${save ? ' · وفّر ' + save + '%' : ''}</span>` : ''}
      <div class="pr-name">${name}</div><div class="pr-price">${price}</div><div class="pr-per">${per}</div>
      <ul>${tier === 'free' ? FREE_FEATURES.map(f => `<li>✅ ${f}</li>`).join('') + feats(false) : `<li>✅ كل ميزات المجانية</li>` + feats(true) + (extra || '')}</ul>
      ${cur.tier === tier ? `<button class="btn ghost" disabled>✔ باقتك الحالية</button>` : tier === 'free' ? '' : `<button class="btn" data-ask="${tier}">${pro ? 'طلب تمديد' : 'طلب التفعيل'}</button>`}</div>`;
  const m = openModal(`<div class="pr-wrap"><div class="pr-hd"><h2>👑 ترقية الحساب إلى PRO</h2><div class="sub" style="margin:0">${reason ? `<b style="color:#fbbf24">${esc(reason)}</b>` : 'افتح الميزات الاحترافية لبثك'}</div></div>
    <div class="pr-cur ${pro ? '' : 'warn'}">${owner ? '👑 أنت مالك الموقع: كل الميزات مفتوحة لك دائماً' : pro ? `باقتك: <b>${planLabel(cur)}</b> · متبقي ${daysLeft(cur)} يوم` : 'باقتك الحالية: <b>مجانية</b>'}</div>
    <div class="pr-grid">${card('free', 'مجاني', `0 <small>${cc}</small>`, 'للأبد')}${card('weekly', 'PRO أسبوعي', `${wk} <small>${cc}</small>`, 'لمدة 7 أيام')}${card('monthly', 'PRO شهري', `${mo} <small>${cc}</small>`, 'لمدة 30 يوم' + (wk ? ` · يعادل ${(mo / 30).toFixed(1)} ${cc}/يوم` : ''))}</div>
    <div class="pr-note">${P.enforce ? '' : '🎁 حالياً كل الميزات مفتوحة للجميع مجاناً، والأسعار تُطبّق عند تفعيل القيود من المالك.<br>'}التفعيل يتم يدوياً بعد التواصل مع مالك الموقع${P.contactText ? ` (${esc(P.contactText)})` : ''}. ما فيه دفع تلقائي داخل الموقع.</div></div>`);
  m.el.querySelectorAll('[data-ask]').forEach((b) => b.onclick = () => {
    const tier = b.dataset.ask, msg = `السلام عليكم، أبي أفعّل باقة PRO ${tier === 'weekly' ? 'الأسبوعية' : 'الشهرية'} (${tier === 'weekly' ? wk : mo} ${P.currency || 'SAR'}) لحسابي في SG STREAM: ${me.name}`;
    copy(msg, b); toast('تم نسخ رسالة الطلب، أرسلها لمالك الموقع', 'ok');
    if (P.contactUrl) window.open(P.contactUrl, '_blank', 'noopener');
  });
  return m;
}

// header + sidebar entry points (called from updateNav on every refresh)
function proNavSync() {
  if (!me) return;
  let b = document.getElementById('pro-btn');
  const hd = document.getElementById('top');
  if (!b && hd) { b = document.createElement('button'); b.id = 'pro-btn'; b.type = 'button'; b.className = 'pro-btn'; b.onclick = () => openPricing(); hd.appendChild(b); }
  if (b) { const pro = me.plan && me.plan.tier !== 'free'; b.className = 'pro-btn' + (pro || me.isOwner ? ' have' : ''); b.textContent = me.isOwner ? '👑 مالك الموقع' : pro ? `👑 PRO · ${daysLeft(me.plan)} يوم` : '👑 ترقية الحساب (PRO)'; }
  let o = document.getElementById('nav-owner');
  if (me.isOwner && !o) { const conn = document.querySelector('.nav[data-v="obs"]'); if (conn) { o = document.createElement('button'); o.id = 'nav-owner'; o.className = 'nav pro-nav'; o.dataset.v = 'owner'; o.textContent = '👑 لوحة المالك'; o.onclick = () => go('owner'); conn.after(o); } }
  if (!me.isOwner && o) o.remove();
}

EXTRA.owner = async (m) => {
  if (!me.isOwner) { m.innerHTML = '<h2>👑 لوحة المالك</h2><div class="sub">هذه الصفحة لمالك الموقع فقط.</div>'; return; }
  m.innerHTML = '<h2>👑 لوحة المالك</h2><div class="sub">جاري التحميل…</div>';
  let d; try { d = await api('/api/admin/users'); } catch (e) { m.innerHTML = `<h2>👑 لوحة المالك</h2><div class="sub">${esc(e.message)}</div>`; return; }
  const s = d.settings;
  const draw = (users) => {
    m.innerHTML = `<h2>👑 لوحة المالك</h2><div class="sub">تحكّم بالباقات والأسعار ومن يملك PRO. الدفع يدوي: تستلم المبلغ بطريقتك ثم تفعّل الباقة للمستخدم من هنا.</div>
    <div class="panel"><h3>الإعدادات</h3>
      <label class="row" style="color:var(--txt)"><input type="checkbox" id="o-enf" style="width:auto" ${s.enforce ? 'checked' : ''}> تفعيل القيود (الميزات الاحترافية للمشتركين فقط) <small style="color:var(--mut)">— وهو مطفأ الآن يعني كل شيء مجاني للجميع</small></label>
      <div class="row" style="margin-top:10px;gap:10px;flex-wrap:wrap"><label>العملة<input id="o-cur" value="${esc(s.currency)}" maxlength="6" style="width:90px"></label><label>سعر الأسبوعي<input id="o-w" type="number" min="0" value="${s.priceWeekly}" style="width:110px"></label><label>سعر الشهري<input id="o-m" type="number" min="0" value="${s.priceMonthly}" style="width:110px"></label></div>
      <div class="row" style="margin-top:10px;gap:10px;flex-wrap:wrap"><label style="flex:2;min-width:220px">رابط التواصل (واتساب / ديسكورد / تيك توك)<input id="o-url" dir="ltr" value="${esc(s.contactUrl)}" placeholder="https://wa.me/966…"></label><label style="flex:1;min-width:160px">نص التواصل<input id="o-txt" value="${esc(s.contactText)}" placeholder="واتساب: 05…"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="o-save" style="width:auto;padding:9px 18px">حفظ الإعدادات</button><button class="btn ghost sm" id="o-prev" style="width:auto">معاينة نافذة الأسعار</button></div></div>
    <div class="panel"><h3>المستخدمون (${users.length})</h3><div style="overflow-x:auto"><table class="ow-t"><tr><th>الحساب</th><th>تيك توك</th><th>الباقة</th><th>تفعيل / تمديد</th></tr>
      ${users.map((u) => `<tr><td><b>${esc(u.name)}</b>${u.connected ? ' 🟢' : ''}</td><td dir="ltr">${u.tiktok ? '@' + esc(u.tiktok) : '-'}</td><td>${u.plan.tier === 'free' ? 'مجانية' : `${planLabel(u.plan)} · ${daysLeft(u.plan)} يوم`}</td>
      <td><button class="btn ghost sm" data-g="${esc(u.name)}|weekly" style="width:auto">+7 أيام</button> <button class="btn ghost sm" data-g="${esc(u.name)}|monthly" style="width:auto">+30 يوم</button> ${u.plan.tier === 'free' ? '' : `<button class="btn ghost sm" data-g="${esc(u.name)}|free" style="width:auto;color:#f87171">إلغاء</button>`}</td></tr>`).join('')}</table></div></div>`;
    m.querySelector('#o-save').onclick = async () => {
      try { const r = await api('/api/admin/settings', { enforce: m.querySelector('#o-enf').checked, currency: m.querySelector('#o-cur').value, priceWeekly: +m.querySelector('#o-w').value, priceMonthly: +m.querySelector('#o-m').value, contactUrl: m.querySelector('#o-url').value.trim(), contactText: m.querySelector('#o-txt').value.trim() });
        Object.assign(s, r.settings); setMe(await api('/api/me')); proNavSync(); toast(s.enforce ? 'تم الحفظ. القيود مفعّلة الآن' : 'تم الحفظ. القيود مطفأة (الكل مجاني)'); } catch (e) { toast(e.message, 'err'); }
    };
    m.querySelector('#o-prev').onclick = async () => { setMe(await api('/api/me')); openPricing(); };
    m.querySelectorAll('[data-g]').forEach((b) => b.onclick = async () => {
      const [name, tier] = b.dataset.g.split('|');
      try { await api('/api/admin/plan', { name, tier }); const r = await api('/api/admin/users'); draw(r.users); toast('تم التحديث'); } catch (e) { toast(e.message, 'err'); }
    });
  };
  draw(d.users);
};

// back from the Twitch OAuth page: show the result and open the Twitch tab
(() => {
  const q = new URLSearchParams(location.search).get('twitch'); if (!q) return;
  history.replaceState(null, '', location.pathname);
  let n = 0; const t = setInterval(() => { if (++n > 40) return clearInterval(t); if (typeof me === 'undefined' || !me || typeof openConnect !== 'function') return; clearInterval(t);
    if (q === 'linked') toast('✅ تم ربط تويتش: المتابعون ونقاط القناة تعمل', 'ok'); else toast('تعذّر ربط تويتش، حاول مرة ثانية', 'err');
    setTimeout(() => openConnect('twitch'), 500); }, 250);
})();
// back from the Kick OAuth page
(() => {
  const q = new URLSearchParams(location.search).get('kick'); if (!q) return;
  history.replaceState(null, '', location.pathname);
  let n = 0; const t = setInterval(() => { if (++n > 40) return clearInterval(t); if (typeof me === 'undefined' || !me || typeof openConnect !== 'function') return; clearInterval(t);
    if (q === 'linked') toast('✅ تم ربط كيك: الأحداث تصل الآن', 'ok'); else toast('تعذّر ربط كيك، حاول مرة ثانية', 'err');
    setTimeout(() => openConnect('kick'), 500); }, 250);
})();