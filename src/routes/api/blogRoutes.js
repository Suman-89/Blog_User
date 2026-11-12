const express = require('express');
const router = express.Router();
const blogController = require('../../controller/blogController');
const { verifyAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');

// Public
router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);
// Protected

router.post('/', verifyAuth, upload.single('blogImage'), blogController.createBlog);
router.put('/:id', verifyAuth, upload.single('blogImage'), blogController.updateBlog);
router.delete('/:id', verifyAuth, blogController.deleteBlog);

module.exports = router;