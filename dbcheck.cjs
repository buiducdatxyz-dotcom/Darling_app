const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
    try {
        const db = mysql.createPool({
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "darling_app",
        });
        const [rows] = await db.query("SHOW TABLES");
        console.log("Tables:", rows);
        const [schemaColumns] = await db.query(`
          SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          ORDER BY TABLE_NAME, ORDINAL_POSITION
        `);
        console.log("Schema columns:");
        for (const column of schemaColumns) {
          console.log(`  ${column.TABLE_NAME}.${column.COLUMN_NAME} ${column.COLUMN_TYPE}${column.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''}${column.COLUMN_KEY ? ` [${column.COLUMN_KEY}]` : ''}${column.EXTRA ? ` ${column.EXTRA}` : ''}`);
        }
        const [indexes] = await db.query(`
          SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS_IN_INDEX, NON_UNIQUE
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
          GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
          ORDER BY TABLE_NAME, INDEX_NAME
        `);
        console.log("Indexes:", indexes);
        const [premiumColumns] = await db.query("SHOW COLUMNS FROM users WHERE Field = 'is_premium'");
        const [advertisementColumns] = await db.query("SHOW COLUMNS FROM advertisements");
        const [swipeColumns] = await db.query("SHOW COLUMNS FROM swipes");
        const [counts] = await db.query("SELECT (SELECT COUNT(*) FROM users) AS profiles, (SELECT COUNT(*) FROM user_images) AS images, (SELECT COUNT(*) FROM advertisements) AS advertisements, (SELECT COUNT(*) FROM moments) AS moments, (SELECT COUNT(*) FROM moment_reactions) AS moment_reactions");
        console.log("Premium flag:", premiumColumns.length ? "ready" : "missing");
        console.log("Swipe history key:", swipeColumns.some(column => column.Field === 'id') ? "id column ready" : "id column missing");
        console.log("Advertisement columns:", advertisementColumns.map(column => column.Field));
        console.log("Row counts:", counts[0]);
        const [cols] = await db.query("DESCRIBE messages");
        console.log("Messages columns:", cols);
        process.exit(0);
    } catch(e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
