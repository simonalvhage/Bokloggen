const TIMEOUT_MS = 5000;

function fetchWithTimeout(url, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function fetchLibris(isbn) {
  try {
    const res = await fetchWithTimeout(
      `https://libris.kb.se/xsearch?query=ISBN:${isbn}&format=json&n=1`
    );
    const data = await res.json();
    const hit = data?.xsearch?.list?.[0];
    if (!hit) return null;
    return {
      titel: hit.title || null,
      författare: hit.creator || null,
      förlag: hit.publisher || null,
      datum: hit.date || null,
      språk: hit.language || null,
    };
  } catch {
    return null;
  }
}

async function fetchOpenLibrary(isbn) {
  try {
    const res = await fetchWithTimeout(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
    );
    const data = await res.json();
    const key = `ISBN:${isbn}`;
    const book = data[key];
    if (book) {
      return {
        titel: book.title || null,
        författare: book.authors?.map((a) => a.name).join(', ') || null,
        förlag: book.publishers?.map((p) => p.name).join(', ') || null,
        datum: book.publish_date || null,
        genre: book.subjects?.map((s) => s.name).slice(0, 3).join(', ') || null,
        omslag: book.cover?.large || book.cover?.medium || null,
        sidor: book.number_of_pages || null,
      };
    }
    const res2 = await fetchWithTimeout(
      `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`
    );
    const data2 = await res2.json();
    const doc = data2?.docs?.[0];
    if (!doc) return null;
    const coverId = doc.cover_i;
    return {
      titel: doc.title || null,
      författare: doc.author_name?.join(', ') || null,
      förlag: doc.publisher?.join(', ') || null,
      datum: doc.first_publish_year?.toString() || null,
      genre: doc.subject?.slice(0, 3).join(', ') || null,
      omslag: coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : null,
      sidor: doc.number_of_pages_median || null,
    };
  } catch {
    return null;
  }
}

async function fetchGoogle(isbn) {
  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
    );
    const data = await res.json();
    const vol = data?.items?.[0]?.volumeInfo;
    if (!vol) return null;
    return {
      titel: vol.title || null,
      författare: vol.authors?.join(', ') || null,
      förlag: vol.publisher || null,
      datum: vol.publishedDate || null,
      genre: vol.categories?.join(', ') || null,
      beskrivning: vol.description || null,
      omslag: vol.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
      sidor: vol.pageCount || null,
      språk: vol.language || null,
    };
  } catch {
    return null;
  }
}

async function testImageUrl(url) {
  try {
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return false;
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) < 200) return false;
    return true;
  } catch {
    return false;
  }
}

async function findCover(isbn, titel, författare) {
  const librisUrl = `https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/bokrondellen/isbn/${isbn}/${isbn}.jpg/record`;
  if (await testImageUrl(librisUrl)) return librisUrl;

  const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  if (await testImageUrl(olUrl)) return olUrl;

  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
    );
    const data = await res.json();
    const links = data?.items?.[0]?.volumeInfo?.imageLinks;
    if (links) {
      const thumb = (links.thumbnail || '').replace('http://', 'https://');
      if (thumb) {
        const largeUrl = thumb.replace('zoom=1', 'zoom=2');
        if (await testImageUrl(largeUrl)) return largeUrl;
        if (await testImageUrl(thumb)) return thumb;
      }
    }
  } catch {}

  if (titel && författare) {
    try {
      const res = await fetchWithTimeout(
        `https://bookcover.longitood.com/bookcover?book_title=${encodeURIComponent(titel)}&author_name=${encodeURIComponent(författare)}`
      );
      const data = await res.json();
      if (data?.url && (await testImageUrl(data.url))) return data.url;
    } catch {}
  }

  try {
    const res = await fetchWithTimeout(
      `https://bookcover.longitood.com/bookcover?isbn=${isbn}`
    );
    const data = await res.json();
    if (data?.url && (await testImageUrl(data.url))) return data.url;
  } catch {}

  return null;
}

export async function lookupISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, '');
  if (!/^(\d{10}|\d{13})$/.test(clean)) {
    throw new Error('Ogiltigt ISBN – ange 10 eller 13 siffror');
  }

  const [libris, ol, google] = await Promise.all([
    fetchLibris(clean),
    fetchOpenLibrary(clean),
    fetchGoogle(clean),
  ]);

  const pick = (...sources) =>
    sources.reduce((val, src) => val ?? src, null);

  const result = {
    isbn: clean,
    titel: pick(libris?.titel, ol?.titel, google?.titel),
    författare: pick(libris?.författare, ol?.författare, google?.författare),
    förlag: pick(libris?.förlag, ol?.förlag, google?.förlag),
    datum: pick(libris?.datum, ol?.datum, google?.datum),
    genre: pick(ol?.genre, google?.genre),
    beskrivning: pick(google?.beskrivning, ol?.beskrivning),
    omslag: pick(ol?.omslag, google?.omslag),
    sidor: pick(ol?.sidor, google?.sidor),
    språk: pick(libris?.språk, google?.språk, ol?.språk),
  };

  if (!result.omslag) {
    result.omslag = await findCover(clean, result.titel, result.författare);
  }

  if (!result.titel && !result.författare) {
    throw new Error('Ingen bok hittades med detta ISBN');
  }

  return result;
}

export async function searchBooks(query) {
  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`
    );
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map((item) => {
      const vol = item.volumeInfo;
      const isbn13 = vol.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier;
      const isbn10 = vol.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier;
      return {
        isbn: isbn13 || isbn10 || '',
        titel: vol.title || 'Okänd titel',
        författare: vol.authors?.join(', ') || 'Okänd författare',
        förlag: vol.publisher || null,
        datum: vol.publishedDate || null,
        genre: vol.categories?.join(', ') || null,
        beskrivning: vol.description || null,
        omslag: vol.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
        sidor: vol.pageCount || null,
        språk: vol.language || null,
      };
    });
  } catch {
    return [];
  }
}
