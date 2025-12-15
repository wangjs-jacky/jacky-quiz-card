'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Question, EvaluationResult, UserAnswer } from '../types';
import { OptionCard } from './OptionCard';
import { MarkdownText } from './MarkdownText';
import { Button } from './Button';
import { PaperAirplaneIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface QuizCardProps {
  question: Question;
  savedAnswer?: UserAnswer;
  topic: string;
  hasPrev: boolean;
  hasNext: boolean;
  onAnswer: (answer: UserAnswer) => void;
  onNext: () => void;
  onPrev: () => void;
  onEvaluate?: (question: string, answer: string) => Promise<EvaluationResult>;
}

export const QuizCard: React.FC<QuizCardProps> = ({ 
    question, 
    savedAnswer, 
    topic, 
    hasPrev,
    hasNext,
    onAnswer, 
    onNext, 
    onPrev,
    onEvaluate 
}) => {
  // Common State
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(true);
  
  // MCQ State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Q&A State
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or Reset state when question changes
  useEffect(() => {
    if (savedAnswer && savedAnswer.questionId === question.id) {
        // Restore state
        setIsRevealed(true);
        setIsFeedbackVisible(true); // Always show feedback when returning
        
        if (question.type === 'multiple-choice') {
            setSelectedIndex(savedAnswer.answer as number);
        } else {
            setUserAnswer(savedAnswer.answer as string);
            setEvaluation(savedAnswer.evaluation || null);
        }
    } else {
        // Reset
        setSelectedIndex(null);
        setIsRevealed(false);
        setIsFeedbackVisible(false);
        setUserAnswer('');
        setEvaluation(null);
        setIsEvaluating(false);
        if(textareaRef.current) textareaRef.current.focus();
    }
  }, [question, savedAnswer]);

  // --- MCQ Handlers ---
  const handleOptionClick = (index: number) => {
    if (isRevealed || question.type !== 'multiple-choice') return;
    setSelectedIndex(index);
    setIsRevealed(true);
    setIsFeedbackVisible(true);
    
    const isCorrect = index === question.correctAnswerIndex;
    onAnswer({
        questionId: question.id,
        type: 'multiple-choice',
        answer: index,
        isCorrect: isCorrect
    });
  };

  const getOptionState = (index: number) => {
    if (!isRevealed) return 'idle';
    if (index === question.correctAnswerIndex) return 'correct';
    if (index === selectedIndex && selectedIndex !== question.correctAnswerIndex) return 'incorrect';
    return 'idle';
  };

  // --- Q&A Handlers ---
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !onEvaluate) return;
    
    setIsEvaluating(true);
    try {
        const result = await onEvaluate(question.question, userAnswer);
        setEvaluation(result);
        setIsRevealed(true);
        setIsFeedbackVisible(true);
        
        onAnswer({
            questionId: question.id,
            type: 'open-ended',
            answer: userAnswer,
            score: result.score,
            evaluation: result
        });
    } catch (e) {
        alert("评估失败，请检查网络后重试。");
    } finally {
        setIsEvaluating(false);
    }
  };

  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col h-full max-h-screen relative">
      {/* Question Card Area */}
      <div className="flex-grow flex flex-col justify-center mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 min-h-[180px] flex flex-col justify-center border-t-4 border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <SparklesIcon className="w-24 h-24 text-primary" />
          </div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
            {question.type === 'open-ended' ? '问答题 (AI 批改)' : '多项选择题'}
          </h3>
          <MarkdownText content={question.question} className="text-lg md:text-xl font-medium text-gray-800 leading-relaxed z-10" />
        </div>
      </div>

      {/* --- MULTIPLE CHOICE MODE --- */}
      {question.type === 'multiple-choice' && question.options && (
        <div className="mb-24 pb-4">
          <div className="grid grid-cols-1 gap-1">
            {question.options.map((opt, idx) => (
              <OptionCard
                key={idx}
                label={labels[idx]}
                text={opt}
                selected={selectedIndex === idx}
                state={getOptionState(idx)}
                disabled={isRevealed}
                onClick={() => handleOptionClick(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* --- OPEN ENDED MODE --- */}
      {question.type === 'open-ended' && (
        <div className="mb-24 pb-4 flex flex-col gap-4">
            {(!isRevealed || !evaluation) ? (
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="请输入你的答案..."
                        className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-4 focus:ring-indigo-50 outline-none resize-none min-h-[150px] text-base shadow-sm"
                        disabled={isEvaluating || isRevealed}
                    />
                    <div className="mt-4">
                        {!isRevealed && (
                            <Button 
                                onClick={handleSubmitAnswer} 
                                disabled={!userAnswer.trim() || isEvaluating} 
                                fullWidth
                                className="flex items-center justify-center gap-2"
                            >
                                {isEvaluating ? (
                                    <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>AI 正在批改...</span>
                                    </>
                                ) : (
                                    <>
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                        <span>提交答案</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">你的回答</h4>
                    <p className="text-gray-900 mb-2 whitespace-pre-wrap">{userAnswer}</p>
                </div>
            )}
        </div>
      )}

      {/* --- NAVIGATION BAR (Fixed at bottom when feedback not blocking) --- */}
      {!isFeedbackVisible && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/90 backdrop-blur border-t border-gray-200 flex justify-between z-40 max-w-2xl mx-auto">
              <Button 
                onClick={onPrev} 
                disabled={!hasPrev} 
                variant="outline"
                className="px-4 py-2 text-sm h-10 flex items-center gap-1"
              >
                  <ChevronLeftIcon className="w-4 h-4" /> 上一题
              </Button>
              
              {isRevealed && (
                  <button 
                    onClick={() => setIsFeedbackVisible(true)}
                    className="absolute left-1/2 -translate-x-1/2 -top-12 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-1 animate-bounce"
                  >
                      <SparklesIcon className="w-4 h-4" /> 查看评价
                  </button>
              )}

              <Button 
                onClick={onNext} 
                // Only allow next if revealed or strictly enforce answering
                // Currently allowing skip if next exists? Or forcing answer? 
                // Let's assume users can skip in study mode, but usually Anki enforces answer.
                // For now, let's allow skipping if not answered is weird, so maybe disable if not revealed?
                // Let's enable Next always for navigation sake, or only if answered.
                // The requirements say "navigation", implies free movement.
                className="px-4 py-2 text-sm h-10 flex items-center gap-1"
              >
                  {hasNext ? '下一题' : '完成'} <ChevronRightIcon className="w-4 h-4" />
              </Button>
          </div>
      )}

      {/* --- FEEDBACK / RESULT SHEET --- */}
      {isRevealed && isFeedbackVisible && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_30px_rgba(0,0,0,0.15)] rounded-t-2xl animate-slide-up z-50 max-w-2xl mx-auto flex flex-col max-h-[85vh]">
          
          {/* Sheet Header */}
          <div 
            className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-2xl"
            onClick={() => setIsFeedbackVisible(false)}
          >
              <span className="font-bold text-gray-700 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-primary" />
                  {question.type === 'multiple-choice' ? '答案解析' : 'AI 评价'}
              </span>
              <button className="p-1 hover:bg-gray-200 rounded-full">
                  <ChevronDownIcon className="w-6 h-6 text-gray-400" />
              </button>
          </div>

          <div className="p-4 overflow-y-auto flex-grow">
            {question.type === 'multiple-choice' && (
                <div className="mb-4">
                    <h4 className={`text-sm font-bold mb-2 ${selectedIndex === question.correctAnswerIndex ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selectedIndex === question.correctAnswerIndex ? '回答正确!' : '回答错误'}
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <MarkdownText content={question.explanation || ''} className="text-sm text-gray-700" />
                    </div>
                </div>
            )}

            {question.type === 'open-ended' && evaluation && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-gray-800">评分结果</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            evaluation.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            evaluation.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            得分: {evaluation.score}/100
                        </span>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <h5 className="text-xs font-bold text-indigo-400 uppercase mb-1">AI 点评</h5>
                        <MarkdownText content={evaluation.feedback} className="text-sm text-gray-700" />
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h5 className="text-xs font-bold text-emerald-500 uppercase mb-1">参考回答</h5>
                        <MarkdownText content={evaluation.betterAnswer} className="text-sm text-gray-700" />
                    </div>
                </div>
            )}
          </div>

          {/* Sheet Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
             <Button onClick={onPrev} disabled={!hasPrev} variant="outline" className="text-sm h-12">
                上一题
             </Button>
             <Button onClick={onNext} variant="primary" className="text-sm h-12">
                {hasNext ? '下一题 →' : '完成'}
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};
