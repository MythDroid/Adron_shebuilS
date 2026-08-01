import mongoose from 'mongoose';
import 'dotenv/config';

async function checkDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.log("No MONGODB_URI env variable set!");
    process.exit(1);
  }
  console.log("Connecting to:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { dbName: 'adorn' });
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  const GiftLinkSchema = new mongoose.Schema({}, { strict: false });
  const GiftLink = mongoose.models.GiftLink || mongoose.model('GiftLink', GiftLinkSchema, 'giftlinks'); // default collection name is lowercased pluralized or exact
  
  // check both potential names 'giftlinks' and 'gift_links'
  const count1 = await mongoose.connection.db.collection('giftlinks').countDocuments();
  console.log("Count in 'giftlinks':", count1);
  const docs1 = await mongoose.connection.db.collection('giftlinks').find().toArray();
  console.log("Docs in 'giftlinks':", docs1.map(d => ({ token: d.token, recipientName: d.recipientName, status: d.status })));

  const count2 = await mongoose.connection.db.collection('gift_links').countDocuments();
  console.log("Count in 'gift_links':", count2);
  const docs2 = await mongoose.connection.db.collection('gift_links').find().toArray();
  console.log("Docs in 'gift_links':", docs2.map(d => ({ token: d.token, recipientName: d.recipientName, status: d.status })));
  
  process.exit(0);
}

checkDB().catch(console.error);
