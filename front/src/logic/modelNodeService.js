import { ref, computed, watch } from 'vue'
import { processResponseMessage } from './messageService';
import { currentPreference, getProblemModel, getConstraintsChanges, getObjectivesChanges, getObjectives, getConstraints, clearModifiedPanel } from './preferenceService';
import { getSolutionsResponseFromBackend, getIncrementalProblemSolvingFromBackend } from './apiService';
import { logUserAction, ACTION_TYPES } from './userActionLogService';
import { getSelectedCourses, getSelectedItems } from './coursesService';


// 定义节点类型
export class ModelNode {
  constructor(id) {
    this.id = id;
    this.father_id = -1;
    this.solution_father_id = -1;
    this.candidateItems = [];
    this.requiredCourses = [];
    this.objectives = [];
    this.constraints = [];
    this.globalConstraints = [];
    this.objectivesChanges = [];
    this.constraintsChanges = [];
    this.solutionResults = null;
    this.description = "";
    this.timestamp = new Date();
    this.isActive = false;
    this.note = '';
    this.isSolution = false; //是否是solution
    this.isIncremental = false; //是否solution的下游
    // 添加指向节点的管理
    this.nextNodes = []; // [{nodeId: number, annotation: string}]
  }

  // 添加指向的节点
  addNextNode(nodeId, annotation = '') {
    if (!this.nextNodes.some(n => n.nodeId === nodeId)) {
      this.nextNodes.push({ nodeId, annotation });
    }
  }

  // 移除指向的节点
  removeNextNode(nodeId) {
    this.nextNodes = this.nextNodes.filter(n => n.nodeId !== nodeId);
  }

  // 更新箭头注释
  updateAnnotation(nodeId, annotation) {
    const nextNode = this.nextNodes.find(n => n.nodeId === nodeId);
    if (nextNode) {
      nextNode.annotation = annotation;
    }
  }
}

// 存储所有节点
export const modelNodes = ref([]);
modelNodes.value.push(new ModelNode(0));
// 当前活跃节点
export const activeNode = ref(null);


// 计算当前活跃节点的特征值的key列表
export const features = computed(() => {
  console.log("features in node", features)
  if (currentPreference.value && currentPreference.value.solutionResults && currentPreference.value.solutionResults.solutions && currentPreference.value.solutionResults.solutions.length > 0) {
    const featureKeys = Object.keys(currentPreference.value.solutionResults.solutions[0].features);
    return featureKeys.reduce((acc, key) => {
      acc[key] = {
        name: key,
        selected: true
      };
      return acc;
    }, {});
  }
  return {};
});

export const getFeatureDisplay = (featureName) => {
  // console.log("getFeatureDisplay", featureName)
  if (featureName.startsWith("obj:")){
    return featureName.slice(7)
  }
  if(featureName.startsWith("con:")){
    return featureName.slice(4)
  }
  const maps = {
    "first_classes": "早8数量",
    "late_classes": "晚6数量",
    "course_distribution_daily_consecutive": "连课数量",
    "total_credits": "总学分",
    "total_courses": "课程总数",
    "second_and_third_classes": "23连上"
  }
  if (maps.hasOwnProperty(featureName)) {
    return maps[featureName]
  } else {
    return featureName
  }
}

// 计算选中的特征
export const selectedFeatures = computed(() => {
  const selected = {};
  for (const [key, value] of Object.entries(features.value)) {
    if (value.selected) {
      selected[key] = value;
    }
  }
  return selected;
});


// 更新节点的目标函数
export const updateObjectives = (node, updated_objectives) => {
  if (!node || !updated_objectives || updated_objectives.length === 0) return;
  
  const chosen = true;
  updated_objectives.forEach(updated_objective => {
    const { type, objective_type, expression, description, old_description } = updated_objective;

    if (type === 'add') {
      // 检查是否存在相同的 objective_type 和 description
      const existingObjectiveIndex = node.objectives.findIndex(
        obj => obj.objective_type === objective_type && obj.description === description
      );
      
      if (existingObjectiveIndex !== -1) {
        // 如果存在相同的项，标记为删除
        node.objectives.splice(existingObjectiveIndex, 1);
      }
      
      // 添加新的目标
      const newObjective = {
        objective_type,
        expression,
        description,
        chosen,
      };
      node.objectives.push(newObjective);
      
    } else if (type === 'delete') {
      // 删除旧的目标
      const index = node.objectives.findIndex(objective => objective.description === old_description);
      if (index !== -1) {
        node.objectives.splice(index, 1);
      }
    } else if (type === 'update') {
      // 更新目标
      const index = node.objectives.findIndex(objective => objective.description === old_description);
      if (index !== -1) {
        // 标记旧的为删除
        node.objectives.splice(index, 1);
        
        // 添加新的目标
        const newObjective = {
          objective_type,
          expression,
          description,
          chosen,
        };
        node.objectives.push(newObjective);
      }
    }
  });
};

// 更新节点的约束函数
export const updateConstraints = (node, updated_constraints) => {
  if (!node || !updated_constraints || updated_constraints.length === 0) return;
  
  const chosen = true;
  const is_hard_constraint = true;
  updated_constraints.forEach(updated_constraint => {
    const { type, lhs, constraint_type, rhs, description, old_description } = updated_constraint;

    if (type === 'add') {
      // 检查是否存在相同的 lhs 和 constraint_type
      const existingConstraintIndex = node.constraints.findIndex(
        con => con.lhs === lhs && con.constraint_type === constraint_type
      );
      
      if (existingConstraintIndex !== -1) {
        node.constraints.splice(existingConstraintIndex, 1);
      }
      
      // 添加新的约束
      const newConstraint = {
        lhs,
        constraint_type,
        rhs,
        description,
        is_hard_constraint,
        chosen,
      };
      node.constraints.push(newConstraint);
      
    } else if (type === 'delete') {
      // 删除旧的约束
      const index = node.constraints.findIndex(constraint => constraint.description === old_description);
      if (index !== -1) {
        node.constraints.splice(index, 1)
      }
    } else if (type === 'update') {
      // 更新约束
      const index = node.constraints.findIndex(constraint => constraint.description === old_description);
      if (index !== -1) {
        // 标记旧的为删除
        node.constraints.splice(index, 1)
        
        // 添加新的约束
        const newConstraint = {
          lhs,
          constraint_type,
          rhs,
          description,
          is_hard_constraint,
          chosen,
        };
        node.constraints.push(newConstraint);
      }
    }
  });
};

export const addNewNode = (isSolution = false, addFeatures = false, featureNames = []) => {
    // 创建新节点
    const newNode = new ModelNode(modelNodes.value.length);
    // 复制属性
    newNode.father_id = currentPreference.value.father_id
    newNode.candidateItems = JSON.parse(JSON.stringify(currentPreference.value.candidateItems))
    newNode.requiredCourses = JSON.parse(JSON.stringify(currentPreference.value.requiredCourses))
    newNode.objectives = JSON.parse(JSON.stringify(getObjectives()));
    newNode.constraints = JSON.parse(JSON.stringify(getConstraints()));
    newNode.globalConstraints = JSON.parse(JSON.stringify(currentPreference.value.globalConstraints));
    newNode.solutionResults = JSON.parse(JSON.stringify(currentPreference.value.solutionResults));
    newNode.description = currentPreference.value.description || "";
    newNode.objectivesChanges = JSON.parse(JSON.stringify(currentPreference.value.objectivesChanges || []));
    newNode.constraintsChanges = JSON.parse(JSON.stringify(currentPreference.value.constraintsChanges || []));
    newNode.currentSolutionIndex = currentPreference.value.currentSolutionIndex
    newNode.isSolution = isSolution;
    if(isSolution){
      newNode.isIncremental = true
      newNode.solution_father_id = newNode.id
      currentPreference.value.solution_father_id = newNode.id
    }else if(currentPreference.value.isIncremental){
      newNode.isIncremental = true
      newNode.solution_father_id = currentPreference.value.solution_father_id
    }

    // 添加到节点列表并设置为活跃节点
    modelNodes.value.push(newNode);
    
    // 将当前活跃节点指向新节点
    let annotation;
    if (addFeatures){
      annotation = "添加特征：" + featureNames.join(", ");
    } else{
      annotation = generateAnnotation(getObjectivesChanges(), getConstraintsChanges(), currentPreference.value.coursesChanges);
    }
    console.log("addNextNode", currentPreference.value.father_id, newNode.id, annotation)
    modelNodes.value[currentPreference.value.father_id].addNextNode(newNode.id, annotation);
    currentPreference.value.father_id = newNode.id
  
};


// 生成箭头注释
const generateAnnotation = (objectives_changes, constraints_changes, courses_changes) => {
  const changes = [];
  if (courses_changes.length > 0){
    // 统计添加和删除的课程数量
    const addedCourses = getSelectedCourses(courses_changes.filter(change => change.type === 'add'))
    const addedItemsNum = getSelectedItems(courses_changes.filter(change => change.type === 'add')).length
    const removedCourses = getSelectedCourses(courses_changes.filter(change => change.type === 'remove'))
    const removedItemsNum = getSelectedItems(courses_changes.filter(change => change.type === 'remove')).length
    
    if (addedCourses.length > 0) {
      changes.push(`添加${addedCourses.length}/${addedItemsNum}门课程`);
    }
    if (removedCourses.length > 0) {
      changes.push(`删除${removedCourses.length}/${removedItemsNum}门课程.`);
    }
  }
  
  if (objectives_changes.length > 0) {
    objectives_changes.forEach(change => {
      if (change.type === 'add') {
        changes.push(`添加目标：${change.description}`);
      } else if (change.type === 'delete') {
        changes.push(`删除目标：${change.old_description}`);
      } else if (change.type === 'update') {
        changes.push(`修改目标：${change.old_description} -> ${change.description}`);
      }
    });
  }
  
  if (constraints_changes.length > 0) {
    constraints_changes.forEach(change => {
      if (change.type === 'add') {
        changes.push(`添加约束：${change.description}`);
      } else if (change.type === 'delete') {
        changes.push(`删除约束：${change.old_description}`);
      } else if (change.type === 'update') {
        changes.push(`修改约束：${change.old_description} -> ${change.description}`);
      }
    });
  }


  
  return changes.length > 0 ? changes.join('\n') : '没有修改';
};



// export const getProblemModel = () => {
//   const combinedConstraints = [
//     ...activeNode.value.constraints
//       .filter(constraint => constraint.chosen) 
//       .map(constraint => ({
//         lhs: constraint.lhs,
//         constraint_type: constraint.constraint_type,
//         rhs: constraint.rhs,
//         description: constraint.description,
//         is_hard_constraint: true,
//       })),
//     ...filteredConstraints.value.map(constraint => ({
//       lhs: constraint.lhs,
//       constraint_type: constraint.constraint_type,
//       rhs: constraint.rhs,
//       description: constraint.description,
//       is_hard_constraint: true,
//     }))
//   ];

//   const filteredObjectives = activeNode.value.objectives.filter(objective => objective.chosen);

//   console.log("problemModel", filteredObjectives, combinedConstraints)

//   return  {
//     objectives: filteredObjectives,
//     constraints: combinedConstraints
//   }
// }


export const solving = async () => {
    if (!currentPreference.value) return;
    let response;
    if (currentPreference.value.isIncremental) {
        // 获取fatherNode中的第一个solution的Variables
        const fatherNode = modelNodes.value[currentPreference.value.solution_father_id] 
        const fatherSolution = fatherNode.solutionResults.solutions[0].Variables;
        
        // 遍历candidateItems,检查每一项是否在fatherSolution中存在
        currentPreference.value.candidateItems.forEach(item => {
            const varName = `x_${item['课程名']}_${item['主讲教师']}_${item['上课时间']}`;
            // 如果该项不在fatherSolution中,则标记为added
            if (!fatherSolution.hasOwnProperty(varName)) {
                item.added = true;
            }
        });
        const requestData = {
          candidateItems: currentPreference.value.candidateItems,
          problemModel: getProblemModel(),
          modelNodes: modelNodes.value,
          requiredCourses: currentPreference.value.requiredCourses
        };
        response = await getIncrementalProblemSolvingFromBackend(requestData);
    } else {
        const requestData = {
          candidateItems: currentPreference.value.candidateItems,
          problemModel: getProblemModel(),
          modelNodes: modelNodes.value,
          requiredCourses: currentPreference.value.requiredCourses
        };
        response = await getSolutionsResponseFromBackend(requestData);
    }
    processResponseMessage(response);
    addNewNode();
    clearModifiedPanel();

    currentPreference.value.candidateItems.forEach(item => {
        item.added = false;
    });

    // 记录求解操作
    logUserAction(ACTION_TYPES.SOLVE_PROBLEM, {
      nodeId: currentPreference.value.father_id,
      currentPreference: currentPreference.value,
    });
};



// 切换活跃节点
export const switchActiveNode = (node) => {
  // 将当前活跃节点的状态设置为非活跃
  if (currentPreference.value) {
    const currentActiveIndex = modelNodes.value.findIndex(n => n.id === currentPreference.value.father_id);
    if (currentActiveIndex !== -1) {
      modelNodes.value[currentActiveIndex].isActive = false;
    }
  }
  const old_id = currentPreference.value.father_id
  
  // 在数组中找到新节点并更新其状态
  const newActiveIndex = modelNodes.value.findIndex(n => n.id === node.id);
  if (newActiveIndex !== -1) {
    modelNodes.value[newActiveIndex].isActive = true;
    currentPreference.value.father_id = newActiveIndex
    currentPreference.value.solution_father_id = modelNodes.value[newActiveIndex].solution_father_id
    currentPreference.value.candidateItems = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].candidateItems));
    currentPreference.value.requiredCourses = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].requiredCourses));
    currentPreference.value.objectives = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].objectives));
    currentPreference.value.constraints = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].constraints));
    currentPreference.value.globalConstraints = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].globalConstraints));
    currentPreference.value.solutionResults = JSON.parse(JSON.stringify(modelNodes.value[newActiveIndex].solutionResults));
    currentPreference.value.description = modelNodes.value[newActiveIndex].description;
    currentPreference.value.isIncremental = modelNodes.value[newActiveIndex].isIncremental || false;
    currentPreference.value.currentSolutionIndex = modelNodes.value[newActiveIndex].currentSolutionIndex;
    clearModifiedPanel();
  }

  logUserAction(ACTION_TYPES.SWITCH_ACTIVE_NODE, {
    old_node: old_id,
    new_node: currentPreference.value.father_id,
  })
  
  // console.log("candidateItems after switch", currentPreference.value.candidateItems);
};


// 添加一个计算属性来处理 description
export const formattedDescription = (node) => {
  if (!node || !node.description) return '';
  // 将 <br> 替换为实际的换行符，然后再将换行符替换为 <br> 标签
  return node.description.replace(/<br>/g, '\n').split('\n').join('<br>');
};