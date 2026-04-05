import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Landing from './pages/Landing';
import Host from './pages/Host';
import Play from './pages/Play';
import './App.css';

const HOST_KEY = 'cosmicwalk2026';

function HostGate() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('host_auth') === HOST_KEY
  );

  function handleUnlock(e) {
    e.preventDefault();
    if (input === HOST_KEY) {
      sessionStorage.setItem('host_auth', HOST_KEY);
      setUnlocked(true);
      setError('');
    } else {
      setError('Invalid access key. Try again.');
      setInput('');
    }
  }

  if (unlocked) return <Host />;

  return (
    <div className="host-gate">
      <div className="host-gate-bg" />
      <div className="host-gate-card animate-fadeUp">
        <div className="host-gate-icon">
          <span className="material-icons">lock</span>
        </div>
        <h2 className="host-gate-title">Host Access</h2>
        <p className="host-gate-sub">Enter your host key to continue</p>

        <form onSubmit={handleUnlock} className="host-gate-form">
          <input
            className={`input ${error ? 'input-error' : ''}`}
            type="password"
            placeholder="Enter access key..."
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            autoFocus
          />
          {error && <p className="host-gate-error">{error}</p>}
          <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }}>
            <span className="material-icons">vpn_key</span>
            Unlock Host Panel
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/host" element={<HostGate />} />
          <Route path="/play" element={<Play />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
