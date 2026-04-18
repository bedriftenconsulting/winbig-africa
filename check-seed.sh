#!/bin/bash
# Check admin users table structure and data
docker exec vinne-microservices_service-admin-management-db_1 \
  psql -U admin_mgmt -d admin_management \
  -c "\d admin_users" 2>&1 | head -20

docker exec vinne-microservices_service-admin-management-db_1 \
  psql -U admin_mgmt -d admin_management \
  -c "SELECT id, email, status FROM admin_users LIMIT 5;"
