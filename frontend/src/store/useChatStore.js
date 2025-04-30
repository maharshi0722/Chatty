import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedTargetId: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, selectedTargetId: userId });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });

      // Emit the message to the other user in real-time
      const socket = useAuthStore.getState().socket;
      socket.emit("sendMessage", {
        ...res.data,
        receiverId: selectedUser._id,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  deleteMessage: async (id) => {
    try {
      await axiosInstance.delete(`/messages/${id}`);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== id),
      }));
      toast.success("Message Deleted");
    } catch (err) {
      toast.error("Failed to delete message");
    }
  },

  clearTypingUser: (userId) => {
    set((state) => {
      const updated = { ...state.typingUsers };
      delete updated[userId];
      return { typingUsers: updated };
    });
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!selectedUser || !socket) return;

    socket.on("newMessage", (message) => {
      const { messages, selectedUser } = get();
      if (message.senderId === selectedUser._id || message.receiverId === selectedUser._id) {
        set({ messages: [...messages, message] });
      }
    });
    socket.on("typing", ({ senderId }) => {
      if (!get().typingUsers[senderId]) {
        const timeoutId = setTimeout(() => clearTypingUser(senderId), 3000);
        set((state) => ({
          typingUsers: { ...state.typingUsers, [senderId]: timeoutId },
        }));
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      clearTimeout(get().typingUsers[senderId]);
      get().clearTypingUser(senderId);
    });
  
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing");
    socket.off("stopTyping");
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user, selectedTargetId: user?._id || null, messages: [] });
  },
}));
