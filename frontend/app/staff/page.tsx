'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { staffApi, Staff } from '@/lib/api';

const SKILL_OPTIONS = ['身体', '家事', '生活', '重度', '障がい'];
const ROLE_OPTIONS = [
    { value: 'admin', label: '管理者' },
    { value: 'coordinator', label: 'コーディネーター' },
    { value: 'staff', label: 'スタッフ' },
];

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#e8edf5', fontSize: '16px', // 16px以上でiOSズーム防止
};

export default function StaffPage() {
    const { user, isAdmin, isCoordinatorOrAbove } = useAuth();
    const router = useRouter();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Staff | null>(null);
    const [form, setForm] = useState({
        name: '', email: '', password: 'password123',
        role: 'staff', skill_types: [] as string[],
        max_hours_day: 8.0, hourly_rate: 1500, home_address: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        loadStaff();
    }, [user]);

    const loadStaff = async () => {
        setIsLoading(true);
        try {
            const res = await staffApi.list();
            setStaffList(res.data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (editTarget) {
                await staffApi.update(editTarget.staff_id, {
                    name: form.name, role: form.role,
                    skill_types: form.skill_types,
                    max_hours_day: form.max_hours_day,
                    hourly_rate: form.hourly_rate,
                    home_address: form.home_address,
                });
            } else {
                await staffApi.create(form);
            }
            setShowForm(false);
            setEditTarget(null);
            await loadStaff();
        } catch (err: any) {
            setError(err.response?.data?.detail || '保存に失敗しました');
        }
    };

    const handleEdit = (staff: Staff) => {
        setEditTarget(staff);
        setForm({
            name: staff.name, email: staff.email, password: '',
            role: staff.role, skill_types: staff.skill_types,
            max_hours_day: staff.max_hours_day, hourly_rate: staff.hourly_rate,
            home_address: staff.home_address || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (staffId: string) => {
        if (!confirm('このスタッフを削除しますか？')) return;
        await staffApi.delete(staffId);
        await loadStaff();
    };

    const ROLE_COLORS: Record<string, string> = {
        admin: '#E74C3C', coordinator: '#3498DB', staff: '#27AE60',
    };

    return (
        <div style={{ minHeight: '100dvh', background: '#0f1923' }}>
            {/* ヘッダー */}
            <div className="glass" style={{
                padding: '12px 16px',
                borderBottom: '1px solid #2d3f5a',
                position: 'sticky', top: 0, zIndex: 40,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => router.push('/route')}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '13px', minHeight: '40px' }}
                    >
                        ← 戻る
                    </button>
                    <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#e8edf5' }}>👤 スタッフ管理</h1>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditTarget(null);
                            setForm({ name: '', email: '', password: 'password123', role: 'staff', skill_types: [], max_hours_day: 8.0, hourly_rate: 1500, home_address: '' });
                            setShowForm(true);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '13px', padding: '8px 14px' }}
                    >
                        + 追加
                    </button>
                )}
            </div>

            {/* スタッフ一覧 */}
            <div style={{ padding: '16px' }}>
                {isLoading ? (
                    <div style={{ color: '#8a9bb5', textAlign: 'center', padding: '40px' }}>読み込み中...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {staffList.map(staff => (
                            <div key={staff.staff_id} className="glass" style={{ borderRadius: '14px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8edf5' }}>{staff.name}</div>
                                        <div style={{ fontSize: '12px', color: '#8a9bb5', marginTop: '2px' }}>{staff.email}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                                        background: `${ROLE_COLORS[staff.role]}20`,
                                        color: ROLE_COLORS[staff.role],
                                        fontWeight: '600', flexShrink: 0,
                                    }}>
                                        {ROLE_OPTIONS.find(r => r.value === staff.role)?.label}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                                    {staff.skill_types.map(skill => (
                                        <span key={skill} style={{
                                            fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.08)', color: '#8a9bb5',
                                        }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ fontSize: '12px', color: '#8a9bb5', marginBottom: '12px' }}>
                                    上限: {staff.max_hours_day}h/日 | 時給: ¥{staff.hourly_rate.toLocaleString()}
                                </div>

                                {isAdmin && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEdit(staff)}
                                            className="btn-secondary"
                                            style={{ fontSize: '13px', minHeight: '40px' }}
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(staff.staff_id)}
                                            style={{
                                                fontSize: '13px', borderRadius: '8px', minHeight: '40px',
                                                background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
                                                color: '#E74C3C', cursor: 'pointer',
                                            }}
                                        >
                                            削除
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* フォームモーダル（ボトムシート） */}
            {showForm && (
                <div
                    className="modal-overlay"
                    style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
                >
                    <div className="modal-content glass" style={{
                        width: '100%', borderRadius: '20px 20px 0 0',
                        padding: '0', maxHeight: '92dvh', overflowY: 'auto',
                    }}>
                        <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '40px', height: '4px', background: '#2d3f5a', borderRadius: '2px' }} />
                        </div>

                        <div style={{ padding: '0 20px 32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e8edf5' }}>
                                    {editTarget ? 'スタッフ編集' : 'スタッフ追加'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{ background: 'none', border: 'none', color: '#8a9bb5', fontSize: '20px', cursor: 'pointer', minWidth: '44px', minHeight: '44px' }}
                                >✕</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {[
                                    { label: '氏名 *', key: 'name', type: 'text', placeholder: '山田 太郎' },
                                    { label: 'メールアドレス *', key: 'email', type: 'email', placeholder: 'yamada@example.com' },
                                    ...(!editTarget ? [{ label: 'パスワード *', key: 'password', type: 'password', placeholder: '初期パスワード' }] : []),
                                    { label: '自宅住所', key: 'home_address', type: 'text', placeholder: '東京都練馬区...' },
                                ].map(field => (
                                    <div key={field.key} style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            value={(form as any)[field.key]}
                                            onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder}
                                            required={field.label.includes('*')}
                                            style={inputStyle}
                                        />
                                    </div>
                                ))}

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>権限ロール *</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                                        style={inputStyle}
                                    >
                                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>対応サービス種別 *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        {SKILL_OPTIONS.map(skill => (
                                            <label key={skill} style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                cursor: 'pointer', fontSize: '14px', color: '#e8edf5',
                                                background: form.skill_types.includes(skill) ? 'rgba(47,95,168,0.3)' : 'rgba(255,255,255,0.04)',
                                                border: form.skill_types.includes(skill) ? '1px solid #00b4d8' : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px', padding: '10px 8px', minHeight: '44px',
                                                justifyContent: 'center',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.skill_types.includes(skill)}
                                                    onChange={(e) => setForm(f => ({
                                                        ...f,
                                                        skill_types: e.target.checked ? [...f.skill_types, skill] : f.skill_types.filter(s => s !== skill)
                                                    }))}
                                                    style={{ display: 'none' }}
                                                />
                                                {skill}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>日次上限時間 *</label>
                                        <input
                                            type="number" min="0.5" max="24" step="0.5"
                                            value={form.max_hours_day}
                                            onChange={(e) => setForm(f => ({ ...f, max_hours_day: parseFloat(e.target.value) }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>時給単価（円）*</label>
                                        <input
                                            type="number" min="0" max="99999"
                                            value={form.hourly_rate}
                                            onChange={(e) => setForm(f => ({ ...f, hourly_rate: parseInt(e.target.value) }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {error && <div style={{ color: '#E74C3C', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(231,76,60,0.1)', borderRadius: '8px' }}>{error}</div>}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: '15px' }}>キャンセル</button>
                                    <button type="submit" className="btn-primary" style={{ fontSize: '15px' }}>保存</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
