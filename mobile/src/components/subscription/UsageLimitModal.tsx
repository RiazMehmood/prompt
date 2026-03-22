import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

interface Props {
  visible: boolean;
  limitType: string;
  message: string;
  currentTier: string;
  onDismiss: () => void;
}

const LIMIT_ICONS: Record<string, string> = {
  doc_generations: '📄',
  uploads: '📁',
  conversations: '💬',
};

export default function UsageLimitModal({
  visible,
  limitType,
  message,
  currentTier,
  onDismiss,
}: Props) {
  const router = useRouter();

  const handleUpgrade = () => {
    onDismiss();
    router.push('/(tabs)/subscription');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>{LIMIT_ICONS[limitType] ?? '🚫'}</Text>
          <Text style={styles.title}>Daily Limit Reached</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.tierInfo}>
            <Text style={styles.tierLabel}>Current Plan</Text>
            <Text style={styles.tierValue}>{currentTier}</Text>
          </View>

          {/* Upgrade CTA — disabled with Coming Soon */}
          <View style={styles.upgradeRow}>
            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
              <Text style={styles.upgradeBtnText}>View Plans</Text>
            </TouchableOpacity>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Paid plans coming soon</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Continue Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  tierInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  tierLabel: { fontSize: 13, color: '#6b7280' },
  tierValue: { fontSize: 13, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  upgradeRow: { width: '100%', marginBottom: 10 },
  upgradeBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  comingSoonBadge: { alignItems: 'center' },
  comingSoonText: { fontSize: 11, color: '#9ca3af' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14, color: '#6b7280' },
});
