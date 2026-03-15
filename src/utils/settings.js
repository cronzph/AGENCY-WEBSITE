import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const defaultSettings = {
  agencyName: 'CronzPH',
  agencyEmail: '',
  agencyFbPage: '',
};

const defaultPaymentMethods = [
  { id: '1', type: 'gcash', accountNumber: '09123456789', accountName: 'CronzPH', active: true },
];

export const getAgencySettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    if (settingsDoc.exists()) {
      return { ...defaultSettings, ...settingsDoc.data() };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching agency settings:', error);
    return defaultSettings;
  }
};

export const getAgencyName = async () => {
  const settings = await getAgencySettings();
  return settings.agencyName || defaultSettings.agencyName;
};

export const getPaymentMethods = async () => {
  try {
    const methodsDoc = await getDoc(doc(db, 'settings', 'paymentMethods'));
    if (methodsDoc.exists() && methodsDoc.data().methods) {
      return methodsDoc.data().methods;
    }
    return defaultPaymentMethods;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return defaultPaymentMethods;
  }
};

export const getActivePaymentMethods = async () => {
  const methods = await getPaymentMethods();
  return methods.filter(m => m.active);
};
