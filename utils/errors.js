class BaseError extends Error {
  constructor(message, statusCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class NotFoundError extends BaseError {
  constructor(message = 'الملف المطلوب غير موجود') {
    super(message, 404);
  }
}

class ForbiddenError extends BaseError {
  constructor(message = 'غير مصرح لك بالوصول إلى هذا المورد') {
    super(message, 403);
  }
}

class BadRequestError extends BaseError {
  constructor(message = 'طلب غير صالح') {
    super(message, 400);
  }
}

class UnauthorizedError extends BaseError {
  constructor(message = 'غير مصرح. يرجى تسجيل الدخول') {
    super(message, 401);
  }
}

class ValidationError extends BaseError {
  constructor(message = 'بيانات غير صالحة', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class RateLimitExceededError extends BaseError {
  constructor(message = 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً') {
    super(message, 429);
  }
}

module.exports = {
  BaseError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnauthorizedError,
  ValidationError,
  RateLimitExceededError,
};
