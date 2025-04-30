import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Trash2 } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
const formatDateHeader = (dateString) => {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

const groupMessagesByDate = (messages) => {
  const grouped = {};
  messages.forEach((msg) => {
    const dateKey = formatDateHeader(msg.createdAt);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(msg);
  });
  return grouped;
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    typingUsers,
    isMessagesLoading,
    clearTypingUserAfterDelay, 
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!selectedUser) return;
  
    const isGroup = selectedUser?.isGroup;
  
    getMessages(selectedUser._id);
  
    if (isGroup) {
      subscribeToGroupMessages();
    } else {
      subscribeToMessages();
    }
  
    return () => {
      if (isGroup) {
        unsubscribeFromGroupMessages();
      } else {
        unsubscribeFromMessages();
      }
    };
  }, [selectedUser._id, selectedUser?.isGroup, getMessages, subscribeToMessages, unsubscribeFromMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages, selectedUser]);
  

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages,typingUsers]);

  useEffect(() => {
    if (typingUsers.length > 0) {
      const timeout = setTimeout(() => {
        clearTypingUserAfterDelay(selectedUser._id); // remove after 3s
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [typingUsers, selectedUser._id, clearTypingUserAfterDelay]);
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col bg-base-100">
        <ChatHeader selectedUser={selectedUser} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }
  return (
<div className="flex-1 flex flex-col p-4 gap-2">
  <ChatHeader user={selectedUser} />
  <div className="flex-1 overflow-y-auto  ">
    {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
      <div key={date}>
        <div className="text-center text-xs text-gray-500 mb-2">{date}</div>
        {msgs.map((message, idx) => (
          <div
            key={message._id}
            ref={idx === msgs.length - 1 ? messageEndRef : null}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser?.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1 flex justify-between items-center">
              <span className="text-xs font-semibold">
                {message.senderId === authUser._id ? "" : selectedUser?.username || ""}
              </span>
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
              {message.senderId === authUser._id && (
                <button
                  onClick={() => deleteMessage(message._id)}
                  className="text-xs text-red-500 ml-2 hover:underline"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>
    ))}

    {Object.keys(typingUsers).length > 0 && (
      <div className="chat chat-start mt-1  ">
        <div className="chat-image avatar">
          <div className="size-10 rounded-full border">
            <img
              src={selectedUser?.profilePic || "/avatar.png"}
              alt="profile pic"
            />
          </div>
        </div>
        <div className="chat-bubble text-sm flex flex-col font-semibold">Typing...</div>
      </div>
    )}

    <div ref={messageEndRef}></div>
  </div>

  <MessageInput />
</div>

  );
};

export default ChatContainer;
