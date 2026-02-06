"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Reminder {
  id: string;
  meetup_id: string;
  type: string;
  sent_at: string | null;
  sent_by: string | null;
  note: string | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  registered: "secondary",
  waitlisted: "outline",
  confirmed: "default",
  cancelled: "destructive",
  attended: "default",
  noshow: "destructive",
};

const REMINDER_TYPES = ["d7", "d3", "d1", "dday"] as const;

export default function AdminMeetupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetupId = params.id as string;
  const { t, locale, lang, setLang } = useLang();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderNotes, setReminderNotes] = useState<Record<string, string>>({});
  const [reminderSentBy, setReminderSentBy] = useState<Record<string, string>>({});
  const [savingReminder, setSavingReminder] = useState<string | null>(null);
  const [sendingSMS, setSendingSMS] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [smsResult, setSmsResult] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  // --- i18n-dependent label maps ---

  const STATUS_LABELS: Record<string, string> = {
    registered: t("common.status.registered"),
    waitlisted: t("common.status.waitlisted"),
    confirmed: t("common.status.confirmed"),
    cancelled: t("common.status.cancelled"),
    attended: t("common.status.attended"),
    noshow: t("common.status.noshow"),
  };

  const REMINDER_LABELS: Record<string, string> = {
    d7: t("admin.reminder.d7"),
    d3: t("admin.reminder.d3"),
    d1: t("admin.reminder.d1"),
    dday: t("admin.reminder.dday"),
  };

  const SMS_TYPE_LABELS: Record<string, string> = {
    registration: t("admin.sms.registration"),
    confirm_reminder: t("admin.sms.confirmReminder"),
    confirmed_complete: t("admin.sms.confirmedComplete"),
    cancelled_complete: t("admin.sms.cancelledComplete"),
    d7: t("admin.reminder.d7"),
    d3: t("admin.reminder.d3"),
    d1: t("admin.reminder.d1"),
    dday: t("admin.reminder.dday"),
    waitlist_promote: t("admin.sms.waitlistPromote"),
    waitlist_registration: t("admin.sms.waitlistRegistration"),
  };

  // --- locale-aware date formatter ---

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) + " " + d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const loadData = useCallback(async () => {
    const { data: meetupData } = await supabase
      .from("meetups")
      .select("*")
      .eq("id", meetupId)
      .single();

    if (!meetupData) {
      setLoading(false);
      return;
    }
    setMeetup(meetupData);

    const { data: participantData } = await supabase
      .from("participants")
      .select("*")
      .eq("meetup_id", meetupId)
      .order("registered_at", { ascending: true });

    setParticipants(participantData || []);

    const { data: reminderData } = await supabase
      .from("reminders")
      .select("*")
      .eq("meetup_id", meetupId);

    setReminders(reminderData || []);
    setLoading(false);
  }, [meetupId]);

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
  }, [router, loadData]);

  function getReminderForType(type: string): Reminder | undefined {
    return reminders.find((r) => r.type === type);
  }

  async function handleMarkSent(type: string) {
    setSavingReminder(type);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetup_id: meetupId,
          type,
          sent_by: reminderSentBy[type] || "",
          note: reminderNotes[type] || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error);
        return;
      }

      await loadData();
    } finally {
      setSavingReminder(null);
    }
  }

  async function handleSendSMS(type: string) {
    setSendingSMS(type);
    setSmsResult(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetup_id: meetupId, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSmsResult(t("admin.sms.failed") + ": " + data.error);
        return;
      }
      setSmsResult(`${data.message}`);
      // Auto-mark reminder as sent
      if (REMINDER_TYPES.includes(type as typeof REMINDER_TYPES[number])) {
        await handleMarkSent(type);
      }
    } catch {
      setSmsResult(t("admin.sms.smsError"));
    } finally {
      setSendingSMS(null);
    }
  }

  async function handleSendSMSToTargets(type: string, targets: Set<string>) {
    if (targets.size === 0) {
      setSmsResult(t("admin.sms.selectTargets"));
      return;
    }
    setSendingSMS(`${type}-targets`);
    setSmsResult(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetup_id: meetupId,
          type,
          targets: Array.from(targets),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSmsResult(t("admin.sms.failed") + ": " + data.error);
        return;
      }
      setSmsResult(`${data.message}`);
      setSelectedParticipants(new Set());
    } catch {
      setSmsResult(t("admin.sms.smsError"));
    } finally {
      setSendingSMS(null);
    }
  }

  function toggleParticipant(id: string) {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInList(list: Participant[]) {
    const allIds = list.map((p) => p.id);
    const allSelected = allIds.every((id) => selectedParticipants.has(id));
    if (allSelected) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(allIds));
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  // --- Participant filter functions ---

  function getAllNonCancelledParticipants(): Participant[] {
    return participants.filter((p) => p.status !== "cancelled");
  }

  function getActiveParticipants(): Participant[] {
    return participants.filter(
      (p) => !p.is_waitlisted && p.status !== "cancelled"
    );
  }

  function getUnconfirmedParticipants(): Participant[] {
    return participants.filter(
      (p) => p.status === "registered" && !p.is_waitlisted
    );
  }

  function getConfirmedParticipants(): Participant[] {
    return participants.filter((p) => p.status === "confirmed");
  }

  function getWaitlistedParticipants(): Participant[] {
    return participants.filter(
      (p) => p.is_waitlisted && p.status === "waitlisted"
    );
  }

  function getParticipantsForTab(tab: string): Participant[] {
    switch (tab) {
      case "all": return getAllNonCancelledParticipants();
      case "registered": return getUnconfirmedParticipants();
      case "confirmed": return getConfirmedParticipants();
      case "waitlisted": return getWaitlistedParticipants();
      default: return [];
    }
  }

  function generateMessageTemplate(type: string): string {
    if (!meetup) return "";

    const dateStr = new Date(meetup.date).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    const timeStr = new Date(meetup.date).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    switch (type) {
      case "registration":
        return `{이름}님, ${meetup.title} 모임에 신청이 완료되었습니다.

${dateStr} ${timeStr}
${meetup.location}
${meetup.fee_display ? `참가비: ${meetup.fee_display}` : ""}

참석 확정: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "confirm_reminder":
        return `{이름}님, ${meetup.title} 모임 참석을 확정해주세요.

${dateStr} ${timeStr}
${meetup.location}

아직 참석 확정을 하지 않으셨습니다.
참석 확정: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "d7":
        return `{이름}님, ${meetup.title} 모임이 일주일 앞으로 다가왔습니다.

${dateStr} ${timeStr}
${meetup.location}

미리 참석을 확정해주세요: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "d3":
        return `{이름}님, ${meetup.title} 모임이 3일 앞으로 다가왔습니다.

${dateStr} ${timeStr}
${meetup.location}

미리 참석을 확정해주세요: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "d1":
        return `{이름}님, 내일 ${meetup.title} 모임이 예정되어 있습니다.

${dateStr} ${timeStr}
${meetup.location}

참석 확정: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "dday":
        return `{이름}님, 오늘 ${meetup.title} 모임이 있습니다.

${timeStr}
${meetup.location}

참석이 어려우시면: {취소링크}`;

      case "waitlist_promote":
        return `{이름}님, ${meetup.title} 모임에 자리가 났습니다!

${dateStr} ${timeStr}
${meetup.location}

참석 확정: {확정링크}
참석이 어려우시면: {취소링크}`;

      case "waitlist_registration":
        return `{이름}님, ${meetup.title} 모임 대기 신청이 완료되었습니다.

현재 대기 순번으로 등록되었으며, 참여자가 빠지면 참여 신청 링크를 전송해드리겠습니다.

${dateStr} ${timeStr}
${meetup.location}`;

      case "confirmed_complete":
        return `{이름}님, ${meetup.title} 모임 참석이 확정되었습니다.

${dateStr} ${timeStr}
${meetup.location}

참석이 어려우시면: {취소링크}`;

      case "cancelled_complete":
        return `{이름}님, ${meetup.title} 모임 참가가 취소되었습니다.

다음 모임에서 뵙겠습니다.`;

      default:
        return "";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p>{t("common.notFound")}</p>
      </div>
    );
  }

  const activeParticipants = getActiveParticipants();
  const waitlistedParticipants = getWaitlistedParticipants();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const allNonCancelled = getAllNonCancelledParticipants();
  const unconfirmedParticipants = getUnconfirmedParticipants();
  const confirmedParticipants = getConfirmedParticipants();

  const SMS_BUTTONS = [
    { type: "registration", label: SMS_TYPE_LABELS["registration"] },
    { type: "confirm_reminder", label: SMS_TYPE_LABELS["confirm_reminder"] },
    { type: "confirmed_complete", label: SMS_TYPE_LABELS["confirmed_complete"] },
    { type: "cancelled_complete", label: SMS_TYPE_LABELS["cancelled_complete"] },
    { type: "d7", label: SMS_TYPE_LABELS["d7"] },
    { type: "d3", label: SMS_TYPE_LABELS["d3"] },
    { type: "d1", label: SMS_TYPE_LABELS["d1"] },
    { type: "dday", label: SMS_TYPE_LABELS["dday"] },
    { type: "waitlist_promote", label: SMS_TYPE_LABELS["waitlist_promote"] },
    { type: "waitlist_registration", label: SMS_TYPE_LABELS["waitlist_registration"] },
  ];

  function renderParticipantList(tabParticipants: Participant[]) {
    if (tabParticipants.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">{t("admin.meetup.noParticipants")}</p>;
    }

    const allSelected = tabParticipants.length > 0 && tabParticipants.every((p) => selectedParticipants.has(p.id));

    return (
      <div className="space-y-4">
        {/* Selection controls */}
        <div className="flex items-center gap-3 border-b pb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleAllInList(tabParticipants)}
              className="w-4 h-4 rounded border-gray-300"
            />
            {t("admin.meetup.selectAll")}
          </label>
          {selectedParticipants.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedParticipants.size}{t("admin.meetup.selectedCount")}
            </span>
          )}
        </div>

        {/* Participant list */}
        <div className="space-y-2">
          {tabParticipants.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between border rounded-md p-3 ${
                selectedParticipants.has(p.id) ? "bg-blue-50 border-blue-200" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedParticipants.has(p.id)}
                  onChange={() => toggleParticipant(p.id)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[p.status] || "secondary"}>
                  {STATUS_LABELS[p.status] || p.status}
                </Badge>
                {p.is_waitlisted && (
                  <Badge variant="outline">{t("admin.meetup.waitBadge")}</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`${origin}/cancel/${meetupId}?token=${p.token}`, `cancel-${p.id}`)}
                >
                  {copied === `cancel-${p.id}` ? t("common.copied") : t("admin.meetup.cancelLink")}
                </Button>
                {(p.status === "registered" || p.is_waitlisted) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${origin}/confirm/${meetupId}?token=${p.token}`, `confirm-${p.id}`)}
                  >
                    {copied === `confirm-${p.id}` ? t("common.copied") : t("admin.meetup.confirmLink")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* SMS button group */}
        {selectedParticipants.size > 0 && (
          <div className="border-t pt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {SMS_BUTTONS.map((btn) => (
                <Button
                  key={btn.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendSMSToTargets(btn.type, selectedParticipants)}
                  disabled={sendingSMS === `${btn.type}-targets`}
                >
                  {sendingSMS === `${btn.type}-targets` ? t("admin.meetup.sending") : btn.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.meetup.sendToSelected").replace("{count}", String(selectedParticipants.size))}
            </p>
          </div>
        )}
      </div>
    );
  }

  const MESSAGE_TEMPLATE_TYPES = [
    "registration",
    ...REMINDER_TYPES,
    "confirm_reminder",
    "waitlist_promote",
    "waitlist_registration",
    "confirmed_complete",
    "cancelled_complete",
  ] as const;

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
            <Link href="/admin" className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
              <i className="fas fa-arrow-left text-xs"></i> {t("common.dashboard")}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* SMS Result Toast */}
        {smsResult && (
          <div className="p-3 rounded-md bg-blue-50 text-blue-800 text-sm flex items-center justify-between">
            <span>{smsResult}</span>
            <Button variant="ghost" size="sm" onClick={() => setSmsResult(null)}>{t("common.close")}</Button>
          </div>
        )}

        {/* Meetup Info */}
        <Card>
          <CardHeader>
            <CardTitle>{meetup.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("common.field.date")}</span>
                <p className="font-medium">{formatDate(meetup.date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.location")}</span>
                <p className="font-medium">{meetup.location}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.host")}</span>
                <p className="font-medium">{meetup.host_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.participants")}</span>
                <p className="font-medium">
                  {activeParticipants.length}/{meetup.max_participants}
                  {meetup.max_waitlist !== null && ` (${t("admin.meetup.waitlistInfo")} ${waitlistedParticipants.length}/${meetup.max_waitlist})`}
                </p>
              </div>
            </div>
            {meetup.description && (
              <p className="text-sm text-muted-foreground mt-3">{meetup.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Participant Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.meetup.participantManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                setSelectedParticipants(new Set());
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="all">{t("admin.meetup.tab.all")} ({allNonCancelled.length})</TabsTrigger>
                <TabsTrigger value="registered">{t("admin.meetup.tab.registered")} ({unconfirmedParticipants.length})</TabsTrigger>
                <TabsTrigger value="confirmed">{t("admin.meetup.tab.confirmed")} ({confirmedParticipants.length})</TabsTrigger>
                <TabsTrigger value="waitlisted">{t("admin.meetup.tab.waitlisted")} ({waitlistedParticipants.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                {renderParticipantList(getParticipantsForTab("all"))}
              </TabsContent>
              <TabsContent value="registered" className="mt-4">
                {renderParticipantList(getParticipantsForTab("registered"))}
              </TabsContent>
              <TabsContent value="confirmed" className="mt-4">
                {renderParticipantList(getParticipantsForTab("confirmed"))}
              </TabsContent>
              <TabsContent value="waitlisted" className="mt-4">
                {renderParticipantList(getParticipantsForTab("waitlisted"))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Reminder Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.meetup.reminderManagement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {REMINDER_TYPES.map((type) => {
              const reminder = getReminderForType(type);
              const isSent = !!reminder?.sent_at;

              return (
                <div key={type} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{REMINDER_LABELS[type]} {t("admin.meetup.reminderLabel")}</h3>
                      <Badge variant={isSent ? "default" : "outline"}>
                        {isSent ? t("admin.meetup.sent") : t("admin.meetup.notSent")}
                      </Badge>
                    </div>
                    {isSent && reminder?.sent_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(reminder.sent_at).toLocaleString(locale)}
                      </span>
                    )}
                  </div>

                  {isSent ? (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {reminder?.sent_by && <p>{t("admin.meetup.senderLabel")}: {reminder.sent_by}</p>}
                      {reminder?.note && <p>{t("admin.meetup.memoLabel")}: {reminder.note}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder={t("admin.meetup.senderMemo")}
                          value={reminderSentBy[type] || ""}
                          onChange={(e) =>
                            setReminderSentBy((prev) => ({ ...prev, [type]: e.target.value }))
                          }
                        />
                        <Input
                          placeholder={t("admin.meetup.note")}
                          value={reminderNotes[type] || ""}
                          onChange={(e) =>
                            setReminderNotes((prev) => ({ ...prev, [type]: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkSent(type)}
                          disabled={savingReminder === type}
                        >
                          {savingReminder === type ? t("common.saving") : t("admin.meetup.markSent")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendSMS(type)}
                          disabled={sendingSMS === type}
                        >
                          {sendingSMS === type ? t("admin.meetup.sending") : t("admin.meetup.sendSMS")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Message Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.meetup.messageTemplates")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {MESSAGE_TEMPLATE_TYPES.map((type) => {
              const label = SMS_TYPE_LABELS[type] || type;

              return (
                <div key={type} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{label} {t("admin.meetup.message")}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(generateMessageTemplate(type), `template-${type}`)
                      }
                    >
                      {copied === `template-${type}` ? t("common.copied") : t("common.copy")}
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={generateMessageTemplate(type)}
                    className="text-sm min-h-[120px] resize-none bg-gray-50"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
