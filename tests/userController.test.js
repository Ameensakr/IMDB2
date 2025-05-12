const mongoose = require('mongoose');
const app = require('../app');
const request = require('supertest');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

const testUserEmails = [];


const timestamp = Date.now();
const generateEmail = (prefix) => {
  const email = `${prefix}_${timestamp}@example.com`;
  testUserEmails.push(email);
  return email;
};

beforeEach(async () => {
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (testUserEmails.length > 0) {
    await User.deleteMany({ email: { $in: testUserEmails } });
  }
  
  await mongoose.connection.close();
});

jest.setTimeout(15000);

describe('User Routes', () => {
  it('should create a user via signup', async () => {
    const email = generateEmail('testuser');

    const res = await request(app).post('/signup').send({
      firstName: 'Test',
      lastName: 'User',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  }, 10000);

  it('should not allow duplicate email registration', async () => {
    const email = generateEmail('duplicate');
    
    await User.create({
      firstName: 'First',
      lastName: 'User',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });

    const res = await request(app).post('/signup').send({
      firstName: 'Second',
      lastName: 'User',
      email,
      mobile: '9876543210',
      gender: 'female',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    expect(res.status).toBe(400);
  });

  it('should not allow registration with mismatched passwords', async () => {
    const email = generateEmail('mismatch');

    const res = await request(app).post('/signup').send({
      firstName: 'Mismatch',
      lastName: 'Password',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123',
      confirmPassword: 'differentpassword'
    });
    
    expect(res.status).toBe(400);
  });

  it('should login a user with valid credentials', async () => {
    const email = generateEmail('login');

    await User.create({
      firstName: 'Login',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });

    const res = await request(app).post('/login').send({
      email,
      password: 'password123'
    });
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
  });

  it('should reject login with invalid email', async () => {
    const res = await request(app).post('/login').send({
      email: generateEmail('nonexistent'),
      password: 'password123'
    });
    
    expect(res.status).toBe(400);
  });

  it('should reject login with invalid password', async () => {
    const email = generateEmail('wrongpass');

    await User.create({
      firstName: 'Wrong',
      lastName: 'Password',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });

    const res = await request(app).post('/login').send({
      email,
      password: 'wrongpassword'
    });
    
    expect(res.status).toBe(400);
  });

  it('should log out a user', async () => {
    const res = await request(app).get('/logout');
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  
  it('should handle validation errors during signup', async () => {
    const email = generateEmail('validation');

  
    const res = await request(app).post('/signup').send({
      firstName: 'Validation',
      
      email,
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    expect(res.status).toBe(400);
    expect(res.text).toContain('Please fix the following errors');
  });

  it('should handle invalid gender during signup', async () => {
    const email = generateEmail('invalidgender');

    const res = await request(app).post('/signup').send({
      firstName: 'Invalid',
      lastName: 'Gender',
      email,
      mobile: '1234567890',
      gender: 'invalid', 
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    expect(res.status).toBe(400);
    expect(res.text).toContain('Please fix the following errors');
  });

  it('should handle server errors during signup', async () => {
    const errorEmail = generateEmail('servererror');
    
    const signupData = {
      firstName: 'Server',
      lastName: 'Error',
      email: errorEmail,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    await mongoose.disconnect();
    
    const res = await request(app).post('/signup').send(signupData);
    
    await mongoose.connect(uri);
    
    expect(res.status).toBe(500);
  }, 10000); 
  
  it('should handle server errors during login', async () => {
    const errorEmail = generateEmail('loginerror');
    
    await mongoose.disconnect();
    
    const res = await request(app).post('/login').send({
      email: errorEmail,
      password: 'password123'
    });
    
    await mongoose.connect(uri);
    
    expect(res.status).toBe(500);
  }, 10000); 

  it('should handle logout correctly', async () => {
    const agent = request.agent(app);
    
    const email = generateEmail('logout');
    
    await User.create({
      firstName: 'Logout',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });
    
    await agent.post('/login').send({
      email,
      password: 'password123'
    });
    
    const welcomeRes = await agent.get('/welcome');
    expect(welcomeRes.status).toBe(200);
    
    const logoutRes = await agent.get('/logout');
    
    expect(logoutRes.status).toBe(302);
    expect(logoutRes.headers.location).toBe('/');
    
    const afterLogoutRes = await agent.get('/welcome');
    expect(afterLogoutRes.status).toBe(302); 
  });
});
