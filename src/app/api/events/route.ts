import { getCalendarMeetings } from "@/lib/calendar";

export async function GET() {
    return Response.json(getCalendarMeetings());
}
