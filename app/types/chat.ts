export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  readAt?: string | null;
}

export interface Chat {
  id: string;
  applicationId: string;
  messages: ChatMessage[];
  application: {
    id: string;
    project: {
      id: string;
      title: string;
      clientId: string;
    };
    freelancerId: string;
    status: string;
  };
}

export interface ChatPreview {
  id: string;
  applicationId: string;
  projectTitle: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}