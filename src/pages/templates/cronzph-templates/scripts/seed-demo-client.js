#!/usr/bin/env node

/**
 * seed-demo-client.js
 * Seeds Firestore demo data using the Firebase CLIENT SDK.
 * No service account key needed — reads credentials from packages/coffee-shop/.env
 *
 * Usage:
 *   node scripts/seed-demo-client.js --template=coffee
 *
 * Requirements:
 *   npm install firebase dotenv   (run once from monorepo root)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load .env manually ──────────────────────────────────────────────────────
const envPath = resolve(__dirname, '../packages/coffee-shop/.env');
if (!existsSync(envPath)) {
    console.error('❌ .env not found at packages/coffee-shop/.env');
    process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
}

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const templateArg = args.find((a) => a.startsWith('--template='));
const template = templateArg ? templateArg.split('=')[1] : 'coffee';

// ── Template config ──────────────────────────────────────────────────────────
const TEMPLATES = {
    coffee: {
        seedFile: resolve(__dirname, '../packages/coffee-shop/seed-data/coffee-seed.json'),
        collections: {
            products: 'demo_coffee_products',
            orders: 'demo_coffee_orders',
        },
    },
};

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n🌱 Seeding demo data for template: ${template}\n`);

    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
        console.error(`❌ Unknown template: ${template}`);
        process.exit(1);
    }

    // Dynamic import firebase (must be installed)
    let firebase;
    try {
        firebase = await import('firebase/app');
    } catch {
        console.error('❌ firebase package not found.');
        console.error('   Run: npm install firebase   (from monorepo root)');
        process.exit(1);
    }

    const { initializeApp } = firebase;
    const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } = await import('firebase/firestore');

    const firebaseConfig = {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
    };

    console.log(`📡 Connecting to Firebase project: ${firebaseConfig.projectId}`);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Read seed data
    if (!existsSync(templateConfig.seedFile)) {
        console.error(`❌ Seed file not found: ${templateConfig.seedFile}`);
        process.exit(1);
    }
    const seedData = JSON.parse(readFileSync(templateConfig.seedFile, 'utf8'));

    // Clear + seed products
    const productsCol = templateConfig.collections.products;
    console.log(`🗑️  Clearing ${productsCol}...`);
    await clearCollection(db, productsCol, getDocs, deleteDoc, collection, doc);

    console.log(`📦 Seeding ${productsCol}...`);
    for (const product of seedData.products) {
        await addDoc(collection(db, productsCol), product);
    }
    console.log(`   ✅ Added ${seedData.products.length} products`);

    // Clear + seed orders
    const ordersCol = templateConfig.collections.orders;
    console.log(`🗑️  Clearing ${ordersCol}...`);
    await clearCollection(db, ordersCol, getDocs, deleteDoc, collection, doc);

    console.log(`📋 Seeding ${ordersCol}...`);
    for (const order of seedData.orders) {
        await addDoc(collection(db, ordersCol), order);
    }
    console.log(`   ✅ Added ${seedData.orders.length} orders`);

    console.log('\n✅ Demo data seeded successfully!\n');
    process.exit(0);
}

async function clearCollection(db, collectionName, getDocs, deleteDoc, collection, doc) {
    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty) return;
    for (const document of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, document.id));
    }
    console.log(`   Cleared ${snapshot.size} documents from ${collectionName}`);
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
});
