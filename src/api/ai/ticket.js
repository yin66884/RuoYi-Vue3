import request from '@/utils/request'

// 1. 查询工单列表
export function listTicket(query) {
    return request({
        url: '/ticket/list',
        method: 'get',
        params: query
    })
}

// 2. 新增工单
export function addTicket(data) {
    return request({
        url: '/ticket',
        method: 'post',
        data: data
    })
}

// 3. 修改工单
export function updateTicket(data) {
    return request({
        url: '/ticket',
        method: 'put',
        data: data
    })
}

// 4. 删除工单
export function delTicket(id) {
    return request({
        url: '/ticket/' + id,
        method: 'delete'
    })
}

// 5. AI 智能分析
export function analyzeTicket(id) {
    return request({
        url: '/ticket/' + id + '/analyze',
        method: 'post'
    })
}