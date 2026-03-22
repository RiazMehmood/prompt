/**
 * Token Performance table component.
 * Displays: token code, discount type/value, redemptions, usage rate, remaining uses, revenue impact.
 */
'use client';

import React from 'react';

export interface TokenStat {
  code: string;
  discount_type: 'percentage' | 'flat_pkr' | 'free_tier_upgrade';
  discount_value: number;
  total_uses: number;
  max_uses: number | null;
  redemption_count: number;
  revenue_impact: number;      // PKR value of discount granted
  expires_at: string | null;
  is_active: boolean;
}

interface Props {
  data: TokenStat[];
  currency?: string;
}

function formatDiscount(type: TokenStat['discount_type'], value: number): string {
  if (type === 'percentage') return `${value}% off`;
  if (type === 'flat_pkr') return `PKR ${value} off`;
  return 'Free tier upgrade';
}

function usageRatePct(stat: TokenStat): number {
  if (stat.max_uses === null) return 0; // unlimited
  if (stat.max_uses === 0) return 100;
  return Math.min((stat.redemption_count / stat.max_uses) * 100, 100);
}

function remainingLabel(stat: TokenStat): string {
  if (stat.max_uses === null) return '∞';
  return String(Math.max(stat.max_uses - stat.redemption_count, 0));
}

export function TokenPerformanceTable({ data, currency = 'PKR' }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
        No promotional tokens found for the selected period.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Token Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="pb-2 pr-4">Code</th>
            <th className="pb-2 pr-4">Discount</th>
            <th className="pb-2 pr-4 text-right">Redemptions</th>
            <th className="pb-2 pr-4">Usage Rate</th>
            <th className="pb-2 pr-4 text-right">Remaining</th>
            <th className="pb-2 pr-4 text-right">Revenue Impact</th>
            <th className="pb-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((token) => {
            const rate = usageRatePct(token);
            return (
              <tr key={token.code} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-4 font-mono font-semibold text-gray-800">{token.code}</td>
                <td className="py-2 pr-4 text-gray-600">
                  {formatDiscount(token.discount_type, token.discount_value)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-600">{token.redemption_count}</td>
                <td className="py-2 pr-4">
                  {token.max_uses === null ? (
                    <span className="text-gray-400 text-xs">unlimited</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden w-20">
                        <div
                          className="h-full rounded bg-blue-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{rate.toFixed(0)}%</span>
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4 text-right text-gray-600">{remainingLabel(token)}</td>
                <td className="py-2 pr-4 text-right text-gray-600">
                  {currency} {token.revenue_impact.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  {token.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <td colSpan={5} className="pt-2 text-xs text-gray-500 font-medium">
              Total revenue impact
            </td>
            <td className="pt-2 text-right text-sm font-semibold text-gray-700">
              {currency} {data.reduce((s, t) => s + t.revenue_impact, 0).toLocaleString()}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
