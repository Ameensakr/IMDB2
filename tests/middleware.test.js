const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

const testEmail = `middlewaretest_${Date.now()}@example.com`;
let testUser;

beforeAll(async () => {
  await mongoose.connect(uri);
  
  await User.deleteOne({ email: testEmail });
  
  testUser = await User.create({
    firstName: 'Middleware',
    lastName: 'Test',
    email: testEmail,
    mobile: '1234567890',
    gender: 'male',
    password: 'password123'
  });
});

afterAll(async () => {
  if (testUser && testUser._id) {
    await User.findByIdAndDelete(testUser._id);
  } else {
    await User.deleteOne({ email: testEmail });
  }
  
  await mongoose.connection.close();
});

describe('Authentication Middleware', () => {
  it('requireAuth should redirect unauthenticated users to login page', async () => {
    const res = await request(app).get('/welcome');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
  
  it('requireAuth should allow authenticated users to access protected routes', async () => {
    const agent = request.agent(app);
    
    await agent.post('/login').send({
      email: testEmail,
      password: 'password123'
    });
    
    const res = await agent.get('/welcome');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Welcome');
  });
  
  it('checkLoggedIn should redirect authenticated users to welcome page', async () => {
    const agent = request.agent(app);
    
    await agent.post('/login').send({
      email: testEmail,
      password: 'password123'
    });
    
    const res = await agent.get('/');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('checkLoggedIn should allow unauthenticated users to access login page', async () => {
    const res = await request(app).get('/');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Login');
  });
}); 