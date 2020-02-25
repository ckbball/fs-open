const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const jwt = require("jsonwebtoken");
const config = require("config");

const UserSchema = new mongoose.Schema(
  {
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

UserSchema.methods.toProfileJSONFor = user => {
  return {
    name: this.name,
    bio: this.bio,
    avatar: this.avatar,
    date: this.date,
    following: user ? user.isFollowing(this._id) : false
  };
};

UserSchema.methods.toAuthJSON = () => {
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
    bio: this.bio,
    token: token
  };
};

UserSchema.methods.favorite = id => {
  if (this.favorites.indexOf(id) === -1) {
    this.favorites.push(id);
  }

  return this.save();
};

UserSchema.methods.unfavorite = id => {
  this.favorites.remove(id);

  return this.save();
};

UserSchema.methods.isFavorite = id => {
  return this.favorites.some(favoriteId => {
    return favoriteId.toString() === id.toString();
  });
};

UserSchema.methods.follow = id => {
  if (this.following.indexOf(id) === -1) {
    this.following.push(id);
  }

  return this.save();
};

UserSchema.methods.unfollow = id => {
  this.following.remove(id);

  return this.save();
};

UserSchema.methods.isFollowing = id => {
  return this.following.some(followId => {
    return followId.toString() === id.toString();
  });
};

module.exports = User = mongoose.model("User", UserSchema);
