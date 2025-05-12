const request = require('supertest');
const app = require('../app');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const User = require('../models/user');
const Film = require('../models/film');
const { formatFilmTitle } = require('../controllers/filmController');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

let testUser;
let agent;
const perfTestEmail = `perftest_${Date.now()}@example.com`;
const testFilmTitles = [];
const testFilmIds = [];

beforeAll(async () => {
  await mongoose.connect(uri);
  
  try {
    await User.deleteOne({ email: perfTestEmail });
    
    testUser = await User.create({
      firstName: 'Performance',
      lastName: 'Test',
      email: perfTestEmail,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });
    
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
  try {
    if (testUser && testUser._id) {
      await User.findByIdAndDelete(testUser._id);
    }
    
    if (testFilmTitles.length > 0) {
      await Film.deleteMany({ title: { $in: testFilmTitles } });
    }
    
    if (testFilmIds.length > 0) {
      await Film.deleteMany({ _id: { $in: testFilmIds } });
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
  await mongoose.connection.close();
});

describe('Performance Tests', () => {
  const maxResponseTime = 2000; 
  
  it('GET / - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await request(app).get('/');
    const end = performance.now();

    const responseTime = end - start;

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  it('GET /welcome - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await agent.get('/welcome');
    const end = performance.now();

    const responseTime = end - start;

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  it('GET /films/add - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await agent.get('/films/add');
    const end = performance.now();

    const responseTime = end - start;

    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  it('POST /login - should respond under 2000ms', async () => {
    const start = performance.now();
    const res = await request(app).post('/login').send({
      email: perfTestEmail,
      password: 'password123'
    });
    const end = performance.now();

    const responseTime = end - start;

    expect(res.statusCode).toBe(302); 
    expect(responseTime).toBeLessThan(maxResponseTime);
  }, 5000);

  it('POST /films/add - should respond under 2000ms', async () => {
    const rawTitle = `Performance Test Film ${Date.now()}`;
    const formattedTitle = formatFilmTitle(rawTitle);
    testFilmTitles.push(formattedTitle);
    
    const start = performance.now();
    const res = await agent.post('/films/add').send({
      title: rawTitle,
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

    expect(res.statusCode).toBe(302);
    expect(responseTime).toBeLessThan(maxResponseTime);
    
    const addedFilm = await Film.findOne({ title: formattedTitle });
    if (addedFilm) {
      testFilmIds.push(addedFilm._id);
    }
  }, 5000);

  it('POST /signup - should respond under 2000ms', async () => {
    const uniqueEmail = `perftest_signup_${Date.now()}@example.com`;
    
    const signupData = {
      firstName: 'Performance',
      lastName: 'Test',
      email: uniqueEmail,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    const start = performance.now();
    const res = await request(app).post('/signup').send(signupData);
    const end = performance.now();

    const responseTime = end - start;

    if (res.status === 400) {
      console.log('Signup failed. Response body:', res.text);
    }

    expect([302, 400]).toContain(res.statusCode);
    expect(responseTime).toBeLessThan(maxResponseTime);
    
    if (res.status === 302) {
      await User.deleteOne({ email: uniqueEmail });
    }
  }, 5000);
});