export type ReminderDraft = {
    id: string;
    value: number;
};

const MINUTES_PER_DAY = 24 * 60;

export function minutesToDraft(minutesBefore: number): ReminderDraft {
    return {
        id: crypto.randomUUID(),
        value: Math.max(1, Math.ceil(minutesBefore / MINUTES_PER_DAY)),
    };
}

export function draftToMinutes(reminder: ReminderDraft) {
    return reminder.value * MINUTES_PER_DAY;
}

export function formatReminder(minutesBefore: number) {
    const days = Math.max(1, Math.ceil(minutesBefore / MINUTES_PER_DAY));

    return `${days} day${days === 1 ? "" : "s"} before`;
}

export function formatReminderList(reminders: number[]) {
    if (reminders.length === 0) {
        return "No reminders";
    }

    return reminders
        .slice()
        .sort((left, right) => right - left)
        .map(formatReminder)
        .join(", ");
}
