import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appUrl = 'http://127.0.0.1:5173';
const captureDir = 'C:\\Capture';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromeProfileDir = join(captureDir, 'chrome-profile');
const chromeDebugPort = 9222;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: false,
    stdio: options.stdio || 'pipe',
    windowsHide: true
  });

  child.stdout?.on('data', data => {
    if (options.log) process.stdout.write(data);
  });
  child.stderr?.on('data', data => {
    if (options.log) process.stderr.write(data);
  });

  return child;
}

async function waitForHttp(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Server is still warming up.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

async function connectChrome() {
  const response = await fetch(`http://127.0.0.1:${chromeDebugPort}/json/new?${encodeURIComponent(appUrl)}`, {
    method: 'PUT'
  });
  const page = await response.json();

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const client = new CdpClient(socket);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1365,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  }

  return result.result?.value;
}

async function waitForText(client, text, timeoutMs = 8000) {
  const startedAt = Date.now();
  const needle = JSON.stringify(text.toLowerCase());
  while (Date.now() - startedAt < timeoutMs) {
    const found = await evaluate(client, `
      (((document.body && document.body.innerText) || '').toLowerCase().includes(${needle})
        || (document.title || '').toLowerCase().includes(${needle}))
    `);
    if (found) return;
    await delay(200);
  }
  const debug = await evaluate(client, `
    ({
      href: location.href,
      readyState: document.readyState,
      bodyText: document.body?.innerText?.slice(0, 500) || '',
      title: document.title
    })
  `);
  throw new Error(`Timed out waiting for text: ${text}\n${JSON.stringify(debug, null, 2)}`);
}

async function clickByText(client, text) {
  const clicked = await evaluate(client, `
    (() => {
      const target = [...document.querySelectorAll('button, .btn, label.btn')]
        .find(element => element.innerText.includes(${JSON.stringify(text)}));
      if (!target) return false;
      target.click();
      return true;
    })()
  `);

  if (!clicked) throw new Error(`Could not click: ${text}`);
  await delay(350);
}

async function selectMethod(client, method) {
  const selected = await evaluate(client, `
    (() => {
      const select = [...document.querySelectorAll('select')]
        .find(element => [...element.options].some(option => option.textContent === ${JSON.stringify(method)}));
      if (!select) return false;
      select.value = ${JSON.stringify(method)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);

  if (!selected) throw new Error(`Could not select method: ${method}`);
  await delay(350);
}

async function selectAllMembers(client) {
  await evaluate(client, `
    (() => {
      document.querySelectorAll('.select-card button:first-child').forEach(button => {
        if (!button.closest('.select-card').classList.contains('selected')) button.click();
      });
    })()
  `);
  await delay(350);
}

async function capture(client, name) {
  await delay(300);
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true
  });
  const path = join(captureDir, `${name}.png`);
  writeFileSync(path, Buffer.from(screenshot.data, 'base64'));
  console.log(path);
}

async function resetApp(client) {
  await client.send('Page.navigate', { url: appUrl });
  await waitForText(client, 'ParkBuddy Web');
  await evaluate(client, 'window.alert = () => {}; window.confirm = () => true; true');
  await delay(500);
}

async function runMainFlow(client) {
  await resetApp(client);
  await capture(client, '01-home');

  await clickByText(client, '회원 등록 및 관리');
  await waitForText(client, '회원 등록 및 관리');
  await capture(client, '02-members');

  await clickByText(client, '홈');
  await waitForText(client, 'ParkBuddy Web');
  await clickByText(client, '라운딩 시작하기');
  await waitForText(client, '라운딩 생성');
  await capture(client, '03-round-create-stroke');

  await clickByText(client, '참가자 선택으로 이동');
  await waitForText(client, '참가자 선택');
  await selectAllMembers(client);
  await capture(client, '04-member-select-stroke');

  await clickByText(client, '조편성하기');
  await waitForText(client, '조편성 결과');
  await capture(client, '05-team-result-individual');

  await clickByText(client, '점수 입력으로 이동');
  await waitForText(client, '점수 입력');
  await capture(client, '06-score-input');

  await clickByText(client, '순위표 보기');
  await waitForText(client, '순위표');
  await capture(client, '07-ranking');

  await clickByText(client, '기록 저장 후 처음으로');
  await waitForText(client, 'ParkBuddy Web');
  await clickByText(client, '라운딩 기록 보기');
  await waitForText(client, '라운딩 기록 보기');
  await capture(client, '08-records');
}

async function runTeamFlow(client, method, prefix) {
  const canGoHome = await evaluate(client, `
    [...document.querySelectorAll('button, .btn, label.btn')].some(element => element.innerText.includes('홈'))
  `);
  if (canGoHome) {
    await clickByText(client, '홈');
    await waitForText(client, 'ParkBuddy Web');
  } else {
    await resetApp(client);
  }
  await clickByText(client, '라운딩 시작하기');
  await waitForText(client, '라운딩 생성');
  await selectMethod(client, method);
  await capture(client, `${prefix}-round-create-${method}`);

  await clickByText(client, '참가자 선택으로 이동');
  await waitForText(client, '참가자 선택');
  await selectAllMembers(client);
  await capture(client, `${prefix}-member-select-${method}`);

  await clickByText(client, '조편성하기');
  await waitForText(client, '조편성 결과');
  await capture(client, `${prefix}-team-result-${method}`);
}

async function main() {
  if (!existsSync(captureDir)) mkdirSync(captureDir, { recursive: true });
  if (existsSync(chromeProfileDir)) rmSync(chromeProfileDir, { recursive: true, force: true });

  const vite = startProcess('C:\\Program Files\\nodejs\\node.exe', [
    join(process.cwd(), 'node_modules\\vite\\bin\\vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5173'
  ], { log: true });
  const chrome = startProcess(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${chromeDebugPort}`,
    '--window-size=1365,900',
    `--user-data-dir=${chromeProfileDir}`,
    'about:blank'
  ], { log: true });

  try {
    await waitForHttp(appUrl);
    await waitForHttp(`http://127.0.0.1:${chromeDebugPort}/json/version`);
    const client = await connectChrome();
    await evaluate(client, 'window.alert = () => {}; window.confirm = () => true; true');
    await runMainFlow(client);
    await runTeamFlow(client, '포섬', '09');
    await runTeamFlow(client, '포볼', '12');
  } finally {
    chrome.kill();
    vite.kill();
    await delay(800);
    try {
      if (existsSync(chromeProfileDir)) rmSync(chromeProfileDir, { recursive: true, force: true });
    } catch {
      // Chrome can keep profile files locked briefly after exit; screenshots are already written.
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
