const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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

async function registerBatchUsers(filePath) {
  try {
    console.log('🚀 Starting batch user registration...');
    console.log('─'.repeat(50));

    // Load environment variables
    dotenv.config({ path: '.env.local' });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      console.log('');
      console.log('Create a JSON file with the following format:');
      console.log(JSON.stringify([
        { email: "admin@sarisupply.com", username: "admin" },
        { email: "manager@sarisupply.com", username: "manager" }
      ], null, 2));
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    const { db } = await connectDB();

    if (!db) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Connected to database');

    // Read users from JSON file
    console.log(`📖 Reading users from: ${filePath}`);
    const usersData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(usersData)) {
      throw new Error('JSON file must contain an array of user objects');
    }

    console.log(`📝 Found ${usersData.length} users to process`);
    console.log('─'.repeat(50));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [index, userData] of usersData.entries()) {
      const { email, username } = userData;
      
      console.log(`\n[${index + 1}/${usersData.length}] Processing: ${email}`);

      if (!email || !username) {
        console.log(`❌ Missing email or username - skipping`);
        errorCount++;
        continue;
      }

      try {
        // Check if user exists
        const existingUser = await db.collection('users').findOne({
          $or: [{ email }, { username }]
        });

        if (existingUser) {
          console.log(`⚠️  User already exists - skipping`);
          skipCount++;
          continue;
        }

        // Create user with default password
        const defaultPassword = email.split('@')[0];
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        const newUser = {
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('users').insertOne(newUser);
        console.log(`✅ Registered successfully (password: ${defaultPassword})`);
        successCount++;

      } catch (userError) {
        console.log(`❌ Error registering user: ${userError.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Batch registration completed!');
    console.log('='.repeat(50));
    console.log(`✅ Successfully registered: ${successCount}`);
    console.log(`⚠️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${usersData.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Batch registration error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const filePath = args[0] || path.join(__dirname, 'users.json');

console.log('📂 Batch User Registration');
console.log('─'.repeat(50));

if (!fs.existsSync(filePath)) {
  console.log(`❌ Default file not found: ${filePath}`);
  console.log('');
  console.log('Usage: npm run register-many [filepath]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run register-many');
  console.log('  npm run register-many scripts/my-users.json');
  console.log('  npm run register-many data/employees.json');
  console.log('');
  console.log('Create a JSON file with this format:');
  console.log(JSON.stringify([
    { email: "admin@sarisupply.com", username: "admin" },
    { email: "manager@sarisupply.com", username: "manager" },
    { email: "employee@sarisupply.com", username: "employee" }
  ], null, 2));
  process.exit(1);
}

registerBatchUsers(filePath);