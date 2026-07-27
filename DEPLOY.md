# 📦 部署指南（DEPLOY.md）

本文档介绍如何将保号提醒系统部署到各平台，按推荐程度排序：

| 平台 | 推荐度 | 内置定时 | 数据持久化 | 说明 |
|---|---|---|---|---|
| [Docker / Docker Compose](#一docker-部署推荐) | ⭐⭐⭐⭐⭐ | ✅ 自带 | ✅ 卷挂载 | 功能最完整，首选 |
| [VPS 直接运行](#二vps--服务器直接运行) | ⭐⭐⭐⭐ | ✅ 自带 | ✅ 本地磁盘 | 有服务器就行 |
| [Vercel + 免费数据库](#三vercel-部署推荐搭配-aiven-免费数据库) | ⭐⭐⭐⭐ | ❌ 需外部 Cron | ✅ 外接 PG/MySQL | 全免费方案，推荐 |
| [Cloudflare](#四cloudflare-部署) | ⭐⭐ | ✅ Cron Triggers | ⚠️ 需改造代码 | 需要额外适配工作 |

> **核心结论**：本项目支持三种存储——**JSON 文件（默认）/ PostgreSQL / MySQL**。Docker / VPS 用默认 JSON 开箱即用；Vercel 等 Serverless 平台文件系统不可持久化，配一个免费数据库（如 [Aiven](https://aiven.io) 的免费 PG/MySQL）的 `DATABASE_URL` 即可完整使用。

---

## 部署前准备（所有平台通用）

### 1. 获取通知渠道凭证

| 渠道 | 需要什么 | 怎么获取 |
|---|---|---|
| Telegram | Bot Token + Chat ID | ① Telegram 里找 **@BotFather** 发 `/newbot` 创建机器人，得到 Token；② 找 **@userinfobot** 发任意消息，得到自己的 Chat ID；③ **先给你的 bot 发一条消息**（否则 bot 无法主动私聊你） |
| PushPlus | Token | 访问 [pushplus.plus](https://www.pushplus.plus)，微信扫码登录，首页复制 Token |
| 邮箱 SMTP | 服务器/端口/账号/授权码 | 以 163 为例：网页版邮箱 → 设置 → POP3/SMTP/IMAP → 开启 SMTP 服务 → 获取**授权码**（不是登录密码）。常用服务器：`smtp.163.com:465`、`smtp.qq.com:465`、`smtp.gmail.com:587` |
| Webhook | 一个 URL | 任意能接收 POST JSON 的地址（钉钉/飞书机器人、自建服务等） |

### 2. 两种配置方式（二选一或混用）

- **方式 A（推荐）**：部署完成后打开 Web 页面 → **⚙ 渠道设置** → 填写并点"测试"验证 → 自动保存（JSON 模式存到 `data/settings.json`，数据库模式存到数据库）
- **方式 B**：部署前在 `.env` / 环境变量里填好（见 `.env.example`）

> 优先级：页面里填的渠道设置 > 环境变量。页面里填过之后环境变量就只是兜底。

---

## 一、Docker 部署（推荐）

功能最完整：内置调度器每隔一段时间自动检查，数据通过卷挂载持久化，重启不丢。

### 前置要求
- 安装 [Docker](https://docs.docker.com/get-docker/)（Windows/macOS 装 Docker Desktop，Linux 装 docker-ce + docker-compose-plugin）

### 方式 1：Docker Compose（最简单）

```bash
# 1. 克隆/上传项目到目标机器
git clone <your-repo-url>
cd baohao

# 2.（可选）如果想用环境变量方式配置渠道，创建 .env
cp .env.example .env
nano .env          # 填入 Telegram/PushPlus/SMTP 配置，不填也行，之后在页面里配

# 3. 构建并启动
docker compose up -d --build

# 4. 查看日志确认启动成功
docker compose logs -f
# 看到 "Server running on port 3000" 即成功

# 5. 打开浏览器访问
# http://<服务器IP>:3000
```

**日常运维命令：**

```bash
docker compose ps               # 查看状态
docker compose restart          # 重启
docker compose down             # 停止并删除容器（data/ 目录仍保留）
docker compose up -d --build    # 更新代码后重新构建部署
```

**数据在哪**：`docker-compose.yml` 已配置 `./data:/app/data` 卷挂载，提醒任务（`reminders.json`）和渠道配置（`settings.json`）都存在宿主机 `data/` 目录，容器删了也不丢。**备份只需备份 `data/` 目录。**

### 方式 2：纯 Docker（不用 Compose）

```bash
docker build -t baohao-reminder .
docker run -d \
  --name baohao-reminder \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  baohao-reminder
```

### 方式 3：群晖 NAS / 飞牛 / 极空间

1. 套件中心安装 **Container Manager**（旧版叫 Docker）
2. 把项目文件夹上传到 NAS（如 `/docker/baohao`）
3. Container Manager → 项目 → 新增 → 选择该文件夹（会自动识别 `docker-compose.yml`）→ 构建启动
4. 访问 `http://<NAS-IP>:3000`

### 修改端口

改 `docker-compose.yml` 的 `ports`，如想用 8080 端口对外：

```yaml
ports:
  - "8080:3000"
```

---

## 二、VPS / 服务器直接运行

适合已有 Linux 服务器、不想用 Docker 的场景。

### 1. 安装 Node.js 20+

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 确认 >= 20
```

### 2. 部署项目

```bash
git clone <your-repo-url>
cd baohao
npm install
npm run build        # 编译 TypeScript 到 dist/
```

### 3. 用 PM2 守护进程（推荐）

```bash
sudo npm install -g pm2

# 启动
pm2 start dist/app.js --name baohao

# 开机自启
pm2 startup          # 按提示执行输出的命令
pm2 save

# 常用命令
pm2 logs baohao      # 看日志
pm2 restart baohao   # 重启
pm2 stop baohao      # 停止
```

### 4.（可选）Nginx 反向代理 + HTTPS

```nginx
server {
    listen 80;
    server_name remind.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d remind.yourdomain.com   # 一键 HTTPS
```

### 5. 防火墙

```bash
# 如果不用 Nginx，直接开放 3000
sudo ufw allow 3000/tcp
# 用了 Nginx 则只开 80/443
sudo ufw allow 'Nginx Full'
```

---

## 三、Vercel 部署（推荐搭配 Aiven 免费数据库）

**⚠️ Vercel 的两个限制及解法：**

1. **文件系统只读**：Serverless 函数的磁盘是临时的，`data/*.json` 写入不会持久化 → **解法：外接数据库**。本项目已内置 PostgreSQL 和 MySQL 存储层，配一个 `DATABASE_URL` 环境变量即可，页面上的增删改、渠道设置、`lastNotifiedAt` 全部正常持久化。
2. **没有常驻进程**：内置 node-cron 调度不工作 → **解法：外部 Cron** 定时调用 `/api/check`（下文第 5 步）。

### 第 0 步：注册 Aiven 拿免费数据库（约 5 分钟）

1. 打开 [aiven.io](https://aiven.io) → 注册（免费计划无需信用卡）
2. Create service → 选 **PostgreSQL** 或 **MySQL**（都支持，任选；不确定就选 PostgreSQL）→ 选 **Free plan** → 选个离你近的区域（如 Singapore）→ Create
3. 等状态变成 Running 后，在服务页面复制 **Service URI**，形如：
   - PG：`postgres://avnadmin:密码@pg-xxx.aivencloud.com:12345/defaultdb?sslmode=require`
   - MySQL：`mysql://avnadmin:密码@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`

这个 URI 就是下面要填的 `DATABASE_URL`。**首次启动会自动建表，无需手动跑 SQL。**

> 也可以换成其他托管数据库：Neon / Supabase（PG）、PlanetScale（MySQL）等，只要给出标准连接串即可。

### 部署步骤

```bash
# 1. 安装 Vercel CLI 并登录
npm i -g vercel
vercel login

# 2. 本地构建（vercel.json 指向 dist/app.js）
npm run build

# 3. 首次部署
vercel            # 按提示关联项目
vercel --prod     # 部署到生产
```

或者用 **GitHub 集成**（更推荐）：
1. 代码推到 GitHub
2. [vercel.com](https://vercel.com) → Add New Project → 导入该仓库
3. Build Command 填 `npm run build`，其他默认
4. Deploy

**4. 配置环境变量**（Vercel Dashboard → Project → Settings → Environment Variables）：

```
DATABASE_URL=postgres://avnadmin:密码@pg-xxx.aivencloud.com:12345/defaultdb?sslmode=require
SCHEDULER_MODE=external
API_KEY=随机一串（公网部署强烈建议设置）
```

> `STORAGE_TYPE` 可以不填，程序会根据 `DATABASE_URL` 的协议（`postgres://` 或 `mysql://`）自动识别数据库类型。
> 通知渠道参数（Telegram/SMTP 等）不用配环境变量了——部署完直接在网页「渠道设置」里填，会存进数据库。当然也可以继续用环境变量（`TELEGRAM_BOT_TOKEN`、`SMTP_HOST` 等）作为兜底默认值。

**5. 配置外部 Cron 定时调用 `/api/check`：**

- **Vercel 自带 Cron**（推荐，Hobby 计划限每天 1 次）：项目根目录加到 `vercel.json`：

```json
{
  "crons": [
    { "path": "/api/check", "schedule": "0 9 * * *" }
  ]
}
```

- 或 **cron-job.org**（免费）：注册 → Create cronjob → URL 填 `https://你的域名.vercel.app/api/check` → 频率每天 1 次
- 或 **GitHub Actions**：仓库里建 `.github/workflows/cron.yml`：

```yaml
name: remind-check
on:
  schedule:
    - cron: '0 1 * * *'   # UTC 时间，01:00 UTC = 北京 09:00
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sf -X POST https://你的域名.vercel.app/api/check
```

> 如果设置了 `API_KEY`，Cron 调用要带上认证：URL 后加 `?apiKey=你的KEY`，或 curl 加 `-H "X-API-Key: 你的KEY"`。

### 不想接数据库？（只读模式）

也可以不配 `DATABASE_URL`，把提醒任务提交进代码仓库（手工编辑 `data/reminders.json`）、渠道配置全走环境变量。但此时页面上的新建/编辑不持久化，且 `lastNotifiedAt` 写不进磁盘——触发窗口内每次 Cron 都会重复发，需把 Cron 频率降到每天 1 次来规避。**有免费数据库可用的情况下，不推荐这种模式。**

---

## 四、Cloudflare 部署

**⚠️ 现状说明**：仓库里的 `wrangler.toml` 引用的 `src/worker.ts` **尚未实现**。本项目是 Express 应用，不能直接跑在 Cloudflare Workers 上（Workers 不是 Node 运行时、没有文件系统）。当前有两种实际可行的用法：

### 用法 A：Cloudflare 只当定时器（配合 Docker/VPS 部署，推荐）

主服务部署在你的 Docker/VPS 上，用 Cloudflare Workers 的免费 Cron Triggers 定时调用它——适合你的服务器没有公网 Cron、或想要多一层保活。

```bash
npm i -g wrangler
wrangler login
```

新建一个极简 worker（独立小项目即可）：

```js
// cron-worker/src/index.js
export default {
  async scheduled(event, env, ctx) {
    await fetch('https://你的服务地址/api/check', { method: 'POST' });
  },
};
```

```toml
# cron-worker/wrangler.toml
name = "baohao-cron"
main = "src/index.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 1 * * *"]   # UTC，01:00 UTC = 北京 09:00
```

```bash
cd cron-worker
wrangler deploy
```

### 用法 B：完整移植到 Workers（要写代码改造）

需要做的事（工作量较大，按需再做）：
1. 用 [Hono](https://hono.dev) 重写 API 路由（Express 不兼容 Workers）
2. 存储层改用 **Cloudflare KV / D1**，或通过 **Hyperdrive** 连 Aiven 等外部数据库（本项目的 PG/MySQL 存储层可部分复用，但连接方式需适配 Workers）
3. 邮件渠道改用 HTTP API（如 Resend/Mailchannels，Workers 里不能用 nodemailer 的 SMTP 长连接）
4. 静态页面 `public/index.html` 用 Workers Assets 或 Pages 托管
5. 调度用 `[triggers] crons`，即 `scheduled()` 事件

> 如果你确实需要纯 Cloudflare 方案，告诉我，我可以做这个移植。

---

## 五、部署后验证清单

无论哪个平台，部署完按这个顺序检查：

```bash
# 1. 健康检查
curl https://你的地址/api/health
# 期望: {"success":true,"status":"ok",...}

# 2. 任务列表
curl https://你的地址/api/reminders

# 3. 手动跑一次检查（不到期的任务不会发通知，安全）
curl -X POST https://你的地址/api/check
```

然后打开 Web 页面：
1. **⚙ 渠道设置** → 填好配置 → 每个渠道点一次 **测试**，确认真实收到消息
2. 任意任务点 **🔔（立即发送）**，确认按任务配置的渠道都能收到
3. 检查 `data/settings.json` 和 `data/reminders.json` 是否随操作更新（Docker/VPS）

## 六、安全建议

- **公网部署务必设置 `API_KEY`** 环境变量，否则任何人都能读写你的提醒和渠道配置（渠道配置里有 SMTP 授权码等敏感信息）
- `data/settings.json` 已加入 `.gitignore`，**不要**手动提交它
- `.env` 同理，只提交 `.env.example`
- 用 Nginx/Cloudflare 套一层 HTTPS，避免授权码明文传输
