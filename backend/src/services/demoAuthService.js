const demoUsers = [
  {
    id: "demo-manager",
    name: "Priya Manager",
    email: "manager@inthreat.local",
    password: "Password123",
    role: "manager",
    department: "Security Operations",
    employeeId: "MGR-0001",
  },
  {
    id: "demo-admin",
    name: "Arjun Analyst",
    email: "admin@inthreat.local",
    password: "Password123",
    role: "admin",
    department: "Threat Intelligence",
    employeeId: "ADM-0001",
  },
  {
    id: "demo-client",
    name: "Client Demo",
    email: "client@inthreat.local",
    password: "Password123",
    role: "client",
    department: "Engineering",
    employeeId: "EMP-0001",
  },
];

function findDemoUser(email, password) {
  const user = demoUsers.find((item) => item.email === String(email).toLowerCase() && item.password === password);
  if (!user) return null;

  const { password: _password, ...safeUser } = user;
  return safeUser;
}

module.exports = { demoUsers, findDemoUser };
