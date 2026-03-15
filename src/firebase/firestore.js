import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

// Collection references
const clientsRef = collection(db, 'clients');
const projectsRef = collection(db, 'projects');
const paymentsRef = collection(db, 'payments');

// ============== CLIENTS ==============

/**
 * Add a new client to Firestore
 * @param {Object} data - Client data
 * @returns {Promise<DocumentReference>}
 */
export const addClient = async (data) => {
  return await addDoc(clientsRef, {
    ...data,
    createdAt: serverTimestamp(),
    status: 'active',
  });
};

/**
 * Get all clients from Firestore
 * @returns {Promise<QuerySnapshot>}
 */
export const getClients = async () => {
  return await getDocs(clientsRef);
};

// ============== PROJECTS ==============

/**
 * Add a new project to Firestore
 * @param {Object} data - Project data
 * @returns {Promise<DocumentReference>}
 */
export const addProject = async (data) => {
  return await addDoc(projectsRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

/**
 * Get all projects from Firestore
 * @returns {Promise<QuerySnapshot>}
 */
export const getProjects = async () => {
  return await getDocs(projectsRef);
};

/**
 * Update project status
 * @param {string} id - Project ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export const updateProjectStatus = async (id, status) => {
  const projectDoc = doc(db, 'projects', id);
  const updateData = { status };
  
  if (status === 'delivered') {
    updateData.deliveredAt = serverTimestamp();
  }
  
  await updateDoc(projectDoc, updateData);
};

// ============== PAYMENTS ==============

/**
 * Add a new payment to Firestore
 * @param {Object} data - Payment data
 * @returns {Promise<DocumentReference>}
 */
export const addPayment = async (data) => {
  return await addDoc(paymentsRef, {
    ...data,
    createdAt: serverTimestamp(),
    status: 'pending',
  });
};

/**
 * Get all payments from Firestore
 * @returns {Promise<QuerySnapshot>}
 */
export const getPayments = async () => {
  return await getDocs(paymentsRef);
};

/**
 * Update payment status
 * @param {string} id - Payment ID
 * @param {string} status - New status (pending/confirmed/rejected)
 * @returns {Promise<void>}
 */
export const updatePaymentStatus = async (id, status) => {
  const paymentDoc = doc(db, 'payments', id);
  const updateData = { status };
  
  if (status === 'confirmed') {
    updateData.confirmedAt = serverTimestamp();
  }
  
  await updateDoc(paymentDoc, updateData);
};
