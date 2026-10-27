<template>
  <div class="app-container agent-page">
    <el-card shadow="never">
      <template #header>
        <div class="heading">
          <div>
            <h2>工单智能助手</h2>
            <p>查询真实工单，获取有数据依据的排查建议。</p>
          </div>
          <el-button :disabled="sending" @click="messages = []">清空记录</el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon
        title="V1 每次提问独立执行。请在问题中写明筛选条件或工单 ID；处理建议需由人工核实。" />

      <div class="examples">
        <el-button v-for="example in examples" :key="example" :disabled="sending"
          size="small" @click="input = example">{{ example }}</el-button>
      </div>

      <div ref="conversation" class="conversation" role="log" aria-label="工单问答记录" aria-live="polite">
        <el-empty v-if="!messages.length" description="输入问题，开始查询工单" />
        <article v-for="item in messages" :key="item.id" class="message" :class="item.role">
          <strong>{{ item.role === 'user' ? '你' : '工单助手' }}</strong>
          <p class="message-text">{{ item.text }}</p>
          <template v-if="item.response">
            <div class="metrics">
              <span>耗时 {{ (item.response.elapsedMs / 1000).toFixed(1) }} 秒</span>
              <span>Token {{ item.response.totalTokens }}</span>
              <span>工具调用 {{ item.response.toolCalls.length }} 次</span>
            </div>
            <el-alert v-if="item.response.stopReason !== 'completed'" type="warning" :closable="false"
              title="本次任务未完成完整分析，可查看已执行的工具记录。" />
            <el-collapse v-if="item.response.toolCalls.length" class="tool-records">
              <el-collapse-item v-for="(call, index) in item.response.toolCalls" :key="call.toolCallId"
                :name="call.toolCallId"
                :title="`${index + 1}. ${call.name} · ${call.success ? '执行成功' : '执行失败'} · ${call.elapsedMs}ms`">
                <p>调用参数</p>
                <pre>{{ pretty(call.arguments) }}</pre>
                <p>实际返回结果</p>
                <pre>{{ pretty(call.result) }}</pre>
              </el-collapse-item>
            </el-collapse>
            <small class="request-id">请求 ID：{{ item.response.requestId }}</small>
          </template>
        </article>
        <p v-if="sending" class="pending" role="status">正在查询和分析，请稍候……</p>
      </div>

      <el-alert v-if="error" class="error" type="error" :title="error" :closable="false" show-icon />
      <el-input v-model="input" type="textarea" :rows="3" maxlength="2000" show-word-limit
        :disabled="sending" placeholder="例如：找出所有未处理的高优先级工单，并给出处理建议。"
        aria-label="输入工单问题" @keydown.ctrl.enter.prevent="send" />
      <div class="send-bar">
        <span>Ctrl + Enter 发送</span>
        <el-button type="primary" :loading="sending" :disabled="!input.trim()" @click="send">
          {{ sending ? '分析中' : '发送问题' }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { askTicketAgent } from '@/api/ai/agent'

const input = ref('')
const sending = ref(false)
const error = ref('')
const messages = ref([])
const conversation = ref(null)
const examples = [
  '找出所有未处理的高优先级工单，并给出处理建议。',
  '查询正在处理的普通优先级工单，展示第一页。'
]
let sequence = 0
let controller

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

async function scrollToEnd() {
  await nextTick()
  if (conversation.value) conversation.value.scrollTop = conversation.value.scrollHeight
}

async function send() {
  const question = input.value.trim()
  if (!question || sending.value) return
  sending.value = true
  error.value = ''
  messages.value.push({ id: ++sequence, role: 'user', text: question })
  input.value = ''
  controller = new AbortController()
  await scrollToEnd()
  try {
    const res = await askTicketAgent(question, controller.signal)
    messages.value.push({ id: ++sequence, role: 'assistant', text: res.data.answer, response: res.data })
  } catch (err) {
    if (err.code !== 'ERR_CANCELED') {
      error.value = err.message || '请求失败，请稍后重试'
      input.value = question
    }
  } finally {
    sending.value = false
    controller = null
    await scrollToEnd()
  }
}

onBeforeUnmount(() => controller?.abort())
</script>

<style scoped>
.agent-page { max-width: 1100px; margin: 0 auto; }
.heading, .send-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.heading h2 { margin: 0 0 8px; }
.heading p { margin: 0; color: #606266; }
.examples { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.examples .el-button { margin-left: 0; white-space: normal; height: auto; padding: 8px; text-align: left; }
.conversation { height: min(55vh, 600px); min-height: 260px; overflow-y: auto; padding: 4px; }
.message { padding: 16px; margin-bottom: 14px; border-radius: 8px; background: #f5f7fa; }
.message.user { background: #ecf5ff; }
.message-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; margin-bottom: 10px; }
.metrics { display: flex; flex-wrap: wrap; gap: 16px; color: #606266; font-size: 12px; margin: 12px 0; }
.tool-records { margin-top: 12px; }
pre { max-height: 320px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; padding: 12px; background: #fff; }
.request-id { display: block; overflow-wrap: anywhere; color: #606266; margin-top: 12px; }
.pending { color: #409eff; padding: 12px; }
.error { margin: 12px 0; }
.send-bar { margin-top: 12px; }
.send-bar span { font-size: 12px; color: #606266; }
</style>
