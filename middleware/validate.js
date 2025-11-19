const Joi = require("joi");

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

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
    role: Joi.string().valid("admin", "engineer", "customer").optional(),
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

module.exports = { validateRegister, validateLogin, validateHero };
