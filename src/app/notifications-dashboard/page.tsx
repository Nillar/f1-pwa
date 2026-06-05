import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { PreferencesDashboard } from "@/components/PreferencesDashboard";

export default async function NotificationsDashboardPage() {
    const user = await getSession();

    if (!user) {
        return <LoginForm />;
    }

    return <PreferencesDashboard userEmail={user.email} />;
}
