
# Frontend (Expo)

## Setup
```bash
npm install
npx expo start
```

Set your backend URL via env var:
```bash
export EXPO_PUBLIC_API_BASE_URL="http://192.168.1.10:8000"
npx expo start -c
```
Or edit `app/config.js` directly.

## Notes
- This is a minimal example with Login and a simple Appointments screen.
- Register a user first via the backend docs (`/docs` → POST /auth/register), then log in.
