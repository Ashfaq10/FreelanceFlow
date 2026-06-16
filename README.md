<h1 align="center">
  <br>
  FreelanceFlow
  <br>
</h1>

<p align="center">
  A full-stack invoice management system for freelancers — manage clients, track time, generate branded PDF invoices, collect Stripe payments, and automate overdue reminders.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django-4.2-092E20?style=flat-square&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Celery-5.3-37814A?style=flat-square" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running with Docker](#running-with-docker)
- [API Reference](#api-reference)
- [PDF Generation](#pdf-generation)
- [Stripe Integration](#stripe-integration)
- [Celery Tasks](#celery-tasks)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

FreelanceFlow solves a real pain point: freelancers waste hours creating invoices manually in Google Docs or spreadsheets, lose track of who owes what, and forget to follow up on overdue payments.

This project automates the entire invoicing workflow — from time tracking to PDF generation to Stripe payment collection — with a modern React 18 frontend powered by a Django REST Framework backend.

---

## Features

<table>
<tr><td>

**📋 Invoice Management**
- Create invoices with dynamic line items
- Auto-generated invoice numbers (`INV-2026-001`)
- Tax rate support per invoice
- Statuses: Draft → Sent → Overdue → Paid / Cancelled
- Duplicate an invoice in one click

</td><td>

**👥 Client Management**
- Full client profiles with contact details
- Per-client invoice history and totals
- Archive inactive clients

</td></tr>
<tr><td>

**⏱️ Time Tracking**
- Log time with hourly rate
- Link time logs directly to an invoice
- Auto-calculate invoice total from hours

</td><td>

**🧾 PDF Generation**
- Branded PDF invoices via WeasyPrint
- Business logo, name, and contact details
- Status watermark (PAID / OVERDUE)
- One-click download or email delivery

</td></tr>
<tr><td>

**💳 Stripe Payments**
- Stripe Checkout link on every invoice
- Webhook auto-marks invoice as Paid
- Payment records stored per invoice

</td><td>

**🔔 Automated Reminders**
- Daily Celery Beat job checks overdue invoices
- Reminder emails 3 days before due date
- Overdue notification emails sent automatically

</td></tr>
<tr><td colspan="2">

**📊 Dashboard & Reports**
- Monthly revenue summary and outstanding totals
- Revenue chart by month (Recharts)
- Top clients by revenue, recent activity

</td></tr>
</table>

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | Django 4.2 + Django REST Framework |
| **Database** | PostgreSQL 15 (SQLite for local dev) |
| **Task Queue** | Celery 5.3 + Redis |
| **PDF Generation** | WeasyPrint |
| **Payments** | Stripe (Checkout + Webhooks) |
| **Email** | SendGrid (or any SMTP) |
| **File Storage** | AWS S3 via `django-storages` |
| **Auth** | Token Authentication + `django-allauth` |
| **Containers** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Testing** | pytest-django + factory_boy |

---

## Architecture

```
┌─────────────────────────────────┐
│   React 18 SPA  (Vite + Tailwind) │
└────────────────┬────────────────┘
                 │  REST API (Token Auth)
┌────────────────▼────────────────┐
│       Django + DRF Backend       │
└──┬─────────┬──────────┬─────────┘
   │         │          │
   ▼         ▼          ▼
PostgreSQL  Redis    WeasyPrint
(models)  Celery    (PDF render)
            │
     ┌──────┴──────┐
     ▼             ▼
 SendGrid       Stripe API
 (email)      (payments + webhooks)
```

All services are containerised via Docker Compose:

| Service | Description |
|---|---|
| `web` | Django + Gunicorn |
| `celery` | Celery worker |
| `celery-beat` | Celery Beat scheduler |
| `db` | PostgreSQL 15 |
| `redis` | Redis 7 |
| `nginx` | Reverse proxy |

---

## Project Structure

```
freelanceflow/
├── frontend/                     # React + Vite SPA
│   ├── src/
│   │   ├── api/                  # Axios client & endpoint definitions
│   │   ├── components/
│   │   │   ├── layout/           # Header, Sidebar, Layout
│   │   │   └── ui/               # Button, Input, Card, Modal, Badge, etc.
│   │   ├── context/              # AuthContext (user state)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/
│   │   │   ├── Auth/             # Login, Signup, ForgotPassword
│   │   │   ├── Clients/          # ClientList, ClientCreate, ClientDetail
│   │   │   ├── Invoices/         # InvoiceList, InvoiceCreate, InvoiceDetail
│   │   │   ├── TimeTracker/
│   │   │   ├── Reports/
│   │   │   ├── Settings/
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                      # Django REST API
│   ├── apps/
│   │   ├── accounts/             # Custom user model, auth API
│   │   ├── clients/              # Client CRUD + API
│   │   ├── dashboard/            # Summary + chart data API
│   │   ├── invoices/             # Core — invoices, PDF, tasks
│   │   ├── payments/             # Stripe webhook handler
│   │   └── time_tracker/        # Time log entries + API
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py           # Shared settings
│   │   │   ├── local.py          # Dev overrides
│   │   │   └── production.py     # Production overrides
│   │   ├── celery.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── templates/
│   │   └── invoices/
│   │       ├── invoice_pdf.html  # Branded PDF template
│   │       └── email/            # Invoice & reminder email templates
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx.conf
├── .env.example
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose *(for containerised setup)*
- A free [Stripe account](https://stripe.com)
- A free [SendGrid account](https://sendgrid.com)

### Local Setup (without Docker)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/freelanceflow.git
cd freelanceflow

# 2. Set up the backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements-dev.txt

# 3. Configure environment variables
cd ..
cp .env.example .env
# → Edit .env and fill in your values

# 4. Run migrations and create a superuser
cd backend
python manage.py migrate
python manage.py createsuperuser

# 5. (Optional) Load sample data
python manage.py loaddata fixtures/sample_data.json

# 6. Start the Django development server
python manage.py runserver

# 7. In a new terminal — start the React frontend
cd ../frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| React Frontend | http://localhost:5173 |
| Django API | http://localhost:8000 |
| Django Admin | http://localhost:8000/admin |

> **Optional:** Start Celery worker for background tasks (email sending, PDF generation):
> ```bash
> # Worker
> celery -A config worker -l info
> # Scheduler (in a separate terminal)
> celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
> ```

---

## Environment Variables

Copy `.env.example` to `.env` and populate the values:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (leave USE_SQLITE=True to use SQLite in development)
USE_SQLITE=True
DATABASE_URL=postgres://user:password@localhost:5432/freelanceflow

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (Email)
SENDGRID_API_KEY=SG...
DEFAULT_FROM_EMAIL=invoices@yourdomain.com

# AWS S3 (optional — uses local storage by default in dev)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=freelanceflow-pdfs
AWS_S3_REGION_NAME=us-east-1

# App
SITE_URL=http://localhost:8000
```

---

## Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Run migrations
docker-compose exec web python backend/manage.py migrate

# Create superuser
docker-compose exec web python backend/manage.py createsuperuser

# Tail logs
docker-compose logs -f web
docker-compose logs -f celery

# Stop all services
docker-compose down
```

App is served at `http://localhost:80` via Nginx.

---

## API Reference

All endpoints require **Token authentication** in the `Authorization: Token <token>` header, except the auth endpoints.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup/` | Register a new account, returns token |
| `POST` | `/api/auth/login/` | Login with email/password, returns token |
| `POST` | `/api/auth/logout/` | Invalidate the current token |
| `GET` | `/api/auth/user/` | Get current user profile |
| `PATCH` | `/api/auth/user/` | Update user profile |

### Invoices

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/invoices/` | List invoices (filter by `?status=`) |
| `POST` | `/api/invoices/` | Create a new invoice |
| `GET` | `/api/invoices/{id}/` | Invoice detail |
| `PATCH` | `/api/invoices/{id}/` | Update invoice |
| `DELETE` | `/api/invoices/{id}/` | Delete a draft invoice |
| `POST` | `/api/invoices/{id}/send/` | Generate PDF + send email to client |
| `GET` | `/api/invoices/{id}/pdf/` | Download invoice PDF |

### Clients

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients/` | List all clients |
| `POST` | `/api/clients/` | Create a new client |
| `GET` | `/api/clients/{id}/` | Client detail + invoice history |
| `PATCH` | `/api/clients/{id}/` | Update client |
| `DELETE` | `/api/clients/{id}/` | Delete client |

### Time Tracker

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/time-logs/` | List time log entries |
| `POST` | `/api/time-logs/` | Create a time log |
| `GET` | `/api/time-logs/{id}/` | Time log detail |
| `PATCH` | `/api/time-logs/{id}/` | Update time log |
| `DELETE` | `/api/time-logs/{id}/` | Delete time log |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary/` | Revenue stats (total, outstanding, overdue) |
| `GET` | `/api/dashboard/monthly-revenue/` | Monthly revenue data for charts |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/webhook/` | Stripe webhook receiver (no auth required) |

---

## PDF Generation

WeasyPrint converts an HTML template to a styled PDF:

```python
# apps/invoices/utils.py
def generate_pdf(invoice):
    html_string = render_to_string('invoices/invoice_pdf.html', {
        'invoice': invoice,
        'items': invoice.items.all(),
        'user': invoice.user,
        'client': invoice.client,
    })
    return weasyprint.HTML(string=html_string, base_url=settings.SITE_URL).write_pdf()
```

The PDF template (`templates/invoices/invoice_pdf.html`) supports multiple design styles and includes:
- Freelancer logo + business name + contact details
- Invoice number, issue date, and due date
- Bill To section with client name and address
- Line items table with quantity, unit price, and totals
- Subtotal, tax, and grand total
- Notes / payment terms
- Stripe payment link (if unpaid)
- Status watermark (**PAID** / **OVERDUE**)

> **Note:** WeasyPrint requires system libraries on Linux. The `Dockerfile` installs `libpango`, `libcairo2`, and `libgdk-pixbuf2.0-0` automatically.

---

## Stripe Integration

### Payment Flow

1. Freelancer clicks **Send Invoice** — a Stripe Checkout Session is created
2. A unique payment URL is stored on the invoice and included in the email
3. Client opens the link and pays via Stripe's hosted checkout
4. Stripe sends a `checkout.session.completed` webhook to `/payments/webhook/`
5. Django verifies the signature and marks the invoice as **Paid**

### Local Webhook Testing

```bash
# Install the Stripe CLI, then forward events to your local server
stripe listen --forward-to localhost:8000/payments/webhook/
```

---

## Celery Tasks

Defined in `backend/apps/invoices/tasks.py`:

| Task | Trigger | Description |
|---|---|---|
| `check_overdue_invoices` | Daily at 8 AM | Marks past-due invoices as overdue |
| `send_overdue_reminder` | Triggered by above | Emails client with an overdue notice |
| `send_due_soon_reminders` | Daily at 8 AM | Emails client 3 days before due date |
| `generate_and_store_pdf` | On invoice send | Generates PDF, uploads to S3 |
| `send_invoice_email` | On invoice send | Emails PDF to client via SendGrid |

Celery Beat schedules are stored in the database and can be managed from the Django Admin panel.

---

## Testing

Tests use `pytest-django` and `factory_boy` for model factories.

```bash
# Run all tests (from the backend directory)
pytest

# With coverage report
pytest --cov=apps --cov-report=html

# Specific test file
pytest tests/test_invoices.py -v

# Inside Docker
docker-compose exec web pytest
```

Test files:
- `tests/test_invoices.py` — invoice creation, PDF generation, status transitions
- `tests/test_payments.py` — Stripe webhook handling, payment recording
- `tests/test_tasks.py` — Celery task behaviour, overdue logic

---

## Deployment

### Render (recommended)

1. Push to GitHub and connect your repo to [Render](https://render.com)
2. Create a **Web Service** with:
   - **Build command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start command:** `gunicorn config.wsgi:application`
3. Add PostgreSQL and Redis from Render's add-ons
4. Set all environment variables in the Render dashboard

### Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway variables set SECRET_KEY=... STRIPE_SECRET_KEY=...
railway up
```

### Production Docker

```bash
docker-compose -f docker-compose.prod.yml up --build -d
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
```

---

## Database Schema

<details>
<summary>Click to expand</summary>

### User
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | CharField | Unique, used for login |
| `full_name` | CharField | |
| `business_name` | CharField | Appears on invoices |
| `logo` | ImageField | Uploaded logo for PDF header |
| `currency` | CharField | Default: USD |
| `bank_details` | TextField | Shown on invoice footer |
| `tax_number` | CharField | Optional VAT/GST number |

### Client
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user` | FK → User | Owner |
| `name` | CharField | |
| `email` | EmailField | Invoice delivery |
| `company` | CharField | Optional |
| `address` | TextField | Appears on PDF |
| `phone` | CharField | Optional |

### Invoice
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user` | FK → User | |
| `client` | FK → Client | |
| `invoice_number` | CharField | Auto-generated, unique |
| `issue_date` | DateField | Auto: today |
| `due_date` | DateField | |
| `status` | CharField | `draft` / `sent` / `overdue` / `paid` / `cancelled` |
| `tax_rate` | DecimalField | Percentage |
| `notes` | TextField | Payment terms, optional |
| `pdf_file` | FileField | S3 path |
| `stripe_payment_url` | URLField | Stripe Checkout link |

### InvoiceItem
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `invoice` | FK → Invoice | |
| `description` | CharField | |
| `quantity` | DecimalField | |
| `unit_price` | DecimalField | |
| `line_total` | DecimalField | Computed: qty × price |

### TimeLog
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `invoice` | FK → Invoice | Optional |
| `description` | CharField | What was worked on |
| `work_date` | DateField | |
| `hours` | DecimalField | |
| `hourly_rate` | DecimalField | |

### Payment
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `invoice` | OneToOne → Invoice | |
| `amount_paid` | DecimalField | |
| `paid_on` | DateField | |
| `stripe_payment_id` | CharField | From Stripe webhook |
| `method` | CharField | `stripe` / `bank` / `cash` |

</details>

---

## Invoice Lifecycle

```
[Draft] ──────► [Sent] ──────► [Overdue]
                   │                │
                   ▼                ▼
                [Paid]        [Cancelled]
```

| Status | Description |
|---|---|
| **Draft** | Invoice created but not yet sent |
| **Sent** | PDF generated and emailed to the client |
| **Overdue** | Due date passed — auto-updated daily by Celery Beat |
| **Paid** | Stripe webhook received and processed |
| **Cancelled** | Manually cancelled by the freelancer |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using Django, Celery, WeasyPrint, Stripe, and React.
</p>
