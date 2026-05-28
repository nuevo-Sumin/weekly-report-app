# Frontend Run Guide

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Backend API

The Vite dev server proxies `/api` requests to Spring Boot on `http://localhost:8080`.

Run the backend in another terminal:

```powershell
cd C:\Users\Public\Documents\ESTsoft\CreatorTemp\metabuild-weekly-report-app
.\mvnw.cmd spring-boot:run
```

For local development, the backend creates a temporary JWT key when `JWT_SECRET` is not set.
For production or token persistence across restarts, set `JWT_SECRET` to a value of at least 32 bytes.
