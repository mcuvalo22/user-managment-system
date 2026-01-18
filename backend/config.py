import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database konfiguracija
    DB_HOST = os.getenv('DB_HOST', '/var/run/postgresql')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'autoservis')
    DB_USER = os.getenv('DB_USER', 'cuki')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

    JWT_EXPIRATION_HOURS = 24