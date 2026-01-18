import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config

def get_db_connection():
    conn_params = {
        'host': Config.DB_HOST,
        'port': Config.DB_PORT,
        'database': Config.DB_NAME,
        'user': Config.DB_USER,
        'cursor_factory': RealDictCursor,
        'client_encoding': 'UTF8'
    }
    if Config.DB_PASSWORD:
        conn_params['password'] = Config.DB_PASSWORD
    
    conn = psycopg2.connect(**conn_params)
    conn.set_client_encoding('UTF8')
    return conn

def execute_query(query, params=None, fetch=True):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch:
                result = cursor.fetchall()
                return result
            conn.commit()
            return None
    finally:
        conn.close()

def execute_one(query, params=None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()
    finally:
        conn.close()