// Simple todo list app optimized for e-readers, rewritten to avoid newer APIs for better Kindle compatibility.
document.addEventListener('DOMContentLoaded', function() {
    var dateDisplay = document.getElementById('current-date');
    var taskForm = document.getElementById('task-form');
    var taskInput = document.getElementById('task-input');
    var taskList = document.getElementById('task-list');
    var storageStatus = document.getElementById('storage-status');
    var themeToggle = document.getElementById('theme-toggle');

    var tasks = [];
    var COLORS = {
        defaultText: '#333333',
        success: '#2e7d32',
        error: '#000000'
    };

    function setText(element, value) {
        if (!element) return;
        if (typeof element.textContent !== 'undefined') {
            element.textContent = value;
        } else {
            element.innerText = value;
        }
    }

    function hasClass(element, className) {
        if (!element || !className) return false;
        if (element.classList) {
            return element.classList.contains(className);
        }
        var current = element.className || '';
        var classes = current.split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] === className) {
                return true;
            }
        }
        return false;
    }

    function addClass(element, className) {
        if (!element || !className) return;
        if (element.classList) {
            element.classList.add(className);
            return;
        }
        if (!hasClass(element, className)) {
            element.className = (element.className ? element.className + ' ' : '') + className;
        }
    }

    function removeClass(element, className) {
        if (!element || !className) return;
        if (element.classList) {
            element.classList.remove(className);
            return;
        }
        var classes = (element.className || '').split(/\s+/);
        var updated = [];
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] && classes[i] !== className) {
                updated.push(classes[i]);
            }
        }
        element.className = updated.join(' ');
    }

    function toggleClass(element, className) {
        if (!element || !className) return false;
        if (element.classList && typeof element.classList.toggle === 'function') {
            return element.classList.toggle(className);
        }
        if (hasClass(element, className)) {
            removeClass(element, className);
            return false;
        }
        addClass(element, className);
        return true;
    }

    function attachEvent(element, eventName, handler) {
        if (!element) return;
        if (element.addEventListener) {
            element.addEventListener(eventName, handler, false);
        } else if (element.attachEvent) {
            element.attachEvent('on' + eventName, handler);
        } else {
            element['on' + eventName] = handler;
        }
    }

    function getUrlHelper() {
        if (typeof window !== 'undefined') {
            if (window.URL && typeof window.URL.createObjectURL === 'function') {
                return window.URL;
            }
            if (window.webkitURL && typeof window.webkitURL.createObjectURL === 'function') {
                return window.webkitURL;
            }
        }
        return null;
    }

    function sendRequest(method, url, payload, callback, options) {
        var xhr;
        options = options || {};
        callback = callback || function() {};

        if (typeof XMLHttpRequest !== 'undefined') {
            xhr = new XMLHttpRequest();
        } else if (typeof ActiveXObject !== 'undefined') {
            try {
                xhr = new ActiveXObject('Microsoft.XMLHTTP');
            } catch (err) {
                xhr = null;
            }
        }

        if (!xhr) {
            callback(new Error('XMLHttpRequest not supported'));
            return;
        }

        try {
            xhr.open(method, url, true);
        } catch (openError) {
            callback(openError);
            return;
        }

        if (options.responseType) {
            try {
                xhr.responseType = options.responseType;
            } catch (responseTypeError) {
                // Older browsers may throw here; ignore and rely on responseText.
            }
        }

        if (options.headers) {
            for (var headerKey in options.headers) {
                if (options.headers.hasOwnProperty(headerKey)) {
                    xhr.setRequestHeader(headerKey, options.headers[headerKey]);
                }
            }
        } else if (method === 'POST' || method === 'PUT') {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(null, xhr);
                } else {
                    callback(new Error('Server responded with status: ' + xhr.status));
                }
            }
        };

        try {
            if (payload) {
                xhr.send(JSON.stringify(payload));
            } else {
                xhr.send();
            }
        } catch (sendError) {
            callback(sendError);
        }
    }

    function safeParseJson(text) {
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (err) {
            return null;
        }
    }

    function getSafeIsoString(date) {
        var targetDate = date || new Date();
        try {
            return targetDate.toISOString();
        } catch (err) {
            return String(targetDate.getTime());
        }
    }

    function formatDateForFilename(date) {
        var targetDate = date || new Date();
        try {
            return targetDate.toISOString().split('T')[0];
        } catch (err) {
            var year = targetDate.getFullYear();
            var month = targetDate.getMonth() + 1;
            var day = targetDate.getDate();
            var monthString = month < 10 ? '0' + month : String(month);
            var dayString = day < 10 ? '0' + day : String(day);
            return year + '-' + monthString + '-' + dayString;
        }
    }

    function updateDateDisplay() {
        if (!dateDisplay) return;
        var now = new Date();
        var formatted = '';
        try {
            formatted = now.toLocaleDateString('zh-CN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (err) {
            formatted = now.toDateString();
        }
        setText(dateDisplay, formatted);
    }

    function updateProgressBar() {
        var progressBar = document.getElementById('progress-bar');
        if (!progressBar) return;

        if (!tasks || tasks.length === 0) {
            progressBar.style.width = '0%';
            return;
        }

        var completedTasks = 0;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i] && tasks[i].completed) {
                completedTasks += 1;
            }
        }
        var percentage = Math.round((completedTasks / tasks.length) * 100);
        progressBar.style.width = percentage + '%';
    }

    function updateClearButtonVisibility() {
        var clearPendingBtn = document.getElementById('clear-pending-btn');
        if (!clearPendingBtn) return;

        var hasRolledOverTasks = false;
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            if (task && task.rolledOver && !task.completed) {
                hasRolledOverTasks = true;
                break;
            }
        }
        clearPendingBtn.style.display = hasRolledOverTasks ? 'block' : 'none';
    }

    function renderTasks() {
        updateProgressBar();
        updateClearButtonVisibility();

        if (!taskList) return;
        taskList.innerHTML = '';

        if (!tasks || tasks.length === 0) {
            var emptyMessage = document.createElement('li');
            emptyMessage.className = 'task-item empty-list';
            setText(emptyMessage, '今天没有任务，在上方添加一个吧！');
            taskList.appendChild(emptyMessage);
            return;
        }

        for (var i = 0; i < tasks.length; i++) {
            (function(task, index) {
                if (!task) return;
                var taskItem = document.createElement('li');
                var className = 'task-item';
                if (task.completed) {
                    className += ' completed';
                }
                if (task.rolledOver) {
                    className += ' rolled-over';
                }
                taskItem.className = className;
                taskItem.setAttribute('data-index', index);

                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !!task.completed;
                attachEvent(checkbox, 'change', function() {
                    toggleTaskStatus(index, taskItem);
                });

                var taskText = document.createElement('span');
                taskText.className = 'task-text';
                setText(taskText, task.text || '');
                attachEvent(taskText, 'click', function() {
                    toggleTaskStatus(index, taskItem);
                });

                var deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                setText(deleteBtn, '×');
                deleteBtn.setAttribute('aria-label', 'Delete task');
                attachEvent(deleteBtn, 'click', function(evt) {
                    if (evt && evt.preventDefault) {
                        evt.preventDefault();
                    }
                    deleteTask(index);
                });

                taskItem.appendChild(checkbox);
                taskItem.appendChild(taskText);
                taskItem.appendChild(deleteBtn);

                taskList.appendChild(taskItem);
            })(tasks[i], i);
        }
    }

    function addTask(text) {
        if (typeof text !== 'string') return;
        var trimmed = text.replace(/^\s+|\s+$/g, '');
        if (trimmed === '') return;

        tasks.push({
            text: trimmed,
            completed: false,
            createdAt: getSafeIsoString(new Date())
        });

        renderTasks();
        saveTasksToServer();
    }

    function deleteTask(index) {
        if (index < 0 || index >= tasks.length) return;
        tasks.splice(index, 1);
        renderTasks();
        saveTasksToServer();
    }

    function showConfetti(x, y) {
        var confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.position = 'absolute';
        confettiContainer.style.left = x + 'px';
        confettiContainer.style.top = y + 'px';
        confettiContainer.style.pointerEvents = 'none';
        document.body.appendChild(confettiContainer);

        var colors = ['#555', '#777', '#999', '#bbb'];
        var shapes = ['●', '■', '★', '✦'];
        var particleCount = 10;

        for (var i = 0; i < particleCount; i++) {
            var particle = document.createElement('div');
            particle.className = 'confetti-particle';
            setText(particle, shapes[Math.floor(Math.random() * shapes.length)]);
            particle.style.position = 'absolute';
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.fontSize = (Math.random() * 10 + 8) + 'px';
            particle.style.left = (Math.random() * 20 - 10) + 'px';
            particle.style.top = (Math.random() * 20 - 10) + 'px';
            var angle = Math.random() * Math.PI * 2;
            var distance = Math.random() * 40 + 10;
            particle.style.transform = 'translate(' + (Math.cos(angle) * distance) + 'px, ' + (Math.sin(angle) * distance) + 'px)';
            confettiContainer.appendChild(particle);
        }

        setTimeout(function() {
            if (confettiContainer && confettiContainer.parentNode) {
                confettiContainer.parentNode.removeChild(confettiContainer);
            }
        }, 800);
    }

    function toggleTaskStatus(index, sourceElement) {
        if (index < 0 || index >= tasks.length) return;
        var task = tasks[index];
        if (!task) return;

        var wasCompleted = !!task.completed;
        task.completed = !wasCompleted;

        if (!wasCompleted && sourceElement && sourceElement.getBoundingClientRect) {
            var rect = sourceElement.getBoundingClientRect();
            var centerX = rect.left + rect.width / 2;
            var centerY = rect.top + rect.height / 2;
            showConfetti(centerX, centerY);
        }

        renderTasks();
        saveTasksToServer();
    }

    function clearPendingTasks() {
        var filtered = [];
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            if (!task) continue;
            if (task.completed || !task.rolledOver) {
                filtered.push(task);
            }
        }
        tasks = filtered;
        renderTasks();
        saveTasksToServer();
    }

    function exportTasksToTxt(evt) {
        if (evt && evt.preventDefault) {
            evt.preventDefault();
        }

        if (!tasks || tasks.length === 0) {
            alert('没有可导出的任务。');
            return;
        }

        var now = new Date();
        var dateString;
        try {
            dateString = now.toLocaleDateString('zh-CN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (err) {
            dateString = now.toDateString();
        }

        var payload = {
            tasks: tasks,
            date: dateString
        };

        sendRequest('POST', '/api/export', payload, function(error, xhr) {
            if (error) {
                console.error('Export error:', error);
                alert('无法导出任务，请检查网络或稍后再试。');
                return;
            }

            var textContent = '';
            if (typeof xhr.responseText === 'string') {
                textContent = xhr.responseText;
            } else if (typeof xhr.response === 'string') {
                textContent = xhr.response;
            } else {
                textContent = '';
            }

            var dateForFilename = formatDateForFilename(new Date());
            var fileName = 'KindleTodo-' + dateForFilename + '.txt';

            var downloadUrl = null;
            var urlHelper = getUrlHelper();
            var blobSupported = typeof Blob === 'function';

            if (blobSupported && urlHelper) {
                try {
                    var blob = new Blob([textContent], { type: 'text/plain' });
                    downloadUrl = urlHelper.createObjectURL(blob);
                } catch (blobError) {
                    downloadUrl = null;
                }
            }

            if (!downloadUrl) {
                downloadUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
            }

            var link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.style.display = 'none';

            document.body.appendChild(link);
            if (typeof link.click === 'function') {
                link.click();
            } else {
                try {
                    if (link.dispatchEvent && typeof MouseEvent === 'function') {
                        link.dispatchEvent(new MouseEvent('click'));
                    } else {
                        window.location = downloadUrl;
                    }
                } catch (dispatchError) {
                    window.location = downloadUrl;
                }
            }

            setTimeout(function() {
                if (link && link.parentNode) {
                    link.parentNode.removeChild(link);
                }
                if (urlHelper && downloadUrl && downloadUrl.indexOf('blob:') === 0) {
                    urlHelper.revokeObjectURL(downloadUrl);
                }
            }, 100);
        }, { responseType: 'text' });
    }

    function loadTasksFromServer() {
        if (storageStatus) {
            setText(storageStatus, '同步中...');
            storageStatus.style.color = COLORS.defaultText;
        }
        sendRequest('GET', '/api/tasks', null, function(error, xhr) {
            if (error) {
                console.error('Error loading tasks:', error);
                if (storageStatus) {
                    setText(storageStatus, '⚠ 同步失败');
                    storageStatus.style.color = COLORS.error;
                }
                return;
            }

            var responseText = '';
            if (typeof xhr.responseText === 'string') {
                responseText = xhr.responseText;
            } else if (xhr.response && typeof xhr.response === 'string') {
                responseText = xhr.response;
            }

            var data = safeParseJson(responseText);
            var incomingTasks;
            if (data && typeof data.length === 'number') {
                incomingTasks = data;
            } else if (data && data.tasks && typeof data.tasks.length === 'number') {
                incomingTasks = data.tasks;
            } else {
                incomingTasks = [];
            }

            tasks = incomingTasks;
            if (storageStatus) {
                setText(storageStatus, '✓ 已同步');
                storageStatus.style.color = COLORS.success;
            }
            renderTasks();
        });
    }

    function saveTasksToServer() {
        if (storageStatus) {
            setText(storageStatus, '保存中...');
            storageStatus.style.color = COLORS.defaultText;
        }

        sendRequest('POST', '/api/tasks', tasks, function(error) {
            if (error) {
                console.error('Error saving tasks:', error);
                if (storageStatus) {
                    setText(storageStatus, '⚠ 同步失败');
                    storageStatus.style.color = COLORS.error;
                }
                return;
            }

            if (storageStatus) {
                setText(storageStatus, '✓ 已同步');
                storageStatus.style.color = COLORS.success;
            }
        });
    }

    // Theme preference uses localStorage, but errors are ignored if unavailable.
    try {
        if (localStorage.getItem('theme') === 'dark') {
            addClass(document.body, 'dark-mode');
            if (themeToggle) {
                setText(themeToggle, '☾');
            }
        }
    } catch (storageError) {
        console.warn('localStorage not available for theme preference.');
    }

    if (themeToggle) {
        attachEvent(themeToggle, 'click', function(evt) {
            if (evt && evt.preventDefault) {
                evt.preventDefault();
            }
            var isDarkMode = toggleClass(document.body, 'dark-mode');
            setText(themeToggle, isDarkMode ? '☾' : '☀');
            try {
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            } catch (storageWriteError) {
                // Ignore write issues.
            }
            return false;
        });
    }

    if (taskForm) {
        attachEvent(taskForm, 'submit', function(e) {
            if (e && e.preventDefault) {
                e.preventDefault();
            }
            if (taskInput) {
                addTask(taskInput.value);
                taskInput.value = '';
            }
            return false;
        });
    }

    var clearPendingBtn = document.getElementById('clear-pending-btn');
    if (clearPendingBtn) {
        attachEvent(clearPendingBtn, 'click', function(e) {
            if (e && e.preventDefault) {
                e.preventDefault();
            }
            clearPendingTasks();
            return false;
        });
    }

    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        attachEvent(exportBtn, 'click', exportTasksToTxt);
    }

    updateDateDisplay();
    loadTasksFromServer();
});
