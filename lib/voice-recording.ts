import { cleanVoiceRepetitions } from "./voice-sale-parser";

export type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
export interface RecognitionEngine {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/** One user recording may span several browser recognition sessions. */
export function createVoiceRecording(
  createEngine: () => RecognitionEngine,
  language: string,
  callbacks: {
    onText: (text: string) => void;
    onStableText?: (text: string) => void;
    onFinish: (text: string, status?: { needsReview: boolean }) => void;
    onError: (code: string) => void;
  },
) {
  let engine: RecognitionEngine | null = null;
  let active = true;
  let stopping = false;
  let started = false;
  let text = "";
  let publishedText = "";
  let stableText = "";
  let publishedStableText = "";
  let interimText = "";
  let emptySessions = 0;
  let restart: ReturnType<typeof setTimeout> | undefined;
  let stopDeadline: ReturnType<typeof setTimeout> | undefined;
  let recordingDeadline: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    active = false;
    clearTimeout(restart);
    clearTimeout(stopDeadline);
    clearTimeout(recordingDeadline);
    if (engine) {
      engine.onstart = engine.onresult = engine.onerror = engine.onend = null;
      try { engine.abort(); } catch { /* Already stopped by the browser. */ }
      engine = null;
    }
  };
  const finish = () => {
    if (!active) return;
    cleanup();
    callbacks.onFinish(cleanVoiceRepetitions(text), { needsReview: Boolean(interimText.trim()) });
  };
  const fail = (code: string) => {
    if (!active) return;
    cleanup();
    callbacks.onError(code);
  };
  const session = () => {
    if (!active || stopping) return;
    let instance: RecognitionEngine;
    try { instance = createEngine(); } catch { fail("start-failed"); return; }
    engine = instance;
    // Only confirmed words may cross a browser-session boundary.
    const prefix = stableText;
    const finals = new Map<number, string>();
    interimText = "";
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    const current = () => active && engine === instance;
    instance.onresult = (event) => {
      if (!current()) return;
      // Final slots are committed once; interim slots are a replaceable
      // snapshot, including when the browser removes its previous guess.
      const pending: string[] = [];
      Array.from(event.results).forEach((result, index) => {
        const transcript = result?.[0]?.transcript?.trim() || "";
        if (result.isFinal) {
          if (!finals.has(index)) finals.set(index, transcript);
        } else if (!finals.has(index)) {
          pending.push(transcript);
        }
      });
      const confirmed = [...finals].sort(([a], [b]) => a - b).map(([, words]) => words).join(" ");
      stableText = `${prefix} ${confirmed}`.trim();
      interimText = pending.join(" ").trim();
      text = `${stableText} ${interimText}`.trim();
      const stable = cleanVoiceRepetitions(stableText);
      if (stable !== publishedStableText) {
        publishedStableText = stable;
        callbacks.onStableText?.(stable);
      }
      const cleaned = cleanVoiceRepetitions(text);
      if (cleaned !== publishedText) {
        publishedText = cleaned;
        callbacks.onText(cleaned);
      }
    };
    instance.onerror = ({ error }) => {
      if (!current()) return;
      if (error === "no-speech") return;
      if (error === "aborted" && stopping) { finish(); return; }
      fail(error);
    };
    instance.onend = () => {
      if (!current()) return;
      engine = null;
      if (stopping) { finish(); return; }
      // Do not promote unfinished guesses into the next session's permanent
      // prefix. Preserve them for an explicit correction instead.
      if (interimText) { finish(); return; }
      emptySessions = stableText === prefix ? emptySessions + 1 : 0;
      if (emptySessions >= 2 && stableText) { finish(); return; }
      if (emptySessions >= 5) { fail("no-speech"); return; }
      restart = setTimeout(session, 250);
    };
    try { instance.start(); } catch { fail("start-failed"); }
  };
  return {
    start() {
      if (started || !active) return;
      started = true;
      // Bound recording lifetime, including browsers which never emit end.
      recordingDeadline = setTimeout(() => fail("time-limit"), 120_000);
      session();
    },
    stop() {
      if (!active || stopping) return;
      stopping = true;
      clearTimeout(restart);
      if (!engine) { finish(); return; }
      stopDeadline = setTimeout(finish, 1500);
      try { engine.stop(); } catch { finish(); }
    },
    cancel: cleanup,
  };
}
