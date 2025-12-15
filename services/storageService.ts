import { QuizSession, HistoryItem } from '../types';

const STORAGE_KEY = 'anki_genius_history';

export const saveToHistory = (session: QuizSession) => {
  try {
    const historyData = localStorage.getItem(STORAGE_KEY);
    let history: HistoryItem[] = historyData ? JSON.parse(historyData) : [];

    const newItem: HistoryItem = {
      id: session.id || Date.now().toString(),
      timestamp: Date.now(),
      topic: session.topic,
      mode: session.mode,
      score: session.score,
      totalQuestions: session.questions.length,
      questions: session.questions
    };

    // Check if update existing or add new (simple logic: always add new record for spaced repetition)
    history.unshift(newItem); // Add to top
    
    // Limit history to last 50 items to save space
    if (history.length > 50) {
        history = history.slice(0, 50);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

export const getHistory = (): HistoryItem[] => {
  try {
    const historyData = localStorage.getItem(STORAGE_KEY);
    return historyData ? JSON.parse(historyData) : [];
  } catch (e) {
    return [];
  }
};

export const deleteHistoryItem = (id: string) => {
    try {
        const historyData = localStorage.getItem(STORAGE_KEY);
        if (!historyData) return;
        let history: HistoryItem[] = JSON.parse(historyData);
        history = history.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to delete item", e);
    }
}
