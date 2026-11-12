const bcrypt = require('bcryptjs');
const User = require('../model/userModel');

const createDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@blog.com';
    const adminPassword = 'Admin123!';

    const existingAdmin = await User.findOne({
      email: adminEmail.toLowerCase()
    });

    if (existingAdmin) {
      console.log('Default admin already exists.');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      profileImage: null
    });

    console.log('Default admin created successfully.');
    console.log('Email: admin@blog.com');
    console.log('Password: Admin123!');

    return adminUser;
  } catch (error) {
    console.error('Error creating default admin:', error);
    return null;
  }
};

module.exports = { createDefaultAdmin };
