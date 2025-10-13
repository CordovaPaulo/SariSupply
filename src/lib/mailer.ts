import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAILER_EMAIL || 'sarisupply@gmail.com',
        pass: process.env.MAILER_PASSWORD,
    },
});
