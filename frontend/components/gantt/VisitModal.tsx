'use client';

import React, { useState, useEffect } from 'react';
import { Visit, Staff } from '@/lib/api';

interface VisitModalProps {
    visit: Visit | null;
    staffList: Staff[];
    onClose: () => void;
    onUpdate: (visitId: string, data: any) => void;
    canEdit: boolean;
    isAdmin: boolean;
}

const STATUS_OPTIONS = [
    { value: '予定', label: '予定', color: '#8a9bb5' },
    { value: '完了', label: '完了', color: '#27AE60' },
    { value: '中止', label: '中止', color: '#E74C3C' },
    { value: '未実施', label: '未実施', color: '#F39C12' },
];

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e8edf5', fontSize: '16px', // 16px以上でiOSズーム防止
};

export default function VisitModal({ visit, staffList, onClose, onUpdate, canEdit, isAdmin }: VisitModalProps) {
    const [actualStart, setActualStart] = useState(
        visit?.actual_start ? new Date(visit.actual_start).toTimeString().slice(0, 5) : ''
    );
    const [actualEnd, setActualEnd] = useState(
        visit?.actual_end ? new Date(visit.actual_end).toTimeString().slice(0, 5) : ''
    );
    const [status, setStatus] = useState(visit?.status || '予定');
    const [note, setNote] = useState(visit?.visit_note || '');
    const [companionId, setCompanionId] = useState(visit?.companion_staff_id || '');
    const [visitType, setVisitType] = useState(visit?.visit_type || 'normal');
    const [isSaving, setIsSaving] = useState(false);

    // ESCキーで閉じる
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    if (!visit) return null;

    const handleSave = async () => {
        setIsSaving(true);
        const dateStr = visit.date;
        const toDateTime = (timeStr: string) => timeStr ? `${dateStr}T${timeStr}:00` : undefined;

        const updateData: any = { status, visit_note: note };
        if (actualStart) updateData.actual_start = toDateTime(actualStart);
        if (actualEnd) updateData.actual_end = toDateTime(actualEnd);
        if (canEdit) {
            updateData.companion_staff_id = companionId || null;
            updateData.visit_type = visitType;
        }

        onUpdate(visit.visit_id, updateData);
        setIsSaving(false);
        onClose();
    };

    const scheduledStart = new Date(visit.scheduled_start);
    const scheduledEnd = new Date(visit.scheduled_end);
    const duration = Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000);

    return (
        <div
            className="modal-overlay"
            style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* モバイル：ボトムシート / デスクトップ：センターモーダル */}
            <div
                className="modal-content glass"
                style={{
                    width: '100%',
                    borderRadius: '20px 20px 0 0',
                    padding: '0',
                    maxHeight: '92dvh',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch' as any,
                }}
            >
                {/* ドラッグハンドル */}
                <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '40px', height: '4px', background: '#2d3f5a', borderRadius: '2px' }} />
                </div>

                <div style={{ padding: '0 20px 24px' }}>
                    {/* ヘッダー */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e8edf5', marginBottom: '4px' }}>
                                {visit.client?.name || '不明'} 様
                            </h2>
                            <div style={{ fontSize: '13px', color: '#8a9bb5' }}>
                                {scheduledStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜{' '}
                                {scheduledEnd.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                （{duration}分）
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.08)', border: 'none',
                                borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                                color: '#8a9bb5', fontSize: '18px', minWidth: '44px', minHeight: '44px',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 基本情報 */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                        padding: '14px', marginBottom: '16px',
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                            <div>
                                <span style={{ color: '#8a9bb5' }}>サービス: </span>
                                <span style={{ color: '#e8edf5', fontWeight: '600' }}>{visit.service_type}</span>
                            </div>
                            <div>
                                <span style={{ color: '#8a9bb5' }}>担当: </span>
                                <span style={{ color: '#e8edf5', fontWeight: '600' }}>{visit.staff?.name || '未割当'}</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ color: '#8a9bb5' }}>住所: </span>
                                <span style={{ color: '#e8edf5' }}>{visit.client?.address || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 体制設定（コーディネーター以上） */}
                    {canEdit && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                                体制設定
                            </label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                {['normal', 'two_staff', 'accompany'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setVisitType(type)}
                                        style={{
                                            flex: 1, padding: '10px 6px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                                            background: visitType === type ? '#2f5fa8' : 'rgba(255,255,255,0.06)',
                                            border: visitType === type ? '1px solid #00b4d8' : '1px solid rgba(255,255,255,0.1)',
                                            color: '#e8edf5', minHeight: '44px',
                                        }}
                                    >
                                        {type === 'normal' ? '通常' : type === 'two_staff' ? '👥 2人' : '同行'}
                                    </button>
                                ))}
                            </div>
                            {visitType === 'two_staff' && (
                                <select
                                    value={companionId}
                                    onChange={(e) => setCompanionId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">第2スタッフを選択...</option>
                                    {staffList.filter(s => s.staff_id !== visit.staff_id).map(s => (
                                        <option key={s.staff_id} value={s.staff_id}>{s.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* 実績入力 */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                            実績入力
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#8a9bb5', fontSize: '11px', marginBottom: '4px' }}>開始時刻</label>
                                <input
                                    type="time"
                                    value={actualStart}
                                    onChange={(e) => setActualStart(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#8a9bb5', fontSize: '11px', marginBottom: '4px' }}>終了時刻</label>
                                <input
                                    type="time"
                                    value={actualEnd}
                                    onChange={(e) => setActualEnd(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* ステータス */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatus(opt.value)}
                                    style={{
                                        padding: '10px 4px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                                        background: status === opt.value ? `${opt.color}25` : 'rgba(255,255,255,0.06)',
                                        border: status === opt.value ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                                        color: status === opt.value ? opt.color : '#8a9bb5',
                                        fontWeight: status === opt.value ? '700' : '400',
                                        minHeight: '44px',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 特記事項 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                            特記事項
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="特記事項を入力..."
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {/* ボタン */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button onClick={onClose} className="btn-secondary" style={{ fontSize: '15px' }}>
                            キャンセル
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ fontSize: '15px' }}>
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
