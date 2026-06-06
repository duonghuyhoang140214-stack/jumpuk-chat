import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import {
  PhoneIcon, MicIcon, MicMuteIcon, SpeakerIcon,
  HeartIcon, BombIcon, ThumbUpIcon, ThumbDownIcon, CloseIcon,
} from "@/components/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/call/$convId")({
  component: CallRoom,
});

const REACTIONS = [
  { id: "heart", Icon: HeartIcon, color: "text-pink-400", emoji: "❤️" },
  { id: "bomb", Icon: BombIcon, color: "text-foreground", emoji: "💣" },
  { id: "like", Icon: ThumbUpIcon, color: "text-blue-400", emoji: "👍" },
  { id: "dislike", Icon: ThumbDownIcon, color: "text-orange-400", emoji: "👎" },
] as const;

interface FloatReaction { id: string; type: string; left: number; }

function CallRoom() {
  const { convId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [floats, setFloats] = useState<FloatReaction[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const { data: other } = useQuery({
    queryKey: ["call-other", convId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_members")
        .select("user_id, profiles:profiles!conversation_members_user_id_fkey(id,display_name,avatar_url)")
        .eq("conversation_id", convId)
        .neq("user_id", user!.id)
        .maybeSingle();
      return (data as any)?.profiles ?? null;
    },
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
      if (!stream) { toast.error("Không thể truy cập micro"); navigate({ to: "/app/chat/$convId", params: { convId } }); return; }
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
        if (mounted) {
          setStatus("connected");
          startTimeRef.current = Date.now();
        }
      };

      // signaling channel
      const ch = supabase.channel(`call-${convId}`, { config: { broadcast: { self: false } } });
      channelRef.current = ch;

      pc.onicecandidate = (e) => {
        if (e.candidate) ch.send({ type: "broadcast", event: "ice", payload: { from: user!.id, candidate: e.candidate } });
      };

      ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "answer", payload: { from: user!.id, sdp: answer } });
      });
      ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        if (pc.signalingState !== "stable") await pc.setRemoteDescription(payload.sdp);
      });
      ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        try { await pc.addIceCandidate(payload.candidate); } catch {}
      });
      ch.on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (payload.from === user!.id) return;
        spawnFloat(payload.type);
      });
      ch.on("broadcast", { event: "hangup" }, () => {
        cleanup();
        navigate({ to: "/app/chat/$convId", params: { convId } });
      });
      ch.on("broadcast", { event: "hello" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        // peer joined after us → we send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ch.send({ type: "broadcast", event: "offer", payload: { from: user!.id, sdp: offer } });
      });

      await ch.subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          // announce arrival
          ch.send({ type: "broadcast", event: "hello", payload: { from: user!.id } });
        }
      });
    };

    init();
    return () => { mounted = false; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [status]);

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
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
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: { from: user!.id } });
    cleanup();
    navigate({ to: "/app/chat/$convId", params: { convId } });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-[100dvh] flex-col bg-gradient-to-b from-[oklch(0.3_0.1_350)] to-[oklch(0.15_0.05_280)] text-white overflow-hidden relative">
      {/* floating reactions */}
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
              className="absolute text-6xl pointer-events-none z-10"
              style={{ left: `${f.left}%` }}
            >
              <r.Icon size={60} className={r.color} />
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 z-0">
        <div className={`${status === "calling" ? "animate-pulse" : ""}`}>
          <Avatar path={other?.avatar_url} name={other?.display_name} size={160} className="ring-4 ring-white/30" />
        </div>
        <h2 className="text-3xl font-bold">{other?.display_name ?? "Đang gọi..."}</h2>
        <p className="text-white/70">
          {status === "calling" ? "Đang kết nối..." : status === "connected" ? fmt(seconds) : "Kết thúc"}
        </p>
      </div>

      <audio ref={remoteAudioRef} autoPlay />

      {/* mini reaction bar */}
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
