import {ref, computed, watch} from 'vue'
import { currentPreference, updatePreferenceCandidateItems, updatePreferenceSolutions, updatePreferenceDescription, clearModifiedPanel } from './preferenceService';
import { messages, processResponseMessage } from './messageService';
import { setBaseSolutionForBackend } from './apiService';
import { addNewNode, getFeatureDisplay } from './modelNodeService';
import { logUserAction, ACTION_TYPES } from './userActionLogService';
import { toggleConstraint } from './modifiedPanelService';
import { toggleshowAllCourses } from './scheduleService';
import { candidateItems_selected } from './coursesService';

// 先定义 ref，后面再赋值
export const solutions = ref([]);
export const filteredSolutions = ref([]);
export const currentSolutionIndex = ref(0);

// 在组件挂载后或者适当的时机调用此函数初始化
export function initializeSolutionService() {
  // 在这里访问 currentPreference
  solutions.value = currentPreference.value?.solutionResults?.solutions || [];
  filteredSolutions.value = solutions.value || [];
  currentSolutionIndex.value = currentPreference.value?.currentSolutionIndex;
  
  // 添加监听
  watch(() => currentPreference.value?.solutionResults, () => {
    solutions.value = currentPreference.value?.solutionResults?.solutions || [];
  });
  watch(() => currentPreference.value?.currentSolutionIndex, () => {
    updateCandidateItems();
  })
}

export const solutionsNum = computed(() => {
  return solutions.value ? solutions.value.length : 0;
});

export const is_confirmed = ref(false);
export const is_checked_closest = ref(false)

// 添加一个变量来跟踪上一个方案中的课程
export const previousSolutionCourses = ref(new Set());

// 当 solutions 变化时，初始化 previousSolutionCourses
watch(solutions, (newSolutions) => {
  filteredSolutions.value = newSolutions; // 保证 filteredSolutions 同步更新
  
  // 如果有解决方案，初始化 previousSolutionCourses 为第一个方案的课程
  if (newSolutions && newSolutions.length > 0) {
    initializePreviousSolutionCourses(0);
  } else {
    previousSolutionCourses.value = new Set();
  }
}, { immediate: true });

watch(filteredSolutions, () => {
  currentPreference.value.currentSolutionIndex = 0;
  updateCandidateItems();
});



// 初始化 previousSolutionCourses 的函数
export const initializePreviousSolutionCourses = (solutionIndex) => {
  const solution = filteredSolutions.value[solutionIndex];
  if (!solution) {
    previousSolutionCourses.value = new Set();
    return;
  }
  
  // 获取当前方案中选中的课程
  const currentCourses = new Set();
  
  // 遍历所有课程，找出被选中的课程
  currentPreference.value.candidateItems.forEach(course => {
    if (course.chosen) {
      currentCourses.add(`${course['课程名']}-${course['主讲教师']}-${course['上课时间']}`);
    }
  });
  
  previousSolutionCourses.value = currentCourses;
};

export const confirmSolution = async() => {
  // 修改currentPreference，并且生成一个新的node
  // 记录保存方案操作
  logUserAction(ACTION_TYPES.SAVE_SOLUTION, {
    nodeId: currentPreference.value.id,
    solutionIndex: currentPreference.value.currentSolutionIndex,
    solutions: [filteredSolutions.value[currentPreference.value.currentSolutionIndex]]
  });
  // 创建一个新的节点，包含当前选中的方案
  const newSolutionResults = {
    status: "OPTIMAL", 
    solutionNum: 1,
    solutions: [filteredSolutions.value[currentPreference.value.currentSolutionIndex]]
  };
  
  updateCandidateItems();
  
  // 更新新节点的solutionResults
  updatePreferenceSolutions(newSolutionResults);
  updatePreferenceCandidateItems(true);
  
  // 将features转化为文本描述
  const features = filteredSolutions.value[currentPreference.value.currentSolutionIndex]?.features || {};
  let description = ''
  description = Object.entries(features).reduce((acc, [key, value]) => {
    const displayKey = getFeatureDisplay(key);
    return acc + `${displayKey}: ${value} `;
  }, '');
  let featureText = '';
  Object.entries(features).forEach(([key, value]) => {
    if (key === 'total_courses') return;
    const displayKey = getFeatureDisplay(key);
    featureText += `，${displayKey}为 ${value} `;
  });
  description = `已保存当前课表。 一共选择了${candidateItems_selected.value}门课，其中必修课有${currentPreference.value.requiredCourses.length}门。`;
  if(featureText) description += `此外${featureText}。`;
  console.log("updatePreferenceDescription", description)
  addNewNode(true);
  clearModifiedPanel();
  currentPreference.value.currentSolutionIndex = 0;
  currentPreference.value.isIncremental = true;
  updatePreferenceDescription(description);
  toggleshowAllCourses(false);
};

export const setBaseSolution = async() => {
  is_checked_closest.value = true
  const currentSolution = filteredSolutions.value[currentPreference.value.currentSolutionIndex] || {};
  const requestData = {
    currentSolution: currentSolution,
    currentSolutionResult: currentPreference.value.solutionResults,
  }
  const response = await setBaseSolutionForBackend(requestData)
  processResponseMessage(response)
}

// 计算当前解的总数
export const filteredSolutionsNum = computed(() => {
  // 保护，确保 filteredSolutions 有值
  const numFilteredSolutions = filteredSolutions.value ? filteredSolutions.value.length : 0;
  console.log("solutions", solutions)
  console.log("filteredSolutions", filteredSolutions)
  console.log("filteredSolutionsNum", numFilteredSolutions);
  return numFilteredSolutions;
});

// 计算显示的解
export const displayedSolutions = computed(() => {
  const solutions = filteredSolutions.value; // 从 filteredSolutions 获取解
  if (!solutions) return { solutions: [], startIndex: 0 };
  const total = solutions.length;
  if (total <= 10) {
    return { solutions, startIndex: 0 };
  }

  let start = 0;
  let end = 10;

  if (currentPreference.value.currentSolutionIndex >= 10) {
    start = currentPreference.value.currentSolutionIndex - 9;
    end = currentPreference.value.currentSolutionIndex + 1;
    if (end > total) {
      end = total;
      start = total - 10;
    }
  }

  return { solutions: solutions.slice(start, end), startIndex: start };
});


  // 导航到上一个解
export const goToPreviousSolution = () => {
    if (currentPreference.value.currentSolutionIndex > 0) {
      currentPreference.value.currentSolutionIndex--;
      updateCandidateItems();  // 每次索引变化时更新 candidateItems
      logUserAction(ACTION_TYPES.NAVIGATE_SOLUTION, {
        direction: 'previous',
        currentIndex: currentPreference.value.currentSolutionIndex
      });
    }
  };

  // 导航到下一个解
export const goToNextSolution = () => {
    if (currentPreference.value.currentSolutionIndex < filteredSolutionsNum.value - 1) {
      currentPreference.value.currentSolutionIndex++;
      updateCandidateItems();  // 每次索引变化时更新 candidateItems
      logUserAction(ACTION_TYPES.NAVIGATE_SOLUTION, {
        direction: 'next',
        currentIndex: currentPreference.value.currentSolutionIndex
      });
    }
  };



// 更新选中的课程项
export const updateCandidateItems = () => {
  // 首先确保 filteredSolutions 存在且有值
  if (!filteredSolutions.value || filteredSolutions.value.length === 0) {
    return;
  }

  // 创建一个字典来存储每个课程的出现次数
  const courseCounts = {};
  
  // 遍历所有解决方案
  filteredSolutions.value.forEach(solution => {
    const variables = solution && solution.Variables ? solution.Variables : {};
    
    // 遍历所有变量
    Object.entries(variables).forEach(([varName, value]) => {
      // 只处理取值为1的变量（被选中的课程）
      if (value === 1.0) {
        // 如果课程不存在于统计字典中，初始化计数为1
        if (!courseCounts[varName]) {
          courseCounts[varName] = 1;
        } else {
          // 如果课程已存在，增加计数
          courseCounts[varName]++;
        }
      }
    });
  });
  
  // 更新 candidateItems 中的 count 属性
  currentPreference.value.candidateItems.forEach(item => {
    // 构建与 variables 中相同格式的键
    const key = `x_${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`;
    
    // 更新 num 属性，如果不存在则设为0
    item.num = courseCounts[key] || 0;
  });
  
  // 更新当前解决方案中的选中状态
  const currentSolution = filteredSolutions.value[currentPreference.value.currentSolutionIndex];
  if (currentSolution) {
    const variables = currentSolution.Variables || {};
    
    currentPreference.value.candidateItems.forEach(item => {
      const key = `x_${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`;
      item.chosen = variables[key] === 1.0;
    });
  }
  
  // console.log("已更新课程选中次数和选中率");
  // console.log("candidateItems", currentPreference.value.candidateItems)
};


export const handleFilterChange = (featureName, inputType) => {
  applyFilter();
  updatePreferenceDescription('');
  
  // 记录特征筛选变更
  logUserAction(ACTION_TYPES.APPLY_FEATURE_FILTER, {
    feature: featureName,
    operation: filters.value[featureName].operation,
    value: filters.value[featureName].value,
    inputType: inputType // 'value' 或 'operation'
  });
};

export const applyFilter = () => {
  // 确保 solutions.value 是数组
  if (!Array.isArray(solutions.value)) {
    filteredSolutions.value = [];
    return;
  }
  
  // 第一步：根据 filters 进行筛选
  let filtered = solutions.value.filter(solution => {
    return Object.keys(filters.value).every(filterKey => {
      const filter = filters.value[filterKey];
      // 如果值为空，不进行筛选
      if (filter.value === '' || filter.value === null) {
        return true;
      }
      
      // 根据操作符筛选
      if (filter.operation === 'equal') {
        return solution.features[filterKey] === filter.value;
      } else if (filter.operation === 'notEqual') {
        return solution.features[filterKey] !== filter.value;
      } else if (filter.operation === 'greaterThanOrEqual') {
        return solution.features[filterKey] >= filter.value;
      } else if (filter.operation === 'greaterThan') {
        return solution.features[filterKey] > filter.value;
      } else if (filter.operation === 'lessThanOrEqual') {
        return solution.features[filterKey] <= filter.value;
      } else if (filter.operation === 'lessThan') {
        return solution.features[filterKey] < filter.value;
      } else if (filter.operation === 'item') {
        return solution.Variables[filterKey] === filter.value;
      }
      
      return true;
    });
  });
  
  console.log(`第一步筛选后的解决方案数量: ${filtered.length}`);
  
  // 第二步：根据 candidateItems 的 selected 状态进行筛选
  if (currentPreference.value.candidateItems && currentPreference.value.candidateItems.length > 0) {
    // 获取所有 selected 为 false 的项目
    const unSelectedCandidateItems = currentPreference.value.candidateItems.filter(item => item.selected === false);
    
    if (unSelectedCandidateItems.length > 0) {
      console.log(`发现 ${unSelectedCandidateItems.length} 个未选中的项目`);
      
      // 进一步筛选解决方案
      filtered = filtered.filter(solution => {
        const variables = solution.Variables || {};
        
        // 检查每个未选中的项目
        for (const item of unSelectedCandidateItems) {
          const key = `x_${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`;
          
          // 如果解决方案中该项目的值为1，则过滤掉这个解决方案
          if (variables[key] === 1) {
            return false;
          }
        }
        
        // 所有未选中的项目都不在这个解决方案中，保留它
        return true;
      });
      
      console.log(`第二步筛选后的解决方案数量: ${filtered.length}`);
    }
  }
  
  // 更新过滤后的解决方案
  filteredSolutions.value = filtered;
  updateCandidateItems();
  
  // 重置当前解决方案索引
  currentPreference.value.currentSolutionIndex = 0;
  
  // 记录过滤操作
  logUserAction(ACTION_TYPES.APPLY_FILTER, {
    filtersCount: Object.keys(filters.value).length,
    unSelectedCandidateItemsCount: currentPreference.value.candidateItems ? currentPreference.value.candidateItems.filter(item => item.selected === false).length : 0,
    beforeCount: solutions.value.length,
    afterCount: filteredSolutions.value.length
  });
};


// 存储每个特征的筛选条件
export const filters = ref({});
// 存储是否显示筛选菜单
export const filterMenus = ref({});


// 打开筛选菜单
export const openFilterMenu = (featureName) => {
  // 如果 filters[featureName] 为空，初始化为默认筛选对象
  if (!filters.value[featureName]) {
    filters.value[featureName] = { operation: 'equal', value: null }; // 默认操作为 'equal'
  }
  if (!filterMenus.value[featureName]) {
    filterMenus.value[featureName] = false; // 默认不显示菜单
  }
  filterMenus.value[featureName] = !filterMenus.value[featureName];  // 切换菜单显示状态
};




// 移除筛选条件
export const removeFilter = (featureName) => {
  delete filters.value[featureName];
  filterMenus.value[featureName] = false;  // 关闭筛选菜单
  applyFilter();  // 重新应用筛选
  logUserAction(ACTION_TYPES.REMOVE_FEATURE_FILTER, {
    filter: filters.value[featureName]
  });
};

export const translateOperation = (operation, type) => {
  const operationMap = {
    equal: '等于',
    notEqual: '不等于',
    greaterThanOrEqual: '大于等于',
    greaterThan: '大于',
    lessThanOrEqual: '小于等于',
    lessThan: '小于'
  };
  const operationMap2 = {
    equal: '=',
    notEqual: '!=',
    greaterThanOrEqual: '>=',
    greaterThan: '>',
    lessThanOrEqual: '<=',
    lessThan: '<'
  };
  if(type === 0){
    return operationMap[operation];
  }else if(type === 1){
    return operationMap2[operation];
  }else{
    return operation;
  }
};
   // 自定义排序函数
export const customSort = (a, b) => {
  // 如果 a 或 b 是 'similarity'，则将 'similarity' 放在最后
  if (a === 'similarity') return 1;
  if (b === 'similarity') return -1;

  // 如果 a 或 b 以 'obj' 开头，则将 'obj' 开头的键放在前面
  if (a.startsWith('obj')) return -1;
  if (b.startsWith('obj')) return 1;

  // 其他情况按字母顺序排序
  return 0;
};

export const orderedFeaturesName = (features) =>{
  // 获取所有键
  const keys = Object.keys(features);
  const sortedKeys = keys.sort(customSort);
  return sortedKeys
}


// 添加 features_statistics 计算属性
export const features_statistics = computed(() => {
  const statistics = {};
  
  // 如果没有解决方案，返回空对象
  if (!filteredSolutions.value || filteredSolutions.value.length === 0) {
    return statistics;
  }

  // 遍历所有解决方案
  filteredSolutions.value.forEach(solution => {
    // 获取该解决方案的所有特征
    const features = solution.features;
    
    // 遍历每个特征
    Object.entries(features).forEach(([featureName, featureValue]) => {
      // 如果这个特征还没有统计信息，初始化一个空对象
      if (!statistics[featureName]) {
        statistics[featureName] = {};
      }
      
      // 将特征值转换为字符串，以确保可以作为对象的键
      const valueKey = String(featureValue);
      
      // 统计该特征值出现的次数
      statistics[featureName][valueKey] = (statistics[featureName][valueKey] || 0) + 1;
    });
  });

  return statistics;
});