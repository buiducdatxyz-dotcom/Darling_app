const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
    try {
        const db = mysql.createPool({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "darling_app",
        });
        const [rows] = await db.query("SHOW TABLES");
        console.log("Tables:", rows);
        const [cols] = await db.query("DESCRIBE messages");
        console.log("Messages columns:", cols);
        process.exit(0);
    } catch(e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
