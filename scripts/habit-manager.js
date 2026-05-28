// Habit Manager - CRUD operations for habits

import { generateUUID, validateHabitName, formatDate, showToast } from './utils.js';
import dataStore, { STORAGE_KEYS } from './data-store.js';

class HabitManager {
    constructor() {
        this.habits = [];
        this.listeners = new Set();
        this.initialized = false;
    }

    // Load habits
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadHabits();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing HabitManager:', error);
            this.habits = [];
            this.initialized = true;
        }
    }

    // Load from storage
    async loadHabits() {
        try {
            const storedHabits = await dataStore.load(STORAGE_KEYS.HABITS, []);
            
            // Convert date strings back to Date objects and validate
            this.habits = storedHabits.map(habit => ({
                ...habit,
                createdAt: new Date(habit.createdAt),
                completions: habit.completions || {}
            })).filter(habit => this.isValidHabit(habit));
            
            this.notifyListeners('habits-loaded', this.habits);
        } catch (error) {
            console.error('Error loading habits:', error);
            
            // Try to restore from backup
            const backup = await dataStore.restoreFromBackup();
            if (backup) {
                console.log('Restoring habits from backup');
                this.habits = backup.map(habit => ({
                    ...habit,
                    createdAt: new Date(habit.createdAt),
                    completions: habit.completions || {}
                }));
                await this.saveHabits();
            } else {
                this.habits = [];
            }
        }
    }

    // Save to storage
    async saveHabits() {
        try {
            const success = await dataStore.save(STORAGE_KEYS.HABITS, this.habits);
            if (!success) {
                showToast('Unable to save progress', 'error');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error saving habits:', error);
            showToast('Unable to save progress', 'error');
            return false;
        }
    }

    // Create habit
    async createHabit(name) {
        try {
            // Validate habit name
            const validation = validateHabitName(name);
            if (!validation.isValid) {
                showToast(validation.error, 'error');
                return null;
            }

            const trimmedName = name.trim();

            // Check for duplicate names
            if (this.habits.some(habit => habit.name.toLowerCase() === trimmedName.toLowerCase())) {
                showToast('Habit name already exists', 'error');
                return null;
            }

            // Create new habit
            const habit = {
                id: generateUUID(),
                name: trimmedName,
                createdAt: new Date(),
                completions: {}
            };

            // Add to habits array
            this.habits.push(habit);

            // Save to storage
            const saved = await this.saveHabits();
            if (!saved) {
                // Rollback on save failure
                this.habits.pop();
                return null;
            }

            // Notify listeners
            this.notifyListeners('habit-created', habit);
            showToast(`Habit "${trimmedName}" created successfully`);

            return habit;
        } catch (error) {
            console.error('Error creating habit:', error);
            showToast('Failed to create habit', 'error');
            return null;
        }
    }

    // Update habit
    async updateHabit(habitId, newName) {
        try {
            // Validate new name
            const validation = validateHabitName(newName);
            if (!validation.isValid) {
                showToast(validation.error, 'error');
                return false;
            }

            const trimmedName = newName.trim();

            // Find habit
            const habitIndex = this.habits.findIndex(h => h.id === habitId);
            if (habitIndex === -1) {
                showToast('Habit not found', 'error');
                return false;
            }

            const habit = this.habits[habitIndex];
            const oldName = habit.name;

            // Check for duplicate names (excluding current habit)
            if (this.habits.some(h => h.id !== habitId && h.name.toLowerCase() === trimmedName.toLowerCase())) {
                showToast('Habit name already exists', 'error');
                return false;
            }

            // Update habit name (preserve all historical data)
            habit.name = trimmedName;

            // Save to storage
            const saved = await this.saveHabits();
            if (!saved) {
                // Rollback on save failure
                habit.name = oldName;
                return false;
            }

            // Notify listeners
            this.notifyListeners('habit-updated', habit);
            showToast(`Habit renamed to "${trimmedName}"`);

            return true;
        } catch (error) {
            console.error('Error updating habit:', error);
            showToast('Failed to update habit', 'error');
            return false;
        }
    }

    // Delete habit
    async deleteHabit(habitId) {
        try {
            // Find habit
            const habitIndex = this.habits.findIndex(h => h.id === habitId);
            if (habitIndex === -1) {
                showToast('Habit not found', 'error');
                return false;
            }

            const habit = this.habits[habitIndex];
            const habitName = habit.name;

            // Show confirmation dialog
            const confirmed = await this.showDeleteConfirmation(habitName);
            if (!confirmed) {
                return false;
            }

            // Remove habit from array
            const removedHabit = this.habits.splice(habitIndex, 1)[0];

            // Save to storage
            const saved = await this.saveHabits();
            if (!saved) {
                // Rollback on save failure
                this.habits.splice(habitIndex, 0, removedHabit);
                return false;
            }

            // Notify listeners
            this.notifyListeners('habit-deleted', removedHabit);
            showToast(`Habit "${habitName}" deleted`);

            return true;
        } catch (error) {
            console.error('Error deleting habit:', error);
            showToast('Failed to delete habit', 'error');
            return false;
        }
    }

    // Get all habits
    getHabits() {
        return [...this.habits];
    }

    // Get habit by ID
    getHabit(habitId) {
        return this.habits.find(h => h.id === habitId) || null;
    }

    // Toggle completion
    async toggleCompletion(habitId, date) {
        try {
            const habit = this.getHabit(habitId);
            if (!habit) {
                showToast('Habit not found', 'error');
                return false;
            }

            const dateString = formatDate(date);
            const currentStatus = habit.completions[dateString] || false;
            const newStatus = !currentStatus;

            // Update completion status
            habit.completions[dateString] = newStatus;

            // Save to storage with performance timing
            const startTime = performance.now();
            const saved = await this.saveHabits();
            const endTime = performance.now();

            if (!saved) {
                // Rollback on save failure
                if (currentStatus) {
                    habit.completions[dateString] = currentStatus;
                } else {
                    delete habit.completions[dateString];
                }
                return currentStatus;
            }

            // Check performance requirement (500ms)
            if (endTime - startTime > 500) {
                console.warn(`Storage operation took ${endTime - startTime}ms (exceeds 500ms requirement)`);
            }

            // Notify listeners
            this.notifyListeners('completion-toggled', {
                habit,
                date: dateString,
                completed: newStatus
            });

            return newStatus;
        } catch (error) {
            console.error('Error toggling completion:', error);
            showToast('Unable to save progress', 'error');
            return false;
        }
    }

    // Get completion status
    getCompletion(habitId, date) {
        const habit = this.getHabit(habitId);
        if (!habit) return false;

        const dateString = formatDate(date);
        return habit.completions[dateString] || false;
    }

    // Get completions in date range
    getCompletionRange(habitId, startDate, endDate) {
        const habit = this.getHabit(habitId);
        if (!habit) return {};

        const completions = {};
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateString = formatDate(current);
            completions[dateString] = habit.completions[dateString] || false;
            current.setDate(current.getDate() + 1);
        }

        return completions;
    }

    // Add listener
    addListener(listener) {
        this.listeners.add(listener);
    }

    // Remove listener
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    // Notify listeners
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in habit manager listener:', error);
            }
        });
    }

    // Show delete confirmation
    async showDeleteConfirmation(habitName) {
        return new Promise((resolve) => {
            const confirmed = confirm(
                `Are you sure you want to delete "${habitName}"?\n\n` +
                'This will permanently remove the habit and all its completion history.'
            );
            resolve(confirmed);
        });
    }

    // Validate habit
    isValidHabit(habit) {
        if (!habit || typeof habit !== 'object') return false;
        if (!habit.id || typeof habit.id !== 'string') return false;
        if (!habit.name || typeof habit.name !== 'string') return false;
        if (!habit.createdAt || !(habit.createdAt instanceof Date)) return false;
        if (habit.completions && typeof habit.completions !== 'object') return false;
        
        // Validate name length
        if (habit.name.trim().length === 0 || habit.name.length > 100) return false;
        
        return true;
    }

    // Export habits
    exportHabits() {
        return this.habits.map(habit => ({
            ...habit,
            createdAt: habit.createdAt.toISOString()
        }));
    }

    // Import habits
    async importHabits(habitsData) {
        try {
            if (!Array.isArray(habitsData)) {
                throw new Error('Invalid habits data format');
            }

            // Validate and convert imported habits
            const validHabits = habitsData
                .map(habit => ({
                    ...habit,
                    createdAt: new Date(habit.createdAt),
                    completions: habit.completions || {}
                }))
                .filter(habit => this.isValidHabit(habit));

            if (validHabits.length === 0) {
                showToast('No valid habits found in import data', 'error');
                return false;
            }

            // Replace current habits
            this.habits = validHabits;

            // Save to storage
            const saved = await this.saveHabits();
            if (!saved) {
                showToast('Failed to save imported habits', 'error');
                return false;
            }

            // Notify listeners
            this.notifyListeners('habits-imported', this.habits);
            showToast(`Imported ${validHabits.length} habits successfully`);

            return true;
        } catch (error) {
            console.error('Error importing habits:', error);
            showToast('Failed to import habits', 'error');
            return false;
        }
    }

    // Clear all habits
    async clearAllHabits() {
        try {
            const confirmed = confirm(
                'Are you sure you want to delete ALL habits?\n\n' +
                'This will permanently remove all habits and their completion history.'
            );

            if (!confirmed) return false;

            this.habits = [];
            const saved = await this.saveHabits();

            if (saved) {
                this.notifyListeners('habits-cleared', []);
                showToast('All habits cleared');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error clearing habits:', error);
            showToast('Failed to clear habits', 'error');
            return false;
        }
    }

    /**
     * Get habits statistics
     * @returns {Object} Statistics about habits
     */
    getStatistics() {
        const totalHabits = this.habits.length;
        let totalCompletions = 0;
        let oldestHabit = null;
        let newestHabit = null;

        this.habits.forEach(habit => {
            totalCompletions += Object.keys(habit.completions).length;
            
            if (!oldestHabit || habit.createdAt < oldestHabit.createdAt) {
                oldestHabit = habit;
            }
            
            if (!newestHabit || habit.createdAt > newestHabit.createdAt) {
                newestHabit = habit;
            }
        });

        return {
            totalHabits,
            totalCompletions,
            oldestHabit,
            newestHabit,
            averageCompletionsPerHabit: totalHabits > 0 ? totalCompletions / totalHabits : 0
        };
    }
}

// Create singleton instance
const habitManager = new HabitManager();

export default habitManager;