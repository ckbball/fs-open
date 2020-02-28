const express = require("express");
const router = express.Router();

const Post = require("../../models/Post");

// @route   GET api/tags
// @desc    Get a list of tags
// @access  Public
router.get("/", async (req, res) => {
  let tags = await Post.find().distinct("tagList");

  res.json({ tags: tags });
});

module.exports = router;
