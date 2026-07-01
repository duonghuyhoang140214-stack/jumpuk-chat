import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import {
  PhoneIcon, MicIcon, MicMuteIcon, SpeakerIcon,
  HeartIcon, BombIcon, ThumbUpIcon, ThumbDownIcon, UsersIcon,
} from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/call/$convId")({
  component: CallRoom,
});

const REACTIONS = [
  { id: "heart", Icon: HeartIcon, color: "text-pink-400" },
  { id: "bomb", Icon: BombIcon, color: "text-foreground" },
  { id: "like", Icon: ThumbUpIcon, color: "text-blue-400" },
  { id: "dislike", Icon: ThumbDownIcon, color: "text-orange-400" },
] as const;

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

interface FloatReaction { id: string; type: string; left: number; }

function CallRoom() {
  const { convId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [floats, setFloats] = useState<FloatReaction[]>([]);
  /** map of peerId -> "connecting" | "connected" */
  const [peerState, setPeerState] = useState<Record<string, string>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const channelRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const startedRef = useRef(false);
  const historyIdRef = useRef<string | null>(null);
  const historyLoggedRef = useRef(false);

  const { data: convMeta } = useQuery({
    queryKey: ["call-meta", convId],
    queryFn: async () => {
      const { data: conv } = await supabase.from("conversations").select("is_group, name").eq("id", convId).maybeSingle();
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id, profiles:profiles!conversation_members_user_id_fkey(id,display_name,avatar_url)")
        .eq("conversation_id", convId);
      return { conv, members: members ?? [] };
    },
  });

  const isGroup = !!convMeta?.conv?.is_group;
  const others = useMemo(() => (convMeta?.members ?? []).filter((m: any) => m.user_id !== user!.id), [convMeta, user]);

  const ensurePc = (peerId: string) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)!;
    const pc = new RTCPeerConnection(ICE);
    pcsRef.current.set(peerId, pc);
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    pc.onicecandidate = (e) => {
      if (e.candidate) channelRef.current?.send({ type: "broadcast", event: "ice", payload: { from: user!.id, to: peerId, candidate: e.candidate } });
    };
    pc.ontrack = (e) => {
      let audio = audiosRef.current.get(peerId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        audiosRef.current.set(peerId, audio);
      }
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
      setPeerState((s) => ({ ...s, [peerId]: "connected" }));
      if (!startTimeRef.current) startTimeRef.current = Date.now();
    };
    pc.onconnectionstatechange = () => {
      setPeerState((s) => ({ ...s, [peerId]: pc.connectionState }));
    };
    return pc;
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let mounted = true;

    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
      if (!stream) { toast.error("Không thể truy cập micro"); navigate({ to: "/app/chat/$convId", params: { convId } }); return; }
      localStreamRef.current = stream;

      const ch = supabase.channel(`call-${convId}`, { config: { broadcast: { self: false } } });
      channelRef.current = ch;

      ch.on("broadcast", { event: "hello" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        // I'm already in → I send offer to the new peer
        const pc = ensurePc(payload.from);
        setPeerState((s) => ({ ...s, [payload.from]: "connecting" }));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ch.send({ type: "broadcast", event: "offer", payload: { from: user!.id, to: payload.from, sdp: offer } });
      });
      ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = ensurePc(payload.from);
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "answer", payload: { from: user!.id, to: payload.from, sdp: answer } });
      });
      ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = pcsRef.current.get(payload.from);
        if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(payload.sdp);
      });
      ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = pcsRef.current.get(payload.from);
        try { await pc?.addIceCandidate(payload.candidate); } catch {}
      });
      ch.on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (payload.from === user!.id) return;
        spawnFloat(payload.type);
      });
      ch.on("broadcast", { event: "bye" }, ({ payload }) => {
        const pc = pcsRef.current.get(payload.from);
        pc?.close();
        pcsRef.current.delete(payload.from);
        const a = audiosRef.current.get(payload.from);
        a?.remove();
        audiosRef.current.delete(payload.from);
        setPeerState((s) => { const n = { ...s }; delete n[payload.from]; return n; });
      });

      await ch.subscribe(async (st) => {
        if (st === "SUBSCRIBED" && mounted) {
          ch.send({ type: "broadcast", event: "hello", payload: { from: user!.id } });
        }
      });
    };

    init();
    return () => { mounted = false; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const anyConnected = Object.values(peerState).some((s) => s === "connected");
    if (!anyConnected) return;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [peerState]);

  // Ringtone — Oppo×Samsung×Snapchat lai: 2 chord ấm + ping cao, lặp đến khi kết nối
  useEffect(() => {
    const anyConnected = Object.values(peerState).some((s) => s === "connected");
    if (anyConnected) return;
    let ctx: AudioContext | null = null;
    let stopped = false;
    let timer: any;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return; }
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    const tone = (freq: number, t0: number, dur: number, type: OscillatorType = "sine") => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(1, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    };

    const playCycle = () => {
      if (stopped || !ctx) return;
      const t = ctx.currentTime;
      // Chord ấm (Samsung-like): A4 + C#5
      tone(440, t + 0.00, 0.55);
      tone(554.37, t + 0.00, 0.55);
      // Ping cao (Snapchat-like)
      tone(880, t + 0.18, 0.25, "triangle");
      tone(1318.5, t + 0.30, 0.18, "triangle");
      // Echo nhẹ (Oppo-like)
      tone(659.25, t + 0.65, 0.45);
      tone(987.77, t + 0.78, 0.30, "triangle");
    };

    ctx.resume().then(() => {
      playCycle();
      timer = setInterval(playCycle, 1800);
    }).catch(() => {});

    return () => {
      stopped = true;
      clearInterval(timer);
      try { master.gain.cancelScheduledValues(ctx!.currentTime); master.gain.setValueAtTime(0, ctx!.currentTime); } catch {}
      setTimeout(() => ctx?.close().catch(() => {}), 100);
    };
  }, [peerState]);


  const cleanup = () => {
    channelRef.current?.send({ type: "broadcast", event: "bye", payload: { from: user!.id } });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    audiosRef.current.forEach((a) => a.remove());
    audiosRef.current.clear();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (historyLoggedRef.current) return;
    historyLoggedRef.current = true;
    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const connected = !!startTimeRef.current;
    const calleeId = !isGroup ? (others[0] as any)?.user_id ?? null : null;
    supabase.from("call_history").insert({
      conversation_id: convId,
      caller_id: user!.id,
      callee_id: calleeId,
      call_type: isGroup ? "group" : "voice",
      status: connected ? "ended" : "missed",
      duration_sec: duration,
      ended_at: new Date().toISOString(),
    }).then(({ data }: any) => { if (data?.[0]?.id) historyIdRef.current = data[0].id; });
  };

  const spawnFloat = (type: string) => {
    const id = Math.random().toString(36).slice(2);
    setFloats((f) => [...f, { id, type, left: 20 + Math.random() * 60 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 3000);
  };

  const sendReaction = (type: string) => {
    spawnFloat(type);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { from: user!.id, type } });
  };

  const hangup = () => {
    cleanup();
    navigate({ to: "/app/calls" });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const anyConnected = Object.values(peerState).some((s) => s === "connected");

  return (
    <div className="flex h-[100dvh] flex-col bg-gradient-call text-white overflow-hidden relative">
      <AnimatePresence>
        {floats.map((f) => {
          const r = REACTIONS.find((x) => x.id === f.type)!;
          return (
            <motion.div
              key={f.id}
              initial={{ y: "70vh", opacity: 0, scale: 0.5 }}
              animate={{ y: "10vh", opacity: 1, scale: 1.4 }}
              exit={{ opacity: 0, y: "5vh" }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              className="absolute pointer-events-none z-10"
              style={{ left: `${f.left}%` }}
            >
              <r.Icon size={64} className={r.color} />
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 z-0">
        {isGroup ? (
          <>
            <div className="grid place-items-center h-24 w-24 rounded-3xl bg-white/15 backdrop-blur">
              <UsersIcon size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center">{convMeta?.conv?.name ?? "Nhóm"}</h2>
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-sm">
              {others.map((m: any) => {
                const st = peerState[m.user_id];
                return (
                  <div key={m.user_id} className="flex flex-col items-center gap-1.5">
                    <div className={`relative ${st === "connected" ? "" : "opacity-60 animate-pulse"}`}>
                      <Avatar path={m.profiles?.avatar_url} name={m.profiles?.display_name} size={72} className="ring-2 ring-white/30" />
                      {st === "connected" && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-400 ring-2 ring-[oklch(0.18_0.06_300)]" />
                      )}
                    </div>
                    <p className="text-xs font-semibold max-w-[80px] truncate">{m.profiles?.display_name}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-white/70 text-sm">{anyConnected ? fmt(seconds) : "Đang kết nối..."}</p>
          </>
        ) : (
          <>
            <div className={anyConnected ? "" : "animate-pulse"}>
              <Avatar path={(others[0]?.profiles as any)?.avatar_url} name={(others[0]?.profiles as any)?.display_name} size={160} className="ring-4 ring-white/30" />
            </div>
            <h2 className="text-3xl font-bold">{(others[0]?.profiles as any)?.display_name ?? "Đang gọi..."}</h2>
            <p className="text-white/70">{anyConnected ? fmt(seconds) : "Đang kết nối..."}</p>
          </>
        )}
      </div>

      <div className="z-20 flex justify-center gap-2 pb-2">
        {REACTIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => sendReaction(r.id)}
            className="rounded-full bg-white/15 backdrop-blur p-2.5 active:scale-90 transition"
            aria-label={r.id}
          >
            <r.Icon size={22} className={r.color} />
          </button>
        ))}
      </div>

      <div className="z-20 flex justify-around items-center pb-10 pt-4 px-6 safe-bottom">
        <button onClick={toggleMute} className={`rounded-full p-4 ${muted ? "bg-white text-foreground" : "bg-white/15"}`}>
          {muted ? <MicMuteIcon size={26} /> : <MicIcon size={26} />}
        </button>
        <button onClick={hangup} className="rounded-full bg-destructive p-5 rotate-[135deg] shadow-pink active:scale-90">
          <PhoneIcon size={32} />
        </button>
        <button onClick={() => setSpeaker((s) => !s)} className={`rounded-full p-4 ${speaker ? "bg-white text-foreground" : "bg-white/15"}`}>
          <SpeakerIcon size={26} />
        </button>
      </div>
    </div>
  );
}
