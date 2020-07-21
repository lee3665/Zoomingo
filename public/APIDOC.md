# posting API Documentation
The zoomingo API manages the input data into sql database and return requested
data from the database to the client-side.

## Create new game*
**Request Format:** /:name/:size

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Given a name and board size ,it returns JSON of text information for each board tile.
Depends on the board size, we obtained information from the zoomingo.db and return to JSON form.

**Example Request:** /lee3665/9

**Example Response:**
```json
{
  "game_id":525,
  "player":{
    "id":19,
    "name":"lee3665",
    "board":[
      {"id":4543,"text":"FREE"},
      {"id":4542,"text":"What is that in their background?"},
      {"id":4541,"text":"Is this too small?"},
      {"id":4540,"text":"Your camera is off"},
      {"id":4539,"text":"You cut out. Say again?"},
      {"id":4538,"text":"Sorry my computer just froze"},
      {"id":4537,"text":"Sorry my computer just froze"},
      {"id":4536,"text":"What is that in their background?"},
      {"id":4535,"text":"Zoombombers"}]
  }
}
```

**Error Handling:**
- Possible 500 (invalid send) errors
  - If server does not return proper form, an error is returned with  message: `Something went wrong on the server, try again later.`


## Select New Scenario*
**Request Format:** /conversation endpoint with POST parameters of `gameId` and
`selectedId`

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Given game id and selected id, if the given scenario was not previously selected, we display the given scenario tile as 'selected'.

**Example Request:** /conversation with POST parameters of `gameId=525` and `selectedId=4542`

**Example Response:**
```json
{
  "game_id": 525,
  "scenario_id": 4542
}
```

**Error Handling:**
- Possible 500 (invalid send) errors
  - If server does not return proper form, an error is returned with  message: `Something went wrong on the server, try again later.`
- Possible 400 (invalid request) errors
  - If missing the selected id, an error is returned with the message: `Could not select scenario ID:` + selectedId


## Check Bingo*
**Request Format:** /conversation endpoint with POST parameter of `gameId`

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Given game id, check whether there exists bingo in the game and return information of the winner.

**Example Request:** /conversation with POST parameters of `gameId=525`

**Example Response:**
```json
{
  "game_id": 525,
  "winner": "ewr"
}
```

**Error Handling:**
- Possible 500 (invalid send) errors
  - If server does not return proper form, an error is returned with  message: `Something went wrong on the server, try again later.`
- Possible 400 (invalid request) errors
  - If the given parameter already has a winner, an error is returned with the message: `Game has already been won.`


## Resume Game*
**Request Format:** /:gameId/:palyerId

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Given game id and player id, return information of previous incomplete game

**Example Request:** /:525/:19

**Example Response:**
```json
{
  "game_id":525,
  "player":{
    "id":19,
    "name":"lee3665",
    "board":[
      {"id":4543,"text":"FREE"},
      {"id":4542,"text":"What is that in their background?"},
      {"id":4541,"text":"Is this too small?"},
      {"id":4540,"text":"Your camera is off"},
      {"id":4539,"text":"You cut out. Say again?"},
      {"id":4538,"text":"Sorry my computer just froze"},
      {"id":4537,"text":"Sorry my computer just froze"},
      {"id":4536,"text":"What is that in their background?"},
      {"id":4535,"text":"Zoombombers"}]
  },
  "selected_scenarios": "[4543,4541,4538]"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors
  - If missing parameter of either gameId or playerId, an error is returned with the message: `Cannot resume game: Player "` + playerId + ` was not part of game ` + gameId;