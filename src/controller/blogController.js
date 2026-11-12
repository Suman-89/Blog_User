const Blog = require('../model/blogModel');
const { deleteFile } = require('../middleware/upload.middleware');

class BlogController {
  // POST /api/blogs
  async createBlog(req, res) {
    try {
      const { title, content } = req.body;
      const blogData = {
        title,
        content,
        author: req.user._id,
        blogImage: req.file ? req.file.path.replace(/\\/g, '/') : null
      };

      const blog = await Blog.create(blogData);

      req.flash('success_msg', 'Blog created successfully!');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(201).json({ success: true, blog });
      }
      return res.redirect('/blogs');
    } catch (err) {
      console.log('Error creating blog:', err);
      if (req.file) deleteFile(req.file.path);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: 'Error creating blog' });
      }
      req.flash('error_msg', 'Failed to create blog');
      return res.redirect('/blogs/create');
    }
  }

  // GET /api/blogs (Public)
  async getAllBlogs(req, res) {
    try {
      // Super Admin sees all; regular users/guests only see non-deleted blogs
      const filter = (req.user && req.user.role === 'Admin') ? {} : { isDeleted: false };
      const blogs = await Blog.find(filter).populate('author', 'name email').sort({ createdAt: -1 });

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ success: true, count: blogs.length, blogs });
      }
      return res.render('blog/index', { blogs, title: 'All Blogs' });
    } catch (err) {
      console.log('Error fetching blogs:', err);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error fetching blogs' });
      }
      req.flash('error_msg', 'Failed to retrieve blogs');
      return res.redirect('/dashboard');
    }
  }

  // GET /api/blogs/:id (Public)
  async getBlogById(req, res) {
    try {
      const id = req.params.id;
      const blog = await Blog.findById(id).populate('author', 'name email');

      if (!blog || (blog.isDeleted && (!req.user || req.user.role !== 'Admin'))) {
        console.log('Blog not found!');
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(404).json({ error: 'Blog not found' });
        }
        req.flash('error_msg', 'Blog not found');
        return res.redirect('/blogs');
      }

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ success: true, blog });
      }
      return res.render('blog/show', { blog, title: blog.title });
    } catch (err) {
      console.log('Error finding blog:', err);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error' });
      }
      req.flash('error_msg', 'Error finding blog');
      return res.redirect('/blogs');
    }
  }

  // PUT /api/blogs/:id (Protected)
  async updateBlog(req, res) {
    try {
      const id = req.params.id;
      const blog = await Blog.findById(id);

      if (!blog) {
        console.log('Blog not found!');
        if (req.file) deleteFile(req.file.path);
        if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ error: 'Blog not found' });
        req.flash('error_msg', 'Blog not found');
        return res.redirect('/blogs');
      }

      // Authorization check: Must be owner or Super Admin
      if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        if (req.file) deleteFile(req.file.path);
        if (req.originalUrl.startsWith('/api/')) return res.status(403).json({ error: 'Unauthorized to edit this blog' });
        req.flash('error_msg', 'Access denied');
        return res.redirect('/blogs');
      }

      const { title, content } = req.body;
      if (title) blog.title = title;
      if (content) blog.content = content;

      // Replace old image if a new image was uploaded
      if (req.file) {
        if (blog.blogImage) {
          deleteFile(blog.blogImage);
        }
        blog.blogImage = req.file.path.replace(/\\/g, '/');
      }

      await blog.save();

      req.flash('success_msg', 'Blog updated successfully!');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ success: true, blog });
      }
      return res.redirect(`/blogs/${blog._id}`);
    } catch (err) {
      console.log('Error updating blog:', err);
      if (req.file) deleteFile(req.file.path);
      if (req.originalUrl.startsWith('/api/')) return res.status(500).json({ error: 'Server error updating blog' });
      req.flash('error_msg', 'Failed to update blog');
      return res.redirect(`/blogs/edit/${req.params.id}`);
    }
  }

  // DELETE /api/blogs/:id (Protected)
  async deleteBlog(req, res) {
    try {
      const id = req.params.id;
      const blog = await Blog.findById(id);

      if (!blog) {
        console.log('Blog not found!');
        if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ error: 'Blog not found' });
        req.flash('error_msg', 'Blog not found');
        return res.redirect('/blogs');
      }

      // Super Admin: Hard Delete + unlink image file
      if (req.user.role === 'Admin') {
        if (blog.blogImage) {
          deleteFile(blog.blogImage);
        }
        await Blog.findByIdAndDelete(id);

        req.flash('success_msg', 'Blog permanently removed by Admin');
        if (req.originalUrl.startsWith('/api/')) return res.status(200).json({ message: 'Hard deleted by Admin' });
        return res.redirect('/blogs');
      }

      // Standard User: Soft Delete own blog
      if (blog.author.toString() === req.user._id.toString()) {
        blog.isDeleted = true;
        await blog.save();

        req.flash('success_msg', 'Blog moved to trash');
        if (req.originalUrl.startsWith('/api/')) return res.status(200).json({ message: 'Soft deleted by User' });
        return res.redirect('/blogs');
      }

      // Unauthorized user
      if (req.originalUrl.startsWith('/api/')) return res.status(403).json({ error: 'Unauthorized to delete this blog' });
      req.flash('error_msg', 'Access denied');
      return res.redirect('/blogs');
    } catch (err) {
      console.log('Error deleting blog:', err);
      if (req.originalUrl.startsWith('/api/')) return res.status(500).json({ error: 'Server error deleting blog' });
      req.flash('error_msg', 'Failed to delete blog');
      return res.redirect('/blogs');
    }
  }
}

module.exports = new BlogController();