import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { LoaderCircle, Maximize, Minimize, Pause, PictureInPicture2, Pin, PinOff, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { getVideoUrl } from "@/lib/videoUrl";
import { Video } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/api";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
const SAVE_INTERVAL = 10_000;
const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}`;
};
const isEditing = (target: EventTarget | null) => { const element = target as HTMLElement | null; return Boolean(element?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName || "")); };

export default function VideoPlayer({ video, nextVideo }: { video: Video; nextVideo?: Video | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null), videoRef = useRef<HTMLVideoElement>(null), lastSave = useRef(0), resumeAt = useRef<number | null>(null), hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null), autoplayTried = useRef(false);
  const [playing, setPlaying] = useState(false), [waiting, setWaiting] = useState(true), [canPlay, setCanPlay] = useState(false), [time, setTime] = useState(0), [duration, setDuration] = useState(0), [buffered, setBuffered] = useState(0), [volume, setVolume] = useState(1), [muted, setMuted] = useState(false), [speed, setSpeed] = useState(1), [showControls, setShowControls] = useState(true), [theater, setTheater] = useState(false), [pinned, setPinned] = useState(false), [floating, setFloating] = useState(false), [fullscreen, setFullscreen] = useState(false), [pipSupported, setPipSupported] = useState(false), [error, setError] = useState(""), [countdown, setCountdown] = useState<number | null>(null);
  const src = video.videoUrl || getVideoUrl(video.filename || video.filepath);

  const saveProgress = useCallback(async (force = false) => {
    const element = videoRef.current;
    if (!user || !element || !Number.isFinite(element.duration) || element.duration <= 0 || (!force && Date.now() - lastSave.current < SAVE_INTERVAL)) return;
    lastSave.current = Date.now();
    try { await api.put(`/history/progress/${video._id}`, { position: element.currentTime, duration: element.duration }); } catch { /* playback should continue if progress storage is offline */ }
  }, [user, video._id]);
  const reveal = useCallback(() => { setShowControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); if (playing && !waiting && countdown === null) hideTimer.current = setTimeout(() => setShowControls(false), 3000); }, [playing, waiting, countdown]);
  const seek = useCallback((value: number) => { const element = videoRef.current; if (!element || !Number.isFinite(element.duration)) return; element.currentTime = Math.max(0, Math.min(value, element.duration)); reveal(); }, [reveal]);
  const changeVolume = useCallback((value: number) => { const element = videoRef.current; if (!element) return; const safe = Math.max(0, Math.min(value, 1)); element.volume = safe; element.muted = safe === 0; setVolume(safe); setMuted(element.muted); }, []);
  const togglePlayback = useCallback(async () => { const element = videoRef.current; if (!element) return; setError(""); try { if (element.paused) await element.play(); else element.pause(); } catch { setError("Playback was blocked by this browser. Press play to continue."); } }, []);

  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await playerRef.current?.requestFullscreen(); } catch { setError("Fullscreen is not available in this browser."); } }
  async function togglePip() { const element = videoRef.current; if (!element || !pipSupported) return; try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await element.requestPictureInPicture(); } catch { setError("Picture-in-Picture is not available for this video."); } }

  useEffect(() => {
    setPipSupported(Boolean(document.pictureInPictureEnabled));
    const onFullscreen = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);
  useEffect(() => { autoplayTried.current = false; setCountdown(null); setError(""); setCanPlay(false); }, [video._id]);
  useEffect(() => {
    if (!router.isReady || router.query.autoplay !== "1" || !canPlay || autoplayTried.current) return;
    autoplayTried.current = true;
    videoRef.current?.play().catch(() => setError("Autoplay was blocked by this browser. Press play to continue."));
  }, [canPlay, router.isReady, router.query.autoplay]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    api.get(`/history/progress/${video._id}`).then(({ data }) => {
      const position = active && data.progress && !data.progress.completed ? Number(data.progress.position) || null : null;
      resumeAt.current = position;
      const element = videoRef.current;
      if (position && element && Number.isFinite(element.duration) && position < element.duration - 5) element.currentTime = position;
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user, video._id]);
  useEffect(() => {
    const pauseOther = (event: Event) => { if ((event as CustomEvent<HTMLVideoElement>).detail !== videoRef.current) videoRef.current?.pause(); };
    window.addEventListener("yourtube:video-play", pauseOther as EventListener);
    return () => window.removeEventListener("yourtube:video-play", pauseOther as EventListener);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditing(event.target)) return;
      const actions: Record<string, () => void> = { " ": () => { void togglePlayback(); }, arrowleft: () => seek(time - (event.shiftKey ? 30 : 10)), arrowright: () => seek(time + (event.shiftKey ? 30 : 10)), arrowup: () => changeVolume(volume + .05), arrowdown: () => changeVolume(volume - .05), m: () => { const element = videoRef.current; if (element) element.muted = !element.muted; }, f: () => { void toggleFullscreen(); }, p: () => { void togglePip(); }, t: () => setTheater((value) => !value) };
      const action = actions[event.key.toLowerCase()]; if (!action) return; event.preventDefault(); action(); reveal();
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [changeVolume, reveal, seek, time, togglePlayback, volume]);
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); void saveProgress(true); }, [saveProgress]);
  useEffect(() => { if (countdown === null) return; if (countdown === 0) { void router.push({ pathname: `/watch/${nextVideo?._id}`, query: { autoplay: "1" } }); return; } const timer = setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1000); return () => clearTimeout(timer); }, [countdown, nextVideo?._id, router]);
  useEffect(() => {
    if (!pinned) { setFloating(false); return; }
    const syncPinnedPlayer = () => setFloating(window.innerWidth >= 640 && window.scrollY > 280);
    syncPinnedPlayer(); window.addEventListener("scroll", syncPinnedPlayer, { passive: true }); window.addEventListener("resize", syncPinnedPlayer);
    return () => { window.removeEventListener("scroll", syncPinnedPlayer); window.removeEventListener("resize", syncPinnedPlayer); };
  }, [pinned]);

  return <div ref={playerRef} className={`relative w-full overflow-hidden bg-black ${floating ? "fixed bottom-4 right-4 z-50 aspect-video w-[min(78vw,360px)] rounded-xl shadow-2xl ring-1 ring-white/20" : theater ? "fixed inset-x-0 top-14 z-40 h-[min(75vh,calc(100vh-3.5rem))]" : "aspect-video rounded-xl shadow-lg ring-1 ring-black/10"}`} onMouseMove={reveal} onTouchStart={reveal}>
    {src ? <video ref={videoRef} key={video._id} src={src} className="h-full w-full object-contain" playsInline onClick={() => void togglePlayback()}
      onLoadedMetadata={(event) => { const element = event.currentTarget; setDuration(element.duration); if (resumeAt.current && resumeAt.current < element.duration - 5) element.currentTime = resumeAt.current; }}
      onTimeUpdate={(event) => { setTime(event.currentTarget.currentTime); void saveProgress(); }} onProgress={(event) => { const element = event.currentTarget; if (element.buffered.length && Number.isFinite(element.duration)) setBuffered(element.buffered.end(element.buffered.length - 1)); }}
      onWaiting={() => setWaiting(true)} onCanPlay={() => { setWaiting(false); setCanPlay(true); }} onPlaying={(event) => { setPlaying(true); setWaiting(false); window.dispatchEvent(new CustomEvent("yourtube:video-play", { detail: event.currentTarget })); reveal(); }} onPause={() => { setPlaying(false); setShowControls(true); void saveProgress(true); }} onEnded={() => { setPlaying(false); void saveProgress(true); if (nextVideo) setCountdown(5); }}
      onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }} onRateChange={(event) => setSpeed(event.currentTarget.playbackRate)} onError={() => { setWaiting(false); setError("Unable to load this video. Please try again."); }} /> : <div className="grid h-full place-items-center text-sm text-gray-300">Video source unavailable</div>}
    {(waiting || error || countdown !== null) && <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 text-center text-white">{waiting && !error && countdown === null && <LoaderCircle className="animate-spin" aria-label="Loading video" />}{error && <button onClick={() => void togglePlayback()} className="rounded bg-white px-4 py-2 text-black">{error}</button>}{countdown !== null && nextVideo && <div><p className="text-lg font-semibold">Next video starts in {countdown}</p><p className="mt-1 text-sm">{nextVideo.videotitle}</p><button onClick={() => setCountdown(null)} className="mt-3 inline-flex items-center gap-1 rounded bg-white/20 px-3 py-2 text-sm"><X size={16}/> Cancel</button></div>}</div>}
    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-10 text-white transition-opacity ${showControls || !playing ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <input aria-label="Seek video" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(time, duration || 0)} onChange={(event) => seek(Number(event.target.value))} className="mb-3 h-1 w-full cursor-pointer accent-red-500" />
      <div className="flex items-center gap-1.5 text-sm sm:gap-2"><button className="rounded-full p-1.5 transition hover:bg-white/20" aria-label={playing ? "Pause" : "Play"} title="Play/Pause (Space)" onClick={() => void togglePlayback()}>{playing ? <Pause size={21}/> : <Play size={21}/>}</button><button className="hidden rounded-full p-1.5 transition hover:bg-white/20 sm:block" aria-label="Back 10 seconds" title="Back 10 seconds (Left)" onClick={() => seek(time - 10)}><RotateCcw size={19}/></button><button className="hidden rounded-full p-1.5 transition hover:bg-white/20 sm:block" aria-label="Forward 10 seconds" title="Forward 10 seconds (Right)" onClick={() => seek(time + 10)}><RotateCw size={19}/></button><button className="rounded-full p-1.5 transition hover:bg-white/20" aria-label={muted ? "Unmute" : "Mute"} title="Mute (M)" onClick={() => { const element = videoRef.current; if (element) element.muted = !element.muted; }}>{muted || volume === 0 ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} className="hidden w-20 accent-white sm:block" /><span className="whitespace-nowrap text-xs tabular-nums sm:text-sm">{formatTime(time)} / {formatTime(duration)}</span><span className="ml-auto"/><select aria-label="Playback speed" value={speed} onChange={(event) => { const rate = Number(event.target.value); if (videoRef.current) videoRef.current.playbackRate = rate; setSpeed(rate); }} className="hidden rounded bg-white/15 px-1.5 py-1 text-xs text-white sm:block">{SPEEDS.map((rate) => <option className="text-black" key={rate} value={rate}>{rate}×</option>)}</select><button className="hidden rounded-full p-1.5 transition hover:bg-white/20 sm:block" aria-label="Theater mode" title="Theater mode (T)" onClick={() => setTheater((value) => !value)}>{theater ? <Minimize size={19}/> : <Maximize size={19}/>}</button>{pipSupported && <button className="hidden rounded-full p-1.5 transition hover:bg-white/20 sm:block" aria-label="Picture in Picture" title="Picture-in-Picture (P)" onClick={() => void togglePip()}><PictureInPicture2 size={19}/></button>}<button className="rounded-full p-1.5 transition hover:bg-white/20" aria-label="Fullscreen" title="Fullscreen (F)" onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button></div>
    </div>
    <button className={`absolute right-3 top-3 hidden rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/70 sm:block ${showControls || !playing ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-label={pinned ? "Stop keeping player visible" : "Keep player visible while browsing"} title={pinned ? "Stop keeping player visible" : "Keep player visible while browsing"} onClick={() => setPinned((value) => !value)}>{pinned ? <PinOff size={18}/> : <Pin size={18}/>}</button>
  </div>;
}
