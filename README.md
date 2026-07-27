# ⏰ 保号提醒系统 (BaoHao Reminder)

一个灵活的定时提醒系统，支持 Telegram、PushPlus、邮箱等多渠道通知，可部署在 Docker、Vercel、Cloudflare Workers 等多个平台。

## ✨ 功能特点

- 🔔 **多渠道通知** - Telegram Bot、PushPlus、邮箱、Webhook
- ⏱️ **灵活周期** - 自定义提醒间隔（天数），适用于各种周期性任务
- 🚀 **多平台部署** - Docker、Vercel、Cloudflare Workers
- 🔐 **API 认证** - 可选的 API Key 保护
- 📦 **三种存储可选** - 默认 JSON 文件（零依赖开箱即用），也支持 PostgreSQL / MySQL（配 `DATABASE_URL` 即可，适合 Vercel + Aiven 免费数据库）
- 🐳 **Docker 一键部署** - 支持 Docker Compose

## 📋 使用场景

- 📱 手机号保号提醒（每 175 天）
- 💳 会员续费提醒
- 📄 证件到期提醒
- 🏥 体检提醒
- 任何需要周期性提醒的场景

> 📖 各平台（Docker / VPS / Vercel / Cloudflare）详细部署流程见 **[DEPLOY.md](./DEPLOY.md)**

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/x-isd/remind-me.git
cd baohao
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的通知渠道配置
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 5. 创建你的第一个提醒

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "保号提醒",
    "message": "📱 要开始保号了哦！你的手机号需要在 5 天内完成保号操作。",
    "intervalDays": 175,
    "channels": ["telegram", "pushplus"],
    "channelConfig": {}
  }'
```

## 📡 通知渠道配置

### Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)，创建一个新 Bot
2. 获取 Bot Token
3. 向 Bot 发送一条消息，然后访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 获取 Chat ID
4. 在 `.env` 中配置：

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
```

### PushPlus

1. 访问 [PushPlus 官网](https://www.pushplus.plus/) 注册账号
2. 获取 Token
3. 在 `.env` 中配置：

```env
PUSHPLUS_TOKEN=your_pushplus_token
```

### 邮箱 (SMTP)

1. 需要先安装 nodemailer：`npm install nodemailer @types/nodemailer`
2. 在 `.env` 中配置：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Webhook

在创建提醒时，通过 `channelConfig` 指定 Webhook URL：

```json
{
  "channelConfig": {
    "webhook": {
      "url": "https://your-webhook-endpoint.com/callback"
    }
  }
}
```

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

1. 创建 `.env` 文件并配置通知渠道
2. 启动服务：

```bash
docker-compose up -d
```

3. 查看日志：

```bash
docker-compose logs -f
```

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t baohao .

# 运行容器
docker run -d \
  --name baohao \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e TELEGRAM_CHAT_ID=your_chat_id \
  -e PUSHPLUS_TOKEN=your_token \
  -e SCHEDULER_MODE=internal \
  --restart unless-stopped \
  baohao
```

## ☁️ Vercel 部署

1. 构建项目：

```bash
npm run build
```

2. 部署到 Vercel：

```bash
npx vercel --prod
```

3. 在 Vercel Dashboard 中配置环境变量
4. 设置外部 Cron 服务（如 GitHub Actions）定时调用 `/api/check`

### GitHub Actions 自动触发

项目已包含 `.github/workflows/reminder-check.yml`，配置以下 Secrets 即可：

- `APP_URL` - 你的 Vercel 部署地址（如 `https://baohao.vercel.app`）
- `API_KEY` - 你的 API Key（可选）

## 📖 API 文档

### 健康检查

```
GET /api/health
```

### 提醒管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/reminders` | 获取所有提醒 |
| GET | `/api/reminders/:id` | 获取单个提醒（含状态信息） |
| POST | `/api/reminders` | 创建提醒 |
| PUT | `/api/reminders/:id` | 更新提醒 |
| DELETE | `/api/reminders/:id` | 删除提醒 |
| POST | `/api/reminders/:id/trigger` | 手动触发提醒 |

### 创建提醒请求体

```json
{
  "name": "保号提醒",
  "message": "📱 要开始保号了哦！",
  "intervalDays": 175,
  "channels": ["telegram", "pushplus"],
  "channelConfig": {
    "telegram": { "chatId": "可选，覆盖默认值" },
    "pushplus": { "token": "可选，覆盖默认值" },
    "email": { "to": "recipient@example.com" },
    "webhook": { "url": "https://your-webhook.com/callback" }
  }
}
```

### 检查并触发

```
POST /api/check
GET  /api/check
```

### 测试通知渠道

```
POST /api/notify/test
Body: { "channel": "telegram" }
```

### API 认证

如果设置了 `API_KEY` 环境变量，所有 API 请求（除 `/api/health`）需要携带认证：

```bash
# 通过请求头
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/reminders

# 通过查询参数
curl http://localhost:3000/api/reminders?apiKey=your_api_key
```

## ⚙️ 调度模式说明

| 模式 | 适用平台 | 说明 |
|------|---------|------|
| `internal` | Docker、VPS | 应用内部自动调度，每小时检查一次 |
| `external` | Vercel、Cloudflare | 需要外部服务定时调用 `/api/check` |

## 📂 项目结构

```
baohao/
├── src/
│   ├── api/                 # API 路由和处理函数
│   │   ├── handlers.ts
│   │   ├── middleware.ts
│   │   └── routes.ts
│   ├── config/              # 配置管理
│   │   └── config.ts
│   ├── core/                # 核心逻辑
│   │   ├── notifier.ts      # 通知管理器
│   │   ├── reminders.ts     # 提醒管理器
│   │   └── scheduler.ts     # 调度引擎
│   ├── services/            # 通知服务
│   │   ├── email.ts
│   │   ├── pushplus.ts
│   │   ├── storage.ts
│   │   ├── telegram.ts
│   │   └── webhook.ts
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   └── app.ts               # 应用入口
├── data/                    # 数据存储
│   └── reminders.json
├── .env.example             # 环境变量示例
├── .github/workflows/       # GitHub Actions
├── docker-compose.yml       # Docker Compose
├── Dockerfile
├── vercel.json              # Vercel 配置
├── wrangler.toml            # Cloudflare Workers 配置
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 License

MIT
