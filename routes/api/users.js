const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const gravatar = require("gravatar");
const jwt = require("jsonwebtoken");
const config = require("config");

const auth = require("../../middleware/auth");

const User = require("../../models/User");

// preload user profile on routes with ':username'
router.param("username", async (req, res, next, username) => {
  let user = await User.findOne({ username: username });
  if (!user) return res.sendStatus(404);

  req.profile = user;
  return next();
});

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post(
  "/",
  [
    // check that name field is not empty
    check("name", "Please include a valid name.")
      .not()
      .isEmpty(),
    // check that email field is an email
    check("email", "Please include a valid email.").isEmail(),
    // check that password field is at least 6 characters
    check(
      "password",
      "Please enter a password with length of 6 or more."
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    // Return validation errors if there are any
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, email, password, username } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      // Get users gravatar
      const avatar = gravatar.url(email, {
        s: "200",
        r: "pg",
        d: "mm"
      });

      const salt = await bcrypt.genSalt(12);

      user = new User({
        name,
        email,
        avatar,
        password,
        username
      });

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
          email: user.email
        }
      };

      jwt.sign(
        payload,
        config.get("JWT_SECRET"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   POST api/users/user
// @desc    Update user
// @access  Private
router.post("/user", auth, async (req, res) => {
  const { name, email, password, bio, username } = req.body;

  const userId = req.user.id;

  if (email === "") {
    console.log("haha email gone");
  }

  try {
    user = await User.findById(userId);
    if (!user) {
      return res.sendStatus(401);
    }

    const salt = await bcrypt.genSalt(12);

    if (typeof password !== "undefined" && password.length > 6) {
      user.password = await bcrypt.hash(password, salt);
    }

    if (typeof name !== "undefined") {
      user.name = name;
    }

    if (typeof username !== "undefined") {
      user.username = username;
    }

    if (typeof bio !== "undefined") {
      user.bio = bio;
    }
    if (email === "") {
      console.log("email is blank");
      user.email = email;
      const avatar = gravatar.url(email, {
        s: "200",
        r: "pg",
        d: "mm"
      });
      user.avatar = avatar;
    }

    await user.save();
    console.error(user.toAuthJSON());
    res.json({ user: user.toAuthJSON() });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/users/:username/follow
// @desc    Follow user
// @access  Private
router.post("/:username/follow", auth, async (req, res) => {
  // id of profile to be followed
  let profileId = req.profile._id;
  try {
    // user object of logged in user
    let user = await User.findById(req.user.id);
    if (!user) return res.sendStatus(401);

    await user.follow(profileId);

    await user.save();

    console.error("user after save: " + user);

    return res.json({ profile: req.profile.toProfileJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/users/:username/follow
// @desc    Un follow user
// @access  Private
router.delete("/:username/follow", auth, async (req, res) => {
  // id of profile to be followed
  let profileId = req.profile._id;
  try {
    // user object of logged in user
    let user = await User.findById(req.user.id);
    if (!user) return res.sendStatus(401);

    await user.unfollow(profileId);

    await user.save();

    return res.json({ profile: req.profile.toProfileJSONFor(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/users/:username
// @desc    Get a user
// @access  Private
router.get("/:username", auth, async (req, res) => {
  // id of profile to be retrieved
  let profileId = req.profile._id;
  try {
    // user object of logged in user
    let user = await User.findById(req.user.id);
    if (!user) return res.sendStatus(401);

    let profile = {};

    let temp1 = user.id.toString();
    let temp2 = profileId.toString();

    let eq = temp1 === temp2;
    if (temp1 === temp2) {
      profile = req.profile.toAuthJSON();
    } else {
      profile = req.profile.toProfileJSONFor(user);
    }

    return res.json({ profile: profile });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
