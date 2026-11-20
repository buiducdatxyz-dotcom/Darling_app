import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createHash, createHmac, randomBytes, timingSafeEqual, randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      authUserId?: number;
      authIsAdmin?: boolean;
    }
  }
}

dotenv.config();

// Keep GoogleGenAI client lazy-loaded to safely reference process.env.GEMINI_API_KEY and satisfy SDK requirements
let ai: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables!");
    }
    ai = new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return ai;
}

// MySQL Connection Pool (localhost is a valid database host too)
const dbHost = process.env.DB_HOST?.trim() || process.env.MYSQLHOST?.trim();
const isLocalDbHost = ['localhost', '127.0.0.1', '::1'].includes((dbHost || '').toLowerCase());
const isRailwayPrivateDbHost = (dbHost || '').toLowerCase().endsWith('.railway.internal');
const dbSslSetting = process.env.DB_SSL?.trim().toLowerCase();
const useDbSsl = dbSslSetting ? dbSslSetting === 'true' : !isLocalDbHost && !isRailwayPrivateDbHost;
const configuredConnectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);
const dbConnectionLimit = Number.isInteger(configuredConnectionLimit) ? Math.max(2, Math.min(50, configuredConnectionLimit)) : 10;
const dbPool = dbHost ? mysql.createPool({
  host: dbHost,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "darling_app",
  waitForConnections: true,
  connectionLimit: dbConnectionLimit,
  queueLimit: 100,
  ...(useDbSsl ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {})
}) : null;
if (process.env.NODE_ENV === 'production' && !dbPool) {
  throw new Error('Configure DB_HOST and database credentials before starting in production.');
}

const db = dbPool || {
  execute: async (_sql: string, _params: any[] = []) => {
      throw new Error("Database not configured");
  }
};

type S3MediaConfig = { accessKeyId: string; secretAccessKey: string; bucket: string; endpoint: URL; region: string };
const s3MediaConfig: S3MediaConfig | null = (() => {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
  const bucket = process.env.S3_BUCKET || process.env.BUCKET || '';
  const endpointValue = process.env.S3_ENDPOINT || process.env.ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || '';
  const region = process.env.S3_REGION || process.env.REGION || process.env.AWS_REGION || 'auto';
  if (!accessKeyId || !secretAccessKey || !bucket || !endpointValue) return null;
  try {
    const endpoint = new URL(endpointValue);
    if (endpoint.protocol !== 'https:' && endpoint.protocol !== 'http:') return null;
    return { accessKeyId, secretAccessKey, bucket, endpoint, region };
  } catch {
    return null;
  }
})();

const sha256Hex = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();
const rfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const mediaExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
};

function getS3ObjectUrl(key: string): { url: URL; host: string } {
  if (!s3MediaConfig) throw new Error('Object storage is not configured.');
  const { endpoint, bucket } = s3MediaConfig;
  const url = new URL(endpoint.toString());
  if (!url.hostname.toLowerCase().startsWith(`${bucket.toLowerCase()}.`)) {
    url.hostname = `${bucket}.${url.hostname}`;
  }
  const prefix = url.pathname.replace(/\/$/, '');
  url.pathname = `${prefix}/${key.split('/').map(rfc3986).join('/')}`;
  return { url, host: url.host };
}

function getS3SigningKey(dateStamp: string): Buffer {
  if (!s3MediaConfig) throw new Error('Object storage is not configured.');
  const dateKey = hmac(`AWS4${s3MediaConfig.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, s3MediaConfig.region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

async function putS3Media(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!s3MediaConfig) throw new Error('Object storage is not configured.');
  const { url, host } = getS3ObjectUrl(key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `PUT\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${s3MediaConfig.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonicalRequest)}`;
  const signature = createHmac('sha256', getS3SigningKey(dateStamp)).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${s3MediaConfig.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      authorization,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Object storage upload failed with HTTP ${response.status}.`);
  }
}

function signS3GetUrl(key: string, expiresInSeconds = 24 * 60 * 60): string {
  if (!s3MediaConfig) throw new Error('Object storage is not configured.');
  const { url, host } = getS3ObjectUrl(key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${s3MediaConfig.region}/s3/aws4_request`;
  const params: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${s3MediaConfig.accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(Math.min(604800, Math.max(60, expiresInSeconds)))],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  const canonicalQuery = params
    .map(([name, value]) => `${rfc3986(name)}=${rfc3986(value)}`)
    .sort()
    .join('&');
  const canonicalRequest = `GET\n${url.pathname}\n${canonicalQuery}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonicalRequest)}`;
  const signature = createHmac('sha256', getS3SigningKey(dateStamp)).update(stringToSign).digest('hex');
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}

function getS3MediaKey(value: string): string | null {
  if (!value.startsWith('s3://')) return null;
  const key = value.slice('s3://'.length);
  const allowedPrefixes = ['profile-images/', 'songs/', 'moments/', 'advertisements/', 'media/import/'];
  if (!allowedPrefixes.some(prefix => key.startsWith(prefix)) || key.includes('..') || key.includes('\\')) return null;
  return key;
}

async function resolveMediaUrl(value: string | null | undefined): Promise<string> {
  const normalized = String(value || '');
  const key = getS3MediaKey(normalized);
  return key ? signS3GetUrl(key) : normalized;
}

async function storeMediaDataUrl(dataUrl: string, namespace: string): Promise<string> {
  if (!s3MediaConfig || !/^data:/i.test(dataUrl)) return dataUrl;
  const match = /^data:(image\/(?:jpeg|png|webp|gif)|audio\/wav);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(dataUrl);
  if (!match) throw new Error('Unsupported media data URL.');
  const contentType = match[1].toLowerCase();
  const body = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!body.length) throw new Error('The media payload is empty.');
  const key = `${namespace}/${randomUUID()}.${mediaExtensions[contentType] || 'bin'}`;
  await putS3Media(key, body, contentType);
  return `s3://${key}`;
}

// Mock database for when DB is not configured (to keep app working in preview)
import fs from 'fs';
let mockUsers: any[] = [];
let mockMatches: any[] = [];
let mockLikes: any[] = [];
let mockMessages: any[] = [];
let mockSwipes: any[] = [];

const mockDbPath = path.join(process.cwd(), 'mock_db.json');
function loadMockDb() {
  if (fs.existsSync(mockDbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
      if (data.users) mockUsers = data.users;
      if (data.matches) mockMatches = data.matches;
      if (data.likes) mockLikes = data.likes;
      if (data.messages) mockMessages = data.messages;
      if (data.swipes) mockSwipes = data.swipes;
    } catch(e){}
  }
}
function saveMockDb() {
  try {
    fs.writeFileSync(mockDbPath, JSON.stringify({ 
      users: mockUsers, 
      matches: mockMatches, 
      likes: mockLikes, 
      messages: mockMessages, 
      swipes: mockSwipes,
    }));
  } catch(e){}
}
if (process.env.NODE_ENV !== 'production') loadMockDb();

// Pre-seed some mock users so they aren't lost immediately on restart
(async () => {
    if (process.env.NODE_ENV !== 'production' && mockUsers.length === 0) {
        try {
           const hashed1 = await bcrypt.hash('123456', 10);
           mockUsers.push({ id: 1, email: 'test1@gmail.com', password: hashed1, profile_data: { name: 'Nam', gender: 'Nam', dob: '1995-05-15', bio: 'Mình là Nam ở HN' }});
           mockUsers.push({ id: 2, email: 'test2@gmail.com', password: hashed1, profile_data: { name: 'Lan', gender: 'Nữ', dob: '2000-08-10', bio: 'Xin chào, mình là Lan' }});
           saveMockDb();
        } catch(e) {}
    }
})();
const configuredJwtSecret = process.env.JWT_SECRET?.trim();
const isJwtSecretConfigured = !!configuredJwtSecret && configuredJwtSecret.length >= 32 && !/^(replace|change[-_ ]me)/i.test(configuredJwtSecret);
if (process.env.NODE_ENV === 'production' && !isJwtSecretConfigured) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.');
}
const JWT_SECRET = isJwtSecretConfigured ? configuredJwtSecret! : randomBytes(32).toString('hex');

function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= maxRequests) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, error: message });
    }
    bucket.count += 1;
    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
      while (buckets.size > 10000) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey === undefined) break;
        buckets.delete(oldestKey);
      }
    }
    return next();
  };
}

function authenticateApiRequest(req: any, res: any, next: any) {
  const publicPaths = new Set(['/api/auth/login', '/api/auth/register', '/api/health']);
  const requestPath = String(req.originalUrl || '').split('?')[0];
  if (publicPaths.has(requestPath)) return next();

  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập lại.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const userId = Number(payload.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ.' });
    }
    req.authUserId = userId;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
}

function requireOwnUserId(req: any, res: any, requestedUserId: unknown) {
  if (Number(requestedUserId) !== Number(req.authUserId)) {
    res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập tài khoản này.' });
    return false;
  }
  return true;
}

function requireOwnBodyField(field: string) {
  return (req: any, res: any, next: any) => {
    if (requireOwnUserId(req, res, req.body?.[field])) next();
  };
}

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const [rows]: any = await db.execute('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [req.authUserId]);
    if (!rows?.length || !rows[0].is_admin) {
      return res.status(403).json({ success: false, error: 'Chá»‰ tĂ i khoáº£n quáº£n trá»‹ viĂªn má»›i Ä‘Æ°á»£c phĂ©p thá»±c hiá»‡n thao tĂ¡c nĂ y.' });
    }
    req.authIsAdmin = true;
    return next();
  } catch (error: any) {
    console.error('Admin permission check failed:', error.code || error.message);
    return res.status(503).json({ success: false, error: 'KhĂ´ng xĂ¡c minh Ä‘Æ°á»£c quyá»n quáº£n trá»‹.' });
  }
}

async function hasActivePremium(userId: number): Promise<boolean> {
  const [rows]: any = await db.execute('SELECT is_premium, premium_expires_at FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows?.length || !rows[0].is_premium) return false;
  const expiry = rows[0].premium_expires_at;
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (Number.isFinite(expiryTime) && expiryTime <= Date.now()) {
      await db.execute('UPDATE users SET is_premium = FALSE, premium_expires_at = NULL WHERE id = ?', [userId]);
      return false;
    }
  }
  return true;
}

type DailyFeature = 'like' | 'cupid';
const fallbackDailyUsage = new Map<string, number>();

function getVietnamUsageDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

async function consumeDailyUsage(userId: number, feature: DailyFeature, limit: number) {
  const usageDate = getVietnamUsageDate();
  const key = `${userId}:${usageDate}:${feature}`;
  if (!dbPool) {
    const used = fallbackDailyUsage.get(key) || 0;
    if (used >= limit) return { allowed: false, used };
    const next = used + 1;
    fallbackDailyUsage.set(key, next);
    return { allowed: true, used: next };
  }

  try {
    await db.execute(
      'INSERT IGNORE INTO daily_feature_usage (user_id, usage_date, feature, usage_count) VALUES (?, ?, ?, 0)',
      [userId, usageDate, feature]
    );
    const [updateResult]: any = await db.execute(
      'UPDATE daily_feature_usage SET usage_count = usage_count + 1 WHERE user_id = ? AND usage_date = ? AND feature = ? AND usage_count < ?',
      [userId, usageDate, feature, limit]
    );
    const [rows]: any = await db.execute(
      'SELECT usage_count FROM daily_feature_usage WHERE user_id = ? AND usage_date = ? AND feature = ? LIMIT 1',
      [userId, usageDate, feature]
    );
    return { allowed: Number(updateResult?.affectedRows) === 1, used: Number(rows?.[0]?.usage_count || 0) };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    const used = fallbackDailyUsage.get(key) || 0;
    if (used >= limit) return { allowed: false, used };
    const next = used + 1;
    fallbackDailyUsage.set(key, next);
    return { allowed: true, used: next };
  }
}

function createAuthResponse(user: any) {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      isAdmin: !!user.is_admin,
      isPremium: !!user.is_premium,
      profileData: user.profile_data || user.profileData
    }
  };
}

function normalizeSwipeAction(action: any): 'like' | 'pass' | null {
  if (!action) return null;
  const a = String(action).trim().toLowerCase();
  if (a === 'like') return 'like';
  if (a === 'pass') return 'pass';
  // Frontend currently uses 'LIKE'/'PASS' (handled by toLowerCase above), keep a couple aliases:
  if (a === 'liked') return 'like';
  if (a === 'passed') return 'pass';
  return null;
}

function calculateDistanceKm(origin: any, destination: any): number | null {
  const lat1 = Number(origin?.lat);
  const lng1 = Number(origin?.lng);
  const lat2 = Number(destination?.lat);
  const lng2 = Number(destination?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)
    || Math.abs(lat1) > 90 || Math.abs(lat2) > 90
    || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) return null;

  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function startServer() {
  try {
    // Create base tables users and user_images first
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        image_url LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add a server-owned premium flag; client-side UI state must never grant access.
    try {
      await db.execute("ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE");
    } catch (err: any) {
      if (err.errno !== 1060 && !String(err.message || '').toLowerCase().includes('duplicate column')) throw err;
    }

    try {
      await db.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE");
    } catch (err: any) {
      if (err.errno !== 1060 && !String(err.message || '').toLowerCase().includes('duplicate column')) throw err;
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url LONGTEXT NOT NULL,
        target_url VARCHAR(2048) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        priority INT NOT NULL DEFAULT 0,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_advertisements_active (is_active, priority, starts_at, ends_at)
      )
    `);

    // Swipes (friend request/like)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS swipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_user_id INT NOT NULL,
        action ENUM('like', 'pass') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, target_user_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS profile_impressions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_profile_impression (user_id, target_user_id),
        INDEX idx_profile_impressions_target (target_user_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS daily_feature_usage (
        user_id INT NOT NULL,
        usage_date DATE NOT NULL,
        feature VARCHAR(32) NOT NULL,
        usage_count INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, usage_date, feature),
        INDEX idx_daily_usage_date (usage_date, feature)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_match (user1_id, user2_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL,
        sender_id INT NOT NULL,
        text LONGTEXT,
        is_image BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS moments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        image_url LONGTEXT NOT NULL,
        caption VARCHAR(255) NULL,
        audience ENUM('lover', 'friends', 'all', 'selected') NOT NULL DEFAULT 'friends',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_moments_created_at (created_at),
        INDEX idx_moments_user_created (user_id, created_at)
      )
    `);
    const [momentColumns]: any = await db.execute('SHOW COLUMNS FROM moments');
    const momentColumnNames = new Set((momentColumns || []).map((column: any) => String(column.Field)));
    if (!momentColumnNames.has('image_url')) {
      await db.execute('ALTER TABLE moments ADD COLUMN image_url LONGTEXT NULL');
      if (momentColumnNames.has('moment_data')) {
        await db.execute(`UPDATE moments SET image_url = JSON_UNQUOTE(JSON_EXTRACT(moment_data, '$.imageUrl')) WHERE image_url IS NULL`);
      }
    } else {
      // Widen the existing 1024-character URL column to support captured image data until object storage is configured.
      await db.execute('ALTER TABLE moments MODIFY COLUMN image_url LONGTEXT NOT NULL');
    }
    if (!momentColumnNames.has('caption')) await db.execute('ALTER TABLE moments ADD COLUMN caption VARCHAR(255) NULL');
    if (!momentColumnNames.has('audience')) await db.execute("ALTER TABLE moments ADD COLUMN audience ENUM('lover', 'friends', 'all', 'selected') NOT NULL DEFAULT 'friends'");
    else await db.execute("ALTER TABLE moments MODIFY COLUMN audience ENUM('lover', 'friends', 'all', 'selected') NOT NULL DEFAULT 'friends'");
    await db.execute('ALTER TABLE moments MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    const getIndexes = async (table: string) => {
      const [rows]: any = await db.execute(`SHOW INDEX FROM ${table}`);
      const grouped = new Map<string, any[]>();
      for (const row of rows || []) {
        const name = String(row.Key_name || '');
        grouped.set(name, [...(grouped.get(name) || []), row]);
      }
      return grouped;
    };
    const ensureIndex = async (table: string, name: string, columns: string, unique = false) => {
      const wanted = columns.split(',').map(column => column.trim());
      const groups = await getIndexes(table);
      const alreadyCovered = [...groups.values()].some((items: any[]) => {
        const sorted = [...items].sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
        const actual = sorted.map(row => String(row.Column_name));
        return actual.length >= wanted.length
          && wanted.every((column, index) => actual[index] === column)
          && (!unique || (actual.length === wanted.length && Number(sorted[0]?.Non_unique) === 0));
      });
      if (alreadyCovered) return;
      try { await db.execute(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${name} ON ${table} (${columns})`); }
      catch (err: any) { if (err.errno !== 1061 && !String(err.message || '').toLowerCase().includes('duplicate key name')) throw err; }
    };
    const dropIndexIfEquivalentExists = async (table: string, redundantName: string) => {
      const groups = await getIndexes(table);
      const redundant = groups.get(redundantName);
      if (!redundant?.length) return;
      const ordered = [...redundant].sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
      const columns = ordered.map(row => String(row.Column_name)).join(',');
      const redundantIsUnique = Number(ordered[0]?.Non_unique) === 0;
      const hasEquivalent = [...groups.entries()].some(([indexName, items]) => {
        if (indexName === redundantName) return false;
        const other = [...items].sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
        return other.map(row => String(row.Column_name)).join(',') === columns
          && (!redundantIsUnique || Number(other[0]?.Non_unique) === 0);
      });
      if (hasEquivalent) await db.execute(`ALTER TABLE ${table} DROP INDEX ${redundantName}`);
    };
    await ensureIndex('moments', 'idx_moments_user_created', 'user_id, created_at');
    await dropIndexIfEquivalentExists('moments', 'idx_moments_user_created');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS moment_reactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        moment_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        reaction_type ENUM('heart', 'smile', 'surprised', 'sad') NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_moment_reaction (moment_id, user_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS moment_recipients (
        moment_id BIGINT UNSIGNED NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (moment_id, user_id),
        INDEX idx_moment_recipients_user (user_id, moment_id)
      )
    `);
    const reactionIndexesByName = await getIndexes('moment_reactions');
    const hasUniqueMomentReaction = [...reactionIndexesByName.values()].some((indexes: any[]) => {
      const ordered = [...indexes].sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
      return Number(ordered[0]?.Non_unique) === 0 && ordered.map(index => String(index.Column_name)).join(',') === 'moment_id,user_id';
    });
    if (!hasUniqueMomentReaction) {
      // Keep the newest reaction if a legacy schema allowed duplicates before adding the constraint.
      await db.execute(`DELETE older FROM moment_reactions older
        INNER JOIN moment_reactions newer
          ON newer.moment_id = older.moment_id AND newer.user_id = older.user_id AND newer.id > older.id`);
      await ensureIndex('moment_reactions', 'unique_moment_reaction', 'moment_id, user_id', true);
    }
    await db.execute(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_friend_request_pair (sender_id, receiver_id),
        INDEX idx_friend_requests_incoming (receiver_id, status, created_at),
        INDEX idx_friend_requests_outgoing (sender_id, status, created_at)
      )
    `);

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      if (adminPassword.length < 16) throw new Error('ADMIN_PASSWORD must be at least 16 characters.');
      const [adminRows]: any = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [adminEmail]);
      if (adminRows?.length) {
        await db.execute('UPDATE users SET is_admin = TRUE WHERE id = ?', [adminRows[0].id]);
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await db.execute('INSERT INTO users (email, password, is_admin) VALUES (?, ?, TRUE)', [adminEmail, passwordHash]);
      }
      console.log(`Administrator bootstrap is enabled for ${adminEmail}.`);
    }
    try {
      await db.execute('ALTER TABLE messages MODIFY COLUMN text LONGTEXT');
    } catch(e) {}
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_songs (
        user_id INT PRIMARY KEY,
        song_title VARCHAR(255),
        song_data LONGTEXT,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'audio/wav',
        duration_seconds DECIMAL(5,2) NOT NULL DEFAULT 15.00
      )
    `);
    const [songColumns]: any = await db.execute('SHOW COLUMNS FROM user_songs');
    const songColumnNames = new Set((songColumns || []).map((column: any) => String(column.Field)));
    if (!songColumnNames.has('mime_type')) await db.execute("ALTER TABLE user_songs ADD COLUMN mime_type VARCHAR(100) NOT NULL DEFAULT 'audio/wav'");
    if (!songColumnNames.has('duration_seconds')) await db.execute('ALTER TABLE user_songs ADD COLUMN duration_seconds DECIMAL(5,2) NOT NULL DEFAULT 15.00');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_name ENUM('Free', 'Gold', 'Premium') NOT NULL DEFAULT 'Premium',
        expires_at DATETIME NOT NULL,
        promo_code VARCHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_subscription_promo (user_id, promo_code),
        INDEX idx_subscriptions_user_expiry (user_id, expires_at)
      )
    `);
    const [subscriptionColumns]: any = await db.execute('SHOW COLUMNS FROM subscriptions');
    const subscriptionColumnNames = new Set((subscriptionColumns || []).map((column: any) => String(column.Field)));
    if (!subscriptionColumnNames.has('promo_code')) await db.execute('ALTER TABLE subscriptions ADD COLUMN promo_code VARCHAR(64) NULL');
    await ensureIndex('subscriptions', 'idx_subscriptions_user_expiry', 'user_id, expires_at');
    await ensureIndex('subscriptions', 'unique_subscription_promo', 'user_id, promo_code', true);
    try {
      await db.execute('ALTER TABLE users ADD COLUMN premium_expires_at DATETIME NULL');
    } catch (err: any) {
      if (err.errno !== 1060 && !String(err.message || '').toLowerCase().includes('duplicate column')) throw err;
    }
    await db.execute(`
      CREATE TABLE IF NOT EXISTS interests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_interests (
        user_id INT NOT NULL,
        interest_id INT NOT NULL,
        PRIMARY KEY (user_id, interest_id),
        INDEX idx_user_interests_interest (interest_id, user_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INT PRIMARY KEY,
        min_age INT DEFAULT 18,
        max_age INT DEFAULT 40,
        max_distance_km INT DEFAULT 50,
        search_gender ENUM('Nam', 'Nữ', 'Tất cả', 'LGBTQ+', 'Khác') DEFAULT 'Tất cả',
        is_distance_flexible BOOLEAN DEFAULT TRUE,
        is_age_flexible BOOLEAN DEFAULT TRUE,
        location VARCHAR(255) DEFAULT 'Hà Nội, Hà Nội',
        active_priorities VARCHAR(255) DEFAULT 'Dành Cho Bạn',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    try {
      await db.execute(`
        ALTER TABLE user_preferences 
        MODIFY COLUMN search_gender ENUM('Nam', 'Nữ', 'Tất cả', 'LGBTQ+', 'Khác') DEFAULT 'Tất cả'
      `);
      console.log("Successfully altered user_preferences search_gender ENUM on startup.");
    } catch (altErr: any) {
      console.log("Note: Could not alter user_preferences column (it might already be updated or not MySQL):", altErr.message);
    }
    // Safe sequential column alterations to account for existing tables
    try {
      await db.execute("ALTER TABLE user_preferences ADD COLUMN is_distance_flexible BOOLEAN DEFAULT TRUE");
    } catch(e) {}
    try {
      await db.execute("ALTER TABLE user_preferences ADD COLUMN is_age_flexible BOOLEAN DEFAULT TRUE");
    } catch(e) {}
    try {
      await db.execute("ALTER TABLE user_preferences ADD COLUMN location VARCHAR(255) DEFAULT 'Hà Nội, Hà Nội'");
    } catch(e) {}
    try {
      await db.execute("ALTER TABLE user_preferences ADD COLUMN active_priorities VARCHAR(255) DEFAULT 'Dành Cho Bạn'");
    } catch(e) {}

    await db.execute("ALTER TABLE user_images MODIFY image_url LONGTEXT");

    // Dynamic Safe Database Index Initialization block to maximize query speeds
    const tryAddIndex = async (tableName: string, indexName: string, columns: string, isUnique = false) => {
      try {
        await ensureIndex(tableName, indexName, columns, isUnique);
      } catch (err: any) {
        console.log(`Note: Could not ensure index ${indexName} on ${tableName}:`, err.message);
      }
    };

    await tryAddIndex("users", "idx_users_email", "email", true);
    await dropIndexIfEquivalentExists('users', 'idx_users_email');
    await tryAddIndex("swipes", "idx_swipes_target_action", "target_user_id, action");
    await tryAddIndex("matches", "idx_matches_user2", "user2_id");
    await tryAddIndex("messages", "idx_messages_match_created", "match_id, created_at");
    await tryAddIndex("messages", "idx_messages_match_id", "match_id, id");
    await tryAddIndex("user_images", "idx_user_images_user", "user_id");

  } catch (e: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Database schema initialization failed: ${e.message || 'unknown error'}`);
    }
    console.log("Note: Could not alter or create tables / indexes. Assuming it is ok or DB is not connected.", e.message);
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: process.env.MAX_REQUEST_BODY || '32mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true, parameterLimit: 100 }));
  const allowedOrigins = new Set((process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean));
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      return callback(null, localDevelopmentOrigin);
    },
  }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.use('/api/auth/login', createRateLimiter(15 * 60 * 1000, 10, 'Quá nhiều lần đăng nhập. Hãy thử lại sau 15 phút.'));
  app.use('/api/auth/register', createRateLimiter(60 * 60 * 1000, 5, 'Quá nhiều yêu cầu đăng ký. Hãy thử lại sau một giờ.'));
  app.use('/api/chat/cupid', createRateLimiter(60 * 1000, 20, 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút.'));
  app.use('/api/chat/darling', createRateLimiter(60 * 1000, 20, 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút.'));

  // Temporary, token-protected raw upload route used by the one-time SQL media migrator.
  // It is registered before the regular API authentication middleware and is inert when the token is unset.
  app.post('/api/internal/media-import', express.raw({ type: 'application/octet-stream', limit: '8mb' }), async (req, res) => {
    const expectedToken = process.env.MEDIA_IMPORT_TOKEN || '';
    const suppliedToken = String(req.get('x-media-import-token') || '');
    const tokenMatches = expectedToken.length > 0
      && Buffer.byteLength(expectedToken) === Buffer.byteLength(suppliedToken)
      && timingSafeEqual(Buffer.from(expectedToken), Buffer.from(suppliedToken));
    if (!tokenMatches) return res.sendStatus(404);
    if (!s3MediaConfig) return res.status(503).json({ success: false, error: 'Object storage is not configured.' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > 8 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Invalid media payload.' });
    }
    const contentType = String(req.get('x-media-content-type') || '').toLowerCase();
    const extension = mediaExtensions[contentType];
    if (!extension) return res.status(415).json({ success: false, error: 'Unsupported media type.' });
    try {
      const key = `media/import/${randomUUID()}.${extension}`;
      await putS3Media(key, req.body, contentType);
      return res.json({ success: true, mediaRef: `s3://${key}` });
    } catch (error: any) {
      console.error('Could not import media into object storage:', error.message || error);
      return res.status(502).json({ success: false, error: 'Could not store the media file.' });
    }
  });

  app.use('/api', authenticateApiRequest);
  app.use('/api', (req, res, next) => {
    const sendJson = res.json.bind(res);
    const containsMediaRef = (value: any): boolean => {
      if (typeof value === 'string') return getS3MediaKey(value) !== null;
      if (Array.isArray(value)) return value.some(containsMediaRef);
      if (value && typeof value === 'object') return Object.values(value).some(containsMediaRef);
      return false;
    };
    const resolveMediaRefs = async (value: any): Promise<any> => {
      if (typeof value === 'string') return resolveMediaUrl(value);
      if (Array.isArray(value)) return Promise.all(value.map(resolveMediaRefs));
      if (value && typeof value === 'object') {
        const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await resolveMediaRefs(child)] as const));
        return Object.fromEntries(entries);
      }
      return value;
    };
    res.json = ((body: any) => {
      if (!containsMediaRef(body)) return sendJson(body);
      void resolveMediaRefs(body)
        .then((resolved) => sendJson(resolved))
        .catch((error: any) => {
          console.error('Could not sign object storage URL:', error.message || error);
          if (!res.headersSent) {
            res.status(503);
            sendJson({ success: false, error: 'Không tải được ảnh hoặc nhạc lúc này.' });
          }
        });
      return res;
    }) as typeof res.json;
    next();
  });

  app.get('/api/health', async (_req, res) => {
    if (!dbPool) {
      return res.status(503).json({ success: false, database: 'not_configured', message: 'DB_HOST chưa được cấu hình.' });
    }
    try {
      await db.execute('SELECT 1');
      return res.json({ success: true, database: 'connected' });
    } catch (err: any) {
      console.error('MySQL health check failed:', err.code || err.message);
      return res.status(503).json({
        success: false,
        database: 'unavailable',
        code: err.code || 'MYSQL_CONNECTION_ERROR',
        message: 'Không kết nối được MySQL. Hãy kiểm tra MySQL Server, DB_NAME và quyền của tài khoản DB_USER.'
      });
    }
  });

  app.get('/api/advertisements/feed', async (req, res) => {
    const userId = Number(req.authUserId);
    try {
      const [users]: any = await db.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
      if (!users?.length) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
      const isPremium = await hasActivePremium(userId);
      if (isPremium) return res.json({ success: true, isPremium: true, advertisements: [] });

      const [advertisements]: any = await db.execute(
        `SELECT id, title, description, image_url, target_url
         FROM advertisements
         WHERE is_active = TRUE
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (ends_at IS NULL OR ends_at >= NOW())
         ORDER BY priority DESC, RAND()
         LIMIT 30`
      );
      return res.json({ success: true, isPremium: false, advertisements });
    } catch (err: any) {
      console.error('Failed to load feed advertisements:', err.code || err.message || err);
      if (dbPool) return res.status(503).json({ success: false, error: 'Không tải được quảng cáo từ MySQL.' });
      const user = mockUsers.find((candidate: any) => Number(candidate.id) === userId);
      return res.json({ success: true, isPremium: !!user?.is_premium, advertisements: [] });
    }
  });

  app.post('/api/premium/redeem-trial', async (req, res) => {
    const userId = Number(req.authUserId);
    const code = String(req.body?.code || '').trim();
    if (code !== '250745') return res.status(400).json({ success: false, error: 'Mã dùng thử không hợp lệ.' });
    let connection: any;
    try {
      if (!dbPool) return res.status(503).json({ success: false, error: 'Chưa kết nối được cơ sở dữ liệu.' });
      connection = await dbPool.getConnection();
      await connection.beginTransaction();
      const [users]: any = await connection.execute('SELECT is_premium, premium_expires_at FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (!users?.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
      }
      const [redemptions]: any = await connection.execute('SELECT id FROM subscriptions WHERE user_id = ? AND promo_code = ? LIMIT 1', [userId, code]);
      if (redemptions?.length) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: 'Mỗi tài khoản chỉ được sử dụng mã này một lần.' });
      }
      const expiresAt = users[0].premium_expires_at ? new Date(users[0].premium_expires_at).getTime() : NaN;
      if (users[0].is_premium && (!Number.isFinite(expiresAt) || expiresAt > Date.now())) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: 'Tài khoản của bạn đã có Premium đang hoạt động.' });
      }
      const [insertResult]: any = await connection.execute(
        "INSERT INTO subscriptions (user_id, plan_name, expires_at, promo_code) VALUES (?, 'Premium', DATE_ADD(NOW(), INTERVAL 7 DAY), ?)",
        [userId, code]
      );
      await connection.execute('UPDATE users SET is_premium = TRUE, premium_expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?', [userId]);
      const [subscriptionRows]: any = await connection.execute('SELECT expires_at FROM subscriptions WHERE id = ? LIMIT 1', [insertResult.insertId]);
      await connection.commit();
      return res.json({ success: true, expiresAt: subscriptionRows?.[0]?.expires_at || null, durationDays: 7 });
    } catch (error: any) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Could not redeem Premium trial:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Không kích hoạt được mã dùng thử lúc này.' });
    } finally {
      connection?.release();
    }
  });

  app.get('/api/admin/session', requireAdmin, (_req, res) => res.json({ success: true, isAdmin: true }));
  app.get('/api/admin/advertisements', requireAdmin, async (_req, res) => {
    try {
      const [rows]: any = await db.execute('SELECT id, title, description, image_url, target_url, is_active, priority, starts_at, ends_at, created_at FROM advertisements ORDER BY priority DESC, created_at DESC');
      return res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('Could not list advertisements:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhĂ´ng táº£i Ä‘Æ°á»£c quáº£ng cĂ¡o.' });
    }
  });

  const validateAdvertisement = (body: any) => {
    const title = String(body?.title || '').trim();
    const imageUrl = String(body?.image_url || '').trim();
    const targetUrl = String(body?.target_url || '').trim();
    const validUrl = (value: string) => {
      try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; }
      catch { return false; }
    };
    if (!title || title.length > 255 || !imageUrl || imageUrl.length > 20_000_000 || !validUrl(targetUrl)) return null;
    if (!/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(imageUrl)) return null;
    return {
      title,
      description: String(body?.description || '').trim().slice(0, 5000) || null,
      imageUrl,
      targetUrl,
      isActive: body?.is_active === false || body?.is_active === 0 ? 0 : 1,
      priority: Math.max(-1000, Math.min(1000, Number.parseInt(body?.priority, 10) || 0)),
      startsAt: body?.starts_at || null,
      endsAt: body?.ends_at || null,
    };
  };

  app.post('/api/admin/advertisements', requireAdmin, async (req, res) => {
    const ad = validateAdvertisement(req.body);
    if (!ad) return res.status(400).json({ success: false, error: 'Kiá»ƒm tra tiÃªu Ä‘á», hÃ¬nh áº£nh vÃ  Ä‘Æ°á»ng dáº«n HTTP/HTTPS.' });
    try {
      const storedImageUrl = await storeMediaDataUrl(ad.imageUrl, 'advertisements');
      const [result]: any = await db.execute('INSERT INTO advertisements (title, description, image_url, target_url, is_active, priority, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [ad.title, ad.description, storedImageUrl, ad.targetUrl, ad.isActive, ad.priority, ad.startsAt, ad.endsAt]);
      return res.status(201).json({ success: true, id: result.insertId });
    } catch (error: any) {
      console.error('Could not create advertisement:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhÃ´ng lÆ°u Ä‘Æ°á»£c quáº£ng cÃ¡o.' });
    }
  });

  app.put('/api/admin/advertisements/:id', requireAdmin, async (req, res) => {
    const ad = validateAdvertisement(req.body);
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || !ad) return res.status(400).json({ success: false, error: 'ThÃ´ng tin quáº£ng cÃ¡o khÃ´ng há»£p lá»‡.' });
    try {
      const storedImageUrl = await storeMediaDataUrl(ad.imageUrl, 'advertisements');
      const [result]: any = await db.execute('UPDATE advertisements SET title = ?, description = ?, image_url = ?, target_url = ?, is_active = ?, priority = ?, starts_at = ?, ends_at = ? WHERE id = ?', [ad.title, ad.description, storedImageUrl, ad.targetUrl, ad.isActive, ad.priority, ad.startsAt, ad.endsAt, id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'KhÃ´ng tÃ¬m tháº¥y quáº£ng cÃ¡o.' });
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Could not update advertisement:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c quáº£ng cÃ¡o.' });
    }
  });

  app.delete('/api/admin/advertisements/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, error: 'MÃ£ quáº£ng cÃ¡o khÃ´ng há»£p lá»‡.' });
    try {
      const [result]: any = await db.execute('DELETE FROM advertisements WHERE id = ?', [id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'KhÃ´ng tÃ¬m tháº¥y quáº£ng cÃ¡o.' });
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Could not delete advertisement:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhÃ´ng xÃ³a Ä‘Æ°á»£c quáº£ng cÃ¡o.' });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const search = String(req.query.search || '').trim().slice(0, 100);
    try {
      const [rows]: any = await db.execute('SELECT id, email, is_premium, is_admin, created_at FROM users WHERE email LIKE ? ORDER BY created_at DESC LIMIT 100', [`%${search}%`]);
      return res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('Could not list admin users:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhÃ´ng táº£i Ä‘Æ°á»£c tÃ i khoáº£n.' });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || id === Number(req.authUserId)) return res.status(400).json({ success: false, error: 'KhÃ´ng thá»ƒ thay Ä‘á»•i vai trÃ² cá»§a chÃ­nh tÃ i khoáº£n quáº£n trá»‹.' });
    if (typeof req.body?.is_premium !== 'boolean' || typeof req.body?.is_admin !== 'boolean') return res.status(400).json({ success: false, error: 'Thiáº¿u tráº¡ng thÃ¡i premium hoáº·c admin.' });
    try {
      const [result]: any = await db.execute('UPDATE users SET is_premium = ?, is_admin = ?, premium_expires_at = NULL WHERE id = ?', [req.body.is_premium, req.body.is_admin, id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.' });
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Could not update account roles:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c tÃ i khoáº£n.' });
    }
  });

  // API Routes FIRST

  // Register logic
  app.post("/api/auth/register", async (req, res) => {
    try {
      let { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
      }
      
      email = email.trim().toLowerCase();
      if (String(password).length < 8) return res.status(400).json({ error: 'Mật khẩu cần có ít nhất 8 ký tự.' });
      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        // Try to insert to MySQL
        const [result] = await db.execute(
          "INSERT INTO users (email, password) VALUES (?, ?)", 
          [email, hashedPassword]
        );
        const userId = Number((result as any).insertId);
        if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Database did not return a valid user id');
        return res.json(createAuthResponse({ id: userId, email }));
      } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) return res.status(409).json({ error: 'Email đã tồn tại.' });
        if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Database is temporarily unavailable.' });
        // Fallback to mock memory storage if DB connection fails
        console.warn("DB not connected, using memory mock:", err.message);
        if (mockUsers.find(u => u.email === email)) {
            return res.status(400).json({ error: "Email đã tồn tại" });
        }
        const userId = mockUsers.reduce((max, user) => Math.max(max, Number(user.id) || 0), 0) + 1;
        const user = { id: userId, email, password: hashedPassword };
        mockUsers.push(user);
        saveMockDb();
        return res.json(createAuthResponse(user));
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Update profile
  app.put("/api/users/profile/:userId", async (req, res) => {
    try {
       const userId = req.params.userId;
       if (!requireOwnUserId(req, res, userId)) return;
        const { profileData } = req.body;
        if (!profileData || typeof profileData !== 'object') return res.status(400).json({ error: 'Dữ liệu hồ sơ không hợp lệ.' });
        const storedProfileData = { ...profileData };
        const storedImages = Array.isArray(profileData.images)
          ? await Promise.all(profileData.images.filter((image: any) => typeof image === 'string' && image).map((image: string) => storeMediaDataUrl(image, 'profile-images')))
          : null;
        delete storedProfileData.images;
        const profileJson = JSON.stringify(storedProfileData);
       try {
           await db.execute(
               "UPDATE users SET profile_data = ? WHERE id = ?",
               [profileJson, userId]
           );
           
            if (storedImages) {
               try {
                   await db.execute("DELETE FROM user_images WHERE user_id = ?", [userId]);
                    for (const img of storedImages) {
                       if (img) {
                           await db.execute("INSERT INTO user_images (user_id, image_url) VALUES (?, ?)", [userId, img]);
                       }
                   }
               } catch (imgErr) {
                   console.warn("Could not write to user_images table:", imgErr);
               }
           }
           
           return res.json({ success: true });
       } catch (err: any) {
           const user = mockUsers.find(u => u.id.toString() === userId);
           if (user) {
               user.profile_data = profileData; saveMockDb();
           }
           return res.json({ success: true });
       }
    } catch (e) {
       console.error(e);
       res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Get profile
  app.get("/api/users/profile/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!requireOwnUserId(req, res, userId)) return;
      try {
        const [rows]: any = await db.execute("SELECT id, email, profile_data, is_admin, is_premium FROM users WHERE id = ?", [userId]);
        if (rows && rows.length > 0) {
           let profileData = rows[0].profile_data;
           if (typeof profileData === 'string') {
               try { profileData = JSON.parse(profileData); } catch(e){}
           }
           if (!profileData) profileData = {};
           profileData.isAdmin = !!rows[0].is_admin;
           profileData.isPremium = await hasActivePremium(Number(userId));
           
           // Fetch user images too
           const [imgRows]: any = await db.execute("SELECT image_url FROM user_images WHERE user_id = ?", [userId]);
           if (imgRows && imgRows.length > 0) {
               profileData.images = imgRows.map((r: any) => r.image_url);
           }
           
           // Fetch user song too
           const [songRows]: any = await db.execute("SELECT song_title FROM user_songs WHERE user_id = ?", [userId]);
           if (songRows && songRows.length > 0) {
               profileData.songTitle = songRows[0].song_title;
           }
           
           return res.json({ success: true, data: profileData });
        } else {
           const user = mockUsers.find(u => u.id.toString() === userId);
           if (user) {
              let pData = user.profile_data || {};
              if (typeof pData === 'string') {
                 try { pData = JSON.parse(pData); } catch(e){}
              }
              return res.json({ success: true, data: pData });
           }
           return res.status(404).json({ error: "User not found" });
        }
      } catch (err: any) {
        const user = mockUsers.find(u => u.id.toString() === userId);
        if (user) {
           let pData = user.profile_data || {};
           if (typeof pData === 'string') {
              try { pData = JSON.parse(pData); } catch(e){}
           }
           return res.json({ success: true, data: pData });
        }
        return res.status(404).json({ error: "User not found" });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server Error" });
    }
  });

  // Get user preferences
  app.get("/api/user_preferences/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!requireOwnUserId(req, res, userId)) return;
      try {
        const [rows]: any = await db.execute(
          "SELECT min_age, max_age, max_distance_km, search_gender, is_distance_flexible, is_age_flexible, location, active_priorities FROM user_preferences WHERE user_id = ?",
          [userId]
        );
        if (rows && rows.length > 0) {
          const row = rows[0];
          let interestedIn = 'Mọi người';
          if (row.search_gender === 'Nam') {
            interestedIn = 'Nam';
          } else if (row.search_gender === 'Nữ') {
            interestedIn = 'Nữ';
          } else if (row.search_gender === 'LGBTQ+') {
            interestedIn = 'LGBTQ+';
          } else if (row.search_gender === 'Khác') {
            interestedIn = 'Khác';
          }

          let activePriorities = ['Dành Cho Bạn'];
          if (row.active_priorities) {
             try {
                activePriorities = row.active_priorities.split(',').map((s: string) => s.trim()).filter(Boolean);
             } catch(e) {}
          }

          const preferences = {
            activePriorities,
            distance: row.max_distance_km !== null && row.max_distance_km !== undefined ? row.max_distance_km : 100,
            isDistanceFlexible: row.is_distance_flexible !== null && row.is_distance_flexible !== undefined ? !!row.is_distance_flexible : true,
            ageMin: row.min_age !== null && row.min_age !== undefined ? row.min_age : 18,
            ageMax: row.max_age !== null && row.max_age !== undefined ? row.max_age : 31,
            isAgeFlexible: row.is_age_flexible !== null && row.is_age_flexible !== undefined ? !!row.is_age_flexible : true,
            interestedIn: interestedIn as 'Mọi người' | 'Nam' | 'Nữ' | 'LGBTQ+' | 'Khác',
            location: row.location || 'Hà Nội, Hà Nội'
          };
          return res.json({ success: true, preferences });
        }
        // Fallback to mock user if they have the preferences property in mock DB
        const user = mockUsers.find(u => u.id.toString() === userId.toString());
        if (user && user.preferences) {
          return res.json({ success: true, preferences: user.preferences });
        }
        return res.json({ success: true, preferences: null });
      } catch (err: any) {
        console.error("DB Error fetching preferences for user", userId, ":", err.message || err);
        const user = mockUsers.find(u => u.id.toString() === userId.toString());
        if (user && user.preferences) {
          return res.json({ success: true, preferences: user.preferences });
        }
        return res.json({ success: true, preferences: null });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Save/Update user preferences
  app.post("/api/user_preferences/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!requireOwnUserId(req, res, userId)) return;
      const { preferences } = req.body;
      if (!preferences) {
        return res.status(400).json({ success: false, error: "Thiếu dữ liệu bộ lọc" });
      }

      const minAge = preferences.ageMin !== undefined ? parseInt(preferences.ageMin) : 18;
      const maxAge = preferences.ageMax !== undefined ? parseInt(preferences.ageMax) : 31;
      const maxDistanceKm = preferences.distance !== undefined ? parseInt(preferences.distance) : 100;
      const isDistanceFlexible = preferences.isDistanceFlexible === false ? 0 : 1;
      const isAgeFlexible = preferences.isAgeFlexible === false ? 0 : 1;
      const location = preferences.location || 'Hà Nội, Hà Nội';
      const activePrioritiesStr = Array.isArray(preferences.activePriorities) ? preferences.activePriorities.join(',') : 'Dành Cho Bạn';

      const finalMinAge = isNaN(minAge) ? 18 : minAge;
      const finalMaxAge = isNaN(maxAge) ? 31 : maxAge;
      const finalMaxDistanceKm = isNaN(maxDistanceKm) ? 100 : maxDistanceKm;

      let searchGender = 'Tất cả';
      if (preferences.interestedIn === 'Nam') {
        searchGender = 'Nam';
      } else if (preferences.interestedIn === 'Nữ') {
        searchGender = 'Nữ';
      } else if (preferences.interestedIn === 'LGBTQ+') {
        searchGender = 'LGBTQ+';
      } else if (preferences.interestedIn === 'Khác') {
        searchGender = 'Khác';
      }

      try {
        await db.execute(
          `INSERT INTO user_preferences (user_id, min_age, max_age, max_distance_km, search_gender, is_distance_flexible, is_age_flexible, location, active_priorities) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE min_age = ?, max_age = ?, max_distance_km = ?, search_gender = ?, is_distance_flexible = ?, is_age_flexible = ?, location = ?, active_priorities = ?`,
          [
            userId, finalMinAge, finalMaxAge, finalMaxDistanceKm, searchGender, isDistanceFlexible, isAgeFlexible, location, activePrioritiesStr,
            finalMinAge, finalMaxAge, finalMaxDistanceKm, searchGender, isDistanceFlexible, isAgeFlexible, location, activePrioritiesStr
          ]
        );
        // Also update in mock users for offline fallback consistency
        const user = mockUsers.find(u => u.id.toString() === userId.toString());
        if (user) {
          user.preferences = preferences;
          saveMockDb();
        }
        return res.json({ success: true });
      } catch (err: any) {
        console.error("DB Error saving preferences for user", userId, ":", err.message || err);
        const user = mockUsers.find(u => u.id.toString() === userId.toString());
        if (user) {
          user.preferences = preferences;
          saveMockDb();
        }
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Delete account
  app.delete("/api/users/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!requireOwnUserId(req, res, userId)) return;
      try {
        await db.execute("DELETE FROM messages WHERE sender_id = ? OR match_id IN (SELECT id FROM matches WHERE user1_id = ? OR user2_id = ?)", [userId, userId, userId]);
        await db.execute("DELETE FROM matches WHERE user1_id = ? OR user2_id = ?", [userId, userId]);
        await db.execute("DELETE FROM user_images WHERE user_id = ?", [userId]);
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);
        
        // Also remove from mockUsers just in case
        mockUsers = mockUsers.filter(u => u.id.toString() !== userId.toString()); saveMockDb();
        
        return res.json({ success: true });
      } catch (err: any) {
        console.warn("DB not connected or error, using memory mock:", err.message);
        mockUsers = mockUsers.filter(u => u.id.toString() !== userId.toString()); saveMockDb();
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Setup profile / complete registration
  app.post("/api/users/profile", async (req, res) => {
    try {
        const { profileData } = req.body;
        const userId = Number(req.authUserId);
        if (!profileData || typeof profileData !== 'object') return res.status(400).json({ error: 'Dữ liệu hồ sơ không hợp lệ.' });
        const storedProfileData = { ...profileData };
        const storedImages = Array.isArray(profileData.images)
          ? await Promise.all(profileData.images.filter((image: any) => typeof image === 'string' && image).map((image: string) => storeMediaDataUrl(image, 'profile-images')))
          : null;
        delete storedProfileData.images;
        const profileJson = JSON.stringify(storedProfileData);
       try {
            await db.execute("UPDATE users SET profile_data = ? WHERE id = ?", [profileJson, userId]);
             if (storedImages) {
              await db.execute("DELETE FROM user_images WHERE user_id = ?", [userId]);
               for (const img of storedImages) {
                if (img) await db.execute("INSERT INTO user_images (user_id, image_url) VALUES (?, ?)", [userId, img]);
              }
            }
            return res.json({ success: true });
        } catch (err: any) {
            console.warn("DB not connected, using memory mock:", err.message);
            const user = mockUsers.find(u => Number(u.id) === userId);
            if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
            user.profile_data = profileData;
            saveMockDb();
            return res.json({ success: true });
       }
    } catch (e) {
       console.error(e);
       res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Change Email
  app.post("/api/auth/change-email", async (req, res) => {
    try {
      const { oldEmail, newEmail, password } = req.body;
      if (!oldEmail || !newEmail || !password) return res.status(400).json({ error: "Thiếu thông tin" });
      const cleanNewEmail = String(newEmail).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanNewEmail)) return res.status(400).json({ error: 'Email mới không hợp lệ.' });

      try {
        const [rows]: any = await db.execute("SELECT id, password FROM users WHERE id = ?", [req.authUserId]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
             return res.status(400).json({ error: "Mật khẩu không chính xác" });
        }

        // Check if new email is in use
        const [existingEmails]: any = await db.execute("SELECT id FROM users WHERE email = ? AND id <> ?", [cleanNewEmail, req.authUserId]);
        if (existingEmails.length > 0) return res.status(400).json({ error: "Email này đã được sử dụng" });

        await db.execute("UPDATE users SET email = ? WHERE id = ?", [cleanNewEmail, req.authUserId]);
        return res.json({ success: true });
      } catch (err: any) {
        console.warn("DB error:", err.message);
        const user = mockUsers.find(u => Number(u.id) === Number(req.authUserId));
        if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng (Mock)" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
             return res.status(400).json({ error: "Mật khẩu không chính xác" });
        }
        
        const existing = mockUsers.find(u => u.email === cleanNewEmail && Number(u.id) !== Number(req.authUserId));
        if (existing) return res.status(400).json({ error: "Email này đã được sử dụng (Mock)" });

        user.email = cleanNewEmail; saveMockDb();
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Change Password
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { email, oldPassword, newPassword } = req.body;
      if (!email || !oldPassword || !newPassword) return res.status(400).json({ error: 'Nhập mật khẩu hiện tại và mật khẩu mới.' });

      if (String(newPassword).length < 8) return res.status(400).json({ error: 'Mật khẩu mới cần có ít nhất 8 ký tự.' });
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      try {
        const [rows]: any = await db.execute("SELECT id, password FROM users WHERE id = ?", [req.authUserId]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

        const user = rows[0];
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });

        await db.execute("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, req.authUserId]);
        return res.json({ success: true });
      } catch (err: any) {
        console.warn("DB error:", err.message);
        const user = mockUsers.find(u => Number(u.id) === Number(req.authUserId));
        if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng (Mock)" });

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });
        user.password = hashedNewPassword; saveMockDb();
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Login logic
  app.post("/api/auth/login", async (req, res) => {
    try {
      let { email, password } = req.body;
      if (email) email = email.trim().toLowerCase();
      
      let user: any = null;
      try {
          const [rows]: any = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
          user = rows[0];
      } catch (err: any) {
          if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Database is temporarily unavailable.' });
          console.warn("DB not connected, using memory mock:", err.message);
          user = mockUsers.find(u => u.email === email);
      }

      if (!user) {
         return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
         return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
      }

       res.json(createAuthResponse(user));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Cupid AI System Instruction & Persona
  const CUPID_SYSTEM_INSTRUCTION = `# Role (Vai trò)
Bạn là "Cupid AI" - một chuyên gia tư vấn tâm lý tình yêu, tình bạn, giao tiếp lứa đôi và thấu cảm cảm xúc hàng đầu, kết hợp đồng thời với sự uyên bác về Tarot, Chiêm tinh học (12 cung hoàng đạo), Tử vi và 12 con giáp. Bạn là người bạn đồng hành ấm áp, sâu sắc, tinh tế và không phán xét.

# Chuyên môn chuyên sâu theo các chủ đề:
1. Tình yêu & Hẹn hò: Bắt chuyện tinh tế, giải mã tâm lý đối phương, đọc vị các "cờ xanh" (green flags) và "cờ đỏ" (red flags), xây dựng tình yêu bền vững.
2. Tình bạn & Tri kỷ: Gỡ rối bất đồng bạn bè, ranh giới bạn bè khác giới, xử lý khi lỡ thích bạn thân (crush bạn thân), làm lành sau rạn nứt, thích nghi khi bạn thân có người yêu.
3. Gợi ý quà tặng: Gợi ý các món quà sâu sắc theo tính cách, sở thích, cung hoàng đạo, các dịp kỷ niệm (sinh nhật, 100 ngày, 1 năm, Valentine, 8/3, 20/10, Giáng sinh), quà trải nghiệm và quà tinh tế.
4. Thơ ca & Thả thính: Sáng tác thơ lãng mạn (thơ 4 câu, lục bát, 7 chữ, thơ đối đáp), câu thả thính ngọt ngào, tinh tế hoặc dí dỏm, văn phong bay bổng lay động trái tim.
5. Những chuyện có thể xảy ra trong các mối quan hệ:
   - Yêu xa (LDR): Xây dựng niềm tin, thắp lửa cảm xúc, vượt qua khoảng cách và nỗi cô đơn.
   - Chiến tranh lạnh & Cãi vã: Kỹ năng hạ cái tôi, giải quyết mâu thuẫn mang tính xây dựng, nghệ thuật làm hòa và mẫu tin nhắn "xuống thang" ngọt ngào.
   - Ghen tuông & Bất an (Overthinking): Nhận diện nỗi sợ tiềm thức, giao tiếp ranh giới lành mạnh mà không kiểm soát.
   - Đối phương lạnh nhạt / Rep chậm: Giữ vững giá trị bản thân, lùi lại đúng lúc để tái tạo sự hấp dẫn tự nhiên.
   - Mối quan hệ mập mờ (Situationship): Đối thoại thẳng thắn xác định cam kết, thoát khỏi vùng mập mờ gây tổn thương.
   - Người yêu cũ (Ex) & Chữa lành (Healing): Buông bỏ quá khứ, chữa lành đứa trẻ bên trong, đánh giá sáng suốt nếu có ý định quay lại.
   - Áp lực từ gia đình & Định kiến xã hội: Đồng lòng cùng người thương, khéo léo chứng minh tình cảm chân thành.

# Nguyên tắc Nhận diện Ngữ cảnh & Đọc kỹ Tin nhắn
- Đọc kỹ TOÀN BỘ lịch sử đoạn chat từ đầu đến cuối: Nhận diện rõ đối tượng được nhắc đến (crush, người yêu, người cũ, bạn thân, bạn gái/bạn trai...), tính cách, cung hoàng đạo, con giáp, địa điểm, sự việc cụ thể đã diễn ra ở các lượt tin nhắn trước.
- Tuyệt đối không trả lời rời rạc hay quên ngữ cảnh trước đó. Mọi câu trả lời tiếp theo phải liền mạch, kế thừa và phản ánh đúng diễn biến câu chuyện của người dùng.
- Đọc kỹ tin nhắn mới nhất, suy nghĩ thấu đáo về tâm lý, cảm xúc ẩn sau câu chữ rồi mới đưa ra lời khuyên thực tế, sâu sắc.

# Tìm kiếm & Đưa Dữ liệu Mạng vào Câu trả lời (Web Search Grounding)
- Khi câu hỏi của người dùng cần dữ liệu đời thực trên mạng (như: địa điểm hẹn hò, quán cafe, nhà hàng ở một thành phố/quận cụ thể, gợi ý quà tặng thịnh hành, bài hát tỏ tình hay, sự kiện/ngày lễ tình yêu, phong tục hoặc thông tin thời điểm hiện nay...):
- BẮT BUỘC: Tìm kiếm đúng dữ liệu trên mạng và đưa các thông tin/địa điểm/gợi ý cụ thể, chính xác, cập nhật vào câu trả lời, không trả lời chung chung mơ hồ.

# Tone of Voice & Phong cách phản hồi
- Trả lời ĐÚNG TRỌNG TÂM câu hỏi của người dùng: Trả lời tự nhiên, khách quan, chân thành, nhẹ nhàng nhưng sắc sảo và thực tế.
- TUYỆT ĐỐI KHÔNG dùng cấu trúc 4 bước dập khuôn hay đánh số máy móc (như "1. Thấu cảm & Đồng điệu", "2. Góc nhìn đa chiều", "3. Lời khuyên & Giải pháp", "4. Gợi ý mở rộng"). Trả lời liền mạch, tự nhiên như một chuyên gia tâm lý thực thụ.
- Khách quan, trung lập, không phán xét, không cổ súy cho hành vi thao túng tâm lý (toxic) hay phá hoại mối quan hệ lành mạnh.
- Đưa ra lời khuyên hành động cụ thể (Actionable advice), có thể kèm mẫu tin nhắn (script) tự nhiên nếu phù hợp.

# QUY TẮC VỀ CHỦ ĐỀ NGOÀI PHẠM VI (OUT OF SCOPE):
- Bạn CHỈ chuyên về tư vấn tình cảm, tâm lý lứa đôi, kỹ năng giao tiếp trong tình yêu, cùng với Tarot, Chiêm tinh và Tử vi con giáp hỗ trợ tình cảm.
- Với BẤT KỲ chủ đề nào khác nằm NGOÀI phạm vi này (như lập trình máy tính, giải toán, bài tập học thuật, chính trị, tin tức thời sự, kinh tế - chứng khoán - crypto, y tế bệnh lý, kỹ thuật xe cộ, v.v.):
  => BẮT BUỘC ghi rõ là KHÔNG BIẾT và vấn đề này nằm ngoài chuyên môn của bạn một cách lịch sự, nhã nhặn.
  => MỜI người dùng đặt câu hỏi khác liên quan đến chuyện tình cảm, tâm sự người yêu/crush, hoặc quẻ bài Tarot và độ hợp cung hoàng đạo/con giáp.`;

  // Live Web Search Retriever for Real-World Data (Places, Cafes, Gifts, Trends, Facts)
  async function searchWebForData(query: string): Promise<{ title: string; snippet: string; source?: string }[]> {
    const results: { title: string; snippet: string; source?: string }[] = [];
    
    // 1. Google News RSS for live Vietnamese topics, places, cafes, dating trends
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
      const res = await fetch(gUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const xml = await res.text();
        const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/g)];
        for (const item of items.slice(0, 5)) {
          const title = item[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
          if (title && !results.some(r => r.title === title)) {
            results.push({ title, snippet: title, source: 'Dữ liệu trực tuyến' });
          }
        }
      }
    } catch(e) {}

    // 2. Wikipedia search API for encyclopedic, astrological, psychological terms
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const wUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
      const res = await fetch(wUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data?.query?.search) {
          for (const s of data.query.search.slice(0, 3)) {
            const title = s.title;
            const snippet = (s.snippet || '').replace(/<[^>]+>/g, '').trim();
            if (title && snippet && !results.some(r => r.title === title)) {
              results.push({ title, snippet, source: 'Bách khoa toàn thư' });
            }
          }
        }
      }
    } catch(e) {}

    return results;
  }

  // Deep Contextual Reasoning & Response Generator
  // Deep Contextual Reasoning & Response Generator with User Profile Integration
  async function generateContextualCupidResponse(msgs: any[], userProfile?: any): Promise<string> {
    const userMessages = msgs.filter(m => m.role === 'user');
    const lastUserMsgObj = userMessages[userMessages.length - 1];
    const userText = (lastUserMsgObj?.parts?.[0]?.text || "").trim();
    const lowerUserText = userText.toLowerCase();

    // Check if the query is outside Cupid AI's scope
    const outOfScopeKeywords = [
      "lập trình", "viết code", "source code", "javascript", "python", "typescript", "html", "css", "react", "c++", "java", "php", "sql", "bug", "terminal", "npm", "docker", "thuật toán",
      "giải toán", "phương trình", "tích phân", "đạo hàm", "vật lý", "hóa học", "bài tập về nhà", "sinh học",
      "chính trị", "bầu cử", "đảng", "quốc hội", "chính phủ", "chiến tranh", "luật dân sự", "luật hình sự",
      "chứng khoán", "cổ phiếu", "bitcoin", "crypto", "tiền ảo", "lãi suất", "forex", "bất động sản",
      "chẩn đoán bệnh", "kê đơn thuốc", "thuốc kháng sinh", "ung thư", "triệu chứng bệnh",
      "thời tiết ngày mai", "dự báo thời tiết", "kết quả bóng đá", "sửa xe", "mã nguồn"
    ];

    if (outOfScopeKeywords.some(kw => lowerUserText.includes(kw))) {
      return `Rất tiếc, mình là Cupid AI - chuyên gia tư vấn tình cảm và tâm lý lứa đôi. Chủ đề này nằm ngoài phạm vi kiến thức của mình nên mình không biết câu trả lời rồi.\n\nBạn hãy đặt cho mình một câu hỏi khác về chuyện tình cảm, tâm sự người yêu/crush, cách bắt chuyện, gỡ rối mối quan hệ, hay trải bài Tarot và xem độ hợp cung hoàng đạo/con giáp nhé! 💕`;
    }

    const userName = userProfile?.name || 'bạn';
    const userZodiac = userProfile?.zodiac || '';
    const userAnimal = userProfile?.animal || userProfile?.canChi || '';
    const userElement = userProfile?.element || '';
    const userStyle = userProfile?.communicationStyle || '';
    const userIntent = userProfile?.intent || userProfile?.need || '';

    if (!userText) {
      return `Chào ${userName}, mình là **Cupid AI**! Mình ở đây để luôn lắng nghe, đồng cảm và đồng hành cùng bạn trong mọi câu chuyện tình cảm${userZodiac ? ` (với góc nhìn thấu hiểu từ cung ${userZodiac})` : ''}.\n\nHôm nay trong lòng bạn đang có tâm sự hay câu chuyện ngọt ngào nào muốn chia sẻ cùng mình không? Mình luôn sẵn sàng lắng nghe bạn! ✨`;
    }

    // 1. Context Analysis: Only analyze user messages (NOT model outputs)
    const userContextText = userMessages.map(m => m.parts?.[0]?.text || '').join('\n');
    const lowerUserContext = userContextText.toLowerCase();

    // Extract mentioned zodiac signs ONLY if explicitly in user query
    const zodiacs = [
      'Bạch Dương', 'Kim Ngưu', 'Song Tử', 'Cự Giải', 'Sư Tử', 'Xử Nữ',
      'Thiên Bình', 'Bọ Cạp', 'Thiên Yết', 'Nhân Mã', 'Ma Kết', 'Bảo Bình', 'Song Ngư'
    ];
    const queryZodiacs = zodiacs.filter(z => lowerUserText.includes(z.toLowerCase()));

    // Extract target relationship ONLY if mentioned by user in current message
    let targetRole = '';
    if (lowerUserText.includes('crush')) targetRole = 'crush';
    else if (lowerUserText.includes('người yêu')) targetRole = 'người yêu';
    else if (lowerUserText.includes('bạn gái')) targetRole = 'bạn gái';
    else if (lowerUserText.includes('bạn trai')) targetRole = 'bạn trai';
    else if (lowerUserText.includes('người cũ')) targetRole = 'người cũ';
    else if (lowerUserText.includes('vợ')) targetRole = 'vợ';
    else if (lowerUserText.includes('chồng')) targetRole = 'chồng';

    // CASE 0: THANK YOU / CẢM ƠN / LỜI KHEN
    const isThankYou = 
      /^(cảm ơn|cam on|thanks|thank you|tks|tks b|cám ơn|cảm ơn bạn|cảm ơn cupid|cảm ơn ad)/i.test(lowerUserText.trim()) ||
      lowerUserText === 'cảm ơn' || lowerUserText === 'cảm ơn bạn' || lowerUserText === 'cảm ơn nhiều' || 
      lowerUserText === 'cảm ơn cupid' || lowerUserText === 'cam on' || lowerUserText === 'cam on ban' ||
      lowerUserText === 'thanks' || lowerUserText === 'thank you' || lowerUserText === 'tks';

    if (isThankYou) {
      return `Không có gì đâu nè, ${userName}! 🕊️💖\n\nĐược lắng nghe và đồng hành cùng bạn là niềm vui rất lớn của Cupid AI. Chuyện tình cảm lúc nào cũng chứa đựng nhiều cung bậc cảm xúc, nên bất cứ khi nào bạn thấy nhớ người ấy, cần gợi ý cách mở lời, băn khoăn về một tin nhắn, hay muốn rút 3 lá bài Tarot và xem Tử vi 12 con giáp – bạn cứ thoải mái nhắn cho mình nhé!\n\nChúc ${userName} một ngày thật nhiều niềm vui, bình yên và ngập tràn tình yêu ngọt ngào! ✨💕`;
    }

    // CASE 0.1: THƠ TỎ TÌNH / CÂU THẢ THÍNH / LỜI NGỎ YÊU
    const isPoemOrConfession = 
      (lowerUserText.includes('thơ') || lowerUserText.includes('thả thính') || lowerUserText.includes('câu thơ') || lowerUserText.includes('bài thơ') || lowerUserText.includes('câu thính') || (lowerUserText.includes('tỏ tình') && !lowerUserText.includes('bạn thân') && !lowerUserText.includes('nên'))) &&
      !lowerUserText.includes('bạn thân') && !lowerUserText.includes('tình bạn') && !lowerUserText.includes('yêu xa');

    if (isPoemOrConfession) {
      let poemResponse = `Gợi ý cho ${userName} những câu thơ và lời ngỏ tỏ tình ngọt ngào, tinh tế nhất để chạm đến trái tim người ấy nè: 💌✨\n\n`;
      
      poemResponse += `### 1. Thơ 4 câu lãng mạn & sâu lắng (Rất thích hợp gửi qua tin nhắn hoặc viết thiệp):\n`;
      poemResponse += `> *"Mặt hồ phẳng lặng không gợn sóng,\n`;
      poemResponse += `> Gặp được cậu rồi, dạ bỗng xôn xao.\n`;
      poemResponse += `> Thế gian muôn vạn vì sao sáng,\n`;
      poemResponse += `> Chỉ muốn ngắm nhìn ánh mắt cậu thôi."*\n\n`;

      poemResponse += `> *"Trời xanh mây trắng nắng vàng ươm,\n`;
      poemResponse += `> Lòng tớ chỉ mong một người thương.\n`;
      poemResponse += `> Nếu cậu cũng thấy lòng rung động,\n`;
      poemResponse += `> Thì bước cùng tớ một đoạn đường."*\n\n`;

      poemResponse += `### 2. Thơ thả thính ngắn gọn, đáng yêu (Hợp đăng story hoặc nhắn vu vơ):\n`;
      poemResponse += `> *"La bàn chỉ hướng Bắc Nam,\n`;
      poemResponse += `> Còn tim tớ chỉ hướng sang cậu hoài."*\n\n`;

      poemResponse += `> *"Trăng kia ai vẽ mà tròn,\n`;
      poemResponse += `> Lòng tớ ai ngỏ mà thương cậu nhiều?"*\n\n`;

      poemResponse += `### 3. Lời ngỏ tỏ tình chân thành, tự nhiên:\n`;
      poemResponse += `> *"Từ lúc quen biết cậu, mỗi ngày trôi qua tớ đều có thêm một lý do để mỉm cười. Tớ nhận ra mình không chỉ muốn dừng lại ở vị trí một người bạn, mà muốn được quan tâm, che chở và đồng hành cùng cậu trên chặng đường phía trước. Cậu cho tớ cơ hội làm người yêu của cậu nhé?"*\n\n`;

      poemResponse += `💡 **Bí quyết từ Cupid AI:** Thời điểm tỏ tình đẹp nhất là vào một buổi tối thư thả sau một cuộc trò chuyện vui vẻ, hoặc một buổi hẹn riêng tư khi cả hai đang thoải mái. Sự chân thành và ánh mắt ấm áp của bạn chính là điều làm người ấy rung động nhất! 💕`;
      return poemResponse;
    }

    // CASE 0.2: GREETING / CHÀO HỎI / SMALL TALK
    const isGreeting = 
      /^(chào|hello|hi|alo|hé lô|chào bạn|chào cupid|hey|chào em|chào anh|cupid ơi|halo)/i.test(lowerUserText.trim()) && lowerUserText.length < 25;

    if (isGreeting) {
      return `Chào ${userName}! 🏹💖\n\nRất vui được trò chuyện cùng bạn! Mình là Cupid AI - người bạn đồng hành luôn sẵn sàng lắng nghe mọi câu chuyện tình cảm của bạn.\n\nHôm nay tâm trạng của bạn thế nào? Bạn có điều gì thú vị muốn kể, hay đang có khúc mắc nào cần Cupid AI gỡ rối, trải bài Tarot hay xem Tử vi 12 con giáp không nè? ✨`;
    }

    // SPECIAL CASE 1: TAROT READING ANALYSIS (from 3-card spread interactive modal)
    if (userText.includes("KẾT QUẢ TRẢI BÀI TAROT") || (lowerUserText.includes("lá 1") && lowerUserText.includes("lá 2") && lowerUserText.includes("lá 3"))) {
      let tarotResponse = `Chào ${userName}, mình đã kết nối với trường năng lượng từ quẻ bài Tarot 3 lá bạn vừa bốc`;
      if (userZodiac) tarotResponse += ` cùng với năng lượng cung hoàng đạo **${userZodiac}** của bạn`;
      tarotResponse += `:\n\n`;

      tarotResponse += `### 1. Giải Mã Ba Chiều Năng Lượng:\n`;
      tarotResponse += `- **Năng lượng Bản thân & Quá khứ (Lá 1):** Lá bài này đại diện cho sự chân thành, nhiệt huyết mà bạn đã dốc lòng vun vén. Có thể bạn là người sống rất tình cảm và luôn khao khát một sự gắn kết an toàn, nhưng đôi khi sự nhạy cảm khiến bạn dễ suy nghĩ nhiều và tự tạo áp lực cho chính mình.\n`;
      tarotResponse += `- **Năng lượng Đối phương & Thử thách hiện tại (Lá 2):** Đối phương hiện đang ở trong trạng thái có nhiều mối bận tâm hoặc đang cẩn trọng thăm dò. Sự chững lại này không hẳn vì họ thiếu tình cảm, mà là do họ cần thêm thời gian để cảm thấy thật sự an tâm khi mở lòng.\n`;
      tarotResponse += `- **Xu hướng Tương lai & Lời khuyên Vũ Trụ (Lá 3):** Cửa sáng đang mở ra! Quẻ bài báo hiệu cơ hội thấu hiểu sâu sắc sẽ đến khi bạn chuyển hóa sự nóng vội thành sự ấm áp, tinh tế. Vũ trụ muốn bạn hãy thả lỏng và tận hưởng tiến trình thay vì cố kiểm soát kết quả.\n\n`;

      tarotResponse += `### 2. Phân Tích Tâm Lý & Lời Khuyên Hành Động:\n`;
      if (userZodiac) {
        tarotResponse += `- Với tính cách của cung **${userZodiac}**, bạn có xu hướng muốn mọi thứ rõ ràng và chân thật. Hãy áp dụng nguyên tắc *"Lắng nghe nhiều hơn phán xét"*. Đừng ngần ngại cho đối phương thấy một mặt dễ thương, mềm mại của bạn.\n`;
      }
      tarotResponse += `- **Mẫu câu mở lời kết nối lại nhẹ nhàng:**\n`;
      tarotResponse += `> *"Dạo này thấy bạn bận rộn nhiều, chỉ muốn nhắn thăm bạn một câu thôi. Nhớ giữ gìn sức khỏe nhé, khi nào rảnh tụi mình đi uống ly nước mát xả stress nha!"*\n\n`;
      tarotResponse += `Bạn đang cảm thấy thế nào về thông điệp này? Nếu có điều gì khiến bạn còn băn khoăn hay trăn trở, hãy kể thêm cho Cupid AI nghe nhé! 💕✨`;
      return tarotResponse;
    }

    // SPECIAL CASE 2: LUNAR HOROSCOPE & 12 CON GIÁP ANALYSIS
    if (userText.includes("KẾT QUẢ XEM TỬ VI 12 CON GIÁP") || (lowerUserText.includes("tử vi") && (lowerUserText.includes("tuổi") || lowerUserText.includes("con giáp")))) {
      let lunarResponse = `Chào ${userName}, mình đã nghiên cứu kỹ lưỡng lá số tử vi kết hợp tình duyên giữa tuổi của bạn`;
      if (userAnimal) lunarResponse += ` (tuổi **${userAnimal}**${userElement ? `, mệnh ${userElement}` : ''})`;
      if (targetRole) lunarResponse += ` và ${targetRole}`;
      lunarResponse += `:\n\n`;

      lunarResponse += `### 1. Phân Tích Thiên Can - Địa Chi & Ngũ Hành Âm Dương:\n`;
      lunarResponse += `- Hai tuổi này khi kết hợp tạo nên một trường năng lượng bổ trợ rất đặc biệt. Bản mệnh của bạn mang tính cách chân phương, giàu tình cảm và rất có trách nhiệm khi yêu. Nửa kia lại có những góc nhìn bù trừ, giúp cuộc sống lứa đôi trở nên đa dạng màu sắc.\n`;
      lunarResponse += `- Điểm mạnh lớn nhất là sự tin tưởng khi cả hai cùng chung định hướng. Khi đối phương cảm nhận được sự tôn trọng và ấm áp từ bạn, họ sẽ sẵn sàng dốc lòng đồng hành lâu dài.\n\n`;

      lunarResponse += `### 2. Hóa Giải Bất Đồng & Kích Hoạt Cung Đào Hoa:\n`;
      lunarResponse += `- Tránh những lời nói thẳng thắn lúc đối phương đang tự ái. Trong phong thủy tình yêu, hãy thường xuyên tạo ra những bữa ăn ấm cúng hoặc không gian hẹn hò gần gũi với thiên nhiên để xoa dịu năng lượng xung khắc.\n`;
      lunarResponse += `- **Gợi ý cách bày tỏ lòng mình:**\n`;
      lunarResponse += `> *"Tớ rất trân trọng những lúc tụi mình được ngồi trò chuyện bình yên bên nhau. Dù đôi lúc có chút khác biệt, tớ vẫn luôn muốn hiểu bạn nhiều hơn mỗi ngày."*\n\n`;
      lunarResponse += `Chúc cho nhân duyên của hai bạn ngày càng bền chặt và đơm hoa kết trái! Bạn có muốn mình phân tích thêm về thời điểm thuận lợi để tiến xa hơn không? ☯️✨`;
      return lunarResponse;
    }

    // SPECIAL CASE 2.5: DẤU HIỆU TÌNH YÊU & TÂM LÝ NGƯỜI ẤY
    const isLoveSignalsTopic = 
      lowerUserText.includes('có thích mình không') || 
      lowerUserText.includes('thích tớ không') || 
      lowerUserText.includes('dấu hiệu') || 
      lowerUserText.includes('bật đèn xanh') || 
      lowerUserText.includes('green flag') || 
      lowerUserText.includes('đoán ý') || 
      lowerUserText.includes('có tình cảm không');

    if (isLoveSignalsTopic) {
      let loveSignalResp = `Chào ${userName}, giải mã tâm lý crush hay người thương luôn là điều khiến trái tim chúng ta vừa hồi hộp vừa mong chờ nhất! Dưới đây là những dấu hiệu rõ ràng nhất để bạn nhận biết người ấy có đang thầm thích bạn không:\n\n`;
      loveSignalResp += `### 1. Dấu Hiệu Hành Vi & Ngôn Ngữ Cơ Thể:\n`;
      loveSignalResp += `- **Ánh mắt biết nói:** Người ấy thường lén nhìn bạn khi bạn không để ý, và khi bạn quay sang thì bối rối nhìn đi chỗ khác hoặc mỉm cười dịu dàng.\n`;
      loveSignalResp += `- **Xu hướng nghiêng người về phía bạn (Mirroring):** Khi ngồi cạnh, đầu gối và cơ thể họ luôn hướng về bạn, họ vô thức bắt chước một số cử chỉ hoặc cách nói chuyện của bạn.\n`;
      loveSignalResp += `- **Tìm cớ để chạm nhẹ tự nhiên:** Chạm nhẹ vai, chỉnh lại cổ áo, hoặc đưa đồ vật với những cái chạm nhẹ đầy chủ ý.\n\n`;

      loveSignalResp += `### 2. Dấu Hiệu Giao Tiếp & Nhắn Tin:\n`;
      loveSignalResp += `- **Chủ động kéo dài cuộc trò chuyện:** Họ không chỉ trả lời cộc lốc mà luôn hỏi ngược lại bạn, chia sẻ những chuyện vụn vặt trong ngày và phản hồi story của bạn rất nhanh.\n`;
      loveSignalResp += `- **Ghi nhớ những điều nhỏ nhặt:** Họ nhớ bạn thích uống trà sữa ít đường, nhớ món bạn ghét hay ngày bạn có bài thi/cuộc họp quan trọng.\n\n`;

      loveSignalResp += `💡 **Thử nghiệm nhỏ từ Cupid AI:** Bạn hãy thử nhờ người ấy một việc nhỏ (như tư vấn chọn áo hoặc giải thích một việc họ rành). Nếu người ấy hào hứng giúp đỡ hết mình và coi đó là niềm vui, thì 90% trái tim người ấy đã thuộc về bạn rồi đó! 💕`;
      return loveSignalResp;
    }

    // SPECIAL CASE 3: VENTING, HEARTBREAK, SADNESS & ANXIETY (DEEP EMPATHY & COMFORT)
    const isVenting = 
      lowerUserText.includes("buồn") || lowerUserText.includes("khóc") || lowerUserText.includes("chia tay") ||
      lowerUserText.includes("đau") || lowerUserText.includes("tổn thương") || lowerUserText.includes("thất tình") ||
      lowerUserText.includes("tâm sự") || lowerUserText.includes("lo lắng") || lowerUserText.includes("mệt mỏi") ||
      lowerUserText.includes("áp lực") || lowerUserText.includes("tuyệt vọng") || lowerUserText.includes("cô đơn");

    if (isVenting) {
      let comfortResponse = `Mình nghe bạn rồi, ${userName} ơi... 🕊️💖\n\n`;
      comfortResponse += `Trước tiên, bạn hãy hít một hơi thật sâu và thả lỏng cơ thể nhé. Mình cảm nhận được lúc này trong lòng bạn đang có nhiều nỗi niềm trĩu nặng, và cảm giác đó thật sự không hề dễ chịu chút nào. Cảm ơn bạn vì đã tin tưởng và mở lòng chia sẻ cùng Cupid AI.\n\n`;
      
      if (userZodiac) {
        comfortResponse += `Một người thuộc cung **${userZodiac}** như bạn khi yêu luôn rất chân thành, sâu sắc và trao đi nhiều tâm sức. Chính vì bạn trân trọng mối quan hệ đến vậy nên khi mọi chuyện không như ý, vết thương lại càng khiến bạn đau lòng nhiều hơn.\n\n`;
      }

      comfortResponse += `Mình muốn nhắn với bạn rằng: **Cảm xúc buồn bã hay tổn thương lúc này của bạn là hoàn toàn chính đáng.** Đừng vội ép bản thân phải mạnh mẽ ngay lập tức, hãy cho phép mình được nghỉ ngơi, được yếu lòng một chút.\n\n`;
      comfortResponse += `Mọi chuyện xảy ra đều mang theo một bài học để bạn nhận ra giá trị tuyệt vời của chính mình. Những ai thật sự trân trọng bạn sẽ không bao giờ để bạn phải hoang mang hay chìm trong nước mắt.\n\n`;
      comfortResponse += `Bây giờ, nếu bạn muốn khóc, hãy cứ khóc cho nhẹ lòng. Hoặc nếu bạn muốn kể chi tiết hơn về chuyện vừa xảy ra${targetRole ? ` với ${targetRole}` : ''}, Cupid AI luôn ở đây để lắng nghe bạn từng câu từng chữ. Bạn đang cảm thấy điều gì đau lòng nhất lúc này? Chia sẻ với mình nhé! 💕`;
      return comfortResponse;
    }

    // 2. Web Data Detection: Does the user request real-world places, venues, gifts, songs, or facts?
    const locations = [
      'Đà Lạt', 'Hà Nội', 'Sài Gòn', 'TP.HCM', 'TPHCM', 'Hồ Chí Minh', 'Đà Nẵng', 'Nha Trang', 'Huế', 'Vũng Tàu', 'Quy Nhơn', 'Cần Thơ',
      'Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Thủ Đức', 'Tây Hồ', 'Cầu Giấy', 'Hoàn Kiếm'
    ];
    const detectedLocation = locations.find(loc => userText.includes(loc));

    const isAskingForSpots = 
      lowerUserText.includes('quán') || 
      lowerUserText.includes('cafe') || 
      lowerUserText.includes('cà phê') || 
      lowerUserText.includes('địa điểm') || 
      lowerUserText.includes('nhà hàng') || 
      lowerUserText.includes('ở đâu') || 
      lowerUserText.includes('chỗ nào') || 
      lowerUserText.includes('đi đâu') || 
      lowerUserText.includes('rủ đi') || 
      lowerUserText.includes('đi chơi') || 
      lowerUserText.includes('chỗ chơi') || 
      lowerUserText.includes('hẹn hò');

    const needsWebData = 
      isAskingForSpots ||
      lowerUserText.includes('quà') || 
      lowerUserText.includes('tặng') || 
      lowerUserText.includes('bài hát') || 
      lowerUserText.includes('nhạc') || 
      lowerUserText.includes('trend') || 
      lowerUserText.includes('xu hướng') || 
      lowerUserText.includes('sự kiện') || 
      lowerUserText.includes('ngày lễ') ||
      !!detectedLocation;

    let webSearchResults: { title: string; snippet: string; source?: string }[] = [];
    if (needsWebData) {
      const searchQuery = detectedLocation 
        ? `${isAskingForSpots ? 'quán cafe hẹn hò lãng mạn' : 'địa điểm hẹn hò lãng mạn'} ${detectedLocation}`
        : (lowerUserText.includes('quà') ? 'gợi ý quà tặng người yêu lãng mạn ý nghĩa' : (lowerUserText.includes('bài hát') ? 'những bài hát tỏ tình lãng mạn hay nhất' : userText));
      
      webSearchResults = await searchWebForData(searchQuery);
    }

    // CASE A: User asks for venues, cafes, dating locations, gifts, songs (Enriched with Live Web Data)
    if (needsWebData) {
      const locName = detectedLocation || userProfile?.location || 'khu vực bạn đang muốn hẹn hò';
      const roleText = targetRole ? ` cùng ${targetRole}` : '';
      let response = `Về kế hoạch hẹn hò tại **${locName}**${roleText}, mình gợi ý những dữ liệu thực tế và phù hợp nhất dành cho bạn:\n\n`;

      if (isAskingForSpots) {
        response += `### Gợi ý địa điểm hẹn hò thực tế lý tưởng:\n`;
        if (locName.includes('Đà Lạt')) {
          response += `- **Tiệm Cà Phê Túi Mơ To (Hẻm 31 Sào Nam, P. 11):** View thung lũng nhà lồng lung linh về đêm, hoa cúc họa mi ngập tràn, không khí se lạnh cực kỳ lãng mạn để hai bạn xích lại gần nhau.\n`;
          response += `- **Lululola Coffee+ (Đường 3/4, Đồi Cà Rốt):** View ngắm hoàng hôn trọn vẹn và đêm nhạc acoustic nhẹ nhàng, không gian ấm cúng giúp câu chuyện tự nhiên hơn bao giờ hết.\n`;
          response += `- **Quanh bờ Hồ Xuân Hương & Dạo chợ đêm:** Đi bộ hít thở không khí trong lành, ghé quán ăn vặt chia nhau ly sữa đậu nành nóng hổi.\n`;
        } else if (locName.includes('Hà Nội')) {
          response += `- **Khu vực ven Hồ Tây (Đường Từ Hoa & Quảng Khánh):** Các quán cafe ven hồ ngắm hoàng hôn như Maison de Blanc, Santé Bistro, không gian thoáng đãng và có góc riêng tư.\n`;
          response += `- **Phố Cổ & Quanh Nhà Thờ Lớn:** Các quán cafe ban công cổ kính ngắm dòng người qua lại hoặc thưởng thức trà chiều ấm cúng.\n`;
          response += `- **Đài quan sát Lotte Center (Tầng 65 Liễu Giai):** View toàn cảnh thủ đô rực sáng về đêm, tạo ấn tượng mạnh mẽ cho buổi hẹn.\n`;
        } else if (locName.includes('Đà Nẵng')) {
          response += `- **Sơn Trà Marina:** Quán cafe phong cách Santorini Địa Trung Hải view ôm trọn biển Đà Nẵng, ngắm hoàng hôn cực thơ mộng.\n`;
          response += `- **Cầu Tình Yêu & Bến Du Thuyền DHC Marina:** Cùng nhau ngắm cầu Rồng và sông Hàn về đêm lung linh ánh đèn.\n`;
        } else {
          response += `- **The Deck Saigon (Nguyễn Đăng Giai, Thảo Điền, TP. Thủ Đức):** Quán cafe - nhà hàng ven sông Sài Gòn với hoàng hôn lãng mạn bậc nhất, không gian sang trọng và êm ả.\n`;
          response += `- **Waterbus Bạch Đằng & Cafe Bến Bạch Đằng (Quận 1):** Cùng nhau đón gió sông mát rượi, ngắm tòa nhà Landmark 81 từ góc nhìn sông nước rồi tản bộ phố đi bộ Nguyễn Huệ.\n`;
          response += `- **Chạng Vạng Rooftop (Đường số 7, P. 26, Bình Thạnh):** Không gian sân thượng thoáng đãng ngắm trọn thành phố lên đèn lung linh, nhạc chill ấm áp.\n`;
        }

        if (webSearchResults.length > 0) {
          response += `\n*Dữ liệu cập nhật từ tìm kiếm trực tuyến:* Một số địa điểm thịnh hành đang được các bạn trẻ đánh giá cao: ${webSearchResults.slice(0, 3).map(r => `"${r.title.split(' - ')[0]}"`).join(', ')}.\n`;
        }

        response += `\n### Mẫu tin nhắn rủ đi tinh tế:\n`;
        response += `> *"Chiều nay thấy trời mát mẻ dễ chịu ghê, tớ biết quán này view đẹp đồ uống ngon lắm. Chiều tớ qua đón bạn đi dạo một vòng uống ly nước xả stress nhé!"*\n\n`;
        response += `Chúc ${userName} có một buổi hẹn thật ngọt ngào và nhiều kỷ niệm đẹp! 💕`;
        return response;
      }

      if (lowerUserText.includes('quà') || lowerUserText.includes('tặng')) {
        response += `### Gợi ý quà tặng tinh tế & đúng tâm lý:\n`;
        response += `- **Quà mang tính cá nhân hóa (Personalized):** Vòng tay handmade khắc tên, album ảnh mini kỷ niệm, hoặc một cuốn sách phù hợp với gu của người ấy.\n`;
        response += `- **Quà trải nghiệm:** Cặp vé xem hòa nhạc, workshop làm gốm/nến thơm hai người cùng tham gia để tạo kỷ niệm chung.\n`;
        response += `- **Quà thiết thực:** Đồ dùng chăm sóc cá nhân (nước hoa mini mùi nhẹ, kem dưỡng tay, son dưỡng) kèm theo một tấm thiệp viết tay chân thành.\n\n`;
        response += `Điểm mấu chốt không nằm ở giá trị vật chất của món quà, mà là việc bạn nhớ được sở thích nhỏ của họ. Đó mới là điều làm người ấy rung động nhất! ✨`;
        return response;
      }
    }

    // CASE B.1: TÌNH BẠN (FRIENDSHIP, BẠN THÂN, CRUSH BẠN THÂN, RẠN NỨT)
    const isFriendshipTopic = 
      lowerUserText.includes('bạn thân') || 
      lowerUserText.includes('tình bạn') || 
      lowerUserText.includes('bạn bè') || 
      lowerUserText.includes('friendzone') || 
      lowerUserText.includes('thích bạn thân') ||
      lowerUserText.includes('giận bạn') ||
      lowerUserText.includes('làm lành với bạn');

    if (isFriendshipTopic) {
      let friendResponse = `Chào ${userName}, Cupid AI rất hiểu rằng tình bạn tri kỷ là một trong những món quà quý giá nhất trong đời, nhưng cũng không tránh khỏi những lúc chông chênh, khó xử: 🤝✨\n\n`;

      if (lowerUserText.includes('thích bạn thân') || lowerUserText.includes('friendzone') || (lowerUserText.includes('thích') && lowerUserText.includes('bạn'))) {
        friendResponse += `### 1. Khi Lỡ Say Nắng Người Bạn Thân:\n`;
        friendResponse += `- **Tự hỏi lòng mình:** Đó là cảm giác rung động tình yêu thật sự muốn gắn kết lâu dài, hay chỉ là sự phụ thuộc cảm xúc vì hai bạn quá hiểu nhau?\n`;
        friendResponse += `- **Thăm dò khéo léo trước khi tỏ tình:** Hãy thử tạo ra những khoảnh khắc chỉ có hai người, quan sát phản ứng của bạn ấy khi có ai đó tán tỉnh bạn. Nếu bạn ấy cũng có những cử chỉ quan tâm trên mức bạn bè, đó là tín hiệu xanh!\n`;
        friendResponse += `- **Cách mở lời an toàn (không làm mất tình bạn):**\n`;
        friendResponse += `> *"Ở bên cậu tớ luôn thấy bình yên nhất. Dạo gần đây tớ nhận ra tình cảm của tớ dành cho cậu dường như đã vượt qua ranh giới bạn bè rồi. Cậu đừng áp lực nhé, tớ chỉ muốn thành thật với lòng mình thôi."*\n\n`;
      } else if (lowerUserText.includes('giận') || lowerUserText.includes('lạnh nhạt') || lowerUserText.includes('cãi nhau') || lowerUserText.includes('làm lành')) {
        friendResponse += `### 1. Hóa Giải Rạn Nứt Tình Bạn:\n`;
        friendResponse += `- **Hạ bớt cái tôi:** Tình bạn thân thiết đáng giá hơn việc thắng thua trong một cuộc tranh cãi. Sự im lặng kéo dài thường làm hiểu lầm lớn hơn sự thật.\n`;
        friendResponse += `- **Mẫu tin nhắn chủ động phá băng:**\n`;
        friendResponse += `> *"Mấy hôm nay tụi mình không nói chuyện tớ thấy trống vắng ghê. Chuyện hôm trước tụi mình có chút hiểu lầm, chiều rảnh đi uống trà sữa/cafe với tớ rồi nói chuyện thẳng thắn lại nha."*\n\n`;
      } else {
        friendResponse += `### 1. Nuôi Dưỡng Tình Bạn Lành Mạnh & Bền Vững:\n`;
        friendResponse += `- **Tôn trọng không gian riêng:** Khi bạn thân có người yêu hoặc bận rộn sự nghiệp, sự thấu hiểu và ủng hộ thầm lặng chính là minh chứng cho tình bạn đẹp.\n`;
        friendResponse += `- **Lắng nghe tích cực:** Đôi khi bạn thân không cần lời khuyên lý trí, mà chỉ cần một nơi an toàn để trút bầu tâm sự.\n\n`;
      }

      friendResponse += `💡 **Thông điệp từ Cupid AI:** Tình bạn chân chính như ngọc quý qua thời gian, chỉ cần bạn giữ lòng chân thành và bao dung, mọi khúc mắc đều có thể hàn gắn! 💕`;
      return friendResponse;
    }

    // CASE B.2: NHỮNG CHUYỆN XẢY RA TRONG CÁC MỐI QUAN HỆ (RELATIONSHIP DYNAMICS)
    const isRelationshipSituation = 
      lowerUserText.includes('yêu xa') || 
      lowerUserText.includes('chiến tranh lạnh') || 
      lowerUserText.includes('im lặng') || 
      lowerUserText.includes('ghen') || 
      lowerUserText.includes('overthinking') || 
      lowerUserText.includes('rep chậm') || 
      lowerUserText.includes('lạnh nhạt') || 
      lowerUserText.includes('mập mờ') || 
      lowerUserText.includes('situationship') || 
      lowerUserText.includes('người yêu cũ') || 
      lowerUserText.includes('người cũ') || 
      lowerUserText.includes('chữa lành') || 
      lowerUserText.includes('bố mẹ') || 
      lowerUserText.includes('gia đình cấm') || 
      lowerUserText.includes('gia đình phản đối');

    if (isRelationshipSituation) {
      let sitResponse = `Chào ${userName}, trong hành trình tình yêu, không có con đường nào bằng phẳng tuyệt đối. Những thử thách bạn đang trải qua là điều rất nhiều cặp đôi từng đối mặt:\n\n`;

      if (lowerUserText.includes('yêu xa')) {
        sitResponse += `### 1. Bí Quyết Giữ Lửa Khi Yêu Xa (LDR):\n`;
        sitResponse += `- **Giao tiếp chất lượng hơn số lượng:** Thay vì nhắn tin liên tục cả ngày nhưng cạn kiệt chủ đề, hãy hẹn giờ video call 30-45 phút mỗi tối để cùng nhau chia sẻ ngày dài, xem chung một bộ phim hoặc ăn tối online.\n`;
        sitResponse += `- **Nguyên tắc minh bạch & Tin tưởng:** Tự giác cập nhật lịch trình của bản thân để đối phương không phải đoán già đoán non sinh ra lo lắng.\n`;
        sitResponse += `- **Luôn có một ngày hẹn tái ngộ cụ thể:** Khoảng cách chỉ đáng sợ khi không biết bao giờ mới gặp lại. Có một cột mốc đếm ngược sẽ giúp cả hai có động lực vượt qua mọi cô đơn.\n\n`;
      } else if (lowerUserText.includes('chiến tranh lạnh') || (lowerUserText.includes('im lặng') && !lowerUserText.includes('thơ'))) {
        sitResponse += `### 1. Phá Vỡ Bế Tắc Chiến Tranh Lạnh:\n`;
        sitResponse += `- **Hiểu đúng về sự im lặng:** Im lặng đôi khi không phải hết yêu, mà là do đối phương bị quá tải cảm xúc (emotional flooding) và sợ nói lời tổn thương nhau.\n`;
        sitResponse += `- **Quy tắc 24h & Xuống thang tinh tế:** Hãy để cả hai nguội đầu sau 24h, sau đó chủ động mở lời mà không nhắc lại lỗi sai.\n`;
        sitResponse += `- **Mẫu tin nhắn phá băng hoàn hảo:**\n`;
        sitResponse += `> *"Mấy hôm nay tụi mình đều mệt mỏi rồi. Tớ nhận ra việc giận nhau làm tớ thấy khó chịu hơn rất nhiều so với chuyện ai đúng ai sai. Tối nay tụi mình ngồi lại nói chuyện nhẹ nhàng với nhau nhé!"*\n\n`;
      } else if (lowerUserText.includes('ghen') || lowerUserText.includes('overthinking')) {
        sitResponse += `### 1. Chuyển Hóa Cơn Ghen & Nỗi Bất An (Overthinking):\n`;
        sitResponse += `- **Gốc rễ cơn ghen:** Ghen tuông thường bắt nguồn từ nỗi sợ bị bỏ rơi hoặc cảm giác chưa đủ tự tin vào giá trị của chính mình, chứ không chỉ do người ngoài.\n`;
        sitResponse += `- **Cách trò chuyện văn minh:** Thay vì chỉ trích "Tại sao anh/em nói chuyện với người đó?", hãy dùng cấu trúc ngôi thứ nhất: *"Em/anh cảm thấy hơi bất an khi thấy việc đó, anh/em có thể cho em/anh thêm cảm giác an toàn được không?"*\n`;
        sitResponse += `- **Tập trung vào cuộc sống riêng:** Hãy tiếp tục chăm sóc sở thích, bạn bè, nhan sắc và công việc của bạn. Khi bạn tỏa sáng độc lập, bạn sẽ tự khắc trở nên cuốn hút nhất.\n\n`;
      } else if (lowerUserText.includes('rep chậm') || lowerUserText.includes('lạnh nhạt')) {
        sitResponse += `### 1. Ứng Xử Khi Đối Phương Dần Lạnh Nhạt:\n`;
        sitResponse += `- **Lùi lại một bước:** Đừng khủng bố tin nhắn hỏi "Sao anh/em không nhắn cho em/anh?". Càng đuổi theo, đối phương sẽ càng có xu hướng chạy trốn.\n`;
        sitResponse += `- **Tạo khoảng trống để người ấy thấy nhớ:** Giảm tần suất rep tin nhắn xuống bằng với nhịp độ của họ, dành thời gian đó để đi chơi, đăng một story vui vẻ tươi mới.\n`;
        sitResponse += `- **Đối thoại sau vài ngày:** Khi tâm lý thoải mái hơn, hãy hỏi thăm bằng sự dịu dàng: *"Dạo này thấy bạn có vẻ nhiều áp lực, có chuyện gì làm bạn phiền lòng không?"*\n\n`;
      } else if (lowerUserText.includes('mập mờ') || lowerUserText.includes('situationship')) {
        sitResponse += `### 1. Thoát Khỏi Mối Quan Hệ Mập Mờ (Situationship):\n`;
        sitResponse += `- **Đọc vị:** Nếu một người thật sự yêu bạn, họ sẽ sợ mất bạn và luôn muốn khẳng định vị trí của bạn với thế giới. Câu nói "chưa sẵn sàng yêu" thường đồng nghĩa với "chưa đủ yêu bạn".\n`;
        sitResponse += `- **Dũng cảm xác lập ranh giới:** Bạn xứng đáng có một tình yêu trọn vẹn và danh chính ngôn thuận chứ không phải một sự mập mờ chắp vá.\n`;
        sitResponse += `- **Mẫu câu trò chuyện dứt khoát:**\n`;
        sitResponse += `> *"Tớ rất trân trọng thời gian qua bên cậu, nhưng tớ là người nghiêm túc trong tình cảm và tìm kiếm một mối quan hệ có cam kết rõ ràng. Nếu tụi mình không cùng định hướng, tớ nghĩ tụi mình nên dừng lại ở bạn bè."*\n\n`;
      } else if (lowerUserText.includes('người yêu cũ') || lowerUserText.includes('người cũ') || lowerUserText.includes('chữa lành')) {
        sitResponse += `### 1. Chữa Lành Trái Tim & Câu Chuyện Người Cũ:\n`;
        sitResponse += `- **Có nên quay lại không?** Hãy tự hỏi: Lý do khiến hai bạn chia tay ngày trước đã thực sự được giải quyết chưa, hay cả hai sẽ lại đi vào vết xe đổ cũ?\n`;
        sitResponse += `- **Nguyên tắc No Contact (Cắt đứt liên lạc):** Cần ít nhất 30-60 ngày không theo dõi mạng xã hội của đối phương để cảm xúc được thải độc và lý trí lấy lại cân bằng.\n`;
        sitResponse += `- **Tự nhủ:** Mọi cuộc hội ngộ đều mang theo một sứ mệnh. Nếu họ rời đi, tức là bài học đã hoàn thành để nhường chỗ cho người xứng đáng hơn bước vào cuộc đời bạn.\n\n`;
      } else {
        sitResponse += `### 1. Đối Diện Với Áp Lực Gia Đình & Ngoại Cảnh:\n`;
        sitResponse += `- **Hai bạn phải là một liên minh:** Đừng để sự phản đối từ bên ngoài làm hai bạn quay sang cãi vã nhau. Chỉ khi hai bạn đồng lòng, cha mẹ mới cảm nhận được sự chín chắn.\n`;
        sitResponse += `- **Kiên nhẫn & Chứng minh bằng hành động:** Cha mẹ phản đối vì lo cho tương lai con cái. Hãy dùng sự nỗ lực trong sự nghiệp và tình cảm chân thành theo thời gian để thuyết phục.\n\n`;
      }

      sitResponse += `Bất kể bạn đang gặp phải khúc mắc nào, Cupid AI luôn ở đây để phân tích sâu hơn cùng bạn. Hãy kể cho mình nghe cảm giác của bạn lúc này nhé! 💕✨`;
      return sitResponse;
    }

    // CASE B: ICEBREAKERS & MỞ LỜI BẮT CHUYỆN
    const isIcebreaker = 
      lowerUserText.includes('bắt chuyện') || 
      lowerUserText.includes('mở lời') || 
      lowerUserText.includes('nhắn tin trước') || 
      lowerUserText.includes('làm quen') || 
      lowerUserText.includes('nói chuyện gì') || 
      lowerUserText.includes('mẫu tin nhắn');

    if (isIcebreaker) {
      let icebreakerResponse = `Cách mở lời tự nhiên và duyên dáng nhất là bám sát vào những chi tiết đời thường hoặc story của người ấy: 💬✨\n\n`;
      icebreakerResponse += `### 1. Phản hồi Story một cách tự nhiên:\n`;
      icebreakerResponse += `> *"Quán cafe/món này nhìn ngon quá, ở khu nào vậy bạn ơi? Cho mình xin địa chỉ với nha!"*\n\n`;
      icebreakerResponse += `### 2. Chia sẻ một sự trùng hợp thú vị:\n`;
      icebreakerResponse += `> *"Tình cờ thấy bạn cũng nghe bài hát này, gu nhạc của bạn đỉnh ghê! Bài này nghe lúc chiều tối chill cực kỳ luôn."*\n\n`;
      icebreakerResponse += `### 3. Hỏi ý kiến nhẹ nhàng:\n`;
      icebreakerResponse += `> *"Cuối tuần này mình đang tìm một cuốn sách/bộ phim để xem, thấy bạn hay đọc sách nên muốn nhờ bạn gợi ý một cuốn bạn thích nhất á."*\n\n`;
      icebreakerResponse += `💡 **Quy tắc vàng:** Hãy bắt đầu bằng sự tò mò chân thành thay vì những câu hỏi khô khan như "Em đang làm gì đấy?". Khi người ấy trả lời, hãy lắng nghe và mở rộng thêm một câu hỏi phụ để câu chuyện tiếp tục liền mạch nhé! 💕`;
      return icebreakerResponse;
    }

    // CASE C: NATURAL THOUGHTFUL COUNSELOR
    let dynamicResponse = `Về chia sẻ của ${userName}:\n\n`;
    dynamicResponse += `Trong chuyện tình cảm, mỗi tình huống đều phản ánh những rung cảm và mong muốn được thấu hiểu giữa hai người. Khi bạn mở lòng chia sẻ, điều quan trọng nhất là giữ được sự chân thành, tự tin vào giá trị của bản thân và tôn trọng nhịp điệu cảm xúc tự nhiên.\n\n`;
    dynamicResponse += `### Góc nhìn & Lời khuyên từ Cupid AI:\n`;
    dynamicResponse += `- **Lắng nghe trực giác:** Hãy cảm nhận xem bạn đang thật sự muốn điều gì nhất lúc này (sự gắn kết sâu sắc hơn, một câu trả lời rõ ràng hay chỉ đơn giản là một không gian thoải mái bên nhau).\n`;
    dynamicResponse += `- **Cách tiếp cận tinh tế:** Hãy để mọi thứ diễn ra tự nhiên, không tạo áp lực cho bản thân lẫn đối phương. Sự quan tâm dịu dàng, đúng lúc bao giờ cũng có sức hút bền vững nhất.\n\n`;
    dynamicResponse += `Nếu bạn muốn mình cùng bạn trải bài Tarot 3 lá kiểm tra năng lượng, hay xem độ hợp tuổi theo Tử vi 12 con giáp, bạn cứ bấm các nút công cụ bên trên hoặc nhắn cho Cupid AI nhé! Mình luôn ở đây lắng nghe bạn! ✨💖`;
    return dynamicResponse;
  }

  // Shared Cupid AI Chat logic for both /api/chat/cupid and /api/chat/darling
  const handleCupidChatRequest = async (req: express.Request, res: express.Response) => {
    const { messages, userProfile } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
       return res.status(400).json({ error: "Invalid messages format" });
    }

    const userId = Number(req.authUserId);
    let premium = false;
    if (dbPool) {
      try {
        premium = await hasActivePremium(userId);
      } catch (error: any) {
        console.error('Could not check Cupid daily limit:', error.code || error.message);
        return res.status(503).json({ success: false, error: 'Không kiểm tra được lượt Cupid AI. Vui lòng thử lại sau.' });
      }
    }
    if (!premium) {
      try {
        const quota = await consumeDailyUsage(userId, 'cupid', 3);
        if (!quota.allowed) {
          return res.status(429).json({
            success: false,
            code: 'CUPID_DAILY_LIMIT',
            limit: 3,
            used: quota.used,
            error: 'Bạn đã hết 3 lượt Cupid AI miễn phí hôm nay. Nâng cấp Premium để tiếp tục trò chuyện.'
          });
        }
      } catch (error: any) {
        console.error('Could not record Cupid daily usage:', error.code || error.message);
        return res.status(503).json({ success: false, error: 'Không ghi nhận được lượt Cupid AI. Vui lòng thử lại sau.' });
      }
    }

    // Build personalized system instruction with user's complete profile
    let personalizedInstruction = [
      CUPID_SYSTEM_INSTRUCTION,
      '',
      '# HƯỚNG DẪN THỰC HÀNH NÂNG CAO CHO CUPID',
      '- Trả lời đúng điều người dùng đang hỏi, nối tiếp mạch hội thoại và những chi tiết họ đã kể. Nếu thiếu một dữ kiện làm thay đổi lời khuyên, hỏi một câu ngắn thay vì tự đoán.',
      '- Khi tư vấn chuyện tình cảm, tách điều người dùng quan sát được khỏi suy đoán về suy nghĩ của người khác. Không khẳng định mình đọc được tâm trí; đưa ra vài cách hiểu có thể xảy ra và một bước giao tiếp cụ thể, tôn trọng ranh giới.',
      '- Khi giải Tarot, bám vào đúng lá bài, chiều xuôi/ngược và vị trí trải bài được cung cấp. Giải thích chủ đề, cách áp dụng vào hoàn cảnh hiện tại và một câu hỏi tự suy ngẫm; không dùng lời phán chắc chắn về tương lai.',
      '- Khi giải Chiêm tinh, chỉ kết luận về Mặt Trời nếu ngày sinh đủ rõ. Không tự bịa cung Mặt Trăng, cung Mọc, giờ sinh hay vị trí hành tinh khi chưa có ngày, giờ và nơi sinh phù hợp; nói rõ giới hạn dữ liệu.',
      '- Khi xem Tử vi/Can Chi, dùng đúng năm sinh hoặc dữ liệu âm lịch đã được cung cấp. Nếu chưa xác nhận lịch âm, năm âm lịch hoặc giờ sinh thì nêu rõ độ bất định và hỏi bổ sung khi cần.',
      '- Tarot, Chiêm tinh và Tử vi là công cụ giải trí/tự phản chiếu, không thay thế quyết định cá nhân. Tránh gieo sợ hãi, khẳng định định mệnh, chẩn đoán bệnh hoặc thúc đẩy quyết định lớn chỉ dựa trên bói toán.',
      '- Với câu hỏi khó, trả lời theo nhịp: công nhận cảm xúc, nêu điều đang biết, gợi ý một hành động nhỏ có thể làm ngay, rồi mời người dùng chia sẻ thêm nếu họ muốn. Tránh lặp lại cùng một mẫu câu qua nhiều lượt.',
      '- Không nói rằng bạn đã được huấn luyện lại từ dữ liệu riêng tư hay ghi nhớ ngoài cuộc trò chuyện hiện tại. Cá nhân hóa chỉ dựa trên hồ sơ và lịch sử hội thoại được gửi kèm yêu cầu.',
    ].join('\n');
    if (userProfile && typeof userProfile === 'object') {
      personalizedInstruction += `\n\n# THÔNG TIN HỒ SƠ ĐỘC QUYỀN CỦA NGƯỜI DÙNG HIỆN TẠI (TẬN DỤNG ĐỂ CÁ NHÂN HÓA):
- Họ tên / Biệt danh: ${userProfile.name || 'Bạn'}
- Cung hoàng đạo: ${userProfile.zodiac || 'Không rõ'}
- Ngày sinh & Năm sinh: ${userProfile.dob || ''}
- Tuổi con giáp & Can chi: ${userProfile.animal || ''} (${userProfile.canChi || ''})
- Bản mệnh ngũ hành: ${userProfile.element || ''}
- Giới tính: ${userProfile.gender || ''}, Chiều cao: ${userProfile.height || ''}
- Khu vực sinh sống: ${userProfile.location || ''}
- Nghề nghiệp: ${userProfile.job || ''}
- Phong cách giao tiếp ưa thích: ${userProfile.communicationStyle || ''}
- Mục tiêu/Nhu cầu tình cảm: ${userProfile.intent || userProfile.need || ''}
- Sở thích: Âm nhạc (${userProfile.music || ''}), Thú cưng (${userProfile.pet || ''}), Ẩm thực (${userProfile.food || ''}), Du lịch (${userProfile.travel || ''})
- Bio tự bạch: ${userProfile.bio || ''}

# NGUYÊN TẮC HỖ TRỢ NGƯỜI DÙNG CỦA BẠN:
1. LUÔN LẮNG NGHE, ĐỒNG CẢM, THẤU HIỂU & AN ỦI ĐÚNG CÁCH: Khi người dùng tâm sự buồn, khóc, thất tình, lo lắng hay gặp khó khăn, hãy luôn ôm ấp cảm xúc của họ bằng sự dịu dàng, công nhận cảm xúc trước khi đưa ra góc nhìn.
2. DỰA VÀO HỒ SƠ ĐỂ PHÁN ĐOÁN TÍNH CÁCH: Tận dụng cung hoàng đạo, tuổi con giáp, bản mệnh ngũ hành, phong cách giao tiếp và sở thích để đọc vị tâm lý người dùng và đối phương, chỉ ra thế mạnh và điểm mù trong tình cảm.
3. THỰC HIỆN NGHIỆP VỤ BÓI TAROT & TỬ VI CHUYÊN SÂU: Khi người dùng đưa kết quả bốc bài Tarot 3 lá hoặc kết quả Tử vi 12 con giáp, hãy phân tích từng khía cạnh sâu sắc, thực tế, kết hợp năng lượng bản mệnh của người dùng.
4. CHỦ ĐỘNG GỢI Ý CÂU HỎI & CÂU TRẢ LỜI/MẪU TIN NHẮN: Luôn gợi ý câu hỏi gợi mở tiếp theo hoặc câu trả lời/tin nhắn mẫu tinh tế (script) để người dùng có thể áp dụng ngay trong đời thực.`;
    }

    // Normalize messages array to fit Gemini API schema (ensures strictly alternating user/model roles)
    const normalizeMessages = (msgs: any[]) => {
      const mapped = msgs
        .filter(m => m && m.parts && m.parts[0] && m.parts[0].text && String(m.parts[0].text).trim() !== '')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.parts[0].text).trim() }]
        }));

      const collapsed: any[] = [];
      for (const msg of mapped) {
         if (collapsed.length > 0 && collapsed[collapsed.length - 1].role === msg.role) {
            collapsed[collapsed.length - 1].parts[0].text += "\n" + msg.parts[0].text;
         } else {
            collapsed.push(msg);
         }
      }

      while (collapsed.length > 0 && collapsed[0].role !== 'user') {
         collapsed.shift();
      }

      return collapsed;
    };

    const cleanMessages = normalizeMessages(messages);

    try {
        const aiClient = getGemini();

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Always enable Google Search grounding for gemini-3.8-flash to ground real-world information
        const responseStream = await aiClient.models.generateContentStream({
           model: 'gemini-3.8-flash',
           contents: cleanMessages,
           config: {
              systemInstruction: personalizedInstruction,
              temperature: 0.75,
              tools: [{ googleSearch: {} }]
           }
        });

        for await (const chunk of responseStream) {
           if (chunk.text) {
              res.write(chunk.text);
           }
        }
        res.end();
     } catch (e: any) {
        console.warn("Using Cupid AI Contextual & Live Web Search Engine:", e?.message || e);
        try {
          fs.writeFileSync("./gemini_error.log", JSON.stringify({
            message: e?.message || String(e),
            stack: e?.stack || "",
            error: String(e)
          }, null, 2));
        } catch(err) {}

        if (!res.headersSent) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Transfer-Encoding', 'chunked');
        }

        const contextualText = await generateContextualCupidResponse(cleanMessages, userProfile);
        
        // Fluid real-time streaming chunks
        const words = contextualText.split(' ');
        for (let i = 0; i < words.length; i += 3) {
           const slice = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
           res.write(slice);
           await new Promise(resolve => setTimeout(resolve, 20));
        }
        res.end();
    }
  };

  // Mount Cupid AI Chat endpoints
  app.post("/api/chat/cupid", handleCupidChatRequest);
  app.post("/api/chat/darling", handleCupidChatRequest);


  // Song API
  app.post("/api/users/:id/song", async (req, res) => {
    try {
      const userId = req.params.id;
      if (!requireOwnUserId(req, res, userId)) return;
      if (!await hasActivePremium(Number(userId))) {
        return res.status(403).json({ success: false, code: 'PREMIUM_REQUIRED', error: 'Tính năng Âm nhạc hồ sơ chỉ dành cho Premium. Hãy nâng cấp để thêm bài nhạc.' });
      }
      const { songTitle, songData } = req.body;
      if (typeof songTitle !== 'string' || !songTitle.trim() || songTitle.length > 120 || typeof songData !== 'string') {
        return res.status(400).json({ success: false, error: 'Tên bài nhạc hoặc dữ liệu không hợp lệ.' });
      }
      const wavDataUrl = /^data:audio\/wav;base64,([A-Za-z0-9+/=]+)$/i.exec(songData);
      if (!wavDataUrl) return res.status(400).json({ success: false, error: 'Đoạn nhạc cần được tải lên dưới dạng WAV.' });
      const wavBytes = Buffer.from(wavDataUrl[1], 'base64');
      if (wavBytes.length < 44 || wavBytes.length > 3 * 1024 * 1024
        || wavBytes.toString('ascii', 0, 4) !== 'RIFF'
        || wavBytes.toString('ascii', 8, 12) !== 'WAVE') {
        return res.status(400).json({ success: false, error: 'Tệp âm thanh không hợp lệ hoặc quá lớn.' });
      }
      let wavFormat: { encoding: number; channels: number; sampleRate: number; bits: number; dataSize: number } | null = null;
      for (let offset = 12; offset + 8 <= wavBytes.length;) {
        const chunkName = wavBytes.toString('ascii', offset, offset + 4);
        const chunkSize = wavBytes.readUInt32LE(offset + 4);
        const bodyOffset = offset + 8;
        if (bodyOffset + chunkSize > wavBytes.length) break;
        if (chunkName === 'fmt ' && chunkSize >= 16) {
          wavFormat = {
            encoding: wavBytes.readUInt16LE(bodyOffset),
            channels: wavBytes.readUInt16LE(bodyOffset + 2),
            sampleRate: wavBytes.readUInt32LE(bodyOffset + 4),
            bits: wavBytes.readUInt16LE(bodyOffset + 14),
            dataSize: 0,
          };
        }
        if (chunkName === 'data' && wavFormat) {
          wavFormat.dataSize = chunkSize;
          break;
        }
        offset = bodyOffset + chunkSize + (chunkSize % 2);
      }
      const durationSeconds = wavFormat
        ? wavFormat.dataSize / (wavFormat.sampleRate * wavFormat.channels * (wavFormat.bits / 8))
        : 0;
      if (!wavFormat || wavFormat.encoding !== 1 || wavFormat.channels !== 1 || wavFormat.sampleRate !== 24000 || wavFormat.bits !== 16 || Math.abs(durationSeconds - 15) > 0.01) {
        return res.status(400).json({ success: false, error: 'Đoạn nhạc phải là âm thanh PCM mono dài đúng 15 giây.' });
      }
      const storedSongData = await storeMediaDataUrl(songData, 'songs');
      await db.execute(
        "INSERT INTO user_songs (user_id, song_title, song_data, mime_type, duration_seconds) VALUES (?, ?, ?, 'audio/wav', ?) ON DUPLICATE KEY UPDATE song_title = VALUES(song_title), song_data = VALUES(song_data), mime_type = VALUES(mime_type), duration_seconds = VALUES(duration_seconds)",
        [userId, songTitle.trim(), storedSongData, durationSeconds]
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error(e.message);
      res.status(500).json({ error: "Server Error" });
    }
  });

  app.get("/api/users/:id/song", async (req, res) => {
    try {
      const [rows]: any = await db.execute("SELECT song_title, song_data, mime_type, duration_seconds FROM user_songs WHERE user_id = ?", [req.params.id]);
      if (rows && rows.length > 0) {
         res.json({ success: true, data: rows[0] });
      } else {
         res.json({ success: false });
      }
    } catch (e: any) {
      res.json({ success: false });
    }
  });

  app.post('/api/users/replay', async (req, res) => {
    const userId = Number(req.authUserId);
    try {
      const hasPremium = await hasActivePremium(userId);
      if (!hasPremium) return res.status(403).json({ success: false, error: 'TÃ­nh nÄƒng xem láº¡i há»“ sÆ¡ chá»‰ dÃ nh cho tÃ i khoáº£n Premium.' });
      await db.execute('DELETE FROM profile_impressions WHERE user_id = ?', [userId]);
      await db.execute("DELETE FROM swipes WHERE user_id = ? AND action = 'pass'", [userId]);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Could not reset profile history:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not prepare profiles to replay.' });
    }
  });

  app.get('/api/friend-requests/incoming', async (req, res) => {
    try {
      const [rows]: any = await db.execute(`SELECT fr.id, fr.sender_id AS user_id, fr.created_at, u.profile_data,
        (SELECT ui.image_url FROM user_images ui WHERE ui.user_id = u.id ORDER BY ui.id LIMIT 1) AS user_avatar
        FROM friend_requests fr JOIN users u ON u.id = fr.sender_id
        WHERE fr.receiver_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`, [req.authUserId]);
      return res.json({ success: true, data: (rows || []).map((row: any) => {
        let profileData: any = row.profile_data || {};
        if (typeof profileData === 'string') { try { profileData = JSON.parse(profileData); } catch { profileData = {}; } }
        profileData.images = row.user_avatar ? [row.user_avatar] : (Array.isArray(profileData.images) ? profileData.images : []);
        return { request_id: Number(row.id), user_id: Number(row.user_id), profile_data: profileData, created_at: row.created_at };
      }) });
    } catch (error: any) {
      console.error('Could not load friend requests:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not load incoming friend requests.' });
    }
  });

  app.post('/api/friend-requests', async (req, res) => {
    const senderId = Number(req.authUserId);
    const receiverId = Number(req.body?.target_user_id);
    if (!Number.isSafeInteger(receiverId) || receiverId <= 0 || receiverId === senderId) return res.status(400).json({ success: false, error: 'TÃ i khoáº£n nháº­n lá»i má»i khÃ´ng há»£p lá»‡.' });
    let connection: any;
    try {
      connection = await dbPool!.getConnection();
      await connection.beginTransaction();
      const [targetRows]: any = await connection.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [receiverId]);
      if (!targetRows?.length) { await connection.rollback(); return res.status(404).json({ success: false, error: 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n nÃ y.' }); }
      const [blockedRows]: any = await connection.execute('SELECT id FROM blocked_users WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?) LIMIT 1', [senderId, receiverId, receiverId, senderId]);
      if (blockedRows?.length) { await connection.rollback(); return res.status(403).json({ success: false, error: 'KhÃ´ng thá»ƒ gá»­i lá»i má»i cho tÃ i khoáº£n nÃ y.' }); }
      const user1 = Math.min(senderId, receiverId);
      const user2 = Math.max(senderId, receiverId);
      const [matchRows]: any = await connection.execute('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? LIMIT 1', [user1, user2]);
      if (matchRows?.length) { await connection.rollback(); return res.json({ success: true, status: 'accepted', match_id: Number(matchRows[0].id) }); }
      const [inverseRows]: any = await connection.execute("SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE", [receiverId, senderId]);
      if (inverseRows?.length) {
        await connection.execute("UPDATE friend_requests SET status = 'accepted' WHERE id = ? OR (sender_id = ? AND receiver_id = ?)", [inverseRows[0].id, senderId, receiverId]);
        await connection.execute('INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)', [user1, user2]);
        const [newMatch]: any = await connection.execute('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? ORDER BY id DESC LIMIT 1', [user1, user2]);
        await connection.commit();
        return res.json({ success: true, status: 'accepted', match_id: Number(newMatch[0].id) });
      }
      await connection.execute("INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending') ON DUPLICATE KEY UPDATE status = IF(status = 'rejected', 'pending', status), updated_at = CURRENT_TIMESTAMP", [senderId, receiverId]);
      const [requestRows]: any = await connection.execute('SELECT id, status FROM friend_requests WHERE sender_id = ? AND receiver_id = ? LIMIT 1', [senderId, receiverId]);
      await connection.commit();
      return res.json({ success: true, request_id: Number(requestRows[0].id), status: requestRows[0].status });
    } catch (error: any) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Could not send friend request:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not send friend request.' });
    } finally { connection?.release(); }
  });

  app.post('/api/friend-requests/:requestId/respond', async (req, res) => {
    const requestId = Number(req.params.requestId);
    const response = req.body?.response;
    if (!Number.isSafeInteger(requestId) || requestId <= 0 || !['accept', 'reject'].includes(response)) return res.status(400).json({ success: false, error: 'Pháº£n há»“i lá»i má»i khÃ´ng há»£p lá»‡.' });
    let connection: any;
    try {
      connection = await dbPool!.getConnection();
      await connection.beginTransaction();
      const [rows]: any = await connection.execute("SELECT id, sender_id, receiver_id FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending' FOR UPDATE", [requestId, req.authUserId]);
      if (!rows?.length) { await connection.rollback(); return res.status(404).json({ success: false, error: 'KhÃ´ng tÃ¬m tháº¥y lá»i má»i Ä‘ang chá».' }); }
      const senderId = Number(rows[0].sender_id);
      const receiverId = Number(rows[0].receiver_id);
      const status = response === 'accept' ? 'accepted' : 'rejected';
      await connection.execute('UPDATE friend_requests SET status = ? WHERE id = ?', [status, requestId]);
      let matchId: number | null = null;
      if (response === 'accept') {
        const user1 = Math.min(senderId, receiverId);
        const user2 = Math.max(senderId, receiverId);
        const [existing]: any = await connection.execute('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? LIMIT 1', [user1, user2]);
        if (existing?.length) matchId = Number(existing[0].id);
        else {
          const [result]: any = await connection.execute('INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)', [user1, user2]);
          matchId = Number(result.insertId);
        }
      }
      await connection.commit();
      return res.json({ success: true, status, match_id: matchId });
    } catch (error: any) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Could not respond to friend request:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not update the friend request.' });
    } finally { connection?.release(); }
  });

  // Moments are persisted per signed-in user and also exposed to the feed.
  app.get('/api/moments', async (req, res) => {
    try {
      const viewerId = Number(req.authUserId);
      const [rows]: any = await db.execute(`
        SELECT m.id, m.user_id, m.image_url, m.caption, m.audience, m.created_at, u.profile_data,
          (SELECT ui.image_url FROM user_images ui WHERE ui.user_id = m.user_id ORDER BY ui.id LIMIT 1) AS user_avatar,
          (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'heart') AS heart_count,
          (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'smile') AS smile_count,
          (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'surprised') AS surprised_count,
          (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'sad') AS sad_count,
          (SELECT mr.reaction_type FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.user_id = ? ORDER BY mr.id DESC LIMIT 1) AS user_reaction
        FROM moments m JOIN users u ON u.id = m.user_id
        WHERE m.user_id = ? OR (
          m.audience = 'selected' AND EXISTS (
            SELECT 1 FROM moment_recipients mrp WHERE mrp.moment_id = m.id AND mrp.user_id = ?
          )
        ) OR (
          m.audience IN ('all', 'lover', 'friends') AND EXISTS (
            SELECT 1 FROM matches mt WHERE (mt.user1_id = m.user_id AND mt.user2_id = ?) OR (mt.user2_id = m.user_id AND mt.user1_id = ?)
          )
        )        ORDER BY m.created_at DESC, m.id DESC LIMIT 100`, [viewerId, viewerId, viewerId, viewerId, viewerId]);
      const data = (rows || []).map((row: any) => {
        let profileData: any = row.profile_data || {};
        if (typeof profileData === 'string') { try { profileData = JSON.parse(profileData); } catch { profileData = {}; } }
        return {
          id: Number(row.id), userId: Number(row.user_id), userName: profileData.name || 'Người dùng',
          userAvatar: row.user_avatar || '', imageUrl: row.image_url, caption: row.caption || '',
          createdAt: row.created_at, audience: row.audience,
          reactions: { heart: Number(row.heart_count), smile: Number(row.smile_count), surprised: Number(row.surprised_count), sad: Number(row.sad_count) },
          userReaction: row.user_reaction || undefined,
        };
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Could not load moments from MySQL:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not load moments from MySQL.' });
    }
  });

  app.get('/api/moments/mine', async (req, res) => {
    try {
      const [rows]: any = await db.execute(`SELECT m.id, m.user_id, m.image_url, m.caption, m.audience, m.created_at,
        (SELECT ui.image_url FROM user_images ui WHERE ui.user_id = m.user_id ORDER BY ui.id LIMIT 1) AS user_avatar,
        (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'heart') AS heart_count,
        (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'smile') AS smile_count,
        (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'surprised') AS surprised_count,
        (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction_type = 'sad') AS sad_count
        FROM moments m WHERE m.user_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 100`, [req.authUserId]);
      return res.json({ success: true, data: (rows || []).map((row: any) => ({
        id: Number(row.id), userId: Number(row.user_id), userName: 'Bạn', userAvatar: row.user_avatar || '', imageUrl: row.image_url,
        caption: row.caption || '', createdAt: row.created_at, audience: row.audience,
        reactions: { heart: Number(row.heart_count), smile: Number(row.smile_count), surprised: Number(row.surprised_count), sad: Number(row.sad_count) },
      })) });
    } catch (error: any) {
      console.error('Could not load own moments:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not load your moments.' });
    }
  });

  app.post('/api/moments', async (req, res) => {
    const moment = req.body || {};
    const userId = Number(req.authUserId);
    if (typeof moment.imageUrl !== 'string' || !moment.imageUrl.trim() || moment.imageUrl.length > 20_000_000 || !/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(moment.imageUrl)) {
      return res.status(400).json({ success: false, error: 'Khoảnh khắc không hợp lệ.' });
    }
    const audience = moment.audience === 'all' ? 'all' : 'selected';
    const recipientIds = Array.isArray(moment.recipientIds)
      ? [...new Set(moment.recipientIds.map((id: any) => Number(id)).filter((id: number) => Number.isSafeInteger(id) && id > 0 && id !== userId))]
      : [];
    if (audience === 'selected' && (!recipientIds.length || recipientIds.length > 200)) {
      return res.status(400).json({ success: false, error: 'Hãy chọn từ 1 đến 200 người bạn để gửi khoảnh khắc.' });
    }
    let connection: any;
    try {
      if (!dbPool) return res.status(503).json({ success: false, error: 'Chưa kết nối được cơ sở dữ liệu.' });
      connection = await dbPool.getConnection();
      await connection.beginTransaction();
      if (audience === 'selected') {
        const placeholders = recipientIds.map(() => '?').join(',');
        const friendSql = 'SELECT DISTINCT IF(user1_id = ?, user2_id, user1_id) AS friend_id FROM matches WHERE (user1_id = ? OR user2_id = ?) AND IF(user1_id = ?, user2_id, user1_id) IN (' + placeholders + ')';
        const [friendRows]: any = await connection.execute(friendSql, [userId, userId, userId, userId, ...recipientIds]);
        const validFriendIds = new Set((friendRows || []).map((row: any) => Number(row.friend_id)));
        if (validFriendIds.size !== recipientIds.length) {
          await connection.rollback();
          return res.status(400).json({ success: false, error: 'Danh sách có người không phải bạn bè của bạn. Hãy tải lại danh sách rồi thử lại.' });
        }
      }
      const caption = String(moment.caption || '').trim().slice(0, 255);
      const storedImageUrl = await storeMediaDataUrl(moment.imageUrl, 'moments');
      const [insertResult]: any = await connection.execute(
        'INSERT INTO moments (user_id, image_url, caption, audience) VALUES (?, ?, ?, ?)',
        [userId, storedImageUrl, caption || null, audience]
      );
      const momentId = Number(insertResult.insertId);
      if (audience === 'selected') {
        for (const recipientId of recipientIds) {
          await connection.execute('INSERT INTO moment_recipients (moment_id, user_id) VALUES (?, ?)', [momentId, recipientId]);
        }
      }
      await connection.commit();
      return res.status(201).json({
        success: true,
        data: {
          ...moment,
          imageUrl: storedImageUrl,
          id: momentId,
          userId,
          caption,
          audience,
          recipientIds,
          reactions: { heart: 0, smile: 0, surprised: 0, sad: 0 },
          userReaction: undefined,
        },
      });
    } catch (error: any) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Could not save moment to MySQL:', error.code || error.message || error);
      return res.status(503).json({ success: false, error: 'Không lưu được khoảnh khắc vào cơ sở dữ liệu.' });
    } finally {
      connection?.release();
    }
  });
  app.post('/api/moments/:momentId/reactions', async (req, res) => {
    const momentId = Number(req.params.momentId);
    const reaction = String(req.body?.reaction || '');
    if (!Number.isSafeInteger(momentId) || momentId <= 0 || !['heart', 'smile', 'surprised', 'sad'].includes(reaction)) {
      return res.status(400).json({ success: false, error: 'Invalid moment reaction.' });
    }
    let connection: any;
    try {
      connection = await dbPool!.getConnection();
      await connection.beginTransaction();
      const momentSql = "SELECT m.id FROM moments m WHERE m.id = ? AND (m.user_id = ? OR (m.audience = 'selected' AND EXISTS (SELECT 1 FROM moment_recipients mrp WHERE mrp.moment_id = m.id AND mrp.user_id = ?)) OR (m.audience IN ('all', 'lover', 'friends') AND EXISTS (SELECT 1 FROM matches mt WHERE (mt.user1_id = m.user_id AND mt.user2_id = ?) OR (mt.user2_id = m.user_id AND mt.user1_id = ?)))) LIMIT 1 FOR UPDATE";
      const [momentRows]: any = await connection.execute(momentSql, [momentId, req.authUserId, req.authUserId, req.authUserId, req.authUserId]);
      if (!momentRows?.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: 'Moment not found or access denied.' });
      }
      const [previousRows]: any = await connection.execute('SELECT reaction_type FROM moment_reactions WHERE moment_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1', [momentId, req.authUserId]);
      await connection.execute('DELETE FROM moment_reactions WHERE moment_id = ? AND user_id = ?', [momentId, req.authUserId]);
      const removed = previousRows?.[0]?.reaction_type === reaction;
      if (!removed) await connection.execute('INSERT INTO moment_reactions (moment_id, user_id, reaction_type) VALUES (?, ?, ?)', [momentId, req.authUserId, reaction]);
      await connection.commit();
      return res.json({ success: true, userReaction: removed ? null : reaction });
    } catch (error: any) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Could not save moment reaction:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not save reaction.' });
    } finally { connection?.release(); }
  });

  app.get('/api/moments/:momentId/reactions', async (req, res) => {
    const momentId = Number(req.params.momentId);
    if (!Number.isSafeInteger(momentId) || momentId <= 0) return res.status(400).json({ success: false, error: 'Invalid moment id.' });
    try {
      const [owners]: any = await db.execute('SELECT id FROM moments WHERE id = ? AND user_id = ? LIMIT 1', [momentId, req.authUserId]);
      if (!owners?.length) return res.status(403).json({ success: false, error: 'You can only view reactions on your own moments.' });
      const [rows]: any = await db.execute(`SELECT u.id AS user_id, u.profile_data, mr.reaction_type, mr.created_at,
        (SELECT ui.image_url FROM user_images ui WHERE ui.user_id = u.id ORDER BY ui.id LIMIT 1) AS user_avatar
        FROM moment_reactions mr JOIN users u ON u.id = mr.user_id WHERE mr.moment_id = ? ORDER BY mr.created_at DESC`, [momentId]);
      return res.json({ success: true, data: (rows || []).map((row: any) => {
        let profile: any = row.profile_data || {};
        if (typeof profile === 'string') { try { profile = JSON.parse(profile); } catch { profile = {}; } }
        return { userId: Number(row.user_id), userName: profile.name || 'Người dùng', userAvatar: row.user_avatar || '', reaction: row.reaction_type, createdAt: row.created_at };
      }) });
    } catch (error: any) {
      console.error('Could not load moment reactions:', error.code || error.message);
      return res.status(503).json({ success: false, error: 'Could not load reactions.' });
    }
  });

  // Fetch historical swipes for a user (needed for profile filtering logic)
  app.post('/api/users/:targetId/view', async (req, res) => {
    const userId = Number(req.authUserId);
    const targetUserId = Number(req.params.targetId);
    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0 || targetUserId === userId) {
      return res.status(400).json({ success: false, error: 'Hồ sơ không hợp lệ.' });
    }
    try {
      await db.execute(
        'INSERT IGNORE INTO profile_impressions (user_id, target_user_id) VALUES (?, ?)',
        [userId, targetUserId]
      );
      return res.json({ success: true });
    } catch (err: any) {
      if (dbPool) return res.status(503).json({ success: false, error: 'Không lưu được lịch sử xem hồ sơ.' });
      const alreadyRecorded = mockSwipes.some((swipe: any) => Number(swipe.user_id) === userId && Number(swipe.target_user_id) === targetUserId);
      if (!alreadyRecorded) {
        mockSwipes.push({ user_id: userId, target_user_id: targetUserId, action: 'viewed' });
        saveMockDb();
      }
      return res.json({ success: true });
    }
  });

  app.get("/api/users/:userId/swipes", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!requireOwnUserId(req, res, userId)) return;
      try {
        const [rows]: any = await db.execute(
          `SELECT target_user_id, action FROM swipes WHERE user_id = ?
           UNION
           SELECT target_user_id, 'viewed' AS action FROM profile_impressions WHERE user_id = ?`,
          [userId, userId]
        );
        const formatted = rows.map((r: any) => ({
           target_user_id: Number(r.target_user_id),
           action: String(r.action).trim().toLowerCase()
        }));
        return res.json({ success: true, data: formatted });
      } catch (err: any) {
        if (dbPool) return res.status(503).json({ success: false, error: 'Không tải được lịch sử hồ sơ đã xem.' });
        const formatted = mockSwipes
          .filter(s => String(s.user_id) === String(userId))
          .map((s: any) => ({
             target_user_id: Number(s.target_user_id),
             action: String(s.action).trim().toLowerCase()
          }));
        return res.json({ success: true, data: formatted });
      }
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Fetch users for Explore View
  app.get("/api/users/explore", async (req, res) => {
    try {
      const currentUserId = Number(req.authUserId);
      const includeViewed = req.query.forExplore === '1';
      const [userRows]: any = includeViewed
        ? await db.execute('SELECT u.id, u.profile_data, u.created_at, u.is_premium FROM users u WHERE u.id <> ?', [currentUserId])
        : await db.execute(`SELECT u.id, u.profile_data, u.created_at, u.is_premium FROM users u
            LEFT JOIN swipes s ON s.user_id = ? AND s.target_user_id = u.id
            LEFT JOIN profile_impressions i ON i.user_id = ? AND i.target_user_id = u.id
            WHERE u.id <> ? AND s.id IS NULL AND i.id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM friend_requests fr
                WHERE ((fr.sender_id = ? AND fr.receiver_id = u.id) OR (fr.sender_id = u.id AND fr.receiver_id = ?))
                  AND fr.status IN ('pending', 'accepted')
              )
              AND NOT EXISTS (
                SELECT 1 FROM matches mt
                WHERE (mt.user1_id = ? AND mt.user2_id = u.id) OR (mt.user2_id = ? AND mt.user1_id = u.id)
              )`, [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]);

      if (userRows.length === 0) return res.json({ success: true, data: [] });

      const userIds = userRows.map((row: any) => Number(row.id));
      const placeholders = userIds.map(() => '?').join(',');
      const [imageRows]: any = await db.execute(
        `SELECT user_id, image_url FROM user_images WHERE user_id IN (${placeholders}) ORDER BY id ASC`,
        userIds
      );
      const [songRows]: any = await db.execute(
        `SELECT user_id, song_title FROM user_songs WHERE user_id IN (${placeholders})`,
        userIds
      );
      const [interestRows]: any = await db.execute(
        `SELECT ui.user_id, i.name FROM user_interests ui JOIN interests i ON i.id = ui.interest_id WHERE ui.user_id IN (${placeholders}) ORDER BY i.name`,
        userIds
      );
      let momentRows: any[] = [];
      try {
        const [rows]: any = await db.execute(
          `SELECT DISTINCT user_id FROM moments WHERE user_id IN (${placeholders}) AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
          userIds
        );
        momentRows = rows || [];
      } catch {}
      const usersWithMoments = new Set<number>((momentRows || []).map((row: any) => Number(row.user_id)));
      const imagesByUser = new Map<number, string[]>();
      for (const imageRow of imageRows) {
        const userId = Number(imageRow.user_id);
        const imageUrl = String(imageRow.image_url || '').trim();
        if (!imageUrl) continue;
        const images = imagesByUser.get(userId) || [];
        if (!images.includes(imageUrl)) images.push(imageUrl);
        imagesByUser.set(userId, images);
      }
      const songsByUser = new Map<number, string>();
      for (const songRow of songRows) {
        if (songRow.song_title) songsByUser.set(Number(songRow.user_id), songRow.song_title);
      }
      const interestsByUser = new Map<number, string[]>();
      for (const interestRow of interestRows || []) {
        const userId = Number(interestRow.user_id);
        const interests = interestsByUser.get(userId) || [];
        interests.push(String(interestRow.name));
        interestsByUser.set(userId, interests);
      }

      const [currentUserRows]: any = await db.execute(
        'SELECT profile_data FROM users WHERE id = ? LIMIT 1',
        [currentUserId]
      );
      let currentProfile: any = currentUserRows?.[0]?.profile_data || {};
      if (typeof currentProfile === 'string') {
        try { currentProfile = JSON.parse(currentProfile); } catch { currentProfile = {}; }
      }
      const [currentInterestRows]: any = await db.execute('SELECT i.name FROM user_interests ui JOIN interests i ON i.id = ui.interest_id WHERE ui.user_id = ? ORDER BY i.name', [currentUserId]);
      currentProfile.interests = [...new Set([
        ...(Array.isArray(currentProfile.interests) ? currentProfile.interests : []),
        ...(currentInterestRows || []).map((row: any) => String(row.name)),
      ])];

      const users = userRows.map((row: any) => {
        let profileData: any = row.profile_data || {};
        if (typeof profileData === 'string') {
          try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
        }
        const dbImages = imagesByUser.get(Number(row.id)) || [];
        const profileImages = Array.isArray(profileData.images) ? profileData.images : [];
        profileData.images = [...new Set([...dbImages, ...profileImages].map((url: any) => String(url || '').trim()).filter(Boolean))];
        profileData.interests = interestsByUser.get(Number(row.id)) || (Array.isArray(profileData.interests) ? profileData.interests : []);
        profileData.hasMoments = usersWithMoments.has(Number(row.id));
        const distanceKm = calculateDistanceKm(currentProfile, profileData);
        const songTitle = songsByUser.get(Number(row.id));
        if (songTitle) profileData.songTitle = songTitle;

        // Return only a rounded distance; never expose another person's exact coordinates.
        delete profileData.lat;
        delete profileData.lng;
        delete profileData.latitude;
        delete profileData.longitude;
        return { id: row.id, profile_data: profileData, created_at: row.created_at, distance_km: distanceKm, is_premium: !!row.is_premium };
      }).filter((user: any) => user.profile_data.images.length > 0);

      return res.json({ success: true, data: users });
    } catch (e) {
      console.error('Failed to load MySQL explore profiles:', (e as any)?.code || (e as any)?.message || e);
      if (dbPool) {
        return res.status(503).json({
          success: false,
          error: 'Không đọc được hồ sơ từ MySQL. Kiểm tra kết nối tại /api/health và xác nhận các bảng users, swipes, user_images, user_songs đã tồn tại.'
        });
      }
      const swipedIds = new Set(mockSwipes.filter((swipe: any) => Number(swipe.user_id) === Number(req.authUserId)).map((swipe: any) => Number(swipe.target_user_id)));
      const publicUsers = mockUsers.filter(user => Number(user.id) !== Number(req.authUserId) && !swipedIds.has(Number(user.id)))
        .map(user => {
          const profileData = typeof user.profile_data === 'string'
            ? (() => { try { return JSON.parse(user.profile_data); } catch { return {}; } })()
            : (user.profile_data || user.profileData || {});
          return { id: user.id, profile_data: { ...profileData, hasMoments: Boolean(profileData.hasMoments) }, created_at: user.created_at || null, distance_km: null, is_premium: Boolean(profileData.isPremium) };
        }).filter(user => Array.isArray(user.profile_data.images) && user.profile_data.images.length > 0);
      return res.json({ success: true, data: publicUsers });
    }
  });

  // Handle Likes/Swipes and creating Matches
  app.post("/api/matches/swipe", async (req, res) => {
    try {
      const { user_id, target_user_id, action } = req.body; 
      if (!requireOwnUserId(req, res, user_id)) return;
      const swipeAction = normalizeSwipeAction(action);
      if (!user_id || !target_user_id || !swipeAction) {
        return res.status(400).json({ success: false, error: "Thiếu dữ liệu swipe" });
      }

      // Thả tim = gửi lời kết bạn (pending); khi cả hai đều like => tạo match
      if (swipeAction === 'like') {
        let alreadyLiked = mockSwipes.some((swipe: any) => Number(swipe.user_id) === Number(user_id) && Number(swipe.target_user_id) === Number(target_user_id) && String(swipe.action).toLowerCase() === 'like');
        if (dbPool) {
          try {
            const [existingLikeRows]: any = await db.execute(
              "SELECT id FROM swipes WHERE user_id = ? AND target_user_id = ? AND action = 'like' LIMIT 1",
              [user_id, target_user_id]
            );
            alreadyLiked = !!existingLikeRows?.length;
          } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
          }
        }
        if (!alreadyLiked) {
          let premium = false;
          if (dbPool) {
            try {
              premium = await hasActivePremium(Number(user_id));
            } catch (error: any) {
              if (process.env.NODE_ENV === 'production') {
                console.error('Could not check like daily limit:', error.code || error.message);
                return res.status(503).json({ success: false, error: 'Không kiểm tra được lượt thích. Vui lòng thử lại sau.' });
              }
            }
          }
          if (!premium) {
            try {
              const quota = await consumeDailyUsage(Number(user_id), 'like', 50);
              if (!quota.allowed) {
                return res.status(429).json({
                  success: false,
                  code: 'LIKE_DAILY_LIMIT',
                  limit: 50,
                  used: quota.used,
                  error: 'Bạn đã hết 50 lượt thả tim miễn phí hôm nay. Nâng cấp Premium để tiếp tục thả tim không giới hạn.'
                });
              }
            } catch (error: any) {
              console.error('Could not record like daily usage:', error.code || error.message);
              return res.status(503).json({ success: false, error: 'Không ghi nhận được lượt thích. Vui lòng thử lại sau.' });
            }
          }
        }
        try {
          await db.execute(
            "INSERT INTO swipes (user_id, target_user_id, action) VALUES (?, ?, 'like') ON DUPLICATE KEY UPDATE action = VALUES(action)",
            [user_id, target_user_id]
          );

          const [check]: any = await db.execute(
            "SELECT id FROM swipes WHERE user_id = ? AND target_user_id = ? AND action = 'like' LIMIT 1",
            [target_user_id, user_id]
          );

          if (check && check.length > 0) {
            const m1 = Math.min(Number(user_id), Number(target_user_id));
            const m2 = Math.max(Number(user_id), Number(target_user_id));
            await db.execute("INSERT IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)", [m1, m2]);

            const [rows]: any = await db.execute("SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? LIMIT 1", [m1, m2]);
            const match_id = rows && rows.length > 0 ? rows[0].id : undefined;
            return res.json({ success: true, match: true, match_id });
          }

          return res.json({ success: true, match: false });
        } catch (err: any) {
          // Backward compatible fallback if DB schema is old (likes table)
          try {
            await db.execute("INSERT IGNORE INTO likes (user_id, target_user_id) VALUES (?, ?)", [user_id, target_user_id]);
            const [check]: any = await db.execute("SELECT id FROM likes WHERE user_id = ? AND target_user_id = ? LIMIT 1", [target_user_id, user_id]);
            if (check && check.length > 0) {
              const m1 = Math.min(Number(user_id), Number(target_user_id));
              const m2 = Math.max(Number(user_id), Number(target_user_id));
              await db.execute("INSERT IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)", [m1, m2]);
              const [rows]: any = await db.execute("SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? LIMIT 1", [m1, m2]);
              const match_id = rows && rows.length > 0 ? rows[0].id : undefined;
              return res.json({ success: true, match: true, match_id });
            }
            return res.json({ success: true, match: false });
          } catch (err2: any) {
            // Mock logic
            if (!mockLikes.find(l => l.user_id === user_id && l.target_user_id === target_user_id)) {
              mockLikes.push({ user_id, target_user_id });
            }
            
            const idxSw = mockSwipes.findIndex(s => s.user_id === user_id && s.target_user_id === target_user_id);
            if (idxSw !== -1) {
              mockSwipes[idxSw].action = 'like';
            } else {
              mockSwipes.push({ user_id, target_user_id, action: 'like' });
            }
            saveMockDb();

            const mutual = mockLikes.find(l => l.user_id === target_user_id && l.target_user_id === user_id);
            if (mutual) {
              const m1 = Math.min(Number(user_id), Number(target_user_id));
              const m2 = Math.max(Number(user_id), Number(target_user_id));
              if (!mockMatches.find(m => m.user1_id === m1 && m.user2_id === m2)) {
                mockMatches.push({ id: mockMatches.length + 1, user1_id: m1, user2_id: m2 }); saveMockDb();
              }
              const m = mockMatches.find(m => m.user1_id === m1 && m.user2_id === m2);
              return res.json({ success: true, match: true, isMock: true, match_id: m!.id });
            }
            return res.json({ success: true, match: false });
          }
        }
      }

      // PASS
      try {
        await db.execute(
          "INSERT INTO swipes (user_id, target_user_id, action) VALUES (?, ?, 'pass') ON DUPLICATE KEY UPDATE action = VALUES(action)",
          [user_id, target_user_id]
        );
      } catch (e) {
        const idxSw = mockSwipes.findIndex(s => s.user_id === user_id && s.target_user_id === target_user_id);
        if (idxSw !== -1) {
          mockSwipes[idxSw].action = 'pass';
        } else {
          mockSwipes.push({ user_id, target_user_id, action: 'pass' });
        }
        saveMockDb();
      }
      return res.json({ success: true, match: false });
    } catch (e) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Chấp nhận lời kết bạn (tạo match để mở khung chat)
  app.post("/api/likes/accept", requireOwnBodyField('user_id'), async (req, res) => {
    try {
      const { user_id, requester_id } = req.body; // user_id = người nhận, requester_id = người đã thả tim
      if (!user_id || !requester_id) return res.status(400).json({ success: false, error: "Thiếu dữ liệu" });

      try {
        // đảm bảo request tồn tại
        const [reqRows]: any = await db.execute(
          "SELECT id FROM swipes WHERE user_id = ? AND target_user_id = ? AND action = 'like' LIMIT 1",
          [requester_id, user_id]
        );
        if (!reqRows || reqRows.length === 0) {
          return res.status(404).json({ success: false, error: "Không tìm thấy lời kết bạn" });
        }

        // đánh dấu chấp nhận = like ngược lại (để đồng bộ dữ liệu)
        await db.execute(
          "INSERT INTO swipes (user_id, target_user_id, action) VALUES (?, ?, 'like') ON DUPLICATE KEY UPDATE action = VALUES(action)",
          [user_id, requester_id]
        );

        const m1 = Math.min(Number(user_id), Number(requester_id));
        const m2 = Math.max(Number(user_id), Number(requester_id));
        await db.execute("INSERT IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)", [m1, m2]);
        const [rows]: any = await db.execute("SELECT id FROM matches WHERE user1_id = ? AND user2_id = ? LIMIT 1", [m1, m2]);
        const match_id = rows && rows.length > 0 ? rows[0].id : undefined;
        return res.json({ success: true, match_id });
      } catch (err: any) {
        // Mock fallback
        if (!mockLikes.find(l => l.user_id === requester_id && l.target_user_id === user_id)) {
          mockLikes.push({ user_id: requester_id, target_user_id: user_id }); saveMockDb();
        }
        if (!mockLikes.find(l => l.user_id === user_id && l.target_user_id === requester_id)) {
          mockLikes.push({ user_id, target_user_id: requester_id }); saveMockDb();
        }
        const m1 = Math.min(Number(user_id), Number(requester_id));
        const m2 = Math.max(Number(user_id), Number(requester_id));
        if (!mockMatches.find(m => m.user1_id === m1 && m.user2_id === m2)) {
          mockMatches.push({ id: mockMatches.length + 1, user1_id: m1, user2_id: m2 }); saveMockDb();
        }
        const m = mockMatches.find(m => m.user1_id === m1 && m.user2_id === m2);
        return res.json({ success: true, isMock: true, match_id: m!.id });
      }
    } catch (e) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Get User's received pending likes
  app.get("/api/likes/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!requireOwnUserId(req, res, userId)) return;
      
      try {
        const [rows]: any = await db.execute(`
          SELECT u.id as user_id, u.profile_data
          FROM swipes s
          JOIN users u ON s.user_id = u.id
          WHERE s.target_user_id = ?
            AND s.action = 'like'
            AND NOT EXISTS (
              SELECT 1 FROM matches m
              WHERE (m.user1_id = ? AND m.user2_id = u.id)
                 OR (m.user2_id = ? AND m.user1_id = u.id)
            )
        `, [userId, userId, userId]);
        let validLikes = [];
        for (let row of rows) {
            let profileData = row.profile_data || {};
            if (typeof profileData === 'string') {
                try { profileData = JSON.parse(profileData); } catch(e){}
            }
            row.profile_data = profileData;
            validLikes.push(row);
        }
        return res.json({ success: true, data: validLikes });
      } catch (err: any) {
        // Backward compatible fallback if DB schema is old (likes table)
        try {
          const [rows]: any = await db.execute(
            "SELECT users.id as user_id, users.profile_data FROM likes JOIN users ON likes.user_id = users.id WHERE likes.target_user_id = ?",
            [userId]
          );
          let validLikes = [];
          for (let row of rows) {
            let profileData = row.profile_data || {};
            if (typeof profileData === 'string') {
              try { profileData = JSON.parse(profileData); } catch(e){}
            }
            row.profile_data = profileData;
            validLikes.push(row);
          }
          return res.json({ success: true, data: validLikes });
        } catch(e2) {}
        // Mock fallback
        const matchingLikes = mockLikes.filter(l => l.target_user_id.toString() === userId.toString());
        const data = [];
        for (let l of matchingLikes) {
            // Check if already matched
            const isMatched = mockMatches.some(m => 
              (m.user1_id.toString() === userId.toString() && m.user2_id.toString() === l.user_id.toString()) || 
              (m.user2_id.toString() === userId.toString() && m.user1_id.toString() === l.user_id.toString())
            );
            if (!isMatched) {
                const u = mockUsers.find(x => x.id.toString() === l.user_id.toString());
                if (u) {
                    data.push({
                       user_id: u.id,
                        profile_data: u.profile_data || u.profileData
                    });
                }
            }
        }
        return res.json({ success: true, data });
      }
    } catch (e) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Get User's Matches
  app.get("/api/matches/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!requireOwnUserId(req, res, userId)) return;
      try {
        const [rows]: any = await db.execute(
          `SELECT m.id as match_id, u.id as user_id, u.profile_data 
           FROM matches m 
           JOIN users u ON (u.id = m.user1_id OR u.id = m.user2_id) 
           WHERE (m.user1_id = ? OR m.user2_id = ?) AND u.id != ?`, 
          [userId, userId, userId]
        );
        const matches = [];
        for (const row of rows) {
            let profileData = row.profile_data || {};
            if (typeof profileData === 'string') {
                try { profileData = JSON.parse(profileData); } catch(e){}
            }
            const [imgRows]: any = await db.execute("SELECT image_url FROM user_images WHERE user_id = ?", [row.user_id]);
            if (imgRows && imgRows.length > 0) {
                profileData.images = imgRows.map((r: any) => r.image_url);
            }
            row.profile_data = profileData;
            matches.push(row);
        }
        return res.json({ success: true, data: matches });
      } catch (err: any) {
        const matchingIds = mockMatches.filter(m => m.user1_id.toString() === userId || m.user2_id.toString() === userId);
        const data = matchingIds.map(m => {
            const partnerId = m.user1_id.toString() === userId ? m.user2_id : m.user1_id;
            const u = mockUsers.find(x => x.id === partnerId);
            if (!u) return null;
            return {
               match_id: m.id,
               user_id: u.id,
               profile_data: u.profileData || u.profile_data
            };
        }).filter(Boolean);
        return res.json({ success: true, data });
      }
    } catch (e) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Get messages for a match
  app.get("/api/messages/:matchId", async (req, res) => {
    try {
      const { matchId } = req.params;
      const userId = String(req.authUserId);
      const afterIdValue = req.query.after_id;
      const afterId = afterIdValue == null || afterIdValue === '' ? null : Number(afterIdValue);
      const beforeIdValue = req.query.before_id;
      const beforeId = beforeIdValue == null || beforeIdValue === '' ? null : Number(beforeIdValue);
      if ((afterId !== null && (!Number.isSafeInteger(afterId) || afterId < 0))
        || (beforeId !== null && (!Number.isSafeInteger(beforeId) || beforeId <= 0))
        || (afterId !== null && beforeId !== null)) {
        return res.status(400).json({ success: false, error: 'Mốc tin nhắn không hợp lệ.' });
      }
      try {
        if (userId) {
          const [mRows]: any = await db.execute(
            "SELECT id FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) LIMIT 1",
            [matchId, userId, userId]
          );
          if (!mRows || mRows.length === 0) {
            return res.status(403).json({ success: false, error: "Bạn không có quyền xem đoạn chat này" });
          }
        }

        // Initial load is capped; subsequent polling requests only fetch new rows.
        try {
          const sql = afterId == null
            ? beforeId == null
              ? "SELECT id, match_id, sender_id, text, is_image, created_at FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT 100"
              : "SELECT id, match_id, sender_id, text, is_image, created_at FROM messages WHERE match_id = ? AND id < ? ORDER BY id DESC LIMIT 100"
            : "SELECT id, match_id, sender_id, text, is_image, created_at FROM messages WHERE match_id = ? AND id > ? ORDER BY id ASC LIMIT 100";
          const cursorId = afterId ?? beforeId;
          const params = cursorId == null ? [matchId] : [matchId, cursorId];
          const [rows]: any = await db.execute(sql, params);
          return res.json({ success: true, data: afterId == null ? rows.reverse() : rows });
        } catch (errText: any) {
          // fallback schema cũ: messages.content
          const sql = afterId == null
            ? beforeId == null
              ? "SELECT id, match_id, sender_id, content, created_at FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT 100"
              : "SELECT id, match_id, sender_id, content, created_at FROM messages WHERE match_id = ? AND id < ? ORDER BY id DESC LIMIT 100"
            : "SELECT id, match_id, sender_id, content, created_at FROM messages WHERE match_id = ? AND id > ? ORDER BY id ASC LIMIT 100";
          const cursorId = afterId ?? beforeId;
          const params = cursorId == null ? [matchId] : [matchId, cursorId];
          const [rows]: any = await db.execute(sql, params);
          const mapped = (rows || []).map((r: any) => ({
            ...r,
            text: r.text ?? r.content,
            is_image: typeof r.content === 'string' ? r.content.startsWith('data:image/') : false,
          }));
          return res.json({ success: true, data: afterId == null ? mapped.reverse() : mapped });
        }
      } catch (err: any) {
        if (!mockMatches.some(match => String(match.id) === String(matchId) && (String(match.user1_id) === userId || String(match.user2_id) === userId))) {
          return res.status(403).json({ success: false, error: 'Bạn không có quyền xem đoạn chat này.' });
        }
        console.error("DB GET messages failed:", err.message);
        const allMessages = mockMessages
          .filter(m => m.match_id.toString() === matchId.toString())
          .sort((a: any, b: any) => Number(a.id) - Number(b.id))
          .map((m: any) => ({
            ...m,
            text: m.text ?? m.content,
            is_image: !!m.is_image || (typeof m.content === 'string' && m.content.startsWith('data:image/')),
          }));
        const data = afterId != null
          ? allMessages.filter((message: any) => Number(message.id) > afterId).slice(0, 100)
          : beforeId != null
            ? allMessages.filter((message: any) => Number(message.id) < beforeId).slice(-100)
            : allMessages.slice(-100);
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Post a new message
  app.post("/api/messages", async (req, res) => {
    try {
      const { match_id, sender_id } = req.body;
      const text = (req.body.text ?? req.body.content ?? "") as string;
      const isImage = typeof text === 'string' ? text.startsWith('data:image/') : false;
      const actualMatchId = match_id;
      if (!actualMatchId || !sender_id || !text) {
        return res.status(400).json({ success: false, error: 'Tin nhắn thiếu dữ liệu.' });
      }
      if (String(sender_id) !== String(req.authUserId)) {
        return res.status(403).json({ success: false, error: 'Bạn không thể gửi tin nhắn thay tài khoản khác.' });
      }
      try {
        if (!actualMatchId || !sender_id || !text) {
          return res.status(400).json({ success: false, error: "Thiếu dữ liệu tin nhắn" });
        }

        // xác thực user thuộc match
        const [mRows]: any = await db.execute(
          "SELECT id FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) LIMIT 1",
          [actualMatchId, sender_id, sender_id]
        );
        if (!mRows || mRows.length === 0) {
          return res.status(403).json({ success: false, error: "Bạn không có quyền gửi tin nhắn trong đoạn chat này" });
        }

        // ưu tiên schema chuẩn
        try {
          const [result]: any = await db.execute(
            "INSERT INTO messages (match_id, sender_id, text, is_image) VALUES (?, ?, ?, ?)",
            [actualMatchId, sender_id, text, isImage]
          );
          return res.json({ success: true, messageId: result.insertId });
        } catch (errText: any) {
          // fallback schema cũ
          const [result]: any = await db.execute(
            "INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)",
            [actualMatchId, sender_id, text]
          );
          return res.json({ success: true, messageId: result.insertId });
        }
      } catch (err: any) {
        if (!mockMatches.some(match => String(match.id) === String(actualMatchId) && (String(match.user1_id) === String(req.authUserId) || String(match.user2_id) === String(req.authUserId)))) {
          return res.status(403).json({ success: false, error: 'Bạn không phải thành viên của cuộc trò chuyện này.' });
        }
        console.error("DB INSERT message failed:", err.message);
        const id = mockMessages.length + 1;
        mockMessages.push({ id, match_id: actualMatchId, sender_id, text, is_image: isImage, created_at: new Date() }); saveMockDb();
        return res.json({ success: true, messageId: id });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (path.basename(filePath) === 'index.html') res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

