# Hello Backend

一个最小但完整的前后端项目，用来理解「后端到底在做什么」。

包含注册、登录、token 鉴权、按用户隔离的数据，以及**持久化存储（重启不丢）**。

> 这是我学习后端时亲手写的第一个项目。目标是：跑通一条真正的最小闭环。

---

## 它能做什么

- 用户注册、登录
- 登录后拿到 token，凭 token 访问自己的数据
- 每个账号有独立的游戏进度（等级、金币）
- 点「+10 金币」只增加自己的金币，**不会影响别人**
- 数据写入 `data.json`，**重启后端也不丢**

---

## 快速开始

### 1. 环境要求

- [Node.js](https://nodejs.org/) 18 或以上
- npm（装 Node 时自带）

### 2. 安装依赖

```bash
npm install
```

### 3. 启动后端

```bash
node server.js
```

或：

```bash
npm start
```

启动成功会显示：

```
后端跑起来了：http://localhost:3000
```

### 4. 打开前端

双击 `login.html`，用下面的测试账号登录：

| 用户名 | 密码 |
|---|---|
| alice | 123456 |
| bob | abcdef |

试试：

1. 用 alice 登录 → 查看进度 → 点几次「+10 金币」
2. 换成 bob 登录 → 进度完全不同
3. 再切回 alice → 她的金币还在

---

## 接口一览

| 方法 | 路径 | 说明 | 需要 token |
|---|---|---|---|
| POST | `/api/register` | 注册，body: `{username, password}` | 否 |
| POST | `/api/login` | 登录，返回 token | 否 |
| GET | `/api/progress` | 查看自己的进度 | 是 |
| POST | `/api/gain` | 金币 +10 | 是 |

带 token 的请求格式：

```
Authorization: Bearer <token>
```

---

## 项目结构

```
hello-backend/
├── server.js          # 后端：Express 服务、登录、进度逻辑
├── login.html         # 前端：登录与进度页面
├── data.json          # 数据存储（用户 + 进度）
├── package.json       # 依赖与脚本
├── .gitignore         # 忽略 node_modules
└── README.md          # 本文件
```

---

## 它是怎么工作的

```
浏览器 (login.html)
   │  fetch 请求
   ▼
后端 (server.js)
   │  验证 token → 找到用户 → 读写 data.json
   ▼
返回 JSON 数据
   │
   ▼
浏览器显示结果
```

- **前端**：负责界面和发请求
- **后端**：负责验证身份、处理数据
- **data.json**：负责记住一切，重启也不丢

---

## 说明

这是一个**学习项目**，为了容易理解，做了几处简化：

- 密码以明文存储（真实项目必须哈希）
- token 存在内存中，重启后端需要重新登录
- 用 JSON 文件当数据库（真实项目会用数据库）

但骨架是完整的：注册、登录、鉴权、数据隔离、持久化。

`node_modules/` 不需要提交，运行 `npm install` 会自动重建。

---

## 后续可以做的事

- [ ] 密码哈希（bcrypt）
- [ ] token 换成 JWT，重启不用重登
- [ ] 文件存储换成数据库（如 SQLite）
- [ ] 加「每天登录 +10」的每日机制
- [ ] 加历史记录，变成只增不减的时间线

---

## License

ISC


<!-- 这是从 test-clone 推上来的改动 -->