const fs = require('fs');
const path = require('path');

/**
 * Safely unlinks/deletes a file from the server disk if it exists
 * @param {string} relativeFilePath - e.g., 'public/uploads/blogs/image-123.jpg'
 */
const deleteFile = (relativeFilePath) => {
  if (!relativeFilePath) return;

  const absolutePath = path.resolve(relativeFilePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlink(absolutePath, (err) => {
      if (err) {
        console.log(`Failed to delete file at ${relativeFilePath}:`, err.message);
      }
    });
  }
};

module.exports = { deleteFile };