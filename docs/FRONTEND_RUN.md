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
$env:JWT_SECRET="12345678901234567890123456789012"
.\mvnw.cmd spring-boot:run
```

`JWT_SECRET` must be at least 32 bytes because login issues JWT access tokens.
