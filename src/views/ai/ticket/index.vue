
<template>
  <div class="app-container">
    <h2>AI 智能工单管理</h2>

    <!-- 操作按钮 -->
    <div style="margin-bottom: 16px">
      <el-button type="primary" @click="openAdd">
        新增工单
      </el-button>
      <el-button @click="getList">刷新列表</el-button>
    </div>

    <!-- 工单列表 -->
    <el-table
        v-loading="loading"
        :data="tickets"
        border
        style="width: 100%"
    >
      <el-table-column prop="id" label="工单ID" width="90" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="content" label="内容" min-width="220" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="priority" label="优先级" width="120" />

      <!-- AI分析结果 -->
      <el-table-column
          prop="aiSummary"
          label="AI分析摘要"
          min-width="260"
      >

        <template #default="scope">
          {{ scope.row.aiSummary || '尚未分析' }}
        </template>
      </el-table-column>


      <!-- AI问题分类 -->
      <el-table-column
          prop="aiCategory"
          label="AI问题分类"
          width="130"
      >
        <template #default="scope">
          {{ scope.row.aiCategory || '尚未分析' }}
        </template>
      </el-table-column>

      <!-- AI建议优先级 -->
      <el-table-column label="AI建议优先级" width="150">
        <template #default="scope">
          <el-tag
              v-if="scope.row.aiPriority"
              :type="scope.row.aiPriority === 'HIGH'
        ? 'danger'
        : scope.row.aiPriority === 'NORMAL'
          ? 'warning' : 'success'"
          >
            {{ scope.row.aiPriority }}
          </el-tag>
          <span v-else>尚未分析</span>
        </template>
      </el-table-column>

      <!-- AI故障原因 -->
      <el-table-column
          prop="aiCause"
          label="AI可能原因"
          min-width="240"
          show-overflow-tooltip
      />

      <!-- AI处理建议 -->
      <el-table-column
          prop="aiSuggestion"
          label="AI处理建议"
          min-width="300"
          show-overflow-tooltip
      />

      <!-- 操作列 -->
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="scope">
          <el-button
              link
              type="success"
              :loading="analyzingId === scope.row.id"
              :disabled="analyzingId !== null && analyzingId !== scope.row.id"
              @click="handleAnalyze(scope.row)"
          >
            AI分析
          </el-button>

          <el-button
              link
              type="primary"
              @click="openEdit(scope.row)"
          >
            修改
          </el-button>

          <el-button
              link
              type="danger"
              @click="removeTicket(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
        style="margin-top: 20px"
        background
        layout="total, prev, pager, next"
        :total="total"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        @current-change="changePage"
    />

    <!-- 新增和修改弹窗 -->
    <el-dialog
        v-model="dialogVisible"
        :title="editing ? '修改工单' : '新增工单'"
        width="520px"
    >
      <el-form :model="form" label-width="90px">
        <el-form-item label="工单标题">
          <el-input v-model="form.title" maxlength="100" />
        </el-form-item>

        <el-form-item label="问题描述">
          <el-input
              v-model="form.content"
              type="textarea"
              :rows="4"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="待处理" value="OPEN" />
            <el-option label="处理中" value="PROCESSING" />
            <el-option label="已完成" value="CLOSED" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-select v-model="form.priority">
            <el-option label="低" value="LOW" />
            <el-option label="普通" value="NORMAL" />
            <el-option label="高" value="HIGH" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  listTicket,
  addTicket,
  updateTicket,
  delTicket,
  analyzeTicket
} from '@/api/ai/ticket'

// 页面数据
const tickets = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editing = ref(false)

// AI分析状态
const analyzingId = ref(null)

// 分页参数
const query = reactive({
  pageNum: 1,
  pageSize: 10
})

// 工单表单
const form = reactive({
  id: null,
  title: '',
  content: '',
  status: 'OPEN',
  priority: 'NORMAL'
})

// 查询工单列表
async function getList() {
  loading.value = true
  try {
    const res = await listTicket({ ...query })
    tickets.value = res.rows ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

// 翻页
function changePage(page) {
  query.pageNum = page
  getList()
}

// 新增工单
function openAdd() {
  editing.value = false

  Object.assign(form, {
    id: null,
    title: '',
    content: '',
    status: 'OPEN',
    priority: 'NORMAL'
  })

  dialogVisible.value = true
}

// 修改工单
function openEdit(row) {
  editing.value = true

  Object.assign(form, {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    priority: row.priority
  })

  dialogVisible.value = true
}

// 提交新增或修改
async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请填写标题和问题描述')
    return
  }

  saving.value = true

  try {
    if (editing.value) {
      await updateTicket({ ...form })
    } else {
      await addTicket({ ...form })
    }

    ElMessage.success('操作成功')
    dialogVisible.value = false
    await getList()
  } finally {
    saving.value = false
  }
}

// 删除工单
async function removeTicket(row) {
  try {
    await ElMessageBox.confirm(
        `确定删除工单 ${row.id} 吗？`,
        '删除确认',
        { type: 'warning' }
    )
  } catch {
    return
  }

  await delTicket(row.id)
  ElMessage.success('删除成功')
  await getList()
}

// AI分析工单
async function handleAnalyze(row) {
  if (analyzingId.value !== null) return

  analyzingId.value = row.id

  try {
    await analyzeTicket(row.id)

    ElMessage.success('AI分析完成')

    // 重新查询，显示AI摘要
    await getList()
  } finally {
    analyzingId.value = null
  }
}

// 页面初始化
onMounted(getList)
</script>
