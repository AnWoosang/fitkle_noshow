"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/provider";

interface Host {
  id: string;
  username: string;
  name: string;
}

interface Meetup {
  id: string;
  title: string;
  date: string;
  location: string;
  max_participants: number;
  status: string;
}

interface ParticipantCount {
  meetup_id: string;
  count: number;
}

export default function HostDashboard() {
  const router = useRouter();
  const { t, locale, lang, setLang } = useLang();
  const [host, setHost] = useState<Host | null>(null);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [participantCounts, setParticipantCounts] = useState<ParticipantCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const authClient = createSupabaseBrowser();
      const { data: { user } } = await authClient.auth.getUser();

      if (!user) {
        router.push("/host/login");
        return;
      }

      // Get host profile
      const { data: hostData } = await supabase
        .from("hosts")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!hostData) {
        router.push("/host/login");
        return;
      }

      setHost(hostData);

      // Get meetups by this host
      const { data: meetupData } = await supabase
        .from("meetups")
        .select("*")
        .eq("host_id", user.id)
        .order("date", { ascending: false });

      setMeetups(meetupData || []);

      // Get participant counts
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
    load();
  }, [router]);

  async function handleLogout() {
    const authClient = createSupabaseBrowser();
    await authClient.auth.signOut();
    window.location.href = "/";
  }

  function getCount(meetupId: string): number {
    return participantCounts.find((p) => p.meetup_id === meetupId)?.count || 0;
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const upcomingMeetups = meetups.filter(
    (m) => new Date(m.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000
  );
  const pastMeetups = meetups.filter(
    (m) => new Date(m.date).getTime() < Date.now() - 24 * 60 * 60 * 1000
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</Link>
            <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
              <i className="fas fa-arrow-left text-xs"></i> {t("common.home")}
            </Link>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "KO"}
            </Button>
            <Link href="/create">
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1E40AF]">{t("host.dashboard.newMeetup")}</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>{t("common.logout")}</Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{t("host.dashboard.title")}</h1>
          <p className="text-sm text-[#6B7280]">{t("host.dashboard.greeting").replace("{name}", host?.name || "")}</p>
        </div>

        {meetups.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-muted-foreground">{t("host.dashboard.noMeetups")}</p>
              <Link href="/create">
                <Button>{t("host.dashboard.firstMeetup")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upcoming Meetups */}
            {upcomingMeetups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">{t("host.dashboard.upcomingMeetups")} ({upcomingMeetups.length})</h2>
                {upcomingMeetups.map((meetup) => {
                  const meetupLink = `${origin}/meetup/${meetup.id}`;
                  const manageLink = `${origin}/manage/${meetup.id}`;
                  const checkinLink = `${origin}/checkin/${meetup.id}`;

                  return (
                    <Card key={meetup.id} className="shadow-sm">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{meetup.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(meetup.date).toLocaleDateString(locale, {
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                              })}{" "}
                              {new Date(meetup.date).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {meetup.location}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {getCount(meetup.id)}/{meetup.max_participants}{lang === "ko" ? "명" : ""}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Links */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => copyToClipboard(meetupLink, `meetup-${meetup.id}`)}
                          >
                            {copiedId === `meetup-${meetup.id}` ? t("common.copied") : t("host.dashboard.copyMeetupLink")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => copyToClipboard(checkinLink, `checkin-${meetup.id}`)}
                          >
                            {copiedId === `checkin-${meetup.id}` ? t("common.copied") : t("host.dashboard.copyCheckinLink")}
                          </Button>
                          <Link href={`/manage/${meetup.id}`}>
                            <Button variant="default" size="sm" className="w-full">
                              {t("host.dashboard.managePage")}
                            </Button>
                          </Link>
                        </div>

                        {/* QR Codes */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("host.dashboard.meetupQR")}</p>
                            <div className="flex justify-center">
                              <QRCodeSVG value={meetupLink} size={120} />
                            </div>
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">{t("host.dashboard.checkinQR")}</p>
                            <div className="flex justify-center">
                              <QRCodeSVG value={checkinLink} size={120} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Past Meetups */}
            {pastMeetups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-muted-foreground">
                  {t("host.dashboard.pastMeetups")} ({pastMeetups.length})
                </h2>
                {pastMeetups.map((meetup) => (
                  <Link key={meetup.id} href={`/manage/${meetup.id}`}>
                    <Card className="shadow-sm opacity-60 hover:opacity-80 cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{meetup.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(meetup.date).toLocaleDateString(locale, {
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                              })}
                              {" · "}{meetup.location}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {getCount(meetup.id)}{t("host.dashboard.participated")}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
