const { StatusCodes } = require('http-status-codes');

/**
 * Success response handler
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code
 * @returns {Object} - Formatted response
 */
const successResponse = (
  res,
  data = null,
  message = 'تمت العملية بنجاح',
  statusCode = StatusCodes.OK
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    // Handle pagination data
    if (data.docs) {
      response.data = data.docs;
      response.pagination = {
        total: data.totalDocs,
        limit: data.limit,
        page: data.page,
        pages: data.totalPages,
      };
    } else {
      response.data = data;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response handler
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {String} defaultMessage - Default error message
 * @param {Number} defaultStatusCode - Default HTTP status code
 * @returns {Object} - Formatted error response
 */
const errorResponse = (
  res,
  error,
  defaultMessage = 'حدث خطأ ما',
  defaultStatusCode = StatusCodes.INTERNAL_SERVER_ERROR
) => {
  // Log the error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', error);
  }

  const statusCode = error.statusCode || defaultStatusCode;
  let message = error.message || defaultMessage;
  let errors = error.errors || [];

  // Handle validation errors
  if (error.name === 'ValidationError') {
    message = 'خطأ في التحقق من صحة البيانات';
    errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
  }

  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    message = `${field} موجود مسبقاً`;
    errors = [
      {
        field,
        message: `هذا ${field} مستخدم بالفعل`,
      },
    ];
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    message = 'رمز الوصول غير صالح';
  }

  if (error.name === 'TokenExpiredError') {
    message = 'انتهت صلاحية رمز الوصول';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};

// Export response handlers
module.exports = {
  successResponse,
  errorResponse,
  StatusCodes,
};

// Example usage in a controller:
/*
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getItems = async (req, res) => {
  try {
    const items = await Item.find();
    return successResponse(res, items, 'تم جلب العناصر بنجاح');
  } catch (error) {
    return errorResponse(res, error, 'حدث خطأ أثناء جلب العناصر');
  }
};
*/
