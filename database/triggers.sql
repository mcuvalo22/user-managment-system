CREATE TRIGGER users_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

COMMENT ON TRIGGER users_update_timestamp ON users 
IS 'Automatski ažurira updated_at pri svakoj izmjeni';


CREATE OR REPLACE FUNCTION audit_users_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action_type, table_name, record_id, new_value, ip_address)
    VALUES (
        NEW.user_id,
        'INSERT',
        'users',
        NEW.user_id,
        to_jsonb(NEW),
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_users_insert();


CREATE OR REPLACE FUNCTION audit_users_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Samo ako se nešto stvarno promijenilo
    IF NEW IS DISTINCT FROM OLD THEN
        INSERT INTO audit_log (user_id, action_type, table_name, record_id, old_value, new_value, ip_address)
        VALUES (
            NEW.user_id,
            'UPDATE',
            'users',
            NEW.user_id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            inet_client_addr()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_update
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_users_update();


CREATE OR REPLACE FUNCTION audit_users_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action_type, table_name, record_id, old_value, ip_address)
    VALUES (
        OLD.user_id,
        'DELETE',
        'users',
        OLD.user_id,
        to_jsonb(OLD),
        inet_client_addr()
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_delete
    AFTER DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_users_delete();


CREATE OR REPLACE FUNCTION audit_work_orders()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (user_id, action_type, table_name, record_id, new_value, ip_address)
        VALUES (NEW.created_by, 'INSERT', 'work_orders', NEW.work_order_id, to_jsonb(NEW), inet_client_addr());
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW IS DISTINCT FROM OLD THEN
            INSERT INTO audit_log (user_id, action_type, table_name, record_id, old_value, new_value, ip_address)
            VALUES (NEW.created_by, 'UPDATE', 'work_orders', NEW.work_order_id, to_jsonb(OLD), to_jsonb(NEW), inet_client_addr());
        END IF;
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (user_id, action_type, table_name, record_id, old_value, ip_address)
        VALUES (OLD.created_by, 'DELETE', 'work_orders', OLD.work_order_id, to_jsonb(OLD), inet_client_addr());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_work_orders();


CREATE OR REPLACE FUNCTION auto_calculate_work_order_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Ako je status promijenjen na 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.actual_cost := calculate_work_order_cost(NEW.work_order_id);
        NEW.completed_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Ako je status promijenjen na 'in_progress'
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        NEW.started_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_auto_calculate
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_work_order_cost();

COMMENT ON TRIGGER work_order_auto_calculate ON work_orders 
IS 'Automatski izračunava trošak i postavlja started_at/completed_at';


CREATE OR REPLACE FUNCTION prevent_user_delete_with_active_orders()
RETURNS TRIGGER AS $$
DECLARE
    v_active_orders INT;
BEGIN
    SELECT COUNT(*) INTO v_active_orders
    FROM work_orders
    WHERE (created_by = OLD.user_id OR assigned_mechanic_id = OLD.user_id)
      AND status IN ('pending', 'approved', 'in_progress', 'waiting_parts');
    
    IF v_active_orders > 0 THEN
        RAISE EXCEPTION 'Cannot delete user % - has % active work orders', 
            OLD.username, v_active_orders;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_user_delete_active_orders
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_delete_with_active_orders();

COMMENT ON TRIGGER prevent_user_delete_active_orders ON users 
IS 'Sprječava brisanje korisnika s aktivnim radnim nalozima';


CREATE OR REPLACE FUNCTION validate_mechanic_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_is_mechanic BOOLEAN;
BEGIN
    IF NEW.assigned_mechanic_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id = NEW.assigned_mechanic_id
              AND r.role_name IN ('mechanic', 'head_mechanic', 'owner')
        ) INTO v_is_mechanic;
        
        IF NOT v_is_mechanic THEN
            RAISE EXCEPTION 'User % is not a mechanic and cannot be assigned to work orders', 
                NEW.assigned_mechanic_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_work_order_mechanic
    BEFORE INSERT OR UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_mechanic_assignment();

COMMENT ON TRIGGER validate_work_order_mechanic ON work_orders 
IS 'Validira da je dodijeljeni korisnik zaista mehaničar';

CREATE OR REPLACE FUNCTION auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_invoice_number VARCHAR;
BEGIN
    IF NEW.status = 'completed' AND 
       (OLD.status IS NULL OR OLD.status != 'completed') AND
       NOT EXISTS (SELECT 1 FROM invoices WHERE work_order_id = NEW.work_order_id) THEN

        SELECT owner_id INTO v_customer_id
        FROM vehicles
        WHERE vehicle_id = NEW.vehicle_id;

        v_invoice_number := 'INV-' || 
                           TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                           LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
        
        INSERT INTO invoices (
            work_order_id,
            customer_id,
            created_by,
            invoice_number,
            total_amount,
            tax_amount,
            status,
            issued_at
        ) VALUES (
            NEW.work_order_id,
            v_customer_id,
            NEW.created_by,
            v_invoice_number,
            NEW.actual_cost,
            NEW.actual_cost * 0.25,  -- 25% PDV
            'issued',
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Invoice % automatically created for work order %', 
            v_invoice_number, NEW.work_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TRIGGER auto_invoice_creation
    AFTER UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_invoice();

COMMENT ON TRIGGER auto_invoice_creation ON work_orders 
IS 'Automatski kreira račun kada se work order završi';


CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_login = NEW.created_at
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_update_last_login
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_login();

COMMENT ON TRIGGER session_update_last_login ON sessions 
IS 'Ažurira last_login timestamp pri novoj prijavi';
