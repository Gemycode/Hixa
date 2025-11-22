const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم. يرجى رفع صورة بصيغة jpeg, jpg, png, gif, أو webp"));
    }
  },
});

// Single file upload middleware
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple files upload middleware
const uploadMultiple = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Upload multiple files with different field names
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Helper function to upload image buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = "hixa") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [{ width: 1920, height: 1080, crop: "limit" }],
      },
      (error, result) => {
        if (error) {
          reject(new Error(`فشل رفع الصورة: ${error.message}`));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract public_id from URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const parts = imageUrl.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");
    
    if (uploadIndex === -1) return;
    
    // Get the path after 'upload'
    const pathAfterUpload = parts.slice(uploadIndex + 2).join("/");
    const publicId = pathAfterUpload.split(".")[0]; // Remove extension
    
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadToCloudinary,
  deleteFromCloudinary,
};

