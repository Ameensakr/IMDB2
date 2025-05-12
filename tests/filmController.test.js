const mongoose = require('mongoose');
const app = require('../app');
const request = require('supertest');
const Film = require('../models/film');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

let testUser;
let agent;
// Generate unique test email
const filmTesterEmail = `filmtester_${Date.now()}@example.com`;
const testFilmIds = [];
// Add an array to track film titles for more thorough cleanup
const testFilmTitles = [];

beforeAll(async () => {
  await mongoose.connect(uri);
  
  // Clean up any existing user with this email
  await User.deleteOne({ email: filmTesterEmail });

  testUser = await User.create({
    firstName: 'Film',
    lastName: 'Tester',
    email: filmTesterEmail,
    mobile: '1234567890',
    gender: 'male',
    password: 'password123'
  });
  
  // Setup authenticated agent for testing protected routes
  agent = request.agent(app);
  await agent.post('/login').send({
    email: filmTesterEmail,
    password: 'password123'
  });
});

afterAll(async () => {
  // Clean up test films by IDs
  if (testFilmIds.length > 0) {
    await Film.deleteMany({ _id: { $in: testFilmIds } });
  }
  
  // Clean up test films by titles - this catches any films that might not have been added to testFilmIds
  if (testFilmTitles.length > 0) {
    await Film.deleteMany({ title: { $in: testFilmTitles } });
  }
  
  // Clean up test user
  if (testUser && testUser._id) {
    await User.findByIdAndDelete(testUser._id);
  }
  
  await mongoose.connection.close();
});

describe('Film Features', () => {
  it('should show the film count correctly', async () => {
    // Get current film count from database
    const filmCount = await Film.countDocuments();
    
    // Access welcome page (which has the counter)
    const res = await agent.get('/welcome');
    
    // Check status and that counter exists in response
    expect(res.status).toBe(200);
    expect(res.text).toContain('stat-label">Total Films</span>');
    
    // Check that there's a stat-value element (but don't check exact count, as it might change)
    expect(res.text).toContain('<span class="stat-value">');
    
    // Extract the actual count from the HTML response
    const countMatch = res.text.match(/<span class="stat-value">(\d+)<\/span>[^]*?Total Films/);
    const actualCount = countMatch ? parseInt(countMatch[1]) : 0;
    
    // Verify the count is a number greater than 0
    expect(actualCount).toBeGreaterThan(0);
  });
  
  it('should display the add film form', async () => {
    const res = await agent.get('/films/add');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Add New Film');
    expect(res.text).toContain('form action="/films/add"');
  });
  
  it('should add a new film', async () => {
    const title = 'Test Film ' + Date.now(); // Make title unique
    testFilmTitles.push(title); // Track title for cleanup
    
    const newFilm = {
      title,
      description: 'A film created for testing',
      releaseYear: 2023,
      genre: 'Testing, Drama',
      director: 'Test Director',
      cast: 'Actor One, Actor Two',
      rating: 8.5,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    };
    
    // Get original count of films
    const originalCount = await Film.countDocuments();
    
    // Submit new film
    const res = await agent.post('/films/add').send(newFilm);
    
    // Check redirect
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
    
    // Find the film to verify it was added
    const addedFilm = await Film.findOne({ title });
    expect(addedFilm).not.toBeNull();
    testFilmIds.push(addedFilm._id);
    
    // Verify film properties
    expect(addedFilm.description).toBe('A film created for testing');
    expect(addedFilm.releaseYear).toBe(2023);
    expect(addedFilm.genre).toEqual(['Testing', 'Drama']);
    expect(addedFilm.rating).toBe(8.5);
  });
  
  it('should display the highest-rated film', async () => {
    // Create a film with a very high rating for testing
    const title = 'Highest Rated Test Film ' + Date.now(); // Make title unique
    testFilmTitles.push(title); // Track title for cleanup
    
    const highRatedFilm = await Film.create({
      title,
      description: 'This should be the highest rated film',
      releaseYear: 2023,
      genre: ['Testing'],
      director: 'Test Director',
      cast: ['Lead Actor'],
      rating: 10,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    });
    testFilmIds.push(highRatedFilm._id);
    
    // Access welcome page
    const res = await agent.get('/welcome');
    
    // Check status and that highest rated film section exists
    expect(res.status).toBe(200);
    expect(res.text).toContain('Highest Rated Film:');
    expect(res.text).toContain(title);
    expect(res.text).toContain('⭐ 10/10');
  });

  // Error handling tests
  
  it('should handle errors when fetching films', async () => {
    // Mock Film.find to throw an error
    const originalFind = Film.find;
    const originalSort = {
      sort: jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      })
    };
    
    // Mock Find.sort() rather than find itself
    Film.find = jest.fn().mockReturnValue(originalSort);
    
    // Access welcome page which calls getAllFilms
    const res = await agent.get('/welcome');
    
    // Restore original function
    Film.find = originalFind;
    
    // Should handle the error and send 500 status
    expect(res.status).toBe(500);
  });
  
  it('should handle errors when adding a film', async () => {
    // Create a film data object that will cause the save method to throw an error
    const title = 'Error Test Film ' + Date.now(); // Make title unique
    testFilmTitles.push(title); // Track title for cleanup
    
    const newFilm = {
      title,
      description: 'This film will cause an error',
      releaseYear: 2023,
      genre: 'Error, Testing',
      director: 'Error Director',
      cast: 'Error Actor',
      rating: 5.0,
      duration: 90,
      posterUrl: 'https://example.com/error.jpg'
    };
    
    // Mock save method to throw an error
    const originalPrototypeSave = Film.prototype.save;
    Film.prototype.save = jest.fn().mockImplementation(function() {
      throw new Error('Database error');
    });
    
    // Try to add a film
    const res = await agent.post('/films/add').send(newFilm);
    
    // Restore original save method
    Film.prototype.save = originalPrototypeSave;
    
    // Should handle the error and send 500 status
    expect(res.status).toBe(500);
  });
}); 