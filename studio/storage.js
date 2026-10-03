(() => {
  "use strict";

  const DB_NAME = "morphora-studio";
  const DB_VERSION = 1;
  const IMAGE_STORE = "local-images";

  function openDatabase() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          db.createObjectStore(IMAGE_STORE, { keyPath: "viewId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open Studio storage."));
    });
  }

  async function withStore(mode, callback) {
    const db = await openDatabase();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, mode);
      const store = transaction.objectStore(IMAGE_STORE);
      let result;
      try {
        result = callback(store);
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Studio storage transaction failed."));
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error || new Error("Studio storage transaction was aborted."));
      };
    });
  }

  async function putImage(viewId, file, metadata = {}) {
    if (!viewId || !file) return false;
    await withStore("readwrite", (store) => {
      store.put({
        viewId,
        blob: file,
        name: file.name || metadata.fileName || `${viewId}.jpg`,
        type: file.type || metadata.type || "application/octet-stream",
        lastModified: Number(file.lastModified || Date.now()),
        repoPath: metadata.repoPath || "",
        width: Number(metadata.width || 0),
        height: Number(metadata.height || 0),
        savedAt: new Date().toISOString()
      });
    });
    return true;
  }

  async function getImage(viewId) {
    if (!viewId || !("indexedDB" in window)) return null;
    const db = await openDatabase();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, "readonly");
      const request = transaction.objectStore(IMAGE_STORE).get(viewId);
      request.onsuccess = () => {
        const record = request.result || null;
        db.close();
        resolve(record);
      };
      request.onerror = () => {
        const error = request.error || new Error("Could not read the stored Studio image.");
        db.close();
        reject(error);
      };
    });
  }

  async function deleteImage(viewId) {
    if (!viewId || !("indexedDB" in window)) return false;
    await withStore("readwrite", (store) => store.delete(viewId));
    return true;
  }

  async function listImages() {
    if (!("indexedDB" in window)) return [];
    const db = await openDatabase();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, "readonly");
      const request = transaction.objectStore(IMAGE_STORE).getAll();
      request.onsuccess = () => {
        const records = Array.isArray(request.result) ? request.result : [];
        db.close();
        resolve(records);
      };
      request.onerror = () => {
        const error = request.error || new Error("Could not list stored Studio images.");
        db.close();
        reject(error);
      };
    });
  }

  window.MorphoraStudioStorage = Object.freeze({
    supported: "indexedDB" in window,
    putImage,
    getImage,
    deleteImage,
    listImages
  });
})();
