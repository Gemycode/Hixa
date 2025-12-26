const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { body, param, query } = require('express-validator');

const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadMultiple } = require('../middleware/upload');

// Log all requests to message routes
router.use((req, res, next) => {
  console.log('🔍 Message route request:', req.method, req.path, 'Params:', req.params);
  next();
});

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
  (req, res, next) => {
    // Log request details for debugging
    console.log('📤 POST /messages - Request received');
    console.log('📤 Body:', req.body);
    console.log('📤 Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files');
    console.log('📤 Content-Type:', req.headers['content-type']);
    next();
  },
  validateMessageCreate,
  asyncHandler(messageController.sendMessage)
);

// Get messages for a chat room
router.get(
  '/room/:roomId',
  (req, res, next) => {
    console.log('🔍 GET /api/messages/room/:roomId - Route matched');
    console.log('🔍 roomId param:', req.params.roomId);
    const isValid = require('mongoose').Types.ObjectId.isValid(req.params.roomId);
    console.log('🔍 roomId isMongoId?', isValid);
    
    // Validate roomId manually to avoid middleware issues
    if (!isValid) {
      console.error('❌ Invalid roomId format');
      return res.status(400).json({ message: 'معرف الغرفة غير صالح' });
    }
    
    next();
  },
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
