// ********************** Initialize server **********************************

const server = require("../src/index"); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require("chai"); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

const pgp = require("pg-promise")();
const db = pgp({
  host: "db",
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// a helper so we don’t duplicate usernames on repeated test runs
const TEST_USER = "mocha_test_user";

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe("Server!", () => {
  // Sample test case given to test / endpoint.
  it("Returns the default welcome message", (done) => {
    chai
      .request(server)
      .get("/welcome")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals("success");
        assert.strictEqual(res.body.message, "Welcome!");
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe("POST /register", () => {
  // ---- clean DB before and after the suite so tests are repeatable
  before(async () => {
    await db.none("DELETE FROM users WHERE username = $1", [TEST_USER]);
  });
  after(async () => {
    await db.none("DELETE FROM users WHERE username = $1", [TEST_USER]);
    server.close(); // shuts the HTTP server so `npm test` exits
    pgp.end(); // closes pg‑promise pool
  });

  // ---------- Positive case ---------------------------------------
  it("creates a new user when given valid data", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({ username: TEST_USER, password: "Secret123!" })
      .end(async (err, res) => {
        if (err) return done(err);

        // 1. HTTP contract
        expect(res).to.have.status(200);
        expect(res.body.status).to.equal("success");

        // 2. Database side‑effect
        const row = await db.oneOrNone(
          "SELECT username FROM users WHERE username = $1",
          [TEST_USER]
        );
        expect(row).to.not.be.null;
        expect(row.username).to.equal(TEST_USER);

        done();
      });
  });

  // ---------- Negative case ---------------------------------------
  it("rejects registration when username is missing", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({ password: "whatever" }) // <-- invalid payload
      .end((err, res) => {
        if (err) return done(err);

        expect(res).to.have.status(400);
        expect(res.body.status).to.equal("error");
        expect(res.body.message).to.match(/missing/i);

        done();
      });
  });
});
// ********************************************************************************
