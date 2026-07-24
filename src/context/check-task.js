self.onmessage = async function (e) {
    const { index, nowMod, task, original } = e.data;
    console.log(`Worker received task:`, { index, nowMod, task, original });
    let result = null
    if(nowMod === 0) {
        result = await checkByWeb(index, task, original.original)
    }else if(nowMod === 1) {
        result = await checkByCmd(index, task, original.original)
    }
    console.log(`Worker completed task:`, { index, result });
    self.postMessage({ index, task, result });
};

async function checkByWeb(index, task, originalData) {
    try {
        console.log(`Checking URL: ${task.url}`);
        let need_returen = false;
        if(originalData.no_check) {
            need_returen = true
        }else {
            if(originalData.not_http_skip) {
                // Check if URL starts with http:// or https://
                if (!task.url.startsWith('http://') && !task.url.startsWith('https://')) {
                    need_returen = true
                }
            }
        }
        if (need_returen) {
            return {
                'status': 200,
                'audio': null,
                'video': null,
                'error': ''
            };
        }
        // Create AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), originalData.http_timeout);
        
        const response = await fetch(task.url, {
            method: 'HEAD',
            signal: controller.signal,
        });
        // Check if response is streaming and hasn't completed in time
        if (!response.ok || response.bodyUsed) {
            console.log(`Request failed for ${task.url}:`, { ok: response.ok, bodyUsed: response.bodyUsed });
            clearTimeout(timeoutId);
            controller.abort(); // Force abort the ongoing request
            return {
                'status': 500,
                'audio': null,
                'video': null
            };
        }
        
        clearTimeout(timeoutId);

        // Check Content-Type header
        const contentType = response.headers.get('content-type');
        console.log(`Content-Type for ${task.url}:`, contentType);
        if (!contentType || !(
            contentType.includes('application/vnd.apple.mpegurl') ||
            contentType.includes('application/x-mpegurl') ||
            contentType.includes('audio/mpegurl') ||
            contentType.includes('audio/x-mpegurl') ||
            contentType.includes('text/plain') ||
            contentType.includes('application/x-mpegURL') ||
            contentType.includes('application/vnd.apple.mpegURL')
        )) {
            return {
                'status': 500,
                'audio': null,
                'video': null,
                'contentType': contentType
            };
        }else{
            return {
                'status': 200,
                'audio': null,
                'video': null,
                'contentType': contentType
            };
        }
    } catch (error) {
        console.log(`Error checking ${task.url}:`, error);
        // Request failed
        return {
            'status': 500,
            'audio': null,
            'video': null,
            'contentType': ""
        };
    }
}

async function checkByCmd(index, task, originalData) {
    console.log(`Checking by CMD:`, { index, task });
    return checkByWeb(index, task, originalData)
}