import { ExamGradeItem, SubjectGradingConfig } from '../types';

export async function fetchServerGrades(subject?: string): Promise<ExamGradeItem[]> {
  try {
    const url = subject ? `/api/grades?subject=${encodeURIComponent(subject)}` : '/api/grades';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.grades) ? data.grades : [];
  } catch (err) {
    console.warn('Note on fetching server grades:', err);
    return [];
  }
}

export async function saveServerGrades(
  grades: ExamGradeItem[],
  subject?: string,
  replaceSubject: boolean = false
): Promise<boolean> {
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
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('Note on saving server grades:', err);
    return false;
  }
}

export function subscribeToServerGrades(
  onUpdate: (grades: ExamGradeItem[], subject?: string) => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollingInterval: any = null;
  let isClosed = false;

  function connectSSE() {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/grades/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.grades)) {
            onUpdate(data.grades, data.subject);
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Fallback to polling every 4 seconds if SSE disconnects
        if (!pollingInterval && !isClosed) {
          pollingInterval = setInterval(async () => {
            const grades = await fetchServerGrades();
            if (grades.length > 0) {
              onUpdate(grades);
            }
          }, 4000);
        }
        // Try to reconnect SSE after 5 seconds
        setTimeout(() => {
          if (!isClosed) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            connectSSE();
          }
        }, 5000);
      };
    } catch {
      // Fallback polling if SSE is not supported
      if (!pollingInterval && !isClosed) {
        pollingInterval = setInterval(async () => {
          const grades = await fetchServerGrades();
          if (grades.length > 0) {
            onUpdate(grades);
          }
        }, 4000);
      }
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
  try {
    const res = await fetch('/api/grading-configs');
    if (!res.ok) return {};
    const data = await res.json();
    return data.configs || {};
  } catch {
    return {};
  }
}

export async function saveServerGradingConfigs(configs: Record<string, SubjectGradingConfig>): Promise<void> {
  try {
    await fetch('/api/grading-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs }),
    });
  } catch (err) {
    console.warn('Note on saving server grading configs:', err);
  }
}
