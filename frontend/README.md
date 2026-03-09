# Bus Booking Frontend

Professional React + TypeScript frontend for the Bus Booking Platform.

## Features

- ✅ Modern UI/UX with Tailwind CSS
- ✅ Responsive design (mobile-first)
- ✅ Authentication & Authorization
- ✅ Role-based routing (Passenger, Provider, Admin)
- ✅ API integration with secure token management
- ✅ React Query for data fetching
- ✅ Toast notifications
- ✅ Type-safe with TypeScript

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend will run on `http://localhost:3001`

## Structure

```
src/
├── components/     # Reusable components
├── pages/         # Page components
├── lib/           # API client and utilities
├── store/         # State management (Zustand)
├── types/         # TypeScript types
└── App.tsx        # Main app component
```

## Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:3000/api
```
