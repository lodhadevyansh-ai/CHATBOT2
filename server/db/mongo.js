import mongoose from 'mongoose';

let isConnected = false;
let mongoStatusMessage = 'Connecting to MongoDB...';

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatbot';

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000 // Fast timeout if MongoDB server is not running locally
    });

    isConnected = true;
    mongoStatusMessage = `Connected to MongoDB at ${mongoUri}`;
    console.log(`🟢 ${mongoStatusMessage}`);
  } catch (err) {
    isConnected = false;
    mongoStatusMessage = `MongoDB connection unavailable (${err.message}). Using local DB fallback.`;
    console.warn(`🟠 ${mongoStatusMessage}`);
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    mongoStatusMessage = 'MongoDB disconnected. Falling back to local storage.';
    console.warn('⚠️ MongoDB connection lost.');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    mongoStatusMessage = 'MongoDB reconnected successfully.';
    console.log('🟢 MongoDB reconnected.');
  });
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getMongoStatus() {
  return {
    connected: isMongoConnected(),
    statusMessage: mongoStatusMessage,
    readyState: mongoose.connection.readyState,
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatbot'
  };
}
