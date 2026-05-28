// Data Store - localStorage abstraction with validation and error handling

import { getStorageItem, setStorageItem, removeStorageItem, isLocalStorageAvailable, deepClone } from './utils.js';

const STORAGE_KEYS = {
    HABITS: 'habit-tracker-habits',
    SETTINGS: 'habit-tracker-settings',
    BACKUP: 'habit-tracker-backup',
    VERSION: 'habit-tracker-version'
};

const CURRENT_VERSION = '1.0.0';

class DataStore {
    constructor() {
        this.memoryStore = new Map();
        this.isStorageAvailable = isLocalStorageAvailable();
        this.initializeStore();
    }

    // Setup store
    initializeStore() {
        if (!this.isStorageAvailable) {
            console.warn('localStorage not available, using memory storage');
            return;
        }

        // Check version and migrate if needed
        const storedVersion = getStorageItem(STORAGE_KEYS.VERSION);
        if (!storedVersion || storedVersion !== CURRENT_VERSION) {
            this.migrateData(storedVersion, CURRENT_VERSION);
        }
    }

    // Save data
    async save(key, data) {
        try {
            // Validate data before saving
            if (!this.validateData(key, data)) {
                throw new Error(`Invalid data format for key: ${key}`);
            }

            // Create backup before saving
            await this.createBackup(key, data);

            // Clone data to prevent mutations
            const clonedData = deepClone(data);

            if (this.isStorageAvailable) {
                const success = setStorageItem(key, clonedData);
                if (!success) {
                    throw new Error('Failed to save to localStorage');
                }
            } else {
                // Fallback to memory storage
                this.memoryStore.set(key, clonedData);
            }

            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.handleStorageError(error, 'save', key, data);
            return false;
        }
    }

    // Load data
    async load(key, defaultValue = null) {
        try {
            let data;

            if (this.isStorageAvailable) {
                data = getStorageItem(key, defaultValue);
            } else {
                // Fallback to memory storage
                data = this.memoryStore.get(key) || defaultValue;
            }

            // Validate loaded data
            if (data !== null && data !== defaultValue && !this.validateData(key, data)) {
                console.warn(`Invalid data format for key: ${key}, using default`);
                return defaultValue;
            }

            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            this.handleStorageError(error, 'load', key);
            return defaultValue;
        }
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     * @returns {boolean} True if key exists
     */
    exists(key) {
        try {
            if (this.isStorageAvailable) {
                return localStorage.getItem(key) !== null;
            } else {
                return this.memoryStore.has(key);
            }
        } catch (error) {
            console.error('Error checking key existence:', error);
            return false;
        }
    }

    /**
     * Clear all data
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            if (this.isStorageAvailable) {
                Object.values(STORAGE_KEYS).forEach(key => {
                    removeStorageItem(key);
                });
            } else {
                this.memoryStore.clear();
            }
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Validate data structure
     * @param {string} key - Storage key
     * @param {*} data - Data to validate
     * @returns {boolean} True if valid
     */
    validateData(key, data) {
        try {
            switch (key) {
                case STORAGE_KEYS.HABITS:
                    return this.validateHabitsData(data);
                case STORAGE_KEYS.SETTINGS:
                    return this.validateSettingsData(data);
                default:
                    return true; // Allow other keys
            }
        } catch (error) {
            console.error('Error validating data:', error);
            return false;
        }
    }

    /**
     * Validate habits data structure
     * @param {*} data - Habits data
     * @returns {boolean} True if valid
     */
    validateHabitsData(data) {
        if (!Array.isArray(data)) return false;

        return data.every(habit => {
            // Check required properties
            if (!habit.id || !habit.name || !habit.createdAt) return false;
            
            // Check data types
            if (typeof habit.id !== 'string') return false;
            if (typeof habit.name !== 'string') return false;
            if (!(habit.createdAt instanceof Date) && typeof habit.createdAt !== 'string') return false;
            
            // Check name length
            if (habit.name.trim().length === 0 || habit.name.length > 100) return false;
            
            // Check completions object
            if (habit.completions && typeof habit.completions !== 'object') return false;
            
            // Validate completion entries
            if (habit.completions) {
                for (const [date, completed] of Object.entries(habit.completions)) {
                    // Check date format (YYYY-MM-DD)
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
                    // Check completion value
                    if (typeof completed !== 'boolean') return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Validate settings data structure
     * @param {*} data - Settings data
     * @returns {boolean} True if valid
     */
    validateSettingsData(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Optional properties with type checking
        if (data.currentWeek && typeof data.currentWeek !== 'string') return false;
        if (data.theme && !['light', 'dark'].includes(data.theme)) return false;
        if (data.compactMode && typeof data.compactMode !== 'boolean') return false;
        
        return true;
    }

    /**
     * Create backup of current data
     * @param {string} key - Storage key
     * @param {*} newData - New data being saved
     * @returns {Promise<void>}
     */
    async createBackup(key, newData) {
        try {
            if (key === STORAGE_KEYS.HABITS) {
                const currentData = await this.load(key);
                if (currentData) {
                    const backup = {
                        timestamp: new Date().toISOString(),
                        data: currentData
                    };
                    await this.save(STORAGE_KEYS.BACKUP, backup);
                }
            }
        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }

    /**
     * Restore from backup
     * @returns {Promise<*>} Backup data or null
     */
    async restoreFromBackup() {
        try {
            const backup = await this.load(STORAGE_KEYS.BACKUP);
            if (backup && backup.data) {
                return backup.data;
            }
            return null;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            return null;
        }
    }

    /**
     * Handle storage errors
     * @param {Error} error - Error object
     * @param {string} operation - Operation that failed
     * @param {string} key - Storage key
     * @param {*} data - Data involved in operation
     */
    handleStorageError(error, operation, key, data = null) {
        console.error(`Storage error during ${operation}:`, error);
        
        // Try to recover based on error type
        if (error.name === 'QuotaExceededError') {
            this.handleQuotaExceeded();
        } else if (error.name === 'SecurityError') {
            this.handleSecurityError();
        } else if (error.message.includes('JSON')) {
            this.handleJSONError(key);
        }
        
        // Emit custom event for error handling
        window.dispatchEvent(new CustomEvent('storage-error', {
            detail: { error, operation, key, data }
        }));
    }

    /**
     * Handle quota exceeded error
     */
    handleQuotaExceeded() {
        console.warn('Storage quota exceeded, attempting cleanup');
        
        // Try to free up space by removing old backups
        try {
            removeStorageItem(STORAGE_KEYS.BACKUP);
        } catch (error) {
            console.error('Failed to cleanup storage:', error);
        }
    }

    /**
     * Handle security error
     */
    handleSecurityError() {
        console.warn('Storage security error, switching to memory storage');
        this.isStorageAvailable = false;
    }

    /**
     * Handle JSON parsing error
     * @param {string} key - Storage key with corrupted data
     */
    handleJSONError(key) {
        console.warn(`Corrupted data for key: ${key}, removing`);
        try {
            removeStorageItem(key);
        } catch (error) {
            console.error('Failed to remove corrupted data:', error);
        }
    }

    /**
     * Migrate data between versions
     * @param {string} oldVersion - Old version
     * @param {string} newVersion - New version
     */
    migrateData(oldVersion, newVersion) {
        console.log(`Migrating data from ${oldVersion || 'unknown'} to ${newVersion}`);
        
        try {
            // Set new version
            setStorageItem(STORAGE_KEYS.VERSION, newVersion);
            
            // Perform version-specific migrations
            if (!oldVersion) {
                // First time setup
                this.initializeDefaultSettings();
            }
            
            // Add future migration logic here
            
        } catch (error) {
            console.error('Error during data migration:', error);
        }
    }

    /**
     * Initialize default settings
     */
    initializeDefaultSettings() {
        const defaultSettings = {
            theme: 'light',
            compactMode: false,
            weekStartDay: 1 // Monday
        };
        
        setStorageItem(STORAGE_KEYS.SETTINGS, defaultSettings);
    }

    /**
     * Export all data for backup
     * @returns {Promise<Object>} Exported data
     */
    async exportData() {
        try {
            const habits = await this.load(STORAGE_KEYS.HABITS, []);
            const settings = await this.load(STORAGE_KEYS.SETTINGS, {});
            
            return {
                version: CURRENT_VERSION,
                exportDate: new Date().toISOString(),
                habits,
                settings
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import data from backup
     * @param {Object} importData - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(importData) {
        try {
            // Validate import data
            if (!importData || typeof importData !== 'object') {
                throw new Error('Invalid import data format');
            }
            
            // Create backup before import
            await this.createBackup(STORAGE_KEYS.HABITS, await this.load(STORAGE_KEYS.HABITS, []));
            
            // Import habits
            if (importData.habits && Array.isArray(importData.habits)) {
                await this.save(STORAGE_KEYS.HABITS, importData.habits);
            }
            
            // Import settings
            if (importData.settings && typeof importData.settings === 'object') {
                await this.save(STORAGE_KEYS.SETTINGS, importData.settings);
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        if (!this.isStorageAvailable) {
            return {
                available: false,
                used: this.memoryStore.size,
                total: Infinity,
                percentage: 0
            };
        }
        
        try {
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length;
                }
            }
            
            // Estimate total storage (usually 5-10MB)
            const total = 5 * 1024 * 1024; // 5MB estimate
            const percentage = (used / total) * 100;
            
            return {
                available: true,
                used,
                total,
                percentage: Math.min(percentage, 100)
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                available: false,
                used: 0,
                total: 0,
                percentage: 0
            };
        }
    }
}

// Create singleton instance
const dataStore = new DataStore();

export default dataStore;
export { STORAGE_KEYS };