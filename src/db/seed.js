const db = require("./index");

async function seed() {
  console.log("🌱 Seeding database with 4 sample products...");

  // Clear existing data
  await db.exec("DELETE FROM products");

  const products = [
    {
      name: "Camera Hành Trình 4K WiFi - Xem Qua Điện Thoại",
      slug: "camera-hanh-trinh-4k-wifi",
      summary:
        "Camera hành trình 4K siêu nét, kết nối WiFi xem trực tiếp qua điện thoại, ghi hình ngày đêm, cảm biến va chạm tự động lưu.",
      description: `<h3>🎥 Camera Hành Trình 4K WiFi - Bảo Vệ Mọi Hành Trình</h3>
<p>Camera hành trình thế hệ mới với độ phân giải 4K Ultra HD, cho hình ảnh sắc nét gấp 4 lần Full HD thông thường. Kết nối WiFi trực tiếp với điện thoại để xem, tải và chia sẻ video dễ dàng.</p>
<ul>
  <li>✅ Độ phân giải 4K Ultra HD - Hình ảnh siêu sắc nét</li>
  <li>✅ Kết nối WiFi - Xem trực tiếp qua App điện thoại</li>
  <li>✅ Ghi hình ngày đêm - Cảm biến Sony Starvis</li>
  <li>✅ Cảm biến va chạm G-Sensor - Tự động khóa video</li>
  <li>✅ Ghi hình vòng lặp - Không lo đầy thẻ nhớ</li>
  <li>✅ Góc quay rộng 170° - Bao quát toàn bộ</li>
</ul>`,
      original_price: 1290000,
      sale_price: 690000,
      images: JSON.stringify([
        "/images/products/camera-4k-1.jpg",
        "/images/products/camera-4k-2.jpg",
        "/images/products/camera-4k-3.jpg",
      ]),
      videos: JSON.stringify([
        {
          title: "Video Hướng Dẫn Lắp Đặt & Kết Nối App WiFi",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          thumbnail: "/images/products/camera-4k-1.jpg",
        },
        {
          title: "Trải Nghiệm Quay Đêm Thực Tế Của Khách Hàng",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          thumbnail: "/images/products/camera-4k-2.jpg",
        },
      ]),
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      highlights: JSON.stringify([
        "Độ phân giải 4K Ultra HD",
        "Kết nối WiFi xem qua điện thoại",
        "Cảm biến Sony Starvis ghi hình đêm",
        "Cảm biến va chạm G-Sensor",
        "Bảo hành 12 tháng 1 đổi 1",
      ]),
      specifications: JSON.stringify({
        "Độ phân giải": "4K 2160P / 1080P",
        "Góc quay": "170 độ",
        "Kết nối": "WiFi 2.4GHz",
        "Cảm biến": "Sony Starvis IMX335",
        "Thẻ nhớ": "Hỗ trợ tối đa 128GB",
        Nguồn: "5V/2A (Cáp USB)",
        "Kích thước": "65 x 55 x 35mm",
      }),
      reviews: JSON.stringify([
        {
          name: "Anh Minh - Hà Nội",
          rating: 5,
          comment:
            "Hình ảnh cực kỳ sắc nét cả ban ngày lẫn ban đêm. Shop hỗ trợ nhiệt tình, đặt bằng chuyển khoản được ưu tiên giao nhanh chỉ 1 ngày là nhận!",
          date: "2024-10-15",
          type: "image",
          media_url: "/images/products/camera-4k-1.jpg",
        },
        {
          name: "Chị Hương - TP.HCM",
          rating: 5,
          comment:
            "Giao hàng siêu tốc. Video gắn thử trên xe nét căng, nhìn rõ biển số xe trước xa vài mét.",
          date: "2024-10-20",
          type: "video",
          media_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        },
        {
          name: "Anh Tuấn - Đà Nẵng",
          rating: 5,
          comment:
            "Rất đáng tiền, app điện thoại mượt mà kết nối nhanh không bị trễ.",
          date: "2024-11-01",
          type: "image",
          media_url: "/images/products/camera-4k-2.jpg",
        },
      ]),
      badge: "Bán chạy",
      variants: JSON.stringify([
        {
          name: "Bản Tiêu Chuẩn (Thân Máy)",
          price: 690000,
          original_price: 1290000,
          image: "/images/products/camera-4k-1.jpg",
        },
        {
          name: "Bản Kèm Thẻ 64GB High-Speed",
          price: 790000,
          original_price: 1390000,
          image: "/images/products/camera-4k-2.jpg",
        },
        {
          name: "Bản Full Combo Thẻ 128GB + Cáp 24H",
          price: 890000,
          original_price: 1490000,
          image: "/images/products/camera-4k-3.jpg",
        },
      ]),
      rating: 4.9,
      rating_count: 256,
      sold_count: 1520,
    },
    {
      name: "Máy Hút Bụi Ô Tô Cầm Tay Mini 12V High-Power",
      slug: "may-hut-bui-oto-cam-tay-mini",
      summary:
        "Máy hút bụi ô tô mini công suất lớn 120W, lực hút 5000Pa mạnh mẽ, nhỏ gọn, cắm trực tiếp tẩu sạc 12V.",
      description: `<h3>🧹 Máy Hút Bụi Ô Tô Mini - Sạch Sẽ Mọi Ngóc Ngách</h3>
<p>Máy hút bụi ô tô cầm tay mini với công suất 120W, lực hút mạnh mẽ 5000Pa, giúp làm sạch mọi bụi bẩn, vụn bánh, lông thú cưng trong xe một cách dễ dàng.</p>
<ul>
  <li>✅ Công suất 120W - Lực hút 5000Pa siêu mạnh</li>
  <li>✅ Thiết kế nhỏ gọn - Dễ cất giữ trong hộc xe</li>
  <li>✅ Đầu hút đa năng - Kèm 3 đầu hút thay thế</li>
  <li>✅ Bộ lọc HEPA washable - Lọc bụi mịn hiệu quả</li>
  <li>✅ Cắm tẩu 12V tiện lợi</li>
</ul>`,
      original_price: 450000,
      sale_price: 249000,
      images: JSON.stringify([
        "/images/products/hut-bui-1.jpg",
        "/images/products/hut-bui-2.jpg",
        "/images/products/hut-bui-3.jpg",
      ]),
      videos: JSON.stringify([
        {
          title: "Video Test Lực Hút Bụi Mịn & Vụn Bánh Rễ Xe",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          thumbnail: "/images/products/hut-bui-1.jpg",
        },
      ]),
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      highlights: JSON.stringify([
        "Công suất 120W lực hút 5000Pa",
        "Nhỏ gọn dễ cất giữ",
        "Kèm 3 đầu hút đa năng",
        "Bộ lọc HEPA lọc bụi mịn",
        "Bảo hành 6 tháng 1 đổi 1",
      ]),
      specifications: JSON.stringify({
        "Công suất": "120W",
        "Lực hút": "5000Pa",
        "Nguồn điện": "Tẩu sạc 12V",
        "Chiều dài dây": "4.5m",
        "Bộ lọc": "HEPA có thể rửa sạch",
        "Trọng lượng": "680g",
      }),
      reviews: JSON.stringify([
        {
          name: "Anh Đức - Bắc Ninh",
          rating: 5,
          comment:
            "Hút rất mạnh, ke hẹp thảm xe hút phát sạch luôn. Mua trực tiếp shop rẻ hơn mua sàn nhiều!",
          date: "2024-09-10",
          type: "image",
          media_url: "/images/products/hut-bui-1.jpg",
        },
        {
          name: "Chị Mai - Hải Phòng",
          rating: 5,
          comment:
            "Máy nhẹ, dây dài thoải mái hút tận ghế sau. Review hình ảnh chụp thực tế sản phẩm đúng như mô tả.",
          date: "2024-09-18",
          type: "image",
          media_url: "/images/products/hut-bui-2.jpg",
        },
      ]),
      badge: "Bán chạy",
      variants: JSON.stringify([
        {
          name: "Màu Đen Nhám Matte",
          price: 249000,
          original_price: 450000,
          image: "/images/products/hut-bui-1.jpg",
        },
        {
          name: "Màu Bạc Luxury Platinum",
          price: 269000,
          original_price: 480000,
          image: "/images/products/hut-bui-2.jpg",
        },
      ]),
      rating: 4.8,
      rating_count: 184,
      sold_count: 940,
    },
    {
      name: "Giá Để Điện Thoại Ô Tô Tự Động Kẹp Cảm Ứng Thông Minh",
      slug: "gia-do-dien-thoai-oto-tu-dong",
      summary:
        "Kẹp điện thoại ô tô cảm ứng thông minh, tự động kẹp mở khi đưa điện thoại lại gần, sạc không dây nhanh 15W.",
      description: `<h3>📱 Giá Đỡ Điện Thoại Cảm Ứng Thông Minh Auto-Clamp</h3>
<p>Kẹp điện thoại ô tô tự động cảm ứng hồng ngoại, tự động xòe tay kẹp khi đưa điện thoại gần và giữ chặt chắc chắn ngay cả khi đi đường xóc.</p>
<ul>
  <li>✅ Cảm ứng thông minh - Tự động đóng mở kẹp</li>
  <li>✅ Tích hợp Sạc Không Dây 15W siêu nhanh</li>
  <li>✅ Xoay 360 độ linh hoạt điều chỉnh góc nhìn</li>
  <li>✅ Chân đế gắn cửa gió điều hòa & taplo chắc chắn</li>
</ul>`,
      original_price: 380000,
      sale_price: 189000,
      images: JSON.stringify([
        "/images/products/gia-do-1.jpg",
        "/images/products/gia-do-2.jpg",
        "/images/products/gia-do-3.jpg",
      ]),
      videos: JSON.stringify([
        {
          title: "Video Trải Nghiệm Kẹp Tự Động Cảm Ứng Hồng Ngoại",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          thumbnail: "/images/products/gia-do-1.jpg",
        },
      ]),
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      highlights: JSON.stringify([
        "Cảm ứng hồng ngoại tự đóng mở",
        "Sạc không dây Qi 15W",
        "Xoay 360 độ tiện lợi",
        "Tương thích mọi loại điện thoại 4-7 inch",
        "Bảo hành 12 tháng",
      ]),
      specifications: JSON.stringify({
        "Công suất sạc": "15W / 10W / 7.5W / 5W",
        "Chuẩn sạc": "Qi Wireless Fast Charge",
        "Chất liệu": "Nhựa ABS + Kính Cường Lực",
        "Đầu vào": "5V/2A, 9V/1.67A",
        "Cổng sạc": "Type-C",
      }),
      reviews: JSON.stringify([
        {
          name: "Anh Hoàng - Hà Nội",
          rating: 5,
          comment:
            "Đưa điện thoại lại gần là kẹp mở ra như phép thuật, sạc nhanh không nóng máy.",
          date: "2024-10-05",
          type: "video",
          media_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        },
        {
          name: "Anh Hoàng Nam - Vĩnh Phúc",
          rating: 5,
          comment: "Chắc chắn lắm, đi đường dằn xóc điện thoại vẫn đứng yên.",
          date: "2024-10-12",
          type: "image",
          media_url: "/images/products/gia-do-2.jpg",
        },
      ]),
      badge: "Bán chạy",
      variants: JSON.stringify([
        {
          name: "Bản Kẹp Cửa Gió Điều Hòa",
          price: 189000,
          original_price: 380000,
          image: "/images/products/gia-do-1.jpg",
        },
        {
          name: "Bản Dán Taplo Chịu Nhiệt Cao Cấp",
          price: 219000,
          original_price: 420000,
          image: "/images/products/gia-do-2.jpg",
        },
      ]),
      rating: 4.9,
      rating_count: 310,
      sold_count: 2150,
    },
    {
      name: "Nước Hoa Ô Tô Tỏa Hương Tự Động Năng Lượng Mặt Trời Solar",
      slug: "nuoc-hoa-oto-solar-xoay-tu-dong",
      summary:
        "Nước hoa ô tô cao cấp tự động xoay khi có ánh nắng mặt trời, khử mùi hôi xe, lưu hương thiên nhiên dễ chịu 365 ngày.",
      description: `<h3>☀️ Nước Hoa Ô Tô Solar Xoay Tự Động Năng Lượng Mặt Trời</h3>
<p>Thiết kế phi thuyền xoay tự động 360 độ nhờ tấm pin năng lượng mặt trời. Khử sạch mùi da mới, mùi thuốc lá, ẩm mốc, mang lại hương thơm dễ chịu.</p>
<ul>
  <li>✅ Pin mặt trời Solar - Tự xoay tỏa hương khi có ánh sáng</li>
  <li>✅ Tinh dầu thiên nhiên nhập khẩu Pháp - An toàn cho bà bầu & trẻ nhỏ</li>
  <li>✅ Khử mùi kháng khuẩn đỉnh cao</li>
  <li>✅ Thiết kế sang trọng làm đẹp không gian taplo</li>
</ul>`,
      original_price: 320000,
      sale_price: 159000,
      images: JSON.stringify([
        "/images/products/nuoc-hoa-1.jpg",
        "/images/products/nuoc-hoa-2.jpg",
        "/images/products/nuoc-hoa-3.jpg",
      ]),
      videos: JSON.stringify([
        {
          title: "Video Test Cơ Chế Xoay Năng Lượng Mặt Trời Taplo",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          thumbnail: "/images/products/nuoc-hoa-1.jpg",
        },
      ]),
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      highlights: JSON.stringify([
        "Tự động xoay khi có ánh nắng",
        "Tinh dầu thiên nhiên an toàn",
        "Lưu hương liên tục 12 tháng",
        "Thiết kế phi thuyền hợp kim chống va đập",
        "Bảo hành 6 tháng",
      ]),
      specifications: JSON.stringify({
        "Nguồn năng lượng": "Pin mặt trời Silicon Solar",
        "Chất liệu": "Hợp kim nhôm hàng không",
        "Loại mùi": "Hương nước hoa cao cấp (Ocean / Lemon / Cologne)",
        "Trọng lượng": "220g",
        "Đường kính": "80mm",
      }),
      reviews: JSON.stringify([
        {
          name: "Chị Thảo - Cần Thơ",
          rating: 5,
          comment:
            "Mùi hương thoang thoảng rất dễ chịu, không bị nồng sặc như nước hoa xịt. Xe có nắng là xoay đẹp lắm!",
          date: "2024-10-28",
          type: "image",
          media_url: "/images/products/nuoc-hoa-1.jpg",
        },
      ]),
      badge: "Bán chạy",
      variants: JSON.stringify([
        {
          name: "Hương Biển Fresh Ocean",
          price: 159000,
          original_price: 320000,
          image: "/images/products/nuoc-hoa-1.jpg",
        },
        {
          name: "Hương Gỗ Trầm Sang Trọng",
          price: 159000,
          original_price: 320000,
          image: "/images/products/nuoc-hoa-2.jpg",
        },
      ]),
      rating: 4.8,
      rating_count: 142,
      sold_count: 670,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO products (
      name, slug, summary, description, original_price, sale_price,
      images, videos, video_url, highlights, specifications, reviews, variants,
      badge, rating, rating_count, sold_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  for (const p of products) {
    await stmt.run(
      p.name,
      p.slug,
      p.summary,
      p.description,
      p.original_price,
      p.sale_price,
      p.images,
      p.videos,
      p.video_url,
      p.highlights,
      p.specifications,
      p.reviews,
      p.variants,
      p.badge,
      p.rating,
      p.rating_count,
      p.sold_count,
    );
  }

  console.log("✅ Seed completed! Exactly 4 sample products created.");
}

if (require.main === module) {
  db.ready.then(seed).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seed;
