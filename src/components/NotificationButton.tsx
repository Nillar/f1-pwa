"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import styles from "./NotificationButton.module.scss";

type SubscribeResponse = {
    subscriptionId: string;
    userToken: string;
};

type TestNotificationResponse = {
    error?: string;
    mode?: "immediate" | "scheduled";
    scheduledFor: string;
};

type NotificationButtonProps = {
    onEnabledAction?: (userToken: string) => void;
    onDisabledAction?: () => void;
};

type NotificationState = "checking" | "enabled" | "disabled";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function getBrowserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

export default function NotificationButton({
    onEnabledAction,
    onDisabledAction,
}: NotificationButtonProps) {
    const [notificationState, setNotificationState] =
        useState<NotificationState>("checking");
    const [isBusy, setIsBusy] = useState(false);
    const [isSchedulingTest, setIsSchedulingTest] = useState(false);
    const [isShowingLocalTest, setIsShowingLocalTest] = useState(false);
    const [testNotificationMessage, setTestNotificationMessage] = useState("");

    const saveSubscription = async (subscription: PushSubscription) => {
        const response = await fetch("/api/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscription,
                timeZone: getBrowserTimeZone(),
                userToken: localStorage.getItem("userToken"),
            }),
        });

        const data: SubscribeResponse & { error?: string } = await response.json();

        if (!response.ok) {
            throw new Error(data.error ?? "Subscription request failed");
        }

        localStorage.setItem("userToken", data.userToken);
        onEnabledAction?.(data.userToken);

        return data;
    };

    useEffect(() => {
        const syncSubscriptionState = async () => {
            if (!("serviceWorker" in navigator)) {
                setNotificationState("disabled");
                return;
            }

            try {
                const registration = await navigator.serviceWorker.register("/sw.js");
                const subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    setNotificationState("disabled");
                    return;
                }

                await saveSubscription(subscription);
                setNotificationState("enabled");
            } catch (error) {
                console.error("Failed to read notification state", error);
                setNotificationState("disabled");
            }
        };

        void syncSubscriptionState();
    }, []);

    const enableNotifications = async () => {
        try {
            setIsBusy(true);

            if (!("serviceWorker" in navigator)) {
                alert("Service workers are not supported in this browser");
                return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
                alert("Permission denied");
                setNotificationState("disabled");
                return;
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            const existingSubscription = await registration.pushManager.getSubscription();
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
            }

            const subscription =
                existingSubscription ??
                await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });

            await saveSubscription(subscription);
            setNotificationState("enabled");
        } catch (error) {
            console.error("Failed to enable notifications", error);
            alert("Could not enable notifications. Check the console/server logs.");
        } finally {
            setIsBusy(false);
        }
    };

    const disableNotifications = async () => {
        try {
            setIsBusy(true);

            if (!("serviceWorker" in navigator)) {
                setNotificationState("disabled");
                return;
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                setNotificationState("disabled");
                onDisabledAction?.();
                return;
            }

            await fetch("/api/subscribe", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint,
                }),
            });

            await subscription.unsubscribe();
            setNotificationState("disabled");
            onDisabledAction?.();
        } catch (error) {
            console.error("Failed to disable notifications", error);
            alert("Could not disable notifications. Check the console/server logs.");
        } finally {
            setIsBusy(false);
        }
    };

    const toggleNotifications = async () => {
        if (notificationState === "enabled") {
            await disableNotifications();
            return;
        }

        await enableNotifications();
    };

    const sendTestNotification = async (delaySeconds: number) => {
        try {
            setIsSchedulingTest(true);
            setTestNotificationMessage("");

            const userToken = localStorage.getItem("userToken");

            if (!userToken) {
                throw new Error("Enable notifications first");
            }

            const response = await fetch("/api/test-notification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    delaySeconds,
                    userToken,
                }),
            });

            const data: TestNotificationResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Failed to schedule test notification");
            }

            const scheduledFor = new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }).format(new Date(data.scheduledFor));

            setTestNotificationMessage(
                delaySeconds === 0
                    ? `Immediate test push sent at ${scheduledFor}. If nothing appears, the push delivery or OS display path is failing.`
                    : `Test push scheduled for ${scheduledFor}. You can close this page and wait about ${delaySeconds} seconds.`
            );
        } catch (error) {
            console.error("Failed to send test notification", error);
            setTestNotificationMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to send test notification"
            );
        } finally {
            setIsSchedulingTest(false);
        }
    };

    const showLocalTestNotification = async () => {
        try {
            setIsShowingLocalTest(true);
            setTestNotificationMessage("");

            if (!("serviceWorker" in navigator)) {
                throw new Error("Service workers are not supported in this browser");
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            await registration.showNotification("Local notification test", {
                body: "This did not use Web Push. If you can see this, OS/browser display works.",
                tag: "f1-local-notification-test",
            });

            setTestNotificationMessage(
                "Local notification shown. If you saw it, Windows/Chrome display is working and the issue is with Web Push delivery."
            );
        } catch (error) {
            console.error("Failed to show local test notification", error);
            setTestNotificationMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to show local test notification"
            );
        } finally {
            setIsShowingLocalTest(false);
        }
    };

    const buttonLabel =
        notificationState === "checking"
            ? "Checking notifications..."
            : isBusy
                ? notificationState === "enabled"
                    ? "Disabling..."
                    : "Enabling..."
                : notificationState === "enabled"
                    ? "Disable Notifications"
                    : "Enable Notifications";

    const helperText =
        notificationState === "enabled"
            ? "Push notifications are currently enabled for this browser."
            : "Push notifications are currently disabled for this browser.";
    const statusLabel =
        notificationState === "checking"
            ? "Checking"
            : notificationState === "enabled"
                ? "Live"
                : "Off";

    return (
        <section className={styles.notificationSection}>
            <div className={styles.headerRow}>
                <div className={styles.content}>
                    <span className={styles.statusBadge}>{statusLabel}</span>
                    <h2 className={styles.title}>Push notifications</h2>
                    <p className={styles.copy}>
                        Turn browser notifications on or off for this device. Your
                        reminder preferences stay linked to your anonymous profile.
                    </p>
                </div>

                <div className={styles.actions}>
                    <Button
                        onClick={() => void toggleNotifications()}
                        disabled={notificationState === "checking" || isBusy}
                        variant={notificationState === "enabled" ? "secondary" : "primary"}
                    >
                        {buttonLabel}
                    </Button>
                    <p className={styles.helperText}>{helperText}</p>
                    {notificationState === "enabled" && (
                        <>
                            <Button
                                onClick={() => void sendTestNotification(0)}
                                disabled={isSchedulingTest || isBusy}
                                variant="secondary"
                            >
                                {isSchedulingTest
                                    ? "Sending test..."
                                    : "Send push now"}
                            </Button>
                            <Button
                                onClick={() => void sendTestNotification(10)}
                                disabled={isSchedulingTest || isBusy}
                                variant="secondary"
                            >
                                {isSchedulingTest
                                    ? "Scheduling test..."
                                    : "Send 10-second test push"}
                            </Button>
                            <Button
                                onClick={() => void showLocalTestNotification()}
                                disabled={isShowingLocalTest || isBusy}
                                variant="secondary"
                            >
                                {isShowingLocalTest
                                    ? "Showing local test..."
                                    : "Show local notification"}
                            </Button>
                            {testNotificationMessage && (
                                <p className={styles.testMessage}>{testNotificationMessage}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
