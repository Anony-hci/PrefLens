// src/logic/scheduleService.js
import { ref, computed, watch } from 'vue';
import { filters, applyFilter } from './solutionService';
import { allCourses } from './coursesService.js';
import { logUserAction, ACTION_TYPES } from './userActionLogService.js';
import { solutionsNum } from './solutionService';
import { currentPreference, updatePreferenceCoursesChange, updatePreferenceDescription } from './preferenceService.js';



export const periods = ref(['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6']);

// 为每个课程创建显示控制对象
export const courseDisplayControl = ref({});
// 为每个课程创建折叠控制对象
export const courseFoldState = ref({});


// 定义显示模式常量
export const DISPLAY_MODES = {
  NONE: 0,
  CHOSEN: 1,     // 只显示已选课程
  IMPORTANT: 2,  // 显示固定和未决定课程
  ALL: 3         // 显示所有课程
};

export const currentMode = ref(DISPLAY_MODES.ALL);

// 添加一个计算属性来安全访问 courseDisplayControl
export const getCourseDisplayStatus = (courseName) => {
  if (!courseDisplayControl.value[courseName]) {
    courseDisplayControl.value[courseName] = {
      displayMode: DISPLAY_MODES.ALL // 默认显示所有
    };
  }
  return courseDisplayControl.value[courseName].displayMode;
};

// 切换是否只显示选中课程的状态
export const toggleshowAllCourses = (auto = true) => {
  if (auto) {
    // 循环切换显示模式：CHOSEN -> IMPORTANT -> ALL -> NONE -> CHOSEN
    if (currentMode.value === DISPLAY_MODES.NONE) {
      currentMode.value = DISPLAY_MODES.CHOSEN;
    } else if (currentMode.value === DISPLAY_MODES.CHOSEN) {
      currentMode.value = DISPLAY_MODES.IMPORTANT;
    } else if (currentMode.value === DISPLAY_MODES.IMPORTANT) {
      currentMode.value = DISPLAY_MODES.ALL;
    } else if (currentMode.value === DISPLAY_MODES.ALL){
      currentMode.value = DISPLAY_MODES.NONE;
    } else {
      currentMode.value = DISPLAY_MODES.ALL;
    }
  } else {
    // 如果auto为false，直接设置为CHOSEN模式
    currentMode.value = DISPLAY_MODES.CHOSEN;
  }
  
  // 确保在更新courseDisplayControl之前先打印当前模式
  console.log("当前设置的显示模式:", currentMode.value);
  
  // 无论auto是什么值，都更新所有课程的显示模式为当前模式
  if (allCourses.value && allCourses.value.size > 0) {
    Array.from(allCourses.value).forEach(courseName => {
      if (!courseDisplayControl.value[courseName]) {
        courseDisplayControl.value[courseName] = {};
      }
      courseDisplayControl.value[courseName].displayMode = currentMode.value;
    });
  } else {
    console.warn("allCourses.value 为空或不是集合类型");
  }
  
  // 记录切换显示所有课程操作
  logUserAction(ACTION_TYPES.TOGGLE_SCHEDULE_VIEW, {
    displayMode: currentMode.value
  });
  
  // 打印更新后的状态
  console.log("更新后的显示模式:", currentMode.value);
  console.log("更新后的课程显示控制:", JSON.stringify(courseDisplayControl.value));
};

// 修改切换函数支持三种模式
export const toggleCourseDisplay = (courseName) => {
  // 初始化课程显示控制对象（如果不存在）
  if (!courseDisplayControl.value[courseName]) {
    courseDisplayControl.value[courseName] = {
      displayMode: DISPLAY_MODES.ALL
    };
  }
  
  // 循环切换显示模式： CHOSEN -> IMPORTANT -> ALL -> NONE -> CHOSEN
  const courseMode = courseDisplayControl.value[courseName].displayMode;
  let nextMode;

  if (courseMode === DISPLAY_MODES.NONE) {
    nextMode = DISPLAY_MODES.CHOSEN;
  } else if (courseMode === DISPLAY_MODES.CHOSEN) {
    nextMode = DISPLAY_MODES.IMPORTANT;
  } else if (courseMode === DISPLAY_MODES.IMPORTANT) {
    nextMode = DISPLAY_MODES.ALL;
  } else if (courseMode === DISPLAY_MODES.ALL){
    nextMode = DISPLAY_MODES.NONE;
  } else {
    nextMode = DISPLAY_MODES.ALL;
  }
  
  courseDisplayControl.value[courseName].displayMode = nextMode;
  
  logUserAction(ACTION_TYPES.TOGGLE_COURSE_DISPLAY, {
    courseGroup: courseName,
    displayMode: courseDisplayControl.value[courseName].displayMode
  });
};

// 检查是否所有课程都被折叠
export const isAllCoursesFolded = computed(() => {
  return Array.from(allCourses.value).every(courseName => isCourseFolded(courseName));
});



// 检查课程是否被折叠
export const isCourseFolded = (courseName) => {
  if (courseFoldState.value[courseName] === undefined) {
    courseFoldState.value[courseName] = true; // 默认折叠
  }
  return courseFoldState.value[courseName];
};

// 切换课程折叠状态
export const toggleCourseFold = (courseName) => {
  if (courseFoldState.value[courseName] === undefined) {
    courseFoldState.value[courseName] = true;
  }
  courseFoldState.value[courseName] = !courseFoldState.value[courseName];
  logUserAction(ACTION_TYPES.TOGGLE_COURSE_FOLD, {
    courseGroup: courseName,
    folded: isCourseFolded(courseName)
  });
};

// 添加一个函数来切换所有课程的折叠状态
export const toggleAllCoursesFold = () => {
  // 确定当前的整体状态：如果所有课程都已折叠，则展开所有；否则折叠所有
  const shouldExpand = isAllCoursesFolded.value;
  
  // 遍历所有课程并设置折叠状态
  Array.from(allCourses.value).forEach(courseName => {
    courseFoldState.value[courseName] = !shouldExpand;
  });
  
  // 记录切换所有课程折叠状态操作
  logUserAction(ACTION_TYPES.TOGGLE_ALL_COURSES_FOLD, {
    allFolded: !shouldExpand
  });
};

// 定义星期映射
const dayMap = {
  '1': 'monday',
  '2': 'tuesday',
  '3': 'wednesday',
  '4': 'thursday',
  '5': 'friday'
};

  // 定义节次映射
const periodMap = {
  '1': 'Period 1',
  '2': 'Period 2',
  '3': 'Period 3',
  '4': 'Period 4',
  '5': 'Period 5',
  '6': 'Period 6'
  };
  
// 创建一个 computed 属性来动态生成课程表
export const schedule = computed(() => {
  // 初始化课程表
  const scheduleData = {
    'Period 1': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    'Period 2': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    'Period 3': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    'Period 4': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    'Period 5': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    'Period 6': { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
  };


  // 遍历 candidateItems，将每个课程安排添加到课程表中
  currentPreference.value.candidateItems.forEach(item => {
    if(item.selected){
      const timeStr = item['上课时间'];
      const timeEntries = timeStr.split(';');

      timeEntries.forEach(timeEntry => {
        const match = timeEntry.match(/(\d+)-(\d+)\((.*?)\)/);
        if (match) {
          const dayNumber = match[1];
          const periodNumber = match[2];

          const dayName = dayMap[dayNumber];
          const periodName = periodMap[periodNumber];

          if (dayName && periodName) {
            // 将课程安排放入对应的时间段和星期
            scheduleData[periodName][dayName].push(item);
          }
        }
      });
    }
  });
  return scheduleData;
  
});

export const selectCourse = (item) => {
  updatePreferenceDescription('');

  // 在 candidateItems 中找到对应的课程并更新 userSelected 状态
  const course = currentPreference.value.candidateItems.find(
    (selectedItem) =>
      selectedItem['课程名'] === item['课程名'] &&
      selectedItem['主讲教师'] === item['主讲教师'] &&
      selectedItem['上课时间'] === item['上课时间']
  );
  
  if (course) {
    // 切换当前课程的 userSelected 状态
    course.userSelected = !course.userSelected;
    
    // 如果当前课程被选中，则删除同名但不同教师或时间的课程
    if (course.userSelected) {
      // 找出所有同名但不同教师或时间的课程
      const sameCourseNames = currentPreference.value.candidateItems.filter(
        (selectedItem) =>
          selectedItem['课程名'] === item['课程名'] &&
          (selectedItem['主讲教师'] !== item['主讲教师'] ||
           selectedItem['上课时间'] !== item['上课时间'])
      );
      
      sameCourseNames.forEach(sameNameItem => {
        sameNameItem.userSelected = false;
        const filterKey = "x_" + sameNameItem['课程名'] + "_" + sameNameItem['主讲教师'] + "_" + sameNameItem['上课时间'];
        delete filters.value[filterKey];
      });
    }
  }
  
  // 添加或删除当前课程的筛选条件
  const filterKey = "x_" + item['课程名'] + "_" + item['主讲教师'] + "_" + item['上课时间'];
  if (course && course.userSelected) {
    // 如果课程被选中，添加筛选条件
    filters.value[filterKey] = { operation: 'item', value: 1.0};
  } else {
    // 如果课程被取消选中，删除筛选条件
    delete filters.value[filterKey];
  }
  
  applyFilter();
  
  // 记录点击课程表中课程操作
  logUserAction(ACTION_TYPES.CLICK_COURSE_IN_SCHEDULE, {
    course: `${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`,
    userSelected: item.userSelected
  });
};

export const removeNotSelectedCourse = (item) => {
  const course = currentPreference.value.candidateItems.find(
    (selectedItem) =>
      selectedItem['课程名'] === item['课程名'] &&
      selectedItem['主讲教师'] === item['主讲教师'] &&
      selectedItem['上课时间'] === item['上课时间']
  );
  if (course) {
    course.selected = true;
  }
  removeNotItemFilter(item)
}

export const removeItemFilter = (filterKey) => {
  delete filters.value[filterKey];
  applyFilter();  // 重新应用筛选
}


// 计算是否有选中的课程
export const hascandidateItems = computed(() => {
  return currentPreference.value.candidateItems.some(item => item.userSelected); // 检查是否有 userSelected 为 true 的项
});

export const toggleCourse = (item) => {
  if (item.selected) {
    addCourse(item);
    updatePreferenceCoursesChange(item, 'add');
  } else {
    removeCourse(item);
    updatePreferenceCoursesChange(item, 'remove');
  }
  logUserAction(ACTION_TYPES.TOGGLE_COURSE_CHECKBOX, {
    course: `${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`,
    selected: item.selected
  });
};

export const addCourse = (item) => {
  removeNotItemFilter(item)
  
}

export const removeCourse = (course) => {
  // 将 candidateItems 中对应课程的 selected 设置为 false
  const item = currentPreference.value.candidateItems.find(item => item['课程名'] === course['课程名'] && item['主讲教师'] === course['主讲教师'] && item['上课时间'] === course['上课时间']);
  if (item) {
    item.selected = false;
    item.userSelected = false;
    item.chosen = false;
  }
  addNotItemFilter(item)
  applyFilter();
  
  // 记录移除课程操作
  logUserAction(ACTION_TYPES.REMOVE_COURSE_FROM_SCHEDULE, {
    course: `${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`
  });
};

// 将选中状态为 true 的课程项内容填充到输入框中
export const addToInputBox = () => {
  // 获取所有 userSelected 为 true 的课程
  const selectedCourses = currentPreference.value.candidateItems
    .filter(item => item.userSelected)
    .map(item => `${item['课程名']} (${item['主讲教师']}) - ${item['上课时间']}`);

  // 将选中的课程填充到输入框
  userMessage.value = "选择课程: " + selectedCourses.join(',');
};


export const addNotItemFilter = (item) => {
  const filterKey = "x_" + item['课程名'] + "_" + item['主讲教师'] + "_" + item['上课时间']
  delete filters.value[filterKey];
  filters.value[filterKey] = { operation: 'item', value: 0.0}
  applyFilter()
}

export const removeNotItemFilter = (item) => {
  const filterKey = "x_" + item['课程名'] + "_" + item['主讲教师'] + "_" + item['上课时间']
  delete filters.value[filterKey];
  applyFilter()
}

// 添加辅助函数来确定是否应该显示课程
export const shouldDisplayCourse = (course) => {
  const displayMode = getCourseDisplayStatus(course['课程名']);
  
  if (displayMode === DISPLAY_MODES.ALL) {
    return true;
  } else if (displayMode === DISPLAY_MODES.CHOSEN) {
    return course.chosen || course.userSelected;
  } else if (displayMode === DISPLAY_MODES.IMPORTANT) {
    
    // 检查 course.num 是否有效
    const courseNum = course.num !== undefined ? course.num : 0;
    
    // 显示固定和未决定的课程
    const isFixed = (courseNum === solutionsNum.value ) && solutionsNum.value > 0;
    const isUndecided = courseNum > 0 && courseNum < solutionsNum.value && solutionsNum.value > 0;
    
    return isFixed || isUndecided;
  }
  return false;
};
