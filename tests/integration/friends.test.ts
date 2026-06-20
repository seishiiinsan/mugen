// Integration coverage for the friendship RPCs (send / respond), including the
// no-spam invariant enforced by migration 0017: looping send_friend_request
// must never pile up duplicate notifications on the target.
//
// Self-contained (no fixtures/predictions needed), which makes it the best
// starting point for the Supabase-backed suite. Gated on a local DB.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, hasTestDb, type TestUser } from "./client";

describe.skipIf(!hasTestDb)("friendship RPCs", () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([createTestUser(), createTestUser()]);
  });

  afterAll(async () => {
    if (alice) await deleteTestUser(alice.id);
    if (bob) await deleteTestUser(bob.id);
  });

  it("creates a pending request visible from both sides", async () => {
    const { data, error } = await alice.client.rpc("send_friend_request", {
      p_target: bob.id,
    });
    expect(error).toBeNull();
    expect(data).toBe("pending_out");

    const out = await alice.client.rpc("friendship_status", { p_other: bob.id });
    const inc = await bob.client.rpc("friendship_status", { p_other: alice.id });
    expect(out.data).toBe("pending_out");
    expect(inc.data).toBe("pending_in");
  });

  it("does not spam the target when send is called in a loop (0017)", async () => {
    // Re-send several times while the request is still pending.
    for (let i = 0; i < 3; i++) {
      await alice.client.rpc("send_friend_request", { p_target: bob.id });
    }

    const { data, error } = await bob.client.rpc("my_notifications");
    expect(error).toBeNull();
    const fromAlice = (data ?? []).filter(
      (n: { type: string; actor_id: string }) =>
        n.type === "friend_request" && n.actor_id === alice.id,
    );
    expect(fromAlice).toHaveLength(1);
  });

  it("accepting the request makes both users friends", async () => {
    const { data, error } = await bob.client.rpc("respond_friend_request", {
      p_requester: alice.id,
      p_accept: true,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);

    const aSide = await alice.client.rpc("friendship_status", { p_other: bob.id });
    const bSide = await bob.client.rpc("friendship_status", { p_other: alice.id });
    expect(aSide.data).toBe("friends");
    expect(bSide.data).toBe("friends");
  });
});
