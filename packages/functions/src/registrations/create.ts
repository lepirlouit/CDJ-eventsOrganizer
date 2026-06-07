import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, sendEmail, registrationConfirmedEmail, waitlistedEmail } from "@coderdojo/core";
import { registerParticipant } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const {
    ninjaName, ninjaBirthdate, parentName, parentEmail, parentPhone,
    atelierId, needsComputer, previousVisits, heardAbout,
    consentPhotos, consentContact,
  } = body;

  if (!ninjaName || !ninjaBirthdate || !parentName || !parentEmail || !atelierId) {
    return err("Required fields missing", 400);
  }

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  try {
    const result = await registerParticipant({
      eventId,
      dojoId: ev.dojoId,
      userId: claims.sub,
      callerRole: claims["custom:role"],
      ninjaName,
      ninjaBirthdate,
      parentName,
      parentEmail,
      parentPhone,
      atelierId,
      needsComputer: needsComputer ?? false,
      previousVisits: previousVisits ?? 0,
      heardAbout,
      consentPhotos: consentPhotos ?? false,
      consentContact: consentContact ?? false,
    });

    const atelierName = ev.ateliers?.find((a) => a.atelierId === atelierId)?.name ?? atelierId;

    if (result.status === "confirmed") {
      const template = registrationConfirmedEmail("en", {
        parentName,
        ninjaName,
        eventTitle: ev.title,
        eventDate: ev.date,
        eventAddress: ev.location?.address ?? "",
        atelierName,
        cancellationUrl: `${process.env.WEB_URL}/dashboard/registrations`,
      });
      await sendEmail({ to: parentEmail, ...template }).catch(console.error);
    } else {
      const template = waitlistedEmail("en", {
        parentName,
        ninjaName,
        eventTitle: ev.title,
        position: result.position ?? 0,
      });
      await sendEmail({ to: parentEmail, ...template }).catch(console.error);
    }

    return ok(result, 201);
  } catch (e: any) {
    return err(e.message, e.statusCode ?? 500);
  }
};
