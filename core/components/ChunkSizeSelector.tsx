import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useSubscriptionStore } from '@core/store/subscriptionStore';

interface ChunkSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  totalUnit?: number; // 総ページ/問題数（カード概算表示用）
  disabled?: boolean; // 既存カードあり等で変更不可
  modeAverageLex?: number; // 平均Lex(モード混在時の単純平均) 指定あれば総コスト試算
  onRequestPro?: () => void; // Freeがカスタム操作した時の誘導
}

// 無料プリセット（細かい→標準→粗い）
const FREE_PRESETS = [1, 2, 3, 5, 10, 15];
// Pro追加プリセット
const PRO_EXTRA_PRESETS = [20, 30, 50, 75, 100];

export default function ChunkSizeSelector({ value, onChange, totalUnit, disabled, modeAverageLex = 0, onRequestPro }: ChunkSizeSelectorProps) {
  const { isProUser } = useSubscriptionStore();
  const [customInput, setCustomInput] = useState(String(value));

  const presets = isProUser ? [...FREE_PRESETS, ...PRO_EXTRA_PRESETS] : FREE_PRESETS;
  const totalChunks = totalUnit && value > 0 ? Math.ceil(totalUnit / value) : null;
  const canUseCustom = isProUser;

  const applyCustom = () => {
    if (!canUseCustom) {
      onRequestPro && onRequestPro();
      return;
    }
    
    // 厳密なバリデーション
    const trimmed = customInput.trim();
    if (trimmed === '') return;
    
    const n = parseInt(trimmed, 10);
    
    // NaN、無限、負の数、小数、0を弾く
    if (!Number.isFinite(n) || n <= 0 || n !== parseFloat(trimmed)) {
      // 不正な入力の場合、現在の値に戻す
      setCustomInput(String(value));
      return;
    }
    
    // 上限チェック（1000を超える値は非現実的）
    if (n > 1000) {
      setCustomInput(String(value));
      return;
    }
    
    onChange(n);
  };

  const estimatedCycleLex = totalChunks && modeAverageLex > 0 ? totalChunks * modeAverageLex : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>学習単位サイズ（chunk）</Text>
      <Text style={styles.description}>
        1枚のカードが扱うページ/問題数。大きくすると新規生成枚数が減り復習負荷が下がる一方、1枚の重みが増して忘却時の損失が大きくなります。
      </Text>
      <View style={styles.presetRow}>
        {presets.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.presetBtn, value === p && styles.presetBtnActive, disabled && styles.disabled]}
            disabled={disabled}
            onPress={() => onChange(p)}
          >
            <Text style={[styles.presetText, value === p && styles.presetTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[glassEffect.card, styles.customBlock]}>
        <Text style={styles.customLabel}>カスタム</Text>
        <View style={styles.customRow}>
          <TextInput
            style={[styles.input, !canUseCustom && styles.lockedInput]}
            value={customInput}
            onChangeText={setCustomInput}
            keyboardType="numeric"
            editable={canUseCustom && !disabled}
            placeholder="例: 12"
            placeholderTextColor={colors.textTertiary}
          />
          <TouchableOpacity
            style={[styles.applyBtn, disabled && styles.disabled, !canUseCustom && styles.lockedAccent]}
            disabled={disabled}
            onPress={applyCustom}
          >
            <Text style={styles.applyText}>{canUseCustom ? '適用' : 'Proへ'}</Text>
          </TouchableOpacity>
        </View>
        {!canUseCustom && <Text style={styles.proHint}>Proでカスタムと大型プリセットが解放されます</Text>}
      </View>
      {totalChunks !== null && (
        <Text style={styles.footerHint}>生成予定カード枚数: 約 {totalChunks} 枚{estimatedCycleLex ? ` / 1周Lex総量 約 ${estimatedCycleLex}` : ''}</Text>
      )}
      {disabled && (
        <Text style={styles.warning}>既にカード生成済みのため変更は慎重に（今後の新規カードにのみ影響）</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  description: { fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  presetBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  presetTextActive: { color: colors.text },
  customBlock: { padding: 12, gap: 8 },
  customLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  customRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  lockedInput: { opacity: 0.4 },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedAccent: { backgroundColor: colors.warning },
  applyText: { fontSize: 13, fontWeight: '700', color: colors.text },
  proHint: { fontSize: 10, color: colors.textTertiary },
  footerHint: { fontSize: 11, color: colors.textSecondary },
  warning: { fontSize: 10, color: colors.warning },
  disabled: { opacity: 0.5 },
});
