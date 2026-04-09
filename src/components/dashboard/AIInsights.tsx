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
              border: insight.severity === 'high' ? '1.5px solid var(--red)' : '1px solid var(--border)',
              background: insight.severity === 'high' ? 'var(--red-soft)' : 'var(--bg-card)',
            }}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginTop: '-0.125rem' }}>
              {insight.icon || '💡'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-heading" style={{
                fontSize: '0.875rem',
                color: insight.severity === 'high' ? 'var(--red)' : 'var(--text-0)',
                marginBottom: '0.125rem',
              }}>
                {insight.title}
              </p>
              <p className="text-regular" style={{
                fontSize: '0.75rem',
                color: insight.severity === 'high' ? 'var(--text-0)' : 'var(--text-2)',
                margin: 0,
                lineHeight: 1.45,
                opacity: 0.9,
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
