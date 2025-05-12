const mongoose = require('mongoose');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Store test user emails to clean up only those
const testUserEmails = [];

beforeAll(async () => {
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (testUserEmails.length > 0) {
    await User.deleteMany({ email: { $in: testUserEmails } });
  }
  await mongoose.connection.close();
});

describe('User Model', () => {
  it('should create a new user successfully', async () => {
    const email = 'modeltest@example.com';
    testUserEmails.push(email);
    
    const userData = {
      firstName: 'Model',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    };
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.firstName).toBe(userData.firstName);
    expect(savedUser.lastName).toBe(userData.lastName);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.mobile).toBe(userData.mobile);
    expect(savedUser.gender).toBe(userData.gender);
    expect(savedUser.password).not.toBe(userData.password); // Password should be hashed
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.isAdmin).toBe(false); // Default value
  });
  
  it('should validate required user fields', async () => {
    const incompleteUser = new User({
      firstName: 'Incomplete',
      // Missing required fields
    });
    
    let validationError;
    try {
      await incompleteUser.save();
    } catch (error) {
      validationError = error;
    }
    
    expect(validationError).toBeDefined();
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.errors.lastName).toBeDefined();
    expect(validationError.errors.email).toBeDefined();
    expect(validationError.errors.mobile).toBeDefined();
    expect(validationError.errors.gender).toBeDefined();
    expect(validationError.errors.password).toBeDefined();
  });
  
  it('should enforce unique email constraint', async () => {
    const email = 'uniquetest@example.com';
    testUserEmails.push(email);
    
    // Create first user
    const firstUser = new User({
      firstName: 'Unique',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });
    await firstUser.save();
    
    // Try to create second user with same email
    const duplicateUser = new User({
      firstName: 'Duplicate',
      lastName: 'Test',
      email, // Same email
      mobile: '9876543210',
      gender: 'female',
      password: 'password456'
    });
    
    let duplicateError;
    try {
      await duplicateUser.save();
    } catch (error) {
      duplicateError = error;
    }
    
    expect(duplicateError).toBeDefined();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
  });
  
  it('should validate gender enum values', async () => {
    const email = 'gendertest@example.com';
    testUserEmails.push(email);
    
    const invalidUser = new User({
      firstName: 'Gender',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'invalid', // Not in enum ['male', 'female']
      password: 'password123'
    });
    
    let enumError;
    try {
      await invalidUser.save();
    } catch (error) {
      enumError = error;
    }
    
    expect(enumError).toBeDefined();
    expect(enumError.name).toBe('ValidationError');
    expect(enumError.errors.gender).toBeDefined();
  });
  
  it('should validate password minimum length', async () => {
    const email = 'passwordtest@example.com';
    testUserEmails.push(email);
    
    const userWithShortPassword = new User({
      firstName: 'Password',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: '12345' // Too short (min length is 6)
    });
    
    let passwordError;
    try {
      await userWithShortPassword.save();
    } catch (error) {
      passwordError = error;
    }
    
    expect(passwordError).toBeDefined();
    expect(passwordError.name).toBe('ValidationError');
    expect(passwordError.errors.password).toBeDefined();
  });
  
  it('should not hash the password if it was not modified', async () => {
    const email = 'hashtest@example.com';
    testUserEmails.push(email);
    
    // Create a user
    const user = new User({
      firstName: 'Hash',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: 'password123'
    });
    await user.save();
    
    // Get the hashed password
    const originalHash = user.password;
    
    // Update a field other than password
    user.firstName = 'Updated';
    await user.save();
    
    // Password hash should remain the same
    expect(user.password).toBe(originalHash);
  });
  
  it('should correctly compare passwords', async () => {
    const email = 'comparetest@example.com';
    testUserEmails.push(email);
    
    const plainPassword = 'password123';
    
    // Create a user
    const user = new User({
      firstName: 'Compare',
      lastName: 'Test',
      email,
      mobile: '1234567890',
      gender: 'male',
      password: plainPassword
    });
    await user.save();
    
    // Test correct password
    const passwordMatch = await user.comparePassword(plainPassword);
    expect(passwordMatch).toBe(true);
    
    // Test incorrect password
    const wrongPasswordMatch = await user.comparePassword('wrongpassword');
    expect(wrongPasswordMatch).toBe(false);
  });
}); 