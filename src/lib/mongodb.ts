import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

declare global {
  // attach to globalThis for Node + TS compatibility
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = (globalThis as any).mongoose ?? { conn: null, promise: null };

if (!(globalThis as any).mongoose) {
  (globalThis as any).mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return { db: cached.conn.connection.db };
  }

  if (!cached.promise) {
    const opts = {
      // recommended options
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // prefer IPv4 if DNS/IPv6 causes issues
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts) as Promise<mongoose.Mongoose>;
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return { db: cached.conn!.connection.db };
}

export { connectDB }; // Use ES6 export instead of module.exports