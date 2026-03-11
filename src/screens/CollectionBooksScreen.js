import { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBooks } from '../context/BooksContext';
import { BookCardList } from '../components/BookCard';
import { colors } from '../utils/theme';

export default function CollectionBooksScreen({ route, navigation }) {
  const { collectionId, collectionName } = route.params;
  const { getBooksByCollection } = useBooks();

  const collectionBooks = useMemo(
    () => getBooksByCollection(collectionId),
    [getBooksByCollection, collectionId]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{collectionName}</Text>
          <Text style={styles.count}>{collectionBooks.length} böcker</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {collectionBooks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Inga böcker i denna samling</Text>
        </View>
      ) : (
        <FlatList
          data={collectionBooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookCardList
              book={item}
              onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  count: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
