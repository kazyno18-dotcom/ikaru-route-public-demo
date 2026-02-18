'use client';

import React, { useState } from 'react';
import { RevenueSummary } from '@/lib/api';

interface RevenuePanelProps {
    data: RevenueSummary[];
    onCardClick: (staffId: string) => void;
}

export default function RevenuePanel({ data, onCardClick }: RevenuePanelProps) {
    const [isVisible, setIsVisible] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ikaruRoute_revenueVisible') !== 'false';
        }
        return true;
    });

    const toggleVisibility = () => {
        const newVal = !isVisible;
        setIsVisible(newVal);
        localStorage.setItem('ikaruRoute_revenueVisible', String(newVal));
    };

    const getCardBg = (rate: number) => {
        if (rate >= 80) return 'rgba(39,174,96,0.15)';
        if (rate >= 50) return 'rgba(243,156,18,0.15)';
        return 'rgba(255,255,255,0.04)';
    };

    const getProgressColor = (rate: number) => {
        if (rate >= 80) return '#27AE60';
        if (rate >= 50) return '#F39C12';
        return '#8a9bb5';
    };

    return (
        <div style={{
            background: '#1a2535',
            borderTop: '2px solid #2d3f5a',
            padding: '10px 12px',
            flexShrink: 0,
        }}>
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isVisible ? '10px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e8edf5' }}>💰 売上サマリー</span>
                    <span className="desktop-only" style={{ fontSize: '11px', color: '#8a9bb5' }}>（管理者・コーディネーター専用）</span>
                </div>
                <button
                    onClick={toggleVisibility}
                    style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid #2d3f5a',
                        borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                        color: '#8a9bb5', fontSize: '12px', minHeight: '32px',
                    }}
                >
                    {isVisible ? '▼ 閉じる' : '▲ 開く'}
                </button>
            </div>

            {isVisible && (
                <div style={{
                    display: 'flex', gap: '10px',
                    overflowX: 'auto', paddingBottom: '4px',
                    WebkitOverflowScrolling: 'touch' as any,
                    scrollSnapType: 'x mandatory',
                }}>
                    {data.length === 0 ? (
                        <div style={{ color: '#8a9bb5', fontSize: '13px', padding: '8px' }}>
                            売上データがありません
                        </div>
                    ) : (
                        data.map(item => (
                            <div
                                key={item.staff_id}
                                onClick={() => onCardClick(item.staff_id)}
                                className="revenue-card"
                                style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    background: getCardBg(item.achievement_rate),
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '12px',
                                    cursor: 'pointer',
                                    scrollSnapAlign: 'start',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ fontSize: '11px', color: '#8a9bb5', marginBottom: '4px', fontWeight: '500' }}>
                                    {item.staff_name}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#e8edf5', marginBottom: '2px' }}>
                                    ¥{item.today_revenue.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '11px', color: '#8a9bb5', marginBottom: '8px' }}>
                                    {item.visit_count}件
                                    {item.target_amount > 0 && ` / 目標 ¥${item.target_amount.toLocaleString()}`}
                                </div>

                                {item.target_amount > 0 && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                            <span style={{ fontSize: '10px', color: '#8a9bb5' }}>達成率</span>
                                            <span style={{ fontSize: '10px', color: getProgressColor(item.achievement_rate), fontWeight: '600' }}>
                                                {item.achievement_rate.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.min(item.achievement_rate, 100)}%`,
                                                background: getProgressColor(item.achievement_rate),
                                                borderRadius: '2px',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
