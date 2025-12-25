const User = require("../models/userModel");

// Cache for system user ID
let systemUserId = null;

/**
 * Get or create system user for system messages
 * @returns {Promise<string>} System user ID
 */
const getSystemUserId = async () => {
  if (systemUserId) {
    return systemUserId;
  }

  try {
    // Try to find existing system user
    let systemUser = await User.findOne({ 
      email: "system@hixa.com",
      role: "admin"
    });

    if (!systemUser) {
      // Create system user if doesn't exist
      systemUser = await User.create({
        email: "system@hixa.com",
        password: process.env.SYSTEM_USER_PASSWORD || "SystemUser@123!@#",
        role: "admin",
        name: "نظام",
        isActive: true,
      });
    }

    systemUserId = systemUser._id.toString();
    return systemUserId;
  } catch (error) {
    console.error("Error getting system user:", error);
    // Fallback: return a dummy ObjectId if something goes wrong
    // This should not happen in production
    throw new Error("Failed to get system user");
  }
};

/**
 * Clear system user cache (useful for testing)
 */
const clearSystemUserCache = () => {
  systemUserId = null;
};

module.exports = {
  getSystemUserId,
  clearSystemUserCache,
};


