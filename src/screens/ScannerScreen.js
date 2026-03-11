import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, ScrollView, Image,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBooks } from '../context/BooksContext';
import { lookupISBN, searchBooks } from '../utils/api';
import { colors, shadows } from '../utils/theme';

const MODES = [
  { key: 'scan', icon: 'scan-outline', label: 'Skanna' },
  { key: 'bulk', icon: 'layers-outline', label: 'Bulk' },
  { key: 'isbn', icon: 'keypad-outline', label: 'ISBN' },
  { key: 'search', icon: 'search-outline', label: 'Sök' },
];

export default function ScannerScreen({ navigation }) {
  const [mode, setMode] = useState('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedISBN, setScannedISBN] = useState(null);
  const [manualISBN, setManualISBN] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundBook, setFoundBook] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [torch, setTorch] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const { addBook } = useBooks();
  const scanLock = useRef(false);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScannedISBN(data);
    await doLookup(data);
  };

  const doLookup = async (isbn) => {
    setLoading(true);
    setError(null);
    setFoundBook(null);
    try {
      const result = await lookupISBN(isbn);
      setFoundBook(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearchResults([]);
    try {
      const results = await searchBooks(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) setError('Inga böcker hittades');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (book) => {
    try {
      await addBook(book);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (mode === 'bulk') {
        setBulkCount((c) => c + 1);
        resetForNextScan();
      } else {
        Alert.alert('Tillagd!', `${book.titel} har lagts till i ditt bibliotek`, [
          { text: 'OK', onPress: resetState },
        ]);
      }
    } catch (e) {
      Alert.alert('Fel', e.message);
    }
  };

  const handleSkipBulk = () => {
    resetForNextScan();
  };

  const resetForNextScan = () => {
    setFoundBook(null);
    setScannedISBN(null);
    setError(null);
    setLoading(false);
    scanLock.current = false;
  };

  const resetState = () => {
    setFoundBook(null);
    setScannedISBN(null);
    setError(null);
    setSearchResults([]);
    setBulkCount(0);
    scanLock.current = false;
  };

  const isScanMode = mode === 'scan' || mode === 'bulk';

  return (
    <View style={styles.container}>
      {/* Camera fills entire background for scan modes */}
      {isScanMode && permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={scannedISBN ? undefined : handleBarCodeScanned}
          enableTorch={torch}
        />
      )}

      <SafeAreaView style={isScanMode && permission?.granted ? styles.overlayContainer : styles.solidContainer}>
        {/* Header */}
        <View style={isScanMode && permission?.granted ? styles.headerOverlay : styles.header}>
          <Text style={[styles.title, isScanMode && permission?.granted && styles.titleLight]}>
            Lägg till bok
          </Text>
          {mode === 'bulk' && bulkCount > 0 && (
            <View style={styles.bulkBadge}>
              <Text style={styles.bulkBadgeText}>{bulkCount} tillagda</Text>
            </View>
          )}
        </View>

        {/* Mode bar */}
        <View style={[styles.modeBar, isScanMode && permission?.granted && styles.modeBarOverlay]}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
              onPress={() => { setMode(m.key); resetState(); }}
            >
              <Ionicons
                name={m.icon}
                size={18}
                color={mode === m.key ? '#FFF' : isScanMode && permission?.granted ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
              />
              <Text style={[
                styles.modeBtnText,
                mode === m.key && styles.modeBtnTextActive,
                isScanMode && permission?.granted && mode !== m.key && styles.modeBtnTextLight,
              ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scanner overlay UI */}
        {isScanMode && (
          <>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.permissionText}>
                  Kamerabehörighet krävs för att skanna streckkoder
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Ge tillgång</Text>
                </TouchableOpacity>
              </View>
            ) : !foundBook && !loading && !error ? (
              <View style={styles.scanOverlay}>
                {/* Scan frame */}
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                </View>
                <Text style={styles.scanHint}>
                  {mode === 'bulk'
                    ? 'Bulk-skanning – skanna bok efter bok'
                    : 'Rikta kameran mot streckkoden'}
                </Text>
              </View>
            ) : null}

            {/* Bottom controls over camera */}
            {permission?.granted && !foundBook && !loading && !error && (
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={() => setTorch(!torch)}
                >
                  <Ionicons
                    name={torch ? 'flashlight' : 'flashlight-outline'}
                    size={24}
                    color="#FFF"
                  />
                  <Text style={styles.controlBtnText}>
                    {torch ? 'Lampa på' : 'Lampa'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading overlay */}
            {loading && (
              <View style={styles.scanResultOverlay}>
                <View style={styles.scanResultCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.scanResultLoading}>Söker bok...</Text>
                </View>
              </View>
            )}

            {/* Error overlay */}
            {error && (
              <View style={styles.scanResultOverlay}>
                <View style={styles.scanResultCard}>
                  <Ionicons name="alert-circle" size={32} color={colors.error} />
                  <Text style={styles.scanResultError}>{error}</Text>
                  <TouchableOpacity style={styles.scanResultBtn} onPress={resetForNextScan}>
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={styles.scanResultBtnText}>Försök igen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Found book overlay */}
            {foundBook && (
              <View style={styles.scanResultOverlay}>
                <View style={styles.scanResultCard}>
                  <View style={styles.previewRow}>
                    {foundBook.omslag ? (
                      <Image source={{ uri: foundBook.omslag }} style={styles.previewCover} />
                    ) : (
                      <View style={[styles.previewCover, styles.previewPlaceholder]}>
                        <Ionicons name="book" size={28} color={colors.textTertiary} />
                      </View>
                    )}
                    <View style={styles.previewInfo}>
                      <Text style={styles.previewTitle} numberOfLines={2}>
                        {foundBook.titel || 'Okänd titel'}
                      </Text>
                      <Text style={styles.previewAuthor} numberOfLines={1}>
                        {foundBook.författare || 'Okänd författare'}
                      </Text>
                      {foundBook.datum && (
                        <Text style={styles.previewMeta}>{foundBook.datum}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.scanResultBtns}>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleAddBook(foundBook)}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.addBtnText}>
                        {mode === 'bulk' ? 'Lägg till & nästa' : 'Lägg till'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={mode === 'bulk' ? handleSkipBulk : resetState}
                    >
                      <Text style={styles.skipBtnText}>
                        {mode === 'bulk' ? 'Hoppa över' : 'Avbryt'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* ISBN mode */}
        {mode === 'isbn' && (
          <KeyboardAvoidingView
            style={styles.inputArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.isbnInputBox}>
              <Ionicons name="barcode-outline" size={22} color={colors.textTertiary} />
              <TextInput
                style={styles.isbnInput}
                placeholder="Ange ISBN (10 eller 13 siffror)..."
                placeholderTextColor={colors.textTertiary}
                value={manualISBN}
                onChangeText={setManualISBN}
                keyboardType="numeric"
                returnKeyType="search"
                onSubmitEditing={() => manualISBN.trim() && doLookup(manualISBN.trim())}
              />
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, !manualISBN.trim() && styles.actionBtnDisabled]}
              onPress={() => manualISBN.trim() && doLookup(manualISBN.trim())}
              disabled={!manualISBN.trim() || loading}
            >
              <Text style={styles.actionBtnText}>Sök ISBN</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}

        {/* Search mode */}
        {mode === 'search' && (
          <KeyboardAvoidingView
            style={styles.inputArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.isbnInputBox}>
              <Ionicons name="search" size={22} color={colors.textTertiary} />
              <TextInput
                style={styles.isbnInput}
                placeholder="Sök titel, författare..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={doSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, !searchQuery.trim() && styles.actionBtnDisabled]}
              onPress={doSearch}
              disabled={!searchQuery.trim() || loading}
            >
              <Text style={styles.actionBtnText}>Sök online</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}

        {/* Results for ISBN/search modes */}
        {(mode === 'isbn' || mode === 'search') && (
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Söker...</Text>
              </View>
            )}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={24} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {foundBook && (
              <BookPreview book={foundBook} onAdd={handleAddBook} />
            )}
            {searchResults.map((book, i) => (
              <BookPreview key={book.isbn || i} book={book} onAdd={handleAddBook} compact />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function BookPreview({ book, onAdd, compact }) {
  return (
    <View style={[styles.previewCard, compact && styles.previewCardCompact]}>
      <View style={styles.previewRow}>
        {book.omslag ? (
          <Image source={{ uri: book.omslag }} style={compact ? styles.previewCoverSmall : styles.previewCover} />
        ) : (
          <View style={[compact ? styles.previewCoverSmall : styles.previewCover, styles.previewPlaceholder]}>
            <Ionicons name="book" size={compact ? 20 : 28} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.previewInfo}>
          <Text style={styles.previewTitle} numberOfLines={2}>{book.titel || 'Okänd titel'}</Text>
          <Text style={styles.previewAuthor} numberOfLines={1}>{book.författare || 'Okänd författare'}</Text>
          {book.datum && <Text style={styles.previewMeta}>{book.datum}</Text>}
          {book.isbn ? <Text style={styles.previewMeta}>ISBN: {book.isbn}</Text> : null}
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(book)}>
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.addBtnText}>Lägg till</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  solidContainer: { flex: 1, backgroundColor: colors.bg },
  overlayContainer: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerOverlay: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  titleLight: {
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bulkBadge: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bulkBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Mode bar
  modeBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    padding: 4,
  },
  modeBarOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeBtnTextActive: { color: '#FFF' },
  modeBtnTextLight: { color: 'rgba(255,255,255,0.7)' },

  // Scan overlay
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FFF',
    borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanHint: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Camera controls (flashlight etc)
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 30,
    gap: 24,
  },
  controlBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 4,
  },
  controlBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Scan result overlay (found book / loading / error over camera)
  scanResultOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 24,
  },
  scanResultCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  scanResultLoading: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 15,
  },
  scanResultError: {
    textAlign: 'center',
    color: colors.error,
    marginTop: 8,
    fontSize: 15,
  },
  scanResultBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  scanResultBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  scanResultBtns: { gap: 10, marginTop: 4 },

  // Permission
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.bg,
  },
  permissionText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  permissionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },

  // Input areas (ISBN / search)
  inputArea: { paddingHorizontal: 20, gap: 12, paddingTop: 4 },
  isbnInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  isbnInput: { flex: 1, fontSize: 16, color: colors.text },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Results
  results: { flex: 1 },
  resultsContent: { padding: 20, paddingBottom: 100 },
  loadingBox: { alignItems: 'center', padding: 40 },
  loadingText: { color: colors.textSecondary, marginTop: 12 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 14 },

  // Preview (in-card for scan overlay + standalone for search)
  previewRow: { flexDirection: 'row', marginBottom: 14 },
  previewCover: {
    width: 70,
    height: 105,
    borderRadius: 10,
    backgroundColor: colors.inputBg,
  },
  previewCoverSmall: {
    width: 50,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
  },
  previewPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  previewInfo: { flex: 1, marginLeft: 14 },
  previewTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  previewAuthor: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  previewMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },

  // Buttons
  addBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.inputBg,
  },
  skipBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },

  // Preview card (for ISBN/search results)
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadows.medium,
  },
  previewCardCompact: { padding: 12 },
});
