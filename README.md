# Food Delivery App - Backend Take Home Test

This repository contains a take-home test for backend developers to demonstrate their skills by implementing new features for a food delivery application built with Node.js and TypeScript.

## Project Overview

This is a backend API for a food delivery application that allows:
- Customers to browse restaurants, order food, track deliveries, and make payments
- Restaurant owners to manage their profiles, menus, and orders
- Delivery personnel to update delivery status and location
- Administrators to oversee the entire system

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or using Docker)

### Installation

#### Option 1: Using Docker (Recommended)
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start MongoDB using Docker:
   ```
   docker-compose up -d
   ```
4. Create a `.env` file based on `.env.example`
5. Start the development server:
   ```
   npm run dev
   ```

#### Option 2: Local MongoDB
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Make sure MongoDB is installed and running locally
4. Create a `.env` file based on `.env.example`
5. Start the development server:
   ```
   npm run dev
   ```

## Documentation

Please review the following documentation to understand the project:

- [Project Documentation](./docs/candidate_documentation.md) - Overview of the codebase and architecture
- [Take Home Test Requirements](./docs/take_home_test_requirements.md) - General requirements for the test
- [Feature Implementation Tasks](./docs/feature_implementation_tasks.md) - Specific features to implement
- [Test Instructions and Evaluation Criteria](./docs/test_instructions_and_evaluation.md) - How to approach the test and how you'll be evaluated
- [Docker Setup](./docs/docker_setup.md) - Instructions for using Docker with this project

## Task Summary

You are required to implement one or more new features for the food delivery application. Choose from:

1. **Advanced Search and Filtering** - Enhance restaurant and menu search functionality
2. **Order Scheduling** - Allow customers to schedule orders for future delivery
3. **Loyalty Program** - Create a rewards system for frequent customers
4. **Real-time Order Notifications** - Implement WebSocket-based notifications
5. **Analytics Dashboard API** - Create endpoints for restaurant analytics
6. **Bonus: Multi-language Support** - Add support for multiple languages

## Submission

Please follow the submission guidelines in the [Test Instructions](./docs/test_instructions_and_evaluation.md) document.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter

## Good luck!

We're excited to see your implementation and learn about your approach to solving these challenges. Remember to focus on quality over quantity, and don't hesitate to document any assumptions or decisions you make along the way.
