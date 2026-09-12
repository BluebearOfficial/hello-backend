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
  db.progress[id] = { level: 1, gold: 0 };
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

  settle(userId);

  const p = db.progress[userId];
  const cost = Math.floor(MACHINE_BASE_COST * Math.pow(MACHINE_COST_GROWTH, p.machines));

  if (p.gold < cost) {
    return res.json({ ok: false, msg: '金币不够', need: cost });
  }

  p.gold -= cost;
  p.machines += 1;
  save();

  res.json({ ok: true, progress: p, cost: cost });
});


const MACHINE_RATE = 1;   // 每台 1 级自动机每秒产 1 金币
const MACHINE_BASE_COST = 10;  // 第一台的价格
const MACHINE_COST_GROWTH = 1.15; // 每买一台，价格乘 1.15

// 结算某个用户的离线收益
function settle(userId) {
  const p = db.progress[userId];
  const now = Date.now();

  // 第一次访问：只记录时间，不结算
  if (!p.lastTick) {
    p.lastTick = now;
    return;
  }

  const elapsed = (now - p.lastTick) / 1000; // 过了多少秒
  p.gold += p.machines * MACHINE_RATE * elapsed;
  p.lastTick = now;
}


app.listen(3000, () => {
  console.log('后端跑起来了：http://localhost:3000');
});