export enum AppState {
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  QUIZ = 'QUIZ',
  SUMMARY = 'SUMMARY',
  ERROR = 'ERROR',
  HISTORY = 'HISTORY'
}

export type QuestionType = 'multiple-choice' | 'open-ended' | 'mixed';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'open-ended';
  question: string; // Markdown supported
  // For Multiple Choice
  options?: string[]; 
  correctAnswerIndex?: number;
  // For Open Ended
  modelAnswer?: string; // Ideal answer for reference
  explanation?: string; // General explanation
}

export interface EvaluationResult {
  score: number; // 0-100
  feedback: string;
  betterAnswer: string;
}

export interface UserAnswer {
  questionId: string;
  type: 'multiple-choice' | 'open-ended';
  answer: number | string;
  isCorrect?: boolean;
  score?: number;
  evaluation?: EvaluationResult;
}

export interface QuizSession {
  id: string; // Unique ID for history
  timestamp: number;
  topic: string;
  mode: QuestionType;
  questions: Question[];
  currentQuestionIndex: number;
  score: number; 
  userAnswers: Record<string, UserAnswer>; 
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  mode: QuestionType;
  score: number;
  totalQuestions: number;
  questions: Question[];
}