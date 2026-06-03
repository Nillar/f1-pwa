"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { ReminderFields } from "@/components/ReminderFields";
import { type CalendarMeeting } from "@/lib/calendar";
import { type RacePreferenceInput, type SessionPreferenceInput } from "@/lib/preferences";
import {
    draftToMinutes,
    formatReminderList,
    minutesToDraft,
    type ReminderDraft,
} from "@/lib/reminders";
import styles from "./RacePreferences.module.scss";

type RacePreferencesProps = {
    globalPreferences: SessionPreferenceInput[];
    loading: boolean;
    meeting: CalendarMeeting;
    preference: RacePreferenceInput | null;
    saveState: "idle" | "saving" | "saved";
    onSaveAction: (preference: RacePreferenceInput) => Promise<void>;
};

type EditableRaceSessionPreference = {
    hasOverride: boolean;
    reminders: ReminderDraft[];
};

function createDefaultReminder() {
    return minutesToDraft(24 * 60);
}

function buildEditableRacePreference(
    meeting: CalendarMeeting,
    preference: RacePreferenceInput | null
) {
    return {
        disableAll: preference?.disableAll ?? false,
        overrides: Object.fromEntries(
            meeting.sessions.map((session) => {
                const existingOverride = preference?.sessionPreferences.find(
                    (sessionPreference) => sessionPreference.sessionType === session.name
                );

                return [
                    session.name,
                    {
                        hasOverride: Boolean(existingOverride),
                        reminders:
                            existingOverride?.reminders.map(minutesToDraft) ?? [
                                createDefaultReminder(),
                            ],
                    },
                ];
            })
        ) as Record<string, EditableRaceSessionPreference>,
    };
}

export function RacePreferences({
    globalPreferences,
    loading,
    meeting,
    preference,
    saveState,
    onSaveAction,
}: RacePreferencesProps) {
    const [draft, setDraft] = useState(() =>
        buildEditableRacePreference(meeting, preference)
    );

    useEffect(() => {
        setDraft(buildEditableRacePreference(meeting, preference));
    }, [meeting, preference]);

    const globalPreferenceMap = useMemo(
        () =>
            new Map(
                globalPreferences.map((sessionPreference) => [
                    sessionPreference.sessionType,
                    sessionPreference.reminders,
                ])
            ),
        [globalPreferences]
    );

    const saveRacePreference = async () => {
        await onSaveAction({
            meetingId: meeting.id,
            disableAll: draft.disableAll,
            sessionPreferences: meeting.sessions.flatMap((session) => {
                const sessionDraft = draft.overrides[session.name];

                if (!sessionDraft.hasOverride) {
                    return [];
                }

                return [
                    {
                        sessionType: session.name,
                        reminders: sessionDraft.reminders.map(draftToMinutes),
                    },
                ];
            }),
        });
    };

    const toggleOverride = (sessionType: string) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            overrides: {
                ...currentDraft.overrides,
                [sessionType]: {
                    ...currentDraft.overrides[sessionType],
                    hasOverride: !currentDraft.overrides[sessionType].hasOverride,
                    reminders: currentDraft.overrides[sessionType].hasOverride
                        ? currentDraft.overrides[sessionType].reminders
                        : currentDraft.overrides[sessionType].reminders.length > 0
                            ? currentDraft.overrides[sessionType].reminders
                            : [createDefaultReminder()],
                },
            },
        }));
    };

    const updateOverrideReminders = (sessionType: string, reminders: ReminderDraft[]) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            overrides: {
                ...currentDraft.overrides,
                [sessionType]: {
                    ...currentDraft.overrides[sessionType],
                    reminders,
                },
            },
        }));
    };

    return (
        <section className={styles.raceSection}>
            <div className={styles.header}>
                <div className={styles.headerCopy}>
                    <p className={styles.eyebrow}>Race override</p>
                    <h3 className={styles.title}>{meeting.name}</h3>
                    <p className={styles.location}>
                        {meeting.location}, {meeting.countryName}
                    </p>
                </div>

                <label className={styles.masterToggle}>
                    <input
                        className={styles.checkbox}
                        type="checkbox"
                        checked={draft.disableAll}
                        onChange={() =>
                            setDraft((currentDraft) => ({
                                ...currentDraft,
                                disableAll: !currentDraft.disableAll,
                            }))
                        }
                    />
                    <span className={styles.checkboxControl} aria-hidden="true" />
                    <span className={styles.toggleCopy}>
                        <strong>Mute this race</strong>
                        <span>Turn off every session reminder for this weekend.</span>
                    </span>
                </label>
            </div>

            {draft.disableAll ? (
                <p className={styles.mutedText}>
                    All notifications for this event are currently disabled.
                </p>
            ) : loading ? (
                <p>Loading saved preferences...</p>
            ) : (
                <div className={styles.sessionList}>
                    {meeting.sessions.map((session) => {
                        const override = draft.overrides[session.name];
                        const inheritedReminders =
                            globalPreferenceMap.get(session.name) ?? [];
                        const effectiveReminders = override.hasOverride
                            ? override.reminders.map(draftToMinutes)
                            : inheritedReminders;

                        return (
                            <div
                                className={`${styles.sessionCard} ${override.hasOverride ? styles.sessionCardActive : ""}`}
                                key={session.id}
                            >
                                <div className={styles.sessionHeader}>
                                    <div className={styles.sessionSummary}>
                                        <p className={styles.sessionName}>
                                            <strong>{session.name}</strong>
                                        </p>
                                        <p className={styles.effectiveText}>
                                            Effective reminders: {formatReminderList(effectiveReminders)}
                                        </p>
                                    </div>

                                    <label className={styles.sessionToggle}>
                                        <input
                                            className={styles.checkbox}
                                            type="checkbox"
                                            checked={override.hasOverride}
                                            onChange={() => toggleOverride(session.name)}
                                        />
                                        <span
                                            className={styles.checkboxControl}
                                            aria-hidden="true"
                                        />
                                        <span className={styles.toggleCopy}>
                                            <strong>
                                                {override.hasOverride ? "Custom" : "Inherit"}
                                            </strong>
                                            <span>
                                                {override.hasOverride
                                                    ? "This session uses race-specific reminders."
                                                    : "This session follows the season baseline."}
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <div className={styles.sessionBody}>
                                    {override.hasOverride ? (
                                        <ReminderFields
                                            reminders={override.reminders}
                                            onChangeAction={(reminders) =>
                                                updateOverrideReminders(session.name, reminders)
                                            }
                                        />
                                    ) : inheritedReminders.length > 0 ? (
                                        <p className={styles.hintText}>
                                            Inheriting global reminders for this session.
                                        </p>
                                    ) : (
                                        <p className={styles.hintText}>
                                            No global reminder configured for this session.
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div>
                <Button
                    onClick={() => void saveRacePreference()}
                    disabled={saveState === "saving"}
                >
                    {saveState === "saving"
                        ? "Saving..."
                        : saveState === "saved"
                            ? "Saved!"
                            : "Save for this race"}
                </Button>
            </div>
        </section>
    );
}
