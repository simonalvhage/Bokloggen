import { useState, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, Alert,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBooks } from '../context/BooksContext';
import { colors, shadows } from '../utils/theme';

const COLLECTION_OPTIONS = [
  { id: 'to-read', label: 'Att läsa', icon: 'bookmark-outline' },
  { id: 'reading', label: 'Läser nu', icon: 'book-outline' },
  { id: 'read', label: 'Läst', icon: 'checkmark-circle-outline' },
];

const EDITABLE_FIELDS = [
  { key: 'isbn', label: 'ISBN', keyboard: 'numeric' },
  { key: 'förlag', label: 'Förlag' },
  { key: 'datum', label: 'Publicerad' },
  { key: 'sidor', label: 'Sidor', keyboard: 'numeric' },
  { key: 'språk', label: 'Språk' },
  { key: 'genre', label: 'Genre' },
];

export default function BookDetailScreen({ route, navigation }) {
  const { bookId } = route.params;
  const { books, collections, updateBook, deleteBook } = useBooks();
  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(book?.notes || '');

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Boken hittades inte</Text>
      </SafeAreaView>
    );
  }

  const startEditing = () => {
    setEditData({
      titel: book.titel || '',
      författare: book.författare || '',
      omslag: book.omslag || '',
      beskrivning: book.beskrivning || '',
      isbn: book.isbn || '',
      förlag: book.förlag || '',
      datum: book.datum?.toString() || '',
      sidor: book.sidor?.toString() || '',
      språk: book.språk || '',
      genre: book.genre || '',
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEditing = async () => {
    const updates = {
      ...editData,
      sidor: editData.sidor ? parseInt(editData.sidor, 10) || null : null,
      omslag: editData.omslag.trim() || null,
    };
    await updateBook(bookId, updates);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
    setEditData({});
  };

  const handleRating = async (rating) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateBook(bookId, { rating: book.rating === rating ? 0 : rating });
  };

  const handleCollectionChange = async (collectionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateBook(bookId, { collection: collectionId });
  };

  const handleMoveToCustomCollection = (collection) => {
    updateBook(bookId, { collection: collection.id });
  };

  const handleSaveNotes = async () => {
    await updateBook(bookId, { notes });
    setEditingNotes(false);
  };

  const handleDelete = () => {
    Alert.alert('Ta bort bok', `Vill du ta bort "${book.titel}"?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await deleteBook(bookId);
          navigation.goBack();
        },
      },
    ]);
  };

  const customCollections = collections.filter((c) => !c.system);

  const displayFields = EDITABLE_FIELDS.map((f) => ({
    ...f,
    value: book[f.key],
  }));

  const coverUri = editing ? editData.omslag : book.omslag;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { if (editing) cancelEditing(); else navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>{editing ? 'Avbryt' : 'Tillbaka'}</Text>
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          {editing ? (
            <TouchableOpacity onPress={saveEditing} style={styles.saveBtn}>
              <Ionicons name="checkmark" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Spara</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={startEditing} style={styles.editBtn}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover */}
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="book" size={48} color={colors.textTertiary} />
            </View>
          )}

          {editing && (
            <View style={styles.editCoverRow}>
              <TextInput
                style={styles.editCoverInput}
                placeholder="Bild-URL (https://...)"
                placeholderTextColor={colors.textTertiary}
                value={editData.omslag}
                onChangeText={(v) => setEditData({ ...editData, omslag: v })}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}

          {/* Title & Author */}
          {editing ? (
            <View style={styles.editTitleSection}>
              <TextInput
                style={styles.editTitleInput}
                placeholder="Titel"
                placeholderTextColor={colors.textTertiary}
                value={editData.titel}
                onChangeText={(v) => setEditData({ ...editData, titel: v })}
              />
              <TextInput
                style={styles.editAuthorInput}
                placeholder="Författare"
                placeholderTextColor={colors.textTertiary}
                value={editData.författare}
                onChangeText={(v) => setEditData({ ...editData, författare: v })}
              />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{book.titel || 'Okänd titel'}</Text>
              <Text style={styles.author}>{book.författare || 'Okänd författare'}</Text>
            </>
          )}

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                <Ionicons
                  name={star <= (book.rating || 0) ? 'star' : 'star-outline'}
                  size={30}
                  color={star <= (book.rating || 0) ? colors.star : colors.starEmpty}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Reading status */}
          {!editing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lässtatus</Text>
              <View style={styles.statusRow}>
                {COLLECTION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.statusBtn, book.collection === opt.id && styles.statusBtnActive]}
                    onPress={() => handleCollectionChange(opt.id)}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={book.collection === opt.id ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={[styles.statusBtnText, book.collection === opt.id && styles.statusBtnTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Custom collections */}
          {!editing && customCollections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Samlingar</Text>
              <View style={styles.tagsRow}>
                {customCollections.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.tag, book.collection === c.id && styles.tagActive]}
                    onPress={() => handleMoveToCustomCollection(c)}
                  >
                    <Text style={[styles.tagText, book.collection === c.id && styles.tagTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Book info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Information</Text>
            <View style={styles.infoCard}>
              {editing
                ? EDITABLE_FIELDS.map((field, i) => (
                    <View
                      style={[styles.infoRow, i < EDITABLE_FIELDS.length - 1 && styles.infoRowBorder]}
                      key={field.key}
                    >
                      <Text style={styles.infoLabel}>{field.label}</Text>
                      <TextInput
                        style={styles.infoInput}
                        value={editData[field.key]}
                        onChangeText={(v) => setEditData({ ...editData, [field.key]: v })}
                        placeholder="—"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType={field.keyboard || 'default'}
                      />
                    </View>
                  ))
                : displayFields.map(
                    ({ label, value }) =>
                      value != null && (
                        <View style={[styles.infoRow, styles.infoRowBorder]} key={label}>
                          <Text style={styles.infoLabel}>{label}</Text>
                          <Text style={styles.infoValue}>{String(value)}</Text>
                        </View>
                      )
                  )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beskrivning</Text>
            {editing ? (
              <TextInput
                style={styles.editDescInput}
                multiline
                placeholder="Lägg till en beskrivning..."
                placeholderTextColor={colors.textTertiary}
                value={editData.beskrivning}
                onChangeText={(v) => setEditData({ ...editData, beskrivning: v })}
              />
            ) : (
              <Text style={styles.description}>
                {book.beskrivning || 'Ingen beskrivning'}
              </Text>
            )}
          </View>

          {/* Notes */}
          {!editing && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Anteckningar</Text>
                <TouchableOpacity onPress={() => {
                  if (editingNotes) handleSaveNotes();
                  else setEditingNotes(true);
                }}>
                  <Text style={styles.editLink}>
                    {editingNotes ? 'Spara' : 'Redigera'}
                  </Text>
                </TouchableOpacity>
              </View>
              {editingNotes ? (
                <TextInput
                  style={styles.notesInput}
                  multiline
                  placeholder="Skriv dina anteckningar..."
                  placeholderTextColor={colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                  autoFocus
                />
              ) : (
                <Text style={styles.notesText}>
                  {book.notes || 'Inga anteckningar'}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.addedAt}>
            Tillagd {new Date(book.addedAt).toLocaleDateString('sv-SE')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: colors.primary, marginLeft: 2 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  // Cover
  cover: {
    width: 180,
    height: 270,
    borderRadius: 14,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 8,
    ...shadows.large,
  },
  coverPlaceholder: {
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCoverRow: {
    marginBottom: 16,
  },
  editCoverInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  // Title & Author
  editTitleSection: {
    gap: 8,
    marginBottom: 4,
  },
  editTitleInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  editAuthorInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  author: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  editLink: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  statusBtnTextActive: { color: '#FFF' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
  },
  tagActive: { backgroundColor: colors.primary },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tagTextActive: { color: '#FFF' },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    ...shadows.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  infoLabel: {
    width: 100,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: { flex: 1, fontSize: 14, color: colors.text },
  infoInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  editDescInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  addedAt: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
});
