<template>
  <div class="model-node-graph" ref="graphContainer">
    <div v-if="modelNodes.length === 0" class="no-nodes">
      暂无节点数据
    </div>
    <div class="nodes-container" ref="nodesContainer">
      <canvas ref="canvas" class="canvas-container"></canvas>
      <div v-for="node in modelNodes" 
           :key="node.id" 
           class="node" 
           :class="{ 
             'active': node.isActive,
             'solution-node': node.isSolution 
           }"
           :ref="el => { if (el) nodeRefs[node.id] = el }">
        <!-- 如果是初始节点(id=0)，显示一个小圆圈 -->
        <div v-if="node.id === 0" class="initial-node-circle" @click="handleNodeClick(node)">
          <div class="node-container-start">
            <span>开始</span>
          </div>
        </div>
        <div v-else class="node-container"  @click="handleNodeClick(node)">
          <div class="node-header">
            <div class="header-left" >
              {{ node.isSolution ? `Saved Timetable ${node.id}` : `Preference ${node.id}` }}
            </div>
            <div class="header-right">
              <div class="note-container" @click.stop>
                <input
                  v-if="editingNoteId === node.id"
                  v-model="node.note"
                  @blur="finishEditingNote"
                  @keyup.enter="finishEditingNote"
                  placeholder="添加注释..."
                  ref="noteInput"
                  class="note-input"
                />
                <div
                  v-else
                  class="note-display"
                  @click="startEditingNote(node.id)"
                >
                  {{ node.note || '添加注释...' }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 展开后显示详细信息 -->
          <div class="node-details">
            
            <!-- 显示当前节点的目标和约束 -->
            <div v-if="node.objectives.length > 0 || node.constraints.length > 0 ||currentPreference.filteredConstraints.length > 0 || currentPreference.constraintsChanges.length > 0 || currentPreference.objectivesChanges.length > 0 || node.id === 0 || node.requiredCourses.length > 0" class="model-section">
              <!-- 全局约束详情 -->
              <div v-if="false" class="model-section">
                  <strong v-if="false">全局约束：</strong>
                  <div
                  v-for="constraintType in getUniqueConstraintTypes(node.global_constraints)"
                  :key="constraintType"
                  class="key-value-pair"
                  >
                  <div class="key" @click="toggleKey('globalConstraints', constraintType)" :class="{ clickable: true }">
                      {{ constraintType }}
                      <span class="toggle-icon" v-if="false">
                      {{ isKeyExpanded('globalConstraints', constraintType) ? '▲' : '▼' }}
                      </span>
                  </div>
                  <div class="value" v-if="isKeyExpanded('globalConstraints', constraintType)">
                      <div
                      v-for="constraint in getConstraintsByType(node.global_constraints, constraintType)"
                      :key="constraint.description"
                      class="key-value-pair"
                      >
                      <div class="key sub-key" @click="toggleKey('globalConstraints', `${constraintType}-${constraint.description}`)" :class="{ clickable: true }">
                          {{ constraint.description }}
                          <span class="toggle-icon" v-if="false">
                          {{ isKeyExpanded('globalConstraints', `${constraintType}-${constraint.description}`) ? '▲' : '▼' }}
                          </span>
                      </div>
                      <div class="value sub-value" v-if="isKeyExpanded('globalConstraints', `${constraintType}-${constraint.description}`)">
                          {{ constraint.lhs }} {{ constraint.constraint_type }} {{ constraint.rhs }}
                      </div>
                      </div>
                  </div>
                  </div>
              </div>
              <strong >课程设置：</strong>
              <span  @click="toggleKey('requiredCourses', node.id)" class="clickable">
                {{ getSelectedCourses(node.candidateItems).length }}/ {{ getSelectedItems(node.candidateItems).length }} 门课程，
                {{ node.requiredCourses.length }}门必修课。
                <span class="toggle-icon" v-if="false">{{ isKeyExpanded('requiredCourses', 'list') ? '▲' : '▼' }}</span>
              </span>
              <div v-if="isKeyExpanded('requiredCourses', node.id)">
                <div v-for="(course, index) in node.requiredCourses" :key="course" style="padding-left: 20px;">
                  {{ index + 1 }}. {{ course }}
                </div>
              </div>
              <div><strong>目标设置：</strong></div>
              <div
                v-for="(objective, index) in node.objectives"
                :key="objective.description"
                class="key-value-pair"
              >
                <div class="key" @click="toggleKey('objective', objective.description)">
                  <span>{{ index + 1}}. {{ objective.description }}</span>
                  <span class="toggle-icon" v-if="false">
                    {{ isKeyExpanded('objective', objective.description) ? '▲' : '▼' }}
                  </span>
                </div>
                <div class="value" v-if="isKeyExpanded('objective', objective.description)">
                  {{ objective.objective_type }} {{ objective.expression }}
                </div>
              </div>
              <div><strong>约束设置：</strong></div>
              <div
                v-for="(constraint, index) in node.constraints"
                :key="constraint.description"
                class="key-value-pair"
              >
                <div class="key" @click="toggleKey('constraint', constraint.description)">
                    <span>{{ index + 1 }}. {{ getFeatureDisplay(constraint.lhs_name).startsWith('选择课程') ? getFeatureDisplay(constraint.lhs_name) : `${getFeatureDisplay(constraint.lhs_name)} ${constraint.constraint_type} ${constraint.rhs}` }}</span>
                  <span class="toggle-icon" v-if="false">
                    {{ isKeyExpanded('constraint', constraint.description) ? '▲' : '▼' }}
                  </span>
                </div>
                <div class="value" v-if="isKeyExpanded('constraint', constraint.description)">
                    <span v-html="getConstraintValue(constraint).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')"></span>
                </div>
              </div>
              <div><strong>求解结果：</strong>
                <span>{{ node.solutionResults && node.solutionResults.solutionNum ? node.solutionResults.solutionNum : 0 }} 个课表</span>
              </div>
            </div>
          </div>
          
          
          
          <!-- 向下箭头和变更说明 -->
          <div v-for="nextNode in node.nextNodes"
              :key="nextNode.nodeId">
            <div class="changes-summary"
                :style="getChangeSummaryPosition(node.id, nextNode.nodeId)">
              <div v-if="nextNode.annotation && nextNode.annotation !== '没有修改'" 
                  class="change-items">
                <div v-for="(line, index) in nextNode.annotation.split('\n')" 
                    :key="index" 
                    class="change-item">
                  {{ line }}
                </div>
              </div>
              <div v-else class="change-item">
                <span>没有修改</span>
              </div>
            </div>
          </div>
        </div>

        

        <!-- 筛选条件和问题求解按钮框 -->
        <div v-if="node.isActive && (currentPreference.filteredConstraints.length > 0 || currentPreference.constraintsChanges.length > 0 || currentPreference.objectivesChanges.length > 0)" class="action-box">
        <!-- 筛选条件详情 -->
        <div v-if="false && currentPreference.filteredConstraints.length > 0 || currentPreference.constraintsChanges.length > 0 || currentPreference.objectivesChanges.length > 0" class="model-section">
            <strong class="filter-title">修改内容：</strong>
            <div
                v-for="constraint in currentPreference.filteredConstraints"
                :key="constraint.description"
                class="key-value-pair"
            >
                <div class="key filter-key" @click="toggleKey('filteredConstraint', constraint.description)" :class="{ clickable: true }">
                <input type="checkbox" :checked="true" @click.stop="toggleConstraint(constraint)" class="filter-checkbox" />
                <span class="filter-text">{{ getFeatureDisplay(constraint.lhs_name) }}</span>
                <span class="toggle-icon" v-if="false">
                    {{ isKeyExpanded('filteredConstraint', constraint.description) ? '▲' : '▼' }}
                </span>
                </div>
                <div class="value" v-if="isKeyExpanded('filteredConstraint', constraint.description)">
                {{ constraint.lhs }} {{ constraint.constraint_type }} {{ constraint.rhs }}
                </div>
            </div>

            <div
                v-for="objective in currentPreference.objectivesChanges"
                :key="objective.description"
                class="key-value-pair"
            >
                <div class="key filter-key" @click="toggleKey('modifiedObjectives', objective.description)" :class="{ clickable: true }">
                    <input type="checkbox" v-model="objective.chosen"  class="filter-checkbox" />
                <span class="filter-text">{{ getObjectiveKey(objective) }}</span>
                <span class="toggle-icon" v-if="false">
                    {{ isKeyExpanded('modifiedObjectives', objective.description) ? '▲' : '▼' }}
                </span>
                </div>
                <div class="value" v-if="isKeyExpanded('modifiedObjectives', objective.description)">
                {{getObjectiveValue(objective)}}
                </div>
            </div>


            <div
                v-for="constraint in currentPreference.constraintsChanges"
                :key="constraint.description"
                class="key-value-pair"
            >
                <div class="key filter-key" @click="toggleKey('modifiedConstraints', constraint.description)" :class="{ clickable: true }">
                <input type="checkbox" v-model="constraint.chosen" class="filter-checkbox" />
                <span class="filter-text">{{ getConstraintKey(constraint) }}</span>
                <span class="toggle-icon" v-if="false">
                    {{ isKeyExpanded('modifiedConstraints', constraint.description) ? '▲' : '▼' }}
                </span>
                </div>
                <div class="value" v-if="isKeyExpanded('modifiedConstraints', constraint.description)">
                {{ getConstraintValue(constraint) }}
                </div>
            </div>
        </div>
        <!-- <div v-else-if="activeNode.id===0">
          <span>
          这里是偏好管理面板~ 所有的偏好设置会以树状结构记录在这个面板中。如果需要回到之前的某个状态，只需点击对应的节点即可。<br><br>
          Node Types：<br>
          1. 【Preference Node】：在点击【Solve】按钮时生成，记录偏好以及对应的选课方案。<br>
          2. 【Timetable Node】：在结果面板中点击【Save】按钮时生成。当您从【Timetable Node】开始求解时，系统会提供从当前课表出发修改最少的课表。<br><br>
          </span>
        </div> -->
        <div class="button-container">
          <button @click="confirmSolution" class="constraint-button">
            <img src="../assets/save.svg" alt="save" class="button-icon" />
            <span class="tooltip">Save</span>
          </button>
          <button @click="solving" class="constraint-button">
            <img src="../assets/solve.svg" alt="solve" class="button-icon" />
            <span class="tooltip">Solve</span>
          </button>
        </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUpdated, onUnmounted } from 'vue';
import { modelNodes, solving, switchActiveNode, getFeatureDisplay, formattedDescription} from '../logic/modelNodeService';

import { toggleConstraint} from '../logic/modifiedPanelService'

import { removeFilter, confirmSolution } from '../logic/solutionService';
import { expandedKeys, toggleKey } from '../logic/keyService';
import { getConstraintKey, getConstraintValue, getObjectiveKey, getObjectiveValue } from '../logic/keyService';
import { currentPreference, clearModifiedPanel } from '../logic/preferenceService';
import { candidateItems_selected, getSelectedCourses, getSelectedItems } from '../logic/coursesService';


const editingNoteId = ref(null); // 添加编辑状态跟踪
const noteInput = ref(null); // 添加输入框引用

// 添加对图表容器的引用
const graphContainer = ref(null);
const nodesContainer = ref(null);
const canvas = ref(null);
const nodeRefs = ref({});
const previousNodeCount = ref(0); // 添加变量跟踪节点数量

const VERTICAL_DISTANCE = 60; // 添加一个常量来统一管理垂直距离

// 滚动到底部的函数
const scrollToBottom = () => {
  if (graphContainer.value) {
    graphContainer.value.scrollTop = graphContainer.value.scrollHeight;
  }
};

// 滚动到新增节点的函数
const scrollToLatestNode = () => {
  if (!graphContainer.value || modelNodes.value.length === 0) return;
  
  // 获取最后添加的节点ID
  const latestNodeId = modelNodes.value[modelNodes.value.length - 1].id;
  console.log(`正在滚动到最新节点: ${latestNodeId}`);
  
  // 延迟执行滚动操作，确保节点已经被完全渲染和定位
  setTimeout(() => {
    const nodeElement = nodeRefs.value[latestNodeId];
    
    if (nodeElement) {
      // 直接使用节点的位置信息和容器的滚动属性
      const nodeLeft = parseInt(nodeElement.style.left, 10) || 0;
      const nodeTop = parseInt(nodeElement.style.top, 10) || 0;
      const nodeWidth = nodeElement.offsetWidth;
      const nodeHeight = nodeElement.offsetHeight;
      
      // 计算节点中心点
      const nodeCenterX = nodeLeft + nodeWidth / 2;
      const nodeCenterY = nodeTop + nodeHeight / 2;
      
      // 获取容器尺寸
      const containerWidth = graphContainer.value.clientWidth;
      const containerHeight = graphContainer.value.clientHeight;
      
      // 计算应该将容器滚动到的位置，使节点在视图中居中
      const scrollLeft = nodeCenterX - containerWidth / 2;
      const scrollTop = nodeCenterY - containerHeight / 2;
      
      console.log(`节点中心: (${nodeCenterX}, ${nodeCenterY}), 容器尺寸: (${containerWidth}, ${containerHeight}), 滚动目标: (${scrollLeft}, ${scrollTop})`);
      
      // 平滑滚动到计算出的位置
      graphContainer.value.scrollTo({
        left: Math.max(0, scrollLeft),
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    } else {
      console.warn(`未找到节点元素: ${latestNodeId}`);
    }
  }, 300); // 增加延迟，确保布局完成
};

// 监听节点变化，在节点数量或结构发生变化时重新计算布局
watch(modelNodes, (newNodes) => {
  // 延迟执行以确保DOM更新完成
  nextTick(() => {
    // 重新计算所有节点的布局
    calculateTreeLayout();
    // 更新滚动位置（如果是新增节点）
    if (newNodes.length > previousNodeCount.value) {
      setTimeout(scrollToLatestNode, 100);
    }
    previousNodeCount.value = newNodes.length;
  });
}, { deep: true }); // 使用deep选项以监听节点内部属性的变化

// 在组件挂载时进行初始布局
onMounted(() => {
  // 使用更长的延迟确保DOM完全渲染
  setTimeout(() => {
    calculateTreeLayout();
  }, 300);
  
  window.addEventListener('resize', handleResize);
  
  // 添加滚动事件监听
  if (graphContainer.value) {
    graphContainer.value.addEventListener('scroll', handleScroll);
  }
  
  previousNodeCount.value = modelNodes.value.length; // 初始化节点数量
});






// 检查键是否展开
const isKeyExpanded = (section, key) => {
  const compositeKey = `${section}-${key}`;
  return expandedKeys.value.has(compositeKey);
};

// 获取唯一的约束类型
const getUniqueConstraintTypes = (constraints) => {
  return [...new Set(constraints.map(constraint => constraint.type || '默认'))];
};

// 按类型获取约束
const getConstraintsByType = (constraints, type) => {
  return constraints.filter(constraint => (constraint.type || '默认') === type);
};

// 切换筛选条件
const toggleFilterConstraint = (constraint) => {
  if (constraint.filterKey) {
    removeFilter(constraint.filterKey);
  } else if (constraint.item) {
    selectCourse(constraint.item);
  }
};


// 添加处理约束值变更的函数
const handleConstraintValueChange = (constraint) => {
  // 创建一个更新约束的变更对象
  const constraintChange = {
    type: 'update',
    lhs_name: constraint.lhs_name, 
    lhs: constraint.lhs,
    constraint_type: constraint.constraint_type,
    rhs: constraint.rhs,
    description: `${constraint.description} ${constraint.constraint_type} ${constraint.rhs}`,
    old_description: constraint.description
  };
  
  
  // 将变更添加到修改列表
  currentPreference.value.constraintsChanges.push({...constraintChange, chosen: true});
};

// 开始编辑注释
const startEditingNote = (nodeId) => {
  editingNoteId.value = nodeId;
  // 在下一个tick时聚焦输入框
  nextTick(() => {
    if (noteInput.value) {
      noteInput.value.focus();
    }
  });
};

// 完成编辑注释
const finishEditingNote = () => {
  editingNoteId.value = null;
};

// 处理节点点击事件
const handleNodeClick = (node) => {
  // 如果点击的是非活跃节点，则切换到该节点
  if (!node.isActive) {
    // 先将所有节点的z-index重置为默认值
    Object.values(nodeRefs.value).forEach(nodeEl => {
      if (nodeEl) {
        nodeEl.style.zIndex = 1;
      }
    });
    
    // 将当前点击的节点z-index设为较高值，置于顶层
    const clickedNodeEl = nodeRefs.value[node.id];
    if (clickedNodeEl) {
      clickedNodeEl.style.zIndex = 10;
    }
    
    // 切换活跃节点
    switchActiveNode(node);
    clearModifiedPanel();
    
    // 确保视图更新后重新计算布局
    nextTick(() => {
      calculateTreeLayout();
      drawConnections();
      
      // 强制更新所有节点的活跃状态
      modelNodes.value.forEach(n => {
        const nodeEl = nodeRefs.value[n.id];
        if (nodeEl) {
          if (n.isActive) {
            nodeEl.classList.add('active');
          } else {
            nodeEl.classList.remove('active');
          }
        }
      });
    });
  }
};

// 计算连线中点位置
const getChangeSummaryPosition = (fromNodeId, toNodeId) => {
  const fromNode = nodeRefs.value[fromNodeId];
  const toNode = nodeRefs.value[toNodeId];
  const container = nodesContainer.value;
  
  // 确保所有必需的 DOM 元素都存在
  if (!fromNode || !toNode || !container) {
    return {
      position: 'absolute',
      visibility: 'hidden'
    };
  }
  
  try {
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // 计算起点和终点（相对于容器）
    const startX = fromRect.left + fromRect.width / 2 - containerRect.left;
    const startY = fromRect.bottom - containerRect.top -10 ;
    const endX = toRect.left + toRect.width / 2 - containerRect.left;
    const endY = toRect.top - containerRect.top;
    
    // 判断是否为非相邻节点（节点ID差大于1）
    const isNonAdjacent = toNodeId - fromNodeId > 1;
    
    // 根据节点关系调整控制点
    let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;
    
    if (isNonAdjacent) {
      // 非相邻节点：从右侧绕行
      const curveOffset = Math.min(200, Math.abs(endY - startY) * 0.8);
      controlPoint1X = startX + curveOffset;
      controlPoint1Y = startY + (endY - startY) * 0.2;
      controlPoint2X = endX + curveOffset;
      controlPoint2Y = endY - (endY - startY) * 0.2;
    } else {
      // 相邻节点：增加垂直距离
      const verticalDistance = Math.abs(endY - startY);
      const adjustedDistance = Math.max(VERTICAL_DISTANCE, verticalDistance);
      
      controlPoint1X = startX;
      controlPoint1Y = startY + adjustedDistance * 0.3;
      controlPoint2X = endX;
      controlPoint2Y = endY - adjustedDistance * 0.3;
    }
    
    // 绘制贝塞尔曲线
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y, endX, endY);
    ctx.stroke();
    
    // 计算箭头方向（使用终点处的切线方向）
    const arrowLength = 15;
    const arrowWidth = 12;
    
    // 计算箭头角度（使用终点处的切线方向）
    const t = 0.95; // 使用靠近终点的位置计算切线
    const dx = 3 * Math.pow(1-t, 2) * (controlPoint1X - startX) +
              6 * (1-t) * t * (controlPoint2X - controlPoint1X) +
              3 * Math.pow(t, 2) * (endX - controlPoint2X);
    const dy = 3 * Math.pow(1-t, 2) * (controlPoint1Y - startY) +
              6 * (1-t) * t * (controlPoint2Y - controlPoint1Y) +
              3 * Math.pow(t, 2) * (endY - controlPoint2Y);
    const angle = Math.atan2(dy, dx);
    
    // 绘制箭头
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - Math.PI / 6),
      endY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + Math.PI / 6),
      endY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = '#666';
    ctx.fill();

    // 计算文字位置（靠近箭头上方）
    const textT = 1; // 更靠近终点
    const midX = Math.pow(1-textT, 3) * startX + 
                3 * Math.pow(1-textT, 2) * textT * controlPoint1X + 
                3 * (1-textT) * Math.pow(textT, 2) * controlPoint2X + 
                Math.pow(textT, 3) * endX;
    
    const midPointY = Math.pow(1-textT, 3) * startY + 
                    3 * Math.pow(1-textT, 2) * textT * controlPoint1Y + 
                    3 * (1-textT) * Math.pow(textT, 2) * controlPoint2Y + 
                    Math.pow(textT, 3) * endY;

    // 向上偏移一定距离
    const textOffsetY = 50; // 向上偏移的像素值
    const textY = midPointY - textOffsetY;

    // 设置文字样式
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 绘制白色背景
    const lines = nextNode.annotation.split('\n');
    const lineHeight = 16;
    const padding = 5;
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const boxHeight = lines.length * lineHeight + padding * 2;
    const boxWidth = maxWidth + padding * 2;

    ctx.fillStyle = 'white';
    ctx.fillRect(midX - boxWidth/2, textY - boxHeight/2, boxWidth, boxHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(midX - boxWidth/2, textY - boxHeight/2, boxWidth, boxHeight);

    // 绘制文字
    ctx.fillStyle = 'black';
    lines.forEach((line, index) => {
      const y = textY - (lines.length - 1) * lineHeight/2 + index * lineHeight;
      ctx.fillText(line, midX, y);
    });

  } catch (error) {
    console.warn('Error drawing connection:', error);
  }
};

// 绘制连线
const drawConnections = () => {
  const canvasEl = canvas.value;
  const container = nodesContainer.value;
  
  if (!canvasEl || !container) return;
  
  try {
    const ctx = canvasEl.getContext('2d', { alpha: true });
    
    // 获取设备像素比
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    // 确保rect有合理的尺寸
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('Container has invalid dimensions:', rect);
      return;
    }
    
    // 设置canvas的实际大小
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    
    // 设置canvas的显示大小
    canvasEl.style.width = `${rect.width}px`;
    canvasEl.style.height = `${rect.height}px`;
    
    // 根据设备像素比缩放上下文
    ctx.scale(dpr, dpr);
    
    // 清除画布
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    // 设置文字样式
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    
    // 定义标准节点宽度和初始节点宽度
    const standardNodeWidth = 430;
    const initialNodeWidth = standardNodeWidth * 0.2;
    
    // 绘制所有连线
    modelNodes.value.forEach(node => {
      const fromNode = nodeRefs.value[node.id];
      if (!fromNode) return;
      
      node.nextNodes.forEach(nextNode => {
        const toNode = nodeRefs.value[nextNode.nodeId];
        if (!toNode) return;
        
        try {
          // 每次绘制新线条前重置样式
          ctx.strokeStyle = 'black'; // 确保每条线都是黑色
          ctx.lineWidth = 1;
          
          // 获取节点的实际位置和尺寸（相对于容器）
          const fromRect = fromNode.getBoundingClientRect();
          const toRect = toNode.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // 计算节点宽度
          const fromNodeWidth = node.id === 0 ? initialNodeWidth : standardNodeWidth;
          const toNodeWidth = nextNode.nodeId === 0 ? initialNodeWidth : standardNodeWidth;
          
          // 计算起点和终点（相对于容器）
          // 使用节点的实际宽度和高度计算连接点
          const startX = fromRect.left - containerRect.left + fromNodeWidth / 2;
          const startY = fromRect.bottom - containerRect.top;
          const endX = toRect.left - containerRect.left + toNodeWidth / 2;
          const endY = toRect.top - containerRect.top;
          
          // 判断父节点是否有多个子节点
          const parentNode = modelNodes.value.find(n => n.id === node.id);
          const hasMultipleChildren = parentNode && parentNode.nextNodes.length > 1;
          
          // 计算连接线的控制点
          const verticalDistance = endY - startY;
          const horizontalDistance = endX - startX;
          
          // 根据子节点个数和相对位置调整控制点
          let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;
          
          if (hasMultipleChildren) {
            // 多个子节点：使用贝塞尔曲线
            const curveOffset = Math.min(100, Math.abs(verticalDistance) * 0.4);
            
            // 根据节点的相对位置调整控制点
            if (Math.abs(horizontalDistance) < 50) {
              // 如果节点几乎垂直对齐，使用垂直连线
              controlPoint1X = startX;
              controlPoint1Y = startY + verticalDistance * 0.3;
              controlPoint2X = endX;
              controlPoint2Y = endY - verticalDistance * 0.3;
            } else {
              // 节点有水平偏移，使用曲线
              const sign = horizontalDistance > 0 ? 1 : -1;
              controlPoint1X = startX + sign * curveOffset;
              controlPoint1Y = startY + verticalDistance * 0.3;
              controlPoint2X = endX - sign * curveOffset;
              controlPoint2Y = endY - verticalDistance * 0.3;
            }
          } else {
            // 单个子节点：使用垂直连接
            controlPoint1X = startX;
            controlPoint1Y = startY + verticalDistance * 0.3;
            controlPoint2X = endX;
            controlPoint2Y = endY - verticalDistance * 0.3;
          }
          
          // 绘制贝塞尔曲线
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y, endX, endY);
          ctx.stroke();
          
          // 绘制箭头
          ctx.fillStyle = 'black';
          const arrowLength = 10;
          
          // 计算箭头角度（使用终点处的切线方向）
          const t = 0.95; // 使用靠近终点的位置计算切线
          const dx = 3 * Math.pow(1-t, 2) * (controlPoint1X - startX) +
                    6 * (1-t) * t * (controlPoint2X - controlPoint1X) +
                    3 * Math.pow(t, 2) * (endX - controlPoint2X);
          const dy = 3 * Math.pow(1-t, 2) * (controlPoint1Y - startY) +
                    6 * (1-t) * t * (controlPoint2Y - controlPoint1Y) +
                    3 * Math.pow(t, 2) * (endY - controlPoint2Y);
          const angle = Math.atan2(dy, dx);
          
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();

          // 计算贝塞尔曲线中点的参数 t=0.5
          const midT = 0.5;
          // 贝塞尔曲线的参数方程计算中点
          const midX = Math.pow(1-midT, 3) * startX + 
                    3 * Math.pow(1-midT, 2) * midT * controlPoint1X + 
                    3 * (1-midT) * Math.pow(midT, 2) * controlPoint2X + 
                    Math.pow(midT, 3) * endX;
          
          const midPointY = Math.pow(1-midT, 3) * startY + 
                        3 * Math.pow(1-midT, 2) * midT * controlPoint1Y + 
                        3 * (1-midT) * Math.pow(midT, 2) * controlPoint2Y + 
                        Math.pow(midT, 3) * endY;
          
          // 在绘制注释文字时使用这个函数
          if (nextNode.annotation) {
            // 绘制文字函数
            const drawText = (text, x, y) => {
              // 将文本按换行符分割成多行
              const lines = text.split('\n');
              const lineHeight = 18; // 行高
              const padding = 8;
              
              // 计算文本框尺寸
              let maxWidth = 0;
              for (const line of lines) {
                const metrics = ctx.measureText(line);
                maxWidth = Math.max(maxWidth, metrics.width);
              }
              
              const textHeight = lineHeight * lines.length;
              
              // 绘制圆角矩形背景
              const radius = 4;
              ctx.beginPath();
              ctx.moveTo(x - maxWidth/2 - padding + radius, y - textHeight/2 - padding);
              ctx.lineTo(x + maxWidth/2 + padding - radius, y - textHeight/2 - padding);
              ctx.quadraticCurveTo(x + maxWidth/2 + padding, y - textHeight/2 - padding, x + maxWidth/2 + padding, y - textHeight/2 - padding + radius);
              ctx.lineTo(x + maxWidth/2 + padding, y + textHeight/2 + padding - radius);
              ctx.quadraticCurveTo(x + maxWidth/2 + padding, y + textHeight/2 + padding, x + maxWidth/2 + padding - radius, y + textHeight/2 + padding);
              ctx.lineTo(x - maxWidth/2 - padding + radius, y + textHeight/2 + padding);
              ctx.quadraticCurveTo(x - maxWidth/2 - padding, y + textHeight/2 + padding, x - maxWidth/2 - padding, y + textHeight/2 + padding - radius);
              ctx.lineTo(x - maxWidth/2 - padding, y - textHeight/2 - padding + radius);
              ctx.quadraticCurveTo(x - maxWidth/2 - padding, y - textHeight/2 - padding, x - maxWidth/2 - padding + radius, y - textHeight/2 - padding);
              ctx.closePath();
              
              // 添加阴影
              ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 2;
              
              // 填充背景
              ctx.fillStyle = 'white';
              ctx.fill();
              
              // 绘制边框
              ctx.shadowColor = 'transparent';
              ctx.strokeStyle = '#ddd';
              ctx.lineWidth = 1;
              ctx.stroke();
              
              // 绘制每一行文字
              ctx.fillStyle = '#333';
              for (let i = 0; i < lines.length; i++) {
                const lineY = y - (textHeight / 2) + (i * lineHeight) + (lineHeight / 2);
                ctx.fillText(lines[i], x, lineY);
              }
            };
            
            drawText(nextNode.annotation, midX, midPointY);
          }

        } catch (error) {
          console.warn('Error drawing connection:', error);
        }
      });
    });
  } catch (error) {
    console.warn('Error in drawConnections:', error);
  }
};

// 处理窗口大小变化
const handleResize = () => {
  calculateTreeLayout();
  drawConnections();
};

// 监听节点变化和窗口大小变化
onUpdated(() => {
  // 使用 nextTick 确保 DOM 更新完成后再进行绘制
  nextTick(() => {
    calculateTreeLayout();
    // drawConnections 已经在 calculateTreeLayout 中调用，所以这里不需要再调用
  });
});

// 处理滚动事件
const handleScroll = debounce(() => {
  drawConnections();
}, 50); // 50ms的防抖延迟

// 简单的防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  // 移除滚动事件监听
  if (graphContainer.value) {
    graphContainer.value.removeEventListener('scroll', handleScroll);
  }
});

// 计算树状布局
const calculateTreeLayout = () => {
  if (!nodesContainer.value || modelNodes.value.length === 0) return;

  // 获取容器宽度 - 使用父容器的宽度而不是节点容器的宽度
  const containerWidth = graphContainer.value.clientWidth;
  const standardNodeWidth = 430; // 标准节点宽度
  const initialNodeWidth = standardNodeWidth * 0.2; // 初始节点宽度为标准节点的20%
  const horizontalGap = 150; // 节点之间的水平间距
  const verticalGap = 100; // 基础垂直间距，会根据节点实际高度动态调整
  
  // 构建节点关系图
  const childrenMap = {};
  const parentMap = {};
  
  // 初始化映射
  modelNodes.value.forEach(node => {
    childrenMap[node.id] = [];
  });
  
  // 填充映射
  modelNodes.value.forEach(node => {
    node.nextNodes.forEach(nextNode => {
      childrenMap[node.id].push(nextNode.nodeId);
      parentMap[nextNode.nodeId] = node.id;
    });
  });
  
  // 找出根节点
  const rootNodes = modelNodes.value
  .filter(node => !(node.id in parentMap))  // 使用 in 运算符检查键是否存在
  .map(node => node.id);
  
  // 如果没有根节点，使用ID最小的节点作为根节点
  if (rootNodes.length === 0 && modelNodes.value.length > 0) {
    const minIdNode = modelNodes.value.reduce((min, node) => 
      (node.id < min.id) ? node : min, modelNodes.value[0]);
    rootNodes.push(minIdNode.id);
  }

  // 存储节点位置和高度
  const nodePositions = {};
  const nodeHeights = {};
  
  // 首先获取所有节点的实际高度
  for (const node of modelNodes.value) {
    const nodeElement = nodeRefs.value[node.id];
    if (nodeElement) {
      nodeHeights[node.id] = nodeElement.offsetHeight;
    } else {
      // 如果节点尚未渲染，使用默认高度
      nodeHeights[node.id] = node.id === 0 ? 80 : 150;
    }
  }
  
  // 计算子树宽度的函数（深度优先搜索）
  const calculateSubtreeWidth = (nodeId) => {
    const children = childrenMap[nodeId] || [];
    // 根据节点ID确定节点宽度
    const nodeWidth = nodeId === 0 ? initialNodeWidth : standardNodeWidth;
    
    if (children.length === 0) {
      return nodeWidth; // 叶子节点只需要自身宽度
    }
    
    // 递归计算所有子树的宽度
    const childrenWidths = children.map(childId => calculateSubtreeWidth(childId));
    // 子树总宽度 = 所有子树宽度之和 + 间隔
    return Math.max(
      nodeWidth, // 至少要有节点自身的宽度
      childrenWidths.reduce((sum, width) => sum + width, 0) + 
      (children.length - 1) * horizontalGap
    );
  };

  // 使用DFS计算节点位置
  const calculateNodePosition = (nodeId, verticalPosition, leftBound) => {
    const children = childrenMap[nodeId] || [];
    const subtreeWidth = calculateSubtreeWidth(nodeId);
    // 根据节点ID确定节点宽度
    const nodeWidth = nodeId === 0 ? initialNodeWidth : standardNodeWidth;
    const nodeHeight = nodeHeights[nodeId] || 150;
    
    // 将当前节点放在其子树的中心
    const nodeX = leftBound + (subtreeWidth - nodeWidth) / 2;
    nodePositions[nodeId] = {
      left: nodeX,
      top: verticalPosition,
      height: nodeHeight
    };
    
    // 递归计算子节点位置
    if (children.length > 0) {
      let currentX = leftBound;
      // 计算下一层的垂直位置 = 当前节点的顶部位置 + 当前节点高度 + 垂直间距
      const nextVerticalPosition = verticalPosition + nodeHeight + verticalGap;
      
      children.forEach(childId => {
        const childSubtreeWidth = calculateSubtreeWidth(childId);
        calculateNodePosition(childId, nextVerticalPosition, currentX);
        currentX += childSubtreeWidth + horizontalGap;
      });
    }
  };

  // 计算所有根节点的总宽度
  const totalWidth = rootNodes.reduce((sum, rootId, index) => {
    return sum + calculateSubtreeWidth(rootId) + 
           (index < rootNodes.length - 1 ? horizontalGap : 0);
  }, 0);

  // 计算起始X坐标，使整个树居中
  // 使用父容器宽度计算居中位置
  let startX = Math.max(0, (containerWidth - totalWidth) / 2);
  
  // 减少左侧边距，使节点更居中
  startX = Math.max(0, startX - 100);

  // 为每个根节点计算布局
  let verticalStart = 20; // 顶部边距
  rootNodes.forEach(rootId => {
    calculateNodePosition(rootId, verticalStart, startX);
    startX += calculateSubtreeWidth(rootId) + horizontalGap;
  });

  // 应用计算出的位置
  for (const [nodeId, position] of Object.entries(nodePositions)) {
    const node = nodeRefs.value[nodeId];
    if (node) {
      node.style.left = `${position.left}px`;
      node.style.top = `${position.top}px`;
      
      // 设置z-index
      const modelNode = modelNodes.value.find(n => n.id === parseInt(nodeId));
      node.style.zIndex = modelNode?.isActive ? 10 : 1;
    }
  }

  // 计算容器尺寸
  const maxRight = Math.max(...Object.values(nodePositions)
    .map(pos => {
      // 根据节点ID确定节点宽度
      const nodeId = parseInt(Object.keys(nodePositions).find(key => nodePositions[key] === pos));
      const nodeWidth = nodeId === 0 ? initialNodeWidth : standardNodeWidth;
      return pos.left + nodeWidth;
    }));
    
  // 找出最底部节点的位置 + 高度
  const maxBottom = Math.max(...Object.values(nodePositions)
    .map(pos => pos.top + pos.height));

  // 设置容器尺寸（添加边距）
  // 确保容器宽度至少等于父容器宽度
  const minWidth = Math.max(containerWidth, maxRight + 100);
  nodesContainer.value.style.width = `${minWidth}px`;
  nodesContainer.value.style.height = `${maxBottom + 100}px`; // 添加底部边距
  
  // 增加延迟时间，确保DOM完全更新
  setTimeout(() => {
    drawConnections();
  }, 100);
};


// 导出方法，使它们可以在父组件中被调用
defineExpose({
  calculateTreeLayout,
  drawConnections
});

</script>

<style scoped>
.model-node-graph {
  width: 100%;
  padding: 20px;
  border: 1px solid #eee;
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: auto; /* 添加横向滚动支持 */
  scroll-behavior: smooth; /* 添加平滑滚动效果 */
  position: relative; /* 确保子元素可以相对于它定位 */
}

.no-nodes {
  text-align: center;
  padding: 20px;
  color: #666;
}

.nodes-container {
  display: block;
  padding: 20px;
  position: relative;
  width: 100%;
  margin-bottom: 20px;
  min-height: 300px; /* 确保容器有最小高度 */
}

.node {
  width: 430px;
  padding: 0;
  position: absolute;
  transition: all 0.5s ease;
  z-index: 1;
}

.node-container {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  padding: 15px;
  margin-bottom: 1px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.05);
}

.node-container-start {
  width: 20%;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.node:hover .node-container {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
}

.node.active .node-container {
  border-color: #1a73e8;
  box-shadow: 0 0 5px rgba(26, 115, 232, 0.3);
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.changes-summary {
  display: none;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.header-left {
  cursor: pointer;
}

.header-right {
  flex: 1;
  margin-left: 20px;
}

.note-container {
  position: relative;
  width: 100%;
}

.note-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

.note-display {
  padding: 4px 8px;
  color: #666;
  font-size: 14px;
  font-weight: normal;
  cursor: text;
  min-height: 24px;
  border: 1px solid transparent;
}

.note-display:hover {
  border: 1px dashed #ddd;
  border-radius: 4px;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
}

.node-content {
  font-size: 14px;
  margin-bottom: 10px;
}

.constraint-details {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}


.model-section {
  margin-bottom: 0px;
}

.key-value-pair {
  margin: 2px 0;
}

.key {
  font-weight: bold;
  display: flex;
  align-items: center;
  padding: 0px; /* 移除内边距 */ 
  gap: 2px;
  color: rgb(23, 22, 22);
}

.key-value-pair .key span {
  font-size: 14px; 
  font-weight: normal; /* 不加粗 */
  text-align: left; /* 文本左对齐 */
  margin-left: 30px; /* 移除可能的左边距 */
  padding-left: 0; /* 移除可能的左内边距 */
  flex-grow: 1; /* 允许 span 占据剩余空间 */
}

.key-value-pair .key input[type="checkbox"] {
  margin-left: 2px; /* 在复选框和文本之间添加间距 */
  flex-shrink: 0; /* 防止复选框被压缩 */
}
.clickable {
  cursor: pointer;
}

.value {
  margin-left: 20px;
  font-size: 12px;
  color: #666;
  word-break: break-word;
}

.sub-key {
  margin-left: 15px;
  font-weight: normal;
  color: rgb(23, 22, 22);
}

.sub-value {
  margin-left: 35px;
}

.node-arrow {
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: #666;
}

.filter-key {
  color: #1a73e8;
}

.filter-text {
  color: #1a73e8;
}

.node-transition {
  position: absolute;
  bottom: -80px; /* 调整位置以适应新的连线样式 */
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.node-connection {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.connection-line {
  position: absolute;
  width: 2px;
  height: 60px; /* 连线高度 */
  background-color: #666;
  top: -30px; /* 调整连线起点 */
}

.connection-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #666;
}

.change-items {
  max-height: 100px;
  overflow-y: auto;
  background-color: white;
}

.change-item {
  margin: 2px 0;
  line-height: 1.4;
}

.action-box {
  width: 100%;
  margin: 15px auto 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.button-container {
  display: flex;
  align-items: center;
}

.constraint-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
  border: 2px solid #1a73e8;
  transition: all 0.2s;
}

.constraint-button:hover {
  background-color: rgba(131, 131, 236, 0.511);
}

.button-icon {
  width: 20px;
  height: 20px;
  stroke: #1a73e8;
  transition: stroke 0.2s;
}

.constraint-button:hover .button-icon {
  stroke: white;
}

/* Tooltip 样式 */
.tooltip {
  visibility: hidden;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  text-align: center;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 1000;
  margin-bottom: 8px;
  opacity: 0;
  transition: opacity 0.2s, visibility 0.2s;
  pointer-events: none; /* 防止tooltip影响鼠标事件 */
}

/* 添加小三角形 */
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}

/* Hover 时显示 tooltip */
.constraint-button:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

.filter-title {
  display: block;
  margin-bottom: 10px;
  color: #333;
}

.filter-checkbox {
  margin-right: 8px;
}

.modified-add {
  color: #1a73e8 !important;
  font-weight: bold;
}

.modified-delete {
  text-decoration: line-through;
  color: #dc3545 !important;
}

.modified-update {
  color: #28a745 !important;
  font-style: italic;
}

.solution-node .node-container {
  background: #f0f7ff;  /* 浅蓝色背景 */
  border: 1px solid #b3d4fc;  /* 蓝色边框 */
}

.solution-node .node-header {
  color: #1a73e8;  /* 蓝色标题 */
  border-bottom-color: #b3d4fc;  /* 蓝色分隔线 */
}

.solution-node.active .node-container {
  border-color: #1a73e8;
  box-shadow: 0 0 8px rgba(26, 115, 232, 0.4);
}

.solution-node:hover .node-container {
  box-shadow: 0 0 10px rgba(26, 115, 232, 0.2);
}

.editable-constraint {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  font-size: 12px;
}

.lhs {
  margin-right: 5px;
  font-weight: bold;
}

.constraint-operator {
  margin: 0 5px;
  width: 50px;
  text-align: center;
}

.constraint-value {
  width: 50px;
  text-align: right;
  padding: 2px 5px;
}
</style> 