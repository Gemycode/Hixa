const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { BadRequestError } = require('./errors');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Promisify Cloudinary upload and destroy methods
const uploadFile = promisify(cloudinary.uploader.upload);
const deleteFile = promisify(cloudinary.uploader.destroy);

// Allowed file types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
};

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a file to Cloudinary
 * @param {Object} file - Multer file object
 * @param {String} folder - Folder in Cloudinary to store the file
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = async (file, folder = 'hixa/files') => {
  try {
    // Check if file exists
    if (!file) {
      throw new BadRequestError('لم يتم تحميل أي ملف');
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
      throw new BadRequestError('نوع الملف غير مدعوم');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
    }

    // Create a unique filename
    const extension = ALLOWED_FILE_TYPES[file.mimetype];
    const timestamp = Date.now();
    const filename = `file_${timestamp}.${extension}`;

    // Upload file to Cloudinary
    const result = await uploadFile(file.path, {
      folder,
      public_id: path.parse(filename).name,
      resource_type: 'auto',
    });

    // Delete temp file
    await fs.promises.unlink(file.path);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    // Clean up temp file if it exists
    if (file && file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {String} publicId - Public ID of the file in Cloudinary
 * @param {String} resourceType - Type of the resource (image, video, raw)
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) {
      throw new BadRequestError('معرف الملف مطلوب');
    }

    const result = await deleteFile(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Handle multiple file uploads
 * @param {Array} files - Array of Multer file objects
 * @param {String} folder - Folder in Cloudinary to store the files
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleFiles = async (files, folder = 'hixa/files') => {
  try {
    if (!files || files.length === 0) {
      throw new BadRequestError('لم يتم تحميل أي ملفات');
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
    const results = await Promise.all(uploadPromises);

    return results;
  } catch (error) {
    // Clean up any uploaded files if there was an error
    if (files && files.length > 0) {
      await Promise.all(
        files.map((file) =>
          file && file.path ? fs.promises.unlink(file.path).catch(console.error) : Promise.resolve()
        )
      );
    }
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleFiles,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
};
