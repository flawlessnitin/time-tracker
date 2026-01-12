import { useState } from 'react';
import type { ContributionData, ContributionDay } from '@time-tracker/shared';
import { formatDuration } from '@time-tracker/shared';
import './ContributionGraph.css';

interface Props {
  data: ContributionData;
}

export default function ContributionGraph({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  // Group days by week
  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  // Get the day of week for the first day
  if (data.days.length > 0) {
    const firstDate = new Date(data.days[0].date);
    const startPadding = firstDate.getDay();

    // Add empty padding for days before the start
    for (let i = 0; i < startPadding; i++) {
      currentWeek.push({
        date: '',
        count: -1, // Marker for empty
        duration: 0,
        level: 0,
      });
    }
  }

  data.days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Push remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const handleMouseEnter = (day: ContributionDay, event: React.MouseEvent) => {
    if (day.count < 0) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const months = getMonthLabels(data.days);

  return (
    <div className="contribution-graph">
      <div className="graph-container">
        <div className="month-labels">
          {months.map((month, i) => (
            <span
              key={i}
              className="month-label"
              style={{ gridColumnStart: month.weekIndex + 1 }}
            >
              {month.name}
            </span>
          ))}
        </div>

        <div className="graph-body">
          <div className="day-labels">
            <span></span>
            <span>Mon</span>
            <span></span>
            <span>Wed</span>
            <span></span>
            <span>Fri</span>
            <span></span>
          </div>

          <div className="weeks-grid">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="week">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`contribution-cell level-${day.count < 0 ? 'empty' : day.level}`}
                    onMouseEnter={(e) => handleMouseEnter(day, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="graph-legend">
        <span className="legend-label">Less</span>
        <div className="legend-cells">
          <div className="contribution-cell level-0"></div>
          <div className="contribution-cell level-1"></div>
          <div className="contribution-cell level-2"></div>
          <div className="contribution-cell level-3"></div>
          <div className="contribution-cell level-4"></div>
        </div>
        <span className="legend-label">More</span>
      </div>

      {tooltip && tooltip.day.count >= 0 && (
        <div
          className="contribution-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <strong>
            {tooltip.day.count} session{tooltip.day.count !== 1 ? 's' : ''}
          </strong>
          <span>{formatDuration(tooltip.day.duration)}</span>
          <span className="tooltip-date">
            {new Date(tooltip.day.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}

function getMonthLabels(days: ContributionDay[]) {
  const months: { name: string; weekIndex: number }[] = [];
  let currentMonth = -1;
  let weekIndex = 0;

  // Get the starting day of week
  if (days.length > 0) {
    const firstDate = new Date(days[0].date);
    weekIndex = 0;
    let dayInWeek = firstDate.getDay();

    days.forEach((day) => {
      const date = new Date(day.date);
      const month = date.getMonth();

      if (month !== currentMonth) {
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push({ name: monthName, weekIndex });
        currentMonth = month;
      }

      dayInWeek++;
      if (dayInWeek === 7) {
        dayInWeek = 0;
        weekIndex++;
      }
    });
  }

  return months;
}
