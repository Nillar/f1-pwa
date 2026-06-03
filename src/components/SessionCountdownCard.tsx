"use client";

import { type CalendarSession } from "@/lib/calendar";
import styles from "./SessionCountdownCard.module.scss";
import {formatTargetTime, getCountdownParts} from "@/utils/formatTimes";

type SessionCountdownCardProps = {
    now: number;
    session: CalendarSession;
};

export function SessionCountdownCard({ now, session }: SessionCountdownCardProps) {
    const countdown = getCountdownParts(session.startTime, now);

    return (
        <article className={styles.sessionCard}>
            <div className={styles.header}>
                <p className={styles.label}>{session.type}</p>
                <h3 className={styles.title}>{session.name}</h3>
            </div>

            {countdown ? (
                <div className={styles.countdown}>
                    <span>{countdown.days}d</span>
                    <span>{countdown.hours}h</span>
                    <span>{countdown.minutes}m</span>
                    <span>{countdown.seconds}s</span>
                </div>
            ) : (
                <div className={styles.completeBadge}>Completed</div>
            )}

            <p className={styles.time}>{formatTargetTime(session.startTime)}</p>
        </article>
    );
}
