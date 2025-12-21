import http from "node:http";

type Match = {
  id: string;
  date: string;
  teamA: string;
  teamB: string;
  status: "planned" | "ongoing" | "finished";
  scoreA: number | null;
  scoreB: number | null;
};

type ServerHandle = {
  close: () => Promise<void>;
  port: number;
};

export async function startMockBack(port = 4000): Promise<ServerHandle> {
  const matches: Match[] = [
    {
      id: "1",
      date: new Date().toISOString(),
      teamA: "Mock A",
      teamB: "Mock B",
      status: "ongoing",
      scoreA: 0,
      scoreB: 0,
    },
  ];

  const server = http.createServer((req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/matches" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(matches));
      return;
    }

    if (req.url === "/matches/stream" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });

      const send = (data: unknown) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // event initial
      setTimeout(() => {
        send({
          type: "matches",
          matches,
          diff: { changed: true, added: ["1"], updated: [], removed: [] },
          timestamp: Date.now(),
        });
      }, 50);

      // but après 1s
      setTimeout(() => {
        matches[0] = { ...matches[0], scoreA: 1, scoreB: 0 };
        send({
          type: "matches",
          matches,
          diff: { changed: true, added: [], updated: ["1"], removed: [] },
          timestamp: Date.now(),
        });
      }, 1000);

      // keep-alive ping
      const ping = setInterval(() => send({ type: "ping", timestamp: Date.now() }), 25000);

      req.on("close", () => {
        clearInterval(ping);
      });
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));

  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
