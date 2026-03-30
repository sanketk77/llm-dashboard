const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const cloudinary = require("cloudinary").v2;

const app = express();

app.use(cors());
app.use(express.json());

//////////////////////////////
// CLOUDINARY CONFIG
//////////////////////////////

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

//////////////////////////////
// FILE UPLOAD
//////////////////////////////

const upload = multer({ dest: "uploads/" });

//////////////////////////////
// VIDEO UPLOAD API
//////////////////////////////

app.post("/upload-video", upload.single("video"), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video"
        });

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            videoUrl: result.secure_url
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

//////////////////////////////
// TEST ROUTE
//////////////////////////////

app.get("/", (req, res) => {
    res.send("Backend Running 🚀");
});

//////////////////////////////

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});