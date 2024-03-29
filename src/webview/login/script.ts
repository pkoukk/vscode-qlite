import {
  provideVSCodeDesignSystem,
  allComponents,
  Radio,
  TextField,
  Option,
  Tag,
  Checkbox,
  Button
} from '@vscode/webview-ui-toolkit';
import {
  ReqMsg,
  ResMsg,
  LoginRecord,
  PasswordLoginRecord,
  QrcodeLoginRecord,
  TokenLoginRecord
} from '../../types/login';
import MessageHandler from '../message-handler';
/** 注册`vscode-ui`的`webview`组件 */
provideVSCodeDesignSystem().register(allComponents);
/** 与扩展主体通信的变量 */
const vscode = acquireVsCodeApi();
/** 消息处理器 */
const msgHandler = new MessageHandler(vscode);

// 获取页面组件
const loginRadios = document.querySelectorAll(
  'vscode-radio-group vscode-radio'
) as NodeListOf<Radio>;
const uinText = document.getElementById('uin') as TextField;
const passwordText = document.getElementById('password') as TextField;
const rememberOption = document.getElementById('remember') as Option;
const tokenTag = document.getElementById('token-warn') as Tag;
const autoLoginCheckbox = document.getElementById('autoLogin') as Checkbox;
const qrcodeImg = document.getElementById('qrcode') as HTMLImageElement;
const loginButton = document.getElementById('login') as Button;

/** 全局记录登录方式 */
var loginMethod: 'password' | 'qrcode' | 'token';

loginRadios.forEach((loginRadio) =>
  loginRadio.addEventListener('click', () => {
    if (loginRadio.value === loginMethod) {
      return;
    }
    loginMethod = loginRadio.value as 'password' | 'qrcode' | 'token';
    uinText.hidden = loginRadio.value === 'qrcode';
    passwordText.hidden = loginRadio.value !== 'password';
    tokenTag.hidden = loginRadio.value !== 'token';
    qrcodeImg.hidden = loginRadio.value !== 'qrcode';
    if (loginRadio.value === 'qrcode') {
      msgHandler
        .postMessage({ id: '', command: 'qrcode' } as ReqMsg<'qrcode'>, 1000)
        .then((msg) => {
          qrcodeImg.src = (msg as ResMsg<'qrcode'>).payload.src;
          qrcodeImg.hidden = false;
        })
        .catch((err: Error) => {
          console.error('LoginView qrcode: ' + err.message);
        });
    }
    checkLoginState();
  })
);

/**
 * 判断登录按钮是否可用，不同登录方式的判断条件不同
 */
function checkLoginState() {
  const state =
    loginMethod === 'password'
      ? uinText.value.length && passwordText.value.length
      : loginMethod === 'qrcode'
      ? true
      : uinText.value.length;
  loginButton.disabled = !state;
  if (state) {
    loginButton.textContent = '登录';
  }
}

function toggleReadonlyState() {
  const state = !loginButton.disabled;
  loginButton.disabled = state;
  autoLoginCheckbox.readOnly = state;
  if (loginMethod === 'password') {
    uinText.readOnly = state;
    passwordText.readOnly = state;
    rememberOption.ariaReadOnly = state ? 'true' : 'false';
  } else if (loginMethod === 'token') {
    uinText.readOnly = state;
  }
}

/**
 * 获取页面的登录信息
 * @throws 登录按钮不可用时禁止获取登录信息
 * @returns 登录信息
 */
function getLoginInfo(): LoginRecord {
  if (loginButton.disabled) {
    throw Error('LoginView: login button is disabled');
  }
  if (loginMethod === 'password') {
    return {
      method: 'password',
      uin: Number(uinText.value),
      password: passwordText.value,
      remember: rememberOption.selected,
      autoLogin: autoLoginCheckbox.checked
    } as PasswordLoginRecord;
  } else if (loginMethod === 'qrcode') {
    return {
      method: 'qrcode',
      autoLogin: autoLoginCheckbox.checked
    } as QrcodeLoginRecord;
  } else {
    return {
      method: 'token',
      uin: Number(uinText.value),
      autoLogin: autoLoginCheckbox.checked
    } as TokenLoginRecord;
  }
}

// 暂存记住密码的选中状态
rememberOption.addEventListener(
  'click',
  () => (rememberOption.selected = !rememberOption.selected)
);

// 提交登录信息
loginButton.addEventListener('click', () => {
  msgHandler
    .postMessage(
      { id: '', command: 'login', payload: getLoginInfo() } as ReqMsg<'login'>,
      10000
    )
    .then((msg) => {
      const ret = (msg as ResMsg<'login'>).payload.ret;
      if (ret === true) {
        loginButton.textContent = '登录成功！';
      } else {
        console.error('LoginView login: ' + ret);
        checkLoginState();
      }
    })
    .catch((error: Error) => {
      console.error('LoginView login: ' + error.message);
    })
    .finally(() => {
      toggleReadonlyState();
      checkLoginState();
    });
  loginButton.textContent = '登录中';
  toggleReadonlyState();
});

// 动态判断登录按钮的状态
uinText.addEventListener('input', checkLoginState);
passwordText.addEventListener('input', checkLoginState);

// 响应回车键
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    loginButton.click();
  }
});

// 初始化所有组件状态
(() =>
  // 获取登录账号历史信息
  msgHandler
    .postMessage({ id: '', command: 'init' } as ReqMsg<'init'>, 2000)
    .then((msg) => {
      const record = (msg as ResMsg<'init'>).payload;
      // radio-group的bug: https://github.com/microsoft/vscode-webview-ui-toolkit/issues/476
      // 初始化时首次点击总是会选中最后一个radio，所以默认设置需要重复2次
      loginRadios[0].click();
      if (!record) {
        loginRadios[0].click();
        return;
      }
      if (record.method === 'password') {
        uinText.value = record.uin.toString();
        if (record.remember) {
          loginRadios[0].click();
          rememberOption.selected = true;
          passwordText.value = record.password as string;
        }
      } else if (record.method === 'qrcode') {
        loginRadios[1].click();
      } else if (record.method === 'token') {
        loginRadios[2].click();
        uinText.value = record.uin.toString();
      }
      autoLoginCheckbox.checked = record.autoLogin;
      checkLoginState();
      if (autoLoginCheckbox.checked) {
        loginButton.click();
      }
    })
    .catch((error: Error) => {
      console.error('LoginView init: ' + error.message);
    }))();
