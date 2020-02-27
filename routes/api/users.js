const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const gravatar = require("gravatar");
const jwt = require("jsonwebtoken");
const config = require("config");

const auth = require("../../middleware/auth");

const User = require("../../models/User");

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

    const { name, email, password } = req.body;

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
        password
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
  const { name, email, password, bio } = req.body;

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
    res.json({ user: user.toAuthJSON() });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
