const mongoose = require("mongoose");
const dotenv = require("dotenv");
const https = require("https");
const fs = require("fs");

const Socket = require("./socket");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION!!!! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => console.log("DB connection successful!"));

const port = process.env.PORT || 3000;

let server;

if (process.env.NODE_ENV === "procuction") {
  const sslOptions = {
    key: fs.readFileSync(
      path.join(
        __dirname,
        "/etc/letsencrypt/live/www.boolmung.duckdns.org/fullchain.pem"
      )
    ),
    cert: fs.readFileSync(
      path.join(
        __dirname,
        "/etc/letsencrypt/live/www.boolmung.duckdns.org/privkey.pem"
      )
    ),
  };
  server = https.createServer(sslOptions, app).listen(port, () => {
    console.log(`HTTPS App running on port ${port}...`);
  });
} else {
  server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
  });
}

Socket(server, app);

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION!!!! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
