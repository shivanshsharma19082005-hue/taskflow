require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Task = require('../models/Task');

const run = async () => {
  await connectDB();

  console.log('[Seed] Clearing existing users and tasks...');
  await User.deleteMany({});
  await Task.deleteMany({});

  console.log('[Seed] Creating Main Boss...');
  const mainBoss = await User.create({
    name: 'Rajesh Sharma',
    email: 'boss@company.com',
    password: 'password123',
    role: 'mainboss',
    department: 'Executive',
  });

  console.log('[Seed] Creating Admins...');

  const adminEngineering = await User.create({
    name: 'Amit Verma',
    email: 'amit.admin@company.com',
    password: 'password123',
    role: 'admin',
    department: 'Engineering',
    manager: mainBoss._id,
  });

  const adminMarketing = await User.create({
    name: 'Neha Kapoor',
    email: 'neha.admin@company.com',
    password: 'password123',
    role: 'admin',
    department: 'Marketing',
    manager: mainBoss._id,
  });

  console.log('[Seed] Creating Employees...');

  const employeeSeeds = [
    {
      name: 'Arjun Mehta',
      email: 'arjun@company.com',
      password: 'password123',
      role: 'employee',
      department: 'Engineering',
      manager: adminEngineering._id,
    },
    {
      name: 'Priya Singh',
      email: 'priya@company.com',
      password: 'password123',
      role: 'employee',
      department: 'Engineering',
      manager: adminEngineering._id,
    },
    {
      name: 'Rohit Gupta',
      email: 'rohit@company.com',
      password: 'password123',
      role: 'employee',
      department: 'Engineering',
      manager: adminEngineering._id,
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya@company.com',
      password: 'password123',
      role: 'employee',
      department: 'Marketing',
      manager: adminMarketing._id,
    },
    {
      name: 'Vikram Patel',
      email: 'vikram@company.com',
      password: 'password123',
      role: 'employee',
      department: 'Marketing',
      manager: adminMarketing._id,
    },
  ];

  const employees = [];

  for (const seed of employeeSeeds) {
    employees.push(await User.create(seed));
  }

  console.log(
    `[Seed] Created ${employees.length} employees with properly hashed passwords`
  );

  const [arjun, priya, rohit, ananya, vikram] = employees;

  console.log('[Seed] Creating Tasks...');

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  await Task.insertMany([
    {
      title: 'Fix production login bug',
      description:
        'Users on Safari are getting logged out after 2 minutes. Investigate session/cookie handling.',
      assignedTo: arjun._id,
      assignedBy: adminEngineering._id,
      priority: 'high',
      status: 'in-progress',
      dueDate: new Date(now + 2 * day),
    },
    {
      title: 'Write unit tests for payments module',
      description:
        'Cover the refund and partial-refund code paths.',
      assignedTo: priya._id,
      assignedBy: adminEngineering._id,
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(now + 5 * day),
    },
    {
      title: 'Set up staging environment monitoring',
      description:
        'Wire up basic uptime + error rate alerts for staging.',
      assignedTo: rohit._id,
      assignedBy: adminEngineering._id,
      priority: 'low',
      status: 'completed',
      completedAt: new Date(now - 1 * day),
      dueDate: new Date(now - 1 * day),
    },
    {
      title: 'Draft Q3 social media calendar',
      description:
        'Plan posts across Instagram, LinkedIn and X for the product launch.',
      assignedTo: ananya._id,
      assignedBy: adminMarketing._id,
      priority: 'medium',
      status: 'in-progress',
      dueDate: new Date(now + 3 * day),
    },
    {
      title: 'Analyze last campaign performance',
      description:
        'Pull CTR, conversion, and CAC numbers into a summary deck.',
      assignedTo: vikram._id,
      assignedBy: adminMarketing._id,
      priority: 'high',
      status: 'pending',
      dueDate: new Date(now + 1 * day),
    },
    {
      title: 'Prepare hiring plan for engineering',
      description:
        'Draft headcount request for next two quarters.',
      assignedTo: adminEngineering._id,
      assignedBy: mainBoss._id,
      priority: 'high',
      status: 'pending',
      dueDate: new Date(now + 7 * day),
    },
    {
      title: 'Review marketing budget proposal',
      description:
        'Sanity check the numbers before the board meeting.',
      assignedTo: adminMarketing._id,
      assignedBy: mainBoss._id,
      priority: 'medium',
      status: 'completed',
      completedAt: new Date(now - 2 * day),
      dueDate: new Date(now - 2 * day),
    },
  ]);

  console.log('\n[Seed] Done! Login with any of these (password: password123):');
  console.log('  Main Boss : boss@company.com');
  console.log('  Admin     : amit.admin@company.com (Engineering)');
  console.log('  Admin     : neha.admin@company.com  (Marketing)');
  console.log(
    '  Employee  : arjun@company.com, priya@company.com, rohit@company.com'
  );
  console.log(
    '  Employee  : ananya@company.com, vikram@company.com'
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});