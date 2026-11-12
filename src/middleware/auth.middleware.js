const jwt = require('jsonwebtoken');
const User = require('../model/userModel');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');

const getAccessToken = (req) => req.cookies.accessToken
  || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

const populateCurrentUser = async (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    res.locals.currentUser = req.session.user;
    return next();
  }

  const accessToken = getAccessToken(req);

  if (!accessToken) {
    return next();
  }

  let decoded;
  try {
    decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
  } catch (err) {
    return next();
  }

  try {
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      const safeUser = user.toObject ? user.toObject() : user;
      req.user = safeUser;
      res.locals.currentUser = safeUser;
      if (req.session) {
        req.session.user = safeUser;
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

const verifyAuth = async (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    res.locals.currentUser = req.session.user;
    return next();
  }

  const accessToken = getAccessToken(req);
  const refreshToken = req.cookies.refreshToken;

  // 1. Verify Access Token
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
        return next();
      }
    } catch (err) {
      // Access token expired, attempt fallback to refresh token
    }
  }

  // 2. Silent Refresh Fallback
  if (refreshToken) {
    try {
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REF_SEC_KEY);
      const user = await User.findById(decodedRefresh.id).select('-password');

      if (user && user.refreshToken === refreshToken) {
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        user.refreshToken = newRefreshToken;
        await user.save();

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        };

        res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        req.user = user;
        res.locals.currentUser = user;
        return next();
      }
    } catch (refreshErr) {
      // Refresh token expired or altered
    }
  }

  // 3. Fallback failure
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  req.flash('error_msg', 'Session expired. Please log in again.');
  return res.redirect('/login');
};

const checkRole = (role) => (req, res, next) => {
  if (req.user && req.user.role === role) {
    return next();
  }
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  }
  req.flash('error_msg', 'Access denied.');
  return res.redirect('/dashboard');
};

module.exports = { verifyAuth, checkRole, populateCurrentUser };