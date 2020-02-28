const mongoose = require("mongoose");
const validate = require("mongoose-validator").validate;

const CommentSchema = new mongoose.Schema(
  {
    body: { type: String, minLength: 1, maxLength: 128 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }
  },
  { timestamps: true }
);

// Requires population of author
CommentSchema.methods.toJSONFor = function(user) {
  return {
    id: this._id,
    body: this.body,
    createdAt: this.createdAt,
    author: this.author.toProfileJSONFor(user)
  };
};

module.exports = Comment = mongoose.model("Comment", CommentSchema);
