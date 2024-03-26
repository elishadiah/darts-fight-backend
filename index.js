const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http").Server(app);
const cron = require("node-cron");
const emailjs = require("@emailjs/nodejs");
const ScheduleModel = require("./models/schedule.model.js");
const EventModel = require("./models/events.model.js");

const PORT = 4000;
const mongoURI =
  "mongodb+srv://diahelisha:51K8YoxU3k90C62J@darts-fight-database-4d8fe03d.mongo.ondigitalocean.com/admin";

// routes
const AuthRoute = require("./routes/auth.route.js");
const AvatarRoute = require("./routes/avatar.route.js");
const ResultRoute = require("./routes/result.route.js");
const ScheduleRoute = require("./routes/schedule.route.js");
const EventRoute = require("./routes/event.route.js");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

let users = [];

socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  // Update status to 'Online' when user is connected
  socket.on("new-user", (data) => {
    users.push(data);
    console.log("new-user-->>", data);
    socketIO.emit("statusUpdate", users);
    socketIO.emit("new-user-response", users);
  });

  // Update status to 'Offline' when user is disconnected
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected: !!!");
    users = users.filter((val) => val.socketId !== socket.id);
    socketIO.emit("statusUpdate", users);
    socket.disconnect();
  });

  // Update status to 'Occupied' when user is challenging another user
  socket.on("challenge", (data) => {
    console.log("Challenge-->>", data);

    socketIO.emit("challengeResponse", {
      user: data.receiver,
      challenger: data.challenger,
      challengerEmail: data.challengerEmail,
    });
    socketIO.emit("statusUpdate", {
      receiver: data.receiver,
      challenger: data.challenger,
      status: "Occupied",
    });
  });

  socket.on("schedule-challenge", async (data) => {
    console.log("schedule-challenge-->>", data);
    try {
      await ScheduleModel.create({
        date: data.date,
        challenger: data.challenger,
        challengerEmail: data.challengerEmail,
        receiver: data.receiver,
        receiverEmail: data.receiverEmail,
      });
    } catch (err) {
      console.log('schedule_save--->>>', err);
     }
    // socketIO.emit("schedule-challenge-response", {
    //   date: data.date,
    //   challenger: data.challenger,
    //   challengerEmail: data.challengerEmail,
    //   user: data.receiver,
    //   email: data.receiverEmail,
    // });
  });
});

const addMinutes = (date, minutes) => {
  const dateCopy = new Date(date);
  dateCopy.setMinutes(dateCopy.getMinutes() + minutes);
  return dateCopy;
};

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

const removeSchedule = async (id) => {
  try {
    await ScheduleModel.findByIdAndDelete(id);
  } catch (err) {
    console.log("----->>", err);
  }
};

cron.schedule("* * * * *", async () => {
  try {
    const schedules = await ScheduleModel.find();
    schedules.map((item) => {
      if (new Date() > addMinutes(item.date, -240) && new Date() < addMinutes(item.date, -238)) {
        sendEmailNotification(
          item.receiver,
          item.receiverEmail,
          item.challenger,
          item.challengerEmail,
          "Bis zum Spiel sind es noch weniger als 4 Stunden. Wenn Sie jetzt absagen, verlieren Sie im Grunde das Spiel. Wenn Sie abbrechen möchten, stornieren Sie bitte die geplante Herausforderung auf der Seite „Profil“.",
          "Kommende Herausforderungen"
        );
      } else if (new Date() > addMinutes(item.date, -5) && new Date() < addMinutes(item.date, -3)) {
        console.log("Cron-schedule--notification-->>", item);
        sendEmailNotification(
          item.receiver,
          item.receiverEmail,
          item.challenger,
          item.challengerEmail,
          "Es ist Zeit, mit Ihrer bevorstehenden Herausforderung zu beginnen. Bitte erstellen Sie auf Ihrer „Profil“-Seite eine Challenge.",
          "Kommende Herausforderungen"
        );
      } else if (new Date() >= addMinutes(item.date, 10)) {
        console.log("Cron-schedule--remove-->>", item);
        removeSchedule(item._id);
      }
      console.log("Cron-schedule-->>", item);
    });
  } catch (err) {
    console.log("Cron-schedule-err-->>", err);
  }
});

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connected!"))
  .catch((error) => console.log(`${error} did not connect`));

app.get("/api", (req, res) => {
  res.json({ message: "Hello TTT" });
});
app.use("/auth", AuthRoute);
app.use("/avatar", AvatarRoute);
app.use("/result", ResultRoute);
app.use("/schedule", ScheduleRoute);
app.use("/event", EventRoute);

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
