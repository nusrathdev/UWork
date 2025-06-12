import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChat() {
  try {
    console.log('🔄 Testing chat functionality...');

    // Get the first application
    const application = await prisma.application.findFirst({
      include: {
        project: {
          include: {
            owner: true,
          },
        },
        freelancer: true,
        chat: {
          include: {
            messages: {
              include: {
                sender: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      console.log('❌ No applications found');
      return;
    }

    console.log('✅ Found application:', application.id);
    console.log('📝 Project:', application.project.title);
    console.log('👤 Freelancer:', application.freelancer.name);
    console.log('👤 Project Owner:', application.project.owner.name);
    console.log('📊 Status:', application.status);

    if (application.chat) {
      console.log('💬 Chat exists with', application.chat.messages.length, 'messages');
      application.chat.messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.sender.name}: ${msg.content}`);
      });
    } else {
      console.log('💬 No chat found for this application');
    }

    // Test creating a chat if approved
    if (application.status === 'APPROVED' && !application.chat) {
      console.log('🔄 Creating chat for approved application...');
      const newChat = await prisma.chat.create({
        data: {
          applicationId: application.id,
        },
      });
      console.log('✅ Chat created:', newChat.id);
    }

  } catch (error) {
    console.error('❌ Error testing chat:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChat();
