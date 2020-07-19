/*
 * Name: Junguk Lee
 * Date: June 9, 2020
 * Section: CSE 154 AK
 *
 * This is the node.js to create server and send requested information to the
 * client side. This js deals with server side of zoomingo
 */
'use strict';

const express = require('express');
const app = express();

const multer = require('multer');

const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const INVALID_PARAM_ERROR = 400;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = 'Something went wrong on the server, try again later.';
const PORTNUM = 8080;

app.use(express.json()); // built-in middleware

app.use(multer().none());

app.get('/newGame', async function(req, res) {
  let name = req.query.name;
  let size = req.query.size;
  try {
    let playerId = await insertPlayerId(name);
    let gameId = await insertGame();
    let givenScenarios = await chooseScenario(size);
    let jsonForm = formNewGame(playerId, gameId, name, givenScenarios);
    await createBoardID(playerId, gameId, givenScenarios);
    res.json(jsonForm);
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

app.post('/selectScenario', async function(req, res) {
  let gameId = req.body.game_id;
  let selectedId = req.body.scenario_id;

  try {
    gameId = parseInt(gameId);
    selectedId = parseInt(selectedId);

    let originalSql = "SELECT given_scenario_ids,selected_scenario_ids FROM " +
    "game_state WHERE game_id=?";
    let updateSql = "UPDATE game_state SET selected_scenario_ids=? WHERE game_id=?";
    let scenarios = await executeSqlWithOneParam(originalSql, gameId);
    let given = JSON.parse(scenarios["given_scenario_ids"]);
    if (given.includes(selectedId)) {
      let selectedScenario = scenarios["selected_scenario_ids"];
      selectedScenario = JSON.parse(selectedScenario);

      let resultJson = await scenarioJson(selectedScenario, selectedId, gameId, updateSql);
      res.json(resultJson);
    } else {
      let error = {};
      error["error"] = "Could not select scenario ID: " + selectedId;
      res.type('json');
      res.status(INVALID_PARAM_ERROR).send(error);
    }
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

app.post("/bingo", async function(req, res) {
  try {
    let gameId = req.body.game_id;
    let winnerSql = "SELECT winner FROM games WHERE id=?";
    let winnerResult = await executeSqlWithOneParam(winnerSql, gameId);
    let winnerId = winnerResult["winner"];

    if (winnerId === null) {
      let winnerDisplay = await checkWinnng(gameId);
      res.json(winnerDisplay);
    } else {
      let error = {};
      error["error"] = "Game has already been won.";
      res.status(INVALID_PARAM_ERROR).send(error);
    }
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

/**
 * resumtgame endpost which send previous unfinished game to the client-side
 */
app.get("/resumeGame", async function(req, res) {
  let gameId = req.query.game_id;
  let playerId = req.query.player_id;

  gameId = parseInt(gameId);
  playerId = parseInt(playerId);

  let sqlStatement = "SELECT g.given_scenario_ids AS given, g.selected_scenario_ids " +
  "AS selected, p.name, g.player_id FROM game_state AS g JOIN players AS p ON " +
  "g.player_id = p.id where g.game_id=?";
  let result = await executeSqlWithOneParam(sqlStatement, gameId);

  if (result["player_id"] === playerId) {
    let name = result["name"];
    let given = result["given"];
    let givenJson = await convertIntoJson(given);
    let select = result["selected"];
    let jsonForm = formNewGame(playerId, gameId, name, givenJson);
    jsonForm["selected_scenarios"] = select;
    res.json(jsonForm);
  } else {
    let error = {};
    error["error"] = "Cannot resume game: Player " + playerId + " was not part " +
    "of game " + gameId;
    res.status(INVALID_PARAM_ERROR).send(error);
  }
});

/**
 * Select rows which contains the given name and if there exist no row, then we
 * insert new data into players table and then select that row
 * @param {String} name - string object that is given as parameter
 * @returns {String} - the player_id that is collected from players table
 */
async function insertPlayerId(name) {
  let db = await getDBConnection();
  let sqlSt = "SELECT id FROM players WHERE name = ?";
  let sql = await db.all(sqlSt, name);

  if (sql.length === 0) {
    let insert = "INSERT INTO players (name) VALUES (?)";
    await db.run(insert, name);
    let sql2 = await db.all(sqlSt, name);
    await db.close();
    return sql2[0]['id'];
  }
  await db.close();

  return sql[0]['id'];
}

/**
 * Select rows which contains the given name and if there exist no row, then we
 * insert new data into players table and then select that row
 */
async function insertGame() {
  let db = await getDBConnection();
  let insert = "INSERT INTO games (winner) VALUES (NULL)";
  let sql = "SELECT id FROM games ORDER BY id DESC LIMIT 1";
  await db.run(insert);
  let result = await db.all(sql);
  await db.close();

  return result[0]['id'];
}

/**
 * Form choose random scenario for the given time by select one of random data
 * from the scenario table
 * @param {integer} size - integer parameter used to defince the number of scenarios
 */
async function formRandomArray(size) {
  let freeSql = "SELECT text FROM scenarios WHERE id = 1";
  let sql =
  "SELECT text FROM scenarios WHERE id > 1 AND id <= 39 " +
  "ORDER BY RANDOM() LIMIT 1";
  let insertScenario = "INSERT INTO scenarios (text) VALUES (?)";
  let array = [];
  let db = await getDBConnection();
  for (let i = 0; i < size - 1; i++) {
    let rest = await db.all(sql);
    array.push(rest[0]);
  }
  let free = await db.all(freeSql);
  array.push(free[0]);
  for (let i = 0; i < size; i++) {
    await db.run(insertScenario, array[i]["text"]);
  }
  await db.close();
}

/**
 * Using sql statement, execute the database and obtain secarion_id as many as
 * the value of size, then convert them into array list.
 * @param {integer} size - value of board size that is given as parameter
 * @returns {array} array - array lists of integers which refers scenario
 */
async function chooseScenario(size) {
  await formRandomArray(size);
  let selectScenario = "SELECT id, text FROM scenarios ORDER BY " +
  "id DESC LIMIT ?";
  let db = await getDBConnection();
  let results = await db.all(selectScenario, size);
  await db.close();
  return results;
}

/**
 * With the given paramter, make a format which would be used as /newGame
 * endpoints
 * @param {integer} playerId - integer parameter that contains the payer_id
 * @param {integer} gameId - integer parameter that contains the game_id
 * @param {String} name - string parameter that means the name of the player
 * @param {JSON} scenarios - json data contains given scenarios
 * @returns {JSON} - json object that contains data for newGame endpoints
 */
function formNewGame(playerId, gameId, name, scenarios) {
  let jsonForm = {};
  jsonForm["game_id"] = gameId;
  jsonForm["player"] = {
    "id": playerId,
    "name": name,
    "board": scenarios
  };
  return jsonForm;
}

/**
 * If we sucessfully select the scenario then return scenario data and if not,
 * then return error.
 * @param {Array} selectedScenario - the array of all previously selected scenarios
 * @param {integer} selectedId - scenario_id that is newly selected
 * @param {integer} gameId - the integer parameter contains game_id
 * @param {String} updateSql - sql statement that update table
 * @returns {JSON} json object that contains scenario data or error data
 */
async function scenarioJson(selectedScenario, selectedId, gameId, updateSql) {
  let selects = selectedScenario;
  let selectArray = JSON.stringify(selects);
  let resultJson = {};

  resultJson["game_id"] = gameId;
  resultJson["scenario_id"] = selectedId;

  if (!(selectedScenario.includes(selectedId))) {
    selectedScenario.push(selectedId);
    let length = selectedScenario.length;
    let lastElement = selectedScenario[length - 1];
    let db = await getDBConnection();
    selectArray = JSON.stringify(selectedScenario);

    await db.run(updateSql, selectArray, gameId);
    await db.close();
    resultJson["scenario_id"] = lastElement;
  }

  return resultJson;
}

/**
 * With the given parameters, insert new row in the game_state table
 * @param {String} playerId - integer parameter shows the player_id
 * @param {integer} gameId - integer parameter shows the game_id
 * @param {JSON} scenarios - json data contained given scenarios
 */
async function createBoardID(playerId, gameId, scenarios) {
  let db = await getDBConnection();
  let insert =
  "INSERT INTO game_state (game_id, player_id, given_scenario_ids, selected_scenario_ids) " +
  "VALUES (?, ?, ?, ?)";
  let array = [];
  for (let i = 0; i < scenarios.length; i++) {
    let scenarioId = scenarios[i]["id"];
    array.push(scenarioId);
  }

  array = JSON.stringify(array);
  let selected = JSON.stringify([]);
  await db.run(insert, gameId, playerId, array, selected);
  await db.close();
}

/**
 * Find the minimum required number of scenario to win and the actual selected
 * scenarios. Then find whether the player won the game or not
 * @param {integer} gameId - the game_id given as the integer parameter
 * @returns {JSON} - the json information contains the player_id of the winner
 */
async function checkWinnng(gameId) {
  let sql = "SELECT g.given_scenario_ids, g.selected_scenario_ids, g.player_id, " +
  "p.name FROM game_state AS g  JOIN  players AS p ON p.id = g.player_id " +
  "WHERE game_id=?";
  let scenarios = await executeSqlWithOneParam(sql, gameId);
  let given = JSON.parse(scenarios["given_scenario_ids"]);
  let selected = JSON.parse(scenarios["selected_scenario_ids"]);
  let playerId = scenarios["player_id"];
  let name = scenarios["name"];

  let givenLength = given.length;
  let requiredNum = Math.sqrt(givenLength);
  let selectedLength = selected.length;

  let winnerId = {};
  winnerId["game_id"] = gameId;
  if (selectedLength >= requiredNum) {
    winnerId["winner"] = name;
    await updateWinner(gameId, playerId);
  } else {
    winnerId["winner"] = null;
  }
  return winnerId;
}

/**
 * update the winner's player ID in the games table where game_id is equal to the
 * given gameId.
 * @param {integer} gameId - the integer parameter that refers to game_id
 * @param {integer} playerId - the integer parameter that refers to player_id
 */
async function updateWinner(gameId, playerId) {
  let sqlUpdate = "UPDATE games SET winner=? WHERE id=?";
  let db = await getDBConnection();
  await db.run(sqlUpdate, playerId, gameId);
  await db.close();
}

/**
 * convert given data into json form to send response to the client-side.
 * @param {array} array - array to define the latest scenario id
 * @return {array} - array contains id and scenarios.
 */
async function convertIntoJson(array) {
  let jsonArray = JSON.parse(array);
  let lastId = jsonArray[jsonArray.length - 1];
  let sql = "SELECT id, text FROM scenarios WHERE id >= ? " +
  "ORDER BY id DESC";
  let db = await getDBConnection();
  let arrayResult = await db.all(sql, lastId);
  await db.close();
  return arrayResult;
}

/**
 * execute sqlstatement with one parameter and return the result
 * @param {String} sqlState - sql statement that is used for executing the sql
 * @param {Object} param - object that is used for executing sql statement
 * @returns {Object} - object database that is the result of executing sql statement
 */
async function executeSqlWithOneParam(sqlState, param) {
  let db = await getDBConnection();
  let result = await db.all(sqlState, param);
  await db.close();
  return result[0];
}

/**
 * Establishes a database connection to a database and returns the database object.
 * Any errors that occur during connection should be caught in the function
 * that calls this one.
 * @returns {Object} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: 'zoomingo.db',
    driver: sqlite3.Database
  });

  return db;
}

app.use(express.static('public', {index: 'zoomingo.html'}));
const PORT = process.env.PORT || PORTNUM;
app.listen(PORT);