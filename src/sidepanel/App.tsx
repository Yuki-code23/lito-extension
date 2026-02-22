import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Settings, LogOut, Check, Pencil, Plus, X } from 'lucide-react';

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
    const [skills, setSkills] = useState<string[]>([]);

    // Editing States
    const [isEditingPrefs, setIsEditingPrefs] = useState(false);
    const [editTargetRate, setEditTargetRate] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editGeminiKey, setEditGeminiKey] = useState('');

    const [newSkill, setNewSkill] = useState('');

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<{ suggestions: string[] } | null>(null);

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
        if (!newSkill.trim() || !user || skills.includes(newSkill.trim())) return;

        const updatedSkills = [...skills, newSkill.trim()];
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { skills: updatedSkills });
            setSkills(updatedSkills);
            setNewSkill('');
        } catch (error) {
            console.error("Error adding skill:", error);
        }
    };

    const handleRemoveSkill = async (skillToRemove: string) => {
        if (!user) return;
        const updatedSkills = skills.filter(s => s !== skillToRemove);
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
                        <span className="text-xs font-bold bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full">{skills.length}</span>
                    </div>

                    <form onSubmit={handleAddSkill} className="flex gap-2 mb-4 relative">
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="スキルを追加 (例: React)"
                            className="flex-1 text-sm p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pl-3 pr-10"
                        />
                        <button
                            type="submit"
                            disabled={!newSkill.trim()}
                            className="absolute right-1 top-1 bottom-1 p-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:hover:bg-transparent disabled:text-gray-400 transition-colors flex items-center justify-center"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                        {skills.length === 0 ? (
                            <div className="text-sm text-gray-500 font-medium p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg w-full text-center">
                                スキルを登録してAIの精度を高めましょう
                            </div>
                        ) : (
                            skills.map(skill => (
                                <span
                                    key={skill}
                                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold rounded-lg shadow-sm transition-all"
                                >
                                    {skill}
                                    <button
                                        onClick={() => handleRemoveSkill(skill)}
                                        className="text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors focus:outline-none"
                                        aria-label="削除"
                                    >
                                        <X size={12} strokeWidth={2.5} />
                                    </button>
                                </span>
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
