const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const FILE = './data.json';

// ===== 读：启动时加载，没有就用默认 =====
let db = { users: [], progress: {} };
if (fs.existsSync(FILE)) {
  db = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
}

// ===== 写：每次改动后存盘 =====
function save() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// token → userId（这个仍放内存，重启要重新登录）
const tokens = {};

// ===== 注册 =====
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (db.users.find(u => u.username === username)) {
    return res.json({ ok: false, msg: '用户名已存在' });
  }
  const id = db.users.length + 1;
  db.users.push({ id, username, password });
  db.progress[id] = {  gold: 0 };
  save();
  res.json({ ok: true, msg: '注册成功' });
});

// ===== 登录 =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.json({ ok: false, msg: '用户名或密码错误' });
  }
  const token = 'token-' + user.id + '-' + Date.now();
  tokens[token] = user.id;
  res.json({ ok: true, token, username: user.username });
});

// ===== 查进度 =====
app.get('/api/progress', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = tokens[token];

  if (!userId) {
    return res.json({ ok: false, msg: '未登录或 token 无效' });
  }

  settle(userId);   // ← 加这一行
  save();

  res.json({
    ok: true,
    username: db.users.find(u => u.id === userId).username,
    progress: db.progress[userId],
  });
});

// ===== 加金币 =====
app.post('/api/gain', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = tokens[token];

  if (!userId) {
    return res.json({ ok: false, msg: '未登录' });
  }
  db.progress[userId].gold += 10;
  save();
  res.json({ ok: true, progress: db.progress[userId] });
});

app.post('/api/buy-machine', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = tokens[token];

  if (!userId) {
    return res.json({ ok: false, msg: '未登录' });
  }

app.post('/api/prestige', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = tokens[token];

  if (!userId) {
    return res.json({ ok: false, msg: '未登录' });
  }

  settle(userId);   // 先结算，确保 totalGold 是最新的

  const p = db.progress[userId];

  // 算能换多少声望
  const gained = Math.floor(Math.sqrt(p.totalGold / PRESTIGE_DIVISOR));
  if (gained <= 0) {
    return res.json({ ok: false, msg: '还不够重置，多攒点总金币', totalGold: p.totalGold });
  }

  // 加声望
  p.prestige += gained;

  // 重置这一轮
  p.gold = 0;
  p.machines = { "1": 0, "2": 0, "3": 0, "4": 0 };
  p.totalGold = 0;
  p.lastTick = Date.now();

  save();

  res.json({ ok: true, gained, prestige: p.prestige });
});


  settle(userId);

  const level = req.body.level || 1;  // 默认买 1 级
  const p = db.progress[userId];

  let cost;
  if (level === 1) {
    cost = Math.floor(MACHINE_BASE_COST * Math.pow(MACHINE_COST_GROWTH, p.machines["1"]));
  } else if (level === 2) {
    cost = Math.floor(M2_BASE_COST * Math.pow(M2_COST_GROWTH, p.machines["2"]));
  } else if (level === 3) {
  cost = Math.floor(M3_BASE_COST * Math.pow(M3_COST_GROWTH, p.machines["3"]));
}else if (level === 4) {
  cost = Math.floor(M4_BASE_COST * Math.pow(M4_COST_GROWTH, p.machines["4"]));
}
  
  else {
    return res.json({ ok: false, msg: '没有这个等级' });
  }

  if (p.gold < cost) {
    return res.json({ ok: false, msg: '金币不够', need: cost });
  }

  p.gold -= cost;
  p.machines[level] += 1;
  save();

  res.json({ ok: true, progress: p, cost });
});


const MACHINE_RATE = 1;            // 1 级自动机：每秒产 1 金币
const MACHINE_BASE_COST = 10;      // 1 级自动机基础价
const MACHINE_COST_GROWTH = 1.15;  // 1 级价格增长

const M2_RATE = 0.2;               // 2 级自动机：每秒产 0.2 个 1 级自动机
const M2_BASE_COST = 100;          // 2 级自动机基础价
const M2_COST_GROWTH = 1.2;        // 2 级价格增长

const M3_RATE = 0.05;              // 3 级自动机：每秒产 0.05 个 2 级自动机
const M3_BASE_COST = 1000;         // 3 级自动机基础价
const M3_COST_GROWTH = 1.3;        // 3 级价格增长

const M4_RATE = 0.01;              // 4 级自动机：每秒产 0.01 个 3 级自动机
const M4_BASE_COST = 10000;        // 4 级自动机基础价
const M4_COST_GROWTH = 1.4;        // 4 级价格增长

const PRESTIGE_BONUS = 0.1;   // 每点声望 +10% 产量
const PRESTIGE_DIVISOR = 1e6; // 声望公式里的除数

// 结算某个用户的离线收益
function settle(userId) {
  const p = db.progress[userId];
  const now = Date.now();

  if (!p.lastTick) {
    p.lastTick = now;
    return;
  }

  const elapsed = (now - p.lastTick) / 1000;
  const mult = prestigeMultiplier(p);   // ← 声望加成

  p.machines["3"] += p.machines["4"] * M4_RATE * elapsed * mult;
  p.machines["2"] += p.machines["3"] * M3_RATE * elapsed * mult;
  p.machines["1"] += p.machines["2"] * M2_RATE * elapsed * mult;

  const gain = p.machines["1"] * MACHINE_RATE * elapsed * mult;  // ← 产出的金币
  p.gold += gain;
  p.totalGold += gain;                  // ← 累加总金币

  p.lastTick = now;
}

function prestigeMultiplier(p) {
  return 1 + p.prestige * PRESTIGE_BONUS;
}

app.listen(3000, () => {
  console.log('后端跑起来了：http://localhost:3000');
});