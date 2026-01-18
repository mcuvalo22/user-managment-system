CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_timestamp() IS 'Automatski postavlja updated_at na trenutno vrijeme';


CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_resource_type VARCHAR,
    p_action permission_action
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = p_user_id
          AND p.resource_type = p_resource_type
          AND p.action = p_action
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_has_permission(UUID, VARCHAR, permission_action) 
IS 'Provjerava ima li korisnik određenu dozvolu za resurs';


CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role_id INT, role_name VARCHAR, priority INT) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE role_hierarchy AS (
        -- Direktne uloge
        SELECT r.role_id, r.role_name, r.priority, r.parent_role_id
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = p_user_id
        
        UNION
        
        -- Naslijeđene
        SELECT r.role_id, r.role_name, r.priority, r.parent_role_id
        FROM roles r
        JOIN role_hierarchy rh ON r.role_id = rh.parent_role_id
    )
    SELECT DISTINCT rh.role_id, rh.role_name, rh.priority
    FROM role_hierarchy rh
    ORDER BY rh.priority;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_roles(UUID) 
IS 'Vraća sve uloge korisnika uključujući naslijeđene iz hijerarhije';


CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(
    permission_name VARCHAR,
    resource_type VARCHAR,
    action permission_action
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.permission_name, p.resource_type, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_permissions(UUID) 
IS 'Vraća sve dozvole korisnika';


CREATE OR REPLACE PROCEDURE assign_role_to_user(
    p_user_id UUID,
    p_role_name VARCHAR,
    p_assigned_by UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_role_id INT;
BEGIN
    SELECT role_id INTO v_role_id
    FROM roles
    WHERE role_name = p_role_name;
    
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % does not exist', p_role_name;
    END IF;
    
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (p_user_id, v_role_id, p_assigned_by)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Role % assigned to user %', p_role_name, p_user_id;
END;
$$;

COMMENT ON PROCEDURE assign_role_to_user(UUID, VARCHAR, UUID) 
IS 'Dodjeljuje ulogu korisniku';


CREATE OR REPLACE FUNCTION create_work_order(
    p_vehicle_id UUID,
    p_created_by UUID,
    p_description TEXT,
    p_estimated_cost DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_work_order_id UUID;
BEGIN
    -- Provjeri da vozilo postoji
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle % does not exist', p_vehicle_id;
    END IF;
    
    -- Kreiraj radni nalog
    INSERT INTO work_orders (
        vehicle_id,
        created_by,
        description,
        estimated_cost,
        status
    ) VALUES (
        p_vehicle_id,
        p_created_by,
        p_description,
        p_estimated_cost,
        'pending'
    ) RETURNING work_order_id INTO v_work_order_id;
    
    RAISE NOTICE 'Work order % created', v_work_order_id;
    
    RETURN v_work_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_work_order(UUID, UUID, TEXT, DECIMAL) 
IS 'Kreira novi radni nalog i vraća work_order_id';


CREATE OR REPLACE FUNCTION calculate_work_order_cost(p_work_order_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_total_hours DECIMAL;
    v_hourly_rate DECIMAL := 50.00; 
    v_parts_cost DECIMAL := 0;
    v_total DECIMAL;
BEGIN
    -- ukupno sati
    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_total_hours
    FROM work_log
    WHERE work_order_id = p_work_order_id;
    
    -- Izračunaj trošak dijelova
    SELECT COALESCE(
        (work_details->>'parts_cost')::DECIMAL,
        0
    )
    INTO v_parts_cost
    FROM work_orders
    WHERE work_order_id = p_work_order_id;
    
    v_total := (v_total_hours * v_hourly_rate) + v_parts_cost;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_work_order_cost(UUID) 
IS 'Izračunava stvarni trošak radnog naloga (sati + dijelovi)';


CREATE OR REPLACE FUNCTION get_mechanic_workload(p_mechanic_id UUID)
RETURNS TABLE(
    total_orders BIGINT,
    pending_orders BIGINT,
    in_progress_orders BIGINT,
    avg_completion_days DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_orders,
        COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_orders,
        AVG(
            EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400
        ) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days
    FROM work_orders
    WHERE assigned_mechanic_id = p_mechanic_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_mechanic_workload(UUID) 
IS 'Statistika opterećenja mehaničara';


CREATE OR REPLACE FUNCTION get_customer_vehicles(p_customer_id UUID)
RETURNS TABLE(
    vehicle_id UUID,
    license_plate VARCHAR,
    brand VARCHAR,
    model VARCHAR,
    year INT,
    total_services BIGINT,
    total_spent DECIMAL,
    last_service_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.vehicle_id,
        v.license_plate,
        v.brand,
        v.model,
        v.year,
        COUNT(wo.work_order_id)::BIGINT as total_services,
        COALESCE(SUM(wo.actual_cost), 0) as total_spent,
        MAX(wo.completed_at) as last_service_date
    FROM vehicles v
    LEFT JOIN work_orders wo ON v.vehicle_id = wo.vehicle_id
    WHERE v.owner_id = p_customer_id
    GROUP BY v.vehicle_id, v.license_plate, v.brand, v.model, v.year
    ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_customer_vehicles(UUID) 
IS 'Vraća vozila klijenta sa statistikom servisa';


CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM sessions
    WHERE expires_at < CURRENT_TIMESTAMP
       OR (is_active = false AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_sessions() 
IS 'Briše istekle i neaktivne sesije starije od 7 dana';


CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION hash_password(TEXT) 
IS 'Hashira lozinku koristeći bcrypt (blowfish)';


CREATE OR REPLACE FUNCTION verify_password(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hashed_password = crypt(plain_password, hashed_password);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_password(TEXT, TEXT) 
IS 'Provjerava da li plain_password odgovara hashiranoj lozinci';