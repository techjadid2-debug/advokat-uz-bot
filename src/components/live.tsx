'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AppEvent =
  | { type: 'message'; conversationId: string; sender: string; preview: string; at: string }
  | { type: 'receipt'; orderId: string; conversationId: string | null; refCode: string; at: string }
  | { type: 'conversation'; conversationId: string; status: string; at: string };

type Handler = (e: AppEvent) => void;

const LiveCtx = createContext<{
  connected: boolean;
  subscribe: (h: Handler) => () => void;
} | null>(null);

/**
 * Bitta SSE ulanishi butun panelga xizmat qiladi.
 * Har sahifa o'z ulanishini ochsa, server ortiqcha yuklanadi.
 */
export function LiveProvider({
  children, soundEnabled = true, labels,
}: {
  children: React.ReactNode;
  soundEnabled?: boolean;
  labels: { newMessage: string; newPayment: string };
}) {
  const [connected, setConnected] = useState(false);
  const handlers = useRef(new Set<Handler>());
  const router = useRouter();
  const labelsRef = useRef(labels);
  // Render paytida ref'ga yozish React qoidasini buzadi
  useEffect(() => { labelsRef.current = labels; }, [labels]);

  const subscribe = useCallback((h: Handler) => {
    handlers.current.add(h);
    return () => { handlers.current.delete(h); };
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // brauzer o'zi qayta ulanadi

    es.onmessage = (ev) => {
      let event: AppEvent;
      try { event = JSON.parse(ev.data); } catch { return; }

      handlers.current.forEach((h) => h(event));

      // Advokat javobi o'zidan qaytib kelganda bezovta qilmaymiz
      if (event.type === 'receipt') {
        if (soundEnabled) chime(true);
        notify(labelsRef.current.newPayment, `#${event.refCode}`);
      } else if (event.type === 'message' && event.sender === 'user') {
        if (soundEnabled) chime(false);
        notify(labelsRef.current.newMessage, event.preview);
      }

      router.refresh();
    };

    return () => es.close();
  }, [router, soundEnabled]);

  return <LiveCtx.Provider value={{ connected, subscribe }}>{children}</LiveCtx.Provider>;
}

export function useLive() {
  return useContext(LiveCtx);
}

/** Hodisaga obuna bo'lish (masalan chat oynasida yangi xabarni belgilash). */
export function useLiveEvent(handler: Handler) {
  const live = useLive();
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; }, [handler]);
  useEffect(() => live?.subscribe((e) => ref.current(e)), [live]);
}

/** Qisqa, yumshoq signal — Telegramdagidek bezovta qilmaydigan. */
function chime(urgent: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = urgent ? [880, 1174] : [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch { /* ovoz ishlamasa — muhim emas */ }
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!document.hidden) return; // panel oldida bo'lsa bildirishnoma ortiqcha
  try {
    new Notification(title, { body, tag: 'advokat', icon: '/favicon.ico' });
  } catch { /* e'tiborsiz */ }
}
