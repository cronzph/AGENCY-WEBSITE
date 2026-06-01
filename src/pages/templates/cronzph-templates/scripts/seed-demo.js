#!/usr/bin/env node

/**
 * seed-demo.js
 * Seeds Firestore with demo data for CronzPH templates.
 *
 * Usage:
 *   node scripts/seed-demo.js --template=coffee
 *   node scripts/seed-demo.js --template=pos
 *
 * Requirements:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env var to your Firebase Admin SDK service account key path
 *   - Or place a serviceAccountKey.json in the project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const templateArg = args.find((arg) => arg.startsWith('--template='));
const template = templateArg ? templateArg.split('=')[1] : 'coffee';

// Template configuration
const TEMPLATES = {
    coffee: {
        seedFile: resolve(__dirname, '../packages/coffee-shop/seed-data/coffee-seed.json'),
        collections: {
            products: 'demo_coffee_products',
            orders: 'demo_coffee_orders',
        },
    },
    pos: {
        seedFile: resolve(__dirname, '../packages/pos/seed-data/pos-seed.json'),
        collections: {
            products: 'demo_pos_products',
            transactions: 'demo_pos_transactions',
        },
    },
};

async function main() {
    console.log(`\n🌱 Seeding demo data for template: ${template}\n`);

    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
        console.error(`❌ Unknown template: ${template}`);
        console.error(`   Available templates: ${Object.keys(TEMPLATES).join(', ')}`);
        process.exit(1);
    }

    // Initialize Firebase Admin
    let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
        const defaultPath = resolve(__dirname, '../serviceAccountKey.json');
        if (existsSync(defaultPath)) {
            serviceAccountPath = defaultPath;
        } else {
            console.error('❌ No service account key found.');
            console.error('   Set GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in project root.');
            process.exit(1);
        }
    }

    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount),
    });

    const db = getFirestore();

    // Read seed data
    if (!existsSync(templateConfig.seedFile)) {
        console.error(`❌ Seed file not found: ${templateConfig.seedFile}`);
        process.exit(1);
    }

    const seedData = JSON.parse(readFileSync(templateConfig.seedFile, 'utf8'));

    // Clear existing demo collections
    console.log('🗑️  Clearing existing demo collections...');
    for (const collectionName of Object.values(templateConfig.collections)) {
        await clearCollection(db, collectionName);
    }

    // Seed based on template type
    if (template === 'coffee') {
        // Seed products
        const productsCollection = templateConfig.collections.products;
        console.log(`📦 Seeding ${productsCollection}...`);
        for (const product of seedData.products) {
            await db.collection(productsCollection).add(product);
        }
        console.log(`   ✅ Added ${seedData.products.length} products`);

        // Seed orders
        const ordersCollection = templateConfig.collections.orders;
        console.log(`📋 Seeding ${ordersCollection}...`);
        for (const order of seedData.orders) {
            await db.collection(ordersCollection).add(order);
        }
        console.log(`   ✅ Added ${seedData.orders.length} orders`);
    } else if (template === 'pos') {
        // Seed POS products
        const productsCollection = templateConfig.collections.products;
        const productsData = seedData.demo_pos_products || [];
        console.log(`📦 Seeding ${productsCollection}...`);
        for (const product of productsData) {
            await db.collection(productsCollection).add({
                ...product,
                createdAt: new Date().toISOString(),
            });
        }
        console.log(`   ✅ Added ${productsData.length} products`);

        // Seed POS transactions
        const transactionsCollection = templateConfig.collections.transactions;
        const transactionsData = seedData.demo_pos_transactions || [];
        console.log(`🧾 Seeding ${transactionsCollection}...`);
        for (const transaction of transactionsData) {
            await db.collection(transactionsCollection).add(transaction);
        }
        console.log(`   ✅ Added ${transactionsData.length} transactions`);
    }

    console.log('\n✅ Demo data seeded successfully!\n');
    process.exit(0);
}

async function clearCollection(db, collectionName) {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`   Cleared ${snapshot.size} documents from ${collectionName}`);
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
});
