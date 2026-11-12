const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
dotenv.config({ path: path.join(__dirname, '.env') });
const connectDB = require('./src/config/db');
const { populateCurrentUser } = require('./src/middleware/auth.middleware');
const { createDefaultAdmin } = require('./src/seeds/createAdmin');

const app = express();

// Connect MongoDB
connectDB().then(async () => {
  await createDefaultAdmin();
});

// Middleware Stack
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Session & Flash Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Flash messages & Global User Locals
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentUser = req.user || null;
  next();
});
app.use(populateCurrentUser);
app.use((req, res, next) => {
  res.locals.currentUser = req.user || res.locals.currentUser || null;
  next();
});

// Mount Routes
app.use('/api/auth', require('./src/routes/api/authRoutes'));
app.use('/api/users', require('./src/routes/api/userRoutes'));
app.use('/api/blogs', require('./src/routes/api/blogRoutes'));

app.use('/', require('./src/routes/web/viewRoutes'));
app.use('/', require('./src/routes/web/blogViewRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));