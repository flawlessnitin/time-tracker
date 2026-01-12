import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { calendarApi } from '../utils/api';
import { formatDuration, formatTime } from '@time-tracker/shared';
import type { ApiResponse, ContributionData, DailyStats, TimerSessionResponse } from '@time-tracker/shared';
import ContributionGraph from '../components/ContributionGraph/ContributionGraph';
import './Calendar.css';

export default function Calendar() {
  const { token } = useAuth();
  const [contributions, setContributions] = useState<ContributionData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<Record<string, DailyStats>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DailyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContributions();
  }, []);

  useEffect(() => {
    loadMonthlyData();
  }, [currentMonth]);

  const loadContributions = async () => {
    if (!token) return;

    try {
      const res = await calendarApi.getContributions(token) as ApiResponse<ContributionData>;
      if (res.success && res.data) {
        setContributions(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load contributions:', err);
    }
  };

  const loadMonthlyData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const res = await calendarApi.getMonthly(token, year, month) as ApiResponse<Record<string, DailyStats>>;
      if (res.success && res.data) {
        setMonthlyData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = async (date: string) => {
    if (!token) return;
    setSelectedDate(date);

    try {
      const res = await calendarApi.getDaily(token, date) as ApiResponse<DailyStats>;
      if (res.success && res.data) {
        setSelectedDayData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load day data:', err);
    }
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getIntensityClass = (duration: number) => {
    if (duration === 0) return 'intensity-0';
    if (duration < 1800) return 'intensity-1'; // < 30 min
    if (duration < 3600) return 'intensity-2'; // < 1 hour
    if (duration < 7200) return 'intensity-3'; // < 2 hours
    return 'intensity-4'; // 2+ hours
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = formatDateKey(new Date());

  return (
    <div className="calendar-page">
      {/* Contribution Graph Section */}
      <section className="contribution-section">
        <h2>
          <span className="section-icon">🌳</span>
          Your Productivity Forest
        </h2>
        {contributions && (
          <>
            <div className="contribution-stats">
              <div className="stat-card">
                <div className="stat-value">{contributions.totalSessions}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{formatDuration(contributions.totalDuration)}</div>
                <div className="stat-label">Total Time</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {contributions.days.filter(d => d.count > 0).length}
                </div>
                <div className="stat-label">Active Days</div>
              </div>
            </div>
            <ContributionGraph data={contributions} />
          </>
        )}
      </section>

      {/* Calendar Section */}
      <section className="calendar-section">
        <div className="calendar-header">
          <h2>
            <span className="section-icon">📅</span>
            Monthly Overview
          </h2>
          <div className="calendar-nav">
            <button className="nav-btn" onClick={() => navigateMonth(-1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="current-month">{monthName}</span>
            <button className="nav-btn" onClick={() => navigateMonth(1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {error && <div className="calendar-error">{error}</div>}

        {isLoading ? (
          <div className="calendar-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="calendar-grid-container">
            <div className="calendar-grid">
              <div className="weekday-header">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>
              <div className="days-grid">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="day-cell empty"></div>;
                  }

                  const dateKey = formatDateKey(day);
                  const dayData = monthlyData[dateKey];
                  const duration = dayData?.totalDuration || 0;
                  const isToday = dateKey === today;
                  const isSelected = dateKey === selectedDate;

                  return (
                    <button
                      key={dateKey}
                      className={`day-cell ${getIntensityClass(duration)} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleDateClick(dateKey)}
                    >
                      <span className="day-number">{day.getDate()}</span>
                      {duration > 0 && (
                        <span className="day-duration">{formatDuration(duration)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details */}
            <div className="day-details">
              {selectedDayData ? (
                <>
                  <h3>{new Date(selectedDayData.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}</h3>
                  <div className="day-total">
                    <span className="day-total-label">Total Time</span>
                    <span className="day-total-value">{formatDuration(selectedDayData.totalDuration)}</span>
                  </div>
                  {selectedDayData.sessions.length > 0 ? (
                    <div className="day-sessions">
                      <h4>Sessions</h4>
                      {selectedDayData.sessions.map(session => (
                        <div key={session.id} className="day-session">
                          <div className="session-time">
                            {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Active'}
                          </div>
                          <div className="session-dur">
                            {session.duration ? formatDuration(session.duration) : '--'}
                          </div>
                          {session.notes && (
                            <div className="session-note">{session.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No sessions on this day</p>
                  )}
                </>
              ) : (
                <div className="no-selection">
                  <div className="no-selection-icon">📊</div>
                  <p>Select a date to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
