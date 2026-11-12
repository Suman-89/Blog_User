const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.ACCESS_TOK_EXP || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REF_SEC_KEY,
    { expiresIn: process.env.REF_TOK_EXP || '7d' }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken
};