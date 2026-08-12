// seed-admin.js - Run this once to create or repair admin/staff accounts
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@legendcollege.com',
  password: 'admin123',
  role: 'admin',
  fullName: 'System Administrator'
};

const DEFAULT_STAFF = {
  username: 'staff',
  email: 'staff@legendcollege.com',
  password: 'staff123',
  role: 'staff',
  fullName: 'Admissions Staff'
};

async function ensureAccount(account) {
  const existingAccount = await Admin.findOne({ username: account.username });

  if (!existingAccount) {
    await Admin.create(account);
    console.log(`${account.role} account created: username=${account.username}, password=${account.password}`);
    return;
  }

  const passwordMatches = await existingAccount.comparePassword(account.password);
  if (!passwordMatches) {
    existingAccount.email = account.email;
    existingAccount.password = account.password;
    existingAccount.role = account.role;
    existingAccount.fullName = account.fullName;
    existingAccount.isActive = true;
    await existingAccount.save();
    console.log(`${account.role} account repaired: username=${account.username}, password=${account.password}`);
    return;
  }

  console.log(`${account.role} account already exists: username=${account.username}`);
}

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables. Please set it in .env file.');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await ensureAccount(DEFAULT_ADMIN);
    await ensureAccount(DEFAULT_STAFF);

    console.log('\n=== Login Credentials ===');
    console.log('Admin: username=admin, password=admin123');
    console.log('Staff: username=staff, password=staff123');
    console.log('=========================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seed();
