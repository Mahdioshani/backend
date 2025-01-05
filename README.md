
## Description

The peley game-boilerplate application is powered by Nest.js.

#### Docker
```$ docker compose -f docker-compose.dev.yaml up```



### GameController Documentation

#### Overview
The `GameController` is a key component in the game engine, handling various game-related commands using the NATS transport layer. It communicates with the `GameService` to manage the game state and perform actions triggered by game events.

### Controller Methods

#### 1. **setupGameHandler**
**Endpoint:**
```typescript
@MessagePattern(
  receiveCommandTopic(GameType.General, GameEngineCommandType.SETUP_COMMAND),
  Transport.NATS
)
```
**Description:**
Handles the setup of a new game.

**Parameters:**
- `payload` (`GameSetupCommandPRCPayload`): Contains match ID, game type, player IDs, and bot IDs.

**Returns:**
- `Promise<GameSetupCommandPRCResponse>`: The response encapsulates the game setup event data.

**Error Handling:**
Throws a `CustomRpcException` in case of errors.

---

#### 2. **userActionHandler**
**Endpoint:**
```typescript
@MessagePattern(
  receiveCommandTopic(GameType.General, GameEngineCommandType.PLAYER_ACTION),
  Transport.NATS
)
```
**Description:**
Processes player actions during the game.

**Parameters:**
- `payload` (`PlayerActionCommandPRCPayload<any>`): Contains the match ID, player ID, action name, and action details.

**Returns:**
- `Promise<PlayerActionCommandPRCResponse>`: Indicates success or failure of the action.

**Error Handling:**
Throws a `CustomRpcException` in case of errors.

---

#### 3. **reconnectHandler**
**Endpoint:**
```typescript
@MessagePattern(
  receiveCommandTopic(GameType.General, GameEngineCommandType.RECONNECT),
  Transport.NATS
)
```
**Description:**
Handles player reconnections to the game.

**Parameters:**
- `payload` (`PlayerReconnectCommandPRCPayload`): Contains the match ID and player ID.

**Returns:**
- `Promise<PlayerReconnectCommandPRCResponse>`: The response encapsulates the reconnect event data.

**Error Handling:**
Throws a `CustomRpcException` in case of errors.

---

#### 4. **userDisconnectHandler**
**Endpoint:**
```typescript
@MessagePattern(
  receiveCommandTopic(GameType.General, GameEngineCommandType.PLAYER_DISCONNECT),
  Transport.NATS
)
```
**Description:**
Handles player disconnection events.

**Parameters:**
- `payload` (`PlayerDisconnectCommandPRCPayload`): Contains the match ID and player ID.

**Returns:**
- `Promise<PlayerDisconnectCommandPRCResponse>`: Indicates success or failure of the disconnection.

**Error Handling:**
Throws a `CustomRpcException` in case of errors.

---

#### 5. **userLeftHandler**
**Endpoint:**
```typescript
@MessagePattern(
  receiveCommandTopic(GameType.General, GameEngineCommandType.PLAYER_LEFT),
  Transport.NATS
)
```
**Description:**
Handles events when a player leaves the game.

**Parameters:**
- `payload` (`PlayerLeftCommandPRCPayload`): Contains the match ID and player ID.

**Returns:**
- `Promise<PlayerLeftCommandPRCResponse>`: Indicates whether the match ended due to the player leaving and the success status.

**Error Handling:**
Throws a `CustomRpcException` in case of errors.

---

### Payload and Response Types

#### 1. **GameSetupCommandPRCPayload**
**Fields:**
- `matchId`: `string`
- `game`: `GameType`
- `playerIds`: `number[]`
- `botsId`: `number[]`

#### 2. **GameSetupCommandPRCResponse**
Extends `GameEvent<GameSetupCommandPRCPayload>`.

---

#### 3. **PlayerReconnectCommandPRCPayload**
**Fields:**
- `matchId`: `string`
- `playerId`: `number`

#### 4. **PlayerReconnectCommandPRCResponse**
Extends `GameEvent<any>`.

---

#### 5. **PlayerActionCommandPRCPayload<T>**
**Fields:**
- `matchId`: `string`
- `playerId`: `number`
- `actionName`: `string`
- `action`: `T`

#### 6. **PlayerActionCommandPRCResponse**
**Fields:**
- `success`: `boolean`

---

#### 7. **PlayerLeftCommandPRCPayload**
**Fields:**
- `matchId`: `string`
- `playerId`: `number`

#### 8. **PlayerLeftCommandPRCResponse**
**Fields:**
- `matchId`: `string`
- `playerId`: `number`
- `hasEndedMatch`: `boolean`
- `success`: `boolean`

---

#### 9. **PlayerDisconnectCommandPRCPayload**
**Fields:**
- `matchId`: `string`
- `playerId`: `number`

#### 10. **PlayerDisconnectCommandPRCResponse**
**Fields:**
- `success`: `boolean`

---

### Supporting Enums and Classes

#### Enums
- `GameEngineCommandType`
  - `SETUP_COMMAND`
  - `RECONNECT`
  - `PLAYER_ACTION`
  - `PLAYER_LEFT`
  - `PLAYER_DISCONNECT`

- `GameType`
  - `Go`
  - `Hokm`
  - `Ludo`
  - `Chess`
  - `TapTrap`
  - `Dominoes`
  - `Backgammon`

- `ResultStatus`
  - `WON`
  - `LOST`
  - `LEFT`

#### Classes
- `GameEvent<T>`: Represents a game event with metadata such as `id`, `matchId`, `action`, `data`, `stateVersion`, and `serverTime`.
- `GameEngineEvent<T>`: Wraps `GameEvent` within a `matchId`.
- `PlayerResult`: Contains the player's result details (`player_id`, `points`, `position`, `status`).
- `GameResult`: Aggregates results for multiple players.

### Conclusion
The `GameController` facilitates smooth operation of game-related actions, ensuring reliability and scalability in handling game events. By leveraging NATS transport and modular payload definitions, it provides a robust mechanism for managing game sessions.

