#!/usr/bin/env node
// SG STREAM game bridge: listens to your stream's events (TikTok and/or Twitch) and presses keys / mouse buttons on THIS computer.
// Twitch events arrive in the same shape: Bits are gifts named "Bits" (min = number of bits), gift subs are "Gift Sub", plus sub and raid events.
//
//   node game-bridge.js <site address> <your OBS token> [--dry]
//   example:  node game-bridge.js https://your-site.com 0123456789abcdef --dry
//
// --dry only prints what it would press (use it first!). Without it, keys are really pressed in the focused window (Windows only).
// The rules come from the "Interactive game bridge" page of the dashboard and refresh automatically every few seconds.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const VK = { SPACE: 0x20, ENTER: 0x0D, SHIFT: 0x10, CTRL: 0x11, ALT: 0x12, TAB: 0x09, ESC: 0x1B, LEFT: 0x25, UP: 0x26, RIGHT: 0x27, DOWN: 0x28 };
for (let i = 0; i < 26; i++) VK[String.fromCharCode(65 + i)] = 0x41 + i;
for (let i = 0; i < 10; i++) VK[String(i)] = 0x30 + i;
for (let i = 1; i <= 12; i++) VK['F' + i] = 0x6F + i;
const MOUSE = { LMB: 'L', RMB: 'R' };

// Same matching rules as the dashboard's simulator (gameRulesFor in shared.js).
// `acc` keeps a running total of taps per rule, so a "like" rule with min 50 fires on every 50 taps, however TikTok batches them.
function matchRules(ev, games, acc = {}) {
  const out = [];
  ((games && games.rules) || []).forEach((r, idx) => {
    if (r.on === false || r.event !== ev.type) return;
    if (r.platform && r.platform !== 'any' && (ev.platform || 'tiktok') !== r.platform) return; // rules can be limited to TikTok or Twitch
    const m = String(r.match || '').trim().toLowerCase();
    let fires = 1;
    if (r.event === 'gift') { if (m && String(ev.gift || '').toLowerCase() !== m) return; if ((ev.diamonds || 0) < (+r.min || 0)) return; }
    else if (r.event === 'like') {
      const min = Math.max(1, +r.min || 1);
      acc[idx] = (acc[idx] || 0) + (ev.count || 1); fires = Math.min(5, Math.floor(acc[idx] / min));
      if (!fires) return; acc[idx] -= fires * min;
    } else if (r.event === 'chat') { const first = String(ev.text || '').trim().split(/\s+/)[0].toLowerCase(); if (m && first !== m) return; }
    out.push({ idx, rule: r, times: (r.perCount ? Math.max(1, Math.min(20, ev.count || 1)) : (+r.times || 1)) * fires });
  });
  return out;
}

// One PowerShell process stays open and receives "K|vk|hold" / "M|L|hold" lines on stdin (starting a process per key press would be slow).
const PS_SCRIPT = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class SGK {
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint type);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
"@
while (($line = [Console]::In.ReadLine()) -ne $null) {
  $p = $line.Split('|')
  if ($p.Length -lt 3) { continue }
  $hold = [int]$p[2]
  if ($p[0] -eq 'K') {
    $vk = [int]$p[1]; $scan = [SGK]::MapVirtualKey($vk, 0)
    $ext = 0; if (@(0x25,0x26,0x27,0x28) -contains $vk) { $ext = 1 }
    [SGK]::keybd_event(0, [byte]$scan, (8 -bor $ext), [UIntPtr]::Zero)
    Start-Sleep -Milliseconds $hold
    [SGK]::keybd_event(0, [byte]$scan, (8 -bor 2 -bor $ext), [UIntPtr]::Zero)
  } elseif ($p[0] -eq 'M') {
    if ($p[1] -eq 'L') { $down = 2; $up = 4 } else { $down = 8; $up = 16 }
    [SGK]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds $hold
    [SGK]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
  }
}
`;
const lineFor = (key, hold) => MOUSE[key] ? `M|${MOUSE[key]}|${hold}` : (VK[key] ? `K|${VK[key]}|${hold}` : null);

const readline = require('readline');
const CONFIG_FILE = path.join(__dirname, 'bridge-config.json'); // remembers the site address and your key after the first run
const C = process.stdout.isTTY ? { r: '\x1b[0m', b: '\x1b[1m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', red: '\x1b[31m', d: '\x1b[2m' } : { r: '', b: '', g: '', y: '', c: '', red: '', d: '' };
const loadConfig = () => { try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; } };
const saveConfig = (c) => { try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); } catch {} };

function parseArgs(argv) {
  const a = argv.filter(x => !x.startsWith('--')), cfg = loadConfig();
  return { server: (a[0] || cfg.server || '').replace(/\/+$/, ''), token: a[1] || cfg.token || '', dry: argv.includes('--dry'), reset: argv.includes('--reset') };
}
let rlShared = null; const lineQ = [], waiters = [];
const ask = (q) => new Promise((ok) => {
  if (!rlShared) { // one reader for the whole run, so piped / pasted lines are never lost between questions
    rlShared = readline.createInterface({ input: process.stdin, terminal: false });
    rlShared.on('line', (l) => { const w = waiters.shift(); if (w) w(l.trim()); else lineQ.push(l.trim()); });
    rlShared.on('close', () => { while (waiters.length) waiters.shift()(''); });
  }
  process.stdout.write(q); const l = lineQ.shift(); if (l !== undefined) ok(l); else waiters.push(ok);
});
const banner = (dry) => console.log(`
${C.c}${C.b}  ============================================
   SG STREAM  -  GAME BRIDGE
  ============================================${C.r}
  ${dry ? C.y + 'DRY RUN: nothing will be pressed (test mode)' : C.g + 'LIVE: keys and mouse clicks ARE pressed' }${C.r}
`);

async function main() {
  let { server, token, dry, reset } = parseArgs(process.argv.slice(2));
  banner(dry);
  // first run: ask for the site address and your bridge key, check them, remember them
  for (let tries = 0; tries < 4; tries++) {
    if (!/^https?:\/\//.test(server)) server = (await ask(`${C.b}Site address${C.r} (example https://your-site.com): `)).replace(/\/+$/, '');
    if (!token || reset) { token = await ask(`${C.b}Bridge key${C.r} (from the website > Game bridge page): `); reset = false; }
    if (!/^https?:\/\//.test(server) || !token) { console.log(`${C.red}  Both the site address and the key are required.${C.r}`); server = /^https?:\/\//.test(server) ? server : ''; continue; }
    try {
      const r = await fetch(`${server}/cfg/${token}?b=1`);
      if (r.status === 404) { console.log(`${C.red}  This key was not recognised by ${server}. Copy it again from the website.${C.r}`); token = ''; continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      saveConfig({ server, token }); tries = 99; break;
    } catch (e) { console.log(`${C.red}  Cannot reach ${server}: ${e.message}${C.r}`); server = ''; }
  }
  if (!/^https?:\/\//.test(server) || !token) { console.log('Setup failed. Run the program again.'); process.exit(1); }
  console.log(`  ${C.g}Connected to${C.r} ${server}\n`);

  let ps = null;
  if (!dry) {
    if (process.platform !== 'win32') { console.log('Real key presses are Windows-only. Use --dry to test.'); process.exit(1); }
    const f = path.join(os.tmpdir(), 'sg-bridge.ps1'); fs.writeFileSync(f, PS_SCRIPT, 'utf8');
    ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', f], { stdio: ['pipe', 'inherit', 'inherit'] });
    ps.on('exit', () => { console.log('PowerShell stopped'); process.exit(0); });
    console.log(`  ${C.y}Keys go to whatever window is in front: put your GAME in front.${C.r}`);
  }
  let paused = false;
  if (rlShared) { rlShared.close(); rlShared = null; }
  if (process.stdin.isTTY) { // P = pause / resume, Q = quit
    readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
    process.stdin.on('keypress', (s, k) => {
      if ((k && k.ctrl && k.name === 'c') || s === 'q' || s === 'Q') { console.log('\nStopped.'); process.exit(0); }
      if (s === 'p' || s === 'P') { paused = !paused; console.log(paused ? `  ${C.y}PAUSED: events are ignored (press P to resume)${C.r}` : `  ${C.g}RESUMED${C.r}`); }
    });
    console.log(`  ${C.d}Press P to pause/resume, Q to quit.${C.r}`);
  }

  let games = { on: false, rules: [] }, lastOn = null;
  const loadCfg = async () => {
    try {
      const r = await fetch(`${server}/cfg/${token}?b=1`); if (r.status === 404) { console.log(`${C.red}Key no longer valid. Run again with --reset.${C.r}`); process.exit(1); }
      const g = (await r.json()).games || games; games = g;
      if (g.on !== lastOn) { lastOn = g.on; console.log(g.on ? `  ${C.g}Rules active: ${g.rules.length}${C.r}` : `  ${C.y}The game link is OFF on the website: events are ignored until you switch it on.${C.r}`); }
      if (g.locked) console.log(`  ${C.y}Game bridge is a PRO feature on this site and your plan does not include it.${C.r}`);
    } catch (e) { console.log(`  ${C.red}cannot reach the site: ${e.message}${C.r}`); }
  };
  await loadCfg(); setInterval(loadCfg, 6000);

  // sequential executor with a queue cap and a per-minute limit, so a gift storm can't hammer the keyboard
  const queue = []; let running = false; const stamps = [];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function pump() {
    if (running) return; running = true;
    while (queue.length) {
      const { key, hold, times, label } = queue.shift();
      for (let i = 0; i < times; i++) {
        const now = Date.now(); while (stamps.length && now - stamps[0] > 60000) stamps.shift();
        if (stamps.length >= 150) { console.log('  rate limit (150 presses/min): skipped'); break; }
        stamps.push(now);
        const line = lineFor(key, hold);
        if (!line) { console.log(`  unknown key "${key}" in rule "${label}"`); break; }
        if (dry) console.log(`[dry] ${key} for ${hold}ms  (${label})`); else ps.stdin.write(line + '\n');
        await sleep(hold + 80);
      }
    }
    running = false;
  }

  const acc = {}, lastFire = {}; let after = null;
  console.log('  Listening for events...\n');
  for (;;) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 35000);
      const r = await fetch(`${server}/poll/${token}${after == null ? '' : '?after=' + after}`, { signal: ctl.signal }); clearTimeout(t);
      const j = await r.json(); after = j.seq;
      for (const ev of j.events || []) {
        if (paused || !games.on || ev.type === 'config' || ev.type === 'reset') continue;
        for (const hit of matchRules(ev, games, acc)) {
          const cd = +hit.rule.cooldown || 0, now = Date.now();
          if (cd && now - (lastFire[hit.idx] || 0) < cd) continue;
          lastFire[hit.idx] = now;
          if (queue.length >= 40) { console.log('  queue full: skipped'); continue; }
          queue.push({ key: String(hit.rule.key || 'SPACE').toUpperCase(), hold: Math.max(20, Math.min(5000, +hit.rule.hold || 120)), times: hit.times, label: hit.rule.label || hit.rule.event });
          console.log(`  ${C.c}${ev.platform || 'tiktok'}${C.r} ${ev.type}${ev.gift ? ' ' + ev.gift : ''}${ev.user ? ' from ' + ev.user : ''} -> ${hit.rule.label || hit.rule.key} x${hit.times}`);
        }
      }
      pump();
    } catch (e) { if (e.name !== 'AbortError') { console.log('  connection lost, retrying...', e.message); } await sleep(2000); }
  }
}
module.exports = { matchRules, lineFor, PS_SCRIPT, parseArgs, VK };
if (require.main === module) main();
