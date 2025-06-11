import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected! User count: ${userCount}`);
    
    // Test if we can create a basic query
    const users = await prisma.user.findMany({
      take: 1,
      select: { id: true, name: true, email: true }
    });
    console.log('✅ Sample user query works:', users);
    
    // Test projects
    const projectCount = await prisma.project.count();
    console.log(`✅ Project count: ${projectCount}`);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
