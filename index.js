import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import admin from "firebase-admin";
import serviceAccount from "./blood-donation-firebase-adminsdk.json" with { type: "json" };

//! SDK--------------------------
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = process.env.PORT || 3000;

//! middleware----------------------------------
app.use(cors());
app.use(express.json());

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
    const bloodDonationRequestsCollection = db.collection("donation-requests");
    const fundingCollection = db.collection("fundings");

    //! firebase verify token---------------
    const verifyFBToken = async (req, res, next) => {
      //console.log("headerss", req?.headers?.authorization);
      try {
        const token = req?.headers?.authorization;
        if (!token) {
          return res.status(401).send({ message: "unauthorized!" });
        }
        const idToken = token.split(" ")[1];
        const decode = await admin?.auth().verifyIdToken(idToken);

        //
        const user = await usersCollection.findOne({ email: decode.email });
        if (!user) {
          return res.status(404).send({ message: "User not found!" });
        }
        if (user.status === "blocked") {
          return res
            .status(403)
            .send({ message: "Your account is blocked. Contact admin." });
        }
        //console.log(decode);
        req.decode_email = decode.email;
        next();
      } catch (error) {
        return res.status(401).send({ message: "unauthorized!" });
      }
    };

    //! verify token----------------------
    //* middleware admin before allowing admin activity--------------

    //!( verify admin) must be used after verify firebase token middleware------
    const verifyAdmin = async (req, res, next) => {
      const email = req.decode_email;
      const query = { email };
      if (!email) return res.status(401).send({ message: "Unauthorized!" });

      const user = await usersCollection.findOne(query);

      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "Forbidden!" });
      }
      next();
    };
    //! (veryfy donor) must be used after verify firebase token middleware------
    const verifyRider = async (req, res, next) => {
      const email = req.decode_email;
      const query = { email };
      if (!email) return res.status(401).send({ message: "Unauthorized!" });

      const user = await usersCollection.findOne(query);

      if (!user || user.role !== "rider") {
        return res.status(403).send({ message: "Forbidden!" });
      }
      next();
    };

    //* funding-crud ---------------------------------
    //! funding create-------------------------
    app.post("/funding", async (req, res) => {
      const newFunding = req.body;
      newFunding.fundingDate = new Date();
      const result = await fundingCollection.insertOne(newFunding);
      res.send(result);
    });

    //! funding get-all----------------------
    app.get("/get-funding", async (req, res) => {
      const result = await fundingCollection
        .find()
        .sort({ fundingDate: -1 })
        .toArray();
      res.send(result);
    });

    //! Dashboard get dashboard/donor/count/stats-------------
    app.get("/dashboard/donor/count/stats", async (req, res) => {
      try {
        //all roles--------------
        const totalAdmins = await usersCollection.countDocuments({
          role: "admin",
        });
        const totalVolunteers = await usersCollection.countDocuments({
          role: "volunteer",
        });
        const totalDonors = await usersCollection.countDocuments({
          role: "donor",
        });

        // blood donation request-------------
        const totalRequests =
          await bloodDonationRequestsCollection.countDocuments();

        //funding-----------------------
        const fundingResult = await fundingCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalFund: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        const totalFunding = fundingResult[0]?.totalFund || 0;

        res.send({
          totalAdmins,
          totalVolunteers,
          totalDonors,
          totalFunding,
          totalRequests,
        });
      } catch (err) {
        res.status(500).send({ message: "Failed to load stats" });
      }
    });

    //* users-crud---------------------------------------
    //! user create-------------------------
    app.post("/user", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      newUser.role = "donor";
      newUser.status = "active";
      newUser.createdAt = new Date();

      const userExigingEmail = await usersCollection.findOne({ email });
      if (userExigingEmail) {
        return res.status(409).json({ message: "Email is exiting!" });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    //! get user------------------------------------------------
    app.get("/get-user", verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //! get user email find role-------------------------
    app.get("/user-single/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role || "donor" });
    });

    //! update user----------------------------
    app.patch("/update-user/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;
      const userInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateUser = { $set: userInfo };
      const result = await usersCollection.updateOne(query, updateUser);
      res.send(result);
    });

    //* status-filter-role---get-update-------------------
    //! get user/status/filter--------------
    app.get("/user/status/filter", async (req, res) => {
      const { status } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //* status-active/blocked--------------------
    //! update update-user/role------------
    app.patch("/update-user/role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      const query = { _id: new ObjectId(id) };
      const updateRole = {
        $set: { role },
      };

      const result = await usersCollection.updateOne(query, updateRole);
      res.send(result);
    });

    //! update user/status------------
    app.patch("/update/user/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: { status },
      };

      const result = await usersCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    //* Donor requerst---------------------------
    //! create donation-requests----------------
    app.post("/donation-requests", async (req, res) => {
      const donorNew = req.body;
      donorNew.status = "pending";
      donorNew.createdAt = new Date();
      const result = await bloodDonationRequestsCollection.insertOne(donorNew);
      res.send(result);
    });

    //! get-donation-request--query-email---------------------
    app.get("/donation-requests", async (req, res) => {
      try {
        const { requesterEmail } = req.query;
        const query = {};
        if (requesterEmail) {
          query.requesterEmail = requesterEmail;
        }
        const result = await bloodDonationRequestsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch donation requests" });
      }
    });
    //! get by id donation request---------------
    app.get("/single-donation-requests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bloodDonationRequestsCollection.findOne(query);
      res.send(result);
    });

    //! get all blood-donation-request-----------
    app.get(
      "/all-blood/donations/request",
      verifyFBToken,
      async (req, res) => {
        const resutl = await bloodDonationRequestsCollection.find().toArray();
        res.send(resutl);
      },
    );

    //! update-status update-donation-status-------------
    app.patch("/update-donation-status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };
      const update = {
        $set: { status },
      };
      const result = await bloodDonationRequestsCollection.updateOne(
        query,
        update,
      );
      res.send(result);
    });

    //! update all field update-donation-------------
    app.patch("/edit-donation-request/all/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { _id, ...updatedData } = req.body;

        const query = { _id: new ObjectId(id) };
        const update = { $set: { ...updatedData, createdAt: new Date() } };

        const result = await bloodDonationRequestsCollection.updateOne(
          query,
          update,
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update donation request" });
      }
    });

    //! Get all donation requests for donor (for My Donation Requests page)
    app.get("/donation-requests/all", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email)
          return res.status(400).json({ message: "User email required" });

        const donationRequests = await bloodDonationRequestsCollection
          .find({ requesterEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.json(donationRequests);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    //! Delete donation request----------------------
    app.delete("/delete-donation-requests/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await bloodDonationRequestsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0)
          return res
            .status(404)
            .json({ message: "Donation request not found" });

        res.json({ message: "Donation request deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
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
