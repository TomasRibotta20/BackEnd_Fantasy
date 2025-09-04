import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: "arielmazalan15@gmail.com",
    pass: '',
  },
});

transporter.verify().then(() => {
  console.log("Ready to send emails");
});