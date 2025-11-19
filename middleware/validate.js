const Joi = require("joi");


export const validateHero = (req, res, next) => {
  const schema = Joi.object({
    title_en: Joi.string().max(200).allow(""),
    title_ar: Joi.string().max(200).allow(""),
    subtitle_en: Joi.string().max(1000).allow(""),
    subtitle_ar: Joi.string().max(1000).allow(""),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};
