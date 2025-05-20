// src/logic/paginationService.js
import { ref, computed } from 'vue';
import { problemModelHistory,solutionResultsHistory } from './historyService';

// 当前页
export const currentPage = ref(0);

// 页码控制
export const pageSize = 1;  // 每页显示1条记录

// 总页数
export const totalPages = computed(() => Math.max(
    Math.ceil(problemModelHistory.value.length / pageSize),
    Math.ceil(solutionResultsHistory.value.length / pageSize)
  ));

// 统一翻页功能
export const goToPreviousPage = () => {
    if (currentPage.value > 0) {
      currentPage.value--;
    }
  };
  
export const goToNextPage = () => {
    if (currentPage.value < totalPages.value - 1) {
      currentPage.value++;
    }
  };