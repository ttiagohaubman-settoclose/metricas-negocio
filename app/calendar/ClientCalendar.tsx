"use client";

import { useState, useEffect, useMemo } from "react";

const CLIENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Aaron y Yuliana":   { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" },
  "Danelly Dacos":     { bg: "#d1fae5", border: "#10b981", text: "#064e3b" },
  "Fernando Duque":    { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" },
  "Jorge Martinez":    { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  "Melissa & Damaris": { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
};
const DEFAULT_COLOR = { bg: "#f3f4f6", border: "#9ca3af", text: "#1f2937" };
function getColorForClient(name: string) { return CLIENT_COLORS[name] || DEFAULT_COLOR; }

type CalendarEvent = {
  appointmentId: string;
  contactId: string;
  clientName: string;
  name: string;
  startTime: string;
  endTime: string;
  address: string;
  appointmentStatus: string;
  ownerOrRenter: string;
  waterType: string;
  language: string;
};

type ViewMode = "month" | "week" | "day";

const btnIconStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border-strong)", color: "var(--ink)",
  padding: "6px 10px", borderRadius: 8, cursor: "pointer", display: "inline-flex",
  alignItems: "center", justifyContent: "center", fontFamily: "inherit",
};
const btnTextStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border-strong)", color: "var(--ink)",
  padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
  fontFamily: "inherit",
};

export default function ClientCalendar({ filterClientName }: { filterClientName?: string }) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const d = new Date(currentDate);
    let start: Date, end: Date;
    if (view === "month") {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    } else if (view === "week") {
      const day = d.getDay();
      start = new Date(d); start.setDate(d.getDate() - day);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = start;
    }
    return { rangeStart: start, rangeEnd: end };
  }, [currentDate, view]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const pad = (n: number) => String(n).padStart(2, "0");
        const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const res = await fetch(`/api/ghl/calendar?since=${toStr(rangeStart)}&until=${toStr(rangeEnd)}`);
        const data = await res.json();
        let evts = data.events || [];
        if (filterClientName) evts = evts.filter((e: CalendarEvent) => e.clientName === filterClientName);
        setEvents(evts);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [rangeStart, rangeEnd, filterClientName]);

  const goPrevious = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const headerTitle = useMemo(() => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    if (view === "month") return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    else if (view === "week") {
      const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
      return `${fmt(rangeStart)} — ${fmt(rangeEnd)} ${currentDate.getFullYear()}`;
    } else return `${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view, rangeStart, rangeEnd]);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={goPrevious} style={btnIconStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={goToday} style={btnTextStyle}>Hoy</button>
          <button onClick={goNext} style={btnIconStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, marginLeft: 12, color: "var(--ink)" }}>{headerTitle}</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", padding: 3, borderRadius: 8 }}>
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "var(--ink)" : "transparent",
              color: view === v ? "var(--bg)" : "var(--ink-muted)",
              border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "inherit",
            }}>
              {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Cargando...</div>
      ) : (
        <>
          {view === "month" && <MonthView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />}
          {view === "week" && <WeekView rangeStart={rangeStart} events={events} onEventClick={setSelectedEvent} />}
          {view === "day" && <DayView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />}
        </>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

function MonthView({ currentDate, events, onEventClick }: { currentDate: Date; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const days = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const offset = firstDay.getDay();
    const result: Date[] = [];
    for (let i = 0; i < offset; i++) {
      const d = new Date(y, m, 1 - (offset - i));
      result.push(d);
    }
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) result.push(new Date(y, m, i));
    while (result.length % 7 !== 0) {
      const last = result[result.length - 1];
      const next = new Date(last); next.setDate(last.getDate() + 1);
      result.push(next);
    }
    return result;
  }, [currentDate]);

  const dayHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {dayHeaders.map((h) => (
          <div key={h} style={{ background: "var(--bg-elevated)", padding: "8px 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)", textAlign: "center" }}>{h}</div>
        ))}
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentDate.getMonth();
          const isToday = d.toDateString() === new Date().toDateString();
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay[key] || [];
          return (
            <div key={i} style={{ background: "var(--surface)", minHeight: 70, padding: 5, opacity: isCurrentMonth ? 1 : 0.35 }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--ink)" : "var(--ink-muted)", marginBottom: 4, display: "inline-block", padding: isToday ? "2px 6px" : 0, background: isToday ? "var(--ink)" : "transparent", color: isToday ? "var(--bg)" : "var(--ink-muted)" as any, borderRadius: 4 }}>{d.getDate()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayEvents.slice(0, 2).map((e) => {
                  const c = getColorForClient(e.clientName);
                  const time = new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <button key={e.appointmentId} onClick={() => onEventClick(e)} style={{
                      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                      padding: "3px 6px", borderRadius: 4, fontSize: 10, textAlign: "left",
                      cursor: "pointer", fontFamily: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      <strong>{time}</strong> {e.name}
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 9, color: "var(--ink-muted)", padding: "2px 6px" }}>+{dayEvents.length - 2} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ rangeStart, events, onEventClick }: { rangeStart: Date; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeStart); d.setDate(rangeStart.getDate() + i);
      result.push(d);
    }
    return result;
  }, [rangeStart]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    return map;
  }, [events]);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
      {days.map((d, i) => {
        const isToday = d.toDateString() === new Date().toDateString();
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayEvents = eventsByDay[key] || [];
        return (
          <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: 10, minHeight: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{dayNames[d.getDay()]}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? "var(--ink)" : "var(--ink-muted)", marginBottom: 8, display: "inline-block", padding: isToday ? "0 8px" : 0, background: isToday ? "var(--ink)" : "transparent", color: isToday ? "var(--bg)" : "var(--ink-muted)" as any, borderRadius: 4 }}>{d.getDate()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dayEvents.map((e) => {
                const c = getColorForClient(e.clientName);
                const time = new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                return (
                  <button key={e.appointmentId} onClick={() => onEventClick(e)} style={{
                    background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                    padding: "6px 8px", borderRadius: 4, fontSize: 11, textAlign: "left",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <div style={{ fontWeight: 600 }}>{time}</div>
                    <div>{e.name}</div>
                  </button>
                );
              })}
              {dayEvents.length === 0 && <div style={{ fontSize: 10, color: "var(--ink-dim)" }}>Sin citas</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ currentDate, events, onEventClick }: { currentDate: Date; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => {
        const d = new Date(e.startTime);
        return d.toDateString() === currentDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, currentDate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dayEvents.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Sin citas para este día</div>
      ) : dayEvents.map((e) => {
        const c = getColorForClient(e.clientName);
        const time = new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        return (
          <button key={e.appointmentId} onClick={() => onEventClick(e)} style={{
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            padding: 14, borderRadius: 8, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, minWidth: 80 }}>{time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{e.clientName} · {e.address || "Sin dirección"}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const c = getColorForClient(event.clientName);
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const dateStr = start.toLocaleDateString("es-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} - ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 10, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{event.clientName}</div>
            <div className="modal-title" style={{ marginTop: 4 }}>{event.name}</div>
            <div className="modal-subtitle">{dateStr}</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <DetailRow label="Horario" value={timeStr} />
          <DetailRow label="Idioma" value={event.language === "english" ? "Inglés" : "Español"} />
          <DetailRow label="Owner / Renter" value={event.ownerOrRenter || "—"} />
          <DetailRow label="Tipo de agua" value={event.waterType || "—"} />
          <DetailRow label="Dirección" value={event.address || "—"} />
          <DetailRow label="Estado" value={event.appointmentStatus || "—"} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}