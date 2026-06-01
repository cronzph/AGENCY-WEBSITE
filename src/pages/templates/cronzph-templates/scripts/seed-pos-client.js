/**
 * seed-pos-demo.js
 * Seeds Firestore with POS demo data using Firebase Web SDK (client-side compatible).
 * 
 * Usage: Run from the browser console when logged in, or use with Node.js + firebase client SDK.
 * 
 * For the browser: Copy the seedPOSData() function content into the browser console
 * while on the POS app (localhost:5175).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyDKhXaUo_DPhxPVmB-0i_ncbCMnH0uGyKQ',
    authDomain: 'templates-a3137.firebaseapp.com',
    projectId: 'templates-a3137',
    storageBucket: 'templates-a3137.firebasestorage.app',
    messagingSenderId: '422148648424',
    appId: '1:422148648424:web:909e20ac493efa8081885d',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PRODUCTS = [
    { name: "Coca-Cola 330ml", price: 35, category: "Beverages", stock: 48, emoji: "🥤", barcode: "4800016001234", lowStockThreshold: 10, available: true },
    { name: "Sprite 330ml", price: 35, category: "Beverages", stock: 36, emoji: "🥤", barcode: "4800016001235", lowStockThreshold: 10, available: true },
    { name: "Kopiko Brown 25g", price: 8, category: "Coffee", stock: 100, emoji: "☕", barcode: "4800016002001", lowStockThreshold: 20, available: true },
    { name: "Lucky Me Pancit Canton", price: 15, category: "Noodles", stock: 60, emoji: "🍜", barcode: "4800016003001", lowStockThreshold: 15, available: true },
    { name: "Boy Bawang Garlic", price: 12, category: "Snacks", stock: 45, emoji: "🌽", barcode: "4800016004001", lowStockThreshold: 10, available: true },
    { name: "Skyflakes Crackers", price: 10, category: "Snacks", stock: 55, emoji: "🍪", barcode: "4800016004002", lowStockThreshold: 10, available: true },
    { name: "Rebisco Sandwich", price: 5, category: "Snacks", stock: 80, emoji: "🍪", barcode: "4800016004003", lowStockThreshold: 15, available: true },
    { name: "C2 Green Tea 500ml", price: 25, category: "Beverages", stock: 30, emoji: "🍵", barcode: "4800016001236", lowStockThreshold: 10, available: true },
    { name: "Safeguard Soap", price: 38, category: "Personal Care", stock: 20, emoji: "🧼", barcode: "4800016005001", lowStockThreshold: 5, available: true },
    { name: "Tide Powder 80g", price: 12, category: "Household", stock: 40, emoji: "🧺", barcode: "4800016006001", lowStockThreshold: 10, available: true },
    { name: "Argentina Corned Beef 150g", price: 45, category: "Canned Goods", stock: 25, emoji: "🥫", barcode: "4800016007001", lowStockThreshold: 5, available: true },
    { name: "555 Sardines 155g", price: 22, category: "Canned Goods", stock: 3, emoji: "🐟", barcode: "4800016007002", lowStockThreshold: 5, available: true },
    { name: "Bear Brand Milk 33g", price: 15, category: "Beverages", stock: 50, emoji: "🥛", barcode: "4800016001237", lowStockThreshold: 10, available: true },
    { name: "Marlboro Red", price: 195, category: "Tobacco", stock: 15, emoji: "🚬", barcode: "4800016008001", lowStockThreshold: 5, available: true },
    { name: "Yakult 5-pack", price: 52, category: "Beverages", stock: 12, emoji: "🧃", barcode: "4800016001238", lowStockThreshold: 5, available: true },
    { name: "Rice 1kg (Sinandomeng)", price: 55, category: "Staples", stock: 30, emoji: "🍚", barcode: "4800016009001", lowStockThreshold: 10, available: true },
];

const TRANSACTIONS = [
    {
        items: [{ name: "Coca-Cola 330ml", price: 35, quantity: 2 }, { name: "Boy Bawang Garlic", price: 12, quantity: 1 }],
        total: 82, paymentMethod: "cash", amountPaid: 100, change: 18, status: "completed", timestamp: "2026-05-18T08:15:00.000Z"
    },
    {
        items: [{ name: "Lucky Me Pancit Canton", price: 15, quantity: 3 }, { name: "Sprite 330ml", price: 35, quantity: 1 }],
        total: 80, paymentMethod: "gcash", amountPaid: 80, change: 0, status: "completed", timestamp: "2026-05-18T09:30:00.000Z"
    },
    {
        items: [{ name: "Rice 1kg (Sinandomeng)", price: 55, quantity: 2 }, { name: "Argentina Corned Beef 150g", price: 45, quantity: 1 }, { name: "555 Sardines 155g", price: 22, quantity: 2 }],
        total: 199, paymentMethod: "cash", amountPaid: 200, change: 1, status: "completed", timestamp: "2026-05-18T10:00:00.000Z"
    },
    {
        items: [{ name: "Marlboro Red", price: 195, quantity: 1 }],
        total: 195, paymentMethod: "cash", amountPaid: 200, change: 5, status: "completed", timestamp: "2026-05-18T10:45:00.000Z"
    },
    {
        items: [{ name: "Kopiko Brown 25g", price: 8, quantity: 5 }, { name: "Bear Brand Milk 33g", price: 15, quantity: 3 }],
        total: 85, paymentMethod: "cash", amountPaid: 100, change: 15, status: "completed", timestamp: "2026-05-17T14:20:00.000Z"
    },
    {
        items: [{ name: "Safeguard Soap", price: 38, quantity: 2 }, { name: "Tide Powder 80g", price: 12, quantity: 3 }],
        total: 112, paymentMethod: "gcash", amountPaid: 112, change: 0, status: "completed", timestamp: "2026-05-17T16:00:00.000Z"
    },
    {
        items: [{ name: "Yakult 5-pack", price: 52, quantity: 2 }, { name: "C2 Green Tea 500ml", price: 25, quantity: 2 }],
        total: 154, paymentMethod: "cash", amountPaid: 200, change: 46, status: "completed", timestamp: "2026-05-16T11:30:00.000Z"
    },
    {
        items: [{ name: "Skyflakes Crackers", price: 10, quantity: 4 }, { name: "Rebisco Sandwich", price: 5, quantity: 6 }, { name: "Coca-Cola 330ml", price: 35, quantity: 1 }],
        total: 105, paymentMethod: "cash", amountPaid: 110, change: 5, status: "completed", timestamp: "2026-05-16T09:15:00.000Z"
    },
    {
        items: [{ name: "C2 Green Tea 500ml", price: 25, quantity: 3 }, { name: "Boy Bawang Garlic", price: 12, quantity: 2 }],
        total: 99, paymentMethod: "cash", amountPaid: 100, change: 1, status: "completed", timestamp: "2026-05-15T13:45:00.000Z"
    },
    {
        items: [{ name: "Rice 1kg (Sinandomeng)", price: 55, quantity: 3 }, { name: "Bear Brand Milk 33g", price: 15, quantity: 5 }],
        total: 240, paymentMethod: "gcash", amountPaid: 240, change: 0, status: "completed", timestamp: "2026-05-15T10:00:00.000Z"
    },
];

async function clearCollection(collectionName) {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletePromises = snapshot.docs.map((d) => deleteDoc(doc(db, collectionName, d.id)));
    await Promise.all(deletePromises);
    console.log(`  🗑️  Cleared ${snapshot.size} docs from ${collectionName}`);
}

async function seedPOSData() {
    console.log('\n🌱 Seeding POS demo data...\n');

    // Clear existing
    console.log('Clearing existing data...');
    await clearCollection('demo_pos_products');
    await clearCollection('demo_pos_transactions');

    // Seed products
    console.log('\n📦 Seeding products...');
    for (const product of PRODUCTS) {
        await addDoc(collection(db, 'demo_pos_products'), {
            ...product,
            createdAt: new Date().toISOString(),
        });
    }
    console.log(`  ✅ Added ${PRODUCTS.length} products`);

    // Seed transactions
    console.log('\n🧾 Seeding transactions...');
    for (const txn of TRANSACTIONS) {
        await addDoc(collection(db, 'demo_pos_transactions'), txn);
    }
    console.log(`  ✅ Added ${TRANSACTIONS.length} transactions`);

    console.log('\n✅ POS demo data seeded successfully!\n');
}

seedPOSData().catch(console.error);
