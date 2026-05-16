const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const adminSchema = new mongoose.Schema({}, { strict: false, collection: 'admins' });
const Admin = mongoose.model('AdminIndexHelper', adminSchema);

async function removeIndex() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const collection = mongoose.connection.collection('admins');

    const indexes = await collection.indexes();
    const indexNames = indexes.map((idx) => idx.name);

    console.log('Indexes on admins:', indexNames.join(', '));

    if (!indexNames.includes('adminId_1')) {
      console.log('Index adminId_1 does not exist. Nothing to remove.');
    } else {
      await collection.dropIndex('adminId_1');
      console.log('Dropped index adminId_1 from admins collection.');
    }
  } catch (error) {
    console.error('Error removing index:', error.message || error);
  } finally {
    await mongoose.disconnect();
  }
}

removeIndex();
