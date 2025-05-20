import { fetchData } from './apiService.js';
import { ref } from 'vue';

// 操作类型常量
export const ACTION_TYPES = {
  // 课程相关
  ADD_COURSES: 'ADD_COURSES',
  TOGGLE_COURSE_CHECKBOX: 'TOGGLE_COURSE_CHECKBOX',
  TOGGLE_COURSE_FOLD: 'TOGGLE_COURSE_FOLD',
  TOGGLE_COURSE_DISPLAY: 'TOGGLE_COURSE_DISPLAY',
  TOGGLE_ALL_COURSES_FOLD: 'TOGGLE_ALL_COURSES_FOLD',
  
  // 课程表相关
  TOGGLE_SCHEDULE_VIEW: 'TOGGLE_SCHEDULE_VIEW',
  CLICK_COURSE_IN_SCHEDULE: 'CLICK_COURSE_IN_SCHEDULE',
  REMOVE_COURSE_FROM_SCHEDULE: 'REMOVE_COURSE_FROM_SCHEDULE',
  
  // 特征表格相关
  APPLY_FEATURE_FILTER: 'APPLY_FEATURE_FILTER',
  REMOVE_FEATURE_FILTER: 'REMOVE_FEATURE_FILTER',
  
  // 方案导航相关
  NAVIGATE_SOLUTION: 'NAVIGATE_SOLUTION',
  
  // 偏好管理相关
  SAVE_SOLUTION: 'SAVE_SOLUTION',
  SOLVE_PROBLEM: 'SOLVE_PROBLEM',
  SWITCH_ACTIVE_NODE: 'SWITCH_ACTIVE_NODE',
  
  // 对话相关
  SEND_MESSAGE: 'SEND_MESSAGE',
  UPDATE_PROBLEM_MODEL: 'UPDATE_PROBLEM_MODEL',
  SAVE_FEATURE_EXPRS: 'SAVE_FEATURE_EXPRS',
  
  // 新增操作类型
  UPDATE_SELECTED_COURSES: 'UPDATE_SELECTED_COURSES', // 用户更新选中的课程
};

// 用户操作日志
export const userActionLog = ref([]);

// 记录用户操作
export const logUserAction = async (actionType, actionData = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      console.error('Session ID not found for logging action');
      return;
    }
    
    const logData = {
      sessionId,
      timestamp,
      actionType,
      actionData
    };
    
    console.log('Logging user action:', logData);
    
    // 发送日志到后端
    await fetchData('http://127.0.0.1:8010/log_user_action', 'POST', logData);

    const logEntry = {
      timestamp,
      actionType,
      data: actionData
    };

    userActionLog.value.push(logEntry);
    
    // 开发环境下在控制台输出日志
    if (process.env.NODE_ENV === 'development') {
      console.log('User Action:', logEntry);
    }
  } catch (error) {
    console.error('Error logging user action:', error);
  }
}; 