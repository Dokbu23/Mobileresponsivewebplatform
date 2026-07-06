import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  MessageCircle, Search, ArrowLeft, Store, Hotel,
  User as UserIcon, Mail
} from 'lucide-react';
import { getMessagesInbox } from '../lib/api';
import { useApp } from '../context/AppContext';
import ChatModal from '../components/ChatModal';

interface Conversation {
  partner: {
    id: number;
    name: string;
    role: string;
    email: string;
  };
  last_message: {
    id: number;
    message: string;
    sender_id: number;
    created_at: string;
  } | null;
  unread_count: number;
}

export function Messages() {
  const navigate = useNavigate();
  const { userType } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchInbox();
    // Refresh every 10 seconds
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchInbox = async () => {
    try {
      const response = await getMessagesInbox();
      if (response.success) {
        setConversations(response.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    if (role === 'resort') return Hotel;
    if (role === 'enterprise') return Store;
    return UserIcon;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors mb-4 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4">Loading messages...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-10 w-10 text-pink-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No messages yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery
                  ? 'No conversations match your search'
                  : userType === 'tourist'
                  ? 'Start chatting with shops and resorts!'
                  : 'Customer messages will appear here'}
              </p>
              {userType === 'tourist' && !searchQuery && (
                <button
                  onClick={() => navigate('/products')}
                  className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
                >
                  Browse Products
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => {
                const RoleIcon = getRoleIcon(conv.partner.role);
                const hasUnread = conv.unread_count > 0;

                return (
                  <button
                    key={conv.partner.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-pink-50/50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center shadow">
                        <RoleIcon className="h-7 w-7 text-white" />
                      </div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`font-${hasUnread ? 'bold' : 'semibold'} text-gray-900 truncate`}>
                          {conv.partner.name}
                        </h3>
                        {conv.last_message && (
                          <span className={`text-xs flex-shrink-0 ${hasUnread ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
                            {formatTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full font-medium capitalize">
                          {conv.partner.role}
                        </span>
                        {conv.last_message && (
                          <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                            {conv.last_message.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {selectedConversation && (
        <ChatModal
          isOpen={!!selectedConversation}
          onClose={() => {
            setSelectedConversation(null);
            fetchInbox(); // Refresh to update read status
          }}
          receiverId={selectedConversation.partner.id}
          receiverName={selectedConversation.partner.name}
          receiverRole={selectedConversation.partner.role as any}
        />
      )}
    </div>
  );
}
