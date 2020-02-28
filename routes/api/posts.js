const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const auth = require("../../middleware/auth");

const Post = require("../../models/Post");
const Comment = require("../../models/Comment");
const User = require("../../models/User");

// @route   GET api/posts
// @desc    Get List of Posts
// @access  Public
router.get("/", async (req, res) => {
  let query = {};
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== "undefined") {
    limit = req.query.limit;
  }
  if (typeof req.query.offset !== "undefined") {
    offset = req.query.offset;
  }
  if (typeof req.query.tag !== "undefined") {
    query.tagList = { $in: [req.query.tag] };
  }
  try {
    let author = await User.findOne({ username: req.query.author });
    let favoriter = await User.findOne({ username: req.query.favorited });

    if (author) {
      query.author = author._id;
    }

    if (favoriter) {
      query._id = { $in: favoriter.favorites };
    } else if (req.query.favorited) {
      query._id = { $in: [] };
    }

    let posts = await Post.find(query)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort({ createdAt: "desc" })
      .populate("author")
      .exec();
    let count = await Post.count(query).exec();
    let user = req.user ? User.findById(req.user.id) : null;

    return res.json({
      posts: posts.map(article => {
        return post.toJSONFor(user);
      }),
      postsCount: count
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/posts
// @desc    Create a new post
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(401);
    }

    let post = new Post(req.body.post);

    post.author = user;
    await post.save();
    console.log(post.author);
    res.json({ post: post.toJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
