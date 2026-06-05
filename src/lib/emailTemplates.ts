export function magicLinkTemplate(url: string) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f2ea;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(68,34,20,0.12)">
    <div style="margin-bottom:24px">
      <span style="background:#db3f2f;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:999px;font-weight:600">Formula 1</span>
    </div>
    <h1 style="font-size:24px;margin:0 0 12px;color:#1b1b1b;font-weight:700">Sign in to F1 Reminders</h1>
    <p style="color:rgba(27,27,27,0.7);line-height:1.6;margin:0 0 28px;font-size:15px">Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
    <a href="${url}" style="display:inline-block;background:#db3f2f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px">Sign in</a>
    <p style="color:rgba(27,27,27,0.45);font-size:13px;margin:28px 0 0;line-height:1.5">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`;
}

type ReminderPayload = {
    raceName: string;
    sessionName: string;
    sessionStartFormatted: string;
    reminderLabel: string;
    appUrl: string;
};

export function reminderTemplate({ raceName, sessionName, sessionStartFormatted, reminderLabel, appUrl }: ReminderPayload) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f2ea;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(68,34,20,0.12)">
    <div style="margin-bottom:20px">
      <span style="background:#db3f2f;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:999px;font-weight:600">F1 Reminder</span>
    </div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#1b1b1b;font-weight:700">${raceName}</h1>
    <p style="font-size:20px;font-weight:700;margin:0 0 20px;color:#db3f2f">${sessionName}</p>
    <p style="color:rgba(27,27,27,0.7);line-height:1.7;margin:0 0 24px;font-size:15px">
      Starts <strong style="color:#1b1b1b">${sessionStartFormatted}</strong>.<br>
      This is your <strong style="color:#1b1b1b">${reminderLabel}</strong> reminder.
    </p>
    <a href="${appUrl}" style="display:inline-block;background:#db3f2f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px">View Calendar</a>
  </div>
</body>
</html>`;
}
