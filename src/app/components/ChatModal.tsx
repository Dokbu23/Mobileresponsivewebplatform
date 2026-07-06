import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Store, Hotel, User as UserIcon, MessageCircle } from 'lucide-react';
import { sendMessage, getConversation } from '../lib/api';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../context/NotificationContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: number;
  receiverName: string;
  receiverRole?: 'enterprise' | 'resort' | 'tourist' | 'admin';
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: number; name: string; role: string };
  receiver?: { id: number; name: string; role: string };
}

export default function ChatModal({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  receiverRole = 'enterprise',
}: ChatModalProps) {
  const { currentUser } = useApp();
  const currentUserId = currentUser?.id ?? null;
  const { setChatOpen } = useNotifications();

  // Register with NotificationContext so toasts are suppressed for this conversation
  useEffect(() => {
    if (isOpen && receiverId) {
      setChatOpen(receiverId);
    }
    return () => {
      setChatOpen(null);
    };
  }, [isOpen, receiverId, setChatOpen]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Fetch messages when modal opens
  useEffect(() => {
    if (isOpen && receiverId) {
      fetchMessages();
      // Poll for new messages every 5 seconds
      pollIntervalRef.current = window.setInterval(fetchMessages, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, receiverId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!receiverId) return;
    try {
      const response = await getConversation(receiverId);
      if (response.success) {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    setSending(true);
    try {
      const response = await sendMessage(receiverId, text);
      if (response.success) {
        setMessages((prev) => [...prev, response.data]);
        setNewMessage('');
      } else {
        toast.error(response.message || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const RoleIcon =
    receiverRole === 'resort' ? Hotel : receiverRole === 'tourist' ? UserIcon : Store;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg h-[80vh] sm:h-[600px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow">
              <RoleIcon className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h2 className="font-bold text-base">{receiverName}</h2>
              <div className="flex items-center gap-1.5 text-xs text-white/90">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Online</span>
                <span className="text-white/60 mx-1">•</span>
                <span className="capitalize">{receiverRole}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-pink-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Start a conversation</h3>
              <p className="text-sm text-gray-500">
                Send your first message to {receiverName}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMine
                        ? 'bg-pink-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${receiverName}...`}
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm disabled:opacity-50"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={`p-2.5 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md transition-all ${
                sending || !newMessage.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-lg hover:scale-105'
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Messages are delivered directly to {receiverName}
          </p>
        </form>
      </div>
    </div>
  );
}
