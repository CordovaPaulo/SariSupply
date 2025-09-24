const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// MongoDB connection function (CommonJS compatible)
async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (mongoose.connections[0].readyState) {
    return { db: mongoose.connection.db };
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    return { db: connection.connection.db };
  } catch (error) {
    throw error;
  }
}

async function registerUser(email, username) {
  try {
    console.log('🔌 Connecting to database...');
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const { db } = await connectDB();

    if (!db) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Connected to database');

    // Validate input
    if (!email || !username) {
      console.log('❌ Email and username are required');
      console.log('Usage: npm run register-one <email> <username>');
      process.exit(1);
    }

    // Check if user exists
    console.log(`🔍 Checking if user exists...`);
    const existingUser = await db.collection('users').findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.log(`❌ User already exists:`);
      if (existingUser.email === email) {
        console.log(`   Email "${email}" is already registered`);
      }
      if (existingUser.username === username) {
        console.log(`   Username "${username}" is already taken`);
      }
      process.exit(1);
    }

    // Create user with default password (part before @)
    const defaultPassword = email.split('@')[0];
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Saving user to database...');
    const result = await db.collection('users').insertOne(newUser);

    console.log('🎉 User registered successfully!');
    console.log('─'.repeat(40));
    console.log(`   ID: ${result.insertedId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Default Password: ${defaultPassword}`);
    console.log('─'.repeat(40));
    console.log('💡 User can login with either email or username');

  } catch (error) {
    console.error('❌ Registration error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const username = args[1];

console.log('🚀 Starting user registration...');
console.log('─'.repeat(40));

if (!email || !username) {
  console.log('❌ Missing required arguments');
  console.log('');
  console.log('Usage: npm run register-one <email> <username>');
  console.log('');
  console.log('Examples:');
  console.log('  npm run register-one admin@sarisupply.com admin');
  console.log('  npm run register-one manager@sarisupply.com manager');
  console.log('  npm run register-one john.doe@sarisupply.com johndoe');
  process.exit(1);
}

registerUser(email, username);