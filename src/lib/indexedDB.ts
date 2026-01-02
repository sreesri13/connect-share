// IndexedDB wrapper for offline data persistence
const DB_NAME = "connecthub-db";
const DB_VERSION = 1;

interface DBStores {
  preferences: {
    key: string;
    value: any;
    updatedAt: string;
  };
  recentQRPages: {
    id: string;
    publicId: string;
    title: string;
    url: string;
    visitedAt: string;
    data?: any;
  };
  selectedProducts: {
    id: string;
    productId: string;
    userId: string;
    addedAt: string;
  };
}

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Preferences store (theme, language, etc.)
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "key" });
      }

      // Recent QR pages cache
      if (!db.objectStoreNames.contains("recentQRPages")) {
        const qrStore = db.createObjectStore("recentQRPages", { keyPath: "id" });
        qrStore.createIndex("visitedAt", "visitedAt", { unique: false });
      }

      // Selected products for QR Business
      if (!db.objectStoreNames.contains("selectedProducts")) {
        const productsStore = db.createObjectStore("selectedProducts", { keyPath: "id" });
        productsStore.createIndex("userId", "userId", { unique: false });
      }
    };
  });
};

// Preferences management
export const setPreference = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["preferences"], "readwrite");
    const store = transaction.objectStore("preferences");
    const request = store.put({
      key,
      value,
      updatedAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPreference = async <T>(key: string): Promise<T | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["preferences"], "readonly");
    const store = transaction.objectStore("preferences");
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result?.value ?? null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllPreferences = async (): Promise<Record<string, any>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["preferences"], "readonly");
    const store = transaction.objectStore("preferences");
    const request = store.getAll();
    request.onsuccess = () => {
      const prefs: Record<string, any> = {};
      request.result.forEach((item: DBStores["preferences"]) => {
        prefs[item.key] = item.value;
      });
      resolve(prefs);
    };
    request.onerror = () => reject(request.error);
  });
};

// Recent QR Pages management
export const saveRecentQRPage = async (
  id: string,
  publicId: string,
  title: string,
  url: string,
  data?: any
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recentQRPages"], "readwrite");
    const store = transaction.objectStore("recentQRPages");
    const request = store.put({
      id,
      publicId,
      title,
      url,
      visitedAt: new Date().toISOString(),
      data
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getRecentQRPages = async (limit: number = 20): Promise<DBStores["recentQRPages"][]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recentQRPages"], "readonly");
    const store = transaction.objectStore("recentQRPages");
    const index = store.index("visitedAt");
    const request = index.openCursor(null, "prev");
    const results: DBStores["recentQRPages"][] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getRecentQRPageById = async (id: string): Promise<DBStores["recentQRPages"] | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recentQRPages"], "readonly");
    const store = transaction.objectStore("recentQRPages");
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
};

// Selected Products management for QR Business
export const saveSelectedProduct = async (
  productId: string,
  userId: string
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["selectedProducts"], "readwrite");
    const store = transaction.objectStore("selectedProducts");
    const request = store.put({
      id: `${userId}-${productId}`,
      productId,
      userId,
      addedAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const removeSelectedProduct = async (productId: string, userId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["selectedProducts"], "readwrite");
    const store = transaction.objectStore("selectedProducts");
    const request = store.delete(`${userId}-${productId}`);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSelectedProducts = async (userId: string): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["selectedProducts"], "readonly");
    const store = transaction.objectStore("selectedProducts");
    const index = store.index("userId");
    const request = index.getAll(userId);
    request.onsuccess = () => {
      resolve(request.result.map((item: DBStores["selectedProducts"]) => item.productId));
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearSelectedProducts = async (userId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["selectedProducts"], "readwrite");
    const store = transaction.objectStore("selectedProducts");
    const index = store.index("userId");
    const request = index.openCursor(userId);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Initialize DB on module load
openDB().catch(console.error);
