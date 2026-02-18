import { MemoryQueueEngine } from './mocks/QueueEngine';

// Polyfill global for extension context
(window as any).global = window;

console.log('[TaaS Sentinel] Background Worker Starting...');

// Initialize components
const queue = new MemoryQueueEngine();

// State
let isActive = true;
const activityLog: string[] = [];

function logActivity(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log(`[TaaS Sentinel] ${log}`);
    activityLog.unshift(log);
    if (activityLog.length > 50) activityLog.pop(); // Keep last 50 logs
}

chrome.runtime.onInstalled.addListener(() => {
    logActivity('Extension Installed');
    chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'heartbeat') {
        if (!isActive) {
            console.log('[TaaS Sentinel]  Sentinel is paused.');
            return;
        }

        logActivity(' Heartbeat - Checking for jobs...');

        // 1. Check Queue
        const counts = await queue.getJobCounts();

        // 2. Process pending jobs
        await queue.processJobs(async (job: any) => {
            logActivity(`Processing Job: ${job.id}`);
            // TODO: Execute recipe logic
            return { success: true, output: 1 };
        });
    }
});

// Message handling from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[TaaS Sentinel] Received message:', request.type);

    if (request.type === 'GET_STATUS') {
        queue.getJobCounts().then((counts: any) => {
            sendResponse({ active: isActive, queue: counts, logs: activityLog });
        });
        return true; // async response
    }

    if (request.type === 'TOGGLE_STATUS') {
        isActive = !isActive;
        logActivity(`Sentinel ${isActive ? 'Resumed' : 'Paused'} by user`);
        sendResponse({ active: isActive });
        return true;
    }

    if (request.type === 'CREATE_WALLET') {
        try {
            // Generate a real burner wallet using crypto API for entropy
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            const privateKey = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            // For a browser extension without ethers, we can generate the key 
            // and later derive the address or just use this for dummy signing.
            // Better: use a simple hex string to represent the key for now 
            // but ENSURE we store both key and address.
            const mockAddress = '0x' + Array(40).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join('');

            const wallet = { address: mockAddress, privateKey: privateKey };

            chrome.storage.local.set({ 'burner_wallet': wallet }, () => {
                logActivity(`New Burner Wallet Created: ${mockAddress.slice(0, 6)}...`);
                sendResponse({ address: mockAddress });
            });
        } catch (err) {
            console.error('Wallet generation failed', err);
            sendResponse({ error: 'Generation failed' });
        }
        return true;
    }

    if (request.type === 'GET_WALLET') {
        chrome.storage.local.get(['burner_wallet'], (result) => {
            sendResponse({ address: result.burner_wallet?.address || null });
        });
        return true;
    }
});

// Listen for messages from the TaaS Dashboard
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('[TaaS Sentinel] External message received:', request.type);

    if (request.type === 'SYNC_SENTINEL_WALLET') {
        const { address, privateKey } = request.payload;

        chrome.storage.local.set({ 'burner_wallet': { address, privateKey } }, () => {
            logActivity(`Wallet Linked from Dashboard: ${address.slice(0, 6)}...`);
            sendResponse({ success: true, address });
        });
        return true;
    }
});
