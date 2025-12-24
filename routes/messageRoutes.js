const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { body, param, query } = require('express-validator');

const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadMultiple } = require('../middleware/upload');

router.use(protect);

const {
  validateMessageCreate,
  validateMessageMarkAsRead,
  validateMessageDelete,
  validateMessageReaction,
  validateMessageSearch,
} = require('../middleware/validate');

// Send a new message
router.post(
  '/',
  uploadMultiple('attachments', 10),
  validateMessageCreate,
  asyncHandler(messageController.sendMessage)
);

// Get messages for a chat room
router.get(
  '/room/:roomId',
  param('roomId').isMongoId().withMessage('معرف الغرفة غير صالح'),
  validate,
  asyncHandler(messageController.getMessagesByRoom)
);

// Mark message as read
router.patch(
  '/:messageId/read',
  validateMessageMarkAsRead,
  asyncHandler(messageController.markMessageAsRead)
);

// Get unread messages count
router.get('/unread/count', asyncHandler(messageController.getUnreadMessagesCount));

// Update message (edit)
router.put(
  '/:messageId',
  param('messageId').isMongoId().withMessage('معرف الرسالة غير صالح'),
  body('content')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('يجب ألا يتجاوز المحتوى 5000 حرف'),
  validate,
  asyncHandler(messageController.updateMessage)
);

// Delete message
router.delete(
  '/:messageId',
  validateMessageDelete,
  asyncHandler(messageController.deleteMessage)
);

// Add/Remove reaction
router.post(
  '/:messageId/reaction',
  validateMessageReaction,
  asyncHandler(messageController.toggleReaction)
);

// Search messages
router.get(
  '/search',
  validateMessageSearch,
  asyncHandler(messageController.searchMessages)
);

module.exports = router;
