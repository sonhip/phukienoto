const express = require("express");
const router = express.Router();
const db = require("../db");

// Landing page
router.get("/", async (req, res, next) => {
  try {
    const products = (
      await db
        .prepare("SELECT * FROM products ORDER BY display_order ASC, id ASC")
        .all()
    ).map((p) => ({
      ...p,
      images: JSON.parse(p.images || "[]"),
      videos: JSON.parse(p.videos || "[]"),
      highlights: JSON.parse(p.highlights || "[]"),
      specifications: JSON.parse(p.specifications || "{}"),
      reviews: JSON.parse(p.reviews || "[]"),
      variants: JSON.parse(p.variants || "[]"),
    }));

    res.render("shop/index", {
      title: "SmartLifeHub - Phụ Kiện Ô Tô Chính Hãng | Mua Trực Tiếp Giá Kho",
      products,
    });
  } catch (error) {
    next(error);
  }
});

// Product detail page
router.get("/product/:slug", async (req, res, next) => {
  try {
    const product = await db
      .prepare("SELECT * FROM products WHERE slug = ?")
      .get(req.params.slug);
    if (!product) {
      return res.status(404).render("404", { title: "Sản phẩm không tồn tại" });
    }

    product.images = JSON.parse(product.images || "[]");
    product.videos = JSON.parse(product.videos || "[]");
    product.highlights = JSON.parse(product.highlights || "[]");
    product.specifications = JSON.parse(product.specifications || "{}");
    product.reviews = JSON.parse(product.reviews || "[]");
    product.variants = JSON.parse(product.variants || "[]");

    const otherProducts = (
      await db
        .prepare("SELECT * FROM products WHERE slug != ? LIMIT 4")
        .all(req.params.slug)
    ).map((p) => ({
      ...p,
      images: JSON.parse(p.images || "[]"),
    }));

    res.render("shop/product-detail", {
      title: `${product.name} - SmartLifeHub`,
      product,
      otherProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Direct landing page for ads / specific product campaign
router.get("/lp/:slug", async (req, res, next) => {
  try {
    const product = await db
      .prepare("SELECT * FROM products WHERE slug = ?")
      .get(req.params.slug);
    if (!product) {
      return res.redirect("/");
    }

    product.images = JSON.parse(product.images || "[]");
    product.videos = JSON.parse(product.videos || "[]");
    product.highlights = JSON.parse(product.highlights || "[]");
    product.specifications = JSON.parse(product.specifications || "{}");
    product.reviews = JSON.parse(product.reviews || "[]");

    res.render("shop/landing-product", {
      title: `${product.name} - Ưu Đãi Độc Quyền Giá Tại Kho`,
      product,
    });
  } catch (error) {
    next(error);
  }
});

// Tracking page
router.get("/tracking", async (req, res, next) => {
  try {
    const phone = req.query.phone || "";
    const code = req.query.code || "";
    let orders = [];

    if (phone || code) {
      if (phone) {
        orders = await db
          .prepare(
            "SELECT * FROM orders WHERE customer_phone LIKE ? ORDER BY id DESC",
          )
          .all(`%${phone.trim()}%`);
      } else if (code) {
        orders = await db
          .prepare("SELECT * FROM orders WHERE order_code = ? ORDER BY id DESC")
          .all(code.trim().toUpperCase());
      }

      orders = orders.map((o) => ({
        ...o,
        items: JSON.parse(o.items || "[]"),
      }));
    }

    res.render("shop/tracking", {
      title: "Tra Cứu Đơn Hàng - SmartLifeHub",
      phone,
      code,
      orders,
    });
  } catch (error) {
    next(error);
  }
});

// Benefits / Compare page or section
router.get("/why-buy-direct", (req, res) => {
  res.render("shop/why-buy-direct", {
    title: "Tại Sao Nên Mua Trực Tiếp Tại Web SmartLifeHub?",
  });
});

// Robots.txt
router.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /cart/
Disallow: /order/

Sitemap: ${req.protocol}://${req.get("host")}/sitemap.xml`);
});

// Dynamic XML Sitemap
router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const host = `${req.protocol}://${req.get("host")}`;
    const products = await db.prepare("SELECT slug FROM products").all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${host}/tracking</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;

    products.forEach((p) => {
      xml += `
  <url>
    <loc>${host}/product/${p.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    res.type("application/xml");
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
