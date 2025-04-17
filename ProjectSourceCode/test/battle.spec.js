/*
// test/battle.spec.js

const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const { expect } = chai;

const bcrypt = require("bcryptjs");
const pgp = require("pg-promise")();
const db = pgp({
  host: "db",
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Import your server (assumes it exports the app instance)
const server = require("../src/index");

// Define a test user for these tests.
const testUser = {
  username: "battleTester",
  password: "testpass123",
};

describe("Battle Arena Access", () => {
  let agent;

  before(async () => {
    // Clean up any old test data.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    // Create the test user with a hashed password.
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.none(
      "INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100)",
      [testUser.username, hashedPassword]
    );
    // Ensure there are no decks for this user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);
  });

  beforeEach(() => {
    // Create an agent for handling session cookies.
    agent = chai.request.agent(server);
    // Log in with the agent.
    return agent
      .post("/login")
      .type("form")
      .send({ username: testUser.username, password: testUser.password });
  });

  afterEach(() => {
    agent.close();
  });

  after(async () => {
    // Clean up by removing the test user.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
  });

  it("should redirect to deck builder when no decks are assigned", async () => {
    // When there are no decks, accessing /battle should redirect.
    const res = await agent.get("/battle");
    // The agent follows redirects automatically, so we check the redirects array.
    expect(res.redirects).to.be.an("array");
    expect(res.redirects[res.redirects.length - 1]).to.include("/deckBuilder");
  });
});

describe("Battle Initiation With Deck", () => {
  let agent;
  let deckId;

  before(async () => {
    // Ensure test user exists.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.none(
      "INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100)",
      [testUser.username, hashedPassword]
    );
    // Clean up any previous decks for the user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);

    // Insert a dummy deck for this user.
    // For simplicity, assign card IDs as 1,2,3,4,5 (make sure these exist in your cards table).
    const deck = await db.one(
      "INSERT INTO decks (card1_id, card2_id, card3_id, card4_id, card5_id) VALUES (1,2,3,4,5) RETURNING id"
    );
    deckId = deck.id;
    await db.none(
      "INSERT INTO userToDecks (username_id, deck_id) VALUES ($1, $2)",
      [testUser.username, deckId]
    );
    await db.none(
      "INSERT INTO deck_meta (deck_id, username_id, name) VALUES ($1, $2, 'Test Deck')",
      [deckId, testUser.username]
    );
  });

  beforeEach(() => {
    agent = chai.request.agent(server);
    return agent
      .post("/login")
      .type("form")
      .send({ username: testUser.username, password: testUser.password });
  });

  afterEach(() => {
    agent.close();
  });

  after(async () => {
    // Clean up: remove the deck and test user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);
    await db.none("DELETE FROM decks WHERE id = $1", [deckId]);
    await db.none("DELETE FROM deck_meta WHERE deck_id = $1", [deckId]);
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
  });

  it("should render the battle page if a deck exists", async () => {
    const res = await agent.get("/battle");
    // In this case, we expect no redirection to deck builder.
    expect(res.redirects)
      .to.be.an("array")
      .that.satisfies((arr) =>
        arr.every((url) => !url.includes("/deckBuilder"))
      );
    // Optionally verify that content from battle.hbs (e.g., "Battle Arena") appears in res.text.
    expect(res.text).to.include("Battle Arena");
  });
});
*/
// test/battle.spec.js

const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const { expect } = chai;

const bcrypt = require("bcryptjs");
const pgp = require("pg-promise")();
const db = pgp({
  host: process.env.HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Import your server (assumes it exports the app instance)
const server = require("../src/index");

// Define a test user for these tests.
const testUser = {
  username: "battleTester",
  password: "testpass123",
};

describe("Battle Arena Access", () => {
  let agent;

  before(async () => {
    // Clean up any old test data.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    // Create the test user with a hashed password.
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.none(
      "INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100)",
      [testUser.username, hashedPassword]
    );
    // Ensure there are no decks for this user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);
  });

  beforeEach(() => {
    // Create an agent for handling session cookies.
    agent = chai.request.agent(server);
    // Log in with the agent.
    return agent
      .post("/login")
      .type("form")
      .send({ username: testUser.username, password: testUser.password });
  });

  afterEach(() => {
    agent.close();
  });

  after(async () => {
    // Clean up by removing the test user.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
  });

  it("should redirect to deck builder when no decks are assigned", async () => {
    // When there are no decks, accessing /battle should redirect.
    const res = await agent.get("/battle");
    // The agent follows redirects automatically, so we check the redirects array.
    expect(res.redirects).to.be.an("array");
    expect(res.redirects[res.redirects.length - 1]).to.include("/deckBuilder");
  });
});

describe("Battle Initiation With Deck", () => {
  let agent;
  let deckId;

  before(async () => {
    // Ensure test user exists.
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.none(
      "INSERT INTO users (username, password, overall, trophies, money) VALUES ($1, $2, 0, 0, 100)",
      [testUser.username, hashedPassword]
    );
    // Clean up any previous decks for the user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);

    // Insert a dummy deck for this user.
    // For simplicity, assign card IDs as 1,2,3,4,5 (make sure these exist in your cards table).
    const deck = await db.one(
      "INSERT INTO decks (card1_id, card2_id, card3_id, card4_id, card5_id) VALUES (1,2,3,4,5) RETURNING id"
    );
    deckId = deck.id;
    await db.none(
      "INSERT INTO userToDecks (username_id, deck_id) VALUES ($1, $2)",
      [testUser.username, deckId]
    );
    await db.none(
      "INSERT INTO deck_meta (deck_id, username_id, name) VALUES ($1, $2, 'Test Deck')",
      [deckId, testUser.username]
    );
  });

  beforeEach(() => {
    agent = chai.request.agent(server);
    return agent
      .post("/login")
      .type("form")
      .send({ username: testUser.username, password: testUser.password });
  });

  afterEach(() => {
    agent.close();
  });

  after(async () => {
    // Clean up: remove the deck and test user.
    await db.none("DELETE FROM userToDecks WHERE username_id = $1", [
      testUser.username,
    ]);
    await db.none("DELETE FROM decks WHERE id = $1", [deckId]);
    await db.none("DELETE FROM deck_meta WHERE deck_id = $1", [deckId]);
    await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
  });

  it("should render the battle page if a deck exists", async () => {
    const res = await agent.get("/battle");
    // In this case, we expect no redirection to deck builder.
    expect(res.redirects)
      .to.be.an("array")
      .that.satisfies((arr) =>
        arr.every((url) => !url.includes("/deckBuilder"))
      );
    // Optionally verify that content from battle.hbs (e.g., "Battle Arena") appears in res.text.
    expect(res.text).to.include("Battle Arena");
  });
});
