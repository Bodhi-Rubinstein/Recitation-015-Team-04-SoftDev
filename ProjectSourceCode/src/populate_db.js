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




  let filePath = './resources/csv/nba_players.csv';
  let rows = [];

  // read the CSV file. Had to install node.js csv-parser package for server side reading
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data',(row) => {
      rows.push(row);
    }) // loop through each row in the csv file and push it to the rows array
    .on('end', async () => { 
      console.log("Read ${rows.length} rows from ${filePath}.");
      //define a row object
      try{
        const {player_name,
          team_abbreviation,
          age,
          player_height,
          player_weight,
          college,
          country,
          draft_year,
          draft_round,
          draft_number,
          gp,
          pts,
          reb,
          ast,
          net_rating,
          oreb_pct,
          dreb_pct,
          usg_pct,
          ts_pct,
          ast_pct,
          season
        } = row;

        const query = `INSERT INTO players (player_name, team_abbreviation, age, player_height, player_weight, college, country, draft_year, draft_round, draft_number, gp, pts, reb, ast, net_rating, oreb_pct, dreb_pct, usg_pct, ts_pct, ast_pct, season)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;
        
        // insert the row into the database
        await db.none(query, [player_name, team_abbreviation, age, player_height, player_weight, college, country, draft_year, draft_round, draft_number, gp, pts, reb, ast, net_rating, oreb_pct, dreb_pct, usg_pct, ts_pct, ast_pct, season]);
      } catch (err) {
        console.error('Error inserting data:', err);
      }
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
    }
  );

  //query to turn nba players into cards and add id pairing to nbaPlayersToCards table
  //calculates attack from pts and ast, calculate defense from reb, and health from player_height * player_weight / 100
  //overall is the average of attack, defense, and health
  //special_move is false
  async function create_cards_from_players() {
    try {
      let players = await db.any('SELECT * FROM nbaPlayers');
  
      for (const player of players) { //iterate through each nba player 
        const attack = Math.round(player.pts + player.ast);
        const defense = Math.round(player.reb);
        const health = Math.round(player.player_height * player.player_weight / 100);
        const overall = Math.round((attack + defense + health) / 3);
  
        // insert each card and get its id
        let card = await db.one(
          `INSERT INTO cards (name, sport, attack, defense, health, overall, special_move)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [player.player_name, 'basketball', attack, defense, health, overall, false]
        );
  
        // nbaPlayersToCards mapping
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
  
  create_cards_from_players();