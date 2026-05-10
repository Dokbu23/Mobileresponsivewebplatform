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

export default function ChatWidget() {
  const { userType } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<string>(userType ?? 'tourist');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRoom(userType ?? 'tourist');
  }, [userType]);

  useEffect(() => {
    if (open) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room]);

  // Fetch authenticated user info (name) to personalize chat
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

  // When opening the chat and user is known, show a friendly initial bot greeting if there's no history
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0 && userName) {
      const greet: ChatMessage = { id: 'greet-bot', sender: 'bot', message: `Kumusta, ${userName}! Paano kita matutulungan ngayon?`, created_at: new Date().toISOString() };
      setMessages([greet]);
    }
  }, [open, userName]);

  // Auto-scroll to bottom whenever messages change or when sending state changes
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Smooth scroll to bottom
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

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (!getAuthToken()) {
      navigate('/select-role');
      return;
    }

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
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, message: m.message + ' (failed)' } : m)));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-end flex-col-reverse">
        {open && (
          <div className="mb-3 w-96 max-w-sm bg-white border rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-sm">{userName ? `Kumusta, ${userName}` : 'DISC Chat'}</div>
                    <div className="text-xs text-white/90">Support • Sagot mula sa system</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-white/90">{room.toUpperCase()}</div>
                <button aria-label="Close" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </button>
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="flex gap-2">
                {['tourist','resort','enterprise','admin'].map(r => (
                  <button key={r} onClick={() => setRoom(r)} className={`text-xs px-3 py-1 rounded-full ${room===r? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div ref={listRef} className="p-4 flex-1 overflow-auto h-72 bg-gray-50 space-y-3 chat-scroll">
              {loading ? (
                <div className="text-xs text-gray-500">Loading...</div>
              ) : (
                messages.length === 0 ? (
                  <div className="text-sm text-gray-500">{userName ? `Kumusta, ${userName}! Subukan ang pagtatanong tungkol sa booking o mga serbisyo.` : 'Walang naitalang mensahe. Subukan ang pagtatanong tungkol sa booking o mga serbisyo.'}</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex items-end ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'bot' && (
                        <div className="flex items-end mr-2">
                          <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-sm text-blue-600 shadow">
                            🤖
                          </div>
                        </div>
                      )}

                      <div className={`${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-xl rounded-br-none' : 'bg-white text-gray-800 rounded-xl rounded-tl-none border'} px-4 py-2 max-w-[72%] text-sm shadow-sm`}>
                        <div>{msg.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1 text-right">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="flex items-end ml-2">
                          <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">Ikaw</div>
                        </div>
                      )}
                    </div>
                  ))
                )
              )}

              {sending && (
                <div className="flex items-end justify-start">
                  <div className="mr-2">
                    <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-sm text-blue-600 shadow">🤖</div>
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-none px-4 py-2 text-sm shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block"></span>
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block delay-75"></span>
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block delay-150"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="px-4 py-3 border-t bg-white">
              {!getAuthToken() ? (
                <div className="text-xs text-gray-600">
                  Kailangan mag-login para mag-chat. <button type="button" onClick={() => navigate('/select-role')} className="text-blue-600 underline">Login</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" className="text-gray-500 p-2 rounded hover:bg-gray-100" title="Emoji">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.5-6a3.5 3.5 0 017 0H6.5zM7 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z"/></svg>
                  </button>
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder="I-type ang tanong..." className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={sending} className={`bg-blue-600 text-white px-4 py-2 rounded-full text-sm shadow ${sending ? 'opacity-70' : 'hover:bg-blue-700'}`}>
                    {sending ? 'Sending...' : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 2.94a1.5 1.5 0 012.12 0L10 7.88l4.94-4.94a1.5 1.5 0 112.12 2.12L12.12 10l4.94 4.94a1.5 1.5 0 11-2.12 2.12L10 12.12l-4.94 4.94a1.5 1.5 0 11-2.12-2.12L7.88 10 2.94 5.06a1.5 1.5 0 010-2.12z"/></svg>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        <button onClick={() => setOpen(o => !o)} title="Chat" className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M18 10c0 3.866-3.582 7-8 7a8.96 8.96 0 01-3.743-.81L2 17l1.168-3.541A7.963 7.963 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"/></svg>
        </button>
      </div>
    </div>
  );
}
