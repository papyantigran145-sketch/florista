import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './responsive-styles.css';
import App from './App';
import AdminPanel from './components/AdminPanel';

// Простой роутинг без React Router
// /admin → AdminPanel, всё остальное → App
const isAdmin = window.location.pathname === '/admin';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : <App />}
  </React.StrictMode>
);
