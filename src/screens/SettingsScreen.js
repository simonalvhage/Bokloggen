import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  StyleSheet, Share, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system/next';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useBooks } from '../context/BooksContext';
import {
  clearAllData,
  exportCSV, importCSV, getBooks, getCollections,
} from '../utils/storage';
import { colors, shadows } from '../utils/theme';

export default function SettingsScreen() {
  const { books, setBooks, setCollections } = useBooks();
  const [importProgress, setImportProgress] = useState(null); // { current, total, title }

  const refreshState = async () => {
    const [newBooks, newCollections] = await Promise.all([getBooks(), getCollections()]);
    setBooks(newBooks);
    setCollections(newCollections);
  };

  // --- Export ---
  const shareFile = async (fileName, content, mimeType, dialogTitle) => {
    const file = new File(Paths.cache, fileName);
    file.write(content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
    } else {
      await Share.share({ message: content });
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportCSV();
      await shareFile('bokloggen_export.csv', csv, 'text/csv', 'Exportera bibliotek');
    } catch (e) {
      Alert.alert('Exportfel', e.message);
    }
  };

  // --- Import ---
  const doCSVImport = async (content, enrich) => {
    setImportProgress({ current: 0, total: 0, title: 'Förbereder...' });
    try {
      const { added, skipped, enriched, total } = await importCSV(content, {
        enrich,
        onProgress: (current, totalBooks, title) => {
          setImportProgress({ current, total: totalBooks, title });
        },
      });
      setImportProgress(null);
      await refreshState();
      const lines = [`${added} böcker tillagda av ${total} totalt.`];
      if (skipped > 0) lines.push(`${skipped} hoppades över (dubbletter).`);
      if (enriched > 0) lines.push(`${enriched} uppdaterades med extra info från nätet.`);
      Alert.alert('Importerat!', lines.join('\n'));
    } catch (e) {
      setImportProgress(null);
      Alert.alert('Importfel', e.message);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const picked = result.assets[0];
      const content = await readAsStringAsync(picked.uri);

      Alert.alert(
        'Uppdatera information?',
        'Vill du söka efter extra info (omslag, beskrivning m.m.) för varje bok online? Det tar lite längre tid men ger bättre resultat.',
        [
          {
            text: 'Ja, uppdatera',
            onPress: () => doCSVImport(content, true),
          },
          {
            text: 'Nej, snabbimport',
            onPress: () => doCSVImport(content, false),
          },
          { text: 'Avbryt', style: 'cancel' },
        ]
      );
    } catch (e) {
      Alert.alert(
        'Importfel',
        'Kunde inte läsa filen. Se till att det är en giltig CSV-fil.'
      );
    }
  };

  // --- Clear ---
  const handleClearData = () => {
    Alert.alert(
      'Rensa all data',
      'Detta tar bort alla böcker och samlingar. Kan inte ångras!',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Rensa allt',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await refreshState();
            Alert.alert('Klart', 'All data har rensats.');
          },
        },
      ]
    );
  };

  const sections = [
    {
      title: 'Bibliotek',
      items: [
        {
          icon: 'library-outline',
          label: 'Antal böcker',
          value: `${books.length}`,
          onPress: null,
        },
      ],
    },
    {
      title: 'Exportera',
      items: [
        {
          icon: 'download-outline',
          label: 'Exportera bibliotek',
          subtitle: 'Spara ditt bibliotek som CSV-fil',
          onPress: handleExport,
        },
      ],
    },
    {
      title: 'Importera',
      items: [
        {
          icon: 'push-outline',
          label: 'Importera bibliotek',
          subtitle: 'Importera från andra bokappar – dubbletter hoppas över',
          onPress: handleImport,
        },
      ],
    },
    {
      title: 'Avancerat',
      items: [
        {
          icon: 'trash-outline',
          label: 'Rensa all data',
          subtitle: 'Ta bort alla böcker och samlingar',
          onPress: handleClearData,
          destructive: true,
        },
      ],
    },
    {
      title: 'Om',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Bokloggen',
          value: 'v1.0.0',
          onPress: null,
        },
        {
          icon: 'heart-outline',
          label: 'Skapad med kärlek',
          subtitle: 'React Native + Expo',
          onPress: null,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inställningar</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.row,
                    i < section.items.length - 1 && styles.rowBorder,
                  ]}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                  activeOpacity={item.onPress ? 0.6 : 1}
                >
                  <View style={[styles.iconBox, item.destructive && styles.iconBoxDestructive]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.destructive ? colors.error : colors.primary}
                    />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowLabel, item.destructive && styles.rowLabelDestructive]}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.value && (
                    <Text style={styles.rowValue}>{item.value}</Text>
                  )}
                  {item.onPress && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Import progress modal */}
      <Modal visible={importProgress !== null} transparent animationType="fade">
        <View style={styles.progressOverlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressTitle}>Importerar böcker...</Text>
            {importProgress && importProgress.total > 0 && (
              <>
                <Text style={styles.progressCount}>
                  {importProgress.current} / {importProgress.total}
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(importProgress.current / importProgress.total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressBook} numberOfLines={1}>
                  {importProgress.title}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    ...shadows.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDestructive: {
    backgroundColor: `${colors.error}12`,
  },
  rowInfo: { flex: 1, marginLeft: 14 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowLabelDestructive: { color: colors.error },
  rowSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 14, color: colors.textSecondary, marginRight: 8 },
  // Progress modal
  progressOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    ...shadows.large,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  progressCount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.inputBg,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressBook: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
});
