
# Image & Style — Salon App MVP

This is a minimal **full-stack starter** for a salon/spa management app similar in spirit to PhorestGo:
- **Backend:** FastAPI + SQLite + JWT auth
- **Mobile App:** React Native (Expo)

## What it includes (MVP)
- Auth: register/login with JWT (owner/staff)
- Clients: create/list
- Appointments: create/list for a date range
- Simple React Native app with Login and Appointments screens

---

## Quick Start

### 1) Create a GitHub repo
- On GitHub: **New repository** → (e.g., `image-and-style`).
- Locally:
```bash
git clone <your_repo_url>
cd image-and-style
```

### 2) Open in VS Code
- `code .`

### 3) Backend setup (FastAPI)
```bash
cd backend
python -m venv .venv
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

pip install -r requirements.txt

# Set env variables (development defaults exist if you skip this step):
# export SECRET_KEY="change-me"
# export ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Create DB and run
uvicorn app.main:app --reload
```

- Backend will run at `http://127.0.0.1:8000`
- Visit docs: `http://127.0.0.1:8000/docs`

### 4) Frontend setup (Expo)
```bash
cd ../frontend
npm install
# or: yarn

# Update API base URL if needed in app/config.js (default is http://127.0.0.1:8000)
npx expo start
```
- Press `i` to run iOS simulator (macOS), or scan the QR with Expo Go on your phone.

---

## Default Accounts
After starting backend, register an owner/staff user via `/auth/register` (or from the mobile app's Register button if added).
- Then log in on the app and try creating an appointment.

---

## Project Structure

```
salon-mvp/
  backend/
    app/
      main.py
      database.py
      models.py
      schemas.py
      auth.py
      deps.py
      routers/
        clients.py
        appointments.py
    requirements.txt
  frontend/
    app/
      App.js
      screens/
        LoginScreen.js
        AppointmentsScreen.js
      components/
        TextInputField.js
      config.js
    package.json
    babel.config.js
  README.md
  .gitignore
```

---

## Next Steps (suggested)
- Add services/products + POS (Stripe or Square) integration
- Staff roles/permissions and KPIs
- Image upload for before/after galleries (e.g., S3 or Cloudinary)
- Reminders & marketing (email/SMS)
- Inventory management
- Proper migrations with Alembic
- E2E tests
