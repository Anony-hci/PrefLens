// src/logic/fileService.js
import { ref, computed } from 'vue';
import { items } from './coursesService';
import { tempCandidateItems } from './coursesService';

// 文件输入引用
export const fileInput = ref(null);
// CSV 文件的表头
export const headers = ref([]); 

// 存储查询关键词
export const searchCourseQuery = ref('');
export const searchDepartmentQuery = ref('')

// 存储过滤后的项目
export const filteredDatabase = computed(() => {
  // 首先获取符合搜索条件的项目
  let filtered = [];
  if (searchCourseQuery.value.trim() === '' && searchDepartmentQuery.value.trim() === '') {
    filtered = [...items.value]; // 如果没有输入关键词，显示所有项目
  } else {
    filtered = items.value.filter(item => 
      item['课程名'] && item['课程名'].toLowerCase().includes(searchCourseQuery.value.toLowerCase()) && 
      item['开课院系'] && item['开课院系'].toLowerCase().includes(searchDepartmentQuery.value.toLowerCase())
    ); // 过滤课程名和开课院系包含关键词的项目
  }
  
  // 过滤掉已经在 currentPreference.value.candidateItems 和 tempCandidateItems 中的项目
  return filtered.filter(item => {
    // 检查是否在 currentPreference.value.candidateItems 中
    const inCandidateItems = currentPreference.value.candidateItems.some(
      candidate => candidate['课程名'] === item['课程名'] && 
                  candidate['主讲教师'] === item['主讲教师'] && 
                  candidate['上课时间'] === item['上课时间']
    );
    
    // 检查是否在 tempCandidateItems 中
    const inTempCandidateItems = tempCandidateItems.value.some(
      candidate => candidate['课程名'] === item['课程名'] && 
                  candidate['主讲教师'] === item['主讲教师'] && 
                  candidate['上课时间'] === item['上课时间']
    );
    
    // 只返回不在这两个列表中的项目
    return !inCandidateItems && !inTempCandidateItems;
  });
});

// 监听 filteredDatabase 的变化,更新选中状态
import { watch } from 'vue';
import { currentPreference } from './preferenceService';

watch(filteredDatabase, (newFilteredItems) => {
  // 获取所有过滤后项目的ID集合
  const filteredIds = new Set(newFilteredItems.map(item => item['课程名']));
  
  // 遍历所有项目
  items.value.forEach(item => {
    if (filteredIds.has(item['课程名'])) {
      // 如果项目在过滤结果中,设置为选中
      item.selected = true;
    } else {
      // 如果项目不在过滤结果中,取消选中
      item.selected = false;
    }
  });
});



// 导入 CSV 文件
export const importCSV = () => {
    if (fileInput.value) {
      fileInput.value.click();
    }
  };
  
export const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const { headers: parsedHeaders, rows } = parseCSV(text);
  
        if (parsedHeaders.length > 0 && rows.length > 0) {
          headers.value = parsedHeaders;
          
          items.value = rows.map(row => {
            const item = { selected: false, chosen: false }; // 默认选中
  
            parsedHeaders.forEach((header, index) => {
              item[header] = row[index] || '';
              // 检查是否包含 '是否必修' 或类似字段，如果有则设置是否默认选中
              if (header.toLowerCase() === '是否必修') {
                  // 假设字段值是 'True' 或 'False'，设置 selected 为 true 或 false
                  item.selected = row[index].toLowerCase() === 'true'; // 'true' 时选中，'false' 时不选中
              }
            });
            return item;
          });
  
          // 发送上传的数据到后端
          // await uploadDataToBackend(items.value);
        } else {
          console.warn("CSV 文件没有有效数据");
        }
      };
      reader.readAsText(file);
    }

  };


  
  // 直接加载预设的CSV文件
export const loadDefaultCSV = async (csvPath) => {
  try {
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error('CSV文件加载失败');
    }
    const text = await response.text();
    const { headers: parsedHeaders, rows } = parseCSV(text);

    if (parsedHeaders.length > 0 && rows.length > 0) {
      headers.value = parsedHeaders;  // 这里直接使用 parsedHeaders，因为它已经是数组
      
      items.value = rows.map(row => {
        const item = { selected: false, chosen: false, added: false }; // 默认不选中
        
        parsedHeaders.forEach((header, index) => {  // 这里也直接使用 parsedHeaders
          item[header] = row[index] || '';
          if (header.toLowerCase() === '是否必修') {
            item.selected = row[index].toLowerCase() === 'true';
          }
        });
        return item;
      });
    } else {
      console.warn("CSV文件没有有效数据");
    }
  } catch (error) {
    console.error("加载CSV文件失败:", error);
  }
};

// 修改 parseCSV 函数的返回值格式
export const parseCSV = (text) => {
    const rows = [];
    const headers = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
  
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
  
      if (char === '"' && inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // Skip the escaped quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentCell !== '' || currentRow.length > 0) {
          currentRow.push(currentCell);
          if (currentRow.length > 0) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        }
        // Handle \r\n
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentCell += char;
      }
    }
  
    // Add the last cell
    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
    }
  
    // 修改返回值，直接返回数组而不是对象的 value 属性
    if (rows.length > 0) {
      const headerRow = rows[0];
      headerRow.forEach(header => headers.push(header.trim()));
      const dataRows = rows.slice(1);
      return { 
        headers: headers,  // 直接返回数组
        rows: dataRows 
      };
    }
  
    return { 
      headers: [],  // 确保即使没有数据也返回空数组
      rows: [] 
    };
  };