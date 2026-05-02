const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

// State Management
let tasks = JSON.parse(localStorage.getItem('lifestyle_tasks')) || [];
let habits = JSON.parse(localStorage.getItem('lifestyle_habits')) || null;
let filterMode = 'all';
let userName = localStorage.getItem('lifestyle_username') || 'User';
let userXP = parseInt(localStorage.getItem('lifestyle_xp')) || 0;
let solvedPuzzles = JSON.parse(localStorage.getItem('lifestyle_solved_puzzles')) || [];
let currentPuzzleIndex = parseInt(localStorage.getItem('lifestyle_puzzle_index')) || 0;

// Seed default habits if first visit
if (!habits) {
    habits = [
        { id: '1', text: 'Drink 8 glasses of water', streak: 0, lastCompleted: null, history: [] },
        { id: '2', text: 'Exercise / Walk for 30 mins', streak: 0, lastCompleted: null, history: [] },
        { id: '3', text: 'Read for 20 minutes', streak: 0, lastCompleted: null, history: [] },
        { id: '4', text: 'Meditate for 10 minutes', streak: 0, lastCompleted: null, history: [] },
        { id: '5', text: 'Sleep before 11 PM', streak: 0, lastCompleted: null, history: [] },
    ];
    localStorage.setItem('lifestyle_habits', JSON.stringify(habits));
}

// DOM Elements
const elements = {
    form: qs('#add-task-form'),
    input: qs('#task-input'),
    timeInput: qs('#task-time'),
    taskList: qs('#task-list'),
    dateName: qs('#greeting-text'),
    dateFull: qs('#current-date-text'),
    statTotal: qs('#stat-total'),
    statCompleted: qs('#stat-completed'),
    statPending: qs('#stat-pending'),
    completionText: qs('#completion-text'),
    filters: qsa('.filter-btn'),
    progressCircle: qs('.progress-ring__circle'),
    toastContainer: qs('#toast-container'),
    navHome: qs('#nav-home'),
    navTasks: qs('#nav-tasks'),
    navHabits: qs('#nav-habits'),
    navCoach: qs('#nav-coach'),
    navPuzzles: qs('#nav-puzzles'),
    navAnalytics: qs('#nav-analytics'),
    navSettings: qs('#nav-settings'),
    homeView: qs('#home-view'),
    tasksSection: qs('#tasks-view'),
    habitsSection: qs('#habits-view'),
    coachSection: qs('#coach-view'),
    puzzlesSection: qs('#puzzles-view'),
    analyticsSection: qs('#analytics-view'),
    settingsSection: qs('#settings-view'),
    habitForm: qs('#add-habit-form'),
    habitInput: qs('#habit-input'),
    habitList: qs('#habit-list'),
    habitChart: qs('#habit-chart'),
    habitsTodayCount: qs('#habits-today-count'),
    chatMessages: qs('#chat-messages'),
    chatForm: qs('#chat-form'),
    chatInput: qs('#chat-input'),
    navFocus: qs('#nav-focus'),
    navBody: qs('#nav-body'),
    navBadges: qs('#nav-badges'),
    focusSection: qs('#focus-view'),
    bodySection: qs('#body-view'),
    badgesSection: qs('#badges-view')
};

const GEMINI_API_KEY = "AIzaSyBECEutF7Pv8fLEsLoPtLVTQkQPpecJm7E";

// Initialize App
function init() {
    // Apply saved theme (dark is default, light-mode is the toggle)
    if (localStorage.getItem('lifestyle_theme') === 'light') document.body.classList.add('light-mode');
    setDate();
    renderTasks();
    updateDashboardUI();
    renderHabits();
    requestNotificationPermission();
    setupReminders();
    updateAllUserNames();
    updateLevelUI();
    renderPuzzles();
    updateQuickStats();
    
    // Event Listeners
    elements.form.addEventListener('submit', handleAddTask);
    elements.taskList.addEventListener('click', handleTaskAction);
    elements.habitForm.addEventListener('submit', handleAddHabit);
    elements.habitList.addEventListener('click', handleHabitAction);
    elements.chatForm.addEventListener('submit', handleChatSubmit);
    
    // Quick Prompt Buttons (delegated)
    elements.chatMessages.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-prompt-btn');
        if (btn) {
            const prompt = btn.dataset.prompt;
            elements.chatInput.value = prompt;
            // hide quick prompts
            const qp = qs('#quick-prompts');
            if (qp) qp.style.display = 'none';
            elements.chatForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Navigation
    if (elements.navHome) elements.navHome.addEventListener('click', () => switchView('home'));
    if (elements.navTasks) elements.navTasks.addEventListener('click', () => switchView('tasks'));
    if (elements.navHabits) elements.navHabits.addEventListener('click', () => switchView('habits'));
    if (elements.navCoach) elements.navCoach.addEventListener('click', () => switchView('coach'));
    if (elements.navPuzzles) elements.navPuzzles.addEventListener('click', () => switchView('puzzles'));
    if (elements.navAnalytics) elements.navAnalytics.addEventListener('click', () => switchView('analytics'));
    if (elements.navSettings) elements.navSettings.addEventListener('click', () => switchView('settings'));
    if (elements.navFocus) elements.navFocus.addEventListener('click', () => switchView('focus'));
    if (elements.navBody) elements.navBody.addEventListener('click', () => switchView('body'));
    if (elements.navBadges) elements.navBadges.addEventListener('click', () => switchView('badges'));

    // Name editing
    const sidebarName = qs('#sidebar-username');
    if (sidebarName) sidebarName.addEventListener('click', openNameModal);
    const nameModalSave = qs('#name-modal-save');
    const nameModalCancel = qs('#name-modal-cancel');
    const nameModalOverlay = qs('#name-modal-overlay');
    if (nameModalSave) nameModalSave.addEventListener('click', saveNameFromModal);
    if (nameModalCancel) nameModalCancel.addEventListener('click', closeNameModal);
    if (nameModalOverlay) nameModalOverlay.addEventListener('click', (e) => { if (e.target === nameModalOverlay) closeNameModal(); });
    // Settings name
    const settingsSave = qs('#settings-save-name');
    if (settingsSave) settingsSave.addEventListener('click', () => {
        const inp = qs('#settings-name-input');
        if (inp && inp.value.trim()) { userName = inp.value.trim(); localStorage.setItem('lifestyle_username', userName); updateAllUserNames(); showNotification('Name Updated', 'Your name has been changed to ' + userName); }
    });
    const settingsNameInp = qs('#settings-name-input');
    if (settingsNameInp) settingsNameInp.value = userName;
    // Level up dismiss
    const lvlDismiss = qs('#levelup-dismiss');
    if (lvlDismiss) lvlDismiss.addEventListener('click', () => qs('#levelup-overlay').classList.remove('show'));
    
    // Theme logic in Settings
    const themeBtn = qs('#theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('lifestyle_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }

    // Dashboard shortcut buttons
    const addTaskShortcut = qs('#add-task-shortcut');
    if (addTaskShortcut) {
        addTaskShortcut.addEventListener('click', () => {
            switchView('tasks');
            setTimeout(() => {
                if (elements.input) elements.input.focus();
            }, 100);
        });
    }
    
    const viewAllTasks = qs('#view-all-tasks');
    if (viewAllTasks) {
        viewAllTasks.addEventListener('click', () => {
            switchView('tasks');
        });
    }

    // Soon features
    qsa('[data-soon="true"]').forEach(btn => {
        btn.addEventListener('click', () => {
            showNotification('Coming Soon', 'This feature is currently under development.');
        });
    });
    
    elements.filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.filters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterMode = e.target.dataset.filter;
            renderTasks();
        });
    });
}

// Data Handling
function handleAddTask(e) {
    e.preventDefault();
    const text = elements.input.value.trim();
    const time = elements.timeInput.value;
    
    if (text && time) {
        const newTask = {
            id: Date.now().toString(),
            text,
            time,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        renderTasks();
        updateDashboardUI();
        
        elements.input.value = '';
        elements.timeInput.value = '';
        elements.input.focus();
    }
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) { addXP(25); } else { removeXP(25); }
        saveTasks();
        renderTasks();
        updateDashboardUI();
    }
}

function deleteTask(id) {
    const el = qs(`[data-id="${id}"]`);
    if (el) {
        el.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            renderTasks();
            updateDashboardUI();
        }, 200);
    }
}

function handleTaskAction(e) {
    const toggleBtn = e.target.closest('[data-action="toggle"]');
    const deleteBtn = e.target.closest('[data-action="delete"]');
    const aiBtn = e.target.closest('[data-action="ai-assist"]');
    
    if (toggleBtn) toggleTask(toggleBtn.dataset.id);
    if (deleteBtn) deleteTask(deleteBtn.dataset.id);
    if (aiBtn) requestAIAssist(aiBtn.dataset.text);
}

function switchView(view) {
    const views = ['home', 'tasks', 'habits', 'coach', 'puzzles', 'analytics', 'settings', 'focus', 'body', 'badges'];
    views.forEach(v => {
        const el = elements['nav' + v.charAt(0).toUpperCase() + v.slice(1)];
        if(el) el.classList.remove('active');
    });
    
    if (elements.homeView) elements.homeView.classList.add('hidden-view');
    if (elements.tasksSection) elements.tasksSection.classList.add('hidden-view');
    if (elements.habitsSection) elements.habitsSection.classList.add('hidden-view');
    if (elements.coachSection) elements.coachSection.classList.add('hidden-view');
    if (elements.puzzlesSection) elements.puzzlesSection.classList.add('hidden-view');
    if (elements.analyticsSection) elements.analyticsSection.classList.add('hidden-view');
    if (elements.settingsSection) elements.settingsSection.classList.add('hidden-view');
    if (elements.focusSection) elements.focusSection.classList.add('hidden-view');
    if (elements.bodySection) elements.bodySection.classList.add('hidden-view');
    if (elements.badgesSection) elements.badgesSection.classList.add('hidden-view');

    if (view === 'home') {
        if (elements.navHome) elements.navHome.classList.add('active');
        if (elements.homeView) elements.homeView.classList.remove('hidden-view');
    } else if (view === 'tasks') {
        if (elements.navTasks) elements.navTasks.classList.add('active');
        if (elements.tasksSection) elements.tasksSection.classList.remove('hidden-view');
    } else if (view === 'habits') {
        if (elements.navHabits) elements.navHabits.classList.add('active');
        if (elements.habitsSection) elements.habitsSection.classList.remove('hidden-view');
    } else if (view === 'coach') {
        if (elements.navCoach) elements.navCoach.classList.add('active');
        if (elements.coachSection) elements.coachSection.classList.remove('hidden-view');
    } else if (view === 'puzzles') {
        if (elements.navPuzzles) elements.navPuzzles.classList.add('active');
        if (elements.puzzlesSection) elements.puzzlesSection.classList.remove('hidden-view');
    } else if (view === 'analytics') {
        if (elements.navAnalytics) elements.navAnalytics.classList.add('active');
        if (elements.analyticsSection) elements.analyticsSection.classList.remove('hidden-view');
        renderAnalytics();
    } else if (view === 'settings') {
        if (elements.navSettings) elements.navSettings.classList.add('active');
        if (elements.settingsSection) elements.settingsSection.classList.remove('hidden-view');
    } else if (view === 'focus') {
        if (elements.navFocus) elements.navFocus.classList.add('active');
        if (elements.focusSection) elements.focusSection.classList.remove('hidden-view');
    } else if (view === 'body') {
        if (elements.navBody) elements.navBody.classList.add('active');
        if (elements.bodySection) elements.bodySection.classList.remove('hidden-view');
        renderBodyView();
    } else if (view === 'badges') {
        if (elements.navBadges) elements.navBadges.classList.add('active');
        if (elements.badgesSection) elements.badgesSection.classList.remove('hidden-view');
        renderBadges();
    }
}

function saveTasks() {
    localStorage.setItem('lifestyle_tasks', JSON.stringify(tasks));
}

function getImageUrlForTask(text) {
    text = text.toLowerCase();
    if (text.includes('gym') || text.includes('workout') || text.includes('exercise')) return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
    if (text.includes('study') || text.includes('read') || text.includes('book')) return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop';
    if (text.includes('work') || text.includes('laptop') || text.includes('code')) return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop';
    if (text.includes('meditat') || text.includes('yoga') || text.includes('calm')) return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=400&auto=format&fit=crop';
    if (text.includes('water') || text.includes('drink') || text.includes('health')) return 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=400&auto=format&fit=crop';
    // Default abstract dark aesthetic
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop';
}

// Rendering
function renderTasks() {
    elements.taskList.innerHTML = '';
    
    // Sort tasks by time
    let filtered = tasks.sort((a, b) => a.time.localeCompare(b.time));
    
    if (filterMode === 'pending') filtered = filtered.filter(t => !t.completed);
    if (filterMode === 'completed') filtered = filtered.filter(t => t.completed);
    
    if (filtered.length === 0) {
        elements.taskList.innerHTML = tasks.length === 0 ? getEmptyTasksHTML() : `
            <div style="grid-column: 1 / -1; text-align:center; padding: 2rem; color: var(--text-muted);">
                No tasks found for this filter.
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    filtered.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item image-card ${task.completed ? 'completed' : ''}`;
        div.dataset.id = task.id;
        div.style.backgroundImage = `url('${getImageUrlForTask(task.text)}')`;
        
        div.innerHTML = `
            <div class="image-card-overlay">
                <div class="card-top">
                    <div class="status-badge ${task.completed ? 'done' : ''}">${task.completed ? 'DONE' : 'PENDING'}</div>
                    <div class="card-actions">
                        <button class="icon-btn" data-action="toggle" data-id="${task.id}" title="Toggle">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                        <button class="icon-btn" data-action="ai-assist" data-text="${escapeHTML(task.text)}" title="AI Assist">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="var(--primary)" stroke-width="2" fill="none" style="pointer-events: none;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                        </button>
                        <button class="icon-btn delete" data-action="delete" data-id="${task.id}" title="Delete">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="card-bottom">
                    <div class="card-title">${escapeHTML(task.text)}</div>
                    <div class="card-meta">
                        <span>⏰ ${formatTime(task.time)}</span>
                    </div>
                </div>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    elements.taskList.appendChild(fragment);
}

function updateDashboardUI() {
    const total = tasks.length;
    let completed = 0;
    for (let i = 0; i < total; i++) { if (tasks[i].completed) completed++; }
    const pending = total - completed;
    const percentage = total === 0 ? 0 : completed / total;
    elements.statTotal.textContent = total;
    elements.statCompleted.textContent = completed;
    elements.statPending.textContent = pending;
    elements.completionText.textContent = Math.round(percentage * 100);
    const circumference = 314;
    const offset = circumference - (percentage * circumference);
    elements.progressCircle.style.strokeDashoffset = offset;
    renderHomeWeeklyChart();
    renderHomeDonutChart();
    renderHomeStreakDots();
    renderHomeSchedule();
    updateQuickStats();
}

function updateQuickStats() {
    const completed = tasks.filter(t => t.completed).length;
    const todayStr = new Date().toDateString();
    const habitsDone = habits.filter(h => h.lastCompleted === todayStr).length;
    const qsT = qs('#qs-tasks'); if (qsT) qsT.textContent = completed + '/' + tasks.length;
    const qsH = qs('#qs-habits'); if (qsH) qsH.textContent = habitsDone + '/' + habits.length;
    const qsS = qs('#qs-streak'); if (qsS) qsS.textContent = qs('#streak-count')?.textContent || '0';
    const qsL = qs('#qs-level'); if (qsL) qsL.textContent = getLevel();
}

function renderHomeWeeklyChart() {
    const container = qs('#weekly-chart');
    if (!container) return;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push({ label: dayNames[d.getDay()], dateStr: d.toDateString(), isToday: i === 0 }); }
    const W = container.offsetWidth || 450; const H = 160;
    const barW = Math.floor((W - 50) / 7);
    let svg = '';
    // grid lines
    for (let y = 0; y < 4; y++) { const yp = 10 + y * 35; svg += `<line x1="25" y1="${yp}" x2="${W-10}" y2="${yp}" stroke="rgba(0,0,0,.05)" stroke-width="1"/>`; }
    days.forEach((day, i) => {
        const dayTasks = tasks.filter(t => { try { return new Date(t.createdAt).toDateString() === day.dateStr; } catch(e) { return false; } });
        const doneTasks = dayTasks.filter(t => t.completed).length;
        const totalDay = Math.max(dayTasks.length, 1);
        const pct = dayTasks.length > 0 ? doneTasks / totalDay : (day.isToday && tasks.length > 0 ? completed / Math.max(tasks.length,1) : 0);
        const bh = Math.max(4, pct * 100);
        const x = 25 + i * barW + barW * 0.15; const bw = barW * 0.7; const by = H - 28 - bh;
        const fill = day.isToday ? 'url(#weekGrad)' : (pct > 0.5 ? 'rgba(139,92,246,.5)' : (pct > 0 ? 'rgba(139,92,246,.25)' : 'rgba(139,92,246,.08)'));
        svg += `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="${fill}"><animate attributeName="height" from="0" to="${bh}" dur="0.6s" fill="freeze"/><animate attributeName="y" from="${H-28}" to="${by}" dur="0.6s" fill="freeze"/></rect>`;
        svg += `<text x="${x+bw/2}" y="${H-12}" text-anchor="middle" font-size="10" fill="${day.isToday?'var(--primary)':'var(--text-muted)'}" font-weight="${day.isToday?700:500}" font-family="Inter">${day.label}</text>`;
        if (pct > 0) svg += `<text x="${x+bw/2}" y="${by-4}" text-anchor="middle" font-size="9" fill="var(--primary)" font-weight="600" font-family="Inter">${Math.round(pct*100)}%</text>`;
    });
    const gradient = `<defs><linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>`;
    container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}">${gradient}${svg}</svg>`;
}

function renderHomeDonutChart() {
    const container = qs('#donut-chart');
    if (!container) return;
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const total = Math.max(tasks.length, 1);
    const todayStr = new Date().toDateString();
    const habitsDone = habits.filter(h => h.lastCompleted === todayStr).length;
    const segments = [
        { label: 'Tasks Done', value: completed, color: '#10b981' },
        { label: 'Tasks Pending', value: pending, color: '#f59e0b' },
        { label: 'Habits Done', value: habitsDone, color: '#8b5cf6' },
        { label: 'Habits Left', value: Math.max(0, habits.length - habitsDone), color: '#64748b' }
    ];
    const totalVal = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const R = 55; const cx = 70; const cy = 70;
    let angle = -90; let svg = '';
    segments.forEach(seg => {
        if (seg.value === 0) return;
        const pct = seg.value / totalVal;
        const sweep = pct * 360;
        const startRad = (angle * Math.PI) / 180;
        const endRad = ((angle + sweep) * Math.PI) / 180;
        const largeArc = sweep > 180 ? 1 : 0;
        const x1 = cx + R * Math.cos(startRad), y1 = cy + R * Math.sin(startRad);
        const x2 = cx + R * Math.cos(endRad), y2 = cy + R * Math.sin(endRad);
        svg += `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z" fill="${seg.color}" opacity=".85"><animate attributeName="opacity" from="0" to=".85" dur="0.5s" fill="freeze"/></path>`;
        angle += sweep;
    });
    svg += `<circle cx="${cx}" cy="${cy}" r="32" fill="var(--card-bg)"/>`;
    svg += `<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="16" font-weight="800" fill="var(--text)" font-family="Inter">${Math.round((completed/total)*100)}%</text>`;
    svg += `<text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="8" fill="var(--text-muted)" font-family="Inter">Overall</text>`;
    let legend = '<div style="display:flex;flex-direction:column;gap:6px;margin-left:12px;">';
    segments.forEach(seg => { legend += `<div style="display:flex;align-items:center;gap:6px;font-size:.7rem;"><div style="width:8px;height:8px;border-radius:50%;background:${seg.color};"></div><span>${seg.label}: ${seg.value}</span></div>`; });
    legend += '</div>';
    container.innerHTML = `<div style="display:flex;align-items:center;"><svg width="140" height="140" viewBox="0 0 140 140">${svg}</svg>${legend}</div>`;
}

function renderHomeStreakDots() {
    const container = qs('#week-dots');
    if (!container) return;
    const dayLabels = ['M','T','W','T','F','S','S'];
    const today = new Date();
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        const anyDone = habits.some(h => (h.history && h.history.includes(dateStr)) || h.lastCompleted === dateStr);
        const isToday = i === 0;
        html += `<div class="week-dot ${anyDone?'active':''} ${isToday?'today':''}">${dayLabels[6-i]}</div>`;
    }
    container.innerHTML = html;
    // Update streak count
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        const anyDone = habits.some(h => (h.history && h.history.includes(dateStr)) || h.lastCompleted === dateStr);
        if (anyDone) streak++; else if (i > 0) break;
    }
    const sc = qs('#streak-count'); if (sc) sc.textContent = streak;
}

function renderHomeSchedule() {
    const container = qs('#schedule-list');
    if (!container) return;
    const todayTasks = tasks.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);
    if (todayTasks.length === 0) { container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem;font-size:.85rem;">No tasks yet. Add one below!</div>'; return; }
    let html = '';
    const icons = ['📋','💪','📚','🧘','💻','🎯'];
    todayTasks.forEach((t, i) => {
        const iconBg = t.completed ? 'rgba(16,185,129,.12)' : 'rgba(139,92,246,.12)';
        html += `<div class="schedule-item"><div class="schedule-icon" style="background:${iconBg}">${icons[i % icons.length]}</div><div class="schedule-info"><strong>${escapeHTML(t.text)}</strong><span>${formatTime(t.time)}</span></div><div class="schedule-status ${t.completed?'done':'pending'}">${t.completed?'✓':'○'}</div></div>`;
    });
    container.innerHTML = html;
}

// Utils
function setDate() {
    const now = new Date();
    const optionsFull = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (elements.dateFull) elements.dateFull.textContent = now.toLocaleDateString('en-US', optionsFull);
    
    const hour = now.getHours();
    let greeting = 'Good Morning';
    let emoji = '☀️';
    if (hour >= 12 && hour < 17) { greeting = 'Good Afternoon'; emoji = '🌤️'; }
    else if (hour >= 17) { greeting = 'Good Evening'; emoji = '🌙'; }
    
    if (elements.dateName) elements.dateName.innerHTML = greeting + ', <strong>' + escapeHTML(userName) + '!</strong> ' + emoji;
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Theme
function applyTheme() {
    const savedTheme = localStorage.getItem('lifestyle_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('lifestyle_theme', isLight ? 'light' : 'dark');
}

// Notifications
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function setupReminders() {
    const coachMessages = [
        "No excuses! Time to execute:",
        "Stay focused and crush this:",
        "Your future self will thank you. Do:",
        "Accountability check! Get to work on:",
        "Discipline equals freedom. Next up:"
    ];

    // Check every minute for upcoming tasks
    setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        tasks.forEach(task => {
            if (!task.completed && task.time === currentTime && !task.notified) {
                const msg = coachMessages[Math.floor(Math.random() * coachMessages.length)];
                showNotification("COACH ALERT", `${msg} ${task.text}`);
                task.notified = true; // prevent multiple notifications for same minute
                saveTasks();
            }
        });
    }, 60000);
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "favicon.ico" });
    }
    
    // In-app Toast fallback
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div><strong>${title}</strong><br>${body}</div>`;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// --- Habits Logic ---
function handleAddHabit(e) {
    e.preventDefault();
    const text = elements.habitInput.value.trim();
    if (text) {
        habits.push({ id: Date.now().toString(), text, streak: 0, lastCompleted: null });
        localStorage.setItem('lifestyle_habits', JSON.stringify(habits));
        renderHabits();
        elements.habitInput.value = '';
    }
}

function handleHabitAction(e) {
    const toggleBtn = e.target.closest('[data-action="toggle-habit"]');
    const deleteBtn = e.target.closest('[data-action="delete-habit"]');
    
    if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const habit = habits.find(h => h.id === id);
        if (!habit) return;
        const today = new Date().toDateString();
        if (!habit.history) habit.history = [];
        if (habit.lastCompleted !== today) {
            habit.streak++;
            habit.lastCompleted = today;
            if (!habit.history.includes(today)) habit.history.push(today);
            addXP(15);
        } else {
            habit.streak = Math.max(0, habit.streak - 1);
            habit.lastCompleted = null;
            removeXP(15);
        }
        localStorage.setItem('lifestyle_habits', JSON.stringify(habits));
        renderHabits();
    }
    
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        habits = habits.filter(h => h.id !== id);
        localStorage.setItem('lifestyle_habits', JSON.stringify(habits));
        renderHabits();
    }
}

function renderHabits() {
    elements.habitList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const today = new Date().toDateString();
    let doneToday = 0;
    
    if (habits.length === 0) {
        elements.habitList.innerHTML = '<div style="grid-column: 1 / -1; color:var(--text-muted);text-align:center;padding:2rem;">No habits yet. Add one above!</div>';
    } else {
        habits.forEach(habit => {
            const isDone = habit.lastCompleted === today;
            if (isDone) doneToday++;
            const div = document.createElement('div');
            div.className = `habit-card image-card ${isDone ? 'completed' : ''}`;
            div.style.backgroundImage = `url('${getImageUrlForTask(habit.text)}')`;
            
            div.innerHTML = `
                <div class="image-card-overlay">
                    <div class="card-top">
                        <div class="status-badge ${isDone ? 'done' : ''}">${isDone ? 'DONE' : 'PENDING'}</div>
                        <div class="card-actions">
                            <button class="icon-btn" data-action="toggle-habit" data-id="${habit.id}" title="Toggle">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="icon-btn delete" data-action="delete-habit" data-id="${habit.id}" title="Remove">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events:none;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="card-bottom">
                        <div class="card-title">${escapeHTML(habit.text)}</div>
                        <div class="card-meta">
                            <span>${habit.streak > 0 ? '🔥' : '⚪'} ${habit.streak} Day Streak</span>
                        </div>
                    </div>
                </div>
            `;
            fragment.appendChild(div);
        });
        elements.habitList.appendChild(fragment);
    }
    
    if (elements.habitsTodayCount) {
        elements.habitsTodayCount.textContent = `${doneToday} / ${habits.length} done today`;
    }
    renderHabitChart();
}

function renderHabitChart() {
    const container = qs('#habit-chart');
    if (!container) return;
    
    const days = [];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({ label: dayNames[d.getDay()], dateStr: d.toDateString() });
    }
    
    const total = habits.length || 1;
    const counts = days.map(day => {
        let done = 0;
        habits.forEach(h => {
            if (!h.history) return;
            if (h.history.includes(day.dateStr)) done++;
            if (h.lastCompleted === day.dateStr) done++; // also count today live
        });
        // Deduplicate in case history and lastCompleted overlap
        const pct = Math.min(done / total, 1);
        return { label: day.label, pct };
    });
    
    const W = container.offsetWidth || 500;
    const H = 140;
    const barW = Math.floor((W - 80) / 7);
    const maxBarH = 90;
    
    let svgBars = '';
    counts.forEach((day, i) => {
        const x = 40 + i * barW + barW * 0.15;
        const bw = barW * 0.7;
        const bh = Math.max(4, day.pct * maxBarH);
        const by = H - 30 - bh;
        const pctLabel = Math.round(day.pct * 100);
        const isToday = i === 6;
        const fill = isToday ? 'var(--primary)' : (day.pct > 0 ? 'var(--primary-light)' : 'var(--border-color)');
        const textCol = isToday ? 'var(--primary)' : 'var(--text-muted)';
        svgBars += `
            <rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="${fill}" style="transition: all 0.4s ease;" />
            <text x="${x + bw/2}" y="${H - 14}" text-anchor="middle" font-size="11" font-family="Inter, sans-serif" fill="${textCol}" font-weight="${isToday ? '700' : '500'}">${day.label}</text>
            ${day.pct > 0 ? `<text x="${x + bw/2}" y="${by - 5}" text-anchor="middle" font-size="10" font-family="Inter, sans-serif" fill="var(--text-muted)">${pctLabel}%</text>` : ''}
        `;
    });
    
    container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${svgBars}</svg>`;
}

// --- AI Coach Logic ---
const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro"
];

const OFFLINE_RESPONSES = [
    "**Stop overthinking. Start doing.** 💪\n\nHere's your 3-step plan:\n• Pick ONE thing from your task list right now\n• Set a 25-minute timer and go ALL IN\n• When done, reward yourself with a 5-min break\n\nYou don't need motivation — you need **discipline**. Now GO!",
    "**Listen up.** 🔥\n\nThe version of you that you want to become is watching you right now. Are you going to scroll, or are you going to **grind**?\n\n• Hydrate — drink water right now\n• Move — do 10 pushups or a quick walk\n• Focus — knock out your next task\n\nNo more excuses. **Execute.**",
    "**Real talk:** Every single day you skip is a vote for the person you DON'T want to be. 🎯\n\nHere's what winners do:\n• They show up even when they don't feel like it\n• They track their progress (you're already doing that!)\n• They stay consistent, not perfect\n\n**Consistency beats intensity.** Keep going!",
    "**You're closer than you think.** 🚀\n\nMost people quit right before the breakthrough. Don't be most people.\n\n• Review your habits — which one needs attention today?\n• Stack a new habit onto an existing one\n• Celebrate small wins — they compound into big results\n\nYour future self will **thank you** for today's effort.",
    "**Wake up!** ⚡\n\nComfort is the enemy of growth. If it feels easy, you're not pushing hard enough.\n\n• Challenge yourself with one hard task today\n• Say NO to one distraction\n• Go to bed tonight knowing you gave it your ALL\n\n**Discipline today = Freedom tomorrow.** Let's go!",
    "**Here's the truth nobody tells you:** 💎\n\nYou don't rise to the level of your goals. You fall to the level of your **systems**.\n\n• Build a morning routine and stick to it\n• Set specific times for your tasks (not \"later\")\n• Remove friction — prepare the night before\n\nSystems win. Feelings don't. **Build the system.**",
    "**Progress check!** 📊\n\nLook at your dashboard. Every completed task is proof that you CAN do hard things.\n\n• Not enough done? That's OK — start NOW\n• Feeling stuck? Break your next task into 3 tiny steps\n• Feeling good? KEEP THE MOMENTUM going\n\nThe best time to start was yesterday. The second best time is **right now.**"
];

async function tryGeminiModel(model, fullPrompt) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
        })
    });
    const data = await res.json();
    
    if (data.error) {
        throw new Error(data.error.message || "API error");
    }
    
    if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Empty response");
}

async function callGeminiAPI(promptText) {
    const systemPrompt = "You are a tough-love accountability coach. Give short, punchy, motivational advice. Break down tasks easily using bullet points.\n\nUser says: ";
    const fullPrompt = systemPrompt + promptText;

    // Try each model in order
    for (const model of GEMINI_MODELS) {
        try {
            console.log(`Trying model: ${model}...`);
            const result = await tryGeminiModel(model, fullPrompt);
            console.log(`Success with model: ${model}`);
            return result;
        } catch (err) {
            console.warn(`Model ${model} failed: ${err.message}`);
            continue;
        }
    }
    
    // All models failed — use smart offline fallback
    console.log("All API models failed. Using offline coach.");
    return getOfflineResponse(promptText);
}

function getOfflineResponse(userInput) {
    const input = userInput.toLowerCase();
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - doneTasks;
    const today = new Date().toDateString();
    const habitsDoneToday = habits.filter(h => h.lastCompleted === today).length;
    const topStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    const pendingNames = tasks.filter(t => !t.completed).map(t => t.text).slice(0, 3);

    // --- PERSONALIZED DATA-AWARE RESPONSES ---

    // Schedule / today / plan
    if (input.includes('schedule') || input.includes('today') || input.includes('plan') || input.includes('what should i do')) {
        let resp = `**Here's your ${timeOfDay} game plan:** 📋\n\n`;
        resp += `📊 **Your Dashboard:** ${doneTasks}/${totalTasks} tasks done, ${habitsDoneToday}/${habits.length} habits completed\n\n`;
        if (pendingTasks > 0) {
            resp += `🔥 **Priority tasks to crush right now:**\n`;
            pendingNames.forEach((t, i) => { resp += `${i+1}. ${t}\n`; });
            if (pendingTasks > 3) resp += `   ...and ${pendingTasks - 3} more\n`;
            resp += `\n⏱️ **Action plan:**\n• Pick task #1 and set a 25-min timer\n• No phone, no distractions\n• After each task, check it off and move to the next\n\n`;
        } else if (totalTasks === 0) {
            resp += `You have **no tasks yet!** Go to the Tasks tab and add your goals for today.\n\n`;
        } else {
            resp += `🎉 **ALL tasks complete!** You're crushing it!\n• Review your habits — any left to check off?\n• Plan tomorrow's tasks tonight for a head start\n\n`;
        }
        resp += `**${timeOfDay === 'morning' ? 'Win the morning, win the day.' : timeOfDay === 'afternoon' ? 'Afternoon push — finish strong!' : 'Reflect, plan, and rest well tonight.'}** 💪`;
        return resp;
    }

    // Study / learn / exam / education
    if (input.includes('study') || input.includes('learn') || input.includes('exam') || input.includes('read') || input.includes('book') || input.includes('education') || input.includes('college') || input.includes('class')) {
        const topic = input.replace(/how (do|can|should) i |give me |i need |i want to |help me |a |the |to |for |about |today|todays|schedule/gi, '').trim();
        let resp = `**Study Plan${topic ? ': ' + topic.charAt(0).toUpperCase() + topic.slice(1) : ''}** 📚\n\n`;
        resp += `**Step 1: Prepare (5 min)**\n• Clear your desk, silence your phone\n• Write down exactly WHAT you'll cover\n• Set a 45-min focus timer\n\n`;
        resp += `**Step 2: Active Learning (45 min)**\n• Don't just read — take notes in YOUR words\n• Use the Feynman technique: explain it like teaching someone\n• Highlight key concepts, create flashcards for review\n\n`;
        resp += `**Step 3: Review & Rest (10 min)**\n• Quiz yourself without looking at notes\n• Write 3 key takeaways from the session\n• Take a real break — walk, stretch, hydrate\n\n`;
        resp += `**Repeat 2-3 cycles per day.** Consistency > cramming.\n\n`;
        resp += `🧠 **Pro tip:** Study the hardest material in the ${timeOfDay === 'morning' ? 'morning when your brain is freshest' : 'morning — try waking up earlier for peak focus'}.`;
        return resp;
    }

    // Share market / stocks / trading / finance / money / invest
    if (input.includes('stock') || input.includes('share') || input.includes('market') || input.includes('trading') || input.includes('invest') || input.includes('finance') || input.includes('money') || input.includes('crypto') || input.includes('mutual fund')) {
        return `**Financial Learning Roadmap** 💰\n\n**Phase 1 — Foundation (Week 1-2)**\n• Learn basic terminology: stocks, bonds, mutual funds, ETFs\n• Understand how the stock market works (NSE/BSE basics)\n• Read: *The Intelligent Investor* by Benjamin Graham\n• Follow financial news daily (Moneycontrol, Economic Times)\n\n**Phase 2 — Skills (Week 3-4)**\n• Learn to read stock charts (candlestick patterns)\n• Understand fundamental analysis (P/E ratio, EPS, market cap)\n• Study technical analysis basics (support, resistance, RSI)\n• Practice with paper trading (virtual money) first!\n\n**Phase 3 — Action (Month 2+)**\n• Open a demat account (Zerodha, Groww, etc.)\n• Start with index funds/ETFs (safer for beginners)\n• Never invest more than you can afford to lose\n• Diversify: don't put all eggs in one basket\n\n**Daily Routine:**\n• 📰 9:00 AM — Read pre-market news\n• 📊 9:15 AM — Watch market open\n• 📖 Evening — 30 min studying charts/concepts\n\n⚠️ **Rule #1: Never trade on emotion. Always have a strategy.**`;
    }

    // Coding / programming / tech
    if (input.includes('code') || input.includes('coding') || input.includes('program') || input.includes('develop') || input.includes('web') || input.includes('python') || input.includes('javascript') || input.includes('software') || input.includes('tech') || input.includes('app')) {
        return `**Coding Mastery Plan** 💻\n\n**Daily Structure:**\n• ☀️ **Morning (1 hr):** Learn new concepts (tutorials, docs)\n• 🔨 **Afternoon (2 hrs):** Build projects — this is where real learning happens\n• 🌙 **Evening (30 min):** Solve 1-2 coding challenges (LeetCode, HackerRank)\n\n**Beginner Roadmap:**\n1. Pick ONE language and master it (Python or JavaScript)\n2. Build 3 projects: calculator, to-do app, portfolio website\n3. Learn Git & GitHub — non-negotiable\n4. Understand data structures & algorithms basics\n\n**Pro Tips:**\n• Don't tutorial-hop — pick one course and FINISH it\n• Break when stuck for 30 min, then try again\n• Read other people's code on GitHub\n• Teach what you learn — it solidifies knowledge\n\n**The #1 rule: CODE EVERY SINGLE DAY.** Even 30 minutes counts. 🔥`;
    }

    // Morning routine / wake up
    if (input.includes('morning') || input.includes('routine') || input.includes('wake')) {
        return `**Your ${timeOfDay === 'morning' ? 'Perfect' : 'Ideal'} Morning Routine:** ☀️\n\n⏰ **5:30 AM** — Wake up. NO snooze. Feet on the floor.\n🚰 **5:35** — Drink a full glass of water\n🧘 **5:40** — 10 min meditation or deep breathing\n🏃 **5:50** — 20 min exercise (walk, gym, yoga)\n🚿 **6:15** — Cold shower (builds mental toughness)\n📝 **6:30** — Journal: 3 things you're grateful for + top 3 goals today\n☕ **6:45** — Breakfast + review your task list\n🎯 **7:00** — Start your hardest task FIRST (eat the frog)\n\n**Rules:**\n• No phone for first 30 minutes\n• Same time EVERY day — weekends included\n• Prepare clothes and bag the night before\n\n${habitsDoneToday > 0 ? `✅ You've already completed ${habitsDoneToday} habits today. Keep it up!` : '⚡ You haven\'t checked off any habits yet today. Start NOW!'}\n\n**Win the morning = Win the day.** 🏆`;
    }

    // Motivation / lazy / procrastination
    if (input.includes('lazy') || input.includes('motivat') || input.includes('procrastinat') || input.includes('stuck') || input.includes('can\'t') || input.includes('hard') || input.includes('give up') || input.includes('quit')) {
        return `**Feeling stuck? Listen carefully.** 💪\n\n${pendingTasks > 0 ? `You have **${pendingTasks} tasks** waiting. That's not a burden — that's an **opportunity**.` : 'Even with no tasks pending, there\'s always room to grow.'}\n\nThe truth? **Motivation is a myth.** Here's what actually works:\n\n**The 2-Minute Rule:**\n1. Pick the SMALLEST thing you can do right now\n2. Do it for just 2 minutes\n3. Once you start, momentum takes over\n\n**Mental Reframe:**\n• "I don't feel like it" → "That's exactly why I should"\n• "It's too hard" → "Hard is what makes it worth doing"\n• "Tomorrow" → "Tomorrow-me will say the same thing"\n\n**Right now, do this:**\n• Stand up from your chair\n• Do 10 jumping jacks\n• Sit back down and start your next task\n\n${topStreak > 0 ? `🔥 You have a **${topStreak}-day streak** going. Don't break the chain!` : '🔥 Start a streak today. Day 1 is the hardest — but you WILL thank yourself.'}\n\n**You're not lazy. You're just comfortable. Get uncomfortable.** ⚡`;
    }

    // Habits / streaks / consistency
    if (input.includes('habit') || input.includes('consistent') || input.includes('streak') || input.includes('discipline')) {
        return `**Habit Mastery System** 🔥\n\n📊 **Your Current Stats:** ${habitsDoneToday}/${habits.length} habits done today | Best streak: ${topStreak} days\n\n**The Science of Habits:**\n1. **Cue** — Set a specific trigger (after I wake up, I will...)\n2. **Routine** — Keep it tiny at first (2 mins)\n3. **Reward** — Check it off here! That dopamine hit matters\n\n**Advanced Strategies:**\n• **Habit Stacking:** "After [current habit], I will [new habit]"\n• **Environment Design:** Make good habits easy, bad ones hard\n• **Never Miss Twice:** 1 miss is an accident. 2 is a new pattern.\n• **Identity Shift:** Don't say "I'm trying to exercise" → Say "I AM someone who exercises"\n\n**Your ${habits.length} tracked habits are your non-negotiables.** Treat them like brushing your teeth — you just DO them.\n\n**Consistency > Intensity. Every. Single. Time.** 🏆`;
    }

    // Sleep / rest / tired
    if (input.includes('sleep') || input.includes('rest') || input.includes('tired') || input.includes('energy') || input.includes('exhausted') || input.includes('burnout')) {
        return `**Sleep & Recovery Protocol** 🌙\n\n**Your body is not a machine — it needs recovery to perform.**\n\n**Evening Routine (start 1 hr before bed):**\n• 📱 Screens OFF — blue light kills melatonin\n• 📖 Read a physical book or journal\n• 🧘 5 min breathing: inhale 4s, hold 4s, exhale 6s\n• 🌡️ Cool room (18-20°C is optimal)\n• ⏰ Same bedtime EVERY night\n\n**Sleep Rules:**\n• 7-8 hours minimum — non-negotiable\n• No caffeine after 2 PM\n• No heavy meals 2 hours before bed\n• If you can't sleep in 20 min, get up and read until drowsy\n\n**Energy Boosters (without coffee):**\n• Cold water on your face\n• 5-min walk outside in sunlight\n• 10 deep breaths\n• Power nap: exactly 20 min (set an alarm!)\n\n**Rest is not laziness. It's preparation for greatness.** 💎`;
    }

    // Exercise / workout / gym / fitness
    if (input.includes('exercise') || input.includes('workout') || input.includes('gym') || input.includes('fit') || input.includes('weight') || input.includes('muscle') || input.includes('run')) {
        return `**Fitness Action Plan** 🏋️\n\n**Beginner-Friendly Daily Workout (No gym needed):**\n\n🔥 **Warm-up (3 min):** Jumping jacks + arm circles\n\n💪 **Circuit (3 rounds):**\n• 15 Push-ups (or knee push-ups)\n• 20 Squats\n• 30-sec Plank\n• 10 Lunges each leg\n• 15 Crunches\n• 60-sec Rest between rounds\n\n🧘 **Cool-down (3 min):** Stretching\n\n**Weekly Split (if you have more time):**\n• Mon/Thu — Upper body + core\n• Tue/Fri — Lower body + cardio\n• Wed — Active rest (walk, yoga)\n• Sat — Full body\n• Sun — Complete rest\n\n**Nutrition basics:**\n• Protein with every meal\n• Drink 3+ liters of water daily\n• Eat whole foods, minimize processed junk\n\n**The best workout plan is the one you actually DO.** Start today! 💪`;
    }

    // Focus / distraction / productivity
    if (input.includes('focus') || input.includes('distract') || input.includes('productiv') || input.includes('concentrat') || input.includes('attention')) {
        return `**Deep Focus System** 🎯\n\n${pendingTasks > 0 ? `You have **${pendingTasks} tasks** waiting. Let's knock them out.` : ''}\n\n**The Pomodoro Method (Modified):**\n1. Choose ONE task\n2. Set timer: **25 minutes**\n3. Work with ZERO interruptions\n4. Break: **5 minutes** (stand, stretch, water)\n5. After 4 cycles: **15-min break**\n\n**Kill Distractions:**\n• Phone → Different room or airplane mode\n• Browser → Close ALL unnecessary tabs\n• Music → Instrumental only (lo-fi, classical)\n• People → "I'm in focus mode, talk in 25 min"\n\n**Pro Tips:**\n• Do your hardest work during your peak hours\n• Batch similar tasks together\n• Write down random thoughts to address LATER\n• Single-tasking beats multitasking every time\n\n**Your attention is your most valuable asset. Protect it fiercely.** ⚡`;
    }

    // Goals / success / ambition
    if (input.includes('goal') || input.includes('success') || input.includes('dream') || input.includes('future') || input.includes('career') || input.includes('ambition')) {
        return `**Goal Achievement Framework** 🚀\n\n**Step 1: Define (be SPECIFIC)**\n• ❌ "I want to be successful"\n• ✅ "I will earn ₹X by doing Y within Z months"\n\n**Step 2: Break it down**\n• Yearly goal → Monthly milestones\n• Monthly → Weekly targets\n• Weekly → Daily actions (that's your task list!)\n\n**Step 3: Execute daily**\n• Every morning: "What's the ONE thing that moves me closest to my goal?"\n• Do that FIRST, before anything else\n• Track progress weekly — what worked, what didn't\n\n**Step 4: Review & adjust**\n• Every Sunday: 30-min weekly review\n• Keep the goal, change the strategy if needed\n• Celebrate milestones — you earned it\n\n📊 **Right now you have ${totalTasks} tasks tracked. ${doneTasks > 0 ? `${doneTasks} already done — proof you CAN execute!` : 'Start completing them to build momentum!'}**\n\n**Execution separates dreamers from achievers.** Which one are you? 🏆`;
    }

    // Diet / nutrition / food / eat / health
    if (input.includes('diet') || input.includes('food') || input.includes('eat') || input.includes('nutrition') || input.includes('health') || input.includes('meal')) {
        return `**Nutrition Game Plan** 🥗\n\n**Simple Rules (no complicated diets):**\n\n🍳 **Breakfast:** Protein + complex carbs\n   (Eggs + oats, or yogurt + fruits + nuts)\n\n🥗 **Lunch:** Balanced plate\n   (½ veggies, ¼ protein, ¼ whole grains)\n\n🍗 **Dinner:** Light & early\n   (Protein + veggies, eat before 8 PM)\n\n🥜 **Snacks:** Nuts, fruits, yogurt\n   (NOT chips, cookies, or fried food)\n\n**Daily Checklist:**\n• [ ] 3+ liters of water\n• [ ] 5 servings of fruits/vegetables\n• [ ] Protein with every meal\n• [ ] No sugar drinks (cola, packaged juice)\n• [ ] No eating after 9 PM\n\n**80/20 Rule:** Eat clean 80% of the time. 20% enjoy life.\n\n**You are what you eat. Fuel your body like the machine it is.** 💪`;
    }

    // Stress / anxiety / mental health / overwhelmed
    if (input.includes('stress') || input.includes('anxi') || input.includes('overwhelm') || input.includes('mental') || input.includes('depress') || input.includes('worry') || input.includes('panic') || input.includes('calm')) {
        return `**Stress Management Protocol** 🧘\n\n**Right now, do this (60 seconds):**\n1. Close your eyes\n2. Inhale deeply for 4 seconds\n3. Hold for 4 seconds\n4. Exhale slowly for 6 seconds\n5. Repeat 4 times\n\n**Daily Anti-Stress Habits:**\n• 🧘 10 min meditation (use Headspace or just sit quietly)\n• 📝 Journal: write what's bothering you — get it OUT of your head\n• 🚶 20-min walk in nature/sunlight\n• 📵 1 hour phone-free before bed\n• 💬 Talk to someone you trust\n\n**Reframe Your Thinking:**\n• "Everything is going wrong" → "What's ONE thing going right?"\n• "I can't handle this" → "I've survived every hard day so far"\n• "What if it fails?" → "What if it WORKS?"\n\n**You are stronger than your stress. This too shall pass.** ❤️\n\n⚠️ *If you're really struggling, please reach out to a professional. There's no shame in asking for help.*`;
    }

    // Time management
    if (input.includes('time') || input.includes('busy') || input.includes('manage') || input.includes('schedule') || input.includes('organize')) {
        return `**Time Management Mastery** ⏰\n\n**The Time-Blocking Method:**\n• 🌅 6-9 AM: Morning routine + hardest work\n• 🔨 9-12 PM: Deep work block (no meetings)\n• 🍽️ 12-1 PM: Lunch + recharge\n• 📋 1-4 PM: Meetings, calls, lighter tasks\n• 📚 4-6 PM: Learning & skill-building\n• 🌙 6-10 PM: Exercise, dinner, rest, prep tomorrow\n\n**Rules:**\n• Touch it once — if it takes < 2 min, do it NOW\n• Say NO to things that don't align with your goals\n• Batch similar tasks (all calls together, all emails together)\n• Plan tomorrow TONIGHT — wake up with purpose\n\n📊 **You currently have ${pendingTasks} pending tasks.** ${pendingTasks > 3 ? 'Prioritize the top 3 and do those first!' : pendingTasks > 0 ? 'Very manageable — knock them out!' : 'All clear! Time to plan ahead!'}\n\n**You have the same 24 hours as everyone else. USE them wisely.** 🔥`;
    }

    // Relationships / social / friends / lonely
    if (input.includes('friend') || input.includes('social') || input.includes('lonely') || input.includes('relationship') || input.includes('people') || input.includes('talk')) {
        return `**Building Strong Connections** 🤝\n\n**Daily Social Habits:**\n• Reach out to ONE person every day (text, call, or in person)\n• Listen more than you speak — people remember how you made them feel\n• Be genuinely interested in others\n• Show up when you say you will\n\n**Quality Over Quantity:**\n• You don't need 100 friends — you need 5 real ones\n• Invest in people who invest in YOU\n• Cut toxic relationships without guilt\n• Be the friend you wish you had\n\n**Social Skills to Practice:**\n• Make eye contact and smile\n• Remember and use people's names\n• Ask follow-up questions\n• Be vulnerable — it builds trust\n\n**Your network is your net worth — in life AND career.** 💎`;
    }

    // Hello / greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('sup') || input.match(/^(yo|hola|greetings)/)) {
        const greetings = [
            `**Hey there!** 👋 Good ${timeOfDay}!\n\n📊 **Quick status:** ${doneTasks}/${totalTasks} tasks done | ${habitsDoneToday}/${habits.length} habits checked\n\n${pendingTasks > 0 ? `You've got **${pendingTasks} tasks** to crush. Ask me about anything — study tips, workout plans, motivation, time management, or just tell me what you're working on!\n\n**Let's make today count!** 🔥` : `All tasks done! 🎉 Ask me about building new habits, learning something new, or planning tomorrow!\n\n**Keep the momentum going!** 💪`}`,
        ];
        return greetings[0];
    }

    // Thanks / appreciation
    if (input.includes('thank') || input.includes('thanks') || input.includes('helpful') || input.includes('great') || input.includes('awesome')) {
        return `**You're welcome!** 🙌\n\nBut don't thank me — thank **yourself** for showing up and putting in the work.\n\n${pendingTasks > 0 ? `Now go crush those **${pendingTasks} remaining tasks**!` : 'You\'re all caught up — use this energy to plan ahead!'}\n\n**I'm here whenever you need a push. Keep going!** 🔥`;
    }

    // Personalized fallback using actual data
    let resp = `**Coach's take on: "${userInput.substring(0, 60)}${userInput.length > 60 ? '...' : ''}"** 🎯\n\n`;
    resp += `Here's my **actionable framework** for tackling this:\n\n`;
    resp += `**Step 1: Research (30 min)**\n• Google the basics — understand the fundamentals first\n• Watch 1-2 YouTube videos from experts\n• Take notes on key points\n\n`;
    resp += `**Step 2: Plan (15 min)**\n• Break it into 3-5 small, doable tasks\n• Add them to your task list right here in the app\n• Set specific times for each\n\n`;
    resp += `**Step 3: Execute (start NOW)**\n• Begin with the easiest task to build momentum\n• Use the Pomodoro technique: 25 min focus, 5 min break\n• Check off tasks as you go — the dopamine helps!\n\n`;
    resp += `📊 **Your current progress:** ${doneTasks}/${totalTasks} tasks done | ${habitsDoneToday}/${habits.length} habits today${topStreak > 0 ? ` | 🔥 ${topStreak}-day best streak` : ''}\n\n`;
    resp += `**Don't just think about it. DO it. Start with step 1 right now.** 💪`;
    return resp;
}

function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    let formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    div.innerHTML = `<div class="msg-content">${formattedText}</div>`;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const text = elements.chatInput.value.trim();
    if (!text) return;
    
    appendMessage('user', escapeHTML(text));
    elements.chatInput.value = '';
    
    appendMessage('coach', '...');
    const loadingMsg = elements.chatMessages.lastChild;
    
    const reply = await callGeminiAPI(text);
    let formattedReply = reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    loadingMsg.innerHTML = `<div class="msg-content">${formattedReply}</div>`;
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function requestAIAssist(taskText) {
    switchView('coach');
    const prompt = `Give me a very quick 3-step action plan to accomplish this task right now: ${taskText}`;
    elements.chatInput.value = prompt;
    elements.chatForm.dispatchEvent(new Event('submit'));
}

// ===== USERNAME SYSTEM =====
function updateAllUserNames() {
    const initial = userName.charAt(0).toUpperCase();
    const sn = qs('#sidebar-username'); if (sn) sn.textContent = userName;
    const sa = qs('#sidebar-avatar'); if (sa) sa.textContent = initial;
    const ta = qs('#top-avatar'); if (ta) ta.textContent = initial;
    setDate();
    const si = qs('#settings-name-input'); if (si) si.value = userName;
}
function openNameModal() {
    const overlay = qs('#name-modal-overlay');
    const input = qs('#name-modal-input');
    if (overlay) { overlay.classList.add('show'); if (input) { input.value = userName; input.focus(); input.select(); } }
}
function closeNameModal() { const o = qs('#name-modal-overlay'); if (o) o.classList.remove('show'); }
function saveNameFromModal() {
    const input = qs('#name-modal-input');
    if (input && input.value.trim()) {
        userName = input.value.trim().substring(0, 20);
        localStorage.setItem('lifestyle_username', userName);
        updateAllUserNames();
        closeNameModal();
        showNotification('Name Updated', 'Welcome, ' + userName + '!');
    }
}

// ===== XP & LEVEL SYSTEM =====
function getLevel() { return Math.floor(userXP / 100) + 1; }
function getLevelProgress() { return userXP % 100; }
function addXP(amount) {
    const oldLevel = getLevel();
    userXP += amount;
    localStorage.setItem('lifestyle_xp', userXP);
    updateLevelUI();
    showXPPopup('+' + amount + ' XP');
    if (getLevel() > oldLevel) showLevelUp(getLevel());
    updateQuickStats();
    if (typeof checkBadges === 'function') checkBadges();
}
function removeXP(amount) {
    userXP = Math.max(0, userXP - amount);
    localStorage.setItem('lifestyle_xp', userXP);
    updateLevelUI();
}
function updateLevelUI() {
    const level = getLevel();
    const progress = getLevelProgress();
    const lt = qs('#user-level-text'); if (lt) lt.textContent = 'Level ' + level;
    const lf = qs('#level-fill'); if (lf) lf.style.width = progress + '%';
    const xt = qs('#xp-text'); if (xt) xt.textContent = progress + ' / 100 XP';
}
function showXPPopup(text) {
    const popup = qs('#xp-popup');
    if (!popup) return;
    popup.textContent = text;
    popup.classList.remove('show');
    void popup.offsetWidth;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 900);
}
function showLevelUp(level) {
    const overlay = qs('#levelup-overlay');
    const text = qs('#levelup-text');
    if (overlay) { if (text) text.textContent = 'You reached Level ' + level + '!'; overlay.classList.add('show'); }
}

// ===== PUZZLE SYSTEM =====
const PUZZLE_DATA = [
    { type:'scramble', image:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop', thought:'"The only way to do great work is to love what you do."', author:'— Steve Jobs', question:'Unscramble: IPDICEILNS', answer:'DISCIPLINE', hint:'It means self-control' },
    { type:'math', image:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop', thought:'"Success is not final, failure is not fatal."', author:'— Winston Churchill', question:'What is 17 × 6 + 8?', answer:'110', hint:'Multiply first, then add' },
    { type:'riddle', image:'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&auto=format&fit=crop', thought:'"The mind is everything. What you think you become."', author:'— Buddha', question:'I have cities but no houses, forests but no trees, water but no fish. What am I?', answer:'MAP', hint:'You use me for navigation' },
    { type:'missing', image:'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop', thought:'"In the middle of difficulty lies opportunity."', author:'— Albert Einstein', question:'Complete: "The only _____ we have to fear is fear itself."', answer:'THING', hint:'Franklin D. Roosevelt said this' },
    { type:'trivia', image:'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop', thought:'"It does not matter how slowly you go as long as you do not stop."', author:'— Confucius', question:'How many minutes are in a day?', answer:'1440', hint:'24 × 60' },
    { type:'scramble', image:'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop', thought:'"Believe you can and you are halfway there."', author:'— Theodore Roosevelt', question:'Unscramble: VTIAOITMNO', answer:'MOTIVATION', hint:'What drives you forward' },
    { type:'math', image:'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=800&auto=format&fit=crop', thought:'"The best time to plant a tree was 20 years ago."', author:'— Chinese Proverb', question:'What is 144 ÷ 12 + 7?', answer:'19', hint:'Divide first, then add' },
    { type:'riddle', image:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop', thought:'"Your time is limited. Don\'t waste it living someone else\'s life."', author:'— Steve Jobs', question:'The more you take, the more you leave behind. What am I?', answer:'FOOTSTEPS', hint:'Think about walking' },
    { type:'missing', image:'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=800&auto=format&fit=crop', thought:'"Strive not to be a success, but rather to be of value."', author:'— Albert Einstein', question:'Complete: "Be the _____ you wish to see in the world."', answer:'CHANGE', hint:'Gandhi\'s famous quote' },
    { type:'trivia', image:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop', thought:'"Hardships prepare ordinary people for extraordinary destinies."', author:'— C.S. Lewis', question:'What planet is known as the Red Planet?', answer:'MARS', hint:'Fourth from the Sun' },
    { type:'scramble', image:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop', thought:'"What we achieve inwardly will change outer reality."', author:'— Plutarch', question:'Unscramble: TRPESEISENC', answer:'PERSISTENCE', hint:'Never giving up' },
    { type:'math', image:'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&auto=format&fit=crop', thought:'"The secret of getting ahead is getting started."', author:'— Mark Twain', question:'What is 25² - 500?', answer:'125', hint:'25 × 25 first' },
    { type:'riddle', image:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&auto=format&fit=crop', thought:'"Act as if what you do makes a difference. It does."', author:'— William James', question:'I speak without a mouth and hear without ears. I have no body but I come alive with wind. What am I?', answer:'ECHO', hint:'It repeats what you say' },
    { type:'missing', image:'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&auto=format&fit=crop', thought:'"Energy and persistence conquer all things."', author:'— Benjamin Franklin', question:'Complete: "A journey of a thousand miles begins with a single _____."', answer:'STEP', hint:'Lao Tzu\'s wisdom' },
    { type:'trivia', image:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop', thought:'"The future belongs to those who believe in the beauty of their dreams."', author:'— Eleanor Roosevelt', question:'How many bones are in the adult human body?', answer:'206', hint:'More than 200' },
    { type:'scramble', image:'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&auto=format&fit=crop', thought:'"Don\'t count the days, make the days count."', author:'— Muhammad Ali', question:'Unscramble: ISLIERENCE', answer:'RESILIENCE', hint:'Bouncing back from failure' },
    { type:'math', image:'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop', thought:'"Success usually comes to those who are too busy to be looking for it."', author:'— Henry David Thoreau', question:'What is 7 × 8 × 2 - 12?', answer:'100', hint:'Multiply all, then subtract' },
    { type:'riddle', image:'https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?w=800&auto=format&fit=crop', thought:'"Everything you\'ve ever wanted is on the other side of fear."', author:'— George Addair', question:'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', answer:'KEYBOARD', hint:'You\'re probably using one now' },
    { type:'missing', image:'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop', thought:'"The only limit to our realization of tomorrow is our doubts of today."', author:'— FDR', question:'Complete: "Stay hungry, stay _____."', answer:'FOOLISH', hint:'Steve Jobs\' famous advice' },
    { type:'trivia', image:'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop', thought:'"It always seems impossible until it is done."', author:'— Nelson Mandela', question:'What is the tallest mountain in the world?', answer:'EVEREST', hint:'Located in the Himalayas' },
    { type:'scramble', image:'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&auto=format&fit=crop', thought:'"You miss 100% of the shots you don\'t take."', author:'— Wayne Gretzky', question:'Unscramble: DTEMAINNORITE', answer:'DETERMINATION', hint:'Strong resolve to succeed' },
    { type:'math', image:'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&auto=format&fit=crop', thought:'"Start where you are. Use what you have. Do what you can."', author:'— Arthur Ashe', question:'What is 15% of 200?', answer:'30', hint:'15/100 × 200' },
    { type:'riddle', image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop', thought:'"Do what you can with all you have, wherever you are."', author:'— Theodore Roosevelt', question:'What gets wetter the more it dries?', answer:'TOWEL', hint:'Used after a shower' },
    { type:'missing', image:'https://images.unsplash.com/photo-1489549132488-d00b7eee80f1?w=800&auto=format&fit=crop', thought:'"Dream big and dare to fail."', author:'— Norman Vaughan', question:'Complete: "In three words I can sum up life: it goes _____."', answer:'ON', hint:'Robert Frost said this' },
    { type:'trivia', image:'https://images.unsplash.com/photo-1484950763426-56b5bf172dbb?w=800&auto=format&fit=crop', thought:'"The harder I work, the luckier I get."', author:'— Gary Player', question:'How many hours does it take to become an expert (Malcolm Gladwell)?', answer:'10000', hint:'Ten thousand' }
];

const TYPE_LABELS = { scramble:'🧩 Word Scramble', math:'🔢 Math Challenge', riddle:'💡 Riddle', missing:'🎯 Missing Word', trivia:'🧠 Trivia' };

function getUnlockedPuzzleCount() {
    // Unlock 1 puzzle per level, minimum 1
    return Math.min(getLevel(), PUZZLE_DATA.length);
}

function renderPuzzles() {
    const container = qs('#puzzle-container');
    if (!container) return;
    const unlocked = getUnlockedPuzzleCount();
    const solvedCount = qs('#puzzles-solved-count');
    if (solvedCount) solvedCount.textContent = solvedPuzzles.length + ' / ' + unlocked + ' Unlocked';

    // Build puzzle list with lock status
    let html = '<div class="puzzle-grid-selector">';
    for (let i = 0; i < PUZZLE_DATA.length; i++) {
        const isUnlocked = i < unlocked;
        const isSolved = solvedPuzzles.includes(i);
        const isCurrent = i === currentPuzzleIndex;
        // Must solve previous puzzle to attempt current (sequential)
        const canAttempt = isUnlocked && (i === 0 || solvedPuzzles.includes(i - 1));
        let cls = 'puzzle-dot';
        if (isCurrent) cls += ' current';
        if (isSolved) cls += ' solved';
        if (!isUnlocked) cls += ' locked';
        if (canAttempt && !isSolved) cls += ' available';
        html += `<div class="${cls}" onclick="selectPuzzle(${i})" title="Puzzle ${i+1}${!isUnlocked?' (Locked — reach Level '+(i+1)+')':isSolved?' (Solved ✓)':canAttempt?' (Available)':' (Solve previous first)'}">${!isUnlocked?'🔒':isSolved?'✅':(i+1)}</div>`;
    }
    html += '</div>';

    // Current puzzle display
    const puzzle = PUZZLE_DATA[currentPuzzleIndex % PUZZLE_DATA.length];
    const isSolved = solvedPuzzles.includes(currentPuzzleIndex);
    const isUnlocked = currentPuzzleIndex < unlocked;
    const canAttempt = isUnlocked && (currentPuzzleIndex === 0 || solvedPuzzles.includes(currentPuzzleIndex - 1));
    const pid = 'puzzle-' + currentPuzzleIndex;

    html += `<div class="puzzle-card" style="background-image:url('${puzzle.image}')">`;
    html += `<div class="puzzle-type-badge">${TYPE_LABELS[puzzle.type]} — Puzzle ${currentPuzzleIndex + 1}</div>`;
    if (isSolved) html += '<div class="puzzle-solved-badge">✅ Solved</div>';
    if (!isUnlocked) html += '<div class="puzzle-solved-badge" style="background:var(--text-muted);">🔒 Locked</div>';

    html += '<div class="puzzle-card-overlay">';
    html += `<div class="puzzle-thought">${puzzle.thought}</div>`;
    html += `<div class="puzzle-thought-author">${puzzle.author}</div>`;
    html += '<div class="puzzle-challenge">';

    if (!isUnlocked) {
        html += `<h4>🔒 Locked</h4><p>Reach <strong>Level ${currentPuzzleIndex + 1}</strong> to unlock this puzzle! Complete tasks and habits to earn XP.</p>`;
        html += `<div style="margin-top:.75rem;padding:.75rem;background:rgba(139,92,246,.08);border-radius:8px;font-size:.85rem;">🎯 Current Level: <strong>${getLevel()}</strong> | Need: <strong>Level ${currentPuzzleIndex + 1}</strong></div>`;
    } else if (!canAttempt) {
        html += `<h4>⏳ Solve Previous First</h4><p>Complete <strong>Puzzle ${currentPuzzleIndex}</strong> before attempting this one!</p>`;
    } else if (isSolved) {
        html += `<h4>${TYPE_LABELS[puzzle.type]}</h4><p>${puzzle.question}</p>`;
        html += '<div class="puzzle-result correct">✅ Solved! +50 XP earned</div>';
    } else {
        html += `<h4>${TYPE_LABELS[puzzle.type]}</h4><p>${puzzle.question}</p>`;
        html += `<div class="puzzle-input-row"><input type="text" id="${pid}-input" placeholder="Your answer..." autocomplete="off"><button class="btn-primary" onclick="checkPuzzleAnswer(${currentPuzzleIndex})">Submit</button><button class="btn-primary" style="background:var(--card-border);color:var(--text);" onclick="showNotification('💡 Hint',PUZZLE_DATA[${currentPuzzleIndex}].hint)">Hint</button></div>`;
        html += `<div class="puzzle-result" id="${pid}-result"></div>`;
    }

    html += '</div>'; // puzzle-challenge
    html += `<div class="puzzle-nav"><button class="btn-primary" style="background:var(--card-border);color:var(--text);" onclick="navigatePuzzle(-1)">← Prev</button><span style="font-size:.8rem;color:var(--text-muted);align-self:center;">${currentPuzzleIndex+1} / ${PUZZLE_DATA.length}</span><button class="btn-primary" onclick="navigatePuzzle(1)">Next →</button></div>`;
    html += '</div></div>'; // overlay, card

    container.innerHTML = html;

    const inp = qs('#' + pid + '-input');
    if (inp) { inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPuzzleAnswer(currentPuzzleIndex); }); inp.focus(); }
}

function selectPuzzle(index) {
    currentPuzzleIndex = index;
    localStorage.setItem('lifestyle_puzzle_index', currentPuzzleIndex);
    renderPuzzles();
}

function checkPuzzleAnswer(index) {
    const pid = 'puzzle-' + index;
    const input = qs('#' + pid + '-input');
    const result = qs('#' + pid + '-result');
    if (!input || !result) return;
    const userAns = input.value.trim().toUpperCase();
    const correct = PUZZLE_DATA[index].answer.toUpperCase();
    if (userAns === correct) {
        result.className = 'puzzle-result correct';
        result.textContent = '🎉 Correct! +50 XP earned!';
        if (!solvedPuzzles.includes(index)) {
            solvedPuzzles.push(index);
            localStorage.setItem('lifestyle_solved_puzzles', JSON.stringify(solvedPuzzles));
            addXP(50);
        }
        setTimeout(() => { navigatePuzzle(1); }, 1500);
    } else {
        result.className = 'puzzle-result wrong';
        result.textContent = '❌ Not quite. Try again!';
        input.focus();
    }
}

function navigatePuzzle(dir) {
    currentPuzzleIndex = (currentPuzzleIndex + dir + PUZZLE_DATA.length) % PUZZLE_DATA.length;
    localStorage.setItem('lifestyle_puzzle_index', currentPuzzleIndex);
    renderPuzzles();
}

// ===== ANALYTICS =====
function renderAnalytics() {
    renderAnalyticsScores();
    renderAnalyticsWeeklyChart();
    renderAnalyticsCategoryChart();
    renderAnalyticsHeatmap();
    renderAnalyticsInsights();
    renderAnalyticsXPTimeline();
}

function renderAnalyticsScores() {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    const ps = qs('#a-productivity-score'); if (ps) ps.textContent = pct + '%';
    const tc = qs('#a-total-completed'); if (tc) tc.textContent = completed;
    const bs = qs('#a-best-streak'); if (bs) bs.textContent = bestStreak + ' days';
    const cl = qs('#a-current-level'); if (cl) cl.textContent = 'Lvl ' + getLevel();
}

function renderAnalyticsWeeklyChart() {
    const container = qs('#analytics-weekly-chart');
    if (!container) return;
    // Use Chart.js if available
    if (typeof Chart === 'undefined') return;
    container.innerHTML = '<div class="chartjs-container"><canvas id="chartjs-weekly"></canvas></div>';
    const canvas = qs('#chartjs-weekly');
    if (!canvas) return;
    const days = []; const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const labels = []; const dataValues = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        labels.push(dayNames[d.getDay()]);
        const dateStr = d.toDateString();
        const dayTasks = tasks.filter(t => { try { return new Date(t.createdAt).toDateString() === dateStr; } catch(e) { return false; } });
        const done = dayTasks.filter(t => t.completed).length;
        const total = dayTasks.length || 0;
        dataValues.push(total > 0 ? Math.round((done / total) * 100) : 0);
    }
    new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Completion %', data: dataValues, backgroundColor: dataValues.map((v,i) => i === 6 ? '#7F77DD' : 'rgba(127,119,221,0.3)'), borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + '% done' } } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + '%', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } } } }
    });
}

function renderAnalyticsCategoryChart() {
    const container = qs('#analytics-category-chart');
    if (!container) return;
    if (typeof Chart === 'undefined') return;
    container.innerHTML = '<div class="chartjs-container"><canvas id="chartjs-category"></canvas></div>';
    const canvas = qs('#chartjs-category');
    if (!canvas) return;
    const categories = { 'Fitness':0, 'Study':0, 'Work':0, 'Wellness':0, 'Other':0 };
    tasks.forEach(t => {
        const txt = t.text.toLowerCase();
        if (txt.match(/gym|workout|exercise|run|walk|fitness/)) categories['Fitness']++;
        else if (txt.match(/study|read|book|learn|exam|class/)) categories['Study']++;
        else if (txt.match(/work|code|laptop|project|meeting/)) categories['Work']++;
        else if (txt.match(/meditat|yoga|water|sleep|health|calm/)) categories['Wellness']++;
        else categories['Other']++;
    });
    const colors = ['#7F77DD','#1D9E75','#378ADD','#BA7517','#6B7280'];
    new Chart(canvas, {
        type: 'doughnut',
        data: { labels: Object.keys(categories), datasets: [{ data: Object.values(categories), backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11, weight: 600 }, usePointStyle: true, pointStyleWidth: 8 } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed + ' tasks' } } } }
    });
}

function renderAnalyticsHeatmap() {
    const container = qs('#analytics-heatmap');
    if (!container) return;
    const today = new Date(); let html = '';
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        let count = 0;
        habits.forEach(h => { if (h.history && h.history.includes(dateStr)) count++; if (h.lastCompleted === dateStr) count++; });
        count = Math.min(count, habits.length);
        const intensity = habits.length > 0 ? count / habits.length : 0;
        const opacity = intensity === 0 ? 0.06 : (0.15 + intensity * 0.85);
        const label = d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ': ' + count + '/' + habits.length;
        html += `<div class="heatmap-cell" title="${label}" style="background:rgba(139,92,246,${opacity})"></div>`;
    }
    // fill remaining cells for grid alignment
    const remaining = (7 - (30 % 7)) % 7;
    for (let i = 0; i < remaining; i++) html += '<div class="heatmap-cell" style="opacity:0.3"></div>';
    container.innerHTML = html;
}

function renderAnalyticsInsights() {
    const container = qs('#analytics-insights-list');
    if (!container) return;
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    const today = new Date().toDateString();
    const habitsDone = habits.filter(h => h.lastCompleted === today).length;
    let html = '';
    if (completed === total && total > 0) html += '<div class="insight-item success">🎉 All tasks completed! You\'re on fire today!</div>';
    else if (total > 0) html += `<div class="insight-item warning">📌 ${total - completed} tasks still pending. Keep pushing!</div>`;
    if (bestStreak >= 5) html += `<div class="insight-item success">🔥 Amazing ${bestStreak}-day streak! Consistency is key.</div>`;
    else if (bestStreak > 0) html += `<div class="insight-item">🔥 ${bestStreak}-day streak. Aim for 7 days!</div>`;
    html += `<div class="insight-item">${habitsDone >= habits.length && habits.length > 0 ? '✅ All habits done today!' : '📋 ' + habitsDone + '/' + habits.length + ' habits completed today'}</div>`;
    html += `<div class="insight-item">🏆 Total XP earned: ${userXP} | Level ${getLevel()}</div>`;
    if (solvedPuzzles.length > 0) html += `<div class="insight-item success">🧩 ${solvedPuzzles.length} puzzles solved (+${solvedPuzzles.length * 50} XP from puzzles)</div>`;
    container.innerHTML = html;
}

function renderAnalyticsXPTimeline() {
    const container = qs('#analytics-xp-timeline');
    if (!container) return;
    const level = getLevel();
    const progress = getLevelProgress();
    let html = `<div style="margin-bottom:1rem;"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:.5rem;"><span style="font-weight:700;">Level ${level}</span><span style="color:var(--text-muted);">${progress}/100 XP to Level ${level+1}</span></div>`;
    html += `<div style="height:12px;background:rgba(139,92,246,.1);border-radius:6px;overflow:hidden;"><div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#8b5cf6,#c084fc);border-radius:6px;transition:width .6s ease;"></div></div></div>`;
    html += '<div style="display:flex;flex-direction:column;gap:.5rem;">';
    html += `<div class="insight-item">⚡ Tasks completed: +${tasks.filter(t=>t.completed).length * 25} XP</div>`;
    const todayStr = new Date().toDateString();
    const habitsXP = habits.filter(h => h.lastCompleted === todayStr).length * 15;
    html += `<div class="insight-item">🔄 Habits today: +${habitsXP} XP</div>`;
    html += `<div class="insight-item">🧩 Puzzles solved: +${solvedPuzzles.length * 50} XP</div>`;
    html += `<div class="insight-item" style="font-weight:700;border-left-color:var(--primary);">📊 Total: ${userXP} XP</div>`;
    html += '</div>';
    container.innerHTML = html;
}

// ===== FOCUS TIMER =====
let focusInterval = null;
let focusRemaining = 25 * 60;
let focusIsBreak = false;
let focusSessions = JSON.parse(localStorage.getItem('lifestyle_focus_sessions')) || [];

function initFocusTimer() {
    const startBtn = qs('#focus-start');
    const pauseBtn = qs('#focus-pause');
    const resetBtn = qs('#focus-reset');
    if (startBtn) startBtn.addEventListener('click', startFocus);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseFocus);
    if (resetBtn) resetBtn.addEventListener('click', resetFocus);
    // Ambient
    qsa('.ambient-btn').forEach(btn => btn.addEventListener('click', () => {
        qsa('.ambient-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }));
    updateFocusDisplay();
    renderFocusSessions();
}

function startFocus() {
    if (focusInterval) return;
    const workMin = parseInt(qs('#focus-work-min')?.value) || 25;
    if (focusRemaining <= 0) focusRemaining = workMin * 60;
    qs('#focus-start').style.display = 'none';
    qs('#focus-pause').style.display = 'flex';
    focusInterval = setInterval(() => {
        focusRemaining--;
        updateFocusDisplay();
        if (focusRemaining <= 0) {
            clearInterval(focusInterval); focusInterval = null;
            if (!focusIsBreak) {
                // Completed focus session
                focusSessions.push({ time: new Date().toISOString(), duration: parseInt(qs('#focus-work-min')?.value) || 25 });
                localStorage.setItem('lifestyle_focus_sessions', JSON.stringify(focusSessions));
                addXP(25);
                showNotification('🎉 Focus Complete!', '+25 XP earned. Time for a break!');
                renderFocusSessions();
                focusIsBreak = true;
                focusRemaining = (parseInt(qs('#focus-break-min')?.value) || 5) * 60;
                qs('#focus-label').textContent = 'BREAK';
                startFocus();
            } else {
                focusIsBreak = false;
                focusRemaining = (parseInt(qs('#focus-work-min')?.value) || 25) * 60;
                qs('#focus-label').textContent = 'FOCUS';
                qs('#focus-start').style.display = 'flex';
                qs('#focus-pause').style.display = 'none';
                showNotification('⏰ Break Over!', 'Ready for another focus session?');
            }
            updateFocusDisplay();
        }
    }, 1000);
}

function pauseFocus() {
    clearInterval(focusInterval); focusInterval = null;
    qs('#focus-start').style.display = 'flex';
    qs('#focus-pause').style.display = 'none';
}

function resetFocus() {
    clearInterval(focusInterval); focusInterval = null;
    focusIsBreak = false;
    focusRemaining = (parseInt(qs('#focus-work-min')?.value) || 25) * 60;
    qs('#focus-label').textContent = 'FOCUS';
    qs('#focus-start').style.display = 'flex';
    qs('#focus-pause').style.display = 'none';
    updateFocusDisplay();
}

function updateFocusDisplay() {
    const m = Math.floor(focusRemaining / 60);
    const s = focusRemaining % 60;
    const disp = qs('#focus-time');
    if (disp) disp.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    const ring = qs('#focus-ring-progress');
    if (ring) {
        const totalSec = focusIsBreak ? (parseInt(qs('#focus-break-min')?.value) || 5) * 60 : (parseInt(qs('#focus-work-min')?.value) || 25) * 60;
        const pct = focusRemaining / totalSec;
        ring.style.strokeDashoffset = 597 * (1 - pct);
    }
    const sc = qs('#focus-sessions-count');
    const todaySessions = focusSessions.filter(s => new Date(s.time).toDateString() === new Date().toDateString());
    if (sc) sc.textContent = todaySessions.length + ' sessions today';
}

function renderFocusSessions() {
    const container = qs('#focus-session-log');
    if (!container) return;
    const today = focusSessions.filter(s => new Date(s.time).toDateString() === new Date().toDateString());
    if (today.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);font-size:.8rem;">No sessions yet today</div>'; return; }
    container.innerHTML = today.map((s, i) => `<div class="focus-session-item">🟢 Session ${i+1} — ${s.duration} min <span style="margin-left:auto;color:var(--text-muted);font-size:.7rem;">${new Date(s.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>`).join('');
}

// ===== BODY TRACKING =====
let bodyLog = JSON.parse(localStorage.getItem('lifestyle_body_log')) || {};

function getBodyToday() {
    const key = new Date().toDateString();
    if (!bodyLog[key]) bodyLog[key] = { water: 0, sleep: null, sleepQuality: null, mood: null };
    return bodyLog[key];
}

function saveBodyLog() { localStorage.setItem('lifestyle_body_log', JSON.stringify(bodyLog)); }

function initBodyTracking() {
    // Water cups
    qs('#water-cups')?.addEventListener('click', (e) => {
        const cup = e.target.closest('.water-cup');
        if (!cup) return;
        const idx = parseInt(cup.dataset.idx);
        const today = getBodyToday();
        today.water = today.water === idx + 1 ? idx : idx + 1;
        saveBodyLog(); renderBodyView();
    });
    // Sleep
    qs('#log-sleep')?.addEventListener('click', () => {
        const val = parseFloat(qs('#sleep-hours')?.value);
        if (val >= 0 && val <= 14) { getBodyToday().sleep = val; saveBodyLog(); renderBodyView(); }
    });
    // Sleep quality
    qs('#sleep-quality')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.quality-btn');
        if (!btn) return;
        getBodyToday().sleepQuality = parseInt(btn.dataset.q);
        saveBodyLog(); renderBodyView();
    });
    // Mood
    qs('#mood-picker')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mood-btn');
        if (!btn) return;
        getBodyToday().mood = parseInt(btn.dataset.mood);
        saveBodyLog(); renderBodyView();
    });
}

function renderBodyView() {
    const today = getBodyToday();
    // Water
    const wc = qs('#water-cups');
    if (wc) { let h = ''; for (let i = 0; i < 8; i++) h += `<div class="water-cup ${i < today.water ? 'filled' : ''}" data-idx="${i}">💧</div>`; wc.innerHTML = h; }
    const wf = qs('#water-fill'); if (wf) wf.style.width = (today.water / 8 * 100) + '%';
    const ws = qs('#water-stat'); if (ws) ws.textContent = today.water + ' / 8 cups';
    // Sleep
    const ss = qs('#sleep-stat');
    if (ss) ss.textContent = today.sleep !== null ? today.sleep + 'h sleep' + (today.sleepQuality ? ' • ' + today.sleepQuality + '⭐' : '') : 'No data today';
    qsa('.quality-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.q) === today.sleepQuality));
    // Mood
    const moods = ['','😔','😐','🙂','😄','🤩'];
    const ms = qs('#mood-stat'); if (ms) ms.textContent = today.mood ? 'Feeling: ' + moods[today.mood] : 'How are you feeling?';
    qsa('.mood-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.mood) === today.mood));
    // Chart
    renderBodyChart();
}

function renderBodyChart() {
    const canvas = qs('#body-trends-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = []; const waterData = []; const sleepData = []; const moodData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toDateString();
        labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
        const log = bodyLog[key] || {};
        waterData.push(log.water || 0);
        sleepData.push(log.sleep || 0);
        moodData.push(log.mood || 0);
    }
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [
            { label: 'Water', data: waterData, borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,.1)', tension: .4, fill: true },
            { label: 'Sleep', data: sleepData, borderColor: '#7F77DD', backgroundColor: 'rgba(127,119,221,.1)', tension: .4, fill: true },
            { label: 'Mood', data: moodData, borderColor: '#BA7517', backgroundColor: 'rgba(186,117,23,.1)', tension: .4, fill: true }
        ]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 }, usePointStyle: true } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' } }, x: { grid: { display: false } } } }
    });
}

// ===== ACHIEVEMENT BADGES =====
const BADGES = [
    { id:'streak3', icon:'🔥', name:'Warming Up', desc:'3-day habit streak', check: () => habits.some(h => h.streak >= 3) },
    { id:'streak7', icon:'🔥', name:'On Fire', desc:'7-day habit streak', check: () => habits.some(h => h.streak >= 7) },
    { id:'streak30', icon:'🌟', name:'Unstoppable', desc:'30-day habit streak', check: () => habits.some(h => h.streak >= 30) },
    { id:'tasks10', icon:'✅', name:'Task Starter', desc:'Complete 10 tasks', check: () => tasks.filter(t=>t.completed).length >= 10 },
    { id:'tasks50', icon:'✅', name:'Half Century', desc:'Complete 50 tasks', check: () => tasks.filter(t=>t.completed).length >= 50 },
    { id:'tasks100', icon:'🏅', name:'Century', desc:'Complete 100 tasks', check: () => tasks.filter(t=>t.completed).length >= 100 },
    { id:'puzzle3', icon:'🧩', name:'Puzzle Lover', desc:'Solve 3 puzzles', check: () => solvedPuzzles.length >= 3 },
    { id:'puzzle10', icon:'🧩', name:'Puzzle Master', desc:'Solve 10 puzzles', check: () => solvedPuzzles.length >= 10 },
    { id:'level5', icon:'⭐', name:'Rising Star', desc:'Reach Level 5', check: () => getLevel() >= 5 },
    { id:'level10', icon:'🏆', name:'Champion', desc:'Reach Level 10', check: () => getLevel() >= 10 },
    { id:'level20', icon:'👑', name:'Legend', desc:'Reach Level 20', check: () => getLevel() >= 20 },
    { id:'xp500', icon:'⚡', name:'XP Hunter', desc:'Earn 500 XP', check: () => userXP >= 500 },
    { id:'xp2000', icon:'💎', name:'XP Legend', desc:'Earn 2000 XP', check: () => userXP >= 2000 },
    { id:'water7', icon:'💧', name:'Hydrated', desc:'7 days water goal met', check: () => { let c=0; Object.values(bodyLog).forEach(d=>{if(d.water>=8)c++;}); return c>=7; } },
    { id:'sleep7', icon:'😴', name:'Well Rested', desc:'Log sleep 7 days', check: () => { let c=0; Object.values(bodyLog).forEach(d=>{if(d.sleep)c++;}); return c>=7; } },
    { id:'mood7', icon:'😊', name:'Self Aware', desc:'Log mood 7 days', check: () => { let c=0; Object.values(bodyLog).forEach(d=>{if(d.mood)c++;}); return c>=7; } },
    { id:'focus5', icon:'🎯', name:'Deep Focus', desc:'Complete 5 focus sessions', check: () => focusSessions.length >= 5 },
    { id:'focus25', icon:'🧠', name:'Focus Master', desc:'Complete 25 focus sessions', check: () => focusSessions.length >= 25 },
    { id:'allhabits', icon:'💪', name:'Perfect Day', desc:'Complete all habits in one day', check: () => { const t=new Date().toDateString(); return habits.length > 0 && habits.every(h=>h.lastCompleted===t); } },
    { id:'firsttask', icon:'🎉', name:'First Step', desc:'Complete your first task', check: () => tasks.some(t=>t.completed) }
];

let unlockedBadges = JSON.parse(localStorage.getItem('lifestyle_badges')) || [];

function checkBadges() {
    let newUnlocks = false;
    BADGES.forEach(badge => {
        if (!unlockedBadges.includes(badge.id) && badge.check()) {
            unlockedBadges.push(badge.id);
            newUnlocks = true;
            showNotification('🏆 Badge Unlocked!', badge.name + ' — ' + badge.desc);
        }
    });
    if (newUnlocks) localStorage.setItem('lifestyle_badges', JSON.stringify(unlockedBadges));
}

function renderBadges() {
    const container = qs('#badges-grid');
    if (!container) return;
    checkBadges();
    const countEl = qs('#badges-unlocked-count');
    if (countEl) countEl.textContent = unlockedBadges.length + ' / ' + BADGES.length + ' unlocked';
    container.innerHTML = BADGES.map(b => {
        const unlocked = unlockedBadges.includes(b.id);
        return `<div class="badge-card ${unlocked ? 'unlocked' : 'locked'}"><div class="badge-icon">${unlocked ? b.icon : '🔒'}</div><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div></div>`;
    }).join('');
}

// ===== SETTINGS TABS =====
function initSettingsTabs() {
    qsa('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            qsa('.settings-tab').forEach(t => t.classList.remove('active'));
            qsa('.settings-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = qs('#tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });
    // Export
    const exportBtn = qs('#export-data-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportAllData);
    // Import
    const importInput = qs('#import-data-input');
    if (importInput) importInput.addEventListener('change', importAllData);
    // Clear
    const clearBtn = qs('#clear-data-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            localStorage.clear();
            window.location.reload();
        }
    });
    // Avatar sync
    const sa = qs('#settings-avatar');
    if (sa) sa.textContent = userName.charAt(0).toUpperCase();
}

function exportAllData() {
    const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        tasks, habits, userName, userXP, solvedPuzzles, currentPuzzleIndex,
        theme: localStorage.getItem('lifestyle_theme') || 'light'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lifestyle-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click(); URL.revokeObjectURL(url);
    showNotification('📥 Export Complete', 'Your data has been downloaded as JSON.');
}

function importAllData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.tasks || !data.habits) throw new Error('Invalid format');
            if (confirm('This will replace all your current data. Continue?')) {
                tasks = data.tasks; habits = data.habits;
                userName = data.userName || 'User';
                userXP = data.userXP || 0;
                solvedPuzzles = data.solvedPuzzles || [];
                currentPuzzleIndex = data.currentPuzzleIndex || 0;
                localStorage.setItem('lifestyle_tasks', JSON.stringify(tasks));
                localStorage.setItem('lifestyle_habits', JSON.stringify(habits));
                localStorage.setItem('lifestyle_username', userName);
                localStorage.setItem('lifestyle_xp', userXP);
                localStorage.setItem('lifestyle_solved_puzzles', JSON.stringify(solvedPuzzles));
                localStorage.setItem('lifestyle_puzzle_index', currentPuzzleIndex);
                if (data.theme) localStorage.setItem('lifestyle_theme', data.theme);
                window.location.reload();
            }
        } catch (err) {
            showNotification('❌ Import Failed', 'Invalid JSON file. Please check the format.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ===== EMPTY STATES =====
function getEmptyTasksHTML() {
    return `<div class="empty-state" style="grid-column:1/-1;">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="25" width="80" height="70" rx="8" stroke="var(--primary)" stroke-width="2" opacity=".3"/>
            <line x1="35" y1="50" x2="85" y2="50" stroke="var(--primary)" stroke-width="2" opacity=".2" stroke-linecap="round"/>
            <line x1="35" y1="62" x2="75" y2="62" stroke="var(--primary)" stroke-width="2" opacity=".2" stroke-linecap="round"/>
            <line x1="35" y1="74" x2="65" y2="74" stroke="var(--primary)" stroke-width="2" opacity=".2" stroke-linecap="round"/>
            <circle cx="30" cy="50" r="3" fill="var(--primary)" opacity=".3"/>
            <circle cx="30" cy="62" r="3" fill="var(--primary)" opacity=".3"/>
            <circle cx="30" cy="74" r="3" fill="var(--primary)" opacity=".3"/>
            <path d="M60 15 L65 25 L55 25Z" fill="var(--primary)" opacity=".2"/>
        </svg>
        <h3>No tasks yet</h3>
        <p>Start your productive day by adding your first task above!</p>
        <button class="btn-primary" onclick="switchView('tasks')">+ Add Your First Task</button>
    </div>`;
}

function getEmptyHabitsHTML() {
    return `<div class="empty-state" style="grid-column:1/-1;">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="55" r="35" stroke="var(--teal)" stroke-width="2" opacity=".3"/>
            <path d="M45 55 L55 65 L75 45" stroke="var(--teal)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>
            <circle cx="60" cy="55" r="20" stroke="var(--teal)" stroke-width="1.5" opacity=".15" stroke-dasharray="4 4"/>
        </svg>
        <h3>Build your routine</h3>
        <p>Add daily habits to track your consistency and build streaks!</p>
    </div>`;
}

// Start app
document.addEventListener('DOMContentLoaded', function() {
    init();
    initSettingsTabs();
    initFocusTimer();
    initBodyTracking();
    checkBadges();
});
