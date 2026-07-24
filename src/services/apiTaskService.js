import axios from 'axios';
import { invoke } from '@tauri-apps/api/core';

export class ApiTaskService {
    constructor() {
        this.baseUrl = '';
        this.portReady = null;
    }

    async getBaseUrl() {
        if (this.baseUrl) return this.baseUrl;
        if (!this.portReady) {
            this.portReady = (async () => {
                try {
                    const port = await invoke('get_server_port');
                    this.baseUrl = `http://127.0.0.1:${port}`;
                    console.log('[ApiTaskService] Server port discovered:', port);
                } catch (e) {
                    // Fallback: not running in Tauri (dev mode with separate server)
                    this.baseUrl = '';
                    console.warn('[ApiTaskService] invoke get_server_port failed:', e?.message || e);
                    console.log('[ApiTaskService] Falling back to proxy mode (baseUrl empty)');
                }
            })();
        }
        await this.portReady;
        return this.baseUrl;
    }

    async getTaskList() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/tasks/list?page=1`);
        return response.data;
    }

    async uploadFile(formData) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/media/upload`, formData,{
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log("response---", response.data);
        return response.data;
    }

    async getReplaceList() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/replace`);
        if (response.status !== 200) {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async updateReplaceList(replaceList) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/replace`, replaceList);
        if (response.status !== 200) {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async addTask(taskData) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/tasks/add`, taskData);
        if (response.data.code !== "200") {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async updateTask(taskId, taskData) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/tasks/update?task_id=${taskId}`, taskData);
        if (response.data.code !== "200") {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async deleteTask(taskId) {
        const base = await this.getBaseUrl();
        const response = await axios.delete(`${base}/tasks/delete/${taskId}`);
        if (response.data.code !== "200") {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async runTask(taskId) {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/tasks/run?task_id=${taskId}`);
        return response.data;
    }

    async getTaskDetail(taskId) {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/tasks/detail`, {
            params: { task_id: taskId }
        });
        return response.data;
    }

    async getBaseConfig() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/base-config`);
        if (response.status !== 200) {
            throw new Error(response.data?.msg || 'get base-config failed');
        }
        return response.data;
    }

    async saveBaseConfig(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/base-config`, data);
        if (response.status !== 200) {
            throw new Error(response.data?.msg || 'save base-config failed');
        }
        return response.data;
    }

    async getNetworkConfig() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/network-config`);
        if (response.status !== 200) {
            throw new Error(response.data?.msg || 'get network-config failed');
        }
        return response.data;
    }

    async saveNetworkConfig(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/network-config`, data);
        if (response.status !== 200) {
            throw new Error(response.data?.msg || 'save network-config failed');
        }
        return response.data;
    }

    async getSearchConfig() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/info`);
        if (response.status !== 200) {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async updateSearchConfig(config) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/global-config`, config);
        if (response.status !== 200) {
            throw new Error(response.data.msg);
        }
        return response.data;
    }

    async runSpider() {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/spider/run`);
        return response.data;
    }

    async getSpiderStatus() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/spider/status`);
        return response.data;
    }

    async getTodayFiles() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/list-today-files`);
        return response.data;
    }

    async clearSearchFolder() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/clear-search-folder`);
        return response.data;
    }

    async initSearchData() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/init-search-data`);
        return response.data;
    }

    async getFavourite() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/get-favourite`);
        return response.data;
    }

    async saveFavourite(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/save-favourite`, data);
        return response.data;
    }

    async openUrl(url) {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}${url}`);
        return response.data;
    }

    async getChannelLogos() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/media/logos`);
        return response.data;
    }

    async getLogosConfig() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/channel-logos`);
        return response.data;
    }

    async uploadLogos(formData) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/media/upload-logos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }

    async updateLogo(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/media/logos/update`, data);
        return response.data;
    }

    async saveChannelLogos(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/channel-logos`, data);
        return response.data;
    }

    async saveChannelLogosConfig(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/media/logos/config`, data);
        return response.data;
    }

    async exportConfig() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/export`);
        return response.data;
    }

    async importConfig(formData) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }

    async getEpgSources() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/epg/sources`);
        return response.data;
    }

    async saveEpgSources(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/epg/sources`, data);
        return response.data;
    }

    async getEpgByChannel(channel) {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/epg`, {
            params: { channel }
        });
        return response.data;
    }

    async getEpgChannelList() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/epg/channel-list`);
        return response.data;
    }

    /** 立即更新 EPG：POST /epg/sync（与后端不一致时改此处） */
    async refreshEpg() {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/epg/sync`, {});
        return response.data;
    }

    /** 清除已爬取的 EPG 缓存：GET /epg/cache */
    async clearEpgCache() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/epg/cache`);
        return response.data;
    }

    async getGroupMapping() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/group-mapping`);
        return response.data;
    }

    async saveGroupMapping(data) {
        const base = await this.getBaseUrl();
        const response = await axios.post(`${base}/system/group-mapping`, data);
        return response.data;
    }

    async getUnmappedEpgChannels() {
        const base = await this.getBaseUrl();
        const response = await axios.get(`${base}/system/group-mapping/unmapped`);
        return response.data;
    }
}
