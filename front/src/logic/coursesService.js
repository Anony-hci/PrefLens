import { ref, computed } from "vue";
import { is_confirmed } from "./solutionService";
import { currentPreference } from "./preferenceService";
// 收藏夹数据
export const items = ref([]); // 所有收藏夹中的项目
// 临时存储候选课程
export const tempCandidateItems = ref([]);
// 计算已添加和未添加课程的课程名集合
export const allCourses = computed(() => {
  return new Set(currentPreference.value.candidateItems.map(item => item['课程名']));
});
export const candidateItems_courses_selected = computed(() => {
  const selectedCourses = new Set(currentPreference.value.candidateItems.filter(item => item.selected).map(item => item['课程名']));
  return Array.from(selectedCourses);
});
export const candidateItems_selected = computed(() => {
  return currentPreference.value.candidateItems.filter(item => item.selected).length;
});

export const getSelectedItems = (candidates_items) => {
  return candidates_items.filter(item => item.selected)
}

export const getSelectedCourses = (candidates_items) => {
  const selectedCourses = new Set(candidates_items.filter(item => item.selected).map(item => item['课程名']));
  return Array.from(selectedCourses);
}


// 计算是否可以操作
export const canMoveToCandidate = computed(() => items.value.some(item => item.selected));
export const canMoveBackToDatabase = computed(() => currentPreference.value.candidateItems.some(item => item.selected));
export const hasAddedItems = computed(() => currentPreference.value.candidateItems.some(item => item.added));

// 全选计算
export const allSelected = computed(() => {
  return items.value.length > 0 && items.value.every(item => item.selected);
});

export const someSelected = computed(() => {
  return items.value.some(item => item.selected);
});

export const allCandidateSelected = computed(() => {
  return tempCandidateItems.value.length > 0 && tempCandidateItems.value.every(item => item.selected);
});

export const someCandidateSelected = computed(() => {
  return tempCandidateItems.value.some(item => item.selected);
});


// 操作函数
export const moveToCandidate = async () => {
    const itemsToMove = items.value.filter(item => item.selected);
    if (itemsToMove.length === 0) return;

    // 移动到 candidateItems
    currentPreference.value.candidateItems.push(...itemsToMove.map(item => {
      // 创建新对象，避免引用问题
      // added: true表示是新家的
      const newItem = { ...item, selected: true, chosen: false, userSelected: false, added: is_confirmed.value}; 
      return newItem;
    }));
  
    // 从 items 中移除
    items.value = items.value.filter(item => !item.selected);
  
    // 发送移动操作到后端
    // for (const item of itemsToMove) {
    //   await updateDataToBackend('move_to_selected', item);
    // }
  };
  
  export const moveBackToDatabase = async () => {
    const itemsToMoveBack = currentPreference.value.candidateItems.filter(item => item.selected);
    if (itemsToMoveBack.length === 0) return;
  
    // 移动回 favoriteItems，插入到开头
    items.value = [
      ...itemsToMoveBack.map(item => ({ ...item, selected: true })), // 默认选中
      ...items.value
    ];
  
    // 从 candidateItems 中移除
    currentPreference.value.candidateItems = currentPreference.value.candidateItems.filter(item => !item.selected);
  
    // 发送移动回收藏夹的操作到后端
    // for (const item of itemsToMoveBack) {
    //   await updateDataToBackend('move_back_to_favorites', item);
    // }
  };
  
  
  
  // 选择全部切换
  export const toggleSelectAll = (type) => {
    if (type === 'database') {
      const newValue = !allSelected.value;
      items.value.forEach(item => item.selected = newValue);
    } else if (type === 'candidate') {
      const newValue = !allCandidateSelected.value;
      tempCandidateItems.value.forEach(item => item.selected = newValue);
    }
  };