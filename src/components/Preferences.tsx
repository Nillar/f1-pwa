"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { ReminderFields } from "@/components/ReminderFields";
import { getSessionTypesForMeetings } from "@/lib/calendar";
import { type SessionPreferenceInput } from "@/lib/preferences";
import {
    draftToMinutes,
    formatReminderList,
    minutesToDraft,
    type ReminderDraft,
} from "@/lib/reminders";
import styles from "./Preferences.module.scss";

type PreferencesProps = {
    loading: boolean;
    preferences: SessionPreferenceInput[];
    saveState: "idle" | "saving" | "saved";
    onSaveAction: (preferences: SessionPreferenceInput[]) => Promise<void>;
};

type EditableSessionPreference = {
    enabled: boolean;
    reminders: ReminderDraft[];
};

const SESSION_TYPES = getSessionTypesForMeetings();

function createDefaultReminder() {
    return minutesToDraft(24 * 60);
}

function buildEditablePreferences(preferences: SessionPreferenceInput[]) {
    return Object.fromEntries(
        SESSION_TYPES.map((sessionType) => {
            const existingPreference = preferences.find(
                (preference) => preference.sessionType === sessionType
            );

            return [
                sessionType,
                {
                    enabled: Boolean(existingPreference),
                    reminders:
                        existingPreference?.reminders.map(minutesToDraft) ?? [
                            createDefaultReminder(),
                        ],
                },
            ];
        })
    ) as Record<string, EditableSessionPreference>;
}

export default function Preferences({
    loading,
    preferences,
    saveState,
    onSaveAction,
}: PreferencesProps) {
    const [draft, setDraft] = useState<Record<string, EditableSessionPreference>>(
        () => buildEditablePreferences(preferences)
    );

    useEffect(() => {
        setDraft(buildEditablePreferences(preferences));
    }, [preferences]);

    const summary = useMemo(
        () =>
            preferences.length === 0
                ? "No global reminders configured yet."
                : preferences
                    .map(
                        (preference) =>
                            `${preference.sessionType}: ${formatReminderList(preference.reminders)}`
                    )
                    .join(" | "),
        [preferences]
    );

    const toggleSession = (sessionType: string) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            [sessionType]: {
                ...currentDraft[sessionType],
                enabled: !currentDraft[sessionType].enabled,
                reminders: currentDraft[sessionType].enabled
                    ? currentDraft[sessionType].reminders
                    : currentDraft[sessionType].reminders.length > 0
                        ? currentDraft[sessionType].reminders
                        : [createDefaultReminder()],
            },
        }));
    };

    const updateReminders = (sessionType: string, reminders: ReminderDraft[]) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            [sessionType]: {
                ...currentDraft[sessionType],
                reminders,
            },
        }));
    };

    const savePreferences = async () => {
        const nextPreferences = SESSION_TYPES.flatMap((sessionType) => {
            const sessionPreference = draft[sessionType];

            if (!sessionPreference.enabled) {
                return [];
            }

            return [
                {
                    sessionType,
                    reminders: sessionPreference.reminders.map(draftToMinutes),
                },
            ];
        });

        await onSaveAction(nextPreferences);
    };

    return (
        <section className={styles.preferencesSection}>
            <div className={styles.header}>
                <p className={styles.eyebrow}>Season baseline</p>
                <h2 className={styles.title}>Global Notification Preferences</h2>
                <p className={styles.summary}>{summary}</p>
            </div>

            {loading ? (
                <p>Loading saved preferences...</p>
            ) : (
                <div className={styles.sessionList}>
                    {SESSION_TYPES.map((sessionType) => (
                        <div
                            className={`${styles.sessionCard} ${draft[sessionType].enabled ? styles.sessionCardActive : ""}`}
                            key={sessionType}
                        >
                            <label className={styles.toggleRow}>
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    checked={draft[sessionType].enabled}
                                    onChange={() => toggleSession(sessionType)}
                                />
                                <span className={styles.checkboxControl} aria-hidden="true" />
                                <span className={styles.toggleCopy}>
                                    <strong>{sessionType}</strong>
                                    <span>
                                        {draft[sessionType].enabled
                                            ? "Global reminders enabled for every race weekend."
                                            : "No default reminders for this session type."}
                                    </span>
                                </span>
                            </label>

                            {draft[sessionType].enabled ? (
                                <ReminderFields
                                    reminders={draft[sessionType].reminders}
                                    onChangeAction={(reminders) =>
                                        updateReminders(sessionType, reminders)
                                    }
                                />
                            ) : (
                                <p className={styles.emptyText}>
                                    No global reminders for this session.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div>
                <Button
                    onClick={() => void savePreferences()}
                    disabled={saveState === "saving" || loading}
                >
                    {saveState === "saving"
                        ? "Saving..."
                        : saveState === "saved"
                            ? "Saved!"
                            : "Save Preferences"}
                </Button>
            </div>
        </section>
    );
}
