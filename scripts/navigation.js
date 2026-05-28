// Navigation Controller - Week navigation logic

import { getWeekStart, getWeekDates, formatWeekRange, formatDate, getToday, isSameDay } from './utils.js';
import dataStore, { STORAGE_KEYS } from './data-store.js';

class NavigationController {
    constructor() {
        this.currentWeek = getWeekStart(getToday());
        this.listeners = new Set();
        this.initialized = false;
    }

    // Initialize navigation
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadNavigationState();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing NavigationController:', error);
            this.currentWeek = getWeekStart(getToday());
            this.initialized = true;
        }
    }

    // Load navigation state
    async loadNavigationState() {
        try {
            const settings = await dataStore.load(STORAGE_KEYS.SETTINGS, {});
            
            if (settings.currentWeek) {
                const storedWeek = new Date(settings.currentWeek);
                // Validate stored week is a valid Monday
                if (storedWeek.getDay() === 1) {
                    this.currentWeek = storedWeek;
                } else {
                    // Fix invalid stored week
                    this.currentWeek = getWeekStart(storedWeek);
                }
            } else {
                this.currentWeek = getWeekStart(getToday());
            }
            
            this.notifyListeners('navigation-loaded', this.currentWeek);
        } catch (error) {
            console.error('Error loading navigation state:', error);
            this.currentWeek = getWeekStart(getToday());
        }
    }

    // Save navigation state
    async saveNavigationState() {
        try {
            const settings = await dataStore.load(STORAGE_KEYS.SETTINGS, {});
            settings.currentWeek = this.currentWeek.toISOString();
            
            const success = await dataStore.save(STORAGE_KEYS.SETTINGS, settings);
            return success;
        } catch (error) {
            console.error('Error saving navigation state:', error);
            return false;
        }
    }

    // Get current week
    getCurrentWeek() {
        return new Date(this.currentWeek);
    }

    /**
     * Navigate to a specific week
     * @param {Date} weekStart - Monday of the target week
     * @returns {Promise<boolean>} Success status
     */
    async navigateToWeek(weekStart) {
        try {
            // Ensure weekStart is a Monday
            const monday = getWeekStart(weekStart);
            
            // Don't navigate if already on this week
            if (isSameDay(monday, this.currentWeek)) {
                return true;
            }
            
            const previousWeek = new Date(this.currentWeek);
            this.currentWeek = monday;
            
            // Save navigation state
            const saved = await this.saveNavigationState();
            if (!saved) {
                console.warn('Failed to save navigation state');
                // Continue anyway - navigation still works
            }
            
            // Notify listeners
            this.notifyListeners('week-changed', {
                currentWeek: this.currentWeek,
                previousWeek: previousWeek
            });
            
            return true;
        } catch (error) {
            console.error('Error navigating to week:', error);
            return false;
        }
    }

    /**
     * Get dates for the current week
     * @returns {Date[]} Array of 7 dates (Monday to Sunday)
     */
    getWeekDates() {
        return getWeekDates(this.currentWeek);
    }

    /**
     * Get dates for a specific week
     * @param {Date} weekStart - Monday of the week
     * @returns {Date[]} Array of 7 dates
     */
    getWeekDatesFor(weekStart) {
        return getWeekDates(weekStart);
    }

    /**
     * Navigate to previous week
     * @returns {Promise<boolean>} Success status
     */
    async goToPreviousWeek() {
        const previousWeek = new Date(this.currentWeek);
        previousWeek.setDate(this.currentWeek.getDate() - 7);
        
        return await this.navigateToWeek(previousWeek);
    }

    /**
     * Navigate to next week
     * @returns {Promise<boolean>} Success status
     */
    async goToNextWeek() {
        const nextWeek = new Date(this.currentWeek);
        nextWeek.setDate(this.currentWeek.getDate() + 7);
        
        return await this.navigateToWeek(nextWeek);
    }

    /**
     * Navigate to current week (today's week)
     * @returns {Promise<boolean>} Success status
     */
    async goToCurrentWeek() {
        const currentWeek = getWeekStart(getToday());
        return await this.navigateToWeek(currentWeek);
    }

    /**
     * Check if currently viewing the current week
     * @returns {boolean} True if viewing current week
     */
    isCurrentWeek() {
        const todaysWeek = getWeekStart(getToday());
        return isSameDay(this.currentWeek, todaysWeek);
    }

    /**
     * Check if currently viewing a future week
     * @returns {boolean} True if viewing future week
     */
    isFutureWeek() {
        const todaysWeek = getWeekStart(getToday());
        return this.currentWeek > todaysWeek;
    }

    /**
     * Check if currently viewing a past week
     * @returns {boolean} True if viewing past week
     */
    isPastWeek() {
        const todaysWeek = getWeekStart(getToday());
        return this.currentWeek < todaysWeek;
    }

    /**
     * Get formatted week range string
     * @returns {string} Formatted week range (e.g., "Jan 15-21, 2024")
     */
    getFormattedWeekRange() {
        return formatWeekRange(this.currentWeek);
    }

    /**
     * Get week navigation info
     * @returns {Object} Navigation information
     */
    getNavigationInfo() {
        return {
            currentWeek: new Date(this.currentWeek),
            weekDates: this.getWeekDates(),
            formattedRange: this.getFormattedWeekRange(),
            isCurrentWeek: this.isCurrentWeek(),
            isFutureWeek: this.isFutureWeek(),
            isPastWeek: this.isPastWeek(),
            canGoBack: true, // Always allow going back
            canGoForward: true // Always allow going forward
        };
    }

    /**
     * Get relative week offset from current week
     * @returns {number} Week offset (0 = current week, -1 = last week, +1 = next week)
     */
    getWeekOffset() {
        const todaysWeek = getWeekStart(getToday());
        const daysDifference = (this.currentWeek - todaysWeek) / (1000 * 60 * 60 * 24);
        return Math.round(daysDifference / 7);
    }

    /**
     * Navigate by week offset
     * @param {number} offset - Number of weeks to navigate (positive = future, negative = past)
     * @returns {Promise<boolean>} Success status
     */
    async navigateByOffset(offset) {
        const targetWeek = new Date(this.currentWeek);
        targetWeek.setDate(this.currentWeek.getDate() + (offset * 7));
        
        return await this.navigateToWeek(targetWeek);
    }

    /**
     * Get week boundaries
     * @param {Date} weekStart - Monday of the week
     * @returns {Object} Week start and end dates
     */
    getWeekBoundaries(weekStart = null) {
        const monday = weekStart || this.currentWeek;
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return {
            start: new Date(monday),
            end: new Date(sunday)
        };
    }

    /**
     * Check if a date falls within the current week
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is in current week
     */
    isDateInCurrentWeek(date) {
        const boundaries = this.getWeekBoundaries();
        return date >= boundaries.start && date <= boundaries.end;
    }

    /**
     * Get the Monday of the week containing a specific date
     * @param {Date} date - Reference date
     * @returns {Date} Monday of the week
     */
    getWeekStartForDate(date) {
        return getWeekStart(date);
    }

    /**
     * Navigate to the week containing a specific date
     * @param {Date} date - Target date
     * @returns {Promise<boolean>} Success status
     */
    async navigateToDateWeek(date) {
        const weekStart = getWeekStart(date);
        return await this.navigateToWeek(weekStart);
    }

    /**
     * Get navigation history (for potential undo functionality)
     * @returns {Array} Array of recent week starts
     */
    getNavigationHistory() {
        // This could be expanded to maintain a history stack
        return [this.currentWeek];
    }

    /**
     * Add event listener
     * @param {Function} listener - Event listener function
     */
    addListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * Remove event listener
     * @param {Function} listener - Event listener function
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in navigation listener:', error);
            }
        });
    }

    /**
     * Get keyboard navigation handlers
     * @returns {Object} Keyboard event handlers
     */
    getKeyboardHandlers() {
        return {
            ArrowLeft: () => this.goToPreviousWeek(),
            ArrowRight: () => this.goToNextWeek(),
            Home: () => this.goToCurrentWeek(),
            'h': () => this.goToCurrentWeek(), // 'h' for home
            'j': () => this.goToPreviousWeek(), // 'j' for previous (vim-like)
            'k': () => this.goToNextWeek() // 'k' for next (vim-like)
        };
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {Promise<boolean>} True if event was handled
     */
    async handleKeyboardNavigation(event) {
        const handlers = this.getKeyboardHandlers();
        const key = event.ctrlKey || event.metaKey ? 
            `Ctrl+${event.key}` : event.key;
        
        if (handlers[key]) {
            event.preventDefault();
            await handlers[key]();
            return true;
        }
        
        return false;
    }

    /**
     * Get week statistics
     * @returns {Object} Statistics about current week
     */
    getWeekStatistics() {
        const today = getToday();
        const weekDates = this.getWeekDates();
        const todayIndex = weekDates.findIndex(date => isSameDay(date, today));
        
        return {
            weekStart: new Date(this.currentWeek),
            weekDates: weekDates.map(date => new Date(date)),
            todayIndex: todayIndex,
            daysInWeek: 7,
            daysPassed: todayIndex >= 0 ? todayIndex + 1 : 0,
            daysRemaining: todayIndex >= 0 ? 6 - todayIndex : 7,
            isCurrentWeek: this.isCurrentWeek(),
            weekOffset: this.getWeekOffset()
        };
    }

    /**
     * Export navigation settings
     * @returns {Object} Navigation settings for export
     */
    exportSettings() {
        return {
            currentWeek: this.currentWeek.toISOString(),
            weekStartDay: 1 // Monday
        };
    }

    /**
     * Import navigation settings
     * @param {Object} settings - Settings to import
     * @returns {Promise<boolean>} Success status
     */
    async importSettings(settings) {
        try {
            if (settings.currentWeek) {
                const weekStart = new Date(settings.currentWeek);
                if (!isNaN(weekStart.getTime())) {
                    await this.navigateToWeek(weekStart);
                }
            }
            return true;
        } catch (error) {
            console.error('Error importing navigation settings:', error);
            return false;
        }
    }
}

// Create singleton instance
const navigationController = new NavigationController();

export default navigationController;