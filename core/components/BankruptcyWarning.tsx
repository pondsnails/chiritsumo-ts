import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle, X, Zap, Gift, TrendingUp } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import { checkBankruptcyStatus, getDebtBonusMultiplier, applyDebtForgiveness } from '../logic/bankruptcyLogic';
// 型簡素化: BankruptcyStatus を直接利用
import type { BankruptcyStatus } from '../logic/bankruptcyLogic';

interface BankruptcyWarningProps {
  visible: boolean;
  balance: number; // 現在Lex残高
  isProUser: boolean;
  onClose: () => void;
  onExecuteBankruptcy?: () => void;
  onForgiveDebt?: (newDeficit: number, cost: number) => void;
}

export function BankruptcyWarning({
  visible,
  balance,
  isProUser,
  onClose,
  onExecuteBankruptcy,
  onForgiveDebt,
}: BankruptcyWarningProps) {
  const result: BankruptcyStatus = checkBankruptcyStatus(balance, isProUser);
  if (!result.isInDebt) return null;

  const multiplier = getDebtBonusMultiplier(result.warningLevel);
  const levelColor = result.warningLevel === 3
    ? colors.error
    : result.warningLevel === 2
      ? colors.warning
      : result.warningLevel === 1
        ? colors.primary
        : colors.textSecondary;
  const levelText = result.warningLevel === 3
    ? '重度の借金'
    : result.warningLevel === 2
      ? '中程度の借金'
      : result.warningLevel === 1
        ? '軽度の借金'
        : '正常';

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

          <Text style={styles.title}>借金ステータス</Text>
          <Text style={styles.description}>
            {result.message}
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>状態</Text>
              <Text style={[styles.detailValue, { color: levelColor }]}>{levelText}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>借金額</Text>
              <Text style={[styles.detailValue, { color: colors.error }]}>{result.deficit} Lex</Text>
            </View>
            {result.warningLevel > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ボーナス倍率</Text>
                <Text style={[styles.detailValue, { color: colors.success }]}>x{multiplier.toFixed(1)}</Text>
              </View>
            )}
          </View>
          {/* 破産ボタンは廃止（機能制限に変更したため） */}
          {result.isFunctionLocked && onExecuteBankruptcy && (
            <TouchableOpacity style={[styles.button, styles.bankruptcyButton]} onPress={onExecuteBankruptcy}>
              <Text style={styles.bankruptcyText}>破産して再スタート（廃止予定）</Text>
            </TouchableOpacity>
          )}
          {onForgiveDebt && result.isInDebt && !result.isFunctionLocked && (
            <TouchableOpacity
              style={[styles.button, styles.forgiveButton]}
              onPress={() => {
                const { cost, newDeficit } = applyDebtForgiveness(result.deficit, result.warningLevel);
                onForgiveDebt(newDeficit, cost);
              }}
            >
              <Text style={styles.forgiveText}>徳政令を適用して軽減</Text>
            </TouchableOpacity>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsText}>
              💡 学習を続けることで自動的に借金が減っていきます
            </Text>
          </View>

          <TouchableOpacity style={[styles.button, styles.closeBtn]} onPress={onClose}>
            <Text style={styles.closeText}>閉じる</Text>
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
  bankruptcyButton: {
    backgroundColor: colors.error,
    marginBottom: 12,
  },
  bankruptcyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  forgiveButton: {
    backgroundColor: colors.warning,
    marginBottom: 12,
  },
  forgiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  closeBtn: {
    backgroundColor: colors.primary,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
