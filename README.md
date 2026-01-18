# User Management System for Auto Service Shops

Project for the **Teorija baza podataka** course – Faculty of Organization and Informatics, University of Zagreb.

A web-based user management solution with role-based access control (RBAC), built with Flask and React for auto service shop operations.

## About the project

This project demonstrates the practical application of **database design principles and advanced SQL concepts** through the implementation of a complete role-based access control (RBAC) system with multi-tier authorization, comprehensive audit logging, and complex relational data management. It showcases database normalization, trigger-based automation, stored procedures, views, and full-stack application development for business management systems.

## Features

- **Authentication & Authorization**
  - JWT token-based authentication
  - Role-based access control (RBAC) with 6 distinct roles
  - Permission-based granular control
  - Session management and tracking

- **Core Business Operations**
  - Work order management (creation, assignment, status tracking)
  - Vehicle inventory and customer management
  - Invoice generation and payment tracking
  - Mechanic performance analytics

- **Data Integrity & Security**
  - Comprehensive audit logging of all changes
  - Password hashing with bcrypt
  - IP address and user agent tracking
  - Cascading delete constraints
  - Role-based UI element visibility

- **Role-Specific Features**
  - Owner dashboard with business analytics
  - Mechanic dashboard with workload tracking
  - Customer portal with service history
  - Receptionist order management interface
  - Accountant financial reporting tools

## Core Components Overview

### Role-Based Access Control (RBAC)
The RBAC system implements a hierarchical permission model with 6 roles (owner, head_mechanic, mechanic, receptionist, accountant, customer). Each role has specific permissions for viewing, creating, and modifying business resources. Authorization is enforced at both the API level (backend) and UI level (frontend) for security and usability.

### Audit Logging System
Every data modification (INSERT, UPDATE, DELETE) is automatically logged with user information, IP address, timestamp, and before/after values in JSONB format. This provides complete traceability of all business operations and supports compliance requirements.

### Multi-Tier Dashboard Architecture
Role-specific dashboards display relevant business metrics and controls. Owners see company-wide statistics, mechanics see assigned work, customers see their service history, and accountants see financial data. This ensures users only access information relevant to their role.

## Installation and Usage

### Quick Start (Fully Automated)
```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/user-management-system.git
cd user-management-system

# Run the setup script (handles everything)
./setup.sh

# Application will open at http://localhost:5175
```

### Manual Setup
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py  # Runs on port 5000

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev  # Runs on port 5173+
```

## Technologies

### Backend
- **Python 3.8+** – Core language
- **Flask 3.0.0** – Web framework
- **PostgreSQL** – Relational database
- **psycopg2** – PostgreSQL adapter
- **PyJWT** – JWT authentication
- **python-dotenv** – Environment configuration

### Frontend
- **React 19** – UI framework
- **Vite** – Build tool and dev server
- **Axios** – HTTP client
- **React Router** – Routing
- **Tailwind CSS** – Styling

### Database
- **PostgreSQL** with UUID extensions
- **Stored procedures** for business logic
- **Views** for analytics and reporting
- **Triggers** for automatic audit logging
- **Indexes** for query optimization

## Test Credentials

All test users have password: `password123`

| Username | Role | Email | Access Level |
|----------|------|-------|--------------|
| marko_vlasnik | Owner | marko@autoservis.hr | Full system access |
| ivan_glavni | Head Mechanic | ivan@autoservis.hr | Mechanic management |
| petar_mehanicar | Mechanic | petar@autoservis.hr | Work order execution |
| maja_recepcija | Receptionist | maja@autoservis.hr | Order management |
| luka_racunovodja | Accountant | luka@autoservis.hr | Financial operations |
| tomislav_klijent | Customer | tomislav@autoservis.hr | Service portal |

## Architecture Overview

### Database Schema
- **8 core tables** (users, roles, vehicles, work_orders, invoices, sessions, audit_log, work_log)
- **5 materialized views** (user_roles_summary, mechanic_performance, customer_statistics, etc.)
- **8 stored functions** (password verification, permission checking, role hierarchy)
- **Comprehensive triggers** for audit logging on all data modifications

### API Endpoints
- **Authentication:** login, current user info
- **Users:** CRUD operations with permission checks
- **Vehicles:** creation, listing, ownership validation
- **Work Orders:** creation, assignment, status updates, work logging
- **Invoices:** generation, payment tracking, customer filtering
- **Sessions:** tracking, revocation, activity monitoring
- **Audit Log:** change history with filtering
- **Analytics:** role-specific dashboards and reports

### Frontend Architecture
- **Layout component** with navigation
- **Context API** for authentication state
- **Page components** for each business domain
- **Role-based UI** with disabled elements for unauthorized actions
- **Modal dialogs** for forms and confirmations
- **Responsive design** with Tailwind CSS

## Project Structure

```
user-management-system/
├── backend/
│   ├── app.py              # Flask application and all endpoints
│   ├── auth_helper.py      # JWT and authorization utilities
│   ├── database.py         # Database connection and queries
│   ├── config.py           # Configuration management
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API client
│   │   ├── context/        # Auth context
│   │   └── App.jsx         # Main app component
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite configuration
├── database/
│   ├── schema.sql          # Database tables and indexes
│   ├── functions.sql       # Stored procedures and functions
│   ├── views.sql           # Materialized views
│   ├── triggers.sql        # Audit logging triggers
│   └── seed.sql            # Test data
├── setup.sh                # Automated installation script
├── QUICK_START.md          # Quick reference guide
└── README.md               # This file
```

## Key Features in Detail

### Security
- JWT-based stateless authentication with 24-hour expiration
- Role-based authorization on every endpoint
- Password hashing with bcrypt
- Session tracking with IP/user agent logging
- Complete audit trail of all modifications

### Data Integrity
- UUID primary keys across all tables
- Proper foreign key constraints with cascading deletes
- CHECK constraints for data validation
- UNIQUE constraints preventing duplicates
- Transaction support for multi-step operations

### Performance
- B-tree indexes on frequently queried columns
- GIN indexes on JSONB fields
- Query optimization with materialized views
- Lazy loading in frontend
- Efficient pagination support

### Compliance & Auditability
- All changes logged with timestamp, user, and IP
- Before/after values stored for audit trail
- User activity monitoring
- Session management and revocation
- Role hierarchy and permission tracking

## Author

Mateo Čuvalo  
Student, Faculty of Organization and Informatics Varaždin  
University of Zagreb

## License

This project is licensed under the MIT License – see the LICENSE file for details.

## Additional Documentation

- [QUICK_START.md](QUICK_START.md) – Quick reference for getting started
- [AUDIT_REPORT.md](AUDIT_REPORT.md) – Comprehensive code audit and verification
