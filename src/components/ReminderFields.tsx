"use client";

import { Button } from "@/components/Button";
import { MAX_REMINDER_DAYS, MAX_REMINDERS_PER_SESSION } from "@/lib/preferences";
import { type ReminderDraft } from "@/lib/reminders";
import styles from "./ReminderFields.module.scss";

type ReminderFieldsProps = {
    reminders: ReminderDraft[];
    onChangeAction: (nextReminders: ReminderDraft[]) => void;
};

const DAY_OPTIONS = Array.from(
    { length: MAX_REMINDER_DAYS },
    (_, index) => index + 1
);

export function ReminderFields({ reminders, onChangeAction }: ReminderFieldsProps) {
    const updateReminder = (reminderId: string, value: number) => {
        onChangeAction(
            reminders.map((reminder) =>
                reminder.id === reminderId
                    ? {
                        ...reminder,
                        value,
                    }
                    : reminder
            )
        );
    };

    const removeReminder = (reminderId: string) => {
        if (reminders.length === 1) {
            return;
        }

        onChangeAction(reminders.filter((reminder) => reminder.id !== reminderId));
    };

    const addReminder = () => {
        if (reminders.length >= MAX_REMINDERS_PER_SESSION) {
            return;
        }

        const usedDays = new Set(reminders.map((reminder) => reminder.value));
        const nextAvailableDay = DAY_OPTIONS.find((day) => !usedDays.has(day));

        if (!nextAvailableDay) {
            return;
        }

        onChangeAction([
            ...reminders,
            {
                id: crypto.randomUUID(),
                value: nextAvailableDay,
            },
        ]);
    };

    return (
        <div className={styles.reminderFields}>
            {reminders.map((reminder) => (
                <div key={reminder.id} className={styles.reminderRow}>
                    <select
                        className={styles.daySelect}
                        value={reminder.value}
                        onChange={(event) =>
                            updateReminder(
                                reminder.id,
                                Number(event.target.value)
                            )
                        }
                    >
                        {DAY_OPTIONS.map((day) => (
                            <option
                                disabled={reminders.some(
                                    (currentReminder) =>
                                        currentReminder.id !== reminder.id &&
                                        currentReminder.value === day
                                )}
                                key={day}
                                value={day}
                            >
                                {day} day{day === 1 ? "" : "s"} before
                            </option>
                        ))}
                    </select>

                    <Button
                        onClick={() => removeReminder(reminder.id)}
                        variant="secondary"
                    >
                        Remove
                    </Button>
                </div>
            ))}

            <Button
                className={styles.addButton}
                onClick={addReminder}
                disabled={
                    reminders.length >= MAX_REMINDERS_PER_SESSION ||
                    reminders.length >= DAY_OPTIONS.length
                }
                variant="secondary"
            >
                Add daily reminder
            </Button>
        </div>
    );
}
