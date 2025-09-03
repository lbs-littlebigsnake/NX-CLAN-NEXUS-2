<script>
// ========================================
// MODO DEMO PARA GITHUB PAGES
// ========================================

const IS_DEMO_MODE = window.location.hostname.includes('github.io') || 
                     window.location.protocol === 'file:' ||
                     !window.location.hostname.includes('localhost');

// Override da classe de conexão para modo demo
if (IS_DEMO_MODE) {
    console.log('🎮 Modo Demo Ativado - Simulando conexões...');
    
    // Substitui a classe de conexão real
    window.EnhancedArenaConnection = class DemoConnection {
        constructor(url, server, type, dataManager) {
            this.url = url;
            this.server = server;
            this.type = type;
            this.dataManager = dataManager;
            this.topplayers = [];
            this.isConnected = true;
            
            // Simula conexão bem-sucedida
            setTimeout(() => {
                updateServerStatus(this.server.name, this.type, 'connected');
                this.startSimulation();
            }, Math.random() * 2000);
        }
        
        startSimulation() {
            // Gera dados fake de jogadores com tags do clã
            const names = [
                'ЙЖ* Shadow', 'ЙЖ* Viper', 'ЙЖ* Phoenix', 'ЙЖ* Dragon', 'ЙЖ* Wolf',
                'ЙЖ$ Thunder', 'ЙЖ$ Storm', 'ЙЖ Snake', 'ЙЖ Master', 'ЙEЖЦ$ Elite',
                'Player123', 'NoobMaster', 'ProGamer', 'ЙЖ* Ninja', 'ЙЖ* Samurai',
                'ЙЖ* King', 'ЙЖ* Queen', 'RandomPlayer', 'ЙЖ$ Beast', 'ЙЖ$ Monster'
            ];
            
            // Atualiza a cada 3 segundos
            setInterval(() => {
                this.topplayers = [];
                
                // Gera top 10 aleatório
                for (let i = 0; i < 10; i++) {
                    const randomName = names[Math.floor(Math.random() * names.length)];
                    const player = {
                        place: i + 1,
                        name: randomName + (Math.random() > 0.7 ? ' 👑' : ''),
                        mass: Math.floor(Math.random() * 500000) + 50000 - (i * 40000),
                        crowns: Math.floor(Math.random() * 10),
                        skin: Math.floor(Math.random() * 50),
                        flags: 0,
                        accountId: Math.floor(Math.random() * 90000000) + 10000000,
                        id: Math.floor(Math.random() * 9000) + 1000
                    };
                    
                    this.topplayers.push(player);
                    
                    // Processa apenas membros do clã
                    this.dataManager.addOrUpdateMember(player, this.server.name, this.type);
                }
            }, 3000 + Math.random() * 2000);
        }
        
        getTop10() {
            return this.topplayers;
        }
    };
    
    // Mostra aviso de modo demo
    setTimeout(() => {
        showNotification('🎮 Modo Demonstração Ativo - Dados Simulados', 'info');
    }, 3000);
}

// Adiciona também um fallback para o loading
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('hidden');
        
        if (IS_DEMO_MODE) {
            showNotification('✅ Sistema carregado em modo demonstração', 'success');
        }
    }
}, 5000);

// ========================================
// NEXUS CLAN MONITORING SYSTEM v2.0
// Professional WebSocket Integration
// ========================================

"use strict";

// Global Configuration
const CONFIG = {
    CLAN_TAGS: ['ЙЖ*', 'ЙЖ', 'ЙЖ$', 'ЙEЖЦ$'],
    ONLINE_THRESHOLD: 300000, // 5 minutes in ms
    EXTENDED_THRESHOLD: 480000, // 8 minutes in ms
    HIGH_SCORE_THRESHOLD: 200000, // 200k points
    GAME_INTERVAL_THRESHOLD: 20000, // 20 seconds
    BRAZIL_TIMEZONE: 'America/Sao_Paulo',
    UPDATE_INTERVAL: 2000, // 2 seconds
    SAVE_INTERVAL: 10000, // 10 seconds
    MAX_HISTORY_DAYS: 30,
    SOUND_ENABLED: true
};

// Selected Servers (Limited for performance)
const SERVERS = [
    { name: 'São Paulo', url: 'Sao-Paulo.littlebigsnake.com', region: 'BR' },
    { name: 'Santiago', url: 'Santiago.littlebigsnake.com', region: 'CL' },
    { name: 'Miami', url: 'Miami.littlebigsnake.com', region: 'US' },
    { name: 'New York', url: 'New-York.littlebigsnake.com', region: 'US' },
    { name: 'Dallas', url: 'Dallas.littlebigsnake.com', region: 'US' }
];

// ========================================
// Data Management System
// ========================================

class DataManager {
    constructor() {
        this.members = new Map(); // Map<accountId, MemberData>
        this.connections = [];
        this.currentTimeFilter = 'all';
        this.currentTab = 'members';
        this.sortConfig = { field: 'status', direction: 'desc' };
        this.profileData = null;
        this.profilePeriod = '24h';
        
        this.initializeStorage();
        this.startAutoSave();
    }

    initializeStorage() {
        const savedData = localStorage.getItem('nexusMonitorData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                parsed.members?.forEach(member => {
                    this.members.set(member.accountId, {
                        ...member,
                        lastSeen: new Date(member.lastSeen),
                        appearances: member.appearances?.map(a => ({
                            ...a,
                            timestamp: new Date(a.timestamp)
                        })) || []
                    });
                });
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    }

    startAutoSave() {
        setInterval(() => {
            this.saveToStorage();
        }, CONFIG.SAVE_INTERVAL);
    }

    saveToStorage() {
        const dataToSave = {
            members: Array.from(this.members.values()),
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem('nexusMonitorData', JSON.stringify(dataToSave));
    }

    addOrUpdateMember(playerData, serverName, connectionType) {
        const { accountId, name, mass, place } = playerData;
        
        // Check if player has clan tag
        const hasClanTag = CONFIG.CLAN_TAGS.some(tag => name.includes(tag));
        if (!hasClanTag) return null;

        const now = new Date();
        const existingMember = this.members.get(accountId);

        if (existingMember) {
            // Update existing member
            const lastAppearance = existingMember.appearances[existingMember.appearances.length - 1];
            const timeDiff = lastAppearance ? now - lastAppearance.timestamp : Infinity;

            // Check if this is a new game (20 seconds threshold)
            if (timeDiff > CONFIG.GAME_INTERVAL_THRESHOLD) {
                existingMember.gamesPlayed++;
                existingMember.appearances.push({
                    timestamp: now,
                    score: mass,
                    place: place,
                    server: serverName,
                    type: connectionType
                });
            } else {
                // Update last appearance (extra life)
                if (lastAppearance) {
                    lastAppearance.score = Math.max(lastAppearance.score, mass);
                    lastAppearance.place = Math.min(lastAppearance.place, place);
                }
            }

            existingMember.lastSeen = now;
            existingMember.currentServer = `${serverName} - ${connectionType}`;
            existingMember.currentScore = mass;
            existingMember.bestScore = Math.max(existingMember.bestScore, mass);
            existingMember.totalScore += mass;
            existingMember.name = name; // Update name in case it changed

        } else {
            // Create new member
            const newMember = {
                accountId: accountId,
                name: name,
                tag: CONFIG.CLAN_TAGS.find(tag => name.includes(tag)),
                joinDate: now,
                lastSeen: now,
                currentServer: `${serverName} - ${connectionType}`,
                currentScore: mass,
                bestScore: mass,
                totalScore: mass,
                gamesPlayed: 1,
                totalPlayTime: 0,
                appearances: [{
                    timestamp: now,
                    score: mass,
                    place: place,
                    server: serverName,
                    type: connectionType
                }],
                statistics: {
                    daily: {},
                    weekly: {},
                    monthly: {}
                }
            };

            this.members.set(accountId, newMember);
            this.onNewMemberDetected(newMember);
        }

        this.updateStatistics();
        return this.members.get(accountId);
    }

    onNewMemberDetected(member) {
        showNotification(`Novo membro detectado: ${member.name}`, 'success');
        playSound('notification');
    }

    getMemberStatus(member) {
        const now = new Date();
        const timeSinceLastSeen = now - member.lastSeen;
        
        // Check if high score server (10th place > 200k)
        const lastServer = member.currentServer?.split(' - ')[0];
        const connection = this.connections.find(c => c.server.name === lastServer);
        const tenthPlaceScore = connection?.getTop10()[9]?.mass || 0;
        
        const threshold = tenthPlaceScore > CONFIG.HIGH_SCORE_THRESHOLD ? 
            CONFIG.EXTENDED_THRESHOLD : CONFIG.ONLINE_THRESHOLD;

        return timeSinceLastSeen < threshold ? 'online' : 'offline';
    }

    getFilteredMembers(timeFilter = 'all') {
        const now = new Date();
        const filtered = [];

        this.members.forEach(member => {
            let includeData = true;
            let filteredAppearances = member.appearances;

            if (timeFilter !== 'all') {
                const cutoffTime = this.getCutoffTime(timeFilter);
                filteredAppearances = member.appearances.filter(a => a.timestamp > cutoffTime);
                includeData = filteredAppearances.length > 0;
            }

            if (includeData) {
                const stats = this.calculateMemberStats(member, filteredAppearances);
                filtered.push({
                    ...member,
                    ...stats,
                    status: this.getMemberStatus(member),
                    filteredAppearances
                });
            }
        });

        return filtered;
    }

    getCutoffTime(timeFilter) {
        const now = new Date();
        switch(timeFilter) {
            case '24h': return new Date(now - 24 * 60 * 60 * 1000);
            case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
            case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
            default: return new Date(0);
        }
    }

    calculateMemberStats(member, appearances) {
        if (!appearances || appearances.length === 0) {
            return {
                gamesInPeriod: 0,
                totalScoreInPeriod: 0,
                bestScoreInPeriod: 0,
                avgScoreInPeriod: 0,
                playTimeInPeriod: 0
            };
        }

        const scores = appearances.map(a => a.score);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        const bestScore = Math.max(...scores);
        const avgScore = Math.round(totalScore / scores.length);

        // Calculate play time (approximate based on appearances)
        let playTime = 0;
        for (let i = 1; i < appearances.length; i++) {
            const timeDiff = appearances[i].timestamp - appearances[i-1].timestamp;
            if (timeDiff < 600000) { // Less than 10 minutes between games
                playTime += timeDiff;
            } else {
                playTime += 120000; // Assume 2 minutes per game if gap is too large
            }
        }
        playTime += 120000; // Add time for last game

        return {
            gamesInPeriod: appearances.length,
            totalScoreInPeriod: totalScore,
            bestScoreInPeriod: bestScore,
            avgScoreInPeriod: avgScore,
            playTimeInPeriod: playTime
        };
    }

    updateStatistics() {
        const onlineCount = Array.from(this.members.values())
            .filter(m => this.getMemberStatus(m) === 'online').length;
        
        const totalGames = Array.from(this.members.values())
            .reduce((sum, m) => sum + m.gamesPlayed, 0);
        
        const totalScore = Array.from(this.members.values())
            .reduce((sum, m) => sum + m.totalScore, 0);

        updateStatCards({
            totalMembers: this.members.size,
            onlineMembers: onlineCount,
            totalGames: totalGames,
            totalScore: totalScore
        });
    }
}

// ========================================
// WebSocket Connection Manager
// ========================================

class EnhancedArenaConnection {
    constructor(url, server, type, dataManager) {
        this.url = url;
        this.server = server;
        this.type = type; // 'PC' or 'Mobile'
        this.dataManager = dataManager;
        this.socket = null;
        this.interval = null;
        this.offset = 0;
        this.packet = null;
        this.topplayers = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.connect();
    }

    connect() {
        try {
            this.socket = new WebSocket(this.url);
            this.socket.binaryType = "arraybuffer";
            
            this.socket.onopen = (e) => {
                console.log(`✅ Connected to ${this.server.name} (${this.type})`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                updateServerStatus(this.server.name, this.type, 'connected');
                
                clearInterval(this.interval);
                this.interval = setInterval(() => {
                    if (this.socket.readyState === 1) {
                        this.send([0, 3, 1]); // Heartbeat
                    } else {
                        clearInterval(this.interval);
                    }
                }, 2000);
                
                this.enterArena();
            };

            this.socket.onclose = (e) => {
                console.log(`❌ Disconnected from ${this.server.name} (${this.type})`);
                this.isConnected = false;
                updateServerStatus(this.server.name, this.type, 'disconnected');
                this.attemptReconnect();
            };

            this.socket.onerror = (e) => {
                console.error(`Error on ${this.server.name} (${this.type}):`, e);
            };

            this.socket.onmessage = this.parse.bind(this);
            
        } catch (error) {
            console.error(`Failed to connect to ${this.server.name} (${this.type}):`, error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting to ${this.server.name} in ${delay}ms...`);
            setTimeout(() => this.connect(), delay);
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === 1) {
            this.socket.send(Uint8Array.from(data));
        }
    }

    enterArena() {
        setTimeout(() => {
            this.send([0, 3, 5, 0, 3, 4]);
        }, 500);
    }

    parse(e) {
        const data = new Uint8Array(e.data);
        let current = 0;
        const fim = data.length;

        while (current < fim) {
            const size = (data[current] & 255) << 8 | data[current + 1] & 255;
            const next = current + size;
            this.packet = data.slice(current, next);
            this.offset = 3;

            const tipo = this.packet[2];
            
            switch (tipo) {
                case 22: // Top players list
                    this.parseTopPlayers();
                    break;
                case 79: // Reconnect signal
                    console.log('Reconnect signal received');
                    this.connect();
                    break;
            }
            
            current = next;
        }
    }

    parseTopPlayers() {
        this.topplayers = [];
        const count = this.int8();
        
        for (let i = 0; i < count; i++) {
            const player = {
                place: this.int16(),
                name: this.getString(),
                mass: this.int32(),
                crowns: this.int8(),
                skin: this.int8(),
                flags: this.int8(),
                accountId: this.int32(),
                id: this.int16(),
            };

            this.topplayers.push(player);
            
            // Process clan member
            this.dataManager.addOrUpdateMember(player, this.server.name, this.type);
        }
    }

    getTop10() {
        return this.topplayers;
    }

    // Binary parsing methods
    int8() {
        return this.packet[this.offset++] & 255;
    }

    int16() {
        return (this.packet[this.offset++] & 255) << 8 |
               (this.packet[this.offset++] & 255);
    }

    int32() {
        return (this.packet[this.offset++] & 255) << 24 |
               (this.packet[this.offset++] & 255) << 16 |
               (this.packet[this.offset++] & 255) << 8 |
               this.packet[this.offset++] & 255;
    }

    getString() {
        const length = this.int16();
        const val = new TextDecoder().decode(
            this.packet.slice(this.offset, this.offset + length)
        );
        this.offset += length;
        return val;
    }
}

// ========================================
// UI Management System
// ========================================

class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentSort = { field: 'status', direction: 'desc' };
        this.profileChart = null;
        this.dashboardCharts = {};
        
        this.initializeCharts();
    }

    initializeCharts() {
        // Initialize profile chart
        const ctx = document.getElementById('activityChart');
        if (ctx) {
            this.profileChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Partidas Jogadas',
                        data: [],
                        backgroundColor: 'rgba(0, 255, 136, 0.5)',
                        borderColor: 'rgba(0, 255, 136, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                stepSize: 1
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }
    }

    updateMembersTable() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;

        const members = this.dataManager.getFilteredMembers(this.dataManager.currentTimeFilter);
        
        // Sort members
        members.sort((a, b) => {
            // Online members first
            if (a.status !== b.status) {
                return a.status === 'online' ? -1 : 1;
            }
            
            // Then by selected sort field
            let aVal = a[this.currentSort.field];
            let bVal = b[this.currentSort.field];
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (this.currentSort.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        tbody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            row.onclick = () => openProfile(member.accountId);
            
            row.innerHTML = `
                <td>
                    <div class="member-name">
                        <span class="member-tag">${member.tag}</span>
                        <span>${member.name.replace(member.tag, '').trim()}</span>
                    </div>
                </td>
                <td>
                    <span class="member-id">#${member.accountId}</span>
                </td>
                <td>
                    <span class="status-badge ${member.status}">
                        ${member.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>${formatTime(member.lastSeen)}</td>
                <td>${member.currentServer || '-'}</td>
            `;
            
            tbody.appendChild(row);
        });

        // Animate new entries
        tbody.querySelectorAll('tr').forEach((row, index) => {
            row.style.animation = `fadeInUp 0.3s ease ${index * 0.05}s forwards`;
            row.style.opacity = '0';
        });
    }

    updateActivityTable() {
        const tbody = document.getElementById('activityTableBody');
        if (!tbody) return;

        const members = this.dataManager.getFilteredMembers(this.dataManager.currentTimeFilter);
        
        // Sort by play time
        members.sort((a, b) => b.playTimeInPeriod - a.playTimeInPeriod);

        tbody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            row.onclick = () => openProfile(member.accountId);
            
            row.innerHTML = `
                <td>
                    <div class="member-name">
                        <span class="member-tag">${member.tag}</span>
                        <span>${member.name.replace(member.tag, '').trim()}</span>
                    </div>
                </td>
                <td class="animated-number">${member.gamesInPeriod}</td>
                <td class="animated-number">${formatDuration(member.playTimeInPeriod)}</td>
                <td>${formatDuration(member.playTimeInPeriod / (member.gamesInPeriod || 1))}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateScoresTable() {
        const tbody = document.getElementById('scoresTableBody');
        if (!tbody) return;

        const members = this.dataManager.getFilteredMembers(this.dataManager.currentTimeFilter);
        
        // Sort by total score
        members.sort((a, b) => b.totalScoreInPeriod - a.totalScoreInPeriod);

        tbody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            row.onclick = () => openProfile(member.accountId);
            
            row.innerHTML = `
                <td>
                    <div class="member-name">
                        <span class="member-tag">${member.tag}</span>
                        <span>${member.name.replace(member.tag, '').trim()}</span>
                    </div>
                </td>
                <td class="animated-number">${formatNumber(member.bestScoreInPeriod)}</td>
                <td class="animated-number">${formatNumber(member.totalScoreInPeriod)}</td>
                <td class="animated-number">${formatNumber(member.avgScoreInPeriod)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateProfile(member) {
        document.getElementById('profileName').textContent = member.name;
        document.getElementById('profileId').textContent = `#${member.accountId}`;
        document.getElementById('profileStatus').textContent = 
            member.status === 'online' ? '🟢' : '⚫';

        // Update stats based on current period
        const stats = this.getProfileStats(member, this.dataManager.profilePeriod);
        const statsContainer = document.getElementById('profileStats');
        
        statsContainer.innerHTML = `
            <div class="profile-stat">
                <span class="profile-stat-value animated-number">${stats.games}</span>
                <span class="profile-stat-label">Partidas</span>
            </div>
            <div class="profile-stat">
                <span class="profile-stat-value animated-number">${stats.time}</span>
                <span class="profile-stat-label">Tempo Jogado</span>
            </div>
            <div class="profile-stat">
                <span class="profile-stat-value animated-number">${stats.best}</span>
                <span class="profile-stat-label">Melhor Score</span>
            </div>
            <div class="profile-stat">
                <span class="profile-stat-value animated-number">${stats.total}</span>
                <span class="profile-stat-label">Score Total</span>
            </div>
        `;

        // Update chart
        this.updateProfileChart(member, this.dataManager.profilePeriod);
    }

    getProfileStats(member, period) {
        const cutoff = this.dataManager.getCutoffTime(period);
        const appearances = member.appearances.filter(a => a.timestamp > cutoff);
        const stats = this.dataManager.calculateMemberStats(member, appearances);

        return {
            games: stats.gamesInPeriod,
            time: formatDuration(stats.playTimeInPeriod),
            best: formatNumber(stats.bestScoreInPeriod),
            total: formatNumber(stats.totalScoreInPeriod)
        };
    }

    updateProfileChart(member, period) {
        const chartData = this.getChartData(member, period);
        
        this.profileChart.data.labels = chartData.labels;
        this.profileChart.data.datasets[0].data = chartData.data;
        this.profileChart.update('active');

        // Update chart title
        const titles = {
            '24h': 'Atividade por Hora (Últimas 24 Horas)',
            '7d': 'Atividade por Dia (Últimos 7 Dias)',
            '30d': 'Atividade por Dia (Últimos 30 Dias)',
            'all': 'Atividade Total'
        };
        document.getElementById('chartTitle').textContent = titles[period] || titles['24h'];
    }

    getChartData(member, period) {
        const now = new Date();
        const cutoff = this.dataManager.getCutoffTime(period);
        const appearances = member.appearances.filter(a => a.timestamp > cutoff);

        let labels = [];
        let data = [];

        if (period === '24h') {
            // Hourly data for last 24 hours
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(now - i * 60 * 60 * 1000);
                labels.push(hour.getHours() + 'h');
                
                const count = appearances.filter(a => {
                    const diff = hour - a.timestamp;
                    return diff >= 0 && diff < 60 * 60 * 1000;
                }).length;
                
                data.push(count);
            }
        } else if (period === '7d') {
            // Daily data for last 7 days
            const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now - i * 24 * 60 * 60 * 1000);
                labels.push(days[day.getDay()]);
                
                const count = appearances.filter(a => {
                    const diff = day - a.timestamp;
                    return diff >= 0 && diff < 24 * 60 * 60 * 1000;
                }).length;
                
                data.push(count);
            }
        } else {
            // Hide chart for 30d and all time
            labels = ['Total'];
            data = [appearances.length];
        }

        return { labels, data };
    }
}

// ========================================
// Global Functions
// ========================================

let dataManager;
let uiManager;
let updateInterval;
let soundEnabled = true;

function initializeSystem() {
    console.log('🚀 Initializing NEXUS Monitoring System...');
    
    // Initialize managers
    dataManager = new DataManager();
    uiManager = new UIManager(dataManager);
    
    // Initialize server connections
    initializeConnections();
    
    // Start UI updates
    startUIUpdates();

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 2000);
}

function initializeConnections() {
    SERVERS.forEach(server => {
        // PC Connection
        const pcConn = new EnhancedArenaConnection(
            `wss://${server.url}:9001`,
            server,
            'PC',
            dataManager
        );
        
        // Mobile Connection
        const mobileConn = new EnhancedArenaConnection(
            `wss://${server.url}:9002`,
            server,
            'Mobile',
            dataManager
        );
        
        dataManager.connections.push(pcConn, mobileConn);
    });
}

function startUIUpdates() {
    updateInterval = setInterval(() => {
        updateCurrentSection();
    }, CONFIG.UPDATE_INTERVAL);
}

function updateCurrentSection() {
    switch(dataManager.currentTab) {
        case 'members':
            uiManager.updateMembersTable();
            break;
        case 'activity':
            uiManager.updateActivityTable();
            break;
        case 'scores':
            uiManager.updateScoresTable();
            break;
        case 'competitions':
            updateCompetitions();
            break;
        case 'dashboard':
            updateDashboard();
            break;
    }
}

function switchTab(tabName) {
    playSound('click');
    
    // Update active tab
    dataManager.currentTab = tabName;
    
    // Update UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const sectionId = tabName + 'Section';
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Update content
    updateCurrentSection();
}

function changeTimeFilter(filter) {
    playSound('click');
    
    dataManager.currentTimeFilter = filter;
    
    // Update UI
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content
    updateCurrentSection();
}

function sortTable(field) {
    playSound('click');
    
    if (uiManager.currentSort.field === field) {
        uiManager.currentSort.direction = 
            uiManager.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        uiManager.currentSort.field = field;
        uiManager.currentSort.direction = 'desc';
    }
    
    updateCurrentSection();
}

function openProfile(accountId) {
    playSound('click');
    
    const member = dataManager.members.get(accountId);
    if (!member) return;
    
    member.status = dataManager.getMemberStatus(member);
    dataManager.profileData = member;
    dataManager.profilePeriod = '24h';
    
    uiManager.updateProfile(member);
    
    document.getElementById('profileModal').classList.add('active');
}

function closeProfile() {
    playSound('click');
    document.getElementById('profileModal').classList.remove('active');
}

function changeProfilePeriod(direction) {
    playSound('click');
    
    const periods = ['24h', '7d', '30d', 'all'];
    const currentIndex = periods.indexOf(dataManager.profilePeriod);
    
    let newIndex;
    if (direction === 'prev') {
        newIndex = Math.max(0, currentIndex - 1);
    } else {
        newIndex = Math.min(periods.length - 1, currentIndex + 1);
    }
    
    dataManager.profilePeriod = periods[newIndex];
    
    if (dataManager.profileData) {
        uiManager.updateProfile(dataManager.profileData);
    }
}

function updateServerStatus(serverName, type, status) {
    const container = document.getElementById('connectionStatus');
    if (!container) return;
    
    const id = `status-${serverName.replace(/\s/g, '')}-${type}`;
    let statusElement = document.getElementById(id);
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = id;
        statusElement.className = 'server-status';
        container.appendChild(statusElement);
    }
    
    statusElement.innerHTML = `
        <span class="status-dot ${status}"></span>
        <span>${serverName} ${type}</span>
    `;
}

function updateStatCards(stats) {
    animateNumber('totalMembers', stats.totalMembers);
    animateNumber('onlineMembers', stats.onlineMembers);
    animateNumber('totalGames', stats.totalGames);
    animateNumber('totalScore', formatNumber(stats.totalScore));
}

function animateNumber(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = value;
    element.classList.add('updating');
    setTimeout(() => element.classList.remove('updating'), 500);
}

// ========================================
// Utility Functions
// ========================================

function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(ms) {
    if (!ms || ms < 0) return '0min';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
        return `${minutes}min ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

function formatTime(date) {
    if (!date) return '-';
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    
    return date.toLocaleString('pt-BR', {
        timeZone: CONFIG.BRAZIL_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.3s ease reverse';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);

    playSound('notification');
}

function playSound(type) {
    if (!soundEnabled) return;
    
    const audio = document.getElementById(type + 'Sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const button = document.getElementById('soundToggle');
    button.textContent = soundEnabled ? '🔊' : '🔇';
    button.classList.toggle('muted', !soundEnabled);
    playSound('click');
}

// ========================================
// Competition System
// ========================================

function updateCompetitions() {
    const section = document.getElementById('competitionsSection');
    if (!section) {
        createCompetitionsSection();
    }
    
    const members = Array.from(dataManager.members.values());
    
    // Daily Champions
    const dailyChampion = members.reduce((best, current) => {
        const today = new Date().setHours(0, 0, 0, 0);
        const todayAppearances = current.appearances.filter(a => 
            a.timestamp >= today
        );
        const todayScore = todayAppearances.reduce((sum, a) => sum + a.score, 0);
        
        if (!best || todayScore > best.score) {
            return { member: current, score: todayScore };
        }
        return best;
    }, null);
    
    // Update competition displays
    if (dailyChampion) {
        updateCompetitionCard('daily', dailyChampion);
    }
}

function createCompetitionsSection() {
    const container = document.getElementById('contentArea');
    const section = document.createElement('div');
    section.className = 'content-section';
    section.id = 'competitionsSection';
    
    section.innerHTML = `
        <div class="competitions-grid">
            <div class="competition-card" id="dailyCompetition">
                <h3>🏆 Campeão do Dia</h3>
                <div class="champion-info">
                    <div class="champion-name">-</div>
                    <div class="champion-score">0 pontos</div>
                </div>
            </div>
            <div class="competition-card" id="weeklyCompetition">
                <h3>🥇 Campeão da Semana</h3>
                <div class="champion-info">
                    <div class="champion-name">-</div>
                    <div class="champion-score">0 pontos</div>
                </div>
            </div>
            <div class="competition-card" id="mvpCompetition">
                <h3>⭐ MVP do Mês</h3>
                <div class="champion-info">
                    <div class="champion-name">-</div>
                    <div class="champion-score">0 pontos</div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(section);
}

function updateCompetitionCard(type, data) {
    const card = document.getElementById(type + 'Competition');
    if (!card) return;
    
    const nameElement = card.querySelector('.champion-name');
    const scoreElement = card.querySelector('.champion-score');
    
    nameElement.textContent = data.member.name;
    scoreElement.textContent = formatNumber(data.score) + ' pontos';
}

// ========================================
// Dashboard System
// ========================================

function updateDashboard() {
    const section = document.getElementById('dashboardSection');
    if (!section) {
        createDashboardSection();
    }
    
    updateDashboardCharts();
}

function createDashboardSection() {
    const container = document.getElementById('contentArea');
    const section = document.createElement('div');
    section.className = 'content-section';
    section.id = 'dashboardSection';
    
    section.innerHTML = `
        <div class="dashboard-grid">
            <div class="chart-container">
                <div class="chart-title">Atividade do Clã (7 Dias)</div>
                <canvas id="clanActivityChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Top 5 Jogadores</div>
                <canvas id="topPlayersChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Distribuição por Servidor</div>
                <canvas id="serverDistributionChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Horários de Pico</div>
                <canvas id="peakHoursChart"></canvas>
            </div>
        </div>
    `;
    
    container.appendChild(section);
    initializeDashboardCharts();
}

function initializeDashboardCharts() {
    // Activity Chart
    const activityCtx = document.getElementById('clanActivityChart');
    if (activityCtx) {
        uiManager.dashboardCharts.activity = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Partidas',
                    data: [],
                    borderColor: 'rgba(0, 255, 136, 1)',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.3
                }]
            },
            options: getChartOptions()
        });
    }
    
    // Top Players Chart
    const topCtx = document.getElementById('topPlayersChart');
    if (topCtx) {
        uiManager.dashboardCharts.topPlayers = new Chart(topCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(0, 255, 136, 0.7)',
                        'rgba(0, 255, 255, 0.7)',
                        'rgba(255, 0, 255, 0.7)',
                        'rgba(255, 170, 0, 0.7)',
                        'rgba(255, 51, 102, 0.7)'
                    ]
                }]
            },
            options: getChartOptions()
        });
    }
}

function updateDashboardCharts() {
    const members = Array.from(dataManager.members.values());
    
    // Update activity chart
    if (uiManager.dashboardCharts.activity) {
        const last7Days = [];
        const counts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            let count = 0;
            members.forEach(member => {
                count += member.appearances.filter(a => 
                    a.timestamp >= dayStart && a.timestamp <= dayEnd
                ).length;
            });
            
            last7Days.push(dayStart.toLocaleDateString('pt-BR', { weekday: 'short' }));
            counts.push(count);
        }
        
        uiManager.dashboardCharts.activity.data.labels = last7Days;
        uiManager.dashboardCharts.activity.data.datasets[0].data = counts;
        uiManager.dashboardCharts.activity.update();
    }
    
    // Update top players chart
    if (uiManager.dashboardCharts.topPlayers) {
        const topMembers = members
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 5);
        
        uiManager.dashboardCharts.topPlayers.data.labels = 
            topMembers.map(m => m.name.replace(/ЙЖ\*?/, '').trim());
        uiManager.dashboardCharts.topPlayers.data.datasets[0].data = 
            topMembers.map(m => m.totalScore);
        uiManager.dashboardCharts.topPlayers.update();
    }
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        }
    };
}

// ========================================
// Additional Styles for New Sections
// ========================================

const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .competitions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
    }

    .competition-card {
        background: var(--nexus-glass);
        backdrop-filter: blur(20px);
        border: 2px solid var(--nexus-primary);
        border-radius: 20px;
        padding: 30px;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .competition-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%);
        animation: rotate 30s linear infinite;
    }

    .competition-card h3 {
        font-size: 24px;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
    }

    .champion-info {
        position: relative;
        z-index: 1;
    }

    .champion-name {
        font-size: 28px;
        font-weight: bold;
        background: var(--snake-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 10px;
    }

    .champion-score {
        font-size: 20px;
        color: var(--nexus-accent);
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
    }

    .chart-container canvas {
        max-height: 300px;
    }
`;

document.head.appendChild(additionalStyles);

// ========================================
// Initialize on DOM Load
// ========================================

document.addEventListener('DOMContentLoaded', initializeSystem);

// Performance monitoring
let lastUpdate = Date.now();
setInterval(() => {
    const now = Date.now();
    const fps = 1000 / (now - lastUpdate);
    if (fps < 30) {
        console.warn('Performance warning: FPS dropped to', fps.toFixed(1));
    }
    lastUpdate = now;
}, 1000);

console.log('🐍 NEXUS WebSocket Monitoring System v2.0 Loaded');
console.log('📡 Connecting to', SERVERS.length, 'servers...');
</script>
