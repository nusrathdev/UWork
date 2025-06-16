// Quick Database Check
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database tables...\n');

    // Check if tables exist and get counts
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const applicationCount = await prisma.application.count();
    const paymentCount = await prisma.payment.count();

    console.log('📊 Database Status:');
    console.log(`   • Users: ${userCount}`);
    console.log(`   • Projects: ${projectCount}`);
    console.log(`   • Applications: ${applicationCount}`);
    console.log(`   • Payments: ${paymentCount}`);

    if (applicationCount > 0) {
      const applications = await prisma.application.findMany({
        take: 3,
        include: {
          project: { select: { title: true } },
          freelancer: { select: { name: true } }
        }
      });

      console.log('\n📋 Sample Applications (for testing payments):');
      applications.forEach(app => {
        console.log(`   • ID: ${app.id}`);
        console.log(`     Project: ${app.project.title}`);
        console.log(`     Freelancer: ${app.freelancer.name}`);
        console.log(`     Status: ${app.status}`);
        console.log(`     Test URL: http://localhost:5173/payment/${app.id}\n`);
      });
    } else {
      console.log('\n⚠️  No applications found. You need to:');
      console.log('   1. Create a project');
      console.log('   2. Apply for the project');
      console.log('   3. Then test payments');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
