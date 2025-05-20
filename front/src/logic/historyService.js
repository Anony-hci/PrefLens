// src/logic/historyService.js
import { ref, computed } from 'vue';
import { currentPage } from './paginationService';
import { is_checked_closest } from './solutionService';

// 历史记录
export const problemModelHistory = ref([]);  // 存储历史问题建模
export const solutionResultsHistory = ref([]);  // 存储历史求解结果

// 计算当前显示的结果
export const currentProblemModel = computed(() => problemModelHistory.value[currentPage.value] || {});
export const currentSolutionResult = computed(() => solutionResultsHistory.value[currentPage.value] || '');

export const addToProblemModelHistory = (problemModel) => {
    problemModelHistory.value.unshift(problemModel);
  };
  
export const addToSolutionResultsHistory = (solutionResults) => {
    solutionResultsHistory.value.unshift(solutionResults);
  };

export const removeFromSolutionResultsHistory = () => {
  is_checked_closest.value = false
  if (solutionResultsHistory.value.length > 0) {
    solutionResultsHistory.value.shift();
  }
};