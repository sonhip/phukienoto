require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "smartlifehub-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24h
  }),
);

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Keep old imported media URLs working after products move under uploads.
app.get("/products/*", (req, res) => {
  res.redirect(301, `/uploads/products/${req.params[0]}`);
});

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Global template variables
const db = require("./db");
const { formatCurrency, ORDER_STATUS_LABELS } = require("./utils/helpers");

// Run 5-minute auto-advance for bank transfer orders on interval (every 30 seconds)
setInterval(() => {
  if (typeof db.autoAdvanceBankTransferOrders === "function") {
    db.autoAdvanceBankTransferOrders();
  }
}, 30000);

app.use((req, res, next) => {
  // Also run auto-advance check on incoming requests
  if (typeof db.autoAdvanceBankTransferOrders === "function") {
    db.autoAdvanceBankTransferOrders();
  }
  res.locals.formatCurrency = formatCurrency;
  res.locals.ORDER_STATUS_LABELS = ORDER_STATUS_LABELS;
  res.locals.cart = req.session.cart || [];
  res.locals.cartCount = (req.session.cart || []).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  res.locals.bankName = process.env.BANK_NAME || "MBBANK";
  res.locals.bankAccount = process.env.BANK_ACCOUNT || "0987654321";
  res.locals.bankOwner = process.env.BANK_OWNER || "SMARTLIFEHUB";
  res.locals.currentPath = req.path;
  res.locals.baseUrl = `${req.protocol}://${req.get("host")}`;
  next();
});

// Routes
app.use("/", require("./routes/shop"));
app.use("/cart", require("./routes/cart"));
app.use("/order", require("./routes/order"));
app.use("/admin", require("./routes/admin"));

// 404
app.use((req, res) => {
  res.status(404).render("404", { title: "Không tìm thấy trang" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .render("error", { title: "Lỗi hệ thống", error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 SmartLifeHub running at http://localhost:${PORT}`);
  console.log(`📦 Admin panel: http://localhost:${PORT}/admin`);
});
