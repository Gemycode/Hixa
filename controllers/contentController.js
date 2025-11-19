const Content = require("../models/contentModel");

// GET content
exports.getContent = async (req, res) => {
  try {
    const content = await Content.findOne();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE hero section
exports.updateHero = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar } = req.body;

    const updateFields = {
      "hero.title_en": title_en,
      "hero.title_ar": title_ar,
      "hero.subtitle_en": subtitle_en,
      "hero.subtitle_ar": subtitle_ar,
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
