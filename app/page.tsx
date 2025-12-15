'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Question, QuizSession, QuestionType, HistoryItem, UserAnswer, EvaluationResult } from '../types';
import { generateQuestions, evaluateAnswer } from '../services/openRouterService';
import { saveToHistory, getHistory, deleteHistoryItem } from '../services/storageService';
import { QuizCard } from '../components/QuizCard';
import { Button } from '../components/Button';
import { 
    SparklesIcon, 
    BookOpenIcon, 
    TrophyIcon, 
    ArrowUpTrayIcon, 
    ArrowDownTrayIcon, 
    ChatBubbleBottomCenterTextIcon, 
    ListBulletIcon,
    ClockIcon,
    TrashIcon,
    SwatchIcon,
    ArrowLeftIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';

export default function Home() {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [topic, setTopic] = useState('');
  const [quizMode, setQuizMode] = useState<QuestionType>('mixed');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appState === AppState.HISTORY) {
        setHistory(getHistory());
    }
  }, [appState]);

  const startQuiz = async () => {
    if (!topic.trim()) return;
    
    setAppState(AppState.LOADING);
    setLoadingMsg(`正在生成关于 "${topic}" 的${getModeName(quizMode)}...`);
    
    try {
      const questions = await generateQuestions(topic, quizMode);
      setSession({
        id: Date.now().toString(),
        timestamp: Date.now(),
        topic,
        mode: quizMode,
        questions,
        currentQuestionIndex: 0,
        score: 0,
        userAnswers: {}
      });
      setAppState(AppState.QUIZ);
    } catch (err: any) {
      console.error(err);
      const message = err.message || '生成测验失败，请重试。';
      setErrorMsg(message);
      setAppState(AppState.ERROR);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
      setSession({
          id: item.id,
          timestamp: Date.now(), // update timestamp for new run
          topic: item.topic,
          mode: item.mode,
          questions: item.questions,
          currentQuestionIndex: 0,
          score: 0,
          userAnswers: {} // Reset answers for re-run
      });
      setAppState(AppState.QUIZ);
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingMsg("正在解析题库...");
    setAppState(AppState.LOADING);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error("JSON 格式无效，需要数组格式。");
        }

        const firstItem = parsedData[0];
        // Guess mode from data
        let detectedMode: QuestionType = 'mixed';
        const hasMCQ = parsedData.some((q:any) => q.type === 'multiple-choice');
        const hasOpen = parsedData.some((q:any) => q.type === 'open-ended');
        
        if (hasMCQ && !hasOpen) detectedMode = 'multiple-choice';
        else if (!hasMCQ && hasOpen) detectedMode = 'open-ended';

        setSession({
          id: Date.now().toString(),
          timestamp: Date.now(),
          topic: file.name.replace(/\.json$/i, ''),
          mode: detectedMode,
          questions: parsedData as Question[],
          currentQuestionIndex: 0,
          score: 0,
          userAnswers: {}
        });
        setAppState(AppState.QUIZ);
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg("导入失败: " + err.message);
        setAppState(AppState.ERROR);
      } finally {
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const downloadTemplate = () => {
    const templateData: Question[] = [
      {
        id: "mcq1",
        type: 'multiple-choice',
        question: "React 中 `useEffect` 默认在什么时候执行？",
        options: ["仅挂载时", "仅更新时", "每次渲染后", "仅卸载时"],
        correctAnswerIndex: 2,
        explanation: "`useEffect` 默认在每次渲染完成后执行，除非提供了依赖数组。"
      },
      {
        id: "qa1",
        type: "open-ended",
        question: "请解释 JavaScript 中的闭包 (Closure)。",
        modelAnswer: "闭包是指一个函数以及其捆绑的周边环境状态（词法环境）的引用的组合。"
      }
    ];

    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_zh.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Updated to store the full answer object
  const handleAnswer = useCallback((answerObj: UserAnswer) => {
    if (!session) return;
    setSession(prev => {
      if (!prev) return null;
      
      const updatedAnswers = {
          ...prev.userAnswers,
          [answerObj.questionId]: answerObj
      };

      // Recalculate total score
      let totalScore = 0;
      Object.values(updatedAnswers).forEach((ans: UserAnswer) => {
          if (ans.type === 'multiple-choice' && ans.isCorrect) {
              totalScore += 1;
          } else if (ans.type === 'open-ended' && ans.score) {
              totalScore += ans.score; // Add raw score 0-100
          }
      });

      return {
        ...prev,
        userAnswers: updatedAnswers,
        score: totalScore
      };
    });
  }, [session]);

  const handleEvaluate = async (questionText: string, userAnswer: string) => {
      if (!session) throw new Error("No session");
      return await evaluateAnswer(questionText, userAnswer, session.topic);
  };

  const handleNext = useCallback(() => {
    if (!session) return;
    
    if (session.currentQuestionIndex + 1 >= session.questions.length) {
      // End of quiz, save history
      saveToHistory(session);
      setAppState(AppState.SUMMARY);
    } else {
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        };
      });
    }
  }, [session]);

  const handlePrev = useCallback(() => {
      if (!session) return;
      if (session.currentQuestionIndex > 0) {
          setSession(prev => prev ? {...prev, currentQuestionIndex: prev.currentQuestionIndex - 1} : null);
      }
  }, [session]);

  const handleExit = () => {
      if (window.confirm("确定要退出当前测验吗？进度将不会保存。")) {
          setSession(null);
          setAppState(AppState.SETUP);
      }
  };

  const resetApp = () => {
    setTopic('');
    setSession(null);
    setAppState(AppState.SETUP);
    setErrorMsg('');
  };

  const getModeName = (m: QuestionType) => {
      if (m === 'multiple-choice') return '多项选择题';
      if (m === 'open-ended') return '问答题';
      return '混合题型';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl min-h-screen bg-white md:bg-gray-50 md:shadow-none flex flex-col relative">
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
        />

        {/* Header */}
        {appState !== AppState.SETUP && appState !== AppState.HISTORY && (
          <header className="p-4 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md md:rounded-b-xl border-b border-gray-100">
             <div className="flex items-center gap-2 max-w-[70%]">
                <button 
                    onClick={handleExit}
                    className="p-1 rounded-full hover:bg-gray-200 transition-colors mr-1"
                    title="退出"
                >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-2 overflow-hidden">
                    <BookOpenIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-bold text-gray-700 truncate">{session?.topic || topic}</span>
                </div>
             </div>
             <div className="text-sm font-medium text-gray-500 flex-shrink-0">
                {appState === AppState.QUIZ && session && (
                  <span>{session.currentQuestionIndex + 1} / {session.questions.length}</span>
                )}
             </div>
          </header>
        )}

        <main className="flex-grow p-4 md:p-6 flex flex-col relative w-full h-full">
          
          {/* SETUP SCREEN */}
          {appState === AppState.SETUP && (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6 animate-fade-in py-10">
              <div className="mb-2">
                <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-indigo-100 shadow-xl">
                  <SparklesIcon className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">智卡 AI</h1>
                <p className="text-gray-500">AI 驱动的知识卡片与测试生成器</p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                
                {/* Topic Input */}
                <div className="relative">
                   <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="输入主题 (例如: 心理学, React Hooks)..."
                    className="w-full p-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-medium text-center placeholder-gray-400 text-gray-900"
                    onKeyDown={(e) => e.key === 'Enter' && startQuiz()}
                  />
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => setQuizMode('multiple-choice')}
                        className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            quizMode === 'multiple-choice' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <ListBulletIcon className="w-5 h-5" />
                        选择题
                    </button>
                    <button
                        onClick={() => setQuizMode('mixed')}
                        className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            quizMode === 'mixed' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <SwatchIcon className="w-5 h-5" />
                        混合
                    </button>
                    <button
                        onClick={() => setQuizMode('open-ended')}
                        className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            quizMode === 'open-ended' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
                        问答
                    </button>
                </div>
                
                <Button onClick={startQuiz} disabled={!topic.trim()} fullWidth className="h-14 text-lg shadow-xl shadow-indigo-200">
                  <div className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    <span>开始学习</span>
                  </div>
                </Button>

                <Button onClick={() => setAppState(AppState.HISTORY)} variant="secondary" fullWidth className="h-12 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-none">
                     <div className="flex items-center justify-center gap-2">
                      <ClockIcon className="w-5 h-5 text-gray-400" />
                      <span>历史回顾</span>
                    </div>
                </Button>

                <div className="flex items-center gap-3 py-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase">工具</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleImportClick} variant="outline" className="flex-1 h-12 text-sm">
                     <div className="flex items-center justify-center gap-2">
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      <span>导入</span>
                    </div>
                  </Button>
                  <Button onClick={downloadTemplate} variant="outline" className="flex-1 h-12 text-sm">
                     <div className="flex items-center justify-center gap-2">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>模板</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY SCREEN */}
          {appState === AppState.HISTORY && (
              <div className="flex-grow flex flex-col">
                  <div className="flex items-center mb-6">
                      <button onClick={() => setAppState(AppState.SETUP)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                          <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                      </button>
                      <h2 className="text-2xl font-bold ml-2">历史记录</h2>
                  </div>

                  {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-grow text-gray-400 space-y-4">
                          <ClockIcon className="w-16 h-16 opacity-20" />
                          <p>暂无历史记录</p>
                          <Button onClick={() => setAppState(AppState.SETUP)} variant="outline">去创建测验</Button>
                      </div>
                  ) : (
                      <div className="space-y-3 pb-8">
                          {history.map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-primary transition-colors cursor-pointer" onClick={() => loadFromHistory(item)}>
                                  <div className="flex-grow">
                                      <h3 className="font-bold text-lg text-gray-800">{item.topic}</h3>
                                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{getModeName(item.mode)}</span>
                                          <span>•</span>
                                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                          <span>•</span>
                                          <span>{item.questions.length} 题</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="text-right">
                                          <div className="text-xl font-black text-primary">
                                            {item.mode === 'multiple-choice' 
                                                ? Math.round((item.score / item.totalQuestions) * 100)
                                                : Math.round(item.score / item.totalQuestions)
                                            }%
                                          </div>
                                      </div>
                                      <button 
                                        onClick={(e) => handleDeleteHistory(e, item.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      >
                                          <TrashIcon className="w-5 h-5" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* LOADING SCREEN */}
          {appState === AppState.LOADING && (
             <div className="flex-grow flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-primary rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-semibold text-gray-800 animate-pulse">{loadingMsg}</h2>
                <p className="text-gray-400 mt-2 text-sm">AI 正在思考中，请稍候...</p>
             </div>
          )}

          {/* QUIZ SCREEN */}
          {appState === AppState.QUIZ && session && (
            <div className="w-full h-full flex flex-col">
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6 overflow-hidden">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${((session.currentQuestionIndex) / session.questions.length) * 100}%` }}
                ></div>
              </div>
              <QuizCard 
                question={session.questions[session.currentQuestionIndex]}
                savedAnswer={session.userAnswers[session.questions[session.currentQuestionIndex].id]}
                hasPrev={session.currentQuestionIndex > 0}
                hasNext={session.currentQuestionIndex < session.questions.length - 1}
                topic={session.topic}
                onAnswer={handleAnswer}
                onNext={handleNext}
                onPrev={handlePrev}
                onEvaluate={handleEvaluate}
              />
            </div>
          )}

          {/* SUMMARY SCREEN */}
          {appState === AppState.SUMMARY && session && (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
              <TrophyIcon className="w-24 h-24 text-yellow-400" />
              
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">完成学习!</h2>
                <p className="text-gray-500">
                    {session.mode === 'multiple-choice' ? '正确率' : 'AI 评分均分'}
                </p>
              </div>

              <div className="text-6xl font-black text-primary tracking-tighter">
                {session.mode === 'multiple-choice' ? (
                    <span>{Math.round((session.score / session.questions.length) * 100)}%</span>
                ) : (
                    <span>{Math.round(session.score / session.questions.length)}</span>
                )}
              </div>
              
              <div className="text-sm font-medium text-gray-400 bg-gray-100 py-2 px-4 rounded-full">
                 {session.mode === 'multiple-choice' ? (
                    <span>答对 {session.score} / {session.questions.length} 题</span>
                 ) : (
                    <span>基于 {session.questions.length} 道题的综合评分</span>
                 )}
              </div>
              
              <p className="text-xs text-gray-400">已自动保存到历史记录</p>

              <div className="w-full max-w-xs space-y-3 pt-6">
                <Button onClick={resetApp} fullWidth>
                  探索新主题
                </Button>
                <Button onClick={() => {
                   setSession(prev => prev ? {...prev, currentQuestionIndex: 0, score: 0} : null);
                   setAppState(AppState.QUIZ);
                }} variant="outline" fullWidth>
                  重做本题库
                </Button>
              </div>
            </div>
          )}

          {/* ERROR SCREEN */}
          {appState === AppState.ERROR && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">出错了</h3>
              <p className="text-gray-500 mb-6 max-w-xs break-words">{errorMsg}</p>
              
              <div className="w-full max-w-xs space-y-3">
                  <Button onClick={() => setAppState(AppState.SETUP)} variant="secondary" fullWidth>
                    重试
                  </Button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

