import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Calendar, TrendingDown, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';

interface RolloverNotificationProps {
  visible: boolean;
  targetLex: number;
  newBalance: number;
  onClose: () => void;
}

export function RolloverNotification({
  visible,
  targetLex,
  newBalance,
  onClose,
}: RolloverNotificationProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[glassEffect.containerLarge, styles.container]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Calendar color={colors.primary} size={28} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>新しい日が始まりました</Text>
          <Text style={styles.description}>
            本日のノルマが計算されました
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>今日の目標</Text>
              <Text style={[styles.detailValue, { color: colors.warning }]}>
                -{targetLex} Lex
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>新しい残高</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: newBalance >= 0 ? colors.success : colors.error },
                ]}
              >
                {newBalance >= 0 ? '+' : ''}{newBalance} Lex
              </Text>
            </View>
          </View>

          {newBalance < 0 && (
            <View style={styles.warningBox}>
              <TrendingDown color={colors.error} size={16} />
              <Text style={styles.warningText}>
                残高がマイナスです。今日のクエストをこなして回復させましょう
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>始める</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  detailsContainer: {
    backgroundColor: colors.surface + '40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
