# API Documentation

Base URL: `http://localhost:3000/api`

All protected routes require JWT token in Authorization header: `Bearer <token>`

---

## 🔐 Authentication

### Register
```
POST /auth/register
Body: {
  name: string
  email?: string
  phone: string
  password: string
  role?: "PASSENGER" | "PROVIDER" | "ADMIN"
}
```

### Login
```
POST /auth/login
Body: {
  emailOrPhone: string
  password: string
}
Response: {
  user: { id, name, email, phone, role }
  accessToken: string
  refreshToken: string
}
```

### Refresh Token
```
POST /auth/refresh
Body: { refreshToken: string }
```

### Get Profile
```
GET /auth/profile
Headers: Authorization: Bearer <token>
```

---

## 🔍 Routes (Public)

### Search Routes
```
GET /routes/search?fromCity=Surat&toCity=Ahmedabad&date=2024-01-20&seats=2&sortBy=price
```

### Get Route Details
```
GET /routes/:id
```

---

## 👤 Passenger Endpoints

### Create Booking
```
POST /bookings
Headers: Authorization: Bearer <token>
Body: {
  routeId: string
  seats: number
  seatNumbers?: string[]
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  pickupLocation?: string
  dropLocation?: string
  paymentMethod?: "online" | "pay_later"
}
```

### Get My Bookings
```
GET /bookings/my-bookings
Headers: Authorization: Bearer <token>
```

### Get Booking Details
```
GET /bookings/:id
Headers: Authorization: Bearer <token>
```

### Confirm Booking
```
POST /bookings/:id/confirm
Headers: Authorization: Bearer <token>
```

### Cancel Booking
```
POST /bookings/:id/cancel
Headers: Authorization: Bearer <token>
Body: { reason?: string }
```

---

## 🚌 Provider Endpoints

### Register Provider Profile
```
POST /providers/register
Headers: Authorization: Bearer <token>
Body: {
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  idProof?: string
  rcDocuments?: string
  permit?: string
}
```

### Get Provider Profile
```
GET /providers/profile
Headers: Authorization: Bearer <token>
```

### Update Provider Profile
```
PUT /providers/profile
Headers: Authorization: Bearer <token>
Body: { ...update fields }
```

### Add Vehicle
```
POST /providers/vehicles
Headers: Authorization: Bearer <token>
Body: {
  type: "BUS" | "TEMPO" | "TRAVELLER"
  name: string
  registrationNumber: string
  totalSeats: number
  amenities?: string[]
  isActive?: boolean
}
```

### Get My Vehicles
```
GET /providers/vehicles
Headers: Authorization: Bearer <token>
```

### Update Vehicle
```
PUT /providers/vehicles/:id
Headers: Authorization: Bearer <token>
Body: { ...update fields }
```

### Delete Vehicle
```
DELETE /providers/vehicles/:id
Headers: Authorization: Bearer <token>
```

### Create Route
```
POST /routes
Headers: Authorization: Bearer <token>
Body: {
  vehicleId: string
  fromCity: string
  toCity: string
  intermediateStops?: string[]
  date: string (ISO date)
  departureTime: string
  arrivalTime?: string
  price: number
}
```

### Get My Routes
```
GET /routes/provider/my-routes
Headers: Authorization: Bearer <token>
```

### Update Route
```
PUT /routes/:id
Headers: Authorization: Bearer <token>
Body: { ...update fields }
```

### Delete Route
```
DELETE /routes/:id
Headers: Authorization: Bearer <token>
```

### Get Provider Bookings
```
GET /bookings/provider/my-bookings
Headers: Authorization: Bearer <token>
```

### Update Booking Status
```
PUT /bookings/:id/status
Headers: Authorization: Bearer <token>
Body: {
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
}
```

---

## 🛠 Admin Endpoints

### Dashboard Stats
```
GET /admin/dashboard
Headers: Authorization: Bearer <token>
Role: ADMIN
```

### Get All Providers
```
GET /admin/providers
Headers: Authorization: Bearer <token>
Role: ADMIN
```

### Get All Bookings
```
GET /admin/bookings
Headers: Authorization: Bearer <token>
Role: ADMIN
```

### Get Pending Providers
```
GET /providers/pending
Headers: Authorization: Bearer <token>
Role: ADMIN
```

### Verify Provider
```
POST /providers/:id/verify
Headers: Authorization: Bearer <token>
Role: ADMIN
Body: { status: "VERIFIED" | "REJECTED" | "SUSPENDED" }
```

---

## 📊 Response Formats

### Success Response
```json
{
  "id": "uuid",
  "data": { ... }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

---

## 🔒 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
