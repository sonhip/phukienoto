const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  generateOrderCode,
  generateVietQRUrl,
  isValidVNPhoneNumber,
  formatVNPhoneNumber,
} = require("../utils/helpers");
const { sendOrderNotificationEmail } = require("../utils/email");

// Checkout page
router.get("/checkout", (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.redirect("/");
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render("shop/checkout", {
    title: "Thanh Toán Đơn Hàng - SmartLifeHub",
    cart,
    total,
  });
});

// Process order submission
router.post("/submit", (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_address,
    address_type,
    customer_note,
    payment_method,
  } = req.body;
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.status(400).json({ error: "Giỏ hàng trống!" });
  }

  if (!customer_name || !customer_phone || !customer_address) {
    return res.status(400).json({
      error: "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng!",
    });
  }

  const cleanPhone = formatVNPhoneNumber(customer_phone.trim());
  if (!isValidVNPhoneNumber(cleanPhone)) {
    return res.status(400).json({
      error:
        "Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09, ví dụ: 0838709126).",
    });
  }

  const formattedAddress =
    address_type === "OLD"
      ? `${customer_address.trim()} (Địa chỉ cũ)`
      : `${customer_address.trim()} (Địa chỉ mới sáp nhập)`;

  const total_amount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const order_code = generateOrderCode();
  const is_priority = payment_method === "BANK_TRANSFER" ? 1 : 0;
  const order_status =
    payment_method === "BANK_TRANSFER" ? "PRIORITY_QUEUE" : "PENDING";
  const transfer_content = `${order_code} ${cleanPhone}`;

  const stmt = db.prepare(`
    INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, customer_note, payment_method, is_priority, payment_status, order_status, total_amount, items, transfer_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    order_code,
    customer_name.trim(),
    cleanPhone,
    formattedAddress,
    customer_note ? customer_note.trim() : "",
    payment_method,
    is_priority,
    "PENDING",
    order_status,
    total_amount,
    JSON.stringify(cart),
    transfer_content,
  );

  // Send asynchronous email notification to admin
  const newOrder = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(result.lastInsertRowid);
  if (newOrder) {
    newOrder.items = cart;
    sendOrderNotificationEmail(newOrder).catch((err) =>
      console.error("❌ Email error:", err.message),
    );
  }

  // Clear cart after placing order
  req.session.cart = [];

  const bankName = process.env.BANK_NAME || "vpbank";
  const bankAccount = process.env.BANK_ACCOUNT || "14220968";
  const bankOwner = process.env.BANK_OWNER || "TRAN VAN SON";

  const qrUrl =
    payment_method === "BANK_TRANSFER"
      ? generateVietQRUrl({
          bankName,
          bankAccount,
          bankOwner,
          amount: total_amount,
          orderCode: order_code,
          phone: customer_phone.trim(),
        })
      : null;

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({
      success: true,
      orderCode: order_code,
      redirectUrl: `/order/success/${order_code}`,
    });
  }

  res.redirect(`/order/success/${order_code}`);
});

// Order success page
router.get("/success/:code", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE order_code = ?")
    .get(req.params.code);
  if (!order) {
    return res.redirect("/");
  }

  order.items = JSON.parse(order.items || "[]");

  const bankName = (process.env.BANK_NAME || "VPBank").toUpperCase();
  const bankAccount = process.env.BANK_ACCOUNT || "14220968";
  const bankOwner = process.env.BANK_OWNER || "TRAN VAN SON";

  const qrUrl =
    order.payment_method === "BANK_TRANSFER"
      ? generateVietQRUrl({
          bankName,
          bankAccount,
          bankOwner,
          amount: order.total_amount,
          orderCode: order.order_code,
          phone: order.customer_phone,
        })
      : null;

  res.render("shop/order-success", {
    title: `Đặt Hàng Thành Công - Mã Đơn: ${order.order_code}`,
    order,
    qrUrl,
    bankName,
    bankAccount,
    bankOwner,
    switched: req.query.switched === "1",
  });
});

// Route sang COD nếu khách đổi ý
router.post("/switch-to-cod/:code", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE order_code = ?")
    .get(req.params.code);
  if (order && order.payment_method === "BANK_TRANSFER") {
    db.prepare(
      "UPDATE orders SET payment_method = 'COD', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(order.id);
  }
  res.redirect(`/order/success/${req.params.code}?switched=1`);
});

module.exports = router;
