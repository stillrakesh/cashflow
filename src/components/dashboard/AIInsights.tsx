import React from 'react';
import type { AIInsight } from '../../types';

interface AIInsightsProps {
  insights: AIInsight[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  if (!insights.length) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <p className="section-label">insights</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {insights.slice(0, 4).map((insight, i) => (
          <div
            key={insight.id}
            className="card animate-in"
            style={{
              padding: '0.875rem 1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              animationDelay: `${i * 60}ms`,
              opacity: 0,
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '0.125rem' }}>
              {insight.icon || '💡'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-0)',
                marginBottom: '0.25rem',
                lineHeight: 1.3,
              }}>
                {insight.title}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-2)',
                margin: 0,
                lineHeight: 1.45,
              }}>
                {insight.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsights;
