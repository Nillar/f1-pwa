"use client";

import Image from "next/image";

import { type CalendarMeeting } from "@/lib/calendar";
import styles from "./RaceCard.module.scss";
import clsx from "clsx";
import {formatTargetTime, getCountdownParts} from "@/utils/formatTimes";

type RaceCardProps = {
    meeting: CalendarMeeting;
    now: number;
    variant: "hero" | "compact" | "archive";
};

export function RaceCard({ meeting, now, variant }: RaceCardProps) {
    const raceSession = meeting.sessions.find((session) => session.name === "Race") ?? meeting.sessions[meeting.sessions.length - 1];
    const countdown = getCountdownParts(raceSession.startTime, now);
    const isArchive = variant === "archive";
    const className = [
        styles.raceCard,
        variant === "hero" ? styles.heroCard : "",
        variant === "archive" ? styles.archiveCard : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <article className={className}>
            <div className={styles.header}>
                <div>
                    <p className={styles.country}>{meeting.countryName}</p>
                    <h2 className={clsx({
                        [styles.heroTitle]: variant === "hero",
                        [styles.title]: variant !== "hero",
                    })}>
                        {variant === "hero" ? "Race starts in:" : meeting.name}
                    </h2>
                </div>
                <Image
                    alt={`${meeting.countryName} flag`}
                    className={styles.flag}
                    height={38}
                    src={meeting.countryFlag}
                    width={56}
                />
            </div>

            {variant !== "hero" && (
                <p className={styles.meta}>
                    {meeting.location} · {meeting.circuitShortName}
                </p>
            )}

            {countdown ? (
                <div className={styles.countdown}>
                    <div className={styles.countdownUnit}>
                        <strong>{countdown.days}</strong>
                        <span>days</span>
                    </div>
                    <div className={styles.countdownUnit}>
                        <strong>{countdown.hours}</strong>
                        <span>hours</span>
                    </div>
                    <div className={styles.countdownUnit}>
                        <strong>{countdown.minutes}</strong>
                        <span>mins</span>
                    </div>
                    {variant === "hero" ? (
                        <div className={styles.countdownUnit}>
                            <strong>{countdown.seconds}</strong>
                            <span>secs</span>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className={styles.pastState}>
                    {isArchive ? "Race completed" : "Race weekend in progress"}
                </div>
            )}

            {variant === "compact" && (
                <p className={styles.raceTime}>Race start: {formatTargetTime(raceSession.startTime)}</p>

            )}
        </article>
    );
}
