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
/*
// Example Positive Testcase :
// API: /add_user
// Input: {id: 5, name: 'John Doe', dob: '2020-02-20'}
// Expect: res.status == 200 and res.body.message == 'Success'
// Result: This test case should pass and return a status 200 along with a "Success" message.
// Explanation: The testcase will call the /add_user API with the following input
// and expects the API to return a status of 200 along with the "Success" message.



describe('Testing Add User API', () => {
    it('positive : /register. Checking creating new user.', done => {
      chai
        .request(server)
        .post('/register')
        .type('form')
        .send({username: 'John Doe', password: 'TestPassword123!'})
        .end((err, res) => {
          expect(res).to.have.status(200); //checks response status is 200
          expect(res.redirects[0]).to.include('/login'); //checks that it redirects to the login page
          done();
        });
    });



  // Example Negative Testcase :
  // API: /add_user
  // Input: {id: 5, name: 10, dob: '2020-02-20'}
  // Expect: res.status == 400 and res.body.message == 'Invalid input'
  // Result: This test case should pass and return a status 400 along with a "Invalid input" message.
  // Explanation: The testcase will call the /add_user API with the following invalid inputs
  // and expects the API to return a status of 400 along with the "Invalid input" message.
  it("Negative : /register. Checking duplicate username.", (done) => {
    chai
      .request(server)

      .post('/register')
    .type('form')
      .send({username: 'John Doe', password: 'TestPassword321!'})

      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.status).to.equal("error");
        expect(res.body.message).to.match(/username already exists/i);
        done();
      });
  });
});

// ********************************************************************************

describe("Testing User Login User API", () => {
  it("positive : /login. Checking letting user log in.", (done) => {
    chai
      .request(server)
login')
      .type('form')
      .send({username: 'John Doe', password: 'TestPassword123!'})

      .end((err, res) => {
        expect(res).to.have.status(200); //checks response status is 200
        expect(res.redirects[0]).to.include("/home"); //checks that it redirects to the login page
        done();
      });
  });



// Example Negative Testcase :
// API: /add_user
// Input: {id: 5, name: 10, dob: '2020-02-20'}
// Expect: res.status == 400 and res.body.message == 'Invalid input'
// Result: This test case should pass and return a status 400 along with a "Invalid input" message.
// Explanation: The testcase will call the /add_user API with the following invalid inputs
// and expects the API to return a status of 400 along with the "Invalid input" message.
it('Negative : /login. Checking incorrect passowrd.', done => {
  chai
    .request(server)
    .post('/login')
  .type('form')
    .send({username: 'John Doe', password: 'TestPassword124'})
    .end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.text).to.include('Incorrect username or password');
      done();
    });
});
});
// ********************************************************************************

