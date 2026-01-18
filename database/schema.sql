DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- enum tipovi

CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'pending',
    'banned'
);

CREATE TYPE work_order_status AS ENUM (
    'pending',
    'approved',
    'in_progress',
    'waiting_parts',
    'completed',
    'cancelled',
    'on_hold'
);

CREATE TYPE invoice_status AS ENUM (
    'draft',
    'issued',
    'paid',
    'cancelled',
    'overdue'
);

CREATE TYPE permission_action AS ENUM (
    'read',
    'write',
    'delete',
    'approve',
    'assign',
    'admin'
);

-- glavne tablice

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    status user_status DEFAULT 'pending' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login TIMESTAMP,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

COMMENT ON TABLE users IS 'Korisnici sustava - svi tipovi (vlasnik, mehaničari, klijenti)';
COMMENT ON COLUMN users.metadata IS 'JSONB - dodatne informacije (adresa, datum rođenja, napomene)';


CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_role_id INT REFERENCES roles(role_id) ON DELETE SET NULL,
    priority INT DEFAULT 999 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT role_name_lowercase CHECK (role_name = lower(role_name)),
    CONSTRAINT priority_positive CHECK (priority > 0)
);

COMMENT ON TABLE roles IS 'Uloge korisnika s hijerarhijom (parent_role_id)';
COMMENT ON COLUMN roles.parent_role_id IS 'Rekurzivna relacija - omogućava nasljeđivanje dozvola';
COMMENT ON COLUMN roles.priority IS 'Nivo u hijerarhiji - manji broj = veća ovlast (1=najviši)';


CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    action permission_action NOT NULL,
    description TEXT,
    
    CONSTRAINT permission_name_format CHECK (permission_name = lower(replace(permission_name, ' ', '_')))
);

COMMENT ON TABLE permissions IS 'Granularne dozvole - što korisnik može raditi';
COMMENT ON COLUMN permissions.resource_type IS 'Tip resursa: work_order, invoice, vehicle, user, report...';
COMMENT ON COLUMN permissions.action IS 'Akcija: read, write, delete, approve, assign, admin';


CREATE TABLE user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

COMMENT ON TABLE user_roles IS 'Many-to-Many relacija - korisnik može imati više uloga';


CREATE TABLE role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Koje uloge imaju koje dozvole';


CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT,
    vin VARCHAR(17) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT year_valid CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    CONSTRAINT vin_length CHECK (vin IS NULL OR char_length(vin) = 17)
);

COMMENT ON TABLE vehicles IS 'Vozila klijenata';
COMMENT ON COLUMN vehicles.metadata IS 'JSONB - kilometraža, boja, dodatne specifikacije';


CREATE TABLE work_orders (
    work_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_mechanic_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status work_order_status DEFAULT 'pending' NOT NULL,
    description TEXT NOT NULL,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    work_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    CONSTRAINT costs_positive CHECK (
        (estimated_cost IS NULL OR estimated_cost >= 0) AND
        (actual_cost IS NULL OR actual_cost >= 0)
    ),
    CONSTRAINT completed_after_started CHECK (
        completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
    ),
    CONSTRAINT description_length CHECK (char_length(description) >= 10)
);

COMMENT ON TABLE work_orders IS 'Radni nalozi - core tablice aplikacije';
COMMENT ON COLUMN work_orders.work_details IS 'JSONB - dijelovi, sati rada, detaljne napomene';
COMMENT ON COLUMN work_orders.created_by IS 'Tko je kreirao nalog (obično receptionist)';
COMMENT ON COLUMN work_orders.assigned_mechanic_id IS 'Dodijeljeni mehaničar';

CREATE TABLE work_log (
    log_id SERIAL PRIMARY KEY,
    work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
    mechanic_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    log_entry TEXT NOT NULL,
    hours_worked DECIMAL(4,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT hours_positive CHECK (hours_worked IS NULL OR hours_worked > 0),
    CONSTRAINT log_entry_length CHECK (char_length(log_entry) >= 5)
);

COMMENT ON TABLE work_log IS 'Zapisi mehaničara tijekom rada';

CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID UNIQUE NOT NULL REFERENCES work_orders(work_order_id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    status invoice_status DEFAULT 'draft' NOT NULL,
    issued_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    CONSTRAINT amounts_positive CHECK (total_amount >= 0 AND tax_amount >= 0),
    CONSTRAINT paid_after_issued CHECK (paid_at IS NULL OR issued_at IS NULL OR paid_at >= issued_at)
);

COMMENT ON TABLE invoices IS 'Računi za izvršene radove';
COMMENT ON COLUMN invoices.invoice_number IS 'Jedinstveni broj računa (npr. INV-2024-0001)';


CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    CONSTRAINT expires_after_created CHECK (expires_at > created_at)
);

COMMENT ON TABLE sessions IS 'Aktivne sesije korisnika - praćenje prijava';


CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE audit_log IS 'Dnevnik svih promjena - tko, što, kada';
COMMENT ON COLUMN audit_log.old_value IS 'Stara vrijednost zapisa (prije promjene)';
COMMENT ON COLUMN audit_log.new_value IS 'Nova vrijednost zapisa (nakon promjene)';

-- INDEXES - Indeksi za performanse

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- Roles
CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_priority ON roles(priority);

-- User Roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Role Permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Vehicles
CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_metadata ON vehicles USING gin(metadata);

-- Work Orders
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX idx_work_orders_mechanic ON work_orders(assigned_mechanic_id);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_work_orders_details ON work_orders USING gin(work_details);

-- Work Log
CREATE INDEX idx_work_log_order ON work_log(work_order_id);
CREATE INDEX idx_work_log_mechanic ON work_log(mechanic_id);
CREATE INDEX idx_work_log_timestamp ON work_log(timestamp);

-- Invoices
CREATE INDEX idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit Log
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_old_value ON audit_log USING gin(old_value);
CREATE INDEX idx_audit_log_new_value ON audit_log USING gin(new_value);