const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


transporter.verify((error, success) => {
    if (error) {
        console.log("Email transporter error:", error);
    } else {
        console.log("Email transporter is ready");
    }
});


const sendOtpEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Naadan Box - Email Verification",
        html: `
            <h2>NAADAN BOX</h2>
            <p>Your verification code is:</p>
            <h1>${otp}</h1>
            <p>This OTP will expire in 5 minutes.</p>
        `
    };

     console.time("OTP email sending");

    await transporter.sendMail(mailOptions);
    console.timeEnd("OTP email sending");
};

module.exports = {sendOtpEmail};