import { prisma } from "~/utils/db.server";

export async function createChatForApplication(applicationId: string) {
  return await prisma.chat.create({
    data: {
      applicationId,
    },
    include: {
      application: {
        include: {
          project: true,
          freelancer: true,
        },
      },
    },
  });
}

export async function getChatByApplicationId(applicationId: string) {
  return await prisma.chat.findUnique({
    where: { applicationId },
    include: {
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },      application: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
              ownerId: true,
            },
          },
          freelancer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function sendMessage(chatId: string, senderId: string, content: string) {
  return await prisma.message.create({
    data: {
      chatId,
      senderId,
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function markMessagesAsRead(chatId: string, userId: string) {
  return await prisma.message.updateMany({
    where: {
      chatId,
      senderId: { not: userId },
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function getUnreadMessageCount(chatId: string, userId: string) {
  return await prisma.message.count({
    where: {
      chatId,
      senderId: { not: userId },
      readAt: null,
    },
  });
}

export async function getUserChats(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      OR: [
        { application: { freelancerId: userId } },
        { application: { project: { ownerId: userId } } },
      ],
      application: { status: "APPROVED" },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      application: {
        include: {
          project: {            select: {
              id: true,
              title: true,
              ownerId: true,
            },
          },
          freelancer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  return chats.map((chat: any) => {
    const isClient = chat.application.project.ownerId === userId;
    const otherUser = isClient ? chat.application.freelancer : {
      id: chat.application.project.ownerId,
      name: "Client" // You might want to fetch the actual client name
    };

    return {
      id: chat.id,
      applicationId: chat.applicationId,
      projectTitle: chat.application.project.title,
      otherUserName: otherUser.name,
      lastMessage: chat.messages[0]?.content || "",
      lastMessageTime: chat.messages[0]?.createdAt || chat.createdAt,
      unreadCount: 0, // Will be calculated separately if needed
    };
  });
}