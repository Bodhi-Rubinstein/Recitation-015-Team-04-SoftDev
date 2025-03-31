// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const { engine } = require('express-handlebars');
// const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************


// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.

app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main', 
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);




// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/', (req, res) => {
    res.redirect('/login'); 
  });
  
  app.get('/login', (req, res) => {
    res.render('pages/login');
  });

app.get('/register', (req, res) => {
    res.render('pages/register');
});

//Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let userSearchQuery = `SELECT * FROM users WHERE username = $1;`;
  
    try {
      const user = await db.oneOrNone(userSearchQuery, [username]);
      if (!user) { //if user DNE
        return res.redirect('/register');
      }
      const match = await bcrypt.compare(password, user.password);
      if (match) { //if match == 1
        req.session.user = user;
        req.session.save(); //save and redirect
        return res.redirect('/home'); //returns up here so no infinite loop
      } 
      else { //render login again
        return res.render('pages/login', { message: 'Incorrect username or password.' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  });
  
  


// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  
  let userInsertQuery = `INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100) RETURNING username;`;

  try {
      await db.one(userInsertQuery, [username, hash]);

      // Initialize the user with zero cards in cardsToUsers
      let initCardsQuery = `INSERT INTO cardsToUsers (username_id, card_id) VALUES ($1, 0);`;
      await db.none(initCardsQuery, [username]);

      return res.redirect('/login'); // Redirect to login after successful registration
  } catch (error) {
      console.error(error);
      return res.redirect('/register'); // Stay on register page if error occurs
  }
});
  

      // Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
      // Default to login page.
      return res.redirect('/login');
    }
    next();
  };
  
//home route (only for authenticated users)
app.get('/home', auth, async (req, res) => {
  const username = req.session.user.username;
  try {
    // Query for the user stats
    const userStats = await db.one('SELECT * FROM users WHERE username = $1', [username]);
    // Render the home page and pass the user stats to the view
    res.render('pages/home', {user: userStats});
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).send('Internal Server Error');
  }
});

  // Authentication Required
  app.use(auth);



app.get('/logout', (req, res) => {
    req.session.destroy();
    return res.render('pages/logout', { message: 'Successfully logged out!' });
});

app.get('/collection', auth, async (req, res) => {
  try {
// get users cards from here once i figure out how to do that 

    res.render('pages/collection'); 
  } catch (error) {
    console.error(error);
    res.status(500).send('error for if there is probles on the server end');
  }
});
      

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');