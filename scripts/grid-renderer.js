// Grid Renderer - Weekly grid display and interaction

import { formatDate, isToday, getDayName, escapeHtml, showToast, throttle } from './utils.js';
import habitManager from './habit-manager.js';
import streakCalculator from './streak-calculator.js';
import navigationController from './navigation.js';

class GridRenderer {
    constructor() {
        this.gridContainer = null;
        this.habitsGrid = null;
        this.editingHabitId = null;
        this.initialized = false;
        
        // Throttled functions for performance
        this.throttledToggleCompletion = throttle(this.toggleCompletion.bind(this), 100);
        this.throttledUpdateStreak = throttle(this.updateStreakDisplay.bind(this), 50);
    }

    /**
     * Initialize grid renderer
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            this.gridContainer = document.getElementById('weekly-grid');
            this.habitsGrid = document.getElementById('habits-grid');
            
            if (!this.gridContainer || !this.habitsGrid) {
                throw new Error('Grid container elements not found');
            }
            
            this.setupEventListeners();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing GridRenderer:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for habit manager events
        habitManager.addListener(this.handleHabitManagerEvent.bind(this));
        
        // Listen for navigation events
        navigationController.addListener(this.handleNavigationEvent.bind(this));
        
        // Setup keyboard navigation
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        
        // Setup grid click delegation
        this.habitsGrid.addEventListener('click', this.handleGridClick.bind(this));
        this.habitsGrid.addEventListener('keydown', this.handleGridKeydown.bind(this));
        
        // Setup focus management
        this.habitsGrid.addEventListener('focusin', this.handleFocusIn.bind(this));
        this.habitsGrid.addEventListener('focusout', this.handleFocusOut.bind(this));
    }

    /**
     * Render grid
     */
    async renderGrid(habits, currentWeek) {
        try {
            if (!this.habitsGrid) return;
            
            // Clear existing content
            this.habitsGrid.innerHTML = '';
            
            // Update day headers
            this.updateDayHeaders(currentWeek);
            
            if (habits.length === 0) {
                this.renderEmptyGrid();
                return;
            }
            
            // Get week dates
            const weekDates = navigationController.getWeekDatesFor(currentWeek);
            
            // Render each habit row
            for (const habit of habits) {
                await this.renderHabitRow(habit, weekDates);
            }
            
            // Update accessibility attributes
            this.updateGridAccessibility();
            
        } catch (error) {
            console.error('Error rendering grid:', error);
            showToast('Error displaying habit grid', 'error');
        }
    }

    /**
     * Update day headers with current week dates
     * @param {Date} currentWeek - Current week start date
     */
    updateDayHeaders(currentWeek) {
        const dayHeaders = document.querySelectorAll('.day-header');
        const weekDates = navigationController.getWeekDatesFor(currentWeek);
        
        dayHeaders.forEach((header, index) => {
            if (index < weekDates.length) {
                const date = weekDates[index];
                const dayName = getDayName(date, 'short');
                const dayNumber = date.getDate();
                
                header.innerHTML = `
                    <span class="day-name">${dayName}</span>
                    <span class="day-number">${dayNumber}</span>
                `;
                
                // Highlight today's column
                if (isToday(date)) {
                    header.classList.add('today');
                    header.setAttribute('aria-label', `${dayName} ${dayNumber} (Today)`);
                } else {
                    header.classList.remove('today');
                    header.setAttribute('aria-label', `${dayName} ${dayNumber}`);
                }
            }
        });
    }

    /**
     * Render a single habit row
     * @param {Object} habit - Habit object
     * @param {Date[]} weekDates - Array of week dates
     * @returns {Promise<void>}
     */
    async renderHabitRow(habit, weekDates) {
        try {
            const row = document.createElement('div');
            row.className = 'habit-row';
            row.setAttribute('data-habit-id', habit.id);
            row.setAttribute('role', 'row');
            
            // Render habit info cell
            const habitInfo = this.createHabitInfoCell(habit);
            row.appendChild(habitInfo);
            
            // Render completion cells
            weekDates.forEach((date, index) => {
                const cell = this.createCompletionCell(habit, date, index);
                row.appendChild(cell);
            });
            
            this.habitsGrid.appendChild(row);
            
        } catch (error) {
            console.error('Error rendering habit row:', error);
        }
    }

    /**
     * Create habit info cell
     * @param {Object} habit - Habit object
     * @returns {HTMLElement} Habit info cell element
     */
    createHabitInfoCell(habit) {
        const cell = document.createElement('div');
        cell.className = 'habit-info';
        cell.setAttribute('role', 'gridcell');
        
        // Calculate current streak
        const streak = streakCalculator.calculateStreak(habit.completions);
        
        cell.innerHTML = `
            <div class="habit-details">
                <div class="habit-name" data-habit-id="${habit.id}">
                    ${escapeHtml(habit.name)}
                </div>
                <input type="text" class="habit-edit-input" value="${escapeHtml(habit.name)}" 
                       maxlength="100" style="display: none;">
                <div class="habit-streak">
                    <span class="streak-icon" aria-hidden="true">🔥</span>
                    <span class="streak-number">${streak}</span>
                    <span class="streak-label">day${streak !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="habit-actions">
                <button class="habit-action-btn edit" 
                        aria-label="Edit ${escapeHtml(habit.name)}"
                        data-habit-id="${habit.id}">
                    ✏️
                </button>
                <button class="habit-action-btn delete" 
                        aria-label="Delete ${escapeHtml(habit.name)}"
                        data-habit-id="${habit.id}">
                    🗑️
                </button>
            </div>
        `;
        
        return cell;
    }

    /**
     * Create completion cell
     * @param {Object} habit - Habit object
     * @param {Date} date - Date for this cell
     * @param {number} dayIndex - Day index (0-6)
     * @returns {HTMLElement} Completion cell element
     */
    createCompletionCell(habit, date, dayIndex) {
        const cell = document.createElement('div');
        const dateString = formatDate(date);
        const isCompleted = habitManager.getCompletion(habit.id, date);
        const isTodayCell = isToday(date);
        
        cell.className = 'completion-cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-pressed', isCompleted.toString());
        cell.setAttribute('data-habit-id', habit.id);
        cell.setAttribute('data-date', dateString);
        cell.setAttribute('data-day-index', dayIndex.toString());
        
        // Add classes for styling
        if (isCompleted) {
            cell.classList.add('completed');
        }
        if (isTodayCell) {
            cell.classList.add('today');
        }
        
        // Add checkmark for completed cells
        if (isCompleted) {
            cell.innerHTML = '<span class="checkmark" aria-hidden="true">✓</span>';
        }
        
        // Accessibility label
        const dayName = getDayName(date, 'long');
        const statusText = isCompleted ? 'completed' : 'not completed';
        const todayText = isTodayCell ? ' (Today)' : '';
        cell.setAttribute('aria-label', 
            `${habit.name} on ${dayName}${todayText}: ${statusText}`);
        
        return cell;
    }

    /**
     * Render empty grid state
     */
    renderEmptyGrid() {
        this.habitsGrid.innerHTML = `
            <div class="empty-grid-message">
                <p>No habits to display. Add your first habit to get started!</p>
            </div>
        `;
    }

    /**
     * Toggle completion status for a habit-date combination
     * @param {string} habitId - Habit ID
     * @param {Date} date - Date to toggle
     * @returns {Promise<void>}
     */
    async toggleCompletion(habitId, date) {
        try {
            const cell = this.getCompletionCell(habitId, date);
            if (!cell) return;
            
            const habit = habitManager.getHabit(habitId);
            if (!habit) return;
            
            // Get previous streak before toggle
            const previousStreak = streakCalculator.calculateStreak(habit.completions);
            
            // Add loading state
            cell.classList.add('loading');
            
            // Toggle completion in habit manager
            const newStatus = await habitManager.toggleCompletion(habitId, date);
            
            // Update cell visual state with animation
            this.updateCompletionCell(cell, newStatus);
            this.animateCellCompletion(cell);
            
            // Check for milestone after toggling
            if (newStatus) {
                // Get new streak
                const updatedHabit = habitManager.getHabit(habitId);
                const newStreak = streakCalculator.calculateStreak(updatedHabit.completions);
                
                // Check if this is a milestone
                const milestone = streakCalculator.checkMilestoneAchieved(previousStreak, newStreak);
                if (milestone) {
                    // Trigger celebration
                    setTimeout(() => {
                        this.triggerMilestoneCelebration(milestone, habit.name);
                    }, 300);
                }
            }
            
            // Update streak display with throttling
            this.throttledUpdateStreak(habitId);
            
            // Animate streak update
            const streakNumberElement = document.querySelector(
                `[data-habit-id="${habitId}"] .streak-number`
            );
            if (streakNumberElement) {
                this.animateStreakUpdate(streakNumberElement);
            }
            
            // Remove loading state
            cell.classList.remove('loading');
            
            // Announce change to screen readers
            this.announceCompletionChange(habitId, date, newStatus);
            
        } catch (error) {
            console.error('Error toggling completion:', error);
            showToast('Unable to save progress', 'error');
        }
    }

    /**
     * Update completion cell visual state
     * @param {HTMLElement} cell - Completion cell element
     * @param {boolean} isCompleted - New completion status
     */
    updateCompletionCell(cell, isCompleted) {
        cell.setAttribute('aria-pressed', isCompleted.toString());
        
        if (isCompleted) {
            cell.classList.add('completed');
            cell.innerHTML = '<span class="checkmark" aria-hidden="true">✓</span>';
        } else {
            cell.classList.remove('completed');
            cell.innerHTML = '';
        }
        
        // Update aria-label
        const habitId = cell.getAttribute('data-habit-id');
        const dateString = cell.getAttribute('data-date');
        const habit = habitManager.getHabit(habitId);
        const date = new Date(dateString + 'T00:00:00.000Z');
        
        if (habit) {
            const dayName = getDayName(date, 'long');
            const statusText = isCompleted ? 'completed' : 'not completed';
            const todayText = isToday(date) ? ' (Today)' : '';
            cell.setAttribute('aria-label', 
                `${habit.name} on ${dayName}${todayText}: ${statusText}`);
        }
    }

    /**
     * Update streak display for a habit
     * @param {string} habitId - Habit ID
     */
    updateStreakDisplay(habitId) {
        try {
            const habit = habitManager.getHabit(habitId);
            if (!habit) return;
            
            const streak = streakCalculator.calculateStreak(habit.completions);
            const streakElement = document.querySelector(
                `[data-habit-id="${habitId}"] .streak-number`
            );
            const streakLabel = document.querySelector(
                `[data-habit-id="${habitId}"] .streak-label`
            );
            
            if (streakElement) {
                streakElement.textContent = streak.toString();
            }
            
            if (streakLabel) {
                streakLabel.textContent = `day${streak !== 1 ? 's' : ''}`;
            }
            
        } catch (error) {
            console.error('Error updating streak display:', error);
        }
    }

    /**
     * Get completion cell element
     * @param {string} habitId - Habit ID
     * @param {Date} date - Date
     * @returns {HTMLElement|null} Completion cell or null
     */
    getCompletionCell(habitId, date) {
        const dateString = formatDate(date);
        return document.querySelector(
            `.completion-cell[data-habit-id="${habitId}"][data-date="${dateString}"]`
        );
    }

    /**
     * Handle grid click events
     * @param {Event} event - Click event
     */
    async handleGridClick(event) {
        const target = event.target;
        
        // Handle completion cell clicks
        if (target.classList.contains('completion-cell') || 
            target.closest('.completion-cell')) {
            
            const cell = target.classList.contains('completion-cell') ? 
                target : target.closest('.completion-cell');
            
            const habitId = cell.getAttribute('data-habit-id');
            const dateString = cell.getAttribute('data-date');
            const date = new Date(dateString + 'T00:00:00.000Z');
            
            await this.throttledToggleCompletion(habitId, date);
            return;
        }
        
        // Handle edit button clicks
        if (target.classList.contains('edit') || target.closest('.edit')) {
            const button = target.classList.contains('edit') ? target : target.closest('.edit');
            const habitId = button.getAttribute('data-habit-id');
            this.startEditingHabit(habitId);
            return;
        }
        
        // Handle delete button clicks
        if (target.classList.contains('delete') || target.closest('.delete')) {
            const button = target.classList.contains('delete') ? target : target.closest('.delete');
            const habitId = button.getAttribute('data-habit-id');
            await habitManager.deleteHabit(habitId);
            return;
        }
        
        // Handle habit name double-click for editing
        if (target.classList.contains('habit-name')) {
            const habitId = target.getAttribute('data-habit-id');
            this.startEditingHabit(habitId);
            return;
        }
    }

    /**
     * Handle grid keyboard events
     * @param {KeyboardEvent} event - Keyboard event
     */
    async handleGridKeydown(event) {
        const target = event.target;
        
        // Handle completion cell keyboard interaction
        if (target.classList.contains('completion-cell')) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const habitId = target.getAttribute('data-habit-id');
                const dateString = target.getAttribute('data-date');
                const date = new Date(dateString + 'T00:00:00.000Z');
                
                await this.throttledToggleCompletion(habitId, date);
                return;
            }
            
            // Arrow key navigation within grid
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                this.navigateGrid(target, event.key);
                return;
            }
        }
        
        // Handle edit input keyboard events
        if (target.classList.contains('habit-edit-input')) {
            if (event.key === 'Enter') {
                event.preventDefault();
                await this.saveHabitEdit(target);
                return;
            }
            
            if (event.key === 'Escape') {
                event.preventDefault();
                this.cancelHabitEdit();
                return;
            }
        }
    }

    /**
     * Navigate within the grid using arrow keys
     * @param {HTMLElement} currentCell - Currently focused cell
     * @param {string} direction - Arrow key direction
     */
    navigateGrid(currentCell, direction) {
        const habitId = currentCell.getAttribute('data-habit-id');
        const dayIndex = parseInt(currentCell.getAttribute('data-day-index'));
        const habitRow = currentCell.closest('.habit-row');
        
        let targetCell = null;
        
        switch (direction) {
            case 'ArrowLeft':
                if (dayIndex > 0) {
                    targetCell = habitRow.querySelector(`[data-day-index="${dayIndex - 1}"]`);
                }
                break;
                
            case 'ArrowRight':
                if (dayIndex < 6) {
                    targetCell = habitRow.querySelector(`[data-day-index="${dayIndex + 1}"]`);
                }
                break;
                
            case 'ArrowUp':
                const prevRow = habitRow.previousElementSibling;
                if (prevRow) {
                    targetCell = prevRow.querySelector(`[data-day-index="${dayIndex}"]`);
                }
                break;
                
            case 'ArrowDown':
                const nextRow = habitRow.nextElementSibling;
                if (nextRow) {
                    targetCell = nextRow.querySelector(`[data-day-index="${dayIndex}"]`);
                }
                break;
        }
        
        if (targetCell) {
            targetCell.focus();
        }
    }

    /**
     * Start editing a habit name
     * @param {string} habitId - Habit ID to edit
     */
    startEditingHabit(habitId) {
        try {
            // Cancel any existing edit
            this.cancelHabitEdit();
            
            const habitInfo = document.querySelector(`[data-habit-id="${habitId}"]`).closest('.habit-info');
            const habitName = habitInfo.querySelector('.habit-name');
            const editInput = habitInfo.querySelector('.habit-edit-input');
            
            if (!habitInfo || !habitName || !editInput) return;
            
            // Enter edit mode
            habitInfo.classList.add('edit-mode');
            editInput.style.display = 'block';
            editInput.value = habitName.textContent.trim();
            editInput.focus();
            editInput.select();
            
            this.editingHabitId = habitId;
            
        } catch (error) {
            console.error('Error starting habit edit:', error);
        }
    }

    /**
     * Save habit edit
     * @param {HTMLElement} input - Edit input element
     * @returns {Promise<void>}
     */
    async saveHabitEdit(input) {
        try {
            if (!this.editingHabitId) return;
            
            const newName = input.value.trim();
            const success = await habitManager.updateHabit(this.editingHabitId, newName);
            
            if (success) {
                // Update display
                const habitInfo = input.closest('.habit-info');
                const habitName = habitInfo.querySelector('.habit-name');
                habitName.textContent = newName;
            }
            
            this.cancelHabitEdit();
            
        } catch (error) {
            console.error('Error saving habit edit:', error);
            this.cancelHabitEdit();
        }
    }

    /**
     * Cancel habit edit
     */
    cancelHabitEdit() {
        if (!this.editingHabitId) return;
        
        try {
            const habitInfo = document.querySelector(`[data-habit-id="${this.editingHabitId}"]`).closest('.habit-info');
            const editInput = habitInfo.querySelector('.habit-edit-input');
            
            if (habitInfo) {
                habitInfo.classList.remove('edit-mode');
            }
            
            if (editInput) {
                editInput.style.display = 'none';
            }
            
            this.editingHabitId = null;
            
        } catch (error) {
            console.error('Error canceling habit edit:', error);
        }
    }

    /**
     * Handle habit manager events
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    async handleHabitManagerEvent(event, data) {
        switch (event) {
            case 'habits-loaded':
            case 'habit-created':
            case 'habit-updated':
            case 'habit-deleted':
                await this.refreshGrid();
                break;
                
            case 'completion-toggled':
                // Grid is already updated by the toggle action
                break;
        }
    }

    /**
     * Handle navigation events
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    async handleNavigationEvent(event, data) {
        switch (event) {
            case 'week-changed':
            case 'navigation-loaded':
                await this.refreshGrid();
                break;
        }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    async handleKeyboardNavigation(event) {
        // Only handle if not in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Let navigation controller handle week navigation
        await navigationController.handleKeyboardNavigation(event);
    }

    /**
     * Handle focus in events
     * @param {FocusEvent} event - Focus event
     */
    handleFocusIn(event) {
        const target = event.target;
        
        if (target.classList.contains('completion-cell')) {
            target.classList.add('focused');
        }
    }

    /**
     * Handle focus out events
     * @param {FocusEvent} event - Focus event
     */
    handleFocusOut(event) {
        const target = event.target;
        
        if (target.classList.contains('completion-cell')) {
            target.classList.remove('focused');
        }
    }

    /**
     * Refresh the entire grid
     * @returns {Promise<void>}
     */
    async refreshGrid() {
        try {
            const habits = habitManager.getHabits();
            const currentWeek = navigationController.getCurrentWeek();
            await this.renderGrid(habits, currentWeek);
        } catch (error) {
            console.error('Error refreshing grid:', error);
        }
    }

    /**
     * Update grid accessibility attributes
     */
    updateGridAccessibility() {
        // Update grid role and labels
        if (this.habitsGrid) {
            this.habitsGrid.setAttribute('aria-label', 'Weekly habit tracking grid');
            this.habitsGrid.setAttribute('aria-rowcount', this.habitsGrid.children.length.toString());
            this.habitsGrid.setAttribute('aria-colcount', '8'); // 1 habit column + 7 day columns
        }
        
        // Update row indices
        const rows = this.habitsGrid.querySelectorAll('.habit-row');
        rows.forEach((row, index) => {
            row.setAttribute('aria-rowindex', (index + 1).toString());
        });
    }

    /**
     * Announce completion change to screen readers
     * @param {string} habitId - Habit ID
     * @param {Date} date - Date
     * @param {boolean} isCompleted - New completion status
     */
    announceCompletionChange(habitId, date, isCompleted) {
        try {
            const habit = habitManager.getHabit(habitId);
            if (!habit) return;
            
            const dayName = getDayName(date, 'long');
            const statusText = isCompleted ? 'completed' : 'marked as incomplete';
            const message = `${habit.name} on ${dayName} ${statusText}`;
            
            // Create temporary announcement element
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            
            // Remove after announcement
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
            
        } catch (error) {
            console.error('Error announcing completion change:', error);
        }
    }

    /**
     * Trigger celebration animation and confetti for milestone achievement
     * @param {number} milestone - Milestone number
     * @param {string} habitName - Habit name
     */
    triggerMilestoneCelebration(milestone, habitName) {
        try {
            // Get milestone details
            const emoji = streakCalculator.getMilestoneEmoji(milestone);
            const message = streakCalculator.getMilestoneMessage(milestone);
            
            // Show celebration modal/toast
            this.showCelebrationToast(emoji, message, habitName, milestone);
            
            // Trigger confetti if available
            if (typeof confetti !== 'undefined') {
                this.triggerConfetti(milestone);
            }
            
            // Play celebration sound (if available)
            this.playCelebrationSound();
            
        } catch (error) {
            console.error('Error triggering celebration:', error);
        }
    }

    /**
     * Show celebration toast notification
     * @param {string} emoji - Emoji for milestone
     * @param {string} message - Celebration message
     * @param {string} habitName - Habit name
     * @param {number} milestone - Milestone number
     */
    showCelebrationToast(emoji, message, habitName, milestone) {
        try {
            // Create celebration element
            const celebration = document.createElement('div');
            celebration.className = 'milestone-celebration';
            celebration.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(12px);
                border: 2px solid #06b6d4;
                border-radius: 16px;
                padding: 2rem 3rem;
                z-index: 10000;
                text-align: center;
                animation: celebrationScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(6, 182, 212, 0.3);
            `;
            
            celebration.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s ease-in-out;">${emoji}</div>
                <h2 style="font-size: 1.8rem; color: #22d3ee; font-weight: 800; margin: 0.5rem 0; font-family: Poppins, sans-serif;">${message}</h2>
                <p style="color: #cbd5e1; font-size: 1rem; margin: 0.75rem 0; font-weight: 500;">${habitName}</p>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 1rem 0 0;">Day ${milestone}</p>
            `;
            
            document.body.appendChild(celebration);
            
            // Add CSS animation
            if (!document.querySelector('style[data-celebration]')) {
                const style = document.createElement('style');
                style.setAttribute('data-celebration', 'true');
                style.textContent = `
                    @keyframes celebrationScaleIn {
                        0% {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0.3);
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(1.1);
                        }
                        100% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                    }
                    
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-20px); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Remove after 3 seconds
            setTimeout(() => {
                celebration.style.animation = 'celebrationScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) reverse forwards';
                setTimeout(() => {
                    document.body.removeChild(celebration);
                }, 500);
            }, 3000);
            
        } catch (error) {
            console.error('Error showing celebration toast:', error);
        }
    }

    /**
     * Trigger confetti animation
     * @param {number} milestone - Milestone number (for intensity)
     */
    triggerConfetti(milestone) {
        try {
            if (typeof confetti === 'undefined') return;
            
            // Calculate confetti duration based on milestone
            const duration = Math.min(5000, 1000 + milestone * 50);
            const end = Date.now() + duration;
            
            // Color scheme based on milestone
            const colors = ['#06b6d4', '#8b5cf6', '#22d3ee', '#a78bfa', '#10b981'];
            
            const frame = () => {
                confetti({
                    particleCount: Math.floor(milestone / 10) + 3,
                    angle: 60 + Math.random() * 60,
                    spread: 70,
                    origin: { x: 0, y: 0.5 },
                    colors: colors,
                    decay: 0.95
                });
                
                confetti({
                    particleCount: Math.floor(milestone / 10) + 3,
                    angle: 120 - Math.random() * 60,
                    spread: 70,
                    origin: { x: 1, y: 0.5 },
                    colors: colors,
                    decay: 0.95
                });
                
                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            
            frame();
            
        } catch (error) {
            console.error('Error triggering confetti:', error);
        }
    }

    /**
     * Play celebration sound (optional)
     */
    playCelebrationSound() {
        try {
            // Create a simple beep using Web Audio API if available
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContext();
                
                const now = audioContext.currentTime;
                const notes = [523.25, 659.25, 783.99]; // C, E, G
                
                notes.forEach((frequency, index) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.frequency.value = frequency;
                    gain.gain.setValueAtTime(0.3, now + index * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.1);
                    
                    osc.start(now + index * 0.1);
                    osc.stop(now + index * 0.1 + 0.1);
                });
            }
        } catch (error) {
            // Silent fail - audio is optional
            console.debug('Could not play celebration sound:', error);
        }
    }

    /**
     * Animate a cell completion with bounce effect
     * @param {HTMLElement} cell - Cell element to animate
     */
    animateCellCompletion(cell) {
        try {
            // Add animation class
            cell.style.animation = 'none';
            
            // Trigger reflow to restart animation
            void cell.offsetWidth;
            
            // Apply bounce animation
            cell.style.animation = 'checkmarkBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Create particle burst effect
            this.createParticleBurst(cell);
            
        } catch (error) {
            console.error('Error animating cell completion:', error);
        }
    }

    /**
     * Create particle burst effect for cell completion
     * @param {HTMLElement} cell - Source cell element
     */
    createParticleBurst(cell) {
        try {
            const rect = cell.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create 5-8 particles
            const particleCount = 5 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    z-index: 999;
                    font-size: 1rem;
                    left: ${centerX}px;
                    top: ${centerY}px;
                `;
                
                // Emojis for particles
                const emojis = ['✓', '⭐', '✨', '🎉'];
                particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                
                document.body.appendChild(particle);
                
                // Animate particle
                const angle = (i / particleCount) * Math.PI * 2;
                const distance = 60 + Math.random() * 40;
                const endX = centerX + Math.cos(angle) * distance;
                const endY = centerY + Math.sin(angle) * distance - 80;
                
                particle.animate([
                    {
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    {
                        transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`,
                        opacity: 0
                    }
                ], {
                    duration: 800 + Math.random() * 200,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }).onfinish = () => {
                    document.body.removeChild(particle);
                };
            }
            
        } catch (error) {
            console.error('Error creating particle burst:', error);
        }
    }

    /**
     * Animate streak number update
     * @param {HTMLElement} streakElement - Streak number element
     */
    animateStreakUpdate(streakElement) {
        try {
            if (!streakElement) return;
            
            streakElement.classList.add('milestone');
            
            // Remove class after animation
            setTimeout(() => {
                streakElement.classList.remove('milestone');
            }, 800);
            
        } catch (error) {
            console.error('Error animating streak update:', error);
        }
    }

    /**
     * Get grid statistics
     * @returns {Object} Grid statistics
     */
    getGridStatistics() {
        const habits = habitManager.getHabits();
        const currentWeek = navigationController.getCurrentWeek();
        const weekDates = navigationController.getWeekDatesFor(currentWeek);
        
        let totalCells = 0;
        let completedCells = 0;
        
        habits.forEach(habit => {
            weekDates.forEach(date => {
                totalCells++;
                if (habitManager.getCompletion(habit.id, date)) {
                    completedCells++;
                }
            });
        });
        
        return {
            totalHabits: habits.length,
            totalCells,
            completedCells,
            completionRate: totalCells > 0 ? (completedCells / totalCells) * 100 : 0,
            weekStart: currentWeek,
            weekDates: weekDates.map(date => new Date(date))
        };
    }
}

// Create singleton instance
const gridRenderer = new GridRenderer();

export default gridRenderer;