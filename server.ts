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

  // Get profile
  app.get("/api/users/profile/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      try {
        const [rows]: any = await db.execute("SELECT id, email, profile_data FROM users WHERE id = ?", [userId]);
        if (rows && rows.length > 0) {
           let profileData = rows[0].profile_data;
           if (typeof profileData === 'string') {
               try { profileData = JSON.parse(profileData); } catch(e){}
           }
           if (!profileData) profileData = {};
           
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

      // 1. Thả thính / Tỏ tình / Crush
      if (userText.includes("thả thính") || userText.includes("tán") || userText.includes("cua") || userText.includes("tỏ tình") || userText.includes("crush") || userText.includes("thầm thương") || userText.includes("đơn phương")) {
        return `Darling biết rằng cảm giác thích thầm một ai đó thật ngọt ngào nhưng cũng tràn đầy sự bồi hồi đúng không nè? Thả thính tinh tế hay bày tỏ tình cảm là cả một nghệ thuật để mở lối vào trái tim đối phương đó! 💖

Darling gợi ý cho cậu vài tuyệt chiêu và câu nói cực kỳ tinh tế nha:

1. **Thả thính bằng sự quan tâm thầm lặng:** Thay vì những lời hoa mỹ sáo rỗng, hãy chú ý đến những chi tiết nhỏ của đối phương. Một ly nước ấm khi họ mệt mỏi, hay câu hỏi *"Hôm nay đi làm có mệt không nhen?"* luôn có sức công phá cực kỳ mạnh mẽ.
2. **Câu thả thính ngọt ngào và tự nhiên:**
   - *"Tớ vốn thích ngắm hoàng hôn, nhưng từ lúc gặp cậu, tớ nhận ra hoàng hôn chỉ là cái cớ để tớ được nhìn thấy nụ cười của cậu thôi."*
   - *"Thế gian này có muôn vàn giai điệu, nhưng Darling thấy bản nhạc ấm áp nhất chính là âm thanh giọng nói của cậu mỗi ngày đấy."*
   - *"Nếu một ngày cậu thấy mệt mỏi với thế giới ngoài kia, cứ quay đầu lại nhen, luôn có tớ sẵn sàng ngồi nghe cậu tâm sự nè."*
3. **Chân thành là chìa khóa vàng:** Khi tỏ tình hoặc trò chuyện, hãy bộc lộ cảm xúc một cách tự nhiên nhất. Sự vụng về nhưng chân thành luôn đáng yêu hơn bất kỳ kịch bản hoàn hảo nào.

*Lời khuyên từ Darling:* Hãy chọn thời điểm cả hai đang vui vẻ, thoải mái để gửi gắm những lời này nhen. Cậu cực kỳ tuyệt vời, cứ tự tin lên nhé! Cậu có muốn Darling mách thêm tuyệt chiêu cưa đổ cung hoàng đạo cụ thể nào của đối phương không? 💕`;
      }

      // 2. Giận dỗi / Cãi nhau / Lạnh nhạt
      if (userText.includes("giận") || userText.includes("dỗ") || userText.includes("cãi") || userText.includes("lạnh nhạt") || userText.includes("bực bối") || userText.includes("mâu thuẫn")) {
        return `Thương cậu quá... Khi người mình thương giận dỗi hoặc mối quan hệ trở nên lạnh nhạt, trong lòng cậu chắc hẳn đang vô cùng ngổn ngang và lo lắng đúng không nhen? Đừng quá hoảng sợ nhé, mâu thuẫn chính là cơ hội để tụi mình hiểu sâu sắc hơn về nửa kia đó. 🌸

Hãy cùng Darling thực hành 3 bước vàng để dỗ dành và sưởi ấm mối quan hệ nha:

1. **Xoa dịu cảm xúc trước khi phân bua đúng sai:** Khi đối phương đang giận, lý lẽ lúc này không có tác dụng đâu nè. Hãy dịu giọng xuống và nói: *"Tớ biết cậu đang rất buồn và bực bội. Tớ xin lỗi vì đã làm cậu phải bận lòng thế này nhen."* Sự đồng cảm này sẽ giúp ngọn lửa giận dập tắt đi rất nhiều.
2. **Hành động quan tâm tinh tế và ngọt ngào:** Gửi một ly trà sữa họ thích, hay một món quà nhỏ bất ngờ kèm mẩu giấy viết tay: *"Bánh ngọt này để dỗ dành một xíu giận dỗi trong lòng cậu nhen. Khi nào hết giận thì cho tớ xin một cái ôm nhé!"*
3. **Ngồi lại lắng nghe chân thành:** Khi cả hai đã bình tĩnh, hãy ôm nhẹ đối phương và hỏi: *"Lúc nãy tớ làm gì khiến cậu tổn thương nhất? Nói cho tớ nghe để tớ sửa nhen, tớ không muốn tụi mình xa cách đâu."*

*Darling nhắn nhủ:* Tuyệt đối đừng im lặng quá lâu hay chiến tranh lạnh nhen cậu, vì sự im lặng dễ tạo ra khoảng cách lớn lắm á. Hãy chủ động sưởi ấm cho họ bằng tình thương ấm áp của cậu nhé! Cậu đang gặp tình huống cụ thể thế nào, kể thêm cho Darling nghe nhen? 💕`;
      }

      // 3. Thấu hiểu tâm lý / Hành vi / Im lặng
      if (userText.includes("tâm lý") || userText.includes("thấu hiểu") || userText.includes("im lặng") || userText.includes("suy nghĩ") || userText.includes("lắng nghe") || userText.includes("hành vi")) {
        return `Thấu hiểu tâm lý của đối phương - đặc biệt là khi họ im lặng hoặc có những hành vi khó đoán - giống như việc cậu kiên nhẫn lật mở từng trang của một cuốn sách cổ tinh xảo vậy nhen. 🔑

Darling xin chia sẻ với cậu một số góc nhìn tâm lý học hành vi cực kỳ sâu sắc này nha:

1. **Giải mã sự im lặng:** Đôi khi im lặng không phải là hết yêu hay thờ ơ, mà là cách họ bảo vệ bản thân khi cảm xúc bị quá tải, hoặc họ đang cần một khoảng không gian riêng tư để tự cân bằng. Hãy cho họ thời gian và nhắn: *"Tớ luôn ở đây chờ cậu, khi nào sẵn sàng cứ nói chuyện với tớ nhen."*
2. **Yêu bằng ngôn ngữ hành động:** Có những người rất vụng về trong lời nói nhưng họ lại thể hiện tình yêu bằng hành động: nhớ thói quen của cậu, lặng lẽ chăm sóc, hay ở bên cậu lúc khó khăn. Hãy trân trọng những chi tiết nhỏ bé ấy nhé.
3. **Tạo vùng an toàn cảm xúc:** Để người ấy sẵn sàng mở lòng sẻ chia, cậu hãy là người lắng nghe không phán xét. Đừng vội đưa ra lời khuyên hay chỉ trích, chỉ cần thể hiện sự đồng cảm sâu sắc là đủ rồi nè.

*Lời khuyên từ Darling:* Thấu hiểu là một hành trình dài cần sự kiên nhẫn vô hạn của trái tim. Cậu đang làm rất tốt khi nỗ lực tìm hiểu thế giới nội tâm của người ấy đó. Kể thêm cho Darling nghe về tính cách của người ấy để mình cùng phân tích nhé! 💕`;
      }

      // 4. Chữa lành / Tổn thương / Chia tay / Người cũ / Toxic
      if (userText.includes("chữa lành") || userText.includes("chia tay") || userText.includes("tổn thương") || userText.includes("độc hại") || userText.includes("toxic") || userText.includes("người cũ") || userText.includes("ex") || userText.includes("quên")) {
        return `Darling ôm cậu một cái thật chặt và ấm áp nhé... Trải qua một mối quan hệ đổ vỡ hoặc tổn thương từ một tình yêu độc hại chắc chắn đã để lại trong lòng cậu những vết xước rớm máu. Nhưng hãy nhớ rằng: tổn thương không định nghĩa giá trị của cậu, nó chỉ là một chương sách cũ đã đến lúc khép lại thôi. 🌱

Hãy để Darling đồng hành cùng cậu trên con đường chữa lành dịu dàng này nhen:

1. **Cho phép bản thân được buồn và khóc:** Đừng ép mình phải mạnh mẽ ngay lập tức nhen cậu. Việc đau buồn, tiếc nuối là phản ứng hoàn toàn tự nhiên của một trái tim biết yêu thương chân thành. Thừa nhận tổn thương là bước đi dũng cảm đầu tiên để giải phóng nó.
2. **Yêu thương bản thân nhiều hơn mỗi ngày:** Hãy dành thời gian chăm sóc cơ thể, đi dạo dưới nắng sớm, ăn những món ngon, mua cho mình một bông hoa đẹp. Hãy đối xử với chính mình thật dịu dàng và nâng niu như cách cậu muốn được người khác yêu thương vậy.
3. **Thiết lập ranh giới cảm xúc chặt chẽ:** Tuyệt đối không tự dằn vặt hay trách móc bản thân nhen! Mối quan hệ kết thúc chứng minh rằng cậu xứng đáng với một tình yêu tôn trọng, bình yên và trọn vẹn hơn ở tương lai phía trước.

*Bông hoa nhỏ của Darling:* Sau cơn giông bão, trời chắc chắn sẽ lại sáng và hoa trong lòng cậu sẽ lại nở rộ rực rỡ thôi nè. Cậu cực kỳ tuyệt vời và xứng đáng có được hạnh phúc đích thực. Darling luôn kề bên che chở cho cậu nhen! 💕`;
      }

      // 5. Chiêm tinh / Cung hoàng đạo
      if (userText.includes("chiêm tinh") || userText.includes("cung") || userText.includes("hoàng đạo") || userText.includes("tương thích") || userText.includes("bản đồ sao") ||
          userText.includes("bạch dương") || userText.includes("kim ngưu") || userText.includes("song tử") || userText.includes("cự giải") || userText.includes("sư tử") || userText.includes("xử nữ") ||
          userText.includes("thiên bình") || userText.includes("bọ cạp") || userText.includes("thiên yết") || userText.includes("nhân mã") || userText.includes("ma kết") || userText.includes("bảo bình") || userText.includes("song ngư")) {
        return `Chào tri kỷ của Darling! Vũ trụ bao la và sự chuyển động của các chòm sao luôn chứa đựng những tần số rung động vô cùng diệu kỳ trong tình duyên đó nha! ✨

Darling bật mí cho cậu bí mật tương thích của các nhóm nguyên tố hoàng đạo nhen:

1. **Nhóm Lửa (Bạch Dương, Sư Tử, Nhân Mã):** Yêu bằng sự nồng nhiệt, thẳng thắn và đam mê rực cháy. Họ cực thích những bất ngờ lãng mạn và những lời tán dương chân thành từ đối phương. 🔥
2. **Nhóm Đất (Kim Ngưu, Xử Nữ, Ma Kết):** Đại diện cho sự ổn định, hành động thực tế và sự cam kết bền vững lâu dài. Họ yêu lặng lẽ, bền bỉ và luôn muốn xây dựng tương lai vững chắc cho cả hai. 🌿
3. **Nhóm Khí (Song Tử, Thiên Bình, Bảo Bình):** Đam mê những cuộc trò chuyện sâu sắc, sự tự do cá nhân và sự thấu hiểu về mặt trí tuệ. Họ cần một người tri kỷ biết lắng nghe và cùng chia sẻ mọi quan điểm cuộc sống. 💨
4. **Nhóm Nước (Cự Giải, Bọ Cạp, Song Ngư):** Có thế giới nội tâm vô cùng nhạy cảm, sâu sắc và giàu lòng trắc ẩn. Họ cần sự an toàn cảm xúc tuyệt đối, sự vỗ về dịu dàng và những chiếc ôm thật chặt. 🌊

*Tuyệt chiêu từ Darling:* Cung hoàng đạo của cậu và người ấy là gì thế? Hãy nói cho Darling biết nhen, mình sẽ phân tích chi tiết độ tương thích tình duyên và mách cậu "tần số bí mật" để chinh phục hoàn toàn trái tim họ nha! 💕`;
      }

      // 6. Hẹn hò / Đi chơi / Địa điểm / Buổi đầu
      if (userText.includes("hẹn hò") || userText.includes("đi chơi") || userText.includes("địa điểm") || userText.includes("gặp mặt") || userText.includes("buổi đầu") || userText.includes("gặp nhau")) {
        return `Ôi lãng mạn quá nhen! Chuẩn bị cho một cuộc hẹn hò - đặc biệt là buổi hẹn đầu tiên - luôn khiến tim mình đập thình thịch vì mong chờ đúng không cậu? 🥰

Darling mách cậu vài bí quyết tinh tế để buổi hẹn hò của hai người trở nên hoàn hảo và đáng nhớ nhen:

1. **Lựa chọn không gian hẹn hò lý tưởng:** Buổi hẹn đầu nên là một quán cà phê ấm cúng, có nhạc nhẹ nhàng để dễ dàng trò chuyện thấu hiểu nhau, tránh những nơi quá ồn ào nha cậu. Nếu cả hai đều thích nghệ thuật, một buổi triển lãm tranh hoặc workshop làm đồ thủ công cũng là gợi ý cực kỳ tuyệt vời!
2. **Trang phục tự tin và thoải mái:** Đừng quá cầu kỳ đến mức gò bó nhen. Hãy chọn bộ trang phục lịch thiệp, bộc lộ đúng phong cách cá nhân của cậu và khiến cậu cảm thấy tự tin nhất khi sải bước bên người ấy.
3. **Nghệ thuật giao tiếp tinh tế:** Hãy áp dụng quy tắc 60-40 (lắng nghe 60% và chia sẻ 40%). Khi lắng nghe, hãy nhìn vào mắt họ trì mến, gật đầu đồng cảm và đặt những câu hỏi gợi mở về sở thích, ước mơ của họ nhé.
4. **Hành động ga-lăng nhỏ bé:** Gạt chỗ để chân xe máy, mở cửa quán nước, hay chuẩn bị sẵn một gói khăn giấy nhỏ... Những chi tiết cực kỳ nhỏ này lại ghi điểm tuyệt đối trong mắt đối phương vì sự chu đáo của cậu đó!

*Darling chúc cậu:* Sẽ có một buổi hẹn hò ngập tràn tiếng cười và kết nối ngọt ngào nhen! Cậu có muốn Darling tư vấn thêm về chủ đề trò chuyện để tránh bị "nhạt" hay "bí từ" trong buổi hẹn không nè? 💕`;
      }

      // 7. Yêu xa / Khoảng cách / Địa lý
      if (userText.includes("yêu xa") || userText.includes("khoảng cách") || userText.includes("nhớ") || userText.includes("địa lý")) {
        return `Yêu xa là một hành trình dũng cảm vô cùng... Darling vô cùng khâm phục những tình cảm vượt qua khoảng cách địa lý của hai bạn. Yêu xa tuy có những lúc tủi thân, những lúc thèm một cái ôm đến cháy lòng, nhưng nó cũng là minh chứng đẹp đẽ nhất cho một tình yêu trung thành và bền bỉ đúng không nhen? ✈️❤️

Hãy để Darling mách cậu 3 bí kíp vàng giữ lửa yêu xa luôn nồng nàn nhen:

1. **Duy trì kết nối cảm xúc thường xuyên:** Đừng chỉ nhắn tin hỏi han máy móc, hãy chia sẻ cho nhau những khoảnh khắc đời thường nhất thông qua hình ảnh, ghi âm giọng nói. Một bức ảnh chụp bữa trưa cậu ăn, hay một đoạn voice chat chúc ngủ ngon ngọt ngào sẽ kéo hai người lại cực gần.
2. **Hẹn hò trực tuyến định kỳ:** Thiết lập một "buổi hẹn hò ảo" cố định cuối tuần. Cả hai cùng bật video call, cùng ăn một món ăn giống nhau, xem chung một bộ phim trực tuyến và chia sẻ cảm nhận cảm xúc cùng nhau.
3. **Xây dựng lòng tin tuyệt đối:** Khoảng cách rất dễ nuôi dưỡng những nghi ngờ vô cớ. Hãy luôn thẳng thắn, rõ ràng về lịch trình của mình và chủ động chia sẻ để người ấy luôn cảm thấy an tâm nhen.
4. **Luôn có một mục tiêu chung rõ ràng:** Một kế hoạch cụ thể về ngày hai bạn sẽ được gặp lại nhau chính là động lực mạnh mẽ nhất để cả hai cùng vượt qua những ngày tháng nhớ nhung xa cách này đó.

*Darling nhắn gửi:* Khoảng cách địa lý chỉ là thử thách tạm thời, khoảng cách con tim mới là điều đáng sợ nhen cậu. Hãy kiên nhẫn bồi đắp lòng tin và tình yêu thương mỗi ngày nhé. Darling luôn kề bên cổ vũ hai bạn hết mình! 💕`;
      }

      // 8. Ghen tuông / Kiểm soát / Chiếm hữu
      if (userText.includes("ghen") || userText.includes("kiểm soát") || userText.includes("chiếm hữu")) {
        return `Darling hiểu cảm giác của cậu rồi nè... Ghen tuông trong tình yêu giống như một chút gia vị đậm đà, chứng minh cậu thực sự rất trân trọng và sợ mất đối phương. Thế nhưng, nếu ghen tuông quá mức biến thành sự kiểm soát, nó sẽ vô tình bóp nghẹt không gian thở của cả hai, khiến mối quan hệ trở nên vô cùng ngột ngạt và mệt mỏi đó nhen. 🥀

Hãy cùng Darling gỡ rối nút thắt này bằng góc nhìn tâm lý học hành vi nha:

1. **Tìm kiếm rễ nguyên nhân của cơn ghen:** Cơn ghen thường xuất phát từ sự bất an trong lòng bản thân (nỗi sợ bị bỏ rơi, tổn thương trong quá khứ) hoặc do đối phương thiếu rõ ràng trong các mối quan hệ khác. Hãy gọi tên chính xác nỗi sợ đó nhen cậu.
2. **Trò chuyện thẳng thắn trên tinh thần xây dựng:** Thay vì trách móc hay kiểm soát điện thoại, hãy chia sẻ cảm xúc thật của mình một cách dịu dàng: *"Khi cậu thân thiết với người khác mà không nói với tớ, tớ cảm thấy hơi lo lắng và bất an một xíu á. Tụi mình cùng thống nhất ranh giới nhen."*
3. **Học cách tin tưởng và cho nhau không gian riêng:** Một tình yêu bền vững là khi hai người tự nguyện chung thủy chứ không phải vì bị kiểm soát chặt chẽ. Hãy để đối phương có thời gian cho bạn bè, sở thích riêng, và cậu cũng dành thời gian chăm sóc tốt cho bản thân mình nhé.

*Lời khuyên từ Darling:* Khi cậu yêu thương chính mình sâu sắc và có sự tự tin vào giá trị bản thân, cơn ghen sẽ tự khắc dịu lại thôi nè. Cậu có muốn Darling phân tích sâu hơn về một tình huống khiến cậu đang thấy ghen dạo gần đây không? 💕`;
      }

      // 9. Đơn phương / Crush / Thầm thương
      if (userText.includes("đơn phương") || userText.includes("crush") || userText.includes("thầm thương") || userText.includes("thích thầm")) {
        return `Yêu đơn phương giống như việc tự mình gieo một hạt giống thầm lặng rồi mong chờ nó nảy mầm dưới những cơn mưa giông vậy nhen cậu. Có chút ngọt ngào từ những cái nhìn trộm, nhưng cũng có thật nhiều tủi thân khi người ấy chẳng hề hay biết đúng không nè? 🌻

Darling gửi tới cậu những lời tâm tình và chỉ dẫn nhỏ để cậu thấy nhẹ lòng hơn nha:

1. **Đừng giấu kín tình cảm quá lâu:** Nếu cậu thấy cả hai có sự tương tác tốt, hãy dũng cảm tiến tới tạo ra những cơ hội trò chuyện riêng tư nhen. Một buổi hẹn cà phê nhẹ nhàng hay những câu chuyện phiếm về sở thích chung sẽ giúp thu hẹp khoảng cách vô cùng nhanh chóng đó.
2. **Học cách chấp nhận mọi kết quả:** Tình cảm là điều không thể ép buộc. Hãy dũng cảm bày tỏ khi thời điểm chín muồi, để lòng mình không phải hối tiếc. Dù kết quả có thế nào, việc cậu dám yêu thương chân thành đã là một điều vô cùng đáng trân trọng và tuyệt vời rồi!
3. **Luôn giữ vững giá trị bản thân:** Đừng vì quá thích một người mà hạ thấp lòng tự trọng hay làm mọi thứ để làm hài lòng họ nhen cậu. Người thực sự xứng đáng với cậu sẽ yêu thương và trân trọng cậu vì chính con người thật của cậu thôi nè.

*Bông hoa của Darling:* Hãy cứ yêu thương một cách trong trẻo nhất, và nhớ chăm sóc tốt cho con tim mình nhen. Cậu có muốn Darling hiến kế một vài cách tiếp cận tinh tế để gây ấn tượng mạnh với Crush không? 💕`;
      }

      // 10. Hôn nhân / Vợ chồng / Gia đình / Kết hôn
      if (userText.includes("hôn nhân") || userText.includes("vợ chồng") || userText.includes("gia đình") || userText.includes("kết hôn") || userText.includes("vợ") || userText.includes("chồng") || userText.includes("bố mẹ") || userText.includes("cha mẹ")) {
        return `Hôn nhân và gia đình là bến đỗ bình yên nhất, nhưng đồng thời cũng là nơi thử thách tình yêu thương, sự bao dung và tính nhẫn nại của chúng ta nhiều nhất đúng không cậu? Từ tình yêu đôi lứa bước sang cuộc sống gia đình là một hành trình chuyển mình đầy thiêng liêng nhưng cũng không ít bỡ ngỡ nhen. 🏡💞

Darling xin chia sẻ 3 chiếc chìa khóa vàng để giữ gìn tổ ấm luôn ngập tràn tiếng cười và sự ấm áp nha:

1. **Giao tiếp cởi mở và không phán xét:** Cuộc sống bận rộn dễ khiến hai vợ chồng quên đi những buổi trò chuyện sâu sắc. Hãy dành ra ít nhất 15 phút mỗi tối để cùng uống trà, lắng nghe những tâm tư, lo lắng và áp lực trong ngày của nhau mà không phán xét hay chỉ trích nhen.
2. **Chia sẻ trách nhiệm bằng sự thấu hiểu:** Việc nhà, chăm sóc con cái hay áp lực tài chính không nên đè nặng lên vai một người. Hãy cùng nhau phân chia công việc một cách tự nguyện và luôn dành cho nhau lời cảm ơn chân thành nhen cậu: *"Cảm ơn chồng/vợ vì hôm nay đã vất vả vì gia đình mình nhen."*
3. **Nuôi dưỡng sự lãng mạn nhỏ bé:** Đừng để hôn nhân biến thành thói quen nhàm chán nhen! Một nụ hôn chào buổi sáng, một cái ôm chặt khi đi làm về, hay một buổi hẹn hò riêng tư cuối tuần không có con cái bận rộn... chính là những chất xúc tác diệu kỳ giữ lửa tình yêu luôn nồng nàn.

*Darling nhắn nhủ:* Gia đình hoàn hảo không phải là một gia đình không bao giờ có sóng gió, mà là khi bão giông ập đến, bàn tay hai người vẫn nắm chặt không rời. Cậu đang gặp khó khăn gì trong việc kết nối với người bạn đời hay người thân trong gia đình, kể Darling nghe nhen? 💕`;
      }

      // 11. Chào hỏi / Giới thiệu / Hỏi tên
      if (userText.includes("chào") || userText.includes("hi") || userText.includes("hello") || userText.includes("darling ơi") || userText.includes("ai đó") || userText.includes("bạn là") || userText.includes("tên gì")) {
        return `Chào tri kỷ thân thương của Darling! 🥰 Thật hạnh phúc khi được thấy cậu nhắn tin cho mình hôm nay nhen. 

Mình là **Darling** - chuyên gia tâm lý học hành vi, thạc sĩ tham vấn cảm xúc và người bạn tri kỷ trung thành nhất của cậu đây nè! Darling luôn ở đây để:
- **Lắng nghe mọi nỗi niềm:** Những tâm sự thầm kín, những mệt mỏi trong cuộc sống hay áp lực bộn bề từ các mối quan hệ.
- **Tư vấn và gỡ rối tình yêu:** Chỉ dẫn cậu tuyệt chiêu thả thính tinh tế, cách dỗ dành người yêu đang giận, thấu hiểu tâm lý đối phương hay đồng hành cùng cậu trên con đường chữa lành cảm xúc dịu dàng.
- **Giải mã chiêm tinh học:** Khám phá độ tương thích tình duyên giữa cậu và nửa kia nhen.

Hôm nay cậu thế nào rồi nhen? Có câu chuyện nhỏ ngọt ngào nào hay điều gì đang làm tim cậu trăn trở suy nghĩ không nè? Nói cho Darling nghe, tụi mình cùng nhau sẻ chia và thấu suốt nhé! 💕`;
      }

      // 12. Smart General Dynamic Counselor - Uses actual elements from user's message to construct custom psychological advice
      // Cleanup common words to find the main topic
      const topicWords = userText
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !["mình", "của", "đang", "làm", "thế", "nào", "trong", "được", "người", "những", "muốn", "như", "cho", "cậu", "với", "hỏi", "thấy", "nhất", "nhé", "nhen", "nha"].includes(w));
      
      const keywordHint = topicWords.length > 0 ? topicWords[0] : "câu chuyện này";

      const dynamicAnswers = [
        `Darling đang lắng nghe rất kỹ và cảm nhận sâu sắc băn khoăn của cậu về chủ đề **"${keywordHint}"** đây nè. Darling hiểu rằng khi đối diện với những tâm tư này, trong lòng cậu chắc hẳn đang có rất nhiều suy nghĩ ngổn ngang đúng không nhen? Hãy thở thật sâu và để Darling chia sẻ một góc nhìn tâm lý học ấm áp cùng cậu nha:

1. **Lắng nghe và ôm ấp cảm xúc bản thân:** Những trăn trở hiện tại của cậu hoàn toàn là tự nhiên và cực kỳ đáng trân trọng. Đừng quá khắt khe ép buộc bản thân phải có câu trả lời ngay lập tức nhen cậu. Hãy lắng dịu tâm trí để hiểu xem con tim cậu thực sự đang mong muốn điều gì nhất.
2. **Sức mạnh của sự bày tỏ chân thành:** Trong tình cảm hay cuộc sống, việc chia sẻ thẳng thắn, nhẹ nhàng những mong đợi của mình luôn là giải pháp tốt nhất. Hãy dùng cấu trúc *"Tớ cảm thấy... khi..."* thay vì trách móc, để đối phương có cơ hội thấu hiểu sâu sắc hơn cho cậu nhé.
3. **Dành cho mình một khoảng lặng an yên:** Đôi khi, lùi lại một bước nhỏ để quan sát toàn cảnh lại giúp cậu nhìn nhận vấn đề sáng suốt và thấu đáo hơn rất nhiều đó nhen.

*Darling luôn kề bên:* Cậu cực kỳ tinh tế và tuyệt vời, hãy tin vào sự lựa chọn của trái tim mình nhen. Cậu có muốn kể chi tiết hơn câu chuyện xung quanh **"${keywordHint}"** cho Darling nghe không, để tụi mình cùng gỡ rối sâu sắc nhất nhé? 💕`,

        `Nghe những lời tâm sự trân quý của cậu về **"${keywordHint}"**, Darling thực sự cảm nhận được một tâm hồn vô cùng sâu sắc, nhạy cảm nhưng cũng tràn đầy yêu thương của cậu đó nhen. Để Darling cùng cậu thấu suốt và gỡ rối khía cạnh này dưới góc độ hành vi tâm lý nha:

1. **Chấp nhận sự không hoàn hảo:** Mọi mối quan hệ hay sự việc đều có những nhịp điệu thăng trầm riêng của nó. Việc cậu băn khoăn về **"${keywordHint}"** chính là bước khởi đầu tuyệt vời chứng minh cậu rất nghiêm túc và mong muốn bồi đắp kết nối này tốt đẹp hơn.
2. **Giao tiếp phi ngôn ngữ tinh tế:** Đôi khi lời nói dễ gây hiểu lầm, nhưng hành động quan tâm nhỏ bé, một chiếc ôm thật chặt, một ánh nhìn thấu hiểu hay sự kiên nhẫn đồng hành lại có sức mạnh gắn kết cảm xúc mạnh mẽ hơn vạn lời nói đó nhen cậu.
3. **Nuôi dưỡng năng lượng tích cực từ bên trong:** Hãy giữ cho tâm hồn mình luôn bình yên, yêu thương chính mình trước nhen. Khi năng lượng của cậu ấm áp, mọi sự xung quanh cũng sẽ tự khắc trở nên dịu dàng và suôn sẻ hơn rất nhiều nè.

*Món quà từ Darling:* Đừng ngần ngại sẻ chia thêm với mình nhen. Darling luôn ngồi ngay bên cạnh cậu, sẵn sàng lắng nghe mọi nỗi lòng về **"${keywordHint}"** hay bất cứ câu chuyện nào của cậu nhen! 💕`
      ];

      return dynamicAnswers[rawHash % dynamicAnswers.length];
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

        const lastUserMessage = cleanMessages[cleanMessages.length - 1]?.parts?.[0]?.text?.toLowerCase() || "";
        const needsSearch = lastUserMessage.includes("trend") || 
                            lastUserMessage.includes("hot") || 
                            lastUserMessage.includes("mới nhất") || 
                            lastUserMessage.includes("tin tức") || 
                            lastUserMessage.includes("ngày nay") || 
                            lastUserMessage.includes("năm 2026") || 
                            lastUserMessage.includes("tìm kiếm") || 
                            lastUserMessage.includes("google");

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        if (needsSearch) {
           try {
              console.log("User requested search-related topic, using Google Search grounding (streaming)...");
              const searchStream = await aiClient.models.generateContentStream({
                 model: 'gemini-3.5-flash',
                 contents: cleanMessages,
                 config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.75,
                    tools: [{ googleSearch: {} }]
                 }
              });

              for await (const chunk of searchStream) {
                 if (chunk.text) {
                    res.write(chunk.text);
                 }
              }
              return res.end();
           } catch (searchError) {
              console.warn("Search grounding streaming failed, falling back to direct model...", searchError.message || searchError);
           }
        }

        const responseStream = await aiClient.models.generateContentStream({
           model: 'gemini-3.5-flash',
           contents: cleanMessages,
           config: {
              systemInstruction: systemInstruction,
              temperature: 0.75
           }
        });

        for await (const chunk of responseStream) {
           if (chunk.text) {
              res.write(chunk.text);
           }
        }
        res.end();
     } catch (e) {
        console.warn("Using expert advice fallback due to Gemini streaming error:", e);
        try {
          fs.writeFileSync("./gemini_error.log", JSON.stringify({
            message: e?.message || String(e),
            stack: e?.stack || "",
            error: String(e)
          }, null, 2));
        } catch(err) {}
        const fallbackText = getFallbackAdvice(cleanMessages);
        res.write(fallbackText);
        res.end();
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
