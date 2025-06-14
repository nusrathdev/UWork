import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Form, useActionData, useNavigation, useParams } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { createNotification } from "~/utils/notifications.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const applicationId = params.applicationId;
  if (!applicationId) {
    throw new Response("Application ID is required", { status: 400 });
  }

  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return redirect("/auth/login");
    }

    // Get application with chat and messages
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        freelancer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chat: {
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
            },
          },
        },
      },
    });

    if (!application) {
      throw new Response("Application not found", { status: 404 });
    }

    // Check if user is authorized (project owner or freelancer)
    const isAuthorized = 
      application.project.owner.id === userId || 
      application.freelancer.id === userId;

    if (!isAuthorized) {
      throw new Response("Not authorized to access this chat", { status: 403 });
    }

    // Check if application is approved
    if (application.status !== "APPROVED") {
      throw new Response("Chat is only available for approved applications", { status: 403 });
    }

    // Create chat if it doesn't exist
    if (!application.chat) {
      await prisma.chat.create({
        data: {
          applicationId: applicationId,
        },
      });
      
      // Refetch with chat
      const updatedApplication = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          project: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          freelancer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chat: {
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
              },
            },
          },
        },
      });
      
      return json({ application: updatedApplication, user });
    }

    return json({ application, user });
  } catch (error) {
    console.error("Chat loader error:", error);
    throw error;
  }
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const applicationId = params.applicationId;
  if (!applicationId) {
    return json({ error: "Application ID is required" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send") {
    const content = formData.get("content")?.toString();

    if (!content || !content.trim()) {
      return json({ error: "Message content is required" }, { status: 400 });
    }

    try {      // Verify user has access to this chat
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          project: {
            include: {
              owner: {
                select: { id: true, name: true }
              }
            }
          },
          freelancer: {
            select: { id: true, name: true }
          },
          chat: true,
        },
      });

      if (!application) {
        return json({ error: "Application not found" }, { status: 404 });
      }      // Check authorization
      const isAuthorized = 
        application.project.owner.id === userId || 
        application.freelancer.id === userId;

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
      }      // Create the message
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          content: content.trim(),
        },
      });

      // Create notification for the other user
      const isOwner = application.project.owner.id === userId;
      const recipientId = isOwner ? application.freelancer.id : application.project.owner.id;
      const senderName = isOwner ? application.project.owner.name : application.freelancer.name;
      const recipientName = isOwner ? application.freelancer.name : application.project.owner.name;
        await createNotification({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${senderName} sent you a message about "${application.project.title}".`,
        data: {
          applicationId,
          projectId: application.project.id,
          chatId: chat.id,
          projectTitle: application.project.title,
          senderName
        }
      });

      return json({ success: true });
    } catch (error) {
      console.error("Error sending message:", error);
      return json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function ChatPage() {
  const { application, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formData?.get("intent") === "send";
  // Early return if no application
  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
            <p className="text-gray-600 mb-6">The requested chat application could not be found.</p>
            <Link
              to="/projects"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine if current user is the project owner
  const isProjectOwner = user.id === application.project.owner.id;
  const otherUser = isProjectOwner ? application.freelancer : application.project.owner;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [application.chat?.messages]);  const handleSubmit = (e: React.FormEvent) => {
    // Don't prevent default - let Remix handle the form submission
    if (!newMessage.trim() || isSubmitting) {
      e.preventDefault();
      return;
    }
  };

  useEffect(() => {
    // Clear message after successful submission
    if (actionData && "success" in actionData && actionData.success) {
      setNewMessage("");
    }
  }, [actionData]);

  return (    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{/* Chat Header */}
        <div className="bg-white rounded-t-lg border border-gray-200 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {otherUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {otherUser.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {application.project.title}
                </p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Active on project</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                application.status === 'APPROVED' 
                  ? 'bg-green-100 text-green-800' 
                  : application.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {application.status}
              </span>
              <Link
                to={`/projects/${application.project.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Project
              </Link>
              <Link
                to="/messages"
                className="text-gray-600 hover:text-gray-700 text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Back to Messages
              </Link>
            </div>
          </div>
        </div>{/* Chat Messages */}
        <div className="bg-white border-l border-r border-gray-200 px-6 py-4 h-[500px] overflow-y-auto">
          {application.chat?.messages && application.chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start your conversation</h3>
                <p className="text-sm text-gray-500">Send a message to {otherUser.name} about "{application.project.title}"</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {application.chat?.messages?.map((message, index) => {
                const isOwn = message.senderId === user.id;
                const showAvatar = index === 0 || application.chat?.messages[index - 1]?.senderId !== message.senderId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                      showAvatar ? 'mt-4' : 'mt-1'
                    }`}
                  >
                    <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
                      {showAvatar && (
                        <div className={`flex-shrink-0 ${isOwn ? 'ml-2' : 'mr-2'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            isOwn ? 'bg-blue-500' : 'bg-green-500'
                          }`}>
                            {message.sender.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className={`${showAvatar ? '' : isOwn ? 'mr-10' : 'ml-10'}`}>
                        {showAvatar && (
                          <div className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {message.sender.name}
                          </div>
                        )}
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                        <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {actionData && "error" in actionData && (
          <div className="bg-red-50 border-l border-r border-red-200 px-6 py-3">
            <p className="text-red-800 text-sm">{actionData.error}</p>
          </div>
        )}        {/* Message Input */}
        <div className="bg-white rounded-b-lg border border-gray-200 px-6 py-4">
          <Form method="post" onSubmit={handleSubmit} className="flex items-end space-x-3">
            <input type="hidden" name="intent" value="send" />
            <div className="flex-1">
              <textarea
                name="content"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim() && !isSubmitting) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
                placeholder={`Message ${otherUser.name}...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
                maxLength={1000}
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
                required
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <span className="text-xs text-gray-400">
                  {newMessage.length}/1000
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Sending...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Send</span>
                </div>
              )}
            </button>
          </Form>
        </div>

        {/* Back Link */}
        <div className="mt-6">
          <Link
            to={`/projects/${application.project.id}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Project
          </Link>
        </div>
      </div>
    </div>
  );
}
