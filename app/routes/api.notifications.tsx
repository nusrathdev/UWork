import { json, type ActionFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { deleteNotification, clearAllNotifications, getUserNotifications, getUnreadNotificationCount } from "~/utils/notifications.server";
import { getUserId, getUserSession } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return json({ recentNotifications: [], unreadCount: 0 });
  }

  try {
    const recentNotifications = (await getUserNotifications(userId)).slice(0, 5);
    const unreadCount = await getUnreadNotificationCount(userId);

    return json({ 
      recentNotifications, 
      unreadCount 
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return json({ recentNotifications: [], unreadCount: 0 });
  }
}

export const action: ActionFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const notificationId = formData.get("notificationId");

  if (action === "delete" && notificationId) {
    const result = await deleteNotification(notificationId.toString());
    return json(result);
  }

  if (action === "clearAll") {
    const result = await clearAllNotifications(userId);
    return json(result);
  }

  return json({ error: "Invalid action" }, { status: 400 });
};
