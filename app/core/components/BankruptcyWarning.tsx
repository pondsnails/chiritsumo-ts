import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle, X, Zap, Gift, TrendingUp } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import type { BankruptcyResult } from '../logic/bankruptcyLogic';

interface BankruptcyWarningProps {
  visible: boolean;
  result: BankruptcyResult;
  onClose: () => void;
  onApplyRescue?: (rescueType: string) => void;
}

export function BankruptcyWarning({
  visible,
  result,
  onClose,
  onApplyRescue,
}: BankruptcyWarningProps) {
  if (!result.isInDebt) return null;

  const getDebtLevelColor = () => {
    switch (result.debtLevel) {
      case 3: return colors.error;
      case 2: return colors.warning;
      case 1: return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getDebtLevelText = () => {
    switch (result.debtLevel) {
      case 3: return '重度の借金（ボーナス3倍！）';
      case 2: return '中程度の借金（ボーナス2倍！）';
      case 1: return '軽度の借金（ボーナス1.5倍）';
      default: return '正常';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[glassEffect.containerLarge, styles.container]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Zap color={colors.primary} size={32} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>返済チャンス！</Text>
          <Text style={styles.description}>
            借金状態ですが、学習でボーナスLexを獲得できます！
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>現在の状態</Text>
              <Text style={[styles.detailValue, { color: getDebtLevelColor() }]}>
                {getDebtLevelText()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>借金額</Text>
              <Text style={[styles.detailValue, { color: colors.error }]}>
                {result.deficit} Lex
              </Text>
            </View>
          </View>

          {result.bonusQuests.length > 0 && (
            <View style={styles.bonusBox}>
              <View style={styles.bonusHeader}>
                <TrendingUp color={colors.success} size={20} />
                <Text style={styles.bonusTitle}>ボーナスクエスト</Text>
              </View>
              {result.bonusQuests.map((quest: string, index: number) => (
                <View key={index} style={styles.bonusRow}>
                  <Text style={styles.bonusBullet}>✨</Text>
                  <Text style={styles.bonusText}>{quest}</Text>
                </View>
              ))}
            </View>
          )}

          {result.rescueOptions.length > 0 && (
            <View style={styles.rescueBox}>
              <View style={styles.rescueHeader}>
                <Gift color={colors.primary} size={20} />
                <Text style={styles.rescueTitle}>救済オプション</Text>
              </View>
              {result.rescueOptions.map((option: string, index: number) => (
                <View key={index} style={styles.rescueRow}>
                  <Text style={styles.rescueBullet}>🎁</Text>
                  <Text style={styles.rescueText}>{option}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsText}>
              💡 学習を続けることで自動的に借金が減っていきます
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={onClose}
          >
            <Text style={styles.confirmButtonText}>学習で返済する！</Text>
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
    maxWidth: 500,
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
    backgroundColor: colors.error + '20',
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
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bonusBox: {
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bonusBullet: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  bonusText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  rescueBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rescueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rescueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  rescueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rescueBullet: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  rescueText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  tipsBox: {
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    marginBottom: 24,
  },
  tipsText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
