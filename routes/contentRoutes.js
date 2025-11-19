const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
} = require("../controllers/contentController");

router.get("/", getContent);
router.put("/hero", updateHero);

module.exports = router;
