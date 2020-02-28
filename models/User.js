const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const jwt = require("jsonwebtoken");
const config = require("config");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      required: [true, "can't be blank"],
      match: [/^[a-zA-Z0-9]+$/, "is invalid"],
      index: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
      match: [/\S+@\S+\.\S+/, "is invalid"],
      index: true
    },
    password: {
      type: String,
      required: true
    },
    bio: {
      type: String
    },
    avatar: {
      type: String
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

UserSchema.plugin(uniqueValidator, { message: "is already taken." });

// called when logged in user is requesting another user's profile
UserSchema.methods.toProfileJSONFor = function(user) {
  return {
    name: this.name,
    username: this.username,
    bio: this.bio,
    avatar: this.avatar,
    date: this.date,
    following: user ? user.isFollowing(this._id) : false
  };
};

// called when logged in user is requesting their own profile
UserSchema.methods.toAuthJSON = function() {
  console.error(this);
  payload = {
    user: {
      id: this.id,
      email: this.email
    }
  };
  let token = jwt.sign(
    payload,
    config.get("JWT_SECRET"),
    { expiresIn: 360000 },
    (err, token) => {
      if (err) {
        console.error(err.message);
        return "error";
      }
      return token;
    }
  );

  return {
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    date: this.date,
    username: this.username,
    bio: this.bio,
    following: this.following,
    favorites: this.favorites,
    comments: this.comments,
    token: token
  };
};

UserSchema.methods.favorite = function(id) {
  if (this.favorites.indexOf(id) === -1) {
    this.favorites.push(id);
  }

  return this.save();
};

UserSchema.methods.unfavorite = function(id) {
  this.favorites.remove(id);

  return this.save();
};

UserSchema.methods.isFavorite = function(id) {
  return this.favorites.some(favoriteId => {
    return favoriteId.toString() === id.toString();
  });
};

UserSchema.methods.follow = function(id) {
  if (typeof this.following === "undefined") this.following = [id];
  if (this.following.indexOf(id) === -1) {
    this.following.push(id);
  }
  console.error("UserSchema.follow this: " + this.following);
  return this.save;
};

UserSchema.methods.unfollow = function(id) {
  this.following.remove(id);

  return this.save();
};

UserSchema.methods.isFollowing = function(id) {
  return this.following.filter(
    followId => followId.toString() === id.toString()
  );
};

module.exports = User = mongoose.model("User", UserSchema);
