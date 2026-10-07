import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Loader2,
  Award,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { generateMCQs } from '../services/api';
import { DocumentMetadata, McqItem } from '../types';

interface McqViewProps {
  activeDoc: DocumentMetadata | null;
}

export const McqView: React.FC<McqViewProps> = ({ activeDoc }) => {
  const [mode, setMode] = useState<'general' | 'document'>('document');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<McqItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (mode === 'document' && !activeDoc) {
      setErrorMsg('Please select or upload a document to generate MCQs from it.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setUserAnswers({});
    setQuestions([]);

    try {
      const res = await generateMCQs(
        mode,
        mode === 'document' ? activeDoc?.document_id : null,
        numQuestions,
        difficulty
      );

      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to generate quiz');
      }

      setQuestions(res.data.questions);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while generating MCQs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionIdx: number, option: string) => {
    // If question is already answered, allow changing or lock it
    if (userAnswers[questionIdx]) return;
    setUserAnswers((prev) => ({ ...prev, [questionIdx]: option }));
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
  };

  // Calculate score
  const totalAnswered = Object.keys(userAnswers).length;
  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (userAnswers[idx] && userAnswers[idx].trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
      correctCount += 1;
    }
  });

  const allAnswered = questions.length > 0 && totalAnswered === questions.length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-6">
      {/* Top Banner & Mode Config */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">MCQ Practice Exam Generator</h2>
              <p className="text-xs text-slate-500">Test your mastery with AI-generated 4-option practice questions</p>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('document')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'document'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>From Document</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'general'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>General Knowledge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Questions count, Difficulty, Generate button */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-4">
          {/* Question count */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Questions:</span>
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
              {[3, 5, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumQuestions(n)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    numQuestions === n
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Difficulty:</span>
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                    difficulty === d
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Document indicator */}
          {mode === 'document' && (
            <div className="text-slate-500">
              Target:{' '}
              {activeDoc ? (
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {activeDoc.filename} ({activeDoc.pages_count}p)
                </span>
              ) : (
                <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  No PDF selected
                </span>
              )}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || (mode === 'document' && !activeDoc)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating Quiz...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Generate Practice Quiz</span>
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Quiz generation error: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Score Tracker Banner */}
      {questions.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                Exam Progress: {totalAnswered} of {questions.length} answered
              </p>
              <p className="text-slate-500">
                Current Score: <strong className="text-indigo-700">{correctCount}</strong> / {questions.length} ({scorePercent}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allAnswered && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  scorePercent >= 80
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : scorePercent >= 60
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {scorePercent >= 80 ? '🎉 Excellent!' : scorePercent >= 60 ? '👍 Good Effort' : '📚 Keep Reviewing'}
              </span>
            )}
            <button
              type="button"
              onClick={handleResetQuiz}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-800">
            {mode === 'document'
              ? 'Analyzing document chunks & synthesizing grounded MCQs...'
              : 'Synthesizing engineering exam questions...'}
          </p>
          <p className="text-xs text-slate-400">
            Validating 4 distinct options, verified answer keys, and pedagogical explanations...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && questions.length === 0 && !errorMsg && (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Ready to test your knowledge?</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {mode === 'document'
              ? 'Click "Generate Practice Quiz" to extract questions grounded directly in your uploaded PDF.'
              : 'Click "Generate Practice Quiz" to generate conceptual multiple-choice questions on engineering topics.'}
          </p>
        </div>
      )}

      {/* Questions List */}
      {!loading && questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => {
            const userAnswer = userAnswers[qIdx];
            const hasAnswered = !!userAnswer;
            const isUserCorrect =
              hasAnswered &&
              userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

            return (
              <div
                key={qIdx}
                className={`p-5 rounded-2xl border transition-all ${
                  !hasAnswered
                    ? 'border-slate-200 bg-white shadow-2xs'
                    : isUserCorrect
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-rose-300 bg-rose-50/30'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  {/* Document citation badge if present */}
                  {q.source && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-medium shrink-0">
                      <BookmarkCheck className="h-3 w-3 text-indigo-600" /> Page {q.source.page}
                    </span>
                  )}
                </div>

                {/* Options Grid (4 options) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3.5">
                  {q.options.map((option, optIdx) => {
                    const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                    const isSelected = userAnswer === option;
                    const isCorrectOption =
                      option.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                    let btnStyle = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800';
                    let badgeStyle = 'bg-slate-100 text-slate-700';

                    if (hasAnswered) {
                      if (isCorrectOption) {
                        btnStyle = 'border-emerald-500 bg-emerald-100/70 text-emerald-950 font-semibold ring-1 ring-emerald-400';
                        badgeStyle = 'bg-emerald-600 text-white';
                      } else if (isSelected && !isCorrectOption) {
                        btnStyle = 'border-rose-400 bg-rose-100/70 text-rose-950 ring-1 ring-rose-400';
                        badgeStyle = 'bg-rose-600 text-white';
                      } else {
                        btnStyle = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60';
                        badgeStyle = 'bg-slate-200 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(qIdx, option)}
                        className={`p-3 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-2.5 transition-all cursor-pointer ${btnStyle} ${
                          hasAnswered ? 'cursor-default' : ''
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${badgeStyle}`}
                        >
                          {optionLetter}
                        </span>
                        <span className="flex-1">{option}</span>

                        {hasAnswered && isCorrectOption && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        {hasAnswered && isSelected && !isCorrectOption && (
                          <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Card (revealed upon answer) */}
                {hasAnswered && (
                  <div
                    className={`mt-3.5 p-3.5 rounded-xl text-xs leading-relaxed border ${
                      isUserCorrect
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {isUserCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Correct Answer: {q.correct_answer}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" />
                          <span>Incorrect. Correct Answer: {q.correct_answer}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-slate-700">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                    {q.source && (
                      <p className="mt-1 text-[11px] text-indigo-700 font-medium">
                        📍 Grounded source: Page {q.source.page} ({q.source.chunk_id})
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
