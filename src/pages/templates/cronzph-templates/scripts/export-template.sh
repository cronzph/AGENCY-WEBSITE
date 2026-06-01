#!/bin/bash

# export-template.sh
# Exports a template package as a standalone zip for client delivery.
#
# Usage:
#   ./scripts/export-template.sh coffee-shop
#

set -e

TEMPLATE_NAME=$1
VERSION="v1.0"

if [ -z "$TEMPLATE_NAME" ]; then
  echo "❌ Usage: ./scripts/export-template.sh <template-name>"
  echo "   Example: ./scripts/export-template.sh coffee-shop"
  exit 1
fi

TEMPLATE_DIR="packages/$TEMPLATE_NAME"
EXPORT_DIR="exports/${TEMPLATE_NAME}-${VERSION}"
ZIP_FILE="exports/${TEMPLATE_NAME}-${VERSION}.zip"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "❌ Template not found: $TEMPLATE_DIR"
  exit 1
fi

# Clean previous export
rm -rf "$EXPORT_DIR"
rm -f "$ZIP_FILE"

# Create export directory
mkdir -p "$EXPORT_DIR"

# Copy template files
echo "📦 Copying template: $TEMPLATE_NAME..."
cp -r "$TEMPLATE_DIR"/* "$EXPORT_DIR/"
cp -r "$TEMPLATE_DIR"/.[!.]* "$EXPORT_DIR/" 2>/dev/null || true

# Copy shared directory into src/shared
echo "📦 Copying shared utilities..."
mkdir -p "$EXPORT_DIR/src/shared"
cp -r shared/components "$EXPORT_DIR/src/shared/"
cp -r shared/hooks "$EXPORT_DIR/src/shared/"
cp -r shared/firebase "$EXPORT_DIR/src/shared/"

# Remove .env (keep .env.example)
rm -f "$EXPORT_DIR/.env"
rm -f "$EXPORT_DIR/.env.local"

# Remove node_modules if present
rm -rf "$EXPORT_DIR/node_modules"

# Update vite.config.js alias to use local shared
cat > "$EXPORT_DIR/vite.config.js" << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
EOF

# Update package.json to remove workspace dependency
cd "$EXPORT_DIR"
if command -v node &> /dev/null; then
  node -e "
    const pkg = require('./package.json');
    delete pkg.dependencies['@cronzph/shared'];
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi
cd - > /dev/null

# Create zip
echo "🗜️  Creating zip archive..."
cd exports
zip -r "${TEMPLATE_NAME}-${VERSION}.zip" "${TEMPLATE_NAME}-${VERSION}/" -x "*/node_modules/*"
cd - > /dev/null

# Clean up unzipped export
rm -rf "$EXPORT_DIR"

echo ""
echo "✅ Done: $ZIP_FILE"
echo ""
