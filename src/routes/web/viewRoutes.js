const express = require('express');
const router = express.Router();
const User = require('../../model/userModel');
const Blog = require('../../model/blogModel');
const userController = require('../../controller/userController');
const authController = require('../../controller/authController');
const { verifyAuth, checkRole } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');

// Public Pages
router.get('/', (req, res) => res.redirect('./dashboard'));
router.get('/login', (req, res) => res.render('auth/login', { title: 'Login' }));
router.get('/register', (req, res) => res.render('auth/register', { title: 'Register' }));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', upload.single('profileImage'), (req, res) => authController.register(req, res));

// Protected Dashboard
router.get('/dashboard', verifyAuth, async (req, res) => {
  try {
    if (!req.user) {
      req.flash('error_msg', 'Please log in again.');
      return res.redirect('/login');
    }

    const isAdmin = req.user.role === 'Admin';
    const blogQuery = isAdmin
      ? { isDeleted: false }
      : { author: req.user._id, isDeleted: false };

    const blogs = await Blog.find(blogQuery)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    const users = isAdmin
      ? await User.find().select('-password -refreshToken').sort({ createdAt: -1 })
      : [];

    res.render('dashboard', { title: 'Dashboard', blogs, users, currentUser: req.user });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    req.flash('error_msg', 'Failed to load dashboard');
    res.redirect('/login');
  }
});

// Admin User Management Page
router.get('/users', verifyAuth, checkRole('Admin'), userController.getAllUsers);

module.exports = router;