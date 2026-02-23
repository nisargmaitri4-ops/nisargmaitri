require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Import models
const Order = require('./models/Order.cjs');
const User = require('./models/User.cjs');
const Contact = require('./models/Contact.cjs');

// Import routes
const authRoutes = require('./routes/auth.cjs');
const orderRoutes = require('./routes/orders.cjs');
const contactRoutes = require('./routes/contact.cjs');
const productRoutes = require('./routes/products.cjs');
const serviceRoutes = require('./routes/services.cjs');
const workRoutes = require('./routes/work.cjs');

// Validate environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SUPPORT_EMAIL',
  'VITE_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
}

const app = express();
app.set('trust proxy', 1);



// Environment-specific settings
const isProduction = process.env.NODE_ENV === 'production';

// Get allowed origins from env or use defaults
const getAllowedOrigins = () => {
  const origins = process.env.VITE_CORS_ORIGINS || process.env.CORS_ORIGINS;
  if (origins) {
    return origins.split(',').map((o) => o.trim());
  }
  return isProduction
    ? ['https://www.nisargmaitri.in', 'https://nisargmaitri.in', 'https://nisargmaitri.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5001'];
};

const allowedOrigins = getAllowedOrigins();

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for Vercel compatibility
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development, allow everything
      if (!isProduction) return callback(null, true);
      // Allow any vercel.app subdomain
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Block everything else
      callback(new Error(`CORS error: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['Vary'],
  })
);

// Add Vary: Origin header
app.use((req, res, next) => {
  res.set('Vary', 'Origin');
  next();
});

// SSE endpoint removed for Vercel compatibility (using polling instead)

// Request logging + ensure DB connected for serverless
app.use(async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.path === '/health' || req.path === '/api/health') return next();
  // In serverless, ensure DB is connected before handling request
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB middleware error:', err.message);
    return res.status(503).json({ error: 'Service unavailable: Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/work', workRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// MongoDB connection with promise caching for serverless
let cachedConnection = null;
let connectionPromise = null;

const connectDB = async () => {
  // Already connected — reuse
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Connection in progress — wait for it (prevents race conditions)
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start a new connection attempt
  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 5,
    retryWrites: true,
    retryReads: true,
  })
    .then((conn) => {
      cachedConnection = conn;
      console.log('✅ MongoDB connected');
      return conn;
    })
    .catch((err) => {
      // Reset so next request retries
      connectionPromise = null;
      cachedConnection = null;
      console.error('❌ MongoDB connection error:', err.message);
      throw err;
    });

  return connectionPromise;
};

// Connect to DB on startup (errors handled per-request)
connectDB().catch(() => { });

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});
mongoose.connection.on('disconnected', () => {
  cachedConnection = null;
  connectionPromise = null;
  console.warn('MongoDB disconnected');
});
mongoose.connection.on('error', (err) => {
  cachedConnection = null;
  connectionPromise = null;
  console.error('MongoDB connection error:', err.message);
});

// Catch-all route for undefined API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS error', details: err.message });
  }
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Export for Vercel serverless
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
