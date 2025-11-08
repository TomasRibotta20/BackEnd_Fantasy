import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: "arielmazalan15@gmail.com",
    pass: process.env.GMAIL_PASS || "demo",
  },
});

// Verificar solo si hay configuración real
if (process.env.GMAIL_PASS) {
  transporter.verify()
    .then(() => {
      console.log("✅ Ready to send emails");
    })
    .catch((error) => {
      console.error("❌ Error configuring email transport:", error);
    });
} else {
  console.log("⚠️ Email no configurado. Usando modo DEMO");
}