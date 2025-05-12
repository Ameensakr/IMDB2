const mongoose = require('mongoose');
const app = require('../app');
const request = require('supertest');
const Film = require('../models/film');
const User = require('../models/user');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

let testUser;
let agent;
const filmTesterEmail = `filmtester_${Date.now()}@example.com`;
const testFilmIds = [];
const testFilmTitles = [];

beforeAll(async () => {
  await mongoose.connect(uri);
  
  await User.deleteOne({ email: filmTesterEmail });

  testUser = await User.create({
    firstName: 'Film',
    lastName: 'Tester',
    email: filmTesterEmail,
    mobile: '1234567890',
    gender: 'male',
    password: 'password123'
  });
  
  agent = request.agent(app);
  await agent.post('/login').send({
    email: filmTesterEmail,
    password: 'password123'
  });
});

afterAll(async () => {
  if (testFilmIds.length > 0) {
    await Film.deleteMany({ _id: { $in: testFilmIds } });
  }
  
  if (testFilmTitles.length > 0) {
    await Film.deleteMany({ title: { $in: testFilmTitles } });
  }
  
  if (testUser && testUser._id) {
    await User.findByIdAndDelete(testUser._id);
  }
  
  await mongoose.connection.close();
});

describe('Film Features', () => {
  it('should show the film count correctly', async () => {
    const filmCount = await Film.countDocuments();
    
    const res = await agent.get('/welcome');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('stat-label">Total Films</span>');
    
    expect(res.text).toContain('<span class="stat-value">');
    
    const countMatch = res.text.match(/<span class="stat-value">(\d+)<\/span>[^]*?Total Films/);
    const actualCount = countMatch ? parseInt(countMatch[1]) : 0;
    
    expect(actualCount).toBeGreaterThan(0);
  });
  
  it('should display the add film form', async () => {
    const res = await agent.get('/films/add');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Add New Film');
    expect(res.text).toContain('form action="/films/add"');
  });
  
  it('should add a new film', async () => {
    const title = 'Test Film ' + Date.now(); 
    testFilmTitles.push(title); 
    
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
    
    const originalCount = await Film.countDocuments();
    
    const res = await agent.post('/films/add').send(newFilm);
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/welcome');
    
    const addedFilm = await Film.findOne({ title });
    expect(addedFilm).not.toBeNull();
    testFilmIds.push(addedFilm._id);
    
    expect(addedFilm.description).toBe('A film created for testing');
    expect(addedFilm.releaseYear).toBe(2023);
    expect(addedFilm.genre).toEqual(['Testing', 'Drama']);
    expect(addedFilm.rating).toBe(8.5);
  });
  
  it('should display the highest-rated film', async () => {
    const title = 'Highest Rated Test Film ' + Date.now(); 
    testFilmTitles.push(title); 
    
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
    
    const res = await agent.get('/welcome');
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Highest Rated Film:');
    expect(res.text).toContain(title);
    expect(res.text).toContain('⭐ 10/10');
  });

  
  it('should handle errors when fetching films', async () => {
    const originalFind = Film.find;
    const originalSort = {
      sort: jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      })
    };
    
    Film.find = jest.fn().mockReturnValue(originalSort);
    
    const res = await agent.get('/welcome');
    
    Film.find = originalFind;
    expect(res.status).toBe(500);
  });
  
  it('should handle errors when adding a film', async () => {
    const title = 'Error Test Film ' + Date.now();
    testFilmTitles.push(title); 
    
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
    
    const originalPrototypeSave = Film.prototype.save;
    Film.prototype.save = jest.fn().mockImplementation(function() {
      throw new Error('Database error');
    });
    
    const res = await agent.post('/films/add').send(newFilm);
    
    Film.prototype.save = originalPrototypeSave;
    
    expect(res.status).toBe(500);
  });
}); 