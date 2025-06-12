import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { getUserChats } from "~/utils/chat.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getUserSession(request);
    const userId = session.get("userId");

    if (!userId || typeof userId !== "string") {
      return redirect("/auth/login");
    }

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
    }    // Get all chats with detailed information
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
    });

    return json({ user, chats: formattedChats });
  } catch (error) {
    console.error("Messages loader error:", error);
    throw error;
  }
}

export default function MessagesPage() {
  const { user, chats } = useLoaderData<typeof loader>();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const selectedChat = chats.find(chat => chat.applicationId === selectedChatId);
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
                      onClick={() => setSelectedChatId(chat.applicationId)}
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
          </div>          {/* Chat Content Area */}
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

                {/* Chat Preview */}
                <div className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="bg-white rounded-full p-6 w-20 h-20 mx-auto mb-6 shadow-lg flex items-center justify-center">
                      <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Chat with {selectedChat.otherUser.name}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Continue your conversation about "{selectedChat.projectTitle}" in the full chat interface.
                    </p>
                    <div className="space-y-3">
                      <Link
                        to={`/chat/${selectedChat.applicationId}`}
                        className="inline-flex items-center bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Open Chat
                      </Link>
                      {selectedChat.lastMessage && (
                        <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500 mb-2">Last message:</p>
                          <p className="text-gray-700 italic">
                            "{selectedChat.lastMessage.content}"
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {selectedChat.lastMessage.isFromMe ? 'You' : selectedChat.otherUser.name} • {
                              (() => {
                                const now = new Date();
                                const messageDate = new Date(selectedChat.lastMessage.createdAt);
                                const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (diffInDays === 0) {
                                  return 'Today at ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } else if (diffInDays === 1) {
                                  return 'Yesterday at ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } else {
                                  return messageDate.toLocaleDateString();
                                }
                              })()
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
                    Choose a conversation from the sidebar to preview and manage your messages.
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
