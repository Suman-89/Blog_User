
const express = require('express');
const router = express.Router();

const Blog = require('../../model/blogModel');
const blogController = require('../../controller/blogController');
const { verifyAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');

// ==========================================
// PUBLIC BLOG ROUTES
// ==========================================

// Display all blogs
router.get('/blogs', blogController.getAllBlogs);

// ==========================================
// PROTECTED BLOG FORM ROUTES
// ==========================================

// Display create blog form
router.get('/blogs/create', verifyAuth, (req, res) => {
    res.render('blog/create', {
        title: 'Write a Blog'
    });
});

// Display edit blog form
router.get('/blogs/edit/:id', verifyAuth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        // Check whether blog exists or is deleted
        if (!blog || (blog.isDeleted && req.user.role !== 'Admin')) {
            req.flash('error_msg', 'Blog not found');
            return res.redirect('/blogs');
        }

        // Check blog ownership
        const isAuthor = blog.author.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'Admin';

        if (!isAuthor && !isAdmin) {
            req.flash('error_msg', 'Permission denied');
            return res.redirect('/blogs');
        }

        return res.render('blog/edit', {
            blog,
            title: `Edit: ${blog.title}`
        });

    } catch (error) {
        console.error('Edit Blog Error:', error);

        req.flash('error_msg', 'Unable to load blog for editing');
        return res.redirect('/blogs');
    }
});

// ==========================================
// PUBLIC BLOG DETAILS
// ==========================================

// Display a single blog
router.get('/blogs/:id', blogController.getBlogById);

// ==========================================
// PROTECTED BLOG FORM SUBMISSIONS
// ==========================================

// Create blog
router.post(
    '/blogs',
    verifyAuth,
    upload.single('blogImage'),
    blogController.createBlog
);

// Update blog
router.put(
    '/blogs/:id',
    verifyAuth,
    upload.single('blogImage'),
    blogController.updateBlog
);

// Delete blog
router.delete(
    '/blogs/:id',
    verifyAuth,
    blogController.deleteBlog
);

module.exports = router;
