// Utility functions and helpers

// Generate UUID
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Format date to string
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Parse date string
export function parseDate(dateString) {
    return new Date(dateString + 'T00:00:00.000Z');
}

// Get week start (Monday)
export function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get all week dates
export function getWeekDates(weekStart) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Check if same day
export function isSameDay(date1, date2) {
    return formatDate(date1) === formatDate(date2);
}

// Get today
export function getToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// Format week range
export function formatWeekRange(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekEnd.getDate();
    const year = weekStart.getFullYear();
    
    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
}

// Debounce
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Validate habit name
export function validateHabitName(name) {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Habit name is required' };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
        return { isValid: false, error: 'Habit name cannot be empty' };
    }
    
    if (trimmedName.length > 100) {
        return { isValid: false, error: 'Habit name must be 100 characters or less' };
    }
    
    return { isValid: true, error: null };
}

// Escape HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast
export function showToast(message, type = 'success', duration = 3000) {
    const toastId = type === 'error' ? 'error-toast' : 'success-toast';
    const messageId = type === 'error' ? 'error-message' : 'success-message';
    
    const toast = document.getElementById(toastId);
    const messageElement = document.getElementById(messageId);
    
    if (!toast || !messageElement) return;
    
    messageElement.textContent = message;
    toast.style.display = 'flex';
    
    // Auto-hide after duration
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
    
    // Handle dismiss button for error toasts
    if (type === 'error') {
        const dismissButton = document.getElementById('dismiss-error');
        if (dismissButton) {
            dismissButton.onclick = () => {
                toast.style.display = 'none';
            };
        }
    }
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get safe localStorage item
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export function getStorageItem(key, defaultValue = null) {
    try {
        if (!isLocalStorageAvailable()) return defaultValue;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Error reading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Set safe localStorage item
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if successful
 */
export function setStorageItem(key, value) {
    try {
        if (!isLocalStorageAvailable()) return false;
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('Error writing to localStorage:', error);
        return false;
    }
}

/**
 * Remove localStorage item
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export function removeStorageItem(key) {
    try {
        if (!isLocalStorageAvailable()) return false;
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('Error removing from localStorage:', error);
        return false;
    }
}

/**
 * Performance timing utility
 * @param {string} label - Label for the timing
 * @returns {Function} Function to end timing
 */
export function startTiming(label) {
    const start = performance.now();
    return () => {
        const end = performance.now();
        const duration = end - start;
        console.log(`${label}: ${duration.toFixed(2)}ms`);
        return duration;
    };
}

/**
 * Create a promise that resolves after a delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
    return isSameDay(date, getToday());
}

/**
 * Get day name from date
 * @param {Date} date - Date to get day name for
 * @param {string} format - Format ('short' or 'long')
 * @returns {string} Day name
 */
export function getDayName(date, format = 'short') {
    const options = { weekday: format };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Calculate days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days between dates
 */
export function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}