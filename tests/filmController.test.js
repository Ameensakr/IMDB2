const mongoose = require('mongoose');
const app = require('../app');
const request = require('supertest');
const Film = require('../models/film');
const User = require('../models/user');
const { formatFilmTitle, parseCommaSeparatedList } = require('../controllers/filmController');

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
    const rawTitle = 'Test Film ' + Date.now();
    const formattedTitle = formatFilmTitle(rawTitle);
    testFilmTitles.push(formattedTitle);
    
    const newFilm = {
      title: rawTitle,
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
    
    const addedFilm = await Film.findOne({ title: formattedTitle });
    expect(addedFilm).not.toBeNull();
    testFilmIds.push(addedFilm._id);
    
    expect(addedFilm.description).toBe('A film created for testing');
    expect(addedFilm.releaseYear).toBe(2023);
    expect(addedFilm.genre).toEqual(['Testing', 'Drama']);
    expect(addedFilm.rating).toBe(8.5);
  });
  
  it('should display the highest-rated film', async () => {
    const rawTitle = 'Highest Rated Test Film ' + Date.now();
    const formattedTitle = formatFilmTitle(rawTitle);
    testFilmTitles.push(formattedTitle);
    
    const highRatedFilm = await Film.create({
      title: formattedTitle,
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
    expect(res.text).toContain('Highest Rated Film: ⭐ 10/10');
    expect(res.text).toContain(formattedTitle);
  });

  
  it('should handle errors when fetching films', async () => {
    await mongoose.disconnect();
    
    const res = await agent.get('/welcome');
    
    await mongoose.connect(uri);
    
    expect(res.status).toBe(500);
  }, 10000);
  
  it('should handle errors when adding a film', async () => {
    const invalidFilm = {
      title: 'Test Error Film ' + Date.now(),
      rating: 9,
      duration: -10 
    };
    
    const res = await agent.post('/films/add').send(invalidFilm);
    
    expect(res.status).toBe(500);
  }, 5000);


  // Unit testing on String (film title)
  describe('formatFilmTitle function', () => {
    it('should capitalize the first letter and lowercase the rest', () => {
      expect(formatFilmTitle('tHE MATRIX')).toBe('The matrix');
      expect(formatFilmTitle('star WARS')).toBe('Star wars');
      expect(formatFilmTitle('INCEPTION')).toBe('Inception');
      expect(formatFilmTitle('avatar')).toBe('Avatar');
    });
    
    it('should handle edge cases properly', () => {
      expect(formatFilmTitle('')).toBe('');
      expect(formatFilmTitle(null)).toBe(null);
      expect(formatFilmTitle(undefined)).toBe(undefined);
      expect(formatFilmTitle('1917')).toBe('1917');
      expect(formatFilmTitle('a')).toBe('A');
    });
  });
  
  // Unit testing on Arrays (comma separated lists)
  describe('parseCommaSeparatedList function', () => {
    it('should convert comma-separated string to array of trimmed items', () => {
      expect(parseCommaSeparatedList('Action, Drama, Comedy')).toEqual(['Action', 'Drama', 'Comedy']);
      expect(parseCommaSeparatedList('John Doe,  Jane Smith,Bob Johnson')).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
    });
    
    it('should handle empty or whitespace-only items', () => {
      expect(parseCommaSeparatedList('Action,, Drama,  ,Comedy')).toEqual(['Action', 'Drama', 'Comedy']);
      expect(parseCommaSeparatedList('Action,   ,Comedy')).toEqual(['Action', 'Comedy']);
    });
    
    it('should handle edge cases', () => {
      expect(parseCommaSeparatedList('')).toEqual([]);
      expect(parseCommaSeparatedList(null)).toEqual([]);
      expect(parseCommaSeparatedList(undefined)).toEqual([]);
      expect(parseCommaSeparatedList('SingleItem')).toEqual(['SingleItem']);
      expect(parseCommaSeparatedList('   Trimmed   ')).toEqual(['Trimmed']);
    });
  });
  
  describe('Film rating validation', () => {
    it('should reject a rating below 0', async () => {
      const invalidFilm = new Film({
        title: 'Test Film with Invalid Rating',
        description: 'This film has a rating below 0',
        releaseYear: 2023,
        genre: ['Test'],
        director: 'Test Director',
        cast: ['Test Actor'],
        rating: -1,
        duration: 120,
        posterUrl: 'https://example.com/poster.jpg'
      });
      
      let validationError;
      try {
        await invalidFilm.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.errors.rating).toBeDefined();
      expect(validationError.errors.rating.kind).toBe('min');
    });
    
    it('should reject a rating above 10', async () => {
      const invalidFilm = new Film({
        title: 'Test Film with Invalid Rating',
        description: 'This film has a rating above 10',
        releaseYear: 2023,
        genre: ['Test'],
        director: 'Test Director',
        cast: ['Test Actor'],
        rating: 11,
        duration: 120,
        posterUrl: 'https://example.com/poster.jpg'
      });
      
      let validationError;
      try {
        await invalidFilm.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.errors.rating).toBeDefined();
      expect(validationError.errors.rating.kind).toBe('max');
    });
    
    it('should accept a rating of exactly 0', async () => {
      const validFilm = new Film({
        title: 'Test Film with Min Rating',
        description: 'This film has a rating of 0',
        releaseYear: 2023,
        genre: ['Test'],
        director: 'Test Director',
        cast: ['Test Actor'],
        rating: 0,
        duration: 120,
        posterUrl: 'https://example.com/poster.jpg'
      });
      
      let validationError;
      try {
        await validFilm.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeUndefined();
    });
    
    it('should accept a rating of exactly 10', async () => {
      const validFilm = new Film({
        title: 'Test Film with Max Rating',
        description: 'This film has a rating of 10',
        releaseYear: 2023,
        genre: ['Test'],
        director: 'Test Director',
        cast: ['Test Actor'],
        rating: 10,
        duration: 120,
        posterUrl: 'https://example.com/poster.jpg'
      });
      
      let validationError;
      try {
        await validFilm.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeUndefined();
    });
  });
}); 