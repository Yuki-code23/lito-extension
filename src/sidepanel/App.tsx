import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Settings, LogOut, Check, Pencil, Plus, X, MessageSquare, Send, FileText } from 'lucide-react';

interface Skill {
    id: string;
    name: string;
    years: number;
    isProfessional: boolean;
    level: number;
}

interface Preferences {
    targetRate: number;
    category: string;
    geminiApiKey?: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // User Data State
    const [preferences, setPreferences] = useState<Preferences>({ targetRate: 0, category: '', geminiApiKey: '' });
    const [skills, setSkills] = useState<Skill[]>([]);

    // Editing States
    const [isEditingPrefs, setIsEditingPrefs] = useState(false);
    const [editTargetRate, setEditTargetRate] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editGeminiKey, setEditGeminiKey] = useState('');

    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillYears, setNewSkillYears] = useState('1');
    const [newSkillIsPro, setNewSkillIsPro] = useState(true);
    const [newSkillLevel, setNewSkillLevel] = useState(3);

    // Analysis & Chat State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<{ suggestions: string[] } | null>(null);
    const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
    const [proposal, setProposal] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
    const [isChatting, setIsChatting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserData(currentUser.uid);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchUserData = async (uid: string) => {
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setPreferences(data.preferences || { targetRate: 0, category: '', geminiApiKey: '' });
                setSkills(data.skills || []);
            } else {
                // Initialize user document if not existing setup via signin
                console.log("No user document found, it might be the first login via popup");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const handleSavePreferences = async () => {
        if (!user) return;
        try {
            const numRate = parseInt(editTargetRate, 10) || 0;
            const updatedPrefs = { targetRate: numRate, category: editCategory, geminiApiKey: editGeminiKey };

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { preferences: updatedPrefs });

            setPreferences(updatedPrefs);
            setIsEditingPrefs(false);
        } catch (error) {
            console.error("Error saving preferences:", error);
        }
    };

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSkillName.trim() || !user) return;

        const skill: Skill = {
            id: Date.now().toString(),
            name: newSkillName.trim(),
            years: parseFloat(newSkillYears) || 0,
            isProfessional: newSkillIsPro,
            level: newSkillLevel
        };

        const updatedSkills = [...skills, skill];
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { skills: updatedSkills });
            setSkills(updatedSkills);
            setNewSkillName('');
            setIsAddingSkill(false);
        } catch (error) {
            console.error("Error adding skill:", error);
        }
    };

    const handleRemoveSkill = async (skillId: string) => {
        if (!user) return;
        const updatedSkills = skills.filter(s => s.id !== skillId);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { skills: updatedSkills });
            setSkills(updatedSkills);
        } catch (error) {
            console.error("Error removing skill:", error);
        }
    };

    const handleStartAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResults(null);
        setProposal(null);
        setChatMessages([]);

        try {
            // Backgroundスクリプトに解析を依頼
            const response = await chrome.runtime.sendMessage({
                type: "START_ANALYSIS",
                profile: { ...preferences, skills }
            });

            if (response && response.success) {
                setAnalysisResults(response.results);
            } else {
                console.error("Analysis failed:", response?.error);
            }
        } catch (error) {
            console.error("Failed to send message to background:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateProposal = async () => {
        if (!analysisResults) return;
        setIsGeneratingProposal(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: "GENERATE_PROPOSAL",
                profile: { ...preferences, skills },
                analysisResults
            });

            if (response && response.success) {
                setProposal(response.proposal);
            } else {
                alert(`応募文の生成に失敗しました: ${response?.error || '不明なエラー'}`);
            }
        } catch (error) {
            console.error("Failed to generate proposal:", error);
        } finally {
            setIsGeneratingProposal(false);
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || isChatting) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatting(true);

        try {
            const response = await chrome.runtime.sendMessage({
                type: "SOLILOQUY_CHAT",
                profile: { ...preferences, skills },
                message: userMsg,
                context: { analysisResults, proposal, history: chatMessages }
            });

            if (response && response.success) {
                setChatMessages(prev => [...prev, { role: 'assistant', text: response.reply }]);
            }
        } catch (error) {
            console.error("Chat failed:", error);
            setChatMessages(prev => [...prev, { role: 'assistant', text: "すみません、対話中にエラーが発生しました。" }]);
        } finally {
            setIsChatting(false);
        }
    };

    const handleLogout = () => {
        auth.signOut();
    };

    const handleLogin = async () => {
        try {
            await chrome.runtime.sendMessage({ type: "LOGIN" });
        } catch (error) {
            console.error("Failed to trigger login:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-[90%] w-full">
                    <h1 className="text-3xl font-extrabold text-blue-600 mb-4 tracking-tight">Lito AI</h1>
                    <p className="text-gray-600 text-sm font-medium mb-8 leading-relaxed">
                        解析を開始するにはログインが必要です
                    </p>
                    <button
                        onClick={handleLogin}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <LogOut size={20} className="rotate-180" />
                        Googleでログイン
                    </button>
                    <p className="mt-4 text-[10px] text-gray-400 font-medium">
                        クリックしても認証画面が出ない場合は、<br />拡張機能を再読み込みしてください。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50 text-gray-800">
            <header className="px-5 py-4 border-b bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-blue-600 tracking-tight">Lito AI</h1>
                    <p className="text-xs text-gray-500 font-medium truncate max-w-[140px]" title={user.email || ''}>{user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                    title="ログアウト"
                >
                    <LogOut size={18} />
                </button>
            </header>

            <main className="flex-1 p-5 space-y-6 overflow-y-auto">
                {/* ユーザー設定セクション */}
                <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Settings size={18} className="text-blue-500" />
                            基本設定
                        </h2>
                        {!isEditingPrefs && (
                            <button
                                onClick={() => {
                                    setEditTargetRate(preferences.targetRate ? preferences.targetRate.toString() : '');
                                    setEditCategory(preferences.category || '');
                                    setEditGeminiKey(preferences.geminiApiKey || '');
                                    setIsEditingPrefs(true);
                                }}
                                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800 transition-colors p-1"
                            >
                                <Pencil size={12} />
                                編集
                            </button>
                        )}
                    </div>

                    {isEditingPrefs ? (
                        <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">目標単価 (円/人月)</label>
                                <input
                                    type="number"
                                    value={editTargetRate}
                                    onChange={(e) => setEditTargetRate(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="例: 800000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">希望職種/カテゴリ</label>
                                <input
                                    type="text"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="例: フロントエンドエンジニア"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={editGeminiKey}
                                    onChange={(e) => setEditGeminiKey(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="AIza..."
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsEditingPrefs(false)}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSavePreferences}
                                    className="flex-1 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <Check size={14} /> 保存
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-xs text-gray-500 font-medium tracking-wide">目標単価</span>
                                <span className="text-sm font-bold text-gray-800">
                                    {preferences.targetRate ? `¥${preferences.targetRate.toLocaleString()}` : <span className="text-gray-400 font-normal italic">未設定</span>}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-xs text-gray-500 font-medium tracking-wide">希望職種</span>
                                <span className="text-sm font-semibold text-gray-800">
                                    {preferences.category || <span className="text-gray-400 font-normal italic">未設定</span>}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-gray-500 font-medium tracking-wide">API Key</span>
                                <span className="text-sm font-semibold text-gray-800">
                                    {preferences.geminiApiKey ? '••••••••' : <span className="text-gray-400 font-normal italic">未設定</span>}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* スキルセットセクション */}
                <section>
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-base font-bold text-gray-800 border-b-[3px] border-blue-500 pb-1 inline-block">保有スキル</h2>
                        <button
                            onClick={() => setIsAddingSkill(!isAddingSkill)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                            {isAddingSkill ? <X size={20} /> : <Plus size={20} />}
                        </button>
                    </div>

                    {isAddingSkill && (
                        <form onSubmit={handleAddSkill} className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">スキル名</label>
                                <input
                                    type="text"
                                    value={newSkillName}
                                    onChange={(e) => setNewSkillName(e.target.value)}
                                    placeholder="例: React, TypeScript"
                                    className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">経験年数</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={newSkillYears}
                                        onChange={(e) => setNewSkillYears(e.target.value)}
                                        className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">熟練度 (1-5)</label>
                                    <select
                                        value={newSkillLevel}
                                        onChange={(e) => setNewSkillLevel(parseInt(e.target.value))}
                                        className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg"
                                    >
                                        <option value={1}>1: 基礎レベル</option>
                                        <option value={2}>2: 独力で可能</option>
                                        <option value={3}>3: 実務経験あり</option>
                                        <option value={4}>4: 専門知識あり</option>
                                        <option value={5}>5: エキスパート</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPro"
                                    checked={newSkillIsPro}
                                    onChange={(e) => setNewSkillIsPro(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isPro" className="text-xs font-medium text-gray-600">実務経験としてカウントする</label>
                            </div>
                            <button
                                type="submit"
                                disabled={!newSkillName.trim()}
                                className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-100"
                            >
                                スキルを保存
                            </button>
                        </form>
                    )}

                    <div className="flex flex-col gap-3">
                        {skills.length === 0 ? (
                            <div className="text-sm text-gray-500 font-medium p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl w-full text-center">
                                スキルを登録してAIの精度を高めましょう
                            </div>
                        ) : (
                            skills.map(skill => (
                                <div
                                    key={skill.id}
                                    className="group flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-sm font-bold text-gray-800">{skill.name}</span>
                                            {skill.isProfessional && (
                                                <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Pro</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveSkill(skill.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">経験</span>
                                            <span className="text-xs font-semibold text-gray-600">{skill.years}年</span>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">レベル: {skill.level}</span>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= skill.level ? 'bg-blue-500' : 'bg-gray-100'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* 分析ステータス & 結果表示 */}
                <section className="pt-4 pb-8">
                    <div className="relative flex items-center py-5">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold tracking-widest flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                {isAnalyzing ? (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                ) : null}
                                <span className={`${isAnalyzing ? 'bg-blue-500' : 'bg-gray-300'} relative inline-flex rounded-full h-2.5 w-2.5`}></span>
                            </span>
                            {isAnalyzing ? "リアルタイム解析中..." : "解析準備完了"}
                        </span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {analysisResults ? (
                        <div className="mt-2 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                            {analysisResults.suggestions.map((suggestion, i) => (
                                <div key={i} className="flex gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 shadow-sm">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-[10px]">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm leading-relaxed text-gray-700">
                                        {suggestion}
                                    </p>
                                </div>
                            ))}
                            <button
                                onClick={handleStartAnalysis}
                                disabled={isAnalyzing}
                                className="w-full mt-4 py-3 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                <Settings className={`${isAnalyzing ? 'animate-spin' : ''}`} size={16} />
                                再解析を実行
                            </button>

                            {/* 応募文生成ボタン */}
                            {!proposal && (
                                <button
                                    onClick={handleGenerateProposal}
                                    disabled={isGeneratingProposal}
                                    className="w-full mt-2 py-3 px-4 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-green-100 disabled:opacity-50"
                                >
                                    {isGeneratingProposal ? (
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FileText size={16} />
                                    )}
                                    案件の応募文を生成
                                </button>
                            )}

                            {proposal && (
                                <div className="mt-4 bg-white border border-green-200 rounded-xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-200">
                                    <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">生成された応募文</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(proposal);
                                                alert("コピーしました！");
                                            }}
                                            className="text-[10px] bg-white text-green-600 px-2 py-1 rounded border border-green-200 font-bold hover:bg-green-100 transition-colors"
                                        >
                                            コピー
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <textarea
                                            readOnly
                                            value={proposal}
                                            className="w-full h-40 text-xs text-gray-700 leading-relaxed border-none focus:ring-0 resize-none bg-transparent"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 独り言チャットセクション */}
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <h3 className="text-sm font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                                    <MessageSquare size={18} className="text-blue-500" />
                                    Litoと対話する（独り言）
                                </h3>

                                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                    {chatMessages.length === 0 && (
                                        <div className="text-[11px] text-gray-400 italic text-center py-4">
                                            「この案件、今のレベルで大丈夫かな？」など、<br />気になることを聞いてみてください。
                                        </div>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                                                }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isChatting && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                                                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                                        placeholder="独り言を送信..."
                                        className="flex-1 text-xs p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleSendChatMessage}
                                        disabled={!chatInput.trim() || isChatting}
                                        className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center aspect-square"
                                    >
                                        <Send size={18} className={isChatting ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <button
                                onClick={handleStartAnalysis}
                                disabled={isAnalyzing}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                            >
                                {isAnalyzing ? (
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Plus size={18} />
                                )}
                                解析を開始する
                            </button>
                            <p className="text-[10px] text-gray-400 mt-3 font-medium">現在のタブの内容をAIが解析します</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default App;
