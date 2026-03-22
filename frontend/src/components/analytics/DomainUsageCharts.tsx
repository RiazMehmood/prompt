/**
 * Domain Usage chart components.
 * - Bar chart: document generations per domain
 * - Table: active users per domain
 */
'use client';

import React from 'react';

export interface DomainStat {
  domain_id: string;
  domain_name: string;
  generation_count: number;
  active_user_count: number;
  knowledge_base_size: number; // number of vector chunks
}

interface Props {
  data: DomainStat[];
}

const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316',
];

/**
 * Vertical bar chart: document generations per domain.
 */
export function DomainGenerationsChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-400 text-sm">
        No domain usage data for the selected period.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.generation_count), 1);

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Generations per Domain</h3>
      <div className="flex items-end gap-2 h-36 border-b border-gray-200 pb-1">
        {data.map((domain, idx) => {
          const heightPct = (domain.generation_count / maxCount) * 100;
          const color = BAR_COLORS[idx % BAR_COLORS.length];
          return (
            <div
              key={domain.domain_id}
              className="flex flex-col items-center flex-1 group"
              title={`${domain.domain_name}: ${domain.generation_count} generations`}
            >
              <span className="text-xs text-gray-500 mb-1 hidden group-hover:block">
                {domain.generation_count}
              </span>
              <div
                className="w-full rounded-t transition-all"
                style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {data.map((domain, idx) => (
          <span key={domain.domain_id} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
            />
            {domain.domain_name}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Table showing active users and knowledge base size per domain.
 */
export function DomainUsageTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
        No domain data available.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain Details</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="pb-2 pr-4">Domain</th>
            <th className="pb-2 pr-4 text-right">Active Users</th>
            <th className="pb-2 pr-4 text-right">Generations</th>
            <th className="pb-2 text-right">KB Chunks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((domain) => (
            <tr key={domain.domain_id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium text-gray-800">{domain.domain_name}</td>
              <td className="py-2 pr-4 text-right text-gray-600">{domain.active_user_count}</td>
              <td className="py-2 pr-4 text-right text-gray-600">{domain.generation_count}</td>
              <td className="py-2 text-right text-gray-600">
                {domain.knowledge_base_size.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
