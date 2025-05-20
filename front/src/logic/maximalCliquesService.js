import { ref } from "vue"
export const maximal_cliques = ref([])

// 根据课程名查找所有冲突的课程
export const findConflictingCourses = (course) => {
  // 存储所有冲突的课程
  const conflictingCourses = new Set();

  // 遍历所有极大团
  maximal_cliques.value.forEach(clique => {
    // 如果当前极大团包含目标课程
    if(clique.includes(course)) {
      // 将该团中除目标课程外的所有课程添加到冲突集合中
      clique.forEach(c => {
        if(c !== course) {
          conflictingCourses.add(c);
        }
      });
    }
  });

  // 将Set转换为数组并返回
  return Array.from(conflictingCourses);
};



