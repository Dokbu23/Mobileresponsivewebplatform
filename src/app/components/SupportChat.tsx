import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getChatHistory, sendChatMessage } from '../lib/api';
import { toast } from 'sonner';

export function SupportChat({ defaultRoom }: { defaultRoom?: string }) {
  const { userType } = useApp();
  const [room, setRoom] = useState<string>(defaultRoom ?? (userType ?? 'tourist'));
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res: any = await getChatHistory(room);
      setMessages(Array.isArray(res.messages) ? res.messages : []);
    } catch (err: any) {
      console.error('Failed to load chat history', err);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res: any = await sendChatMessage(room, text);
      if (res?.user_message) setMessages(prev => [...prev, res.user_message]);
      if (res?.reply) setMessages(prev => [...prev, res.reply]);
      setInput('');
    } catch (err: any) {
      console.error('Send chat failed', err);
      toast.error(err?.message ?? 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md w-full bg-white border rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Support Chat</h3>
        <select
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="tourist">Tourist</option>
          <option value="resort">Resort</option>
          <option value="enterprise">Enterprise</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="h-64 overflow-y-auto border rounded p-3 mb-3 bg-gray-50">
        {loading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Walang messages pa — magpadala ng tanong.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`mb-2 ${m.sender === 'bot' ? 'text-gray-800' : 'text-primary'}`}>
              <div className="text-xs text-muted-foreground">{m.sender === 'bot' ? 'Support' : 'You'} • {new Date(m.created_at).toLocaleString()}</div>
              <div className="mt-1">{m.message}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button type="submit" className="px-3 py-2 bg-primary text-white rounded" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default SupportChat;
