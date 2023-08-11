import { ExtensionContext, commands } from 'vscode';
import search from './contact/search';
import setting from './contact/setting';
import Global from './global';
import { CredentialsManager } from './drive/credentialsManager';
import { DriveAuthenticator } from './drive/driveAuthenticator';
import { CredentialsConfigurator } from './drive/credentialsConfigurator';
import { listFiles } from './chat/drive';

/** 扩展启动 */
export function activate(context: ExtensionContext) {
  // qlite.isOnline = false
  commands.executeCommand('setContext', 'qlite.isOnline', false);
  new Global(context);
  const credentialsManager = new CredentialsManager();
  const driveAuthenticator = new DriveAuthenticator(credentialsManager);
  const credentialsConfigurator = new CredentialsConfigurator(
    driveAuthenticator
  );
  console.log('init credentialsConfigurator');
  Global.authenticator = driveAuthenticator;
  // 注册扩展命令
  context.subscriptions.push(
    commands.registerCommand('qlite.setting', setting),
    commands.registerCommand('qlite.search', search),
    commands.registerCommand(
      'qlite.chat',
      Global.chatViewManager.newChat.bind(Global.chatViewManager)
    ),
    commands.registerCommand(
      'qlite.removeMsg',
      Global.contactViewProvider.removeMsg.bind(Global.contactViewProvider)
    ),
    commands.registerCommand(
      'qlite.profile',
      Global.contactViewProvider.showProfile
    )
  );

  credentialsConfigurator.checkCredentialsConfigured();
}

/** 扩展关闭 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
