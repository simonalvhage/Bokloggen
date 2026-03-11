import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as storage from '../utils/storage';

const BooksContext = createContext();

export function BooksProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, c] = await Promise.all([storage.getBooks(), storage.getCollections()]);
      setBooks(b);
      setCollections(c);
      setLoading(false);
    })();
  }, []);

  const addBook = useCallback(async (book) => {
    const updated = await storage.addBook(book);
    setBooks(updated);
    return updated;
  }, []);

  const updateBook = useCallback(async (bookId, updates) => {
    const updated = await storage.updateBook(bookId, updates);
    setBooks(updated);
    return updated;
  }, []);

  const deleteBook = useCallback(async (bookId) => {
    const updated = await storage.deleteBook(bookId);
    setBooks(updated);
    return updated;
  }, []);

  const addCollection = useCallback(async (name) => {
    const updated = await storage.addCollection(name);
    setCollections(updated);
    return updated;
  }, []);

  const deleteCollection = useCallback(async (id) => {
    const updated = await storage.deleteCollection(id);
    setCollections(updated);
    return updated;
  }, []);

  const getBooksByCollection = useCallback(
    (collectionId) => {
      if (collectionId === 'all') return books;
      if (collectionId === 'favorites') return books.filter((b) => b.rating >= 4);
      return books.filter((b) => b.collection === collectionId);
    },
    [books]
  );

  return (
    <BooksContext.Provider
      value={{
        books,
        collections,
        loading,
        addBook,
        updateBook,
        deleteBook,
        addCollection,
        deleteCollection,
        getBooksByCollection,
        setBooks,
        setCollections,
      }}
    >
      {children}
    </BooksContext.Provider>
  );
}

export function useBooks() {
  const context = useContext(BooksContext);
  if (!context) throw new Error('useBooks must be used within BooksProvider');
  return context;
}
