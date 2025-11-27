import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import type { Book } from '@core/types';
import { colors } from '@core/theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  onSubmit: (book: Book, start: number, end: number) => Promise<void>;
};

export const RegisterStudiedModal: React.FC<Props> = ({ visible, onClose, books, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(books[0]?.id ?? null);
  const [start, setStart] = useState<string>('1');
  const [end, setEnd] = useState<string>('1');

  const selectedBook = useMemo(() => books.find(b => b.id === selectedId) || null, [books, selectedId]);
  const chunkSize = selectedBook?.chunkSize && selectedBook.chunkSize > 0 ? selectedBook.chunkSize : 1;
  const totalChunks = selectedBook ? Math.ceil(selectedBook.totalUnit / chunkSize) : 0;

  const handleConfirm = async () => {
    if (!selectedBook) return;
    const s = Math.max(1, Math.min(parseInt(start || '1', 10), totalChunks));
    const e = Math.max(s, Math.min(parseInt(end || String(totalChunks), 10), totalChunks));
    await onSubmit(selectedBook, s, e);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>既習範囲を復習として登録</Text>
          <Text style={styles.label}>書籍を選択</Text>
          <ScrollView style={{ maxHeight: 160 }}>
            {books.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.bookItem, selectedId === b.id && styles.bookItemActive]}
                onPress={() => setSelectedId(b.id)}
              >
                <Text style={[styles.bookText, selectedId === b.id && styles.bookTextActive]} numberOfLines={1}>
                  {b.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedBook && (
            <>
              <Text style={styles.helper}>チャンク: {chunkSize} / 総ユニット: {selectedBook.totalUnit} / 総チャンク: {totalChunks}</Text>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>開始チャンク</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={start}
                    onChangeText={setStart}
                    placeholder="1"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>終了チャンク</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={end}
                    onChangeText={setEnd}
                    placeholder={String(totalChunks)}
                    style={styles.input}
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancel]}>
              <Text style={styles.btnText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.btn, styles.submit]}>
              <Text style={[styles.btnText, { color: colors.text }]}>登録</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  helper: { fontSize: 12, color: colors.textTertiary, marginBottom: 8 },
  bookItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 8,
  },
  bookItemActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  bookText: { color: colors.textSecondary, fontSize: 14 },
  bookTextActive: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  inputGroup: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cancel: { borderColor: colors.surfaceBorder },
  submit: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { color: colors.textSecondary, fontWeight: '700' },
});

export default RegisterStudiedModal;
