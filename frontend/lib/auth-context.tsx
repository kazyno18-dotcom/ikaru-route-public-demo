'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface User {
    staff_id: string;
    name: string;
    role: 'admin' | 'coordinator' | 'staff';
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    isAdmin: boolean;
    isCoordinatorOrAbove: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('ikaruRoute_token');
        const savedUser = localStorage.getItem('ikaruRoute_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/api/v1/auth/login`, { email, password });
        const { access_token, role, staff_id, name } = response.data;

        // ユーザー詳細取得
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        const meResponse = await axios.get(`${API_URL}/api/v1/auth/me`);
        const userData: User = { staff_id, name, role, email: meResponse.data.email };

        setToken(access_token);
        setUser(userData);
        localStorage.setItem('ikaruRoute_token', access_token);
        localStorage.setItem('ikaruRoute_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('ikaruRoute_token');
        localStorage.removeItem('ikaruRoute_user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isLoading,
            isAdmin: user?.role === 'admin',
            isCoordinatorOrAbove: user?.role === 'admin' || user?.role === 'coordinator',
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
