import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle, X, Lock, BookOpen } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import type { BankruptcyResult } from '../logic/bankruptcyLogic';

interface BankruptcyWarningProps {
  visible: boolean;
  result: BankruptcyResult;
  onClose: () => void;
}

export function BankruptcyWarning({
  visible,
  result,
  onClose,
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
      case 3: return '重度の借金';
      case 2: return '中程度の借金';
      case 1: return '軽度の借金';
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
            <View style={[styles.iconContainer, { backgroundColor: getDebtLevelColor() + '20' }]}>
              {result.debtLevel >= 2 ? (
                <Lock color={getDebtLevelColor()} size={32} />
              ) : (
                <AlertTriangle color={getDebtLevelColor()} size={32} />
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>借金状態</Text>
          <Text style={styles.description}>
            LEX残高がマイナスになっています。学習を続けて返済しましょう！
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>借金レベル</Text>
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

          {result.restrictions.length > 0 && (
            <View style={styles.restrictionsBox}>
              <Text style={styles.restrictionsTitle}>機能制限</Text>
              {result.restrictions.map((restriction, index) => (
                <View key={index} style={styles.restrictionRow}>
                  <Text style={styles.restrictionBullet}>•</Text>
                  <Text style={styles.restrictionText}>{restriction}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.tipsBox}>
            <BookOpen color={colors.primary} size={16} />
            <Text style={styles.tipsText}>
              学習してLexを稼ぎ、借金を返済すると制限が解除されます
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={onClose}
          >
            <Text style={styles.confirmButtonText}>学習を続ける</Text>
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
  restrictionsBox: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  restrictionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 12,
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restrictionBullet: {
    fontSize: 14,
    color: colors.warning,
    marginRight: 8,
    lineHeight: 20,
  },
  restrictionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    marginBottom: 24,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
