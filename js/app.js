// Simple todo list app optimized for e-readers, using a serverless backend for storage.
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const dateDisplay = document.getElementById('current-date');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const storageStatus = document.getElementById('storage-status');
    const themeToggle = document.getElementById('theme-toggle');

    // In-memory state for tasks
    let tasks = [];

    // Use localStorage for theme preference only, as it's non-critical
    // and works on most browsers.
    try {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggle) themeToggle.textContent = '☾';
        }
    } catch (e) {
        console.warn('localStorage not available for theme preference.');
    }
    
    if (themeToggle) {
        themeToggle.onclick = function() {
            const isDarkMode = document.body.classList.toggle('dark-mode');
            themeToggle.textContent = isDarkMode ? '☾' : '☀';
            try {
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            } catch (e) {
                // Ignore error if storage is not available
            }
            return false;
        };
    }
    
    // Display current date
    function updateDateDisplay() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateDisplay.textContent = now.toLocaleDateString(undefined, options);
    }

    // --- Server Communication ---

    // Load tasks from the server
    async function loadTasksFromServer() {
        storageStatus.textContent = '同步中...';
        storageStatus.style.color = 'var(--text-color)';
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            tasks = await response.json();
            storageStatus.textContent = '✓ 已同步';
            storageStatus.style.color = 'var(--completed-color)';
            renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            storageStatus.textContent = '⚠ 同步失败';
            storageStatus.style.color = 'black';
        }
    }
    
    // Save tasks to the server
    async function saveTasksToServer() {
        storageStatus.textContent = '保存中...';
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tasks)
            });
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            await response.json(); // Wait for the server to confirm
            storageStatus.textContent = '✓ 已同步';
            storageStatus.style.color = 'var(--completed-color)';
        } catch (error) {
            console.error('Error saving tasks:', error);
            storageStatus.textContent = '⚠ 同步失败';
            storageStatus.style.color = 'black';
        }
    }
    
    // --- UI and Task Logic ---

    // Update progress bar
    function updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        if (!progressBar) return;
        
        if (tasks.length === 0) {
            progressBar.style.width = '0%';
            return;
        }
        
        const completedTasks = tasks.filter(task => task.completed).length;
        const percentage = Math.round((completedTasks / tasks.length) * 100);
        
        progressBar.style.width = percentage + '%';
    }
    
    // Render the task list from the in-memory `tasks` array
    function renderTasks() {
        updateProgressBar();
        updateClearButtonVisibility();
        
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'task-item empty-list';
            emptyMessage.textContent = '今天没有任务，在上方添加一个吧！';
            taskList.appendChild(emptyMessage);
            return;
        }
        
        tasks.forEach(function(task, index) {
            const taskItem = document.createElement('li');
            let className = task.completed ? 'task-item completed' : 'task-item';
            if (task.rolledOver) {
                className += ' rolled-over';
            }
            taskItem.className = className;
            taskItem.dataset.index = index;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTaskStatus(index));
            
            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = task.text;
            taskText.addEventListener('click', () => toggleTaskStatus(index));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('aria-label', 'Delete task');
            deleteBtn.addEventListener('click', () => deleteTask(index));
            
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            taskItem.appendChild(deleteBtn);
            
            taskList.appendChild(taskItem);
        });
    }
    
    // Add a new task
    function addTask(text) {
        if (!text.trim()) return;
        
        tasks.push({
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        });
        
        renderTasks();
        saveTasksToServer();
    }
    
    // Delete a task
    function deleteTask(index) {
        tasks.splice(index, 1);
        renderTasks();
        saveTasksToServer();
    }
    
    // Simple confetti animation
    function showConfetti(x, y) {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.position = 'absolute';
        confettiContainer.style.left = x + 'px';
        confettiContainer.style.top = y + 'px';
        confettiContainer.style.pointerEvents = 'none';
        document.body.appendChild(confettiContainer);
        
        const colors = ['#555', '#777', '#999', '#bbb'];
        const shapes = ['●', '■', '★', '✦'];
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            particle.style.position = 'absolute';
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.fontSize = (Math.random() * 10 + 8) + 'px';
            particle.style.left = (Math.random() * 20 - 10) + 'px';
            particle.style.top = (Math.random() * 20 - 10) + 'px';
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 40 + 10;
            particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            confettiContainer.appendChild(particle);
        }
        
        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, 800);
    }

    // Toggle task completed status
    function toggleTaskStatus(index) {
        const wasCompleted = tasks[index].completed;
        tasks[index].completed = !wasCompleted;
        
        if (!wasCompleted) {
            const taskElement = document.querySelector(`#task-list li[data-index="${index}"]`);
            if (taskElement) {
                const rect = taskElement.getBoundingClientRect();
                showConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }
        
        renderTasks();
        saveTasksToServer();
    }
    
    // Clear all rolled over tasks
    function clearPendingTasks() {
        tasks = tasks.filter(task => task.completed || !task.rolledOver);
        renderTasks();
        saveTasksToServer();
    }
    
    // Show or hide clear button
    function updateClearButtonVisibility() {
        const clearPendingBtn = document.getElementById('clear-pending-btn');
        if (!clearPendingBtn) return;
        
        const hasRolledOverTasks = tasks.some(task => task.rolledOver && !task.completed);
        clearPendingBtn.style.display = hasRolledOverTasks ? 'block' : 'none';
    }
    
    // Export tasks to TXT file - uses the existing server-side function
        function exportTasksToTxt(e) {
            if (e) e.preventDefault();
            
            if (tasks.length === 0) {
                alert('沒有可導出的任務。');
                return;
            }
            
            const now = new Date();
            const dateString = now.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            const payload = {
                tasks: tasks,
                date: dateString
            };
            
            fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) throw new Error('Server returned error');
                return response.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const date_for_filename = new Date().toISOString().split('T')[0];
                
                a.href = url;
                a.download = 'InkTodos-' + date_for_filename + '.txt';
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            })
            .catch(error => {
                console.error('Export error:', error);
                alert('無法導出任務，請檢查控制台錯誤。');
            });
        }
    // --- Initialization ---

    // Event Listeners
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addTask(taskInput.value);
        taskInput.value = '';
    });
    
    const clearPendingBtn = document.getElementById('clear-pending-btn');
    if (clearPendingBtn) {
        clearPendingBtn.addEventListener('click', clearPendingTasks);
    }
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTasksToTxt);
    }
    
    // Initial load
    updateDateDisplay();
    loadTasksFromServer();
});
