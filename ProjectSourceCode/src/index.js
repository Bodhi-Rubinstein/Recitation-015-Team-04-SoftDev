// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require("express"); // To build an application server or API
const app = express();
const { engine } = require("express-handlebars");
// const Handlebars = require('handlebars');
const path = require("path");
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios"); // To make HTTP requests from our server. We'll learn more about it in Part C.
const battle = require("./resources/js/battle"); // Updated path because battle.js is in src/js/

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: "db", // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.

app.engine(
  "hbs",
  engine({
    extname: "hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"),
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

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

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});



//Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  let userSearchQuery = `SELECT * FROM users WHERE username = $1;`;

  try {
    const user = await db.oneOrNone(userSearchQuery, [username]);
    if (!user) {
      //if user DNE
      return res.render("pages/register", { message: 'Username does not exist. Please make an account.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      //if match == 1
      req.session.user = user;
      req.session.save(); //save and redirect
      return res.redirect("/home"); //returns up here so no infinite loop
    } else {
      //render login again
      return res.render("pages/login", {
        message: "Incorrect username or password.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  let userInsertQuery = `INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100) RETURNING username;`;
  let usernameCheckQuery = `SELECT * FROM users WHERE username = $1;`;
  // Check if the username already exists
  const existingUser = await db.oneOrNone(usernameCheckQuery, [username]);
  
  if(existingUser){
    return res.render('pages/register', { message: 'Username already exists. Please choose another one.' });
  }

  try {
    await db.one(userInsertQuery, [username, hash]);

    // Initialize the user with zero cards in cardsToUsers
    let initCardsQuery = `INSERT INTO cardsToUsers (username_id, card_id) VALUES ($1, 0);`;
    await db.none(initCardsQuery, [username]);

    return res.redirect("/login"); // Redirect to login after successful registration
  } catch (error) {
    console.error(error);
    return res.redirect("/register"); // Stay on register page if error occurs
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
  
// Authentication Required
app.use(auth);

app.get('/openPack', (req, res) => {
  res.render('pages/openPack');
});

//home route (only for authenticated users)
app.get("/home", auth, async (req, res) => {
  const username = req.session.user.username;
  try {
    // Query for the user stats
    const userStats = await db.one("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    // Render the home page and pass the user stats to the view
    res.render("pages/home", { user: userStats });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).send("Internal Server Error");
  }
});

//opening pack
app.post('/open-pack', auth, async (req, res) => {
  const username = req.session.user.username; //get username for cardsToUsers

  try {
    const userQuery = `SELECT money FROM users WHERE username = $1;`; //get money
    const user = await db.one(userQuery, [username]); //return 1 line with this query

    if (user.money >= 100) {
      const updateMoneyQuery = `UPDATE users SET money = money - 100 WHERE username = $1;`; //subtract money
      await db.none(updateMoneyQuery, [username]);

      //get 5 random cards
      const randomCardsQuery = 
        `SELECT id, name 
        FROM cards 
        ORDER BY RANDOM() 
        LIMIT 5;
      `;
      const randomCards = await db.any(randomCardsQuery);

      const values = randomCards
        .map(card => `('${username}', ${card.id})`) //make an array of these pairs in values
        .join(', '); //make a single string

      const insertCardsQuery = `
        INSERT INTO cardsToUsers (username_id, card_id)
        VALUES ${values};
      `;
      await db.none(insertCardsQuery);

      // Respond with success and the pack contents
      res.json({
        success: true,
        message: 'Pack opened successfully!',
        packContents: randomCards.map(card => card.name), // Send back the names of the cards
      });
    } else {
      res.json({
        success: false,
        message: 'You do not have enough money to open a pack.',
      });
    }
  } catch (error) {
    console.error('Error opening pack:', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  }
});



app.get("/logout", (req, res) => {
  req.session.destroy();
  return res.render("pages/logout", { message: "Successfully logged out!" });
});

app.get("/collection", auth, async (req, res) => {
  try {
    const username = req.session.user.username;

    // Query the DB for all cards this user owns
    const userCardsQuery = `
      SELECT c.name, c.sport, c.attack, c.defense, c.health, c.overall
      FROM cards c
      JOIN cardsToUsers cu ON c.id = cu.card_id
      WHERE cu.username_id = $1
    `;
    const userCards = await db.any(userCardsQuery, [username]);

    // Render the collection page, passing in userCards
    res.render("pages/collection", { userCards });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching user cards");
  }
});

// Authentication Required
app.use(auth);
// leaderboard
app.get('/leaderboard', (req, res) => {
  return res.render('pages/leaderboard',
    {
      //dummy data until SQL queries added
      leaders: [
        {
          rank: 1,
          name: "A Team",
          best_player: "Lebron",
          battles_won: 50
        },

        {
          rank: 2,
          name: "B Team",
          best_player: "Serena Williams",
          battles_won: 45
        },
        {
          rank: 3,
          name: "C Team",
          best_player: "Sports Player",
          battles_won: 40
        }
      ]
    }
  )
});
// GET /deckbuilder - Render the deck builder page.
app.get("/deckBuilder", auth, async (req, res) => {
  const username = req.session.user.username; //get username for cardsToUsers
  try {
    const availableCardsQuery = `
    SELECT * 
    FROM cards 
    JOIN cardsToUsers 
    ON cards.id = cardsToUsers.card_id 
    WHERE cardsToUsers.username_id = $1;
  `;    
  // Fetch available cards so the user can choose cards for their deck.
    const availableCards = await db.any(availableCardsQuery, [username]);
    res.render("pages/deckBuilder", { availableCards });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading deck builder.");
  }
});

// POST /deckbuilder - Create a new deck from the selected cards.
app.post("/deckBuilder", auth, async (req, res) => {
  const { card1, card2, card3, card4, card5 } = req.body;
  const username = req.session.user.username;
  try {
    // Insert a new deck record.
    const deckInsertQuery = `
      INSERT INTO decks (card1_id, card2_id, card3_id, card4_id, card5_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING id;
    `;
    const deck = await db.one(deckInsertQuery, [
      card1,
      card2,
      card3,
      card4,
      card5,
    ]);

    // Link the new deck to the current user.
    const userDeckQuery = `INSERT INTO userToDecks (username_id, deck_id) VALUES ($1, $2);`;
    await db.none(userDeckQuery, [username, deck.id]);

    res.redirect("/collection"); // Redirect to a collection or deck overview page.
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating deck.");
  }
});
// GET /battle – Render the battle selection page.
app.get("/battle", auth, (req, res) => {
  res.render("pages/battle", { message: "Select your opponent:" });
});

// POST /battle/start – Start a battle (using your saved deck against a bot).
app.post("/battle/start", auth, async (req, res) => {
  const battleType = req.body.type; // "bot" (human not active yet)
  const username = req.session.user.username;
  try {
    const deckMapping = await db.oneOrNone(
      "SELECT deck_id FROM userToDecks WHERE username_id = $1",
      [username]
    );
    if (!deckMapping) return res.redirect("/deckbuilder");
    const userDeck = await db.one("SELECT * FROM decks WHERE id = $1", [
      deckMapping.deck_id,
    ]);
    const cardIds = [
      userDeck.card1_id,
      userDeck.card2_id,
      userDeck.card3_id,
      userDeck.card4_id,
      userDeck.card5_id,
    ];
    const userCards = await db.any("SELECT * FROM cards WHERE id IN ($1:csv)", [
      cardIds,
    ]);
    let botCards = [];
    if (battleType === "bot") {
      botCards = await db.any("SELECT * FROM cards ORDER BY RANDOM() LIMIT 5");
    } else {
      return res.send("Human vs. human matching coming soon!");
    }
    const battleResult = await battle.simulateBattle(
      userCards,
      botCards,
      username,
      db
    );
    res.render("pages/battleResult", { result: battleResult });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error starting battle.");
  }
});

// GET /testbattle – Display the interactive test battle page.
app.get("/testbattle", (req, res) => {
  if (!req.session.battle) {
    req.session.battle = initializeTestBattle();
  }
  const battleState = req.session.battle;
  // Precompute booleans for view:
  const diceRolled = battleState.currentRound.userMultiplier !== null;
  const roundOver =
    battleState.currentRound.userCurrentHealth <= 0 ||
    battleState.currentRound.botCurrentHealth <= 0;
  res.render("pages/testBattle", {
    battle: battleState,
    diceRolled,
    roundOver,
  });
});

// Helper: Initialize an interactive test battle state using your basketball cards.
function initializeTestBattle() {
  // Use cards from your insert.sql data.
  const userCards = [
    { id: 1, name: "LeBron James", attack: 90, defense: 90, health: 90 },
    { id: 2, name: "Nikola Jokic", attack: 95, defense: 78, health: 90 },
    { id: 3, name: "Steph Curry", attack: 95, defense: 75, health: 90 },
    { id: 4, name: "Kevin Durant", attack: 92, defense: 80, health: 90 },
    { id: 5, name: "Jayson Tatum", attack: 87, defense: 84, health: 90 },
  ];
  const botCards = [
    { id: 6, name: "Donovan Mitchell", attack: 85, defense: 86, health: 90 },
    {
      id: 7,
      name: "Giannis Antetokounmpo",
      attack: 93,
      defense: 78,
      health: 90,
    },
    { id: 8, name: "Luka Doncic", attack: 94, defense: 74, health: 90 },
    { id: 9, name: "Anthony Edwards", attack: 84, defense: 92, health: 90 },
    { id: 10, name: "Joel Embiid", attack: 82, defense: 94, health: 90 },
  ];
  return {
    round: 1,
    userCards,
    botCards,
    userScore: 0,
    botScore: 0,
    currentRound: {
      userCard: userCards[0],
      botCard: botCards[0],
      userCurrentHealth: userCards[0].health,
      botCurrentHealth: botCards[0].health,
      userMultiplier: null,
      botMultiplier: null,
      roundLog: "",
    },
    finalWinner: null,
  };
}

// POST /testbattle/roll – Roll dice for the current round.
app.post("/testbattle/roll", (req, res) => {
  if (!req.session.battle) {
    req.session.battle = initializeTestBattle();
  }
  const battleState = req.session.battle;
  if (!battleState.currentRound.userMultiplier) {
    const userRollData = battle.rollDiceMultiplier();
    const botRollData = battle.rollDiceMultiplier();
    battleState.currentRound.userMultiplier = userRollData.multiplier;
    battleState.currentRound.botMultiplier = botRollData.multiplier;
    battleState.currentRound.roundLog += `Rolled dice: User rolled ${userRollData.roll} (x${userRollData.multiplier}), Bot rolled ${botRollData.roll} (x${botRollData.multiplier}).\n`;
  }
  req.session.battle = battleState;
  res.redirect("/testbattle");
});

// POST /testbattle/attack – Process one attack exchange.
app.post("/testbattle/attack", (req, res) => {
  if (!req.session.battle) {
    req.session.battle = initializeTestBattle();
  }
  const battleState = req.session.battle;
  const current = battleState.currentRound;

  // Only attack if dice were rolled and both cards are alive.
  if (
    current.userMultiplier !== null &&
    current.userCurrentHealth > 0 &&
    current.botCurrentHealth > 0
  ) {
    const userDamage =
      current.userCard.attack *
      current.userMultiplier *
      (1 - current.botCard.defense / 100);
    const botDamage =
      current.botCard.attack *
      current.botMultiplier *
      (1 - current.userCard.defense / 100);
    current.userCurrentHealth -= botDamage;
    current.botCurrentHealth -= userDamage;
    current.roundLog += `Attack: User's ${
      current.userCard.name
    } deals ${userDamage.toFixed(2)} damage; Bot's ${
      current.botCard.name
    } deals ${botDamage.toFixed(2)} damage.\n`;
  }
  req.session.battle = battleState;
  res.redirect("/testbattle");
});

// POST /testbattle/next – End current round, record outcome, and move to next round.
app.post("/testbattle/next", (req, res) => {
  if (!req.session.battle) {
    req.session.battle = initializeTestBattle();
  }
  const battleState = req.session.battle;
  const current = battleState.currentRound;

  // Determine round outcome.
  let roundWinner;
  if (current.userCurrentHealth <= 0 && current.botCurrentHealth <= 0) {
    roundWinner = "tie";
    current.roundLog += "Round ended in a tie.\n";
  } else if (current.userCurrentHealth > 0) {
    roundWinner = "user";
    current.roundLog += `User's ${current.userCard.name} wins the round.\n`;
    battleState.userScore++;
  } else {
    roundWinner = "bot";
    current.roundLog += `Bot's ${current.botCard.name} wins the round.\n`;
    battleState.botScore++;
  }

  // Check if overall battle is over (first to 3 wins).
  if (battleState.userScore === 3 || battleState.botScore === 3) {
    battleState.finalWinner =
      battleState.userScore > battleState.botScore ? "TestUser" : "Bot";
  } else {
    // Move to next round (assuming 5 rounds maximum).
    battleState.round++;
    battleState.currentRound = {
      userCard: battleState.userCards[battleState.round - 1],
      botCard: battleState.botCards[battleState.round - 1],
      userCurrentHealth: battleState.userCards[battleState.round - 1].health,
      botCurrentHealth: battleState.botCards[battleState.round - 1].health,
      userMultiplier: null,
      botMultiplier: null,
      roundLog: "",
    };
  }

  req.session.battle = battleState;
  res.redirect("/testbattle");
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log("Server is listening on port 3000");
