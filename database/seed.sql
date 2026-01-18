-- Brisanje postojećih podataka
TRUNCATE TABLE audit_log, sessions, invoices, work_log, work_orders, vehicles,
               role_permissions, user_roles, permissions, roles, users
RESTART IDENTITY CASCADE;

-- ROLES

INSERT INTO roles (role_name, description, parent_role_id, priority) VALUES
('owner', 'Vlasnik servisa - sve dozvole', NULL, 1),
('head_mechanic', 'Glavni mehaničar - upravlja mehaničarima', 1, 2),  -- parent: owner
('mechanic', 'Mehaničar - izvršava popravke', 2, 3),  -- parent: head_mechanic
('receptionist', 'Recepcionist - prima narudžbe', 1, 2),  -- parent: owner
('accountant', 'Računovođa - financije', 1, 2),  -- parent: owner
('customer', 'Klijent - vidi svoje podatke', NULL, 5);

-- PERMISSIONS

INSERT INTO permissions (permission_name, resource_type, action, description) VALUES
('view_all_users', 'user', 'read', 'Pregled svih korisnika'),
('edit_users', 'user', 'write', 'Izmjena korisnika'),
('delete_users', 'user', 'delete', 'Brisanje korisnika'),
('manage_roles', 'user', 'admin', 'Upravljanje ulogama korisnika'),
('view_all_work_orders', 'work_order', 'read', 'Pregled svih radnih naloga'),
('view_own_work_orders', 'work_order', 'read', 'Pregled vlastitih radnih naloga'),
('create_work_orders', 'work_order', 'write', 'Kreiranje radnih naloga'),
('edit_work_orders', 'work_order', 'write', 'Izmjena radnih naloga'),
('delete_work_orders', 'work_order', 'delete', 'Brisanje radnih naloga'),
('assign_work_orders', 'work_order', 'assign', 'Dodjela radnih naloga mehaničarima'),
('approve_work_orders', 'work_order', 'approve', 'Odobravanje radnih naloga'),
('view_all_vehicles', 'vehicle', 'read', 'Pregled svih vozila'),
('view_own_vehicles', 'vehicle', 'read', 'Pregled vlastitih vozila'),
('add_vehicles', 'vehicle', 'write', 'Dodavanje vozila'),
('edit_vehicles', 'vehicle', 'write', 'Izmjena vozila'),
('delete_vehicles', 'vehicle', 'delete', 'Brisanje vozila'),
('view_all_invoices', 'invoice', 'read', 'Pregled svih računa'),
('view_own_invoices', 'invoice', 'read', 'Pregled vlastitih računa'),
('create_invoices', 'invoice', 'write', 'Kreiranje računa'),
('edit_invoices', 'invoice', 'write', 'Izmjena računa'),
('delete_invoices', 'invoice', 'delete', 'Brisanje računa'),
('approve_invoices', 'invoice', 'approve', 'Odobravanje računa'),
('view_financial_reports', 'report', 'read', 'Pregled financijskih izvještaja'),
('view_performance_reports', 'report', 'read', 'Pregled izvještaja performansi'),
('add_work_log', 'work_log', 'write', 'Dodavanje zapisa o radu'),
('view_all_work_logs', 'work_log', 'read', 'Pregled svih zapisa rada'),
('view_audit_log', 'audit', 'read', 'Pregled audit loga');

-- ROLE_PERMISSIONS

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'owner'),
    permission_id
FROM permissions;

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'head_mechanic'),
    permission_id
FROM permissions
WHERE permission_name IN (
    'view_all_work_orders', 'create_work_orders', 'edit_work_orders',
    'assign_work_orders', 'approve_work_orders', 'view_all_vehicles',
    'add_work_log', 'view_all_work_logs', 'view_performance_reports'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    permission_id
FROM permissions
WHERE permission_name IN (
    'view_own_work_orders', 'edit_work_orders', 'view_all_vehicles', 'add_work_log'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'receptionist'),
    permission_id
FROM permissions
WHERE permission_name IN (
    'view_all_work_orders', 'create_work_orders', 'edit_work_orders',
    'view_all_vehicles', 'add_vehicles', 'edit_vehicles', 'view_all_invoices'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'accountant'),
    permission_id
FROM permissions
WHERE permission_name IN (
    'view_all_invoices', 'create_invoices', 'edit_invoices',
    'approve_invoices', 'view_financial_reports', 'view_all_work_orders'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT role_id FROM roles WHERE role_name = 'customer'),
    permission_id
FROM permissions
WHERE permission_name IN ('view_own_vehicles', 'view_own_work_orders', 'view_own_invoices');

INSERT INTO users (username, email, password_hash, phone, status, metadata) VALUES
('marko_vlasnik', 'marko@autoservis.hr', hash_password('password123'), '+385911234567', 'active',
 '{"position": "Vlasnik", "join_date": "2020-01-01"}'),
('ivan_glavni', 'ivan@autoservis.hr', hash_password('password123'), '+385911234568', 'active',
 '{"position": "Glavni mehaničar", "specialization": "Dijagnostika", "join_date": "2020-06-01"}'),
('petar_mehanicar', 'petar@autoservis.hr', hash_password('password123'), '+385911234569', 'active',
 '{"position": "Mehaničar", "specialization": "Motor", "join_date": "2021-03-15"}'),
('ana_mehanicarka', 'ana@autoservis.hr', hash_password('password123'), '+385911234570', 'active',
 '{"position": "Mehaničar", "specialization": "Električna vozila", "join_date": "2022-01-10"}'),
('marko_meho', 'marko.m@autoservis.hr', hash_password('password123'), '+385911234580', 'active',
 '{"position": "Mehaničar", "specialization": "Transmisija", "join_date": "2021-06-20"}'),
('nikola_serviser', 'nikola@autoservis.hr', hash_password('password123'), '+385911234581', 'active',
 '{"position": "Mehaničar", "specialization": "Karoserija", "join_date": "2022-03-10"}'),
('antonio_majstor', 'antonio@autoservis.hr', hash_password('password123'), '+385911234582', 'active',
 '{"position": "Mehaničar", "specialization": "Kočnice i ovjes", "join_date": "2021-11-05"}'),
('maja_recepcija', 'maja@autoservis.hr', hash_password('password123'), '+385911234571', 'active',
 '{"position": "Recepcionist", "join_date": "2021-09-01"}'),
('luka_racunovodja', 'luka@autoservis.hr', hash_password('password123'), '+385911234572', 'active',
 '{"position": "Računovođa", "join_date": "2020-03-01"}'),
('ivan_bmw', 'ivan.bmw@autoservis.hr', hash_password('password123'), '+385911234583', 'active',
 '{"position": "Mehaničar", "specialization": "BMW i njemačka vozila", "join_date": "2018-03-15"}'),
('luka_elektrika', 'luka.e@autoservis.hr', hash_password('password123'), '+385911234584', 'active',
 '{"position": "Mehaničar", "specialization": "Električna vozila", "join_date": "2022-01-10"}'),
('stjepan_diesel', 'stjepan.d@autoservis.hr', hash_password('password123'), '+385911234585', 'active',
 '{"position": "Mehaničar", "specialization": "Diesel motori", "join_date": "2015-09-01"}'),
('david_ovjes', 'david.o@autoservis.hr', hash_password('password123'), '+385911234586', 'active',
 '{"position": "Mehaničar", "specialization": "Ovjes i geometrija", "join_date": "2019-08-15"}'),
('kristina_dijagnostika', 'kristina.d@autoservis.hr', hash_password('password123'), '+385911234587', 'active',
 '{"position": "Mehaničar", "specialization": "Elektronika i dijagnostika", "join_date": "2021-10-01"}'),
('sandra_recepcija', 'sandra@autoservis.hr', hash_password('password123'), '+385911234588', 'active',
 '{"position": "Recepcionist", "join_date": "2022-05-10"}'),
('tomislav_klijent', 'tomislav@gmail.com', hash_password('password123'), '+385911234573', 'active',
 '{"address": "Ulica 123, Zagreb", "vip": true}'),
('petra_klijentica', 'petra@gmail.com', hash_password('password123'), '+385911234574', 'active',
 '{"address": "Avenija 456, Split", "vip": false}'),
('josip_klijent', 'josip@gmail.com', hash_password('password123'), '+385911234575', 'active',
 '{"address": "Trg 789, Rijeka", "vip": false}'),
('marija_klijentica', 'marija@gmail.com', hash_password('password123'), '+385911234589', 'active',
 '{"address": "Ulica Bana Jelačića 45, Zagreb", "vip": true}'),
('igor_klijent', 'igor@gmail.com', hash_password('password123'), '+385911234590', 'active',
 '{"address": "Obala kneza Domagoja 12, Zadar", "vip": false}'),
('ana_klijentica', 'ana.k@gmail.com', hash_password('password123'), '+385911234591', 'active',
 '{"address": "Vukovarska 88, Osijek", "vip": false}'),
('bruno_klijent', 'bruno@gmail.com', hash_password('password123'), '+385911234592', 'active',
 '{"address": "Riva 5, Split", "vip": true}'),
('ivana_klijentica', 'ivana@gmail.com', hash_password('password123'), '+385911234593', 'active',
 '{"address": "Korzo 23, Rijeka", "vip": false}'),
('dario_klijent', 'dario@gmail.com', hash_password('password123'), '+385911234594', 'active',
 '{"address": "Trg bana Josipa 11, Dubrovnik", "vip": false}'),
('lucija_klijentica', 'lucija@gmail.com', hash_password('password123'), '+385911234595', 'active',
 '{"address": "Maksimirska 67, Zagreb", "vip": false}');

-- USER_ROLES

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik'),
    (SELECT role_id FROM roles WHERE role_name = 'owner'),
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'ivan_glavni'),
    (SELECT role_id FROM roles WHERE role_name = 'head_mechanic'),
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'marko_meho'),
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'nikola_serviser'),
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'antonio_majstor'),
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    user_id,
    (SELECT role_id FROM roles WHERE role_name = 'mechanic'),
    (SELECT user_id FROM users WHERE username = 'ivan_glavni')
FROM users
WHERE username IN ('ivan_bmw', 'luka_elektrika', 'stjepan_diesel', 'david_ovjes', 'kristina_dijagnostika');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
    (SELECT role_id FROM roles WHERE role_name = 'receptionist'),
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'sandra_recepcija'),
    (SELECT role_id FROM roles WHERE role_name = 'receptionist'),
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    (SELECT user_id FROM users WHERE username = 'luka_racunovodja'),
    (SELECT role_id FROM roles WHERE role_name = 'accountant'),
    (SELECT user_id FROM users WHERE username = 'marko_vlasnik');

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    user_id,
    (SELECT role_id FROM roles WHERE role_name = 'customer'),
    (SELECT user_id FROM users WHERE username = 'maja_recepcija')
FROM users
WHERE username IN ('tomislav_klijent', 'petra_klijentica', 'josip_klijent', 'marija_klijentica',
                   'igor_klijent', 'ana_klijentica', 'bruno_klijent', 'ivana_klijentica',
                   'dario_klijent', 'lucija_klijentica');

-- VEHICLES

INSERT INTO vehicles (owner_id, license_plate, brand, model, year, vin, metadata) VALUES
-- Tomislav's vehicles
((SELECT user_id FROM users WHERE username = 'tomislav_klijent'), 
 'ZG-1234-AB', 'BMW', '320d', 2018, 'WBAXXXX123456789A',
 '{"color": "Crna", "mileage": 85000, "fuel_type": "Diesel"}'),

((SELECT user_id FROM users WHERE username = 'tomislav_klijent'), 
 'ZG-9876-XY', 'Audi', 'A4', 2020, 'WAUXXXX987654321B',
 '{"color": "Siva", "mileage": 45000, "fuel_type": "Benzin"}'),

-- Petra's vehicle
((SELECT user_id FROM users WHERE username = 'petra_klijentica'), 
 'ST-5555-CD', 'Volkswagen', 'Golf', 2019, 'WVWXXXX555555555C',
 '{"color": "Bijela", "mileage": 62000, "fuel_type": "Benzin"}'),

-- Josip's vehicle
((SELECT user_id FROM users WHERE username = 'josip_klijent'),
 'RI-7777-EF', 'Mercedes-Benz', 'C200', 2021, 'WDDXXXX777777777D',
 '{"color": "Plava", "mileage": 28000, "fuel_type": "Hybrid"}'),

-- Marija's vehicles (VIP sa 2 vozila)
((SELECT user_id FROM users WHERE username = 'marija_klijentica'),
 'ZG-1111-MK', 'BMW', 'X5', 2022, 'WBAXXXX111111111E',
 '{"color": "Crna", "mileage": 15000, "fuel_type": "Diesel"}'),

((SELECT user_id FROM users WHERE username = 'marija_klijentica'),
 'ZG-2222-MK', 'Mercedes-Benz', 'GLE', 2023, 'WDDXXXX222222222F',
 '{"color": "Bijela", "mileage": 8000, "fuel_type": "Hybrid"}'),

-- Igor's vehicle
((SELECT user_id FROM users WHERE username = 'igor_klijent'),
 'ZD-3333-IG', 'Volkswagen', 'Passat', 2017, 'WVWXXXX333333333G',
 '{"color": "Siva", "mileage": 125000, "fuel_type": "Diesel"}'),

-- Ana's vehicle
((SELECT user_id FROM users WHERE username = 'ana_klijentica'),
 'OS-4444-AK', 'Toyota', 'Corolla', 2020, 'JTMXXXX444444444H',
 '{"color": "Crvena", "mileage": 42000, "fuel_type": "Hybrid"}'),

-- Bruno's vehicles (VIP sa 2 vozila)
((SELECT user_id FROM users WHERE username = 'bruno_klijent'),
 'ST-5555-BR', 'Audi', 'Q7', 2021, 'WAUXXXX555555555I',
 '{"color": "Crna", "mileage": 35000, "fuel_type": "Diesel"}'),

((SELECT user_id FROM users WHERE username = 'bruno_klijent'),
 'ST-6666-BR', 'Porsche', 'Cayenne', 2022, 'WPOZZZ666666666J',
 '{"color": "Bijela", "mileage": 12000, "fuel_type": "Benzin"}'),

-- Ivana's vehicle
((SELECT user_id FROM users WHERE username = 'ivana_klijentica'),
 'RI-7777-IV', 'Renault', 'Clio', 2019, 'VFXXXXX777777777K',
 '{"color": "Plava", "mileage": 58000, "fuel_type": "Benzin"}'),

-- Dario's vehicle
((SELECT user_id FROM users WHERE username = 'dario_klijent'),
 'DU-8888-DA', 'Skoda', 'Octavia', 2020, 'TMBXXXX888888888L',
 '{"color": "Siva", "mileage": 72000, "fuel_type": "Diesel"}'),

-- Lucija's vehicle
((SELECT user_id FROM users WHERE username = 'lucija_klijentica'),
 'ZG-9999-LU', 'Mazda', 'CX-5', 2021, 'JMXXXXX999999999M',
 '{"color": "Crvena", "mileage": 31000, "fuel_type": "Benzin"}');

-- WORK_ORDERS

INSERT INTO work_orders (vehicle_id, created_by, assigned_mechanic_id, status, description, estimated_cost, actual_cost, started_at, completed_at, work_details)
VALUES (
    (SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-1234-AB'),
    (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
    (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
    'completed',
    'Redovni servis - zamjena ulja i filtera',
    150.00, 165.50,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '{"parts_used": ["ulje 5W30", "filter ulja", "filter zraka"], "parts_cost": 65.50}'
);

INSERT INTO work_orders (vehicle_id, created_by, assigned_mechanic_id, status, description, estimated_cost, started_at, work_details)
VALUES (
    (SELECT vehicle_id FROM vehicles WHERE license_plate = 'ST-5555-CD'),
    (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
    (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
    'in_progress',
    'Zamjena kočionih pločica i diskova',
    450.00,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '{"parts_used": ["kočione pločice", "diskovi"], "parts_cost": 280.00}'
);

INSERT INTO work_orders (vehicle_id, created_by, assigned_mechanic_id, status, description, estimated_cost, work_details)
VALUES (
    (SELECT vehicle_id FROM vehicles WHERE license_plate = 'RI-7777-EF'),
    (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
    (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
    'pending',
    'Dijagnostika check engine lampice',
    80.00,
    '{"diagnostic_required": true}'
);

INSERT INTO work_orders (vehicle_id, created_by, status, description, estimated_cost, work_details)
VALUES (
    (SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-9876-XY'),
    (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
    'pending',
    'Geometrija i balansiranje kotača',
    120.00,
    '{"urgency": "low"}'
);

-- WORK_LOG

INSERT INTO work_log (work_order_id, mechanic_id, log_entry, hours_worked)
VALUES (
    (SELECT work_order_id FROM work_orders WHERE description LIKE 'Redovni servis%'),
    (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
    'Izvučeno staro ulje, zamijenjen filter ulja i filter zraka. Provjerena razina svih tekućina.',
    2.0
);

INSERT INTO work_log (work_order_id, mechanic_id, log_entry, hours_worked)
VALUES (
    (SELECT work_order_id FROM work_orders WHERE description LIKE 'Zamjena kočionih%'),
    (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
    'Demontiran prednji lijevi kotač. Stare kočione pločice potpuno istrošene.',
    1.5
);

INSERT INTO work_log (work_order_id, mechanic_id, log_entry, hours_worked)
VALUES (
    (SELECT work_order_id FROM work_orders WHERE description LIKE 'Zamjena kočionih%'),
    (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
    'Zamijenjene prednje kočione pločice i diskovi. Sutra nastavljam s zadnjim kotačima.',
    2.5
);

-- SESSIONS

INSERT INTO sessions (user_id, ip_address, user_agent, expires_at)
VALUES
((SELECT user_id FROM users WHERE username = 'marko_vlasnik'),
 '192.168.1.100'::INET,
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
 CURRENT_TIMESTAMP + INTERVAL '24 hours'),
((SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
 '192.168.1.105'::INET,
 'Mozilla/5.0 (Android 13; Mobile) Chrome/120.0.0.0',
 CURRENT_TIMESTAMP + INTERVAL '12 hours');

-- INVOICES (automatski se kreiraju kroz trigger)

INSERT INTO work_orders (vehicle_id, created_by, assigned_mechanic_id, description, estimated_cost, actual_cost, status, created_at, started_at, completed_at)
VALUES
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-1234-AB'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
 'Veliki servis - zamjena ulja, filtera, kočionih pločica',
 1200.00, 1350.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '45 days',
 CURRENT_TIMESTAMP - INTERVAL '45 days',
 CURRENT_TIMESTAMP - INTERVAL '43 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ST-5678-CD'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
 'Popravak električne instalacije i dijagnostika baterije',
 800.00, 850.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '30 days',
 CURRENT_TIMESTAMP - INTERVAL '30 days',
 CURRENT_TIMESTAMP - INTERVAL '28 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'RI-9012-EF'),
 (SELECT user_id FROM users WHERE username = 'ivan_glavni'),
 (SELECT user_id FROM users WHERE username = 'marko_meho'),
 'Zamjena automatske transmisije',
 3500.00, 3800.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '20 days',
 CURRENT_TIMESTAMP - INTERVAL '20 days',
 CURRENT_TIMESTAMP - INTERVAL '15 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-1234-AB'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'nikola_serviser'),
 'Popravak oštećenja na karoseriji i lakiranje',
 2200.00, 2100.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '15 days',
 CURRENT_TIMESTAMP - INTERVAL '15 days',
 CURRENT_TIMESTAMP - INTERVAL '10 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ST-5678-CD'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'antonio_majstor'),
 'Zamjena amortizera i kočionih diskova',
 1500.00, 1450.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '12 days',
 CURRENT_TIMESTAMP - INTERVAL '12 days',
 CURRENT_TIMESTAMP - INTERVAL '9 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'RI-9012-EF'),
 (SELECT user_id FROM users WHERE username = 'ivan_glavni'),
 (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
 'Mali servis - ulje, filteri, pregled',
 450.00, 450.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '8 days',
 CURRENT_TIMESTAMP - INTERVAL '8 days',
 CURRENT_TIMESTAMP - INTERVAL '7 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-1234-AB'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'ana_mehanicarka'),
 'Dijagnostika i servis klima uređaja',
 600.00, 650.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '5 days',
 CURRENT_TIMESTAMP - INTERVAL '5 days',
 CURRENT_TIMESTAMP - INTERVAL '4 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ST-5678-CD'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'marko_meho'),
 'Montaža zimskih guma i balansiranje',
 350.00, 350.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '3 days',
 CURRENT_TIMESTAMP - INTERVAL '3 days',
 CURRENT_TIMESTAMP - INTERVAL '2 days'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'RI-9012-EF'),
 (SELECT user_id FROM users WHERE username = 'ivan_glavni'),
 (SELECT user_id FROM users WHERE username = 'petar_mehanicar'),
 'Popravak turbo punjača i zamjena intercoolera',
 2800.00, 2950.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '2 days',
 CURRENT_TIMESTAMP - INTERVAL '2 days',
 CURRENT_TIMESTAMP - INTERVAL '1 day'),
((SELECT vehicle_id FROM vehicles WHERE license_plate = 'ZG-1234-AB'),
 (SELECT user_id FROM users WHERE username = 'maja_recepcija'),
 (SELECT user_id FROM users WHERE username = 'nikola_serviser'),
 'Sitne popravke - zamjena brisača, sijalica',
 180.00, 180.00, 'completed',
 CURRENT_TIMESTAMP - INTERVAL '1 day',
 CURRENT_TIMESTAMP - INTERVAL '1 day',
 CURRENT_TIMESTAMP - INTERVAL '6 hours');
UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP - INTERVAL '25 days'
WHERE invoice_number IN (
    SELECT invoice_number FROM invoices ORDER BY issued_at LIMIT 1 OFFSET 1
);

UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP - INTERVAL '5 days'
WHERE invoice_number IN (
    SELECT invoice_number FROM invoices ORDER BY issued_at LIMIT 1 OFFSET 5
);

UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
WHERE invoice_number IN (
    SELECT invoice_number FROM invoices ORDER BY issued_at LIMIT 1 OFFSET 7
);

REFRESH MATERIALIZED VIEW monthly_statistics;

-- Ispis statistike
SELECT 'Database seeded successfully!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT COUNT(*) as total_vehicles FROM vehicles;
SELECT COUNT(*) as total_work_orders FROM work_orders;
SELECT COUNT(*) as total_work_logs FROM work_log;
SELECT COUNT(*) as total_invoices FROM invoices;
SELECT COUNT(*) as paid_invoices FROM invoices WHERE status = 'paid';