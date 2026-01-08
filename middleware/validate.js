const { body, param, query, validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/errors');

const Joi = require('joi');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const roles = ['admin', 'engineer', 'client', 'customer'];

// Reusable validation rules
const commonRules = {
  email: {
    isEmail: {
      errorMessage: 'البريد الإلكتروني غير صحيح',
    },
    normalizeEmail: true,
  },
  password: {
    isStrongPassword: {
      errorMessage: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم واحد على الأقل',
      options: {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      },
    },
  },
  objectId: {
    isMongoId: {
      errorMessage: 'معرف غير صالح',
    },
  },
};

// Common validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    try {
      if (req.path && req.path.includes('/messages')) {
        console.log('🔍 Validate middleware - Running validations for:', req.path);
      }
      
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
        if (req.path && req.path.includes('/messages')) {
          console.log('✅ Validate middleware - Validation passed, calling next()');
        }
      return next();
    }

      if (req.path && req.path.includes('/messages')) {
        console.error('❌ Validate middleware - Validation errors:', errors.array());
      }

    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

    return next(new BadRequestError('بيانات غير صالحة', 400, extractedErrors));
    } catch (error) {
      if (req.path && req.path.includes('/messages')) {
        console.error('❌ Validate middleware - Error:', error);
      }
      next(error);
    }
  };
};

// Register validation
const registerRules = [
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage('يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم واحد على الأقل'),
  
  body('phone')
    .notEmpty().withMessage('رقم الهاتف مطلوب')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('رقم الهاتف يجب أن يكون بين 5 و 50 حرف'),
  
  body('countryCode')
    .notEmpty().withMessage('كود البلد مطلوب')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('كود البلد يجب أن يكون بين 1 و 10 أحرف'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('يجب ألا يتجاوز الاسم 100 حرف'),
    
  body('role')
    .optional()
    .isIn(['engineer', 'client', 'customer'])
    .withMessage('الدور المحدد غير صالح'),
];

const validateRegister = validate(registerRules);

// Login validation
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.email": "البريد الإلكتروني غير صحيح",
      "any.required": "البريد الإلكتروني مطلوب",
    }),
    password: Joi.string().required().messages({
      "any.required": "كلمة المرور مطلوبة",
    }),
    rememberMe: Joi.boolean().optional(), // حقل اختياري لتذكر تسجيل الدخول
  });

  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Hero validation
const validateHero = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).required(),
    title_ar: Joi.string().max(200).required(),
    subtitle_en: Joi.string().max(1000).required(),
    subtitle_ar: Joi.string().max(1000).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// About validation
const validateAbout = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    description_en: Joi.string().max(5000).optional(),
    description_ar: Joi.string().max(5000).optional(),
    values: Joi.array()
      .items(
        Joi.object({
          title_en: Joi.string().max(200).optional(),
          title_ar: Joi.string().max(200).optional(),
          description_en: Joi.string().max(1000).optional(),
          description_ar: Joi.string().max(1000).optional(),
          icon: Joi.string().max(100).allow("").optional(), // lucide-react icon name
        })
      )
      .optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Services validation
const validateService = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    description_en: Joi.string().max(1000).optional(),
    description_ar: Joi.string().max(1000).optional(),
    icon: Joi.string().allow("").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Service detail validation
const validateServiceDetail = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    details_en: Joi.string().max(5000).optional(),
    details_ar: Joi.string().max(5000).optional(),
    image: Joi.string().uri().allow("").optional(),
    qrCodeImage: Joi.string().uri().allow("").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Projects validation
const validateProjects = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    subtitle_en: Joi.string().max(1000).optional(),
    subtitle_ar: Joi.string().max(1000).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title_en: Joi.string().max(200).optional(),
          title_ar: Joi.string().max(200).optional(),
          description_en: Joi.string().max(1000).optional(),
          description_ar: Joi.string().max(1000).optional(),
          image: Joi.string().uri().allow("").optional(),
          link: Joi.string().uri().allow("").optional(),
        })
      )
      .optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Jobs validation
const validateJobs = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    subtitle_en: Joi.string().max(1000).optional(),
    subtitle_ar: Joi.string().max(1000).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title_en: Joi.string().max(200).optional(),
          title_ar: Joi.string().max(200).optional(),
          description_en: Joi.string().max(1000).optional(),
          description_ar: Joi.string().max(1000).optional(),
          link: Joi.string().uri().allow("").optional(),
          isActive: Joi.boolean().optional(),
        })
      )
      .optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Job item validation
const validateJobItem = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    description_en: Joi.string().max(1000).optional(),
    description_ar: Joi.string().max(1000).optional(),
    link: Joi.string().uri().allow("").optional(),
    isActive: Joi.boolean().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Project item validation (for add/update single item)
const validateProjectItem = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    description_en: Joi.string().max(1000).optional(),
    description_ar: Joi.string().max(1000).optional(),
    image: Joi.string().uri().allow("").optional(),
    link: Joi.string().uri().allow("").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Partners validation
const validatePartners = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    subtitle_en: Joi.string().max(1000).optional(),
    subtitle_ar: Joi.string().max(1000).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Partner item validation
const validatePartnerItem = (req, res, next) => {
  const schema = Joi.object({
    name_en: Joi.string().max(200).optional(),
    name_ar: Joi.string().max(200).optional(),
    logo: Joi.string().uri().allow("").optional(),
    link: Joi.string().uri().allow("").optional(),
    isActive: Joi.boolean().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Features validation
const validateFeatures = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    subtitle_en: Joi.string().max(1000).optional(),
    subtitle_ar: Joi.string().max(1000).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title_en: Joi.string().max(200).optional(),
          title_ar: Joi.string().max(200).optional(),
          description_en: Joi.string().max(1000).optional(),
          description_ar: Joi.string().max(1000).optional(),
          icon: Joi.string().allow("").optional(),
        })
      )
      .optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// CTA validation
const validateCTA = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).optional(),
    title_ar: Joi.string().max(200).optional(),
    subtitle_en: Joi.string().max(1000).optional(),
    subtitle_ar: Joi.string().max(1000).optional(),
    buttonText_en: Joi.string().max(100).optional(),
    buttonText_ar: Joi.string().max(100).optional(),
    buttonLink: Joi.string().uri().allow("").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Footer validation
const validateFooter = (req, res, next) => {
  const schema = Joi.object({
    description_en: Joi.string().max(1000).optional(),
    description_ar: Joi.string().max(1000).optional(),
    copyright_en: Joi.string().max(200).optional(),
    copyright_ar: Joi.string().max(200).optional(),
    links: Joi.array()
      .items(
        Joi.object({
          title_en: Joi.string().max(100).optional(),
          title_ar: Joi.string().max(100).optional(),
          url: Joi.string().max(500).allow("").optional(), // Allow hash links like #about or full URLs
        })
      )
      .max(20)
      .optional(),
    social: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().max(100).optional(),
          url: Joi.string().uri().allow("").optional(),
        })
      )
      .max(20)
      .optional(),
    contact: Joi.object({
      email: Joi.string().email().allow("").optional(),
      phone: Joi.string().max(50).allow("").optional(),
      address_en: Joi.string().max(500).allow("").optional(),
      address_ar: Joi.string().max(500).allow("").optional(),
    }).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

// Work (portfolio) validation
const workStatuses = ["Pending Review", "In Progress", "Completed"];

const validateWork = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().trim().max(200).required(),
    category: Joi.string().trim().max(100).valid(
      "المقاولات العامة",
      "التطوير والتسويق العقاري",
      "الأعمال الإنشائية",
      "خدمات هندسية وتصاميم معمارية وديكور",
      "الإشراف على المشاريع والاستشارات الهندسية",
      "المواد والمنتجات الهندسية",
      "أعمال العظم",
      "الأعمال المعمارية والتشطيبات",
      "أعمال الفرش والديكور",
      "الأعمال الكهروميكانيكية (MEP)",
      "أعمال الطرق والبنية التحتية",
      "أعمال اللاندسكيب والموقع العام",
      "أعمال الألمنيوم والمعدنية والخشبية",
      "أعمال العزل والحماية",
      "أعمال المسابح والمسطحات المائية",
      "أعمال التشغيل والصيانة والتسليم"
    ).required().messages({
      "any.only": "نطاق الأعمال غير صحيح",
    }),
    date: Joi.date().required(),
    description: Joi.string().trim().max(5000).required(),
    location: Joi.string().trim().max(200).optional(),
    client: Joi.string().trim().max(200).optional(),
    status: Joi.string().valid(...workStatuses).optional(),
    keyFeatures: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim().max(300)),
        Joi.string().allow("")
      )
      .optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

const validateWorkUpdate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().trim().max(200).optional(),
    category: Joi.string().trim().max(100).valid(
      "المقاولات العامة",
      "التطوير والتسويق العقاري",
      "الأعمال الإنشائية",
      "خدمات هندسية وتصاميم معمارية وديكور",
      "الإشراف على المشاريع والاستشارات الهندسية",
      "المواد والمنتجات الهندسية",
      "أعمال العظم",
      "الأعمال المعمارية والتشطيبات",
      "أعمال الفرش والديكور",
      "الأعمال الكهروميكانيكية (MEP)",
      "أعمال الطرق والبنية التحتية",
      "أعمال اللاندسكيب والموقع العام",
      "أعمال الألمنيوم والمعدنية والخشبية",
      "أعمال العزل والحماية",
      "أعمال المسابح والمسطحات المائية",
      "أعمال التشغيل والصيانة والتسليم"
    ).optional().messages({
      "any.only": "نطاق الأعمال غير صحيح",
    }),
    date: Joi.date().optional(),
    description: Joi.string().trim().max(5000).optional(),
    location: Joi.string().trim().max(200).optional(),
    client: Joi.string().trim().max(200).optional(),
    status: Joi.string().valid(...workStatuses).optional(),
    keyFeatures: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim().max(300)),
        Joi.string().allow("")
      )
      .optional(),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Service Order validation (landing services)
const validateServiceOrderCreate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "any.required": "البريد الإلكتروني مطلوب",
      "string.email": "البريد الإلكتروني غير صحيح",
    }),
    phone: Joi.string().trim().min(5).max(50).required().messages({
      "any.required": "رقم الهاتف مطلوب",
      "string.min": "رقم الهاتف يجب أن يكون 5 أحرف على الأقل",
      "string.max": "رقم الهاتف يجب ألا يتجاوز 50 حرف",
    }),
    orderDetails: Joi.string().trim().max(5000).required().messages({
      "any.required": "تفاصيل الطلب مطلوبة",
      "string.max": "تفاصيل الطلب يجب ألا تتجاوز 5000 حرف",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

const validateServiceOrderUpdate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).optional(),
    phone: Joi.string().trim().min(5).max(50).optional(),
    orderDetails: Joi.string().trim().max(5000).optional(),
    status: Joi.string()
      .valid("New", "In Review", "Processing", "Completed", "Cancelled")
      .optional(),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

const validateUserCreate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().pattern(emailRegex).required().messages({
      "string.pattern.base": "البريد الإلكتروني غير صالح",
      "any.required": "البريد الإلكتروني مطلوب",
    }),
    password: Joi.string().pattern(passwordRegex).required().messages({
      "string.pattern.base": "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم",
      "any.required": "كلمة المرور مطلوبة",
    }),
    name: Joi.string().trim().max(100).optional(),
    phone: Joi.string().trim().max(50).optional(),
    nationalId: Joi.string().trim().max(20).allow('', null).optional(),
    role: Joi.string().valid(...roles).optional(),
    isActive: Joi.boolean().optional(),
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).optional(),
    specializations: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(100)),
      Joi.string()
    ).optional(),
    bio: Joi.string().trim().max(1000).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

const validateUserUpdate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().pattern(emailRegex),
    password: Joi.string().pattern(passwordRegex),
    name: Joi.string().trim().max(100),
    phone: Joi.string().trim().max(50),
    nationalId: Joi.string().trim().max(20).optional(),
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).optional(),
    bio: Joi.string().trim().max(1000),
    role: Joi.string().valid(...roles),
    isActive: Joi.boolean(),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Subscribe validation
const validateSubscribe = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).allow("").optional(),
    phone: Joi.string().max(20).allow("").optional(),
    name: Joi.string().trim().max(100).optional(),
  }).or("email", "phone").messages({
    "object.missing": "يجب توفير البريد الإلكتروني أو رقم الهاتف",
  });

  const { error } = schema.validate(req.body);
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Subscriber update validation
const validateSubscriberUpdate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).allow("").optional(),
    phone: Joi.string().max(20).allow("").optional(),
    name: Joi.string().trim().max(100).optional(),
    isActive: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    notes: Joi.string().trim().max(1000).optional(),
    source: Joi.string().valid("newsletter", "contact", "manual").optional(),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Project validation
const validateProject = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().trim().max(200).required().messages({
      "string.required": "عنوان المشروع مطلوب",
      "string.max": "عنوان المشروع يجب ألا يتجاوز 200 حرف",
    }),
    description: Joi.string().trim().max(5000).required().messages({
      "string.required": "وصف المشروع مطلوب",
      "string.max": "وصف المشروع يجب ألا يتجاوز 5000 حرف",
    }),
    country: Joi.string().trim().max(100).required().messages({
      "string.required": "الدولة مطلوبة",
      "string.max": "الدولة يجب ألا تتجاوز 100 حرف",
    }),
    city: Joi.string().trim().max(100).required().messages({
      "string.required": "المدينة مطلوبة",
      "string.max": "المدينة يجب ألا تتجاوز 100 حرف",
    }),
    location: Joi.string().trim().max(200).optional().messages({
      "string.max": "الموقع يجب ألا يتجاوز 200 حرف",
    }),
    category: Joi.string().trim().max(100).valid(
      "المقاولات العامة",
      "التطوير والتسويق العقاري",
      "الأعمال الإنشائية",
      "خدمات هندسية وتصاميم معمارية وديكور",
      "الإشراف على المشاريع والاستشارات الهندسية",
      "المواد والمنتجات الهندسية",
      "أعمال العظم",
      "الأعمال المعمارية والتشطيبات",
      "أعمال الفرش والديكور",
      "الأعمال الكهروميكانيكية (MEP)",
      "أعمال الطرق والبنية التحتية",
      "أعمال اللاندسكيب والموقع العام",
      "أعمال الألمنيوم والمعدنية والخشبية",
      "أعمال العزل والحماية",
      "أعمال المسابح والمسطحات المائية",
      "أعمال التشغيل والصيانة والتسليم"
    ).optional().messages({
      "any.only": "نطاق الأعمال غير صحيح",
    }),
    requirements: Joi.string().trim().max(5000).optional(),
    projectType: Joi.string()
      .valid(
        "Architecture",
        "Construction",
        "Civil Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Interior Design",
        "Landscape Design",
        "Structural Engineering",
        "Other"
      )
      .required()
      .messages({
        "any.required": "نوع المشروع مطلوب",
        "any.only": "نوع المشروع غير صحيح",
      }),
    budget: Joi.object({
      amount: Joi.number().min(0).optional(),
      currency: Joi.string().max(10).optional(),
    }).optional(),
    startDate: Joi.date().optional(),
    deadline: Joi.date().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string()
      .valid("Draft", "Pending Review", "Waiting for Engineers", "In Progress", "Completed", "Cancelled", "Rejected")
      .optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Project update validation (more lenient)
const validateProjectUpdate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(5000).optional(),
    country: Joi.string().trim().max(100).optional().messages({
      "string.max": "الدولة يجب ألا تتجاوز 100 حرف",
    }),
    city: Joi.string().trim().max(100).optional().messages({
      "string.max": "المدينة يجب ألا تتجاوز 100 حرف",
    }),
    location: Joi.string().trim().max(200).optional(),
    category: Joi.string().trim().max(100).valid(
      "المقاولات العامة",
      "التطوير والتسويق العقاري",
      "الأعمال الإنشائية",
      "خدمات هندسية وتصاميم معمارية وديكور",
      "الإشراف على المشاريع والاستشارات الهندسية",
      "المواد والمنتجات الهندسية",
      "أعمال العظم",
      "الأعمال المعمارية والتشطيبات",
      "أعمال الفرش والديكور",
      "الأعمال الكهروميكانيكية (MEP)",
      "أعمال الطرق والبنية التحتية",
      "أعمال اللاندسكيب والموقع العام",
      "أعمال الألمنيوم والمعدنية والخشبية",
      "أعمال العزل والحماية",
      "أعمال المسابح والمسطحات المائية",
      "أعمال التشغيل والصيانة والتسليم"
    ).optional().messages({
      "any.only": "نطاق الأعمال غير صحيح",
    }),
    requirements: Joi.string().trim().max(5000).optional(),
    projectType: Joi.string()
      .valid(
        "Architecture",
        "Construction",
        "Civil Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Interior Design",
        "Landscape Design",
        "Structural Engineering",
        "Other"
      )
      .optional(),
    budget: Joi.object({
      amount: Joi.number().min(0).optional(),
      currency: Joi.string().max(10).optional(),
    }).optional(),
    startDate: Joi.date().optional(),
    deadline: Joi.date().optional(),
    progress: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string()
      .valid("Draft", "Pending Review", "Waiting for Engineers", "In Progress", "Completed", "Cancelled", "Rejected")
      .optional(),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Proposal validation
const validateProposalCreate = (req, res, next) => {
  const schema = Joi.object({
    projectId: Joi.string().required().messages({
      "any.required": "معرف المشروع مطلوب",
      "string.base": "معرف المشروع غير صحيح",
    }),
    description: Joi.string().trim().max(5000).required().messages({
      "any.required": "وصف العرض مطلوب",
      "string.max": "وصف العرض يجب ألا يتجاوز 5000 حرف",
    }),
    estimatedTimeline: Joi.string().trim().max(200).required().messages({
      "any.required": "المدة المتوقعة مطلوبة",
      "string.max": "المدة يجب ألا تتجاوز 200 حرف",
    }),
    relevantExperience: Joi.string().trim().max(3000).allow('', null).optional(),
    proposedBudget: Joi.alternatives().try(
      Joi.string(), // يمكن أن يكون JSON string من FormData
      Joi.object({
        amount: Joi.number().min(0).optional(),
        currency: Joi.string().trim().max(10).optional(),
        items: Joi.array().items(
          Joi.object({
            description: Joi.string().trim().max(500).required(),
            amount: Joi.number().min(0).required(),
          })
        ).optional(),
      })
    ).optional(),
    milestones: Joi.alternatives().try(
      Joi.string(), // يمكن أن يكون JSON string من FormData
      Joi.array().items(
        Joi.object({
          label: Joi.string().trim().max(500).optional(),
          percentage: Joi.string().optional(),
          amount: Joi.string().optional(),
        })
      )
    ).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

const validateProposalStatusUpdate = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid("pending", "reviewed", "accepted", "rejected")
      .required()
      .messages({
        "any.required": "حالة العرض مطلوبة",
        "any.only": "حالة العرض غير صحيحة",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Proposal update (engineer/admin)
const validateProposalUpdate = (req, res, next) => {
  const schema = Joi.object({
    description: Joi.string().trim().max(5000).optional(),
    estimatedTimeline: Joi.string().trim().max(200).optional(),
    relevantExperience: Joi.string().trim().max(3000).allow('', null).optional(),
    proposedBudget: Joi.alternatives().try(
      Joi.string(), // يمكن أن يكون JSON string من FormData
      Joi.object({
        amount: Joi.number().min(0).optional(),
        currency: Joi.string().trim().max(10).optional(),
        items: Joi.array().items(
          Joi.object({
            description: Joi.string().trim().max(500).required(),
            amount: Joi.number().min(0).required(),
          })
        ).optional(),
      })
    ).optional(),
    milestones: Joi.alternatives().try(
      Joi.string(), // يمكن أن يكون JSON string من FormData
      Joi.array().items(
        Joi.object({
          label: Joi.string().trim().max(500).optional(),
          percentage: Joi.string().optional(),
          amount: Joi.string().optional(),
        })
      )
    ).optional(),
    // status intentionally omitted here; handled separately for admin
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Profile update validation (for /me) - safer, excludes role/isActive/password
const validateProfileUpdate = (req, res, next) => {
  // Allow file upload only (avatar) - if file exists, skip body validation
  if (req.file) {
    // If file is present, allow empty body or validate body if present
    if (Object.keys(req.body || {}).length === 0) {
      // Only file upload, no body fields - this is valid
      return next();
    }
  }

  // Validate body fields if present
  const schema = Joi.object({
    email: Joi.string().pattern(emailRegex),
    name: Joi.string().trim().max(100),
    phone: Joi.string().trim().max(50),
    countryCode: Joi.string().trim().max(10).optional(),
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).optional(),
    bio: Joi.string().trim().max(1000),
    specializations: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(100)),
      Joi.string() // will be parsed in controller (JSON / comma / newline)
    ),
    certifications: Joi.alternatives().try(
      Joi.array().items(
        Joi.object({
          title: Joi.string().trim().max(200).required(),
          year: Joi.number().integer().min(1900).max(2100).required(),
        })
      ),
      Joi.string() // will be parsed in controller (JSON string)
    ),
  })
    .min(1)
    .messages({
      "object.min": "يجب إرسال حقل واحد على الأقل للتحديث",
    });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Register Company validation
const validateRegisterCompany = (req, res, next) => {
  const schema = Joi.object({
    companyName: Joi.string().trim().min(2).max(200).required().messages({
      "string.empty": "اسم الشركة مطلوب",
      "string.min": "اسم الشركة يجب أن يكون حرفين على الأقل",
      "string.max": "اسم الشركة يجب ألا يتجاوز 200 حرف",
      "any.required": "اسم الشركة مطلوب",
    }),
    contactPersonName: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "اسم الشخص المسؤول مطلوب",
      "string.min": "الاسم يجب أن يكون حرفين على الأقل",
      "string.max": "الاسم يجب ألا يتجاوز 100 حرف",
      "any.required": "اسم الشخص المسؤول مطلوب",
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.email": "البريد الإلكتروني غير صحيح",
      "any.required": "البريد الإلكتروني مطلوب",
    }),
    phone: Joi.string().trim().min(5).max(50).required().messages({
      "string.empty": "رقم الهاتف مطلوب",
      "string.min": "رقم الهاتف يجب أن يكون 5 أحرف على الأقل",
      "string.max": "رقم الهاتف يجب ألا يتجاوز 50 حرف",
      "any.required": "رقم الهاتف مطلوب",
    }),
    countryCode: Joi.string().trim().min(1).max(10).required().messages({
      "string.empty": "كود البلد مطلوب",
      "string.min": "كود البلد يجب أن يكون حرف واحد على الأقل",
      "string.max": "كود البلد يجب ألا يتجاوز 10 أحرف",
      "any.required": "كود البلد مطلوب",
    }),
    password: Joi.string()
      .min(8)
      .pattern(passwordRegex)
      .required()
      .messages({
        "string.min": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base":
          "كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، ورقم واحد على الأقل",
        "any.required": "كلمة المرور مطلوبة",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "تأكيد كلمة المرور غير متطابق",
        "any.required": "تأكيد كلمة المرور مطلوب",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Register Engineer validation
const validateRegisterEngineer = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "الاسم الكامل مطلوب",
      "string.min": "الاسم يجب أن يكون حرفين على الأقل",
      "string.max": "الاسم يجب ألا يتجاوز 100 حرف",
      "any.required": "الاسم الكامل مطلوب",
    }),
    specialization: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "التخصص مطلوب",
      "string.min": "التخصص يجب أن يكون حرفين على الأقل",
      "string.max": "التخصص يجب ألا يتجاوز 100 حرف",
      "any.required": "التخصص مطلوب",
    }),
    licenseNumber: Joi.string().trim().min(1).max(50).required().messages({
      "string.empty": "رقم الترخيص مطلوب",
      "string.max": "رقم الترخيص يجب ألا يتجاوز 50 حرف",
      "any.required": "رقم الترخيص مطلوب",
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.email": "البريد الإلكتروني غير صحيح",
      "any.required": "البريد الإلكتروني مطلوب",
    }),
    phone: Joi.string().trim().min(5).max(50).required().messages({
      "string.empty": "رقم الهاتف مطلوب",
      "string.min": "رقم الهاتف يجب أن يكون 5 أحرف على الأقل",
      "string.max": "رقم الهاتف يجب ألا يتجاوز 50 حرف",
      "any.required": "رقم الهاتف مطلوب",
    }),
    countryCode: Joi.string().trim().min(1).max(10).required().messages({
      "string.empty": "كود البلد مطلوب",
      "string.min": "كود البلد يجب أن يكون حرف واحد على الأقل",
      "string.max": "كود البلد يجب ألا يتجاوز 10 أحرف",
      "any.required": "كود البلد مطلوب",
    }),
    password: Joi.string()
      .min(8)
      .pattern(passwordRegex)
      .required()
      .messages({
        "string.min": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base":
          "كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، ورقم واحد على الأقل",
        "any.required": "كلمة المرور مطلوبة",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "تأكيد كلمة المرور غير متطابق",
        "any.required": "تأكيد كلمة المرور مطلوب",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Register Client validation
const validateRegisterClient = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "الاسم الكامل مطلوب",
      "string.min": "الاسم يجب أن يكون حرفين على الأقل",
      "string.max": "الاسم يجب ألا يتجاوز 100 حرف",
      "any.required": "الاسم الكامل مطلوب",
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.email": "البريد الإلكتروني غير صحيح",
      "any.required": "البريد الإلكتروني مطلوب",
    }),
    phone: Joi.string().trim().min(5).max(50).required().messages({
      "string.empty": "رقم الهاتف مطلوب",
      "string.min": "رقم الهاتف يجب أن يكون 5 أحرف على الأقل",
      "string.max": "رقم الهاتف يجب ألا يتجاوز 50 حرف",
      "any.required": "رقم الهاتف مطلوب",
    }),
    countryCode: Joi.string().trim().min(1).max(10).required().messages({
      "string.empty": "كود البلد مطلوب",
      "string.min": "كود البلد يجب أن يكون حرف واحد على الأقل",
      "string.max": "كود البلد يجب ألا يتجاوز 10 أحرف",
      "any.required": "كود البلد مطلوب",
    }),
    password: Joi.string()
      .min(8)
      .pattern(passwordRegex)
      .required()
      .messages({
        "string.min": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base":
          "كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، ورقم واحد على الأقل",
        "any.required": "كلمة المرور مطلوبة",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "تأكيد كلمة المرور غير متطابق",
        "any.required": "تأكيد كلمة المرور مطلوب",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Password change validation
const validatePasswordChange = (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "كلمة المرور الحالية مطلوبة",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(passwordRegex)
      .required()
      .messages({
        "string.min": "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base":
          "كلمة المرور الجديدة يجب أن تحتوي على حرف كبير، حرف صغير، ورقم واحد على الأقل",
        "any.required": "كلمة المرور الجديدة مطلوبة",
      }),
    confirmNewPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "تأكيد كلمة المرور غير متطابق",
        "any.required": "تأكيد كلمة المرور الجديدة مطلوب",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Chat Room validation
const validateChatRoomCreate = (req, res, next) => {
  const schema = Joi.object({
    project: Joi.string().required().messages({
      "any.required": "معرف المشروع مطلوب",
    }),
    projectRoom: Joi.string().required().messages({
      "any.required": "معرف غرفة المشروع مطلوب",
    }),
    type: Joi.string().valid("admin-engineer", "admin-client", "group").required().messages({
      "any.required": "نوع الغرفة مطلوب",
      "any.only": "نوع الغرفة غير صحيح",
    }),
    engineer: Joi.string().when("type", {
      is: "admin-engineer",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }).messages({
      "any.required": "رقم المهندس مطلوب لنوع الغرفة هذا",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

// Message validation
const validateMessageCreate = (req, res, next) => {
  // For FormData requests, content might be empty string or missing
  // We need to handle both JSON and FormData requests
  const body = req.body || {};
  const hasFiles = req.files && req.files.length > 0;
  const hasContent = body.content && body.content.trim().length > 0;
  
  // If no files and no content, that's invalid
  if (!hasFiles && !hasContent) {
    return res.status(400).json({ 
      message: "يجب إرسال محتوى نصي أو ملف على الأقل" 
    });
  }
  
  const schema = Joi.object({
    chatRoomId: Joi.string().required().messages({
      "any.required": "معرف غرفة الدردشة مطلوب",
    }),
    content: Joi.string().max(5000).allow('').optional().messages({
      "string.max": "محتوى الرسالة يجب ألا يتجاوز 5000 حرف",
    }),
    type: Joi.string().valid("text", "file", "system").optional(),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().optional(),
        url: Joi.string().optional(),
        type: Joi.string().optional(),
      })
    ).optional(),
  });

  const { error } = schema.validate(body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    console.error('❌ Message validation error:', messages);
    console.error('❌ Request body:', body);
    console.error('❌ Has files:', hasFiles);
    return res.status(400).json({ message: messages });
  }
  next();
};

// Message validation rules
const messageRules = {
  create: [
    body('chatRoomId')
      .notEmpty().withMessage('معرف غرفة الدردشة مطلوب')
      .isMongoId().withMessage('معرف غرفة الدردشة غير صالح'),
      
    body('content')
      .optional()
      .isString().withMessage('يجب أن يكون المحتوى نصيًا')
      .isLength({ max: 2000 })
      .withMessage('يجب ألا يتجاوز المحتوى 2000 حرف'),
      
    body('type')
      .optional()
      .isIn(['text', 'system', 'notification'])
      .withMessage('نوع الرسالة غير صالح'),
      
    body('replyTo')
      .optional()
      .isMongoId()
      .withMessage('معرف الرسالة المراد الرد عليها غير صالح'),
  ],
  
  markAsRead: [
    param('messageId')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
  ],
  
  delete: [
    param('messageId')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
  ],
  
  updateReaction: [
    param('messageId')
      .isMongoId()
      .withMessage('معرف الرسالة غير صالح'),
      
    body('emoji')
      .notEmpty()
      .withMessage('يجب إضافة إيموجي')
      .isString()
      .withMessage('يجب أن يكون الإيموجي نصيًا'),
  ],
  
  search: [
    query('roomId')
      .isMongoId()
      .withMessage('معرف الغرفة مطلوب'),
      
    query('query')
      .notEmpty()
      .withMessage('استعلام البحث مطلوب'),
  ],
  
  typing: [
    body('chatRoomId')
      .isMongoId()
      .withMessage('معرف غرفة الدردشة مطلوب'),
      
    body('isTyping')
      .isBoolean()
      .withMessage('حالة الكتابة مطلوبة'),
  ],
};

// Chat room validation rules
const chatRoomRules = {
  create: [
    body('name')
      .optional()
      .isString()
      .withMessage('يجب أن يكون اسم الغرفة نصيًا')
      .isLength({ max: 100 })
      .withMessage('يجب ألا يتجاوز اسم الغرفة 100 حرف'),
      
    body('participants')
      .isArray({ min: 1 })
      .withMessage('يجب تحديد مشاركين واحد على الأقل')
      .custom((participants) => {
        if (!Array.isArray(participants)) return false;
        return participants.every(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
      })
      .withMessage('يجب أن تكون قائمة المشاركين مصفوفة من المعرفات الصالحة'),
      
    body('projectId')
      .optional()
      .isMongoId()
      .withMessage('معرف المشروع غير صالح'),
  ],
};

// Notification validation (optional - mostly internal use)
const validateNotificationCreate = (req, res, next) => {
  // This is mostly for internal use, but can be used if needed
  const schema = Joi.object({
    user: Joi.string().required().messages({
      "any.required": "المستخدم مطلوب",
    }),
    type: Joi.string()
      .valid(
        "project_approved",
        "project_rejected",
        "proposal_submitted",
        "proposal_accepted",
        "proposal_rejected",
        "message_received",
        "project_status_changed",
        "project_completed",
        "review_received",
        "system_announcement"
      )
      .required()
      .messages({
        "any.required": "نوع الإشعار مطلوب",
        "any.only": "نوع الإشعار غير صحيح",
      }),
    title: Joi.string().max(200).required().messages({
      "any.required": "عنوان الإشعار مطلوب",
      "string.max": "عنوان الإشعار يجب ألا يتجاوز 200 حرف",
    }),
    message: Joi.string().max(1000).required().messages({
      "any.required": "محتوى الإشعار مطلوب",
      "string.max": "محتوى الإشعار يجب ألا يتجاوز 1000 حرف",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

module.exports = {
  // Common
  validate,
  commonRules,
  
  // Auth
  validateRegister,
  validateRegisterCompany,
  validateRegisterEngineer,
  validateRegisterClient,
  validateLogin,
  validatePasswordChange,
  
  // Messages
  validateMessageCreate, // Use Joi validation (handles FormData better)
  validateMessageMarkAsRead: validate(messageRules.markAsRead),
  validateMessageDelete: validate(messageRules.delete),
  validateMessageReaction: validate(messageRules.updateReaction),
  validateMessageSearch: validate(messageRules.search),
  validateTyping: validate(messageRules.typing),
  
  // Chat Rooms
  validateChatRoomCreate: validate(chatRoomRules.create),
  
  // Keep existing validations for backward compatibility
  validateHero,
  validateAbout,
  validateService,
  validateServiceDetail,
  validateProjects,
  validateJobs,
  validateJobItem,
  validateProjectItem,
  validatePartners,
  validatePartnerItem,
  validateFeatures,
  validateCTA,
  validateFooter,
  validateWork,
  validateWorkUpdate,
  validateServiceOrderCreate,
  validateServiceOrderUpdate,
  validateUserCreate,
  validateUserUpdate,
  validateSubscribe,
  validateSubscriberUpdate,
  validateProject,
  validateProjectUpdate,
  validateProposalCreate,
  validateProposalStatusUpdate,
  validateProposalUpdate,
  validateProfileUpdate,
  validateNotificationCreate,
  validateProjectNote: (req, res, next) => {
    const schema = Joi.object({
      note: Joi.string().trim().max(5000).required().messages({
        "string.required": "الملاحظة مطلوبة",
        "string.max": "الملاحظة يجب ألا تتجاوز 5000 حرف",
      }),
      isInternal: Joi.boolean().optional(),
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ message: messages });
    }
    next();
  },
  validateAddParticipant: (req, res, next) => {
    const schema = Joi.object({
      userId: Joi.string().required().messages({
        "any.required": "معرف المستخدم مطلوب",
      }),
      role: Joi.string().valid("admin", "engineer", "client").required().messages({
        "any.required": "الدور مطلوب",
        "any.only": "الدور يجب أن يكون: admin, engineer, أو client",
      }),
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ message: messages });
    }
    next();
  },
};
