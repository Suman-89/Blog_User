
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../model/userModel');
const {
    generateAccessToken,
    generateRefreshToken
} = require('../utils/tokens');

const { deleteFile } = require('../middleware/upload.middleware');

class AuthController {

    // ==========================================
    // COOKIE CONFIGURATION
    // ==========================================

    #getCookieOptions(maxAge) {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge,
            path: '/'
        };
    }

    #clearAuthCookies(res) {
        const options = this.#getCookieOptions();

        res.clearCookie('accessToken', options);
        res.clearCookie('refreshToken', options);
    }

    #isApiRequest(req) {
        return req.originalUrl.startsWith('/api/');
    }

    #handleError(req, res, error, message, statusCode = 500) {
        console.error(`${message}:`, error);

        if (this.#isApiRequest(req)) {
            return res.status(statusCode).json({
                success: false,
                message
            });
        }

        req.flash('error_msg', message);

        return res.redirect(
            req.originalUrl.startsWith('/register')
                ? '/register'
                : '/login'
        );
    }

    // ==========================================
    // USER REGISTRATION
    // POST /api/auth/register
    // ==========================================

    async register(req, res) {
        try {
            const { name, email, password } = req.body;

            // Validate required fields
            if (!name || !email || !password) {
                if (req.file) deleteFile(req.file.path);

                if (this.#isApiRequest(req)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Name, email and password are required'
                    });
                }

                req.flash('error_msg', 'All fields are required.');
                return res.redirect('/register');
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Check existing user
            const existingUser = await User.findOne({
                email: normalizedEmail
            });

            if (existingUser) {
                if (req.file) deleteFile(req.file.path);

                if (this.#isApiRequest(req)) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already registered'
                    });
                }

                req.flash('error_msg', 'Email is already registered.');
                return res.redirect('/register');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Profile image path
            const profileImagePath = req.file
                ? req.file.path.replace(/\\/g, '/')
                : null;

            // Create user
            // Public registration must never accept an Admin role.
            const user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                profileImage: profileImagePath,
                role: 'User'
            });

            req.flash(
                'success_msg',
                'Registration successful! Please login.'
            );

            if (this.#isApiRequest(req)) {
                return res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }

            return res.redirect('/login');

        } catch (error) {
            if (req.file) deleteFile(req.file.path);

            if (error.code === 11000) {
                return this.#handleError(
                    req,
                    res,
                    error,
                    'Email is already registered.',
                    409
                );
            }

            return this.#handleError(
                req,
                res,
                error,
                'Registration failed. Please try again.'
            );
        }
    }

    // ==========================================
    // USER LOGIN
    // POST /api/auth/login
    // ==========================================

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                if (this.#isApiRequest(req)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email and password are required'
                    });
                }

                req.flash('error_msg', 'Please enter email and password.');
                return res.redirect('/login');
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Find user
            const user = await User.findOne({
                email: normalizedEmail
            });

            if (!user) {
                if (this.#isApiRequest(req)) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid email or password'
                    });
                }

                req.flash('error_msg', 'Invalid email or password.');
                return res.redirect('/login');
            }

            // Compare password
            const isMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!isMatch) {
                if (this.#isApiRequest(req)) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid email or password'
                    });
                }

                req.flash('error_msg', 'Invalid email or password.');
                return res.redirect('/login');
            }

            // Generate tokens
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            // Store refresh token
            user.refreshToken = refreshToken;
            await user.save();

            req.user = user;
            if (req.session) {
                const safeUser = user.toObject ? user.toObject() : user;
                req.session.user = safeUser;
                req.session.userId = user._id.toString();
            }

            // Set cookies
            res.cookie(
                'accessToken',
                accessToken,
                this.#getCookieOptions(15 * 60 * 1000)
            );

            res.cookie(
                'refreshToken',
                refreshToken,
                this.#getCookieOptions(7 * 24 * 60 * 60 * 1000)
            );

            req.flash('success_msg', 'Welcome back!');

            if (this.#isApiRequest(req)) {
                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    accessToken,
                    refreshToken,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }

            return res.redirect('/dashboard');

        } catch (error) {
            return this.#handleError(
                req,
                res,
                error,
                'Something went wrong during login.'
            );
        }
    }

    // ==========================================
    // REFRESH ACCESS TOKEN
    // POST /api/auth/refresh
    // ==========================================

    async refreshToken(req, res) {
        try {
            const incomingRefreshToken =
                req.cookies?.refreshToken ||
                req.body?.refreshToken;

            if (!incomingRefreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token not found'
                });
            }

            const decoded = jwt.verify(
                incomingRefreshToken,
                process.env.JWT_REF_SEC_KEY
            );

            const user = await User.findById(decoded.id);

            // Validate stored refresh token
            if (
                !user ||
                user.refreshToken !== incomingRefreshToken
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired refresh token'
                });
            }

            // Generate new tokens
            const newAccessToken = generateAccessToken(user);
            const newRefreshToken = generateRefreshToken(user);

            user.refreshToken = newRefreshToken;
            await user.save();

            // Update cookies
            res.cookie(
                'accessToken',
                newAccessToken,
                this.#getCookieOptions(15 * 60 * 1000)
            );

            res.cookie(
                'refreshToken',
                newRefreshToken,
                this.#getCookieOptions(7 * 24 * 60 * 60 * 1000)
            );

            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });

        } catch (error) {
            console.error('Refresh token error:', error);

            return res.status(403).json({
                success: false,
                message: 'Expired or invalid refresh token'
            });
        }
    }

    // ==========================================
    // USER LOGOUT
    // GET /api/auth/logout
    // ==========================================

   async logout(req, res) {
  try {
    const refreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null }
      );
    } else if (req.user) {
      await User.findByIdAndUpdate(
        req.user._id,
        { refreshToken: null }
      );
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    req.flash("success_msg", "You have been logged out.");

    if (req.session) {
      req.session.destroy(() => {
        return res.redirect("/login");
      });
      return;
    }

    return res.redirect("/login");

  } catch (error) {
    console.error("Logout error:", error);
    req.flash("error_msg", "Logout failed.");
    return res.redirect("/");
  }
}
}

module.exports = new AuthController();
