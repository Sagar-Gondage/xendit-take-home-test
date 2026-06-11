# Food Delivery App — Backend Take Home Test

## Overview of Implemented Features

This submission implements all six features from the task list, fully integrated with the existing codebase architecture (controller → service → model).

### Feature 1: Advanced Search and Filtering
- **Geospatial distance search** using MongoDB `$near` with a configurable radius (default 5 km)
- **Operating hours filter** — only returns restaurants currently open based on real-time day/time
- **Average delivery time filter** (`maxDeliveryTime`)
- **Minimum order value filter** (`maxMinOrderValue`)
- **Dietary restrictions filter** — `$all` match (vegetarian, vegan, gluten-free, halal, kosher, dairy-free, nut-free)
- **Allergen-free filter** — `$nin` match (peanuts, tree nuts, milk, eggs, wheat, soy, fish, shellfish, sesame)
- **Spice level filter** with exact or max-level matching
- **Popularity-based sorting** on menu items (most ordered first)
- **Sorting options**: rating, deliveryTime, minOrderValue, distance (for restaurants); price, popularity, rating, name (for menu items)
- **Pagination** on all search results

### Feature 2: Order Scheduling
- Customers can schedule orders for a future date/time
- **Validation**: minimum 30 minutes ahead, maximum 7 days ahead
- **Restaurant hours validation**: verifies the restaurant is open at the scheduled time
- **Modify and cancel** scheduled orders (only while in `scheduled` state)
- **Automatic processing** via cron job running every minute — activates orders within 15-minute window
- **Customer notification** sent when a scheduled order is automatically confirmed

### Feature 3: Loyalty Program
- **Points system**: 1 point per $1 spent (multiplied by tier)
- **Four tiers**: Bronze (0+), Silver (500+), Gold (2000+), Platinum (5000+)
- **Tier multipliers**: Bronze ×1, Silver ×1.5, Gold ×2, Platinum ×3
- **Points awarded automatically** when an order status changes to `delivered`
- **Redeem rewards** for discount codes (fixed or percentage discounts)
- **Apply redemption codes** to orders with minimum order value validation
- **Point history** with pagination
- **12-month point expiry** — expired automatically by daily cron job at midnight

### Feature 4: Real-time Order Notifications (WebSocket)
- **Socket.IO** server initialized at startup with JWT-authenticated connections
- **Per-user rooms** (`user:<userId>`) for targeted notifications
- **Per-order rooms** (`order:<orderId>`) for order-level broadcasts
- **Automatic notifications** sent on every order status change:
  - ORDER_PLACED → ORDER_CONFIRMED → ORDER_PREPARING → OUT_FOR_DELIVERY → ORDER_DELIVERED / ORDER_CANCELLED
- **Real-time delivery location** emitted via WebSocket whenever a delivery person updates their location
- **Loyalty points earned** notification sent after delivery
- **Custom restaurant→customer messages** via `message:send` socket event
- **Notification preferences** — users can opt out of specific notification types
- **Persistent notifications** stored in DB, fetchable via REST API with unread count

### Feature 5: Analytics Dashboard API
- **Dashboard summary** (30-day window): total orders, total revenue, average order value, delivery performance, top items, peak hours, customer retention
- **Sales data** aggregated by Day / Week / Month using MongoDB aggregation pipeline
- **Popular menu items** with total ordered count and revenue
- **Peak ordering hours** (0–23 hour distribution)
- **Delivery performance**: average delivery time (minutes) and on-time delivery rate (%)
- **Customer retention**: new vs returning customers and retention rate
- **Data export** (JSON format)
- **5-minute caching** with `node-cache` to reduce DB load
- **Access control**: only the restaurant owner or admin can view a restaurant's analytics

### Bonus: Multi-language Support (i18n)
- **Flexible translation storage** in MongoDB by entity type + entity ID + language
- Supports translating restaurants, menu items, and system messages
- **Supported languages**: `en`, `es`, `fr`, `de`, `zh`, `ja`, `ar`, `id`, `pt`, `hi`
- **Batch translation retrieval** for multiple entities in a single query
- **`applyTranslation()` helper** for overlay-translating entity objects
- Translations managed via REST API (admin and restaurant owner access)

---

## Setup Instructions

### Prerequisites
- Node.js v14+
- MongoDB (local or Docker)
- npm

### Option 1: Docker (Recommended)

```bash
git clone <repo-url>
cd food-delivery-app
npm install
docker-compose up -d        # starts MongoDB on port 27017
cp .env.example .env        # configure environment variables
npm run dev
```

### Option 2: Local MongoDB

```bash
git clone <repo-url>
cd food-delivery-app
npm install
cp .env.example .env        # configure environment variables
# Ensure MongoDB is running locally on port 27017
npm run dev
```

### Environment Variables (`.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/food-delivery-app
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=1h
LOG_LEVEL=debug
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Available Scripts

```bash
npm run dev           # Start development server with hot reload (ts-node + nodemon)
npm run build         # Compile TypeScript to dist/
npm start             # Run compiled production server
npm test              # Run all tests with coverage
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint errors
```

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from `POST /api/auth/login` or `POST /api/auth/register`.

---

### Auth Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |

---

### Restaurant Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/restaurants` | No | Get all restaurants |
| GET | `/api/restaurants/:id` | No | Get restaurant by ID |
| POST | `/api/restaurants` | Restaurant | Create restaurant |
| PUT | `/api/restaurants/:id` | Restaurant | Update restaurant |
| DELETE | `/api/restaurants/:id` | Restaurant | Delete restaurant |

---

### Menu Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/menu/restaurant/:restaurantId` | No | Get menu for a restaurant |
| GET | `/api/menu/:id` | No | Get menu item by ID |
| POST | `/api/menu` | Restaurant | Create menu item |
| PUT | `/api/menu/:id` | Restaurant | Update menu item |
| DELETE | `/api/menu/:id` | Restaurant | Delete menu item |

---

### Order Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/orders` | Yes | Get orders (filtered by role) |
| GET | `/api/orders/:id` | Yes | Get order by ID |
| POST | `/api/orders` | Customer | Create order |
| PUT | `/api/orders/:id/status` | Restaurant/Delivery | Update order status |
| DELETE | `/api/orders/:id` | Customer/Restaurant | Cancel order |

---

### Delivery Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/delivery/personnel` | Admin | Get available delivery personnel |
| GET | `/api/delivery/orders` | Delivery | Get assigned delivery orders |
| POST | `/api/delivery/location` | Delivery | Update delivery location (triggers WebSocket emit) |
| GET | `/api/delivery/orders/:orderId/track` | Yes | Get location history for order |
| GET | `/api/delivery/orders/:orderId/eta` | Yes | Get estimated delivery time |

---

### Payment Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/process` | Customer | Process payment for order |
| GET | `/api/payments/:orderId/status` | Yes | Get payment status |
| POST | `/api/payments/:orderId/refund` | Admin/Restaurant | Refund payment |

---

### Feature 1 — Search Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/search/restaurants` | No | Advanced restaurant search |
| GET | `/api/search/menu` | No | Advanced menu item search |

**Restaurant Search Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `search` | string | Text search on name/description |
| `cuisine` | string/array | Filter by cuisine type(s) |
| `rating` | number | Minimum rating |
| `maxDeliveryTime` | number | Max average delivery time (minutes) |
| `maxMinOrderValue` | number | Max minimum order value |
| `isCurrentlyOpen` | boolean | Only show currently open restaurants |
| `latitude` | number | User latitude (for geospatial search) |
| `longitude` | number | User longitude (for geospatial search) |
| `maxDistance` | number | Max distance in meters (default: 5000) |
| `sortBy` | string | `rating`, `deliveryTime`, `minOrderValue`, `distance` |
| `sortOrder` | string | `asc` or `desc` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (max: 100, default: 20) |

**Menu Search Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `search` | string | Text search on name/description |
| `restaurantId` | string | Filter by restaurant |
| `category` | string | Filter by category |
| `dietaryRestrictions` | string/array | Must have ALL restrictions (e.g. `vegetarian,vegan`) |
| `allergenFree` | string/array | Must NOT contain these allergens |
| `spiceLevel` | number | Exact spice level (0–4) |
| `maxSpiceLevel` | number | Maximum spice level |
| `priceMin` | number | Minimum price |
| `priceMax` | number | Maximum price |
| `sortBy` | string | `price`, `popularity`, `rating`, `name` |
| `sortOrder` | string | `asc` or `desc` |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

### Feature 2 — Scheduling Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/scheduling/orders` | Customer | Get my scheduled orders |
| POST | `/api/scheduling/orders/:orderId/schedule` | Customer | Schedule an existing order |
| PUT | `/api/scheduling/orders/:orderId/reschedule` | Customer | Modify scheduled time |
| DELETE | `/api/scheduling/orders/:orderId/cancel` | Customer | Cancel a scheduled order |

**Schedule Order Body:**
```json
{ "scheduledFor": "2024-06-15T19:30:00.000Z" }
```

---

### Feature 3 — Loyalty Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/loyalty/tiers` | No | Get tier configuration |
| GET | `/api/loyalty/account` | Customer | Get loyalty account and points |
| GET | `/api/loyalty/history` | Customer | Get points transaction history |
| GET | `/api/loyalty/rewards` | Customer | Get available rewards for your tier |
| POST | `/api/loyalty/redeem` | Customer | Redeem points for a reward |
| POST | `/api/loyalty/apply` | Customer | Apply a redemption code to an order |

**Redeem Body:**
```json
{ "rewardId": "<reward_id>" }
```

**Apply Code Body:**
```json
{ "code": "RWD-ABCD1234", "orderId": "<order_id>" }
```

---

### Feature 4 — Notification Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Yes | Get my notifications (paginated) |
| PUT | `/api/notifications/read` | Yes | Mark notification(s) as read |
| GET | `/api/notifications/preferences` | Yes | Get notification preferences |
| PUT | `/api/notifications/preferences` | Yes | Update notification preferences |

**WebSocket Connection:**
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: '<jwt_token>' }
});

// Join an order room for order-specific updates
socket.emit('join:order', '<order_id>');

// Listen for notifications
socket.on('notification', (data) => console.log(data));
socket.on('order:update', (data) => console.log(data));
socket.on('delivery:location', (data) => console.log(data));
```

---

### Feature 5 — Analytics Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/dashboard` | Restaurant/Admin | Dashboard summary (30-day) |
| GET | `/api/analytics/sales` | Restaurant/Admin | Sales data by time frame |
| GET | `/api/analytics/popular-items` | Restaurant/Admin | Top menu items |
| GET | `/api/analytics/peak-hours` | Restaurant/Admin | Peak ordering hours |
| GET | `/api/analytics/delivery-performance` | Restaurant/Admin | Delivery metrics |
| GET | `/api/analytics/customer-retention` | Restaurant/Admin | Customer retention |
| GET | `/api/analytics/export` | Restaurant/Admin | Export all analytics data |

All analytics endpoints require `?restaurantId=<id>`.

**Sales Endpoint Additional Params:**
```
?restaurantId=<id>&timeFrame=day|week|month&startDate=2024-01-01&endDate=2024-06-01
```

---

### Bonus — i18n Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/i18n/languages` | No | Get supported languages |
| GET | `/api/i18n/:entityType/:entityId` | No | Get translation for entity |
| GET | `/api/i18n/:entityType/:entityId/all` | No | Get all translations for entity |
| POST | `/api/i18n` | Admin/Restaurant | Create or update a translation |
| DELETE | `/api/i18n/:entityType/:entityId/:language` | Admin | Delete a translation |

**Create Translation Body:**
```json
{
  "entityType": "restaurant",
  "entityId": "<restaurant_id>",
  "language": "es",
  "fields": {
    "name": "Restaurante Test",
    "description": "Un restaurante de prueba"
  }
}
```

**Supported Languages:** `en`, `es`, `fr`, `de`, `zh`, `ja`, `ar`, `id`, `pt`, `hi`

---

## Design Decisions

### 1. Service-layer Integration for Cross-feature Concerns
Notifications and loyalty point awards are triggered inside the service layer (`order.service.ts`) rather than in controllers or middleware. This keeps the controller thin and ensures the logic is testable in isolation. Notification/loyalty failures are wrapped in try/catch so they never interrupt the primary order flow.

### 2. Singleton Pattern for NotificationService
`notificationService` is exported as a singleton so the Socket.IO server instance is shared across all services (`order.service`, `delivery.service`, `scheduling.service`). This ensures all WebSocket events go through the same server.

### 3. In-memory Delivery Location Store
The delivery location history is stored in-memory for simplicity, as described in the original code comments. In production this should be persisted to Redis or MongoDB with a TTL index.

### 4. Analytics Caching
A 5-minute TTL cache (`node-cache`) is used for all analytics queries to avoid repeated expensive MongoDB aggregations. Cache keys encode the query parameters to ensure different queries don't collide.

### 5. Geospatial Indexing
The `Restaurant` model has a `2dsphere` index on `location`. The search service uses `$near` with `$maxDistance` in meters for distance-based filtering. When `latitude`/`longitude` are provided, MongoDB automatically returns results sorted by proximity.

### 6. Point Expiry
Rather than TTL indexes (which would delete entire documents), points expire at the transaction level. A daily cron job (`0 0 * * *`) scans for `earned` transactions past their `expiresAt` date, converts them to `expired`, and deducts the points from the balance.

---

## Challenges and Solutions

### Challenge 1: Cross-service Circular Dependencies
`order.service.ts` needs `notificationService` and `loyaltyService`. Both of those import models but not `order.service`, so there is no circular dependency. The singleton pattern for `notificationService` allowed safe import across services.

### Challenge 2: WebSocket Authentication
Socket.IO connections are authenticated via JWT passed in `socket.handshake.auth.token`. The middleware runs before the `connection` event so unauthenticated sockets are rejected immediately.

### Challenge 3: Scheduling Time Validation
Validating restaurant hours at a future scheduled time required mapping JS `Date.getDay()` (0 = Sunday) to the string keys used in `operatingHours` (e.g. `"sunday"`). This is handled in `isRestaurantOpenAt()` using a day-name array.

---

## Future Improvements

1. **Push Notifications** (Firebase FCM) for mobile clients in addition to WebSocket
2. **Redis** for delivery location store with geospatial queries (`GEOADD`, `GEODIST`)
3. **Rate Limiting** middleware using `express-rate-limit` (env vars already defined)
4. **Input Validation** using `express-validator` at the route layer (package already installed)
5. **Swagger / OpenAPI** spec generation for auto-generated interactive API docs
6. **Refresh Tokens** for better JWT session management
7. **CSV export** for analytics data (currently JSON only)
8. **Order batching** for delivery personnel to handle multiple orders per trip
