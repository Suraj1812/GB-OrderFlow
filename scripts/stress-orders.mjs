/* global console, fetch, process */

const baseUrl = process.env.GB_BASE_URL ?? "http://127.0.0.1:4000/api";
const dealerCode = process.env.GB_DEALER_CODE ?? "GB-D001";
const password = process.env.GB_DEALER_PASSWORD ?? "dealer123";
const requestCount = Number(process.env.GB_BULK_REQUESTS ?? 20);
const concurrency = Number(process.env.GB_BULK_CONCURRENCY ?? 5);
const cartSize = Number(process.env.GB_CART_SIZE ?? 3);

function randomIdempotencyKey(index) {
  return `stress-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildCookieHeader(setCookieHeaders) {
  return setCookieHeaders
    .map((header) => header.split(";")[0])
    .join("; ");
}

async function login() {
  const response = await fetch(`${baseUrl}/auth/login/dealer`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": `stress-login-${Date.now()}`,
    },
    body: JSON.stringify({
      dealerCode,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const body = await response.json();
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookieHeader = buildCookieHeader(setCookie);

  return {
    cookieHeader,
    csrfToken: body.csrfToken,
  };
}

async function fetchCatalog(session) {
  const response = await fetch(`${baseUrl}/dealer/catalog?page=1&pageSize=${cartSize}`, {
    headers: {
      cookie: session.cookieHeader,
      "x-request-id": `stress-catalog-${Date.now()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Catalog fetch failed with status ${response.status}`);
  }

  const body = await response.json();
  return body.items.slice(0, cartSize);
}

async function submitOrder(index, session, items) {
  const payload = {
    items: items.map((item, itemIndex) => ({
      skuId: item.id,
      qty: itemIndex + 1,
    })),
  };

  const response = await fetch(`${baseUrl}/dealer/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookieHeader,
      "x-csrf-token": session.csrfToken,
      "x-idempotency-key": randomIdempotencyKey(index),
      "x-request-id": `stress-order-${index}`,
    },
    body: JSON.stringify(payload),
  });

  return {
    index,
    status: response.status,
    ok: response.ok,
  };
}

async function runPool(tasks, limit) {
  const results = [];
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) {
        return;
      }

      results.push(await task());
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  const session = await login();
  const items = await fetchCatalog(session);

  if (items.length === 0) {
    throw new Error("No catalog items available for the stress run.");
  }

  const tasks = Array.from({ length: requestCount }, (_, index) => () =>
    submitOrder(index + 1, session, items),
  );

  const startedAt = Date.now();
  const results = await runPool(tasks, concurrency);
  const durationMs = Date.now() - startedAt;
  const successful = results.filter((result) => result.ok).length;

  console.log(JSON.stringify({
    baseUrl,
    requestCount,
    concurrency,
    successful,
    failed: results.length - successful,
    durationMs,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
