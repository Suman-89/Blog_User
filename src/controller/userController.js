const User = require('../model/userModel');
const Blog = require('../model/blogModel');
const { deleteFile } = require('../middleware/upload.middleware');

class UserController {
  // GET /api/users (Admin only)
  async getAllUsers(req, res) {
    try {
      const users = await User.find().select('-password -refreshToken').sort({ createdAt: -1 });

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ success: true, count: users.length, users });
      }
      return res.render('users', { users, title: 'User Management' });
    } catch (err) {
      console.log('Error fetching users:', err);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error fetching users' });
      }
      req.flash('error_msg', 'Failed to load users');
      return res.redirect('/dashboard');
    }
  }

  // DELETE /api/users/:id (Admin only)
  async deleteUser(req, res) {
    try {
      const id = req.params.id;
      const user = await User.findById(id);

      if (!user) {
        console.log('User not found!');
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(404).json({ error: 'User not found' });
        }
        req.flash('error_msg', 'User not found');
        return res.redirect('/users');
      }

      // Delete profile picture if exists
      if (user.profileImage) {
        deleteFile(user.profileImage);
      }

      // Unlink and delete associated blogs and their images
      const userBlogs = await Blog.find({ author: user._id });
      for (const blog of userBlogs) {
        if (blog.blogImage) {
          deleteFile(blog.blogImage);
        }
      }
      await Blog.deleteMany({ author: user._id });

      await User.findByIdAndDelete(id);

      req.flash('success_msg', 'User and all associated data deleted successfully');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ message: 'User deleted successfully' });
      }
      return res.redirect('/users');
    } catch (err) {
      console.log('Error deleting user:', err);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error deleting user' });
      }
      req.flash('error_msg', 'Could not delete user');
      return res.redirect('/users');
    }
  }
}

module.exports = new UserController();