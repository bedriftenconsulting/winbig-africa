#!/bin/bash
set -e

echo "=== Installing Go 1.24 ==="
wget -q https://go.dev/dl/go1.24.2.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.2.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
export PATH=$PATH:/usr/local/go/bin
go version

echo "=== Cloning repo ==="
cd ~
git clone https://github.com/bedriftenconsulting/vinne.git vinne
cd ~/vinne/vinne-microservices

echo "=== Starting infrastructure ==="
sudo docker-compose up -d \
  service-admin-management-db \
  service-agent-auth-db \
  service-agent-management-db \
  service-wallet-db \
  service-terminal-db \
  service-payment-db \
  service-game-db \
  service-draw-db \
  service-ticket-db \
  service-notification-db \
  service-player-db \
  service-admin-management-redis \
  service-agent-auth-redis \
  service-agent-management-redis \
  service-wallet-redis \
  service-terminal-redis \
  service-payment-redis \
  service-game-redis \
  service-draw-redis \
  service-ticket-redis \
  service-notification-redis \
  service-player-redis \
  redis-shared \
  kafka

echo "=== Waiting for DBs to be ready ==="
sleep 15

echo "=== Done! Infrastructure is up ==="
sudo docker ps --format "table {{.Names}}\t{{.Status}}"
