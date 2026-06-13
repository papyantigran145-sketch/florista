import { FiEdit2, FiTrash2, FiMessageCircle, FiUser } from 'react-icons/fi';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

function AdminBubble({ m, onEdit, onDelete }) {
  const [hover, setHover]  = useState(false);
  const [editing, setEdit] = useState(false);
  const [val, setVal]      = useState(m.text);
  const own                = m.from === 'admin';

  if (m.deleted) return (
    <div style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
      <div style={{ fontSize: '.75rem', color: '#777', fontStyle: 'italic', padding: '4px 10px', border: '1px dashed #555', borderRadius: '10px' }}>Сообщение удалено</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', position: 'relative', marginBottom: '2px' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ maxWidth: '75%', position: 'relative' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '200px' }}>
            <textarea autoFocus rows={2} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEdit(m.id, val); setEdit(false); }
                if (e.key === 'Escape') { setEdit(false); setVal(m.text); }
              }}
              style={{ resize: 'none', border: '1.5px solid #c0474a', borderRadius: '10px', padding: '8px 10px', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#f0ece8', width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
              <button onClick={() => { onEdit(m.id, val); setEdit(false); }} style={{ padding: '3px 10px', background: '#c0474a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '.78rem', cursor: 'pointer' }}>Сохранить</button>
              <button onClick={() => { setEdit(false); setVal(m.text); }} style={{ padding: '3px 8px', background: 'none', border: '1px solid #555', borderRadius: '7px', fontSize: '.78rem', cursor: 'pointer', color: '#aaa' }}>Отмена</button>
            </div>
          </div>
        ) : (
          <>
            {hover && (
              <div style={{ position: 'absolute', top: '-26px', [own ? 'right' : 'left']: 0, display: 'flex', gap: '2px', background: 'rgba(0,0,0,.85)', borderRadius: '8px', padding: '3px 6px', zIndex: 10, whiteSpace: 'nowrap' }}>
                {own && <button onClick={() => setEdit(true)} title="Редактировать" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', padding: '1px 3px' }}><FiEdit2 /></button>}
                <button onClick={() => onDelete(m.id)} title="Удалить" style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '1px 3px' }}><FiTrash2 /></button>
              </div>
            )}
            <div style={{
              background: own ? 'linear-gradient(135deg,#c0474a,#8b2e30)' : 'rgba(255,255,255,0.08)',
              color: own ? '#fff' : '#f0ece8',
              borderRadius: own ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '8px 12px', fontSize: '.88rem', lineHeight: 1.5, wordBreak: 'break-word',
            }}>
              {!own && <div style={{ fontSize: '.72rem', color: '#c0474a', fontWeight: 600, marginBottom: '3px' }}>Клиент</div>}
              {m.text}
              <div style={{ fontSize: '.68rem', opacity: .6, marginTop: '3px', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {m.edited && <span style={{ fontStyle: 'italic' }}>изм.</span>}
                <span>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [sessions, setSessions]   = useState([]);
  const [active, setActive]       = useState(null);
  const [msgs, setMsgs]           = useState([]);
  const [text, setText]           = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef                 = useRef(null);
  const bottomRef                 = useRef(null);
  const activeRef                 = useRef(null);

  // keep activeRef in sync
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const socket = io(API, { query: { sessionId: 'admin-' + Date.now() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('admin:join');
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('admin:sessions', list => {
      setSessions(list.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0)));
    });

    socket.on('admin:newMessage', ({ sessionId, msg }) => {
      // Update session list
      setSessions(prev => {
        const exists = prev.find(s => s.sessionId === sessionId);
        const updated = exists
          ? prev.map(s => s.sessionId === sessionId
              ? { ...s, lastMsg: msg, unread: activeRef.current === sessionId ? 0 : (s.unread || 0) + (msg.from === 'client' ? 1 : 0) }
              : s)
          : [{ sessionId, lastMsg: msg, unread: msg.from === 'client' ? 1 : 0 }, ...prev];
        return updated.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0));
      });
      // Append to active chat instantly — no refresh needed
      if (activeRef.current === sessionId) {
        setMsgs(p => p.find(m => m.id === msg.id) ? p : [...p, msg]);
      }
    });

    socket.on('chat:history', history => setMsgs(history));

    socket.on('chat:edited', ({ msgId, newText }) => {
      setMsgs(p => p.map(m => m.id === msgId ? { ...m, text: newText, edited: true } : m));
    });

    socket.on('chat:deleted', ({ msgId }) => {
      setMsgs(p => p.map(m => m.id === msgId ? { ...m, deleted: true } : m));
    });

    socket.on('admin:readUpdate', ({ sessionId }) => {
      setSessions(p => p.map(s => s.sessionId === sessionId ? { ...s, unread: 0 } : s));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!active || !socketRef.current) return;
    socketRef.current.emit('admin:watchSession', { targetSessionId: active });
    socketRef.current.emit('admin:markRead',    { targetSessionId: active });
    setSessions(p => p.map(s => s.sessionId === active ? { ...s, unread: 0 } : s));
  }, [active]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [msgs]);

  const send = useCallback(() => {
    if (!text.trim() || !active || !socketRef.current) return;
    socketRef.current.emit('admin:send', { targetSessionId: active, text });
    setText('');
  }, [text, active]);

  const handleEdit = useCallback((msgId, newText) => {
    if (!newText.trim() || !socketRef.current) return;
    socketRef.current.emit('chat:edit', { msgId, newText, targetSessionId: active });
  }, [active]);

  const handleDelete = useCallback((msgId) => {
    socketRef.current?.emit('chat:delete', { msgId, targetSessionId: active });
  }, [active]);

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const totalUnread = sessions.reduce((a, s) => a + (s.unread || 0), 0);

  const border = '1px solid rgba(255,255,255,0.07)';
  const surface = 'rgba(255,255,255,0.03)';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 160px)', minHeight: '500px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border,#3d3830)', background: 'var(--surface,#1e1b18)' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: '270px', borderRight: border, display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--surface-2,#252118)' }}>
        <div style={{ padding: '16px 18px', borderBottom: border }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink,#f0ece8)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMessageCircle style={{ verticalAlign: '-2px' }} /> Чаты
            {totalUnread > 0 && <span style={{ background: '#c0474a', color: '#fff', borderRadius: '99px', padding: '1px 8px', fontSize: '.72rem', fontWeight: 700 }}>{totalUnread}</span>}
          </div>
          <div style={{ fontSize: '.72rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--ink-3,#888)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#4caf50' : '#aaa', display: 'inline-block' }} />
            {connected ? 'Подключено' : 'Нет связи'}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0
            ? <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3,#888)', fontSize: '.85rem' }}>Нет активных чатов</div>
            : sessions.map(s => (
              <div key={s.sessionId} onClick={() => setActive(s.sessionId)} style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: border,
                background: active === s.sessionId ? 'rgba(192,71,74,0.15)' : 'transparent',
                borderLeft: `3px solid ${active === s.sessionId ? '#c0474a' : 'transparent'}`,
                transition: 'background .15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--ink,#f0ece8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    <FiUser style={{ verticalAlign: '-2px' }} /> {s.sessionId.slice(0, 14)}…
                  </div>
                  {s.unread > 0 && <span style={{ background: '#c0474a', color: '#fff', borderRadius: '99px', padding: '1px 7px', fontSize: '.7rem', fontWeight: 700, flexShrink: 0 }}>{s.unread}</span>}
                </div>
                {s.lastMsg && !s.lastMsg.deleted && (
                  <div style={{ fontSize: '.76rem', color: 'var(--ink-3,#888)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.lastMsg.from === 'admin' ? '↩ ' : ''}{s.lastMsg.text}
                  </div>
                )}
                {s.lastMsg && (
                  <div style={{ fontSize: '.68rem', color: 'var(--ink-3,#666)', marginTop: '2px' }}>
                    {new Date(s.lastMsg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--ink-3,#888)' }}>
            <div style={{ fontSize: '3.5rem', display: 'flex', justifyContent: 'center' }}><FiMessageCircle /></div>
            <div style={{ fontSize: '.95rem', fontWeight: 500 }}>Выберите чат слева</div>
            <div style={{ fontSize: '.82rem', opacity: .6 }}>Здесь появятся сообщения клиента</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '13px 20px', borderBottom: border, background: 'rgba(192,71,74,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#c0474a,#8b2e30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#fff' }}><FiUser /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ink,#f0ece8)' }}>Клиент</div>
                <div style={{ fontSize: '.72rem', color: 'var(--ink-3,#888)', fontFamily: 'monospace' }}>{active}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {msgs.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-3,#888)', fontSize: '.85rem', marginTop: '32px' }}>Нет сообщений</div>
              )}
              {msgs.map(m => (
                <AdminBubble key={m.id} m={m} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: border, display: 'flex', gap: '8px', flexShrink: 0 }}>
              <textarea
                value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
                placeholder="Ответить клиенту... (Enter — отправить, Shift+Enter — перенос)"
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: '1.5px solid var(--border,#3d3830)',
                  borderRadius: '10px', padding: '9px 14px',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--ink,#f0ece8)',
                  fontSize: '.88rem', fontFamily: 'inherit', outline: 'none',
                  maxHeight: '100px', overflowY: 'auto', lineHeight: 1.5,
                  transition: 'border-color .2s',
                }}
                onFocus={e => e.target.style.borderColor = '#c0474a'}
                onBlur={e => e.target.style.borderColor = 'var(--border,#3d3830)'}
              />
              <button onClick={send} disabled={!text.trim() || !connected} style={{
                background: text.trim() && connected ? 'linear-gradient(135deg,#c0474a,#8b2e30)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '10px', color: text.trim() && connected ? '#fff' : '#666',
                padding: '0 18px', cursor: text.trim() && connected ? 'pointer' : 'not-allowed',
                fontSize: '18px', transition: 'all .2s', flexShrink: 0,
              }}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
