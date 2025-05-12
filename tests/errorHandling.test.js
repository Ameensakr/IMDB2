const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

beforeAll(async () => {
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Error Handling', () => {
  it('should handle 404 errors for non-existent routes', async () => {
    const res = await request(app).get('/non-existent-route');
    
    expect(res.status).toBe(404);
    expect(res.text).toContain('404'); 
  });
  
  it('should handle 404 errors for non-existent API routes', async () => {
    const res = await request(app).get('/api/non-existent');
    
    expect(res.status).toBe(404);
  });
  
  it('should handle 404 errors for invalid film routes', async () => {
    const res = await request(app).get('/films/invalid-route');
    expect(res.status).toBe(404);
  });
  
  it('should handle invalid HTTP methods for existing routes', async () => {
    const res = await request(app).delete('/login');
    expect(res.status).toBe(404);
  });
}); 