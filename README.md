# Sri Earth Movers

Internal billing and business management app for a JCB and lorry service business.
Mobile-first. All business data is stored in one Excel workbook.

## Features

- Home dashboard: income, payments received, pending, expenses, profit
- Bills: multiple work items (JCB Work, Lorry Service, Other Work), automatic totals, bill PDF
- Payments: partial and full payments, automatic pending amount and status
- Expenses: diesel, repairs, maintenance, spare parts, other
- Daily Work log and JCB Work summary (both machines combined)
- Drivers, Bata, and Salary (Pending or Paid)
- Reports: Today, This Week, This Month, This Year, Custom date range
- Settings: business, bank, and bill defaults

## Technology

| Layer | Tools |
|---|---|
| Frontend | React, Vite, React Router, lucide-react |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Storage | Excel workbook (openpyxl), timestamped backups |
| Auth | JWT, bcrypt |
| PDF | reportlab |
| Tests | pytest, FastAPI TestClient |

## Folder Structure

```text
sri-earth-movers/
├── frontend/              React app (Vite)
│   ├── public/brand/      Logo
│   └── src/
│       ├── pages/         Screens
│       ├── components/    Reusable UI pieces
│       ├── layouts/       App shell with bottom navigation
│       ├── hooks/         Auth context
│       ├── services/      API client (all backend calls)
│       ├── utils/         Formatting, bill form helpers
│       └── styles/        CSS (design tokens in global.css)
├── backend/
│   ├── app/
│   │   ├── api/           Routes (validate, then call services)
│   │   ├── core/          Config, security
│   │   ├── schemas/       Request and response shapes
│   │   ├── services/      Business rules. excel_service.py is the only Excel code
│   │   ├── utils/         Money and date calculations
│   │   └── assets/        Logo and PDF fonts
│   ├── tests/             Automated tests
│   ├── requirements.txt
│   └── .env.example
├── data/                  Workbook and backups (created automatically, not in Git)
├── generated_bills/       Bill PDFs (created automatically)
└── README.md
```

## Installation

**Requirements:** Python 3.11 or newer, Node.js 18 or newer.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment variables

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `backend/.env`:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs login tokens. Use 32 or more random characters. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session length (480 = 8 hours) |
| `CORS_ORIGINS` | Frontend address. Default `http://localhost:5173` |
| `EXCEL_FILE_PATH` | Workbook location (default `../data/business_data.xlsx`) |
| `BACKUP_DIR`, `BACKUP_KEEP` | Backup folder and number of backups kept |
| `ADMIN_USERNAME` | Login username |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the password (never the plain password) |

Generate the values (run from `backend/` with the venv active):

```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"

# ADMIN_PASSWORD_HASH (keep the single quotes in .env)
python -c "import bcrypt; print(bcrypt.hashpw(b'YourStrongPassword', bcrypt.gensalt()).decode())"
```

### 3. PDF fonts (for the ₹ sign)

Copy `arial.ttf` and `arialbd.ttf` into `backend/app/assets/fonts/`.
On Windows they are in `C:\Windows\Fonts\`. Without them, bills show "Rs." instead of ₹.

### 4. Frontend

```bash
cd frontend
npm install
```

## Excel Setup

The workbook is created automatically on first start at `data/business_data.xlsx`.
It has these sheets: Bills, Bill_Items, Payments, Expenses, Daily_Work, Drivers,
Driver_Payments, Settings.

Rules:
- **Close the workbook in Excel while the server runs.** If it is open, saves fail with
  "The data file is open or locked" and nothing is lost.
- Do not edit the sheets by hand while the app is running.
- A backup is made before every change in `data/backups/`.
- Run a single backend process. Multiple processes would overwrite each other.

## Running the App

Terminal 1, backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

**On a phone:** connect to the same Wi-Fi and open `http://<your-PC-IP>:5173`.
The Vite dev server forwards `/api` to the backend, so no extra setup is needed.

**Logo:** copy `REM.jpeg` to both `backend/app/assets/logo.jpeg` and
`frontend/public/brand/logo.jpeg`. The copies are already included in this package.

## API Overview

Interactive docs: `http://127.0.0.1:8000/docs`. All routes except login require
`Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard` |
| Bills | `GET/POST /api/bills`, `GET/PUT/DELETE /api/bills/{id}`, `GET /api/bills/{id}/pdf` |
| Payments | `GET/POST /api/payments`, `GET /api/payments/{id}`, `GET /api/payments/summary` |
| Expenses | `GET/POST /api/expenses`, `GET/PUT/DELETE /api/expenses/{id}` |
| Daily Work | `GET/POST /api/daily-work`, `GET/PUT/DELETE /api/daily-work/{id}` |
| JCB Work | `GET /api/jcb-work` |
| Drivers | `GET/POST /api/drivers`, `PUT /api/drivers/{id}` |
| Driver Payments | `GET/POST /api/driver-payments`, `PATCH /api/driver-payments/{id}`, `GET /api/driver-payments/summary` |
| Reports | `GET /api/reports?preset=today\|week\|month\|year\|custom&start=&end=` |
| Settings | `GET/PUT /api/settings` |

## Business Rules

- **Bill total** = sum of each item: quantity × rate + bata. Calculated on the server.
- **Pending** = bill total − payments received. Status: Pending, Partly Paid, or Paid.
- **Overpayment** is blocked. A payment cannot exceed the pending amount.
- **Income** in reports is billed work. **Payments Received** is cash in the period, shown separately.
- **Expenses** = expense records + paid driver Bata and Salary. Each rupee is counted once.
- **Profit** = Income − Expenses.
- Bills with payments cannot be deleted.

## Authentication

- One admin account, set in `backend/.env`.
- The password is stored only as a bcrypt hash. It never goes into Excel.
- Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES`. The app then asks for login again.

## PDF Generation

`GET /api/bills/{id}/pdf` builds the bill from stored data and Settings.
Copies are saved in `generated_bills/`. The layout follows the RAMESH EARTH MOVERS
cash bill: header, customer details, work table, total, bank details, signature area,
and footer.

## Testing

```bash
cd backend
pytest -q
```

The tests use a temporary workbook, so business data is not touched. They cover login
protection, the full bill → partial payment → full payment → expense → report flow,
overpayment blocking, and custom date validation.

Manual checks: see the test checklist at the end of each part. Check every screen at
390px width.

## Troubleshooting

| Problem | Fix |
|---|---|
| "The data file is open or locked" | Close `business_data.xlsx` in Excel and try again. |
| "Can't reach the server" | Start the backend (`uvicorn app.main:app --reload`). |
| Logged out after restarting the backend | `SECRET_KEY` changed. Log in again. |
| Bill PDF shows "Rs." | Add `arial.ttf` and `arialbd.ttf` to `backend/app/assets/fonts/`. |
| Bill PDF has no logo | Copy the logo to `backend/app/assets/logo.jpeg`. |
| Port 8000 or 5173 is in use | Stop the other program, or change the port. |
| Settings field shows the default again | Blank fields use the default value by design. |
| Startup error about `SECRET_KEY` or the hash | Check `backend/.env`. The hash must be in single quotes. |

## Deployment

Built for one office PC or small server running one backend process.

1. Build the frontend: `cd frontend && npm run build`.
2. Serve `frontend/dist` from the same host as the API (for example, with a reverse proxy
   that forwards `/api` to Uvicorn), so the phone uses one HTTPS address.
3. Run the backend as a service with a single worker:
   `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. Keep `data/` in a synced folder (OneDrive or Google Drive) for an off-site copy.
   Do not open the workbook in Excel while the server runs.
5. Never commit `.env`, `data/`, or `generated_bills/`.

## Known Limits (version 1.0)

- Logo is replaced by copying a file, not from the Settings page.
- Payments cannot be deleted yet. Wrong payments must be corrected in the workbook
  while the app is stopped.
- Single admin account only.
- Desktop layout uses the same bottom navigation as mobile.
