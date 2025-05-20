import { ref, computed } from "vue";
import { currentPreference, updateConstraints, updateObjectives } from "./preferenceService"; 
import { selectCourse } from './scheduleService';
import { removeFilter, } from './solutionService';
import { messages } from "./messageService";


export const toggleConstraint = (constraint) => {
    if(constraint.filter_type === 'item'){
        selectCourse(constraint.item)
    }
    if(constraint.filter_type === 'feature'){
        removeFilter(constraint.filterKey)
    }
};



// 处理目标变化
export const handleObjectiveChange = (objective) => {
  if (!objective.chosen) {
    // 当目标被取消选中时，添加删除操作到 currentPreference.value.objectivesChanges 
    const deleteModification = {
      type: 'delete',
      old_description: objective.description,
      objective_type: objective.objective_type,
      expression: objective.expression,
      chosen: true,
    };
    updateObjectives(deleteModification);
    
    // 检查是否已经存在相同的修改
    const existingIndex = currentPreference.value.objectivesChanges.findIndex(
      o => o.old_description === objective.description && o.type === 'delete'
    );
    
    if (existingIndex === -1) {
      currentPreference.value.objectivesChanges.push(deleteModification);
    }
  } else {
    // 当目标被重新选中时，移除对应的删除修改
    currentPreference.value.objectivesChanges = currentPreference.value.objectivesChanges.filter(
      o => !(o.old_description === objective.description && o.type === 'delete')
    );
  }
};

// 处理约束变化
export const handleConstraintChange = (constraint) => {
  if (!constraint.chosen) {
    // 当约束被取消选中时，添加到 currentPreference.value.constraintsChanges 作为删除操作
    const deleteModification = {
      type: 'delete',
      old_description: constraint.description,
      lhs_name: constraint.lhs_name,
      lhs: constraint.lhs,
      constraint_type: constraint.constraint_type,
      rhs: constraint.rhs,
      chosen: true,
    };
    updateConstraints(deleteModification);
    // 检查是否已经存在相同的修改
    const existingIndex = currentPreference.value.constraintsChanges.findIndex(
      c => c.old_description === constraint.description && c.type === 'delete'
    );
    
    if (existingIndex === -1) {
      currentPreference.value.constraintsChanges.push(deleteModification);
    }
  } else {
    // 当约束被重新选中时，移除对应的删除修改
    currentPreference.value.constraintsChanges = currentPreference.value.constraintsChanges.filter(
      c => !(c.old_description === constraint.description && c.type === 'delete')
    );
  }
};