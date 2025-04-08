DROP TABLE IF EXISTS cards;
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    attack INT NOT NULL,
    defense INT NOT NULL,
    health INT NOT NULL,
    overall INT NOT NULL,
    special_move BOOLEAN NOT NULL
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    overall INT,
    trophies INT,
    money INT
);

DROP TABLE IF EXISTS cardsToUsers;
CREATE TABLE cardsToUsers(
    username_id VARCHAR(255),
    card_id INT NOT NULL 
);

DROP TABLE IF EXISTS battles;
CREATE TABLE battles(
    id SERIAL PRIMARY KEY,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    winner_id INT NOT NULL,
    player1_score INT NOT NULL,
    player2_score INT NOT NULL
);

DROP TABLE IF EXISTS decks;
CREATE TABLE decks(
    id SERIAL PRIMARY KEY,
    card1_id INT NOT NULL,
    card2_id INT NOT NULL,
    card3_id INT NOT NULL,
    card4_id INT NOT NULL,
    card5_id INT NOT NULL
);

DROP TABLE IF EXISTS userToDecks;
CREATE TABLE userToDecks(
    username_id VARCHAR(255),
    deck_id INT NOT NULL
);

DROP TABLE IF EXISTS trades;
CREATE TABLE trades(
    id SERIAL PRIMARY KEY,
    card1_id INT NOT NULL,
    card2_id INT NOT NULL,
    card1_owner VARCHAR(255) NOT NULL,
    card2_owner VARCHAR(255),
    trade_status VARCHAR(20) DEFAULT 'pending'
);

DROP TABLE IF EXISTS cardPacks;
CREATE TABLE cardPacks(
    id SERIAL PRIMARY KEY,
    sport VARCHAR(100) NOT NULL
);

DROP TABLE IF EXISTS transactions; 
CREATE TABLE transactions (

    id SERIAL PRIMARY KEY,
    username_id VARCHAR(200) NOT NULL,
    amount INT NOT NULL, -- + for winning money, - for spending stuff
    transaction_type VARCHAR(50) NOT NULL, --for "win", "puchase", "loss maybe idk" 
    FOREIGN KEY (username_id) REFERENCES users(username)
);

DROP TABLE IF EXISTS battle_logs;
CREATE TABLE battle_logs (

id SERIAL PRIMARY KEY,
battle_id INT NOT NULL,
action_detail TEXT NOT NULL, -- moves made. maybe damage done since its an action based game. 
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- for tracking the sequence of moves
FOREIGN KEY (battle_id) REFERENCES battles(id) --references spef battled
);


DROP TABLE IF EXISTS nbaPlayers;
CREATE TABLE nbaPlayers (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    team_abbreviation VARCHAR(10) NOT NULL,
    age INT NOT NULL,
    player_height FLOAT NOT NULL,
    player_weight FLOAT NOT NULL,
    college VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    draft_year VARCHAR(20) NOT NULL,
    draft_round VARCHAR(20) NOT NULL,
    draft_number VARCHAR(20) NOT NULL,
    gp INT NOT NULL, -- games played
    pts NUMERIC(4,1) NOT NULL, -- average points per game
    reb NUMERIC(4,1) NOT NULL, -- average rebounds per game
    ast NUMERIC(4,1) NOT NULL, -- average assists per game
    net_rating NUMERIC(4,1) NOT NULL, -- net rating
    oreb_pct NUMERIC(4,3) NOT NULL, -- offensive rebound percentage
    dreb_pct NUMERIC(4,3) NOT NULL, -- defensive rebound percentage
    usg_pct NUMERIC(4,3) NOT NULL, -- usage percentage
    ts_pct NUMERIC(4,3) NOT NULL, -- true shooting percentage
    ast_pct NUMERIC(4,3) NOT NULL, -- assist percentage
    season VARCHAR(10) NOT NULL
);

DROP TABLE IF EXISTS nbaPlayersToCards;
CREATE TABLE nbaPlayersToCards (
    player_id INT NOT NULL,
    card_id INT NOT NULL
);