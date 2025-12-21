const Joi = require("joi");

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
const roles = ["admin", "engineer", "client", "company"];

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
    category: Joi.string().trim().max(100).required(),
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
    category: Joi.string().trim().max(100).optional(),
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
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    orderDetails: Joi.string().trim().max(5000).required(),
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
    nationalId: Joi.string().trim().max(20).required().messages({
      "any.required": "الرقم القومي مطلوب",
      "string.max": "الرقم القومي يجب ألا يتجاوز 20 حرف",
    }),
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
    phone: Joi.string().trim().max(50),
    nationalId: Joi.string().trim().max(20).optional(),
    location: Joi.string().trim().max(200),
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
    location: Joi.string().trim().max(200).required().messages({
      "string.required": "الموقع مطلوب",
      "string.max": "الموقع يجب ألا يتجاوز 200 حرف",
    }),
    category: Joi.string().trim().max(100).optional(),
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
    deadline: Joi.date().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string()
      .valid("Draft", "Pending Review", "Waiting for Engineers", "In Progress", "Completed", "Cancelled")
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
    location: Joi.string().trim().max(200).optional(),
    category: Joi.string().trim().max(100).optional(),
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
    deadline: Joi.date().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string()
      .valid("Draft", "Pending Review", "Waiting for Engineers", "In Progress", "Completed", "Cancelled")
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
    relevantExperience: Joi.string().trim().max(3000).optional(),
    proposedBudget: Joi.object({
      amount: Joi.number().min(0).optional(),
      currency: Joi.string().trim().max(10).optional(),
    }).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
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
    relevantExperience: Joi.string().trim().max(3000).optional(),
    proposedBudget: Joi.object({
      amount: Joi.number().min(0).optional(),
      currency: Joi.string().trim().max(10).optional(),
    }).optional(),
    // status intentionally omitted here; handled separately for admin
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

// Profile update validation (for /me) - safer, excludes role/isActive/password
const validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().pattern(emailRegex),
    name: Joi.string().trim().max(100),
    phone: Joi.string().trim().max(50),
    location: Joi.string().trim().max(200),
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

// Company Registration Validation
const validateCompanyRegister = (req, res, next) => {
  const schema = Joi.object({
    companyName: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        "string.empty": "اسم الشركة مطلوب",
        "any.required": "اسم الشركة مطلوب",
        "string.max": "اسم الشركة يجب ألا يتجاوز 200 حرف",
      }),
    contactPersonName: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        "string.empty": "اسم الشخص المسؤول مطلوب",
        "any.required": "اسم الشخص المسؤول مطلوب",
        "string.max": "اسم الشخص المسؤول يجب ألا يتجاوز 200 حرف",
      }),
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
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "كلمة المرور غير متطابقة",
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

// Engineer Registration Validation
const validateEngineerRegister = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        "string.empty": "الاسم الكامل مطلوب",
        "any.required": "الاسم الكامل مطلوب",
        "string.max": "الاسم الكامل يجب ألا يتجاوز 200 حرف",
      }),
    specialization: Joi.string()
      .trim()
      .max(500)
      .required()
      .messages({
        "string.empty": "التخصص مطلوب",
        "any.required": "التخصص مطلوب",
        "string.max": "التخصص يجب ألا يتجاوز 500 حرف",
      }),
    licenseNumber: Joi.string()
      .trim()
      .max(50)
      .required()
      .messages({
        "string.empty": "رقم الرخصة المهنية مطلوب",
        "any.required": "رقم الرخصة المهنية مطلوب",
        "string.max": "رقم الرخصة يجب ألا يتجاوز 50 حرف",
      }),
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
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "كلمة المرور غير متطابقة",
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

// Client Registration Validation
const validateClientRegister = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        "string.empty": "الاسم الكامل مطلوب",
        "any.required": "الاسم الكامل مطلوب",
        "string.max": "الاسم الكامل يجب ألا يتجاوز 200 حرف",
      }),
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
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "كلمة المرور غير متطابقة",
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

module.exports = {
  validateRegister,
  validateLogin,
  validateCompanyRegister,
  validateEngineerRegister,
  validateClientRegister,
  validateHero,
  validateAbout,
  validateService,
  validateServiceDetail,
  validateProjects,
  validateProjectItem,
  validateJobs,
  validateJobItem,
  validatePartners,
  validatePartnerItem,
  validateFeatures,
  validateCTA,
  validateFooter,
  validateUserCreate,
  validateUserUpdate,
  validateProfileUpdate,
  validateSubscribe,
  validateSubscriberUpdate,
  validateProject,
  validateProjectUpdate,
  validateWork,
  validateWorkUpdate,
  validateServiceOrderCreate,
  validateServiceOrderUpdate,
  validateProposalCreate,
  validateProposalStatusUpdate,
  validateProposalUpdate,
};
