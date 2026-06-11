# Food Delivery App - Documentation for Candidates

## Project Overview

This project is a backend API for a food delivery application built with Node.js, TypeScript, Express, and MongoDB. The application allows customers to browse restaurants, order food, track deliveries, and make payments. Restaurant owners can manage their restaurant profiles, menus, and orders. Delivery personnel can update delivery status and location.

## System Architecture

The application follows a layered architecture pattern:

1. **API Layer**: Express routes and controllers
2. **Service Layer**: Business logic implementation
3. **Data Access Layer**: MongoDB operations using Mongoose
4. **Domain Layer**: Entity definitions and types

## Core Entities

- **Users**: Customers, restaurant owners, delivery personnel, and administrators
- **Restaurants**: Restaurant profiles with details, location, and operating hours
- **Menu Items**: Food items with descriptions, prices, and customization options
- **Orders**: Customer orders with items, status, and delivery information
- **Payments**: Payment processing and status tracking

## Authentication and Authorization

The application uses JWT (JSON Web Tokens) for authentication:
- Access tokens are issued upon login
- Protected routes require valid tokens
- Role-based access control restricts actions based on user roles

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Restaurants
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id` - Get restaurant by ID
- `POST /api/restaurants` - Create restaurant (restaurant owners only)
- `PUT /api/restaurants/:id` - Update restaurant (restaurant owners only)
- `DELETE /api/restaurants/:id` - Delete restaurant (restaurant owners only)
- `GET /api/restaurants/nearby` - Get nearby restaurants

### Menu Items
- `GET /api/menu/restaurant/:restaurantId` - Get restaurant menu
- `GET /api/menu/:id` - Get menu item by ID
- `POST /api/menu` - Create menu item (restaurant owners only)
- `PUT /api/menu/:id` - Update menu item (restaurant owners only)
- `DELETE /api/menu/:id` - Delete menu item (restaurant owners only)
- `GET /api/menu/search` - Search menu items

### Orders
- `GET /api/orders` - Get all orders (filtered by user role)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order (customers only)
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Delivery
- `GET /api/delivery/personnel` - Get available delivery personnel (admin only)
- `GET /api/delivery/orders` - Get orders for delivery (delivery personnel only)
- `POST /api/delivery/location` - Update delivery location (delivery personnel only)
- `GET /api/delivery/orders/:orderId/track` - Get delivery location updates
- `GET /api/delivery/orders/:orderId/eta` - Get estimated delivery time

### Payments
- `POST /api/payments/process` - Process payment (customers only)
- `GET /api/payments/:orderId/status` - Get payment status
- `POST /api/payments/:orderId/refund` - Refund payment (admin and restaurant owners only)

## Project Structure

```
food-delivery-app/
├── src/
│   ├── config/                 # Application configuration
│   │   ├── database.ts         # Database connection setup
│   │   ├── environment.ts      # Environment variables
│   │   └── server.ts           # Server configuration
│   │
│   ├── controllers/            # API route handlers
│   │   ├── auth.controller.ts
│   │   ├── restaurant.controller.ts
│   │   ├── menu.controller.ts
│   │   ├── order.controller.ts
│   │   ├── delivery.controller.ts
│   │   └── payment.controller.ts
│   │
│   ├── middlewares/            # Express middlewares
│   │   ├── auth.middleware.ts  # JWT authentication
│   │   └── error.middleware.ts # Error handling
│   │
│   ├── models/                 # Mongoose models
│   │   ├── user.model.ts
│   │   ├── restaurant.model.ts
│   │   ├── menu.model.ts
│   │   └── order.model.ts
│   │
│   ├── routes/                 # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── restaurant.routes.ts
│   │   ├── menu.routes.ts
│   │   ├── order.routes.ts
│   │   ├── delivery.routes.ts
│   │   └── payment.routes.ts
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── restaurant.service.ts
│   │   ├── menu.service.ts
│   │   ├── order.service.ts
│   │   ├── delivery.service.ts
│   │   └── payment.service.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── user.types.ts
│   │   ├── restaurant.types.ts
│   │   ├── menu.types.ts
│   │   └── order.types.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── errors.ts           # Custom error classes
│   │   └── jwt.ts              # JWT token utilities
│   │
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Application entry point
│
├── tests/                      # Test files
│   ├── unit/
│   └── integration/
│
├── .env.example                # Example environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the development server:
   ```
   npm run dev
   ```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter

## Testing

The project uses Jest for testing. Tests are organized into:
- Unit tests: Testing individual functions and components
- Integration tests: Testing API endpoints and database interactions

To run tests:
```
npm test
```

## Error Handling

The application uses custom error classes for different types of errors:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `InternalServerError` (500)

All errors are handled by the error middleware, which returns appropriate HTTP responses.

## Database Schema

The application uses MongoDB with Mongoose as the ODM. The main collections are:
- Users
- Restaurants
- MenuItems
- Orders

Refer to the models in the `src/models` directory for detailed schema definitions.

## Authentication Flow

1. User registers with email and password
2. Password is hashed using bcrypt
3. User logs in with email and password
4. Server validates credentials and issues JWT token
5. Client includes token in Authorization header for subsequent requests
6. Protected routes verify token and extract user information

## Best Practices

When implementing new features, follow these best practices:
1. Maintain the existing architecture and code style
2. Add proper TypeScript types for all new code
3. Write comprehensive tests for new functionality
4. Document your code with comments
5. Handle errors appropriately using the custom error classes
6. Follow RESTful API design principles
7. Implement proper validation for all user inputs
8. Consider security implications of your changes
