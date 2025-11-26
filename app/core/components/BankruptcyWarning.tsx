import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle, X, TrendingDown } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import type { BankruptcyResult } from '../logic/bankruptcyLogic';

interface BankruptcyWarningProps {
  visible: boolean;
  result: BankruptcyResult;
  onClose: () => void;
  onConfirm: () => void;
}

export function BankruptcyWarning({
  visible,
  result,
  onClose,
  onConfirm,
}: BankruptcyWarningProps) {
  if (!result.isBankrupt) return null;

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
            <View style={styles.iconContainer}>
              <AlertTriangle color={colors.error} size={32} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>破産警告</Text>
          <Text style={styles.description}>
            LEX残高が不足しています。自動的にカードが売却され、進捗がリセットされます。
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>現在の不足額</Text>
              <Text style={[styles.detailValue, { color: colors.error }]}>
                {result.deficit} Lex
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>売却されるカード数</Text>
              <Text style={styles.detailValue}>
                {result.cardsToReset.length}枚
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>回収予定額</Text>
              <Text style={[styles.detailValue, { color: colors.warning }]}>
                +{result.estimatedRecovery} Lex
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ペナルティ</Text>
              <Text style={[styles.detailValue, { color: colors.error }]}>
                -{Math.floor(result.deficit * 0.5)} Lex
              </Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <TrendingDown color={colors.error} size={16} />
            <Text style={styles.warningText}>
              売却後もLEXが不足する場合、追加のペナルティが課せられます
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>実行</Text>
            </TouchableOpacity>
          </View>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
