import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApprovalWorkflow() {
  try {
    console.log('🔄 Testing application approval workflow...');

    // Get all applications
    const applications = await prisma.application.findMany({
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

    console.log(`✅ Found ${applications.length} applications`);

    for (const app of applications) {
      console.log(`\n📋 Application ${app.id}:`);
      console.log(`  📝 Project: ${app.project.title}`);
      console.log(`  👤 Freelancer: ${app.freelancer.name}`);
      console.log(`  👤 Owner: ${app.project.owner.name}`);
      console.log(`  📊 Status: ${app.status}`);
      console.log(`  💰 Budget: $${app.proposedBudget}`);
      console.log(`  💬 Chat: ${app.chat ? 'Yes' : 'No'}`);

      // If it's a pending application, we could approve it for testing
      if (app.status === 'PENDING') {
        console.log(`  ⏳ This application is pending approval`);
        
        // Uncomment the following lines to auto-approve for testing
        /*
        console.log(`  🔄 Approving application...`);
        await prisma.application.update({
          where: { id: app.id },
          data: { status: 'APPROVED' },
        });
        
        // Create chat
        await prisma.chat.create({
          data: {
            applicationId: app.id,
          },
        });
        
        console.log(`  ✅ Application approved and chat created`);
        */
      }
    }

    // Check for chats
    const chats = await prisma.chat.findMany({
      include: {
        application: {
          include: {
            project: true,
            freelancer: true,
          },
        },
        messages: {
          include: {
            sender: true,
          },
        },
      },
    });

    console.log(`\n💬 Found ${chats.length} chats:`);
    for (const chat of chats) {
      console.log(`  Chat ${chat.id}:`);
      console.log(`    📝 Project: ${chat.application.project.title}`);
      console.log(`    👤 Freelancer: ${chat.application.freelancer.name}`);
      console.log(`    💬 Messages: ${chat.messages.length}`);
    }

  } catch (error) {
    console.error('❌ Error testing approval workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalWorkflow();
