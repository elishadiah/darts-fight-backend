const emailjs = require("@emailjs/nodejs");

const sendEmailNotification = async (
  to_name,
  to_email,
  from_name,
  from_email,
  message,
  subject
) => {
  const templateParams = {
    to_name: to_name,
    to_email: to_email,
    from_name: from_name,
    from_email: from_email,
    message: message,
    subject: subject,
  };

  try {
    const res = emailjs.send(
      "service_4n8l9j4",
      "template_47aorgi",
      templateParams,
      {
        publicKey: "FsC9GcGGNTtVkNr1j",
        privateKey: "q4hfWErgU_EfPxYnF0lsh",
      }
    );
    console.log("SUCCESS!", res.status, res.text);
  } catch (err) {
    console.log("FAILED...", err);
  }
};

module.exports = {
  sendEmailNotification,
};
