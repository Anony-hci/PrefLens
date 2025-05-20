/**
 * 从表达式字符串中提取所有课程变量
 * @param {string} expression - 包含课程变量的表达式字符串
 * @returns {Array} - 提取出的课程信息数组
 */
export const extractCourseVars = (expression) => {
  if (!expression || typeof expression !== 'string') {
    return [];
  }
  console.log(expression)
  
  const courses = [];
  const regex = /vars\['x_([^']+)'\]/g;
  let match;
  
  while ((match = regex.exec(expression)) !== null) {
    const fullMatch = match[0]; // 完整匹配，如 vars['x_数值分析_喻文健_5-2(全周)']
    const courseName = match[1]; // 提取的课程名，如 数值分析_喻文健_5-2(全周)
    
    // 解析课程信息
    const parts = courseName.split('_');
    let courseInfo = {};
    
    if (parts.length >= 3) {
      courseInfo = {
        name: parts[0],           // 课程名称，如 "数值分析"
        teacher: parts[1],        // 教师名称，如 "喻文健"
        time: parts[2],           // 上课时间，如 "5-2(全周)"
        fullName: courseName,     // 完整课程名称，如 "数值分析_喻文健_5-2(全周)"
        varExpression: fullMatch  // 原始变量表达式，如 "vars['x_数值分析_喻文健_5-2(全周)']"
      };
    } else {
      // 处理格式不符合预期的情况
      courseInfo = {
        fullName: courseName,
        varExpression: fullMatch
      };
    }
    
    courses.push(courseInfo);
  }
  
  return courses;
};

/**
 * 格式化课程名称为更易读的形式
 * @param {string} fullName - 完整课程名称，如 "数值分析_喻文健_5-2(全周)"
 * @returns {string} - 格式化后的课程名称，如 "数值分析 (喻文健) 5-2(全周)"
 */
export const formatCourseName = (fullName) => {
  const parts = fullName.split('_');
  if (parts.length >= 3) {
    return `${parts[0]} (${parts[1]}) ${parts[2]}`;
  }
  return fullName;
};

/**
 * 从表达式中提取课程并生成人类可读的描述
 * @param {string} expression - 包含课程变量的表达式字符串
 * @returns {string} - 人类可读的描述
 */
export const generateCourseDescription = (expression) => {
  const courses = extractCourseVars(expression);
  
  if (courses.length === 0) {
    return '';
  }
  
  // 生成课程名称列表
  const courseNames = courses.map(course => formatCourseName(course.fullName));
  
  return  `${courseNames.join(', ')}`;
};

export const hasCourses = (expression) => {
  const courses = extractCourseVars(expression);
  
  if (courses.length === 0) {
    return false;
  }
  return true;
  
};
/**
 * 示例用法
 */
