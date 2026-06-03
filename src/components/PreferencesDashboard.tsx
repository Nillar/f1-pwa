"use client";

import { useEffect, useMemo, useState } from "react";

import NotificationButton from "@/components/NotificationButton";
import Preferences from "@/components/Preferences";
import { RacePreferences } from "@/components/RacePreferences";
import { getCalendarMeetings, type CalendarMeeting } from "@/lib/calendar";
import {
    type PreferencesPayload,
    type RacePreferenceInput,
    type SessionPreferenceInput,
} from "@/lib/preferences";
import { formatWeekendRange } from "@/utils/formatTimes";
import styles from "./PreferencesDashboard.module.scss";

const EMPTY_PREFERENCES: PreferencesPayload = {
    globalPreferences: [],
    racePreferences: [],
};

type SaveState = "idle" | "saving" | "saved";

const SUCCESS_STATE_DURATION_MS = 2000;

export function PreferencesDashboard() {
    const meetings = getCalendarMeetings();
    const [userToken, setUserToken] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<PreferencesPayload>(EMPTY_PREFERENCES);
    const [loadingPreferences, setLoadingPreferences] = useState(false);
    const [globalSaveState, setGlobalSaveState] = useState<SaveState>("idle");
    const [raceSaveStates, setRaceSaveStates] = useState<Record<string, SaveState>>({});
    const [showPassedRaces, setShowPassedRaces] = useState(false);

    const { upcomingMeetings, passedMeetings } = useMemo(() => {
        const now = Date.now();
        const getMeetingRaceStart = (meeting: CalendarMeeting) => {
            const raceSession = meeting.sessions.find((session) => session.name === "Race");
            return raceSession
                ? new Date(raceSession.startTime).getTime()
                : new Date(meeting.endDate).getTime();
        };

        const sortedMeetings = [...meetings].sort(
            (left, right) => getMeetingRaceStart(left) - getMeetingRaceStart(right)
        );

        return {
            upcomingMeetings: sortedMeetings.filter(
                (meeting) => getMeetingRaceStart(meeting) > now
            ),
            passedMeetings: sortedMeetings
                .filter((meeting) => getMeetingRaceStart(meeting) <= now)
                .reverse(),
        };
    }, [meetings]);
    const totalSessions = meetings.reduce(
        (count, meeting) => count + meeting.sessions.length,
        0
    );
    const nextMeeting =
        meetings.find((meeting) => new Date(meeting.endDate).getTime() >= Date.now()) ??
        meetings[0];
    const nextRaceSession = nextMeeting.sessions.find((session) => session.name === "Race");
    const nextRaceLabel = nextRaceSession
        ? new Intl.DateTimeFormat(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
          }).format(new Date(nextRaceSession.startTime))
        : "Schedule pending";

    const showSavedState = async (onDone: () => void) => {
        await new Promise((resolve) => window.setTimeout(resolve, SUCCESS_STATE_DURATION_MS));
        onDone();
    };

    const loadPreferences = async (token: string) => {
        setLoadingPreferences(true);

        try {
            const response = await fetch(
                `/api/preferences?userToken=${encodeURIComponent(token)}`,
                {
                    cache: "no-store",
                }
            );

            const data: PreferencesPayload = await response.json();
            setPreferences(data);
        } catch (error) {
            console.error("Failed to load preferences", error);
        } finally {
            setLoadingPreferences(false);
        }
    };

    useEffect(() => {
        const existingToken = localStorage.getItem("userToken");

        if (!existingToken) {
            return;
        }

        setUserToken(existingToken);
        void loadPreferences(existingToken);
    }, []);

    const handleNotificationsEnabled = (nextUserToken: string) => {
        setUserToken(nextUserToken);
        void loadPreferences(nextUserToken);
    };

    const handleNotificationsDisabled = () => {
        setGlobalSaveState("idle");
        setRaceSaveStates({});
    };

    const saveGlobalPreferences = async (nextPreferences: SessionPreferenceInput[]) => {
        if (!userToken) {
            alert("Enable notifications first");
            return;
        }

        setGlobalSaveState("saving");

        try {
            const response = await fetch("/api/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userToken,
                    preferences: nextPreferences,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Failed to save preferences");
            }

            setPreferences(data);
            setGlobalSaveState("saved");
            await showSavedState(() => setGlobalSaveState("idle"));
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Error saving preferences");
            setGlobalSaveState("idle");
        }
    };

    const saveRacePreferences = async (nextPreferences: RacePreferenceInput) => {
        if (!userToken) {
            alert("Enable notifications first");
            return;
        }

        setRaceSaveStates((currentStates) => ({
            ...currentStates,
            [nextPreferences.meetingId]: "saving",
        }));

        try {
            const response = await fetch("/api/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userToken,
                    ...nextPreferences,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Failed to save race preferences");
            }

            setPreferences(data);
            setRaceSaveStates((currentStates) => ({
                ...currentStates,
                [nextPreferences.meetingId]: "saved",
            }));
            await showSavedState(() =>
                setRaceSaveStates((currentStates) => ({
                    ...currentStates,
                    [nextPreferences.meetingId]: "idle",
                }))
            );
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Error saving race preferences");
            setRaceSaveStates((currentStates) => ({
                ...currentStates,
                [nextPreferences.meetingId]: "idle",
            }));
        }
    };

    return (
        <div className={styles.dashboard}>
            <div className={styles.hero}>
                <div className={styles.heroPanel}>
                    <p className={styles.heroEyebrow}>Notifications Dashboard</p>
                    <h1 className={styles.title}>Manage race weekend reminders</h1>
                    <p className={styles.copy}>
                        Configure browser push notifications for the full season, then
                        layer race-specific overrides on top when one weekend needs extra
                        attention.
                    </p>

                    <div className={styles.heroMeta}>
                        <div className={styles.metaCard}>
                            <span className={styles.metaLabel}>Next weekend</span>
                            <strong className={styles.metaValue}>{nextMeeting.name}</strong>
                            <span className={styles.metaHint}>
                                {formatWeekendRange(nextMeeting)}
                            </span>
                        </div>
                        <div className={styles.metaCard}>
                            <span className={styles.metaLabel}>Race start</span>
                            <strong className={styles.metaValue}>{nextRaceLabel}</strong>
                            <span className={styles.metaHint}>{nextMeeting.location}</span>
                        </div>
                    </div>
                </div>

                <aside className={styles.sidePanel} aria-label="Season summary">
                    <div className={styles.statBlock}>
                        <span className={styles.statValue}>{meetings.length}</span>
                        <span className={styles.statLabel}>Grand Prix weekends</span>
                    </div>
                    <div className={styles.statBlock}>
                        <span className={styles.statValue}>{totalSessions}</span>
                        <span className={styles.statLabel}>Schedulable sessions</span>
                    </div>
                    <p className={styles.sideCopy}>
                        Start with a season-wide baseline, then tighten reminders only for
                        the rounds you care about most.
                    </p>
                </aside>
            </div>

            <NotificationButton
                onDisabledAction={handleNotificationsDisabled}
                onEnabledAction={handleNotificationsEnabled}
            />

            <Preferences
                loading={loadingPreferences}
                preferences={preferences.globalPreferences}
                saveState={globalSaveState}
                onSaveAction={saveGlobalPreferences}
            />

            <section className={styles.racesSection}>
                <div className={styles.sectionHeading}>
                    <p className={styles.eyebrow}>Race-specific controls</p>
                    <h2 className={styles.sectionTitle}>Upcoming weekends</h2>
                    <p className={styles.sectionCopy}>
                        Apply one-off overrides only where the season-wide defaults are too
                        broad or too quiet.
                    </p>
                </div>

                <div className={styles.raceList}>
                    {upcomingMeetings.map((meeting) => (
                        <RacePreferences
                            key={meeting.id}
                            globalPreferences={preferences.globalPreferences}
                            loading={loadingPreferences}
                            meeting={meeting}
                            preference={
                                preferences.racePreferences.find(
                                    (racePreference) => racePreference.meetingId === meeting.id
                                ) ?? null
                            }
                            saveState={raceSaveStates[meeting.id] ?? "idle"}
                            onSaveAction={saveRacePreferences}
                        />
                    ))}
                </div>
            </section>

            {passedMeetings.length > 0 && (
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
                        <div className={styles.archiveList}>
                            {passedMeetings.map((meeting) => (
                                <RacePreferences
                                    key={meeting.id}
                                    globalPreferences={preferences.globalPreferences}
                                    loading={loadingPreferences}
                                    meeting={meeting}
                                    preference={
                                        preferences.racePreferences.find(
                                            (racePreference) =>
                                                racePreference.meetingId === meeting.id
                                        ) ?? null
                                    }
                                    saveState={raceSaveStates[meeting.id] ?? "idle"}
                                    onSaveAction={saveRacePreferences}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
