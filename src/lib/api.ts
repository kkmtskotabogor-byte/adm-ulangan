import { ExamGradeItem, SubjectGradingConfig } from '../types';

export const isStaticHosting =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('pages.dev') ||
    window.location.protocol === 'file:');

export async function fetchServerGrades(subject?: string): Promise<ExamGradeItem[]> {
  if (isStaticHosting) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const url = subject ? `/api/grades?subject=${encodeURIComponent(subject)}` : '/api/grades';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.grades) ? data.grades : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function saveServerGrades(
  grades: ExamGradeItem[],
  subject?: string,
  replaceSubject: boolean = false
): Promise<boolean> {
  if (isStaticHosting) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grades,
        subject,
        replaceSubject,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function subscribeToServerGrades(
  onUpdate: (grades: ExamGradeItem[], subject?: string) => void
): () => void {
  if (isStaticHosting) {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let pollingInterval: any = null;
  let isClosed = false;
  let failedAttempts = 0;

  function connectSSE() {
    if (isClosed || failedAttempts > 3) return;
    try {
      eventSource = new EventSource('/api/grades/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.grades)) {
            onUpdate(data.grades, data.subject);
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        failedAttempts++;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // If backend is not available (e.g. 404), stop retrying after 3 attempts
        if (failedAttempts > 3) {
          return;
        }

        // Reconnect after 6 seconds
        setTimeout(() => {
          if (!isClosed && failedAttempts <= 3) {
            connectSSE();
          }
        }, 6000);
      };
    } catch {
      failedAttempts++;
    }
  }

  connectSSE();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

// Grading Configs API helpers
export async function fetchServerGradingConfigs(): Promise<Record<string, SubjectGradingConfig>> {
  if (isStaticHosting) return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('/api/grading-configs', { signal: controller.signal });
    if (!res.ok) return {};
    const data = await res.json();
    return data.configs || {};
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export async function saveServerGradingConfigs(configs: Record<string, SubjectGradingConfig>): Promise<void> {
  if (isStaticHosting) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch('/api/grading-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs }),
      signal: controller.signal,
    });
  } catch {
    // ignore
  } finally {
    clearTimeout(timer);
  }
}
