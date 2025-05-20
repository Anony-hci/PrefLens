<template>
    <div v-if="show" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Courses</h3>
          <div class="search-box">
              <input 
                v-model="searchCourseQuery" 
                type="text" 
                placeholder="Enter the course name to search"
              />
            </div>
            <div class="search-box">
              <input 
                type="text" 
                placeholder="Enter the lecturer to search"
              />
            </div>
            <div class="search-box">
              <input 
                v-model="searchDepartmentQuery" 
                type="text" 
                placeholder="Enter the department to search"
              />
            </div>
          <button @click="onClose" class="close-button">×</button>
        </div>
        
        <div class="modal-body">
          <div class="favorites">
            
  
            <div class="favorites-tables">
              <div class="table-container all-projects">
                <h3>Database</h3>
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox" 
                          :checked="allSelected" 
                          :indeterminate.prop="someSelected && !allSelected"
                          @change="toggleSelectAll('database')"
                        />
                      </th>
                      <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in filteredDatabase" :key="index">
                      <td>
                        <input type="checkbox" v-model="item.selected" />
                      </td>
                      <td v-for="(header, idx) in headers" :key="idx">
                        {{ item[header] }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="table-container selected-projects">
                <h3>Candidate Courses</h3>
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox" 
                          :checked="allCandidateSelected"
                          :indeterminate.prop="someCandidateSelected && !allCandidateSelected"
                          @change="toggleSelectAll('candidate')"
                        />
                      </th>
                      <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in tempCandidateItems" :key="index">
                      <td>
                        <input type="checkbox" v-model="item.selected" />
                      </td>
                      <td v-for="(header, idx) in headers" :key="idx">
                        {{ item[header] }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="action-button-group">
              <button @click="addToCandidates" :disabled="!canAddToCandidates" class="move-right-btn">
                add
              </button>
              <button @click="removeFromCandidates" :disabled="!canRemoveFromCandidates" class="move-back-btn">
                delete
              </button>
            </div>
          </div>
        </div>
  
        <div class="modal-footer">
          <button @click="onClose" class="cancel-btn">取消</button>
          <button @click="onConfirm" class="confirm-btn">确认</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { headers, searchCourseQuery, searchDepartmentQuery, filteredDatabase } from '../logic/fileService.js';
  import { allSelected, someSelected, toggleSelectAll, allCandidateSelected, someCandidateSelected, tempCandidateItems } from '../logic/coursesService.js';
  import { currentPreference } from '../logic/preferenceService.js';

  // 定义props
  const props = defineProps({
    show: {
      type: Boolean,
      required: true
    },
    currentCandidateItems: {
      type: Array,
      default: () => []
    }
  });
  
  // 定义emit
  const emit = defineEmits(['close', 'confirm']);
  

  
  // 初始化临时候选课程
  onMounted(() => {
    tempCandidateItems.value = props.currentCandidateItems.map(item => ({...item}));
  });
  
  // 关闭弹窗
  const onClose = () => {
    emit('close');
  };
  
  // 确认选择
  const onConfirm = () => {
    // 创建一个副本发送给接收方
    const candidateItemsCopy = [...tempCandidateItems.value];
    // 发出确认事件
    emit('confirm', candidateItemsCopy);
    // 清空搜索查询
    searchDepartmentQuery.value = '';
    searchCourseQuery.value = '';
    // 清空临时选择的项目
    tempCandidateItems.value = [];
    // 添加延迟确保数据处理完成后再关闭弹窗
    setTimeout(() => {
      emit('close');
    }, 10);
  };
  
  // 添加到候选课程
  const addToCandidates = () => {
    const itemsToAdd = filteredDatabase.value
      .filter(item => item.selected)
      .map(item => ({
        ...item,
        selected: true,  // 重置选中状态
        chosen: false,
        added: false,
        userSelected: false,
        chosen_when_confirmed: false,
        batch: currentPreference.value.candidatesBatch,
      }));
    currentPreference.value.candidatesBatch += 1;
    
    // 添加到临时候选课程，避免重复
    itemsToAdd.forEach(item => {
      const exists = tempCandidateItems.value.some(
        existing => existing['课程名'] === item['课程名'] && 
                   existing['主讲教师'] === item['主讲教师'] &&
                   existing['上课时间'] === item['上课时间']
      );
      if (!exists) {
        tempCandidateItems.value.push(item);
      }
    });
    
    // 重置选中状态
    filteredDatabase.value.forEach(item => {
      item.selected = false;
    });
  };
  
  // 从候选课程中移除
  const removeFromCandidates = () => {
    tempCandidateItems.value = tempCandidateItems.value.filter(item => !item.selected);
  };
  
  // 计算是否可以添加到候选课程
  const canAddToCandidates = computed(() => {
    return filteredDatabase.value.some(item => item.selected);
  });
  
  // 计算是否可以从候选课程中移除
  const canRemoveFromCandidates = computed(() => {
    return tempCandidateItems.value.some(item => item.selected);
  });
  </script>
  
  <style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    padding: 15px 10px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .modal-footer {
    padding: 15px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }
  
  .cancel-btn, .confirm-btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .cancel-btn {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
  }
  
  .confirm-btn {
    background-color: #1976D2;
    color: white;
    border: none;
  }
  
  .search-box {
    margin-bottom: 10px;
  }
  
  .search-box input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .favorites-tables {
    display: flex;
    gap: 20px;
    margin-top: 20px;
  }
  
  .table-container {
    flex: 1;
    overflow: auto;
    max-height: 400px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f5f5f5;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .action-button-group {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  
  .move-right-btn, .move-back-btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .move-right-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
  }
  
  .move-right-btn:disabled {
    background-color: #a5d6a7;
    cursor: not-allowed;
  }
  
  .move-back-btn {
    background-color: #f44336;
    color: white;
    border: none;
  }
  
  .move-back-btn:disabled {
    background-color: #ef9a9a;
    cursor: not-allowed;
  }
  </style>