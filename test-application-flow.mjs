import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApplicationFlow() {
  try {
    console.log('🔄 Testing application approval flow...');

    // Find applications and their current status
    const applications = await prisma.application.findMany({
      include: {
        project: {
          include: {
            owner: true,
          },
        },
        freelancer: true,
      },
    });

    console.log(`📋 Found ${applications.length} applications:`);
    
    for (const app of applications) {
      console.log(`\n📝 Application ID: ${app.id}`);
      console.log(`   Project: ${app.project.title}`);
      console.log(`   Freelancer: ${app.freelancer.name}`);
      console.log(`   Project Owner: ${app.project.owner.name}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Created: ${app.createdAt}`);
      console.log(`   Updated: ${app.updatedAt}`);
      
      // Check if status was recently changed
      const timeDiff = new Date(app.updatedAt).getTime() - new Date(app.createdAt).getTime();
      if (timeDiff > 1000) { // More than 1 second difference
        console.log(`   ⚠️  Status was changed after creation`);
      }
    }

    // Test updating an application status
    const pendingApp = applications.find(app => app.status === 'PENDING');
    if (pendingApp) {
      console.log(`\n🔄 Testing status update for application ${pendingApp.id}...`);
      
      const updated = await prisma.application.update({
        where: { id: pendingApp.id },
        data: { status: 'APPROVED' },
      });
      
      console.log(`✅ Application ${pendingApp.id} approved successfully`);
      console.log(`   New status: ${updated.status}`);
      console.log(`   Updated at: ${updated.updatedAt}`);
      
      // Create chat if approved
      const existingChat = await prisma.chat.findFirst({
        where: { applicationId: pendingApp.id },
      });
      
      if (!existingChat) {
        const chat = await prisma.chat.create({
          data: {
            applicationId: pendingApp.id,
          },
        });
        console.log(`💬 Chat created: ${chat.id}`);
      } else {
        console.log(`💬 Chat already exists: ${existingChat.id}`);
      }
    } else {
      console.log('\n⚠️  No pending applications found to test');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApplicationFlow();
