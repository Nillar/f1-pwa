"use client";

import { useEffect, useMemo, useState } from "react";

import { RaceCard } from "@/components/RaceCard";
import { SessionCountdownCard } from "@/components/SessionCountdownCard";
import {type CalendarMeeting, getCalendarMeetings} from "@/lib/calendar";
import styles from "./CalendarOverview.module.scss";
import Link from "next/link";
import {formatHeroDate, formatWeekendRange} from "@/utils/formatTimes";

export function CalendarOverview() {
    const [isHydrated, setIsHydrated] = useState(false);
    const [now, setNow] = useState(0);
    const [showPassedRaces, setShowPassedRaces] = useState(false);
    const meetings = getCalendarMeetings();

    useEffect(() => {
        setIsHydrated(true);

        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    const { nextMeeting, upcomingMeetings, passedMeetings } = useMemo(() => {
        const getMeetingRaceStart = (meeting: CalendarMeeting) => {
            const raceSession = meeting.sessions.find((session) => session.name === "Race");
            return raceSession
                ? new Date(raceSession.startTime).getTime()
                : new Date(meeting.endDate).getTime();
        };

        const sortedMeetings = [...meetings].sort(
            (left, right) => getMeetingRaceStart(left) - getMeetingRaceStart(right)
        );
        const nextMeetingIndex = sortedMeetings.findIndex(
            (meeting) => getMeetingRaceStart(meeting) > now
        );
        const resolvedNextMeeting =
            nextMeetingIndex >= 0
                ? sortedMeetings[nextMeetingIndex]
                : sortedMeetings[sortedMeetings.length - 1];

        const remainingMeetings = sortedMeetings.filter(
            (meeting) => meeting.id !== resolvedNextMeeting.id
        );

        return {
            nextMeeting: resolvedNextMeeting,
            upcomingMeetings: remainingMeetings.filter(
                (meeting) => getMeetingRaceStart(meeting) > now
            ),
            passedMeetings: remainingMeetings
                .filter((meeting) => getMeetingRaceStart(meeting) <= now)
                .reverse(),
        };
    }, [meetings, now]);

    if (!isHydrated) {
        return (
            <div className={styles.calendarOverview}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Season Calendar</p>
                        <div className={styles.loadingBlock}>
                            Preparing the live race calendar for your local timezone.
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <>
            <div className={styles.topBar}>
                <p className={styles.eyebrow}>Season Calendar</p>
                <Link className={styles.linkButton} href="/notifications-dashboard">
                    Notification dashboard
                </Link>
            </div>

            <h1 className={styles.title}>Track every Formula 1 event in real time.</h1>

            <div className={styles.calendarOverview}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Next Race Weekend</p>

                        <h1 className={styles.heroTitle}>{nextMeeting.name}</h1>
                        <p className={styles.heroMeta}>
                            {nextMeeting.location}, {nextMeeting.countryName} / {formatWeekendRange(nextMeeting)}
                        </p>

                        <p className={styles.heroDescription}>
                            {formatHeroDate(nextMeeting)}.
                        </p>

                        <p className={styles.heroDescription}>All countdowns are shown in your local timezone.</p>
                    </div>


                    <RaceCard meeting={nextMeeting} now={now} variant="hero" />
                </section>

                <section className={styles.sessionsSection}>
                    <div className={styles.sectionHeading}>
                        <p className={styles.eyebrow}>Weekend Sessions</p>
                        <h2 className={styles.sectionTitle}>{nextMeeting.name}</h2>
                    </div>

                    <div className={styles.sessionsGrid}>
                        {nextMeeting.sessions.filter( session => session.name !== "Race").map((session) =>(
                            <SessionCountdownCard key={session.id} now={now} session={session} />
                        ))}
                    </div>
                </section>

                <section className={styles.racesSection}>
                    <div className={styles.sectionHeading}>
                        <p className={styles.eyebrow}>Upcoming Weekends</p>
                        <h2 className={styles.sectionTitle}>The rest of the season</h2>
                    </div>

                    <div className={styles.raceGrid}>
                        {upcomingMeetings.map((meeting) => (
                            <RaceCard key={meeting.id} meeting={meeting} now={now} variant="compact" />
                        ))}
                    </div>
                </section>

                <section className={styles.archiveSection}>
                    <button
                        className={styles.archiveToggle}
                        onClick={() => setShowPassedRaces((current) => !current)}
                        type="button"
                    >
                        <span>Passed races</span>
                        <span>{showPassedRaces ? "Hide" : `Show ${passedMeetings.length}`}</span>
                    </button>

                    {showPassedRaces && (
                        <div className={styles.archiveGrid}>
                            {passedMeetings.map((meeting) => (
                                <RaceCard key={meeting.id} meeting={meeting} now={now} variant="archive" />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
