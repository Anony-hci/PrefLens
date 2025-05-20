import { ref } from 'vue';
import { getMessageResponseFromBackend, getFeaturesResponseFromBackend, getSavedFeaturesResponseFromBackend } from './apiService';
import { currentPreference, updatePreferenceSolutions, updatePreferenceDescription, updatePreferenceCandidateItems, getProblemModel } from './preferenceService.js';
import { addNewNode,} from './modelNodeService';
import { maximal_cliques } from './maximalCliquesService';
import { logUserAction, ACTION_TYPES } from './userActionLogService.js';
import { toggleshowAllCourses } from './scheduleService.js';

// 用户消息和聊天记录
export const userMessage = ref(''); // 用户输入的消息
export const messages = ref([]); // 用来存储消息记录

// 初始化欢迎消息
export const initializeMessages = () => {
    messages.value.push({ sender: 'Bot', text: '您好！我已经将您感兴趣的课程都展示在课程表中，方便您查看。<br><br>您可以告诉我您的选课要求，以及在课程表上选择非常想要上的课程，我会根据您的需求为您找到合适的选课方案。', type: 'text' });
  };

// 消息发送和处理
export const sendMessage = async () => {
    if (userMessage.value.trim() === "") return;
  
    // 添加用户消息到聊天记录
    messages.value.push({ sender: 'You', text: userMessage.value, type: 'text' });
  
    // 获取当前已选中项目的内容
    const candidateItemsData = currentPreference.value.candidateItems.filter(item => item.selected);
  
    // 创建一个包含消息和选中项目的请求体
    const requestData = {
      message: userMessage.value,
      messages: messages.value,
      candidateItems: candidateItemsData,
      problemModel: getProblemModel(),
    };

    const message = userMessage.value;
    userMessage.value = '';

    let response;
    if (messages.value.length > 1 && messages.value[messages.value.length-2].text && messages.value[messages.value.length-2].text.startsWith('新增的课程没有必修课。')) {
      const added_courses = messages.value[messages.value.length-3].content.courses.map(course => course.name);
      requestData.message = `从新增的课程【${added_courses.join(',')}】中选择${message}门课程`;
      response = await getMessageResponseFromBackend(requestData);
    }
    else if (message.startsWith("fff")) {
      // 如果用户消息以 "特征：" 开头，获取特征响应
      response = await getFeaturesResponseFromBackend(requestData);
    } else {
      // 否则获取普通消息响应
      response = await getMessageResponseFromBackend(requestData);
    }

    // 记录发送消息操作
    logUserAction(ACTION_TYPES.SEND_MESSAGE, {
      message: message,
      sender: 'user',
    });
    processResponseMessage(response)
        // 记录发送消息操作
    if(response.message){
      logUserAction(ACTION_TYPES.SEND_MESSAGE, {
        message: response.message,
        sender: 'system',
      });
    }
    

  };

  export const processResponseMessage = (response) => {
    // 处理响应消息
    if (response.problemModel) {
      const problemModelMessage = {
        sender: 'Bot',
        type: 'problemModel',
        text: response.message,
        content: response.problemModel,
        updated: false,
      };
      messages.value.push(problemModelMessage);
    }else if (response.addedFeatureExprs) {
      const addedFeatureExprsMessage = {
        sender: 'Bot',
        type: 'addedFeatureExprs',
        text: response.message,
        content: response.addedFeatureExprs
      }
      updatePreferenceSolutions(response.solutionResults);
      addNewNode(false, true, Object.keys(response.addedFeatureExprs))
      // updatePreferenceCandidateItems();
      messages.value.push(addedFeatureExprsMessage);
      currentPreference.value.featureExprs = { ...currentPreference.value.featureExprs, ...response.addedFeatureExprs };

    }else if (response.solutionResults){
      if (typeof response.solutionResults === 'string') {
        response.solutionResults = JSON.parse(response.solutionResults);
      }
      // 更新当前节点的求解结果
      updatePreferenceSolutions(response.solutionResults);
      
      // 使用 Promise.resolve().then 确保在下一个微任务中执行
      Promise.resolve().then(() => {
        updatePreferenceCandidateItems();
      });
      let description;
      if (response.solutionResults.status === 'OPTIMAL'|| response.solutionResults.status === 'TIME_LIMIT') {
        toggleshowAllCourses(false);
        const solutionNum = response.solutionResults ? response.solutionResults.solutionNum || 0 : 0;
        if (solutionNum === 500){
            description =  `存在超过500个课表方案，我们为您展示其中的500个~`;
        }else{
            description = `我们为您找到了${solutionNum}个课表方案~`;
        }
        if(response.always_included_courses.length > 0){
          description += `<br><br>所有课表中都包括了${response.always_included_courses.length}门课程(蓝色)：<br>${response.always_included_courses.map((course, index) => `&nbsp;&nbsp;${index + 1}. ${course}`).join(',<br> ')}。<br>背景为黄色的课程是需要您进一步选择的课程。`
        }
      } else if(response.solutionResults.status === 'INFEASIBLE'){
        if (response.solutionResults.IIS.length === 1){
          description = "存在无法满足的约束：" + response.solutionResults.IIS.map(item => Object.keys(item)[0]).join("<br>");
        } else{
          description = "不存在满足所有条件的课表";
          description += "，冲突的约束为：<br>" + response.solutionResults.IIS.map((item, index) => `${index + 1}. ${Object.keys(item)[0]}`).join('<br>');
        }
      }
      // 确保 HTML 标签能被正确解析
      updatePreferenceDescription(description)
    }else if(response.message) {
      messages.value.push({ sender: 'Bot', text: response.message.replace(/\n/g, '<br>'), type: 'text' });
    }

    if (response.featureExprs) {
      currentPreference.value.featureExprs = response.featureExprs;
    }
    
    if (response.global_constraints){
      updateGlobalConstraints(response.global_constraints);
      console.log("Initialized first node with global constraints");
    }

    if(response.maximal_cliques){
      maximal_cliques.value = response.maximal_cliques;
    }

    if(response.candidateItems){
      currentPreference.value.candidateItems = response.candidateItems;
      // 抽取不同的课程名
      const uniqueCourseNames = currentPreference.value.candidateItems ? [...new Set(currentPreference.value.candidateItems.map(item => item['课程名']))] : [];
      if (currentPreference.value.candidateItems.length > 0) {
        // 创建课程选择消息
        messages.value.push({ 
          sender: 'Bot', 
          type: 'addCourses',
          content: {
            addedCount: uniqueCourseNames.length,
            totalCount: currentPreference.value.candidateItems.length, // 修改为这次添加的课程总数
            courses: uniqueCourseNames.map(name => ({
              name: name,
              isRequired: true // 如果是第一次添加课程，默认全选
            })),
            isFirstTime: true
          },
          confirmed: false
        });
      }
    }

  }

  
  export const saveFeatureExprs = async (featureExpr, isTrue) => {
    const requestData = {
      addedFeatureExprs: featureExpr,
      isTrue: isTrue,
      candidateItems: currentPreference.value.candidateItems,
      problemModel: getProblemModel(),
    }
    console.log("addedFeatureExprs", featureExpr)
    messages.value[messages.value.length - 1].updated = true;
    if(isTrue) {
      messages.value[messages.value.length - 1].buttonMessage = "已记录该特征"
    }else {
      messages.value[messages.value.length - 1].buttonMessage = "重新生成特征，请稍等..."
    }
    const response = await getSavedFeaturesResponseFromBackend(requestData);
    processResponseMessage(response)
    
  }