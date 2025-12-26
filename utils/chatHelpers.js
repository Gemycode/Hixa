/**
 * Chat Helpers - Utility functions for chat system
 */

const Message = require("../models/messageModel");
const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");

/**
 * Calculate unread count for a user in a chat room
 * @param {string} chatRoomId - Chat room ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
async function calculateUnreadCountForChatRoom(chatRoomId, userId) {
  try {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) return 0;

    // Find participant's lastReadAt
    const participant = chatRoom.participants.find(
      p => p.user.toString() === userId.toString()
    );

    if (!participant || !participant.lastReadAt) {
      // If never read, count all messages except system messages
      const count = await Message.countDocuments({
        chatRoom: chatRoomId,
        sender: { $ne: userId },
        type: { $ne: "system" },
        isDeleted: false,
      });
      return count;
    }

    // Count messages after lastReadAt
    const count = await Message.countDocuments({
      chatRoom: chatRoomId,
      sender: { $ne: userId },
      type: { $ne: "system" },
      isDeleted: false,
      createdAt: { $gt: participant.lastReadAt },
      "readBy.user": { $ne: userId },
    });

    return count;
  } catch (error) {
    console.error("Error calculating unread count:", error);
    return 0;
  }
}

/**
 * Calculate unread count for a user across all chat rooms in a project room
 * @param {string} projectRoomId - Project room ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} Total unread count
 */
async function calculateUnreadCountForProjectRoom(projectRoomId, userId) {
  try {
    // Get all chat rooms in this project room where user is participant
    const chatRooms = await ChatRoom.find({
      projectRoom: projectRoomId,
      "participants.user": userId,
      status: "active",
    }).select("_id");

    let totalUnread = 0;

    // Calculate unread count for each chat room
    for (const chatRoom of chatRooms) {
      const unread = await calculateUnreadCountForChatRoom(chatRoom._id, userId);
      totalUnread += unread;
    }

    return totalUnread;
  } catch (error) {
    console.error("Error calculating project room unread count:", error);
    return 0;
  }
}

/**
 * Update lastReadAt for a participant in a chat room
 * @param {string} chatRoomId - Chat room ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function updateLastReadAt(chatRoomId, userId) {
  try {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) return;

    const participantIndex = chatRoom.participants.findIndex(
      p => p.user.toString() === userId.toString()
    );

    if (participantIndex !== -1) {
      chatRoom.participants[participantIndex].lastReadAt = new Date();
      await chatRoom.save();
    }
  } catch (error) {
    console.error("Error updating lastReadAt:", error);
  }
}

/**
 * Add unread count to chat room data
 * @param {Object} chatRoom - Chat room object
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Chat room with unread count
 */
async function addUnreadCountToChatRoom(chatRoom, userId) {
  const unreadCount = await calculateUnreadCountForChatRoom(chatRoom._id || chatRoom.id, userId);
  
  const chatRoomObj = chatRoom.toObject ? chatRoom.toObject() : chatRoom;
  return {
    ...chatRoomObj,
    unreadCount,
  };
}

/**
 * Add unread count to multiple chat rooms
 * @param {Array} chatRooms - Array of chat room objects
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Chat rooms with unread counts
 */
async function addUnreadCountToChatRooms(chatRooms, userId) {
  const chatRoomsWithUnread = await Promise.all(
    chatRooms.map(chatRoom => addUnreadCountToChatRoom(chatRoom, userId))
  );
  return chatRoomsWithUnread;
}

/**
 * Add unread count to project room data
 * @param {Object} projectRoom - Project room object
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Project room with unread count
 */
async function addUnreadCountToProjectRoom(projectRoom, userId) {
  const unreadCount = await calculateUnreadCountForProjectRoom(
    projectRoom._id || projectRoom.id,
    userId
  );

  const projectRoomObj = projectRoom.toObject ? projectRoom.toObject() : projectRoom;
  return {
    ...projectRoomObj,
    unreadCount,
  };
}

/**
 * Add unread count to multiple project rooms
 * @param {Array} projectRooms - Array of project room objects
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Project rooms with unread counts
 */
async function addUnreadCountToProjectRooms(projectRooms, userId) {
  const projectRoomsWithUnread = await Promise.all(
    projectRooms.map(projectRoom => addUnreadCountToProjectRoom(projectRoom, userId))
  );
  return projectRoomsWithUnread;
}

module.exports = {
  calculateUnreadCountForChatRoom,
  calculateUnreadCountForProjectRoom,
  updateLastReadAt,
  addUnreadCountToChatRoom,
  addUnreadCountToChatRooms,
  addUnreadCountToProjectRoom,
  addUnreadCountToProjectRooms,
};
