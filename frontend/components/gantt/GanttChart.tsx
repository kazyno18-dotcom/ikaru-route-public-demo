'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Visit, Staff } from '@/lib/api';

const SERVICE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
    '身体': { bg: 'rgba(52,152,219,0.85)', border: '#3498DB', label: '身体' },
    '家事': { bg: 'rgba(39,174,96,0.85)', border: '#27AE60', label: '家事' },
    '生活': { bg: 'rgba(142,68,173,0.85)', border: '#8E44AD', label: '生活' },
    '重度': { bg: 'rgba(231,76,60,0.85)', border: '#E74C3C', label: '重度' },
    '障がい': { bg: 'rgba(230,126,34,0.85)', border: '#E67E22', label: '障がい' },
};

const SLOT_HEIGHT = 32; // px per 15min slot
const STAFF_COL_WIDTH = 160; // px
const TIME_COL_WIDTH = 60; // px
const SLOT_WIDTH = 80; // px per 15min slot (horizontal)
const START_HOUR = 5; // 5:00 AM
const TOTAL_SLOTS = 96; // 24h * 4 slots

function timeToSlot(dateStr: string): number {
    const d = new Date(dateStr);
    const hour = d.getHours();
    const min = d.getMinutes();
    const relHour = (hour - START_HOUR + 24) % 24;
    return relHour * 4 + Math.floor(min / 15);
}

function slotToLabel(slot: number): string {
    const totalMin = slot * 15;
    const hour = (START_HOUR + Math.floor(totalMin / 60)) % 24;
    const min = totalMin % 60;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

interface GanttChartProps {
    staffList: Staff[];
    visits: Visit[];
    onVisitClick: (visit: Visit) => void;
    onVisitMove: (visitId: string, newStaffId: string, newStart: string, newEnd: string) => void;
    targetDate: string;
}

export default function GanttChart({ staffList, visits, onVisitClick, onVisitMove, targetDate }: GanttChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<{ visitId: string; offsetSlot: number } | null>(null);
    const [dropTarget, setDropTarget] = useState<{ staffId: string; slot: number } | null>(null);

    // スタッフ別訪問マップ
    const visitsByStaff: Record<string, Visit[]> = {};
    staffList.forEach(s => { visitsByStaff[s.staff_id] = []; });
    visits.forEach(v => {
        if (v.staff_id && visitsByStaff[v.staff_id]) {
            visitsByStaff[v.staff_id].push(v);
        }
    });

    // スタッフ別稼働時間計算
    const staffHours: Record<string, number> = {};
    staffList.forEach(s => {
        const staffVisits = visitsByStaff[s.staff_id] || [];
        const totalMin = staffVisits.reduce((acc, v) => {
            const start = new Date(v.scheduled_start);
            const end = new Date(v.scheduled_end);
            return acc + (end.getTime() - start.getTime()) / 60000;
        }, 0);
        staffHours[s.staff_id] = totalMin / 60;
    });

    const handleDragStart = (e: React.DragEvent, visit: Visit) => {
        const startSlot = timeToSlot(visit.scheduled_start);
        const nowSlot = Math.floor((e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - TIME_COL_WIDTH) / SLOT_WIDTH);
        setDragging({ visitId: visit.visit_id, offsetSlot: nowSlot - startSlot });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, staffId: string, slot: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ staffId, slot });
    };

    const handleDrop = (e: React.DragEvent, staffId: string, slot: number) => {
        e.preventDefault();
        if (!dragging) return;

        const visit = visits.find(v => v.visit_id === dragging.visitId);
        if (!visit) return;

        const newStartSlot = slot - dragging.offsetSlot;
        const durationSlots = timeToSlot(visit.scheduled_end) - timeToSlot(visit.scheduled_start);

        const dateBase = new Date(targetDate);
        dateBase.setHours(START_HOUR, 0, 0, 0);
        const newStart = new Date(dateBase.getTime() + newStartSlot * 15 * 60000);
        const newEnd = new Date(newStart.getTime() + durationSlots * 15 * 60000);

        onVisitMove(
            dragging.visitId,
            staffId,
            newStart.toISOString(),
            newEnd.toISOString()
        );
        setDragging(null);
        setDropTarget(null);
    };

    return (
        <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
            <div style={{ display: 'flex', minWidth: `${TIME_COL_WIDTH + TOTAL_SLOTS * SLOT_WIDTH}px` }}>
                {/* 時間軸ヘッダー */}
                <div style={{ position: 'sticky', left: 0, zIndex: 30, background: '#1a2535' }}>
                    {/* スタッフ名列ヘッダー */}
                    <div style={{
                        height: '48px', width: `${TIME_COL_WIDTH}px`,
                        background: '#1a3a6b', borderBottom: '2px solid #2d3f5a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: '#8a9bb5', fontWeight: '600',
                    }}>
                        時刻
                    </div>
                    {/* スタッフ行 */}
                    {staffList.map(staff => {
                        const hours = staffHours[staff.staff_id] || 0;
                        const ratio = Math.min(hours / staff.max_hours_day, 1);
                        const indicatorColor = ratio >= 1 ? '#E74C3C' : ratio >= 0.9 ? '#F39C12' : '#27AE60';

                        return (
                            <div key={staff.staff_id} style={{
                                height: `${SLOT_HEIGHT * 4}px`, // 1時間分の高さ
                                width: `${TIME_COL_WIDTH}px`,
                                background: '#1a2535',
                                borderBottom: '1px solid #2d3f5a',
                                padding: '8px',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#e8edf5', marginBottom: '4px' }}>
                                    {staff.name}
                                </div>
                                <div style={{ fontSize: '10px', color: '#8a9bb5', marginBottom: '4px' }}>
                                    {hours.toFixed(1)}h / {staff.max_hours_day}h
                                </div>
                                <div style={{ height: '4px', background: '#2d3f5a', borderRadius: '2px' }}>
                                    <div style={{
                                        height: '100%', width: `${ratio * 100}%`,
                                        background: indicatorColor, borderRadius: '2px',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ガントチャート本体 */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {/* 時間軸ヘッダー */}
                    <div style={{
                        height: '48px', display: 'flex',
                        position: 'sticky', top: 0, zIndex: 20, background: '#1a3a6b',
                        borderBottom: '2px solid #2d3f5a',
                    }}>
                        {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                            const isHour = i % 4 === 0;
                            return (
                                <div key={i} style={{
                                    width: `${SLOT_WIDTH}px`, minWidth: `${SLOT_WIDTH}px`,
                                    borderRight: isHour ? '2px solid #2f5fa8' : '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', color: isHour ? '#e8edf5' : '#8a9bb5',
                                    fontWeight: isHour ? '600' : '400',
                                }}>
                                    {isHour ? slotToLabel(i) : ''}
                                </div>
                            );
                        })}
                    </div>

                    {/* スタッフ行 */}
                    {staffList.map((staff, staffIdx) => (
                        <div key={staff.staff_id} style={{
                            height: `${SLOT_HEIGHT * 4}px`,
                            position: 'relative',
                            borderBottom: '1px solid #2d3f5a',
                            background: staffIdx % 2 === 0 ? '#1a2535' : '#1e2d42',
                        }}>
                            {/* 時間グリッド */}
                            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                                const isHour = i % 4 === 0;
                                const isDropTarget = dropTarget?.staffId === staff.staff_id && dropTarget?.slot === i;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${i * SLOT_WIDTH}px`,
                                            top: 0,
                                            width: `${SLOT_WIDTH}px`,
                                            height: '100%',
                                            borderRight: isHour ? '1px solid rgba(47,95,168,0.3)' : '1px solid rgba(255,255,255,0.03)',
                                            background: isDropTarget ? 'rgba(0,180,216,0.1)' : 'transparent',
                                        }}
                                        onDragOver={(e) => handleDragOver(e, staff.staff_id, i)}
                                        onDrop={(e) => handleDrop(e, staff.staff_id, i)}
                                    />
                                );
                            })}

                            {/* 訪問ブロック */}
                            {(visitsByStaff[staff.staff_id] || []).map(visit => {
                                const startSlot = timeToSlot(visit.scheduled_start);
                                const endSlot = timeToSlot(visit.scheduled_end);
                                const durationSlots = Math.max(endSlot - startSlot, 1);
                                const colors = SERVICE_COLORS[visit.service_type] || { bg: 'rgba(100,100,100,0.8)', border: '#666', label: visit.service_type };
                                const isTwoStaff = visit.visit_type === 'two_staff';
                                const isAccompany = visit.visit_type === 'accompany';
                                const isCompleted = visit.status === '完了';
                                const isCancelled = visit.status === '中止';

                                return (
                                    <div
                                        key={visit.visit_id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, visit)}
                                        onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                                        onClick={() => onVisitClick(visit)}
                                        style={{
                                            position: 'absolute',
                                            left: `${startSlot * SLOT_WIDTH + 2}px`,
                                            top: '6px',
                                            width: `${durationSlots * SLOT_WIDTH - 4}px`,
                                            height: `${SLOT_HEIGHT * 4 - 12}px`,
                                            background: isCancelled ? 'rgba(100,100,100,0.4)' : colors.bg,
                                            borderLeft: isTwoStaff ? `3px solid #F39C12` : `3px solid ${colors.border}`,
                                            borderTop: isTwoStaff ? `2px solid #F39C12` : isAccompany ? `2px dashed #95A5A6` : `none`,
                                            borderRight: isTwoStaff ? `2px solid #F39C12` : isAccompany ? `2px dashed #95A5A6` : `none`,
                                            borderBottom: isTwoStaff ? `2px solid #F39C12` : isAccompany ? `2px dashed #95A5A6` : `none`,
                                            borderRadius: '6px',
                                            padding: '4px 6px',
                                            cursor: 'grab',
                                            zIndex: 10,
                                            overflow: 'hidden',
                                            opacity: isCancelled ? 0.5 : 1,
                                            boxShadow: isTwoStaff
                                                ? '0 0 0 1px #F39C12, 0 2px 8px rgba(0,0,0,0.3)'
                                                : '0 2px 8px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.1s, box-shadow 0.1s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
                                            e.currentTarget.style.zIndex = '20';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = isTwoStaff ? '0 0 0 1px #F39C12, 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.3)';
                                            e.currentTarget.style.zIndex = '10';
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'white', lineHeight: 1.3 }}>
                                            {visit.client?.name || '不明'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
                                            {colors.label} {Math.round((new Date(visit.scheduled_end).getTime() - new Date(visit.scheduled_start).getTime()) / 60000)}分
                                        </div>
                                        {isTwoStaff && (
                                            <div style={{ fontSize: '9px', color: '#F39C12', fontWeight: '600' }}>👥 2人体制</div>
                                        )}
                                        {isCompleted && (
                                            <div style={{ fontSize: '9px', color: '#27AE60' }}>✓ 完了</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* 凡例 */}
            <div style={{
                display: 'flex', gap: '12px', padding: '8px 16px',
                background: '#1a2535', borderTop: '1px solid #2d3f5a',
                flexWrap: 'wrap', alignItems: 'center',
            }}>
                <span style={{ fontSize: '11px', color: '#8a9bb5', fontWeight: '600' }}>凡例:</span>
                {Object.entries(SERVICE_COLORS).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '12px', height: '12px', background: val.bg, borderRadius: '2px', borderLeft: `3px solid ${val.border}` }} />
                        <span style={{ fontSize: '11px', color: '#8a9bb5' }}>{val.label}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(52,152,219,0.8)', borderRadius: '2px', border: '2px solid #F39C12' }} />
                    <span style={{ fontSize: '11px', color: '#8a9bb5' }}>2人体制</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(100,100,100,0.5)', borderRadius: '2px', border: '2px dashed #95A5A6' }} />
                    <span style={{ fontSize: '11px', color: '#8a9bb5' }}>同行</span>
                </div>
            </div>
        </div>
    );
}
