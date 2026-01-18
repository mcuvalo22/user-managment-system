from flask import Flask, jsonify, request
from flask_cors import CORS
from database import execute_query, execute_one, get_db_connection
from auth_helper import generate_token, require_auth, get_current_user
import psycopg2

app = Flask(__name__)
CORS(app)

# AUTH
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    query = """
        SELECT u.user_id, u.username, u.email, u.status,
               verify_password(%s, u.password_hash) as password_valid,
               ARRAY_AGG(r.role_name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.username = %s
        GROUP BY u.user_id
    """
    
    user = execute_one(query, (password, username))
    
    if not user or not user['password_valid']:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if user['status'] != 'active':
        return jsonify({'error': 'Account is not active'}), 403

    token = generate_token(user['user_id'])

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO sessions (user_id, ip_address, user_agent, expires_at)
                VALUES (%s, %s, %s, NOW() + INTERVAL '24 hours')
            """, (user['user_id'], request.remote_addr, request.user_agent.string))
            conn.commit()
    finally:
        conn.close()
    
    return jsonify({
        'token': token,
        'user': {
            'user_id': str(user['user_id']),
            'username': user['username'],
            'email': user['email'],
            'roles': user['roles']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    user = get_current_user()
    return jsonify({
        'user_id': str(user['user_id']),
        'username': user['username'],
        'email': user['email'],
        'status': user['status'],
        'roles': user['roles']
    })

# USERS
@app.route('/api/users', methods=['GET'])
@require_auth
def get_users():
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    if 'owner' not in user_roles:
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    
    query = """
        SELECT user_id, username, email, status, 
               roles, highest_priority, role_count, last_login
        FROM user_roles_summary
        ORDER BY highest_priority, username
    """
    users = execute_query(query)
    for user in users:
        user['user_id'] = str(user['user_id'])
    
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
@require_auth
def create_user():
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    if 'owner' not in user_roles:
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403

    data = request.json

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, phone, status, metadata)
                VALUES (%s, %s, hash_password(%s), %s, %s, %s)
                RETURNING user_id
            """, (
                data['username'],
                data['email'],
                data['password'],
                data.get('phone'),
                data.get('status', 'active'),
                data.get('metadata', {})
            ))
            user_id = cursor.fetchone()['user_id']

            # Dodaj ulogu ako je navedena
            if 'role_name' in data:
                cursor.execute("""
                    INSERT INTO user_roles (user_id, role_id, assigned_by)
                    SELECT %s, role_id, %s
                    FROM roles WHERE role_name = %s
                """, (user_id, request.user_id, data['role_name']))

            conn.commit()
        conn.close()

        return jsonify({'user_id': str(user_id), 'message': 'Korisnik kreiran'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<user_id>', methods=['PUT'])
@require_auth
def update_user(user_id):
    current_user = get_current_user()
    current_user_roles = current_user.get('roles', []) or []
    current_user_roles = [r for r in current_user_roles if r is not None]
    if 'owner' not in current_user_roles and str(current_user['user_id']) != str(user_id):
        return jsonify({'error': 'Možete mijenjati samo vlastite podatke'}), 403

    data = request.json

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            update_fields = []
            params = []

            if 'email' in data:
                update_fields.append('email = %s')
                params.append(data['email'])

            if 'phone' in data:
                update_fields.append('phone = %s')
                params.append(data['phone'])

            if 'metadata' in data:
                update_fields.append('metadata = %s')
                params.append(data['metadata'])
            if 'status' in data and 'owner' in current_user_roles:
                update_fields.append('status = %s')
                params.append(data['status'])

            if update_fields:
                params.append(user_id)
                query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = %s"
                cursor.execute(query, params)
                conn.commit()

        conn.close()

        return jsonify({'message': 'Korisnik ažuriran'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<user_id>/permissions', methods=['GET'])
@require_auth
def get_user_permissions_endpoint(user_id):
    current_user = get_current_user()
    current_user_roles = current_user.get('roles', []) or []
    current_user_roles = [r for r in current_user_roles if r is not None]
    if 'owner' not in current_user_roles and str(current_user['user_id']) != str(user_id):
        return jsonify({'error': 'Niste autorizirani'}), 403

    query = """
        SELECT permission_name, resource_type, action
        FROM get_user_permissions(%s)
    """
    permissions = execute_query(query, (user_id,))

    return jsonify(permissions)

# VEHICLES

@app.route('/api/vehicles', methods=['GET'])
@require_auth
def get_vehicles():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if 'owner' in user_roles or 'receptionist' in user_roles or 'mechanic' in user_roles or 'head_mechanic' in user_roles:
        query = """
            SELECT v.vehicle_id, v.license_plate, v.brand, v.model, v.year, v.vin,
                   u.username as owner_name, u.email as owner_email
            FROM vehicles v
            JOIN users u ON v.owner_id = u.user_id
            ORDER BY v.created_at DESC
        """
        vehicles = execute_query(query)
    else:
        query = """
            SELECT v.vehicle_id, v.license_plate, v.brand, v.model, v.year, v.vin,
                   u.username as owner_name, u.email as owner_email
            FROM vehicles v
            JOIN users u ON v.owner_id = u.user_id
            WHERE v.owner_id = %s
            ORDER BY v.created_at DESC
        """
        vehicles = execute_query(query, (user_id,))
    
    for vehicle in vehicles:
        vehicle['vehicle_id'] = str(vehicle['vehicle_id'])
    
    return jsonify(vehicles)

@app.route('/api/vehicles', methods=['POST'])
@require_auth
def create_vehicle():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    data = request.json

    if 'customer' in user_roles and not any(role in user_roles for role in ['owner', 'receptionist']):
        data['owner_id'] = str(user_id)
    elif not any(role in user_roles for role in ['owner', 'receptionist']):
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO vehicles (owner_id, license_plate, brand, model, year, vin, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING vehicle_id
            """, (
                data['owner_id'],
                data['license_plate'],
                data['brand'],
                data['model'],
                data.get('year'),
                data.get('vin'),
                data.get('metadata', {})
            ))
            vehicle_id = cursor.fetchone()['vehicle_id']
            conn.commit()
        conn.close()

        return jsonify({'vehicle_id': str(vehicle_id), 'message': 'Vozilo kreirano'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# WORK ORDERS

@app.route('/api/work-orders', methods=['GET'])
@require_auth
def get_work_orders():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if 'owner' in user_roles or 'receptionist' in user_roles or 'head_mechanic' in user_roles:
        query = """
            SELECT work_order_id, status, description, estimated_cost, actual_cost,
                   created_at, started_at, completed_at,
                   license_plate, brand, model, year,
                   customer_name, customer_email, mechanic_id, mechanic_name,
                   completion_days, has_invoice
            FROM work_orders_detailed
            ORDER BY created_at DESC
        """
        orders = execute_query(query)
    elif 'mechanic' in user_roles:
        query = """
            SELECT work_order_id, status, description, estimated_cost, actual_cost,
                   created_at, started_at, completed_at,
                   license_plate, brand, model, year,
                   customer_name, customer_email, mechanic_id, mechanic_name,
                   completion_days, has_invoice
            FROM work_orders_detailed
            WHERE mechanic_id = %s
            ORDER BY created_at DESC
        """
        orders = execute_query(query, (user_id,))
    elif 'customer' in user_roles:
        query = """
            SELECT wo.work_order_id, wo.status, wo.description, wo.estimated_cost, wo.actual_cost,
                   wo.created_at, wo.started_at, wo.completed_at,
                   v.license_plate, v.brand, v.model, v.year,
                   u.username as customer_name, u.email as customer_email,
                   m.user_id as mechanic_id, m.username as mechanic_name,
                   CASE 
                       WHEN wo.completed_at IS NOT NULL THEN 
                           EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 86400
                       ELSE NULL
                   END as completion_days,
                   EXISTS(SELECT 1 FROM invoices i WHERE i.work_order_id = wo.work_order_id) as has_invoice
            FROM work_orders wo
            JOIN vehicles v ON wo.vehicle_id = v.vehicle_id
            JOIN users u ON v.owner_id = u.user_id
            LEFT JOIN users m ON wo.assigned_mechanic_id = m.user_id
            WHERE v.owner_id = %s
            ORDER BY wo.created_at DESC
        """
        orders = execute_query(query, (user_id,))
    else:
        orders = []
    
    for order in orders:
        order['work_order_id'] = str(order['work_order_id'])
    
    return jsonify(orders)

@app.route('/api/work-orders/<order_id>', methods=['GET'])
@require_auth
def get_work_order(order_id):
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    
    query = """
        SELECT work_order_id, status, description, estimated_cost, actual_cost,
               created_at, started_at, completed_at,
               license_plate, brand, model, year,
               customer_id, customer_name, customer_email,
               mechanic_id, mechanic_name
        FROM work_orders_detailed
        WHERE work_order_id = %s
    """
    order = execute_one(query, (order_id,))
    
    if not order:
        return jsonify({'error': 'Work order not found'}), 404

    if 'mechanic' in user_roles and not 'owner' in user_roles:
        if str(order['mechanic_id']) != str(user_id):
            return jsonify({'error': 'Niste autorizirani'}), 403
    elif 'customer' in user_roles and not 'owner' in user_roles:
        if str(order['customer_id']) != str(user_id):
            return jsonify({'error': 'Niste autorizirani'}), 403
    
    order['work_order_id'] = str(order['work_order_id'])
    if order['customer_id']:
        order['customer_id'] = str(order['customer_id'])
    if order['mechanic_id']:
        order['mechanic_id'] = str(order['mechanic_id'])

    logs_query = """
        SELECT log_id, log_entry, hours_worked, timestamp,
               u.username as mechanic_name
        FROM work_log wl
        JOIN users u ON wl.mechanic_id = u.user_id
        WHERE wl.work_order_id = %s
        ORDER BY timestamp DESC
    """
    logs = execute_query(logs_query, (order_id,))
    order['work_logs'] = logs
    
    return jsonify(order)

@app.route('/api/work-orders', methods=['POST'])
@require_auth
def create_work_order():
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    if not any(role in user_roles for role in ['owner', 'receptionist', 'head_mechanic']):
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    
    data = request.json
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO work_orders 
                (vehicle_id, created_by, assigned_mechanic_id, description, estimated_cost, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING work_order_id
            """, (
                data['vehicle_id'],
                request.user_id,
                data.get('assigned_mechanic_id'),
                data['description'],
                data.get('estimated_cost'),
                data.get('status', 'pending')
            ))
            order_id = cursor.fetchone()['work_order_id']
            conn.commit()
        conn.close()
        
        return jsonify({'work_order_id': str(order_id), 'message': 'Radni nalog kreiran'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/work-orders/<order_id>/status', methods=['PUT'])
@require_auth
def update_work_order_status(order_id):
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    if not any(role in user_roles for role in ['owner', 'receptionist', 'head_mechanic']):
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    
    data = request.json
    new_status = data.get('status')
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE work_orders 
                SET status = %s
                WHERE work_order_id = %s
            """, (new_status, order_id))
            conn.commit()
        conn.close()
        
        return jsonify({'message': 'Status ažuriran'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/work-orders/<order_id>/mechanic', methods=['PUT'])
@require_auth
def assign_mechanic(order_id):
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]
    if not any(role in user_roles for role in ['owner', 'receptionist', 'head_mechanic']):
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    
    data = request.json
    mechanic_id = data.get('mechanic_id')
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE work_orders 
                SET assigned_mechanic_id = %s
                WHERE work_order_id = %s
            """, (mechanic_id, order_id))
            conn.commit()
        conn.close()
        
        return jsonify({'message': 'Mehaničar dodijeljen'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/work-orders/<order_id>/logs', methods=['POST'])
@require_auth
def add_work_log(order_id):
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if 'mechanic' in user_roles and not any(role in user_roles for role in ['owner', 'head_mechanic']):
        query = "SELECT assigned_mechanic_id FROM work_orders WHERE work_order_id = %s"
        result = execute_one(query, (order_id,))
        if not result or str(result['assigned_mechanic_id']) != str(user_id):
            return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    elif 'customer' in user_roles and not any(role in user_roles for role in ['owner', 'head_mechanic']):
        return jsonify({'error': 'Niste autorizirani za ovu operaciju'}), 403
    
    data = request.json
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO work_log (work_order_id, mechanic_id, log_entry, hours_worked)
                VALUES (%s, %s, %s, %s)
            """, (
                order_id,
                user_id,
                data['log_entry'],
                data.get('hours_worked')
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'message': 'Zapis dodan'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ROLES

@app.route('/api/roles', methods=['GET'])
@require_auth
def get_roles():
    query = "SELECT role_id, role_name, description FROM roles ORDER BY priority"
    roles = execute_query(query)
    return jsonify(roles)

# STATISTICS

@app.route('/api/stats/dashboard', methods=['GET'])
@require_auth
def get_dashboard_stats():
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    stats = {}
    
    stats['total_users'] = execute_one("SELECT COUNT(*) as count FROM users")['count']
    stats['total_vehicles'] = execute_one("SELECT COUNT(*) as count FROM vehicles")['count']
    stats['total_work_orders'] = execute_one("SELECT COUNT(*) as count FROM work_orders")['count']
    stats['pending_orders'] = execute_one(
        "SELECT COUNT(*) as count FROM work_orders WHERE status IN ('pending', 'approved')"
    )['count']
    stats['active_orders'] = execute_one(
        "SELECT COUNT(*) as count FROM work_orders WHERE status = 'in_progress'"
    )['count']
    
    mechanics_query = """
        SELECT username, completed_jobs, total_hours_worked
        FROM mechanic_performance
        WHERE completed_jobs > 0
        ORDER BY completed_jobs DESC
        LIMIT 5
    """
    stats['top_mechanics'] = execute_query(mechanics_query)

    if any(role in user_roles for role in ['owner', 'head_mechanic']):
        recent_query = """
            SELECT action_type, table_name, timestamp, u.username
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.user_id
            ORDER BY timestamp DESC
            LIMIT 10
        """
        stats['recent_activities'] = execute_query(recent_query)
    else:
        stats['recent_activities'] = []
    
    return jsonify(stats)

# HELPERS

@app.route('/api/mechanics', methods=['GET'])
@require_auth
def get_mechanics():
    query = """
        SELECT u.user_id, u.username
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE r.role_name IN ('mechanic', 'head_mechanic', 'owner')
          AND u.status = 'active'
        ORDER BY u.username
    """
    mechanics = execute_query(query)
    
    for m in mechanics:
        m['user_id'] = str(m['user_id'])
    
    return jsonify(mechanics)

@app.route('/api/customers', methods=['GET'])
@require_auth
def get_customers():
    query = """
        SELECT u.user_id, u.username, u.email
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE r.role_name = 'customer'
          AND u.status = 'active'
        ORDER BY u.username
    """
    customers = execute_query(query)

    for c in customers:
        c['user_id'] = str(c['user_id'])

    return jsonify(customers)

# INVOICES

@app.route('/api/invoices', methods=['GET'])
@require_auth
def get_invoices():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if any(role in user_roles for role in ['owner', 'accountant', 'receptionist']):
        query = """
            SELECT * FROM invoice_summary
            ORDER BY issued_at DESC
        """
        invoices = execute_query(query)
    elif 'customer' in user_roles:
        query = """
            SELECT invoice_id, invoice_number, status, total_amount, tax_amount,
                   issued_at, paid_at, customer_name, customer_email,
                   work_order_id, work_description, license_plate, days_overdue
            FROM invoice_summary
            WHERE customer_email = (SELECT email FROM users WHERE user_id = %s)
            ORDER BY issued_at DESC
        """
        invoices = execute_query(query, (user_id,))
    else:
        invoices = []

    for invoice in invoices:
        if 'invoice_id' in invoice:
            invoice['invoice_id'] = str(invoice['invoice_id'])
        if 'work_order_id' in invoice:
            invoice['work_order_id'] = str(invoice['work_order_id'])

    return jsonify(invoices)

@app.route('/api/invoices/<invoice_id>/pay', methods=['PUT'])
@require_auth
def mark_invoice_paid(invoice_id):
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if not any(role in user_roles for role in ['owner', 'accountant']):
        return jsonify({'error': 'Niste autorizirani'}), 403

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE invoices
                SET status = 'paid', paid_at = CURRENT_TIMESTAMP
                WHERE invoice_id = %s
            """, (invoice_id,))
            conn.commit()
        conn.close()

        return jsonify({'message': 'Račun označen kao plaćen'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# AUDIT LOG

@app.route('/api/audit-log', methods=['GET'])
@require_auth
def get_audit_log():
    user = get_current_user()
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if not any(role in user_roles for role in ['owner', 'head_mechanic']):
        return jsonify({'error': 'Niste autorizirani'}), 403

    limit = request.args.get('limit', 100, type=int)
    table_name = request.args.get('table_name')
    action_type = request.args.get('action_type')

    query = "SELECT * FROM audit_trail WHERE 1=1"
    params = []

    if table_name:
        query += " AND table_name = %s"
        params.append(table_name)

    if action_type:
        query += " AND action_type = %s"
        params.append(action_type)

    query += f" ORDER BY timestamp DESC LIMIT {limit}"

    logs = execute_query(query, params if params else None)

    return jsonify(logs)

# SESSIONS

@app.route('/api/sessions', methods=['GET'])
@require_auth
def get_sessions():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if 'owner' in user_roles:
        query = "SELECT * FROM active_sessions ORDER BY created_at DESC"
        sessions = execute_query(query)
    else:
        query = """
            SELECT session_id, ip_address, created_at, expires_at,
                   EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 60 as minutes_until_expiry
            FROM sessions
            WHERE user_id = %s AND is_active = true AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC
        """
        sessions = execute_query(query, (user_id,))

    for session in sessions:
        if 'session_id' in session:
            session['session_id'] = str(session['session_id'])

    return jsonify(sessions)

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
@require_auth
def delete_session(session_id):
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if 'owner' not in user_roles:
                cursor.execute("""
                    SELECT user_id FROM sessions WHERE session_id = %s
                """, (session_id,))
                result = cursor.fetchone()
                if not result or str(result['user_id']) != str(user_id):
                    return jsonify({'error': 'Niste autorizirani'}), 403

            cursor.execute("""
                UPDATE sessions SET is_active = false WHERE session_id = %s
            """, (session_id,))
            conn.commit()
        conn.close()

        return jsonify({'message': 'Sesija deaktivirana'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# CUSTOMER DASHBOARD

@app.route('/api/stats/customer-dashboard', methods=['GET'])
@require_auth
def get_customer_dashboard():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if 'customer' not in user_roles:
        return jsonify({'error': 'Samo za klijente'}), 403

    # Koristi customer_statistics view
    query = """
        SELECT * FROM customer_statistics WHERE user_id = %s
    """
    stats = execute_one(query, (user_id,))

    if stats and 'user_id' in stats:
        stats['user_id'] = str(stats['user_id'])

    vehicles_query = """
        SELECT vehicle_id, license_plate, brand, model, year,
               total_services, total_spent, last_service_date
        FROM get_customer_vehicles(%s)
    """
    vehicles = execute_query(vehicles_query, (user_id,))

    for v in vehicles:
        v['vehicle_id'] = str(v['vehicle_id'])

    stats['vehicles'] = vehicles

    return jsonify(stats)

# MECHANIC DASHBOARD

@app.route('/api/stats/mechanic-dashboard', methods=['GET'])
@require_auth
def get_mechanic_dashboard():
    user = get_current_user()
    user_id = user['user_id']
    user_roles = user.get('roles', []) or []
    user_roles = [r for r in user_roles if r is not None]

    if not any(role in user_roles for role in ['mechanic', 'head_mechanic']):
        return jsonify({'error': 'Samo za mehaničare'}), 403

    # Koristi mechanic_performance view
    query = """
        SELECT * FROM mechanic_performance WHERE user_id = %s
    """
    stats = execute_one(query, (user_id,))

    if stats and 'user_id' in stats:
        stats['user_id'] = str(stats['user_id'])

    workload_query = """
        SELECT * FROM get_mechanic_workload(%s)
    """
    workload = execute_one(workload_query, (user_id,))
    stats['workload'] = workload

    return jsonify(stats)

# HEALTH CHECK

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        execute_one("SELECT 1")
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

# ERROR HANDLERS

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# RUN

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
