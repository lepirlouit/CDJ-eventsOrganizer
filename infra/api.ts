import { table, exportBucket } from "./storage";
import { userPool, userPoolClient } from "./auth";

const fnDefaults = {
  link: [table, exportBucket, userPool],
  runtime: "nodejs22.x" as const,
};

export const api = new sst.aws.ApiGatewayV2(`Api`, {
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
});

const auth = api.addAuthorizer({
  name: "CognitoAuth",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${userPool.id}`,
    audiences: [userPoolClient.id],
  },
});

function route(
  method: string,
  path: string,
  handler: string,
  options: { auth?: boolean } = { auth: true }
) {
  const fn = new sst.aws.Function(
    `Fn${method}${path.replace(/\//g, "_").replace(/[{}]/g, "")}`,
    { ...fnDefaults, handler }
  );
  api.route(`${method} ${path}`, fn.arn, {
    auth: options.auth ? { jwt: { authorizer: auth.id } } : undefined,
  });
  return fn;
}

// Auth
route("GET", "/auth/session", "packages/functions/src/auth/session.handler", { auth: false });
route("POST", "/auth/logout", "packages/functions/src/auth/logout.handler", { auth: false });

// Public
route("GET", "/dojos", "packages/functions/src/dojos/list.handler", { auth: false });
route("GET", "/dojos/{dojoId}", "packages/functions/src/dojos/get.handler", { auth: false });
route("GET", "/dojos/{dojoId}/events", "packages/functions/src/events/list.handler", { auth: false });
route("GET", "/events/{eventId}", "packages/functions/src/events/get.handler", { auth: false });

// Parent (auth required)
route("POST", "/events/{eventId}/registrations", "packages/functions/src/registrations/create.handler");
route("GET", "/users/me", "packages/functions/src/users/me.handler");
route("PUT", "/users/me", "packages/functions/src/users/update-me.handler");
route("GET", "/users/me/registrations", "packages/functions/src/registrations/list-mine.handler");
route("DELETE", "/registrations/{registrationId}", "packages/functions/src/registrations/cancel.handler");

// Coach / Lead Coach
route("GET", "/admin/events/{eventId}/registrations", "packages/functions/src/registrations/list.handler");
route("GET", "/admin/events/{eventId}/registrations/export", "packages/functions/src/registrations/export-csv.handler");
route("GET", "/admin/events/{eventId}/waitlist", "packages/functions/src/waitlist/list.handler");
route("POST", "/admin/dojos/{dojoId}/events", "packages/functions/src/events/create.handler");
route("PUT", "/admin/events/{eventId}", "packages/functions/src/events/update.handler");
route("DELETE", "/admin/events/{eventId}", "packages/functions/src/events/delete.handler");
route("PUT", "/admin/registrations/{registrationId}", "packages/functions/src/registrations/update.handler");
route("POST", "/admin/events/{eventId}/waitlist/{id}/promote", "packages/functions/src/waitlist/promote.handler");
route("PUT", "/admin/dojos/{dojoId}/waitlist-mode", "packages/functions/src/waitlist/update-mode.handler");
route("POST", "/admin/events/{eventId}/ateliers", "packages/functions/src/ateliers/create.handler");
route("DELETE", "/admin/events/{eventId}/ateliers/{id}", "packages/functions/src/ateliers/delete.handler");

// Check-in (coach/lead_coach)
route("PATCH", "/admin/events/{eventId}/registrations/{registrationId}/checkin", "packages/functions/src/registrations/checkin.handler");
route("DELETE", "/admin/events/{eventId}/registrations/{registrationId}/checkin", "packages/functions/src/registrations/undo-checkin.handler");

// Volunteers (coach/lead_coach)
route("POST", "/events/{eventId}/volunteers", "packages/functions/src/volunteers/create.handler");
route("DELETE", "/events/{eventId}/volunteers/me", "packages/functions/src/volunteers/withdraw.handler");
route("GET", "/admin/events/{eventId}/volunteers", "packages/functions/src/volunteers/list.handler");

// Dojo membership management
route("GET",    "/admin/dojos/{dojoId}/members",              "packages/functions/src/members/list.handler");
route("POST",   "/admin/dojos/{dojoId}/members/{userId}",     "packages/functions/src/members/add.handler");
route("DELETE", "/admin/dojos/{dojoId}/members/{userId}",     "packages/functions/src/members/remove.handler");
route("PUT",    "/admin/dojos/{dojoId}/members/{userId}/role","packages/functions/src/members/update-role.handler");
route("GET",    "/users/me/memberships",                      "packages/functions/src/members/my-memberships.handler");

// Super Admin
route("POST", "/admin/dojos", "packages/functions/src/dojos/create.handler");
route("PUT", "/admin/dojos/{dojoId}", "packages/functions/src/dojos/update.handler");
route("GET", "/admin/ateliers", "packages/functions/src/ateliers/list.handler");
route("POST", "/admin/users/{userId}/role", "packages/functions/src/users/assign-role.handler");
