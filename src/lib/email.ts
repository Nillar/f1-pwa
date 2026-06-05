import { Resend } from "resend";
import { magicLinkTemplate, reminderTemplate } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "F1 Reminders <onboarding@resend.dev>";

export async function sendMagicLink(email: string, url: string) {
    return resend.emails.send({
        from: FROM,
        to: email,
        subject: "Sign in to F1 Reminders",
        html: magicLinkTemplate(url),
    });
}

export type ReminderEmailPayload = {
    raceName: string;
    sessionName: string;
    sessionStartFormatted: string;
    reminderLabel: string;
};

export async function sendReminderEmail(email: string, payload: ReminderEmailPayload) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://f1-pwa.vercel.app";
    return resend.emails.send({
        from: FROM,
        to: email,
        subject: `F1 Reminder: ${payload.raceName} — ${payload.sessionName}`,
        html: reminderTemplate({ ...payload, appUrl }),
    });
}
