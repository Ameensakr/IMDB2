const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Test user for authentication
let testUser;
let agent;

beforeAll(async () => {
  await mongoose.connect(uri);
  
  testUser = await User.create({
    firstName: 'Static',
    lastName: 'Routes',
    email: 'staticroutes@example.com',
    mobile: '1234567890',
    gender: 'male',
    password: 'password123'
  });
  
  agent = request.agent(app);
  await agent.post('/login').send({
    email: 'staticroutes@example.com',
    password: 'password123'
  });
});

afterAll(async () => {

  await User.findByIdAndDelete(testUser._id);
  
  await mongoose.connection.close();
});

describe('Static Routes', () => {
  it('should serve the login page at root route', async () => {

    const res = await request(app).get('/');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('login'); // Assuming login page contains "login" text
  });
  
  it('should serve the signup page', async () => {

    const res = await request(app).get('/signup');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('signup'); // Assuming signup page contains "signup" text
  });
  
  it('should redirect authenticated users from root route to welcome page', async () => {

    const res = await agent.get('/');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('should redirect authenticated users from signup route to welcome page', async () => {

    const res = await agent.get('/signup');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('should serve static assets from the public directory', async () => {
    const res = await request(app).get('/style.css');
    
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/css/);
  });
  
  it('should handle logout route', async () => {
    const res = await agent.get('/logout');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    
    const protectedRes = await agent.get('/welcome');
    
    expect(protectedRes.status).toBe(302);
    expect(protectedRes.headers.location).toBe('/');
  });
}); 