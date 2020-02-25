const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const slug = require("slug");
const User = mongoose.model("user");

const PostSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      lowercase: true,
      unique: true
    },
    title: {
      type: String
    },
    content: {
      type: String
    },
    favoritesCount: {
      type: Number,
      default: 0
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    tagList: [{ type: String }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

PostSchema.plugin(uniqueValidator, { message: "is already taken." });

PostSchema.pre("validate", next => {
  if (!this.slug) {
    this.slugify();
  }

  next();
});

PostSchema.methods.slugify = () => {
  this.slug =
    slug(this.title) +
    "-" +
    ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
};

PostSchema.methods.updateFavoriteCount = async () => {
  let post = this;

  const count = await User.count({ favorites: { $in: [post._id] } });

  post.favoritesCount = count;

  return post.save();
};

PostSchema.methods.toJSONFor = user => {
  return {
    slug: this.slug,
    title: this.title,
    content: this.content,
    favoritesCount: this.favoritesCount,
    tagList: this.tagList,
    favorited: user ? user.isFavorite(this._id) : false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    author: this.author.toProfileJSONFor(user)
  };
};

module.exports = User = mongoose.model("Post", PostSchema);
