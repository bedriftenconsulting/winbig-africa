# Ports Reference

This document provides a comprehensive reference for all service ports and database configurations used in the Rand Lottery microservices platform.

## Service Ports

### API Gateway

- **Port**: 4000
- **Type**: HTTP/REST
- **Description**: Main API gateway for REST endpoints

### gRPC Services

| Service          | Port  | Description                                |
| ---------------- | ----- | ------------------------------------------ |
| Admin Management | 51057 | Admin authentication and user management   |
| Agent Auth       | 51052 | Agent authentication service               |
| Agent Management | 51058 | Agent registration and management          |
| Game             | 51053 | Game configuration and management          |
| Terminal         | 51054 | Terminal device management                 |
| Wallet           | 51059 | Wallet and transaction management          |
| Draw             | 51060 | Draw execution and results                 |
| Payment          | 51061 | Payment processing and gateway integration |
| Ticket           | 51062 | Player Ticker management                   |
| Notification     | 51063 | Multi-channel communication delivery       |
| Player           | 51064 | Player authentication and management       |

## Database Ports

### PostgreSQL Instances

| Service          | Port | Database Name    | Username     | Password        |
| ---------------- | ---- | ---------------- | ------------ | --------------- |
| Agent Auth       | 5434 | agent_auth       | agent        | agent123        |
| Agent Management | 5435 | agent_management | agent_mgmt   | agent_mgmt123   |
| Draw             | 5436 | draw_service     | draw_service | draw_service123 |
| Admin Management | 5437 | admin_management | admin_mgmt   | admin_mgmt123   |
| Wallet           | 5438 | wallet_service   | wallet       | wallet123       |
| Terminal         | 5439 | terminal_service | terminal     | terminal123     |
| Payment          | 5440 | payment_service  | payment      | payment123      |
| Game             | 5441 | game_service     | game         | game123         |
| Ticket | 5442 | ticket_service | ticket | ticket123 |

## Redis Instances

| Service          | Port | Database |
| ---------------- | ---- | -------- |
| API Gateway      | 6379 | 0        |
| Agent Auth       | 6381 | 0        |
| Agent Management | 6382 | 0        |
| Draw             | 6383 | 0        |
| Admin Management | 6384 | 0        |
| Wallet           | 6385 | 0        |
| Terminal         | 6386 | 0        |
| Payment          | 6387 | 0        |
| Game             | 6388 | 0        |
| Ticket | 6389 | 0 |

## Infrastructure Services

| Service          | Port  | Description                      |
| ---------------- | ----- | -------------------------------- |
| Kafka            | 9092  | Message broker (KRaft mode)      |
| Jaeger UI        | 16686 | Distributed tracing UI           |
| Jaeger Collector | 4318  | OpenTelemetry collector endpoint |

## Port Allocation Strategy

### Service Ports

- **4000**: API Gateway (HTTP)
- **51050-51099**: gRPC services range
  - 51052: Agent Auth
  - 51053: Game
  - 51054: Terminal
  - 51057: Admin Management
  - 51058: Agent Management
  - 51059: Wallet
  - 51060: Draw
  - 51061: Payment
  - 51062: Ticket
  - 51063: Notification
  - 51064: Player

### Database Ports
- **5434-5442**: PostgreSQL instances (one per service)

### Cache Ports
- **6379-6389**: Redis instances (one per service)

## Notes

1. **Payment Service**: The payment service ignores the SERVER_PORT environment variable and uses its config.go default port (50061).
2. **Development Environment**: All services run locally on `localhost` for development.
3. **Service Dependencies**:
   - Agent Management depends on Agent Auth (port 50052) and Wallet (port 50059)
   - Draw depends on Ticket (port 50062) and Wallet (port 50059)
   - Ticket depends on Game (port 50053), Draw (port 50060), Payment (port 50061), and Wallet (port 50059)
   - API Gateway routes to all gRPC services

4. **Port Conflicts**: Ensure no two services share the same port. Each service has a unique port assignment.

5. **Recent Port Changes** (2026-04-14):
   - All gRPC services migrated from 500xx → 510xx range to avoid Windows/Hyper-V reserved port conflicts (50000–50159)
   - Agent Auth: 50052 → 51052
   - Game: 50053 → 51053
   - Terminal: 50054 → 51054
   - Admin Management: 50057 → 51057
   - Agent Management: 50058 → 51058
   - Wallet: 50059 → 51059
   - Draw: 50060 → 51060
   - Payment: 50061 → 51061
   - Ticket: 50062 → 51062
   - Notification: 50063 → 51063
   - Player: 50064 → 51064

## Quick Reference Commands

### Check Running Services

```bash
lsof -i -P -n | grep LISTEN | grep -E ":(4000|5005[0-9]|5006[0-9])" | sort -t: -k2 -n
```

### Start All Services

```bash
cd randco-microservices
./scripts/start-infrastructure.sh
./scripts/start-services.sh
```

### Stop All Services

```bash
./scripts/stop-services.sh
```

## Configuration Files

Port configurations are maintained in:

- `services/{service-name}/internal/config/config.go` - Default port settings
- `services/api-gateway/config.env` - API Gateway service references
- `helm/microservices/charts/{service-name}/values.yaml` - Kubernetes deployments
- `scripts/start-services.sh` - Development startup script
- `scripts/generate-argocd-apps.sh` - ArgoCD application generation

Last Updated: 2026-04-14