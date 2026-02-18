'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import { staffApi, visitApi, routeApi, revenueApi, reportApi, Staff, Visit, RevenueSummary, ProgressData } from '@/lib/api';
import GanttChart from '@/components/gantt/GanttChart';
import VisitModal from '@/components/gantt/VisitModal';
import RevenuePanel from '@/components/revenue/RevenuePanel';

interface Alert {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
}

export default function RoutePage() {
    const { user, logout, isCoordinatorOrAbove, isAdmin } = useAuth();
    const router = useRouter();
    const [targetDate, setTargetDate] = useState(new Date());
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [unassignedVisits, setUnassignedVisits] = useState<Visit[]>([]);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [revenue, setRevenue] = useState<RevenueSummary[]>([]);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showUnassigned, setShowUnassigned] = useState(false); // モバイル用ボトムシート
    const [showMenu, setShowMenu] = useState(false); // モバイル用ハンバーガーメニュー

    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [staffRes, visitsRes, unassignedRes, progressRes] = await Promise.all([
                staffApi.list(),
                visitApi.list(dateStr),
                isCoordinatorOrAbove ? visitApi.list(dateStr, undefined, true) : Promise.resolve({ data: [] }),
                routeApi.progress(dateStr),
            ]);
            setStaffList(staffRes.data);
            setVisits(visitsRes.data);
            setUnassignedVisits(unassignedRes.data);
            setProgress(progressRes.data);

            if (isCoordinatorOrAbove) {
                try {
                    const revRes = await revenueApi.summary(dateStr);
                    setRevenue(revRes.data);
                } catch { }
            }
        } catch {
            addAlert('error', 'データの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    }, [dateStr, isCoordinatorOrAbove]);

    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        loadData();
    }, [user, loadData, router]);

    const addAlert = (type: Alert['type'], message: string) => {
        const id = Math.random().toString(36).slice(2);
        setAlerts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
    };

    const handleVisitMove = async (visitId: string, newStaffId: string, newStart: string, newEnd: string) => {
        try {
            await visitApi.update(visitId, { staff_id: newStaffId, scheduled_start: newStart, scheduled_end: newEnd });
            await loadData();
            addAlert('info', '訪問を移動しました');
        } catch (err: any) {
            addAlert('error', err.response?.data?.detail || '移動に失敗しました（ダブルブッキングの可能性）');
        }
    };

    const handleVisitUpdate = async (visitId: string, data: any) => {
        try {
            await visitApi.update(visitId, data);
            await loadData();
            addAlert('info', '訪問情報を更新しました');
        } catch (err: any) {
            addAlert('error', err.response?.data?.detail || '更新に失敗しました');
        }
    };

    const handleGenerateRoute = async () => {
        setIsGenerating(true);
        setShowMenu(false);
        try {
            await routeApi.generate(dateStr);
            addAlert('info', 'AIルート生成を開始しました（最大3分かかります）');
            setTimeout(() => { loadData(); addAlert('info', 'ルート生成が完了しました'); }, 10000);
        } catch {
            addAlert('error', 'ルート生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExcelExport = async () => {
        setShowMenu(false);
        try {
            await reportApi.downloadExcel(dateStr);
            addAlert('info', 'Excelファイルをダウンロードしました');
        } catch {
            addAlert('error', 'Excel出力に失敗しました');
        }
    };

    const progressColor = !progress ? '#8a9bb5'
        : progress.progress_rate >= 80 ? '#27AE60'
            : progress.progress_rate >= 50 ? '#F39C12'
                : '#E74C3C';

    const SERVICE_COLORS_MAP: Record<string, string> = {
        '身体': '#3498DB', '家事': '#27AE60', '生活': '#8E44AD', '重度': '#E74C3C', '障がい': '#E67E22',
    };

    if (!user) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0f1923' }}>

            {/* ① ツールバー */}
            <div className="glass" style={{
                padding: '8px 12px',
                zIndex: 40,
                borderBottom: '1px solid #2d3f5a',
                position: 'sticky',
                top: 0,
            }}>
                {/* 上段：ロゴ + 日付 + メニュー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* ロゴ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '18px' }}>🚗</span>
                        <span className="desktop-only" style={{ fontSize: '15px', fontWeight: '700', color: '#e8edf5' }}>IkaruRoute</span>
                    </div>

                    {/* 日付ナビゲーション */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}>
                        <button
                            onClick={() => setTargetDate(d => subDays(d, 1))}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', minHeight: '36px', fontSize: '14px' }}
                        >◀</button>
                        <div style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid #2d3f5a',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#e8edf5',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                        }}>
                            {format(targetDate, 'M月d日（E）', { locale: ja })}
                        </div>
                        <button
                            onClick={() => setTargetDate(d => addDays(d, 1))}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', minHeight: '36px', fontSize: '14px' }}
                        >▶</button>
                        <button
                            onClick={() => setTargetDate(new Date())}
                            className="btn-secondary"
                            style={{ padding: '6px 8px', minHeight: '36px', fontSize: '11px' }}
                        >今日</button>
                    </div>

                    {/* デスクトップ：右側ボタン群 */}
                    <div className="desktop-only" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        {isCoordinatorOrAbove && (
                            <button
                                onClick={handleGenerateRoute}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{ padding: '7px 12px', fontSize: '13px', minHeight: '36px' }}
                            >
                                {isGenerating ? '⏳ 生成中...' : '🤖 AI生成'}
                            </button>
                        )}
                        {isCoordinatorOrAbove && (
                            <button onClick={handleExcelExport} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '13px', minHeight: '36px' }}>
                                📊 Excel
                            </button>
                        )}
                        {isCoordinatorOrAbove && (
                            <button
                                onClick={() => router.push('/staff')}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: '13px', minHeight: '36px' }}
                            >
                                👥 スタッフ
                            </button>
                        )}
                        {isCoordinatorOrAbove && (
                            <button
                                onClick={() => router.push('/clients')}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: '13px', minHeight: '36px' }}
                            >
                                🏠 利用者
                            </button>
                        )}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '5px 10px', background: 'rgba(255,255,255,0.06)',
                            borderRadius: '8px', border: '1px solid #2d3f5a',
                        }}>
                            <span style={{ fontSize: '12px', color: '#8a9bb5' }}>{user.name}</span>
                            <span style={{
                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                background: user.role === 'admin' ? 'rgba(231,76,60,0.2)' : user.role === 'coordinator' ? 'rgba(52,152,219,0.2)' : 'rgba(39,174,96,0.2)',
                                color: user.role === 'admin' ? '#E74C3C' : user.role === 'coordinator' ? '#3498DB' : '#27AE60',
                            }}>
                                {user.role === 'admin' ? '管理者' : user.role === 'coordinator' ? 'コーディ' : 'スタッフ'}
                            </span>
                        </div>
                        <button onClick={logout} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', minHeight: '36px' }}>
                            ログアウト
                        </button>
                    </div>

                    {/* モバイル：ハンバーガーメニュー */}
                    <div className="mobile-only" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {isCoordinatorOrAbove && unassignedVisits.length > 0 && (
                            <button
                                onClick={() => setShowUnassigned(true)}
                                style={{
                                    padding: '6px 10px', minHeight: '36px',
                                    background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
                                    borderRadius: '8px', color: '#E74C3C', fontSize: '12px', cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                未割当 {unassignedVisits.length}
                            </button>
                        )}
                        <button
                            onClick={() => setShowMenu(v => !v)}
                            style={{
                                padding: '6px 10px', minHeight: '36px',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid #2d3f5a',
                                borderRadius: '8px', color: '#e8edf5', fontSize: '18px', cursor: 'pointer',
                            }}
                        >
                            {showMenu ? '✕' : '☰'}
                        </button>
                    </div>
                </div>

                {/* 進捗バー（常時表示） */}
                {progress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#8a9bb5', whiteSpace: 'nowrap' }}>
                            完了 {progress.completed_visits}/{progress.total_visits}件
                        </span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                            <div style={{
                                height: '100%', width: `${progress.progress_rate}%`,
                                background: progressColor, borderRadius: '3px',
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: progressColor, whiteSpace: 'nowrap' }}>
                            {progress.progress_rate.toFixed(0)}%
                        </span>
                    </div>
                )}

                {/* モバイルメニュー展開 */}
                {showMenu && (
                    <div style={{
                        marginTop: '10px', paddingTop: '10px',
                        borderTop: '1px solid #2d3f5a',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: '#e8edf5', fontWeight: '600' }}>{user.name}</span>
                            <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                                background: user.role === 'admin' ? 'rgba(231,76,60,0.2)' : user.role === 'coordinator' ? 'rgba(52,152,219,0.2)' : 'rgba(39,174,96,0.2)',
                                color: user.role === 'admin' ? '#E74C3C' : user.role === 'coordinator' ? '#3498DB' : '#27AE60',
                            }}>
                                {user.role === 'admin' ? '管理者' : user.role === 'coordinator' ? 'コーディネーター' : 'スタッフ'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {isCoordinatorOrAbove && (
                                <button
                                    onClick={handleGenerateRoute}
                                    disabled={isGenerating}
                                    className="btn-primary"
                                    style={{ fontSize: '13px' }}
                                >
                                    {isGenerating ? '⏳ 生成中...' : '🤖 AI生成'}
                                </button>
                            )}
                            {isCoordinatorOrAbove && (
                                <button onClick={handleExcelExport} className="btn-secondary" style={{ fontSize: '13px' }}>
                                    📊 Excel出力
                                </button>
                            )}
                            {isCoordinatorOrAbove && (
                                <button onClick={() => { router.push('/staff'); setShowMenu(false); }} className="btn-secondary" style={{ fontSize: '13px' }}>
                                    👥 スタッフ管理
                                </button>
                            )}
                            {isCoordinatorOrAbove && (
                                <button onClick={() => { router.push('/clients'); setShowMenu(false); }} className="btn-secondary" style={{ fontSize: '13px' }}>
                                    🏠 利用者管理
                                </button>
                            )}
                            <button onClick={logout} className="btn-secondary" style={{ fontSize: '13px', gridColumn: isCoordinatorOrAbove ? 'auto' : '1 / -1' }}>
                                ログアウト
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ② アラートバナー */}
            <div style={{ position: 'sticky', top: 0, zIndex: 35 }}>
                {alerts.map(alert => (
                    <div
                        key={alert.id}
                        className="alert-banner"
                        style={{
                            padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: alert.type === 'error' ? 'rgba(231,76,60,0.95)' : alert.type === 'warning' ? 'rgba(243,156,18,0.95)' : 'rgba(52,152,219,0.95)',
                            color: 'white', fontSize: '13px', fontWeight: '500',
                        }}
                    >
                        <span>
                            {alert.type === 'error' ? '❌ ' : alert.type === 'warning' ? '⚠️ ' : 'ℹ️ '}
                            {alert.message}
                        </span>
                        <button
                            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0 4px', minWidth: '32px', minHeight: '32px' }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* メインコンテンツ */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* ガントチャート本体 */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#8a9bb5' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                                <div>データを読み込み中...</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <GanttChart
                                staffList={staffList}
                                visits={visits.filter(v => v.staff_id)}
                                onVisitClick={setSelectedVisit}
                                onVisitMove={handleVisitMove}
                                targetDate={dateStr}
                            />
                        </div>
                    )}

                    {/* 売上サマリーパネル */}
                    {isCoordinatorOrAbove && revenue.length > 0 && (
                        <RevenuePanel
                            data={revenue}
                            onCardClick={(staffId) => {
                                if (isAdmin) addAlert('info', `${revenue.find(r => r.staff_id === staffId)?.staff_name}の売上詳細`);
                            }}
                        />
                    )}
                </div>

                {/* 未割当トレイ（デスクトップ：サイドバー） */}
                {isCoordinatorOrAbove && (
                    <div className="desktop-only" style={{
                        width: '200px', minWidth: '200px',
                        background: '#1a2535', borderLeft: '1px solid #2d3f5a',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '10px 12px', borderBottom: '1px solid #2d3f5a',
                            fontSize: '13px', fontWeight: '600', color: '#e8edf5',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span>📋 未割当</span>
                            <span style={{
                                background: unassignedVisits.length > 0 ? 'rgba(231,76,60,0.2)' : 'rgba(39,174,96,0.2)',
                                color: unassignedVisits.length > 0 ? '#E74C3C' : '#27AE60',
                                fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                            }}>
                                {unassignedVisits.length}件
                            </span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {unassignedVisits.length === 0 ? (
                                <div style={{ color: '#8a9bb5', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                                    未割当なし ✓
                                </div>
                            ) : (
                                unassignedVisits.map(visit => {
                                    const start = new Date(visit.scheduled_start);
                                    const end = new Date(visit.scheduled_end);
                                    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
                                    const color = SERVICE_COLORS_MAP[visit.service_type] || '#8a9bb5';
                                    return (
                                        <div
                                            key={visit.visit_id}
                                            onClick={() => setSelectedVisit(visit)}
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderLeft: `3px solid ${color}`,
                                                borderRadius: '8px', padding: '10px', marginBottom: '8px',
                                                cursor: 'pointer', transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                        >
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#e8edf5', marginBottom: '3px' }}>
                                                {visit.client?.name || '不明'}
                                            </div>
                                            <div style={{ fontSize: '11px', color }}>{visit.service_type} {duration}分</div>
                                            <div style={{ fontSize: '10px', color: '#8a9bb5', marginTop: '2px' }}>
                                                {start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜{' '}
                                                {end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* モバイル：未割当ボトムシート */}
            {showUnassigned && isCoordinatorOrAbove && (
                <div
                    className="modal-overlay"
                    style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                    onClick={() => setShowUnassigned(false)}
                >
                    <div
                        className="bottom-sheet safe-area-bottom"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bottom-sheet-handle" />
                        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#e8edf5' }}>📋 未割当訪問</span>
                            <button
                                onClick={() => setShowUnassigned(false)}
                                style={{ background: 'none', border: 'none', color: '#8a9bb5', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                            >✕</button>
                        </div>
                        <div style={{ padding: '8px 16px 16px', overflowY: 'auto' }}>
                            {unassignedVisits.length === 0 ? (
                                <div style={{ color: '#8a9bb5', textAlign: 'center', padding: '20px' }}>未割当なし ✓</div>
                            ) : (
                                unassignedVisits.map(visit => {
                                    const start = new Date(visit.scheduled_start);
                                    const end = new Date(visit.scheduled_end);
                                    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
                                    const color = SERVICE_COLORS_MAP[visit.service_type] || '#8a9bb5';
                                    return (
                                        <div
                                            key={visit.visit_id}
                                            onClick={() => { setSelectedVisit(visit); setShowUnassigned(false); }}
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderLeft: `4px solid ${color}`,
                                                borderRadius: '10px', padding: '14px', marginBottom: '10px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8edf5', marginBottom: '4px' }}>
                                                {visit.client?.name || '不明'}
                                            </div>
                                            <div style={{ fontSize: '12px', color, marginBottom: '2px' }}>{visit.service_type} {duration}分</div>
                                            <div style={{ fontSize: '11px', color: '#8a9bb5' }}>
                                                {start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜{' '}
                                                {end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 訪問詳細モーダル */}
            {selectedVisit && (
                <VisitModal
                    visit={selectedVisit}
                    staffList={staffList}
                    onClose={() => setSelectedVisit(null)}
                    onUpdate={handleVisitUpdate}
                    canEdit={isCoordinatorOrAbove}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    );
}
