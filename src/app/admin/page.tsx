"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Meetup {
  id: string;
  title: string;
  date: string;
  location: string;
  max_participants: number;
  host_name: string;
  status: string;
}

interface Reminder {
  id: string;
  meetup_id: string;
  type: string;
  sent_at: string | null;
}

interface ParticipantCount {
  meetup_id: string;
  count: number;
}

const REMINDER_TYPES = ["d7", "d3", "d1", "dday"] as const;

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const meetupDate = new Date(dateStr);
  const diffTime = meetupDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getPendingReminderTypes(daysUntil: number): string[] {
  const types: string[] = [];
  if (daysUntil <= 7) types.push("d7");
  if (daysUntil <= 3) types.push("d3");
  if (daysUntil <= 1) types.push("d1");
  if (daysUntil <= 0) types.push("dday");
  return types;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t, locale, lang, setLang } = useLang();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [participantCounts, setParticipantCounts] = useState<ParticipantCount[]>([]);
  const [loading, setLoading] = useState(true);

  const REMINDER_LABELS: Record<string, string> = {
    d7: t("admin.reminder.d7"),
    d3: t("admin.reminder.d3"),
    d1: t("admin.reminder.d1"),
    dday: t("admin.reminder.dday"),
  };

  const REMINDER_BADGE_LABELS: Record<string, string> = {
    d7: t("admin.reminder.d7Badge"),
    d3: t("admin.reminder.d3Badge"),
    d1: t("admin.reminder.d1Badge"),
    dday: t("admin.reminder.ddayBadge"),
  };

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/admin/login", { method: "GET" });
      if (!res.ok) {
        router.push("/admin/login");
        return;
      }
      loadData();
    }
    checkAuth();
  }, [router]);

  async function loadData() {
    const { data: meetupData } = await supabase
      .from("meetups")
      .select("*")
      .order("date", { ascending: true });

    setMeetups(meetupData || []);

    const { data: reminderData } = await supabase
      .from("reminders")
      .select("*");

    setReminders(reminderData || []);

    if (meetupData && meetupData.length > 0) {
      const counts: ParticipantCount[] = [];
      for (const meetup of meetupData) {
        const { count } = await supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .eq("meetup_id", meetup.id)
          .neq("status", "cancelled")
          .eq("is_waitlisted", false);

        counts.push({ meetup_id: meetup.id, count: count || 0 });
      }
      setParticipantCounts(counts);
    }

    setLoading(false);
  }

  function getReminderStatus(meetupId: string, type: string): boolean {
    return reminders.some(
      (r) => r.meetup_id === meetupId && r.type === type && r.sent_at
    );
  }

  function getUnsentReminders(meetupId: string, daysUntil: number): string[] {
    const pending = getPendingReminderTypes(daysUntil);
    return pending.filter((type) => !getReminderStatus(meetupId, type));
  }

  function getParticipantCount(meetupId: string): number {
    return participantCounts.find((p) => p.meetup_id === meetupId)?.count || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const upcomingMeetups = meetups.filter((m) => getDaysUntil(m.date) >= 0);
  const pastMeetups = meetups.filter((m) => getDaysUntil(m.date) < 0);

  const meetupsWithUnsentReminders = upcomingMeetups
    .map((m) => ({
      meetup: m,
      daysUntil: getDaysUntil(m.date),
      unsentTypes: getUnsentReminders(m.id, getDaysUntil(m.date)),
    }))
    .filter((item) => item.unsentTypes.length > 0);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</span>
            <span className="text-sm text-[#6B7280]">{t("admin.label")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "KO"}
            </Button>
            <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
              <i className="fas fa-arrow-left text-xs"></i> {t("common.home")}
            </Link>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/login")}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{t("admin.dashboard.title")}</h1>
        </div>

        {/* Unsent Reminders Alert */}
        {meetupsWithUnsentReminders.length > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg text-orange-800">{t("admin.dashboard.remindersNeeded")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetupsWithUnsentReminders.map(({ meetup: m, unsentTypes }) =>
                unsentTypes.map((type) => (
                  <Link
                    key={`${m.id}-${type}`}
                    href={`/admin/meetup/${m.id}`}
                    className="flex items-center justify-between p-3 rounded-md border bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">
                        {REMINDER_BADGE_LABELS[type]}
                      </Badge>
                      <span className="font-medium text-sm">{m.title}</span>
                    </div>
                    <Badge variant="outline">{t("admin.dashboard.unsent")}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Meetups */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("admin.dashboard.upcomingMeetups")} ({upcomingMeetups.length})</h2>
          <div className="space-y-3">
            {upcomingMeetups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.noUpcoming")}</p>
            ) : (
              upcomingMeetups.map((meetup) => {
                const daysUntil = getDaysUntil(meetup.date);
                const unsent = getUnsentReminders(meetup.id, daysUntil);
                return (
                  <Link key={meetup.id} href={`/admin/meetup/${meetup.id}`}>
                    <Card className="hover:bg-gray-50 cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{meetup.title}</h3>
                              {daysUntil <= 7 && (
                                <Badge variant="secondary">D-{daysUntil}</Badge>
                              )}
                              {unsent.map((type) => (
                                <Badge key={type} variant="destructive" className="text-xs">
                                  {REMINDER_BADGE_LABELS[type]}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-0.5">
                              <p>
                                {new Date(meetup.date).toLocaleDateString(locale, {
                                  month: "long",
                                  day: "numeric",
                                  weekday: "short",
                                })}{" "}
                                {new Date(meetup.date).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p>{meetup.location}</p>
                              <p>
                                {t("admin.dashboard.participants")}: {getParticipantCount(meetup.id)}/{meetup.max_participants}{lang === "ko" ? "명" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {REMINDER_TYPES.map((type) => (
                              <span
                                key={type}
                                title={REMINDER_LABELS[type]}
                                className="text-sm"
                              >
                                {getReminderStatus(meetup.id, type) ? "✅" : "⬜"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Past Meetups */}
        {pastMeetups.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
              {t("admin.dashboard.pastMeetups")} ({pastMeetups.length})
            </h2>
            <div className="space-y-3">
              {pastMeetups.map((meetup) => (
                <Link key={meetup.id} href={`/admin/meetup/${meetup.id}`}>
                  <Card className="hover:bg-gray-50 cursor-pointer opacity-60">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{meetup.title}</h3>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              {new Date(meetup.date).toLocaleDateString(locale, {
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                              })}
                            </p>
                            <p>{meetup.location}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {REMINDER_TYPES.map((type) => (
                            <span key={type} className="text-sm">
                              {getReminderStatus(meetup.id, type) ? "✅" : "⬜"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
