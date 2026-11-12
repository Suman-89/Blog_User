const express = require('express');
const router = express.Router();
const authController = require('../../controller/authController');
const { verifyAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');


router.post('/register', upload.single('profileImage'), authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', verifyAuth, authController.logout);

module.exports = router;