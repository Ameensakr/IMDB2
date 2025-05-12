const mongoose = require('mongoose');
const Film = require('../models/film');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

// Array to store created test films for cleanup
const testFilmIds = [];

beforeAll(async () => {
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (testFilmIds.length > 0) {
    await Film.deleteMany({ _id: { $in: testFilmIds } });
  }
  
  await mongoose.connection.close();
});

describe('Film Model', () => {
  it('should create a new film successfully', async () => {
    const filmData = {
      title: 'Test Film Model',
      description: 'This is a test film for model testing',
      releaseYear: 2023,
      genre: ['Testing', 'Drama'],
      director: 'Test Director',
      cast: ['Test Actor', 'Another Test Actor'],
      rating: 8.5,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    };
    
    const film = new Film(filmData);
    const savedFilm = await film.save();
    testFilmIds.push(savedFilm._id);
    
    expect(savedFilm._id).toBeDefined();
    expect(savedFilm.title).toBe(filmData.title);
    expect(savedFilm.description).toBe(filmData.description);
    expect(savedFilm.releaseYear).toBe(filmData.releaseYear);
    expect(savedFilm.genre).toEqual(expect.arrayContaining(filmData.genre));
    expect(savedFilm.director).toBe(filmData.director);
    expect(savedFilm.cast).toEqual(expect.arrayContaining(filmData.cast));
    expect(savedFilm.rating).toBe(filmData.rating);
    expect(savedFilm.duration).toBe(filmData.duration);
    expect(savedFilm.posterUrl).toBe(filmData.posterUrl);
    expect(savedFilm.createdAt).toBeDefined();
    expect(savedFilm.updatedAt).toBeDefined();
  });
  
  it('should update the updatedAt timestamp when saving', async () => {
    const film = new Film({
      title: 'Timestamp Test Film',
      description: 'Testing timestamps',
      releaseYear: 2023,
      genre: ['Testing'],
      director: 'Test Director',
      cast: ['Test Actor'],
      rating: 7.5,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    });
    
    const savedFilm = await film.save();
    testFilmIds.push(savedFilm._id);
    
    const originalUpdatedAt = savedFilm.updatedAt;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    savedFilm.title = 'Updated Timestamp Test Film';
    await savedFilm.save();
    
    expect(savedFilm.updatedAt).not.toEqual(originalUpdatedAt);
  });
  
  it('should validate required film fields', async () => {
    const incompleteFilm = new Film({
      title: 'Incomplete Film',
    });
    
    let validationError;
    try {
      await incompleteFilm.save();
    } catch (error) {
      validationError = error;
    }
    
    expect(validationError).toBeDefined();
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.errors.description).toBeDefined();
    expect(validationError.errors.releaseYear).toBeDefined();
    expect(validationError.errors.director).toBeDefined();
    expect(validationError.errors.duration).toBeDefined();
  });
  
  it('should validate rating min/max values', async () => {
    const filmWithLowRating = new Film({
      title: 'Low Rating Film',
      description: 'Testing rating validation',
      releaseYear: 2023,
      genre: ['Testing'],
      director: 'Test Director',
      cast: ['Test Actor'],
      rating: -1, 
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    });
    
    let lowRatingError;
    try {
      await filmWithLowRating.save();
    } catch (error) {
      lowRatingError = error;
    }
    
    expect(lowRatingError).toBeDefined();
    expect(lowRatingError.name).toBe('ValidationError');
    expect(lowRatingError.errors.rating).toBeDefined();
    
    const filmWithHighRating = new Film({
      title: 'High Rating Film',
      description: 'Testing rating validation',
      releaseYear: 2023,
      genre: ['Testing'],
      director: 'Test Director',
      cast: ['Test Actor'],
      rating: 11,
      duration: 120,
      posterUrl: 'https://example.com/poster.jpg'
    });
    
    let highRatingError;
    try {
      await filmWithHighRating.save();
    } catch (error) {
      highRatingError = error;
    }
    
    expect(highRatingError).toBeDefined();
    expect(highRatingError.name).toBe('ValidationError');
    expect(highRatingError.errors.rating).toBeDefined();
  });
}); 