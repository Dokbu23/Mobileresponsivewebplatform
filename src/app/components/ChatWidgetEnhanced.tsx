import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAuthToken, getChatHistory, sendChatMessage, getJSON } from '../lib/api';
import { useNavigate } from 'react-router';

type ChatMessage = {
  id: string;
  room?: string;
  sender: 'user' | 'bot';
  message: string;
  created_at?: string;
};

type QuickReply = {
  text: string;
  icon: string;
};

export default function ChatWidgetEnhanced() {
  const { userType } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<string>(userType ?? 'tourist');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Quick replies based on room
  const quickReplies: Record<string, QuickReply[]> = {
    tourist: [
      { text: 'Ano ang mga tourist spots?', icon: '🏖️' },
      { text: 'Magkano ang accommodation?', icon: '🏨' },
      { text: 'May available ba ngayon?', icon: '📅' },
      { text: 'Paano mag-book?', icon: '📝' },
    ],
    resort: [
      { text: 'Paano ko makikita ang bookings?', icon: '📋' },
      { text: 'Paano mag-update ng profile?', icon: '✏️' },
      { text: 'Paano mag-upload ng images?', icon: '📸' },
      { text: 'Paano mag-set ng price?', icon: '💰' },
    ],
    enterprise: [
      { text: 'Paano mag-add ng product?', icon: '➕' },
      { text: 'Paano ko makikita ang orders?', icon: '📦' },
      { text: 'Paano mag-update ng inventory?', icon: '📊' },
      { text: 'Paano mag-set ng delivery?', icon: '🚚' },
    ],
    admin: [
      { text: 'Paano mag-approve ng listings?', icon: '✅' },
      { text: 'Paano mag-verify ng payments?', icon: '💳' },
      { text: 'Paano mag-manage ng users?', icon: '👥' },
      { text: 'Paano mag-view ng analytics?', icon: '📈' },
    ],
  };

  useEffect(() => {
    setRoom(userType ?? 'tourist');
  }, [userType]);

  useEffect(() => {
    if (open) {
      loadHistory();
      inputRef.current?.focus();
    }
  }, [open, room]);

  useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      if (!getAuthToken()) {
        setUserName(null);
        return;
      }
      try {
        const data: any = await getJSON('/me');
        if (!mounted) return;
        setUserName(data?.user?.name ?? null);
      } catch (e) {
        console.warn('Failed to fetch user info', e);
        if (mounted) setUserName(null);
      }
    }
    fetchMe();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0 && userName) {
      const hour = new Date().getHours();
      let greeting = 'Kumusta';
      if (hour >= 5 && hour < 12) greeting = 'Magandang umaga';
      else if (hour >= 12 && hour < 18) greeting = 'Magandang hapon';
      else greeting = 'Magandang gabi';
      
      const greet: ChatMessage = { 
        id: 'greet-bot', 
        sender: 'bot', 
        message: `${greeting}, ${userName}! 👋\n\nAko ay iyong AI assistant para sa DISC Mansalay. Paano kita matutulungan ngayon?`, 
        created_at: new Date().toISOString() 
      };
      setMessages([greet]);
    }
  }, [open, userName]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, sending, loading, open]);

  async function loadHistory() {
    if (!getAuthToken()) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const data: any = await getChatHistory(room);
      const incoming = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(incoming);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    } catch (err) {
      console.error('Failed to load chat history', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e?: React.FormEvent, quickReplyText?: string) {
    e?.preventDefault();
    const text = (quickReplyText || input).trim();
    if (!text) return;
    if (!getAuthToken()) {
      navigate('/select-role');
      return;
    }

    setShowQuickReplies(false);
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = { id: tempId, sender: 'user', message: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setSending(true);
    
    try {
      const res: any = await sendChatMessage(room, text);
      if (res?.user_message) {
        setMessages(prev => prev.map(m => (m.id === tempId ? res.user_message : m)));
      }
      if (res?.reply) {
        setMessages(prev => [...prev, res.reply]);
      }
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('send failed', err);
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, message: m.message + ' ❌ (failed)' } : m)));
    } finally {
      setSending(false);
    }
  }

  function handleQuickReply(text: string) {
    handleSend(undefined, text);
  }

  function formatMessage(text: string) {
    // Format bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Format bullet points
    text = text.replace(/^• (.+)$/gm, '<li>$1</li>');
    // Wrap lists
    text = text.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc ml-4 my-2">$1</ul>');
    // Format line breaks
    text = text.replace(/\n/g, '<br/>');
    return text;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-end flex-col-reverse">
        {open && (
          <div className="mb-3 w-[400px] max-w-[calc(100vw-3rem)] bg-white border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.29-3.86-.81l-.28-.13-2.86.49.49-2.86-.13-.28C4.29 14.68 4 13.38 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                      <circle cx="9" cy="12" r="1.5"/>
                      <circle cx="15" cy="12" r="1.5"/>
                    </svg>
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <div className="font-semibold text-sm">DISC AI Assistant</div>
                  <div className="text-xs text-white/90 flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                    Online • Sumasagot ngayon
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setOpen(false)} 
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Room Selector */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {['tourist','resort','enterprise','admin'].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setRoom(r)} 
                    className={`text-xs px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                      room===r 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="p-4 flex-1 overflow-auto h-[400px] bg-gradient-to-b from-gray-50 to-white space-y-4 chat-scroll">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-xs text-gray-500">Loading messages...</div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="text-4xl mb-3">💬</div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        {userName ? `Kumusta, ${userName}!` : 'Walang naitalang mensahe'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Magtanong tungkol sa booking, attractions, o iba pang serbisyo
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        {msg.sender === 'bot' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-md">
                              🤖
                            </div>
                          </div>
                        )}

                        <div className={`${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md' 
                            : 'bg-white text-gray-800 rounded-2xl rounded-tl-md border shadow-sm'
                        } px-4 py-3 max-w-[75%] group`}>
                          <div 
                            className="text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }}
                          />
                          {msg.created_at && (
                            <div className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>

                        {msg.sender === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs shadow-md">
                              {userName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {sending && (
                    <div className="flex items-end gap-2 justify-start animate-fadeIn">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-md">
                          🤖
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></span>
                          <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                          <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Replies */}
                  {showQuickReplies && messages.length > 0 && !sending && (
                    <div className="pt-2">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Mabilis na tanong:</div>
                      <div className="flex flex-wrap gap-2">
                        {quickReplies[room]?.slice(0, 3).map((qr, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickReply(qr.text)}
                            className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <span>{qr.icon}</span>
                            <span>{qr.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t bg-white">
              {!getAuthToken() ? (
                <div className="text-xs text-gray-600 text-center py-2">
                  Kailangan mag-login para mag-chat. 
                  <button type="button" onClick={() => navigate('/select-role')} className="text-blue-600 underline ml-1 font-medium">
                    Login
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input 
                      ref={inputRef}
                      value={input} 
                      onChange={e => setInput(e.target.value)} 
                      placeholder="I-type ang tanong mo..." 
                      className="w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 transition-all" 
                      disabled={sending}
                    />
                    <button 
                      type="button" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title="Emoji"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                  <button 
                    type="submit" 
                    disabled={sending || !input.trim()} 
                    className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2.5 rounded-full shadow-lg transition-all ${
                      sending || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'
                    }`}
                    title="Send message"
                  >
                    {sending ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </form>

            {/* Powered by */}
            <div className="px-4 py-2 bg-gray-50 border-t text-center">
              <div className="text-[10px] text-gray-400">
                Powered by <span className="font-semibold text-blue-600">Groq AI</span> • Fast & Accurate
              </div>
            </div>
          </div>
        )}

        {/* Chat Button */}
        <button 
          onClick={() => setOpen(o => !o)} 
          title="Chat with AI Assistant" 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 relative group"
        >
          {!open && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
              !
            </div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
          </svg>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            May tanong? Chat tayo! 💬
          </div>
        </button>
      </div>

      <style jsx>{`
        .chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 10px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
