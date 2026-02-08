import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import serviceAccount from "./blood-donation-firebase-adminsdk.json" with { type: "json" };


const app = express();
const port = process.env.PORT || 3000;

//! middleware----------------------------------
app.use(cors());
app.use(express.json());

// mongodb---------------------
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const client = new MongoClient(process.env.DATABASE_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("blood-donation");
    const usersCollection = db.collection("users");

    //* APIs ---------------------------------
    app.post("/user", async (req, res) => {
      const newUser = req.body;
      newUser.role = "donor";
      newUser.status = "active";
      newUser.createdAt = new Date();

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });
    app.get("/", (req, res) => {
      res.send("Blood Donation Server Running 🩸");
    });

    /* end------------------------------------------ */
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running port ${port} ✅`);
});
