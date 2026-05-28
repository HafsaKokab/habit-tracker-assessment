// Main Application Controller

import { showToast, validateHabitName, debounce } from './utils.js';
import habitManager from './habit-manager.js';
import navigationController from './navigation.js';
import gridRenderer from './grid-renderer.js';

class AppController {
    constructor() {
        this.initialized = false;
        this.elements = {};
        this.debouncedAddHabit = debounce(this.addHabit.bind(this), 300);
    }

    // Start app
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Initializing Habit Tracker...');
            
            // Get DOM elements
            this.getElements();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Initial render
            await this.render();
            
            this.initialized = true;
            console.log('Habit Tracker initialized successfully');
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.handleError(error, 'Failed to initialize application');
        }
    }

    // Get elements
    getElements() {
        this.elements = {
            // Main containers
            emptyState: document.getElementById('empty-state'),
            habitManagement: document.getElementById('habit-management'),
            
            // Navigation
            prevWeekBtn: document.getElementById('prev-week'),
            nextWeekBtn: document.getElementById('next-week'),
            currentWeekBtn: document.getElementById('current-week'),
            weekDisplay: document.getElementById('week-display'),
            
            // Habit input
            habitInput: document.getElementById('habit-input'),
            addHabitBtn: document.getElementById('add-habit'),
            addFirstHabitBtn: document.getElementById('add-first-habit'),
            habitInputError: document.getElementById('habit-input-error'),
            
            // Grid
            weeklyGrid: document.getElementById('weekly-grid'),
            habitsGrid: document.getElementById('habits-grid'),
            
            // Toasts
            errorToast: document.getElementById('error-toast'),
            successToast: document.getElementById('success-toast'),
            dismissError: document.getElementById('dismiss-error')
        };

        // Validate required elements
        const requiredElements = [
            'emptyState', 'habitManagement', 'prevWeekBtn', 'nextWeekBtn', 
            'currentWeekBtn', 'weekDisplay', 'habitInput', 'addHabitBtn'
        ];

        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                throw new Error(`Required element not found: ${elementName}`);
            }
        }
    }

    // Load components
    async initializeComponents() {
        // Initialize in dependency order
        await habitManager.initialize();
        await navigationController.initialize();
        await gridRenderer.initialize();
    }

    // Add event listeners
    setupEventListeners() {
        // Navigation buttons
        this.elements.prevWeekBtn.addEventListener('click', () => {
            navigationController.goToPreviousWeek();
        });

        this.elements.nextWeekBtn.addEventListener('click', () => {
            navigationController.goToNextWeek();
        });

        this.elements.currentWeekBtn.addEventListener('click', () => {
            navigationController.goToCurrentWeek();
        });

        // Habit input
        this.elements.habitInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.debouncedAddHabit();
            }
        });

        this.elements.habitInput.addEventListener('input', () => {
            this.clearInputError();
        });

        this.elements.addHabitBtn.addEventListener('click', () => {
            this.debouncedAddHabit();
        });

        this.elements.addFirstHabitBtn.addEventListener('click', () => {
            this.showHabitManagement();
            this.elements.habitInput.focus();
        });

        // Error toast dismiss
        if (this.elements.dismissError) {
            this.elements.dismissError.addEventListener('click', () => {
                this.elements.errorToast.style.display = 'none';
            });
        }

        // Listen for component events
        habitManager.addListener(this.handleHabitManagerEvent.bind(this));
        navigationController.addListener(this.handleNavigationEvent.bind(this));

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleGlobalKeyboard.bind(this));

        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('storage', this.handleStorageChange.bind(this));
    }

    // Set up error handling
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'An unexpected error occurred');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'An unexpected error occurred');
        });

        // Storage error handler
        window.addEventListener('storage-error', (event) => {
            console.error('Storage error:', event.detail);
            this.handleStorageError(event.detail);
        });
    }

    // Display app
    async render() {
        try {
            const habits = habitManager.getHabits();
            
            // Update navigation display
            this.updateNavigationDisplay();
            
            // Show appropriate view
            if (habits.length === 0) {
                this.showEmptyState();
            } else {
                this.showHabitManagement();
                await gridRenderer.refreshGrid();
            }
            
        } catch (error) {
            console.error('Error rendering application:', error);
            this.handleError(error, 'Error displaying application');
        }
    }

    // Show empty state
    showEmptyState() {
        this.elements.emptyState.style.display = 'flex';
        this.elements.habitManagement.style.display = 'none';
    }

    // Show habit interface
    showHabitManagement() {
        this.elements.emptyState.style.display = 'none';
        this.elements.habitManagement.style.display = 'block';
    }

    // Update week display
    updateNavigationDisplay() {
        const navInfo = navigationController.getNavigationInfo();
        this.elements.weekDisplay.textContent = navInfo.formattedRange;
        
        // Update current week button state
        if (navInfo.isCurrentWeek) {
            this.elements.currentWeekBtn.classList.add('active');
            this.elements.currentWeekBtn.setAttribute('aria-pressed', 'true');
        } else {
            this.elements.currentWeekBtn.classList.remove('active');
            this.elements.currentWeekBtn.setAttribute('aria-pressed', 'false');
        }
    }

    // Add new habit
    async addHabit() {
        try {
            const habitName = this.elements.habitInput.value.trim();
            
            // Clear previous errors
            this.clearInputError();
            
            // Validate input
            const validation = validateHabitName(habitName);
            if (!validation.isValid) {
                this.showInputError(validation.error);
                return;
            }
            
            // Disable input during creation
            this.setInputLoading(true);
            
            // Create habit
            const habit = await habitManager.createHabit(habitName);
            
            if (habit) {
                // Clear input on success
                this.elements.habitInput.value = '';
                
                // Switch to habit management view if needed
                if (this.elements.emptyState.style.display !== 'none') {
                    this.showHabitManagement();
                }
            }
            
        } catch (error) {
            console.error('Error adding habit:', error);
            this.handleError(error, 'Failed to add habit');
        } finally {
            this.setInputLoading(false);
        }
    }

    // Show error
    showInputError(message) {
        if (this.elements.habitInputError) {
            this.elements.habitInputError.textContent = message;
            this.elements.habitInput.setAttribute('aria-invalid', 'true');
            this.elements.habitInput.setAttribute('aria-describedby', 'habit-input-error');
        }
    }

    // Clear error
    clearInputError() {
        if (this.elements.habitInputError) {
            this.elements.habitInputError.textContent = '';
            this.elements.habitInput.setAttribute('aria-invalid', 'false');
            this.elements.habitInput.removeAttribute('aria-describedby');
        }
    }

    // Set input loading
    setInputLoading(loading) {
        this.elements.habitInput.disabled = loading;
        this.elements.addHabitBtn.disabled = loading;
        
        if (loading) {
            this.elements.addHabitBtn.textContent = 'Adding...';
            this.elements.addHabitBtn.classList.add('loading');
        } else {
            this.elements.addHabitBtn.textContent = 'Add Habit';
            this.elements.addHabitBtn.classList.remove('loading');
        }
    }

    // Handle habit events
    async handleHabitManagerEvent(event, data) {
        switch (event) {
            case 'habits-loaded':
            case 'habit-created':
            case 'habit-updated':
            case 'habit-deleted':
                await this.render();
                break;
                
            case 'completion-toggled':
                // Grid renderer handles this
                break;
        }
    }

    // Handle navigation events
    handleNavigationEvent(event, data) {
        switch (event) {
            case 'week-changed':
            case 'navigation-loaded':
                this.updateNavigationDisplay();
                break;
        }
    }

    // Handle keyboard shortcuts
    handleGlobalKeyboard(event) {
        // Don't handle if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Global shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'n':
                    event.preventDefault();
                    this.elements.habitInput.focus();
                    break;
                    
                case 'h':
                    event.preventDefault();
                    navigationController.goToCurrentWeek();
                    break;
            }
        }
        
        // Single key shortcuts
        switch (event.key) {
            case '/':
                event.preventDefault();
                this.elements.habitInput.focus();
                break;
        }
    }

    // Handle before unload
    handleBeforeUnload(event) {
        // Could add unsaved changes warning here if needed
        // For now, just ensure data is saved
        try {
            // Force save any pending changes
            // This is handled automatically by the components
        } catch (error) {
            console.error('Error during beforeunload:', error);
        }
    }

    // Handle storage changes
    handleStorageChange(event) {
        if (event.key && event.key.startsWith('habit-tracker-')) {
            console.log('Storage changed in another tab, refreshing data');
            // Reload data from storage
            this.refreshFromStorage();
        }
    }

    // Refresh from storage
    async refreshFromStorage() {
        try {
            await habitManager.loadHabits();
            await navigationController.loadNavigationState();
            await this.render();
            showToast('Data refreshed from another tab');
        } catch (error) {
            console.error('Error refreshing from storage:', error);
            this.handleError(error, 'Error refreshing data');
        }
    }

    // Handle errors
    handleError(error, userMessage = 'An error occurred') {
        console.error('Application error:', error);
        
        // Show user-friendly error message
        showToast(userMessage, 'error', 5000);
        
        // Could send error to analytics service here
        this.logError(error, userMessage);
    }

    // Handle storage errors
    handleStorageError(errorDetail) {
        const { error, operation, key } = errorDetail;
        
        let message = 'Storage error occurred';
        
        if (error.name === 'QuotaExceededError') {
            message = 'Storage is full. Some data may not be saved.';
        } else if (error.name === 'SecurityError') {
            message = 'Storage access denied. Data will not persist.';
        } else if (operation === 'save') {
            message = 'Unable to save progress';
        } else if (operation === 'load') {
            message = 'Unable to load saved data';
        }
        
        showToast(message, 'error', 5000);
    }

    // Log errors
    logError(error, context) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Store error log locally for debugging
        try {
            const errorLogs = JSON.parse(localStorage.getItem('habit-tracker-error-logs') || '[]');
            errorLogs.push(errorData);
            
            // Keep only last 10 errors
            if (errorLogs.length > 10) {
                errorLogs.splice(0, errorLogs.length - 10);
            }
            
            localStorage.setItem('habit-tracker-error-logs', JSON.stringify(errorLogs));
        } catch (logError) {
            console.warn('Failed to log error:', logError);
        }
    }

    /**
     * Export application data
     * @returns {Promise<Object>} Exported data
     */
    async exportData() {
        try {
            const habits = habitManager.exportHabits();
            const navigation = navigationController.exportSettings();
            
            return {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                habits,
                navigation
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import application data
     * @param {Object} data - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid import data');
            }
            
            let success = true;
            
            // Import habits
            if (data.habits) {
                const habitsImported = await habitManager.importHabits(data.habits);
                success = success && habitsImported;
            }
            
            // Import navigation settings
            if (data.navigation) {
                const navImported = await navigationController.importSettings(data.navigation);
                success = success && navImported;
            }
            
            if (success) {
                await this.render();
                showToast('Data imported successfully');
            }
            
            return success;
        } catch (error) {
            console.error('Error importing data:', error);
            this.handleError(error, 'Failed to import data');
            return false;
        }
    }

    /**
     * Get application statistics
     * @returns {Object} Application statistics
     */
    getStatistics() {
        const habitStats = habitManager.getStatistics();
        const gridStats = gridRenderer.getGridStatistics();
        const navInfo = navigationController.getNavigationInfo();
        
        return {
            habits: habitStats,
            grid: gridStats,
            navigation: navInfo,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset application
     * @returns {Promise<boolean>} Success status
     */
    async resetApplication() {
        try {
            const confirmed = confirm(
                'Are you sure you want to reset the application?\n\n' +
                'This will delete ALL habits and data permanently.'
            );
            
            if (!confirmed) return false;
            
            // Clear all data
            await habitManager.clearAllHabits();
            await navigationController.goToCurrentWeek();
            
            // Re-render
            await this.render();
            
            showToast('Application reset successfully');
            return true;
            
        } catch (error) {
            console.error('Error resetting application:', error);
            this.handleError(error, 'Failed to reset application');
            return false;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new AppController();
        await app.initialize();
        
        // Make app available globally for debugging
        window.habitTracker = app;
        
    } catch (error) {
        console.error('Failed to start application:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; text-align: center; font-family: system-ui, sans-serif;">
                <div>
                    <h1 style="color: #dc2626; margin-bottom: 1rem;">Failed to Load Habit Tracker</h1>
                    <p style="color: #6b7280; margin-bottom: 2rem;">There was an error loading the application. Please refresh the page to try again.</p>
                    <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
});
