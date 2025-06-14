// Add notification utilities for real-time updates
import { prisma } from "~/utils/db.server";

export interface Notification {
  id: string;
  userId: string;
  type: "APPLICATION_APPROVED" | "APPLICATION_REJECTED" | "NEW_MESSAGE" | "PROJECT_UPDATE";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any; // Additional data like applicationId, projectId, etc.
}

export async function createNotification(notification: {
  userId: string;
  type: Notification["type"];
  title: string;
  message: string;
  data?: any;
}) {
  try {
    const newNotification = await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
      },
    });
    
    console.log("📫 Notification created:", newNotification);
    return { success: true, notification: newNotification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
}

export async function getUserNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to last 20 notifications
    });
    
    return notifications.map(n => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null,
    }));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error };
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: { 
        userId,
        read: false 
      },
    });
    return count;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return 0;
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error };
  }
}

export async function clearAllNotifications(userId: string) {
  try {
    await prisma.notification.deleteMany({
      where: { userId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    return { success: false, error };
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId,
        read: false 
      },
      data: { read: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error };
  }
}
