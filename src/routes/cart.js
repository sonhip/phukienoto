const express = require("express");
const router = express.Router();
const db = require("../db");

// Add to cart
router.post("/add", (req, res) => {
  const {
    productId,
    quantity = 1,
    variantName,
    variantPrice,
    variantImage,
  } = req.body;
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(productId);

  if (!product) {
    return res.status(404).json({ error: "Sản phẩm không tồn tại" });
  }

  if (!req.session.cart) req.session.cart = [];

  const images = JSON.parse(product.images || "[]");
  const itemPrice = parseInt(variantPrice) || product.sale_price;
  const itemImage = variantImage || images[0] || "/images/placeholder.jpg";
  const itemName = variantName
    ? `${product.name} (${variantName})`
    : product.name;

  const existingIndex = req.session.cart.findIndex(
    (item) =>
      item.product_id === product.id &&
      item.variant_name === (variantName || ""),
  );

  if (existingIndex >= 0) {
    req.session.cart[existingIndex].quantity += parseInt(quantity);
  } else {
    req.session.cart.push({
      product_id: product.id,
      name: itemName,
      raw_name: product.name,
      variant_name: variantName || "",
      slug: product.slug,
      price: itemPrice,
      original_price: product.original_price,
      image: itemImage,
      quantity: parseInt(quantity),
    });
  }

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({
      success: true,
      cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0),
      cart: req.session.cart,
    });
  }

  res.redirect(req.get("referer") || "/");
});

// Update cart
router.post("/update", (req, res) => {
  const { productId, quantity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  const index = req.session.cart.findIndex(
    (item) => item.product_id === parseInt(productId),
  );
  if (index >= 0) {
    if (parseInt(quantity) <= 0) {
      req.session.cart.splice(index, 1);
    } else {
      req.session.cart[index].quantity = parseInt(quantity);
    }
  }

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({
      success: true,
      cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0),
      cart: req.session.cart,
    });
  }

  res.redirect("/cart");
});

// Remove from cart
router.post("/remove", (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter(
    (item) => item.product_id !== parseInt(productId),
  );

  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({
      success: true,
      cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0),
      cart: req.session.cart,
    });
  }

  res.redirect("/cart");
});

// View cart
router.get("/", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render("shop/cart", {
    title: "Giỏ Hàng - SmartLifeHub",
    cart,
    total,
  });
});

// Buy now (add + redirect to checkout)
router.post("/buy-now", (req, res) => {
  const {
    productId,
    quantity = 1,
    variantName,
    variantPrice,
    variantImage,
  } = req.body;
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(productId);

  if (!product) {
    return res.redirect("/");
  }

  const images = JSON.parse(product.images || "[]");
  const itemPrice = parseInt(variantPrice) || product.sale_price;
  const itemImage = variantImage || images[0] || "/images/placeholder.jpg";
  const itemName = variantName
    ? `${product.name} (${variantName})`
    : product.name;

  req.session.cart = [
    {
      product_id: product.id,
      name: itemName,
      raw_name: product.name,
      variant_name: variantName || "",
      slug: product.slug,
      price: itemPrice,
      original_price: product.original_price,
      image: itemImage,
      quantity: parseInt(quantity),
    },
  ];

  res.redirect("/order/checkout");
});

module.exports = router;
