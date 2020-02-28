const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const auth = require("../../middleware/auth");

const Post = require("../../models/Post");
const Comment = require("../../models/Comment");
const User = require("../../models/User");

// Preload post objects on routes with ':post'
router.param("post", async (req, res, next, slug) => {
  let post = await Post.findOne({ slug: slug });
  if (!post) return res.sendStatus(404);

  req.post = post;
  return next();
});

// Preload comment objects on routes with ':comment'
router.param("comment", async (req, res, next, id) => {
  let comment = await Comment.findById(id);
  if (!comment) return res.sendStatus(404);

  req.comment = comment;
  return next();
});

// @route   GET api/posts
// @desc    Get List of Posts
// @access  Public
router.get("/", async (req, res) => {
  let query = {};
  let limit = 20;
  let offset = 0;
  console.error("calling /feed");

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
    let count = await Post.estimatedDocumentCount(query).exec();
    let user = req.user ? User.findById(req.user.id) : null;

    return res.json({
      posts: posts.map(post => {
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

// get a post
router.get("/:post", async (req, res) => {
  try {
    await req.post.populate("author").execPopulate();

    res.json({ post: req.post.toJSONFor(null) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/posts/:post/favorite
// @desc    Favorite a post
// @access  Private
router.post("/:post/favorite", auth, async (req, res) => {
  let postId = req.post._id;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(401);
    }

    await user.favorite(postId);

    let post = await req.post.updateFavoriteCount();

    res.json({ post: post.toJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/posts/:post/favorite
// @desc    Unfavorite a post
// @access  Private
router.delete("/:post/favorite", auth, async (req, res) => {
  let postId = req.post._id;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(401);
    }

    await user.unfavorite(postId);

    let post = await req.post.updateFavoriteCount();

    res.json({ post: post.toJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/posts/:post/comments
// @desc    Comment on a post
// @access  Private
router.post("/:post/comments", auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(401);
    }

    let comment = new Comment(req.body.comment);
    comment.post = req.post;
    comment.author = req.user;

    await comment.save();

    req.post.comments.push(comment);

    user.comments.push(comment);

    await user.save();

    let post = await req.post.save();

    res.json({ comment: comment.toJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/posts/:post/comments/:comment
// @desc    Delete a comment from a post
// @access  Private
router.delete("/:post/comments/:comment", auth, async (req, res) => {
  try {
    if (req.comment.author.toString() === req.user.id.toString()) {
      req.post.comments.remove(req.comment._id);
      await req.post.save();
      await Comment.find({ _id: req.comment._id })
        .remove()
        .exec();
      let user = await User.findById(req.user._id);
      user.comments.remove(req.comment._id);
      await user.save();
      res.sendStatus(204);
    } else {
      res.sendStatus(403);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/posts/feed
// @desc    Get List of a specific user's followed users posts
// @access  Private
router.get("/feed", auth, async (req, res) => {
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== "undefined") {
    limit = req.query.limit;
  }
  if (typeof req.query.offset !== "undefined") {
    offset = req.query.offset;
  }

  try {
    let user = await User.findById(req.user.id);

    console.error(user.following);

    let posts = await Post.find({ author: { $in: user.following } })
      .limit(Number(limit))
      .skip(Number(offset))
      .populate("author")
      .exec();
    let count = await Post.countDocuments({ author: { $in: user.following } });

    return res.json({
      posts: posts.map(post => {
        return post.toJSONFor(user);
      }),
      postsCount: count
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;

// Post routes left
/*
get logged in user's own posts    3
get comments logged in user has created     1
get comments a user has created by username   2

post a comment to a post      4 --- 
remove a comment from a post      7 ---
update a comment on a post      5
get comments for a post     6

update a post   8
delete a post   9
favorite a post   10 ---
unfavorite a post   11  ----

*/
