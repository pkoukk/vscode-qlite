import * as webviewUiToolkit from '@vscode/webview-ui-toolkit';
import * as icqq from 'icqq';
import { inHTMLData } from 'xss-filters';
import * as chat from '../../message/chat';
import { ChatType } from '../../message/parse-msg-id';
import createNoticeMsg from './utils/create-notice-msg';
import createUserMsg, { createFlagSpan } from './utils/create-user-msg';
import { facemap } from './utils/face';
import {
  FaceType,
  createAtElem,
  createFaceElem,
  createImgElem,
  createStampElem
} from './utils/msgelem-to-node';
import nodeToMsgElem from './utils/node-to-msgelem';
import { Messenger } from 'vscode-messenger-webview';

// 注册UI组件
webviewUiToolkit
  .provideVSCodeDesignSystem()
  .register(webviewUiToolkit.allComponents);

/** 与扩展主体通信的变量 */
const vscode = acquireVsCodeApi();
/** 消息处理器 */
export const messenger = new Messenger(vscode);
messenger.start();

// 获取页面组件
/** 上半部分的消息容器 */
const msgBox = document.querySelector('.message') as HTMLDivElement;
/** 下半部分的聊天容器 */
const chatBox = document.querySelector('.chat') as HTMLDivElement;
/** 漫游表情栏 */
const stampBox = chatBox.querySelector('.stamp-box') as HTMLDivElement;
/** QQ表情栏 */
const faceBox = chatBox.querySelector('.face-box') as HTMLDivElement;
/** at列表 */
const atBox = chatBox.querySelector('.at-box') as HTMLDivElement;
/** 文件工具栏 */
const fileBox = chatBox.querySelector('#file-box') as HTMLInputElement;
/** 工具栏 */
const toolBox = chatBox.querySelector('.tool-box') as HTMLDivElement;
/** 漫游表情工具 */
const stampBtn = toolBox.querySelector('.stamp-btn') as webviewUiToolkit.Button;
/** sface表情工具 */
const faceBtn = toolBox.querySelector('.face-btn') as webviewUiToolkit.Button;
/** at工具 */
const atBtn = toolBox.querySelector('.at-btn') as webviewUiToolkit.Button;
/** 文件工具 */
const fileBtn = toolBox.querySelector('.file-btn') as webviewUiToolkit.Button;
/** 输入容器 */
const inputBox = chatBox.querySelector('.input-box') as HTMLDivElement;
/** 输入框 */
const inputArea = inputBox.querySelector('.input') as HTMLDivElement;
/** 发送按钮 */
const sendButton = inputBox.querySelector('.send') as webviewUiToolkit.Button;

/** 用户的基本信息 */
export let user: chat.UserInfo;

/** 请求历史消息的状态，避免重复请求 */
let requestHistoryState = false;

/** 上一次滑动时的页面与顶部的距离 */
let lastTop = 0;

/**
 * 获取目标消息的`html`对象
 * @param message_id 按`id`查找消息
 * @returns 消息对象，没找到为`undefined`
 */
function getMessage(message_id: string) {
  return Array.from(msgBox.querySelectorAll('.msg')).find(
    (msg) => msg.getAttribute('msgid') === message_id
  );
}

/**
 * 获取历史消息，调用此函数前请先判断 {@link requestHistoryState} 是否为真，为真则不要调用此函数
 * @param message_id 如果此值非空则从该消息往前获取历史消息
 * @returns 消息列表
 */
function getChatHistory(
  message_id?: string
): Promise<(icqq.PrivateMessage | icqq.GroupMessage)[]> {
  if (requestHistoryState) {
    throw new Error('ChatView getChatHistory: duplicate function call');
  }
  requestHistoryState = true;
  return new Promise((resolve) => {
    messenger
      .sendRequest(chat.getChatHistory, { type: 'extension' }, message_id)
      .then((history) => {
        // 按发言时间逆序排列
        history.sort((a, b) => b.time - a.time);
        resolve(history);
        requestHistoryState = false;
      });
  });
}

/**
 * 向光标位置插入元素
 * @param node 被插入的元素节点
 */
function insertInput(node: Node) {
  const selection = window.getSelection() as Selection;
  if (document.activeElement !== inputArea) {
    // 光标不在输入框中
    const range = document.createRange();
    range.setStart(inputArea, inputArea.childNodes.length);
    range.setEnd(inputArea, inputArea.childNodes.length);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  let range = selection.getRangeAt(0);
  // 插入目标节点
  range.insertNode(node);
  selection.collapseToEnd();
  range = selection.getRangeAt(0);
  // 插入空字符
  range.insertNode(document.createTextNode(' '));
  selection.collapseToEnd();
}

// 接受来自扩展的消息
messenger.onNotification(chat.messageEvent, (message) => {
  if (getMessage(message.message_id)) {
    return;
  }
  msgBox.insertAdjacentElement('beforeend', createUserMsg(message));
});
messenger.onNotification(chat.noticeEvent, (notice) => {
  if (getMessage(notice.message_id)) {
    return;
  }
  createNoticeMsg(notice).then((elem) =>
    msgBox.insertAdjacentElement('beforeend', elem)
  );
});

// 打开漫游表情工具栏
stampBtn.addEventListener('click', () => {
  stampBox.style.display = 'flex';
  stampBtn.disabled = true;
});
// 点击其他地方关闭工具栏
document.addEventListener('click', (ev) => {
  if (
    ev.target !== stampBox &&
    ev.target !== stampBtn &&
    !stampBox.contains(ev.target as Node) &&
    !stampBtn.contains(ev.target as Node)
  ) {
    stampBox.style.display = 'none';
    stampBtn.disabled = false;
  }
});

// 打开sface表情工具栏
faceBtn.addEventListener('click', () => {
  faceBox.style.display = 'flex';
  faceBtn.disabled = true;
});
// 点击其他地方关闭工具栏
document.addEventListener('click', (ev) => {
  if (
    ev.target !== faceBox &&
    ev.target !== faceBtn &&
    !faceBox.contains(ev.target as Node) &&
    !faceBtn.contains(ev.target as Node)
  ) {
    faceBox.style.display = 'none';
    faceBtn.disabled = false;
  }
});

// 打开at成员工具栏
atBtn.addEventListener('click', () => {
  atBox.style.display = 'flex';
  atBtn.disabled = true;
});
// 点击其他地方关闭工具栏
document.addEventListener('click', (ev) => {
  if (
    ev.target !== atBox &&
    ev.target !== atBtn &&
    !atBox.contains(ev.target as Node) &&
    !atBtn.contains(ev.target as Node)
  ) {
    atBox.style.display = 'none';
    atBtn.disabled = false;
  }
});

// 打开文件工具栏
fileBtn.addEventListener('click', () => {
  // 由input接管文件选取功能
  fileBox.click();
});
fileBox.addEventListener('change', (ev) => {
  ev.preventDefault();
  const files = (ev.target as HTMLInputElement).files;
  if (!files) {
    return;
  }
  messenger
    .sendRequest(
      chat.sendFile,
      { type: 'extension' },
      (files[0] as File & { path: string }).path
    )
    .then((msg) => {
      if (!msg) {
        return console.error('ChatView sendFile: get file failed');
      }
      msgBox.insertAdjacentElement('beforeend', createUserMsg(msg));
    });
});

// 输入框按下按键时
inputArea.addEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    // 按下Enter键时发送消息
    ev.preventDefault();
    sendButton.click();
  }
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    // 删除非文本和表情时将其整体移除
    const selection = window.getSelection() as Selection;
    const node = selection.anchorNode?.parentNode;
    if (node?.nodeName === 'VSCODE-TAG' || node?.nodeName === 'SPAN') {
      // 光标在非文本组件中
      ev.preventDefault();
      node.parentElement?.removeChild(node);
    } else if (node?.nodeName === 'DIV') {
      const text = selection.anchorNode as Text;
      if (ev.key === 'Backspace') {
        const prev = text.previousSibling;
        if (
          prev &&
          (prev.nodeName === 'VSCODE-TAG' || prev.nodeName === 'SPAN') &&
          selection.anchorOffset === 0
        ) {
          // 光标的左侧紧贴非文本组件且为backspace键
          ev.preventDefault();
          node.removeChild(prev);
        }
      } else {
        const next = text.nextSibling;
        if (
          next &&
          (next.nodeName === 'VSCODE-TAG' || next.nodeName === 'SPAN') &&
          selection.anchorOffset === text.length
        ) {
          // 光标的右侧紧贴非文本组件且为delete键
          ev.preventDefault();
          node.removeChild(next);
        }
      }
    }
  }
});

// 粘贴信息到输入框
inputArea.addEventListener('paste', (ev: ClipboardEvent) => {
  if (!ev.clipboardData || !ev.clipboardData.items) {
    return;
  }
  ev.preventDefault();
  const clipBoardData = ev.clipboardData as DataTransfer;
  Array.from(clipBoardData.items).map((item) => {
    if (item.kind === 'string') {
      if (item.type === 'text/plain') {
        item.getAsString((str) =>
          insertInput(document.createTextNode(inHTMLData(str)))
        );
      }
    } else if (item.kind === 'file') {
      if (item.type.startsWith('image')) {
        const reader = new FileReader();
        reader.onload = () =>
          insertInput(createImgElem(reader.result as string));
        reader.readAsDataURL(item.getAsFile() as File);
      }
    } else {
      console.warn('ChatView paste: unsupported data');
    }
  });
});

// 点击发送按钮发送消息
sendButton.addEventListener('click', function (this: webviewUiToolkit.Button) {
  const inputNodes = inputArea.childNodes;
  if (this.disabled) {
    console.warn('ChatView sendMessage: 消息发送中');
    return;
  } else if (!inputNodes.length) {
    return;
  }
  this.disabled = true;
  const msgElems: icqq.MessageElem[] = nodeToMsgElem(inputNodes);
  messenger
    .sendRequest(chat.sendMsg, { type: 'extension' }, { content: msgElems })
    .then((msg) => {
      console.log('message return result', msg);
      if (!msg) {
        return console.error('ChatView sendMessage: get msg failed');
      }
      msgBox.insertAdjacentElement('beforeend', createUserMsg(msg));
      msgBox.scrollTo(0, msgBox.scrollHeight);
    })
    .finally(() => {
      this.disabled = false;
      inputArea.textContent = '';
    });
});

// 页面滑动时
msgBox.addEventListener('scroll', function (ev: Event) {
  const curTop = (ev.target as HTMLDivElement).scrollTop;
  // 当用户滑动方向为上且接近顶部时加载历史消息
  if (curTop < 10 && lastTop > curTop) {
    const firstMsg = this.querySelector('.msg');
    const message_id = firstMsg?.getAttribute('msgid');
    if (requestHistoryState) {
      return;
    }
    getChatHistory(message_id ?? undefined).then((msgList) =>
      msgList.forEach((msg) => {
        if (!getMessage(msg.message_id)) {
          this.insertAdjacentElement('afterbegin', createUserMsg(msg));
        }
      })
    );
  }
  lastTop = curTop;
});

(async () => {
  try {
    // 优先获取基本信息
    user = await messenger.sendRequest(chat.getSimpleInfo, {
      type: 'extension'
    });
    if (user.type === ChatType.Friend) {
      // 私聊隐藏at工具
      atBtn.style.display = 'none';
    } else {
      messenger
        .sendRequest(chat.getMember, { type: 'extension' })
        .then(({ atAll, members }) => {
          if (atAll) {
            // at所有人
            const atAllElem = document.createElement('div');
            const elem = new webviewUiToolkit.Button();
            elem.appearance = 'secondary';
            elem.append(atAllElem);
            elem.onclick = () => insertInput(createAtElem('all'));
            atAllElem.title = 'all';
            atAllElem.textContent = '全体成员';
            atBox.append(elem);
          }
          members
            // 昵称排序
            .sort((a, b) => {
              // 获取名称
              const aName = a.card ? a.card : a.nickname;
              const bName = b.card ? b.card : b.nickname;
              return aName.localeCompare(bName);
            })
            // 每位at成员选项
            .forEach((member) => {
              const name = member.card ? member.card : member.nickname;
              const elem = new webviewUiToolkit.Button();
              elem.appearance = 'secondary';
              elem.title = member.user_id.toString();
              elem.textContent = name;
              elem.onclick = () =>
                insertInput(createAtElem(member.user_id, name));
              if (member.role !== 'member') {
                // 添加头衔
                elem.append(createFlagSpan(member.role));
              }
              atBox.append(elem);
            });
        });
    }
  } catch (error: any) {
    console.error('ChatView getSimpleInfo: ' + error.message);
  }
  // 初次加载历史消息
  getChatHistory().then((msgList) => {
    msgList.forEach((msg) =>
      msgBox.insertAdjacentElement('afterbegin', createUserMsg(msg))
    );
    // 滑动窗口到底部
    msgBox.scrollTop = msgBox.offsetTop + msgBox.offsetHeight;
  });
  // 工具栏不显示
  stampBox.style.display = 'none';
  faceBox.style.display = 'none';
  atBox.style.display = 'none';
  // 加载漫游表情
  messenger.sendRequest(chat.getStamp, { type: 'extension' }).then((stamps) => {
    stamps.forEach((stamp) => {
      const img = document.createElement('img');
      img.src = stamp;
      const elem = new webviewUiToolkit.Button();
      elem.appearance = 'icon';
      elem.append(img);
      elem.onclick = () => insertInput(createStampElem(stamp));
      stampBox.append(elem);
    });
  });
  // 加载face表情
  for (const id in facemap) {
    const face = document.createElement('img');
    face.src = `https://koishi.js.org/QFace/static/s${id}.png`;
    face.title = face.alt = facemap[id];
    const elem = new webviewUiToolkit.Button();
    elem.appearance = 'icon';
    elem.append(face);
    elem.onclick = () =>
      insertInput(createFaceElem(Number(id), FaceType.static, facemap[id]));
    faceBox.append(elem);
  }
})();
