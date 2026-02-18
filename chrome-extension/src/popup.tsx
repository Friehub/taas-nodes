import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const Popup = () => {
    const [status, setStatus] = useState<any>({ active: true, queue: {}, logs: [] });
    const [wallet, setWallet] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchStatus = () => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
            if (response) setStatus(response);
        });
    };

    const fetchWallet = () => {
        chrome.runtime.sendMessage({ type: 'GET_WALLET' }, (response) => {
            if (response && response.address) setWallet(response.address);
        });
    };

    useEffect(() => {
        fetchStatus();
        fetchWallet();
        const poll = setInterval(fetchStatus, 1000);
        return () => clearInterval(poll);
    }, []);

    const toggleStatus = () => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_STATUS' }, (response) => {
            if (response) setStatus((prev: any) => ({ ...prev, active: response.active }));
        });
    };

    const createWallet = () => {
        chrome.runtime.sendMessage({ type: 'CREATE_WALLET' }, (response) => {
            if (response && response.address) setWallet(response.address);
        });
    };

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            fontFamily: 'Inter, system-ui, sans-serif',
            backgroundColor: '#0f172a',
            color: 'white',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <header style={{
                padding: '16px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1e293b'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '10px', height: '10px',
                        borderRadius: '50%',
                        backgroundColor: status.active ? '#10b981' : '#ef4444',
                        marginRight: '8px',
                        boxShadow: status.active ? '0 0 10px #10b981' : 'none'
                    }} />
                    <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>TaaS Sentinel</h1>
                </div>
                <button
                    onClick={toggleStatus}
                    style={{
                        background: status.active ? '#334155' : '#10b981',
                        border: 'none',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500
                    }}
                >
                    {status.active ? 'Pause' : 'Resume'}
                </button>
            </header>

            {/* Content */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

                {/* Wallet Section */}
                <div style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    border: '1px solid #334155'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sentinel Vault</div>
                    {wallet ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '24px', height: '24px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)'
                                }} />
                                <code style={{ fontSize: '13px', color: '#e2e8f0' }}>{wallet.slice(0, 6)}...{wallet.slice(-4)}</code>
                            </div>
                            <span style={{ fontSize: '12px', color: '#10b981' }}>Linked</span>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.4' }}>
                                Connect your wallet on the TaaS Dashboard to sync your identity with this Sentinel.
                            </p>
                            <button
                                onClick={() => window.open('http://localhost:3000', '_blank')}
                                style={{
                                    width: '100%',
                                    background: '#3b82f6',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500
                                }}
                            >
                                Open Dashboard to Login
                            </button>
                        </div>
                    )}
                </div>

                {/* Queue Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{status.queue?.waiting || 0}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pending</div>
                    </div>
                    <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{status.queue?.completed || 0}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Processed</div>
                    </div>
                </div>

                {/* Activity Log */}
                <div style={{
                    backgroundColor: '#020617',
                    borderRadius: '8px',
                    padding: '10px',
                    border: '1px solid #334155',
                    height: '200px',
                    overflowY: 'auto',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#cbd5e1'
                }}>
                    <div style={{ position: 'sticky', top: 0, background: '#020617', paddingBottom: '4px', marginBottom: '4px', borderBottom: '1px solid #1e293b', color: '#64748b' }}>Activity Log</div>
                    {status.logs && status.logs.map((log: string, i: number) => (
                        <div key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }}>{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><Popup /></React.StrictMode>);
