import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUpdateNotifications() {
  try {
    console.log('🔄 Testing update notification system...');

    // Get all applications with their current status
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

    console.log(`✅ Found ${applications.length} applications`);

    // Check for recent updates (last 24 hours)
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    applications.forEach((app, index) => {
      console.log(`\n📋 Application ${index + 1}:`);
      console.log(`  ID: ${app.id}`);
      console.log(`  Project: ${app.project.title}`);
      console.log(`  Freelancer: ${app.freelancer.name}`);
      console.log(`  Project Owner: ${app.project.owner.name}`);
      console.log(`  Status: ${app.status}`);
      console.log(`  Created: ${app.createdAt}`);
      console.log(`  Updated: ${app.updatedAt}`);
      
      const isRecentlyUpdated = new Date(app.updatedAt) > recentCutoff && 
                               new Date(app.updatedAt) > new Date(app.createdAt);
      
      const isRecentlyCreated = new Date(app.createdAt) > recentCutoff;
      
      if (isRecentlyUpdated) {
        console.log(`  🔔 RECENTLY UPDATED! (${app.freelancer.name} will see notification)`);
      }
      
      if (isRecentlyCreated) {
        console.log(`  📝 RECENTLY CREATED! (${app.project.owner.name} will see notification)`);
      }
    });

    // Test updating an application to trigger notifications
    if (applications.length > 0) {
      const pendingApp = applications.find(app => app.status === 'PENDING');
      
      if (pendingApp) {
        console.log(`\n🔄 Testing notification by updating application ${pendingApp.id}...`);
        
        // Toggle between APPROVED and PENDING for testing
        const newStatus = 'APPROVED';
        
        await prisma.application.update({
          where: { id: pendingApp.id },
          data: { status: newStatus },
        });
        
        console.log(`✅ Updated application status to ${newStatus}`);
        console.log(`📧 ${pendingApp.freelancer.name} should now see a notification in their dashboard`);
        
        // Create chat if approved
        if (newStatus === 'APPROVED') {
          const existingChat = await prisma.chat.findFirst({
            where: { applicationId: pendingApp.id },
          });
          
          if (!existingChat) {
            await prisma.chat.create({
              data: { applicationId: pendingApp.id },
            });
            console.log(`💬 Chat created for approved application`);
          }
        }
      } else {
        console.log('\n⚠️  No pending applications found to test with');
      }
    }

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdateNotifications();
