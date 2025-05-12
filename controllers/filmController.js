const Film = require('../models/film');
const User = require('../models/user');

const initializeFilms = async () => {
    try {
        const films = [
            {
                title: "The Shawshank Redemption",
                description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
                releaseYear: 1994,
                genre: ["Drama"],
                director: "Frank Darabont",
                cast: ["Tim Robbins", "Morgan Freeman"],
                rating: 9.3,
                duration: 142,
                posterUrl: "https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_.jpg"
            },
            {
                title: "The Godfather",
                description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
                releaseYear: 1972,
                genre: ["Crime", "Drama"],
                director: "Francis Ford Coppola",
                cast: ["Marlon Brando", "Al Pacino", "James Caan"],
                rating: 9.2,
                duration: 175,
                posterUrl: "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg"
            },
            {
                title: "The Dark Knight",
                description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
                releaseYear: 2008,
                genre: ["Action", "Crime", "Drama"],
                director: "Christopher Nolan",
                cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
                rating: 9.0,
                duration: 152,
                posterUrl: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg"
            },
            {
                title: "Forrest Gump",
                description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.",
                releaseYear: 1994,
                genre: ["Drama", "Romance"],
                director: "Robert Zemeckis",
                cast: ["Tom Hanks", "Robin Wright", "Gary Sinise"],
                rating: 8.8,
                duration: 142,
                posterUrl: "https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg"
            }
        ];

        const existingFilms = await Film.find();
        if (existingFilms.length === 0) {
            await Film.insertMany(films);
        }
    } catch (error) {
    }
};

initializeFilms();

const getAllFilms = async (req, res) => {
    try {
        const films = await Film.find().sort({ rating: -1 });
        const user = req.session.user || null;
        res.render('welcome', { films, user });
    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).render('welcome', { error: 'Error fetching films' });
    }
};

const getAddFilmForm = (req, res) => {
    res.render('add-film');
};

const addFilm = async (req, res) => {
    try {
        const filmData = {
            ...req.body,
            genre: req.body.genre.split(',').map(g => g.trim()),
            cast: req.body.cast ? req.body.cast.split(',').map(c => c.trim()) : []
        };

        const film = new Film(filmData);
        await film.save();
        
        res.redirect('/welcome');
    } catch (error) {
        console.error('Error adding film:', error);
        res.status(500).render('add-film', {
            error: 'Error adding film. Please try again.'
        });
    }
};

module.exports = {
    getAllFilms,
    getAddFilmForm,
    addFilm
}; 