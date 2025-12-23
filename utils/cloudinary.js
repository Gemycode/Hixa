const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Promisify Cloudinary methods
const uploadPromise = promisify(cloudinary.uploader.upload);
const destroyPromise = promisify(cloudinary.uploader.destroy);

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Folder to upload to (optional)
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = async (filePath, folder = 'hixa/attachments') => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const result = await uploadPromise(filePath, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    // Delete the temp file after upload
    fs.unlinkSync(filePath);

    return result;
  } catch (error) {
    // Clean up the temp file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Cloudinary upload error:', error);
    throw new Error('فشل في رفع الملف');
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const result = await destroyPromise(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('فشل في حذف الملف');
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {string[]} publicIds - Array of public IDs to delete
 * @returns {Promise<Array>} - Array of deletion results
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      publicIds.map(publicId => 
        deleteFromCloudinary(publicId).catch(error => ({
          publicId,
          success: false,
          error: error.message,
        }))
      )
    );

    return results;
  } catch (error) {
    console.error('Error deleting multiple files from Cloudinary:', error);
    throw new Error('فشل في حذف الملفات');
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  cloudinary, // Exporting the cloudinary instance for other uses if needed
};
