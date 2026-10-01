const nodemailer = require("nodemailer");
const { formatCurrency, generateVietQRUrl } = require("./helpers");

// Configure transporter
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS
    ? process.env.SMTP_PASS.replace(/\s+/g, "")
    : "";

  if (!user || !pass || user.includes("your-email")) {
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: { user, pass },
    connectionTimeout: 8000, // Timeout 8s tránh tắc nghẽn
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send order notification email to shop admin
 * @param {Object} order Order object from DB
 */
async function sendOrderNotificationEmail(order) {
  const adminEmail =
    process.env.NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "son0101.tv@gmail.com";
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  const isPriority =
    order.is_priority === 1 || order.payment_method === "BANK_TRANSFER";
  const priorityBadge = isPriority
    ? `<span style="background-color: #f59e0b; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px;">⚡ CHUYỂN KHOẢN (DUYỆT TỰ ĐỘNG 24/7)</span>`
    : `<span style="background-color: #6b7280; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px;">THANH TOÁN COD</span>`;

  const qrUrl =
    order.payment_method === "BANK_TRANSFER"
      ? generateVietQRUrl({
          bankName: process.env.BANK_NAME || "vpbank",
          bankAccount: process.env.BANK_ACCOUNT || "14220968",
          bankOwner: process.env.BANK_OWNER || "TRAN VAN SON",
          amount: order.total_amount,
          orderCode: order.order_code,
          phone: order.customer_phone,
        })
      : null;

  let itemsList = [];
  if (typeof order.items === "string") {
    try {
      itemsList = JSON.parse(order.items);
    } catch (e) {
      itemsList = [];
    }
  } else if (Array.isArray(order.items)) {
    itemsList = order.items;
  }

  const itemsHtml = itemsList
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px; font-size: 13px; color: #111827;"><strong>${item.quantity}x</strong> ${item.name}</td>
        <td style="padding: 10px; font-size: 13px; color: #dc2626; text-align: right; font-weight: bold;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Đơn Hàng Mới #${order.order_code}</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase;">🚀 ĐƠN HÀNG MỚI #${order.order_code}</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">SmartLifeHub Phụ Kiện Ô Tô Giá Tại Kho</p>
      </div>

      <!-- Priority Badge -->
      <div style="padding: 16px 24px; background-color: #fffbeb; text-align: center; border-bottom: 1px solid #fef3c7;">
        ${priorityBadge}
      </div>

      <!-- Body Content -->
      <div style="padding: 24px;">
        
        <!-- Customer Info -->
        <h3 style="font-size: 14px; font-weight: 700; color: #374151; margin-top: 0; text-transform: uppercase; border-bottom: 2px solid #ea580c; padding-bottom: 6px; display: inline-block;">Thông Tin Khách Hàng</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; color: #4b5563;">
          <tr>
            <td style="padding: 6px 0; width: 120px; font-weight: bold;">Họ và tên:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: bold;">${order.customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Số điện thoại:</td>
            <td style="padding: 6px 0; color: #dc2626; font-weight: bold;"><a href="tel:${order.customer_phone}" style="color: #dc2626; text-decoration: none;">${order.customer_phone}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Địa chỉ:</td>
            <td style="padding: 6px 0; color: #111827;">${order.customer_address}</td>
          </tr>
          ${
            order.customer_note
              ? `<tr>
            <td style="padding: 6px 0; font-weight: bold;">Ghi chú:</td>
            <td style="padding: 6px 0; color: #6b7280; font-style: italic;">"${order.customer_note}"</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Phương thức TT:</td>
            <td style="padding: 6px 0; color: #111827;">${order.payment_method === "BANK_TRANSFER" ? "Chuyển Khoản Ngân Hàng (VietQR)" : "Thanh Toán COD Khi Nhận Hàng"}</td>
          </tr>
        </table>

        <!-- Order Items -->
        <h3 style="font-size: 14px; font-weight: 700; color: #374151; margin-top: 0; text-transform: uppercase; border-bottom: 2px solid #ea580c; padding-bottom: 6px; display: inline-block;">Danh Sách Sản Phẩm</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px 10px; font-size: 15px; font-weight: bold; color: #111827;">Tổng Cần Thanh Toán:</td>
            <td style="padding: 12px 10px; font-size: 18px; font-weight: 900; color: #dc2626; text-align: right;">${formatCurrency(order.total_amount)}</td>
          </tr>
        </table>

        ${
          qrUrl
            ? `
        <!-- VietQR Box -->
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #92400e;">⚡ MÃ VIETQR CHUYỂN KHOẢN TỰ ĐỘNG:</p>
          <img src="${qrUrl}" alt="VietQR Code" style="width: 220px; height: 220px; border-radius: 8px; border: 1px solid #fde68a;" />
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #78350f;">Nội dung CK: <strong>${order.order_code} ${order.customer_phone}</strong></p>
        </div>`
            : ""
        }

        <!-- Action Button -->
        <div style="text-align: center; margin-top: 28px;">
          <a href="${baseUrl}/admin/order/${order.id}" style="background: #ea580c; color: #ffffff; font-weight: bold; padding: 12px 28px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 14px;">MỞ TRANG XỬ LÝ ĐƠN ADM &rarr;</a>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        Thông báo tự động từ hệ thống SmartLifeHub.
      </div>
    </div>
  </body>
  </html>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n📧 [EMAIL NOTIFICATION - SIMULATION MODE]`);
    console.log(`--------------------------------------------------`);
    console.log(`Đã phát sinh đơn hàng mới: #${order.order_code}`);
    console.log(`Khách hàng: ${order.customer_name} (${order.customer_phone})`);
    console.log(`Tổng tiền: ${formatCurrency(order.total_amount)}`);
    console.log(`Phương thức: ${order.payment_method}`);
    console.log(`Gửi thông báo tới Email: ${adminEmail}`);
    console.log(
      `(Lưu ý: Để thực sự gửi mail qua SMTP, cấu hình SMTP_HOST, SMTP_USER, SMTP_PASS trong file .env)`,
    );
    console.log(`--------------------------------------------------\n`);
    return { simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SmartLifeHub Orders" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🚀 [ĐƠN MỚI #${order.order_code}] ${order.customer_name} - ${formatCurrency(order.total_amount)} (${order.payment_method === "BANK_TRANSFER" ? "ƯU TIÊN CK" : "COD"})`,
      html: emailHtml,
    });
    console.log(
      `✅ Email thông báo đơn hàng #${order.order_code} đã gửi tới ${adminEmail}: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `❌ Lỗi gửi email thông báo đơn #${order.order_code}:`,
      error.message,
    );
    return { error: error.message };
  }
}

module.exports = {
  sendOrderNotificationEmail,
};
