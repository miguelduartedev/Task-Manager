const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SEND_GRID);

const sendWelcomeEmail = (email, name) => {
  sgMail
    .send({
      to: email,
      from: process.env.EMAIL,
      subject: 'Thanks for joining in!',
      text: `Welcome to Task Manager, ${name}! Let me know how you get along with the app.`,
    })
    .then(() => {
      console.log('Email sent');
    })
    .catch((error) => {
      console.error(error);
    });
};

const sendCancelationEmail = (email, name) => {
  sgMail
    .send({
      to: email,
      from: process.env.EMAIL,
      subject: 'Sorry to see you go!',
      text: `Goodbye, ${name}. We hope to see you back sometime soon.`,
    })
    .then(() => {
      console.log('Email sent');
    })
    .catch((error) => {
      console.error(error);
    });
};

module.exports = { sendWelcomeEmail, sendCancelationEmail };
