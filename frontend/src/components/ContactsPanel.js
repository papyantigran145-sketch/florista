import { useState, useEffect } from 'react';
import { FiMail, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';

const API_URL = 'https://coziness-lunchtime-removal.ngrok-free.dev';

export default function ContactsPanel() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contacts`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  const deleteMessage = async (id) => {
    if (!window.confirm('Удалить это сообщение?')) return;
    await fetch(`${API_URL}/api/admin/contacts/${id}`, { method: 'DELETE' });
    loadMessages();
  };

  const editMessage = async (id) => {
    if (!editText.trim()) return;
    await fetch(`${API_URL}/api/admin/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: editText })
    });
    setEditingId(null);
    loadMessages();
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem' }}>
        Сообщения <em style={{ color: '#c0474a' }}>клиентов</em>
      </h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>Все сообщения из контактной формы</p>

      <div style={{ background: 'var(--surface,#fff)', borderRadius: '12px', border: '1px solid var(--border,#e8e2df)' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div> : messages.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Нет сообщений</div>
        ) : (
          messages.map(m => (
            <div key={m.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border,#e8e2df)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '.3rem' }}>
                  <strong>{m.name}</strong>
                  <span style={{ color: '#888', fontSize: '.85rem' }}>{m.email}</span>
                  {m.phone && <span style={{ color: '#888', fontSize: '.85rem' }}>{m.phone}</span>}
                  <span style={{ color: '#aaa', fontSize: '.78rem', marginLeft: 'auto' }}>
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
                {editingId === m.id ? (
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <textarea 
                      value={editText} 
                      onChange={e => setEditText(e.target.value)} 
                      rows={2} 
                      style={{ flex: 1, padding: '.5rem', borderRadius: '6px', border: '1px solid #c0474a', background: 'var(--surface-2,#f5f5f5)' }} 
                    />
                    <button onClick={() => editMessage(m.id)} style={{ background: '#c0474a', color: '#fff', border: 'none', padding: '.3rem .8rem', borderRadius: '6px', cursor: 'pointer' }}><FiCheck /></button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid #888', padding: '.3rem .8rem', borderRadius: '6px', cursor: 'pointer' }}><FiX /></button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-2,#444)', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button onClick={() => { setEditingId(m.id); setEditText(m.message); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><FiEdit2 /></button>
                <button onClick={() => deleteMessage(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiTrash2 /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
