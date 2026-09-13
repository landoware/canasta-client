// MAIN_INSTANCE_ID is the store instance used by real single-player play
// (HomeView/LobbyView/GameView). Anything else (e.g. the /demo page's 4
// seats) gets its own independent store instance — see useGameStore/
// useWebSocketStore's instanceId parameter.
export const MAIN_INSTANCE_ID = 'main'
