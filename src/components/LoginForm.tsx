"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import styles from "./LoginForm.module.scss";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "submitting" | "sent" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState("submitting");
        setErrorMessage("");

        try {
            const response = await fetch("/api/auth/request-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Failed to send login email");
            }

            setState("sent");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
            setState("error");
        }
    };

    if (state === "sent") {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <span className={styles.eyebrow}>Formula 1 Reminders</span>
                    <h1 className={styles.title}>Check your inbox</h1>
                    <p className={styles.copy}>
                        We sent a sign-in link to <strong>{email}</strong>. Click it to access
                        your notification preferences. The link expires in 15 minutes.
                    </p>
                    <button
                        className={styles.resendButton}
                        type="button"
                        onClick={() => setState("idle")}
                    >
                        Use a different email
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <span className={styles.eyebrow}>Formula 1 Reminders</span>
                <h1 className={styles.title}>Sign in to manage notifications</h1>
                <p className={styles.copy}>
                    Enter your email to receive a sign-in link. No password needed — your
                    preferences are saved to your account and accessible from any device.
                </p>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={state === "submitting"}
                    />
                    <Button type="submit" disabled={state === "submitting"}>
                        {state === "submitting" ? "Sending..." : "Send sign-in link"}
                    </Button>
                </form>
                {state === "error" && <p className={styles.error}>{errorMessage}</p>}
            </div>
        </div>
    );
}
