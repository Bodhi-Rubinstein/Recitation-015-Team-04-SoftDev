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
app.use("/resources", express.static(path.join(__dirname, "resources")));

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

const hbs = engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views", "layouts"),
  partialsDir: path.join(__dirname, "views", "partials"),
  helpers: {
    eq: (a, b) => a === b, // ← makes {{#if (eq x y)}} work
  },
});

app.engine("hbs", hbs);
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

app.use("/resources", express.static(__dirname + "/resources"));

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.get("/trade", (req, res) => {
  res.render("pages/trade");
});

//Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  let userSearchQuery = `SELECT * FROM users WHERE username = $1;`;

  try {
    const user = await db.oneOrNone(userSearchQuery, [username]);
    if (!user) {
      //if user DNE
      return res.render("pages/register", {
        message: "Username does not exist. Please make an account.",
      });
    }
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      //if match == 1
      req.session.user = user;
      req.session.save(); //save and redirect
      return res.redirect("/home"); //returns up here so no infinite loop
    } else {
      //render login again
      res.status(400).render('pages/login', { message: 'Incorrect username or password' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Register
app.post("/register", async (req, res) => {


  const { username, password } = req.body;
  // Validate password
  /*const passwordError = validatePassword(password);
  if (passwordError) {
    return res.render("pages/register", { message: passwordError }); 
  }*/
  if (!username || !password) {
    if (req.accepts("json")) {
      // test client hits this branch
      return res
        .status(400)
        .json({ status: "error", message: "Missing field" });
    }
    return res.redirect("/register"); // browser
  }

  const hash = await bcrypt.hash(password, 10);

  let userInsertQuery = `INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100) RETURNING username;`;
  let usernameCheckQuery = `SELECT * FROM users WHERE username = $1;`;
  // Check if the username already exists
  const existingUser = await db.oneOrNone(usernameCheckQuery, [username]);

  if (existingUser) {
    return res.render("pages/register", {
      message: "Username already exists. Please choose another one.",
    });
  }

  try {
    await db.one(userInsertQuery, [username, hash]);

    // Initialize the user with zero cards in cardsToUsers
    //let initCardsQuery = `INSERT INTO cardsToUsers (username_id, card_id) VALUES ($1, 0);`;
    let initCardsQuery = `INSERT INTO cardsToUsers (username_id, card_id) VALUES ($1, 138), ($1, 198), ($1, 197), ($1, 183), ($1, 181);`;
    await db.none(initCardsQuery, [username]);
    /*
    if (req.accepts("json")) {
      return res
        .status(200)
        .json({ status: "success", message: "User created" });
    }*/

    return res.redirect("/login"); // Redirect to login after successful registration
  } catch (error) {
    console.error(error);
    if (req.accepts("json")) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    return res.redirect("/register"); // Stay on register page if error occurs

  }
  });

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect("/login");
  }
  next();
};

// Authentication Required
app.use(auth);

app.get("/openPack", (req, res) => {
  res.render("pages/openPack");
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
app.post("/open-pack", auth, async (req, res) => {
  const username = req.session.user.username; //get username for cardsToUsers

  try {
    const userQuery = `SELECT money FROM users WHERE username = $1;`; //get money
    const user = await db.one(userQuery, [username]); //return 1 line with this query

    if (user.money >= 100) {
      const updateMoneyQuery = `UPDATE users SET money = money - 100 WHERE username = $1;`; //subtract money
      await db.none(updateMoneyQuery, [username]);

      //get 5 random cards
      const randomCardsQuery = `SELECT id, name 
        FROM cards 
        ORDER BY RANDOM() 
        LIMIT 5;
      `;
      const randomCards = await db.any(randomCardsQuery);

      const values = randomCards
        .map((card) => `('${username}', ${card.id})`) //make an array of these pairs in values
        .join(", "); //make a single string

      const insertCardsQuery = `
        INSERT INTO cardsToUsers (username_id, card_id)
        VALUES ${values};
      `;
      await db.none(insertCardsQuery);

      // Respond with success and the pack contents
      res.json({
        success: true,
        message: "Pack opened successfully!",
        packContents: randomCards.map((card) => card.name), // Send back the names of the cards
      });
    } else {
      res.json({
        success: false,
        message: "You do not have enough money to open a pack.",
      });
    }
  } catch (error) {
    console.error("Error opening pack:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
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
      SELECT c.id, c.name, c.sport, c.attack, c.defense, c.health, c.overall
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

app.get('/leaderboard', async(req, res) => {
  try {
    const leaderboardQuery = `
  WITH best_cards AS (
  SELECT
    u.username AS name,
    u.trophies AS battles_won,
    c.name AS best_player,
    c.overall AS best_player_rank,
    ROW_NUMBER() OVER (
      PARTITION BY u.username
      ORDER BY c.overall DESC  
    ) AS card_rank
  FROM users u
  INNER JOIN cardsToUsers cu ON cu.username_id = u.username
  INNER JOIN cards c ON c.id = cu.card_id
)
SELECT *
FROM best_cards
WHERE card_rank = 1
ORDER BY battles_won DESC, best_player_rank ASC
LIMIT 10;
`;
 
    const leaders = await db.any(leaderboardQuery);
    let current_rank = 1
    leaders.forEach(leader => {
      leader.rank = current_rank;
      current_rank = current_rank + 1;
    })

    
    res.render("pages/leaderboard", { leaders });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading leaderboard");
  }

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
  const { card1, card2, card3, card4, card5, deckName } = req.body;
  const username = req.session.user.username;

  // prevent duplicate cards server‑side
  const picked = [card1, card2, card3, card4, card5];
  if (new Set(picked).size !== 5) {
    return res.status(400).send("Duplicate cards in deck");
  }

  try {
    // 1. create the deck
    const deck = await db.one(
      `INSERT INTO decks (card1_id, card2_id, card3_id, card4_id, card5_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      picked
    );

    // 2. link it to the user
    await db.none(
      `INSERT INTO userToDecks (username_id, deck_id) VALUES ($1,$2)`,
      [username, deck.id]
    );

    // 3. save (or auto‑generate) a friendly name
    const name =
      deckName?.trim() ||
      `Deck ${await db
        .one(`SELECT COUNT(*) FROM userToDecks WHERE username_id = $1`, [
          username,
        ])
        .then((r) => r.count)}`;

    await db.none(
      `INSERT INTO deck_meta (deck_id, username_id, name)
       VALUES ($1,$2,$3)`,
      [deck.id, username, name]
    );

    res.redirect("/collection");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating deck");
  }
});

// GET /battle – Render the battle selection page.
app.get("/battle", auth, async (req, res) => {
  const username = req.session.user.username;
  const decks = await db.any(
    `SELECT d.deck_id, m.name
       FROM userToDecks d
       JOIN deck_meta m ON d.deck_id = m.deck_id
      WHERE d.username_id = $1
      ORDER BY d.deck_id`,
    [username]
  );
  res.render("pages/battle", { decks });
});

// POST /battle/start – Start a battle (using your saved deck against a bot).
app.post("/battle/start", auth, async (req, res) => {
  const { type: battleType, deck_id } = req.body;
  const username = req.session.user.username;

  try {
    // make sure that deck belongs to this user
    const ok = await db.oneOrNone(
      `SELECT 1 FROM userToDecks WHERE username_id=$1 AND deck_id=$2`,
      [username, deck_id]
    );
    if (!ok) return res.status(400).send("Deck not found");

    const userDeck = await db.one("SELECT * FROM decks WHERE id=$1", [deck_id]);
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

// index.js  (add after POST /battle/start)

app.get("/battle/play/:deckId", auth, async (req, res) => {
  const username = req.session.user.username;
  const deckId = req.params.deckId;

  // security: make sure this deck belongs to the user
  const ok = await db.oneOrNone(
    `SELECT 1 FROM userToDecks WHERE username_id=$1 AND deck_id=$2`,
    [username, deckId]
  );
  if (!ok) return res.redirect("/battle");

  const deck = await db.one("SELECT * FROM decks WHERE id=$1", [deckId]);
  const cardIds = [
    deck.card1_id,
    deck.card2_id,
    deck.card3_id,
    deck.card4_id,
    deck.card5_id,
  ];
  const userCards = await db.any("SELECT * FROM cards WHERE id IN ($1:csv)", [
    cardIds,
  ]);
  const botCards = await db.any(
    "SELECT * FROM cards ORDER BY RANDOM() LIMIT 5"
  );

  res.render("pages/battlePlay", {
    userCards: JSON.stringify(userCards),
    botCards: JSON.stringify(botCards),
    username,
  });
});

// receive final result so you still update DB / trophies
app.post("/battle/finish", auth, async (req, res) => {
  const { userScore, botScore, logs } = req.body;
  const username = req.session.user.username;
  try {
    await battle.recordFinishedBattle(username, userScore, botScore, logs, db);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
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
/*
function validatePassword(password){
  const isNonWhiteSpace = /^\S*$/;
  if (!isNonWhiteSpace.test(password)) {
    return "Password must not contain Whitespaces.";
  }

  const isContainsUppercase = /^(?=.*[A-Z]).*$/;
  if (!isContainsUppercase.test(password)) {
    return "Password must have at least one Uppercase Character.";
  }

  const isContainsLowercase = /^(?=.*[a-z]).*$/;
  if (!isContainsLowercase.test(password)) {
    return "Password must have at least one Lowercase Character.";
  }

  const isContainsNumber = /^(?=.*[0-9]).*$/;
  if (!isContainsNumber.test(password)) {
    return "Password must contain at least one Digit.";
  }

  const isContainsSymbol =
    /^(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹]).*$/;
  if (!isContainsSymbol.test(password)) {
    return "Password must contain at least one Special Character.";
  }

  const isValidLength = /^.{8,16}$/;
  if (!isValidLength.test(password)) {
    return "Password must be 8-16 Characters Long.";
  }

  return null;
}
*/

app.post("/trades", async (req, res) => {
  try {
    const { card1_id, card2_id } = req.body;
    // get owner and name info for both cards
    const card1Info = await db.query(
      `SELECT u.username, c.name
         FROM cardsToUsers cu
         JOIN users u ON cu.username_id = u.username
         JOIN cards c ON cu.card_id = c.id
         WHERE cu.card_id = $1`,
      [card1_id]
    );
    const card2Info = await db.query(
      `SELECT u.username, c.name
         FROM cardsToUsers cu
         JOIN users u ON cu.username_id = u.username
         JOIN cards c ON cu.card_id = c.id
         WHERE cu.card_id = $1`,
      [card2_id]
    );

    // validates both cards
    if (!card1Info.length || !card2Info.length) {
      return res
        .status(404)
        .json({ error: "One or both cards not found or not owned." });
    }
    const card1_owner = card1Info[0].username;
    const card2_owner = card2Info[0].username;
    const card1_name = card1Info[0].name;
    const card2_name = card2Info[0].name;

    // Insert into trades table
    await db.query(
      `INSERT INTO trades (card1_id, card2_id, card1_owner, card2_owner)
         VALUES ($1, $2, $3, $4)`,
      [card1_id, card2_id, card1_owner, card2_owner]
    );

    res.status(201).json({
      message: "Trade offer sent!",
      trade: {
        offer: card1_name,
        request: card2_name,
        card1_owner,
        card2_owner,
        card1_id,
        card2_id,
        status: "Pending",
      },
    });
  } catch (err) {
    console.error(err);
    //res.status(500).send("Server error");
    res.status(500).json({ error: "Server error" });
  }
});

//this ensures that everytime the user loads into the page, the trades are ran
app.get("/trades/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const result = await db.query(
      "SELECT * FROM trades WHERE card1_owner = $1 OR card2_owner = $1",
      [username]
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    //res.status(500).send("Server error");
    res.status(500).json({ error: "Server error" });
  }
});


// in order to get the actaul player stats for the buttons in colections tab not just the game moves
app.get("/player/details/:id", auth, async (req, res) => {
  const cardId = req.params.id;
  try {
    const query = `
      SELECT 
        c.id AS card_id,
        c.name AS card_name,
        c.sport,
        c.attack,
        c.defense,
        c.health,
        c.overall,
        nb.id AS nba_id,
        nb.player_name,
        nb.team_abbreviation,
        nb.age,
        nb.player_height,
        nb.player_weight,
        nb.college,
        nb.country,
        nb.draft_year,
        nb.draft_round,
        nb.draft_number,
        nb.gp,
        nb.pts,
        nb.reb,
        nb.ast,
        nb.net_rating,
        nb.oreb_pct,
        nb.dreb_pct,
        nb.usg_pct,
        nb.ts_pct,
        nb.ast_pct,
        nb.season
      FROM cards c
      LEFT JOIN nbaPlayersToCards np2c ON c.id = np2c.card_id
      LEFT JOIN nbaPlayers nb ON np2c.player_id = nb.id
      WHERE c.id = $1;
    `;
    const result = await db.oneOrNone(query, [cardId]);
    if (!result) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving player details" });
  }
});


app.post("/trades/:tradeId/accept", async (req, res) => {
  try {
    const { tradeId } = req.params;
    const tradeResult = await db.query("SELECT * FROM trades WHERE id = $1", [
      tradeId,
    ]);


    if (!tradeResult.length) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const { card1_id, card2_id, card1_owner, card2_owner } = tradeResult[0];
    // swaps the ownership of cards in the cardsToUsers table
    await db.query(
      "UPDATE cardsToUsers SET username_id = $1 WHERE card_id = $2 AND username_id = $3",
      [card2_owner, card1_id, card1_owner]
    );
    await db.query(
      "UPDATE cardsToUsers SET username_id = $1 WHERE card_id = $2 AND username_id = $3",
      [card1_owner, card2_id, card2_owner]
    );
    // removes the trade from the trades table
    await db.query("DELETE FROM trades WHERE id = $1", [tradeId]);
    res
      .status(200)
      .json({ message: "Trade accepted and completed successfully" });
  } catch (err) {
    console.error("Error accepting trade:", err);
    //res.status(500).send("Server error while accepting trade");
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/trades/:tradeId/reject", async (req, res) => {
  try {
    const { tradeId } = req.params;
    await db.query("DELETE FROM trades WHERE id = $1", [tradeId]);
    res.status(200).json({ message: "Trade rejected" });
  } catch (err) {
    console.error(err);
    //res.status(500).send("Server error");
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/trades/:tradeId", async (req, res) => {
  try {
    const tradeId = req.params.tradeId;
    await db.query("DELETE FROM trades WHERE id = $1", [tradeId]);
    res.status(200).json({ message: "Trade removed successfully" });
  } catch (err) {
    console.error(err);
    //res.status(500).send("Server error");\
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/cards", async (req, res) => {
  try {
    const result = await db.query("SELECT id, name FROM cards");
    res.json(result);
  } catch (err) {
    console.error("Error fetching cards:", err);
    res.status(500).send("Server error");
  }
});

// POST /battle/finish  – called via fetch from the browser
app.post("/battle/finish", auth, async (req, res) => {
  const { userScore, botScore, logs } = req.body;
  const username = req.session.user.username;
  try {
    const battleId = await battle.recordFinishedBattle(
      username,
      userScore,
      botScore,
      logs,
      db
    );
    res.json({ ok: true, battleId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /battle/result/:id  – render battleResult.hbs
app.get("/battle/result/:id", auth, async (req, res) => {
  const id = req.params.id;
  const result = await db.one(
    `
      SELECT
        (SELECT username FROM users WHERE id = battles.player1_id) AS player,
        player1_score AS "userScore",
        player2_score AS "botScore",
        CASE WHEN winner_id = 0 THEN 'tie'
             WHEN winner_id = battles.player1_id THEN (SELECT username FROM users WHERE id = winner_id)
             ELSE 'bot' END                            AS winner
      FROM battles
      WHERE id = $1`,
    [id]
  );

  const logs = await db
    .one(`SELECT action_detail FROM battle_logs WHERE battle_id = $1`, [id])
    .then((r) => r.action_detail);

  res.render("pages/battleResult", { result: { ...result, battleLogs: logs } });
});
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
