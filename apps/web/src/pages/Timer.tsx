import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { timerApi } from '../utils/api';
import { formatDuration, formatTime, formatDate } from '@time-tracker/shared';
import type { ApiResponse, TimerSessionResponse } from '@time-tracker/shared';
import './Timer.css';

export default function Timer() {
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState<TimerSessionResponse | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notes, setNotes] = useState('');
  const [sessions, setSessions] = useState<TimerSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeSession) {
      startElapsedTimer();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsedTime(0);
    }
  }, [activeSession]);

  const startElapsedTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const updateElapsed = () => {
      if (activeSession) {
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }
    };

    updateElapsed();
    intervalRef.current = setInterval(updateElapsed, 1000);
  };

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const [activeRes, sessionsRes] = await Promise.all([
        timerApi.getActive(token) as Promise<ApiResponse<TimerSessionResponse | null>>,
        timerApi.getSessions(token, 10) as Promise<ApiResponse<TimerSessionResponse[]>>,
      ]);

      if (activeRes.success && activeRes.data) {
        setActiveSession(activeRes.data);
        setNotes(activeRes.data.notes || '');
      }

      if (sessionsRes.success && sessionsRes.data) {
        setSessions(sessionsRes.data.filter(s => s.endTime));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!token) return;
    setError('');

    try {
      const res = await timerApi.start(token, notes) as ApiResponse<TimerSessionResponse>;
      if (res.success && res.data) {
        setActiveSession(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start timer');
    }
  };

  const handleStop = async () => {
    if (!token || !activeSession) return;
    setError('');

    try {
      // Update notes if changed
      if (notes !== activeSession.notes) {
        await timerApi.updateNotes(token, activeSession.id, notes);
      }

      const res = await timerApi.stop(token, activeSession.id) as ApiResponse<TimerSessionResponse>;
      if (res.success && res.data) {
        setSessions(prev => [res.data!, ...prev.slice(0, 9)]);
        setActiveSession(null);
        setNotes('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop timer');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!token) return;

    try {
      await timerApi.deleteSession(token, id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  const time = formatElapsedTime(elapsedTime);

  if (isLoading) {
    return (
      <div className="timer-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading timer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-page">
      <div className="timer-section">
        {error && <div className="timer-error">{error}</div>}

        <div className={`timer-display ${activeSession ? 'active' : ''}`}>
          <div className="timer-ring">
            <svg viewBox="0 0 100 100">
              <circle className="timer-ring-bg" cx="50" cy="50" r="45" />
              {activeSession && (
                <circle
                  className="timer-ring-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  strokeDasharray={`${(elapsedTime % 60) * (283 / 60)} 283`}
                />
              )}
            </svg>
            <div className="timer-content">
              <div className="timer-time">
                <span className="time-segment">{time.hours}</span>
                <span className="time-separator">:</span>
                <span className="time-segment">{time.minutes}</span>
                <span className="time-separator">:</span>
                <span className="time-segment">{time.seconds}</span>
              </div>
              <div className="timer-status">
                {activeSession ? 'Timer Running' : 'Ready to Start'}
              </div>
            </div>
          </div>
        </div>

        <div className="timer-notes">
          <label htmlFor="notes">What are you working on?</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this session..."
            rows={3}
          />
        </div>

        <div className="timer-controls">
          {activeSession ? (
            <button className="timer-btn stop" onClick={handleStop}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Timer
            </button>
          ) : (
            <button className="timer-btn start" onClick={handleStart}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Timer
            </button>
          )}
        </div>
      </div>

      <div className="sessions-section">
        <h2>Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <div className="no-sessions-icon">⏱️</div>
            <p>No sessions yet. Start your first timer!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-card animate-fadeIn">
                <div className="session-header">
                  <div className="session-date">
                    {formatDate(session.startTime)}
                  </div>
                  <button
                    className="session-delete"
                    onClick={() => handleDeleteSession(session.id)}
                    title="Delete session"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
                <div className="session-body">
                  <div className="session-time-range">
                    <span className="session-start">{formatTime(session.startTime)}</span>
                    <span className="session-arrow">→</span>
                    <span className="session-end">{formatTime(session.endTime!)}</span>
                  </div>
                  <div className="session-duration">
                    {formatDuration(session.duration || 0)}
                  </div>
                </div>
                {session.notes && (
                  <div className="session-notes">
                    {session.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
