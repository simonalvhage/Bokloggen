import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../utils/theme';

export function BookCardGrid({ book, onPress }) {
  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.gridCoverWrap}>
        {book.omslag ? (
          <Image source={{ uri: book.omslag }} style={styles.gridCover} />
        ) : (
          <View style={[styles.gridCover, styles.placeholder]}>
            <Ionicons name="book" size={32} color={colors.textTertiary} />
          </View>
        )}
        {book.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={styles.ratingText}>{book.rating}</Text>
          </View>
        )}
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>{book.titel || 'Okänd titel'}</Text>
      <Text style={styles.gridAuthor} numberOfLines={1}>{book.författare || ''}</Text>
    </TouchableOpacity>
  );
}

export function BookCardList({ book, onPress }) {
  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.7}>
      {book.omslag ? (
        <Image source={{ uri: book.omslag }} style={styles.listCover} />
      ) : (
        <View style={[styles.listCover, styles.placeholder]}>
          <Ionicons name="book" size={24} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={2}>{book.titel || 'Okänd titel'}</Text>
        <Text style={styles.listAuthor} numberOfLines={1}>{book.författare || 'Okänd författare'}</Text>
        {book.datum && <Text style={styles.listMeta}>{book.datum}</Text>}
      </View>
      {book.rating > 0 && (
        <View style={styles.listRating}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={styles.listRatingText}>{book.rating}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid
  gridCard: {
    width: '47%',
    marginBottom: 20,
  },
  gridCoverWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.medium,
  },
  gridCover: {
    width: '100%',
    aspectRatio: 0.65,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  gridAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // List
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    ...shadows.small,
  },
  listCover: {
    width: 50,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
  },
  listInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  listAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  listRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 3,
  },
  listRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
