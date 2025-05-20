<!-- src/components/Step2.vue -->
<template>
    <div class="step step-2">
      <div class="chat-and-panels">
        <!-- 左侧：收藏夹 -->
        <div class="selected-items-panel">
          <h3>Candidate Courses
            <div style="display: inline-flex; align-items: center;">
              <button @click="addItems" class="add-course-btn">Add</button>

              <!-- 添加折叠/展开所有课程的按钮 -->
              <button 
                class="toggle-all-btn"
                @click="toggleAllCoursesFold"
                :title="isAllCoursesFolded ? '展开所有课程' : '折叠所有课程'"
              >
                {{ isAllCoursesFolded ? '▶' : '▼ ' }}
              </button>
              <button @click="toggleshowAllCourses()" class="filter-button">
                <img v-if="currentMode === DISPLAY_MODES.ALL" src="../assets/all.svg" width="16" height="16" alt="check" />
                <img v-else-if="currentMode === DISPLAY_MODES.CHOSEN" src="../assets/chosen.svg" width="16" height="16" alt="check" />
                <img v-else-if="currentMode === DISPLAY_MODES.IMPORTANT" src="../assets/important.svg" width="16" height="16" alt="check" />
                <img v-else src="../assets/cancle.svg" width="16" height="16" alt="cancel" />
              </button>
            </div>

            <span :style="{fontSize: '12px'}">  <br> {{ candidateItems_courses_selected.length }}/{{ candidateItems_selected }} </span>
          </h3>

          <div class="selected-items-table-container">
            <table>
              <thead>
                <tr v-if="!isAllCoursesFolded">
                  <th>
                    <input 
                      type="checkbox" 
                      :checked="allCandidateSelected"
                      :indeterminate.prop="someCandidateSelected && !allCandidateSelected"
                      @change="toggleSelectAll('selected')"
                    />
                  </th>
                  <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="courseName in Array.from(allCourses)" :key="courseName">
                  <!-- 课程组标题行 -->
                  <tr class="course-group-header">
                    <td style="text-align: left">
                      <input type="checkbox" 
                        :checked="currentPreference.candidateItems.filter(item => item['课程名'] === courseName).every(item => item.selected)"
                        :indeterminate="currentPreference.candidateItems.filter(item => item['课程名'] === courseName).some(item => item.selected) && !currentPreference.candidateItems.filter(item => item['课程名'] === courseName).every(item => item.selected)"
                        @change="(e) => currentPreference.candidateItems.filter(item => item['课程名'] === courseName).forEach(item => {
                          item.selected = e.target.checked;
                          toggleCourse(item);
                        })"
                      />
                    </td>
                    <td colspan="100%" style="text-align: left">
                      <div class="course-group-controls">
                        <span 
                          class="course-group-btn"
                          :style="{ fontWeight: currentPreference.candidateItems.filter(item => item['课程名'] === courseName).some(item => item.chosen) ? 'bold' : 'normal' }"          
                        >
                          {{ courseName }} 
                        </span>

                        <!-- 折叠/展开按钮 -->
                        <button 
                          class="toggle-fold-btn"
                          @click="toggleCourseFold(courseName)"
                        >
                          {{ isCourseFolded(courseName) ? '▶' : '▼' }}
                        </button>

                        <!-- 查看/取消查看按钮 -->
                        <button @click="toggleCourseDisplay(courseName)" class="toggle-fold-btn">
                          <img v-if="getCourseDisplayStatus(courseName) === DISPLAY_MODES.ALL" src="../assets/all.svg" width="16" height="16" alt="check" />
                          <img v-else-if="getCourseDisplayStatus(courseName) === DISPLAY_MODES.CHOSEN" src="../assets/chosen.svg" width="16" height="16" alt="check" />
                          <img v-else-if="getCourseDisplayStatus(courseName) === DISPLAY_MODES.IMPORTANT" src="../assets/important.svg" width="16" height="16" alt="check" />
                          <img v-else src="../assets/cancle.svg" width="16" height="16" alt="cancel" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- 该课程组下的课程，根据折叠状态显示或隐藏 -->
                  <tr v-for="item in currentPreference.candidateItems.filter(item => item['课程名'] === courseName)" 
                      :key="item['课程名'] + item['上课时间']"
                      :class="[
                        'course-favorite',
                        {
                          'userSelected': item.userSelected,
                          'chosen': item.chosen,
                          'fixed': (item.num === filteredSolutionsNum ) && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                          'undecided': item.num > 0 && item.num < filteredSolutionsNum && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                          'blocked': (item.num === 0 || item.num === null || item.num === none) && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                          'added': isAdded(item),
                          'deleted': isDeleted(item),
                        }
                      ]"
                      v-show="!isCourseFolded(courseName)"
                      @click="selectCourse(item)"
                  >
                    <td>
                      <input type="checkbox" 
                        v-model="item.selected"
                        @change="toggleCourse(item)" />
                    </td>
                    <td v-for="(header, idx) in headers" :key="idx" >
                      {{ item[header] }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
  
        
  
        <!-- 中间：求解结果 -->
        <div class="solution-results-panel">
          <h3>
            Timetable
          </h3>
          

          
          <div class="solution-content">
            <!-- 课程表部分 -->
            <div class="course-schedule" >
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px; min-width: 60px;">Period</th>
                    <th>MON</th>
                    <th>TUE</th>
                    <th>WED</th>
                    <th>THU</th>
                    <th>FRI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="period in periods" :key="period">
                    <td style="width: 60px; min-width: 60px;">{{ period }}</td>
                    <!-- 遍历每个时间段的课程 -->
                    <td v-for="day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']" :key="day">
                      <div v-for="course in schedule[period][day]" :key="course['课程名']">
                        <button 
                          :class="[
                            'course-button',
                            {
                              'chosen': course.chosen,
                              'userSelected': course.userSelected,
                              'fixed': (course.num === filteredSolutionsNum ) && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                              'undecided': course.num > 0 && course.num < filteredSolutionsNum && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                              'blocked': (course.num === 0 || course.num === null || course.num === none) && filteredSolutionsNum !== null && filteredSolutionsNum !== 0 ,
                              'added': isAdded(course),
                              'deleted': isDeleted(course),
                            }
                          ]"
                          @click="selectCourse(course)"
                          v-if="shouldDisplayCourse(course)"
                        >
                          <span 
                            style="position: absolute; 
                                   top: 50%; 
                                   transform: translateY(-50%);
                                   right: 2px; 
                                   font-size: 8px;"
                            v-if="filteredSolutionsNum === solutionsNum "
                          >
                            <!-- {{ course['num'] }} -->
                          </span>
                          {{ course['课程名'] }}<br>({{ course['主讲教师'] }})<br>{{ course['上课时间'] }}

                            <!-- 删除按钮触发区域 -->
                            <div 
                              class="delete-trigger-area"
                              @mouseenter="showDeleteBtn = true"
                              @mouseleave="showDeleteBtn = false"
                            ></div>

                          <!-- 删除按钮 "x"，初始隐藏 -->
                          <span 
                            class="delete-btn"
                            @click.stop="removeCourse(course)"
                          >
                            x
                          </span>

                          <!-- 条件渲染勾，使用绝对定位将勾放置在右下角 -->
                          <span v-if="course.userSelected" class="checkmark">✔</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- 求解结果列表部分 -->
            <div class="solution-results">
              <div class="solution-content-list" v-if="currentPreference?.solutionResults">
              <!-- 第一行：状态显示 -->
                <!-- <div v-if="currentSolutionResult.status === 'OPTIMAL'" class="solution-summary">
                  得到 {{ currentSolutionResult.solutionNum }} 个可行解
                </div> -->

                <!-- 特征描述 -->
                <div class="constraints-section" >
                <table class="solutions-table">
                  <thead>
                    <tr>
                      <th>Features</th>
                      <th style="width: 200px;">Distribution</th>
                      <th v-for="(solution, index) in displayedSolutions.solutions" :key="displayedSolutions.startIndex + index">
                         {{ displayedSolutions.startIndex + index + 1 }}
                      </th>
                        <!-- 固定宽度 -->
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="featureName in orderedFeaturesName(selectedFeatures)" :key="featureName" >
                      <td class="feature-name" 
                          @click="openFilterMenu(featureName)" 
                          :style="{ color: '#1a73e8' }"
                      >
                        {{ getFeatureDisplay(featureName) }}
                        <!-- 显示筛选菜单 -->
                        <div v-if="filterMenus[featureName]" class="filter-menu" @click.stop>
                          <label>筛选：</label>
                          <select v-model="filters[featureName].operation" @change="handleFilterChange(featureName, 'operation')"  style="width: 70px">
                            <option value="equal">等于</option>
                            <!-- <option value="notEqual">不等于</option> -->
                            <option value="greaterThanOrEqual">大于等于</option>
                            <option value="lessThanOrEqual">小于等于</option>
                          </select>
                          <input type="number" v-model="filters[featureName].value" @input="handleFilterChange(featureName, 'value')"  @click.stop style="width: 40px"/>
                          <button @click="removeFilter(featureName)" style="width: 20px; color: red">×</button>
                        </div>
                      </td>
                      <td class="histogram-cell">
                        <div class="histogram-container">
                          <template v-if="features_statistics[featureName]">
                            <div 
                              v-for="(count, value) in features_statistics[featureName]" 
                              :key="value"
                              class="histogram-column"
                            >
                              <div class="histogram-bar"
                                :style="{
                                  height: `${(count / filteredSolutionsNum) * 10}px`,
                                  backgroundColor: generateDynamicColor(featureName),
                                  width: '13px',
                                  position: 'relative',
                                  padding: '0px'
                                }"
                                :title="value"
                              >
                                <div class="bar-value">{{ count }}</div>
                              </div>
                              <div class="x-label">{{ value }}</div>
                            </div>
                          </template>
                        </div>
                      </td>
                      <td v-for="(solution, index) in displayedSolutions.solutions" 
                          :key="displayedSolutions.startIndex + index"
                          :class="{ 'current-solution': displayedSolutions.startIndex + index === currentPreference.currentSolutionIndex }">
                        {{ solution.features[featureName] }}
                      </td>
                    </tr>
                    
                    <!-- 添加雷达图行 -->
                    <tr class="radar-chart-row" v-if="false">
                      <td class="feature-name">雷达图</td>
                      <td class="histogram-cell">
                        <!-- 保持为空 -->
                      </td>
                      <td v-for="(solution, index) in displayedSolutions.solutions" 
                          :key="displayedSolutions.startIndex + index"
                          class="radar-chart-cell"
                          @mouseenter="showLargeChart(index, $event)"
                          @mouseleave="hideLargeChart">
                        <canvas :ref="el => { if (el) spiderChartRefs[index] = el }"></canvas>
                      </td>
                      
                    </tr>
                  </tbody>
                </table>
              </div>

                <!-- <div class="constraints-section" v-if="currentSolutionResult.solutions?.[currentPreference.currentSolutionIndex]?.Constraints">
                  <h4>约束满足情况:</h4>
                  <div 
                    v-for="(constraintDetail, constraintName) in currentSolutionResult?.solutions?.[currentPreference.currentSolutionIndex]?.Constraints" 
                    :key="constraintName" 
                    class="constraint-pair"
                  >
                    <template v-if="!constraintDetail.constrName.includes('必修课') && !constraintDetail.constrName.includes('必须上')">
                      <div class="constraint-key">{{ constraintDetail.constrName }}</div>
                      <div class="constraint-value" v-if="constraintDetail.constrName.includes('上课时间') && constraintDetail.constrName.includes('只能选一节课')">
                        {{ constraintDetail.lhs === 0 ? '没有课' : '有一节课' }}
                      </div>
                      <div class="constraint-value" v-else>lhs: {{ constraintDetail.lhs }}, rhs: {{ constraintDetail.rhs }}</div>
                    </template>
                  </div>
                </div> -->
              </div>

              <!-- 页码控件 -->
              <div class="solution-navigation" v-if="filteredSolutionsNum > 0">
                
                <button @click="goToPreviousSolution" :disabled="currentPreference.currentSolutionIndex === 0">previous</button>
                <span> {{ currentPreference.currentSolutionIndex + 1 }}  /  {{ filteredSolutionsNum }} </span>
                <button @click="goToNextSolution" :disabled="currentPreference.currentSolutionIndex >= filteredSolutionsNum - 1">next</button>
                <button @click="setBaseSolution" v-if="false"  >点击查看相近的方案</button>
                <button @click="removeFromSolutionResultsHistory" v-if="is_checked_closest">取消查看相近的方案</button>
              </div>


              
              
            </div>
            <!-- 分页控件 -->
            <div class="pagination" v-if="false">
              <button @click="goToPreviousPage" :disabled="currentPage === 0">上一轮</button>
              <span>第 {{ currentPage + 1 }} 轮 / 共 {{ totalPages }} 轮结果</span>
              <button @click="goToNextPage" :disabled="currentPage >= totalPages - 1">下一轮</button>
            </div>
            

            
          </div>
        </div>

        <!-- 右边：对话框 -->
        <div class="chat-box">
          <h3 style="display: flex; align-items: center;">
            <span>Preference Setting</span>
            <button @click="showEnlargedGraph" class="enlarge-button" style="margin-left: 10px;">
              <span class="enlarge-icon" style="display: flex; align-items: center;">🔍 View History</span>   
            </button>
          </h3>

          <!-- <ModelNodeGraph ref="modelNodeGraphRef"/> -->
          <Preference />
           
          <h3>Dialog</h3>
          <div class="messages" ref="messagesContainer">
            <!-- 遍历显示消息 -->
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message', msg.sender === 'You' ? 'user-message' : (msg.type === 'problemModel' ? 'problem-model-message' : msg.type === 'addedFeatureExprs' ? 'added-feature-exprs-message' : 'bot-message')]"
            >
              <Message :msg="msg" />
            </div>
          </div>
          <div class="input-box">
            <!-- 用户输入框 -->
            <input
              v-model="userMessage"
              @keydown.enter="sendMessage"
              placeholder="Type a message..."
            />
            <button @click="sendMessage">Send</button>
          </div>
        </div>
      </div>
  
      <!-- 步骤控制按钮 -->
      <div class="step-navigation" v-if="false">
        <button @click="goToPreviousStep" class="back-btn">
          上一页
        </button>
      </div>
    </div>

    <!-- 添加弹出层 -->
    <div v-if="hoveredChart.show" 
         class="large-chart-popup"
         :style="{ left: hoveredChart.x + 'px', top: hoveredChart.y + 'px' }">
      <canvas ref="largeChartRef"></canvas>
    </div>

    <!-- 放大查看ModelNodeGraph的弹出层 -->
    <div v-if="enlargedGraphVisible" class="enlarged-graph-overlay" @click="hideEnlargedGraph">
      <div class="enlarged-graph-container" @click.stop>
        <div class="enlarged-graph-header">
          <h3>问题建模视图</h3>
          <button @click="hideEnlargedGraph" class="close-button">×</button>
        </div>
        <div class="enlarged-graph-content">
          <!-- 使用 v-if 确保组件完全重新创建 -->
          <div v-if="enlargedGraphVisible" class="enlarged-graph-wrapper">
            <ModelNodeGraph ref="enlargedModelNodeGraphRef" class="enlarged-model-node-graph" />
          </div>
        </div>
      </div>
    </div>

    <!-- 信息弹窗 - 使用从infoModel.js导入的状态变量 -->
    <InfoModal
      :show="showInfoModal"
      :title="modalTitle"
      @close="closeModal"
      @confirm="handleModalConfirm"
      :showConfirm="modalShowConfirm"
    >
      <div class="modal-info-content">
        {{ modalContent }}
      </div>
    </InfoModal>

    <!-- 使用新的课程选择弹窗组件 -->
    <CourseSelectionModal 
      :show="showAddCoursesModal"
      @close="closeAddCoursesModal"
      @confirm="handleConfirmAddCourses"
    />

  </template>
  
  <script setup>
  import { messages, userMessage, sendMessage, saveFeatureExprs, processResponseMessage } from '../logic/messageService.js';
  import { currentSolutionIndex, filteredSolutionsNum, goToPreviousSolution, goToNextSolution, displayedSolutions, solutions, applyFilter, openFilterMenu, removeFilter, filters, filterMenus, translateOperation, setBaseSolution, orderedFeaturesName, confirmSolution, is_checked_closest, features_statistics, updateCandidateItems, handleFilterChange, solutionsNum, filteredSolutions, previousSolutionCourses, initializePreviousSolutionCourses, initializeSolutionService } from '../logic/solutionService.js';
  import { currentPage, totalPages, goToPreviousPage, goToNextPage, } from '../logic/paginationService.js';
  import { periods, schedule, selectCourse, removeCourse, hascandidateItems, addToInputBox, removeItemFilter, removeNotSelectedCourse, toggleCourse, toggleCourseDisplay, courseDisplayControl, getCourseDisplayStatus, isCourseFolded, toggleCourseFold, toggleshowAllCourses, isAllCoursesFolded, toggleAllCoursesFold, DISPLAY_MODES, currentMode } from '../logic/scheduleService.js';
  import { headers, loadDefaultCSV } from '../logic/fileService.js';
  import { allCandidateSelected, someCandidateSelected, toggleSelectAll, hasAddedItems, candidateItems_courses_selected, candidateItems_selected, allCourses} from '../logic/coursesService.js';
  import { removeFromSolutionResultsHistory } from '../logic/historyService.js';
  import {ref, computed, watch, onMounted, onUpdated, nextTick, onBeforeUnmount } from 'vue';
  import Chart from 'chart.js/auto';
  import Message from './Message.vue';
  import { getFeatureDisplay, modelNodes, selectedFeatures } from '../logic/modelNodeService';
  import ModelNodeGraph from './ModelNodeGraph.vue'
  import Preference from './Preference.vue';
  import InfoModal from './InfoModal.vue';
  // 导入弹窗相关函数和状态
  import { showInfoModal, modalTitle, modalContent, modalShowConfirm, modalCallback, showModal, handleModalConfirm, closeModal} from '../logic/infoModel.js';
  // import csvPath from '../data/filtered_courses.csv?url';
  import csvPath from '../data/courses5.csv?url';
  import CourseSelectionModal from './CourseSelection.vue';
  import { sayHelloToBackend } from '../logic/apiService.js';
  import { logUserAction, ACTION_TYPES } from '../logic/userActionLogService.js';
  import { shouldDisplayCourse } from '../logic/scheduleService.js';
  import { currentPreference, updatePreferenceCoursesChange } from '../logic/preferenceService.js';


  // 在组件挂载时也滚动到底部
  onMounted(() => {
    loadDefaultCSV(csvPath);
    initializeSolutionService();    // 其他初始化代码...
    // initializeFirstNode();
    scrollMessagesToBottom();
 
  });


  // 预定义一组鲜明的基础颜色
  const baseColors = [
    '#FF0000', // 红色
    '#00FF00', // 绿色
    '#0000FF', // 蓝色
    '#FF00FF', // 洋红
    '#00FFFF', // 青色
    '#FFA500', // 橙色
    '#800080', // 紫色
    '#008000', // 深绿色
    '#000080', // 海军蓝
    '#FF4500', // 橙红色
    '#4B0082', // 靛蓝
    '#8B4513', // 马鞍棕色
    '#006400', // 深绿色
    '#483D8B', // 暗灰蓝
    '#FF1493', // 深粉色
  ];

  // 确保这个函数被导出和定义
  const generateDynamicColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return baseColors[Math.abs(hash) % baseColors.length];
  };

  // 存储图表实例的引用
  const charts = ref([]);

  // 规范化特征值到0-1之间
  const normalizeFeatureValue = (value, featureName, allSolutions) => {
    const values = allSolutions.map(s => s.features[featureName]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max === min ? 0.5 : (value - min) / (max - min);
  };

  // 添加 ref 数组来存储 canvas 引用
  const spiderChartRefs = ref([]);

  // 修改 updateSpiderCharts 函数
  const updateSpiderCharts = async () => {
    await nextTick();
    
    // 清除旧的图表
    charts.value.forEach(chart => chart?.destroy());
    charts.value = [];

    displayedSolutions.value.solutions.forEach((solution, index) => {
      const canvas = spiderChartRefs.value[index];
      if (!canvas) return;

      const featureNames = orderedFeaturesName(solution.features);
      const normalizedData = featureNames.map(name => 
        normalizeFeatureValue(solution.features[name], name, solutions.value)
      );

      const chart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: featureNames,
          datasets: [{
            data: normalizedData,
            fill: false,  // 关闭填充
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderColor: '#666',
            pointBackgroundColor: featureNames.map(name => generateDynamicColor(name)),
            pointBorderColor: featureNames.map(name => generateDynamicColor(name)),
            borderWidth: 0.5,
            pointRadius: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 1,
              ticks: {
                display: false
              },
              pointLabels: {
                display: false
              },
              angleLines: {
                display: true,
                color: '#ddd',
                lineWidth: 0.5
              },
              grid: {
                display: true,
                color: '#ddd',
                lineWidth: 0.5
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          },
          elements: {
            line: {
              borderWidth: 0.5,
              tension: 0
            },
            point: {
              radius: 2,
              hitRadius: 3,
              hoverRadius: 3
            }
          }
        }
      });
      
      charts.value.push(chart);
    });
  };

  // 修改 watch 函数，确保在数据变化时重新创建图表
  watch([displayedSolutions, solutions], () => {
    nextTick(() => {
      updateSpiderCharts();
    });
  }, { deep: true });


  // 添加悬停相关的状态
  const hoveredChart = ref({
    show: false,
    x: 0,
    y: 0,
    index: -1
  });

  const largeChartRef = ref(null);
  let largeChart = null;

  // 修改显示大图的函数
  const showLargeChart = (index, event) => {
    hoveredChart.value = {
      show: true,
      x: event.clientX + 10,
      y: event.clientY - 300,
      index: index
    };

    nextTick(() => {
      if (!largeChartRef.value) return;

      const solution = displayedSolutions.value.solutions[index];
      const featureNames = orderedFeaturesName(solution.features);
      const normalizedData = featureNames.map(name => 
        normalizeFeatureValue(solution.features[name], name, solutions.value)
      );

      if (largeChart) {
        largeChart.destroy();
      }

      largeChart = new Chart(largeChartRef.value, {
        type: 'radar',
        data: {
          labels: featureNames,
          datasets: [{
            data: normalizedData,
            fill: false,
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderColor: '#666',
            pointBackgroundColor: featureNames.map(name => generateDynamicColor(name)),
            pointBorderColor: featureNames.map(name => generateDynamicColor(name)),
            borderWidth: 1,
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 1,
              ticks: {
                display: false
              },
              pointLabels: {
                display: true,
                callback: (label, index) => {
                  // 显示特征名称和对应的原始值
                  const originalValue = solution.features[label];
                  return `${label}: ${originalValue}`;
                },
                font: {
                  size: 10
                }
              },
              angleLines: {
                display: true,
                color: '#ddd',
                lineWidth: 0.5
              },
              grid: {
                display: true,
                color: '#ddd',
                lineWidth: 0.5
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: (context) => {
                  const featureName = featureNames[context.dataIndex];
                  const originalValue = solution.features[featureName];
                  return `${featureName}: ${originalValue}`;
                }
              }
            }
          }
        }
      });
    });
  };

  // 隐藏大图
  const hideLargeChart = () => {
    hoveredChart.value.show = false;
    if (largeChart) {
      largeChart.destroy();
      largeChart = null;
    }
  };

  // 添加对话框容器的引用
  const messagesContainer = ref(null);

  // 滚动到对话框底部的函数
  const scrollMessagesToBottom = () => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  };

  // 监听消息变化，自动滚动到底部
  watch(messages, () => {
    nextTick(() => {
      scrollMessagesToBottom();
    });
  }, { deep: true });



  // 获取ModelNodeGraph组件的引用
  const modelNodeGraphRef = ref(null);
  const enlargedModelNodeGraphRef = ref(null);

  // 放大图表相关状态
  const enlargedGraphVisible = ref(false);

  // 修改显示放大的ModelNodeGraph函数
  const showEnlargedGraph = () => {
    console.log('显示放大图表');
    enlargedGraphVisible.value = true;
    document.body.style.overflow = 'hidden';
    
    // 使用 setTimeout 确保在 DOM 更新后再访问引用
    setTimeout(() => {
      console.log('弹出层显示后，enlargedModelNodeGraphRef:', enlargedModelNodeGraphRef.value);
      if (enlargedModelNodeGraphRef.value) {
        try {
          if (typeof enlargedModelNodeGraphRef.value.calculateTreeLayout === 'function' &&
              typeof enlargedModelNodeGraphRef.value.drawConnections === 'function') {
            enlargedModelNodeGraphRef.value.calculateTreeLayout();
            enlargedModelNodeGraphRef.value.drawConnections();
          } else {
            console.error('放大图表组件缺少必要的方法');
          }
        } catch (error) {
          console.error('访问放大图表组件方法时出错:', error);
        }
      } else {
        console.error('放大图表组件引用不存在');
      }
    }, 100); // 短暂延迟确保 DOM 已更新
  };

  // 修改隐藏放大的ModelNodeGraph
  const hideEnlargedGraph = () => {
    // 在隐藏前清除引用，防止访问已卸载的组件
    enlargedModelNodeGraphRef.value = null;
    enlargedGraphVisible.value = false;
    document.body.style.overflow = '';
  };

  // 控制弹窗显示的状态
  const showAddCoursesModal = ref(false);

  // 添加课程按钮的处理函数
  const addItems = () => {
    showAddCoursesModal.value = true;
  };

  // 关闭弹窗
  const closeAddCoursesModal = () => {
    showAddCoursesModal.value = false;
  };
  // 处理确认添加课程
  const handleConfirmAddCourses = (selectedCourses) => {
    // 将选中的课程添加到 candidateItems 中
    logUserAction(ACTION_TYPES.ADD_COURSES, {
      before_courses_num: currentPreference.value.candidateItems.length 
    });
    
    // 记录添加前的课程数量
    const beforeCount = currentPreference.value.candidateItems.length;
    
    // 获取这次添加的课程的课程名（在添加到candidateItems之前）
    const addedCourseNames = [...new Set(selectedCourses.filter(course => 
      !currentPreference.value.candidateItems.some(item => 
        item['课程名'] === course['课程名'] &&
        item['主讲教师'] === course['主讲教师'] && 
        item['上课时间'] === course['上课时间']
      )).map(item => item['课程名']))];
    
    // 添加课程
    selectedCourses.forEach(course => {
      if (!currentPreference.value.candidateItems.some(item => 
        item['课程名'] === course['课程名'] &&
        item['主讲教师'] === course['主讲教师'] && 
        item['上课时间'] === course['上课时间']
      )) {
        currentPreference.value.candidateItems.push(course);
        updatePreferenceCoursesChange(course, 'add');
      }
    });
    
    // 计算新增的课程数量
    const addedCount = currentPreference.value.candidateItems.length - beforeCount;
    
    logUserAction(ACTION_TYPES.ADD_COURSES, {
      after_courses_num: currentPreference.value.candidateItems.length,
      added_courses_num: addedCount
    });
    
    // 如果有新增课程，添加课程选择消息
    if (addedCount > 0) {
      // 创建课程选择消息
      messages.value.push({ 
        sender: 'Bot', 
        text: `您新增了${addedCount}节课程，请选择必修课程`, 
        type: 'addCourses',
        content: {
          addedCount: addedCourseNames.length,
          totalCount: selectedCourses.length, // 修改为这次添加的课程总数
          courses: addedCourseNames.map(name => ({
            name: name,
            isRequired: beforeCount === 0 // 如果是第一次添加课程，默认全选
          })),
          isFirstTime: beforeCount === 0
        },
        confirmed: false
      });
      
    }
    
    // 关闭弹窗
    closeAddCoursesModal();
  };

  // 在组件卸载前清理引用
  onBeforeUnmount(() => {
    // 清理所有组件引用
    modelNodeGraphRef.value = null;
    enlargedModelNodeGraphRef.value = null;
  });

  // 添加判断课程是否为"新增"的函数
  const isAdded = (course) => {
    if (currentPreference.value.id === 0) return false;
    
    return (currentPreference.value.isIncremental === true ) && 
           !course.chosen_when_confirmed && 
           course.chosen;
  };

  // 添加判断课程是否为"删除"的函数
  const isDeleted = (course) => {
    if (currentPreference.value.id === 0) return false;
    
    return (currentPreference.value.isIncremental === true ) && 
           course.chosen_when_confirmed && 
           !course.chosen;
  };

  // 监听当前方案索引的变化
  watch(currentSolutionIndex, (newIndex, oldIndex) => {
    if (oldIndex !== undefined && oldIndex !== newIndex) {
      // 获取当前方案中的课程
      const currentCourses = new Set();
      
      // 遍历课程表中的所有课程
      currentPreference.value.candidateItems.forEach(course => {
        if (course.chosen) {
          currentCourses.add(`${course['课程名']}-${course['主讲教师']}-${course['上课时间']}`);
        }
      });
      
      // 找出添加和删除的课程
      const addedCourses = [...currentCourses].filter(c => !previousSolutionCourses.value.has(c));
      const removedCourses = [...previousSolutionCourses.value].filter(c => !currentCourses.has(c));
      
      // 更新上一个方案的课程集合
      previousSolutionCourses.value = currentCourses;
      
      // 为变化的课程添加高亮类
      nextTick(() => {
        // 找到所有需要高亮的课程按钮
        const courseButtons = document.querySelectorAll('.course-button');
        courseButtons.forEach(button => {
          const courseText = button.textContent;
          // 检查这个按钮是否代表一个变化的课程
          const isChanged = [...addedCourses, ...removedCourses].some(changedCourse => {
            const [name, teacher, time] = changedCourse.split('-');
            return courseText.includes(name) && courseText.includes(teacher);
          });
          
          if (isChanged) {
            // 移除之前的动画类（如果有）
            button.classList.remove('highlight-change');
            // 触发重绘
            void button.offsetWidth;
            // 添加动画类
            button.classList.add('highlight-change');
          }
        });
      });
    }
  });

  // 当 filteredSolutions 变化时，重置 previousSolutionCourses
  watch(filteredSolutions, () => {
    // 重置当前解索引
    currentPreference.value.currentSolutionIndex = 0;
    // 初始化 previousSolutionCourses
    initializePreviousSolutionCourses(0);
  }, { immediate: true });



  // 获取显示模式的提示文本
  const getDisplayModeTitle = (courseName) => {
    const mode = getCourseDisplayStatus(courseName);
    switch (mode) {
      case DISPLAY_MODES.ALL:
        return '显示所有课程';
      case DISPLAY_MODES.CHOSEN:
        return '只显示已选课程';
      case DISPLAY_MODES.IMPORTANT:
        return '显示固定和未决定课程';
      default:
        return '不显示';
    }
  };

  </script>
  
  <style scoped>
  .solutions-table {
    width: 100%;
    border-collapse: collapse;
  }

  .solutions-table th,
  .solutions-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
    position: relative; /* 添加相对定位以支持边框样式 */
  }

  .histogram-cell {
    width: 200px;
    padding: 0px;
    vertical-align: middle;
  }

  .histogram-container {
    height: fit-content;
    padding: 0px;
    padding-bottom: 0px;
    padding-top: 11px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .histogram-bar {
    position: relative;
    transition: all 0.3s ease;
  }

  .bar-value {
    position: absolute;
    top: -10px;
    width: 100%;
    text-align: center;
    font-size: 8px;
  }

  .x-label {
    font-size: 8px;
    margin-top: 2px;  /* 给x-label添加一点上边距 */
    text-align: center;
  }

  .radar-chart-row {
    height: 60px; /* 设置行高 */
  }

  .radar-chart-cell {
    padding: 5px;
    height: 60px;
    position: relative;
    cursor: pointer; /* 添加指针样式 */
  }

  canvas {
    width: 50px !important;
    height: 50px !important;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  /* 修改当前选中方案的样式，只保留背景色 */
  .solutions-table td.current-solution {
    background-color: #e9eaeb;  /* 使用更柔和的浅蓝色背景 */
  }

  .large-chart-popup {
    position: fixed;
    z-index: 1000;
    background: white;
    padding: 15px;  /* 增加内边距 */
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
  }

  .large-chart-popup canvas {
    width: 300px !important;  /* 修改为更大的尺寸 */
    height: 300px !important; /* 修改为更大的尺寸 */
    position: static;
    transform: none;
  }

  .messages {
    height: 500px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    scroll-behavior: smooth; /* 添加平滑滚动效果 */
  }

  .enlarged-graph-overlay {
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

  .enlarged-graph-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 90%;
    height: 90%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
  }

  .enlarged-graph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
  }

  .enlarged-graph-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }

  .enlarged-graph-wrapper {
    width: 100%;
    height: 100%;
  }

  .enlarged-model-node-graph {
    height: 80vh !important; /* 覆盖原始组件的高度设置 */
    max-height: none !important;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }

  .close-button:hover {
    color: #000;
  }

  .enlarge-button {
    margin-left: 10px;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    transition: background-color 0.3s;
  }

  .enlarge-button:hover {
    background-color: #e0e0e0;
  }

  .enlarge-icon {
    margin-right: 4px;
    font-size: 14px;
  }

  /* 添加课程组控制相关样式 */
  .course-group-controls {
    display: flex;
    align-items: center;
    gap: 8px; /* 增加按钮之间的间距 */
    width: 100%; /* 确保控制区域占满整个宽度 */
    padding: 4px 0; /* 添加上下内边距 */
  }

  .course-group-btn {
    flex: 0.6;  /* 从1改为0.8，减小按钮的伸展比例 */
    text-align: left;
    margin-left: 0px;
    background: none;
    cursor: pointer;
    font-weight: bold;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: flex-start; /* 从space-between改为flex-start，保证文本左对齐 */
    transition: all 0.3s ease;
    max-width: 120px; /* 添加最大宽度限制 */
    overflow: hidden; /* 处理文本溢出 */
    text-overflow: ellipsis; /* 文本溢出时显示省略号 */
    white-space: nowrap; /* 防止文本换行 */
    font-size: 12px;
  }

  .course-group-btn:hover {
    background-color: #f5f5f5;
    border-color: #999; /* 鼠标悬停时边框颜色加深 */
  }

  .course-group-btn.active {
    color: green;
    border-color: green; /* 激活状态时边框颜色为蓝色 */
  }

  .visibility-icon {
    margin-left: 8px;
    font-size: 16px;
  }

  .toggle-all-btn {
    border: none;
    margin-left: 12px;
  }

  .toggle-fold-btn  {
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .toggle-fold-btn:hover {
    background: none;
  }

  .course-group-header {
    background-color: #f9f9f9;
  }

  .course-group-header:hover {
    background-color: #f0f0f0;
  }

  /* 调整现有样式 */
  .filter-button {
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 0px;
  }


  .course-display-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }

  .course-toggle-btn {
    padding: 4px 8px;
    background-color: #f1f1f1;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .course-toggle-btn.active {
    background-color: #e3f2fd;
    border-color: #1976D2;
    color: #1976D2;
  }

  .modal-info-content {
    white-space: pre-line;
    line-height: 1.5;
  }

  .info-btn {
    width: 22px;
    height: 22px;
    background: none;
    border: 1px solid #ccc;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    font-style: italic;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .info-btn:hover {
    background-color: #f0f0f0;
    border-color: #999;
    color: #333;
  }

  /* 添加闪烁动画 */
  @keyframes highlight-change {
    0% { background-color: rgba(255, 255, 0, 0.3); }
    50% { background-color: rgba(255, 255, 0, 0.7); }
    100% { background-color: rgba(255, 255, 0, 0.3); }
  }

  .highlight-change {
    animation: highlight-change 1.5s ease-in-out;
  }
  </style>
  
  