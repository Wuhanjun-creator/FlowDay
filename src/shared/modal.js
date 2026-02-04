// 自定义弹窗组件 - 替代浏览器内置 alert/confirm/prompt

import { $ } from './common.js';

// 创建弹窗容器
const createModalContainer = () => {
  let container = $('#custom-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'custom-modal-container';
    container.className = 'modal-container';
    document.body.appendChild(container);
  }
  return container;
};

// 显示遮罩层
const showOverlay = () => {
  let overlay = $('#modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('show');
  return overlay;
};

// 隐藏遮罩层
const hideOverlay = () => {
  const overlay = $('#modal-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
};

// 自定义 Alert
export const showAlert = (options) => {
  return new Promise((resolve) => {
    const { title = '提示', message = '', confirmText = '确定' } = typeof options === 'string' ? { message: options } : options;
    
    const container = createModalContainer();
    const overlay = showOverlay();
    
    const modal = document.createElement('div');
    modal.className = 'modal-dialog alert-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <div class="modal-body">
        <p class="modal-message">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="solid modal-btn-confirm" type="button">${escapeHtml(confirmText)}</button>
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    
    // 动画显示
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
    
    // 关闭处理
    const closeModal = () => {
      modal.classList.remove('show');
      hideOverlay();
      setTimeout(() => {
        container.innerHTML = '';
        resolve();
      }, 200);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-btn-confirm').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // ESC键关闭
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
};

// 自定义 Confirm
export const showConfirm = (options) => {
  return new Promise((resolve) => {
    const { 
      title = '确认', 
      message = '', 
      confirmText = '确定', 
      cancelText = '取消' 
    } = typeof options === 'string' ? { message: options } : options;
    
    const container = createModalContainer();
    const overlay = showOverlay();
    
    const modal = document.createElement('div');
    modal.className = 'modal-dialog confirm-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <div class="modal-body">
        <p class="modal-message">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="ghost modal-btn-cancel" type="button">${escapeHtml(cancelText)}</button>
        <button class="solid modal-btn-confirm" type="button">${escapeHtml(confirmText)}</button>
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    
    // 动画显示
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
    
    // 关闭处理
    const closeModal = (result) => {
      modal.classList.remove('show');
      hideOverlay();
      setTimeout(() => {
        container.innerHTML = '';
        resolve(result);
      }, 200);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(false));
    modal.querySelector('.modal-btn-cancel').addEventListener('click', () => closeModal(false));
    modal.querySelector('.modal-btn-confirm').addEventListener('click', () => closeModal(true));
    overlay.addEventListener('click', () => closeModal(false));
    
    // ESC键关闭
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal(false);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
};

// 自定义 Prompt
export const showPrompt = (options) => {
  return new Promise((resolve) => {
    const { 
      title = '输入', 
      message = '', 
      defaultValue = '', 
      confirmText = '确定', 
      cancelText = '取消',
      placeholder = ''
    } = typeof options === 'string' ? { message: options } : options;
    
    const container = createModalContainer();
    const overlay = showOverlay();
    
    const modal = document.createElement('div');
    modal.className = 'modal-dialog prompt-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <div class="modal-body">
        ${message ? `<p class="modal-message">${escapeHtml(message)}</p>` : ''}
        <input type="text" class="modal-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" />
      </div>
      <div class="modal-footer">
        <button class="ghost modal-btn-cancel" type="button">${escapeHtml(cancelText)}</button>
        <button class="solid modal-btn-confirm" type="button">${escapeHtml(confirmText)}</button>
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(modal);
    
    const input = modal.querySelector('.modal-input');
    
    // 动画显示并聚焦
    requestAnimationFrame(() => {
      modal.classList.add('show');
      input.focus();
      input.select();
    });
    
    // 关闭处理
    const closeModal = (result) => {
      modal.classList.remove('show');
      hideOverlay();
      setTimeout(() => {
        container.innerHTML = '';
        resolve(result);
      }, 200);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(null));
    modal.querySelector('.modal-btn-cancel').addEventListener('click', () => closeModal(null));
    modal.querySelector('.modal-btn-confirm').addEventListener('click', () => closeModal(input.value.trim()));
    overlay.addEventListener('click', () => closeModal(null));
    
    // 回车确认
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        closeModal(input.value.trim());
      }
    });
    
    // ESC键关闭
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal(null);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
};

// HTML转义
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
