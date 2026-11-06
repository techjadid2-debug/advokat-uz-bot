'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { replyAction, closeConversationAction } from '../../actions';

export function ReplyBox({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const send = () => {
    const text = body.trim();
    if (!text) return;
    start(async () => {
      const res = await replyAction(conversationId, text);
      if (res?.error) return setError(res.error);
      setBody('');
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter bilan yuborish — advokat sichqonchaga qo'l urmaydi
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
        }}
        rows={3}
        placeholder="Mijozga javob yozing… (Ctrl+Enter — yuborish)"
        className="w-full resize-y rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={send}
          disabled={pending || !body.trim()}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 disabled:opacity-40"
        >
          {pending ? 'Yuborilmoqda…' : 'Yuborish'}
        </button>
        <button
          onClick={() => start(async () => { await closeConversationAction(conversationId); router.refresh(); })}
          disabled={pending}
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 disabled:opacity-40"
        >
          Suhbatni yopish
        </button>
        <span className="ml-auto text-[11px] text-neutral-400">Javob mijozga Telegram orqali boradi</span>
      </div>
    </div>
  );
}
