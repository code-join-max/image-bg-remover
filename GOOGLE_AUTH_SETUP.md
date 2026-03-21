# Google OAuth 登录集成指南

## 已完成的代码

### 1. 后端 API (Cloudflare Pages Functions)

- `functions/api/auth/google.js` - 处理 Google 登录回调，使用 D1 存储用户
- `functions/api/auth/session.js` - 会话管理和登出

### 2. 前端代码

- 已在 `index.html` 中添加了 Google Sign-In 按钮和用户信息展示
- Client ID 已配置

### 3. 数据库

- `schema.sql` - D1 数据库表结构

## 配置步骤

### 第一步：创建 D1 数据库

```bash
cd image-bg-remover

# 创建 D1 数据库
npx wrangler d1 create image-bg-remover-db
```

执行后会输出类似：
```
✅ Successfully created DB 'image-bg-remover-db' in region EEUR
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via
point-in-time restore.

[[d1_databases]]
binding = "DB"
database_name = "image-bg-remover-db"
database_id = "xxxxx-xxxxx-xxxxx-xxxxx"
```

### 第二步：更新 wrangler.toml

将输出的 `database_id` 复制到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "image-bg-remover-db"
database_id = "xxxxx-xxxxx-xxxxx-xxxxx"  # 替换为实际的 ID
```

### 第三步：创建数据库表

```bash
# 执行 SQL 创建表
npx wrangler d1 execute image-bg-remover-db --file=./schema.sql
```

### 第四步：创建 KV 命名空间

```bash
# 创建 KV 命名空间用于会话存储
npx wrangler kv:namespace create "SESSIONS"
```

将输出的 ID 更新到 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id-here"  # 替换为实际的 ID
```

### 第五步：配置环境变量

在 Cloudflare Dashboard 中设置：

1. 进入 Pages 项目 → Settings → Environment variables
2. 添加变量：
   - `GOOGLE_CLIENT_ID`: `254445521090-iiuop3q28sshhvpaab6idm4mcsr56nqj.apps.googleusercontent.com`

### 第六步：部署

```bash
npm run deploy
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/google` | POST | Google 登录回调，接收 credential |
| `/api/auth/session` | GET | 获取当前登录用户信息 |
| `/api/auth/session` | DELETE | 退出登录 |

## 数据库表结构

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| google_id | TEXT | Google 用户唯一标识 |
| email | TEXT | 用户邮箱 |
| name | TEXT | 用户名称 |
| picture | TEXT | 头像 URL |
| created_at | INTEGER | 创建时间戳 |
| last_login | INTEGER | 最后登录时间戳 |

## 安全注意事项

1. **Client Secret 不需要**：Google Identity Services 只需要 Client ID
2. 使用 HTTPS 在生产环境
3. 会话 Token 设置了 7 天过期时间
4. Cookie 设置了 HttpOnly、Secure 和 SameSite 属性

## 测试

1. 本地开发：
```bash
npm run dev
```

2. 访问 `http://localhost:8788`，点击 Google 登录按钮测试

## 故障排除

- **登录按钮不显示**：检查 Client ID 是否正确配置
- **登录失败 401**：检查 `GOOGLE_CLIENT_ID` 环境变量是否设置
- **会话无法保持**：检查 KV 命名空间是否正确绑定
- **数据库错误**：检查 D1 数据库 ID 是否正确，表是否已创建
