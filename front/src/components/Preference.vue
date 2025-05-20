<template>
    <div class="preference-panel">

        <!-- 必修课设置 -->
        <div class="section">
            <div class="section-title">
                <i class="section-icon">📚</i>课程设置
            </div>
            <div class="section-content">
                <span v-if="currentPreference && currentPreference.requiredCourses" @click="toggleKey('requiredCourses')" class="clickable">
                    您有 {{ currentPreference.requiredCourses.length }} 节必修课
                    <span class="toggle-icon">{{ isKeyExpanded('requiredCourses', 'list') ? '▲' : '▼' }}</span>
                </span>
                <div v-if="isKeyExpanded('requiredCourses')">
                    <div v-for="(course, index) in currentPreference.requiredCourses" :key="course" class="course-item">
                        {{ index + 1 }}. {{ course }}
                    </div>
                </div>
                <div v-if="!currentPreference.requiredCourses || currentPreference.requiredCourses.length === 0" class="empty-message">
                    暂无必修课，请在课程列表中选择必修课
                </div>
            </div>
        </div>

        <!-- 目标设置 -->
        <div class="section">
            <div class="section-title">
                <i class="section-icon">🎯</i>目标设置
            </div>
            <div class="section-content">
                <div v-if="currentPreference && currentPreference.objectives && currentPreference.objectives.length > 0">
                    <div
                        v-for="objective in currentPreference.objectives"
                        :key="objective.description"
                        class="key-value-pair"
                    >
                        <div class="key filter-key" @click="toggleKey('objectives', objective.description)" :class="{ clickable: true }">
                            <input
                                type="checkbox"
                                v-model="objective.chosen"
                                @change="handleObjectiveChange(objective)"
                            />
                            <span class="key-text">{{ objective.description }}</span>
                            <span class="toggle-icon" @click="toggleKey('objective', objective.description)" v-if="false">
                                {{ isKeyExpanded('objective', objective.description) ? '▲' : '▼' }}
                            </span>
                        </div>
                        <div class="value" v-if="isKeyExpanded('objectives', objective.description)">
                            <span v-html="getObjectiveValue(objective).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')"></span>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-message">
                    暂无目标设置，请添加您希望优化的目标
                </div>
            </div>
        </div>

        <!-- 约束设置 -->
        <div class="section">
            <div class="section-title">
                <i class="section-icon">⚙️</i>约束设置
            </div>
            <div class="section-content">
                <div v-if="(currentPreference && currentPreference.constraints && currentPreference.constraints.length > 0) || currentPreference.filteredConstraints.length > 0">
                    <div
                        v-for="constraint in currentPreference.constraints"
                        :key="constraint.description"
                        class="key-value-pair"
                    >
                        <div class="key filter-key" @click="toggleKey('constraints', constraint.description)" :class="{ clickable: true }">
                            <input
                                type="checkbox"
                                v-model="constraint.chosen"
                                @change="handleConstraintChange(constraint)"
                            />
                            <span class="key-text">{{ getFeatureDisplay(constraint.lhs_name).startsWith('选择课程') ? getFeatureDisplay(constraint.lhs_name) : `${getFeatureDisplay(constraint.lhs_name)} ${constraint.constraint_type} ${constraint.rhs}` }}</span>
                            <span class="toggle-icon" @click="toggleKey('constraints', constraint.description)" v-if="false">
                                {{ isKeyExpanded('constraint', constraint.description) ? '▲' : '▼' }}
                            </span>
                        </div>
                        <div class="value" v-if="isKeyExpanded('constraints', constraint.description)">
                            <span v-html="getConstraintValue(constraint).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')"></span>
                        </div>
                    </div>
                    <div
                        v-for="constraint in currentPreference.filteredConstraints"
                        :key="constraint.description"
                        class="key-value-pair"
                    >
                        <div class="key filter-key" @click="toggleKey('filteredConstraint', constraint.description)" :class="{ clickable: true }">
                            <input type="checkbox" :checked="true" @click.stop="toggleConstraint(constraint)" class="filter-checkbox" />
                            <span class="filter-text">{{ getFeatureDisplay(constraint.description) }} </span>
                            <span class="toggle-icon" v-if="false">
                                {{ isKeyExpanded('filteredConstraint', constraint.description) ? '▲' : '▼' }}
                            </span>
                        </div>
                        <div class="value" v-if="isKeyExpanded('filteredConstraint', constraint.description)">
                            {{ getConstraintValue(constraint).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') }}
                        </div>
                    </div>
                </div>
                <div v-else class="empty-message">
                    暂无约束设置，请添加您的课表约束条件
                </div>
            </div>
        </div>

        <!-- 筛选条件 -->
        <!-- <div class="section" v-if="currentPreference.filteredConstraints.length > 0">
            <div class="section-title modified-title">
                <i class="section-icon">🔍</i>筛选条件
            </div>
            <div class="section-content">
                
            </div>
        </div> -->

        <!-- 修改的目标 -->
        <!-- <div class="section" v-if="modifiedObjectives.length > 0">
            <div class="section-title modified-title">
                <i class="section-icon">✏️</i>修改的目标
            </div>
            <div class="section-content">
                <div
                    v-for="objective in modifiedObjectives"
                    :key="objective.description"
                    class="key-value-pair"
                >
                    <div class="key filter-key" @click="toggleKey('modifiedObjectives', objective.description)" :class="{ clickable: true }">
                        <input type="checkbox" v-model="objective.chosen" class="filter-checkbox" />
                        <span class="filter-text">{{ getObjectiveKey(objective) }}</span>
                        <span class="toggle-icon" v-if="false">
                            {{ isKeyExpanded('modifiedObjectives', objective.description) ? '▲' : '▼' }}
                        </span>
                    </div>
                    <div class="value" v-if="isKeyExpanded('modifiedObjectives', objective.description)">
                        {{getObjectiveValue(objective)}}
                    </div>
                </div>
            </div>
        </div> -->

        <!-- 修改的约束 -->
        <!-- <div class="section" v-if="modifiedConstraints.length > 0">
            <div class="section-title modified-title">
                <i class="section-icon">🔧</i>修改的约束
            </div>
            <div class="section-content">
                <div
                    v-for="constraint in modifiedConstraints"
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
        </div> -->

        <!-- 求解结果 -->
        <div class="section result-section" v-if="currentPreference">
            <div class="section-title">
                <i class="section-icon">📊</i>求解结果
            </div>
            <div class="solution-count">
                <span v-html="formattedDescription(currentPreference)"></span>
            </div>
        </div>

        <!-- 操作按钮 -->
        <div class="button-container">
            <button @click="confirmSolution" class="action-button save-button">
                <!-- <img src="../assets/save.svg" alt="save" class="button-icon" /> -->
                <span>💾   保存课表</span>
            </button>
            <button @click="solving" class="action-button solve-button">
                <!-- <img src="../assets/solve.svg" alt="solve" class="button-icon" /> -->
                <span>🔍  求解课表</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { isKeyExpanded, toggleKey, getConstraintKey, getConstraintValue, getObjectiveKey, getObjectiveValue } from '../logic/keyService';
import { currentPreference } from '../logic/preferenceService';
import { formattedDescription, getFeatureDisplay, solving } from '../logic/modelNodeService';
import { confirmSolution } from '../logic/solutionService';
import { toggleConstraint, handleObjectiveChange, handleConstraintChange } from '../logic/modifiedPanelService';

</script>

<style scoped>
.preference-panel {
    padding: 15px;
    border: 1px solid #eee;
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    /* margin-bottom: 20px; */
}

.panel-header {
    margin-bottom: 20px;
    text-align: center;
}

.panel-header h2 {
    color: #4a6fa5;
    margin-bottom: 8px;
    font-size: 1.5rem;
}

.panel-description {
    color: #666;
    font-size: 0.9rem;
}

.section {
    margin-bottom: 6px;
    border-radius: 6px;
    overflow: hidden;
    background-color: #f9f9f9;
    border: 1px solid #eee;
}

.section-title {
    font-weight: bold;
    color: #4a6fa5;
    padding: 5px 15px;
    background-color: #f0f7ff;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
}

.section-icon {
    margin-right: 8px;
    font-style: normal;
}

.modified-title {
    background-color: #f0f7ff;
    color: #1a73e8;
}

.section-content {
    padding: 6px;
}

.empty-message {
    color: #999;
    font-style: italic;
    padding: 10px 0;
    text-align: center;
}

.clickable {
    cursor: pointer;
    color: #4a6fa5;
    font-weight: bold;
    display: block;
    margin: 5px 0;
    transition: color 0.2s;
}

.clickable:hover {
    color: #1a73e8;
}

.toggle-icon {
    margin-left: 5px;
    font-size: 0.8em;
}

.key-value-pair {
    margin: 2px 0;
    padding-bottom: 0px;
}

.key-value-pair:last-child {
    border-bottom: none;
}

.key {
    display: flex;
    align-items: center;
    font-weight: 500;
    padding: 5px 0;
}

.filter-key {
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    background-color: #f0f7ff;
    transition: background-color 0.2s;
}

.filter-key:hover {
    background-color: #e0f0ff;
}

.filter-checkbox {
    margin-right: 10px;
}

.filter-text {
    flex: 1;
    color: #1a73e8;
}

.key-text {
    color: #1a73e8;
    margin-left: 10px;
    text-align: left;
    flex: 1;
}

.value {
    margin-top: 4px;
    margin-left: 28px;
    color: #666;
    font-size: 0.9em;
    background-color: #f5f5f5;
    padding: 8px;
    border-radius: 4px;
}

.course-item {
    padding: 8px 10px;
    margin: 5px 0;
    background-color: #f5f5f5;
    border-radius: 4px;
    border-left: 3px solid #4a6fa5;
}

.result-section {
    background-color: #f0f7ff;
}

.solution-count {
    padding: 15px;
    background-color: #fff;
    border-radius: 5px;
    border-left: 4px solid #4a6fa5;
    margin: 10px;
}

.button-container {
    display: flex;
    gap: 15px;
    margin-top: 20px;
}


.save-button {
    background-color: #4a6fa5;
}

.solve-button {
    background-color: #1a73e8;
}

.save-button:hover {
    background-color: #3a5a8a;
}

.solve-button:hover {
    background-color: #0d62d0;
}

.action-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start; /* 改为左对齐 */
    padding: 12px 15px;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative; /* 添加相对定位 */
    height: 37px;
}

.button-icon {
    width: 20px;
    height: 20px;
    margin-right: 10px; 
    margin-left: 50px; /* 移除左边距 */
}

.action-button span {
    position: absolute; /* 绝对定位 */
    left: 0;
    right: 0;
    text-align: center; /* 文本居中 */
    margin-left: 0px;   
}

.action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

</style>