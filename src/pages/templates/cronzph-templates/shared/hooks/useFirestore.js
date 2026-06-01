import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

export function useFirestore(collectionName) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setDocuments(docs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [collectionName]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const addDocument = async (data) => {
        if (DEMO_MODE) {
            const newDoc = { ...data, id: crypto.randomUUID() };
            setDocuments((prev) => [...prev, newDoc]);
            return newDoc;
        }
        try {
            const docRef = await addDoc(collection(db, collectionName), data);
            const newDoc = { id: docRef.id, ...data };
            setDocuments((prev) => [...prev, newDoc]);
            return newDoc;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateDocument = async (id, data) => {
        if (DEMO_MODE) {
            setDocuments((prev) =>
                prev.map((doc) => (doc.id === id ? { ...doc, ...data } : doc))
            );
            return;
        }
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, data);
            setDocuments((prev) =>
                prev.map((d) => (d.id === id ? { ...d, ...data } : d))
            );
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteDocument = async (id) => {
        if (DEMO_MODE) {
            setDocuments((prev) => prev.filter((doc) => doc.id !== id));
            return;
        }
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        documents,
        loading,
        error,
        addDocument,
        updateDocument,
        deleteDocument,
        refetch: fetchDocuments,
    };
}
