#!/bin/bash

# Test game creation with WinBig competition fields
curl -X POST http://localhost:4000/api/v1/admin/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbl9pZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJleHAiOjE3NDQ3MzI4MDB9.test" \
  -d '{
    "code": "TEST-COMP-001",
    "name": "Test Competition",
    "game_category": "private",
    "base_price": 10,
    "total_tickets": 1000,
    "start_date": "2026-04-15",
    "end_date": "2026-04-30",
    "prize_details": "1st Prize: BMW X5, 2nd Prize: iPhone 15 Pro",
    "rules": "One entry per person. Must be 18+.",
    "status": "Active",
    "number_range_min": 1,
    "number_range_max": 90,
    "selection_count": 5,
    "draw_frequency": "special",
    "sales_cutoff_minutes": 30,
    "max_tickets_per_player": 1000
  }'
