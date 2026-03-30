#!/bin/bash
set -e

BACKEND_TAR=/tmp/cleo-backend.tar.gz
FRONTEND_TAR=/tmp/cleo-frontend.tar.gz
BACKEND_DIR=/var/www/cleo/backend
FRONTEND_DIR=/var/www/cleo/frontend

echo "🚀 Deploying Cleo..."

# Backend
if [ -f "$BACKEND_TAR" ]; then
  mkdir -p $BACKEND_DIR
  cd $BACKEND_DIR
  tar xzf $BACKEND_TAR
  npm install --production --prefer-offline
  npx prisma migrate deploy
  npx prisma generate
  npm run build
  pm2 reload cleo-backend 2>/dev/null || pm2 start dist/main.js --name cleo-backend --env production
  echo "✅ Backend deployed"
fi

# Frontend
if [ -f "$FRONTEND_TAR" ]; then
  mkdir -p $FRONTEND_DIR
  cd $FRONTEND_DIR
  tar xzf $FRONTEND_TAR
  npm install --prefer-offline
  npm run build
  pm2 reload cleo-frontend 2>/dev/null || pm2 start npm --name cleo-frontend -- start
  echo "✅ Frontend deployed"
fi

pm2 save
echo "🎉 Cleo deployed!"
