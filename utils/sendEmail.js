import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"RalpHome" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent to:", to);
    } catch (error) {
        console.error("❌ Email send failed:", error);
    }
};

export default sendEmail;
