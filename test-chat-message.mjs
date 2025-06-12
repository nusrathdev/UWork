import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChatMessage() {
  try {
    console.log('🔄 Testing chat message functionality...');

    // Find an approved application with a chat
    const application = await prisma.application.findFirst({
      where: {
        status: 'APPROVED',
        chat: {
          isNot: null,
        },
      },
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
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!application) {
      console.log('❌ No approved applications with chat found');
      return;
    }

    console.log('✅ Found approved application with chat:');
    console.log(`  📝 Project: ${application.project.title}`);
    console.log(`  👤 Owner: ${application.project.owner.name}`);
    console.log(`  👤 Freelancer: ${application.freelancer.name}`);
    console.log(`  💬 Chat ID: ${application.chat.id}`);
    console.log(`  📨 Messages: ${application.chat.messages.length}`);

    if (application.chat.messages.length > 0) {
      console.log('\n📨 Recent Messages:');
      application.chat.messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.sender.name}: ${msg.content}`);
        console.log(`     📅 ${new Date(msg.createdAt).toLocaleString()}`);
      });
    }

    // Test sending a message as the project owner
    console.log('\n🔄 Testing message sending as project owner...');
    const testMessage = await prisma.message.create({
      data: {
        content: `Test message from ${application.project.owner.name} at ${new Date().toLocaleString()}`,
        senderId: application.project.owner.id,
        chatId: application.chat.id,
      },
      include: {
        sender: true,
      },
    });

    console.log('✅ Message created successfully:');
    console.log(`  📨 Content: ${testMessage.content}`);
    console.log(`  👤 Sender: ${testMessage.sender.name}`);
    console.log(`  📅 Time: ${new Date(testMessage.createdAt).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error testing chat message:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChatMessage();
