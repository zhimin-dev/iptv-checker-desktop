export class FileStorageService {
    static STORAGE_PREFIX = 'localstorage/';

    /**
     * 保存文件内容到 localStorage
     * @param {string} key - 存储的键名
     * @param {string} content - 文件内容
     * @returns {string} - 存储的完整键名
     */
    static saveFile(key, content) {
        const storageKey = this.STORAGE_PREFIX + key;
        try {
            localStorage.setItem(storageKey, content);
            return storageKey;
        } catch (error) {
            console.error('Error saving file to localStorage:', error);
            throw new Error('Failed to save file to localStorage');
        }
    }

    /**
     * 从 localStorage 读取文件内容
     * @param {string} key - 存储的键名
     * @returns {string|null} - 文件内容，如果不存在则返回 null
     */
    static getFile(key) {
        const storageKey = this.STORAGE_PREFIX + key;
        try {
            return localStorage.getItem(storageKey);
        } catch (error) {
            console.error('Error reading file from localStorage:', error);
            return null;
        }
    }

    /**
     * 从 localStorage 删除文件
     * @param {string} key - 存储的键名
     */
    static deleteFile(key) {
        const storageKey = this.STORAGE_PREFIX + key;
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Error deleting file from localStorage:', error);
        }
    }

    /**
     * 读取文件内容并保存到 localStorage
     * @param {File|Blob} file - 文件对象
     * @returns {Promise<string>} - 存储的完整键名
     */
    static async readAndSaveFile(file) {
        return new Promise((resolve, reject) => {
            // 检查文件对象是否有效
            if (!file || !(file instanceof Blob)) {
                reject(new Error('Invalid file object'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    // 使用文件名或生成唯一标识符作为键
                    const key = file.name || `file_${Date.now()}`;
                    const storageKey = this.saveFile(key, content);
                    resolve(storageKey);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                reject(new Error('Failed to read file: ' + error.message));
            };

            try {
                reader.readAsText(file);
            } catch (error) {
                reject(new Error('Failed to read file: ' + error.message));
            }
        });
    }

    /**
     * 检查文件是否已存在于存储中
     * @param {string} key - 存储的键名
     * @returns {boolean} - 如果文件存在则返回 true
     */
    static hasFile(key) {
        const storageKey = this.STORAGE_PREFIX + key;
        return localStorage.getItem(storageKey) !== null;
    }

    /**
     * 获取所有存储的文件键名
     * @returns {string[]} - 存储的文件键名数组
     */
    static getAllFileKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.STORAGE_PREFIX)) {
                keys.push(key.replace(this.STORAGE_PREFIX, ''));
            }
        }
        return keys;
    }
} 