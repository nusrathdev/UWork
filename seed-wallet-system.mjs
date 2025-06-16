import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting wallet system seed...');
  
  // Create sample users with wallet balances
  const users = [
    {
      email: 'john.client@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'John Smith',
      studentId: 'CLI001',
      university: 'University of Colombo',
      course: 'Business Administration',
      year: 3,
      bio: 'Looking for talented freelancers for my projects',
      skills: 'Project Management, Business Analysis',
      walletBalance: 50000, // LKR 50,000 starting balance
    },
    {
      email: 'alice.freelancer@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Alice Johnson',
      studentId: 'FRE001', 
      university: 'University of Moratuwa',
      course: 'Computer Science',
      year: 4,
      bio: 'Full-stack developer with 3 years experience',
      skills: 'React, Node.js, TypeScript, Python, Database Design',
      walletBalance: 25000, // LKR 25,000 starting balance
    },
    {
      email: 'bob.developer@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Bob Wilson',
      studentId: 'DEV001',
      university: 'SLIIT',
      course: 'Software Engineering',
      year: 3,
      bio: 'Mobile app developer and UI/UX designer',
      skills: 'React Native, Flutter, UI/UX Design, Figma',
      walletBalance: 15000, // LKR 15,000 starting balance
    },
    {
      email: 'sarah.designer@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Sarah Davis',
      studentId: 'DES001',
      university: 'University of the Arts',
      course: 'Graphic Design',
      year: 2,
      bio: 'Creative graphic designer specializing in branding',
      skills: 'Graphic Design, Adobe Creative Suite, Branding, Logo Design',
      walletBalance: 10000, // LKR 10,000 starting balance
    }
  ];

  // Create users
  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.name} (${user.email}) with wallet balance: LKR ${user.walletBalance}`);
  }

  // Create sample projects
  const projects = [
    {
      title: 'E-commerce Website Development',
      description: 'Need a full-stack e-commerce website with payment integration. Should include user authentication, product catalog, shopping cart, and admin panel.',
      budget: 75000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      skills: 'React, Node.js, Database, Payment Integration',
      ownerId: createdUsers[0].id, // John (client)
    },
    {
      title: 'Mobile App UI/UX Design',
      description: 'Design a modern and intuitive UI/UX for a fitness tracking mobile app. Need wireframes, mockups, and interactive prototype.',
      budget: 35000,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      skills: 'UI/UX Design, Figma, Mobile Design, Prototyping',
      ownerId: createdUsers[0].id, // John (client)
    },
    {
      title: 'Company Logo and Branding Package',
      description: 'Create a complete branding package including logo design, color palette, typography, and brand guidelines for a tech startup.',
      budget: 25000,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      skills: 'Graphic Design, Logo Design, Branding, Adobe Illustrator',
      ownerId: createdUsers[0].id, // John (client)
    }
  ];

  // Create projects
  const createdProjects = [];
  for (const projectData of projects) {
    const project = await prisma.project.create({
      data: projectData,
    });
    createdProjects.push(project);
    console.log(`✅ Created project: ${project.title} (LKR ${project.budget})`);
  }

  // Create sample applications (freelancers applying to projects)
  const applications = [
    {
      projectId: createdProjects[0].id, // E-commerce project
      freelancerId: createdUsers[1].id, // Alice (developer)
      coverMessage: 'I have extensive experience building e-commerce platforms with React and Node.js. I can deliver a fully functional website with secure payment integration within your timeline.',
      proposedBudget: 70000,
      status: 'APPROVED', // Pre-approved for testing
    },
    {
      projectId: createdProjects[1].id, // UI/UX project
      freelancerId: createdUsers[2].id, // Bob (designer/developer)
      coverMessage: 'I specialize in mobile app UI/UX design with a focus on user experience. I can create modern, intuitive designs that will make your fitness app stand out.',
      proposedBudget: 32000,
      status: 'APPROVED', // Pre-approved for testing
    },
    {
      projectId: createdProjects[2].id, // Branding project
      freelancerId: createdUsers[3].id, // Sarah (designer)
      coverMessage: 'I have 2+ years of experience in branding and logo design. I can create a unique brand identity that perfectly represents your tech startup.',
      proposedBudget: 23000,
      status: 'APPROVED', // Pre-approved for testing
    }
  ];

  // Create applications
  const createdApplications = [];
  for (const appData of applications) {
    const application = await prisma.application.create({
      data: appData,
    });
    createdApplications.push(application);
    console.log(`✅ Created application: ${application.id} (LKR ${application.proposedBudget})`);
  }

  // Create sample wallet transactions for users
  const walletTransactions = [
    // Alice's transactions
    {
      userId: createdUsers[1].id,
      type: 'DEPOSIT',
      amount: 20000,
      currency: 'LKR',
      description: 'Initial wallet deposit via PayHere',
      balanceBefore: 0,
      balanceAfter: 20000,
      payhereOrderId: 'WD_' + Date.now(),
    },
    {
      userId: createdUsers[1].id,
      type: 'DEPOSIT',
      amount: 5000,
      currency: 'LKR',
      description: 'Additional deposit - PayHere',
      balanceBefore: 20000,
      balanceAfter: 25000,
      payhereOrderId: 'WD_' + (Date.now() + 1000),
    },
    // Bob's transactions
    {
      userId: createdUsers[2].id,
      type: 'DEPOSIT',
      amount: 15000,
      currency: 'LKR',
      description: 'Wallet deposit via PayHere',
      balanceBefore: 0,
      balanceAfter: 15000,
      payhereOrderId: 'WD_' + (Date.now() + 2000),
    },
    // Sarah's transactions
    {
      userId: createdUsers[3].id,
      type: 'DEPOSIT',
      amount: 10000,
      currency: 'LKR',
      description: 'First wallet deposit',
      balanceBefore: 0,
      balanceAfter: 10000,
      payhereOrderId: 'WD_' + (Date.now() + 3000),
    }
  ];

  // Create wallet transactions
  for (const transactionData of walletTransactions) {
    const transaction = await prisma.walletTransaction.create({
      data: transactionData,
    });
    console.log(`✅ Created wallet transaction: ${transaction.type} LKR ${transaction.amount} for user ${transaction.userId}`);
  }

  console.log('\n🎉 Wallet system seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`• Created ${createdUsers.length} users with wallet balances`);
  console.log(`• Created ${createdProjects.length} sample projects`);
  console.log(`• Created ${createdApplications.length} approved applications`);
  console.log(`• Created ${walletTransactions.length} wallet transactions`);
  
  console.log('\n🔐 Test Login Credentials:');
  console.log('Client (John): john.client@example.com / password123');
  console.log('Freelancer (Alice): alice.freelancer@example.com / password123');
  console.log('Freelancer (Bob): bob.developer@example.com / password123');
  console.log('Freelancer (Sarah): sarah.designer@example.com / password123');
  
  console.log('\n💰 Wallet Balances:');
  console.log('John (Client): LKR 50,000');
  console.log('Alice (Freelancer): LKR 25,000');
  console.log('Bob (Freelancer): LKR 15,000');
  console.log('Sarah (Freelancer): LKR 10,000');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
