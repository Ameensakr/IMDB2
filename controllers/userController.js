const User = require('../models/user');

const signup = async (req, res) => {
    try {
        const { firstName, lastName, email, mobile, gender, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).render('signup', { 
                error: 'Passwords do not match',
                formData: { firstName, lastName, email, mobile, gender }
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render('signup', { 
                error: 'Email already registered',
                formData: { firstName, lastName, email, mobile, gender }
            });
        }

        const user = new User({
            firstName,
            lastName,
            email,
            mobile,
            gender,
            password
        });

        await user.save();

        
        
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
        
        res.redirect('/');
    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            for (let field in error.errors) {
                validationErrors[field] = error.errors[field].message;
            }
            
            return res.status(400).render('signup', {
                error: 'Please fix the following errors:',
                validationErrors,
                formData: req.body
            });
        }

        res.status(500).render('signup', { 
            error: 'Something went wrong. Please try again.',
            formData: req.body
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).render('index', { 
                error: 'Invalid email or password',
                formData: { email }
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).render('index', { 
                error: 'Invalid email or password',
                formData: { email }
            });
        }

        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };


        req.session.userId = user._id;
        res.redirect('/welcome');
    } catch (error) {
        res.status(500).render('index', { 
            error: 'Something went wrong. Please try again.',
            formData: req.body
        });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
};

module.exports = {
    signup,
    login,
    logout
}; 