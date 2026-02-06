"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Meetup {
  id: string;
  title: string;
  date: string;
  location: string;
  host_name: string;
}

interface Participant {
  id: string;
  name: string;
  status: string;
  meetup_id: string;
}

export default function CancelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetupId = params.meetupId as string;
  const token = searchParams.get("token") || "";
  const { t, locale, lang, setLang } = useLang();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; promoted?: { name: string } | null } | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      const { data: meetupData } = await supabase
        .from("meetups")
        .select("id, title, date, location, host_name")
        .eq("id", meetupId)
        .single();

      if (meetupData) setMeetup(meetupData);

      const { data: participantData } = await supabase
        .from("participants")
        .select("id, name, status, meetup_id")
        .eq("token", token)
        .single();

      if (participantData) setParticipant(participantData);

      setLoading(false);
    }
    load();
  }, [meetupId, token]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({ success: true, message: data.message, promoted: data.promoted });
      }
    } catch {
      setResult({ success: false, message: t("common.error") });
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!token || !meetup || !participant) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-sm">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-muted-foreground">{t("common.invalidLink")}</p>
            <Link href="/">
              <Button variant="outline">{t("common.goHome")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(meetup.date);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</span>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {lang === "ko" ? "EN" : "KO"}
          </Button>
        </div>
      </header>
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">{t("cancel.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("common.field.meetup")}</span>
                <p className="font-medium">{meetup.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.date")}</span>
                <p className="font-medium">
                  {eventDate.toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  {eventDate.toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.location")}</span>
                <p className="font-medium">{meetup.location}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.participant")}</span>
                <p className="font-medium">{participant.name}</p>
              </div>
            </div>

            {result ? (
              <div className={`p-4 rounded-md text-center space-y-2 ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                <p className="font-medium">{result.message}</p>
                {result.promoted && (
                  <p className="text-sm">{t("cancel.promoted").replace("{name}", result.promoted.name)}</p>
                )}
                <Link href="/">
                  <Button variant="outline" size="sm" className="mt-2">{t("common.goHome")}</Button>
                </Link>
              </div>
            ) : participant.status === "cancelled" ? (
              <div className="p-4 rounded-md bg-gray-50 text-center">
                <p className="text-muted-foreground">{t("cancel.alreadyCancelled")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("cancel.confirmText")}
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? t("cancel.cancelling") : t("cancel.cancelBtn")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
