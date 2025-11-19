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

    const updated = await Content.findOneAndUpdate(
      {},
      {
        hero: {
          title_en,
          title_ar,
          subtitle_en,
          subtitle_ar,
        },
      },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
