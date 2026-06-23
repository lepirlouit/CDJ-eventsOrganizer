import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  db, ok, err, getClaims, sendEmail,
  registrationConfirmedEmail, waitlistedEmail,
  getUserLang, registerParticipant, namesMatch,
} from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const {
    childId, parentName, parentEmail, parentPhone,
    atelierId, needsComputer, previousVisits, heardAbout,
    consentPhotos, consentContact, customAnswers,
  } = body;

  if (!childId || !parentName || !parentEmail || !atelierId) {
    return err("Required fields missing", 400);
  }

  // Load the saved child — its name/birthdate are authoritative, giving the
  // registration a stable participant identity instead of client-typed values.
  const childResult = await db.entities.child.query.byId({ childId }).go();
  const child = childResult.data[0];
  if (!child) return err("Child not found", 404);
  if (child.userId !== claims.sub) return err("Forbidden", 403);

  const ninjaName = child.name;
  const ninjaBirthdate = child.birthdate;

  // A child's name must differ from the parent's — guards against accidentally
  // registering the guardian as the participant.
  if (namesMatch(ninjaName, parentName)) {
    return err("The child's name must be different from the parent's name", 400);
  }

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  // Validate the dojo's active custom questions: required ones must be answered.
  const questionsResult = await db.entities.customQuestion.query.byDojo({ dojoId: ev.dojoId }).go();
  const activeQuestions = questionsResult.data.filter((q) => q.active);
  const answers: Record<string, unknown> = customAnswers ?? {};
  for (const q of activeQuestions) {
    if (!q.required) continue;
    const a = answers[q.questionId];
    const missing = a === undefined || a === null || a === "" || (q.type === "checkbox" && a !== true);
    if (missing) return err(`Missing answer for required question: ${q.label}`, 400);
  }

  try {
    const result = await registerParticipant({
      eventId,
      dojoId: ev.dojoId,
      userId: claims.sub,
      callerRole: claims["custom:role"],
      childId,
      registeredByUserId: claims.sub,
      ninjaName,
      ninjaBirthdate,
      ninjaGender: child.gender,
      parentName,
      parentEmail,
      parentPhone,
      atelierId,
      needsComputer: needsComputer ?? false,
      previousVisits: previousVisits ?? child.previousVisits ?? 0,
      heardAbout,
      consentPhotos: consentPhotos ?? false,
      consentContact: consentContact ?? false,
      customAnswers: activeQuestions.length > 0 ? answers : undefined,
    });

    const lang = await getUserLang(db, claims.sub);
    const atelierName = ev.ateliers?.find((a) => a.atelierId === atelierId)?.name ?? atelierId;

    if (result.status === "confirmed") {
      const template = registrationConfirmedEmail(lang, {
        parentName,
        ninjaName,
        eventTitle: ev.title,
        eventDate: ev.date,
        eventAddress: ev.location?.address ?? "",
        atelierName,
        cancellationUrl: `${process.env.WEB_URL ?? ""}/dashboard/registrations`,
      });
      await sendEmail({ to: parentEmail, ...template }).catch(console.error);
    } else {
      const template = waitlistedEmail(lang, {
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
