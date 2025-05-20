import { ref, computed, watch } from "vue";
import { modelNodes } from "./modelNodeService";
import { filters, translateOperation } from "./solutionService";
import { toggleConstraint } from "./modifiedPanelService";
import { messages } from "./messageService";
class Preference {
    constructor() {
        this.father_id = 0;
        this.solution_father_id = -1;
        this.candidateItems = [];
        this.requiredCourses = [];
        this.objectives = [];
        this.constraints = [];
        this.globalConstraints = [];
        this.solutionResults = null;
        this.description = "";
        this.featureExprs = []; 
        this.isIncremental = false;
        this.objectivesChanges = [];
        this.constraintsChanges = [];
        this.coursesChanges = [];
        this.filteredConstraints = [];
        this.currentSolutionIndex = 0;
        this.candidatesBatch = 0;
    }
}

export const currentPreference = ref(new Preference());


export const updateFilteredConstraints = () => {
    const computedConstraints = [];
    // 处理 candidateItems
    currentPreference.value.candidateItems.forEach(item => {
      if (item.userSelected) {
        computedConstraints.push({
          lhs: `x_${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`,
          constraint_type: '=',
          rhs: 1,
          lhs_name: `选择课程： ${item['课程名']} (${item['主讲教师']}) - ${item['上课时间']}`,
          description: `选择课程： ${item['课程名']} (${item['主讲教师']}) - ${item['上课时间']}`,
          filter_type: 'item',
          item: item,
          filterKey: null
        });
      }
    });
  
    // 处理 filters
    for (const filterKey in filters.value) {
      const filter = filters.value[filterKey];
      if(filter.operation !== 'item'){
        computedConstraints.push({
            lhs: Object.keys(currentPreference.value.featureExprs).find(key => key.includes(filterKey)) ? currentPreference.value.featureExprs[Object.keys(currentPreference.value.featureExprs).find(key => key.includes(filterKey))] : null,
            constraint_type: translateOperation(filter.operation, 1),
            lhs_name: filterKey,
            rhs: filter.value,
            description: `${filterKey} ${translateOperation(filter.operation, 1)} ${filter.value}`,
            filter_type: 'feature',
            item: null,
            filterKey: filterKey
        });
      }
    }
    currentPreference.value.filteredConstraints = computedConstraints;
};

watch(
    [
      () => currentPreference.value.candidateItems,
      () => filters.value,
      () => currentPreference.value.featureExprs
    ],
    () => {
      updateFilteredConstraints();
    },
    { deep: true }
  );

export const getObjectives = () => {
    return currentPreference?.value.objectives.filter(obj => obj.chosen) || []
}
export const getConstraints = () => {
    const chosenConstraints = currentPreference.value.constraints.filter(con => con.chosen);
    const filteredConstraintsList = [];
    
    currentPreference.value.filteredConstraints.forEach(filteredConstraint => {
        filteredConstraintsList.push({
            lhs_name: filteredConstraint.lhs_name,
            lhs: filteredConstraint.lhs,
            constraint_type: filteredConstraint.constraint_type,
            rhs: filteredConstraint.rhs,
            description: filteredConstraint.description,
            is_hard_constraint: true,
            chosen: true
        });
    });
    
    return [...chosenConstraints, ...filteredConstraintsList] || [];
}



export const getObjectivesChanges = () => {
    return currentPreference.value.objectivesChanges;
}

export const getConstraintsChanges = () => {
    // 合并约束变更和过滤约束
    const changes = [...currentPreference.value.constraintsChanges];
    
    // 将过滤约束添加到变更列表中
    currentPreference.value.filteredConstraints.forEach(filteredConstraint => {
        changes.push({
            type: 'add',
            lhs: filteredConstraint.lhs,
            lhs_name: filteredConstraint.lhs_name,
            constraint_type: filteredConstraint.constraint_type,
            rhs: filteredConstraint.rhs,
            description: filteredConstraint.description,
            is_hard_constraint: true,
            chosen: true
        });
    });
    
    return changes;
}


export const clearObjectivesChanges = () => {
    currentPreference.value.objectivesChanges = [];
}

export const clearConstraintsChanges = () => {
    currentPreference.value.constraintsChanges = [];
    currentPreference.value.filteredConstraints.forEach(filteredConstraint => {
        toggleConstraint(filteredConstraint);
    });
    currentPreference.value.filteredConstraints = [];
}

export const updateModifiedModel = (problemModel) => {
    console.log("messages", messages)
      currentPreference.value.objectivesChanges = [
        ...currentPreference.value.objectivesChanges,
        ...(problemModel.updated_objectives || []).map(obj => ({...obj, chosen: true}))
      ]
      currentPreference.value.constraintsChanges = [
        ...currentPreference.value.constraintsChanges,
        ...(problemModel.updated_constraints || []).map(con => ({...con, chosen: true}))
      ]
  }

  export const clearModifiedPanel = () => {
    clearObjectivesChanges();
    clearConstraintsChanges();
    currentPreference.value.coursesChanges = [];
    console.log("clearModifiedPanel")
  }

  export const updatePreferenceCoursesChange = (course, type) => {
    // 先检查并删除相同课程的记录
    currentPreference.value.coursesChanges = currentPreference.value.coursesChanges.filter(
      item => !(item['课程名'] === course['课程名'] && 
               item['主讲教师'] === course['主讲教师'] && 
               item['上课时间'] === course['上课时间'])
    );
    currentPreference.value.coursesChanges.push({...course, type: type});
  }

// 更新当前节点的求解结果并创建新节点
  export const updatePreferenceSolutions = (solutionResults) => {
    if (currentPreference.value) {
      // 更新当前节点的求解结果
      currentPreference.value.solutionResults = solutionResults;
    }
  };

  // 添加一个函数来更新全局约束
export const updateGlobalConstraints = (globalConstraints) => {
    if (currentPreference.value) {
      currentPreference.value.globalConstraints = [...globalConstraints];
    }
  }; 
  
  export const updatePreferenceDescription = (description) => {
    if (currentPreference.value){
      currentPreference.value.description = description;
    }
  }

  export const updatePreferenceRequiredCourses = (requiredCourses) => {
    if (currentPreference.value){
        currentPreference.value.requiredCourses.push(...requiredCourses);
      }
    updatePreferenceDescription('');
  }

  export const updatePreferenceCandidateItems = (isSolution = false) => {
    if(isSolution){
        // solution confirmed
      // 设置 chosen_when_confirmed 为当前的 chosen 状态
      currentPreference.value.candidateItems.forEach(item => {
        if (item.userSelected) {
          item.chosen = true;
          item.chosen_when_confirmed = true;
        } else {
          item.chosen_when_confirmed = item.chosen;
        }
      });
      console.log("Solution confirmed, candidateItems updated:", currentPreference.value.candidateItems);
      return; // 提前返回，跳过后面的处理
    }else {
        // 以下代码只在非 solution 确认时执行
        const fatherNode = modelNodes.value[currentPreference.value.father_id];
        if (currentPreference.value.isSolution) {
            // 如果是solution节点,chosen_when_confirmed设置为父节点的chosen
            currentPreference.value.candidateItems = currentPreference.value.candidateItems.map(item => {
                const fatherItem = fatherNode.candidateItems.find(fi => 
                fi['课程名'] === item['课程名'] && 
                fi['主讲教师'] === item['主讲教师'] &&
                fi['上课时间'] === item['上课时间']
                );
                return {
                ...item,
                chosen_when_confirmed: fatherItem?.chosen || false
                };
            });
        
        } else if (currentPreference.value.isIncremental) {
            // 如果是incremental节点,chosen_when_confirmed继承父节点的chosen_when_confirmed
            currentPreference.value.candidateItems = currentPreference.value.candidateItems.map(item => {
                const fatherItem = fatherNode.candidateItems.find(fi => 
                fi['课程名'] === item['课程名'] && 
                fi['主讲教师'] === item['主讲教师'] &&
                fi['上课时间'] === item['上课时间']
                );
                return {
                ...item,
                chosen_when_confirmed: fatherItem?.chosen_when_confirmed || false
                };
            });
        
        }
    }
    
    // console.log("update node candidateItems", activeNode.value.id, activeNode.value.isSolution, activeNode.value.isIncremental, activeNode.value.candidateItems);
    // console.log("candidateItems:", currentPreference.value.candidateItems);
  }

export const getProblemModel = () => {
    return  {
        objectives: getObjectives(),
        constraints: getConstraints(),
        }
}

export const updatePreference = (father_id, solution_father_id, candidateItems, requiredCourses, objectives, constraints, globalConstraints, solutionResults, description, featureExprs, isIncremental, objectivesChanges, constraintsChanges, coursesChanges, filteredConstraints, currentSolutionIndex, candidatesBatch) => {
  if (father_id) currentPreference.value.father_id = father_id;
  if (solution_father_id) currentPreference.value.solution_father_id = solution_father_id;
  if (candidateItems) currentPreference.value.candidateItems = candidateItems;
  if (requiredCourses) currentPreference.value.requiredCourses = requiredCourses;
  if (objectives) currentPreference.value.objectives = objectives;
  if (constraints) currentPreference.value.constraints = constraints;
  if (globalConstraints) currentPreference.value.globalConstraints = globalConstraints;
  if (solutionResults) currentPreference.value.solutionResults = solutionResults;
  if (description) currentPreference.value.description = description;
  if (featureExprs) currentPreference.value.featureExprs = featureExprs;
  if (isIncremental) currentPreference.value.isIncremental = isIncremental;
  if (objectivesChanges) currentPreference.value.objectivesChanges = objectivesChanges;
  if (constraintsChanges) currentPreference.value.constraintsChanges = constraintsChanges;
  if (coursesChanges) currentPreference.value.coursesChanges = coursesChanges;
  if (filteredConstraints) currentPreference.value.filteredConstraints = filteredConstraints;
  if (currentSolutionIndex) currentPreference.value.currentSolutionIndex = currentSolutionIndex;
  if (candidatesBatch) currentPreference.value.candidatesBatch = candidatesBatch;
};

export const updatePreferenceProblemModel = (problemModel) => {
    if(problemModel.updated_objectives){
        updateObjectives(problemModel.updated_objectives);
    }
    if(problemModel.updated_constraints){
        updateConstraints(problemModel.updated_constraints);
    }
}

// 更新节点的目标函数
export const updateObjectives = (updated_objectives) => {
    updatePreferenceDescription('');
    if (!updated_objectives || updated_objectives.length === 0) return;
    
    const chosen = true;
    // 确保 updated_objectives 是数组类型
    const objectivesArray = Array.isArray(updated_objectives) ? updated_objectives : [updated_objectives];
    
    objectivesArray.forEach(updated_objective => {
      const { type, objective_type, expression, description, old_description } = updated_objective;
      if (type === 'add') {
        // 检查是否存在相同的 objective_type 和 description
        const existingObjectiveIndex = currentPreference.value.objectives.findIndex(
          obj => obj.objective_type === objective_type && obj.description === description
        );
        
        if (existingObjectiveIndex !== -1) {
          // 如果存在相同的项，标记为删除
          currentPreference.value.objectives.splice(existingObjectiveIndex, 1);
        }
        
        // 添加新的目标
        const newObjective = {
          objective_type,
          expression,
          description,
          chosen,
        };
        currentPreference.value.objectives.push(newObjective);
        
      } else if (type === 'delete') {
        // 删除旧的目标
        const index = currentPreference.value.objectives.findIndex(objective => objective.description === old_description);
        if (index !== -1) {
          currentPreference.value.objectives.splice(index, 1);
        }
      } else if (type === 'update') {
        // 更新目标
        const index = currentPreference.value.objectives.findIndex(objective => objective.description === old_description);
        if (index !== -1) {
          // 标记旧的为删除
          currentPreference.value.objectives.splice(index, 1);
          
          // 添加新的目标
          const newObjective = {
            objective_type,
            expression,
            description,
            chosen,
          };
          currentPreference.value.objectives.push(newObjective);
        }
      }
    });
  };
  
  // 更新节点的约束函数
  export const updateConstraints = ( updated_constraints) => {
    updatePreferenceDescription('');

    if (!updated_constraints || updated_constraints.length === 0) return;
    
    const chosen = true;
    const is_hard_constraint = true;
    const objectivesArray = Array.isArray(updated_constraints) ? updated_constraints : [updated_constraints];
    
    objectivesArray.forEach(updated_constraint => {
      const { type, lhs_name, lhs, constraint_type, rhs, description, old_description } = updated_constraint;
  
      if (type === 'add') {
        // 检查是否存在相同的 lhs 和 constraint_type
        const existingConstraintIndex = currentPreference.value.constraints.findIndex(
          con => con.lhs === lhs && con.constraint_type === constraint_type
        );
        
        if (existingConstraintIndex !== -1) {
          currentPreference.value.constraints.splice(existingConstraintIndex, 1);
        }
        
        // 添加新的约束
        const newConstraint = {
          lhs_name,
          lhs,
          constraint_type,
          rhs,
          description,
          is_hard_constraint,
          chosen,
        };
        currentPreference.value.constraints.push(newConstraint);
        
      } else if (type === 'delete') {
        // 删除旧的约束
        const index = currentPreference.value.constraints.findIndex(constraint => constraint.description === old_description);
        if (index !== -1) {
          currentPreference.value.constraints.splice(index, 1)
        }
      } else if (type === 'update') {
        // 更新约束
        const index = currentPreference.value.constraints.findIndex(constraint => constraint.description === old_description);
        if (index !== -1) {
          // 标记旧的为删除
          currentPreference.value.constraints.splice(index, 1)
          
          // 添加新的约束
          const newConstraint = {
            lhs_name,
            lhs,
            constraint_type,
            rhs,
            description,
            is_hard_constraint,
            chosen,
          };
          currentPreference.value.constraints.push(newConstraint);
        }
      }
    });
  };


