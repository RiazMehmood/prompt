import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { apiClient } from '../../../lib/api-client';

interface TierFeature {
  name: string;
  included: boolean;
}

interface TierDetail {
  tier: string;
  display_name: string;
  price_pkr_monthly: number | null;
  limits: {
    doc_generations_per_day: number;
    uploads_per_day: number;
    conversation_messages_per_day: number;
  };
  features: TierFeature[];
  is_available: boolean;
  highlight: boolean;
}

interface SubscriptionDetail {
  tier: string;
  limits: {
    doc_generations_per_day: number;
    uploads_per_day: number;
    conversation_messages_per_day: number;
  };
  docs_generated_today: number;
  uploads_today: number;
  conversations_today: number;
  docs_remaining: number;
  uploads_remaining: number;
  conversations_remaining: number;
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = Math.min((used / total) * 100, 100);
  const isLow = pct >= 80;
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageLabelRow}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, isLow && styles.usageCountLow]}>
          {used} / {total}
        </Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%` as any },
            isLow ? styles.barFillLow : styles.barFillOk,
          ]}
        />
      </View>
    </View>
  );
}

export default function SubscriptionScreen() {
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [tiers, setTiers] = useState<TierDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [subData, tierData] = await Promise.all([
        apiClient.get<SubscriptionDetail>('/subscriptions/current'),
        apiClient.get<TierDetail[]>('/subscriptions/tiers'),
      ]);
      setSub(subData);
      setTiers(tierData);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Subscription</Text>

      {/* Current plan */}
      {sub && (
        <View style={styles.currentPlan}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>
              {tiers.find((t) => t.tier === sub.tier)?.display_name ?? sub.tier}
            </Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>

          <Text style={styles.usageTitle}>Today's Usage</Text>
          <UsageBar
            used={sub.docs_generated_today}
            total={sub.limits.doc_generations_per_day}
            label="Document Generations"
          />
          <UsageBar
            used={sub.uploads_today}
            total={sub.limits.uploads_per_day}
            label="Document Uploads"
          />
          <UsageBar
            used={sub.conversations_today}
            total={sub.limits.conversation_messages_per_day}
            label="Conversations"
          />
          <Text style={styles.resetNote}>Resets at midnight UTC</Text>
        </View>
      )}

      {/* Tier comparison */}
      <Text style={styles.sectionTitle}>Available Plans</Text>
      {tiers.map((tier) => (
        <View
          key={tier.tier}
          style={[
            styles.tierCard,
            tier.highlight && styles.tierCardHighlight,
            sub?.tier === tier.tier && styles.tierCardActive,
          ]}
        >
          {tier.highlight && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}

          <View style={styles.tierHeader}>
            <Text style={styles.tierName}>{tier.display_name}</Text>
            <Text style={styles.tierPrice}>
              {tier.price_pkr_monthly == null
                ? 'Free'
                : `PKR ${tier.price_pkr_monthly.toLocaleString()}/mo`}
            </Text>
          </View>

          <View style={styles.tierFeatures}>
            {tier.features.map((f, i) => (
              <Text
                key={i}
                style={[styles.featureItem, !f.included && styles.featureExcluded]}
              >
                {f.included ? '✓' : '×'} {f.name}
              </Text>
            ))}
          </View>

          {sub?.tier === tier.tier ? (
            <View style={styles.currentPlanBtn}>
              <Text style={styles.currentPlanBtnText}>Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, !tier.is_available && styles.upgradeBtnDisabled]}
              disabled={!tier.is_available}
            >
              <Text style={[styles.upgradeBtnText, !tier.is_available && styles.upgradeBtnTextDisabled]}>
                {tier.is_available ? 'Upgrade' : 'Coming Soon'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14 },
  currentPlan: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { color: '#166534', fontWeight: '600', fontSize: 12 },
  usageTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  usageRow: { marginBottom: 10 },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  usageLabel: { fontSize: 12, color: '#6b7280' },
  usageCount: { fontSize: 12, fontWeight: '600', color: '#374151' },
  usageCountLow: { color: '#dc2626' },
  barBg: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 },
  barFill: { height: '100%', borderRadius: 3 },
  barFillOk: { backgroundColor: '#22c55e' },
  barFillLow: { backgroundColor: '#ef4444' },
  resetNote: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  tierCardHighlight: { borderColor: '#6366f1' },
  tierCardActive: { borderColor: '#22c55e' },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#6366f1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recommendedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tierName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tierPrice: { fontSize: 14, fontWeight: '600', color: '#374151' },
  tierFeatures: { marginBottom: 14, gap: 4 },
  featureItem: { fontSize: 13, color: '#374151', lineHeight: 22 },
  featureExcluded: { color: '#9ca3af' },
  upgradeBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnDisabled: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  upgradeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  upgradeBtnTextDisabled: { color: '#9ca3af' },
  currentPlanBtn: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  currentPlanBtnText: { color: '#166534', fontWeight: '600', fontSize: 14 },
});
