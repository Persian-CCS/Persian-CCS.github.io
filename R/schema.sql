-- ایجاد جدول درخواست‌ها
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    nationalCode TEXT NOT NULL,
    phoneNumber TEXT,
    city TEXT,
    requestDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'درحال جمع آوری مدارک',
    completionDate TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

-- ایجاد جدول کاربران
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- درج کاربر admin
INSERT OR REPLACE INTO users (username, password_hash, created_at) 
VALUES ('admin', 'Aa123456@', datetime('now'));

-- ایجاد ایندکس برای جستجوی بهتر
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_city ON requests(city);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(createdAt);