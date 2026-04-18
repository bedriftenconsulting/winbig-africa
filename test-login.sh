#!/bin/bash
curl -s -X POST http://localhost:4000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@randco.com","password":"Admin@123!"}'
