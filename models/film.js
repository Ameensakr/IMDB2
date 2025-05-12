const mongoose = require('mongoose');

const filmSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    releaseYear: {
        type: Number,
        required: true
    },
    genre: [{
        type: String,
        required: true
    }],
    director: {
        type: String,
        required: true
    },
    cast: [{
        type: String
    }],
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    duration: {
        type: Number,  // in minutes
        required: true,
        min: 0
    },
    posterUrl: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

filmSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Film = mongoose.model('Film', filmSchema);

module.exports = Film;
