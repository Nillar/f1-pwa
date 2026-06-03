import calendarData from "../../F1Calendar2026.json";

export type SessionType =
    | "Practice 1"
    | "Practice 2"
    | "Practice 3"
    | "Sprint Qualifying"
    | "Sprint"
    | "Qualifying"
    | "Race";

export type CalendarSession = {
    id: string;
    meetingId: string;
    meetingName: string;
    type: string;
    name: SessionType;
    startTime: string;
};

export type CalendarMeeting = {
    id: string;
    meetingKey: number;
    name: string;
    officialName: string;
    location: string;
    countryCode: string;
    countryName: string;
    countryFlag: string;
    circuitKey: number;
    circuitShortName: string;
    circuitType: string;
    circuitImage: string;
    gmtOffset: string;
    startDate: string;
    endDate: string;
    year: number;
    sessions: CalendarSession[];
};

export const SESSION_TYPES: SessionType[] = [
    "Practice 1",
    "Practice 2",
    "Practice 3",
    "Sprint Qualifying",
    "Sprint",
    "Qualifying",
    "Race",
];

const meetings = (calendarData as CalendarMeeting[])
    .map((meeting) => ({
        ...meeting,
        sessions: [...meeting.sessions].sort(
            (left, right) =>
                new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
        ),
    }))
    .sort(
        (left, right) =>
            new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
    );

export function getCalendarMeetings() {
    return meetings;
}

export function getCalendarMeeting(meetingId: string) {
    return meetings.find((meeting) => meeting.id === meetingId) ?? null;
}

export function getSessionTypesForMeetings() {
    return SESSION_TYPES.filter((sessionType) =>
        meetings.some((meeting) =>
            meeting.sessions.some((session) => session.name === sessionType)
        )
    );
}
