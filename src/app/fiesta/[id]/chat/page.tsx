"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Send, Bot, User } from "lucide-react";
import type { ChatMensaje, UserPena } from "@/types/database";

export default function ChatPage() {
  const { activePena: pena, activeUserPena: userPena } = usePena();
  const supabase = createClient();
  const [mensajes, setMensajes] = useState<(ChatMensaje & { autor?: UserPena })[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [miembros, setMiembros] = useState<UserPena[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMensajes = useCallback(async () => {
    if (!supabase || !pena) return;
    const { data } = await supabase.from("chat_mensajes").select("*, users_penas(*)").eq("pena_id", pena.id).order("created_at", { ascending: true }).limit(100);
    setMensajes((data as unknown as (ChatMensaje & { users_penas?: UserPena })[])?.map(m => ({ ...m, autor: m.users_penas })) || []);
    setLoading(false);
  }, [supabase, pena]);

  useEffect(() => {
    loadMensajes();
    if (!supabase || !pena) return;

    supabase.from("users_penas").select("*").eq("pena_id", pena.id).then(({ data }) => setMiembros(data as UserPena[] || []));

    const channel = supabase
      .channel("chat-" + pena.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes", filter: `pena_id=eq.${pena.id}` },
        (payload) => {
          const nuevo = payload.new as ChatMensaje;
          const autor = miembros.find(m => m.id === nuevo.user_pena_id);
          setMensajes(prev => [...prev, { ...nuevo, autor }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, pena, loadMensajes]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);

  const enviar = async () => {
    if (!supabase || !texto.trim() || !userPena) return;
    await supabase.from("chat_mensajes").insert({ pena_id: pena!.id, user_pena_id: userPena.id, mensaje: texto.trim(), tipo: "chat" });
    setTexto("");
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando chat...</div>;

  return (
    <div>
      <PageHeader title="Chat" description="Chat en tiempo real de la peña" />
      <Card>
        <CardContent className="pt-4">
          <div className="h-[60vh] overflow-y-auto space-y-3 mb-4 pr-2">
            {mensajes.map(m => (
              <div key={m.id} className={cn("flex gap-2", m.tipo === "sistema" && "justify-center")}>
                {m.tipo === "sistema" ? (
                  <div className="bg-gray-100 text-[var(--text-secondary)] text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Bot className="w-3 h-3" /> {m.mensaje}
                  </div>
                ) : (
                  <div className={cn("flex gap-2 max-w-[80%]", m.user_pena_id === userPena?.id && "ml-auto flex-row-reverse")}>
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      m.user_pena_id === userPena?.id ? "bg-indigo-500 text-white" : "bg-gray-300 text-gray-700")}>
                      {m.autor?.nombre_completo?.charAt(0) || <User className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      {m.user_pena_id !== userPena?.id && <p className="text-xs text-[var(--text-secondary)] mb-0.5">{m.autor?.nombre_completo || "Anónimo"}</p>}
                      <div className={cn("rounded-[var(--radius-lg)] px-4 py-2 text-sm", m.user_pena_id === userPena?.id ? "bg-indigo-500 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none")}>
                        {m.mensaje}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()}
              placeholder="Escribe un mensaje..." className="flex-1 px-4 py-2 border rounded-[var(--radius-md)] text-sm" />
            <Button onClick={enviar} disabled={!texto.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
