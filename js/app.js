const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

// State Management
let tasks = JSON.parse(localStorage.getItem('lifestyle_tasks')) || [];
let habits = JSON.parse(localStorage.getItem('lifestyle_habits')) || null;
let filterMode = 'all';

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
    navAnalytics: qs('#nav-analytics'),
    navSettings: qs('#nav-settings'),
    homeView: qs('#home-view'),
    tasksSection: qs('#tasks-view'),
    habitsSection: qs('#habits-view'),
    coachSection: qs('#coach-view'),
    analyticsSection: qs('#analytics-view'),
    settingsSection: qs('#settings-view'),
    habitForm: qs('#add-habit-form'),
    habitInput: qs('#habit-input'),
    habitList: qs('#habit-list'),
    habitChart: qs('#habit-chart'),
    habitsTodayCount: qs('#habits-today-count'),
    chatMessages: qs('#chat-messages'),
    chatForm: qs('#chat-form'),
    chatInput: qs('#chat-input')
};

const GEMINI_API_KEY = "AIzaSyBECEutF7Pv8fLEsLoPtLVTQkQPpecJm7E";

// Initialize App
function init() {
    setDate();
    renderTasks();
    updateDashboardUI();
    renderHabits();
    requestNotificationPermission();
    setupReminders();
    
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
    if (elements.navAnalytics) elements.navAnalytics.addEventListener('click', () => switchView('analytics'));
    if (elements.navSettings) elements.navSettings.addEventListener('click', () => switchView('settings'));
    
    // Theme logic in Settings
    const themeBtn = qs('#theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
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
        saveTasks();
        renderTasks();
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
    const views = ['home', 'tasks', 'habits', 'coach', 'analytics', 'settings'];
    views.forEach(v => {
        const el = elements['nav' + v.charAt(0).toUpperCase() + v.slice(1)];
        if(el) el.classList.remove('active');
    });
    
    if (elements.homeView) elements.homeView.classList.add('hidden-view');
    if (elements.tasksSection) elements.tasksSection.classList.add('hidden-view');
    if (elements.habitsSection) elements.habitsSection.classList.add('hidden-view');
    if (elements.coachSection) elements.coachSection.classList.add('hidden-view');
    if (elements.analyticsSection) elements.analyticsSection.classList.add('hidden-view');
    if (elements.settingsSection) elements.settingsSection.classList.add('hidden-view');

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
    } else if (view === 'analytics') {
        if (elements.navAnalytics) elements.navAnalytics.classList.add('active');
        if (elements.analyticsSection) elements.analyticsSection.classList.remove('hidden-view');
    } else if (view === 'settings') {
        if (elements.navSettings) elements.navSettings.classList.add('active');
        if (elements.settingsSection) elements.settingsSection.classList.remove('hidden-view');
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
        elements.taskList.innerHTML = `
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
    
    // Single loop for high-performance tally
    for (let i = 0; i < total; i++) {
        if (tasks[i].completed) completed++;
    }
    
    const pending = total - completed;
    const percentage = total === 0 ? 0 : completed / total;
    
    // Update Stats DOM
    elements.statTotal.textContent = total;
    elements.statCompleted.textContent = completed;
    elements.statPending.textContent = pending;
    elements.completionText.textContent = Math.round(percentage * 100);
    
    // Update SVG Chart
    const circumference = 314;
    const offset = circumference - (percentage * circumference);
    elements.progressCircle.style.strokeDashoffset = offset;
}

// Utils
function setDate() {
    const now = new Date();
    const optionsFull = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (elements.dateFull) elements.dateFull.textContent = now.toLocaleDateString('en-US', optionsFull);
    
    const hour = now.getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    
    if (elements.dateName) elements.dateName.innerHTML = greeting + ', <strong>User!</strong> ☀️';
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
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        elements.themeIcon.textContent = '☀️';
        elements.themeText.textContent = 'Light Mode';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    localStorage.setItem('lifestyle_theme', isDark ? 'dark' : 'light');
    elements.themeIcon.textContent = isDark ? '☀️' : '🌙';
    elements.themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    // No need to redraw chart, CSS handles theme colors natively on SVG
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
        } else {
            habit.streak = Math.max(0, habit.streak - 1);
            habit.lastCompleted = null;
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

// Start app
document.addEventListener('DOMContentLoaded', init);
