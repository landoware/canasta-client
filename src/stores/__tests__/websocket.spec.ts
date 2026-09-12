import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { Server } from "mock-socket";
import { useWebSocketStore } from "@/stores/websocket";
import { useGameStore } from "@/stores/game";
import { TypeWelcome, TypeDrawFromDeck } from "@/types/protocol";

const SERVER_URL = "http://localhost:8080";
const WS_URL_PREFIX = "ws://localhost:8080";

describe("websocket store", () => {
  let mockServer: Server;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubEnv("VITE_SERVER_URL", SERVER_URL);
  });

  afterEach(() => {
    mockServer?.stop();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("connects to /rooms/{code}/ws with the name as a query param", async () => {
    mockServer = new Server(`${WS_URL_PREFIX}/rooms/ABC123/ws?name=Alice`);
    const connections: string[] = [];
    mockServer.on("connection", (socket) => {
      connections.push(socket.url);
    });

    const store = useWebSocketStore();
    store.connect("ABC123", "Alice");

    await vi.waitFor(() => expect(store.connected).toBe(true));
    expect(connections[0]).toContain("/rooms/ABC123/ws?name=Alice");
  });

  it("send() writes a {type, data} envelope as JSON", async () => {
    mockServer = new Server(`${WS_URL_PREFIX}/rooms/ABC123/ws?name=Alice`);
    const received: unknown[] = [];
    mockServer.on("connection", (socket) => {
      socket.on("message", (data) => received.push(JSON.parse(data as string)));
    });

    const store = useWebSocketStore();
    store.connect("ABC123", "Alice");
    await vi.waitFor(() => expect(store.connected).toBe(true));

    store.send(TypeDrawFromDeck, {});

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual({ type: TypeDrawFromDeck, data: {} });
  });

  it("dispatches an incoming welcome message to the game store", async () => {
    mockServer = new Server(`${WS_URL_PREFIX}/rooms/ABC123/ws?name=Alice`);
    mockServer.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          type: TypeWelcome,
          data: { seatIndex: 3, roomCode: "ABC123", roomState: "lobby" },
        }),
      );
    });

    const store = useWebSocketStore();
    const gameStore = useGameStore();
    store.connect("ABC123", "Alice");

    await vi.waitFor(() => expect(gameStore.mySeatIndex).toBe(3));
    expect(gameStore.roomCode).toBe("ABC123");
  });

  it("createRoom posts to /rooms and returns the room code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ roomCode: "ZZZ777" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = useWebSocketStore();
    const code = await store.createRoom();

    expect(code).toBe("ZZZ777");
    expect(fetchMock).toHaveBeenCalledWith(`${SERVER_URL}/rooms`, { method: "POST" });
  });

  it("createRoom throws when the server responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const store = useWebSocketStore();
    await expect(store.createRoom()).rejects.toThrow("500");
  });

  it("falls back to localhost:8080 when VITE_SERVER_URL is unset", async () => {
    vi.unstubAllEnvs();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ roomCode: "LOCAL1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = useWebSocketStore();
    await store.createRoom();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/rooms", { method: "POST" });
  });
});
