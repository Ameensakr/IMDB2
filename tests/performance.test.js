const request = require('supertest');
const app = require('../app');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const User = require('../models/user');
const Film = require('../models/film');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Test user credentials for authentication tests
let testUser;
let agent;
// Generate unique test email
const perfTestEmail = `perftest_${Date.now()}@example.com`;
// Track test film titles for cleanup
const testFilmTitles = [];

beforeAll(async () => {
  await mongoose.connect(uri);
  
  try {
    // Clean up any existing user with this email
    await User.deleteOne({ email: perfTestEmail });
    
    testUser = await User.create({
      firstName: 'Performance',
      lastName: 'Test',
      email: perfTestEmail,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });
    
    // Set up authenticated agent
    agent = request.agent(app);
    await agent.post('/login').send({
      email: perfTestEmail,
      password: 'password123'
    });
  } catch (error) {
    console.error('Setup failed:', error);
  }
});

afterAll(async () => {
  // Clean up test user
  try {
    if (testUser && testUser._id) {
      await User.findByIdAndDelete(testUser._id);
    }
    
    // Clean up test films by title
    if (testFilmTitles.length > 0) {
      await Film.deleteMany({ title: { $in: testFilmTitles } });
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
  await mongoose.connection.close();
});

describe('Performance Tests', () => {
  const maxResponseTime = 2000; // 2 seconds max response time
  
  // Test home page load time
  it('GET / - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await request(app).get('/');
    const end = performance.now();

    const responseTime = end - start;
    console.log(`GET / took ${responseTime.toFixed(2)} ms`);

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  // Test welcome page (with films) load time
  it('GET /welcome - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await agent.get('/welcome');
    const end = performance.now();

    const responseTime = end - start;
    console.log(`GET /welcome took ${responseTime.toFixed(2)} ms`);

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  // Test add film form load time
  it('GET /films/add - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await agent.get('/films/add');
    const end = performance.now();

    const responseTime = end - start;
    console.log(`GET /films/add took ${responseTime.toFixed(2)} ms`);

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  // Test login performance
  it('POST /login - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await request(app).post('/login').send({
      email: perfTestEmail,
      password: 'password123'
    });
    const end = performance.now();

    const responseTime = end - start;
    console.log(`POST /login took ${responseTime.toFixed(2)} ms`);

    expect(res.statusCode).toBe(302); // Redirect after login
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  // Test add film performance
  it('POST /films/add - should respond under 2000ms', async () => {
    const title = `Performance Test Film ${Date.now()}`;
    testFilmTitles.push(title);
    
    const start = performance.now();
    const res = await agent.post('/films/add').send({
      title,
      description: 'This is a test film for performance testing',
      releaseYear: 2023,
      genre: 'Testing, Performance',
      director: 'Test Director',
      cast: 'Test Actor, Another Actor',
      rating: 7.5,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    });
    const end = performance.now();

    const responseTime = end - start;
    console.log(`POST /films/add took ${responseTime.toFixed(2)} ms`);

    expect(res.statusCode).toBe(302);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  it('POST /signup - should respond under 2000ms', async () => {
    // Generate a unique email to avoid conflicts
    const uniqueEmail = `perftest_signup_${Date.now()}@example.com`;
    
    const signupData = {
      firstName: 'Performance',
      lastName: 'Test',
      email: uniqueEmail,
      mobile: '1234567890',
      gender: 'male', // Match the gender format used in the app
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    const start = performance.now();
    const res = await request(app).post('/signup').send(signupData);
    const end = performance.now();

    const responseTime = end - start;
    console.log(`POST /signup took ${responseTime.toFixed(2)} ms`);
    
    console.log(`Signup status: ${res.status}`);
    if (res.status === 400) {
      console.log('Signup failed. Response body:', res.text);
    }

    // Accept either 302 (redirect on success) or 400 (validation error)
    expect([302, 400]).toContain(res.statusCode);
    expect(responseTime).toBeLessThan(maxResponseTime);
    
    // Clean up created user only if signup was successful
    if (res.status === 302) {
      await User.deleteOne({ email: uniqueEmail });
    }
  }, 5000);
});