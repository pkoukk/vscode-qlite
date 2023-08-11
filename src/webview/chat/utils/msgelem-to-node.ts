import { Tag } from '@vscode/webview-ui-toolkit';
import { MessageElem } from 'icqq';
import * as chat from '../../../message/chat';
import { messenger } from '../script';

/** face表情类型 */
export enum FaceType {
  /** 静态表情 */
  static,
  /** 动态表情 */
  gif
}

/**
 * 添加`elem`元素的点击显示图片交互事件
 * @param elem 实现目标元素
 * @param src 图片地址
 */
function addTagClickEvent(elem: Tag, src: string) {
  /** 被显示的图片 */
  const image = document.createElement('img');
  image.src = src;
  image.className = 'enlarge';
  /** 是否显示了图片 */
  let showImage = false;
  // 点击显示图片
  elem.onclick = () => {
    if (showImage) {
      return;
    }
    showImage = true;
    // 图片插入到body一级子元素中
    document.body.children[0].insertAdjacentElement('afterend', image);
    document.addEventListener('click', function removeImg(ev: MouseEvent) {
      if (
        ev.target !== elem &&
        !elem.contains(ev.target as Node) &&
        ev.target !== image
      ) {
        showImage = false;
        // 移除图片
        image.parentNode?.removeChild(image);
        // 移除监听器
        document.removeEventListener('click', removeImg);
      }
    });
  };
}

/**
 * 创建图片组件，由`vscode-tag`代替，点击时显示原图
 * @param src 图片地址
 * @param asface 是否标记为表情
 * @returns `vscode-tag`组件
 */
export function createImgElem(src: string, asface?: boolean) {
  const elem = new Tag();
  elem.textContent = asface ? '表情' : '图片';
  elem.className = 'image';
  elem.setAttribute('src', src);
  addTagClickEvent(elem, src);
  return elem;
}

/**
 * 创建漫游表情组件，由`vscode-tag`代替，点击时显示原图
 * @param src 图片地址
 * @returns `vscode-tag`组件
 */
export function createStampElem(src: string) {
  const elem = new Tag();
  elem.textContent = '表情';
  elem.className = 'stamp';
  elem.setAttribute('src', src);
  addTagClickEvent(elem, src);
  return elem;
}

/**
 * 创建QQ表情组件
 * @param id 表情的`id`
 * @param type 显示的表情类型：静态or动态
 * @param desc 标签
 * @returns `image`组件
 */
export function createFaceElem(id: number, type: FaceType, desc?: string) {
  const elem = new Image();
  elem.src =
    `https://qq-face.vercel.app/` +
    `${type ? 'gif' : 'static'}/s${id}.${type ? 'gif' : 'png'}`;
  elem.title = elem.alt = desc ?? 'QQ表情';
  elem.className = 'face';
  return elem;
}

/**
 * 创建AT组件
 * @param qq AT对象的QQ，为`'all'`说明AT全体成员
 * @param target AT的对象，包含`@`符号
 * @returns `span`组件
 */
export function createAtElem(qq: number | 'all', target?: string) {
  const elem = document.createElement('span');
  elem.className = 'at';
  elem.textContent = qq === 'all' ? '@全体成员' : target ?? String(qq);
  elem.setAttribute('qq', String(qq));
  return elem;
}

/**
 * 创建文件组件
 * @todo 自定义文件组件
 * @param name 文件名
 * @param fid 文件id
 * @param size 文件大小
 * @param duration 存在时间
 * @returns `vscode-tag`组件
 */
export function createFileElem(
  name: string,
  fid: string,
  size: number,
  duration: number
) {
  const elem = new Tag();
  elem.className = 'file';
  elem.textContent = `${name} (${size}B \\ ${duration}s后过期)`;
  elem.title = '点击下载';
  elem.setAttribute('fid', fid);
  elem.addEventListener('click', () =>
    messenger.sendNotification(chat.getFileUrl, { type: 'extension' }, fid)
  );
  return elem;
}

/**
 * 创建戳一戳组件
 * @param text 动作名，默认`戳一戳`
 * @returns `vscode-tag`组件
 */
export function createPokeElem(text?: string) {
  const elem = document.createElement('vscode-tag') as Tag;
  elem.className = 'poke';
  elem.textContent = text ?? '戳一戳';
  return elem;
}

/**
 * 解析消息链为`html`对象
 * @todo 添加对其他消息类型的解析
 * @param msgElemList 消息链
 * @returns `html`对象列表
 */
export default function msgElemToNode(msgElemList: MessageElem[]): ChildNode[] {
  const message: ChildNode[] = [];
  msgElemList.forEach((msgElem) => {
    switch (msgElem.type) {
      case 'at':
        message.push(createAtElem(msgElem.qq, msgElem.text));
        break;
      case 'bface':
        break;
      case 'dice':
        break;
      case 'face':
        message.push(createFaceElem(msgElem.id, FaceType.static, msgElem.text));
        break;
      case 'file':
        message.push(
          createFileElem(
            msgElem.name,
            msgElem.fid,
            msgElem.size,
            msgElem.duration
          )
        );
        break;
      case 'flash':
        break;
      case 'image':
        message.push(createImgElem(msgElem.url as string, msgElem.asface));
        break;
      case 'json':
        break;
      case 'location':
        break;
      case 'mirai':
        break;
      case 'music':
        break;
      case 'node':
        break;
      case 'poke':
        message.push(createPokeElem(msgElem.text));
        break;
      case 'quote':
        break;
      case 'record':
        break;
      case 'reply':
        break;
      case 'rps':
        break;
      case 'sface':
        /**
         * @todo sface的id不明，不建议使用face表情解析
         */
        message.push(createFaceElem(msgElem.id, FaceType.gif, msgElem.text));
        break;
      case 'share':
        break;
      case 'text':
        message.push(document.createTextNode(msgElem.text));
        break;
      case 'video':
        break;
      case 'xml':
        break;
    }
  });
  return message;
}
