import axios from 'axios';
import { FileStorageService } from './fileStorageService';
import { TaskStorageService } from './taskStorageService';

export class WebTaskService {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async getTaskList() {
        try {
            const tasks = TaskStorageService.getTasks();
            return { list: tasks };
        } catch (error) {
            console.error('Error getting task list:', error);
            return { list: [] };
        }
    }

    async addTask(taskData) {
        try {
            const newTask = TaskStorageService.addTask(taskData);
            return { code: "200", msg: "Success", data: newTask };
        } catch (error) {
            console.error('Error adding task:', error);
            return { code: "500", msg: error.message };
        }
    }

    async uploadFile(formData) {
        try {
            // 从 FormData 中获取文件对象
            const file = formData.get('file');
            if (!file) {
                throw new Error('No file found in FormData');
            }

            // 保存文件到 localStorage
            const storageKey = await FileStorageService.readAndSaveFile(file);
            
            return { code: "200", msg: "Success", "url": storageKey };
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }

    async updateTask(taskId, taskData) {
        try {
            const updatedTask = TaskStorageService.updateTask(taskId, taskData);
            return { code: "200", msg: "Success", data: updatedTask };
        } catch (error) {
            console.error('Error updating task:', error);
            return { code: "500", msg: error.message };
        }
    }

    async deleteTask(taskId) {
        try {
            TaskStorageService.deleteTask(taskId);
            return { code: "200", msg: "Success" };
        } catch (error) {
            console.error('Error deleting task:', error);
            return { code: "500", msg: error.message };
        }
    }

    async runTask(taskId) {
        // TODO: Implement task running logic
        return { code: "200", msg: "Success" };
    }

    async getDownloadBody(taskId) {
        // TODO: Implement download logic
        return { content: "", url: "" };
    }

    async exportTasks() {
        try {
            const tasks = TaskStorageService.getTasks();
            return tasks;
        } catch (error) {
            console.error('Error exporting tasks:', error);
            return [];
        }
    }

    async importTasks(tasksData) {
        try {
            // 清空现有任务
            TaskStorageService.clearAllTasks();
            
            // 导入新任务
            tasksData.forEach(task => {
                TaskStorageService.addTask(task);
            });
            
            return { code: "200", msg: "Success" };
        } catch (error) {
            console.error('Error importing tasks:', error);
            return { code: "500", msg: error.message };
        }
    }
} 