import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, TextInput,
  StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBooks } from '../context/BooksContext';
import { colors, shadows } from '../utils/theme';

export default function CollectionsScreen({ navigation }) {
  const { collections, books, getBooksByCollection, addCollection, deleteCollection } = useBooks();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addCollection(newName.trim());
      setNewName('');
      setShowAdd(false);
    } catch (e) {
      Alert.alert('Fel', e.message);
    }
  };

  const handleDelete = (collection) => {
    Alert.alert(
      'Ta bort samling',
      `Vill du ta bort "${collection.name}"? Böckerna tas inte bort.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => deleteCollection(collection.id),
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const count = getBooksByCollection(item.id).length;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CollectionBooks', { collectionId: item.id, collectionName: item.name })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, item.system && styles.iconBoxSystem]}>
          <Ionicons
            name={item.icon}
            size={22}
            color={item.system ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardCount}>
            {count} {count === 1 ? 'bok' : 'böcker'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Samlingar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{books.length}</Text>
              <Text style={styles.statLabel}>Totalt</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {books.filter((b) => b.collection === 'read').length}
              </Text>
              <Text style={styles.statLabel}>Lästa</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {books.filter((b) => b.collection === 'reading').length}
              </Text>
              <Text style={styles.statLabel}>Läser nu</Text>
            </View>
          </View>
        }
      />

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ny samling</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Namn på samlingen..."
              placeholderTextColor={colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => { setShowAdd(false); setNewName(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirm, !newName.trim() && { opacity: 0.4 }]}
                onPress={handleAdd}
              >
                <Text style={styles.modalBtnConfirmText}>Skapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  addBtn: { padding: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...shadows.small,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...shadows.small,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSystem: {
    backgroundColor: `${colors.primary}15`,
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardCount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 30,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalBtnConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
