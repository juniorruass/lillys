"use client";
import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2 } from "lucide-react";
import EventModal from "./EventModal";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  end_time?: string;
  color: string;
  type: "event" | "reminder" | "task";
}

export default function CalendarWidget() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [extended, setExtended] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);

  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
  const days = Array.from({ length: extended ? 15 : 7 }, (_, i) => addDays(weekStart, i));

  const fetchEvents = useCallback(async () => {
    const from = format(startOfMonth(addDays(weekStart, -7)), "yyyy-MM-dd");
    const to = format(endOfMonth(addDays(weekStart, extended ? 21 : 14)), "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/events?from=${from}&to=${to}`);
      if (res.ok) setEvents(await res.json());
    } catch {}
  }, [weekStart, extended]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function eventsForDay(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    return events.filter((e) => e.date === key);
  }

  async function deleteEvent(id: string) {
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  }

  const selectedEvents = eventsForDay(selected);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[#0A1628]">Calendário</h2>
            <p className="text-xs text-[#64748B] capitalize">
              {format(baseDate, "MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExtended(!extended)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                extended ? "bg-[#E0F7FF] text-[#00C8FF]" : "text-[#64748B] hover:bg-[#F8FAFB]"
              }`}
            >
              <CalendarDays size={12} />
              {extended ? "7 dias" : "15 dias"}
            </button>
            <button
              onClick={() => setBaseDate(addWeeks(baseDate, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFB] text-[#64748B]"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setBaseDate(addWeeks(baseDate, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFB] text-[#64748B]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#64748B] uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const today = isToday(day);
            const sel = isSameDay(day, selected);
            const dayEvents = eventsForDay(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all relative ${
                  sel
                    ? "bg-[#00C8FF] text-white shadow-sm shadow-[#00C8FF]/30"
                    : today
                    ? "bg-[#E0F7FF] text-[#00C8FF] font-semibold"
                    : "text-[#0A1628] hover:bg-[#F8FAFB]"
                }`}
              >
                <span>{format(day, "d")}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: sel ? "rgba(255,255,255,0.8)" : ev.color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Dia selecionado */}
        <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-[#0A1628] capitalize">
                {format(selected, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
              {isToday(selected) && (
                <span className="ml-2 text-[10px] bg-[#E0F7FF] text-[#00C8FF] px-2 py-0.5 rounded-full font-medium">
                  hoje
                </span>
              )}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-[#00C8FF] text-white hover:bg-[#33D4FF] transition-colors"
              title="Adicionar compromisso"
            >
              <Plus size={13} />
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">Nenhum compromisso — clique em + para adicionar.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2 p-2 rounded-xl bg-[#F8FAFB] group"
                >
                  <span
                    className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: ev.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0A1628] truncate">{ev.title}</p>
                    {(ev.time || ev.description) && (
                      <p className="text-[10px] text-[#64748B] truncate">
                        {ev.time && <span>{ev.time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""} · </span>}
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <EventModal
          date={selected}
          onClose={() => setShowModal(false)}
          onSaved={fetchEvents}
        />
      )}
    </>
  );
}
