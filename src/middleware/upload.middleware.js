const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { deleteFile } = require('../utils/fileRemover');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'public/uploads/blogs';
    if (file.fieldname === 'profileImage') {
      folder = 'public/uploads/profiles';
    }
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

module.exports = { upload, deleteFile };