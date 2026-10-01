const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function ensureUniqueSlug(slug, productId) {
  const base = slugifyText(slug) || `product-${Date.now()}`;
  let finalSlug = base;
  let index = 2;

  while (
    db
      .prepare("SELECT id FROM products WHERE slug = ? AND id != ?")
      .get(finalSlug, productId)
  ) {
    finalSlug = `${base}-${index}`;
    index += 1;
  }

  return finalSlug;
}

const productUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const folder =
        slugifyText(req.body.slug || req.body.name) || `product-${Date.now()}`;
      const destination = path.join(
        __dirname,
        "../../public/uploads/products",
        folder,
      );
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName =
        slugifyText(path.basename(file.originalname, extension)) || "media";
      callback(null, `${Date.now()}-${baseName}${extension}`);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_PRODUCT_UPLOAD_MB || 100) * 1024 * 1024,
    files: 20,
  },
  fileFilter: (req, file, callback) => {
    if (/^(image|video)\//.test(file.mimetype)) return callback(null, true);
    callback(new Error("Chỉ được upload file ảnh hoặc video."));
  },
});

// MEDIA MANAGER STORAGE & HELPERS
const MEDIA_ROOT = path.resolve(__dirname, "../../public/uploads");
fs.mkdirSync(MEDIA_ROOT, { recursive: true });

function getSafeMediaPath(subPath = "") {
  const cleaned = String(subPath || "")
    .replace(/^(\.\.[\/\\])+/, "")
    .replace(/\0/g, "");
  const resolved = path.resolve(MEDIA_ROOT, cleaned);
  if (!resolved.startsWith(MEDIA_ROOT)) {
    return MEDIA_ROOT;
  }
  return resolved;
}

function getRelMediaPath(absPath) {
  const rel = path.relative(MEDIA_ROOT, absPath).replace(/\\/g, "/");
  return rel === "." ? "" : rel;
}

function getMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"].includes(ext))
    return "image";
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"].includes(ext))
    return "video";
  return "file";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const mediaExplorerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const targetDir = getSafeMediaPath(req.body.dir || "");
      fs.mkdirSync(targetDir, { recursive: true });
      callback(null, targetDir);
    },
    filename: (req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = slugifyText(path.basename(file.originalname, ext)) || "file";
      callback(null, `${Date.now()}-${name}${ext}`);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_PRODUCT_UPLOAD_MB || 100) * 1024 * 1024,
    files: 30,
  },
});

function mediaUrlFromUpload(file) {
  return `/uploads/products/${path.basename(path.dirname(file.path))}/${encodeURIComponent(file.filename)}`;
}

function parseMediaLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseVideos(value) {
  return parseMediaLines(value).map((line) => {
    if (!line.includes("|")) return { title: "Video Sản Phẩm", url: line };
    const [title, ...urlParts] = line.split("|");
    return { title: title.trim(), url: urlParts.join("|").trim() };
  });
}

// Simple admin auth middleware
function adminAuth(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }
  if (req.path === "/login") {
    return next();
  }
  res.redirect("/admin/login");
}

// Login page
router.get("/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.render("admin/login", { title: "Admin Login", error: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === (process.env.ADMIN_USERNAME || "admin") &&
    password === (process.env.ADMIN_PASSWORD || "admin")
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.render("admin/login", {
    title: "Admin Login",
    error: "Sai tài khoản hoặc mật khẩu!",
  });
});

router.get("/logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/admin/login");
});

// Dashboard
router.get("/", adminAuth, (req, res) => {
  const statusFilter = req.query.status || "";
  const search = req.query.search || "";

  let query = "SELECT * FROM orders";
  const params = [];
  const conditions = [];

  if (statusFilter) {
    conditions.push("order_status = ?");
    params.push(statusFilter);
  }
  if (search) {
    conditions.push(
      "(customer_phone LIKE ? OR order_code LIKE ? OR customer_name LIKE ?)",
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY is_priority DESC, id DESC";

  const orders = db
    .prepare(query)
    .all(...params)
    .map((o) => ({
      ...o,
      items: JSON.parse(o.items || "[]"),
    }));

  // Stats
  const stats = {
    total: db.prepare("SELECT COUNT(*) as count FROM orders").get().count,
    priority: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'PRIORITY_QUEUE'",
      )
      .get().count,
    pending: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'PENDING'",
      )
      .get().count,
    confirmed: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'CONFIRMED'",
      )
      .get().count,
    shipping: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'SHIPPING'",
      )
      .get().count,
    delivered: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'DELIVERED'",
      )
      .get().count,
    cancelled: db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE order_status = 'CANCELLED'",
      )
      .get().count,
    totalRevenue: db
      .prepare(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED')",
      )
      .get().total,
  };

  res.render("admin/dashboard", {
    title: "Admin - Quản Lý Đơn Hàng",
    orders,
    stats,
    statusFilter,
    search,
  });
});

// Update order status
router.post("/order/:id/status", adminAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    "PRIORITY_QUEUE",
    "PENDING",
    "CONFIRMED",
    "SHIPPING",
    "DELIVERED",
    "CANCELLED",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }

  const paymentStatus =
    status === "DELIVERED"
      ? "PAID"
      : status === "CANCELLED"
        ? "REFUNDED"
        : undefined;

  let updateQuery =
    "UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP";
  const params = [status];

  if (paymentStatus) {
    updateQuery += ", payment_status = ?";
    params.push(paymentStatus);
  }

  updateQuery += " WHERE id = ?";
  params.push(req.params.id);

  db.prepare(updateQuery).run(...params);

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({ success: true });
  }

  res.redirect("/admin");
});

// Order detail
router.get("/order/:id", adminAuth, (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  if (!order) {
    return res.redirect("/admin");
  }

  order.items = JSON.parse(order.items || "[]");

  res.render("admin/order-detail", {
    title: `Đơn Hàng #${order.order_code}`,
    order,
  });
});

// List Products for Admin
router.get("/products", adminAuth, (req, res) => {
  const products = db
    .prepare("SELECT * FROM products ORDER BY display_order ASC, id ASC")
    .all()
    .map((p) => ({
      ...p,
      images: JSON.parse(p.images || "[]"),
      videos: JSON.parse(p.videos || "[]"),
      reviews: JSON.parse(p.reviews || "[]"),
      variants: JSON.parse(p.variants || "[]"),
    }));

  res.render("admin/products", {
    title: "Admin - Quản Lý Sản Phẩm",
    products,
    deleted: req.query.deleted === "1",
  });
});

// Create Product Page
router.get("/product/new", adminAuth, (req, res) => {
  res.render("admin/product-new", {
    title: "Admin - Tạo Sản Phẩm",
    error: null,
  });
});

// Create Product
router.post(
  "/product/new",
  adminAuth,
  productUpload.fields([
    { name: "image_files", maxCount: 15 },
    { name: "video_files", maxCount: 5 },
  ]),
  (req, res) => {
    const productName = String(req.body.name || "").trim();
    if (!productName) {
      return res.status(400).render("admin/product-new", {
        title: "Admin - Tạo Sản Phẩm",
        error: "Vui lòng nhập tên sản phẩm.",
      });
    }

    const safeSlug = ensureUniqueSlug(req.body.slug || productName, 0);
    const uploadedImages = (req.files?.image_files || []).map(
      mediaUrlFromUpload,
    );
    const uploadedVideos = (req.files?.video_files || []).map((file) => ({
      title: "Video Sản Phẩm",
      url: mediaUrlFromUpload(file),
    }));
    const images = [
      ...parseMediaLines(req.body.images_text),
      ...uploadedImages,
    ];
    const videos = [...parseVideos(req.body.videos_text), ...uploadedVideos];
    const salePrice = Math.max(0, parseInt(req.body.sale_price, 10) || 0);
    const originalPrice = Math.max(
      0,
      parseInt(req.body.original_price, 10) || salePrice,
    );

    const result = db
      .prepare(
        `
      INSERT INTO products (
        name, slug, summary, description, original_price, sale_price,
        images, videos, video_url, highlights, specifications, reviews,
        variants, badge, rating, rating_count, sold_count, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        productName,
        safeSlug,
        String(req.body.summary || "").trim(),
        String(req.body.description || "").trim(),
        originalPrice,
        salePrice,
        JSON.stringify(images),
        JSON.stringify(videos),
        videos[0]?.url || "",
        JSON.stringify(parseMediaLines(req.body.highlights_text)),
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify([]),
        String(req.body.badge || "").trim(),
        Math.min(5, Math.max(0, parseFloat(req.body.rating) || 0)),
        Math.max(0, parseInt(req.body.rating_count, 10) || 0),
        Math.max(0, parseInt(req.body.sold_count, 10) || 0),
        Math.max(0, parseInt(req.body.display_order, 10) || 0),
      );

    res.redirect(`/admin/product/${result.lastInsertRowid}/edit?saved=1`);
  },
);

// Delete Product
router.post("/product/:id/delete", adminAuth, (req, res) => {
  const productId = req.params.id;
  db.prepare("DELETE FROM products WHERE id = ?").run(productId);

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({ success: true, message: "Đã xóa sản phẩm thành công!" });
  }

  res.redirect("/admin/products?deleted=1");
});

// Edit Product Page
router.get("/product/:id/edit", adminAuth, (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(req.params.id);

  if (!product) {
    return res.redirect("/admin/products");
  }

  product.images = JSON.parse(product.images || "[]");
  product.videos = JSON.parse(product.videos || "[]");
  product.highlights = JSON.parse(product.highlights || "[]");
  product.specifications = JSON.parse(product.specifications || "{}");
  product.reviews = JSON.parse(product.reviews || "[]");
  product.variants = JSON.parse(product.variants || "[]");

  res.render("admin/product-edit", {
    title: `Chỉnh Sửa: ${product.name}`,
    product,
    saved: req.query.saved === "1",
  });
});

// MEDIA MANAGEMENT ROUTES & API
router.get("/media", adminAuth, (req, res) => {
  res.render("admin/media", {
    title: "Admin - Quản Lý Thư Viện Media",
  });
});

// API: List Media Files & Folders
router.get("/api/media/list", adminAuth, (req, res) => {
  try {
    const requestedDir = String(req.query.dir || "").trim();
    const absDir = getSafeMediaPath(requestedDir);
    const relDir = getRelMediaPath(absDir);

    if (!fs.existsSync(absDir)) {
      return res.status(404).json({ error: "Thư mục không tồn tại." });
    }

    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // skip hidden files

      const itemAbsPath = path.join(absDir, entry.name);
      const itemRelPath = getRelMediaPath(itemAbsPath);
      const isFolder = entry.isDirectory();
      let stat = { size: 0, mtime: new Date() };

      try {
        stat = fs.statSync(itemAbsPath);
      } catch (e) {}

      const type = isFolder ? "folder" : getMediaType(entry.name);
      const url = isFolder ? "" : `/uploads/${itemRelPath}`;

      items.push({
        name: entry.name,
        relPath: itemRelPath,
        url,
        isFolder,
        size: stat.size,
        sizeFormatted: isFolder ? "-" : formatBytes(stat.size),
        mtime: stat.mtime ? stat.mtime.toISOString() : "",
        type,
      });
    }

    // Sort: Folders first, then files sorted by name
    items.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name, "vi", { numeric: true });
    });

    // Build breadcrumbs
    const parts = relDir ? relDir.split("/").filter(Boolean) : [];
    const breadcrumbs = [{ name: "Root (uploads)", path: "" }];
    let currentAccumulated = "";
    for (const part of parts) {
      currentAccumulated = currentAccumulated
        ? `${currentAccumulated}/${part}`
        : part;
      breadcrumbs.push({ name: part, path: currentAccumulated });
    }

    res.json({
      currentDir: relDir,
      breadcrumbs,
      items,
    });
  } catch (err) {
    console.error("Error listing media:", err);
    res.status(500).json({ error: "Lỗi tải thư viện media." });
  }
});

// API: Upload Files to target directory
router.post(
  "/api/media/upload",
  adminAuth,
  mediaExplorerUpload.array("files", 30),
  (req, res) => {
    try {
      const files = req.files || [];
      const uploaded = files.map((f) => {
        const relPath = getRelMediaPath(f.path);
        return {
          name: f.filename,
          relPath,
          url: `/uploads/${relPath}`,
          size: f.size,
          sizeFormatted: formatBytes(f.size),
          type: getMediaType(f.filename),
        };
      });
      res.json({ success: true, uploaded });
    } catch (err) {
      console.error("Error uploading media:", err);
      res.status(500).json({ error: "Lỗi upload media." });
    }
  },
);

// API: Create Subfolder
router.post("/api/media/folder", adminAuth, (req, res) => {
  try {
    const parentDir = String(req.body.dir || "").trim();
    const folderName =
      slugifyText(req.body.folderName) || `folder-${Date.now()}`;
    const targetAbsDir = getSafeMediaPath(path.join(parentDir, folderName));

    if (fs.existsSync(targetAbsDir)) {
      return res.status(400).json({ error: "Thư mục đã tồn tại." });
    }

    fs.mkdirSync(targetAbsDir, { recursive: true });
    res.json({ success: true, relPath: getRelMediaPath(targetAbsDir) });
  } catch (err) {
    console.error("Error creating folder:", err);
    res.status(500).json({ error: "Lỗi tạo thư mục." });
  }
});

// API: Delete File or Folder
router.post("/api/media/delete", adminAuth, (req, res) => {
  try {
    const targetRelPath = String(req.body.relPath || "").trim();
    if (!targetRelPath) {
      return res.status(400).json({ error: "Không được xóa thư mục gốc." });
    }

    const targetAbsPath = getSafeMediaPath(targetRelPath);
    if (!fs.existsSync(targetAbsPath)) {
      return res
        .status(404)
        .json({ error: "File hoặc thư mục không tồn tại." });
    }

    fs.rmSync(targetAbsPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting media:", err);
    res.status(500).json({ error: "Lỗi xóa media." });
  }
});

// API: Rename File or Folder
router.post("/api/media/rename", adminAuth, (req, res) => {
  try {
    const targetRelPath = String(req.body.relPath || "").trim();
    const newNameRaw = String(req.body.newName || "").trim();

    if (!targetRelPath || !newNameRaw) {
      return res.status(400).json({ error: "Thông tin đổi tên không hợp lệ." });
    }

    const targetAbsPath = getSafeMediaPath(targetRelPath);
    if (!fs.existsSync(targetAbsPath)) {
      return res.status(404).json({ error: "Dữ liệu không tồn tại." });
    }

    const parentAbs = path.dirname(targetAbsPath);
    const ext = path.extname(targetAbsPath);
    const newNameClean =
      slugifyText(path.basename(newNameRaw, ext)) +
      (fs.statSync(targetAbsPath).isDirectory() ? "" : ext);
    const destinationAbs = path.join(parentAbs, newNameClean);

    if (fs.existsSync(destinationAbs)) {
      return res.status(400).json({ error: "Tên mới đã bị trùng lặp." });
    }

    fs.renameSync(targetAbsPath, destinationAbs);
    res.json({ success: true, newRelPath: getRelMediaPath(destinationAbs) });
  } catch (err) {
    console.error("Error renaming media:", err);
    res.status(500).json({ error: "Lỗi đổi tên media." });
  }
});

// Save Edited Product
router.post("/product/:id/edit", adminAuth, (req, res) => {
  const {
    name,
    slug,
    badge,
    original_price,
    sale_price,
    summary,
    description,
    rating,
    rating_count,
    sold_count,
    display_order,
    images_text,
    videos_text,
    highlights_text,
    specs_text,
    reviews_json,
    variants_json,
  } = req.body;

  const productName = String(name || "").trim();
  const safeSlug = ensureUniqueSlug(
    slug && String(slug).trim() ? String(slug).trim() : productName,
    Number(req.params.id),
  );

  // Process images
  const images = (images_text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Process videos
  const videos = (videos_text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("|")) {
        const [title, url] = line.split("|");
        return { title: title.trim(), url: url.trim() };
      }
      return { title: "Video Sản Phẩm", url: line.trim() };
    });

  // Process highlights
  const highlights = (highlights_text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Process specs
  const specifications = {};
  (specs_text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (line.includes(":")) {
        const idx = line.indexOf(":");
        const k = line.substring(0, idx).trim();
        const v = line.substring(idx + 1).trim();
        specifications[k] = v;
      }
    });

  // Process reviews JSON
  let reviews = [];
  try {
    reviews = JSON.parse(reviews_json || "[]");
  } catch (e) {
    reviews = [];
  }

  // Process variants JSON
  let variants = [];
  try {
    variants = JSON.parse(variants_json || "[]");
  } catch (e) {
    variants = [];
  }

  db.prepare(
    `
    UPDATE products SET
      name = ?,
      slug = ?,
      badge = ?,
      original_price = ?,
      sale_price = ?,
      summary = ?,
      description = ?,
      rating = ?,
      rating_count = ?,
      sold_count = ?,
      display_order = ?,
      images = ?,
      videos = ?,
      highlights = ?,
      specifications = ?,
      reviews = ?,
      variants = ?
    WHERE id = ?
  `,
  ).run(
    productName,
    safeSlug,
    badge || "",
    parseInt(original_price) || 0,
    parseInt(sale_price) || 0,
    summary || "",
    description || "",
    Math.min(5, Math.max(0, parseFloat(rating) || 0)),
    Math.max(0, parseInt(rating_count, 10) || 0),
    Math.max(0, parseInt(sold_count, 10) || 0),
    Math.max(0, parseInt(display_order, 10) || 0),
    JSON.stringify(images),
    JSON.stringify(videos),
    JSON.stringify(highlights),
    JSON.stringify(specifications),
    JSON.stringify(reviews),
    JSON.stringify(variants),
    req.params.id,
  );

  res.redirect(`/admin/product/${req.params.id}/edit?saved=1`);
});

// Analytics, Revenue & Order History Route
router.get("/analytics", adminAuth, (req, res) => {
  const range = req.query.range || "all"; // all, 7days, 30days, today
  const search = (req.query.search || "").trim();

  // Metrics
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  const confirmedOrders = db
    .prepare(
      "SELECT COUNT(*) as c FROM orders WHERE order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE')",
    )
    .get().c;

  const totalRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE')",
    )
    .get().total;

  const todayRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE') AND date(created_at) = date('now')",
    )
    .get().total;

  const bankRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_method = 'BANK_TRANSFER' AND order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE')",
    )
    .get().total;

  const codRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_method = 'COD' AND order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE')",
    )
    .get().total;

  const avgOrderValue =
    confirmedOrders > 0 ? Math.round(totalRevenue / confirmedOrders) : 0;

  // Search & Order History Query
  let historyQuery = "SELECT * FROM orders";
  const params = [];
  const conditions = [];

  if (range === "today") {
    conditions.push("date(created_at) = date('now')");
  } else if (range === "7days") {
    conditions.push("created_at >= date('now', '-7 days')");
  } else if (range === "30days") {
    conditions.push("created_at >= date('now', '-30 days')");
  }

  if (search) {
    conditions.push(
      "(customer_phone LIKE ? OR order_code LIKE ? OR customer_name LIKE ? OR customer_address LIKE ?)",
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    historyQuery += " WHERE " + conditions.join(" AND ");
  }

  historyQuery += " ORDER BY id DESC";

  const ordersHistory = db
    .prepare(historyQuery)
    .all(...params)
    .map((o) => ({
      ...o,
      items: JSON.parse(o.items || "[]"),
    }));

  // Daily Chart Data for last 14 days
  const chartData = db
    .prepare(
      `SELECT date(created_at) as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
       FROM orders 
       WHERE order_status IN ('CONFIRMED', 'SHIPPING', 'DELIVERED', 'PRIORITY_QUEUE')
       GROUP BY date(created_at) 
       ORDER BY date(created_at) ASC 
       LIMIT 14`,
    )
    .all();

  res.render("admin/analytics", {
    title: "Admin - Thống Kê Doanh Thu & Lịch Sử Đơn Hàng",
    metrics: {
      totalOrders,
      confirmedOrders,
      totalRevenue,
      todayRevenue,
      bankRevenue,
      codRevenue,
      avgOrderValue,
    },
    ordersHistory,
    chartData,
    range,
    search,
  });
});

module.exports = router;
