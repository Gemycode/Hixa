const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const asyncHandler = require('express-async-handler');
const { body, param, query } = require('express-validator');

const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { MAX_FILE_UPLOAD } = require('../config/config');

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_UPLOAD) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.FILE_UPLOAD_PATH || './public/uploads';
      require('fs').mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `file-${uniqueSuffix}${ext}`);
    },
  }),
});

// Apply protection middleware to all routes
router.use(protect);

// @route   POST /api/messages
// @desc    Send a new message with optional attachments
// @access  Private
router.post(
  '/',
  upload.array('attachments', 10), // Max 10 files
  [
    body('chatRoomId', 'معرف غرفة الدردشة مطلوب').notEmpty(),
    body('content')
      .optional()
      .isString()
      .withMessage('يجب أن يكون المحتوى نصيًا')
      .isLength({ max: 2000 })
      .withMessage('يجب ألا يتجاوز المحتوى 2000 حرف'),
    body('type').optional().isIn(['text', 'system', 'notification']).withMessage('نوع الرسالة غير صالح'),
    body('replyTo')
      .optional()
      .isMongoId()
      .withMessage('معرف الرسالة المراد الرد عليها غير صالح'),
  ],
  validate,
  asyncHandler(messageController.sendMessage)
);

// @route   GET /api/messages/room/:roomId
// @desc    Get messages for a chat room with pagination
// @access  Private
router.get(
  '/room/:roomId',
  [
    param('roomId', 'معرف الغرفة غير صالح')
      .isMongoId()
      .withMessage('معرف الغرفة غير صالح'),
  ],
  validate,
  asyncHandler(messageController.getMessagesByRoom)
);

// @route   PUT /api/messages/:messageId/read
// @desc    Mark a message as read
// @access  Private
router.put(
  '/:messageId/read',
  [
    param('messageId', 'معرف الرسالة غير صالح')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
  ],
  validate,
  asyncHandler(messageController.markMessageAsRead)
);

// @route   GET /api/messages/unread-count
// @desc    Get count of unread messages for the current user
// @access  Private
router.get(
  '/unread-count',
  asyncHandler(messageController.getUnreadMessagesCount)
);

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message (soft delete)
// @access  Private
router.delete(
  '/:messageId',
  [
    param('messageId', 'معرف الرسالة غير صالح')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
  ],
  validate,
  asyncHandler(messageController.deleteMessage)
);

// @route   PUT /api/messages/:messageId/reactions
// @desc    Add or update a reaction to a message
// @access  Private
router.put(
  '/:messageId/reactions',
  [
    param('messageId', 'معرف الرسالة غير صالح')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
    body('emoji', 'يجب إضافة إيموجي').notEmpty(),
  ],
  validate,
  asyncHandler(messageController.updateReaction)
);

// @route   GET /api/messages/search
// @desc    Search messages in a chat room
// @access  Private
router.get(
  '/search',
  [
    query('roomId', 'معرف الغرفة مطلوب').isMongoId(),
    query('query', 'استعلام البحث مطلوب').notEmpty(),
  ],
  validate,
  asyncHandler(messageController.searchMessages)
);

// @route   POST /api/messages/typing
// @desc    Send typing indicator
// @access  Private
router.post(
  '/typing',
  [
    body('chatRoomId', 'معرف غرفة الدردشة مطلوب').isMongoId(),
    body('isTyping', 'حالة الكتابة مطلوبة').isBoolean(),
  ],
  validate,
  asyncHandler(messageController.sendTypingIndicator)
);

module.exports = router;