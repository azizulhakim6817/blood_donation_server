import fs from "fs";

const key = fs.readFileSync("./blood-donation-firebase-adminsdk.json", "utf8");

const base64 = Buffer.from(key).toString("base64");
console.log(base64);

// node keyconvert.js
/* .env -> FB_SERVER_KEY= code--page */
