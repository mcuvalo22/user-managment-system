import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import Config
from database import execute_one

def generate_token(user_id):
    payload = {
        'user_id': str(user_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')

def decode_token(token):
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        if token.startswith('Bearer '):
            token = token[7:]

        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401

        request.user_id = payload['user_id']

        return f(*args, **kwargs)

    return decorated

def get_current_user():
    user_id = request.user_id
    query = """
        SELECT u.user_id, u.username, u.email, u.status,
               ARRAY_AGG(r.role_name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.user_id = %s
        GROUP BY u.user_id
    """
    return execute_one(query, (user_id,))

def require_permission(resource_type, action):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_id = request.user_id

            from database import execute_one
            has_perm = execute_one(
                "SELECT user_has_permission(%s, %s, %s) as has_permission",
                (user_id, resource_type, action)
            )

            if not has_perm or not has_perm['has_permission']:
                return jsonify({'error': 'Nemate dozvolu za ovu akciju'}), 403

            return f(*args, **kwargs)
        return decorated
    return decorator

def get_user_role():
    user = get_current_user()
    if user and user['roles']:
        role_priority = {
            'owner': 1,
            'head_mechanic': 2,
            'mechanic': 3,
            'receptionist': 3,
            'accountant': 3,
            'customer': 4
        }
        roles = user['roles']
        return min(roles, key=lambda r: role_priority.get(r, 99))
    return None