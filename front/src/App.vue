<!-- src/App.vue -->
<template>
  <div id="app">
    <div class="container">
      <div v-if="!isLoggedIn" class="login-container">
        <h2>请登录</h2>
        <div class="login-form">
          <input 
            type="text" 
            v-model="userId" 
            placeholder="请输入用户ID" 
            @keyup.enter="login"
          />
          <button @click="login" :disabled="!userId.trim()">登录</button>
        </div>
      </div>
      <component v-else :is="currentComponent"></component>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onBeforeUnmount, watch } from 'vue';
import { currentPreference, updatePreference } from './logic/preferenceService.js';
import Step2 from './components/Step2.vue';
import { createSession, closeSession, updateMessagesToBackend, updateCandidateItemsToBackend, updateModelNodesToBackend, updateCurrentPreferenceToBackend} from './logic/apiService.js';
import { messages } from './logic/messageService.js';
import { modelNodes, ModelNode } from './logic/modelNodeService.js';
import { toggleshowAllCourses } from './logic/scheduleService.js';



const userId = ref('');
const isLoggedIn = ref(false);

const login = async() => {
  if (userId.value.trim()) {
    console.log('登录用户ID:', userId.value);
    isLoggedIn.value = true;
    const response = await createSession(userId.value);
    console.log("response", response, response.status)
    if (response.status === 'success'){
      messages.value = response.messages
      
      // 处理从后端加载的 modelNodes，确保每个节点都有必要的方法
      const processedNodes = response.modelNodes.map(node => {
        // 创建一个新的 ModelNode 实例
        const newNode = new ModelNode(node.id);
        // 复制所有属性
        Object.assign(newNode, node);
        return newNode;
      });
      modelNodes.value = processedNodes;
      if(modelNodes.value.length === 0){
        modelNodes.value.push(new ModelNode(0));
      }
      const receivedCurrentPreference = response.currentPreference
      updatePreference(
        receivedCurrentPreference.father_id,
        receivedCurrentPreference.solution_father_id,
        receivedCurrentPreference.candidateItems,
        receivedCurrentPreference.requiredCourses,
        receivedCurrentPreference.objectives,
        receivedCurrentPreference.constraints,
        receivedCurrentPreference.globalConstraints,
        receivedCurrentPreference.solutionResults,
        receivedCurrentPreference.description,
        receivedCurrentPreference.featureExprs,
        receivedCurrentPreference.isIncremental,
        receivedCurrentPreference.objectivesChanges,
        receivedCurrentPreference.constraintsChanges,
        receivedCurrentPreference.coursesChanges,
        receivedCurrentPreference.filteredConstraints,
        receivedCurrentPreference.currentSolutionIndex,
        receivedCurrentPreference.candidatesBatch,
      );
      console.log(messages.value, modelNodes.value, currentPreference.value )
    }    
    if(modelNodes.value.length > 0) {
      toggleshowAllCourses(false);
    }
  }
}

// 监听页面关闭事件，确保在用户关闭页面时调用closeSession
onMounted(() => {
  window.addEventListener('beforeunload', (event) => {
    if (isLoggedIn.value) {
      console.log("关闭会话ing")
      // 显示"正在保存数据中"的提示
      event.preventDefault();
      event.returnValue = "正在保存数据中，请稍候...";
      // 延迟关闭页面，等待closeSession执行完成
      const closePromise = closeSession();
      closePromise.then(() => {
        console.log('会话已在页面关闭时结束');
        // 允许页面关闭
        window.removeEventListener('beforeunload', null);
        window.close();
      });
      
      // 阻止默认关闭行为，直到数据保存完成
      return "正在保存数据中，请稍候...";
    }
  });
});

// 在组件卸载前移除事件监听器
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', null);
});

const logout = async() => {
  await closeSession();  
  console.log('Logging out...');
  isLoggedIn.value = false;
  userId.value = '';
}

// 根据当前步骤动态加载组件
const currentComponent = computed(() => {
  return Step2;
  // return currentStep.value === 1 ? Step1 : Step2;
});

// 监听 messages 变化，同步到后端
watch(messages, (newMessages) => {
  if (isLoggedIn.value) {
    updateMessagesToBackend(newMessages);
  }
}, { deep: true });

// 监听 currentPreference 变化，同步到后端
watch(currentPreference, (newCurrentPreference) => {
  if (isLoggedIn.value) {
    updateCurrentPreferenceToBackend(newCurrentPreference);
  }
}, { deep: true });

// 监听 father_id 变化
watch(() => currentPreference.value.father_id, (new_father_id) => {
  if(new_father_id >= 0){
    modelNodes.value.forEach(node => {
      node.isActive = node.id === new_father_id;
    });
  }
}, { deep: true });

// 监听 modelNodes 变化，同步到后端
watch(modelNodes, (newModelNodes) => {
  if (isLoggedIn.value) {
    updateModelNodesToBackend(newModelNodes);
  }
}, { deep: true });

</script>

<!-- src/App.vue -->
<style>
/* 移除 scoped 以便样式应用于所有组件 */

/* 基本样式 */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  margin: 0; /* 使内容覆盖整个屏幕 */
  height: 100vh; /* 全屏高度 */
  box-sizing: border-box; /* 确保 padding 和 border 不影响元素总尺寸 */
  font-size: 14px; /* 设置基础字体大小为14px */
}

.container {
  display: flex;
  flex-direction: column; /* 使用垂直排列，方便分步骤 */
  height: 100%; /* 让容器填满父元素高度 */
  background-color: #f9f9f9;
  overflow: hidden;
}

/* 公共步骤样式 */
.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  background-color: #fff;
  overflow: hidden;
  position: relative; /* 使step-navigation的绝对定位基于.step */
}

/* 步骤1样式 */
.step-1 .favorites {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.favorites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.favorites-header h2 {
  margin: 0;
  font-size: 18px;
}

.import-csv-btn {
  padding: 5px 10px;
  cursor: pointer;
  border: none;
  background-color: #1a73e8;
  color: white;
  border-radius: 3px;
  font-size: 14px;
}

.import-csv-btn:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.import-csv-btn:hover:not(:disabled) {
  background-color: #369870;
}

/* 横向排列的表格容器 */
.favorites-tables {
  display: flex;
  flex-direction: row;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.favorites-tables .table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 5px;
  background-color: #fff;
}

.favorites-tables .table-container h3 {
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 16px;
}

/* 表格样式保持原样 */
table {
  width: 100%;
  min-width: 400px; /* 保持最小宽度 */
  border-collapse: collapse;
  margin: 0;
}

thead th {
  position: sticky;
  top: 0;
  background-color: #f1f1f1;
  z-index: 2;
}

th, td {
  padding: 4px 6px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  white-space: nowrap;
  font-size: 14px;
}

/* 选择框列样式保持原样 */
th:first-child, td:first-child {
  width: 10%;
  padding-left: 0;
  margin-left: 0;
  text-align: center;
}

th:first-child input[type="checkbox"], 
td:first-child input[type="checkbox"] {
  transform: scale(1.2);
}

/* 操作按钮组样式 */
.action-button-group {
  display: flex;
  justify-content: center; /* 水平居中 */
  gap: 20px; /* 减少间距以适应布局 */
  margin: 10px 0;
}

.move-right-btn, .move-back-btn {
  flex: none;
  padding: 8px 12px;
  cursor: pointer;
  border: none;
  background-color: #1a73e8;
  color: white;
  border-radius: 3px;
  font-size: 14px;
}

.move-right-btn:disabled, .move-back-btn:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.move-right-btn:hover:not(:disabled), .move-back-btn:hover:not(:disabled) {
  background-color: #369870;
}

/* 步骤控制按钮样式 */
.step-navigation {
  position: absolute; /* 绝对定位 */
  top: 10px;       /* 距离底部10px */
  right: 10px;        /* 距离右侧10px */
  display: flex;
  gap: 10px; /* 按钮之间的间距 */
}

.next-btn, .back-btn {
  padding: 10px 20px;
  background-color: #1a73e8;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 3px;
  font-size: 14px;
}

.next-btn:disabled {
  background-color: #a7a5d6;
  cursor: not-allowed;
}

.next-btn:hover:not(:disabled),
.back-btn:hover {
  background-color: #369870;
}

/* 步骤2样式 */
.step-2 .chat-and-panels {
  display: flex;
  flex: 1;
  flex-direction: row;
  gap: 10px;
  height: 100%;
}

/* 左侧：收藏夹 */
.selected-items-panel {
  flex: 0.32; /* 宽度比例 0.8 */
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow: hidden;
}

.selected-items-panel h3 {
  margin: 0;
  padding: 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ddd;
}

/* 为已选中的项目表格容器添加纵向滚动 */
.selected-items-table-container {
  flex: 1;
  overflow-y: auto; /* 启用纵向滚动 */
  padding: 5px;
}

.selected-items-panel table {
  width: 100%;
  border-collapse: collapse;
}

.selected-items-panel th, .selected-items-panel td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.selected-items-panel th:first-child, 
.selected-items-panel td:first-child {
  width: 10%;
  text-align: center;
}

.selected-items-panel input[type="checkbox"] {
  transform: scale(1.2);
}

/* 中间：对话框 */
.chat-box {
  flex: 0.6; /* 宽度比例 1.2 */
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
}

.chat-box h3 {
  margin: 0;
  padding: 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ddd;
}

.messages {
  flex: 2;
  overflow-y: auto;
  margin-bottom: 5px;
  padding: 5px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.message {
  margin-bottom: 5px;
  max-width: 90%;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 14px;
}

/* 普通机器人消息 */
.bot-message {
  background-color: #f2f8ff;
  align-self: flex-start;
  text-align: left;
}

/* 用户消息 */
.user-message {
  border: 1px solid #1a73e8;
  align-self: flex-end;
  text-align: right;
  margin-left: auto;
  margin-right: 0;
  max-width: 80%;
}

/* 问题建模消息 */
.problem-model-message {
  background-color: #f2f8ff;
  align-self: flex-start;
  text-align: left;
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
}

.added-feature-exprs-message {
  background-color: #f2f8ff;
  align-self: flex-start;
  text-align: left;
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
}

.problem-modeling {
  padding: 2px;
}

/* constraint */
.model-section {
  margin-bottom: 3px;
}

 .key-value-pair {
  margin-bottom: 3px;
}

.key {
  cursor: pointer; /* 显示为手型光标 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: bold;
  color: #1a73e8;
  margin-bottom: 2px;
  padding-left: 30px;
}
.filter-key {
  cursor: pointer; /* 显示为手型光标 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: bold;
  color: #1a73e8;
  margin-bottom: 2px;
  padding-left: 30px;
}

.toggle-icon {
  margin-left: 10px;
  font-size: 12px;
  color: #888;
}

.value {
  transition: all 0.3s ease;
  font-size: 12px;
  color: #555;
  margin-left: 3px;
  padding-left: 25px;
}

/* 输入框样式 */
.input-box {
  display: flex;
  justify-content: flex-start;
  gap: 5px;
  padding: 10px;
  border-top: 1px solid #ddd;
  background-color: #f1f1f1;
}

.input-box input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
}

.input-box button {
  padding: 5px 10px;
  cursor: pointer;
  border: none;
  background-color: #1a73e8;
  color: white;
  border-radius: 3px;
  font-size: 14px;
}

.input-box button:hover {
  background-color: #1a73e8;
}

/* 调整求解结果面板的布局 */
.solution-results-panel {
  flex: 1.2; /* 宽度比例 1.2 */
  display: flex;
  flex-direction: column; /* 纵向排列 */
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow: hidden;
}

.solution-results-panel h3 {
  margin: 1px;
  padding: 1px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ddd;
}

.solution-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 使内容和分页控件分布在上下两端 */
  padding: 10px;
}

.solution-results-panel > div {  /* 只影响直接子元素 */
    flex: 1;
    overflow-y: auto;
    padding: 2px 0;
}

.solution-results-panel p {
  margin: 5px 0;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.solution-content-list {
  height: 90%;
  overflow-y: auto;
  padding: 10px;
}

.solution-results-panel h3 {
  margin: 0;
  padding: 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ddd;
}

/* 修改课程表和特征表格的高度分配 */
.solution-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 课程表容器 */
.course-schedule {
  flex: 1; /* 默认占用所有可用空间 */
  overflow: auto;
  min-height: 200px; /* 设置最小高度 */
  transition: flex 0.3s ease; /* 添加过渡效果 */
}

/* 特征表格容器 */
.solution-results {
  flex: 0; /* 默认不占用空间 */
  overflow: auto;
  transition: flex 0.3s ease; /* 添加过渡效果 */
}

/* 当特征表格有内容时的样式 */
.solution-results:not(:empty) {
  flex: 0.60; /* 特征表格占40%，课程表占60% */
  min-height: 35%; /* 确保至少占40%高度 */
  border-top: 1px solid #ddd; /* 添加顶部边框分隔 */
  padding: 0px; /* 添加顶部内边距 */
  margin: 0px; /* 添加顶部外边距 */
}

.course-schedule h4 {
  margin-bottom: 10px;
  font-size: 16px;
  text-align: center;
}

.course-schedule table {
  width: 100%;
  border-collapse: collapse;
}

.course-schedule th, .course-schedule td {
  border: 1px solid #ccc;
  padding: 5px;
  text-align: center;
  min-width: 170px;
  width: 120px; /* 设置固定宽度 */
  min-height: 60px; /* 设置最小高度 */
  height: 60px; /* 设置固定高度 */
  overflow: hidden; /* 防止内容溢出 */
}

.course-schedule th {
  background-color: #f9f9f9;
}

.solution-key {
  font-size: 12px;
  font-weight: bold;
  color: green;
  margin-bottom: 2px;
  padding-left: 20px;
}

.solution-value {
  font-size: 12px;
  color: #555;
  margin-left: 3px;
  padding-left: 25px;
}

/* 新增分页按钮样式 */
.pagination {
  display: flex;
  gap: 10px; /* 按钮之间的间距 */
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.pagination button {
  padding: 6px 14px;
  background-color: #1a73e8;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.pagination button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background-color: #369870;
}

.pagination span {
  font-size: 12px;
}
.solution-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0px;
}

.solution-navigation button {
  margin: 5px 10px;
  padding: 5px 8px;
  font-size: 12px;
  background-color: #1a73e8;
  border: none;
  color: white;
  border-radius: 3px;
}

.solution-navigation button:disabled {
  background-color: #1460c45d;
  cursor: not-allowed;
}

.solution-navigation span {
  font-size: 12px;
}

.course-schedule td{
  font-size: 12px;
}

.solution-summary {
  font-weight: bold;
  margin-top: 2px;
  margin-bottom: 2px;
  color: green;
  text-align: center;
}

.constraints-section {
  margin-top: 2px;
  margin-bottom: 2px;
}

.constraints-section h4 {
  margin-top: 10px;
  margin-bottom: 2px;
  margin-left: 10px;
}

.constraint-pair {
  display: flex !important;
  flex-direction: row !important;
  margin-bottom: 2px;
  padding-left: 10px;
}

.constraint-key {
  width: 300px;
  font-weight: bold;
  margin-left: 40px;
  color: green;
  flex-shrink: 0;  /* 防止收缩 */
}

.constraint-value {
  margin-left: 10px;
  flex-shrink: 0;  /* 防止收缩 */
}

/* 确保没有其他样式干扰 */
.constraint-pair > div {
  display: block !important;
}

/* 确保父容器使用 flex 布局并且宽度占满100% */
.IIS-pair {
  display: flex;
  margin-bottom: 5px;
  width: 100%; 
  box-sizing: border-box;  /* 确保内边距和边框不会影响宽度计算 */
}

/* IIS-key 占 30% 宽度 */
.IIS-key {
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: 20% !important;
  font-weight: bold;
  margin-left: 40px;       /* 可调整间距 */
  box-sizing: border-box;  /* 防止 padding 或边框影响宽度 */
  word-wrap: break-word;   /* 启用换行 */
  color: green;
}

/* IIS-value 占 70% 宽度，允许换行 */
.IIS-value {
  flex-grow: 0;            /* 不扩展 */
  flex-shrink: 0;          /* 不收缩 */
  flex-basis: 70%;         /* 基础宽度 70% */
  margin-left: 10px;       /* 可调整间距 */
  box-sizing: border-box;  /* 防止 padding 或边框影响宽度 */
  word-wrap: break-word;   /* 启用换行 */
  word-break: break-word;  /* 强制长单词或URL换行 */
}

/* 确保我们的约束样式不受影响 */
.solution-results-panel .constraint-pair  {
    display: flex !important;
    flex: none !important;  /* 覆盖上面的 flex: 1 */
}

.solution-results-panel .constraint-key {
    width: 300px;
    font-weight: bold;
    margin-left: 40px;
    color: green;
    flex: none !important;
}

.solution-results-panel .constraint-value {
    margin-left: 10px;
    flex: none !important;
}

.solutions-table {
  width: 90%;
  font-size: 10px;
  border-collapse: collapse;
  margin: 0 auto;  /* 居中显示 */
}

.solutions-table th,
.solutions-table td {
  border: 1px solid #ddd;
  padding: 4px;
  font-size: 12px;
  height: 12px;  /* 设置固定高度 */
  text-align: left;
}

.solutions-table th {
  background-color: #f5f5f5;
  height: 15px;
}

.solutions-table tr:nth-child(even) {
  background-color: #fafafa;
}

.feature-name {
  font-weight: bold;
}

.filter-menu {
  color: #1a73e8;
}

.chosen-item {
  color: green;
  font-weight: bold ;
}

.delete-btn {
  position: absolute; /* 相对定位到 course-button */
  top: 0;
  right: 0;
  font-size: 14px;
  color: red;
  cursor: pointer;
  display: none; /* 默认隐藏 */
}

.course-button:hover .delete-btn {
  display: block; /* 当鼠标悬停在按钮上时显示删除按钮 */
}

button span {
  position: absolute;
  cursor: pointer;
}


.course-button {
  position: relative;
  background-color: transparent;
  border: 1px solid #ccc;
  padding: 0px 10px;
  margin: 1px;
  cursor: pointer;
  font-size: 10px;
  border-radius: 4px;
  width: 150px;
  height: 50px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

/* chosen_when_confirmed: true, chosen: true - 蓝色 */
/* .course-button.chosen.confirmed {
  background-color: black;
} */

.checkmark {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 14px;
  color: #1a73e8;
}

button span {
  position: absolute;
  cursor: pointer;
}

.filter-textbox {
  /* width: 80%;                设置宽度为 70% */
  margin-left: auto;         /* 向右对齐容器 */
  margin-right: 0;           /* 可以设置为 0 或其他值来控制右边距 */
  padding: 10px;             /* 添加内边距，使其更美观 */
  border-radius: 8px;        /* 圆角边框 */
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* 添加轻微阴影 */
  border: 1px solid #ccc;
}

.editable-button {
  display: block;            /* 使按钮成为块级元素 */
  margin-left: auto;         /* 向右对齐按钮 */
  margin-right: 10px;           /* 可选，确保按钮靠右 */
  cursor: pointer;           /* 鼠标悬停时显示为指针 */
  text-align: center;        /* 设置文本居中 */
}

.toggle-constraintType-button {
  margin-left: auto;
}

.constraint-button {
  margin-top: 10px;
  margin-bottom: 20px;
  margin: auto;
  width: 30%;
  padding: 5px 5px;
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
}
.constraint-update-button{
  margin: auto;
  text-align: center;
}
.feature-update-button{
  margin: auto;
  text-align: center;
}
.feature-button-true {
  margin-top: 10px;
  margin-bottom: 20px;
  margin: auto;
  width: 20%;
  padding: 5px 5px;
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
}

.feature-button-false {
  margin-top: 10px;
  margin-bottom: 20px;
  margin: auto;
  width: 20%;
  padding: 5px 5px;
  background-color: red; /* Green */
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
}

.solution-navigation .confirm-button {
  background-color: #1a73e8;
}

/* userSelected 样式保持不变 */
.course-button.userSelected, .course-favorite.userSelected {
  border: 2px solid #1a73e8 !important;
}

.course-button.chosen, .course-favorite.chosen{
  font-weight: bold;
  /* border: 2px solid #000; */
}
.course-button:not(.chosen), .course-favorite:not(.chosen) {
  color: #808080;
}

/* 根据匹配程度设置背景颜色 */
.course-button.fixed, .course-favorite.fixed{
  background-color: #d4e6ff !important; /* 浅蓝色背景 */
}

.course-button.undecided, .course-favorite.undecided{
  background-color: #fff8d4  /* 浅黄色背景 */
}

.course-button.blocked, .course-favorite.blockded{
  background-color: #f0f0f0 !important; /* 浅灰色背景 */
}

.course-button.added, .course-favorite.added{
  background-color: #8de4a3 !important; 
}

/* chosen_when_confirmed: true, chosen: false - 红色 */
.course-button.deleted, .course-favorite.deleted{
  background-color: #e76060 !important;
}

/* 确保全局盒模型一致 */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* 登录界面样式 */
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #f9f9f9;
}

.login-container h2 {
  margin-bottom: 20px;
  color: #1a73e8;
}

.login-form {
  display: flex;
  flex-direction: column;
  width: 300px;
  gap: 15px;
}

.login-form input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.login-form button {
  padding: 12px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.login-form button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.login-form button:hover:not(:disabled) {
  background-color: #1565c0;
}
</style>

