const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const asyncHandler = require('express-async-handler');
const { body, param, query } = require('express-validator');

const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Multer setup
const upload = multer({
  limits: { fileSize: parseInt(process.env.MAX_FILE_UPLOAD) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg','image/png','image/gif','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('نوع الملف غير مدعوم'), false);
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.FILE_UPLOAD_PATH || './public/uploads';
      require('fs').mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `file-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  })
});

router.use(protect);

// Define all routes (POST, GET, PUT, DELETE) as you sent
// [**Use the code exactly كما هو مع asyncHandler**]

module.exports = router;
