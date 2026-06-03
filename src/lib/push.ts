import webpush from "web-push";

type PushPayload = {
    body: string;
    tag?: string;
    title: string;
    url?: string;
};

type StoredSubscription = {
    auth: string;
    endpoint: string;
    p256dh: string;
};

let vapidConfigured = false;

function configureVapid() {
    if (vapidConfigured) {
        return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_EMAIL;

    if (!publicKey || !privateKey || !subject) {
        throw new Error("Missing VAPID configuration");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
}

export async function sendPushNotification(
    subscription: StoredSubscription,
    payload: PushPayload
) {
    configureVapid();

    return webpush.sendNotification(
        {
            endpoint: subscription.endpoint,
            keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
            },
        },
        JSON.stringify(payload)
    );
}
