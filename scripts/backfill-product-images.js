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

  console.log('🛠️  Backfilling productImageUrl for products missing it...');
  const query = {
    $or: [
      { productImageUrl: { $exists: false } },
      { productImageUrl: null },
      { productImageUrl: '' }
    ]
  };

  const cursor = db.collection('products').find(query).batchSize(100);
  let total = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    total++;

    // Prefer existing legacy fields if available
    const candidate =
      (doc && (doc.productImageUrl)) ||
      (doc && (doc.image)) ||
      (doc && (doc.imageUrl)) ||
      null;

    // If candidate is a non-empty string use it; otherwise explicitly set null
    const valueToSet = (typeof candidate === 'string' && candidate.trim() !== '') ? candidate : null;

    try {
      await db.collection('products').updateOne(
        { _id: doc._id },
        { $set: { productImageUrl: valueToSet } }
      );
      updated++;
    } catch (err) {
      console.error(`Failed to update product ${doc._id}:`, err);
    }
  }

  console.log(`✅ Processed ${total} product(s). Updated: ${updated}.`);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ Backfill error:', e);
  await mongoose.connection.close();
  process.exit(1);
});