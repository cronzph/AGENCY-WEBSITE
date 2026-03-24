import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Collection reference
const adminUsersRef = collection(db, 'adminUsers');

/**
 * Create a new admin user document in Firestore
 * @param {string} uid - Firebase Auth UID
 * @param {string} email - Admin email
 * @param {string} username - Admin username
 * @returns {Promise<void>}
 */
export const createAdminUser = async (uid, email, username) => {
  const adminDoc = doc(adminUsersRef, uid);
  await setDoc(adminDoc, {
    uid,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    createdAt: serverTimestamp()
  });
};

/**
 * Get admin user by username
 * @param {string} username - Admin username to search
 * @returns {Promise<{ uid, email, username } | null>}
 */
export const getAdminByUsername = async (username) => {
  try {
    const cleanUsername = username.toLowerCase().trim();
    console.log("Looking up username:", cleanUsername);
    
    const q = query(adminUsersRef, where('username', '==', cleanUsername));
    const snapshot = await getDocs(q);
    console.log("Docs found:", snapshot.docs.length);
    
    if (snapshot.empty) {
      console.log("No user found for username:", cleanUsername);
      return null;
    }
    
    const docData = snapshot.docs[0].data();
    console.log("Found email:", docData.email);
    return {
      uid: docData.uid,
      email: docData.email,
      username: docData.username
    };
  } catch (error) {
    console.error("getAdminByUsername error:", error);
    return null;
  }
};

/**
 * Get admin user by UID
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{ uid, email, username } | null>}
 */
export const getAdminByUID = async (uid) => {
  const adminDoc = doc(adminUsersRef, uid);
  const snapshot = await getDoc(adminDoc);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const docData = snapshot.data();
  return {
    uid: docData.uid,
    email: docData.email,
    username: docData.username
  };
};

/**
 * Check if a username is already taken
 * @param {string} username - Username to check
 * @returns {Promise<boolean>}
 */
export const isUsernameTaken = async (username) => {
  const q = query(adminUsersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  
  return !snapshot.empty;
};

/**
 * Update admin username
 * @param {string} uid - Firebase Auth UID
 * @param {string} newUsername - New username
 * @returns {Promise<void>}
 */
export const updateAdminUsername = async (uid, newUsername) => {
  const adminDoc = doc(adminUsersRef, uid);
  await updateDoc(adminDoc, {
    username: newUsername.toLowerCase()
  });
};