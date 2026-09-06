"use client";

import { useState, useCallback } from "react";

interface UseGeminiUnderstandingOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  retryCount?: number;
}

export function useGeminiUnderstanding(
  options: UseGeminiUnderstandingOptions = {},
) {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const understand = useCallback(
    async (
      input: string,
      type: "voice" | "text" | "search" = "text",
      items?: any[],
      units?: any[],
      context?: Record<string, any>,
    ) => {
      if (!input || input.trim().length === 0) {
        const err = "Input cannot be empty";
        setError(err);
        onError?.(err);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/gemini/understand", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input,
            type,
            items: items || [],
            units: units || [],
            context: context || {},
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `HTTP ${response.status}`;
          setError(errorMessage);
          onError?.(errorMessage);
          return null;
        }

        const data = await response.json();
        setResult(data);
        onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to understand input";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onSuccess],
  );

  const parseVoiceCommand = useCallback(
    async (transcript: string, items?: any[], units?: any[]) => {
      return understand(transcript, "voice", items, units);
    },
    [understand],
  );

  const searchItems = useCallback(
    async (query: string, items?: any[]) => {
      return understand(query, "search", items);
    },
    [understand],
  );

  return {
    understand,
    parseVoiceCommand,
    searchItems,
    isLoading,
    error,
    result,
  };
}

export async function checkGeminiHealth() {
  try {
    const response = await fetch("/api/gemini/understand", {
      method: "GET",
    });

    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
