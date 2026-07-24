export class TaskStorageService {
    static STORAGE_KEY = 'local_tasks';

    /**
     * 获取所有任务
     * @returns {Array} 任务数组
     */
    static getTasks() {
        try {
            const tasks = localStorage.getItem(this.STORAGE_KEY);
            return tasks ? JSON.parse(tasks) : [];
        } catch (error) {
            console.error('Error getting tasks from localStorage:', error);
            return [];
        }
    }

    /**
     * 添加新任务
     * @param {Object} task 任务对象
     * @returns {Object} 添加后的任务对象（包含id）
     */
    static addTask(task) {
        try {
            const tasks = this.getTasks();
            const newTask = {
                ...task,
                id: this.generateTaskId(),
                create_time: Date.now(),
                task_info: {
                    run_type: task.original.run_type,
                    last_run_time: 0,
                    next_run_time: 0,
                    is_running: false,
                    task_status: "Prepare"
                }
            };
            tasks.push(newTask);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
            return newTask;
        } catch (error) {
            console.error('Error adding task to localStorage:', error);
            throw new Error('Failed to add task');
        }
    }

    /**
     * 更新任务
     * @param {string} taskId 任务ID
     * @param {Object} updatedTask 更新后的任务对象
     * @returns {Object} 更新后的任务对象
     */
    static updateTask(taskId, updatedTask) {
        try {
            const tasks = this.getTasks();
            const index = tasks.findIndex(task => task.id === taskId);
            if (index === -1) {
                throw new Error('Task not found');
            }

            const updatedTaskWithId = {
                ...updatedTask,
                id: taskId,
                task_info: {
                    ...tasks[index].task_info,
                    ...updatedTask.task_info
                }
            };

            tasks[index] = updatedTaskWithId;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
            return updatedTaskWithId;
        } catch (error) {
            console.error('Error updating task in localStorage:', error);
            throw new Error('Failed to update task');
        }
    }

    /**
     * 删除任务
     * @param {string} taskId 任务ID
     * @returns {boolean} 是否删除成功
     */
    static deleteTask(taskId) {
        try {
            const tasks = this.getTasks();
            const filteredTasks = tasks.filter(task => task.id !== taskId);
            if (filteredTasks.length === tasks.length) {
                throw new Error('Task not found');
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTasks));
            return true;
        } catch (error) {
            console.error('Error deleting task from localStorage:', error);
            throw new Error('Failed to delete task');
        }
    }

    /**
     * 生成唯一的任务ID
     * @returns {string} 任务ID
     */
    static generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 清空所有任务
     */
    static clearAllTasks() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing tasks from localStorage:', error);
            throw new Error('Failed to clear tasks');
        }
    }
} 