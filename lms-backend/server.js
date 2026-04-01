const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const cloudinary = require("cloudinary").v2;

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

//////////////////////////////
// CLOUDINARY CONFIG
//////////////////////////////

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

//////////////////////////////
// FILE UPLOAD (TEMP STORAGE)
//////////////////////////////

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif"
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
});

//////////////////////////////
// UPLOAD API (VIDEO + PDF)
//////////////////////////////

// Change upload.single("file") to upload.any()
app.post("/upload", upload.any(), async (req, res) => {
    try {
        // Since we used .any(), check if files array exists and has content
        const file = (req.files && req.files.length > 0) ? req.files[0] : null;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded. Check your field name in Postman." });
        }

        console.log(`📁 Processing ${file.fieldname}: ${file.originalname}`);

        // Determine resource type for Cloudinary
        let resourceType = "auto"; 
        if (file.mimetype.startsWith("video/")) {
            resourceType = "video";
        } else if (file.mimetype === "application/pdf") {
            resourceType = "raw"; // Best for PDFs to preserve formatting
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            resource_type: resourceType,
            folder: "llm_mastery", // Organizes files in Cloudinary
            timeout: 120000
        });

        // Cleanup: delete temp file from /uploads
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        res.json({ 
            success: true, 
            url: result.secure_url, 
            publicId: result.public_id,
            format: result.format 
        });

    } catch (err) {
        console.error("❌ Upload Error:", err);
        
        // Ensure temp file is deleted even if upload fails
        if (req.files && req.files[0] && fs.existsSync(req.files[0].path)) {
            fs.unlinkSync(req.files[0].path);
        }

        res.status(500).json({ 
            error: "Upload failed", 
            details: err.message 
        });
    }
});

//////////////////////////////
// TEST ROUTE
//////////////////////////////

app.get("/", (req, res) => {
    res.send("Backend Running 🚀");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", cloudinary: !!cloudinary });
});

//////////////////////////////

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});