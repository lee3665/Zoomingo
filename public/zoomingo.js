/*
 * Name: Junguk Lee
 * Date: June 9, 2020
 * Section: CSE 154 AK
 *
 * This is the zoomingo.js to create client-side and send request to the
 * server side. This js implement UI and get data from the server
 */
'use strict';

const BOARD_LENGTH = 520;
const BOARD_HEIGHT = 10;
const MARGIN_CONST = 130;

(function() {

  window.addEventListener('load', init);

  /**
   * After we write name and choose the size of the board, we click the new Game
   * button to and start Bingo game.
   */
  function init() {
    id("new-game").addEventListener("click", newGameClick);
    id("size-select").addEventListener("change", displayBoard);
    id("reset").addEventListener("click", doReset);
    checkLocalStoarage();
  }

  /**
   * Make new-game button available to be clicked if the input of size-select and
   * name is filled. Otherwise, display error message.
   */
  function newGameClick() {
    let select = id("size-select");
    let errMessage = id("error");
    let name = id("name");
    let resultMsg = id("result-message");
    if (name.value === "") {
      errMessage.classList.remove("hidden");
      errMessage.textContent = "Error: You need to write name";
    } else if (select.value === "empty") {
      errMessage.classList.remove("hidden");
      errMessage.textContent = "Error: You need to select a board size";
    } else {
      errMessage.classList.add("hidden");
      select.disabled = true;
      name.disabled = true;
      resultMsg.textContent = "New game start!";
      boardFetching();
    }
  }

  /**
   * this function define the styles of each squares based on the selected size
   */
  function displayBoard() {
    let selectSize = id("size-select");
    if (selectSize.value !== "empty") {
      let boardSize = selectSize.value;
      defineSquareSize(boardSize);
    }

  }

  /**
   * define styles of squares in the board based on the given size
   * @param {integer} boardSize - board size used to define the style of squares
   */
  function defineSquareSize(boardSize) {
    let board = id("board");
    board.innerHTML = "";
    let squareNum = Math.sqrt(boardSize);
    if (boardSize !== "empty") {
      let boardNum = parseInt(boardSize);
      for (let i = 0; i < boardNum; i++) {
        let div = gen("div");
        let scenario = gen("p");

        scenario.classList.add("scenario");
        div.classList.add("square");
        div.style.width = BOARD_LENGTH / squareNum + "px";
        div.style.height = BOARD_HEIGHT + squareNum * 10 + "px";
        div.style.marginLeft = MARGIN_CONST / squareNum + "px";
        div.style.marginRight = MARGIN_CONST / squareNum + "px";
        board.appendChild(div);
        div.appendChild(scenario);
      }
    }
  }

  /**
   * Make a fetch request to newGame API by sending name input and size-select
   * as the sending request parameter.
   */
  function boardFetching() {
    let url = "/newGame";
    let size = id("size-select");
    let name = id("name");
    defineSquareSize(size.value);

    let sizeValue = size.value;
    let nameValue = name.value;

    fetch(url + "?name=" + nameValue + "&size=" + sizeValue)
      .then(checkStatus)
      .then(resp => resp.json())
      .then(displayNewGame)
      .catch(errHandler);
  }

  /**
   * Insert all the given scenarios from the newGame API to the board and add
   * scenario Id for each scenario. The scenario "FREE" must be on the middle
   * of the board. For each scenario, it has eventlistener for clicking.
   * @param {JSON} res - json data received from the newGame API
   */
  function displayNewGame(res) {
    let scenarios = qsa(".scenario");
    let size = scenarios.length;

    let gameData = {};
    gameData["game_id"] = res["game_id"];
    gameData["player_id"] = res["player"]["id"];
    window.localStorage.setItem("gameData", JSON.stringify(gameData));

    let board = res["player"]["board"];
    let index = 1;
    let bingo = id("bingo");

    bingo.addEventListener("click", bingoClicked);
    for (let i = 0; i < size; i++) {
      if (i === (size - 1) / 2) {
        scenarios[i].textContent = board[0]['text'];
        scenarios[i].id = board[0]['id'];
      } else {
        scenarios[i].textContent = board[index]['text'];
        scenarios[i].id = board[index]['id'];
        index++;
      }
      scenarios[i].addEventListener("click", selectFetching);
    }
  }

  /**
   * If a scenario is clicked, we send its scenario_id to selectScenario API and
   * call the event to make the scneario displayed as selected
   */
  function selectFetching() {
    let scenarioId = this.id;
    scenarioId = parseInt(scenarioId);
    let url = "/selectScenario";
    let localData = JSON.parse(window.localStorage.getItem("gameData"));
    let gameId = localData["game_id"];
    let body = new FormData();
    body.append("game_id", gameId);
    body.append("scenario_id", scenarioId);

    fetch(url, {method: "POST", body: body})
      .then(checkStatus)
      .then(res => res.json())
      .then(res => res["scenario_id"])
      .then(selectScenario)
      .catch(console.error);
  }

  /**
   * Based on the selectScenario API, if the scenario is not selected, then
   * display it as selected.
   * @param {JSON} res - json object received from selectScenario API
   */
  function selectScenario(res) {
    let select = id(res.toString());

    if (select.className === "scenario") {
      select.classList.add("selected");
    }
  }

  /**
   * make a fetch request to bingo API with thebody parameter of game_id and
   * call next function or console any error if the function catch any error.
   */
  function bingoClicked() {

    let url = "/bingo";
    let localData = JSON.parse(window.localStorage.getItem("gameData"));
    let gameId = localData["game_id"];

    let body = new FormData();
    body.append("game_id", gameId);

    fetch(url, {method: "POST", body: body})
      .then(checkStatus)
      .then(res => res.json())
      .then(bingoDisplay)
      .catch(console.error);
  }

  /**
   * Add bingo message based on different condition. If there is a winner, make
   * size-select and name input enabled and add congratuation post.
   * @param {JSON} res - json object which shows the winner's name
   */
  function bingoDisplay(res) {
    let message = id("result-message");
    if (res["winner"] === null) {
      message.textContent = "Nobody has won yet";
    } else {
      let sizeSelect = id("size-select");
      let name = id("name");

      sizeSelect.disabled = false;
      name.disabled = false;
      message.textContent = "Congratuation!! You won!!";
    }
  }

  /**
   * Make new-game and size-select buttons re-enabled
   * and clear all activities previously done and return to original page
   */
  function doReset() {
    let newGame = id("new-game");
    let sizeSelect = id("size-select");
    let board = id("board");
    let error = id("error");
    let name = id("name");
    let message = id("result-message");

    newGame.disalbed = false;
    sizeSelect.disabled = false;
    name.disabled = false;
    error.classList.add("hidden");
    board.innerHTML = "";
    message.innerHTML = "";
    window.localStorage.clear();
  }

  /**
   * check the local storage and if there exists localstoraged data, then
   * make resume button available.
   */
  function checkLocalStoarage() {
    let result = JSON.parse(window.localStorage.getItem("gameData"));

    if (result !== null) {
      let resume = id("resume");
      resume.disabled = false;
      id("resume").addEventListener("click", resumeGame);
    }
  }

  /**
   * make a fetch request to resmueGame API and resume gamebased on the gameId
   * and the playerId
   */
  function resumeGame() {
    let result = JSON.parse(window.localStorage.getItem("gameData"));
    let gameId = result["game_id"];
    let playerId = result["player_id"];
    let url = "/resumeGame";

    fetch(url + "?game_id=" + gameId + "&player_id=" + playerId)
      .then(checkStatus)
      .then(res => res.json())
      .then(resumeDisplay)
      .catch(console.error);
  }

  /**
   * Based on the response, we resume the game and displayed all the previous
   * selected scenarios
   * @param {JSON} res - json object to continue previous game
   */
  function resumeDisplay(res) {
    let givenScenarios = res["player"]["board"];
    let size = givenScenarios.length;
    let sizeSelect = id("size-select");
    let name = id("name");
    let playerName = res["player"]["name"];

    name.value = playerName;
    sizeSelect.value = size;
    sizeSelect.disabled = true;
    name.disabled = true;

    defineSquareSize(size);
    displayNewGame(res);
    let selectedArray = JSON.parse(res["selected_scenarios"]);
    for (let i = 0; i < selectedArray.length; i++) {
      let scenario = selectedArray[i];
      selectScenario(scenario);
    }
  }

  /**
   *
   * @param {Error} err
   */
  function errHandler(err) {

  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  function checkStatus(response) {
    if (!response.ok) {
      throw Error("Error in request: " + response.statusText);
    }
    return response;
  }

  /**
   * Returns an array of elements matching the given query.
   * @param {string} query - CSS query selector.
   * @returns {array} - Array of DOM objects matching the given query.
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID.
   * @returns {object} - DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns a new element with the given tagname.
   * @param {string} tagName - name of element to create and return.
   * @returns {object} new DOM element with the given tagname.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();
