import React, { useState, useEffect } from 'react';
import './Ticket.css';

const MAX_WINNERS = {
  topLine: 4,
  middleLine: 4,
  bottomLine: 4,
  corners: 4,
  earlyFive: 5,
  fullHouse: 3,
};

export default function Ticket({ ticket, calledNumbers, onClaim, winners, playerClaims = [], timerActive }) {
  if (!ticket) return null;

  const called = new Set(calledNumbers || []);

  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [openNumbers, setOpenNumbers] = useState(new Set());

  const latestCalled = calledNumbers?.length > 0
    ? calledNumbers[calledNumbers.length - 1]
    : null;

  useEffect(() => {
    if (latestCalled !== null && latestCalled !== undefined) {
      setOpenNumbers(prev => {
        const next = new Set(prev);
        next.add(latestCalled);
        return next;
      });
    }
  }, [latestCalled]);

  useEffect(() => {
    if (!timerActive && latestCalled !== null && latestCalled !== undefined) {
      setOpenNumbers(prev => {
        const next = new Set(prev);
        next.delete(latestCalled);
        return next;
      });
    }
  }, [timerActive, latestCalled]);

  useEffect(() => {
    if (!calledNumbers || calledNumbers.length === 0) {
      setMarkedNumbers(new Set());
      setOpenNumbers(new Set());
    }
  }, [calledNumbers?.length]);

  function handleCellClick(num) {
    if (!called.has(num)) return;
    if (!openNumbers.has(num)) return;
    if (markedNumbers.has(num)) return;

    setMarkedNumbers(prev => {
      const next = new Set(prev);
      next.add(num);
      return next;
    });
  }

  const winTypes = [
    { key: 'topLine', label: 'Top Line', icon: 'looks_one' },
    { key: 'middleLine', label: 'Mid Line', icon: 'looks_two' },
    { key: 'bottomLine', label: 'Bot Line', icon: 'looks_3' },
    { key: 'corners', label: 'Corners', icon: 'crop_square' },
    { key: 'earlyFive', label: 'Early 5', icon: 'filter_5' },
    { key: 'fullHouse', label: 'Full House', icon: 'home' },
  ];

  function checkLocal(type) {
    if (!calledNumbers || calledNumbers.length === 0) return false;
    const rows = ticket;
    const allNums = rows.flat().filter(n => n !== null);
    const ms = markedNumbers;
    switch (type) {
      case 'topLine': return rows[0].filter(n => n !== null).every(n => ms.has(n));
      case 'middleLine': return rows[1].filter(n => n !== null).every(n => ms.has(n));
      case 'bottomLine': return rows[2].filter(n => n !== null).every(n => ms.has(n));
      case 'corners': {
        const top = rows[0].filter(n => n !== null);
        const bot = rows[2].filter(n => n !== null);
        return top.length >= 2 && bot.length >= 2 &&
          ms.has(top[0]) && ms.has(top[top.length - 1]) &&
          ms.has(bot[0]) && ms.has(bot[bot.length - 1]);
      }
      case 'earlyFive': return allNums.filter(n => ms.has(n)).length >= 5;
      case 'fullHouse': return allNums.every(n => ms.has(n));
      default: return false;
    }
  }

  function isCornerCell(row, col) {
    const rowNums = ticket[row];
    const filledCols = rowNums.map((n, i) => n !== null ? i : -1).filter(i => i >= 0);
    if (filledCols.length === 0) return false;
    const firstCol = filledCols[0];
    const lastCol = filledCols[filledCols.length - 1];
    return (row === 0 || row === 2) && (col === firstCol || col === lastCol);
  }

  return (
    <div className="ticket-wrapper">
      {/* Ticket grid */}
      <div className="ticket">
        <div className="ticket-headers">
          {[1,2,3,4,5,6,7,8,9].map((n, i) => (
            <div key={i} className="col-header">{n}</div>
          ))}
        </div>

        {ticket.map((row, rowIdx) => (
          <div key={rowIdx} className="ticket-row">
            {row.map((num, colIdx) => {
              const isNum = num !== null;
              const isCalled = isNum && called.has(num);
              const isOpen = isNum && openNumbers.has(num);
              const isMarked = isNum && markedNumbers.has(num);
              const isMissed = isNum && isCalled && !isOpen && !isMarked;
              const isCorner = isNum && isCornerCell(rowIdx, colIdx);

              let cellClass = `cell ${isNum ? 'cell-num' : 'cell-empty'}`;
              if (isMarked) cellClass += ' cell-marked';
              else if (isOpen) cellClass += ' cell-open';
              else if (isMissed) cellClass += ' cell-missed';
              if (isCorner) cellClass += ' cell-corner';

              return (
                <div
                  key={colIdx}
                  className={cellClass}
                  onClick={() => isNum && handleCellClick(num)}
                >
                  {isNum && (
                    <>
                      <span className="cell-value">{num}</span>
                      {isMarked && <span className="cell-check material-icons">done</span>}
                      {isOpen && !isMarked && <span className="cell-tap-hint material-icons">touch_app</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tap hint banner */}
      {latestCalled && openNumbers.has(latestCalled) && (
        <div className="tap-hint-banner">
          <span className="material-icons">touch_app</span>
          Tap <strong>{latestCalled}</strong> on your ticket if you have it!
        </div>
      )}

      {/* Claim buttons */}
      {onClaim && (
        <div className="claim-section">
          <p className="claim-title">
            <span className="material-icons">emoji_events</span>
            Claim a Win
          </p>
          <div className="claim-buttons">
            {winTypes.map(({ key, label, icon }) => {
              const winnersArray = winners && Array.isArray(winners[key]) ? winners[key] : [];
              const isFull = winnersArray.length >= MAX_WINNERS[key];
              const isMyClaim = playerClaims.includes(key);
              const isReady = checkLocal(key);
              const isDisabled = isFull || isMyClaim;

              return (
                <button
                  key={key}
                  className={`claim-btn ${isFull ? 'claim-btn--won' : ''} ${isMyClaim ? 'claim-btn--mine' : ''} ${isReady && !isDisabled ? 'claim-btn--ready' : ''}`}
                  onClick={() => !isDisabled && onClaim(key)}
                  disabled={isDisabled}
                  title={isFull ? 'All winners found' : isMyClaim ? 'Already claimed' : label}
                >
                  <span className="material-icons">
                    {isMyClaim ? 'verified' : isFull ? 'lock' : icon}
                  </span>
                  <span>{label}</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>
                    {winnersArray.length}/{MAX_WINNERS[key]}
                  </span>
                  {isReady && !isDisabled && <span className="ready-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
