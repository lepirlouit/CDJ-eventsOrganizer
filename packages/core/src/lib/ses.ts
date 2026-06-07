import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});
const FROM = process.env.SES_FROM_EMAIL ?? "noreply@cdj.pirlou.it";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject },
        Body: {
          Html: { Data: params.html, Charset: "UTF-8" },
          Text: { Data: params.text, Charset: "UTF-8" },
        },
      },
    })
  );
}
