import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKS_KEY = '@bokloggen_books';
const COLLECTIONS_KEY = '@bokloggen_collections';

const DEFAULT_COLLECTIONS = [
  { id: 'all', name: 'Alla böcker', icon: 'library-outline', system: true },
  { id: 'to-read', name: 'Att läsa', icon: 'bookmark-outline', system: true },
  { id: 'reading', name: 'Läser nu', icon: 'book-outline', system: true },
  { id: 'read', name: 'Lästa', icon: 'checkmark-circle-outline', system: true },
  { id: 'favorites', name: 'Favoriter', icon: 'heart-outline', system: true },
];

export async function getBooks() {
  try {
    const json = await AsyncStorage.getItem(BOOKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveBooks(books) {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export async function addBook(book) {
  const books = await getBooks();
  const newBook = {
    ...book,
    id: book.isbn || Date.now().toString(),
    addedAt: new Date().toISOString(),
    collection: 'to-read',
    rating: 0,
    notes: '',
  };
  const exists = books.find((b) => b.isbn && b.isbn === book.isbn);
  if (exists) {
    throw new Error('Boken finns redan i ditt bibliotek');
  }
  books.unshift(newBook);
  await saveBooks(books);
  return books;
}

export async function updateBook(bookId, updates) {
  const books = await getBooks();
  const index = books.findIndex((b) => b.id === bookId);
  if (index === -1) throw new Error('Boken hittades inte');
  books[index] = { ...books[index], ...updates };
  await saveBooks(books);
  return books;
}

export async function deleteBook(bookId) {
  const books = await getBooks();
  const filtered = books.filter((b) => b.id !== bookId);
  await saveBooks(filtered);
  return filtered;
}

export async function getCollections() {
  try {
    const json = await AsyncStorage.getItem(COLLECTIONS_KEY);
    if (json) return JSON.parse(json);
    await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(DEFAULT_COLLECTIONS));
    return DEFAULT_COLLECTIONS;
  } catch {
    return DEFAULT_COLLECTIONS;
  }
}

export async function addCollection(name) {
  const collections = await getCollections();
  const newCollection = {
    id: Date.now().toString(),
    name,
    icon: 'folder-outline',
    system: false,
  };
  collections.push(newCollection);
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  return collections;
}

export async function deleteCollection(id) {
  const collections = await getCollections();
  const filtered = collections.filter((c) => c.id !== id || c.system);
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function exportData() {
  const [books, collections] = await Promise.all([getBooks(), getCollections()]);
  return JSON.stringify({ books, collections, exportedAt: new Date().toISOString() }, null, 2);
}

export async function importData(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.books) await saveBooks(data.books);
  if (data.collections) await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(data.collections));
  return { bookCount: data.books?.length || 0 };
}

export async function clearAllData() {
  await AsyncStorage.multiRemove([BOOKS_KEY, COLLECTIONS_KEY]);
}

// --- CSV Support (BookBuddy-compatible) ---

// CSV field names from BookBuddy export
const CSV_HEADERS = [
  'Title','Original Title','Subtitle','Series','Volume','Author',
  'Author (Last, First)','Illustrator','Narrator','Translator',
  'Photographer','Editor','Publisher','Place of Publication',
  'Date Published','Year Published','Original Date Published',
  'Original Year Published','Edition','Genre','Summary',
  'Guided Reading Level','Lexile Measure','Lexile Code',
  'Grade Level Equivalent','Developmental Reading Assessment',
  'Interest Level','AR Level','AR Points','AR Quiz Number',
  'Word Count','Number of Pages','Format','Audio Runtime',
  'Dimensions','Weight','List Price','Language','Original Language',
  'DDC','LCC','LCCN','OCLC','ISBN','ISSN','Favorites','Rating',
  'Physical Location','Status','Status Incompleted Reason',
  'Status Hidden','Date Started','Date Finished','Current Page',
  'Loaned To','Date Loaned','Borrowed From','Date Borrowed',
  'Returned from Borrow','Not Owned Reason','Quantity','Condition',
  'Recommended By','Date Added','User Supplied ID',
  'User Supplied Descriptor','Tags','Purchase Date','Purchase Place',
  'Purchase Price','Notes','Google VolumeID','Category','Wish List',
  'Previously Owned','Up Next','Position','Uploaded Image URL','Activities',
];

function parseCSVRow(row) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function escapeCSVField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function mapStatusToCollection(status) {
  if (!status) return 'to-read';
  const s = status.toLowerCase().trim();
  if (s === 'read' || s === 'finished') return 'read';
  if (s === 'reading' || s === 'currently reading') return 'reading';
  return 'to-read'; // Unread, etc.
}

function mapCollectionToStatus(collection) {
  switch (collection) {
    case 'read': return 'Read';
    case 'reading': return 'Reading';
    default: return 'Unread';
  }
}

export function parseBookBuddyCSV(csvString) {
  const lines = csvString.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header to get column indices
  const headerFields = parseCSVRow(lines[0]);
  const idx = {};
  headerFields.forEach((h, i) => { idx[h.trim()] = i; });

  const books = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVRow(line);
    const get = (name) => {
      const col = idx[name];
      return col != null ? (fields[col] || '').trim() : '';
    };

    const title = get('Title');
    if (!title) continue;

    const rating = parseFloat(get('Rating')) || 0;
    const isbn = get('ISBN').replace(/[-\s]/g, '');
    const pages = parseInt(get('Number of Pages'), 10) || null;

    books.push({
      id: isbn || Date.now().toString() + '-' + i,
      isbn,
      titel: title,
      författare: get('Author'),
      förlag: get('Publisher'),
      datum: get('Year Published') || get('Date Published'),
      genre: get('Genre'),
      beskrivning: get('Summary'),
      omslag: get('Uploaded Image URL') || null,
      sidor: pages,
      språk: get('Language'),
      rating: Math.round(rating),
      collection: mapStatusToCollection(get('Status')),
      notes: get('Notes'),
      addedAt: get('Date Added')
        ? new Date(get('Date Added').replace(/\//g, '-')).toISOString()
        : new Date().toISOString(),
      // Extra fields preserved for re-export
      _bb_originalTitle: get('Original Title'),
      _bb_subtitle: get('Subtitle'),
      _bb_series: get('Series'),
      _bb_volume: get('Volume'),
      _bb_authorLastFirst: get('Author (Last, First)'),
      _bb_googleVolumeId: get('Google VolumeID'),
      _bb_favorites: get('Favorites'),
      _bb_loanedTo: get('Loaned To'),
      _bb_borrowedFrom: get('Borrowed From'),
      _bb_tags: get('Tags'),
      _bb_category: get('Category'),
    });
  }
  return books;
}

export async function importCSV(csvString, { onProgress, enrich = true } = {}) {
  const parsed = parseBookBuddyCSV(csvString);
  if (parsed.length === 0) throw new Error('Inga böcker hittades i CSV-filen');

  const existing = await getBooks();
  const existingISBNs = new Set(existing.filter(b => b.isbn).map(b => b.isbn));
  let added = 0;
  let skipped = 0;
  let enriched = 0;
  const toAdd = [];

  for (const book of parsed) {
    if (book.isbn && existingISBNs.has(book.isbn)) {
      skipped++;
      continue;
    }
    toAdd.push(book);
    if (book.isbn) existingISBNs.add(book.isbn);
  }

  for (let i = 0; i < toAdd.length; i++) {
    const book = toAdd[i];
    if (onProgress) onProgress(i + 1, toAdd.length, book.titel);

    if (enrich && book.isbn) {
      try {
        const { lookupISBN } = require('./api');
        const apiData = await lookupISBN(book.isbn);
        if (apiData) {
          // Merge: keep import data, fill in blanks from API, special cover logic
          const importCover = book.omslag;
          const apiCover = apiData.omslag;

          book.titel = book.titel || apiData.titel;
          book.författare = book.författare || apiData.författare;
          book.förlag = book.förlag || apiData.förlag;
          book.datum = book.datum || apiData.datum;
          book.genre = book.genre || apiData.genre;
          book.beskrivning = book.beskrivning || apiData.beskrivning;
          book.sidor = book.sidor || apiData.sidor;
          book.språk = book.språk || apiData.språk;
          // Cover: prefer API cover if available, fall back to import cover
          book.omslag = apiCover || importCover;

          enriched++;
        }
      } catch {
        // Lookup failed, keep original import data
      }
    }

    existing.unshift(book);
    added++;
  }

  await saveBooks(existing);
  return { added, skipped, enriched, total: parsed.length };
}

export async function exportCSV() {
  const books = await getBooks();
  const rows = [CSV_HEADERS.join(',')];

  for (const book of books) {
    const row = CSV_HEADERS.map((header) => {
      switch (header) {
        case 'Title': return escapeCSVField(book.titel);
        case 'Original Title': return escapeCSVField(book._bb_originalTitle);
        case 'Subtitle': return escapeCSVField(book._bb_subtitle);
        case 'Series': return escapeCSVField(book._bb_series);
        case 'Volume': return escapeCSVField(book._bb_volume);
        case 'Author': return escapeCSVField(book.författare);
        case 'Author (Last, First)': return escapeCSVField(book._bb_authorLastFirst || formatLastFirst(book.författare));
        case 'Publisher': return escapeCSVField(book.förlag);
        case 'Year Published': return escapeCSVField(book.datum);
        case 'Genre': return escapeCSVField(book.genre);
        case 'Summary': return escapeCSVField(book.beskrivning);
        case 'Number of Pages': return escapeCSVField(book.sidor);
        case 'Language': return escapeCSVField(book.språk);
        case 'ISBN': return escapeCSVField(book.isbn);
        case 'Favorites': return book.rating >= 4 ? '1' : '0';
        case 'Rating': return escapeCSVField(book.rating ? book.rating.toFixed(6) : '0.000000');
        case 'Status': return escapeCSVField(mapCollectionToStatus(book.collection));
        case 'Date Added': return escapeCSVField(formatBBDate(book.addedAt));
        case 'Notes': return escapeCSVField(book.notes);
        case 'Google VolumeID': return escapeCSVField(book._bb_googleVolumeId);
        case 'Uploaded Image URL': return escapeCSVField(book.omslag);
        case 'Loaned To': return escapeCSVField(book._bb_loanedTo);
        case 'Borrowed From': return escapeCSVField(book._bb_borrowedFrom);
        case 'Tags': return escapeCSVField(book._bb_tags);
        case 'Category': return escapeCSVField(book._bb_category);
        default: return '';
      }
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function formatLastFirst(author) {
  if (!author) return '';
  const parts = author.split(',')[0].trim().split(' ');
  if (parts.length < 2) return author;
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return `${last}, ${first}`;
}

function formatBBDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return '';
  }
}
