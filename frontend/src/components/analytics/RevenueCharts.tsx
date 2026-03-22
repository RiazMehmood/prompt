/**
 * Revenue & Subscription chart components — CSS-only bar charts (no external chart library).
 * Displays: revenue trend line chart (simulated with bars) and subscription tier distribution.
 */
'use client';

import React from 'react';

export interface RevenueTrendPoint {
  date: string;   // 'YYYY-MM-DD'
  revenue: number;
}

export interface TierDistribution {
  tier: string;
  user_count: number;
  pct: number;
}

interface RevenueTrendProps {
  data: RevenueTrendPoint[];
  currency?: string;
}

interface TierPieProps {
  data: TierDistribution[];
}

const TIER_COLORS: Record<string, string> = {
  basic: '#6b7280',
  pro: '#3b82f6',
  premium: '#8b5cf6',
  institutional: '#10b981',
};

function formatCurrency(amount: number, currency = 'PKR'): string {
  if (currency === 'PKR') return `PKR ${amount.toLocaleString('en-PK')}`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Bar chart approximating a revenue trend over time.
 * Each bar height is proportional to the max value in the dataset.
 */
export function RevenueTrendChart({ data, currency = 'PKR' }: RevenueTrendProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No revenue data for the selected period.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue Trend</h3>
      <div className="flex items-end gap-1 h-40 border-b border-gray-200 pb-1">
        {data.map((point) => {
          const heightPct = (point.revenue / maxRevenue) * 100;
          return (
            <div
              key={point.date}
              className="flex flex-col items-center flex-1 group"
              title={`${point.date}: ${formatCurrency(point.revenue, currency)}`}
            >
              <div
                className="w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-600"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels — show first, middle, last */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{data[0]?.date?.slice(5)}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>}
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">
        Total: {formatCurrency(data.reduce((s, d) => s + d.revenue, 0), currency)}
      </p>
    </div>
  );
}

/**
 * Horizontal bar chart showing distribution of users across subscription tiers.
 */
export function TierDistributionChart({ data }: TierPieProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
        No subscription data available.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.user_count, 0);

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Tier Distribution</h3>
      <div className="space-y-2">
        {data.map((tier) => {
          const color = TIER_COLORS[tier.tier] ?? '#9ca3af';
          const pct = total > 0 ? (tier.user_count / total) * 100 : 0;
          return (
            <div key={tier.tier} className="flex items-center gap-2">
              <span className="w-24 text-xs text-gray-600 capitalize">{tier.tier}</span>
              <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-16 text-xs text-gray-500 text-right">
                {tier.user_count} ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">Total users: {total}</p>
    </div>
  );
}
