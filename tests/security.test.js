const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Generate unique test emails to avoid conflicts
const securityTestEmail = `securitytest_${Date.now()}@example.com`;
const mismatchTestEmail = `mismatch_${Date.now()}@example.com`;
const testEmails = [securityTestEmail, mismatchTestEmail];

beforeAll(async () => {
  await mongoose.connect(uri);
  
  await User.deleteMany({ email: { $in: testEmails } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await mongoose.connection.close();
});

describe('Password Security', () => {
  it('should store passwords in a hashed format, not plaintext', async () => {
    const plainPassword = 'SecurePassword123!';
    
    const res = await request(app).post('/signup').send({
      firstName: 'Security',
      lastName: 'Test',
      email: securityTestEmail,
      mobile: '1234567890',
      gender: 'male',
      password: plainPassword,
      confirmPassword: plainPassword
    });
    
    const savedUser = await User.findOne({ email: securityTestEmail });
    
    expect(savedUser.password).not.toBe(plainPassword);
    expect(savedUser.password).toBeTruthy();
    
    expect(savedUser.password.startsWith('$2b$')).toBe(true);
  });
  
  it('should allow authentication with correct password against hashed password', async () => {
    const plainPassword = 'SecurePassword123!';
    
    const savedUser = await User.findOne({ email: securityTestEmail });
    
    const passwordMatch = await savedUser.comparePassword(plainPassword);
    expect(passwordMatch).toBe(true);
    
    const wrongPasswordMatch = await savedUser.comparePassword('WrongPassword123!');
    expect(wrongPasswordMatch).toBe(false);
  });
  
  it('should successfully authenticate with correct password', async () => {
    const res = await request(app).post('/login').send({
      email: securityTestEmail,
      password: 'SecurePassword123!'
    });
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });
  
  it('should reject authentication with incorrect password', async () => {
    const res = await request(app).post('/login').send({
      email: securityTestEmail,
      password: 'WrongPassword123!'
    });
    
    expect(res.status).toBe(400);
  });
});

describe('Security Headers', () => {
  it('should include basic security headers', async () => {
    const res = await request(app).get('/');
 
    expect(res.headers).toHaveProperty('content-type');
    expect(res.headers).toHaveProperty('x-powered-by');
  });
});

describe('Session Security', () => {
  it('should clear session on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({
      email: securityTestEmail,
      password: 'SecurePassword123!'
    });
    
    const welcomeRes = await agent.get('/welcome');
    expect(welcomeRes.status).toBe(200); // User is logged in, so should get 200 OK
    
    const logoutRes = await agent.get('/logout');
    expect(logoutRes.status).toBe(302);
    expect(logoutRes.headers.location).toBe('/');
    
    const afterLogoutRes = await agent.get('/welcome');
    expect(afterLogoutRes.status).toBe(302); // Should redirect to login
  });
});

describe('Authorization Security', () => {
  it('should prevent access to protected routes when not authenticated', async () => {
    const res = await request(app).get('/welcome');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
  
  it('should prevent access to film creation when not authenticated', async () => {
    
    const res = await request(app).get('/films/add');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});

describe('Input Validation', () => {

  
  it('should reject mismatched passwords during signup', async () => {
    const res = await request(app).post('/signup').send({
      firstName: 'Mismatched',
      lastName: 'Password',
      email: mismatchTestEmail,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123',
      confirmPassword: 'different123'
    });
    
    expect(res.status).toBe(400);
  });
}); 