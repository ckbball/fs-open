const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const slug = require("slug");
const User = mongoose.model("User");

const PostSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      lowercase: true,
      unique: true
    },
    title: {
      type: String,
      minLength: 4,
      maxLength: 32
    },
    content: {
      type: String,
      minLength: 16,
      maxLength: 256
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

PostSchema.pre("validate", function(next) {
  if (!this.slug) {
    this.slugify();
  }

  next();
});

PostSchema.methods.slugify = function() {
  this.slug =
    slug(this.title) +
    "-" +
    ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
};

PostSchema.methods.updateFavoriteCount = async function() {
  let post = this;

  const count = await User.count({ favorites: { $in: [post._id] } });

  post.favoritesCount = count;

  return post.save();
};

PostSchema.methods.toJSONFor = function(user) {
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

module.exports = Post = mongoose.model("Post", PostSchema);

// Post routes left
/*
get logged in user's own posts
get comments logged in user has created
get comments a user has created by username

post a comment to a post
remove a comment from a post
update a comment on a post
get comments for a post

update a post
delete a post
favorite a post
unfavorite a post

*/
