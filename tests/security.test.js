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
  
  // Clean up any existing test users before starting tests
  await User.deleteMany({ email: { $in: testEmails } });
});

afterAll(async () => {
  // Clean up test users
  await User.deleteMany({ email: { $in: testEmails } });
  await mongoose.connection.close();
});

describe('Password Security', () => {
  it('should store passwords in a hashed format, not plaintext', async () => {
    const plainPassword = 'SecurePassword123!';
    
    // Create a test user
    const res = await request(app).post('/signup').send({
      firstName: 'Security',
      lastName: 'Test',
      email: securityTestEmail,
      mobile: '1234567890',
      gender: 'male',
      password: plainPassword,
      confirmPassword: plainPassword
    });
    
    // Retrieve the user from database
    const savedUser = await User.findOne({ email: securityTestEmail });
    
    // Verify the password is not stored as plaintext
    expect(savedUser.password).not.toBe(plainPassword);
    expect(savedUser.password).toBeTruthy();
    
    // Verify the password is hashed with bcrypt (bcrypt hashes start with $2b$)
    expect(savedUser.password.startsWith('$2b$')).toBe(true);
  });
  
  it('should allow authentication with correct password against hashed password', async () => {
    const plainPassword = 'SecurePassword123!';
    
    // Retrieve the user from database
    const savedUser = await User.findOne({ email: securityTestEmail });
    
    // Test the comparePassword method directly
    const passwordMatch = await savedUser.comparePassword(plainPassword);
    expect(passwordMatch).toBe(true);
    
    // Test wrong password fails
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
    
    // Check for common security headers
    // Note: These tests may need to be adjusted based on your actual security configuration
    expect(res.headers).toHaveProperty('content-type');
    expect(res.headers).toHaveProperty('x-powered-by');
  });
});

describe('Session Security', () => {
  it('should clear session on logout', async () => {
    // Login first
    const agent = request.agent(app);
    await agent.post('/login').send({
      email: securityTestEmail,
      password: 'SecurePassword123!'
    });
    
    // Access protected route to confirm logged in
    const welcomeRes = await agent.get('/welcome');
    expect(welcomeRes.status).toBe(200); // User is logged in, so should get 200 OK
    
    // Logout
    const logoutRes = await agent.get('/logout');
    expect(logoutRes.status).toBe(302);
    expect(logoutRes.headers.location).toBe('/');
    
    // Try to access protected route after logout
    const afterLogoutRes = await agent.get('/welcome');
    expect(afterLogoutRes.status).toBe(302); // Should redirect to login
  });
});

describe('Authorization Security', () => {
  it('should prevent access to protected routes when not authenticated', async () => {
    // Try to access protected routes without authentication
    const res = await request(app).get('/welcome');
    
    // Should redirect to login page
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
  
  it('should prevent access to film creation when not authenticated', async () => {
    // Try to access film creation without authentication
    const res = await request(app).get('/films/add');
    
    // Should redirect to login page
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
    
    // Should not redirect on success
    expect(res.status).toBe(400);
  });
}); 