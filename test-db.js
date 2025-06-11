import { prisma } from './app/utils/db.server.js';

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test if we can connect to the database
    const userCount = await prisma.user.count();
    console.log(`Users in database: ${userCount}`);
    
    const projectCount = await prisma.project.count();
    console.log(`Projects in database: ${projectCount}`);
    
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
