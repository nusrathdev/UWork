import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useParams, useFetcher, Form } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { getUserChats } from "~/utils/chat.server";
import { createNotification } from "~/utils/notifications.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send") {
    const applicationId = formData.get("applicationId");
    const content = formData.get("content");

    if (typeof applicationId !== "string" || typeof content !== "string" || !content.trim()) {
      return json({ error: "Invalid data" }, { status: 400 });
    }

    try {
      // Get or create chat
      let chat = await prisma.chat.findUnique({
        where: { applicationId },
        include: {
          application: {
            include: {
              project: {
                include: { owner: true }
              },
              freelancer: true
            }
          }
        }
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: { applicationId },
          include: {
            application: {
              include: {
                project: { include: { owner: true } },
                freelancer: true
              }
            }
          }
        });
      }

      // Create message
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          content: content.trim(),
        },
      });

      // Create notification for the other user
      const isOwner = chat.application.project.owner.id === userId;
      const recipientId = isOwner ? chat.application.freelancer.id : chat.application.project.owner.id;
      const senderName = isOwner ? chat.application.project.owner.name : chat.application.freelancer.name;

      await createNotification({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${senderName} sent you a message about "${chat.application.project.title}".`,
        data: {
          applicationId,
          projectId: chat.application.project.id,
          chatId: chat.id,
          projectTitle: chat.application.project.title,
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

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getUserSession(request);
    const userId = session.get("userId");

    if (!userId || typeof userId !== "string") {
      return redirect("/auth/login");
    }

    const url = new URL(request.url);
    const selectedApplicationId = url.searchParams.get("chat");

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

    // Get all chats with detailed information
    const chats = await prisma.chat.findMany({
      where: {
        application: {
          OR: [
            { freelancerId: userId },
            { project: { ownerId: userId } }
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

    // Format chats for the UI
    const formattedChats = chats.map(chat => {
      const isOwner = chat.application.project.ownerId === userId;
      const otherUser = isOwner ? chat.application.freelancer : chat.application.project.owner;

      const lastMessage = chat.messages[0];
      const unreadCount = 0; // TODO: Implement unread message counting

      return {
        id: chat.id,
        applicationId: chat.applicationId,
        projectTitle: chat.application.project.title,
        projectId: chat.application.project.id,
        otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderName: lastMessage.sender.name,
          createdAt: lastMessage.createdAt,
          isFromMe: lastMessage.senderId === userId,
        } : null,
        unreadCount,
        updatedAt: lastMessage?.createdAt || new Date(),
        status: chat.application.status,
      };
    });    // Load messages for selected chat if specified
    let selectedChatMessages: any[] = [];
    if (selectedApplicationId) {
      const selectedChat = await prisma.chat.findUnique({
        where: { applicationId: selectedApplicationId },
        include: {
          messages: {
            include: {
              sender: {
                select: { id: true, name: true }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        }
      });

      if (selectedChat) {
        selectedChatMessages = selectedChat.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.sender.name,
          createdAt: msg.createdAt,
          isFromCurrentUser: msg.senderId === userId
        }));
      }
    }

    return json({ 
      user, 
      chats: formattedChats, 
      selectedApplicationId,
      selectedChatMessages
    });
  } catch (error) {
    console.error("Messages loader error:", error);
    throw error;
  }
}

export default function MessagesPage() {
  const { user, chats, selectedApplicationId, selectedChatMessages } = useLoaderData<typeof loader>();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(selectedApplicationId);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();

  const selectedChat = chats.find(chat => chat.applicationId === selectedChatId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatMessages]);

  // Handle chat selection
  const handleChatSelect = (applicationId: string) => {
    setSelectedChatId(applicationId);
    // Update URL to reflect selected chat
    const url = new URL(window.location.href);
    url.searchParams.set('chat', applicationId);
    window.history.replaceState({}, '', url.toString());
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId) return;

    const formData = new FormData();
    formData.append('intent', 'send');
    formData.append('applicationId', selectedChatId);
    formData.append('content', newMessage);

    fetcher.submit(formData, { method: 'post' });
    setNewMessage('');
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-180px)] flex overflow-hidden">
          
          {/* Chat List Sidebar */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                  <p className="text-sm text-gray-500 mt-1">{chats.length} active conversations</p>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-blue-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Connect with clients and freelancers by applying to projects or posting your own.
                  </p>
                  <div className="space-y-3">
                    <Link
                      to="/projects"
                      className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      Browse Projects
                    </Link>
                    <Link
                      to="/projects/new"
                      className="block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                    >
                      Post a Project
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.applicationId)}
                      className={`p-4 cursor-pointer hover:bg-white transition-colors border-l-4 ${
                        selectedChatId === chat.applicationId 
                          ? 'bg-white border-blue-500 shadow-sm' 
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {chat.otherUser.name.charAt(0).toUpperCase()}
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="absolute -mt-2 -ml-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {chat.otherUser.name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                chat.status === 'APPROVED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : chat.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {chat.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 font-medium mt-1 truncate">
                            {chat.projectTitle}
                          </p>
                          {chat.lastMessage && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 truncate">
                                {chat.lastMessage.isFromMe ? (
                                  <span className="text-gray-500">You: </span>
                                ) : null}
                                {chat.lastMessage.content}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {(() => {
                                  const now = new Date();
                                  const messageDate = new Date(chat.lastMessage.createdAt);
                                  const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  if (diffInDays === 0) {
                                    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  } else if (diffInDays === 1) {
                                    return 'Yesterday';
                                  } else if (diffInDays < 7) {
                                    return messageDate.toLocaleDateString([], { weekday: 'short' });
                                  } else {
                                    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                  }
                                })()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Content Area */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {selectedChat.otherUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedChat.otherUser.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {selectedChat.projectTitle}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="text-xs text-gray-500">Project collaboration</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedChat.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedChat.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedChat.status}
                      </span>
                      <Link
                        to={`/projects/${selectedChat.projectId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Project
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedChatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
                        <p className="text-gray-600 text-sm">
                          Send a message to {selectedChat.otherUser.name} about "{selectedChat.projectTitle}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedChatMessages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isFromCurrentUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.isFromCurrentUser ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <form onSubmit={handleSendMessage} className="flex space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedChat.otherUser.name}...`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isSubmitting}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                    >
                      {isSubmitting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center max-w-md">
                  <div className="bg-white rounded-full p-6 w-20 h-20 mx-auto mb-6 shadow-lg flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a conversation</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Choose a conversation from the sidebar to start chatting with your clients or freelancers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
