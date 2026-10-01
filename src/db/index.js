const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "smartlifehub.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      summary TEXT,
      description TEXT,
      original_price INTEGER NOT NULL,
      sale_price INTEGER NOT NULL,
      images TEXT, -- JSON Array
      videos TEXT, -- JSON Array [{title, url}]
      video_url TEXT,
      stock INTEGER DEFAULT 100,
      highlights TEXT, -- JSON Array
      specifications TEXT, -- JSON Object
      reviews TEXT, -- JSON Array [{name, rating, comment, date, type, media_url}]
      variants TEXT, -- JSON Array [{name, price, original_price, image}]
      badge TEXT,
      rating REAL DEFAULT 4.9,
      rating_count INTEGER DEFAULT 120,
      sold_count INTEGER DEFAULT 350,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      customer_note TEXT,
      payment_method TEXT NOT NULL, -- BANK_TRANSFER, COD
      is_priority INTEGER DEFAULT 0, -- 1 = Priority Queue (Bank transfer)
      payment_status TEXT DEFAULT 'PENDING', -- PENDING, PAID, REFUNDED
      order_status TEXT DEFAULT 'PENDING', -- PRIORITY_QUEUE, PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED
      total_amount INTEGER NOT NULL,
      items TEXT NOT NULL, -- JSON Array [{product_id, name, price, quantity, image}]
      transfer_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec("ALTER TABLE products ADD COLUMN videos TEXT;");
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE products ADD COLUMN variants TEXT;");
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE products ADD COLUMN display_order INTEGER DEFAULT 0;");
  } catch (e) {
    // Column already exists
  }
}

initSchema();

function migrateProductMediaPaths() {
  const columns = ["images", "videos", "video_url", "reviews", "variants"];
  const products = db
    .prepare(
      "SELECT id, images, videos, video_url, reviews, variants FROM products",
    )
    .all();
  const replacePath = (value) => {
    if (typeof value === "string")
      return value.replace(/^\/products\//, "/uploads/products/");
    if (Array.isArray(value)) return value.map(replacePath);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, replacePath(item)]),
      );
    }
    return value;
  };

  const update = db.prepare(
    `UPDATE products SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
  );
  const migrate = db.transaction(() => {
    for (const product of products) {
      const values = columns.map((column) => {
        if (column === "video_url") return replacePath(product[column] || "");
        try {
          return JSON.stringify(
            replacePath(
              JSON.parse(
                product[column] ||
                  (column === "videos" ||
                  column === "images" ||
                  column === "reviews" ||
                  column === "variants"
                    ? "[]"
                    : "{}"),
              ),
            ),
          );
        } catch (error) {
          return product[column] || (column === "video_url" ? "" : "[]");
        }
      });
      if (values.some((value, index) => value !== product[columns[index]]))
        update.run(...values, product.id);
    }
  });
  migrate();
}

migrateProductMediaPaths();

function autoAdvanceBankTransferOrders() {
  try {
    const result = db
      .prepare(
        `UPDATE orders 
         SET order_status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP 
         WHERE payment_method = 'BANK_TRANSFER' 
           AND order_status = 'PRIORITY_QUEUE' 
           AND created_at <= datetime('now', '-5 minutes')`,
      )
      .run();
    if (result.changes > 0) {
      console.log(
        `[Auto-Advance 5min] Automatically advanced ${result.changes} Bank Transfer order(s) to CONFIRMED.`,
      );
    }
  } catch (err) {
    console.error("[Auto-Advance Error]", err);
  }
}

db.autoAdvanceBankTransferOrders = autoAdvanceBankTransferOrders;

module.exports = db;
