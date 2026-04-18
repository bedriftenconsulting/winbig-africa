#!/bin/bash
docker exec vinne-microservices_service-admin-management-db_1 \
  psql -U admin_mgmt -d admin_management << 'SQL'

-- Insert superadmin user (password: Admin@123!)
INSERT INTO admin_users (id, email, username, password_hash, first_name, last_name, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00',
    'superadmin@randco.com',
    'superadmin',
    '$2b$10$Oowo/nx.NNXj.2fIGjbRR.DagmwrIaB.HF1CchM9LfG7OzL/dJdEG',
    'Super',
    'Admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert second admin (surajmohammedbwoy@gmail.com, password: Admin@123!)
INSERT INTO admin_users (id, email, username, password_hash, first_name, last_name, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    'surajmohammedbwoy@gmail.com',
    'surajadmin',
    '$2b$10$Oowo/nx.NNXj.2fIGjbRR.DagmwrIaB.HF1CchM9LfG7OzL/dJdEG',
    'Suraj',
    'Admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Ensure super_admin role exists
INSERT INTO admin_roles (id, name, description, is_system_role)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'super_admin', 'Super Administrator', TRUE)
ON CONFLICT DO NOTHING;

-- Assign super_admin role to both users
INSERT INTO admin_user_roles (user_id, role_id)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;

INSERT INTO admin_user_roles (user_id, role_id)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;

-- Confirm
SELECT email, username, is_active FROM admin_users;

SQL
