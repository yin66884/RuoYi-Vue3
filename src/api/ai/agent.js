import request from '@/utils/request'

export function askTicketAgent(message, signal) {
    return request({
        url: '/ticket/agent/chat',
        method: 'post',
        data: { message },
        // 后端总执行预算为120秒，为传输和响应预留余量。
        timeout: 130000,
        signal
    })
}
