// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/database';
import { environment } from './config/environment';
import { errorHandler } from './middlewares/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import deliveryRoutes from './routes/delivery.routes';
import paymentRoutes from './routes/payment.routes';
import searchRoutes from './routes/search.routes';
import schedulingRoutes from './routes/scheduling.routes';
import loyaltyRoutes from './routes/loyalty.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import i18nRoutes from './routes/i18n.routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Connect to database
    connectDB();

    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Logging middleware
    this.app.use(morgan('dev'));

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private configureRoutes(): void {
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/restaurants', restaurantRoutes);
    this.app.use('/api/menu', menuRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/delivery', deliveryRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/scheduling', schedulingRoutes);
    this.app.use('/api/loyalty', loyaltyRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/i18n', i18nRoutes);

    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Server is running',
        environment: environment.nodeEnv
      });
    });
  }

  private configureErrorHandling(): void {
    // Error handling middleware
    this.app.use(errorHandler);
  }
}

export default new App().app;
