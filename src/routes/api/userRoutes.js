const express = require('express');
const router = express.Router();
const userController = require('../../controller/userController');
const { verifyAuth, checkRole } = require('../../middleware/auth.middleware');

router.use(verifyAuth);
router.use(checkRole('Admin'));

router.get('/', userController.getAllUsers);
router.delete('/:id', userController.deleteUser);

module.exports = router;