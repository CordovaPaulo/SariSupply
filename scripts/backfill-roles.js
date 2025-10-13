/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

async function main() {
  dotenv.config({ path: '.env.local' });
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL;
  if (!uri) {
    console.error('❌ Missing MongoDB connection string in .env.local (MONGODB_URI)');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('🛠️  Backfilling user roles where missing/invalid...');
  const res = await db.collection('users').updateMany(
    {
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: '' },
        { role: { $nin: ['user', 'admin'] } }
      ]
    },
    { $set: { role: 'user' } }
  );

  console.log(`✅ Modified ${res.modifiedCount} document(s)`);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ Backfill error:', e);
  await mongoose.connection.close();
  process.exit(1);
});