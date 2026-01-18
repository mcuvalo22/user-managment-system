#!/bin/bash
set -e

echo "=========================================="
echo "Autoservis - Setup & Run"
echo "=========================================="
echo ""

# Provjera PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Instaliram PostgreSQL..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
fi

# Provjera Python3
if ! command -v python3 &> /dev/null; then
    echo "Instaliram Python3..."
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# Provjera Node.js
if ! command -v node &> /dev/null; then
    echo "Instaliram Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PostgreSQL pokrenut?
if ! pg_isready -h /var/run/postgresql &> /dev/null; then
    echo "Pokrenjem PostgreSQL..."
    sudo service postgresql start
    sleep 2
fi

# Baza postoji?
if ! sudo -u postgres psql -d autoservis -c "SELECT 1" &> /dev/null; then
    echo "Kreiram bazu podataka..."
    sudo -u postgres createdb autoservis
    
    echo "Učitavam schema..."
    sudo -u postgres psql -d autoservis -f database/schema.sql > /dev/null 2>&1
    sudo -u postgres psql -d autoservis -f database/functions.sql > /dev/null 2>&1
    sudo -u postgres psql -d autoservis -f database/views.sql > /dev/null 2>&1
    sudo -u postgres psql -d autoservis -f database/triggers.sql > /dev/null 2>&1
    sudo -u postgres psql -d autoservis -f database/seed.sql > /dev/null 2>&1
    
    echo "✓ Baza je sprema"
fi

# Backend setup
if [ ! -d "backend/venv" ]; then
    echo "Postavljam backend..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    deactivate
    cd ..
fi

cat > backend/.env << EOF
DB_HOST=/var/run/postgresql
DB_PORT=5432
DB_NAME=autoservis
DB_USER=autoservis
DB_PASSWORD=
SECRET_KEY=dev-secret-key-change-in-production
FLASK_ENV=development
EOF

# Frontend setup
if [ ! -d "frontend/node_modules" ]; then
    echo "Postavljam frontend..."
    cd frontend
    npm install --silent
    cd ..
fi

# Kreiraj autoservis user ako ne postoji
sudo -u postgres createuser -s autoservis 2>/dev/null || true

echo ""
echo "=========================================="
echo " Setup gotov! Pokrecem aplikaciju..."
echo "=========================================="
echo ""

# Pokrenite procese
pkill -f "app.py" 2>/dev/null || true
pkill -f "npm" 2>/dev/null || true

cd backend && source venv/bin/activate && python app.py &
cd frontend && npm run dev

