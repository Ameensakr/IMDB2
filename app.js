const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const app = express();

const userController = require('./controllers/userController');
const filmController = require('./controllers/filmController');

const uri = 'mongodb+srv://Ameen:WKWh4dux4xotZGrg@imdb.hn3af24.mongodb.net/?retryWrites=true&w=majority&appName=imdb';

mongoose.connect(uri)
    .then((result) => {
        if (process.env.NODE_ENV !== 'test')
        {
            app.listen(3000);
            console.log('MongoDB connected successfully!');
        }
        
    })
    .catch((err) => {
        console.error('MongoDB connection error:');
        console.error(err.message);
        console.error('Full error:', err);
    });


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/');
  }
};

const checkLoggedIn = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/welcome');
  } else {
    next();
  }
};

app.get('/', checkLoggedIn, (req, res) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.render('index', { user: req.session.user || null });
});

app.get('/signup', checkLoggedIn, (req, res) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.render('signup', { user: req.session.user || null });
});

app.post('/signup', userController.signup);
app.post('/login', userController.login);
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/welcome', requireAuth, filmController.getAllFilms);
app.get('/films/add', requireAuth, filmController.getAddFilmForm);
app.post('/films/add', requireAuth, filmController.addFilm);

app.use((req, res) => {
    res.status(404).render('404');
});

module.exports = app;