import { FiMessageCircle, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { LuFlower } from 'react-icons/lu';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

function getSessionId() {
  let id = localStorage.getItem('fl_chat_session');
  if (!id) { 
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now(); 
    localStorage.setItem('fl_chat_session', id); 
  }
  return id;
}

const T_MAP = {
  ru: { title: 'Поддержка', placeholder: 'Напишите сообщение...', welcome: 'Привет! Чем можем помочь?', connecting: 'Подключение...', online: 'Онлайн', edit: 'Редактировать', delete: 'Удалить', edited: 'изм.', deleted: 'Сообщение удалено', save: 'Сохранить', cancel: 'Отмена' },
  en: { title: 'Support', placeholder: 'Type a message...', welcome: 'Hi! How can we help?', connecting: 'Connecting...', online: 'Online', edit: 'Edit', delete: 'Delete', edited: 'edited', deleted: 'Message deleted', save: 'Save', cancel: 'Cancel' },
  hy: { title: 'Աջակցություն', placeholder: 'Գրեք հաղորդագրություն...', welcome: 'Բարև! Ինչպե՞ս կարող ենք օգնել։', connecting: 'Միանում է...', online: 'Առցանց', edit: 'Խմբ.', delete: 'Ջնջ.', edited: 'փոփ.', deleted: 'Ջնջված է', save: 'Պահ.', cancel: 'Չեղ.' },
};

function Bubble({ m, own, onEdit, onDelete, T }) {
  const [hover, setHover]   = useState(false);
  const [editing, setEdit]  = useState(false);
  const [val, setVal]       = useState(m.text);

  if (m.deleted) return (
    <div style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start' }}>
      <div style={{ fontSize: '.75rem', color: '#aaa', fontStyle: 'italic', padding: '4px 10px', border: '1px dashed #ccc', borderRadius: '10px' }}>{T.deleted}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', position: 'relative' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ maxWidth: '80%', position: 'relative' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '200px' }}>
            <textarea autoFocus rows={2} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEdit(m.id, val); setEdit(false); }
                if (e.key === 'Escape') { setEdit(false); setVal(m.text); }
              }}
              style={{ resize: 'none', border: '1.5px solid #c0474a', borderRadius: '10px', padding: '8px 10px', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none', background: 'var(--bg-subtle,#f5f5f5)', color: 'var(--text-primary,#1a1a1a)', width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
              <button onClick={() => { onEdit(m.id, val); setEdit(false); }} style={{ padding: '3px 10px', background: '#c0474a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '.78rem', cursor: 'pointer' }}>{T.save}</button>
              <button onClick={() => { setEdit(false); setVal(m.text); }} style={{ padding: '3px 8px', background: 'none', border: '1px solid #ccc', borderRadius: '7px', fontSize: '.78rem', cursor: 'pointer', color: 'var(--text-primary,#333)' }}>{T.cancel}</button>
            </div>
          </div>
        ) : (
          <>
            {hover && own && (
              <div style={{ position: 'absolute', top: '-26px', right: 0, display: 'flex', gap: '2px', background: 'rgba(0,0,0,.72)', borderRadius: '8px', padding: '3px 6px', zIndex: 10, whiteSpace: 'nowrap' }}>
                <button onClick={() => setEdit(true)} title={T.edit} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', padding: '1px 3px' }}><FiEdit2 /></button>
                <button onClick={() => onDelete(m.id)} title={T.delete} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '1px 3px' }}><FiTrash2 /></button>
              </div>
            )}
            <div style={{
              background: own ? 'linear-gradient(135deg,#c0474a,#8b2e30)' : 'var(--bg-subtle,#f5f5f5)',
              color: own ? '#fff' : 'var(--text-primary,#1a1a1a)',
              borderRadius: own ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '8px 12px', fontSize: '.88rem', lineHeight: 1.5, wordBreak: 'break-word',
            }}>
              {m.text}
              <div style={{ fontSize: '.68rem', opacity: .6, marginTop: '3px', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {m.edited && <span style={{ fontStyle: 'italic' }}>{T.edited}</span>}
                <span>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LiveChat({ lang = 'ru' }) {
  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState([]);
  const [text, setText]           = useState('');
  const [connected, setConnected] = useState(false);
  const [unread, setUnread]       = useState(0);
  const [error, setError]         = useState(false);
  const socketRef                 = useRef(null);
  const bottomRef                 = useRef(null);
  const sessionId                 = useRef(getSessionId());
  const openRef                   = useRef(false);
  const T                         = T_MAP[lang] || T_MAP.ru;

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    // Один сокет на всё время жизни виджета.
    // cancelled-флаг защищает от двойного монтирования React StrictMode:
    // раньше cleanup срабатывал, пока fetch ещё летел, disconnect не
    // вызывался, и оставались ДВА живых соединения — каждое сообщение
    // приходило дважды.
    let cancelled = false;

    const connectWebSocket = () => {
      if (cancelled || socketRef.current) return;
      const socket = io(API, {
        query: { sessionId: sessionId.current },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(false);
      });

      socket.on('connect_error', (err) => {
        console.error('WebSocket error:', err.message);
        setConnected(false);
        setError(true);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });

      socket.on('chat:history', h => setMsgs(h));
      socket.on('chat:message', msg => {
        // дедупликация по id — одно и то же сообщение не добавится дважды
        setMsgs(p => p.some(m => m.id === msg.id) ? p : [...p, msg]);
        if (msg.from === 'admin' && !openRef.current) setUnread(p => p + 1);
      });
      socket.on('chat:edited', ({ msgId, newText }) =>
        setMsgs(p => p.map(m => m.id === msgId ? { ...m, text: newText, edited: true } : m))
      );
      socket.on('chat:deleted', ({ msgId }) =>
        setMsgs(p => p.map(m => m.id === msgId ? { ...m, deleted: true } : m))
      );
    };

    // Сначала проверяем, что сервер жив, через REST
    (async () => {
      try {
        const res = await fetch(`${API}/api/categories`);
        if (cancelled) return;
        if (res.ok) connectWebSocket();
        else setError(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (open) { 
      setUnread(0); 
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [open, msgs]);

  const send = useCallback(() => {
    if (!text.trim() || !socketRef.current || !connected) {
      console.warn('Cannot send: not connected');
      return;
    }
    socketRef.current.emit('chat:send', { text, from: 'client' });
    setText('');
  }, [text, connected]);

  const handleEdit   = useCallback((msgId, newText) => {
    if (socketRef.current) socketRef.current.emit('chat:edit', { msgId, newText });
  }, []);
  
  const handleDelete = useCallback((msgId) => {
    if (socketRef.current) socketRef.current.emit('chat:delete', { msgId });
  }, []);
  
  const onKey = e => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    } 
  };

  // Если сервер недоступен — показываем кнопку, но чат не работает
  if (error) {
    return (
      <>
        <button onClick={() => setOpen(p => !p)} style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#c0474a,#8b2e30)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(192,71,74,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', transition: 'transform .2s', color: '#fff',
        }}>
          <FiMessageCircle />
        </button>
        {open && (
          <div style={{
            position: 'fixed', bottom: '90px', right: '24px', zIndex: 9998,
            width: '340px', height: '480px', background: 'var(--bg-surface,#fff)',
            borderRadius: '16px', border: '1px solid var(--border,#e8e2df)',
            boxShadow: '0 8px 40px rgba(0,0,0,.18)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ background: 'linear-gradient(135deg,#c0474a,#8b2e30)', padding: '14px 18px', flexShrink: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700 }}>Чат недоступен</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', color: '#888' }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><FiMessageCircle /></div>
                <div>Сервер чата недоступен</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>Запустите бэкенд на порту 5000</div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(p => !p)} style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'linear-gradient(135deg,#c0474a,#8b2e30)',
        border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(192,71,74,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', transition: 'transform .2s', color: '#fff',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <FiX /> : <FiMessageCircle />}
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#e74c3c', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #fff' }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px', zIndex: 9998,
          width: '340px', height: '480px', background: 'var(--bg-surface,#fff)',
          borderRadius: '16px', border: '1px solid var(--border,#e8e2df)',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'chatSlideUp .25s ease',
        }}>
          <div style={{ background: 'linear-gradient(135deg,#c0474a,#8b2e30)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ fontSize: '22px', display: 'flex' }}><LuFlower /></div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.95rem' }}>{T.title}</div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: connected ? '#4caf50' : '#aaa', display: 'inline-block' }} />
                {connected ? T.online : T.connecting}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'var(--bg-subtle,#f5f5f5)', color: 'var(--text-primary,#1a1a1a)', borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '.88rem', maxWidth: '80%', lineHeight: 1.5 }}>{T.welcome}</div>
            </div>
            {msgs.map(m => <Bubble key={m.id} m={m} own={m.from === 'client'} onEdit={handleEdit} onDelete={handleDelete} T={T} />)}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border,#e8e2df)', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <textarea 
              value={text} 
              onChange={e => setText(e.target.value)} 
              onKeyDown={onKey} 
              placeholder={connected ? T.placeholder : 'Подключение...'} 
              rows={1}
              disabled={!connected}
              style={{ 
                flex: 1, resize: 'none', border: '1.5px solid var(--border,#e8e2df)', 
                borderRadius: '10px', padding: '8px 12px', 
                background: 'var(--bg-subtle,#f5f5f5)', color: 'var(--text-primary,#1a1a1a)', 
                fontSize: '.88rem', fontFamily: 'inherit', outline: 'none', 
                maxHeight: '80px', overflowY: 'auto',
                opacity: connected ? 1 : 0.6
              }}
            />
            <button 
              onClick={send} 
              disabled={!text.trim() || !connected} 
              style={{ 
                background: 'linear-gradient(135deg,#c0474a,#8b2e30)', 
                border: 'none', borderRadius: '10px', color: '#fff', 
                padding: '0 14px', cursor: text.trim() && connected ? 'pointer' : 'not-allowed', 
                opacity: text.trim() && connected ? 1 : 0.5, fontSize: '18px' 
              }}>
              ➤
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes chatSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </>
  );
}