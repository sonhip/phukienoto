const express = require("express");
const router = express.Router();
const db = require("../db");

// Add to cart
router.post("/add", async (req, res, next) => {
  try {
    const {
      productId,
      quantity = 1,
      variantName,
      variantPrice,
      variantImage,
    } = req.body;
    const product = await db
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
        parseInt(item.product_id) === parseInt(product.id) &&
        (item.variant_name || "") === (variantName || ""),
    );

    if (existingIndex >= 0) {
      req.session.cart[existingIndex].quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        product_id: parseInt(product.id),
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

    const cartCount = req.session.cart.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const total = req.session.cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Force session save to ensure cart data persists across rapid requests
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    if (
      req.headers["content-type"]?.includes("application/json") ||
      req.xhr ||
      req.headers["accept"]?.includes("application/json")
    ) {
      return res.json({
        success: true,
        cartCount,
        total,
        cart: req.session.cart,
      });
    }

    res.redirect(req.get("referer") || "/cart");
  } catch (error) {
    next(error);
  }
});

// Update cart
router.post("/update", async (req, res) => {
  const { productId, quantity, variantName, index: itemIdx } = req.body;
  if (!req.session.cart) req.session.cart = [];

  let index = -1;
  if (
    itemIdx !== undefined &&
    itemIdx !== null &&
    itemIdx !== "" &&
    !isNaN(parseInt(itemIdx))
  ) {
    const i = parseInt(itemIdx);
    if (i >= 0 && i < req.session.cart.length) {
      index = i;
    }
  }

  if (index === -1 && productId) {
    index = req.session.cart.findIndex(
      (item) =>
        parseInt(item.product_id) === parseInt(productId) &&
        (item.variant_name || "") === (variantName || ""),
    );
  }

  if (index === -1 && productId) {
    index = req.session.cart.findIndex(
      (item) => parseInt(item.product_id) === parseInt(productId),
    );
  }

  const newQty = parseInt(quantity);
  if (index >= 0 && index < req.session.cart.length) {
    if (isNaN(newQty) || newQty <= 0) {
      req.session.cart.splice(index, 1);
    } else {
      req.session.cart[index].quantity = newQty;
    }
  }

  const cartCount = req.session.cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const total = req.session.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Force session save to ensure cart data persists
  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  if (
    req.headers["content-type"]?.includes("application/json") ||
    req.xhr ||
    req.headers["accept"]?.includes("application/json")
  ) {
    return res.json({
      success: true,
      cartCount,
      total,
      cart: req.session.cart,
    });
  }

  res.redirect("/cart");
});

// Remove from cart
router.post("/remove", async (req, res) => {
  const { productId, variantName, index: itemIdx } = req.body;
  if (!req.session.cart) req.session.cart = [];

  let index = -1;
  if (
    itemIdx !== undefined &&
    itemIdx !== null &&
    itemIdx !== "" &&
    !isNaN(parseInt(itemIdx))
  ) {
    const i = parseInt(itemIdx);
    if (i >= 0 && i < req.session.cart.length) {
      index = i;
    }
  }

  if (index === -1 && productId) {
    index = req.session.cart.findIndex(
      (item) =>
        parseInt(item.product_id) === parseInt(productId) &&
        (item.variant_name || "") === (variantName || ""),
    );
  }

  if (index === -1 && productId) {
    index = req.session.cart.findIndex(
      (item) => parseInt(item.product_id) === parseInt(productId),
    );
  }

  if (index >= 0 && index < req.session.cart.length) {
    req.session.cart.splice(index, 1);
  }

  const cartCount = req.session.cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const total = req.session.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Force session save to ensure cart data persists
  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  if (
    req.headers["content-type"]?.includes("application/json") ||
    req.xhr ||
    req.headers["accept"]?.includes("application/json")
  ) {
    return res.json({
      success: true,
      cartCount,
      total,
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
router.post("/buy-now", async (req, res, next) => {
  try {
    const {
      productId,
      quantity = 1,
      variantName,
      variantPrice,
      variantImage,
    } = req.body;
    const product = await db
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
  } catch (error) {
    next(error);
  }
});

module.exports = router;
