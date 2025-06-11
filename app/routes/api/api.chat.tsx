import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { 
  getChatByApplicationId, 
  sendMessage, 
  createChatForApplication,
  markMessagesAsRead 
} from "~/utils/chat.server";
import { getSession } from "~/utils/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "sendMessage") {
    const applicationId = formData.get("applicationId") as string;
    const content = formData.get("content") as string;

    if (!applicationId || !content) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }    try {
      // Get or create chat
      let chat = await getChatByApplicationId(applicationId);
      
      if (!chat) {
        await createChatForApplication(applicationId);
        chat = await getChatByApplicationId(applicationId);
      }

      if (!chat) {
        return json({ error: "Failed to create chat" }, { status: 500 });
      }

      // Send message
      const message = await sendMessage(chat.id, userId, content);
      
      return json({ success: true, message });
    } catch (error) {
      console.error("Error sending message:", error);
      return json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  if (action === "markAsRead") {
    const chatId = formData.get("chatId") as string;
    
    if (!chatId) {
      return json({ error: "Missing chat ID" }, { status: 400 });
    }

    try {
      await markMessagesAsRead(chatId, userId);
      return json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return json({ error: "Failed to mark messages as read" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}