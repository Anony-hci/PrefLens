const API_URL = 'http://localhost:8010'; // 替换后端 API 地址
// 上传数据到后端
export const sayHelloToBackend = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/recover`, 'POST', { sessionId: sessionId });
    console.log('success connecting to backend:', data);
    return data;
  } catch (error) {
    console.error('Error connecting to backend:', error);
  }
};

// 调用后端 API 获取响应
export const setBaseSolutionForBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/set_base_solution`, 'POST', {...requestData, sessionId: sessionId});
    return data;
  } catch (error) {
    return {
      message: "抱歉，设置base solution出错了。",
    };
  }
};

// 调用后端 API 获取响应
export const getSavedFeaturesResponseFromBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/saved_features`, 'POST', {...requestData, sessionId: sessionId});
    return data;
  } catch (error) {
    return {
      message: "抱歉，问题求解出错了。",
    };
  }
};

export const getIncrementalProblemSolvingFromBackend = async(requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/incremental_solve`, 'POST', { ...requestData, sessionId: sessionId });
    return data;
  } catch (error) {
    return {
      message: "抱歉，问题求解出错了。",
      solutionResults: null,
    };
  }
};

// 调用后端 API 获取响应
export const getSolutionsResponseFromBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    
    // 使用更长超时时间的fetchData版本
    const data = await fetchDataWithLongerTimeout(`${API_URL}/solve`, 'POST', { ...requestData, sessionId: sessionId });
    console.log("getSolutionsResponseFromBackend", data)
    return data;
    
  } catch (error) {
    console.error('Error solving problem:', error);
    return {
      message: "抱歉，问题求解出错了。",
      solutionResults: null,
    };
  }
};

// 调用后端 API 获取响应
export const getFeaturesResponseFromBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/features`, 'POST', { ...requestData, sessionId: sessionId });
    return data;
  } catch (error) {
    return {
      message: "抱歉，问题求解出错了。",
      solutionResults: null,
    };
  }
};

// 调用后端 API 获取响应
export const getMessageResponseFromBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/message`, 'POST', { ...requestData, sessionId: sessionId });
    return data;
  } catch (error) {
    return {
      message: "抱歉，服务器出错了。",
      problemModel: null,
      solutionResults: null,
    };
  }
};

// 上传数据到后端
export const uploadDataToBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/upload_data`, 'POST', { ...requestData, sessionId: sessionId });
    console.log('Data uploaded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error uploading data:', error);
  }
};

// 更新数据到后端
export const updateDataToBackend = async (action, item) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const resData = await fetchData(`${API_URL}/update_data`, 'POST', { action, item, sessionId });
    console.log('Data updated successfully:', resData);
  } catch (error) {
    console.error('Error updating data:', error);
  }
};

export const createSession = async (sessionId) => {
  try {
    localStorage.setItem('sessionId', sessionId);
    const data = await fetchData(`${API_URL}/create_session`, 'POST', {sessionId: sessionId});
    console.log('Session created successfully:', data);
    return data;  
  } catch (error) {
    console.error('Error creating session:', error);
  }
};



export const closeSession = async () => {
  try {
    // Retrieve the sessionId from localStorage
    const sessionId = localStorage.getItem('sessionId');
    console.log(sessionId)

    if (!sessionId) {
      console.error('No session found to close.');
      return;
    }

    // Use fetchData to send a POST request to close the session
    const data = await fetchData(`${API_URL}/close_session`, 'POST', {sessionId: sessionId});

    // If the session is successfully closed, remove it from localStorage
    localStorage.removeItem('sessionId');
    console.log('Session closed successfully:', data.message);

    return data.message;  // Return success message or any other useful info
  } catch (error) {
    console.error('Error closing session:', error);
  }
};


export const fetchData = async (url, method, body = null) => {
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

// 发送必修课程到后端
export const sendRequiredCoursesToBackend = async (requestData) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const response = await fetch(`${API_URL}/required_courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestData,
        sessionId: sessionId
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending required courses to backend:', error);
    return { message: '发送必修课程信息失败，请重试。' };
  }
};

// 添加一个更长超时时间的fetchData版本
export const fetchDataWithLongerTimeout = async (url, method, body = null) => {
  try {
    // 使用AbortController来控制超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100000); // 100秒超时
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // 清除超时
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out after 100 seconds');
      throw new Error('请求超时，求解过程可能需要更长时间');
    }
    console.error('Error fetching data:', error);
    throw error;
  }
};

// 更新消息到后端
export const updateMessagesToBackend = async (messages) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/update_messages`, 'POST', { messages, sessionId });
    console.log('Messages updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating messages:', error);
  }
};

// 更新候选项目到后端
export const updateCandidateItemsToBackend = async (candidateItems) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/update_candidate_items`, 'POST', { candidateItems, sessionId });
    console.log('Candidate items updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating candidate items:', error);
  }
};

// 更新候选项目到后端
export const updateCurrentPreferenceToBackend = async (currentPreference) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/update_preference`, 'POST', { currentPreference, sessionId });
    console.log('Preference updated successfully:', currentPreference);
    return data;
  } catch (error) {
    console.error('Error updating candidate items:', error);
  }
};

// 更新模型节点到后端
export const updateModelNodesToBackend = async (modelNodes) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      throw new Error("Session ID not found.");
    }
    const data = await fetchData(`${API_URL}/update_model_nodes`, 'POST', { modelNodes, sessionId });
    console.log('Model nodes updated successfully:', data, modelNodes);
    return data;
  } catch (error) {
    console.error('Error updating model nodes:', error);
  }
};

