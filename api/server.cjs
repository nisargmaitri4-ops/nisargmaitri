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

// Store SSE clients
global.clients = new Set();

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
      console.log(`CORS check for origin: ${origin || 'none'}`);
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        callback(null, true);
      } else {
        callback(new Error(`CORS error: Origin ${origin} not allowed`));
      }
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

// SSE endpoint for order updates
app.get('/api/order-updates', async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).send('Invalid token');
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const client = { id: Date.now(), res };
  global.clients.add(client);

  res.write('data: {"type": "connected"}\n\n');

  req.on('close', () => {
    global.clients.delete(client);
    console.log(`Client ${client.id} disconnected`);
  });
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.path === '/health' || req.path === '/api/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Service unavailable: Database not connected' });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);

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

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    isConnected = false;
  }
};

// Connect to DB on startup
connectDB();

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('MongoDB connection established');
});
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('MongoDB disconnected');
});
mongoose.connection.on('error', (err) => {
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
