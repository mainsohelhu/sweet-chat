require('dotenv').config();
const mongoose = require('mongoose');

async function checkDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const User = require('./models/User');
  const users = await User.find({}, 'email displayName');
  
  console.log("Registered Users in Database:");
  users.forEach(u => console.log(`- Name: ${u.displayName}, Email: ${u.email}`));
  
  process.exit(0);
}

checkDB();
