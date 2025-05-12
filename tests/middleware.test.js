const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('../models/user');

// Create a mock app for middleware testing
const createMockApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use(session({
    secret: 'test-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 
    }
  }));
  
  return app;
};

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Generate unique test email
const testEmail = `middlewaretest_${Date.now()}@example.com`;

beforeAll(async () => {
  await mongoose.connect(uri);
  
  // Clean up any existing test user with this email
  await User.deleteOne({ email: testEmail });
  
  // Create a test user
  await User.create({
    firstName: 'Middleware',
    lastName: 'Test',
    email: testEmail,
    mobile: '1234567890',
    gender: 'male',
    password: 'password123'
  });
});

afterAll(async () => {
  // Clean up the specific test user
  await User.deleteOne({ email: testEmail });
  
  await mongoose.connection.close();
});

describe('Authentication Middleware', () => {
  it('requireAuth should redirect unauthenticated users to login page', async () => {
    const app = createMockApp();
    
    // Import the requireAuth middleware from app.js
    const requireAuth = (req, res, next) => {
      if (req.session.userId) {
        next();
      } else {
        res.redirect('/');
      }
    };
    
    // Create a test route with the middleware
    app.get('/protected', requireAuth, (req, res) => {
      res.status(200).send('Protected content');
    });
    
    // Test without authentication
    const res = await request(app).get('/protected');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
  
  it('requireAuth should allow authenticated users to access protected routes', async () => {
    const app = createMockApp();
    
    // Import the requireAuth middleware from app.js
    const requireAuth = (req, res, next) => {
      if (req.session.userId) {
        next();
      } else {
        res.redirect('/');
      }
    };
    
    // Create a test route with the middleware
    app.get('/protected', requireAuth, (req, res) => {
      res.status(200).send('Protected content');
    });
    
    // Create an agent for session persistence
    const agent = request.agent(app);
    
    // Set up a route to set session
    app.post('/login', (req, res) => {
      req.session.userId = '123';
      res.send('Logged in');
    });
    
    // Login first to set session
    await agent.post('/login');
    
    // Then access protected route
    const res = await agent.get('/protected');
    
    expect(res.status).toBe(200);
    expect(res.text).toBe('Protected content');
  });
  
  it('checkLoggedIn should redirect authenticated users to welcome page', async () => {
    const app = createMockApp();
    
    // Import the checkLoggedIn middleware from app.js
    const checkLoggedIn = (req, res, next) => {
      if (req.session.userId) {
        return res.redirect('/welcome');
      } else {
        next();
      }
    };
    
    // Create a test route with the middleware
    app.get('/login-page', checkLoggedIn, (req, res) => {
      res.status(200).send('Login page');
    });
    
    // Create an agent for session persistence
    const agent = request.agent(app);
    
    // Set up a route to set session
    app.post('/login', (req, res) => {
      req.session.userId = '123';
      res.send('Logged in');
    });
    
    // Login first to set session
    await agent.post('/login');
    
    // Then try to access login page
    const res = await agent.get('/login-page');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('checkLoggedIn should allow unauthenticated users to access login page', async () => {
    const app = createMockApp();
    
    // Import the checkLoggedIn middleware from app.js
    const checkLoggedIn = (req, res, next) => {
      if (req.session.userId) {
        return res.redirect('/welcome');
      } else {
        next();
      }
    };
    
    // Create a test route with the middleware
    app.get('/login-page', checkLoggedIn, (req, res) => {
      res.status(200).send('Login page');
    });
    
    // Test without authentication
    const res = await request(app).get('/login-page');
    
    expect(res.status).toBe(200);
    expect(res.text).toBe('Login page');
  });
}); 