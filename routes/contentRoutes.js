const express = require("express");
const router = express.Router();

const { getContent, updateHero } = require("../controllers/contentController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateHero } = require("../middleware/validate");

router.get("/", getContent);
router.put("/hero", protect, adminOnly, validateHero, updateHero);

module.exports = router;
