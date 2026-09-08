const mongoose = require('mongoose');

// Logs ongoing connection health after the initial connect succeeds, so a
// dropped connection (network blip, Atlas maintenance, etc.) shows up in the
// server logs instead of failing silently while requests keep timing out.
mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] runtime connection error: ${err.message}`);
});
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] disconnected — attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] reconnected');
});

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not set in the environment');
    }
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
