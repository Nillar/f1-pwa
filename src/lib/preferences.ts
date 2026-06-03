import { getCalendarMeeting } from "@/lib/calendar";

export const MAX_REMINDERS_PER_SESSION = 3;
export const MINUTES_PER_DAY = 24 * 60;
export const MAX_REMINDER_DAYS = 7;
export const MAX_REMINDER_MINUTES = 7 * 24 * 60;

export type SessionPreferenceInput = {
    sessionType: string;
    reminders: number[];
};

export type RacePreferenceInput = {
    meetingId: string;
    disableAll: boolean;
    sessionPreferences: SessionPreferenceInput[];
};

export type PreferencesPayload = {
    globalPreferences: SessionPreferenceInput[];
    racePreferences: RacePreferenceInput[];
};

export class PreferencesValidationError extends Error {
    constructor(message: string, public readonly status = 400) {
        super(message);
    }
}

function normalizeReminder(minutesBefore: number) {
    if (!Number.isInteger(minutesBefore)) {
        throw new PreferencesValidationError("Reminder values must be whole-day offsets");
    }

    if (minutesBefore <= 0 || minutesBefore > MAX_REMINDER_MINUTES) {
        throw new PreferencesValidationError("Reminder values must be between 1 and 7 days");
    }

    if (minutesBefore % MINUTES_PER_DAY !== 0) {
        throw new PreferencesValidationError("Reminders must be set in whole days");
    }

    return minutesBefore;
}

export function normalizeSessionPreferences(
    preferences: SessionPreferenceInput[] | undefined
) {
    if (!Array.isArray(preferences)) {
        throw new PreferencesValidationError("Preferences must be an array");
    }

    const seenSessionTypes = new Set<string>();

    return preferences.map((preference) => {
        if (!preference?.sessionType || typeof preference.sessionType !== "string") {
            throw new PreferencesValidationError("Each preference requires a sessionType");
        }

        if (seenSessionTypes.has(preference.sessionType)) {
            throw new PreferencesValidationError(`Duplicate session type: ${preference.sessionType}`);
        }

        seenSessionTypes.add(preference.sessionType);

        if (!Array.isArray(preference.reminders)) {
            throw new PreferencesValidationError("Each preference requires a reminders array");
        }

        if (preference.reminders.length === 0) {
            throw new PreferencesValidationError("Enabled sessions need at least one reminder");
        }

        if (preference.reminders.length > MAX_REMINDERS_PER_SESSION) {
            throw new PreferencesValidationError("A session can have at most 3 daily reminders");
        }

        const uniqueReminders = Array.from(
            new Set(preference.reminders.map(normalizeReminder))
        ).sort((left, right) => right - left);

        if (uniqueReminders.length !== preference.reminders.length) {
            throw new PreferencesValidationError(`Only one reminder per day is allowed for ${preference.sessionType}`);
        }

        return {
            sessionType: preference.sessionType,
            reminders: uniqueReminders,
        };
    });
}

export function normalizeRacePreferenceInput(input: RacePreferenceInput) {
    if (!input?.meetingId || typeof input.meetingId !== "string") {
        throw new PreferencesValidationError("meetingId is required");
    }

    if (!getCalendarMeeting(input.meetingId)) {
        throw new PreferencesValidationError("Unknown meetingId");
    }

    return {
        meetingId: input.meetingId,
        disableAll: Boolean(input.disableAll),
        sessionPreferences: normalizeSessionPreferences(input.sessionPreferences),
    };
}

export function buildPreferencesPayload(
    globalPreferences: {
        sessionType: string;
        reminders: { minutesBefore: number }[];
    }[],
    raceSettings: {
        meetingId: string;
        notificationsEnabled: boolean;
    }[],
    racePreferencesByMeetingId: Map<
        string,
        {
            sessionType: string;
            reminders: { minutesBefore: number }[];
        }[]
    >
): PreferencesPayload {
    return {
        globalPreferences: globalPreferences.map((preference) => ({
            sessionType: preference.sessionType,
            reminders: preference.reminders
                .map((reminder) => reminder.minutesBefore)
                .sort((left, right) => right - left),
        })),
        racePreferences: raceSettings.map((racePreference) => ({
            meetingId: racePreference.meetingId,
            disableAll: !racePreference.notificationsEnabled,
            sessionPreferences: (
                racePreferencesByMeetingId.get(racePreference.meetingId) ?? []
            ).map((preference) => ({
                sessionType: preference.sessionType,
                reminders: preference.reminders
                    .map((reminder) => reminder.minutesBefore)
                    .sort((left, right) => right - left),
            })),
        })),
    };
}
