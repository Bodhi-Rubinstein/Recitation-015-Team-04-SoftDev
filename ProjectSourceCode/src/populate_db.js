/*
HOW TO TEST DB:
- run docker-compose up
- in separate terminal, run docker exec -it projectsourcecode-db-1 /bin/bash
- inside docker container, run psql -U $POSTGRES_USER -d $POSTGRES_DB
- inside psql, run SELECT * FROM nbaPlayers;
- inside psql, run SELECT * FROM cards;
*/

const fs = require('fs');
const csv = require('csv-parser');
const pgp = require('pg-promise')();

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
      console.log('Database connection successful (populate DB)'); // you can view this message in the docker compose logs
      obj.done(); // success, release the connection;
    })
    .catch(error => {
      console.log('ERROR:', error.message || error);
    });



//query to turn nba players into cards and add id pairing to nbaPlayersToCards table
//calculates attack from pts and ast, calculate defense from reb, and health from player_height * player_weight / 100
//overall is the average of attack, defense, and health
//special_move is false
async function create_cards_from_players() {
  console.log('Creating cards from players...');
  try {
    const players = await db.any('SELECT * FROM nbaPlayers');

    for (const player of players) { //iterate through each nba player 
      //console.log('Processing player:', player.player_name);
      if (player.league == 'NBA') { //only process players in the NBA
        const attack = Math.round(player.pts) + Math.round(player.ast); //attack = points + assists
        const defense = Math.round(player.reb); //defense = rebounds
        const health = Math.round((Math.round(player.player_height) * Math.round(player.player_weight)) / 100); //health = height * weight / 100
        const overall = Math.round((Math.round(attack) + Math.round(defense) + (Math.round(health)*0.05)) / 3); //overall = average of attack, defense, and health, but with health adjusted to only 5%.
      }
      else if (player.league == 'WNBA') { //if the player is in the WNBA, use different calculations
        const attack = Math.round(Math.round(player.pts)*1.5 + Math.round(player.ast)*2); //attack = points*1.5 + assists*2
        const defense = Math.round(Math.round(player.reb)*1.25); //defense = rebounds*1.25
        const health = Math.round((Math.round(player.player_height) * Math.round(player.player_weight)) / 70); //health = height * weight / 70
        const overall = Math.round((Math.round(attack) + Math.round(defense) + (Math.round(health)*0.05)) / 2.75); //overall = adjusted average of attack, defense, and health, but with health adjusted to only 5%.
      }
      // insert each card and return card
      let card = await db.one(
        `INSERT INTO cards (name, sport, attack, defense, health, overall, special_move)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        [player.player_name, 'basketball', attack, defense, health, overall, false]
      );

      // nbaPlayersToCards mapping for each player_id to card_id
      await db.none(
        `INSERT INTO nbaPlayersToCards (player_id, card_id) VALUES ($1, $2)`,
        [player.id, card.id]
      );
    }

    console.log('Cards and player-card mappings inserted');
  } catch (err) {
    console.error('Error:', err);
  }
}    
async function populate_db() {
  let filePath = 'src/resources/csv/nba_players_200.csv';

  // variable to hold the promises for each insert and ensure they finish before moving to cards
  let insertPromises = [];
  // read the CSV file. Had to install node.js csv-parser package for server side reading
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => { // for each row in the csv file
      //define query values
        const values = [
          row.player_name,
          row.league,
          row.team_abbreviation,
          parseInt(row.age),
          parseFloat(row.player_height),
          parseFloat(row.player_weight),
          row.college,
          row.country,
          parseInt(row.draft_year),
          parseInt(row.draft_round),
          parseInt(row.draft_number),
          parseInt(row.gp),
          parseFloat(row.pts),
          parseFloat(row.reb),
          parseFloat(row.ast),
          parseFloat(row.net_rating),
          parseFloat(row.oreb_pct),
          parseFloat(row.dreb_pct),
          parseFloat(row.usg_pct),
          parseFloat(row.ts_pct),
          parseFloat(row.ast_pct),
          row.season
        ];
        
        //define the query to insert a row into the nbaPlayers table
        const query = `INSERT INTO nbaPlayers (player_name, league, team_abbreviation, age, player_height, player_weight, college, country, draft_year, draft_round, draft_number, gp, pts, reb, ast, net_rating, oreb_pct, dreb_pct, usg_pct, ts_pct, ast_pct, season)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
        
        // insert the row into the database

        //push the promise to the array in order to wait for all inserts to finish before moving to cards
        insertPromises.push(
          db.none(query, values).catch((err) => console.error('Insert error:', err.message))
        );
      })
    .on('end', async () => {
      console.log('CSV file finished reading. Waiting for all inserts...');
      try{
        //wait for all insert promises to finish
        await Promise.all(insertPromises);
        console.log('All rows inserted successfully');
        //create cards from players
        await create_cards_from_players();
      } catch (err) {
        console.error('Error inserting rows:', err.message);
      }
      console.log('Database Populated!');
    }
  );
}

//async function to check if the database is already populated
//if not, populate it
//this is run when the server starts, i.e. docker compose up
(async () => {
  try {
    //query database to check if there are any players. (no params to query and transforms result to a number)
    const playerCount = await db.one('SELECT COUNT(*) FROM nbaPlayers', [], r => +r.count);

    //check if the database is already populated
    if (playerCount>0) {
      console.log('Database already populated. Skipping import.');
      return;
    }

    //if the database is empty, populate it
    populate_db();

  } catch (err) {
    console.error('Error checking or populating database:', err.message);
  }
})();
