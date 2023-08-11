import { existsSync, mkdirSync, readFileSync } from 'fs';
import { Client, Config, Platform } from 'icqq';
import { homedir } from 'os';
import path from 'path';
import {
  ExtensionContext,
  Uri,
  Webview,
  commands,
  window,
  workspace
} from 'vscode';
import ChatViewManager from './chat/chat-view';
import ContactTreeDataProvider from './contact/contact-tree';
import LoginViewProvider from './login/login-view';
import { Messenger } from 'vscode-messenger';
import { DriveAuthenticator } from './drive/driveAuthenticator';

/**
 * 获取用户登录协议设置
 * @param command 设置名
 * @returns 登录协议枚举值
 */
function getConfiguration(command: 'platform'): Platform;
/**
 * 获取用户设置
 * @param command 设置名
 * @returns 设置名的对应值
 */
function getConfiguration(command: string) {
  const conf = workspace.getConfiguration('qlite');
  if (command === 'platform') {
    const platformName = conf.get<keyof typeof Platform>(command) ?? 'Android';
    const platform = Platform[platformName];
    if (platform) {
      return platform;
    } else {
      conf.update(command, undefined);
      return Platform.Android;
    }
  }
  return undefined;
}

/** 管理全局静态变量，扩展启动时初始化所有静态成员变量 */
export default class Global {
  /** 扩展工具集 */
  static context: ExtensionContext;
  /** 客户端实例 */
  static client: Client;
  /** 存放本扩展所有创建的文件的根目录 */
  static rootDir: string;
  /** 登录视图容器 */
  static loginViewProvider: LoginViewProvider;
  /** 联系人视图容器 */
  static contactViewProvider: ContactTreeDataProvider;
  /** 聊天页面容器 */
  static chatViewManager: ChatViewManager;
  /** 消息处理器 */
  static messenger: Messenger;

  static authenticator: DriveAuthenticator;

  constructor(context: ExtensionContext) {
    Global.context = context;

    // rootdir = `${HOME}/.qlite`
    Global.rootDir = path.join(homedir(), '.qlite');
    // 创建根目录文件夹
    if (!existsSync(Global.rootDir)) {
      mkdirSync(Global.rootDir);
    }

    /** {@link Global.client client} 的配置参数 */
    const defaultConf: Config = {
      log_level: 'error',
      platform: getConfiguration('platform'),
      data_dir: Global.rootDir,
      sign_api_addr: 'http://qq.wxfsq.com/sign'
    };
    Global.client = new Client(defaultConf);
    // 离线
    Global.client.on('system.offline', ({ message }) => {
      commands.executeCommand('setContext', 'qlite.isOnline', false);
      window.showWarningMessage(`${message}\nclient offline`);
    });
    // 初始化视图容器
    Global.loginViewProvider = new LoginViewProvider(context.extensionUri);
    window.registerWebviewViewProvider('loginView', Global.loginViewProvider);
    Global.contactViewProvider = new ContactTreeDataProvider(Global.client);
    window.registerTreeDataProvider('contactView', Global.contactViewProvider);
    Global.chatViewManager = new ChatViewManager(Global.context.extensionUri);
    // 初始化处理器
    Global.messenger = new Messenger();
  }
}

/**
 * 获取`webview`的`html`并链接所需资源文件
 * @param webview 目标页面`webview`实例
 * @param webDir 页面资源文件所在文件目录名，编译后在`out`的直接目录下
 * @returns 处理后的`html`
 */
export function getHtmlForWebview(webview: Webview, webDir: string) {
  /** 登陆界面的所有素材的根目录 */
  const webviewUri = Uri.joinPath(Global.context.extensionUri, 'out');
  /** `html`文件的地址 */
  const htmlPath = Uri.joinPath(webviewUri, webDir, 'index.html').fsPath;
  /** 所有要替换的`Uri`键值对，包含`js`、`css`等文件的`Uri` */
  const htmlUris: Map<string, Uri> = new Map();
  // 每个页面都需要这3个资源文件
  ['script.js', 'style.css'].forEach((value) =>
    htmlUris.set(
      value.split('.')[0] + 'Uri',
      webview.asWebviewUri(Uri.joinPath(webviewUri, webDir, value))
    )
  );
  htmlUris.set(
    'codiconUri',
    webview.asWebviewUri(Uri.joinPath(webviewUri, 'codicon.css'))
  );
  const html: string = readFileSync(htmlPath, 'utf-8').replace(
    /\${(\w+)}/g,
    (match, key) => htmlUris.get(key)?.toString() ?? html
  );
  return html;
}
