import React, { useEffect, useState } from 'react';
import './WinnerBanner.css';

const WIN_LABELS = {
  topLine: 'Top Line',
  middleLine: 'Middle Line',
  bottomLine: 'Bottom Line',
  corners: 'Four Corners',
  earlyFive: 'Early Five',
  fullHouse: '🏠 FULL HOUSE',
};

export default function WinnerBanner({ event, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);
    return () => clearTimeout(t);
  }, [event, onClose]);

  if (!event) return null;

  const isFullHouse = event.type === 'fullHouse';

  return (
    <div className={`winner-overlay ${visible ? 'visible' : ''}`}>
      <div className="winner-confetti">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              background: ['#f5c842', '#7c6fcd', '#4caf82', '#e05c6b', '#5b9cf6'][i % 5],
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
            }}
          />
        ))}
      </div>

      <div className={`winner-card ${isFullHouse ? 'winner-card--fullhouse' : ''}`}>
        <div className="winner-icon">
          {isFullHouse ? '🏆' : '🎉'}
        </div>
        <div className="winner-type">{WIN_LABELS[event.type] || event.type}</div>
        <div className="winner-name">{event.player?.name}</div>
        <p className="winner-sub">Congratulations!</p>
        <button className="btn btn-gold btn-sm" onClick={() => { setVisible(false); setTimeout(onClose, 400); }}>
          Continue
        </button>
      </div>
    </div>
  );
}
