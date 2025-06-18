import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useParams, useFetcher, Form, useNavigate } from "@remix-run/react";
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
    const file = formData.get("attachment") as File | null;

    if (typeof applicationId !== "string" || (!content?.toString().trim() && !file)) {
      return json({ error: "Invalid data" }, { status: 400 });
    }

    try {
      // Handle file upload if present
      let attachmentData: {
        attachmentUrl: string;
        attachmentName: string;
        attachmentSize: number;
        attachmentType: string;
      } | null = null;
      
      if (file && file.size > 0) {
        // For now, we'll store files in a public uploads directory
        // In production, you'd want to use a proper file storage service
        const uploadsDir = "public/uploads";
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${uploadsDir}/${fileName}`;
        
        // Create uploads directory if it doesn't exist
        const fs = await import("fs");
        const path = await import("path");
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        console.log('File saved to:', filePath);
        
        attachmentData = {
          attachmentUrl: `/uploads/${fileName}`,
          attachmentName: file.name,
          attachmentSize: file.size,
          attachmentType: file.type
        };
        console.log('Attachment data:', attachmentData);
      }

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
      const messageData = {
        chatId: chat.id,
        senderId: userId,
        content: content?.toString().trim() || "",
        ...(attachmentData || {})
      };
      console.log('Creating message with data:', messageData);
      
      await prisma.message.create({
        data: messageData,
      });

      // Create notification for the other user
      const isOwner = chat.application.project.owner.id === userId;
      const recipientId = isOwner 
        ? chat.application.freelancer.id 
        : chat.application.project.owner.id;

      await createNotification({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: "New message",
        message: `You have a new message about "${chat.application.project.title}"`,
        data: {
          applicationId,
          projectId: chat.application.project.id,
          senderId: userId
        }
      });

      return json({ success: true });
    } catch (error) {
      console.error("Error sending message:", error);
      return json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const selectedApplicationId = url.searchParams.get("chat") || null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return redirect("/auth/login");
    }    // Get all chats for the user
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
              select: { id: true, title: true, owner: { select: { id: true, name: true } } }
            },
            freelancer: {
              select: { id: true, name: true }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    // Format chats for easier use in the component
    // Filter chats: freelancers can only see chats for APPROVED applications
    const formattedChats = chats
      .filter((chat: any) => {
        const isOwner = chat.application.project.owner.id === userId;
        const isFreelancer = chat.application.freelancer.id === userId;
        
        // Owners can see all their chats regardless of status
        if (isOwner) {
          return true;
        }
        
        // Freelancers can only see chats for APPROVED applications
        if (isFreelancer) {
          return chat.application.status === 'APPROVED';
        }
        
        return false;
      })
      .map((chat: any) => {
      const isOwner = chat.application.project.owner.id === userId;
      const otherUser = isOwner 
        ? chat.application.freelancer 
        : chat.application.project.owner;
      
      const lastMessage = chat.messages[0];
      const unreadCount = 0; // TODO: Implement unread count logic

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
    if (selectedApplicationId) {      const selectedChat = await prisma.chat.findUnique({
        where: { applicationId: selectedApplicationId },
        include: {
          application: {
            include: {
              project: {
                select: { 
                  id: true, 
                  title: true, 
                  description: true,
                  owner: { select: { id: true, name: true } }
                }
              },
              freelancer: {
                select: { id: true, name: true }
              }
            }
          },
          messages: {
            include: {
              sender: {
                select: { id: true, name: true }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        }
      });      if (selectedChat) {
        // Check if user has access to this chat
        const isOwner = selectedChat.application.project.owner.id === userId;
        const isFreelancer = selectedChat.application.freelancer.id === userId;
        
        // Freelancers can only access chats for APPROVED applications
        if (isFreelancer && selectedChat.application.status !== 'APPROVED') {
          // Redirect freelancer away from non-approved application chats
          return redirect("/messages");
        }
        
        // Owners can access all their chats regardless of status
        if (!isOwner && !isFreelancer) {
          // User has no access to this chat
          return redirect("/messages");
        }

        const regularMessages = selectedChat.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.sender.name,
          createdAt: msg.createdAt,
          isFromCurrentUser: msg.senderId === userId,
          attachmentUrl: msg.attachmentUrl,
          attachmentName: msg.attachmentName,
          attachmentSize: msg.attachmentSize,
          attachmentType: msg.attachmentType,
          isApplicationMessage: false
        }));        // Add application message as the first message for approved applications (permanent)
        if (selectedChat.application.status === 'APPROVED') {const applicationMessage = {
            id: `app-${selectedChat.applicationId}`,
            content: `Hi! I'm interested in working on your project "${selectedChat.application.project.title}". I have the skills and experience needed for this work. Looking forward to hearing from you.`,
            senderId: selectedChat.application.freelancer.id,
            senderName: selectedChat.application.freelancer.name,
            createdAt: selectedChat.createdAt,
            isFromCurrentUser: selectedChat.application.freelancer.id === userId, // True when freelancer views (green/right), false when owner views (white/left)
            attachmentUrl: null,
            attachmentName: null,
            attachmentSize: null,
            attachmentType: null,
            isApplicationMessage: true,
            projectId: selectedChat.application.project.id,
            projectTitle: selectedChat.application.project.title
          };
          
          selectedChatMessages = [applicationMessage, ...regularMessages];
        } else {
          selectedChatMessages = regularMessages;
        }
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const selectedChat = chats.find(chat => chat.applicationId === selectedChatId);
  
  // Auto-scroll to bottom only when new messages are added or chat is first loaded
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  useEffect(() => {
    // Only auto-scroll if:
    // 1. It's the initial load (shouldAutoScroll is true)
    // 2. New messages were added (message count increased)
    const currentMessageCount = selectedChatMessages.length;
    
    if (shouldAutoScroll || currentMessageCount > previousMessageCount) {
      // Use a more controlled scroll that doesn't affect the entire page
      setTimeout(() => {
        if (messagesEndRef.current) {
          const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
      }, 100); // Small delay to ensure DOM is updated
      setShouldAutoScroll(false); // Disable auto-scroll after first load
    }
    
    setPreviousMessageCount(currentMessageCount);
  }, [selectedChatMessages, shouldAutoScroll, previousMessageCount]);

  // Reset auto-scroll when switching chats
  useEffect(() => {
    setShouldAutoScroll(true);
    setPreviousMessageCount(0);
  }, [selectedChatId]);

  // Handle chat selection
  const handleChatSelect = (applicationId: string) => {
    setSelectedChatId(applicationId);
    // Navigate to the URL to trigger loader and fetch messages
    navigate(`/messages?chat=${applicationId}`);
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedChatId) return;

    const formData = new FormData();
    formData.append('intent', 'send');
    formData.append('applicationId', selectedChatId);
    formData.append('content', newMessage);
    
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }

    // Use Remix's fetcher for SPA experience
    fetcher.submit(formData, {
      method: 'post',
      action: window.location.pathname + window.location.search,
      encType: 'multipart/form-data',
    });

    setNewMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShouldAutoScroll(true);
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle attach button click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reload messages after sending a message
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && typeof fetcher.data === 'object' && 'success' in fetcher.data && selectedChatId) {
      // Reload the page to get updated messages
      navigate(`/messages?chat=${selectedChatId}`, { replace: true });
    }
  }, [fetcher.state, fetcher.data, selectedChatId, navigate]);

  const isSubmitting = fetcher.state === "submitting";
  return (
    <div className="fixed inset-0 top-16 bg-gray-50 z-0 overflow-hidden">
      <div className="w-full h-full flex">
        {/* Chat List Sidebar - wider, fixed width, scrollable */}
        <div className="w-96 min-w-[24rem] h-full border-r border-gray-200 flex flex-col bg-white shadow-sm">
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
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {chats.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-blue-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                  </svg>
                </div>                <h3 className="text-lg font-semibold text-gray-900 mb-2">No approved applications yet</h3>
                <p className="text-gray-600 text-sm mb-6">
                  You'll see chat conversations here once your job applications are approved by project owners.
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
              <div className="divide-y divide-gray-100">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.applicationId)}
                    className={`p-5 cursor-pointer hover:bg-white transition-all duration-200 border-l-4 ${
                      selectedChatId === chat.applicationId 
                        ? 'bg-white border-blue-500 shadow-sm' 
                        : 'border-transparent hover:border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 relative">
                        <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                          {chat.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                            {chat.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {chat.otherUser.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
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
                        <p className="text-sm text-blue-600 font-medium mb-2 truncate">
                          {chat.projectTitle}
                        </p>
                        {chat.lastMessage && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 truncate leading-relaxed">
                              {chat.lastMessage.isFromMe ? (
                                <span className="text-gray-500 font-medium">You: </span>
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
        
        {/* Chat Content Area - fills the rest, no page scroll */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {selectedChat ? (
            <>              {/* Chat Header - More compact and cleaner */}
              <div className="flex-shrink-0 p-5 border-b border-gray-200 bg-white" style={{ height: '104.67px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {selectedChat.otherUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedChat.otherUser.name}
                      </h2>
                      <p className="text-sm text-gray-600 font-medium">
                        {selectedChat.projectTitle}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-500">Project collaboration</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
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
              
              {/* Messages Area - Larger and better proportioned */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50" style={{ scrollBehavior: 'smooth' }}>
                {selectedChatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
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
                  <>                    {selectedChatMessages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        onClick={(e) => e.stopPropagation()} // Prevent any click propagation
                      >                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm ${
                          message.isApplicationMessage
                            ? message.isFromCurrentUser
                              ? 'bg-green-50 text-gray-900 border border-green-200'
                              : 'bg-white text-gray-900 border border-gray-200'
                            : message.isFromCurrentUser
                            ? 'bg-green-50 text-gray-900 border border-green-200'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                          
                          {/* Show project link for application messages */}
                          {message.isApplicationMessage && message.projectTitle && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <Link
                                to={`/projects/${message.projectId}`}
                                className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View details
                              </Link>
                            </div>
                          )}
                          
                          {/* Display attachment if present */}
                          {message.attachmentUrl && (
                            <div className="mt-2">
                              {message.attachmentType?.startsWith('image/') ? (
                                <img 
                                  src={message.attachmentUrl} 
                                  alt={message.attachmentName}
                                  className="max-w-full h-auto rounded-md cursor-pointer"
                                  onClick={() => window.open(message.attachmentUrl, '_blank')}
                                />
                              ) : (                                <div className={`flex items-center space-x-2 p-2 rounded-md ${
                                  message.isFromCurrentUser ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <a 
                                    href={message.attachmentUrl} 
                                    download={message.attachmentName}
                                    className={`text-sm underline ${
                                      message.isFromCurrentUser ? 'text-green-700' : 'text-blue-600'
                                    }`}
                                  >
                                    {message.attachmentName}
                                  </a>                                  <span className={`text-xs ${
                                    message.isFromCurrentUser ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    ({Math.round((message.attachmentSize || 0) / 1024)} KB)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}                          <p className={`text-xs mt-1 ${
                            message.isApplicationMessage 
                              ? 'text-gray-500'
                              : message.isFromCurrentUser ? 'text-green-600' : 'text-gray-500'
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
              
              {/* Message Input - Better positioned and styled */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                <div className="p-6">
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      multiple={false}
                    />
                      {/* Message input field - Buttons below */}
                    <div className="w-full space-y-3">
                      {/* Text area */}
                      <div className="w-full">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={`Message ${selectedChat.otherUser.name}...`}
                          className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 text-base shadow-sm"
                          disabled={isSubmitting}
                          rows={3}
                          style={{ minHeight: '100px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                        />
                      </div>
                      
                      {/* Buttons below the text area */}
                      <div className="flex items-center justify-between">
                        {/* Attach button */}
                        <button
                          type="button"
                          onClick={handleAttachClick}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2 border border-gray-300 bg-white"
                          title="Attach file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-sm font-medium">Attach</span>
                        </button>
                        
                        {/* Send button */}
                        <button
                          type="submit"
                          disabled={(!newMessage.trim() && !selectedFile) || isSubmitting}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                        >
                          {isSubmitting ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </form>
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
                  Choose a conversation from the sidebar to start chatting with your clients or freelancers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
