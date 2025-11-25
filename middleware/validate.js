const Joi = require("joi");

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
const roles = ["admin", "engineer", "customer"];

// Register validation
const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "البريد الإلكتروني غير صحيح",
        "any.required": "البريد الإلكتروني مطلوب",
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
    name: Joi.string().trim().max(100).optional(),
    role: Joi.string().valid(...roles).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ message: messages });
  }
  next();
};

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
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
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
const validateServices = (req, res, next) => {
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
    role: Joi.string().valid(...roles).optional(),
    isActive: Joi.boolean().optional(),
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

module.exports = {
  validateRegister,
  validateLogin,
  validateHero,
  validateAbout,
  validateServices,
  validateProjects,
  validateProjectItem,
  validateJobs,
  validatePartners,
  validatePartnerItem,
  validateFeatures,
  validateCTA,
  validateFooter,
  validateUserCreate,
  validateUserUpdate,
};
