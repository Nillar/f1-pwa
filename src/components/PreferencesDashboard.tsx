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
type ChannelState = { pushEnabled: boolean; emailEnabled: boolean };

const SUCCESS_STATE_DURATION_MS = 2000;

type PreferencesDashboardProps = {
    userEmail: string;
};

export function PreferencesDashboard({ userEmail }: PreferencesDashboardProps) {
    const meetings = getCalendarMeetings();
    const [preferences, setPreferences] = useState<PreferencesPayload>(EMPTY_PREFERENCES);
    const [channels, setChannels] = useState<ChannelState>({ pushEnabled: true, emailEnabled: false });
    const [loadingPreferences, setLoadingPreferences] = useState(true);
    const [globalSaveState, setGlobalSaveState] = useState<SaveState>("idle");
    const [raceSaveStates, setRaceSaveStates] = useState<Record<string, SaveState>>({});
    const [showPassedRaces, setShowPassedRaces] = useState(false);

    const { upcomingMeetings, passedMeetings } = useMemo(() => {
        const now = Date.now();
        const getMeetingRaceStart = (meeting: CalendarMeeting) => {
            const raceSession = meeting.sessions.find((s) => s.name === "Race");
            return raceSession
                ? new Date(raceSession.startTime).getTime()
                : new Date(meeting.endDate).getTime();
        };

        const sortedMeetings = [...meetings].sort(
            (a, b) => getMeetingRaceStart(a) - getMeetingRaceStart(b)
        );

        return {
            upcomingMeetings: sortedMeetings.filter((m) => getMeetingRaceStart(m) > now),
            passedMeetings: sortedMeetings
                .filter((m) => getMeetingRaceStart(m) <= now)
                .reverse(),
        };
    }, [meetings]);

    const totalSessions = meetings.reduce((count, m) => count + m.sessions.length, 0);
    const nextMeeting =
        meetings.find((m) => new Date(m.endDate).getTime() >= Date.now()) ?? meetings[0];
    const nextRaceSession = nextMeeting.sessions.find((s) => s.name === "Race");
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

    const loadPreferences = async () => {
        setLoadingPreferences(true);
        try {
            const [prefsRes, channelsRes] = await Promise.all([
                fetch("/api/preferences", { cache: "no-store" }),
                fetch("/api/preferences/channels", { cache: "no-store" }),
            ]);
            const prefsData: PreferencesPayload = await prefsRes.json();
            const channelsData: ChannelState = await channelsRes.json();
            setPreferences(prefsData);
            setChannels(channelsData);
        } catch (error) {
            console.error("Failed to load preferences", error);
        } finally {
            setLoadingPreferences(false);
        }
    };

    useEffect(() => {
        void loadPreferences();
    }, []);

    const handleChannelToggle = async (key: keyof ChannelState, value: boolean) => {
        const next = { ...channels, [key]: value };
        setChannels(next);
        try {
            await fetch("/api/preferences/channels", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });
        } catch (error) {
            console.error("Failed to save channel preference", error);
            setChannels(channels);
        }
    };

    const saveGlobalPreferences = async (nextPreferences: SessionPreferenceInput[]) => {
        setGlobalSaveState("saving");
        try {
            const response = await fetch("/api/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferences: nextPreferences }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? "Failed to save preferences");

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
        setRaceSaveStates((s) => ({ ...s, [nextPreferences.meetingId]: "saving" }));
        try {
            const response = await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nextPreferences),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? "Failed to save race preferences");

            setPreferences(data);
            setRaceSaveStates((s) => ({ ...s, [nextPreferences.meetingId]: "saved" }));
            await showSavedState(() =>
                setRaceSaveStates((s) => ({ ...s, [nextPreferences.meetingId]: "idle" }))
            );
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Error saving race preferences");
            setRaceSaveStates((s) => ({ ...s, [nextPreferences.meetingId]: "idle" }));
        }
    };

    return (
        <div className={styles.dashboard}>
            <div className={styles.hero}>
                <div className={styles.heroPanel}>
                    <p className={styles.heroEyebrow}>Notifications Dashboard</p>
                    <h1 className={styles.title}>Manage race weekend reminders</h1>
                    <p className={styles.copy}>
                        Configure notifications for the full season, then layer race-specific
                        overrides on top when one weekend needs extra attention.
                    </p>

                    <div className={styles.heroMeta}>
                        <div className={styles.metaCard}>
                            <span className={styles.metaLabel}>Next weekend</span>
                            <strong className={styles.metaValue}>{nextMeeting.name}</strong>
                            <span className={styles.metaHint} suppressHydrationWarning>
                                {formatWeekendRange(nextMeeting)}
                            </span>
                        </div>
                        <div className={styles.metaCard}>
                            <span className={styles.metaLabel}>Race start</span>
                            <strong className={styles.metaValue} suppressHydrationWarning>{nextRaceLabel}</strong>
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
                        Signed in as <strong>{userEmail}</strong>.{" "}
                        <a className={styles.signOutLink} href="/api/auth/logout">
                            Sign out
                        </a>
                    </p>
                </aside>
            </div>

            <section className={styles.channelSection}>
                <p className={styles.eyebrow}>Delivery channels</p>
                <h2 className={styles.sectionTitle}>How to notify you</h2>
                <p className={styles.sectionCopy}>
                    Push notifications work on Chrome and Android. Email works everywhere —
                    including iOS and any browser.
                </p>
                <div className={styles.channelList}>
                    <label className={styles.channelOption}>
                        <input
                            type="checkbox"
                            checked={channels.pushEnabled}
                            onChange={(e) => void handleChannelToggle("pushEnabled", e.target.checked)}
                        />
                        <div>
                            <strong>Push notifications</strong>
                            <p>Chrome, Android, iOS 16.4+ (installed PWA only)</p>
                        </div>
                    </label>
                    <label className={styles.channelOption}>
                        <input
                            type="checkbox"
                            checked={channels.emailEnabled}
                            onChange={(e) => void handleChannelToggle("emailEnabled", e.target.checked)}
                        />
                        <div>
                            <strong>Email</strong>
                            <p>Works everywhere — sent to {userEmail}</p>
                        </div>
                    </label>
                </div>
            </section>

            {channels.pushEnabled && (
                <NotificationButton
                    onDisabledAction={() => {}}
                    onEnabledAction={() => {}}
                />
            )}

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
                                    (rp) => rp.meetingId === meeting.id
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
                        onClick={() => setShowPassedRaces((c) => !c)}
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
                                            (rp) => rp.meetingId === meeting.id
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
