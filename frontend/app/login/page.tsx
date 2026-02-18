'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const DEMO_ACCOUNTS = [
    { label: '管理者', email: 'admin@ikaruRoute.jp', password: 'password123', role: 'admin' },
    { label: 'コーディネーター', email: 'coordinator@ikaruRoute.jp', password: 'password123', role: 'coordinator' },
    { label: 'スタッフ（日野）', email: 'hino@ikaruRoute.jp', password: 'password123', role: 'staff' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            router.push('/route');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'ログインに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
        setEmail(account.email);
        setPassword(account.password);
        setIsLoading(true);
        try {
            await login(account.email, account.password);
            router.push('/route');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'ログインに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f1923 0%, #1a3a6b 50%, #0f1923 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            {/* 背景装飾 */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(ellipse at 30% 50%, rgba(0,180,216,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(47,95,168,0.12) 0%, transparent 50%)',
                pointerEvents: 'none',
            }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
                {/* ロゴ・タイトル */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '20px',
                        background: 'linear-gradient(135deg, #2f5fa8, #00b4d8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(0,180,216,0.3)',
                        fontSize: '32px',
                    }}>
                        🚗
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#e8edf5', marginBottom: '4px' }}>
                        IkaruRoute
                    </h1>
                    <p style={{ color: '#8a9bb5', fontSize: '14px' }}>訪問介護ルート最適化システム</p>
                    <p style={{ color: '#8a9bb5', fontSize: '12px', marginTop: '4px' }}>鶴進HMG</p>
                </div>

                {/* ログインフォーム */}
                <div className="glass" style={{ borderRadius: '16px', padding: '32px' }}>
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#8a9bb5', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                                メールアドレス
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                required
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#e8edf5', fontSize: '14px',
                                    outline: 'none', transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#00b4d8'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#8a9bb5', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                                パスワード
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#e8edf5', fontSize: '14px',
                                    outline: 'none', transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#00b4d8'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)',
                                borderRadius: '8px', padding: '12px', marginBottom: '16px',
                                color: '#ff6b6b', fontSize: '13px',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px' }}
                        >
                            {isLoading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </form>

                    {/* デモアカウント */}
                    <div style={{ marginTop: '28px' }}>
                        <p style={{ color: '#8a9bb5', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
                            デモアカウントでログイン
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {DEMO_ACCOUNTS.map((account) => (
                                <button
                                    key={account.email}
                                    onClick={() => handleDemoLogin(account)}
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 16px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px', color: '#e8edf5', fontSize: '13px',
                                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                >
                                    <span style={{ fontWeight: '500' }}>{account.label}</span>
                                    <span style={{
                                        fontSize: '11px', color: '#8a9bb5',
                                        background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px',
                                    }}>
                                        {account.role}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#8a9bb5', fontSize: '11px', marginTop: '24px' }}>
                    © 2026 KEYRON株式会社 | IkaruRoute MVP v1.0
                </p>
            </div>
        </div>
    );
}
