#!/bin/bash
# Run this script on a fresh Ubuntu EC2 instance
# Usage: bash setup-ec2.sh

set -e

echo "=== Installing Docker ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== Adding current user to docker group ==="
sudo usermod -aG docker $USER

echo "=== Enabling Docker on startup ==="
sudo systemctl enable docker
sudo systemctl start docker

echo "=== Cloning repository ==="
# Replace with your actual repo URL
git clone https://github.com/nexalabshq/vinne-microservices.git ~/vinne-microservices
cd ~/vinne-microservices

echo "=== Creating .env file ==="
cat > .env << 'EOF'
# IMPORTANT: Change all these values before running!
JWT_SECRET=change-this-to-a-strong-random-secret-key

# Database passwords (change these!)
ADMIN_MGMT_DB_PASSWORD=admin_mgmt123
AGENT_DB_PASSWORD=agent123
AGENT_MGMT_DB_PASSWORD=agent_mgmt123
WALLET_DB_PASSWORD=wallet123
TERMINAL_DB_PASSWORD=terminal123
PAYMENT_DB_PASSWORD=payment123
GAME_DB_PASSWORD=game123
DRAW_DB_PASSWORD=draw_service123
TICKET_DB_PASSWORD=ticket123
NOTIFICATION_DB_PASSWORD=notification123
PLAYER_DB_PASSWORD=player123

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-this-minio-password

# Grafana
GRAFANA_PASSWORD=change-this-grafana-password

# Your domain or EC2 public IP (e.g. http://12.34.56.78:3000)
ALLOWED_ORIGINS=http://localhost:3000
CDN_ENDPOINT=http://localhost:9000/vinne-game-assets

# Payment
PAYMENT_TEST_MODE=false
EOF

echo ""
echo "=== Setup complete! ==="
echo ""
echo "NEXT STEPS:"
echo "1. Edit .env with your actual secrets: nano ~/vinne-microservices/.env"
echo "2. Log into GHCR: echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"
echo "3. Start all services: cd ~/vinne-microservices && docker compose -f docker-compose.prod.yml up -d"
echo "4. Check logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "NOTE: Log out and back in for docker group to take effect, or run: newgrp docker"
