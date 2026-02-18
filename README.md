# Nisargmaitri - E-commerce Platform

A full-stack e-commerce platform for sustainable and eco-friendly products.

## 🌿 Project Structure (Unified for Vercel Deployment)

```
nisargmaitri-frontend/
├── api/                       # Backend (Serverless Functions)
│   ├── index.js              # Vercel serverless entry point
│   ├── server.js             # Express server
│   ├── createAdmin.js        # Admin user creation script
│   ├── models/               # Mongoose models
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   └── utils/                # Utility functions
│
├── src/                       # Frontend Source
│   ├── App.jsx               # Main App component
│   └── services/             # API services
│
├── components/               # React components
├── public/                   # Static assets
├── .env                      # Single environment file
└── vercel.json               # Vercel configuration
```

## 🚀 Getting Started

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

3. **Configure `.env` with your values**

4. **Create admin user:**
   ```bash
   cd api && node createAdmin.js
   ```

### Running Locally

```bash
# Run both frontend and backend
npm run dev:all

# Or separately:
npm run dev:server  # Backend on :5001
npm run dev         # Frontend on :5173
```

## 🚀 Deployment on Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set Environment Variables in Vercel Dashboard
4. Deploy!

**Website:** [www.nisargmaitri.in](https://www.nisargmaitri.in)
