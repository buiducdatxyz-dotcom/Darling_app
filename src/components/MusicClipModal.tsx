import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';
import { AudioLines, Check, Music2, Pause, Play, Upload, X } from 'lucide-react';

const CLIP_SECONDS = 15;
const OUTPUT_SAMPLE_RATE = 24_000;

interface MusicClipModalProps {
  userId: number | string;
  currentTitle?: string;
  onClose: () => void;
  onSaved: (songTitle: string) => void;
}

function encodeWav(samples: Float32Array): Blob {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, OUTPUT_SAMPLE_RATE, true);
  view.setUint32(28, OUTPUT_SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * bytesPerSample, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không đọc được đoạn nhạc đã cắt.'));
    reader.onerror = () => reject(new Error('Không đọc được đoạn nhạc đã cắt.'));
    reader.readAsDataURL(blob);
  });
}

export function MusicClipModal({ userId, currentTitle, onClose, onSaved }: MusicClipModalProps) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState(currentTitle || '');
  const [startTime, setStartTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTitle, setSavedTitle] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopPreviewRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (stopPreviewRef.current != null) window.clearInterval(stopPreviewRef.current);
  }, [sourceUrl]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    stopPreview();
    setAudioBuffer(null);
    setSourceUrl(null);
    setWaveform([]);
    setStartTime(0);
    if (file.size > 50 * 1024 * 1024) {
      setError('Tệp nhạc tối đa 50 MB.');
      return;
    }
    try {
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error('Audio preview is not supported in this browser.');
      const context = new AudioContextConstructor();
      let decoded: AudioBuffer;
      try {
        decoded = await context.decodeAudioData(await file.arrayBuffer());
      } finally {
        await context.close().catch(() => {});
      }
      if (decoded.duration < CLIP_SECONDS) {
        setError('Bài nhạc cần dài ít nhất 15 giây để cắt đoạn.');
        return;
      }
      const samples: number[] = [];
      const channel = decoded.getChannelData(0);
      const bars = 56;
      const samplesPerBar = Math.max(1, Math.floor(channel.length / bars));
      for (let bar = 0; bar < bars; bar += 1) {
        let peak = 0;
        const end = Math.min(channel.length, (bar + 1) * samplesPerBar);
        for (let index = bar * samplesPerBar; index < end; index += 1) peak = Math.max(peak, Math.abs(channel[index]));
        samples.push(peak);
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(URL.createObjectURL(file));
      setAudioBuffer(decoded);
      setSongTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 120));
      setStartTime(0);
      setWaveform(samples);
    } catch {
      setError('Không mở được tệp này. Hãy chọn một tệp âm thanh phổ biến như MP3, WAV hoặc M4A.');
    }
  };

  const stopPreview = () => {
    if (stopPreviewRef.current != null) window.clearInterval(stopPreviewRef.current);
    stopPreviewRef.current = null;
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  };

  const playClip = async () => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl) return;
    if (isPlaying) {
      stopPreview();
      return;
    }
    audio.currentTime = startTime;
    try {
      await audio.play();
      setIsPlaying(true);
      stopPreviewRef.current = window.setInterval(() => {
        if (audio.currentTime >= startTime + CLIP_SECONDS) stopPreview();
      }, 100);
    } catch {
      setError('Không phát xem trước được đoạn nhạc này.');
    }
  };

  const saveClip = async () => {
    if (!audioBuffer || !songTitle.trim() || isSaving) return;
    setError('');
    setIsSaving(true);
    try {
      const outputLength = CLIP_SECONDS * OUTPUT_SAMPLE_RATE;
      const mono = new Float32Array(outputLength);
      const sourcePositionStart = startTime * audioBuffer.sampleRate;
      const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, channel) => audioBuffer.getChannelData(channel));
      for (let i = 0; i < outputLength; i += 1) {
        const sourcePosition = sourcePositionStart + (i * audioBuffer.sampleRate) / OUTPUT_SAMPLE_RATE;
        const left = Math.floor(sourcePosition);
        const fraction = sourcePosition - left;
        let sample = 0;
        for (const channel of channels) {
          const first = channel[Math.min(left, channel.length - 1)] || 0;
          const second = channel[Math.min(left + 1, channel.length - 1)] || 0;
          sample += first + (second - first) * fraction;
        }
        mono[i] = sample / channels.length;
      }
      const songData = await toDataUrl(encodeWav(mono));
      const response = await apiFetch(`/api/users/${userId}/song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songTitle: songTitle.trim(), songData, mimeType: 'audio/wav', durationSeconds: CLIP_SECONDS }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được đoạn nhạc.');
      stopPreview();
      const savedSongTitle = songTitle.trim();
      setSavedTitle(savedSongTitle);
      onSaved(savedSongTitle);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được đoạn nhạc.');
    } finally {
      setIsSaving(false);
    }
  };

  const maxStart = Math.max(0, (audioBuffer?.duration || CLIP_SECONDS) - CLIP_SECONDS);
  const selectionStart = maxStart ? (startTime / (audioBuffer?.duration || 1)) * 100 : 0;
  const selectionWidth = audioBuffer ? (CLIP_SECONDS / audioBuffer.duration) * 100 : 100;

  if (savedTitle) {
    return (
      <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-sky-950 via-slate-950 to-blue-950 px-6 text-center text-white">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/15 text-emerald-300 shadow-lg shadow-emerald-950/30">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black">Đã lưu nhạc vào hồ sơ</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-sky-100/75">“{savedTitle}” đã được lưu thành đoạn nhạc 15 giây. Bạn có thể phát đoạn nhạc này trên hồ sơ của mình.</p>
        <button onClick={onClose} className="mt-7 w-full max-w-sm rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-3.5 font-extrabold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:brightness-110 active:scale-[0.99]">Hoàn tất</button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-gradient-to-b from-sky-950 via-slate-950 to-blue-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-400/15 p-2.5 text-sky-300"><Music2 className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-extrabold">Âm nhạc hồ sơ</h2><p className="text-xs text-sky-200/70">Chọn một đoạn nhạc dài đúng 15 giây</p></div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Đóng"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <input ref={inputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" className="hidden" onChange={event => { void handleFile(event.target.files?.[0]); event.target.value = ''; }} />
        <button onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300/50 bg-sky-400/10 px-4 py-5 font-bold text-sky-100 hover:bg-sky-400/20">
          <Upload className="h-5 w-5" /> {audioBuffer ? 'Chọn bài nhạc khác' : 'Tải nhạc lên'}
        </button>

        {audioBuffer && sourceUrl && (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-xl">
            <label className="mb-2 block text-xs font-bold text-sky-100">Tên bài nhạc</label>
            <input value={songTitle} onChange={event => setSongTitle(event.target.value.slice(0, 120))} maxLength={120} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400" placeholder="Tên bài nhạc" />
            <div className="mt-5 flex items-center justify-between text-xs font-bold text-sky-100"><span><AudioLines className="mr-1 inline h-4 w-4" />Chọn đoạn 15 giây</span><span>{startTime.toFixed(1)}s – {(startTime + CLIP_SECONDS).toFixed(1)}s</span></div>
            <div className="relative mt-3 h-24 overflow-hidden rounded-2xl bg-slate-950/70 px-2">
              <div className="absolute inset-y-0 rounded-xl border border-sky-300/70 bg-sky-400/15" style={{ left: `${selectionStart}%`, width: `${Math.min(100, selectionWidth)}%` }} />
              <div className="relative flex h-full items-center justify-between gap-[2px] opacity-90">
                {waveform.map((peak, index) => <span key={index} className={`flex-1 rounded-full ${index / waveform.length >= selectionStart / 100 && index / waveform.length <= (selectionStart + selectionWidth) / 100 ? 'bg-sky-300' : 'bg-slate-500'}`} style={{ height: `${Math.max(8, peak * 80)}%` }} />)}
              </div>
              <input aria-label="Vị trí bắt đầu đoạn nhạc" type="range" min={0} max={maxStart} step={0.05} value={Math.min(startTime, maxStart)} onChange={event => { stopPreview(); setStartTime(Number(event.target.value)); }} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
            </div>
            <input type="range" aria-label="Chọn vị trí cắt nhạc" min={0} max={maxStart} step={0.05} value={Math.min(startTime, maxStart)} onChange={event => { stopPreview(); setStartTime(Number(event.target.value)); }} className="mt-2 w-full accent-sky-400" />
            <audio ref={audioRef} src={sourceUrl} onEnded={stopPreview} className="hidden" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">Độ dài tệp gốc: {Math.floor(audioBuffer.duration / 60)}:{String(Math.floor(audioBuffer.duration % 60)).padStart(2, '0')}</span>
              <button onClick={() => { void playClip(); }} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}{isPlaying ? 'Dừng nghe' : 'Nghe thử'}
              </button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-200">{error}</p>}
      </div>

      <div className="border-t border-white/10 bg-slate-950/40 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <button disabled={!audioBuffer || !songTitle.trim() || isSaving} onClick={() => { void saveClip(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 py-3.5 font-extrabold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {isSaving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" /> : <Check className="h-5 w-5" />}{isSaving ? 'Đang lưu…' : 'Lưu đoạn nhạc 15 giây'}
        </button>
      </div>
    </div>
  );
}
