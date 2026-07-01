"use client";
import { useState } from "react";
import { X, Calendar, Clock, AlignLeft, Tag } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#00C8FF", "#22C55E", "#F59E0B", "#EF4444", "#A855F7"];
const TYPES = [
  { value: "event", label: "Evento" },
  { value: "reminder", label: "Lembrete" },
  { value: "task", label: "Tarefa" },
];

interface Props {
  date: Date;
  onClose: () => void;
  onSaved: () => void;
}

export default function EventModal({ date, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#00C8FF");
  const [type, setType] = useState("event");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("Título é obrigatório"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          date: format(date, "yyyy-MM-dd"),
          time: time || undefined,
          end_time: endTime || undefined,
          color,
          type,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#E2E8F0] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h3 className="font-semibold text-[#0A1628] text-base">Novo compromisso</h3>
            <p className="text-xs text-[#64748B] capitalize mt-0.5">
              {format(date, "EEEE, d 'de' MMMM", { locale: undefined })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] text-[#64748B]">
            <X size={16} />
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium border transition-all ${
                type === t.value
                  ? "bg-[#00C8FF] text-white border-[#00C8FF]"
                  : "text-[#64748B] border-[#E2E8F0] hover:border-[#00C8FF]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Título */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            autoFocus
            type="text"
            placeholder="Título do compromisso"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00C8FF] text-[#0A1628] placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Horários */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00C8FF] text-[#0A1628]"
            />
          </div>
          <div className="relative flex-1">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="Fim"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00C8FF] text-[#0A1628]"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="relative">
          <AlignLeft size={14} className="absolute left-3 top-3 text-[#94A3B8]" />
          <textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00C8FF] text-[#0A1628] placeholder:text-[#94A3B8] resize-none"
          />
        </div>

        {/* Cor */}
        <div className="flex items-center gap-2">
          <Tag size={13} className="text-[#94A3B8]" />
          <span className="text-xs text-[#64748B] mr-1">Cor:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Botões */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-[#64748B] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFB] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !title.trim()}
            className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl bg-[#00C8FF] hover:bg-[#33D4FF] disabled:opacity-40 transition-colors"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
