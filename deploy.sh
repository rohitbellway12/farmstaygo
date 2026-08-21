#!/bin/bash

set -e

PROJECT="/var/www/farmstaygo"

echo "================================="
echo "FarmStayGo Deployment Started"
echo "================================="

cd "$PROJECT"

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Backend..."
cd "$PROJECT/backend"
npm install
npx prisma migrate deploy
npm run build

echo ">>> Portal..."
cd "$PROJECT/portal"
npm install
npm run build

echo ">>> Website..."
cd "$PROJECT/website"
npm install
npm run build

echo ">>> Restarting PM2..."
pm2 restart farmstay-backend --update-env
pm2 restart farmstay-portal --update-env
pm2 restart farmstay-website --update-env

pm2 save

echo "================================="
echo "Deployment Completed Successfully"
echo "================================="