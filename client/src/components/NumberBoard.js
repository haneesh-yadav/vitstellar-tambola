import React from 'react';
import './NumberBoard.css';

export default function NumberBoard({ calledNumbers, currentNumber }) {
  const called = new Set(calledNumbers || []);

  const colGroups = [
    { label: '1–9', nums: Array.from({ length: 9 }, (_, i) => i + 1) },
    { label: '10–19', nums: Array.from({ length: 10 }, (_, i) => i + 10) },
    { label: '20–29', nums: Array.from({ length: 10 }, (_, i) => i + 20) },
    { label: '30–39', nums: Array.from({ length: 10 }, (_, i) => i + 30) },
    { label: '40–49', nums: Array.from({ length: 10 }, (_, i) => i + 40) },
    { label: '50–59', nums: Array.from({ length: 10 }, (_, i) => i + 50) },
    { label: '60–69', nums: Array.from({ length: 10 }, (_, i) => i + 60) },
    { label: '70–79', nums: Array.from({ length: 10 }, (_, i) => i + 70) },
    { label: '80–90', nums: Array.from({ length: 11 }, (_, i) => i + 80) },
  ];

  return (
    <div className="numboard">
      <div className="numboard-grid">
        {colGroups.map((group) => (
          <div key={group.label} className="numboard-col">
            {group.nums.map(n => (
              <div
                key={n}
                className={`numball ${called.has(n) ? 'numball--called' : ''} ${n === currentNumber ? 'numball--current' : ''}`}
              >
                {n}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
