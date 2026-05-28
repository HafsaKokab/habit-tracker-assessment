// Streak Calculator - Calculate consecutive day streaks

import { formatDate, getToday, parseDate } from './utils.js';

class StreakCalculator {
    // Calculate streak
    calculateStreak(completions, endDate = null) {
        if (!completions || typeof completions !== 'object') {
            return 0;
        }

        const referenceDate = endDate || getToday();
        let streak = 0;
        let currentDate = new Date(referenceDate);

        // Count backwards from reference date
        while (true) {
            const dateString = formatDate(currentDate);
            const isCompleted = completions[dateString] === true;

            if (isCompleted) {
                streak++;
                // Move to previous day
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Streak is broken
                break;
            }
        }

        return streak;
    }

    // Calculate streak ending on date
    calculateStreakEndingOn(completions, endDate) {
        if (!completions || typeof completions !== 'object') {
            return 0;
        }

        const endDateString = formatDate(endDate);
        
        // If the end date is not completed, streak is 0
        if (!completions[endDateString]) {
            return 0;
        }

        let streak = 0;
        let currentDate = new Date(endDate);

        // Count backwards from end date
        while (true) {
            const dateString = formatDate(currentDate);
            const isCompleted = completions[dateString] === true;

            if (isCompleted) {
                streak++;
                // Move to previous day
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Streak is broken
                break;
            }
        }

        return streak;
    }

    // Get consecutive days
    getConsecutiveDays(completions, startDate) {
        if (!completions || typeof completions !== 'object') {
            return 0;
        }

        let consecutiveDays = 0;
        let currentDate = new Date(startDate);

        while (true) {
            const dateString = formatDate(currentDate);
            const isCompleted = completions[dateString] === true;

            if (isCompleted) {
                consecutiveDays++;
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            } else {
                // Streak is broken
                break;
            }
        }

        return consecutiveDays;
    }

    // Check if streak broken
    isStreakBroken(completions, date) {
        if (!completions || typeof completions !== 'object') {
            return true;
        }

        const dateString = formatDate(date);
        return completions[dateString] !== true;
    }

    // Get longest streak
    getLongestStreak(completions) {
        if (!completions || typeof completions !== 'object') {
            return { length: 0, startDate: null, endDate: null };
        }

        const completedDates = Object.keys(completions)
            .filter(date => completions[date] === true)
            .sort();

        if (completedDates.length === 0) {
            return { length: 0, startDate: null, endDate: null };
        }

        let longestStreak = 0;
        let longestStartDate = null;
        let longestEndDate = null;
        
        let currentStreak = 1;
        let currentStartDate = completedDates[0];
        let currentEndDate = completedDates[0];

        for (let i = 1; i < completedDates.length; i++) {
            const prevDate = parseDate(completedDates[i - 1]);
            const currentDate = parseDate(completedDates[i]);
            
            // Check if dates are consecutive
            const dayDifference = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (dayDifference === 1) {
                // Consecutive day, extend current streak
                currentStreak++;
                currentEndDate = completedDates[i];
            } else {
                // Gap in streak, check if current streak is longest
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                    longestStartDate = currentStartDate;
                    longestEndDate = currentEndDate;
                }
                
                // Start new streak
                currentStreak = 1;
                currentStartDate = completedDates[i];
                currentEndDate = completedDates[i];
            }
        }

        // Check final streak
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            longestStartDate = currentStartDate;
            longestEndDate = currentEndDate;
        }

        return {
            length: longestStreak,
            startDate: longestStartDate ? parseDate(longestStartDate) : null,
            endDate: longestEndDate ? parseDate(longestEndDate) : null
        };
    }

    // Get streak stats
    getStreakStatistics(completions, referenceDate = null) {
        const refDate = referenceDate || getToday();
        const currentStreak = this.calculateStreak(completions, refDate);
        const longestStreak = this.getLongestStreak(completions);
        
        // Calculate completion rate for last 30 days
        const thirtyDaysAgo = new Date(refDate);
        thirtyDaysAgo.setDate(refDate.getDate() - 29);
        
        let completedDays = 0;
        let totalDays = 0;
        
        for (let d = new Date(thirtyDaysAgo); d <= refDate; d.setDate(d.getDate() + 1)) {
            totalDays++;
            const dateString = formatDate(d);
            if (completions[dateString] === true) {
                completedDays++;
            }
        }
        
        const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

        return {
            currentStreak,
            longestStreak: longestStreak.length,
            longestStreakPeriod: longestStreak,
            completionRate: Math.round(completionRate),
            totalCompletedDays: Object.values(completions).filter(Boolean).length,
            isOnStreak: currentStreak > 0,
            streakBrokenToday: this.isStreakBroken(completions, refDate)
        };
    }

    /**
     * Predict streak continuation
     * @param {Object} completions - Completion data
     * @param {number} days - Number of days to predict
     * @returns {Object} Prediction data
     */
    predictStreak(completions, days = 7) {
        const today = getToday();
        const currentStreak = this.calculateStreak(completions, today);
        
        // Simple prediction based on recent completion rate
        const recentDays = 14;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - recentDays + 1);
        
        let recentCompletions = 0;
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateString = formatDate(d);
            if (completions[dateString] === true) {
                recentCompletions++;
            }
        }
        
        const recentCompletionRate = recentCompletions / recentDays;
        const predictedCompletions = Math.round(days * recentCompletionRate);
        
        return {
            currentStreak,
            predictedDays: days,
            predictedCompletions,
            predictedCompletionRate: recentCompletionRate,
            likelyStreakContinuation: recentCompletionRate > 0.7
        };
    }

    /**
     * Get streak milestones
     * @param {number} currentStreak - Current streak length
     * @returns {Object} Milestone information
     */
    getStreakMilestones(currentStreak) {
        const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
        
        let nextMilestone = null;
        let lastMilestone = null;
        
        for (const milestone of milestones) {
            if (currentStreak >= milestone) {
                lastMilestone = milestone;
            } else if (nextMilestone === null) {
                nextMilestone = milestone;
                break;
            }
        }
        
        return {
            currentStreak,
            lastMilestone,
            nextMilestone,
            daysToNextMilestone: nextMilestone ? nextMilestone - currentStreak : null,
            isAtMilestone: milestones.includes(currentStreak)
        };
    }

    /**
     * Calculate streak for multiple habits
     * @param {Array} habits - Array of habit objects
     * @param {Date} referenceDate - Reference date (defaults to today)
     * @returns {Object} Streaks keyed by habit ID
     */
    calculateMultipleStreaks(habits, referenceDate = null) {
        const refDate = referenceDate || getToday();
        const streaks = {};
        
        habits.forEach(habit => {
            streaks[habit.id] = this.calculateStreak(habit.completions, refDate);
        });
        
        return streaks;
    }

    /**
     * Get habit with longest current streak
     * @param {Array} habits - Array of habit objects
     * @param {Date} referenceDate - Reference date (defaults to today)
     * @returns {Object|null} Habit with longest streak or null
     */
    getHabitWithLongestStreak(habits, referenceDate = null) {
        if (!habits || habits.length === 0) return null;
        
        const refDate = referenceDate || getToday();
        let longestStreakHabit = null;
        let longestStreak = 0;
        
        habits.forEach(habit => {
            const streak = this.calculateStreak(habit.completions, refDate);
            if (streak > longestStreak) {
                longestStreak = streak;
                longestStreakHabit = habit;
            }
        });
        
        return longestStreakHabit ? {
            habit: longestStreakHabit,
            streak: longestStreak
        } : null;
    }

    /**
     * Check if streak just reached a milestone
     * @param {number} previousStreak - Previous streak count
     * @param {number} currentStreak - Current streak count
     * @returns {number|null} Milestone achieved or null
     */
    checkMilestoneAchieved(previousStreak, currentStreak) {
        const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
        
        for (const milestone of milestones) {
            if (previousStreak < milestone && currentStreak >= milestone) {
                return milestone;
            }
        }
        
        return null;
    }

    /**
     * Get milestone message
     * @param {number} milestone - Milestone number
     * @returns {string} Celebration message
     */
    getMilestoneMessage(milestone) {
        const messages = {
            7: '🔥 One Week Warrior! Keep the momentum!',
            14: '💪 Two Weeks Strong! You\'re unstoppable!',
            21: '⭐ Three Weeks! This is a habit now!',
            30: '🎉 One Month! You\'re on fire!',
            50: '✨ 50 Days! Absolutely incredible!',
            75: '👑 75 Days! You\'re a legend!',
            100: '🏆 100 Days! Century achieved!',
            150: '🌟 150 Days! You\'re a master!',
            200: '💎 200 Days! Legendary status!',
            365: '🎊 One Year! Outstanding achievement!'
        };
        
        return messages[milestone] || `🎉 Day ${milestone}! Great work!`;
    }

    /**
     * Get milestone emoji
     * @param {number} milestone - Milestone number
     * @returns {string} Emoji representation
     */
    getMilestoneEmoji(milestone) {
        const emojis = {
            7: '🔥',
            14: '💪',
            21: '⭐',
            30: '🎉',
            50: '✨',
            75: '👑',
            100: '🏆',
            150: '🌟',
            200: '💎',
            365: '🎊'
        };
        
        return emojis[milestone] || '⭐';
    }

    /**
     * Validate completion data
     * @param {Object} completions - Completion data to validate
     * @returns {boolean} True if valid
     */
    validateCompletions(completions) {
        if (!completions || typeof completions !== 'object') {
            return false;
        }
        
        for (const [date, completed] of Object.entries(completions)) {
            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return false;
            }
            
            // Validate completion value
            if (typeof completed !== 'boolean') {
                return false;
            }
        }
        
        return true;
    }
}

// Create singleton instance
const streakCalculator = new StreakCalculator();

export default streakCalculator;