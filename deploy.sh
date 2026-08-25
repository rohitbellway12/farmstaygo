#!/bin/bash

set -e

PROJECT="/var/www/farmstaygo"

trap 'echo "================================="; echo "❌ Deployment FAILED at line $LINENO"; echo "================================="; exit 1' ERR

echo "================================="
echo "FarmStayGo Deployment Started"
echo "================================="

cd "$PROJECT"

echo ">>> Fetching latest code..."
git fetch origin main

echo ">>> Resetting to origin/main..."
git reset --hard origin/main

echo ">>> Current commit:"
git log -1 --oneline

echo ">>> Backend..."

cd "$PROJECT/backend"

echo ">>> Installing backend dependencies..."
npm install

echo ">>> Generating Prisma client..."
npx prisma generate

echo ">>> Running Prisma migrations..."
npx prisma migrate deploy

echo ">>> Building backend..."
npm run build

echo ">>> Portal..."

cd "$PROJECT/portal"

echo ">>> Installing portal dependencies..."
npm install

echo ">>> Building portal..."
npm run build

echo ">>> Website..."

cd "$PROJECT/website"

echo ">>> Installing website dependencies..."
npm install

echo ">>> Building website..."
npm run build

echo ">>> Restarting PM2..."

pm2 restart farmstay-backend --update-env
pm2 restart farmstay-portal --update-env
pm2 restart farmstay-website --update-env

pm2 save

echo "================================="
echo "✅ Deployment Completed Successfully"
echo "================================="