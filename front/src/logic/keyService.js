import { ref } from "vue";
// 定义一个响应式的 Set 来存储展开的 keys
export const expandedKeys = ref(new Set());

  // 定义一个函数来切换 key 的展开状态
export const toggleKey = (section, key) => {
    const compositeKey = `${section}-${key}`;
    if (expandedKeys.value.has(compositeKey)) {
      expandedKeys.value.delete(compositeKey);
    } else {
      expandedKeys.value.add(compositeKey);
    }
  };

    // 定义一个函数来检查 key 是否展开
export const isKeyExpanded = (section, key) => {
    const compositeKey = `${section}-${key}`;
    return expandedKeys.value.has(compositeKey);
  };


  export const getObjectiveKey = (objective) => {
    if (objective.type === 'add') {
      return `Add objective：${objective.description}`;
    } else if (objective.type === 'delete') {
      return `Delete objective：${objective.old_description}`;
    } else if (objective.type === 'update') {
      return `Modify objective：将 ${objective.old_description} 修改为 ${objective.description}`;
    }
    return ''; // Default fallback
  }

  export const getObjectiveValue = (objective) => {
    // 提取函数名和函数体
    let functionName = '';
    let functionBody = '';
    
    // 检查expression是否包含函数定义
    if (objective.expression && objective.expression.includes('def ')) {
      // 提取函数名
      const funcNameMatch = objective.expression.match(/def\s+(\w+)\(/);
      if (funcNameMatch && funcNameMatch[1]) {
        functionName = funcNameMatch[1];
      }
      
      // 分离函数体和results赋值语句
      const expressionLines = objective.expression.split('\n');
      const functionLines = [];
      
      for (const line of expressionLines) {
        if (!line.trim().startsWith('results =')) {
          functionLines.push(line);
        }
      }
      
      functionBody = functionLines.join('\n');
    }
    
    // 构建返回字符串
    if (functionName) {
      return `${objective.objective_type} ${functionName}(items, vars)\n\n${functionBody}`;
    } else {
      return `${objective.objective_type} ${objective.expression}`;
    }
  }

  // This method returns the appropriate label for the constraint based on its type
  export const getConstraintKey = (constraint) => {
    const type_mapping = {
      "==": "=",
      ">=": ">=",
      "<=": "<="
    }
    if (constraint.type === 'add') {
      return `Add constraint：${constraint.lhs_name}${type_mapping[constraint.constraint_type]}${constraint.rhs}`;
    } else if (constraint.type === 'delete') {
      return `Delete constraint：${constraint.old_description}`;
    } else if (constraint.type === 'update') {
      return `Modify constraint：将 ${constraint.old_description} 修改为 ${constraint.lhs_name}${type_mapping[constraint.constraint_type]}${constraint.rhs}`;
    }
    return ''; // Default fallback
  }

  export const getConstraintValue = (constraint) => {
    if (constraint.type == 'delete'){
      return ''
    }
    // 提取函数名和函数体
    let functionName = '';
    let functionBody = '';
    
    // 检查lhs是否包含函数定义
    if (constraint.lhs && constraint.lhs.includes('def ')) {
      // 提取函数名
      const funcNameMatch = constraint.lhs.match(/def\s+(\w+)\(/);
      if (funcNameMatch && funcNameMatch[1]) {
        functionName = funcNameMatch[1];
      }
      
      // 分离函数体和results赋值语句
      const lhsLines = constraint.lhs.split('\n');
      const functionLines = [];
      
      for (const line of lhsLines) {
        if (!line.trim().startsWith('results =')) {
          functionLines.push(line);
        }
      }
      
      functionBody = functionLines.join('\n');
    }
    
    // 构建返回字符串
    if (functionName) {
      return `${functionName}(items, vars) ${constraint.constraint_type} ${constraint.rhs}\n\n${functionBody}`;
    } else {
      return `${constraint.lhs} ${constraint.constraint_type} ${constraint.rhs}`;
    }
  }