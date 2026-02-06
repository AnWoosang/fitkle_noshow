"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/provider";

interface Meetup {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  max_participants: number;
  max_waitlist: number | null;
  fee_display: string | null;
  host_name: string;
  host_code: string;
  host_id: string | null;
  status: string;
  confirmation_sent: boolean;
}

interface Participant {
  id: string;
  name: string;
  phone: string;
  token: string;
  status: string;
  is_waitlisted: boolean;
  registered_at: string;
  confirmed_at: string | null;
  checked_in_at: string | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  registered: "secondary",
  waitlisted: "outline",
  confirmed: "default",
  cancelled: "destructive",
  attended: "default",
  noshow: "destructive",
};

export default function ManagePage() {
  const { t, locale, lang, setLang } = useLang();
  const params = useParams();
  const searchParams = useSearchParams();
  const meetupId = params.id as string;
  const hostCode = searchParams.get("code") || "";

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authByLogin, setAuthByLogin] = useState(false);
  const [copiedCheckin, setCopiedCheckin] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    max_participants: 10,
    max_waitlist: null as number | null,
    fee_display: "",
  });

  const STATUS_LABELS: Record<string, string> = {
    registered: t("common.status.registered"),
    waitlisted: t("common.status.waitlisted"),
    confirmed: t("common.status.confirmed"),
    cancelled: t("common.status.cancelled"),
    attended: t("common.status.attended"),
    noshow: t("common.status.noshow"),
  };

  const loadData = useCallback(async () => {
    // Try auth-based access first
    const authClient = createSupabaseBrowser();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const { data: meetupData } = await supabase
      .from("meetups")
      .select("*")
      .eq("id", meetupId)
      .single();

    if (!meetupData) {
      setLoading(false);
      return;
    }

    // Check auth: logged-in user owns this meetup, or host_code matches
    const isOwner = user && meetupData.host_id === user.id;
    const isCodeValid = hostCode && meetupData.host_code === hostCode;

    if (!isOwner && !isCodeValid) {
      setLoading(false);
      return;
    }

    setAuthorized(true);
    setAuthByLogin(!!isOwner);
    setMeetup(meetupData);

    const { data: participantData } = await supabase
      .from("participants")
      .select("*")
      .eq("meetup_id", meetupId)
      .order("registered_at", { ascending: true });

    setParticipants(participantData || []);
    setLoading(false);
  }, [meetupId, hostCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startEditing() {
    if (!meetup) return;
    setEditForm({
      title: meetup.title,
      description: meetup.description || "",
      date: meetup.date.slice(0, 16), // datetime-local format
      location: meetup.location,
      max_participants: meetup.max_participants,
      max_waitlist: meetup.max_waitlist,
      fee_display: meetup.fee_display || "",
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetups/${meetupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          date: editForm.date,
          location: editForm.location,
          max_participants: editForm.max_participants,
          max_waitlist: editForm.max_waitlist,
          fee_display: editForm.fee_display || null,
          ...(hostCode ? { host_code: hostCode } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error);
        return;
      }
      setEditing(false);
      await loadData();
    } catch {
      alert(t("manage.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckin(participantId: string, action: "checkin" | "noshow") {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantId,
        host_code: hostCode || meetup?.host_code,
        meetup_id: meetupId,
        action,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!authorized || !meetup) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p>{t("common.noAccess")}</p>
      </div>
    );
  }

  const registered = participants.filter((p) => !p.is_waitlisted && p.status !== "cancelled");
  const waitlisted = participants.filter((p) => p.is_waitlisted && p.status !== "cancelled");
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const attended = participants.filter((p) => p.status === "attended");
  const noshow = participants.filter((p) => p.status === "noshow");

  const confirmedOrAttended = confirmed.length + attended.length;
  const noshowRate =
    confirmedOrAttended + noshow.length > 0
      ? ((noshow.length / (confirmedOrAttended + noshow.length)) * 100).toFixed(1)
      : "0.0";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const checkinLink = `${origin}/checkin/${meetupId}`;

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "KO"}
            </Button>
            <Link
              href={authByLogin ? "/host" : "/"}
              className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1"
            >
              <i className="fas fa-arrow-left text-xs"></i> {authByLogin ? t("common.dashboard") : t("common.home")}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Meetup Info */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editing ? t("manage.editTitle") : meetup.title}</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  {t("manage.editBtn")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">{t("manage.meetupTitle")}</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">{t("manage.meetupDescription")}</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date">{t("manage.dateTime")}</Label>
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location">{t("manage.location")}</Label>
                  <Input
                    id="edit-location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max">{t("manage.maxParticipants")}</Label>
                  <Input
                    id="edit-max"
                    type="number"
                    min={2}
                    max={100}
                    value={editForm.max_participants}
                    onChange={(e) =>
                      setEditForm({ ...editForm, max_participants: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max-waitlist">{t("manage.maxWaitlist")}</Label>
                  <Input
                    id="edit-max-waitlist"
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.max_waitlist ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, max_waitlist: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder={t("manage.maxWaitlistPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-fee">{t("manage.feeDisplay")}</Label>
                  <Input
                    id="edit-fee"
                    value={editForm.fee_display}
                    onChange={(e) => setEditForm({ ...editForm, fee_display: e.target.value })}
                    placeholder={t("manage.feePlaceholder")}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("common.field.date")}</span>
                  <p className="font-medium">
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
                </div>
                <div>
                  <span className="text-muted-foreground">{t("common.field.location")}</span>
                  <p className="font-medium">{meetup.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("manage.participantLink")}</span>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() =>
                      navigator.clipboard.writeText(`${origin}/meetup/${meetup.id}`)
                    }
                  >
                    {t("manage.copyLink")}
                  </Button>
                </div>
                {meetup.description && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground">{t("common.field.description")}</span>
                    <p className="font-medium">{meetup.description}</p>
                  </div>
                )}
                {meetup.fee_display && (
                  <div>
                    <span className="text-muted-foreground">{t("common.field.fee")}</span>
                    <p className="font-medium">{meetup.fee_display}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{registered.length}</p>
              <p className="text-xs text-muted-foreground">{t("manage.stat.applicants")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-[#F59E0B]">{waitlisted.length}</p>
              <p className="text-xs text-muted-foreground">{t("manage.stat.waitlisted")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{confirmed.length + attended.length}</p>
              <p className="text-xs text-muted-foreground">{t("manage.stat.confirmed")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{attended.length}</p>
              <p className="text-xs text-muted-foreground">{t("manage.stat.attended")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{noshowRate}%</p>
              <p className="text-xs text-muted-foreground">{t("manage.stat.noshowRate")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Self Check-in QR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("manage.checkinQR")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("manage.checkinQRDesc")}
            </p>
            <div className="flex justify-center">
              <QRCodeSVG value={checkinLink} size={180} />
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(checkinLink);
                  setCopiedCheckin(true);
                  setTimeout(() => setCopiedCheckin(false), 2000);
                }}
              >
                {copiedCheckin ? t("common.copied") : t("manage.copyCheckinLink")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Participant List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("manage.participantList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("manage.noParticipants")}</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[p.status] || "secondary"}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {p.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleCheckin(p.id, "checkin")}
                          >
                            {t("manage.checkinBtn")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCheckin(p.id, "noshow")}
                          >
                            {t("manage.noshowBtn")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
