import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';

export const createNotification = async (type, data) => {
  try {
    const notificationData = {
      type,
      read: false,
      createdAt: serverTimestamp(),
      ...data,
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

export const createNotifications = {
  newInquiry: async (project) => {
    return createNotification('new_inquiry', {
      message: `New inquiry from ${project.clientName} - ${project.businessName}`,
      projectId: project.id,
      clientName: project.clientName,
      businessName: project.businessName,
    });
  },

  proposalAccepted: async (project) => {
    return createNotification('proposal_accepted', {
      message: `Proposal accepted by ${project.clientName}`,
      projectId: project.id,
      clientName: project.clientName,
    });
  },

  paymentSubmitted: async (payment, project) => {
    const amount = payment.amount?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || '₱0';
    return createNotification('payment_submitted', {
      message: `Payment proof submitted by ${payment.clientName} - ${amount}`,
      projectId: payment.projectId,
      clientName: payment.clientName,
      amount: payment.amount,
      paymentId: payment.id,
    });
  },

  paymentConfirmed: async (payment, project) => {
    return createNotification('payment_confirmed', {
      message: `Payment confirmed for ${project?.businessName || payment.projectType}`,
      projectId: payment.projectId,
      clientName: payment.clientName,
      amount: payment.amount,
      paymentId: payment.id,
    });
  },

  projectDelivered: async (project) => {
    return createNotification('project_delivered', {
      message: `Project delivered: ${project.businessName}`,
      projectId: project.id,
      clientName: project.clientName,
    });
  },
};

export const markAsRead = async (notificationId) => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
    return true;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
};

export const markAllAsRead = async (notificationIds) => {
  try {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      batch.update(doc(db, 'notifications', id), { read: true });
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
  }
};

export const getNotificationIcon = (type) => {
  const icons = {
    new_inquiry: '📬',
    proposal_accepted: '✅',
    payment_submitted: '💰',
    payment_confirmed: '💚',
    project_delivered: '🚀',
  };
  return icons[type] || '🔔';
};

export const getNotificationLink = (notification) => {
  switch (notification.type) {
    case 'new_inquiry':
      return `/admin/projects?email=${encodeURIComponent(notification.clientName)}`;
    case 'proposal_accepted':
    case 'payment_submitted':
    case 'payment_confirmed':
      return `/admin/projects`;
    case 'project_delivered':
      return `/admin/projects`;
    default:
      return '/admin';
  }
};
