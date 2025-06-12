import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateApprovalWorkflow() {
  try {
    console.log('🎭 Simulating application approval workflow...\n');

    // Step 1: Get all applications
    const applications = await prisma.application.findMany({
      include: {
        project: {
          include: { owner: true },
        },
        freelancer: true,
      },
    });

    console.log(`📋 Found ${applications.length} applications\n`);

    for (const app of applications) {
      console.log(`📝 Application ${app.id}:`);
      console.log(`   Project: "${app.project.title}"`);
      console.log(`   Freelancer: ${app.freelancer.name} (${app.freelancer.email})`);
      console.log(`   Project Owner: ${app.project.owner.name} (${app.project.owner.email})`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Created: ${app.createdAt}`);
      console.log(`   Updated: ${app.updatedAt}`);
      
      // Check if this application was recently updated
      const timeDiff = new Date(app.updatedAt).getTime() - new Date(app.createdAt).getTime();
      if (timeDiff > 1000) {
        console.log(`   ⏰ Status was changed ${Math.round(timeDiff/1000)} seconds after creation`);
      }
      
      console.log('');
    }

    // Step 2: Find a pending application to approve
    const pendingApps = applications.filter(app => app.status === 'PENDING');
    
    if (pendingApps.length > 0) {
      const appToApprove = pendingApps[0];
      console.log(`🎯 Testing approval for application ${appToApprove.id}...`);
      
      // Simulate project owner approving the application
      const updated = await prisma.application.update({
        where: { id: appToApprove.id },
        data: { status: 'APPROVED' },
      });
      
      console.log(`✅ Application ${appToApprove.id} has been APPROVED!`);
      console.log(`   Updated at: ${updated.updatedAt}`);
      
      // Create chat for approved application
      const existingChat = await prisma.chat.findFirst({
        where: { applicationId: appToApprove.id },
      });
      
      if (!existingChat) {
        const chat = await prisma.chat.create({
          data: { applicationId: appToApprove.id },
        });
        console.log(`💬 Chat created: ${chat.id}`);
      }
      
      console.log(`\n🔔 NOTIFICATION for ${appToApprove.freelancer.name}:`);
      console.log(`   Your application for "${appToApprove.project.title}" was APPROVED!`);
      console.log(`   You can now start chatting with ${appToApprove.project.owner.name}`);
      console.log(`   Chat URL: /chat/${appToApprove.id}`);
      
    } else {
      console.log('⚠️  No pending applications found to approve');
      
      // Create a test scenario by setting one application back to pending
      const approvedApps = applications.filter(app => app.status === 'APPROVED');
      if (approvedApps.length > 0) {
        console.log('\n🔄 Creating test scenario...');
        await prisma.application.update({
          where: { id: approvedApps[0].id },
          data: { status: 'PENDING' },
        });
        console.log(`   Reset application ${approvedApps[0].id} to PENDING`);
        console.log(`   Run this script again to test approval!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateApprovalWorkflow();
