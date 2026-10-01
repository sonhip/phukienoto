const fs = require("fs");
const path = require("path");
const db = require("../src/db");

function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isImage(file) {
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(file);
}

function isVideo(file) {
  return /\.(mp4|mov|webm|avi|mkv)$/i.test(file);
}

function classifyMount(name) {
  const n = name.toLowerCase();
  // If contains magsafe/mag/iphone12 keywords we classify as Hit Magsafe
  if (
    /magsafe|magnetic|mag|iphone\s*12|iphone12|iphone\s*13|iphone|magnet/i.test(
      n,
    )
  ) {
    return "Hit Magsafe (dành cho iPhone 12+); Magsafe compatible";
  }
  // If contains kẹp / kep / clamp keywords -> Kẹp
  if (/k[eé]p|kep|clamp|grip|kẹp/i.test(n)) {
    return "Kẹp";
  }
  // default: Kẹp
  return "Kẹp";
}

function toPublicMediaUrl(folder, file) {
  return path.posix.join(
    "/uploads/products",
    encodeURIComponent(folder),
    encodeURIComponent(file),
  );
}

async function run() {
  const projectRoot = path.join(__dirname, "..");
  const productsDir = path.join(projectRoot, "public", "uploads", "products");
  if (!fs.existsSync(productsDir)) {
    console.error("Products folder not found:", productsDir);
    process.exit(1);
  }

  console.log("Reading product folders from", productsDir);

  const dirents = fs.readdirSync(productsDir, { withFileTypes: true });
  const folders = dirents.filter((d) => d.isDirectory()).map((d) => d.name);

  // Backup existing products table to data/products-backup-<ts>.json
  try {
    const backup = db.prepare("SELECT * FROM products").all();
    const dataDir = path.join(projectRoot, "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const ts = Date.now();
    const backupPath = path.join(dataDir, `products-backup-${ts}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log("Backed up", backup.length, "products to", backupPath);
  } catch (err) {
    console.warn("Backup failed:", err.message);
  }

  // Delete old products
  try {
    const del = db.prepare("DELETE FROM products").run();
    console.log("Deleted", del.changes, "old products from database");
  } catch (err) {
    console.error("Failed to delete old products:", err.message);
    process.exit(1);
  }

  const insertStmt = db.prepare(`
    INSERT INTO products (name, slug, summary, description, original_price, sale_price, images, videos, video_url, stock, highlights, specifications, variants, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let created = 0;

  for (const folder of folders) {
    const folderPath = path.join(productsDir, folder);
    const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith("."));

    // Use the canonical public/uploads/products files directly.
    const images = files
      .filter(isImage)
      .map((f) => toPublicMediaUrl(folder, f));
    const videos = files.filter(isVideo).map((f) => ({
      title: "Video",
      url: toPublicMediaUrl(folder, f),
    }));
    // fallback placeholder if no image
    if (images.length === 0) {
      images.push("/images/placeholder.jpg");
    }

    const name = folder.replace(/\.+$/, "").trim();
    const slug = slugify(name) || `product-${Date.now()}`;

    // simple pricing heuristics
    let original_price = 199000;
    let sale_price = 129000;
    const n = name.toLowerCase();
    if (n.includes("hud") || n.includes("speedometer") || n.includes("hud")) {
      original_price = 249000;
      sale_price = 169000;
    }
    if (
      n.includes("gương") ||
      n.includes("gương trang điểm") ||
      n.includes("mirror")
    ) {
      original_price = 179000;
      sale_price = 99000;
    }
    if (n.includes("túi") || n.includes("bag") || n.includes("pouch")) {
      original_price = 99000;
      sale_price = 79000;
    }

    const mountType = classifyMount(name);

    const summary = `${name} - Phụ kiện ô tô chất lượng. Loại: ${mountType}`;
    const description = `Sản phẩm: ${name}\n\nMô tả tóm tắt: Đây là sản phẩm phụ kiện ô tô, phù hợp cho người dùng cần tiện lợi và bền bỉ.\n\n(Thông số placeholder — bạn có thể chỉnh sửa sau)`;

    const highlights = [
      "Chất liệu bền, lắp đặt dễ dàng",
      "Thiết kế tiện dụng cho ô tô",
      `Phân loại: ${mountType}`,
    ];

    const specifications = {
      "Thương hiệu": "SmartLifeHub",
      "Bảo hành": "3 tháng (placeholder)",
      "Chất liệu": "ABS/PC (placeholder)",
      "Màu sắc": "Đen/Trắng (tùy chọn)",
    };

    // Build variants: for phone mounts ensure two classifications: Hit Magsafe and Kẹp
    let variants = [];
    const isMount = /giá đỡ|giá đỡ điện thoại|mount|holder|giá\s*đỡ|kẹp/i.test(
      name.toLowerCase(),
    );
    if (isMount) {
      // try to pick a magsafe-specific image and a clamp-specific image from available images
      const basename = (p) => path.posix.basename(p || "").toLowerCase();
      const magsafeRegex = /mag|magsafe|magnet|magnetic/;
      const clampRegex = /k[eé]p|kep|clamp|arm|holder|grip|bracket/;

      const magsafeImg = images.find((p) => magsafeRegex.test(basename(p)));
      const clampImg = images.find((p) => clampRegex.test(basename(p)));

      // fallback: use first/second images
      const primary = images[0] || "";
      const secondary = images[1] || primary;

      const magsafeFinal = magsafeImg || primary;
      const clampFinal = clampImg || secondary || primary;

      // magsafe variant priced slightly higher as placeholder
      const magsafePrice = Math.max(sale_price + 20000, sale_price + 10000);
      variants.push({
        name: "Hit Magsafe (iPhone 12+)",
        price: parseInt(magsafePrice, 10),
        original_price: parseInt(original_price + 20000, 10),
        image: magsafeFinal,
      });
      // clamp variant
      variants.push({
        name: "Kẹp",
        price: parseInt(sale_price, 10),
        original_price: parseInt(original_price, 10),
        image: clampFinal,
      });
    }

    try {
      insertStmt.run(
        name,
        slug,
        summary,
        description,
        parseInt(original_price, 10),
        parseInt(sale_price, 10),
        JSON.stringify(images),
        JSON.stringify(videos),
        videos.length > 0 ? videos[0].url : "",
        100,
        JSON.stringify(highlights),
        JSON.stringify(specifications),
        JSON.stringify(variants || []),
        mountType,
      );
      created += 1;
      console.log(
        `Created product: ${name} (images: ${images.length}, videos: ${videos.length})`,
      );
    } catch (err) {
      console.error("Failed to insert product", name, err.message);
    }
  }

  console.log(`
Import complete: ${created} product(s) created from ${folders.length} folder(s).
Please review products in the admin panel and edit descriptions/specs as needed.
`);
}

run().catch((err) => {
  console.error("Import script failed:", err);
  process.exit(1);
});
