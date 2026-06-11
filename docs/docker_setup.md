# Docker Setup Instructions

This project includes Docker Compose configuration to easily set up MongoDB and Mongo Express for development.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Basic knowledge of Docker concepts

## Getting Started with Docker

1. Start the MongoDB and Mongo Express containers:
   ```
   docker-compose up -d
   ```

2. The services will be available at:
   - MongoDB: localhost:27017
   - Mongo Express (web-based MongoDB admin interface): http://localhost:8081
     - Username: admin
     - Password: password

3. Update your `.env` file to use the Docker MongoDB instance:
   ```
   MONGODB_URI=mongodb://localhost:27017/food-delivery-app
   ```

4. When you're done, you can stop the containers:
   ```
   docker-compose down
   ```

## Data Persistence

MongoDB data is persisted in a Docker volume named `mongodb_data`. This means your data will be preserved even if you stop or remove the containers.

To completely reset the database (including all data), you can remove the volume:
```
docker-compose down -v
```

## Troubleshooting

If you encounter any issues with the Docker setup:

1. Check if the containers are running:
   ```
   docker-compose ps
   ```

2. View the container logs:
   ```
   docker-compose logs
   ```

3. Restart the containers:
   ```
   docker-compose restart
   ```

4. If problems persist, try rebuilding:
   ```
   docker-compose down
   docker-compose up -d
   ```
