/**
 * Task Manager Pro - Main JavaScript File
 * A modern task management application with full CRUD operations
 */

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
        this.showWelcomeMessage();
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.render();
        });

        // Clear completed tasks
        document.getElementById('clearCompleted').addEventListener('click', () => {
            this.clearCompleted();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to add task
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('taskForm');
            if (document.activeElement.closest('.task-form')) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput.value) {
                searchInput.value = '';
                this.searchTerm = '';
                this.render();
            }
        }
    }

    /**
     * Set active filter button
     */
    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    /**
     * Add a new task
     */
    addTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const category = document.getElementById('taskCategory').value;
        const dueDate = document.getElementById('dueDate').value;

        // Validation
        if (!title) {
            this.showNotification('Judul task tidak boleh kosong!', 'error');
            return;
        }

        // Create task object
        const task = {
            id: this.generateId(),
            title,
            description,
            priority,
            category,
            dueDate,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add to tasks array
        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        this.updateStats();

        // Reset form
        this.resetForm();
        
        // Show success message
        this.showNotification('Task berhasil ditambahkan!', 'success');
    }

    /**
     * Generate unique ID for tasks
     */
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Reset the task form
     */
    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskTitle').focus();
    }

    /**
     * Toggle task completion status
     */
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.render();
            this.updateStats();
            
            const message = task.completed ? 
                'Task selesai! Kerja bagus!' : 
                'Task dikembalikan ke pending';
            this.showNotification(message, task.completed ? 'success' : 'info');
        }
    }

    /**
     * Delete a task
     */
    deleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        if (confirm(`Yakin ingin menghapus task "${task.title}"?`)) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
            this.updateStats();
            this.showNotification('Task berhasil dihapus!', 'success');
        }
    }

    /**
     * Clear all completed tasks
     */
    clearCompleted() {
        const completedTasks = this.tasks.filter(t => t.completed);
        
        if (completedTasks.length === 0) {
            this.showNotification('Tidak ada task yang sudah selesai!', 'info');
            return;
        }

        if (confirm(`Hapus ${completedTasks.length} task yang sudah selesai?`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
            this.updateStats();
            this.showNotification(`${completedTasks.length} task berhasil dihapus!`, 'success');
        }
    }

    /**
     * Get filtered tasks based on current filter and search term
     */
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(this.searchTerm) ||
                task.description.toLowerCase().includes(this.searchTerm) ||
                this.getCategoryLabel(task.category).toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'high':
                filtered = filtered.filter(task => task.priority === 'high' && !task.completed);
                break;
        }

        // Sort tasks: incomplete first, then by priority, then by creation date
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed - b.completed;
            }
            
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filtered;
    }

    /**
     * Render tasks to the DOM
     */
    render() {
        const container = document.getElementById('taskContainer');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            container.innerHTML = this.createEmptyState();
            return;
        }

        container.innerHTML = filteredTasks
            .map(task => this.createTaskHTML(task))
            .join('');

        // Bind task actions
        this.bindTaskActions(container);
    }

    /**
     * Create empty state HTML
     */
    createEmptyState() {
        const messages = {
            all: {
                title: 'Belum ada tasks',
                subtitle: 'Mulai dengan menambahkan task pertama Anda!'
            },
            pending: {
                title: 'Tidak ada task pending',
                subtitle: 'Semua task sudah selesai!'
            },
            completed: {
                title: 'Belum ada task yang selesai',
                subtitle: 'Selesaikan beberapa task untuk melihatnya di sini'
            },
            high: {
                title: 'Tidak ada high priority task',
                subtitle: 'Semua task penting sudah selesai!'
            }
        };

        const message = messages[this.currentFilter] || messages.all;
        
        if (this.searchTerm) {
            message.title = 'Tidak ada hasil pencarian';
            message.subtitle = 'Coba kata kunci lain atau hapus filter';
        }

        return `
            <div class="empty-state">
                <ion-icon name="document-outline" class="empty-icon"></ion-icon>
                <h3>${message.title}</h3>
                <p>${message.subtitle}</p>
            </div>
        `;
    }

    /**
     * Bind event listeners for task actions
     */
    bindTaskActions(container) {
        container.querySelectorAll('.task-item').forEach(item => {
            const id = item.dataset.id;
            
            const toggleBtn = item.querySelector('.toggle-btn');
            const deleteBtn = item.querySelector('.delete-btn');
            
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTask(id);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteTask(id);
                });
            }
        });
    }

    /**
     * Create HTML for a single task
     */
    createTaskHTML(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && !task.completed;
        const dueDateFormatted = dueDate ? this.formatDate(dueDate) : null;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority" data-id="${task.id}">
                <div class="task-actions">
                    <button class="action-btn toggle-btn" title="${task.completed ? 'Tandai sebagai pending' : 'Tandai sebagai selesai'}">
                        <ion-icon name="${task.completed ? 'refresh-outline' : 'checkmark-outline'}"></ion-icon>
                    </button>
                    <button class="action-btn delete-btn" title="Hapus task">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
                
                <div class="task-header">
                    <div class="task-title ${task.completed ? 'completed-text' : ''}">${this.escapeHtml(task.title)}</div>
                    <span class="task-priority priority-${task.priority}">
                        <ion-icon name="${this.getPriorityIcon(task.priority)}"></ion-icon>
                        ${task.priority.toUpperCase()}
                    </span>
                </div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-meta">
                    <span>
                        <ion-icon name="${this.getCategoryIcon(task.category)}"></ion-icon>
                        ${this.getCategoryLabel(task.category)}
                    </span>
                    ${dueDateFormatted ? `
                        <span style="color: ${isOverdue ? '#dc3545' : '#666'}">
                            <ion-icon name="calendar-outline"></ion-icon>
                            ${dueDateFormatted}
                            ${isOverdue ? '(Terlambat!)' : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get priority icon
     */
    getPriorityIcon(priority) {
        const icons = {
            high: 'warning-outline',
            medium: 'flag-outline',
            low: 'checkmark-circle-outline'
        };
        return icons[priority] || 'flag-outline';
    }

    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            work: 'briefcase-outline',
            personal: 'person-outline',
            study: 'school-outline',
            health: 'fitness-outline',
            other: 'apps-outline'
        };
        return icons[category] || 'folder-outline';
    }

    /**
     * Get category label in Indonesian
     */
    getCategoryLabel(category) {
        const labels = {
            work: 'Pekerjaan',
            personal: 'Personal',
            study: 'Belajar',
            health: 'Kesehatan',
            other: 'Lainnya'
        };
        return labels[category] || category;
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('id-ID', options);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update statistics
     */
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const highPriority = this.tasks.filter(t => t.priority === 'high' && !t.completed).length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        // Update DOM elements
        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('highPriorityTasks').textContent = highPriority;
        document.getElementById('totalProgress').style.width = `${completionRate}%`;

        // Update document title
        if (pending > 0) {
            document.title = `(${pending}) Task Manager Pro`;
        } else {
            document.title = 'Task Manager Pro';
        }
    }

    /**
     * Save tasks to localStorage (simulated for demo)
     */
    saveTasks() {
        try {
            // In a real application, this would save to localStorage
            // localStorage.setItem('taskManagerTasks', JSON.stringify(this.tasks));
            
            // For demo purposes, we'll just keep tasks in memory
            console.log('Tasks saved:', this.tasks.length);
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showNotification('Gagal menyimpan data!', 'error');
        }
    }

    /**
     * Load tasks from localStorage (simulated for demo)
     */
    loadTasks() {
        try {
            // In a real application, this would load from localStorage
            // const savedTasks = localStorage.getItem('taskManagerTasks');
            // return savedTasks ? JSON.parse(savedTasks) : this.getDefaultTasks();
            
            // For demo purposes, return default tasks
            return this.getDefaultTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            return this.getDefaultTasks();
        }
    }

    /**
     * Get default demo tasks
     */
    getDefaultTasks() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return [
            {
                id: 'demo-1',
                title: 'Setup GitHub Repository',
                description: 'Membuat repository baru di GitHub untuk project Task Manager Pro dengan README yang lengkap',
                priority: 'high',
                category: 'work',
                dueDate: tomorrow.toISOString(),
                completed: false,
                createdAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
            },
            {
                id: 'demo-2',
                title: 'Code Review dan Testing',
                description: 'Melakukan review code dan testing untuk memastikan aplikasi berjalan dengan baik di berbagai browser',
                priority: 'medium',
                category: 'work',
                dueDate: '',
                completed: true,
                createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
            },
            {
                id: 'demo-3',
                title: 'Belajar Advanced JavaScript',
                description: 'Mempelajari konsep advanced JavaScript seperti Promises, Async/Await, dan Module patterns',
                priority: 'medium',
                category: 'study',
                dueDate: nextWeek.toISOString(),
                completed: false,
                createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'demo-4',
                title: 'Olahraga Pagi',
                description: 'Jogging selama 30 menit di taman untuk menjaga kesehatan dan kebugaran',
                priority: 'low',
                category: 'health',
                dueDate: '',
                completed: true,
                createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            document.body.removeChild(notification);
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        // Set colors based on type
        const styles = {
            success: { bg: '#28a745', color: 'white', icon: 'checkmark-circle-outline' },
            error: { bg: '#dc3545', color: 'white', icon: 'alert-circle-outline' },
            warning: { bg: '#ffc107', color: '#333', icon: 'warning-outline' },
            info: { bg: '#17a2b8', color: 'white', icon: 'information-circle-outline' }
        };

        const style = styles[type] || styles.info;
        notification.style.backgroundColor = style.bg;
        notification.style.color = style.color;

        notification.innerHTML = `
            <ion-icon name="${style.icon}"></ion-icon>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove notification
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
    }

    /**
     * Show welcome message on first load
     */
    showWelcomeMessage() {
        setTimeout(() => {
            this.showNotification('Selamat datang di Task Manager Pro! 🎉', 'success');
        }, 500);
    }

    /**
     * Export tasks to JSON (bonus feature)
     */
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Tasks berhasil diekspor!', 'success');
    }

    /**
     * Get tasks summary for reporting
     */
    getTasksSummary() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(t => {
            if (!t.dueDate || t.completed) return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        const byPriority = {
            high: this.tasks.filter(t => t.priority === 'high').length,
            medium: this.tasks.filter(t => t.priority === 'medium').length,
            low: this.tasks.filter(t => t.priority === 'low').length
        };

        const byCategory = {
            work: this.tasks.filter(t => t.category === 'work').length,
            personal: this.tasks.filter(t => t.category === 'personal').length,
            study: this.tasks.filter(t => t.category === 'study').length,
            health: this.tasks.filter(t => t.category === 'health').length,
            other: this.tasks.filter(t => t.category === 'other').length
        };

        return {
            total,
            completed,
            pending,
            overdue,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            byPriority,
            byCategory
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.taskManager = new TaskManager();
    
    // Add some global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + N to focus on new task input
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('taskTitle').focus();
        }
        
        // Alt + S to focus on search
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });
    
    // Show keyboard shortcuts help on F1
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            const shortcuts = `
                Keyboard Shortcuts:
                • Alt + N: Focus on new task input
                • Alt + S: Focus on search
                • Ctrl/Cmd + Enter: Submit form
                • Escape: Clear search
                • F1: Show this help
            `;
            alert(shortcuts);
        }
    });
    
    console.log('Task Manager Pro initialized successfully! 🚀');
});