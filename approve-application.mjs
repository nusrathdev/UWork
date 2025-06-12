import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function approveFirstApplication() {
  try {
    console.log('🔄 Finding first pending application...');

    // Get the first pending application
    const application = await prisma.application.findFirst({
      where: {
        status: 'PENDING'
      },
      include: {
        project: {
          include: {
            owner: true,
          },
        },
        freelancer: true,
      },
    });

    if (!application) {
      console.log('❌ No pending applications found');
      return;
    }

    console.log('✅ Found pending application:', application.id);
    console.log('📝 Project:', application.project.title);
    console.log('👤 Freelancer:', application.freelancer.name);
    console.log('👤 Project Owner:', application.project.owner.name);

    // Approve the application
    console.log('🔄 Approving application...');
    await prisma.application.update({
      where: { id: application.id },
      data: { status: 'APPROVED' },
    });

    // Create chat
    console.log('🔄 Creating chat...');
    const chat = await prisma.chat.create({
      data: {
        applicationId: application.id,
      },
    });

    console.log('✅ Application approved and chat created!');
    console.log('💬 Chat ID:', chat.id);
    console.log('🔗 Chat URL: http://localhost:5173/chat/' + application.id);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveFirstApplication();
