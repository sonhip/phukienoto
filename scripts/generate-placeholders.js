// Generate placeholder product images as SVGs
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../public/images/products");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const products = [
  {
    prefix: "camera-4k",
    count: 3,
    label: "Camera 4K WiFi",
    color: "#0284c7",
    bg: "#0f172a",
    icon: "📷",
  },
  {
    prefix: "hut-bui",
    count: 3,
    label: "Máy Hút Bụi Mini",
    color: "#059669",
    bg: "#064e3b",
    icon: "🧹",
  },
  {
    prefix: "gia-do-dt",
    count: 2,
    label: "Giá Đỡ Điện Thoại",
    color: "#7c3aed",
    bg: "#1e1b4b",
    icon: "📱",
  },
  {
    prefix: "nuoc-hoa",
    count: 2,
    label: "Nước Hoa Ô Tô",
    color: "#db2777",
    bg: "#500724",
    icon: "🌸",
  },
  {
    prefix: "boc-vo-lang",
    count: 2,
    label: "Bọc Vô Lăng Da",
    color: "#b45309",
    bg: "#451a03",
    icon: "🚗",
  },
  {
    prefix: "den-led",
    count: 3,
    label: "Đèn LED RGB",
    color: "#dc2626",
    bg: "#1a0a2e",
    icon: "💡",
  },
];

products.forEach((p) => {
  for (let i = 1; i <= p.count; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${p.bg}"/>
      <stop offset="100%" style="stop-color:${p.color}33"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect x="50" y="50" width="700" height="700" rx="40" fill="none" stroke="${p.color}44" stroke-width="2"/>
  <text x="400" y="340" text-anchor="middle" font-size="120">${p.icon}</text>
  <text x="400" y="440" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${p.label}</text>
  <text x="400" y="490" text-anchor="middle" fill="${p.color}" font-family="Arial, sans-serif" font-size="22">SmartLifeHub - Ảnh ${i}</text>
  <text x="400" y="540" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16">Phụ Kiện Ô Tô Chính Hãng</text>
</svg>`;
    fs.writeFileSync(path.join(dir, `${p.prefix}-${i}.jpg`), svg);
    console.log(`✅ Created ${p.prefix}-${i}.jpg`);
  }
});

// Create placeholder.jpg
const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#e2e8f0"/>
  <text x="200" y="200" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">No Image</text>
</svg>`;
fs.writeFileSync(path.join(dir, "../placeholder.jpg"), placeholder);
console.log("✅ Created placeholder.jpg");
console.log("🎉 All placeholder images generated!");
