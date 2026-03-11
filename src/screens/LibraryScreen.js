import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBooks } from '../context/BooksContext';
import { BookCardGrid, BookCardList } from '../components/BookCard';
import { colors, shadows } from '../utils/theme';

const SORT_OPTIONS = [
  { key: 'recent', label: 'Senast tillagda' },
  { key: 'title', label: 'Titel A-Ö' },
  { key: 'author', label: 'Författare' },
  { key: 'rating', label: 'Betyg' },
];

export default function LibraryScreen({ navigation }) {
  const { books } = useBooks();
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSort, setShowSort] = useState(false);

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.titel?.toLowerCase().includes(q) ||
          b.författare?.toLowerCase().includes(q) ||
          b.isbn?.includes(q)
      );
    }

    switch (sortBy) {
      case 'title':
        result.sort((a, b) => (a.titel || '').localeCompare(b.titel || '', 'sv'));
        break;
      case 'author':
        result.sort((a, b) => (a.författare || '').localeCompare(b.författare || '', 'sv'));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }

    return result;
  }, [books, searchQuery, sortBy]);

  const renderGridItem = ({ item }) => (
    <BookCardGrid
      book={item}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    />
  );

  const renderListItem = ({ item }) => (
    <BookCardList
      book={item}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bibliotek</Text>
        <Text style={styles.count}>{books.length} böcker</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sök i biblioteket..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
          <Text style={styles.sortLabel}>
            {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
          </Text>
        </TouchableOpacity>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid" size={16} color={viewMode === 'grid' ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
              onPress={() => { setSortBy(opt.key); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filteredBooks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Inga resultat' : 'Tomt bibliotek'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Prova ett annat sökord'
              : 'Skanna en streckkod eller sök efter en bok för att börja'}
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="list"
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  count: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: { fontSize: 13, color: colors.textSecondary },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 2,
  },
  viewBtn: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  viewBtnActive: {
    backgroundColor: colors.card,
    ...shadows.small,
  },
  sortDropdown: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    ...shadows.medium,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sortOptionActive: { backgroundColor: colors.inputBg },
  sortOptionText: { fontSize: 14, color: colors.text },
  sortOptionTextActive: { color: colors.primary, fontWeight: '600' },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
