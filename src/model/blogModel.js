const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogUser', required: true },
  blogImage: { type: String, default: null },
  isDeleted: { type: Boolean, default: false } // Required for User soft-delete
}, { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;