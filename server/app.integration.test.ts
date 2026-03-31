import bcrypt from "bcryptjs";
import { EventEmitter } from "node:events";
import type { Express } from "express";
import { createRequest, createResponse } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  session: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("./prisma/client.js", () => ({
  prisma: mockPrisma,
}));

async function invokeApp(app: Express, options: Parameters<typeof createRequest>[0]) {
  const request = createRequest(options);
  const response = createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    response.on("end", resolve);
    app.handle(request, response, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return response;
}

describe("API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.session.create.mockResolvedValue({ id: "session-1" });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("returns health information", async () => {
    const { createApp } = await import("./app.js");
    const response = await invokeApp(createApp({ disableHttpLogger: true }), {
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response._getJSONData()).toEqual(
      expect.objectContaining({
        ok: true,
      }),
    );
  });

  it("logs in a dealer and sets secure session cookies", async () => {
    const passwordHash = await bcrypt.hash("dealer123456", 12);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      username: "GB-D001",
      displayName: "Dealer User",
      email: "dealer@example.com",
      passwordHash,
      role: "DEALER",
      active: true,
      dealerId: "dealer-1",
      dealer: {
        id: "dealer-1",
        code: "GB-D001",
        name: "Dealer One",
        active: true,
      },
    });

    const { createApp } = await import("./app.js");
    const response = await invokeApp(createApp({ disableHttpLogger: true }), {
      method: "POST",
      url: "/api/auth/login/dealer",
      body: {
        dealerCode: "GB-D001",
        password: "dealer123456",
      },
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response._getJSONData()).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          role: "dealer",
        }),
      }),
    );

    expect(response.cookies.gb_access_token).toBeDefined();
    expect(response.cookies.gb_refresh_token).toBeDefined();
    expect(response.cookies.gb_csrf_token).toBeDefined();
    expect(mockPrisma.session.create).toHaveBeenCalled();
  });
});
