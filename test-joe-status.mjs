import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApplicationStatus() {
  try {
    console.log('🔄 Testing application status for Joe...');

    // Find Joe's application
    const joeApplication = await prisma.application.findFirst({
      include: {
        project: {
          include: {
            owner: true,
          },
        },
        freelancer: true,
        chat: true,
      },
    });

    if (!joeApplication) {
      console.log('❌ No application found');
      return;
    }

    console.log('✅ Found Joe\'s application:');
    console.log(`  📝 Project: ${joeApplication.project.title}`);
    console.log(`  👤 Freelancer: ${joeApplication.freelancer.name}`);
    console.log(`  👤 Project Owner: ${joeApplication.project.owner.name}`);
    console.log(`  📊 Status: ${joeApplication.status}`);
    console.log(`  💰 Budget: $${joeApplication.proposedBudget}`);
    console.log(`  📅 Applied: ${joeApplication.createdAt}`);
    console.log(`  📅 Updated: ${joeApplication.updatedAt}`);
    console.log(`  💬 Has Chat: ${joeApplication.chat ? 'Yes' : 'No'}`);

    if (joeApplication.status === 'APPROVED' && !joeApplication.chat) {
      console.log('🔧 Application is approved but no chat exists. Creating chat...');
      const newChat = await prisma.chat.create({
        data: {
          applicationId: joeApplication.id,
        },
      });
      console.log(`✅ Chat created: ${newChat.id}`);
    }

    if (joeApplication.status === 'APPROVED') {
      console.log('🎉 Joe should see a chat button and green success message!');
    } else if (joeApplication.status === 'REJECTED') {
      console.log('❌ Joe should see a red rejection message');
    } else {
      console.log('⏳ Joe should see a yellow pending message');
    }

  } catch (error) {
    console.error('❌ Error testing application status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApplicationStatus();
