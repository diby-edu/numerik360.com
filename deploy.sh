#!/bin/bash
# Script de déploiement atomique — /var/www/numerik360/deploy.sh
# Usage : bash deploy.sh
set -e

SITE_DIR="/var/www/numerik360"
API_DIR="/root/numerik360-api"

cd "$SITE_DIR"

# OPS-15 : mémoriser le commit AVANT le pull pour détecter tous les changements
OLD_REV=$(git rev-parse HEAD)

echo "==> Git pull..."
git pull origin main
NEW_REV=$(git rev-parse HEAD)

echo "==> Installation des dépendances (npm ci)..."
npm ci

echo "==> Build vers dist_new..."
npm run build -- --outDir dist_new

echo "==> Swap atomique dist_old / dist_new..."
rm -rf dist_old
mv dist dist_old 2>/dev/null || true
mv dist_new dist

echo "==> Nettoyage..."
rm -rf dist_old

# Si server-vps.js a changé entre l'ancien et le nouveau commit, on met à jour l'API
if git diff "$OLD_REV" "$NEW_REV" --name-only 2>/dev/null | grep -q "server-vps.js"; then
  echo "==> Mise à jour API Express..."
  cp "$SITE_DIR/server-vps.js" "$API_DIR/server.js"
  pm2 restart numerik360-api
  echo "==> API redémarrée."
fi

echo "==> Deploiement terminé le $(date '+%d/%m/%Y à %H:%M:%S')"
