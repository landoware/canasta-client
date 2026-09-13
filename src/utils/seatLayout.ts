// Physical seating relative to the viewing seat, matching a real card
// table: the next player to act sits to your left, your partner sits
// across from you, and the player who acted right before you sits to
// your right. Turn order is strictly ascending seat index mod 4 — see
// internal/canasta/moves.go's `g.CurrentPlayer = (g.CurrentPlayer + 1) % 4`.
export function otherSeatIndices(mySeatIndex: number): {
  left: number
  partner: number
  right: number
} {
  return {
    left: (mySeatIndex + 1) % 4,
    partner: (mySeatIndex + 2) % 4,
    right: (mySeatIndex + 3) % 4,
  }
}

// The server's `players` array (ClientState.Players) lists the other 3
// seats in ascending absolute seat-index order, skipping the viewer's own
// seat — see internal/canasta/presentation.go's GetClientState, which
// builds it via `for id, p := range g.Players { if id != playerID {...} }`.
// There's no seatIndex field on each entry, so this reconstructs which
// array slot corresponds to a given seat.
export function otherPlayerAtSeat<T>(
  players: T[],
  mySeatIndex: number,
  seatIndex: number,
): T | undefined {
  const seatOrder = [0, 1, 2, 3].filter((seat) => seat !== mySeatIndex)
  const index = seatOrder.indexOf(seatIndex)
  return index === -1 ? undefined : players[index]
}
