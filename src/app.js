/* ============================================================
   词性小剧场 · Word Theater
   ------------------------------------------------------------
   设计依据：
   1) 认知负荷理论（CLT）
      - 内在负荷：每关只增加一个新的、必要的信息块（新词性）
      - 外在负荷：同一套交互机制贯穿全部关卡，不引入新操作；
                  标签与题目同屏呈现，避免「注意力分散效应」；
                  不要求孩子读长段说明文字（避免「冗余效应」）
      - 相关负荷：全部为「自己动手做决定」，而不是看讲解
   2) 交替实例原则（Interleaved Practice / Contrastive Examples）
      - 同一深层结构（看意思→问三个问题→定岗位）不断换「故事表皮」
      - 后期关卡把新学的词性与旧的混在一起，逼迫「辨别」而非「记忆顺序」
   ============================================================ */
'use strict';

/* ================= 0 · 小工具 ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ================= 1 · 存档 ================= */
const Store = {
  KEY: 'wordTheater.v1',
  data: { stars: 0, levels: {}, sound: true, name: '' },
  load() {
    try { const s = JSON.parse(localStorage.getItem(this.KEY) || 'null'); if (s) Object.assign(this.data, s); } catch (e) { }
    return this;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { } },
  addStars(n) {
    if (n <= 0) return;
    this.data.stars += n; this.save(); paintStars(true);
  },
  setLevel(id, s) {
    if ((this.data.levels[id] || 0) >= s) return;
    this.data.levels[id] = s; this.save();
  },
  unlocked(id) {
    if (id === 1) return true;
    if (this.data.unlockAll) return true;
    return (this.data.levels[id - 1] || 0) > 0;
  },
  reset() { this.data = { stars: 0, levels: {}, sound: this.data.sound, name: '' }; this.save(); paintStars(); }
};

/* ================= 2 · 音效 & 朗读 ================= */
const Sound = {
  ctx: null,
  on: true,
  init() {
    if (!this.on) return null;
    if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, at, dur, type = 'sine', vol = 0.13) {
    const c = this.init(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  },
  tap() { this.tone(620, 0, 0.06, 'triangle', 0.05); },
  ok() { [660, 880, 1174].forEach((f, i) => this.tone(f, i * 0.07, 0.16, 'sine', 0.11)); },
  no() { this.tone(320, 0, 0.11, 'sawtooth', 0.07); this.tone(214, 0.09, 0.18, 'sawtooth', 0.06); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, i * 0.085, 0.3, 'triangle', 0.11)); },
  say(text) {
    if (!this.on || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.82; u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch (e) { }
  }
};
Sound.on = Store.data.sound !== false;

/* ================= 3 · 四个「岗位」 ================= */
const POS = {
  n: { key: 'n', name: '名词', en: 'Noun', emoji: '🏰', short: '名字', ask: '它是「东西 / 人 / 地方」吗？',
       probe: '它是人、地方或东西的<b>名字</b>吗？',
       ex: [['dog', '狗'], ['school', '学校'], ['book', '书']] },
  v: { key: 'v', name: '动词', en: 'Verb', emoji: '🏃', short: '动作', ask: '它表示「做动作」吗？',
       probe: '它表示一个<b>动作</b>吗？',
       ex: [['run', '跑'], ['jump', '跳'], ['sing', '唱歌']] },
  a: { key: 'a', name: '形容词', en: 'Adjective', emoji: '🎨', short: '什么样的', ask: '它能回答「什么样的…」吗？',
       probe: '它能回答「<b>什么样的</b>…」吗？',
       ex: [['big', '大的'], ['happy', '开心的'], ['red', '红色的']] },
  d: { key: 'd', name: '副词', en: 'Adverb', emoji: '⚡', short: '怎样地', ask: '它能回答「怎样地做…」吗？',
       probe: '它能回答「<b>怎样地</b>做…」吗？',
       ex: [['quickly', '快速地'], ['slowly', '慢慢地'], ['loudly', '大声地']] }
};

/* ================= 4 · 关卡数据 ================= */
const W = (en, zh, emoji, pos) => ({ en, zh, emoji, pos });

const LEVELS = [
  /* -------- 第 1 关：名词 vs 动词 -------- */
  {
    id: 1, emoji: '🏰', name: '名字还是动作', desc: '名词 · 动词',
    newRoles: ['n', 'v'], roles: ['n', 'v'], buckets: ['n', 'v'],
    rounds: [
      { type: 'sort', words: [W('dog', '狗', '🐶', 'n'), W('run', '跑', '🏃', 'v'), W('book', '书', '📕', 'n'), W('jump', '跳', '🤸', 'v')] },
      { type: 'sort', words: [W('apple', '苹果', '🍎', 'n'), W('swim', '游泳', '🏊', 'v'), W('bird', '鸟', '🐦', 'n'), W('dance', '跳舞', '💃', 'v')] },
      { type: 'sort', words: [W('teacher', '老师', '👩‍🏫', 'n'), W('read', '读', '📖', 'v'), W('school', '学校', '🏫', 'n'), W('eat', '吃', '🍽️', 'v')] }
    ]
  },
  /* -------- 第 2 关：加入形容词 -------- */
  {
    id: 2, emoji: '🎨', name: '什么样的东西', desc: '+ 形容词',
    newRoles: ['a'], roles: ['n', 'v', 'a'], buckets: ['n', 'v', 'a'],
    rounds: [
      { type: 'sort', words: [W('big', '大的', '🐘', 'a'), W('cat', '猫', '🐱', 'n'), W('sing', '唱歌', '🎤', 'v'), W('small', '小的', '🐜', 'a')] },
      { type: 'sort', words: [W('jump', '跳', '🤸', 'v'), W('happy', '开心的', '😄', 'a'), W('school', '学校', '🏫', 'n'), W('tall', '高的', '🦒', 'a')] },
      { type: 'sort', words: [W('red', '红色的', '🍎', 'a'), W('run', '跑', '🏃', 'v'), W('book', '书', '📕', 'n'), W('cute', '可爱的', '🐰', 'a')] },
      { type: 'sort', words: [W('bird', '鸟', '🐦', 'n'), W('swim', '游泳', '🏊', 'v'), W('new', '新的', '✨', 'a'), W('funny', '有趣的', '🤡', 'a')] }
    ]
  },
  /* -------- 第 3 关：加入副词 -------- */
  {
    id: 3, emoji: '⚡', name: '怎样地做', desc: '+ 副词',
    newRoles: ['d'], roles: ['n', 'v', 'd'], buckets: ['n', 'v', 'd'],
    rounds: [
      { type: 'sort', words: [W('slowly', '慢慢地', '🐢', 'd'), W('run', '跑', '🏃', 'v'), W('dog', '狗', '🐶', 'n'), W('quickly', '快速地', '🐇', 'd')] },
      { type: 'sort', words: [W('happily', '开心地', '😊', 'd'), W('sing', '唱歌', '🎤', 'v'), W('school', '学校', '🏫', 'n'), W('quietly', '安静地', '🤫', 'd')] },
      { type: 'sort', words: [W('loudly', '大声地', '📢', 'd'), W('book', '书', '📕', 'n'), W('dance', '跳舞', '💃', 'v'), W('carefully', '小心地', '🔍', 'd')] }
    ]
  },
  /* -------- 第 4 关：交替辨别（易混对） -------- */
  {
    id: 4, emoji: '🔀', name: '长得像，别认错', desc: '名词/形容词 · 动词/副词',
    newRoles: [], roles: ['n', 'v', 'a', 'd'],
    rounds: [
      { type: 'sort', buckets: ['n', 'a'], tag: '名词 还是 形容词？',
        words: [W('mountain', '山', '⛰️', 'n'), W('clean', '干净的', '🧼', 'a'), W('tall', '高的', '🦒', 'a'), W('river', '河', '🌊', 'n')] },
      { type: 'sort', buckets: ['n', 'a'], tag: '名词 还是 形容词？',
        words: [W('cute', '可爱的', '🐰', 'a'), W('bus', '公交车', '🚌', 'n'), W('new', '新的', '✨', 'a'), W('park', '公园', '🌳', 'n')] },
      { type: 'sort', buckets: ['v', 'd'], tag: '动词 还是 副词？',
        words: [W('quickly', '快速地', '🐇', 'd'), W('read', '读', '📖', 'v'), W('loudly', '大声地', '📢', 'd'), W('swim', '游泳', '🏊', 'v')] },
      { type: 'sort', buckets: ['v', 'd'], tag: '动词 还是 副词？',
        words: [W('jump', '跳', '🤸', 'v'), W('slowly', '慢慢地', '🐢', 'd'), W('eat', '吃', '🍽️', 'v'), W('happily', '开心地', '😊', 'd')] }
    ]
  },
  /* -------- 第 5 关：四个岗位一起 -------- */
  {
    id: 5, emoji: '🎪', name: '四个岗位全到齐', desc: '全部词性大集合',
    newRoles: [], roles: ['n', 'v', 'a', 'd'], buckets: ['n', 'v', 'a', 'd'],
    rounds: [
      { type: 'sort', words: [W('apple', '苹果', '🍎', 'n'), W('quickly', '快速地', '🐇', 'd'), W('happy', '开心的', '😄', 'a'), W('jump', '跳', '🤸', 'v'), W('bus', '公交车', '🚌', 'n'), W('slowly', '慢慢地', '🐢', 'd'), W('tall', '高的', '🦒', 'a'), W('sing', '唱歌', '🎤', 'v')] },
      { type: 'sort', words: [W('teacher', '老师', '👩‍🏫', 'n'), W('loudly', '大声地', '📢', 'd'), W('red', '红色的', '🍎', 'a'), W('swim', '游泳', '🏊', 'v'), W('park', '公园', '🌳', 'n'), W('carefully', '小心地', '🔍', 'd'), W('funny', '有趣的', '🤡', 'a'), W('read', '读', '📖', 'v')] },
      { type: 'sort', words: [W('river', '河', '🌊', 'n'), W('happily', '开心地', '😊', 'd'), W('clean', '干净的', '🧼', 'a'), W('dance', '跳舞', '💃', 'v'), W('book', '书', '📕', 'n'), W('quietly', '安静地', '🤫', 'd'), W('strong', '强壮的', '💪', 'a'), W('eat', '吃', '🍽️', 'v')] }
    ]
  },
  /* -------- 第 6 关：拼句子 -------- */
  {
    id: 6, emoji: '🧩', name: '按岗位拼句子', desc: '把词放进正确的位置',
    newRoles: [], roles: ['n', 'v', 'a', 'd'], buckets: ['n', 'v', 'a', 'd'],
    rounds: [
      {
        type: 'build',
        parts: [{ t: 'text', v: 'a' }, { t: 'slot', pos: 'a' }, { t: 'slot', pos: 'n' }],
        pool: [W('cute', '可爱的', '🐰', 'a'), W('rabbit', '兔子', '🐇', 'n'), W('run', '跑', '🏃', 'v'), W('slowly', '慢慢地', '🐢', 'd')],
        speak: 'a cute rabbit', zh: '一只可爱的兔子', scene: { emoji: '🐇', anim: 'hop' }
      },
      {
        type: 'build',
        parts: [{ t: 'slot', pos: 'n' }, { t: 'slot', pos: 'v' }, { t: 'text', v: '.' }],
        pool: [W('rabbits', '兔子们', '🐇', 'n'), W('jump', '跳', '🤸', 'v'), W('cute', '可爱的', '🐰', 'a'), W('slowly', '慢慢地', '🐢', 'd')],
        speak: 'Rabbits jump', zh: '兔子们跳起来', scene: { emoji: '🐇', anim: 'hop' }
      },
      {
        type: 'build',
        parts: [{ t: 'text', v: 'The' }, { t: 'slot', pos: 'a' }, { t: 'slot', pos: 'n' }, { t: 'slot', pos: 'v' }, { t: 'text', v: '.' }],
        pool: [W('cute', '可爱的', '🐰', 'a'), W('rabbit', '兔子', '🐇', 'n'), W('jumps', '跳', '🤸', 'v'), W('slowly', '慢慢地', '🐢', 'd')],
        speak: 'The cute rabbit jumps', zh: '这只可爱的兔子跳起来', scene: { emoji: '🐇', anim: 'hop' }
      },
      {
        type: 'build',
        parts: [{ t: 'text', v: 'The' }, { t: 'slot', pos: 'a' }, { t: 'slot', pos: 'n' }, { t: 'slot', pos: 'v' }, { t: 'slot', pos: 'd' }, { t: 'text', v: '.' }],
        pool: [W('little', '小小的', '🐜', 'a'), W('turtle', '乌龟', '🐢', 'n'), W('walks', '走', '🚶', 'v'), W('slowly', '慢慢地', '🐌', 'd')],
        speak: 'The little turtle walks slowly', zh: '这只小乌龟慢慢地走', scene: { emoji: '🐢', anim: 'slow' }
      }
    ]
  },
  /* -------- 第 7 关：句子里的每个词 -------- */
  {
    id: 7, emoji: '🔍', name: '句子大解剖', desc: '在句子里认出岗位',
    newRoles: [], roles: ['n', 'v', 'a', 'd'], buckets: ['n', 'v', 'a', 'd'],
    rounds: [
      { type: 'sentence', en: 'Birds sing sweetly.', zh: '鸟儿甜甜地唱歌。',
        tokens: [{ w: 'Birds', pos: 'n' }, { w: 'sing', pos: 'v' }, { w: 'sweetly', pos: 'd' }] },
      { type: 'sentence', en: 'The yellow bus stops suddenly.', zh: '那辆黄色的公交车突然停下了。',
        tokens: [{ w: 'The', plain: true }, { w: 'yellow', pos: 'a' }, { w: 'bus', pos: 'n' }, { w: 'stops', pos: 'v' }, { w: 'suddenly', pos: 'd' }] },
      { type: 'sentence', en: 'Two black cats sleep peacefully.', zh: '两只黑猫安静地睡着。',
        tokens: [{ w: 'Two', plain: true }, { w: 'black', pos: 'a' }, { w: 'cats', pos: 'n' }, { w: 'sleep', pos: 'v' }, { w: 'peacefully', pos: 'd' }] }
    ]
  },
  /* -------- 第 8 关：终极舞台 -------- */
  {
    id: 8, emoji: '🎬', name: '终极舞台', desc: '三颗心 · 通关拿证书',
    newRoles: [], roles: ['n', 'v', 'a', 'd'], buckets: ['n', 'v', 'a', 'd'], hearts: 3,
    rounds: [
      { type: 'sort', words: [W('dog', '狗', '🐶', 'n'), W('quickly', '快速地', '🐇', 'd'), W('happy', '开心的', '😄', 'a'), W('jumps', '跳', '🤸', 'v')] },
      { type: 'sentence', en: 'The tall boy runs quickly.', zh: '那个高个子男孩跑得很快。',
        tokens: [{ w: 'The', plain: true }, { w: 'tall', pos: 'a' }, { w: 'boy', pos: 'n' }, { w: 'runs', pos: 'v' }, { w: 'quickly', pos: 'd' }] },
      {
        type: 'build',
        parts: [{ t: 'text', v: 'The' }, { t: 'slot', pos: 'a' }, { t: 'slot', pos: 'n' }, { t: 'slot', pos: 'v' }, { t: 'text', v: '.' }],
        pool: [W('happy', '开心的', '😄', 'a'), W('bird', '鸟', '🐦', 'n'), W('sings', '唱歌', '🎤', 'v'), W('quietly', '安静地', '🤫', 'd')],
        speak: 'The happy bird sings', zh: '这只开心的鸟唱歌', scene: { emoji: '🐦', anim: 'fast' }
      },
      { type: 'sort', words: [W('book', '书', '📕', 'n'), W('quietly', '安静地', '🤫', 'd'), W('clean', '干净的', '🧼', 'a'), W('read', '读', '📖', 'v')] }
    ]
  }
];

/* ================= 5 · 界面骨架 ================= */
const stageEl = () => document.getElementById('stage');
const hintEl = () => document.getElementById('hint');

function paint(html) {
  const st = document.getElementById('stageBody') || stageEl();
  st.innerHTML = html;
  st.style.animation = 'none'; void st.offsetWidth; st.style.animation = '';
  hintEl().innerHTML = ''; hintEl().style.color = '';
}
function setHint(html, tone) {
  const h = hintEl();
  h.innerHTML = html || '';
  h.style.color = tone === 'bad' ? '#b8362b' : tone === 'ok' ? '#1a7d55' : '';
}
function putHint(html, tone) { setHint(html, tone); }
function paintStars(pop) {
  const el = document.getElementById('starNum');
  if (el) el.textContent = Store.data.stars;
  const bar = document.getElementById('stars');
  if (bar && pop) { bar.classList.add('pop'); setTimeout(() => bar.classList.remove('pop'), 220); }
}
function setTitle(t) { document.getElementById('ttl').textContent = t; }

let toastTimer = null;
function toast(msg, ms = 1600) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function sheet(html, opts = {}) {
  const root = document.getElementById('sheetRoot');
  root.innerHTML = `<div class="sheet"><div class="sheet-card">${html}</div></div>`;
  const card = $('.sheet-card', root);
  if (opts.closable !== false) {
    $('.sheet', root).addEventListener('click', e => { if (e.target.classList.contains('sheet')) closeSheet(); });
  }
  return card;
}
function closeSheet() { document.getElementById('sheetRoot').innerHTML = ''; }

/* ================= 6 · 首页地图 ================= */
function screenMap() {
  setTitle('词性小剧场');
  run.failed = false;
  run.id = 1;
  run.hearts = 0;
  renderHearts();
  const done = Object.keys(Store.data.levels).length;
  const totalStars = Object.values(Store.data.levels).reduce((a, b) => a + b, 0);
  const maxStars = LEVELS.length * 3;

  paint(`
    <div class="center" style="padding:6px 0 2px">
      <h2 class="h2" style="font-size:22px">🎭 词性小剧场</h2>
      <p class="lead" style="margin-top:4px">每个单词都有一个<b>岗位</b>。<br>先弄清它在干什么，再决定把它放在哪。</p>
      <div class="row center" style="margin-top:10px;gap:8px">
        <span class="role n">🏰 名词</span>
        <span class="role v">🏃 动词</span>
        <span class="role a">🎨 形容词</span>
        <span class="role d">⚡ 副词</span>
      </div>
    </div>

    <div class="bar-wrap" style="margin:10px 2px 2px">
      <span>闯关</span>
      <div class="bar"><i style="width:${(done / LEVELS.length) * 100}%"></i></div>
      <span class="mono-num">${done}/${LEVELS.length}</span>
    </div>

    <div class="map-grid">
      ${LEVELS.map(lv => {
        const st = Store.data.levels[lv.id] || 0;
        const open = Store.unlocked(lv.id);
        const cls = ['map-item'];
        if (st > 0) cls.push('done');
        else if (!open) cls.push('locked');
        else cls.push('current');
        return `<button class="${cls.join(' ')}" data-lv="${lv.id}" ${open ? '' : 'data-locked="1"'}>
          <div class="mi-emoji">${lv.emoji}</div>
          <div class="mi-name">第 ${lv.id} 关 · ${lv.name}</div>
          <div class="mi-desc">${lv.desc}</div>
          <div class="mi-stars">${st > 0 ? '★'.repeat(st) : ''}</div>
          ${!open ? '<div class="lock">🔒</div>' : ''}
        </button>`;
      }).join('')}
    </div>

    <div class="row center" style="margin-top:4px">
      <button class="btn ghost small" id="btnHow">❓ 怎么玩</button>
      <button class="btn ghost small" id="btnData">📊 我的成绩</button>
    </div>
  `);

  $$('.map-item').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.locked) { toast('先通过上一关，这一关才会开门 🔒'); Sound.no(); return; }
    Sound.tap(); startLevel(Number(b.dataset.lv));
  }));
  $('#btnHow').addEventListener('click', howToPlay);
  $('#btnData').addEventListener('click', showStats);
}

function howToPlay() {
  sheet(`
    <div class="big">👆</div>
    <h3>怎么玩？</h3>
    <p style="text-align:left;margin-top:10px;line-height:1.8">
      玩法只有一种，每一关都一样：<br>
      <b>① 点一个单词</b> → <b>② 点它的岗位</b><br><br>
      拿不准的时候，问自己三个问题：<br>
      🏰 它是人、地方或东西的<b>名字</b>吗？<br>
      🏃 它表示一个<b>动作</b>吗？<br>
      🎨 它能回答「<b>什么样的</b>…」吗？<br>
      ⚡ 它能回答「<b>怎样地</b>做…」吗？<br><br>
      <span style="font-size:13px;color:#8a8070">做错了没关系，游戏会告诉你怎么想。</span>
    </p>
    <button class="btn" id="ok" style="margin-top:14px;width:100%">知道了</button>
  `);
  $('#ok').addEventListener('click', closeSheet);
}

function showStats() {
  const rows = LEVELS.map(lv => {
    const s = Store.data.levels[lv.id] || 0;
    return `<div class="row" style="justify-content:space-between;padding:7px 0;border-bottom:1px dashed var(--line)">
      <span style="font-weight:700;font-size:14px">${lv.emoji} 第${lv.id}关 ${lv.name}</span>
      <span style="color:${s ? 'var(--gold-dark)' : '#c3b9a6'};font-weight:800;font-size:13px">${s ? '★'.repeat(s) : '未通关'}</span>
    </div>`;
  }).join('');
  const total = Object.values(Store.data.levels).reduce((a, b) => a + b, 0);
  sheet(`
    <div class="big">📊</div>
    <h3>我的成绩</h3>
    <p>一共收集了 <b style="color:var(--gold-dark)">${total}</b> / 24 颗星</p>
    <div style="text-align:left;margin-top:12px">${rows}</div>
    <button class="btn" id="ok" style="margin-top:16px;width:100%">继续加油</button>
  `);
  $('#ok').addEventListener('click', closeSheet);
}

/* ================= 7 · 认识新角色 ================= */
function screenMeet(newKeys, learned) {
  return new Promise(resolve => {
    const cards = newKeys.map(k => {
      const p = POS[k];
      return `<div class="info-card ${k}" style="align-items:center;text-align:center;padding:18px 14px">
        <div class="ic-emoji" style="font-size:46px">${p.emoji}</div>
        <div class="ic-name" style="font-size:19px;justify-content:center">${p.name}
          <span style="font-size:12px;color:var(--sub);font-weight:700">${p.en}</span></div>
        <div class="ic-ask" style="font-size:13.5px">${p.ask}</div>
        <div class="eg-list" style="justify-content:center">
          ${p.ex.map(e => `<button class="eg" data-say="${e[0]}">${e[0]}<span style="color:var(--sub);font-weight:600"> ${e[1]}</span></button>`).join('')}
        </div>
      </div>`;
    }).join('');

    const oldChips = learned.length
      ? `<div class="row center" style="gap:6px;margin-top:4px">
           <span style="font-size:12px;color:var(--sub)">已经认识：</span>
           ${learned.map(k => `<span class="role ${k}">${POS[k].emoji} ${POS[k].name}</span>`).join('')}
         </div>` : '';

    paint(`
      <div class="center" style="padding:4px 0">
        <div class="lead" style="font-size:13px;letter-spacing:1px;color:#b3a894">🎬 新角色登场</div>
        <h2 class="h2" style="margin-top:2px">${newKeys.length > 1 ? '认一认这两个新角色' : '认一认这个新角色'}</h2>
      </div>
      <div class="${newKeys.length > 1 ? 'duo' : ''}" style="${newKeys.length > 1 ? '' : 'max-width:360px;margin:0 auto;width:100%'}">
        ${cards}
      </div>
      ${oldChips}
      <div class="row center" style="margin-top:6px">
        <button class="btn" id="next">我记住了 · 开始 →</button>
      </div>
    `);
    putHint('点一下例句，可以听听它怎么读 🔊', 'tip');

    $$('.eg').forEach(b => b.addEventListener('click', () => { Sound.tap(); Sound.say(b.dataset.say); }));
    $('#next').addEventListener('click', () => { Sound.tap(); Sound.init(); resolve(); });
  });
}

/* ================= 8 · 提示文案 ================= */
function wrongTip(word, bucketKey) {
  const p = POS[word.pos];
  return `${word.en}（${word.zh}）好像不是「${POS[bucketKey].name}」哦 —— 想一想：${p.probe}`;
}
function revealTip(word) {
  const p = POS[word.pos];
  return `${p.emoji} <b>${word.en}</b> 是<b>${p.name}</b>：${p.probe}`;
}

/* ================= 9 · 题型 A：给单词找岗位 ================= */
function roundSort(cfg, buckets, onDone) {
  return new Promise(resolve => {
    const items = shuffle(cfg.words);
    let sel = null, resolved = 0, wrongTotal = 0, locked = false;
    const wrongCount = {};
    const total = items.length;

    paint(`
      <div class="bar-wrap">
        <span>这一轮</span>
        <div class="bar"><i id="pbar"></i></div>
        <span class="mono-num" id="pnum">0/${total}</span>
      </div>
      <div class="panel">
        <div class="row" style="margin-bottom:9px">
          <span class="h3">${cfg.tag || '给它找个岗位'}</span>
          <span class="spacer"></span>
          <span style="font-size:12px;color:var(--sub)">点单词 → 点岗位</span>
        </div>
        <div class="pool" id="pool">
          ${items.map((w, i) => `<button class="wcard" data-i="${i}" data-pos="${w.pos}">
            <span class="wc-emoji">${w.emoji || ''}</span>
            <span class="wc-en">${esc(w.en)}</span>
            <span class="wc-zh">${esc(w.zh)}</span>
          </button>`).join('')}
        </div>
        <div class="buckets" id="buckets" style="margin-top:12px">
          ${buckets.map(k => `<button class="bucket b-${k}" data-b="${k}">
            <span class="b-head"><span class="b-name">${POS[k].emoji} ${POS[k].name}</span><small>· ${POS[k].short}</small>
              <span class="b-count" data-c="${k}">0</span></span>
            <span class="b-items" data-items="${k}"></span>
          </button>`).join('')}
        </div>
      </div>
    `);
    putHint(`${items.length} 个单词，${buckets.length} 个岗位。慢慢来，一次只看一个词。`, 'tip');

    const pool = $('#pool'), bks = $('#buckets');

    const updateBar = () => {
      $('#pbar').style.width = (resolved / total * 100) + '%';
      $('#pnum').textContent = `${resolved}/${total}`;
    };

    const correct = (card, w) => {
      card.classList.remove('sel');
      card.classList.add('ok');
      setTimeout(() => { card.classList.add('used'); card.classList.remove('ok'); }, 200);
      const host = $(`[data-items="${w.pos}"]`, bks);
      host.insertAdjacentHTML('beforeend', `<span class="mini ${w.pos}">${w.emoji || ''} ${esc(w.en)}</span>`);
      const cnt = $(`[data-c="${w.pos}"]`, bks);
      cnt.textContent = String(Number(cnt.textContent) + 1);
      const bucket = $(`[data-b="${w.pos}"]`, bks);
      bucket.classList.add('flash'); setTimeout(() => bucket.classList.remove('flash'), 420);
      resolved++; updateBar();
      Sound.ok(); Sound.say(w.en);
      setHint(`✅ <b>${esc(w.en)}</b> 是${POS[w.pos].name} —— ${POS[w.pos].probe}`, 'ok');
      sel = null;
      if (resolved === total) {
        locked = true;
        setTimeout(() => { onDone(wrongTotal); resolve(); }, 780);
      }
    };

    const wrong = (card, w, bucketKey) => {
      card.classList.remove('sel');
      card.classList.add('wrong');
      setTimeout(() => card.classList.remove('wrong'), 400);
      wrongCount[w.en] = (wrongCount[w.en] || 0) + 1;
      wrongTotal++;
      Sound.no();
      if (noteWrong()) { locked = true; setTimeout(levelFailed, 600); return; }
      if (wrongCount[w.en] >= 2) {
        // 支持渐隐：连续错两次后，直接给出「岗位徽章 + 目标高亮」
        if (!$('.role', card)) {
          card.insertAdjacentHTML('beforeend', `<span class="role ${w.pos}">${POS[w.pos].emoji} ${POS[w.pos].name}</span>`);
        }
        const b = $(`[data-b="${w.pos}"]`, bks);
        b.classList.add('hintable', 'flash');
        setHint(`${revealTip(w)} —— 把它点进 ${POS[w.pos].emoji} ${POS[w.pos].name} 吧`, 'tip');
      } else {
        setHint(`❌ ` + wrongTip(w, bucketKey), 'bad');
      }
      sel = null;
      $$('.wcard', pool).forEach(x => x.classList.remove('sel'));
    };

    pool.addEventListener('click', e => {
      if (locked) return;
      const card = e.target.closest('.wcard');
      if (!card || card.classList.contains('used')) return;
      const already = card.classList.contains('sel');
      $$('.wcard', pool).forEach(x => x.classList.remove('sel'));
      if (already) { sel = null; return; }
      card.classList.add('sel'); sel = Number(card.dataset.i); Sound.tap();
      setHint('选好了，现在点它该去的岗位 👇', 'tip');
    });

    bks.addEventListener('click', e => {
      if (locked) return;
      const b = e.target.closest('.bucket');
      if (!b) return;
      Sound.tap();
      if (sel === null) {
        b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 400);
        setHint('先点上面的一个<b>单词</b>，再点岗位 👆', 'tip');
        return;
      }
      const card = $(`[data-i="${sel}"]`, pool);
      if (!card || card.classList.contains('used')) { sel = null; return; }
      const w = items[sel];
      if (w.pos === b.dataset.b) correct(card, w);
      else wrong(card, w, b.dataset.b);
    });
  });
}

/* ================= 10 · 题型 B：句子大解剖 ================= */
function roundSentence(cfg, buckets, onDone) {
  return new Promise(resolve => {
    const tokens = cfg.tokens;
    const targets = tokens.filter(t => !t.plain);
    let sel = null, resolved = 0, wrongTotal = 0, locked = false;
    const wrongCount = {};
    const total = targets.length;

    paint(`
      <div class="bar-wrap">
        <span>这句里有</span>
        <div class="bar"><i id="pbar"></i></div>
        <span class="mono-num" id="pnum">0/${total}</span>
      </div>
      <div class="panel">
        <div class="row" style="margin-bottom:9px">
          <span class="h3">句子里的每个词都有岗位</span>
          <span class="spacer"></span>
          <span style="font-size:12px;color:var(--sub)">点词 → 点岗位</span>
        </div>
        <div class="chips" id="chips">
          ${tokens.map((t, i) => t.plain
        ? `<span class="fnw">${esc(t.w)}</span>`
        : `<button class="chip" data-i="${i}" data-pos="${t.pos}">${esc(t.w)}<span class="c-tag">?</span></button>`).join('')}
        </div>
        <div class="center" style="font-size:12.5px;color:var(--sub);margin-top:6px">${esc(cfg.zh)}</div>
        <div class="buckets" id="buckets" style="margin-top:12px">
          ${buckets.map(k => `<button class="bucket b-${k}" data-b="${k}" style="min-height:auto">
            <span class="b-head"><span class="b-name">${POS[k].emoji} ${POS[k].name}</span><small>· ${POS[k].short}</small>
              <span class="b-count" data-c="${k}">0</span></span>
          </button>`).join('')}
        </div>
      </div>
    `);
    putHint('灰色的词（the、two…）先不用管，只给有颜色的词分岗位。', 'tip');

    const chips = $('#chips'), bks = $('#buckets');
    const updateBar = () => {
      $('#pbar').style.width = (resolved / total * 100) + '%';
      $('#pnum').textContent = `${resolved}/${total}`;
    };

    chips.addEventListener('click', e => {
      if (locked) return;
      const c = e.target.closest('.chip');
      if (!c || c.classList.contains('found')) return;
      const already = c.classList.contains('sel');
      $$('.chip', chips).forEach(x => x.classList.remove('sel'));
      if (already) { sel = null; return; }
      c.style.outline = '3px solid #f0ad2b'; c.style.outlineOffset = '2px';
      sel = Number(c.dataset.i); Sound.tap();
      setHint('很好，现在告诉我它是哪个岗位 👇', 'tip');
    });

    bks.addEventListener('click', e => {
      if (locked) return;
      const b = e.target.closest('.bucket');
      if (!b) return;
      Sound.tap();
      if (sel === null) {
        setHint('先点句子里的一个<b>词</b>，再点它的岗位 👆', 'tip');
        b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 400);
        return;
      }
      const chip = $(`.chip[data-i="${sel}"]`, chips);
      if (!chip || chip.classList.contains('found')) { sel = null; return; }
      const t = tokens[sel];
      if (t.pos === b.dataset.b) {
        chip.classList.remove('sel');
        chip.style.outline = '';
        chip.classList.add('found', t.pos);
        $('.c-tag', chip).textContent = POS[t.pos].name;
        const cnt = $(`[data-c="${t.pos}"]`, bks);
        cnt.textContent = String(Number(cnt.textContent) + 1);
        b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 420);
        resolved++; updateBar();
        Sound.ok(); Sound.say(cfg.en);
        setHint(`✅ <b>${esc(t.w)}</b> 是${POS[t.pos].name} —— ${POS[t.pos].probe}`, 'ok');
        sel = null;
        if (resolved === total) {
          locked = true;
          setHint(`🎬 整句读一遍：<b>${esc(cfg.en)}</b>`, 'ok');
          setTimeout(() => { onDone(wrongTotal); resolve(); }, 900);
        }
      } else {
        chip.classList.remove('sel');
        chip.style.outline = '';
        chip.classList.add('wrong');
        setTimeout(() => chip.classList.remove('wrong'), 420);
        wrongCount[t.w] = (wrongCount[t.w] || 0) + 1;
        wrongTotal++;
        Sound.no();
        if (noteWrong()) { locked = true; setTimeout(levelFailed, 600); return; }
        const fake = { en: t.w, zh: '…', pos: t.pos };
        if (wrongCount[t.w] >= 2) {
          chip.classList.add('found', t.pos);
          $('.c-tag', chip).textContent = POS[t.pos].name;
          resolved++; updateBar();
          setHint(`${revealTip(fake)} —— 已经帮你标好啦`, 'tip');
        } else {
          setHint(`❌ <b>${esc(t.w)}</b> 不是「${POS[b.dataset.b].name}」哦 —— ${POS[t.pos].probe}`, 'bad');
        }
        sel = null;
      }
    });
  });
}

/* ================= 11 · 题型 C：按岗位拼句子 ================= */
function roundBuild(cfg, onDone) {
  return new Promise(resolve => {
    const slotIdx = cfg.parts.map((p, i) => p.t === 'slot' ? i : -1).filter(i => i >= 0);
    const filled = {};
    let sel = null, wrongTotal = 0, locked = false;
    const totalSlots = slotIdx.length;

    paint(`
      <div class="panel">
        <div class="build-scene">
          <div class="bs-top">
            <span class="bs-actor" id="actor">${cfg.scene.emoji}</span>
            <span class="bs-goal">目标：<b>${esc(cfg.zh)}</b></span>
          </div>
          <div class="sentence" id="frame">
            ${cfg.parts.map((p, i) => p.t === 'text'
        ? `<span class="wstatic">${esc(p.v)}</span>`
        : `<button class="slot" data-slot="${i}" data-need="${p.pos}">
                   <span class="s-ph">放这里</span>
                   <span class="s-lab">${POS[p.pos].name}</span>
                 </button>`).join('')}
          </div>
          <div class="bs-read" id="sceneSent"></div>
        </div>

        <div class="pool" id="pool" style="margin-top:10px">
          ${shuffle(cfg.pool).map((w, i) => `<button class="wcard" data-i="${i}" data-en="${esc(w.en)}" data-pos="${w.pos}">
            <span class="wc-emoji">${w.emoji || ''}</span>
            <span class="wc-en">${esc(w.en)}</span>
            <span class="wc-zh">${esc(w.zh)}</span>
          </button>`).join('')}
        </div>
      </div>
    `);
    putHint('先看目标句子，再按「什么岗位就放哪个位置」来拼。点单词 → 点空位。', 'tip');

    const pool = $('#pool'), frame = $('#frame');
    const poolWords = cfg.pool;
    // 记录 pool 索引对应的词（shuffle 后从 DOM 读取顺序）

    const refresh = () => {
      let done = 0;
      const html = cfg.parts.map((p, i) => {
        if (p.t === 'text') return esc(p.v);
        const w = filled[i];
        if (!w) return '';
        done++;
        return `<span class="hl-${w.pos}">${esc(w.en)}</span>`;
      }).join(' ');
      $('#sceneSent').innerHTML = done === totalSlots ? html : '';
      $('#sceneSent').classList.toggle('on', done === totalSlots);
    };

    pool.addEventListener('click', e => {
      if (locked) return;
      const card = e.target.closest('.wcard');
      if (!card || card.classList.contains('used')) return;
      const already = card.classList.contains('sel');
      $$('.wcard', pool).forEach(x => x.classList.remove('sel'));
      if (already) { sel = null; return; }
      card.classList.add('sel'); sel = card.dataset.en; Sound.tap();
      setHint('它属于哪个空位呢？点一下空位 👇', 'tip');
    });

    frame.addEventListener('click', e => {
      if (locked) return;
      const slot = e.target.closest('.slot');
      if (!slot) return;
      Sound.tap();
      const si = Number(slot.dataset.slot);

      // 已经填了 → 取回来
      if (filled[si]) {
        const w = filled[si];
        delete filled[si];
        slot.classList.remove('filled', 'ok');
        slot.innerHTML = `<span class="s-ph">放这里</span><span class="s-lab">${POS[cfg.parts[si].pos].name}</span>`;
        const card = $$('.wcard', pool).find(c => c.dataset.en === w.en && c.classList.contains('used'));
        if (card) card.classList.remove('used');
        refresh(); setHint('拿回来了，再想想放哪里～', 'tip');
        return;
      }

      if (!sel) { setHint('先点下面一个<b>单词</b>，再点空位 👇', 'tip'); slot.classList.add('bad'); setTimeout(() => slot.classList.remove('bad'), 400); return; }

      const w = poolWords.find(x => x.en === sel) || { en: sel, zh: '', pos: '?' };
      const need = cfg.parts[si].pos;

      if (w.pos === need) {
        filled[si] = w;
        slot.classList.add('filled', 'ok');
        slot.innerHTML = `<span class="s-en">${esc(w.en)}</span><span class="s-zh">${POS[w.pos].emoji}</span>`;
        const card = $$('.wcard', pool).find(c => c.dataset.en === w.en);
        if (card) { card.classList.remove('sel'); card.classList.add('used'); }
        sel = null; Sound.ok(); Sound.say(w.en);
        setHint(`✅ ${esc(w.en)} 是${POS[w.pos].name}，放在这个位置刚好！`, 'ok');
        refresh();
        if (Object.keys(filled).length === totalSlots) {
          locked = true;
          const actor = $('#actor');
          actor.classList.add('act-' + (cfg.scene.anim || 'hop'));
          setTimeout(() => Sound.say(cfg.speak), 400);
          setTimeout(() => {
            setHint(`🎬 <b>${esc(cfg.speak)}</b> —— ${esc(cfg.zh)}`, 'ok');
            setTimeout(() => { onDone(wrongTotal); resolve(); }, 900);
          }, 700);
        }
      } else {
        slot.classList.add('bad'); setTimeout(() => slot.classList.remove('bad'), 420);
        const card = $$('.wcard', pool).find(c => c.dataset.en === sel);
        if (card) { card.classList.add('wrong'); setTimeout(() => card.classList.remove('wrong'), 420); }
        wrongTotal++; Sound.no();
        if (noteWrong()) { locked = true; setTimeout(levelFailed, 600); return; }
        setHint(`❌ ${esc(sel)} 是${POS[w.pos] ? POS[w.pos].name : '另一个岗位'}，这个空位要放 <b>${POS[need].name}</b> 呀。`, 'bad');
        sel = null;
      }
    });

    refresh();
  });
}

/* ================= 12 · 题型 D：选择题 ================= */
function roundChoice(cfg, onDone) {
  return new Promise(resolve => {
    paint(`
      <div class="panel">
        <div class="row" style="margin-bottom:12px"><span class="h3">${esc(cfg.q)}</span></div>
        <div class="opts" id="opts">
          ${cfg.options.map((o, i) => `<button class="opt" data-i="${i}">
            <span class="o-key">${'ABCD'[i]}</span><span>${esc(o.v)}</span>
          </button>`).join('')}
        </div>
      </div>
    `);
    putHint('选一个你觉得对的就好，选错了也没关系。', 'tip');
    let wrong = 0, locked = false;
    $('#opts').addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b || locked) return;
      const i = Number(b.dataset.i);
      if (i === cfg.answer) {
        locked = true;
        b.classList.add('right'); Sound.ok(); Sound.say(cfg.options[i].v);
        setHint(`✅ ${esc(cfg.why)}`, 'ok');
        setTimeout(() => { onDone(wrong); resolve(); }, 1100);
      } else {
        wrong++; b.classList.add('wrong'); Sound.no();
        if (noteWrong()) { locked = true; setTimeout(levelFailed, 600); return; }
        b.disabled = true;
        setHint(`❌ 再想想：${esc(cfg.hint || '用「三个问题」问一问它。')}`, 'bad');
      }
    });
  });
}

/* ================= 13 · 关卡调度 ================= */
const run = { id: 1, idx: 0, wrong: 0, hearts: 0, failed: false };

function renderHearts() {
  const box = document.getElementById('hearts');
  if (!box) return;
  const lv = LEVELS[run.id - 1];
  if (!lv || !lv.hearts) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const left = run.hearts;
  box.innerHTML = Array.from({ length: lv.hearts },
    (_, i) => `<span class="${i < left ? '' : 'gone'}">💛</span>`).join('');
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
}

/** 记一次错误：星星结算 + 爱心结算；返回 true 表示爱心用完了 */
function noteWrong() {
  run.wrong++;
  const lv = LEVELS[run.id - 1];
  if (lv && lv.hearts) {
    run.hearts = Math.max(0, run.hearts - 1);
    renderHearts();
    if (run.hearts === 0) { run.failed = true; return true; }
    if (run.hearts === 1) toast('只剩最后一颗心啦 💛', 1200);
  }
  return false;
}

async function startLevel(id) {
  const lv = LEVELS[id - 1];
  run.id = id; run.idx = 0; run.wrong = 0; run.failed = false;
  run.hearts = lv.hearts || 0;
  renderHearts();

  // 1) 先认识新角色（每关最多引入一个新信息块）
  if (lv.newRoles && lv.newRoles.length) {
    const learned = [];
    for (let i = 0; i < id - 1; i++) {
      (LEVELS[i].newRoles || []).forEach(k => { if (!learned.includes(k)) learned.push(k); });
    }
    setTitle(`第${id}关 · 认识新角色`);
    await screenMeet(lv.newRoles, learned);
  }
  nextRound();
}

async function nextRound() {
  const lv = LEVELS[run.id - 1];
  if (run.failed) return;
  if (run.idx >= lv.rounds.length) return finishLevel();

  setTitle(`第${run.id}关 · ${lv.name} ${run.idx + 1}/${lv.rounds.length}`);
  const cfg = lv.rounds[run.idx];
  const buckets = cfg.buckets || lv.buckets;

  let roundWrong = 0;
  const collect = (w) => { roundWrong = w; };

  if (cfg.type === 'sort') await roundSort(cfg, buckets, collect);
  else if (cfg.type === 'sentence') await roundSentence(cfg, buckets, collect);
  else if (cfg.type === 'build') await roundBuild(cfg, collect);
  else if (cfg.type === 'choice') await roundChoice(cfg, collect);

  if (run.failed) return;
  run.idx++;
  await wait(180);
  nextRound();
}

function levelFailed() {
  const lv = LEVELS[run.id - 1];
  setTitle(`第${run.id}关 · ${lv.name}`);
  Sound.no();
  paint(`
    <div class="panel center" style="padding:26px 18px">
      <div style="font-size:56px">💛</div>
      <h2 class="h2" style="margin-top:8px">三颗心用完啦</h2>
      <p class="lead" style="margin-top:6px">没关系，再来一次一定行！<br>这一次试试：<b>先用三个问题问一问这个词</b>。</p>
      <div class="row center" style="margin-top:16px">
        <button class="btn ghost" id="toMap">回地图</button>
        <button class="btn" id="retry">再挑战一次</button>
      </div>
    </div>
  `);
  $('#toMap').addEventListener('click', screenMap);
  $('#retry').addEventListener('click', () => { Sound.tap(); startLevel(run.id); });
}

function starsFor() {
  const w = run.wrong;
  if (w === 0) return 3;
  if (w <= 2) return 2;
  return 1;
}

function finishLevel() {
  const lv = LEVELS[run.id - 1];
  const st = starsFor();
  Store.setLevel(lv.id, st);
  Store.addStars(st);
  Sound.win();
  closeSheet();

  const isLast = lv.id === LEVELS.length;
  const nextLv = LEVELS[lv.id];
  const canNext = nextLv && Store.unlocked(nextLv.id);

  if (isLast) return showCertificate(st);

  sheet(`
    <div class="big">${st === 3 ? '🏆' : st === 2 ? '🎉' : '👍'}</div>
    <h3>第 ${lv.id} 关 · 通过！</h3>
    <p style="margin-top:4px">${st === 3 ? '全对！你已经是小小词性专家了。' : st === 2 ? '很棒，再细心一点就满分啦。' : '完成了！多玩一次会更熟练。'}</p>
    <div style="font-size:30px;letter-spacing:6px;color:var(--gold);margin:12px 0">${'★'.repeat(st)}<span style="color:#e8e0d0">${'★'.repeat(3 - st)}</span></div>
    <div class="row center" style="gap:10px">
      <button class="btn ghost small" id="m">回地图</button>
      <button class="btn small" id="n">${canNext ? '下一关 →' : '继续 →'}</button>
    </div>
  `);
  $('#m').addEventListener('click', () => { closeSheet(); screenMap(); });
  $('#n').addEventListener('click', () => {
    closeSheet();
    if (canNext) startLevel(nextLv.id); else screenMap();
  });
}

function showCertificate(st) {
  const name = Store.data.name || '';
  paint(`
    <div class="center" style="padding:6px 0">
      <div style="font-size:56px">🎊</div>
      <h2 class="h2" style="margin-top:4px">全部通关！</h2>
    </div>
    <div class="cert">
      <div class="center">
        <div class="ct-title">W O R D   T H E A T E R   证 书</div>
        <div class="ct-name" id="certName">${name ? esc(name) : '小小词性专家'}</div>
        <div class="ct-desc">已经能分清 名词 · 动词 · 形容词 · 副词</div>
        <div style="font-size:22px;letter-spacing:5px;color:var(--gold-dmer,var(--gold));margin:10px 0 6px">★★★</div>
      </div>
      <div class="props">
        <div class="prop">🏰</div><div class="prop">🏃</div><div class="prop">🎨</div><div class="prop">⚡</div>
        <div class="prop">🧩</div><div class="prop">🔍</div><div class="prop">🎬</div><div class="prop">🏆</div>
      </div>
      <div style="margin-top:12px">
        <input class="nameInput" id="nm" placeholder="写上你的名字，领证书" value="${esc(name)}" maxlength="12">
      </div>
    </div>
    <div class="row center" style="margin-top:12px">
      <button class="btn ghost small" id="back">回地图</button>
      <button class="btn small" id="save">保存名字</button>
    </div>
    <p class="center lead" style="margin-top:10px;font-size:12.5px;color:#a2988a">
      小提示：下次遇到不认识的英文单词，用「三个问题」问一问它。
    </p>
  `);
  putHint('🎬 恭喜杀青！你已经认识四个岗位了。', 'ok');
  $('#save').addEventListener('click', () => {
    Store.data.name = $('#nm').value.trim(); Store.save();
    $('#certName').textContent = Store.data.name || '小小词性专家';
    toast('名字已保存 ✅'); Sound.ok();
  });
  $('#back').addEventListener('click', screenMap);
  Sound.win();
}

/* ================= 14 · 设置 ================= */
function openSettings() {
  const card = sheet(`
    <div class="big">⚙️</div>
    <h3>设置</h3>
    <div style="text-align:left;margin-top:14px;display:grid;gap:10px">
      <button class="btn ghost" id="sSound" style="width:100%;justify-content:space-between">
        <span>🔊 音效与朗读</span><b id="sSoundV">${Sound.on ? '开' : '关'}</b>
      </button>
      <button class="btn ghost" id="sUnlock" style="width:100%">🔓 解锁全部关卡（家长）</button>
      <button class="btn ghost" id="sReset" style="width:100%;color:#b8362b">🗑️ 清空进度重新开始</button>
    </div>
    <p style="font-size:11.5px;color:#a2988a;margin-top:12px;line-height:1.6;text-align:left">
      设计依据：认知负荷理论（每关只加一个新词性）+ 交替实例原则（例子不断换场景，结构不变）。
    </p>
    <button class="btn" id="sClose" style="margin-top:14px;width:100%">关闭</button>
  `);
  $('#sSound', card).addEventListener('click', () => {
    Sound.on = !Sound.on;
    Sound.on ? Sound.init() : null;
    $('#sSoundV', card).textContent = Sound.on ? '开' : '关';
    Store.data.sound = Sound.on; Store.save();
    if (Sound.on) Sound.ok();
  });
  $('#sUnlock', card).addEventListener('click', () => {
    Store.data.unlockAll = true; Store.save(); closeSheet(); screenMap(); toast('已解锁全部关卡 🔓');
  });
  $('#sReset', card).addEventListener('click', () => {
    Store.reset(); Store.data.unlockAll = false; Store.save();
    closeSheet(); paintStars(); screenMap(); toast('进度已清空');
  });
  $('#sClose', card).addEventListener('click', closeSheet);
}

/* ================= 15 · 启动 ================= */
function boot() {
  Store.load();
  Sound.on = Store.data.sound !== false;
  paintStars();
  screenMap();

  document.getElementById('btnHome').addEventListener('click', () => {
    Sound.tap();
    const lv = LEVELS[run.id - 1];
    if (stageEl().querySelector('.map-grid')) return;
    sheet(`
      <div class="big">🗺️</div>
      <h3>回到地图？</h3>
      <p>这一关的进度会保留哦</p>
      <div class="row center" style="margin-top:14px;gap:10px">
        <button class="btn ghost small" id="c">继续玩</button>
        <button class="btn small" id="y">回地图</button>
      </div>
    `);
    $('#c').addEventListener('click', closeSheet);
    $('#y').addEventListener('click', () => { closeSheet(); screenMap(); });
  });

  document.getElementById('btnSet').addEventListener('click', () => { Sound.tap(); openSettings(); });

  // 首次交互解锁音频
  const unlock = () => { Sound.init(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock);

  // 键盘：Esc 关闭弹层；1-4 快捷选岗位（方便大屏 / 老师演示）
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('sheetRoot').innerHTML) closeSheet();
      return;
    }
    const k = { '1': 'n', '2': 'v', '3': 'a', '4': 'd' }[e.key];
    if (!k) return;
    const b = document.querySelector(`.bucket[data-b="${k}"]`);
    if (b) b.click();
  });
}

document.addEventListener('DOMContentLoaded', boot);
