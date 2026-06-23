import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, doctorAPI, patientAPI } from '../api';

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeContent, setComposeContent] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [threadMessages]);

  async function loadData() {
    try {
      setLoading(true);
      const [convos, users] = await Promise.allSettled([
        messagesAPI.getConversations(),
        user?.role === 'doctor' || user?.role === 'admin' ? doctorAPI.getPatients() : patientAPI.getProfile(),
      ]);
      if (convos.status === 'fulfilled') setConversations(convos.value.conversations || []);
      if (users.status === 'fulfilled') {
        const userData = users.value;
        if (userData.patients) setAllUsers(userData.patients);
        else if (userData.user) setAllUsers([userData.user]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(conv) {
    setSelectedContact(conv);
    setThreadLoading(true);
    try {
      const data = await messagesAPI.getConversation(conv.contact_id);
      setThreadMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;
    try {
      setSending(true);
      const result = await messagesAPI.send(selectedContact.contact_id, newMessage.trim());
      setThreadMessages(prev => [...prev, result.message]);
      setNewMessage('');
      setConversations(prev => prev.map(c =>
        c.contact_id === selectedContact.contact_id
          ? { ...c, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
          : c
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!composeRecipient || !composeContent.trim()) return;
    try {
      setSending(true);
      await messagesAPI.send(composeRecipient, composeContent.trim());
      setShowCompose(false);
      setComposeRecipient('');
      setComposeContent('');
      await loadData();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  if (selectedContact) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div className="page-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setSelectedContact(null); setThreadMessages([]); }}>←</button>
            <div>
              <div className="page-title" style={{ fontSize: '1rem' }}>{selectedContact.contact_name}</div>
              <div className="page-sub">Conversation</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {threadLoading ? (
            <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : threadMessages.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No messages yet. Start the conversation!</div>
            </div>
          ) : (
            threadMessages.map(msg => {
              const isMine = msg.sender_id === user?.user_id || msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                    background: isMine ? 'var(--cyan)' : '#f3f4f6',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    fontSize: '0.85rem', lineHeight: 1.5,
                  }}>
                    <div>{msg.content}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1 }}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !newMessage.trim()}>
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Messages</div>
          <div className="page-sub">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(!showCompose)}>
            {showCompose ? 'Cancel' : '+ Compose'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {showCompose && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>New Message</div>
          <form onSubmit={handleCompose} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">To *</label>
              <select className="form-input" value={composeRecipient} onChange={e => setComposeRecipient(e.target.value)} required>
                <option value="">Select recipient...</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.full_name || u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Message *</label>
              <textarea className="form-input" rows={3} value={composeContent} onChange={e => setComposeContent(e.target.value)} placeholder="Type your message..." required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCompose(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-text">No conversations yet</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Click "Compose" to start a conversation.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(conv => (
            <div
              key={conv.contact_id}
              className="card"
              style={{ padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openConversation(conv)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0891b2, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {conv.contact_avatar || conv.contact_name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {conv.contact_name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {formatTime(conv.last_message_time)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.last_message}
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: 10,
                    background: 'var(--cyan)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, padding: '0 6px',
                  }}>
                    {conv.unread_count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
