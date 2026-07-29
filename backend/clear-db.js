require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/sweetchat';

async function clearDatabase() {
  const urisToClear = [
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/sweetchat'
  ].filter(Boolean);

  for (const uri of urisToClear) {
    try {
      console.log(`Connecting to MongoDB at ${uri}...`);
      await mongoose.connect(uri);
      console.log(`✅ Connected to ${uri}`);

      const collections = Object.keys(mongoose.connection.collections);
      for (const collectionName of collections) {
        const collection = mongoose.connection.collections[collectionName];
        await collection.deleteMany({});
        console.log(`🗑️ Cleared collection: ${collectionName}`);
      }

      console.log(`🎉 Cleared database for ${uri}`);
      await mongoose.disconnect();
    } catch (err) {
      console.error(`⚠️ Connection error for ${uri}:`, err.message);
      try { await mongoose.disconnect(); } catch (_) {}
    }
  }
  process.exit(0);
}

clearDatabase();
