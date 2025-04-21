/*
HOW TO TEST DB:
- run docker-compose up
- in a separate terminal, run: docker exec -it projectsourcecode-db-1 /bin/bash
- inside the container, run: psql -U $POSTGRES_USER -d $POSTGRES_DB
- then:  SELECT * FROM nbaPlayers;  and  SELECT * FROM cards;
*/

const fs = require("fs");
const csv = require("csv-parser");
const pgp = require("pg-promise")();

// -----------------------------------------------------------------------------
// Database configuration
// -----------------------------------------------------------------------------
const dbConfig = {
  host: process.env.HOST, // database server
  port: 5432, // database port
  database: process.env.POSTGRES_DB, // database name
  user: process.env.POSTGRES_USER, // user account
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// -----------------------------------------------------------------------------
// Test initial connection
// -----------------------------------------------------------------------------
db.connect()
  .then((obj) => {
    console.log("Database connection successful (populate DB)");
    obj.done(); // release the connection
  })
  .catch((err) => {
    console.error("Connection error:", err.message || err);
  });

// -----------------------------------------------------------------------------
// Helper­­: build cards from nbaPlayers rows
// -----------------------------------------------------------------------------
async function create_cards_from_players() {
  console.log("Creating cards from players...");
  try {
    const players = await db.any("SELECT * FROM nbaPlayers");

    for (const player of players) {
      const league = player.league?.trim();
      let attack, defense, health, overall;

      if (league === "NBA") {
        attack = Math.round(player.pts) + Math.round(player.ast);
        defense = Math.round(player.reb);
        health = Math.round(
          (player.player_height * player.player_weight) / 100
        );
        overall = Math.round((attack + defense + health * 0.05) / 3);
      } else if (league === "WNBA") {
        attack = Math.round(player.pts * 1.5 + player.ast * 2);
        defense = Math.round(player.reb * 1.25);
        health = Math.round((player.player_height * player.player_weight) / 70);
        overall = Math.round((attack + defense + health * 0.05) / 2.75);
      } else {
        console.log("Unknown league:", player.league);
        continue;
      }

      // Insert card, return its id
      const card = await db.one(
        `INSERT INTO cards (name, sport, attack, defense, health, overall, special_move, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          player.player_name,
          "basketball",
          attack,
          defense,
          health,
          overall,
          false,
          player.image_url,
        ]
      );

      // Map nbaPlayers.id → cards.id
      await db.none(
        `INSERT INTO nbaPlayersToCards (player_id, card_id) VALUES ($1, $2)`,
        [player.id, card.id]
      );
    }

    console.log("Cards and player‑card mappings inserted");
  } catch (err) {
    console.error("create_cards_from_players error:", err);
  }
}

// -----------------------------------------------------------------------------
// Populate database from CSV, then create cards
// -----------------------------------------------------------------------------
async function populate_db() {
  const filePath = "src/resources/csv/nba_wnba_75.csv";
  const insertPromises = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      const values = [
        row.player_name,
        row.league,
        row.team_abbreviation,
        +row.age,
        +row.player_height,
        +row.player_weight,
        row.college,
        row.country,
        +row.draft_year,
        +row.draft_round,
        +row.draft_number,
        +row.gp,
        +row.pts,
        +row.reb,
        +row.ast,
        +row.net_rating,
        +row.oreb_pct,
        +row.dreb_pct,
        +row.usg_pct,
        +row.ts_pct,
        +row.ast_pct,
        row.season,
        row.image_url,
      ];

      const query = `INSERT INTO nbaPlayers
        (player_name, league, team_abbreviation, age, player_height, player_weight,
         college, country, draft_year, draft_round, draft_number, gp, pts, reb, ast,
         net_rating, oreb_pct, dreb_pct, usg_pct, ts_pct, ast_pct, season, image_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                $16,$17,$18,$19,$20,$21,$22,$23)`;

      insertPromises.push(
        db
          .none(query, values)
          .catch((err) => console.error("Insert error:", err.message))
      );
    })
    .on("end", async () => {
      console.log("CSV read complete. Waiting for inserts...");
      try {
        await Promise.all(insertPromises);
        console.log("All rows inserted. Now creating cards…");
        await create_cards_from_players();
      } catch (err) {
        console.error("populate_db error:", err.message);
      }
      console.log("Database populated!");
    });
}

// -----------------------------------------------------------------------------
// If the DB is empty, run populate_db on startup
// -----------------------------------------------------------------------------
(async () => {
  try {
    const playerCount = await db.one(
      "SELECT COUNT(*) FROM nbaPlayers",
      [],
      (r) => +r.count
    );

    if (playerCount > 0) {
      console.log("Database already populated — skipping import.");
    } else {
      populate_db();
    }
  } catch (err) {
    console.error("Startup error:", err.message);
  }
})();
