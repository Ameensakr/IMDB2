const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('../models/user');

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

const testEmail = `middlewaretest_${Date.now()}@example.com`;

beforeAll(async () => {
  await mongoose.connect(uri);
  
  await User.deleteOne({ email: testEmail });
  
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
  await User.deleteOne({ email: testEmail });
  
  await mongoose.connection.close();
});

describe('Authentication Middleware', () => {
  it('requireAuth should redirect unauthenticated users to login page', async () => {
    const app = createMockApp();
    
    const requireAuth = (req, res, next) => {
      if (req.session.userId) {
        next();
      } else {
        res.redirect('/');
      }
    };
    
    app.get('/protected', requireAuth, (req, res) => {
      res.status(200).send('Protected content');
    });
    
    const res = await request(app).get('/protected');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
  
  it('requireAuth should allow authenticated users to access protected routes', async () => {
    const app = createMockApp();
    
    const requireAuth = (req, res, next) => {
      if (req.session.userId) {
        next();
      } else {
        res.redirect('/');
      }
    };
    
    app.get('/protected', requireAuth, (req, res) => {
      res.status(200).send('Protected content');
    });
    
    const agent = request.agent(app);
    
    app.post('/login', (req, res) => {
      req.session.userId = '123';
      res.send('Logged in');
    });
    
    await agent.post('/login');
    
    const res = await agent.get('/protected');
    
    expect(res.status).toBe(200);
    expect(res.text).toBe('Protected content');
  });
  
  it('checkLoggedIn should redirect authenticated users to welcome page', async () => {
    const app = createMockApp();
    
    const checkLoggedIn = (req, res, next) => {
      if (req.session.userId) {
        return res.redirect('/welcome');
      } else {
        next();
      }
    };
    
    app.get('/login-page', checkLoggedIn, (req, res) => {
      res.status(200).send('Login page');
    });
    
    const agent = request.agent(app);
    
    app.post('/login', (req, res) => {
      req.session.userId = '123';
      res.send('Logged in');
    });
    
    await agent.post('/login');
    
    const res = await agent.get('/login-page');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('checkLoggedIn should allow unauthenticated users to access login page', async () => {
    const app = createMockApp();
    
    const checkLoggedIn = (req, res, next) => {
      if (req.session.userId) {
        return res.redirect('/welcome');
      } else {
        next();
      }
    };
    
    app.get('/login-page', checkLoggedIn, (req, res) => {
      res.status(200).send('Login page');
    });
    
    const res = await request(app).get('/login-page');
    
    expect(res.status).toBe(200);
    expect(res.text).toBe('Login page');
  });
}); 