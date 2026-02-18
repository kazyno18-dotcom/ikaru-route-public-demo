'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clientApi, Client } from '@/lib/api';

const CARE_LEVELS = ['要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'];
const SERVICE_TYPES = ['身体', '家事', '生活', '重度', '障がい'];

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#e8edf5', fontSize: '16px', // 16px以上でiOSズーム防止
};

export default function ClientsPage() {
    const { user, isCoordinatorOrAbove } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Client | null>(null);
    const [form, setForm] = useState({
        name: '', address: '', care_level: '要介護1', service_type: '身体',
        visit_duration: 60, requires_two_staff: false,
        preferred_time_start: '', notes: '',
    });
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        if (!isCoordinatorOrAbove) { router.push('/route'); return; }
        loadClients();
    }, [user]);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            const res = await clientApi.list();
            setClients(res.data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (editTarget) {
                await clientApi.update(editTarget.client_id, form);
            } else {
                await clientApi.create(form);
            }
            setShowForm(false);
            setEditTarget(null);
            await loadClients();
        } catch (err: any) {
            setError(err.response?.data?.detail || '保存に失敗しました');
        }
    };

    const handleEdit = (client: Client) => {
        setEditTarget(client);
        setForm({
            name: client.name, address: client.address,
            care_level: client.care_level, service_type: client.service_type,
            visit_duration: client.visit_duration,
            requires_two_staff: client.requires_two_staff,
            preferred_time_start: client.preferred_time_start || '',
            notes: client.notes || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm('この利用者を削除しますか？')) return;
        await clientApi.delete(clientId);
        await loadClients();
    };

    const SERVICE_COLORS: Record<string, string> = {
        '身体': '#3498DB', '家事': '#27AE60', '生活': '#8E44AD', '重度': '#E74C3C', '障がい': '#E67E22',
    };

    const filteredClients = clients.filter(c =>
        c.name.includes(searchQuery) || c.address.includes(searchQuery) || c.service_type.includes(searchQuery)
    );

    return (
        <div style={{ minHeight: '100dvh', background: '#0f1923' }}>
            {/* ヘッダー */}
            <div className="glass" style={{
                padding: '12px 16px',
                borderBottom: '1px solid #2d3f5a',
                position: 'sticky', top: 0, zIndex: 40,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => router.push('/route')}
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '13px', minHeight: '40px' }}
                        >
                            ← 戻る
                        </button>
                        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#e8edf5' }}>🏠 利用者管理</h1>
                        <span style={{ fontSize: '12px', color: '#8a9bb5' }}>{clients.length}名</span>
                    </div>
                    <button
                        onClick={() => {
                            setEditTarget(null);
                            setForm({ name: '', address: '', care_level: '要介護1', service_type: '身体', visit_duration: 60, requires_two_staff: false, preferred_time_start: '', notes: '' });
                            setShowForm(true);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '13px', padding: '8px 14px' }}
                    >
                        + 追加
                    </button>
                </div>
                {/* 検索バー */}
                <input
                    type="text"
                    placeholder="名前・住所・サービスで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        ...inputStyle,
                        fontSize: '14px',
                        padding: '10px 14px',
                    }}
                />
            </div>

            {/* 利用者一覧 */}
            <div style={{ padding: '16px' }}>
                {isLoading ? (
                    <div style={{ color: '#8a9bb5', textAlign: 'center', padding: '40px' }}>読み込み中...</div>
                ) : filteredClients.length === 0 ? (
                    <div style={{ color: '#8a9bb5', textAlign: 'center', padding: '40px' }}>
                        {searchQuery ? '検索結果がありません' : '利用者がいません'}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {filteredClients.map(client => (
                            <div key={client.client_id} className="glass" style={{ borderRadius: '14px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8edf5' }}>{client.name}</div>
                                        <div style={{ fontSize: '11px', color: '#8a9bb5', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {client.address}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                                        background: `${SERVICE_COLORS[client.service_type] || '#8a9bb5'}20`,
                                        color: SERVICE_COLORS[client.service_type] || '#8a9bb5',
                                        fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px',
                                    }}>
                                        {client.service_type}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#8a9bb5' }}>
                                        {client.care_level}
                                    </span>
                                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#8a9bb5' }}>
                                        {client.visit_duration}分
                                    </span>
                                    {client.requires_two_staff && (
                                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(243,156,18,0.2)', color: '#F39C12' }}>
                                            👥 2人体制
                                        </span>
                                    )}
                                    {client.preferred_time_start && (
                                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#8a9bb5' }}>
                                            希望: {client.preferred_time_start}〜
                                        </span>
                                    )}
                                </div>

                                {client.notes && (
                                    <div style={{ fontSize: '11px', color: '#8a9bb5', marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                                        {client.notes}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button
                                        onClick={() => handleEdit(client)}
                                        className="btn-secondary"
                                        style={{ fontSize: '13px', minHeight: '40px' }}
                                    >
                                        編集
                                    </button>
                                    <button
                                        onClick={() => handleDelete(client.client_id)}
                                        style={{
                                            fontSize: '13px', borderRadius: '8px', minHeight: '40px',
                                            background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
                                            color: '#E74C3C', cursor: 'pointer',
                                        }}
                                    >
                                        削除
                                    </button>
                                </div>
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
                                    {editTarget ? '利用者編集' : '利用者追加'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{ background: 'none', border: 'none', color: '#8a9bb5', fontSize: '20px', cursor: 'pointer', minWidth: '44px', minHeight: '44px' }}
                                >✕</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {[
                                    { label: '氏名 *', key: 'name', type: 'text', placeholder: '鈴木 花子' },
                                    { label: '住所 *', key: 'address', type: 'text', placeholder: '東京都練馬区...' },
                                    { label: '特記事項', key: 'notes', type: 'text', placeholder: '注意事項など' },
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

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>介護度 *</label>
                                        <select value={form.care_level} onChange={(e) => setForm(f => ({ ...f, care_level: e.target.value }))} style={inputStyle}>
                                            {CARE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>サービス種別 *</label>
                                        <select value={form.service_type} onChange={(e) => setForm(f => ({ ...f, service_type: e.target.value }))} style={inputStyle}>
                                            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>訪問時間（分）*</label>
                                        <input
                                            type="number" min="15" max="480" step="15"
                                            value={form.visit_duration}
                                            onChange={(e) => setForm(f => ({ ...f, visit_duration: parseInt(e.target.value) }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#8a9bb5', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>希望開始時刻</label>
                                        <input
                                            type="time"
                                            value={form.preferred_time_start}
                                            onChange={(e) => setForm(f => ({ ...f, preferred_time_start: e.target.value }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* 2人体制トグル */}
                                <div style={{ marginBottom: '20px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, requires_two_staff: !f.requires_two_staff }))}
                                        style={{
                                            width: '100%', padding: '14px', borderRadius: '10px',
                                            background: form.requires_two_staff ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.06)',
                                            border: form.requires_two_staff ? '1.5px solid #F39C12' : '1px solid rgba(255,255,255,0.1)',
                                            color: form.requires_two_staff ? '#F39C12' : '#8a9bb5',
                                            cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            minHeight: '48px',
                                        }}
                                    >
                                        👥 {form.requires_two_staff ? '2人体制が必要（ON）' : '2人体制が必要（OFF）'}
                                    </button>
                                </div>

                                {error && (
                                    <div style={{ color: '#E74C3C', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(231,76,60,0.1)', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

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
