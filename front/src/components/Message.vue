<template>
  <div>
    <!-- 普通文本消息 -->
    <div v-if="msg.type === 'text'">
      <p>
        <!-- <strong>{{ msg.sender }}: </strong> -->
        <span v-html="msg.text"></span>
      </p>
    </div>

    <!-- 添加课程选择消息 -->
    <div v-if="msg.type === 'addCourses'">
      <p>您添加了 {{ msg.content.addedCount }} / {{ msg.content.totalCount }} 门课程，其中有哪些是必修课？</p>
      <div class="course-selection-container">
        <div v-for="(course, index) in msg.content.courses" :key="index" class="course-item">
          <input 
            type="checkbox" 
            :id="`course-${index}`" 
            v-model="course.isRequired" 
            :checked="msg.content.isFirstTime"
          />
          <label :for="`course-${index}`">{{ course.name }}</label>
        </div>
      </div>
      <div class="course-confirm-button" v-if="!msg.confirmed">
        <button 
          @click="confirmRequiredCourses(msg)" 
          class="confirm-button"
          :style="!msg.content.courses.some(course => course.isRequired) ? 'background-color: #4d6584' : ''"
        >
          {{ !msg.content.courses.some(course => course.isRequired) ? '以上均不是必修课' : '确认' }}
        </button>
      </div>
      <p v-else-if="msg.content.courses.some(course => course.isRequired)" class="confirmed-message">
        已确认必修课程
      </p>
    </div>

    <!-- 问题模型消息 -->
    <div v-if="msg.type === 'problemModel'">
      <p>{{ msg.text }}</p>
      <div
        v-for="objective in msg.content.updated_objectives"
        :key="objective.description"
        class="key-value-pair"
      >
        <div
          class="key-container"
        >
          <div
            class="key"
            @click="toggleKey('problemModel', objective.description)"
            :class="{ clickable: true }"
          >
            <input 
              type="checkbox" 
              v-model="objective.selected" 
              @click.stop
              :checked="objective.selected !== false"
              :disabled="msg.updated"
            />
            {{ getObjectiveKey(objective) }}
            <span class="toggle-icon">
              {{ isKeyExpanded('problemModel', objective.description) ? '▲' : '▼' }}
            </span>
          </div>
          
          <div class="expression-description">
            <div v-if="hasCourses(objective.expression)" class="courses-panel">
              <div v-for="course in extractCourseVars(objective.expression)" :key="course.fullName" class="course-item">
                <input type="checkbox" v-model="course.selected">
                <span>{{ formatCourseName(course.fullName) }}</span>
              </div>
            </div>
            <div v-else>
              {{ objective.expression_description }}
            </div>
          </div>
        </div>
        <div
          class="value"
          v-if="isKeyExpanded('problemModel', objective.description)"
        >
          
          <span v-html="getObjectiveValue(objective).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')"></span>
          
        </div>
      </div>

      <div
        v-for="constraint in msg.content.updated_constraints"
        :key="constraint.description"
        class="key-value-pair"
      >
        <div
          class="key-container"
        >
          <div
            class="key"
            @click="toggleKey('problemModel', constraint.description)"
            :class="{ clickable: true }"
          >
            <input 
              type="checkbox" 
              v-model="constraint.selected" 
              @click.stop
              :checked="constraint.selected !== false"
            />
            {{ getConstraintKey(constraint) }}
            <span class="toggle-icon">
              {{ isKeyExpanded('problemModel', constraint.description) ? '▲' : '▼' }}
            </span>
          </div>
          <div class="expression-description">
            <div v-if="hasCourses(constraint.lhs)" class="courses-panel">
              <div v-for="course in extractCourseVars(constraint.lhs)" :key="course.fullName" class="course-item">
                <input type="checkbox" v-model="course.selected">
                <span>{{ formatCourseName(course.fullName) }}</span>
              </div>
            </div>
            <div v-else>
              {{ constraint.description }}
            </div>
          </div>
          
        </div>
        <div
          class="value"
          v-if="isKeyExpanded('problemModel', constraint.description)"
        >
        
          <span v-html="getConstraintValue(constraint).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')"></span>
        </div>
      </div>
      <div class="constraint-update-button">
        <button
          v-if="!msg.updated"
          @click="updateProblemModel(msg.content)"
          class="constraint-button"
        >
          更新
        </button>
        <p v-else>
          已更新到上述问题建模中
        </p>
      </div>
    </div>
    <!-- 特征选择消息 -->
    <div v-if="msg.type === 'features'">
      <p>{{ msg.text }}<br>我们针对所有的方案提供了特征：<br></p>
      <div class="features-container">
        <button
          v-for="feature in features" 
          :key="feature.name"
          class="feature-button"
          :style="{ backgroundColor: feature.selected ? '#1a73e8' : '#FFFFFF' }"
          @click="() => {
            feature.selected = !feature.selected;
            $forceUpdate();
          }"
        >
          {{ feature.name }}
        </button>
        <p>如果想要查看其他特征，则添加"fff"前缀在对话框中输入。</p>
      </div>
    </div>

    <!-- 添加特征表达式消息 -->
    <div v-if="msg.type === 'addedFeatureExprs'">
      <p>
        <!-- <strong>{{ msg.sender }}:</strong> -->
        {{ msg.text }}</p>
      <div
        v-for="(value, key) in msg.content"
        :key="key"
        class="key-value-pair"
      >
        <div
        class="key"
        @click="toggleKey('addedFeatureExprs', key)"
        :class="{ clickable: true }"
        >
        {{ key }}
        <span class="toggle-icon">
            {{ isKeyExpanded('addedFeatureExprs', key) ? '▲' : '▼' }}
        </span>
        </div>
        <div
        class="value"
        v-if="isKeyExpanded('addedFeatureExprs', key)"
        v-html="value.replace(/\n/g, '<br>')"
        style="white-space: pre-wrap;"
        >
        
        </div>
      </div>

      <div class="feature-update-button">
        <button
        v-if="!msg.updated"
        @click="saveFeatureExprs(msg.content, true)"
        class="feature-button-true"
        >
        正确
        </button>
        <button
        v-if="!msg.updated"
        @click="saveFeatureExprs(msg.content, false)"
        class="feature-button-false"
        >
        不正确
        </button>
        <p v-else>
        {{ msg.buttonMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toggleKey, isKeyExpanded, getObjectiveKey, getObjectiveValue, getConstraintKey, getConstraintValue } from '../logic/keyService';
import { features } from '../logic/modelNodeService';
import { saveFeatureExprs, messages } from '../logic/messageService';
import { updateModifiedModel, updatePreferenceRequiredCourses } from '../logic/preferenceService';
import { logUserAction, ACTION_TYPES } from '../logic/userActionLogService';
import { extractCourseVars, formatCourseName, generateCourseDescription, hasCourses } from '../logic/parseService';
import { sendRequiredCoursesToBackend } from '../logic/apiService';
import { currentPreference, updatePreferenceProblemModel } from '../logic/preferenceService';

defineProps({
  msg: {
    type: Object,
    required: true
  }
});

// 添加确认必修课程的函数
const confirmRequiredCourses = async (msg) => {
  // 获取所有被标记为必修的课程名称
  const requiredCourses = msg.content.courses
    .filter(course => course.isRequired)
    .map(course => course.name);
  
  // 记录操作
  logUserAction(ACTION_TYPES.CONFIRM_REQUIRED_COURSES, {
    requiredCoursesCount: requiredCourses.length,
    requiredCourses: requiredCourses
  });
  
  const requestData = {
    candidateItems: currentPreference.value.candidateItems,
    requiredCourses: requiredCourses,
  }

  updatePreferenceRequiredCourses(requiredCourses);
  

  const response = await sendRequiredCoursesToBackend(requestData);
  
  // 标记消息为已确认
  msg.confirmed = true;
  
  // 添加后端响应消息
  if (response && response.message) {
    messages.value.push({
      sender: 'Bot',
      text: response.message,
      type: 'text'
    });
  }
};

// 添加新的更新函数
const updateProblemModel = (content) => {
  //
  // 过滤出选中的目标和约束
  const selectedContent = {
    updated_objectives: content.updated_objectives?.filter(obj => obj.selected !== false),
    updated_constraints: content.updated_constraints?.filter(cons => cons.selected !== false)
  };
  
  // 记录操作
  logUserAction(ACTION_TYPES.UPDATE_PROBLEM_MODEL, {
    objectivesCount: selectedContent.updated_objectives?.length || 0,
    constraintsCount: selectedContent.updated_constraints?.length || 0,
    objectives: selectedContent.updated_objectives?.map(obj => obj.description) || [],
    constraints: selectedContent.updated_constraints?.map(cons => cons.description) || []
  });
  
  // 调用原有的更新函数
  updateModifiedModel(selectedContent);
  updatePreferenceProblemModel(selectedContent);

  messages.value[messages.value.length - 1].updated = true;
  console.log("messages", messages)
};
</script>

<style scoped>
.key-value-pair {
  margin: 10px 0;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
}

.key-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.expression-description {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  color: #666;
  padding-left: 24px; /* 与 checkbox 对齐 */
  border-bottom: 1px solid #eee;
  padding-bottom: 4px;
}

.value {
  padding: 8px;
  margin-top: 4px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.clickable {
  cursor: pointer;
}

.constraint-update-button,
.feature-update-button {
  margin-top: 10px;
  text-align: right;
  
}

.constraint-button,
.feature-button-true,
.feature-button-false {
  padding: 5px 10px;
  margin-left: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background-color: #1a73e8;
}

.feature-button-true {
  background-color: #1a73e8;
  color: white;
}

.feature-button-false {
  background-color: #f44336;
  color: white;
}

.course-item {
  margin-left: 30px;
}

input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.course-selection-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.course-confirm-button {
  margin-top: 10px;
  text-align: right;
}

.confirm-button {
  padding: 5px 10px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.confirmed-message {
  margin-top: 10px;
  color: #1a73e8;
  font-style: italic;
}
</style>