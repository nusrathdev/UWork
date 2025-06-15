import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserNotifications, markNotificationAsRead, clearAllNotifications } from "~/utils/notifications.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const notifications = await getUserNotifications(userId);

  // Mark all unread notifications as read when user visits the page
  const unreadNotifications = notifications.filter((n: any) => !n.read);
  if (unreadNotifications.length > 0) {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });
  }

  // Fetch updated notifications after marking as read
  const updatedNotifications = await getUserNotifications(userId);

  return json({ notifications: updatedNotifications });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const notificationId = formData.get("notificationId");

  if (intent === "markAsRead" && typeof notificationId === "string") {
    await markNotificationAsRead(notificationId);
  }

  if (intent === "delete" && typeof notificationId === "string") {
    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: userId, // Ensure user can only delete their own notifications
      },
    });
  }

  if (intent === "clearAll") {
    await clearAllNotifications(userId);
  }

  return json({ success: true });
}

export default function Notifications() {
  const { notifications } = useLoaderData<typeof loader>();  // Helper function to get the link for a notification
  const getNotificationLink = (notification: any) => {
    let data = null;
    
    // Safely parse the data field
    try {
      if (notification.data) {
        if (typeof notification.data === 'string') {
          data = JSON.parse(notification.data);
        } else {
          data = notification.data;
        }
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      data = null;
    }    switch (notification.type) {
      case 'APPLICATION_APPROVED':
      case 'APPLICATION_REJECTED':
        return data?.applicationId ? `/messages?chat=${data.applicationId}` : null;
      case 'NEW_APPLICATION':
        return data?.projectId ? `/projects/${data.projectId}` : null;
      case 'NEW_MESSAGE':
        return data?.applicationId ? `/messages?chat=${data.applicationId}` : null;
      case 'PROJECT_UPDATE':
        return data?.projectId ? `/projects/${data.projectId}` : null;
      default:
        return null;
    }
  };  // Helper function to render message with clickable project links
  const renderMessageWithLinks = (notification: any) => {
    const message = notification.message;
    let data = null;
    
    try {
      if (notification.data) {
        if (typeof notification.data === 'string') {
          data = JSON.parse(notification.data);
        } else {
          data = notification.data;
        }
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      data = null;
    }    // Extract project name from message using regex
    const projectNameMatch = message.match(/[""]([^"""]+)[""]/) || message.match(/"([^"]+)"/);
    const projectName = projectNameMatch ? projectNameMatch[1] : null;
    
    if (projectName) {
      const beforeProject = message.substring(0, message.indexOf(projectNameMatch[0]));
      const afterProject = message.substring(message.indexOf(projectNameMatch[0]) + projectNameMatch[0].length);
      
      // Try to get project ID from multiple sources
      let projectLink = null;
      
      if (data?.projectId) {
        projectLink = `/projects/${data.projectId}`;
      } else if (data?.project?.id) {
        projectLink = `/projects/${data.project.id}`;
      } else if (data?.applicationId) {
        // If we have applicationId, try to search for the project by name instead
        projectLink = `/projects?search=${encodeURIComponent(projectName)}`;
      } else {
        // Last resort: search for the project by name
        projectLink = `/projects?search=${encodeURIComponent(projectName)}`;
      }
      
      return (
        <span>
          {beforeProject}
          <Link 
            to={projectLink} 
            className="text-green-600 hover:text-green-700 underline font-medium"
          >
            "{projectName}"
          </Link>
          {afterProject}
        </span>
      );
    }
    
    return message;
  };

  return (
    <div className="min-h-screen bg-gray-50">      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">Stay updated with your latest activity</p>
          </div>          {notifications.length > 0 && (
            <Form method="post">
              <input type="hidden" name="intent" value="clearAll" />
              <button
                type="submit"
                className="text-red-600 hover:text-red-700 underline text-sm transition-colors"
                onClick={(e) => {
                  if (!confirm("Are you sure you want to clear all notifications? This action cannot be undone.")) {
                    e.preventDefault();
                  }
                }}
              >
                Clear All
              </button>
            </Form>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500">When you have notifications, they'll appear here.</p>
            </div>
          ) : (            <div className="divide-y divide-gray-200">
              {notifications.map((notification: any) => {
                const notificationLink = getNotificationLink(notification);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-6 ${notification.read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">                        {notificationLink ? (
                          <div>
                            <Link to={notificationLink} className="group inline-block">
                              <div className="flex items-center">
                                <h3 className={`text-lg font-medium group-hover:text-green-600 ${
                                  notification.read ? 'text-gray-900' : 'text-blue-900'
                                }`}>
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                                <svg className="w-4 h-4 ml-2 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </Link>
                            <p className={`mt-2 ${
                              notification.read ? 'text-gray-600' : 'text-blue-800'
                            }`}>
                              {renderMessageWithLinks(notification)}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center">
                              <h3 className={`text-lg font-medium ${
                                notification.read ? 'text-gray-900' : 'text-blue-900'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>                            <p className={`mt-2 ${
                              notification.read ? 'text-gray-600' : 'text-blue-800'
                            }`}>
                              {renderMessageWithLinks(notification)}
                            </p>
                          </div>
                        )}                        <p className="text-sm text-gray-500 mt-3">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col space-y-2">
                        {/* Delete button (X) */}
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <button
                            type="submit"
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Delete notification"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this notification? This action cannot be undone.")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </Form>
                        {/* Mark as read button (if unread) */}
                        {!notification.read && (
                          <Form method="post">
                            <input type="hidden" name="intent" value="markAsRead" />
                            <input type="hidden" name="notificationId" value={notification.id} />
                            <button
                              type="submit"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Mark as read
                            </button>
                          </Form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
