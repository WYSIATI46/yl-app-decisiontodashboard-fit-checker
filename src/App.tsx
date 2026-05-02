import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { extractDiagnosticFromProse, generateAnalysisFromAnswers } from './lib/gemini';
import { ArrowRight, FileText, Activity, AlertCircle, CheckCircle2, Navigation, FileSignature, RefreshCcw } from 'lucide-react';

type Mode = 'intro' | 'method-select' | 'quick-check' | 'diagnostic' | 'loading' | 'results';

interface Question {
  id: string;
  label: string;
  text: string;
  helpText?: string;
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    label: "Decision",
    text: "What specific decision does this dashboard support?",
    helpText: "Think about the last time you looked at it. What choice did it help you make?"
  },
  {
    id: "q2",
    label: "Owner & Cadence",
    text: "Who makes that decision, and on what cadence?",
    helpText: "Name a role, not a department. e.g., 'VP of Sales, Weekly'"
  },
  {
    id: "q3",
    label: "Action",
    text: "What action changes if the key metric moves up? Moves down?",
    helpText: "If the number goes up, what do you do differently? If you don't know, state that."
  },
  {
    id: "q4",
    label: "Threshold",
    text: "What threshold or signal would trigger an intervention?",
    helpText: "At what exact value do you stop observing and start acting?"
  },
  {
    id: "q5",
    label: "Counter-metric",
    text: "Is there a counter-metric that could reverse this interpretation?",
    helpText: "e.g., Sales are up, but so are customer complaints."
  },
  {
    id: "q6",
    label: "Cost",
    text: "What is the cost of acting on a false signal in either direction?",
    helpText: "What happens if you intervene when unnecessary, or wait when you shouldn't?"
  }
];

interface AnalysisResult {
  answers?: { question: string; answer: string; hasGap?: boolean }[];
  gaps: { type: string; description: string }[];
  score: number;
  brief: string[];
}

export default function App() {
  const [mode, setMode] = useState<Mode>('intro');
  const [prose, setProse] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  const handleQuickCheckSubmit = async () => {
    if (!prose.trim()) return;
    setMode('loading');
    try {
      const result = await extractDiagnosticFromProse(prose);
      setAnalysis(result);
      setMode('results');
    } catch (e) {
      console.error(e);
      alert('Failed to analyze. Please try again.');
      setMode('quick-check');
    }
  };

  const handleDiagnosticSubmit = async () => {
    setMode('loading');
    try {
      const formattedAnswers = QUESTIONS.map(q => ({
        question: q.text,
        answer: answers[q.id] || 'Not specified'
      }));
      const result = await generateAnalysisFromAnswers(formattedAnswers);
      setAnalysis({
        ...result,
        answers: formattedAnswers
      });
      setMode('results');
    } catch (e) {
      console.error(e);
      alert('Failed to analyze. Please try again.');
      setMode('diagnostic');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      handleDiagnosticSubmit();
    }
  };

  const getScoreLabel = (score: number) => {
    if (score <= 25) return "Decorative";
    if (score <= 50) return "Informative";
    if (score <= 75) return "Functional";
    return "Decision-Ready";
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="p-6 border-b border-text-ink/10 flex justify-between items-center bg-bg-warm sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode('intro')}>
          <div className="w-4 h-4 bg-accent-orange rounded-full" />
          <h1 className="font-display text-xl tracking-tight">Design-to-Decision</h1>
        </div>
        {mode !== 'intro' && (
          <button 
            onClick={() => {
              setMode('intro');
              setAnswers({});
              setProse('');
              setCurrentQuestionIdx(0);
              setAnalysis(null);
            }}
            className="text-sm font-medium text-text-ink/60 hover:text-text-ink transition-colors flex items-center gap-1"
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <AnimatePresence mode="wait">
          {mode === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl w-full"
            >
              <h2 className="font-display text-5xl sm:text-7xl leading-[0.9] tracking-tight mb-8">
                The Decision<br/>Fit Checker
              </h2>
              <p className="text-xl text-text-ink/80 mb-8 max-w-xl leading-relaxed">
                Most dashboards are built around data availability, not decision requirements. They show what can be measured, rather than what you need to know to act. 
              </p>
              <p className="text-lg text-text-ink/60 mb-12 max-w-xl">
                This diagnostic exposes the gap between a dashboard's current design and the decision it supports.
              </p>
              <button 
                onClick={() => setMode('method-select')}
                className="bg-text-ink text-bg-warm px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-text-ink/90 transition-colors"
              >
                Start Diagnostic <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {mode === 'method-select' && (
            <motion.div 
              key="method-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl w-full grid md:grid-cols-2 gap-6"
            >
              <div 
                onClick={() => setMode('quick-check')}
                className="bg-white p-8 rounded-[32px] shadow-sm border border-text-ink/5 cursor-pointer hover:border-accent-orange/50 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-accent-gray rounded-full flex items-center justify-center mb-6 group-hover:bg-accent-orange/20 transition-colors">
                  <Activity className="w-6 h-6 group-hover:text-accent-orange transition-colors" />
                </div>
                <h3 className="font-display text-3xl mb-3">Quick Check</h3>
                <p className="text-text-ink/70 leading-relaxed mb-6">
                  Describe what the dashboard shows in a few sentences. Our AI will automatically extract the missing decision requirements.
                </p>
                <span className="text-sm font-semibold uppercase tracking-wider text-accent-orange flex items-center gap-1">
                  Speed Focused <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div 
                onClick={() => setMode('diagnostic')}
                className="bg-text-ink text-white p-8 rounded-[32px] shadow-sm cursor-pointer hover:bg-text-ink/90 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-3xl mb-3">Full Audit</h3>
                <p className="text-white/70 leading-relaxed mb-6">
                  Walk through our interactive six-question diagnostic. Ideal for data teams doing formal reviews or establishing baseline metrics.
                </p>
                <span className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-1">
                  Precision Focused <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          )}

          {mode === 'quick-check' && (
            <motion.div 
              key="quick-check"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl w-full"
            >
              <h2 className="font-display text-4xl mb-4">Dashboard Description</h2>
              <p className="text-text-ink/70 mb-8">
                Paste the purpose of the dashboard, what it shows, who uses it, and how often it is reviewed. The more detail, the better the analysis.
              </p>
              <textarea 
                value={prose}
                onChange={(e) => setProse(e.target.value)}
                placeholder="e.g. This is a weekly sales performance dashboard used by the regional VP. It shows total revenue by product line vs quota, pipeline generation, and win rates..."
                className="w-full h-64 p-6 bg-white border border-text-ink/10 rounded-3xl outline-none focus:border-accent-orange focus:ring-1 focus:ring-accent-orange resize-none text-lg leading-relaxed shadow-sm mb-8"
              />
              <button 
                onClick={handleQuickCheckSubmit}
                disabled={!prose.trim()}
                className="bg-accent-orange text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-accent-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Run Diagnostic <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {mode === 'diagnostic' && (
            <motion.div 
              key="diagnostic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl w-full"
            >
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-ink/40">
                Question {currentQuestionIdx + 1} of {QUESTIONS.length}
              </div>
              <h2 className="font-display text-4xl sm:text-5xl mb-4 leading-tight">
                {QUESTIONS[currentQuestionIdx].text}
              </h2>
              {QUESTIONS[currentQuestionIdx].helpText && (
                <p className="text-lg text-text-ink/60 mb-8 max-w-xl">
                  {QUESTIONS[currentQuestionIdx].helpText}
                </p>
              )}
              
              <div className="relative">
                <textarea 
                  value={answers[QUESTIONS[currentQuestionIdx].id] || ''}
                  onChange={(e) => setAnswers(prev => ({...prev, [QUESTIONS[currentQuestionIdx].id]: e.target.value}))}
                  placeholder="Your answer here..."
                  className="w-full h-48 p-6 pb-20 bg-white border border-text-ink/10 rounded-3xl outline-none focus:border-text-ink focus:ring-1 focus:ring-text-ink resize-none text-xl leading-relaxed shadow-sm"
                  autoFocus
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-4">
                  {currentQuestionIdx === 2 && (!answers[QUESTIONS[currentQuestionIdx].id] || answers[QUESTIONS[currentQuestionIdx].id].trim().length < 5) && (
                    <span className="text-sm text-accent-orange font-medium max-w-[200px] text-right">
                      If you cannot answer this, state that. It is the most vital question.
                    </span>
                  )}
                  <button 
                    onClick={handleNextQuestion}
                    disabled={!answers[QUESTIONS[currentQuestionIdx].id]?.trim()}
                    className="bg-text-ink text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-text-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {currentQuestionIdx === QUESTIONS.length - 1 ? 'Finish Audit' : 'Next'} 
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-text-ink/60"
            >
              <div className="w-16 h-16 border-4 border-text-ink/10 border-t-accent-orange rounded-full animate-spin mb-8" />
              <p className="font-display text-2xl animate-pulse">Running Decision Fit Diagnostic...</p>
            </motion.div>
          )}

          {mode === 'results' && analysis && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="bg-white rounded-[40px] p-8 sm:p-12 shadow-sm border border-text-ink/5 mb-12">
                <div className="mb-12 border-b border-text-ink/10 pb-12">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-ink/40 mb-6">Decision Fit Score</h3>
                  <div className="flex items-end gap-6 mb-8">
                    <div className="text-8xl sm:text-[120px] leading-none font-display font-bold tracking-tighter">
                      {analysis.score}<span className="text-4xl text-text-ink/30">%</span>
                    </div>
                    <div className="mb-4">
                      <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider inline-block mb-2
                          ${analysis.score <= 25 ? 'bg-red-100 text-red-700' : 
                            analysis.score <= 50 ? 'bg-orange-100 text-orange-700' : 
                            analysis.score <= 75 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'}`}
                      >
                        {getScoreLabel(analysis.score)}
                      </div>
                      <p className="text-text-ink/60 max-w-sm">
                        {analysis.score <= 25 && "This dashboard primarily displays data without a clear linkage to action."}
                        {analysis.score > 25 && analysis.score <= 50 && "Shows true things, but connection to specific decisions remains ambiguous."}
                        {analysis.score > 50 && analysis.score <= 75 && "Supports some actions but relies heavily on user interpretation."}
                        {analysis.score > 75 && "A highly actionable tool structured safely around clear decision requirements."}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Scale */}
                  <div className="w-full h-3 bg-accent-gray rounded-full relative mt-8">
                    <div className="absolute left-1/4 top-0 bottom-0 border-l border-white" />
                    <div className="absolute left-2/4 top-0 bottom-0 border-l border-white" />
                    <div className="absolute left-3/4 top-0 bottom-0 border-l border-white" />
                    
                    <div className="absolute inset-y-0 bg-accent-orange rounded-full transition-all duration-1000 ease-out flex justify-end" style={{ width: `${analysis.score}%` }}>
                      <div className="absolute -top-3 w-4 h-8 bg-text-ink rounded shadow-md transform translate-x-1/2" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-4 text-xs font-semibold uppercase tracking-wider text-text-ink/40">
                    <span className="w-1/4">Decorative</span>
                    <span className="w-1/4 text-center">Informative</span>
                    <span className="w-1/4 text-center">Functional</span>
                    <span className="w-1/4 text-right">Decision-Ready</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-16">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <AlertCircle className="text-accent-orange w-6 h-6" />
                      <h3 className="font-display text-3xl">Gap Analysis</h3>
                    </div>
                    {analysis.gaps && analysis.gaps.length > 0 ? (
                      <div className="space-y-6">
                        {analysis.gaps.map((gap, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            key={i} 
                            className="p-6 bg-bg-warm rounded-2xl border border-text-ink/5"
                          >
                            <h4 className="font-bold text-lg mb-2">{gap.type}</h4>
                            <p className="text-text-ink/70 leading-relaxed">{gap.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-green-50 rounded-2xl text-green-800 border border-green-100">
                        <CheckCircle2 className="w-6 h-6 mb-3" />
                        <h4 className="font-bold mb-1">No Decision Gaps Detected</h4>
                        <p className="opacity-80">This dashboard is exceptionally well-aligned to a specific decision profile.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <FileSignature className="text-text-ink w-6 h-6" />
                      <h3 className="font-display text-3xl">Redesign Brief</h3>
                    </div>
                    {analysis.brief && analysis.brief.length > 0 ? (
                      <div className="space-y-4">
                        {analysis.brief.map((req, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (i * 0.1) + 0.5 }}
                            key={i} 
                            className="flex gap-4 p-4 hover:bg-bg-warm rounded-xl transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-text-ink flex-shrink-0 text-white flex items-center justify-center font-bold text-sm">
                              {i + 1}
                            </div>
                            <p className="text-text-ink/80 leading-relaxed pt-1">{req}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-ink/50 italic">No redesign required based on current analysis.</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-16 flex justify-center border-t border-text-ink/10 pt-12">
                  <button 
                    onClick={() => {
                      setMode('method-select');
                      setAnswers({});
                      setProse('');
                      setCurrentQuestionIdx(0);
                      setAnalysis(null);
                    }}
                    className="bg-accent-orange text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-accent-orange/90 transition-all shadow-sm"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    Rerun Diagnostic
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
