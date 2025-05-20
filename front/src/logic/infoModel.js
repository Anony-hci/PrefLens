import { ref } from 'vue';

// 弹窗相关状态
export const showInfoModal = ref(false);
export const modalTitle = ref('信息');
export const modalContent = ref('');
export const modalShowConfirm = ref(false);
export const modalCallback = ref(null);

// 显示弹窗的函数
export const showModal = (title, content, showConfirm = false, callback = null) => {
  modalTitle.value = title;
  modalContent.value = content;
  modalShowConfirm.value = showConfirm;
  modalCallback.value = callback;
  showInfoModal.value = true;
};

// 处理确认按钮点击
export const handleModalConfirm = () => {
  if (modalCallback.value) {
    modalCallback.value();
  }
};

// 关闭弹窗
export const closeModal = () => {
  showInfoModal.value = false;
};


export const showIntroWords = () => {
  const title = "系统介绍";
  const content = "欢迎使用课程选择系统！所有课程已展示在课程表中，便于浏览和选择。\n\n在收藏夹中，您可以：\n1. 使用折叠按钮(▶/▼)展开或收起课程详细信息\n2. 通过显示/隐藏按钮控制课程在界面上的显示状态\n3. 勾选复选框来选择或取消选择课程\n\n在课程表中，您可以：\n1. 直接点击课程来添加选课需求\n2. 点击删除按钮移除课程（等同于在收藏夹中取消勾选）"
  
  showModal(title, content);
}; 

