import { createServiceClient } from "@/lib/supabase-service";
import type OpenAI from "openai";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Adiciona uma tarefa ou pendência ao sistema",
      parameters: {
        type: "object",
        properties: {
          title:    { type: "string", description: "Título da tarefa" },
          type:     { type: "string", enum: ["task", "pending"], description: "task = tarefa normal, pending = pendência" },
          priority: { type: "string", enum: ["baixa", "normal", "alta"] },
          due_date: { type: "string", description: "Data de vencimento YYYY-MM-DD (opcional)" },
        },
        required: ["title", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal",
      description: "Adiciona uma meta do dia",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date:  { type: "string", description: "YYYY-MM-DD (padrão hoje)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Marca uma tarefa como concluída pelo título (busca parcial)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Parte do título da tarefa" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Lista tarefas e pendências em aberto",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de itens (padrão 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Salva uma nota rápida",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Registra um gasto",
      parameters: {
        type: "object",
        properties: {
          amount:      { type: "number", description: "Valor em reais" },
          description: { type: "string" },
          category:    { type: "string", enum: ["alimentacao", "transporte", "saude", "lazer", "educacao", "moradia", "outros"] },
          date:        { type: "string", description: "YYYY-MM-DD (padrão hoje)" },
        },
        required: ["amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_income",
      description: "Registra uma entrada de dinheiro",
      parameters: {
        type: "object",
        properties: {
          amount:      { type: "number", description: "Valor em reais" },
          description: { type: "string" },
          category:    { type: "string", enum: ["salario", "freela", "cliente", "outros"] },
          date:        { type: "string", description: "YYYY-MM-DD (padrão hoje)" },
        },
        required: ["amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finance",
      description: "Retorna resumo financeiro do mês atual",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_status",
      description: "Retorna status completo do dia: tarefas, metas, hábitos",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_habit",
      description: "Registra um hábito do dia (oração, leitura, exercício)",
      parameters: {
        type: "object",
        properties: {
          habit: { type: "string", enum: ["prayer", "bible_reading", "exercise", "reading"] },
        },
        required: ["habit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_briefing",
      description: "Retorna briefing completo do dia",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_goal",
      description: "Marca uma meta do dia como concluída pelo título (busca parcial)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Parte do título da meta" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_reflection",
      description: "Salva um insight ou reflexão importante que surgiu na conversa",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "O insight em uma frase clara e direta" },
        },
        required: ["content"],
      },
    },
  },
];

type ToolInput = Record<string, unknown>;

export async function executeTool(name: string, input: ToolInput, userId: string): Promise<string> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  switch (name) {
    case "add_task": {
      const { title, type = "task", priority = "normal", due_date } = input as {
        title: string; type?: string; priority?: string; due_date?: string;
      };
      const row: ToolInput = { title, type, priority, user_id: userId };
      if (due_date) row.due_date = due_date;
      const { error } = await supabase.from("tasks").insert(row);
      if (error) return `Erro ao adicionar: ${error.message}`;
      return `"${title}" adicionada.`;
    }

    case "add_goal": {
      const { title, date = today } = input as { title: string; date?: string };
      const { error } = await supabase.from("goals").insert({ title, date, user_id: userId });
      if (error) return `Erro: ${error.message}`;
      return `Meta "${title}" adicionada para ${date}.`;
    }

    case "complete_task": {
      const { query } = input as { query: string };
      const { data: found } = await supabase
        .from("tasks")
        .select("id,title")
        .eq("user_id", userId)
        .eq("completed", false)
        .ilike("title", `%${query}%`)
        .limit(1)
        .single();
      if (!found) return `Não encontrei tarefa com "${query}" em aberto.`;
      await supabase.from("tasks").update({ completed: true }).eq("id", found.id);
      return `"${found.title}" concluída.`;
    }

    case "get_tasks": {
      const limit = (input.limit as number) ?? 10;
      const { data } = await supabase
        .from("tasks")
        .select("title,type,priority,due_date")
        .eq("user_id", userId)
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!data?.length) return "Nenhuma tarefa em aberto.";
      const lines = data.map((t) => {
        const icon = t.type === "pending" ? "⏳" : "📋";
        const prio = t.priority === "alta" ? " 🔴" : t.priority === "baixa" ? " 🟢" : "";
        const due  = t.due_date ? ` — vence ${t.due_date}` : "";
        return `${icon} ${t.title}${prio}${due}`;
      });
      return `*${data.length} em aberto:*\n${lines.join("\n")}`;
    }

    case "add_note": {
      const { content } = input as { content: string };
      const { error } = await supabase.from("notes").insert({ content, type: "quick", user_id: userId });
      if (error) return `Erro: ${error.message}`;
      return `Nota salva.`;
    }

    case "add_expense": {
      const { amount, description, category = "outros", date = today } = input as {
        amount: number; description: string; category?: string; date?: string;
      };
      const { error } = await supabase.from("finance_entries").insert({
        type: "saida", amount, description, category, date, user_id: userId,
      });
      if (error) return `Erro: ${error.message}`;
      return `Gasto de ${fmt(amount)} (${description}) registrado.`;
    }

    case "add_income": {
      const { amount, description, category = "outros", date = today } = input as {
        amount: number; description: string; category?: string; date?: string;
      };
      const { error } = await supabase.from("finance_entries").insert({
        type: "entrada", amount, description, category, date, user_id: userId,
      });
      if (error) return `Erro: ${error.message}`;
      return `Entrada de ${fmt(amount)} (${description}) registrada.`;
    }

    case "get_finance": {
      const start = today.slice(0, 7) + "-01";
      const { data: entries } = await supabase
        .from("finance_entries")
        .select("type,amount")
        .eq("user_id", userId)
        .gte("date", start);
      const income = entries?.filter((e) => e.type === "entrada").reduce((s, e) => s + Number(e.amount), 0) ?? 0;
      const spent  = entries?.filter((e) => e.type === "saida").reduce((s, e) => s + Number(e.amount), 0) ?? 0;
      const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });
      return `*Financeiro — ${mes}*\n📈 Entradas: ${fmt(income)}\n📉 Saídas: ${fmt(spent)}\n💵 Saldo: ${fmt(income - spent)}`;
    }

    case "get_status": {
      const [{ count: tasks }, { count: pending }, { data: goals }] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", false).eq("type", "task"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", false).eq("type", "pending"),
        supabase.from("goals").select("title,completed").eq("user_id", userId).eq("date", today),
      ]);
      const doneGoals  = goals?.filter((g) => g.completed).length ?? 0;
      const totalGoals = goals?.length ?? 0;
      return `*Status — ${today}*\n\n📋 Tarefas: ${tasks ?? 0} em aberto\n⏳ Pendências: ${pending ?? 0}\n🎯 Metas: ${doneGoals}/${totalGoals}`;
    }

    case "add_habit": {
      const { habit } = input as { habit: string };
      const labels: Record<string, string> = {
        prayer: "Oração", bible_reading: "Leitura bíblica", exercise: "Exercício", reading: "Leitura",
      };
      const { error } = await supabase
        .from("habit_logs")
        .upsert({ habit_type: habit, date: today, user_id: userId }, { onConflict: "user_id,habit_type,date" });
      if (error) return `Erro: ${error.message}`;
      return `Hábito "${labels[habit] ?? habit}" registrado.`;
    }

    case "get_briefing": {
      const [{ count: tasks }, { data: goals }, { data: contas }] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", false),
        supabase.from("goals").select("title,completed").eq("user_id", userId).eq("date", today),
        supabase.from("finance_entries")
          .select("description,amount,date")
          .eq("user_id", userId)
          .eq("type", "conta")
          .gte("date", today)
          .limit(5),
      ]);
      const goalLines = goals?.length
        ? goals.map((g) => `${g.completed ? "✅" : "⬜"} ${g.title}`).join("\n")
        : "Nenhuma meta hoje";
      const contaLines = contas?.length
        ? "\n\n💸 *Contas próximas*\n" + contas.map((c) => `• ${c.description} — ${fmt(Number(c.amount))} (${c.date})`).join("\n")
        : "";
      const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      return `🌅 *Briefing — ${date}*\n\n🎯 *Metas de hoje*\n${goalLines}\n\n📌 Tarefas em aberto: ${tasks ?? 0}${contaLines}`;
    }

    case "complete_goal": {
      const { query } = input as { query: string };
      const { data: found } = await supabase
        .from("goals")
        .select("id,title")
        .eq("user_id", userId)
        .eq("completed", false)
        .eq("date", today)
        .ilike("title", `%${query}%`)
        .limit(1)
        .single();
      if (!found) return `Não encontrei meta com "${query}" em aberto hoje.`;
      await supabase.from("goals").update({ completed: true }).eq("id", found.id);
      return `Meta "${found.title}" concluída. ✅`;
    }

    case "save_reflection": {
      const { content } = input as { content: string };
      const { error } = await supabase.from("notes").insert({ content, type: "insight", user_id: userId });
      if (error) return `Erro: ${error.message}`;
      return `Reflexão salva.`;
    }

    default:
      return "Ferramenta desconhecida.";
  }
}
