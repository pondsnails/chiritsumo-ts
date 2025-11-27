import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Home, Coffee, Library, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import { DrizzleInventoryPresetRepository } from '../repository/InventoryPresetRepository';
import type { InventoryPreset, Book } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  presets: InventoryPreset[];
  onPresetsChange: () => void;
}

const ICONS = [
  { code: 0, Icon: Home, label: '自宅' },
  { code: 1, Icon: Coffee, label: 'カフェ' },
  { code: 2, Icon: Library, label: '図書館' },
  { code: 3, Icon: Plus, label: 'その他' },
];

export function InventoryFilterModal({ visible, onClose, books, presets, onPresetsChange }: Props) {
  const presetRepo = new DrizzleInventoryPresetRepository();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

  const startEdit = (preset: InventoryPreset) => {
    setEditingId(preset.id);
    setLabel(preset.label);
    setSelectedIcon(preset.iconCode);
    setSelectedBooks(new Set(preset.bookIds));
  };

  const startCreate = () => {
    setEditingId(-1);
    setLabel('');
    setSelectedIcon(0);
    setSelectedBooks(new Set());
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('エラー', 'ラベルを入力してください');
      return;
    }

    try {
      const presetData = {
        label: label.trim(),
        iconCode: selectedIcon,
        bookIds: Array.from(selectedBooks),
        isDefault: false,
      };

      if (editingId === -1) {
        await presetRepo.create({
          label: presetData.label,
          iconCode: presetData.iconCode,
          bookIds: presetData.bookIds,
          isDefault: false,
        });
      } else if (editingId) {
        await presetRepo.update(editingId, { 
          label: presetData.label,
          iconCode: presetData.iconCode,
          bookIds: presetData.bookIds,
        });
      }

      setEditingId(null);
      onPresetsChange();
    } catch (error) {
      console.error('Failed to save preset:', error);
      Alert.alert('エラー', 'プリセットの保存に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('削除確認', 'このプリセットを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await presetRepo.delete(id);
            onPresetsChange();
          } catch (error) {
            console.error('Failed to delete preset:', error);
            Alert.alert('エラー', 'プリセットの削除に失敗しました');
          }
        },
      },
    ]);
  };

  const toggleBook = (bookId: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>持ち物フィルター</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {editingId === null ? (
            <View style={{ flex: 1 }}>
              <FlatList
                data={presets}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const Icon = ICONS.find((i) => i.code === item.iconCode)?.Icon || Home;
                  return (
                    <View style={styles.presetItem}>
                      <View style={styles.presetInfo}>
                        <Icon size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.presetLabel}>{item.label}</Text>
                          <Text style={styles.presetCount}>{item.bookIds.length}冊</Text>
                        </View>
                      </View>
                      <View style={styles.presetActions}>
                        <TouchableOpacity onPress={() => startEdit(item)} style={styles.editButton}>
                          <Text style={styles.editButtonText}>編集</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>削除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity onPress={startCreate} style={styles.addButton}>
                    <Plus size={20} color={colors.primary} />
                    <Text style={styles.addButtonText}>新規作成</Text>
                  </TouchableOpacity>
                }
              />
            </View>
          ) : (
            <View style={{ flex: 1, padding: 16 }}>
              <View style={styles.form}>
                <Text style={styles.formLabel}>ラベル</Text>
                <TextInput
                  style={styles.input}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="例: 自宅"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text style={styles.formLabel}>アイコン</Text>
                <View style={styles.iconGrid}>
                  {ICONS.map((icon) => {
                    const Icon = icon.Icon;
                    return (
                      <TouchableOpacity
                        key={icon.code}
                        style={[styles.iconOption, selectedIcon === icon.code && styles.iconOptionActive]}
                        onPress={() => setSelectedIcon(icon.code)}
                      >
                        <Icon size={24} color={selectedIcon === icon.code ? colors.primary : colors.textSecondary} />
                        <Text
                          style={[
                            styles.iconLabel,
                            selectedIcon === icon.code && styles.iconLabelActive,
                          ]}
                        >
                          {icon.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.formLabel}>教材選択</Text>
                <FlatList
                  data={books}
                  keyExtractor={(item) => item.id}
                  style={styles.bookList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.bookItem, selectedBooks.has(item.id) && styles.bookItemActive]}
                      onPress={() => toggleBook(item.id)}
                    >
                      <Text
                        style={[
                          styles.bookTitle,
                          selectedBooks.has(item.id) && styles.bookTitleActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => setEditingId(null)} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>保存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  presetItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    ...glassEffect,
  },
  presetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  presetCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  presetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  form: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    ...glassEffect,
  },
  iconGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  iconOption: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  iconLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  iconLabelActive: {
    color: colors.primary,
  },
  bookList: {
    flex: 1,
    marginBottom: 16,
  },
  bookItem: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bookItemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  bookTitle: {
    fontSize: 14,
    color: colors.text,
  },
  bookTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
