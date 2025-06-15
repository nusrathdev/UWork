import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConversationLoading() {
  try {
    console.log('Testing conversation loading...');

    // Get all users for testing
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });
    console.log('Users found:', users.length);

    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }

    const testUserId = users[0].id;
    console.log('Testing with user:', users[0].name);

    // Test 1: Check if there are any chats
    const totalChats = await prisma.chat.count();
    console.log('Total chats in database:', totalChats);

    // Test 2: Check if there are any applications
    const totalApplications = await prisma.application.count();
    console.log('Total applications in database:', totalApplications);

    // Test 3: Run the exact query from the loader
    const chats = await prisma.chat.findMany({
      where: {
        application: {
          OR: [
            { freelancerId: testUserId },
            { project: { ownerId: testUserId } }
          ]
        }
      },
      include: {
        application: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                ownerId: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            freelancer: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        messages: {
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    console.log('Chats found for user:', chats.length);

    if (chats.length > 0) {
      console.log('First chat details:', {
        id: chats[0].id,
        applicationId: chats[0].applicationId,
        projectTitle: chats[0].application.project.title,
        messages: chats[0].messages.length
      });
    }

    // Test 4: Check all applications for this user
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { freelancerId: testUserId },
          { project: { ownerId: testUserId } }
        ]
      },
      include: {
        project: {
          select: {
            title: true,
            ownerId: true
          }
        }
      }
    });

    console.log('Applications for user:', applications.length);
    applications.forEach((app, index) => {
      console.log(`Application ${index + 1}:`, {
        id: app.id,
        status: app.status,
        projectTitle: app.project.title,
        isOwner: app.project.ownerId === testUserId
      });
    });

  } catch (error) {
    console.error('Error testing conversation loading:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConversationLoading();
