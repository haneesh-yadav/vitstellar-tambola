import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Keep-alive ping
setInterval(() => {
  console.log('keepalive');
}, 1000 * 60 * 4); // every 4 minutes