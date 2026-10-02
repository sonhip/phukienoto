require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../src/db");
const {
  getFolder,
  isConfigured,
  uploadFile,
} = require("../src/utils/cloudinary");

const projectRoot = path.join(__dirname, "..");
const mediaRoot = path.join(projectRoot, "public", "uploads");
const shouldDeleteLocal = process.argv.includes("--delete-local");
const cleanupOnly = process.argv.includes("--cleanup-local");
const shouldDryRun = process.argv.includes("--dry-run");
const mediaColumns = ["images", "videos", "video_url", "reviews", "variants"];

function localFilePath(url) {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return null;
  return path.join(projectRoot, "public", url.slice(1));
}

function localRelativePath(filePath) {
  return path.relative(mediaRoot, filePath).replace(/\\/g, "/");
}

function cloudinaryFolderFor(filePath) {
  const relative = localRelativePath(filePath);
  const directory = path.posix.dirname(relative);
  return [getFolder(), directory].filter(Boolean).join("/");
}

function replaceMedia(value, replacements) {
  if (typeof value === "string") return replacements.get(value) || value;
  if (Array.isArray(value))
    return value.map((item) => replaceMedia(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceMedia(item, replacements),
      ]),
    );
  }
  return value;
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath, files);
    else if (entry.name !== ".gitkeep") files.push(fullPath);
  }
  return files;
}

function containsLocalMediaUrl(value) {
  if (typeof value === "string") {
    return value.startsWith("/uploads/") || value.startsWith("/products/");
  }
  if (Array.isArray(value)) return value.some(containsLocalMediaUrl);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsLocalMediaUrl);
  }
  return false;
}

async function main() {
  if (!isConfigured()) {
    throw new Error(
      "Thiếu Cloudinary config. Hãy đặt CLOUDINARY_URL hoặc CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET trong .env.",
    );
  }

  if (!fs.existsSync(mediaRoot)) {
    throw new Error(`Không tìm thấy thư mục media: ${mediaRoot}`);
  }

  const products = db.prepare("SELECT * FROM products").all();

  if (cleanupOnly) {
    if (products.some(containsLocalMediaUrl)) {
      throw new Error(
        "Database vẫn còn URL local. Hãy chạy migrate trước và kiểm tra website rồi mới cleanup.",
      );
    }
    const localFiles = collectFiles(mediaRoot);
    for (const filePath of localFiles) fs.unlinkSync(filePath);
    console.log(`Deleted ${localFiles.length} local media file(s).`);
    return;
  }
  const backupPath = path.join(
    projectRoot,
    "data",
    `products-before-cloudinary-${Date.now()}.json`,
  );
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(products, null, 2));
  console.log(`Database backup: ${backupPath}`);
  const localFiles = new Set();
  const productValues = [];

  for (const product of products) {
    const values = {};
    for (const column of mediaColumns) {
      if (column === "video_url") {
        values[column] = product[column] || "";
        if (localFilePath(values[column]))
          localFiles.add(localFilePath(values[column]));
        continue;
      }
      try {
        const parsed = JSON.parse(
          product[column] ||
            (column === "reviews" || column === "variants" ? "[]" : "[]"),
        );
        values[column] = parsed;
        const collect = (value) => {
          if (typeof value === "string") {
            const filePath = localFilePath(value);
            if (filePath) localFiles.add(filePath);
          } else if (Array.isArray(value)) value.forEach(collect);
          else if (value && typeof value === "object")
            Object.values(value).forEach(collect);
        };
        collect(parsed);
      } catch {
        values[column] = product[column];
      }
    }
    productValues.push({ product, values });
  }

  for (const filePath of collectFiles(mediaRoot)) localFiles.add(filePath);

  const replacements = new Map();
  for (const filePath of localFiles) {
    if (!fs.existsSync(filePath)) {
      console.warn(`SKIP missing: ${localRelativePath(filePath)}`);
      continue;
    }

    const existing = replacements.get(
      `/uploads/${localRelativePath(filePath)}`,
    );
    if (existing) continue;

    const relative = localRelativePath(filePath);
    console.log(`${shouldDryRun ? "Would upload" : "Uploading"}: ${relative}`);
    if (!shouldDryRun) {
      const result = await uploadFile(filePath, {
        folder: cloudinaryFolderFor(filePath),
        resourceType: "auto",
      });
      replacements.set(`/uploads/${relative}`, result.secure_url);
    }
  }

  if (shouldDryRun) {
    console.log(`Dry run complete. Local referenced files: ${localFiles.size}`);
    return;
  }

  const update = db.prepare(
    `UPDATE products SET ${mediaColumns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
  );

  for (const { product, values } of productValues) {
    const updated = mediaColumns.map((column) => {
      const value = replaceMedia(values[column], replacements);
      return column === "video_url" ? value : JSON.stringify(value);
    });
    update.run(...updated, product.id);
  }

  console.log(
    `Updated ${productValues.length} product(s) and ${replacements.size} media URL(s).`,
  );

  if (shouldDeleteLocal) {
    const allFiles = collectFiles(mediaRoot);
    for (const filePath of allFiles) {
      fs.unlinkSync(filePath);
    }
    console.log(`Deleted ${allFiles.length} local media file(s).`);
  } else {
    console.log(
      "Local files were kept. Re-run with --delete-local after verification.",
    );
  }
}

main().catch((error) => {
  console.error("Cloudinary migration failed:", error.message);
  process.exit(1);
});
