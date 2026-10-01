// Helper functions

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function generateOrderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "SLH";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate VietQR Quick Link URL according to official VietQR API specification
 * Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.<EXT>?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
 * Docs: https://www.vietqr.io/en/danh-sach-api/link-tao-ma-nhanh/
 */
function generateVietQRUrl({
  bankName = "vpbank",
  bankAccount = "14220968",
  bankOwner = "TRAN VAN SON",
  template = "compact2",
  extension = "png",
  amount = 0,
  orderCode = "",
  phone = "",
  addInfo = "",
}) {
  const bankId = (bankName || "vpbank").toLowerCase().replace(/\s+/g, "");
  const accountNo = (bankAccount || "14220968").trim();

  // Format transfer content (max 50 chars, alphanumeric per VietQR spec)
  const rawInfo = addInfo || `${orderCode} ${phone}`.trim();
  const cleanInfo = rawInfo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .substring(0, 50)
    .trim();

  const description = encodeURIComponent(cleanInfo);
  const accountName = encodeURIComponent((bankOwner || "TRAN VAN SON").trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.${extension}?amount=${Math.round(amount)}&addInfo=${description}&accountName=${accountName}`;
}

const ORDER_STATUS_LABELS = {
  PRIORITY_QUEUE: {
    label: "⚡ Chuyển Khoản (Đang Check)",
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  PENDING: {
    label: "⏳ Chờ Gọi Xác Nhận (COD)",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  CONFIRMED: {
    label: "📦 Đã Xác Nhận & Đóng Gói",
    color: "bg-purple-100 text-purple-800 border-purple-300",
  },
  SHIPPING: {
    label: "🚚 Đang Giao Hàng",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  DELIVERED: {
    label: "✅ Giao Thành Công",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  CANCELLED: {
    label: "❌ Đã Hủy",
    color: "bg-red-100 text-red-800 border-red-300",
  },
};

/**
 * Validate Vietnamese mobile phone numbers
 * Format: 10 digits starting with 03, 05, 07, 08, 09, or international format +84...
 */
function isValidVNPhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\.\-]/g, "");
  const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return vnPhoneRegex.test(cleaned);
}

function formatVNPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.substring(3);
  }
  return cleaned;
}

module.exports = {
  formatCurrency,
  generateOrderCode,
  generateVietQRUrl,
  isValidVNPhoneNumber,
  formatVNPhoneNumber,
  ORDER_STATUS_LABELS,
};
