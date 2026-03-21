-- D1 数据库表结构
-- 在 Cloudflare Dashboard 或 wrangler CLI 中执行

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    created_at INTEGER NOT NULL,
    last_login INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);