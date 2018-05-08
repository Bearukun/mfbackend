var expect = require("chai").expect;
var request = require("request");
var http = require("http");
var app = require('../app');
var server;
var TEST_PORT = 3456;

before(function (done) {
  var app = require('../app');
  server = http.createServer(app);
  server.listen(TEST_PORT, function () {
    done();
  });
})
after(function (done) {
  server.close();
  done();
})

//Test signin
describe("POST: /api/signin ", function () {
  var options = {
    url: "http://localhost:" + TEST_PORT + "/api/signin",
    method: "POST",
    json: true,
    body: {
      email: "bearukun@gmail.com",
      password: "hej"
    }
  }

  it("should be a success", function () {
    request(options, function (error, res, body) {
      var success = body.success;
      expect(success).to.be.true;
    });
  })
  it("should get a token", function () {
    request(options, function (error, res, body) {
      expect(res.body.token).to.have.string('JWT')
    });
  })
  it("should get a username", function () {
    request(options, function (error, res, body) {
      expect(body.username).to.be.equal("Bear");
    });
  })
});

//Test verify
describe("GET: /api/verify ", function () {
  var options = {
    url: "http://localhost:" + TEST_PORT + "/api/verify/U3KJ9duu4lpzO6XpkT7QZbotjMuNczuD",
    method: "GET"
  }

  it("should already be verified", function () {
    request(options, function (error, res, body) {
      expect(res.body).to.have.string('already')
    });
  })
});

//Test stats
describe("GET: /api/stats/Exhibat ", function () {
  var options = {
    url: "http://localhost:" + TEST_PORT + "/api/stats/Exhibat",
    method: "GET",
    headers: {Authorization: "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJlYXJ1a3VuQGdtYWlsLmNvbSIsImlhdCI6MTUyNTA3Njg1N30.duBYsnUBWK1slstqvzUc3szqzeHfiMx074Pcztz36L0"}
  }
  it("should get a success true when retriving stats for Exhibat", function () {
    request(options, function (error, res, body) {
      var answer = JSON.parse(body)
      expect(answer.success).to.be.true;
    });
  })
});
