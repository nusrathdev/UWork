import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send") {
    const applicationId = formData.get("applicationId")?.toString();
    const content = formData.get("content")?.toString();

    if (!applicationId || !content) {
      return json({ error: "Application ID and content are required" }, { status: 400 });
    }

    try {
      // Verify user has access to this chat
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          project: true,
          chat: true,
        },
      });

      if (!application) {
        return json({ error: "Application not found" }, { status: 404 });
      }

      // Check if user is either the project owner or the freelancer
      const isAuthorized = 
        application.project.ownerId === userId || 
        application.freelancerId === userId;

      if (!isAuthorized) {
        return json({ error: "Not authorized to send messages in this chat" }, { status: 403 });
      }

      // Ensure chat exists
      let chat = application.chat;
      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            applicationId: applicationId,
          },
        });
      }

      // Create the message
      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          content: content.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return json({ success: true, message });
    } catch (error) {
      console.error("Error sending message:", error);
      return json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  if (intent === "load") {
    const applicationId = formData.get("applicationId")?.toString();

    if (!applicationId) {
      return json({ error: "Application ID is required" }, { status: 400 });
    }

    try {
      // Verify user has access to this chat
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          project: true,
          chat: {
            include: {
              messages: {
                include: {
                  sender: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (!application) {
        return json({ error: "Application not found" }, { status: 404 });
      }

      // Check if user is either the project owner or the freelancer
      const isAuthorized = 
        application.project.ownerId === userId || 
        application.freelancerId === userId;

      if (!isAuthorized) {
        return json({ error: "Not authorized to access this chat" }, { status: 403 });
      }

      return json({ 
        success: true, 
        messages: application.chat?.messages || [] 
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      return json({ error: "Failed to load messages" }, { status: 500 });
    }
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}
