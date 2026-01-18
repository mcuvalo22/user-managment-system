CREATE OR REPLACE VIEW user_roles_summary AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.status,
    u.last_login,
    ARRAY_AGG(r.role_name ORDER BY r.priority) as roles,
    MIN(r.priority) as highest_priority,
    COUNT(r.role_id) as role_count
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
GROUP BY u.user_id, u.username, u.email, u.status, u.last_login;

COMMENT ON VIEW user_roles_summary 
IS 'Pregled svih korisnika s njihovim ulogama i statusom';


CREATE OR REPLACE VIEW user_permissions_summary AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    ARRAY_AGG(DISTINCT p.permission_name ORDER BY p.permission_name) as permissions,
    ARRAY_AGG(DISTINCT p.resource_type ORDER BY p.resource_type) as accessible_resources,
    COUNT(DISTINCT p.permission_id) as permission_count
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.permission_id
GROUP BY u.user_id, u.username, u.email;

COMMENT ON VIEW user_permissions_summary 
IS 'Sve dozvole po korisniku';


CREATE OR REPLACE VIEW work_orders_detailed AS
SELECT 
    wo.work_order_id,
    wo.status,
    wo.description,
    wo.estimated_cost,
    wo.actual_cost,
    wo.created_at,
    wo.started_at,
    wo.completed_at,

    v.license_plate,
    v.brand,
    v.model,
    v.year,

    customer.user_id as customer_id,
    customer.username as customer_name,
    customer.email as customer_email,
    customer.phone as customer_phone,
    
    creator.user_id as created_by_id,
    creator.username as created_by_name,
    
    mechanic.user_id as mechanic_id,
    mechanic.username as mechanic_name,

    CASE 
        WHEN wo.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 86400
        ELSE NULL
    END as completion_days,
    
    CASE
        WHEN wo.actual_cost IS NOT NULL AND wo.estimated_cost IS NOT NULL THEN
            wo.actual_cost - wo.estimated_cost
        ELSE NULL
    END as cost_difference,
    
    EXISTS(SELECT 1 FROM invoices i WHERE i.work_order_id = wo.work_order_id) as has_invoice
    
FROM work_orders wo
JOIN vehicles v ON wo.vehicle_id = v.vehicle_id
JOIN users customer ON v.owner_id = customer.user_id
JOIN users creator ON wo.created_by = creator.user_id
LEFT JOIN users mechanic ON wo.assigned_mechanic_id = mechanic.user_id;

COMMENT ON VIEW work_orders_detailed 
IS 'Kompletan pregled radnih naloga s svim detaljima';


CREATE OR REPLACE VIEW mechanic_performance AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    
    COUNT(wo.work_order_id) as total_jobs,
    COUNT(wo.work_order_id) FILTER (WHERE wo.status = 'completed') as completed_jobs,
    COUNT(wo.work_order_id) FILTER (WHERE wo.status = 'in_progress') as active_jobs,
    COUNT(wo.work_order_id) FILTER (WHERE wo.status = 'pending') as pending_jobs,
    
    COALESCE(SUM(wo.actual_cost), 0) as total_revenue,
    COALESCE(AVG(wo.actual_cost), 0) as avg_job_cost,
    
    AVG(
        EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at)) / 86400
    ) FILTER (WHERE wo.completed_at IS NOT NULL AND wo.started_at IS NOT NULL) as avg_completion_days,
    
    COALESCE(SUM(wl.hours_worked), 0) as total_hours_worked,
    
    MAX(wo.completed_at) as last_job_completed
    
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
LEFT JOIN work_orders wo ON u.user_id = wo.assigned_mechanic_id
LEFT JOIN work_log wl ON wo.work_order_id = wl.work_order_id
WHERE r.role_name IN ('mechanic', 'head_mechanic')
GROUP BY u.user_id, u.username, u.email;

COMMENT ON VIEW mechanic_performance 
IS 'Statistika performansi mehaničara';


CREATE OR REPLACE VIEW customer_statistics AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.phone,
    
    COUNT(DISTINCT v.vehicle_id) as total_vehicles,
    COUNT(wo.work_order_id) as total_services,
    COUNT(wo.work_order_id) FILTER (WHERE wo.status = 'completed') as completed_services,
    COUNT(wo.work_order_id) FILTER (WHERE wo.status IN ('pending', 'approved', 'in_progress')) as active_services,
    
    COALESCE(SUM(i.total_amount), 0) as total_spent,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0) as total_paid,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('issued', 'overdue')), 0) as outstanding_balance,
    
    MAX(wo.created_at) as last_service_date,
    MIN(wo.created_at) as first_service_date,
    
    CASE 
        WHEN MAX(wo.created_at) > CURRENT_DATE - INTERVAL '30 days' THEN 'active'
        WHEN MAX(wo.created_at) > CURRENT_DATE - INTERVAL '90 days' THEN 'occasional'
        WHEN MAX(wo.created_at) IS NOT NULL THEN 'inactive'
        ELSE 'new'
    END as customer_segment
    
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
LEFT JOIN vehicles v ON u.user_id = v.owner_id
LEFT JOIN work_orders wo ON v.vehicle_id = wo.vehicle_id
LEFT JOIN invoices i ON wo.work_order_id = i.work_order_id
WHERE r.role_name = 'customer'
GROUP BY u.user_id, u.username, u.email, u.phone;

COMMENT ON VIEW customer_statistics 
IS 'Statistika i segmentacija klijenata';


CREATE OR REPLACE VIEW daily_revenue_report AS
SELECT 
    DATE(wo.completed_at) as date,
    COUNT(wo.work_order_id) as jobs_completed,
    COALESCE(SUM(wo.actual_cost), 0) as total_revenue,
    COALESCE(AVG(wo.actual_cost), 0) as avg_job_value,
    COUNT(DISTINCT wo.assigned_mechanic_id) as mechanics_worked,
    COALESCE(SUM(wl.hours_worked), 0) as total_hours
FROM work_orders wo
LEFT JOIN work_log wl ON wo.work_order_id = wl.work_order_id
WHERE wo.status = 'completed' 
  AND wo.completed_at IS NOT NULL
GROUP BY DATE(wo.completed_at)
ORDER BY date DESC;

COMMENT ON VIEW daily_revenue_report 
IS 'Dnevni izvještaj prihoda i produktivnosti';


CREATE OR REPLACE VIEW pending_work_orders AS
SELECT 
    wo.work_order_id,
    wo.status,
    wo.description,
    wo.estimated_cost,
    wo.created_at,
    v.license_plate,
    v.brand || ' ' || v.model as vehicle,
    customer.username as customer_name,
    customer.phone as customer_phone,
    mechanic.username as assigned_mechanic,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - wo.created_at)) as days_waiting
FROM work_orders wo
JOIN vehicles v ON wo.vehicle_id = v.vehicle_id
JOIN users customer ON v.owner_id = customer.user_id
LEFT JOIN users mechanic ON wo.assigned_mechanic_id = mechanic.user_id
WHERE wo.status IN ('pending', 'approved', 'waiting_parts')
ORDER BY wo.created_at;

COMMENT ON VIEW pending_work_orders 
IS 'Svi radni nalozi koji čekaju obradu';


CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.invoice_id,
    i.invoice_number,
    i.status,
    i.total_amount,
    i.tax_amount,
    i.issued_at,
    i.paid_at,
    
    customer.username as customer_name,
    customer.email as customer_email,
    
    wo.work_order_id,
    wo.description as work_description,
    v.license_plate,
    
    CASE 
        WHEN i.status = 'paid' THEN 0
        WHEN i.status = 'overdue' THEN 
            EXTRACT(DAY FROM (CURRENT_DATE - (i.issued_at::DATE + INTERVAL '30 days')))
        WHEN i.status = 'issued' THEN
            CASE 
                WHEN CURRENT_DATE > (i.issued_at::DATE + INTERVAL '30 days') THEN
                    EXTRACT(DAY FROM (CURRENT_DATE - (i.issued_at::DATE + INTERVAL '30 days')))
                ELSE 0
            END
        ELSE 0
    END as days_overdue
    
FROM invoices i
JOIN work_orders wo ON i.work_order_id = wo.work_order_id
JOIN vehicles v ON wo.vehicle_id = v.vehicle_id
JOIN users customer ON i.customer_id = customer.user_id
ORDER BY i.issued_at DESC;

COMMENT ON VIEW invoice_summary 
IS 'Pregled svih računa s informacijama o dugovanja';


CREATE MATERIALIZED VIEW monthly_statistics AS
SELECT 
    DATE_TRUNC('month', wo.completed_at) as month,
    COUNT(wo.work_order_id) as total_jobs,
    COUNT(DISTINCT wo.assigned_mechanic_id) as active_mechanics,
    COUNT(DISTINCT v.owner_id) as unique_customers,
    COALESCE(SUM(wo.actual_cost), 0) as total_revenue,
    COALESCE(AVG(wo.actual_cost), 0) as avg_job_cost,
    COALESCE(SUM(wl.hours_worked), 0) as total_hours,
    
    AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 86400) as avg_completion_days
    
FROM work_orders wo
JOIN vehicles v ON wo.vehicle_id = v.vehicle_id
LEFT JOIN work_log wl ON wo.work_order_id = wl.work_order_id
WHERE wo.status = 'completed' 
  AND wo.completed_at IS NOT NULL
GROUP BY DATE_TRUNC('month', wo.completed_at)
ORDER BY month DESC;

COMMENT ON MATERIALIZED VIEW monthly_statistics 
IS 'Mjesečna statistika - mora se osvježiti sa REFRESH MATERIALIZED VIEW';

CREATE INDEX idx_monthly_statistics_month ON monthly_statistics(month);


CREATE OR REPLACE VIEW audit_trail AS
SELECT 
    al.log_id,
    al.timestamp,
    al.action_type,
    al.table_name,
    u.username,
    u.email,
    al.ip_address,
    al.old_value,
    al.new_value
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.user_id
ORDER BY al.timestamp DESC
LIMIT 1000;

COMMENT ON VIEW audit_trail 
IS 'Zadnjih 1000 akcija iz audit loga';


CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.session_id,
    u.username,
    u.email,
    s.ip_address,
    s.created_at,
    s.expires_at,
    EXTRACT(EPOCH FROM (s.expires_at - CURRENT_TIMESTAMP)) / 60 as minutes_until_expiry,
    ARRAY_AGG(r.role_name) as roles
FROM sessions s
JOIN users u ON s.user_id = u.user_id
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE s.is_active = true 
  AND s.expires_at > CURRENT_TIMESTAMP
GROUP BY s.session_id, u.username, u.email, s.ip_address, s.created_at, s.expires_at
ORDER BY s.created_at DESC;

COMMENT ON VIEW active_sessions 
IS 'Sve trenutno aktivne sesije';
