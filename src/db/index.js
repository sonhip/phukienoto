require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
  database: process.env.PGDATABASE || process.env.DB_NAME || "smartlifehub",
  user: process.env.PGUSER || process.env.DB_USER || "smartlifehub",
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || "smartlifehub",
  max: Number(process.env.PGPOOL_MAX || 10),
});

pool.on("error", (err) => {
  console.error("PostgreSQL Pool Idle Warning:", err.message);
});

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

const db = {
  pool,
  ready: null,
  prepare(sql) {
    const text = toPostgresPlaceholders(sql);
    return {
      all: async (...params) => (await pool.query(text, params)).rows,
      get: async (...params) => (await pool.query(text, params)).rows[0],
      run: async (...params) => {
        const queryText = /^(\s*INSERT\s)/i.test(text)
          ? `${text.replace(/;?\s*$/, "")} RETURNING id`
          : text;
        const result = await pool.query(queryText, params);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id,
        };
      },
    };
  },
  async exec(sql) {
    return pool.query(sql);
  },
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const transactionDb = {
        prepare(sql) {
          const text = toPostgresPlaceholders(sql);
          return {
            all: async (...params) => (await client.query(text, params)).rows,
            get: async (...params) =>
              (await client.query(text, params)).rows[0],
            run: async (...params) => {
              const result = await client.query(text, params);
              return { changes: result.rowCount };
            },
          };
        },
      };
      const result = await callback(transactionDb);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

async function initSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      summary TEXT,
      description TEXT,
      original_price INTEGER NOT NULL,
      sale_price INTEGER NOT NULL,
      images TEXT,
      videos TEXT,
      video_url TEXT,
      stock INTEGER DEFAULT 100,
      highlights TEXT,
      specifications TEXT,
      reviews TEXT,
      variants TEXT,
      badge TEXT,
      rating REAL DEFAULT 4.9,
      rating_count INTEGER DEFAULT 120,
      sold_count INTEGER DEFAULT 350,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      order_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      customer_note TEXT,
      payment_method TEXT NOT NULL,
      is_priority INTEGER DEFAULT 0,
      payment_status TEXT DEFAULT 'PENDING',
      order_status TEXT DEFAULT 'PENDING',
      total_amount INTEGER NOT NULL,
      items TEXT NOT NULL,
      transfer_content TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function migrateProductMediaPaths() {
  const columns = ["images", "videos", "video_url", "reviews", "variants"];
  const products = await db
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

  await db.transaction(async (transactionDb) => {
    const update = transactionDb.prepare(
      `UPDATE products SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
    );
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
      if (values.some((value, index) => value !== product[columns[index]])) {
        await update.run(...values, product.id);
      }
    }
  });
}

async function autoAdvanceBankTransferOrders() {
  try {
    const result = await db
      .prepare(
        `UPDATE orders
         SET order_status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
         WHERE payment_method = 'BANK_TRANSFER'
           AND order_status = 'PRIORITY_QUEUE'
           AND created_at <= CURRENT_TIMESTAMP - INTERVAL '5 minutes'`,
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
db.ready = initSchema().then(migrateProductMediaPaths);

module.exports = db;
