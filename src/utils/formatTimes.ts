import type {CalendarMeeting} from "@/lib/calendar";

export function getCountdownParts(targetTime: string, now: number) {
    const difference = new Date(targetTime).getTime() - now;

    if (difference <= 0) {
        return null;
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
}

export function formatTargetTime(targetTime: string) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(targetTime));
}

export function formatHeroDate(meeting: CalendarMeeting) {
    const raceSession = meeting.sessions.find((session) => session.name === "Race");
    const raceStart = raceSession
        ? new Date(raceSession.startTime).getTime()
        : new Date(meeting.endDate).getTime();

    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(raceStart);
}

export function formatWeekendRange(meeting: CalendarMeeting) {
    const start = new Date(meeting.startDate);
    const end = new Date(meeting.endDate);

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).formatRange(start, end);
}