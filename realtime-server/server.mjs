import { createServer } from "node:http";
import crypto from "node:crypto";
import express from "express";
import { jwtVerify } from "jose";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT ?? 4001);
const EVENT_NAME = "finance:telegram_transaction_created";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[realtime] Missing required env var: ${name}`);
  }
  return value;
}

function parseAllowedOrigins(rawValue) {
  if (!rawValue?.trim()) {
    return ["*"];
  }

  const origins = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : ["*"];
}

function isSecretValid(expected, provided) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function validateTelegramEventPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "Payload must be an object." };
  }

  const payload = value;
  const requiredStringFields = [
    "source",
    "userId",
    "transactionId",
    "accountId",
    "merchant",
    "occurredAt",
    "createdAt",
  ];

  for (const field of requiredStringFields) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      return { ok: false, reason: `Missing or invalid field: ${field}` };
    }
  }

  if (payload.source !== "telegram") {
    return { ok: false, reason: "Invalid source. Expected 'telegram'." };
  }

  if (typeof payload.amountCents !== "number" || !Number.isFinite(payload.amountCents)) {
    return { ok: false, reason: "Missing or invalid field: amountCents" };
  }

  return { ok: true, payload };
}

const realtimeJwtSecret = requireEnv("REALTIME_JWT_SECRET");
const realtimeEventsSecret = requireEnv("REALTIME_EVENTS_SECRET");
const allowedOrigins = parseAllowedOrigins(process.env.REALTIME_ALLOWED_ORIGINS);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`[realtime] Origin not allowed: ${origin}`));
    },
    credentials: true,
  },
});
const jwtSecretBytes = new TextEncoder().encode(realtimeJwtSecret);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string" || !token.trim()) {
    next(new Error("Missing auth token."));
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecretBytes, {
      algorithms: ["HS256"],
    });

    const userId = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!userId) {
      next(new Error("Invalid token subject."));
      return;
    }

    socket.data.userId = userId;
    next();
  } catch (error) {
    console.error("[realtime] socket auth failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    next(new Error("Invalid auth token."));
  }
});

io.on("connection", (socket) => {
  const userId = String(socket.data.userId ?? "");
  const room = `user:${userId}`;
  socket.join(room);

  console.info("[realtime] client connected", {
    socketId: socket.id,
    userId,
    room,
  });

  socket.on("disconnect", (reason) => {
    console.info("[realtime] client disconnected", {
      socketId: socket.id,
      userId,
      room,
      reason,
    });
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post(
  "/internal/events/telegram-transaction-created",
  express.json({ limit: "32kb" }),
  (req, res) => {
    const providedSecret = req.header("x-realtime-secret")?.trim() ?? "";
    if (!isSecretValid(realtimeEventsSecret, providedSecret)) {
      res.status(401).json({ error: { message: "Unauthorized" } });
      return;
    }

    const validation = validateTelegramEventPayload(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: { message: validation.reason } });
      return;
    }

    const payload = validation.payload;
    const room = `user:${payload.userId}`;
    const recipients = io.sockets.adapter.rooms.get(room)?.size ?? 0;

    io.to(room).emit(EVENT_NAME, payload);

    console.info("[realtime] event emitted", {
      event: EVENT_NAME,
      room,
      recipients,
      transactionId: payload.transactionId,
      userId: payload.userId,
      source: payload.source,
    });

    res.status(204).send();
  },
);

httpServer.listen(PORT, () => {
  console.info("[realtime] server started", {
    port: PORT,
    event: EVENT_NAME,
    allowedOrigins,
  });
});

