import { useState } from 'react';
import './CodeAssistantModal.css';
import { ZapIcon, BrainIcon, BugIcon, SparklesIcon, AnalyticsIcon } from './Icons';

const SAMPLE_CODES = [
  {
    label: 'Two Sum (DSA)',
    language: 'javascript',
    code: `// LeetCode #1: Two Sum
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`
  },
  {
    label: 'Binary Search (C++)',
    language: 'cpp',
    code: `// Binary Search in Sorted Vector
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int left = 0;
    int right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`
  },
  {
    label: 'Buggy Loop (Python)',
    language: 'python',
    code: `# Find maximum in list - Buggy Implementation
def find_max(numbers):
    max_val = 0  # Bug: fails for all negative numbers!
    for i in range(len(numbers)):
        if numbers[i] > max_val:
            max_val = numbers[i]
    return max_val`
  },
  {
    label: 'Recursive Fib (Java)',
    language: 'java',
    code: `// Fibonacci - Exponential Time Complexity
public class Fib {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`
  }
];

export function CodeAssistantModal({ isOpen, onClose, onSendToChat, selectedModel = 'auto' }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('auto');
  const [activeTab, setActiveTab] = useState('full'); // 'full' | 'explain' | 'bugs' | 'optimize' | 'complexity'
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const handleSelectSample = (sample) => {
    setCode(sample.code);
    setLanguage(sample.language);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async (mode) => {
    if (!code.trim()) {
      setErrorMsg('Please paste or write some code first!');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setActiveTab(mode);

    try {
      const response = await fetch('/api/chat/code-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language,
          mode: mode,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze code.');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (err) {
      console.error('Code assistant error:', err);
      setErrorMsg(err.message || 'Error communicating with Code Assistant engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!analysisResult) return;
    const textToCopy = typeof analysisResult === 'string' 
      ? analysisResult 
      : JSON.stringify(analysisResult, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendToMainChat = () => {
    if (!analysisResult || !onSendToChat) return;
    
    let formattedMsg = '';
    if (typeof analysisResult === 'string') {
      formattedMsg = analysisResult;
    } else {
      formattedMsg = `### 💻 Code Analysis (${language.toUpperCase()})\n\n`;
      if (analysisResult.explanation) formattedMsg += `#### 💡 Explanation\n${analysisResult.explanation}\n\n`;
      if (analysisResult.bugs) formattedMsg += `#### 🐛 Bug Detection & Fixes\n${analysisResult.bugs}\n\n`;
      if (analysisResult.optimized) formattedMsg += `#### 🚀 Optimized Code\n${analysisResult.optimized}\n\n`;
      if (analysisResult.complexity) formattedMsg += `#### 📊 Complexity Analysis\n${analysisResult.complexity}\n\n`;
    }

    onSendToChat(formattedMsg);
    onClose();
  };

  const handleClear = () => {
    setCode('');
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="code-modal-overlay" onClick={onClose}>
      <div className="code-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="code-modal-header">
          <div className="code-modal-title">
            <span className="code-icon-badge">💻</span>
            <div>
              <h2>Phase 12: Code Assistant</h2>
              <p>Explain code, detect bugs, optimize & analyze Big-O complexity for any programming language</p>
            </div>
          </div>
          <button className="code-modal-close" onClick={onClose} title="Close Modal">✕</button>
        </div>

        {/* Content Body */}
        <div className="code-modal-body">
          {/* Top Bar: Language & Samples */}
          <div className="code-controls-bar">
            <div className="language-select-wrapper">
              <label htmlFor="code-lang-select">Language:</label>
              <select
                id="code-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="code-lang-dropdown"
              >
                <option value="auto">🌐 Auto-Detect Language</option>
                <option value="python">🐍 Python</option>
                <option value="cpp">⚡ C++</option>
                <option value="java">☕ Java</option>
                <option value="javascript">🟨 JavaScript</option>
                <option value="typescript">🔷 TypeScript</option>
                <option value="csharp">🎯 C#</option>
                <option value="go">🐹 Go</option>
                <option value="rust">🦀 Rust</option>
                <option value="sql">🗄️ SQL</option>
                <option value="php">🐘 PHP</option>
                <option value="ruby">💎 Ruby</option>
                <option value="html">🌐 HTML / CSS</option>
                <option value="kotlin">📱 Kotlin</option>
                <option value="swift">🍎 Swift</option>
              </select>
            </div>

            <div className="code-samples-pills">
              <span className="samples-label">Presets:</span>
              {SAMPLE_CODES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="sample-pill-btn"
                  onClick={() => handleSelectSample(s)}
                  title={`Load ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Workspace Grid: Left Code Input, Right Workflow & Output */}
          <div className="code-workspace-grid">
            {/* Left Column: Code Input */}
            <div className="code-editor-section">
              <div className="section-label-bar">
                <span>📋 Paste / Write Code Below:</span>
                <div className="editor-action-right">
                  <span className="line-counter">{code ? `${code.split('\n').length} lines` : '0 lines'}</span>
                  {code && (
                    <button type="button" className="btn-clear-code" onClick={handleClear}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="code-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Paste code in Python, C++, Java, JavaScript, Rust, Go, SQL, etc.&#10;&#10;function solution(arr) {&#10;    // Write or paste code here...&#10;}"
                rows={14}
                spellCheck="false"
              />

              {/* Workflow Pipeline Action Buttons */}
              <div className="pipeline-actions">
                <button
                  type="button"
                  className={`btn-pipeline primary ${loading && activeTab === 'full' ? 'loading' : ''}`}
                  onClick={() => handleAnalyze('full')}
                  disabled={loading}
                >
                  <span className="btn-icon"><ZapIcon size={14} /></span>
                  <span>All-in-One Full Pipeline</span>
                </button>

                <div className="individual-actions-row">
                  <button
                    type="button"
                    className={`btn-pipeline secondary ${activeTab === 'explain' ? 'active' : ''}`}
                    onClick={() => handleAnalyze('explain')}
                    disabled={loading}
                  >
                    <BrainIcon size={14} /> Explain Code
                  </button>

                  <button
                    type="button"
                    className={`btn-pipeline secondary ${activeTab === 'bugs' ? 'active' : ''}`}
                    onClick={() => handleAnalyze('bugs')}
                    disabled={loading}
                  >
                    <BugIcon size={14} /> Find Bugs
                  </button>

                  <button
                    type="button"
                    className={`btn-pipeline secondary ${activeTab === 'optimize' ? 'active' : ''}`}
                    onClick={() => handleAnalyze('optimize')}
                    disabled={loading}
                  >
                    <SparklesIcon size={14} /> Optimize
                  </button>

                  <button
                    type="button"
                    className={`btn-pipeline secondary ${activeTab === 'complexity' ? 'active' : ''}`}
                    onClick={() => handleAnalyze('complexity')}
                    disabled={loading}
                  >
                    <AnalyticsIcon size={14} /> Complexity Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Workflow Visualization & Analysis Output */}
            <div className="code-output-section">
              {/* Flowchart Diagram (Matches user prompt requirements!) */}
              <div className="workflow-flowchart-card">
                <div className="flow-step">
                  <span className="step-num">1</span> Paste Code
                </div>
                <span className="flow-arrow">↓</span>
                <div className={`flow-step ${activeTab === 'explain' || activeTab === 'full' ? 'highlight' : ''}`}>
                  <span className="step-num">2</span> Explain Code
                </div>
                <span className="flow-arrow">↓</span>
                <div className={`flow-step ${activeTab === 'bugs' || activeTab === 'full' ? 'highlight' : ''}`}>
                  <span className="step-num">3</span> Find Bugs
                </div>
                <span className="flow-arrow">↓</span>
                <div className={`flow-step ${activeTab === 'optimize' || activeTab === 'full' ? 'highlight' : ''}`}>
                  <span className="step-num">4</span> Optimize
                </div>
                <span className="flow-arrow">↓</span>
                <div className={`flow-step ${activeTab === 'complexity' || activeTab === 'full' ? 'highlight' : ''}`}>
                  <span className="step-num">5</span> Complexity Analysis
                </div>
              </div>

              {/* Analysis Result Output Display */}
              <div className="analysis-output-container">
                {loading && (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Analyzing code structure, identifying bugs, optimizing & evaluating Big-O complexity...</p>
                  </div>
                )}

                {errorMsg && (
                  <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p>{errorMsg}</p>
                  </div>
                )}

                {!loading && !errorMsg && !analysisResult && (
                  <div className="empty-state">
                    <span className="empty-icon">🤖</span>
                    <h3>Ready to Analyze</h3>
                    <p>Paste code on the left and click <strong>&quot;All-in-One Full Pipeline&quot;</strong> or choose a specific action to generate instant explanations, bug fixes, optimized code &amp; DSA complexity bounds!</p>
                  </div>
                )}

                {!loading && !errorMsg && analysisResult && (
                  <div className="analysis-content-view">
                    <div className="output-toolbar">
                      <span className="output-badge">
                        {activeTab === 'full' && '⚡ Full Pipeline Analysis'}
                        {activeTab === 'explain' && '💡 Code Explanation'}
                        {activeTab === 'bugs' && '🐛 Bug Report & Fixes'}
                        {activeTab === 'optimize' && '🚀 Code Optimization'}
                        {activeTab === 'complexity' && '📊 Big-O Complexity Analysis'}
                      </span>

                      <div className="toolbar-btns">
                        <button
                          type="button"
                          className="btn-copy-output"
                          onClick={handleCopyAnalysis}
                          title="Copy output to clipboard"
                        >
                          {copiedText ? '✅ Copied!' : '📋 Copy Output'}
                        </button>
                        <button
                          type="button"
                          className="btn-send-chat"
                          onClick={handleSendToMainChat}
                          title="Insert this analysis directly into chat"
                        >
                          💬 Send to Chat
                        </button>
                      </div>
                    </div>

                    <div className="analysis-text-render">
                      {typeof analysisResult === 'string' ? (
                        <pre className="raw-markdown-pre">{analysisResult}</pre>
                      ) : (
                        <div className="structured-analysis">
                          {analysisResult.explanation && (
                            <div className="analysis-card explain-card">
                              <h4>💡 Code Explanation</h4>
                              <p className="card-text">{analysisResult.explanation}</p>
                            </div>
                          )}

                          {analysisResult.bugs && (
                            <div className="analysis-card bug-card">
                              <h4>🐛 Bug Detection & Edge Cases</h4>
                              <p className="card-text">{analysisResult.bugs}</p>
                            </div>
                          )}

                          {analysisResult.optimized && (
                            <div className="analysis-card optimize-card">
                              <h4>🚀 Optimized Implementation</h4>
                              <pre className="code-block-pre"><code>{analysisResult.optimized}</code></pre>
                            </div>
                          )}

                          {analysisResult.complexity && (
                            <div className="analysis-card complexity-card">
                              <h4>📊 Complexity Analysis (DSA)</h4>
                              <p className="card-text">{analysisResult.complexity}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="code-modal-footer">
          <span className="footer-tip">💡 <em>Tip: Great for LeetCode practice, DSA problem solving, code reviews, and quick debugging!</em></span>
          <button type="button" className="btn-close-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
