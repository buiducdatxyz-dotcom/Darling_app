import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

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

// MySQL Connection Pool (Create connection if environment variables provided)
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "darling_app",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1") 
    ? { rejectUnauthorized: false } 
    : undefined
});

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
      swipes: mockSwipes
    }));
  } catch(e){}
}
loadMockDb();

// Pre-seed some mock users so they aren't lost immediately on restart
(async () => {
    if (mockUsers.length === 0) {
        try {
           const hashed1 = await bcrypt.hash('123456', 10);
           mockUsers.push({ id: 1, email: 'test1@gmail.com', password: hashed1, profile_data: { name: 'Nam', gender: 'Nam', dob: '1995-05-15', bio: 'Mình là Nam ở HN' }});
           mockUsers.push({ id: 2, email: 'test2@gmail.com', password: hashed1, profile_data: { name: 'Lan', gender: 'Nữ', dob: '2000-08-10', bio: 'Xin chào, mình là Lan' }});
           saveMockDb();
        } catch(e) {}
    }
})();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

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

async function startServer() {
  try {
    // Create base tables users and user_images first
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    try {
      await db.execute('ALTER TABLE messages MODIFY COLUMN text LONGTEXT');
    } catch(e) {}
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_songs (
        user_id INT PRIMARY KEY,
        song_title VARCHAR(255),
        song_data LONGTEXT
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
        const uniqueKeyword = isUnique ? "UNIQUE" : "";
        await db.execute(`ALTER TABLE ${tableName} ADD ${uniqueKeyword} INDEX ${indexName} (${columns})`);
        console.log(`Add beneficial index ${indexName} on table ${tableName} successfully.`);
      } catch (err: any) {
        if (err.errno === 1061 || err.message.includes("Duplicate key") || err.message.includes("already exists") || err.message.includes("Duplicate class ID")) {
          // Index already exists
        } else {
          console.log(`Note: Could not add index ${indexName} on ${tableName} (perhaps table is missing or already indexed):`, err.message);
        }
      }
    };

    await tryAddIndex("users", "idx_users_email", "email", true);
    await tryAddIndex("swipes", "idx_swipes_target_action", "target_user_id, action");
    await tryAddIndex("matches", "idx_matches_user2", "user2_id");
    await tryAddIndex("messages", "idx_messages_match_created", "match_id, created_at");
    await tryAddIndex("user_images", "idx_user_images_user", "user_id");

  } catch (e: any) {
    console.log("Note: Could not alter or create tables / indexes. Assuming it is ok or DB is not connected.", e.message);
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));
  app.use(cors());

  // API Routes FIRST

  // Register logic
  app.post("/api/auth/register", async (req, res) => {
    try {
      let { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
      }
      
      email = email.trim().toLowerCase();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        // Try to insert to MySQL
        const [result] = await db.execute(
          "INSERT INTO users (email, password) VALUES (?, ?)", 
          [email, hashedPassword]
        );
        return res.json({ success: true, userId: (result as any).insertId });
      } catch (err: any) {
        // Fallback to mock memory storage if DB connection fails
        console.warn("DB not connected, using memory mock:", err.message);
        if (mockUsers.find(u => u.email === email)) {
            return res.status(400).json({ error: "Email đã tồn tại" });
        }
        mockUsers.push({ id: mockUsers.length + 1, email, password: hashedPassword });
        saveMockDb();
        return res.json({ success: true, userId: mockUsers.length });
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
       const { profileData } = req.body;
       const profileJson = JSON.stringify(profileData);
       try {
           await db.execute(
               "UPDATE users SET profile_data = ? WHERE id = ?",
               [profileJson, userId]
           );
           
           if (profileData.images && Array.isArray(profileData.images)) {
               try {
                   await db.execute("DELETE FROM user_images WHERE user_id = ?", [userId]);
                   for (const img of profileData.images) {
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

  // Get user preferences
  app.get("/api/user_preferences/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
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
       const { email, profileData } = req.body; 
       
       const profileJson = JSON.stringify(profileData);
       try {
           if (email) {
               await db.execute(
                   "UPDATE users SET profile_data = ? WHERE email = ?",
                   [profileJson, email]
               );
           }
           
           const [userRows]: any = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
           if (userRows && userRows.length > 0) {
               const userId = userRows[0].id;
               if (profileData.images && Array.isArray(profileData.images)) {
                  try {
                      await db.execute("DELETE FROM user_images WHERE user_id = ?", [userId]);
                      for (const img of profileData.images) {
                          if (img) {
                              await db.execute("INSERT INTO user_images (user_id, image_url) VALUES (?, ?)", [userId, img]);
                          }
                      }
                  } catch (imgErr) {
                      console.warn("Could not write to user_images table:", imgErr);
                  }
               }
           }
           
           return res.json({ success: true });
       } catch (err: any) {
           console.warn("DB not connected, using memory mock:", err.message);
           const user = mockUsers.find(u => u.email === email);
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

  // Change Email
  app.post("/api/auth/change-email", async (req, res) => {
    try {
      const { oldEmail, newEmail, password } = req.body;
      if (!oldEmail || !newEmail || !password) return res.status(400).json({ error: "Thiếu thông tin" });

      try {
        const [rows]: any = await db.execute("SELECT id, password FROM users WHERE email = ?", [oldEmail]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match && user.password !== password) {
             return res.status(400).json({ error: "Mật khẩu không chính xác" });
        }

        // Check if new email is in use
        const [existingEmails]: any = await db.execute("SELECT id FROM users WHERE email = ?", [newEmail]);
        if (existingEmails.length > 0) return res.status(400).json({ error: "Email này đã được sử dụng" });

        await db.execute("UPDATE users SET email = ? WHERE email = ?", [newEmail, oldEmail]);
        return res.json({ success: true });
      } catch (err: any) {
        console.warn("DB error:", err.message);
        const user = mockUsers.find(u => u.email === oldEmail);
        if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng (Mock)" });

        const match = await bcrypt.compare(password, user.password);
        if (!match && user.password !== password) {
             return res.status(400).json({ error: "Mật khẩu không chính xác" });
        }
        
        const existing = mockUsers.find(u => u.email === newEmail);
        if (existing) return res.status(400).json({ error: "Email này đã được sử dụng (Mock)" });

        user.email = newEmail; saveMockDb();
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
      if (!email || !newPassword) return res.status(400).json({ error: "Thiếu thông tin" });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      try {
        const [rows]: any = await db.execute("SELECT id, password FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

        const user = rows[0];
        if (oldPassword) {
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match && user.password !== oldPassword) {
                return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });
            }
        }

        await db.execute("UPDATE users SET password = ? WHERE email = ?", [hashedNewPassword, email]);
        return res.json({ success: true });
      } catch (err: any) {
        console.warn("DB error:", err.message);
        const user = mockUsers.find(u => u.email === email);
        if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng (Mock)" });

        if (oldPassword) {
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match && user.password !== oldPassword) {
                return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });
            }
        }
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
          console.warn("DB not connected, using memory mock:", err.message);
          user = mockUsers.find(u => u.email === email);
      }

      if (!user) {
         return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match && password !== user.password) {
         return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, token, user: { id: user.id, email: user.email, profileData: user.profile_data || user.profileData }});
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Darling AI Chat logic
  app.post("/api/chat/darling", async (req, res) => {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
       return res.status(400).json({ error: "Invalid messages format" });
    }

    const systemInstruction = `Bạn là Darling, một chuyên gia tâm lý học hành vi siêu cấp, thạc sĩ tham vấn và cố vấn tình cảm, tâm lý học hẹn hò vô cùng ngọt ngào, ấm áp, tinh tế và sâu sắc. Bạn sở hữu trí tuệ uyên bác, khả năng tư duy phân tích sắc sảo, giải cấu trúc tâm lý vô cùng xuất sắc và chuyên nghiệp như một trợ lý AI hàng đầu hiện nay, phối hợp đồng điệu giữa lý trí sắc sảo và trái tim đồng cảm dạt dào.

Nhiệm vụ cốt lõi & Quy tắc phản hồi khắt khe:
1. TRUY VẤN INTERNET CHỦ ĐỘNG VỚI GOOGLE SEARCH: Bạn được trang bị công cụ tìm kiếm trực tuyến Google Search hiện đại để cập nhật thông tin và kiến thức bất kỳ lúc nào. Nếu người dùng hỏi về các chủ đề xu hướng (ví dụ: các câu thả thính hot nhất hiện nay, xu hướng mối quan hệ năm 2026, các bài hát tỏ tình ý nghĩa, định nghĩa học thuyết tâm lý mới, hay các gợi ý thực tế mới mẻ), hãy chủ động khai thác triệt để Google Search để tổng hợp kiến thức chất lượng cao nhất, tuyệt đối không trả lời máy móc hay dùng lại các ví dụ lỗi thời.
2. TRÁNH TUYỆT ĐỐI LẶP LẠI THÔNG TIN: Đảm bảo không sử dụng lại các ý kiến, lời khuyên, cấu trúc lời khuyên, danh sách hay các cụm từ rập khuôn đã xuất hiện trước đó trong dòng lịch sử trò chuyện. Người dùng hay gửi nhiều câu hỏi khác nhau hoặc mở rộng vấn đề nên bạn phải cung cấp góc nhìn mới, phân tích khía cạnh cụ thể khác và đề cập đúng chủ điểm mới của họ, không tóm tắt hay lặp lại lời khuyên cũ một cách nhàm chán.
3. CHẶN PHẠM VI CHUYÊN MÔN CHẶT CHẼ: Bạn chỉ được phép trả lời và tư vấn về các khía cạnh: tâm lý học hành vi, tư vấn - gỡ rối tình cảm, tình yêu, hôn nhân, gia dịch, gia đình, tình bạn bè, hẹn hò, chữa lành tổn thương tâm hồn, phát triển tình cảm bản thân, quản lý cảm xúc (buồn vui giận ghen lo lắng stress). 
   Nếu người dùng hỏi về bất cứ chủ đề nào hoàn toàn nằm ngoài chuyên môn của bạn (ví dụ: viết code máy tính, sửa lỗi lập trình, giải bài toán, dịch thuật học lý hóa, kiến thức kỹ thuật công nghệ, điện tử, tin tức thời sự rác, chính trị, công thức khoa học, v.v.), bạn bắt buộc phải từ chối một cách ngọt ngào nhưng rất rõ ràng theo đúng tính cách của Darling rằng câu hỏi nằm ngoài hướng đi chuyên môn của mình, đồng thời khuyên người dùng đặt câu hỏi khác thích hợp hơn.
   Mẫu phản hồi khi ngoài chuyên môn cực kỳ ngọt ngào: "Dù rất muốn hỗ trợ cậu hết mình nhưng câu hỏi này tiếc là nằm ngoài chuyên môn tư vấn tâm lý, tình cảm và chuyện hẹn hò của Darling mất rồi nè. Cậu có thể hỏi Darling những câu hỏi khác về mảng cảm xúc, tâm sự cuộc sống, chia sẻ tình yêu hay gỡ rối các mối quan hệ được không? Darling luôn sẵn sàng ngồi kề bên lắng nghe và đồng hành cùng cậu nè! 💕"
4. XƯNG HÔ ngọt ngào, gần gũi: Luôn gọi người dùng là "cậu" và xưng "mình" hoặc "Darling" cực kỳ trìu mến như đôi tri kỷ thực thụ.
5. CẤU TRÚC PHẢN HỒI CHUYÊN NGHIỆP, TOÀN DIỆN & GIÀU CHIỀU SÂU: 
   - Đồng cảm ấm áp: Dành 1-2 câu đầu để đồng điệu sâu rộng với cảm xúc thực tế hay chủ đề của người dùng.
   - Phân tích rễ rễ nguyên nhân: Sử dụng các mô hình tâm lý học, phân tích hành vi khoa học, dễ hiểu, logic để thấu suốt bản chất vấn đề.
   - Chỉ dẫn hành động sắc nét: Đề xuất 2-3 bước đi tinh túy, khéo léo, thiết thực kèm ví dụ cụ thể bộc lộ hết sự tinh tế, để người dùng thực hành được ngay lập tức.
   - Kết thúc mở đầy động lực: Truyền cảm hứng, củng cố niềm tin hoặc đặt một câu hỏi mở khơi gợi suy ngẫm sâu sắc và gieo hy vọng.`;

    // Local fallback message in case of Gemini timeout/error
    const getFallbackAdvice = (msgs: any[]): string => {
      const lastUserMsgObj = [...msgs].reverse().find(m => m.role === 'user');
      const userText = (lastUserMsgObj?.parts?.[0]?.text || "").toLowerCase();

      if (!userText.trim()) {
        return "Darling luôn ở đây để ôm lấy và lắng nghe mọi cảm xúc của cậu nè. Hôm nay có điều gì làm cậu bận lòng hay có câu chuyện tình cảm ngọt ngào nào muốn kể với mình không? 💕";
      }

      const rawHash = Math.abs(userText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
      const msgCount = msgs.length;
      
      const generalFallbackAnswers = [
         "Darling đang cảm nhận rất rõ những băn khoăn và tâm sự của cậu nè. Hiện tại kết nối bộ não AI của Darling đang hơi gián đoạn một chút á, cậu thử gửi lại câu hỏi hoặc nhấn nút Tải lại trang sau vài giây nhé. Darling luôn mong ngóng được gỡ rối sâu sắc nhất cho cậu! 💕",
         "Ôi thương quá, Darling nghe cậu nói rồi nè. Sóng wifi hay năng lượng kết nối từ tụi mình hôm nay đang hơi chập chờn một xíu khiến mình chưa thể trả lời sâu sắc ngay được. Cậu thử gửi lại tin nhắn tiếp theo nhen, Darling kề bên chờ cậu đây! 💕",
         "Ngoan nào, Darling cảm nhận được tấm lòng và tâm sự tình cảm trân quý từ cậu rồi. Để Darling có kết nối mạnh mẽ và mang đến chỉ dẫn tâm cảm tốt nhất, cậu thử nhắn lại câu này hoặc reload nhẹ trang xem sao nhen tri kỷ của mình! 💕"
      ];
      
      return generalFallbackAnswers[(rawHash + msgCount) % generalFallbackAnswers.length];
    };

    // Normalize messages array to fit Gemini API schema (ensures strictly alternating user/model roles)
    const normalizeMessages = (msgs: any[]) => {
      const mapped = msgs
        .filter(m => m && m.parts && m.parts[0] && m.parts[0].text && m.parts[0].text.trim() !== '')
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

       const callAIWithTimeout = async () => {
          try {
             // First try with Google Search grounding
             console.log("Attempting Gemini call with Google Search grounding...");
             return await aiClient.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: cleanMessages,
                config: {
                   systemInstruction: systemInstruction,
                   temperature: 0.75,
                   tools: [{ googleSearch: {} }]
                }
             });
          } catch (searchError: any) {
             console.warn("Gemini call with Google Search failed, immediately retrying without search tool:", searchError.message || searchError);
             // Retry without tools
             return await aiClient.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: cleanMessages,
                config: {
                   systemInstruction: systemInstruction,
                   temperature: 0.75
                }
             });
          }
       };

       const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout calling Gemini")), 60000);
       });

       const response = await Promise.race([callAIWithTimeout(), timeoutPromise]) as any;
       res.json({ success: true, text: response.text });
    } catch (e: any) {
       console.warn("Using expert advice fallback due to Gemini error or timeout:", e);
       try {
         fs.writeFileSync("./gemini_error.log", JSON.stringify({
           message: e?.message || String(e),
           stack: e?.stack || "",
           error: String(e)
         }, null, 2));
       } catch(err) {}
       const fallbackText = getFallbackAdvice(cleanMessages);
       res.json({ success: true, text: fallbackText });
    }
  });


  // Song API
  app.post("/api/users/:id/song", async (req, res) => {
    try {
      const userId = req.params.id;
      const { songTitle, songData } = req.body;
      if (!songTitle || !songData) return res.status(400).json({ error: "Missing data" });
      await db.execute(
        "INSERT INTO user_songs (user_id, song_title, song_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE song_title = VALUES(song_title), song_data = VALUES(song_data)",
        [userId, songTitle, songData]
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error(e.message);
      res.status(500).json({ error: "Server Error" });
    }
  });

  app.get("/api/users/:id/song", async (req, res) => {
    try {
      const [rows]: any = await db.execute("SELECT song_title, song_data FROM user_songs WHERE user_id = ?", [req.params.id]);
      if (rows && rows.length > 0) {
         res.json({ success: true, data: rows[0] });
      } else {
         res.json({ success: false });
      }
    } catch (e: any) {
      res.json({ success: false });
    }
  });

  // Fetch historical swipes for a user (needed for profile filtering logic)
  app.get("/api/users/:userId/swipes", async (req, res) => {
    try {
      const { userId } = req.params;
      try {
        const [rows]: any = await db.execute(
          "SELECT target_user_id, action FROM swipes WHERE user_id = ?",
          [userId]
        );
        const formatted = rows.map((r: any) => ({
           target_user_id: Number(r.target_user_id),
           action: String(r.action).trim().toLowerCase()
        }));
        return res.json({ success: true, data: formatted });
      } catch (err: any) {
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
      try {
        const [rows]: any = await db.execute("SELECT id, email, profile_data FROM users");
        const users = [];
        for (const row of rows) {
            let profileData = row.profile_data || {};
            if (typeof profileData === 'string') {
                try { profileData = JSON.parse(profileData); } catch(e){}
            }
            const [imgRows]: any = await db.execute("SELECT image_url FROM user_images WHERE user_id = ?", [row.id]);
            if (imgRows && imgRows.length > 0) {
                profileData.images = imgRows.map((r: any) => r.image_url);
            }
            
            const [songRows]: any = await db.execute("SELECT song_title FROM user_songs WHERE user_id = ?", [row.id]);
            if (songRows && songRows.length > 0) {
                profileData.songTitle = songRows[0].song_title;
                // Don't include song_data here to keep the API fast, the frontend will fetch it via the /api/users/:id/song endpoint when playing
            }
            
            row.profile_data = profileData;
            users.push(row);
        }
        return res.json({ success: true, data: users });
      } catch (err: any) {
         return res.json({ success: true, data: mockUsers });
      }
    } catch (e) {
      res.status(500).json({ error: "Lỗi Server" });
    }
  });

  // Handle Likes/Swipes and creating Matches
  app.post("/api/matches/swipe", async (req, res) => {
    try {
      const { user_id, target_user_id, action } = req.body; 
      const swipeAction = normalizeSwipeAction(action);
      if (!user_id || !target_user_id || !swipeAction) {
        return res.status(400).json({ success: false, error: "Thiếu dữ liệu swipe" });
      }

      // Thả tim = gửi lời kết bạn (pending); khi cả hai đều like => tạo match
      if (swipeAction === 'like') {
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
  app.post("/api/likes/accept", async (req, res) => {
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
      
      try {
        const [rows]: any = await db.execute(`
          SELECT u.id as user_id, u.email, u.profile_data
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
            "SELECT users.id as user_id, users.email, users.profile_data FROM likes JOIN users ON likes.user_id = users.id WHERE likes.target_user_id = ?",
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
                       email: u.email,
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
      try {
        const [rows]: any = await db.execute(
          `SELECT m.id as match_id, u.id as user_id, u.email, u.profile_data 
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
               email: u.email,
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
      const userId = req.query.user_id as string;
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

        // ưu tiên schema chuẩn: messages.text / messages.is_image
        try {
          const [rows]: any = await db.execute(
            "SELECT id, match_id, sender_id, text, is_image, created_at FROM messages WHERE match_id = ? ORDER BY created_at ASC",
            [matchId]
          );
          return res.json({ success: true, data: rows });
        } catch (errText: any) {
          // fallback schema cũ: messages.content
          const [rows]: any = await db.execute(
            "SELECT id, match_id, sender_id, content, created_at FROM messages WHERE match_id = ? ORDER BY created_at ASC",
            [matchId]
          );
          const mapped = (rows || []).map((r: any) => ({
            ...r,
            text: r.text ?? r.content,
            is_image: typeof r.content === 'string' ? r.content.startsWith('data:image/') : false,
          }));
          return res.json({ success: true, data: mapped });
        }
      } catch (err: any) {
        console.error("DB GET messages failed:", err.message);
        const data = mockMessages
          .filter(m => m.match_id.toString() === matchId.toString())
          .map((m: any) => ({
            ...m,
            text: m.text ?? m.content,
            is_image: !!m.is_image || (typeof m.content === 'string' && m.content.startsWith('data:image/')),
          }));
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
