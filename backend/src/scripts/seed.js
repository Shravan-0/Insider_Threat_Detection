const { connectDB, hasDatabase } = require("../config/db");
const { User } = require("../models/User");

const users = [
  {
    name: "Priya Manager",
    email: "manager@inthreat.local",
    password: "Password123",
    role: "manager",
    department: "Security Operations",
    employeeId: "MGR-0001",
  },
  {
    name: "Arjun Analyst",
    email: "admin@inthreat.local",
    password: "Password123",
    role: "admin",
    department: "Threat Intelligence",
    employeeId: "ADM-0001",
  },
  {
    name: "Client Demo",
    email: "client@inthreat.local",
    password: "Password123",
    role: "client",
    department: "Engineering",
    employeeId: "EMP-0001",
  },
];

async function seed() {
  await connectDB();

  if (!hasDatabase()) {
    console.error("MongoDB is not connected. Start MongoDB or update MONGODB_URI before seeding.");
    process.exit(1);
  }

  for (const user of users) {
    const existing = await User.findOne({ email: user.email });
    if (existing) {
      console.log(`Exists: ${user.email}`);
      continue;
    }

    await User.create(user);
    console.log(`Created: ${user.email}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
