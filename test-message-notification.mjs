import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMessageNotification() {
  try {
    // Find an existing user to test with
    const users = await prisma.user.findMany({
      take: 2,
      select: { id: true, name: true, email: true }
    });

    if (users.length < 2) {
      console.log('Need at least 2 users for testing. Current users:', users.length);
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log('Testing with users:', user1.name, 'and', user2.name);

    // Create a test notification for user1 (simulating a new message)
    const notification = await prisma.notification.create({
      data: {
        userId: user1.id,
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${user2.name} sent you a message about "Test Project".`,
        data: JSON.stringify({
          applicationId: "test-app-id",
          projectId: "test-project-id",
          chatId: "test-chat-id",
          projectTitle: "Test Project",
          senderName: user2.name
        }),
        read: false
      }
    });

    console.log('Created test notification:', notification);

    // Check unread count for user1
    const unreadCount = await prisma.notification.count({
      where: { 
        userId: user1.id,
        read: false 
      }
    });

    console.log('Unread notifications for', user1.name + ':', unreadCount);

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: { userId: user1.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Recent notifications:');
    recentNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.title}: ${notif.message}`);
    });

  } catch (error) {
    console.error('Error testing message notification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMessageNotification();
