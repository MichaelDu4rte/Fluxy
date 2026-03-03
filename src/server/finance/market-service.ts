import { FinanceError } from "@/src/server/finance/errors";
import type {
  CryptoAssetListItemDto,
  CryptoInsightDto,
  CryptoQuoteDto,
} from "@/src/server/finance/types";

const COINGECKO_BASE_URL = (
  process.env.COINGECKO_BASE_URL?.trim() || "https://api.coingecko.com/api/v3"
).replace(/\/+$/, "");
const DEFAULT_ASSETS_LIMIT = 12;
const HISTORICAL_WINDOW_DAYS = 180;
const DEFAULT_CACHE_TTL_MS = 60_000;
const STALE_CACHE_TTL_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const MAX_CACHE_ENTRIES = 300;

type CoinGeckoCacheEntry = {
  payload: unknown;
  expiresAt: number;
  staleUntil: number;
};

type CoinGeckoCacheStore = {
  responses: Map<string, CoinGeckoCacheEntry>;
  inflight: Map<string, Promise<unknown>>;
};

const globalForCoinGecko = globalThis as typeof globalThis & {
  __fluxyCoinGeckoCache?: CoinGeckoCacheStore;
};

function getCacheStore(): CoinGeckoCacheStore {
  if (!globalForCoinGecko.__fluxyCoinGeckoCache) {
    globalForCoinGecko.__fluxyCoinGeckoCache = {
      responses: new Map(),
      inflight: new Map(),
    };
  }

  return globalForCoinGecko.__fluxyCoinGeckoCache;
}

function trimCacheIfNeeded(store: CoinGeckoCacheStore) {
  if (store.responses.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const overflow = store.responses.size - MAX_CACHE_ENTRIES;
  const keys = store.responses.keys();
  for (let index = 0; index < overflow; index += 1) {
    const key = keys.next().value;
    if (!key) {
      break;
    }
    store.responses.delete(key);
  }
}

function getFreshCache<T>(store: CoinGeckoCacheStore, key: string, now: number): T | null {
  const entry = store.responses.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt > now) {
    return entry.payload as T;
  }

  return null;
}

function getStaleCache<T>(store: CoinGeckoCacheStore, key: string, now: number): T | null {
  const entry = store.responses.get(key);
  if (!entry) {
    return null;
  }

  if (entry.staleUntil > now) {
    return entry.payload as T;
  }

  store.responses.delete(key);
  return null;
}

function setCache(store: CoinGeckoCacheStore, key: string, payload: unknown) {
  const now = Date.now();
  store.responses.set(key, {
    payload,
    expiresAt: now + DEFAULT_CACHE_TTL_MS,
    staleUntil: now + STALE_CACHE_TTL_MS,
  });
  trimCacheIfNeeded(store);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelayMs(status: number, attempt: number, retryAfterHeader: string | null): number {
  if (status === 429 && retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(10_000, Math.trunc(retryAfterSeconds * 1000));
    }
  }

  return 300 * Math.pow(2, attempt);
}

function normalizeUpstreamErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const asRecord = payload as Record<string, unknown>;

  if (typeof asRecord.error === "string" && asRecord.error.trim()) {
    return asRecord.error.trim();
  }

  if (typeof asRecord.message === "string" && asRecord.message.trim()) {
    return asRecord.message.trim();
  }

  const status = asRecord.status;
  if (status && typeof status === "object") {
    const statusRecord = status as Record<string, unknown>;
    if (
      typeof statusRecord.error_message === "string"
      && statusRecord.error_message.trim()
    ) {
      return statusRecord.error_message.trim();
    }
  }

  return null;
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_ASSETS_LIMIT;
  }

  return Math.min(30, Math.max(1, Math.trunc(limit)));
}

function getCoinGeckoHeaders() {
  const demoApiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
  const proApiKey = process.env.COINGECKO_PRO_API_KEY;

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (demoApiKey) {
    headers["x-cg-demo-api-key"] = demoApiKey;
  }

  if (proApiKey) {
    headers["x-cg-pro-api-key"] = proApiKey;
  }

  return headers;
}

function getMarketUnavailableError(status: number, endpoint: string, upstreamMessage: string | null) {
  const message =
    status === 429
      ? "Limite temporário de consultas no provedor de mercado. Tente novamente em alguns segundos."
      : "Não foi possível consultar a cotação de mercado agora.";

  return new FinanceError("MARKET_DATA_UNAVAILABLE", message, 502, {
    status,
    endpoint,
    upstreamMessage,
  });
}

async function coinGeckoFetch<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  const store = getCacheStore();
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${normalizedPath}`, `${COINGECKO_BASE_URL}/`);
  const headers = getCoinGeckoHeaders();

  if (searchParams) {
    url.search = searchParams.toString();
  }

  const cacheKey = url.toString();
  const now = Date.now();
  const freshCache = getFreshCache<T>(store, cacheKey, now);
  if (freshCache !== null) {
    return freshCache;
  }

  const inflightRequest = store.inflight.get(cacheKey);
  if (inflightRequest) {
    return (await inflightRequest) as T;
  }

  const requestPromise = (async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers,
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok) {
          const payload = (await response.json()) as T;
          setCache(store, cacheKey, payload);
          return payload;
        }

        let errorPayload: unknown = null;
        try {
          errorPayload = await response.json();
        } catch {
          errorPayload = null;
        }

        const staleCache = getStaleCache<T>(store, cacheKey, Date.now());
        if (staleCache !== null) {
          return staleCache;
        }

        const isRetryableStatus = response.status === 429 || response.status >= 500;
        if (isRetryableStatus && attempt < MAX_RETRIES) {
          await wait(
            getRetryDelayMs(response.status, attempt, response.headers.get("retry-after")),
          );
          continue;
        }

        throw getMarketUnavailableError(
          response.status,
          url.pathname,
          normalizeUpstreamErrorMessage(errorPayload),
        );
      } catch (error) {
        const staleCache = getStaleCache<T>(store, cacheKey, Date.now());
        if (staleCache !== null) {
          return staleCache;
        }

        const isAbortError = error instanceof DOMException && error.name === "AbortError";
        const isNetworkError = error instanceof TypeError || isAbortError;
        if (isNetworkError && attempt < MAX_RETRIES) {
          await wait(getRetryDelayMs(503, attempt, null));
          continue;
        }

        if (error instanceof FinanceError) {
          throw error;
        }

        throw new FinanceError(
          "MARKET_DATA_UNAVAILABLE",
          "Não foi possível consultar a cotação de mercado agora.",
          502,
          { endpoint: url.pathname },
        );
      }
    }

    throw new FinanceError(
      "MARKET_DATA_UNAVAILABLE",
      "Não foi possível consultar a cotação de mercado agora.",
      502,
      { endpoint: url.pathname },
    );
  })().finally(() => {
    store.inflight.delete(cacheKey);
  });

  store.inflight.set(cacheKey, requestPromise);
  return (await requestPromise) as T;
}

type CoinGeckoSearchResponse = {
  coins?: Array<{
    id: string;
    symbol: string;
    name: string;
  }>;
};

type CoinGeckoMarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  market_cap_rank: number | null;
};

type CoinGeckoSimplePriceResponse = Record<
  string,
  {
    brl?: number;
    last_updated_at?: number;
  }
>;

type CoinGeckoMarketChartResponse = {
  prices?: Array<[number, number]>;
};

function toAssetListItem(coin: CoinGeckoMarketCoin): CryptoAssetListItemDto {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
    priceBrl:
      typeof coin.current_price === "number" && Number.isFinite(coin.current_price)
        ? coin.current_price
        : null,
    marketCapRank:
      typeof coin.market_cap_rank === "number" && Number.isFinite(coin.market_cap_rank)
        ? coin.market_cap_rank
        : null,
  };
}

function normalizeQuotes(
  payload: CoinGeckoSimplePriceResponse,
): Record<string, CryptoQuoteDto> {
  const quotes: Record<string, CryptoQuoteDto> = {};

  for (const [assetId, quote] of Object.entries(payload)) {
    if (!quote || typeof quote.brl !== "number" || !Number.isFinite(quote.brl)) {
      continue;
    }

    quotes[assetId] = {
      priceBrl: quote.brl,
      lastUpdatedAt:
        typeof quote.last_updated_at === "number"
          ? new Date(quote.last_updated_at * 1000).toISOString()
          : null,
    };
  }

  return quotes;
}

function variationPct(current: number, past: number) {
  if (past <= 0) {
    return 0;
  }

  return ((current - past) / past) * 100;
}

function pickReferencePrice(prices: Array<[number, number]>, daysAgo: number): number | null {
  if (prices.length === 0) {
    return null;
  }

  const target = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

  let closest: [number, number] | null = null;
  let closestDiff = Number.POSITIVE_INFINITY;

  for (const point of prices) {
    const diff = Math.abs(point[0] - target);
    if (diff < closestDiff) {
      closest = point;
      closestDiff = diff;
    }
  }

  if (!closest || typeof closest[1] !== "number" || !Number.isFinite(closest[1])) {
    return null;
  }

  return closest[1];
}

function findClosestPricePointByTimestamp(
  prices: Array<[number, number]>,
  targetTs: number,
): [number, number] | null {
  if (prices.length === 0) {
    return null;
  }

  let closestPoint: [number, number] | null = null;
  let closestDiff = Number.POSITIVE_INFINITY;

  for (const point of prices) {
    const diff = Math.abs(point[0] - targetTs);
    if (diff < closestDiff) {
      closestPoint = point;
      closestDiff = diff;
    }
  }

  return closestPoint;
}

function calculatePositiveReturnProbability(
  prices: Array<[number, number]>,
  horizonDays: number,
): { pct: number | null; samples: number } {
  if (prices.length < 2) {
    return { pct: null, samples: 0 };
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const lastTimestamp = prices[prices.length - 1][0];
  let positiveCount = 0;
  let samples = 0;

  for (const startPoint of prices) {
    const startPrice = startPoint[1];
    if (startPrice <= 0 || !Number.isFinite(startPrice)) {
      continue;
    }

    const targetTs = startPoint[0] + horizonDays * msInDay;
    if (targetTs > lastTimestamp) {
      continue;
    }

    const endPoint = findClosestPricePointByTimestamp(prices, targetTs);
    if (!endPoint) {
      continue;
    }

    if (endPoint[0] <= startPoint[0]) {
      continue;
    }

    const endPrice = endPoint[1];
    if (endPrice <= 0 || !Number.isFinite(endPrice)) {
      continue;
    }

    const returnPct = ((endPrice - startPrice) / startPrice) * 100;
    samples += 1;

    if (returnPct > 0) {
      positiveCount += 1;
    }
  }

  if (samples === 0) {
    return { pct: null, samples: 0 };
  }

  return {
    pct: Number(((positiveCount / samples) * 100).toFixed(2)),
    samples,
  };
}

export async function searchAssets(
  query: string,
  limit: number,
): Promise<CryptoAssetListItemDto[]> {
  const normalizedLimit = clampLimit(limit);
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    const params = new URLSearchParams({
      vs_currency: "brl",
      order: "market_cap_desc",
      per_page: String(normalizedLimit),
      page: "1",
      sparkline: "false",
      locale: "pt",
    });

    const payload = await coinGeckoFetch<CoinGeckoMarketCoin[]>("/coins/markets", params);
    return payload.map(toAssetListItem);
  }

  const search = await coinGeckoFetch<CoinGeckoSearchResponse>(
    "/search",
    new URLSearchParams({ query: trimmedQuery }),
  );

  const ids = (search.coins ?? [])
    .slice(0, normalizedLimit)
    .map((coin) => coin.id)
    .filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  const markets = await coinGeckoFetch<CoinGeckoMarketCoin[]>(
    "/coins/markets",
    new URLSearchParams({
      vs_currency: "brl",
      ids: ids.join(","),
      order: "market_cap_desc",
      per_page: String(normalizedLimit),
      page: "1",
      sparkline: "false",
      locale: "pt",
    }),
  );

  return markets.map(toAssetListItem);
}

export async function getBatchQuotes(ids: string[]): Promise<Record<string, CryptoQuoteDto>> {
  const normalizedIds = [...new Set(ids.map((item) => item.trim()).filter(Boolean))].slice(0, 80);

  if (normalizedIds.length === 0) {
    return {};
  }

  const payload = await coinGeckoFetch<CoinGeckoSimplePriceResponse>(
    "/simple/price",
    new URLSearchParams({
      ids: normalizedIds.join(","),
      vs_currencies: "brl",
      include_last_updated_at: "true",
    }),
  );

  return normalizeQuotes(payload);
}

export async function getAssetInsight(
  assetId: string,
  amountCents: number,
): Promise<CryptoInsightDto> {
  const normalizedAssetId = assetId.trim();

  if (!normalizedAssetId) {
    throw new FinanceError("VALIDATION_ERROR", "Ativo inválido.", 400);
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new FinanceError("VALIDATION_ERROR", "Valor inválido para projeção.", 400);
  }

  const chart = await coinGeckoFetch<CoinGeckoMarketChartResponse>(
    `/coins/${encodeURIComponent(normalizedAssetId)}/market_chart`,
    new URLSearchParams({
      vs_currency: "brl",
      days: String(HISTORICAL_WINDOW_DAYS),
      interval: "daily",
    }),
  );

  const prices = Array.isArray(chart.prices)
    ? chart.prices.filter(
      (point): point is [number, number] =>
        Array.isArray(point)
        && point.length >= 2
        && typeof point[0] === "number"
        && Number.isFinite(point[0])
        && typeof point[1] === "number"
        && Number.isFinite(point[1]),
    )
    : [];

  if (prices.length === 0) {
    throw new FinanceError(
      "MARKET_DATA_UNAVAILABLE",
      "Não foi possível carregar a cotação deste ativo agora.",
      502,
    );
  }

  const latestPricePoint = prices[prices.length - 1];
  const current = latestPricePoint[1];
  const lastUpdatedAt = new Date(latestPricePoint[0]).toISOString();
  const reference30 = pickReferencePrice(prices, 30);
  const reference90 = pickReferencePrice(prices, 90);
  const d30Probability = calculatePositiveReturnProbability(prices, 30);
  const d90Probability = calculatePositiveReturnProbability(prices, 90);

  const pct30 = reference30 ? variationPct(current, reference30) : 0;
  const pct90 = reference90 ? variationPct(current, reference90) : 0;

  const inputAmountBrl = amountCents / 100;
  const projected30 = inputAmountBrl * (1 + pct30 / 100);
  const projected90 = inputAmountBrl * (1 + pct90 / 100);

  return {
    assetId: normalizedAssetId,
    priceBrl: current,
    lastUpdatedAt,
    historicalWindowDays: HISTORICAL_WINDOW_DAYS,
    positiveReturnProbability: {
      d30Pct: d30Probability.pct,
      d90Pct: d90Probability.pct,
      d30Samples: d30Probability.samples,
      d90Samples: d90Probability.samples,
    },
    inputAmountBrl,
    scenarios: {
      d30: {
        variationPct: pct30,
        projectedValueBrl: projected30,
        projectedDeltaBrl: projected30 - inputAmountBrl,
      },
      d90: {
        variationPct: pct90,
        projectedValueBrl: projected90,
        projectedDeltaBrl: projected90 - inputAmountBrl,
      },
    },
  };
}

