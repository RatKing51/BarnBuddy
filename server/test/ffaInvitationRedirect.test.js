const test = require("node:test");
const assert = require("node:assert/strict");

const { getAdvisorInviteRedirectUrl } = require("../routes/adminFfaChapters");

test("advisor invitations land on a public Clerk ticket handler before the protected dashboard", () => {
  const redirectUrl = new URL(getAdvisorInviteRedirectUrl());

  assert.equal(redirectUrl.pathname, "/login");
  assert.equal(redirectUrl.searchParams.get("returnTo"), "/advisor");
  assert.notEqual(redirectUrl.pathname, "/advisor");
});
