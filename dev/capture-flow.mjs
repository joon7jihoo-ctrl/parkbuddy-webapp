import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

let appUrl = 'http://127.0.0.1:5173';
const captureDir = 'C:\\Capture';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromeProfileDir = join(captureDir, 'chrome-profile');
const chromeDebugPort = 9222;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 30; port += 1) {
    const isAvailable = await new Promise(resolve => {
      const server = createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          server.close(() => resolve(true));
        })
        .listen(port, '127.0.0.1');
    });

    if (isAvailable) return port;
  }

  throw new Error(`No available port found from ${startPort}`);
}

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
  await setViewport(client, 1365, 900, false);
  return client;
}

async function setViewport(client, width, height, mobile = false) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });
  await delay(250);
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

async function clickByTextIfPresent(client, text) {
  const clicked = await evaluate(client, `
    (() => {
      const target = [...document.querySelectorAll('button, .btn, label.btn')]
        .find(element => element.innerText.includes(${JSON.stringify(text)}));
      if (!target) return false;
      target.click();
      return true;
    })()
  `);

  if (clicked) await delay(350);
  return clicked;
}

async function clickFirstMemberSummary(client) {
  const clicked = await evaluate(client, `
    (() => {
      const target = document.querySelector('.member-summary');
      if (!target) return false;
      target.click();
      return true;
    })()
  `);

  if (!clicked) throw new Error('Could not click first member summary');
  await delay(350);
}

async function clickFirstRankingToggle(client) {
  const clicked = await evaluate(client, `
    (() => {
      const target = document.querySelector('.ranking-toggle');
      if (!target) return false;
      target.click();
      return true;
    })()
  `);

  if (!clicked) throw new Error('Could not click first ranking toggle');
  await delay(350);
}

async function clickFirstOptionCard(client) {
  const clicked = await evaluate(client, `
    (() => {
      const target = document.querySelector('.option-card');
      if (!target) return false;
      target.click();
      return true;
    })()
  `);

  if (!clicked) throw new Error('Could not click first option card');
  await delay(350);
}

async function getFirstRecordId(client) {
  const recordId = await evaluate(client, `document.querySelector('.record-header[data-record-id]')?.dataset.recordId || ''`);
  if (!recordId) throw new Error('Could not find first record id');
  return recordId;
}

async function assertTextAbsent(client, text) {
  const exists = await evaluate(client, `
    ((document.body && document.body.innerText) || '').includes(${JSON.stringify(text)})
  `);
  if (exists) throw new Error(`Unexpected text found: ${text}`);
}

async function assertAtTop(client) {
  const scrollY = await evaluate(client, 'Math.round(window.scrollY || document.documentElement.scrollTop || 0)');
  if (scrollY !== 0) throw new Error(`Expected screen top, got scrollY=${scrollY}`);
}

async function assertSelector(client, selector) {
  const exists = await evaluate(client, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  if (!exists) throw new Error(`Missing selector: ${selector}`);
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

async function setFieldValue(client, labelText, value) {
  const updated = await evaluate(client, `
    (() => {
      const field = [...document.querySelectorAll('label.field')]
        .find(element => element.innerText.includes(${JSON.stringify(labelText)}));
      const input = field?.querySelector('input, textarea, select');
      if (!input) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
      descriptor?.set ? descriptor.set.call(input, ${JSON.stringify(value)}) : input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);

  if (!updated) throw new Error(`Could not set field: ${labelText}`);
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
  await waitForText(client, '오늘의 라운드가');
  await evaluate(client, 'window.alert = () => {}; window.confirm = () => true; true');
  await delay(500);
}

async function runMainFlow(client) {
  await resetApp(client);
  await assertTextAbsent(client, 'Supabase');
  await capture(client, '01-home');

  await clickByText(client, '등록 회원');
  await waitForText(client, '회원 등록 및 관리');
  await assertAtTop(client);
  await capture(client, '02-members');
  await clickFirstMemberSummary(client);
  await waitForText(client, '핸디');
  await capture(client, '02-members-expanded');

  await resetApp(client);
  await clickByText(client, '라운딩 시작');
  await waitForText(client, '라운딩 생성');
  await assertAtTop(client);
  await capture(client, '03-round-create-basic');
  await clickByText(client, '경기 설정으로 이동');
  await waitForText(client, '경기 설정');
  await capture(client, '03-round-create-stroke');

  await clickByText(client, '참가자 선택으로 이동');
  await waitForText(client, '참가자 선택');
  await selectAllMembers(client);
  await capture(client, '04-member-select-stroke');

  await clickByText(client, '편성 방식 선택');
  await waitForText(client, '조편성 방식');
  await capture(client, '04-member-select-mode');
  await clickByText(client, '조당 인원 선택');
  await waitForText(client, '조당 인원');
  await capture(client, '04-member-select-size');
  await clickByText(client, '조편성하기');
  await waitForText(client, '오늘의 베스트 조');
  await capture(client, '05-team-result-individual');

  await clickByText(client, '라운딩 기록 생성');
  await waitForText(client, '오늘의 라운드가');
  await clickByText(client, '라운딩 기록');
  await waitForText(client, '라운딩 기록 보기');
  await waitForText(client, '점수 미입력');
  await waitForText(client, '조편성/점수 링크 공유');
  await capture(client, '06-record-pending');

  await clickByText(client, '점수 입력');
  await waitForText(client, '실시간 점수판');
  await capture(client, '07-score-input');

  await clickByText(client, '순위표 보기');
  await waitForText(client, '순위표');
  await capture(client, '08-ranking');

  await clickByText(client, '기록에 점수 저장');
  await waitForText(client, '라운딩 기록 보기');
  await assertTextAbsent(client, '상세보기');
  await waitForText(client, '조편성/점수 링크 공유');
  await capture(client, '09-records');
  await setFieldValue(client, '라운딩명', '정기');
  await waitForText(client, '정기 라운딩');
  await capture(client, '09-records-search');

  await clickFirstRankingToggle(client);
  await waitForText(client, '전체 순위');
  await capture(client, '09-records-detail');
  await clickFirstRankingToggle(client);
  await assertTextAbsent(client, '전체 순위');
  await capture(client, '09-records-collapsed');

  const recordId = await getFirstRecordId(client);
  await client.send('Page.navigate', { url: `${appUrl}?recordId=${encodeURIComponent(recordId)}` });
  await waitForText(client, '내 이름 또는 팀 선택');
  await evaluate(client, 'window.alert = () => {}; window.confirm = () => true; true');
  await capture(client, '09-shared-score-select');
  await clickFirstOptionCard(client);
  await waitForText(client, '점수 저장');
  await capture(client, '09-shared-score-entry');
  await clickByText(client, '점수 저장');
  await waitForText(client, '현재 순위');
  await capture(client, '09-shared-score-saved');

  await resetApp(client);
  await clickByText(client, '라운딩 기록');
  await waitForText(client, '라운딩 기록 보기');
  await setViewport(client, 545, 768, true);
  await capture(client, '09-records-mobile');
  await resetApp(client);
  await clickByText(client, '등록 회원');
  await waitForText(client, '회원 등록 및 관리');
  await clickFirstMemberSummary(client);
  await waitForText(client, '핸디');
  await capture(client, '02-members-mobile-expanded');
  await setViewport(client, 1365, 900, false);

  await resetApp(client);
  await clickByText(client, '성장 데이터');
  await waitForText(client, '기록 추이');
  await assertSelector(client, '.trend-chart svg');
  await capture(client, '10-personal-scores');

  await evaluate(client, 'history.back(); true');
  await waitForText(client, '오늘의 라운드가');
  await assertAtTop(client);
  await capture(client, '10-browser-back-home');
}

async function goHomeOrReset(client) {
  await resetApp(client);
}

async function runCourseFlow(client) {
  await goHomeOrReset(client);
  await clickByText(client, '구장 관리');
  await waitForText(client, '구장 관리');
  await capture(client, '11-courses');

  const courseName = `검증 파크골프장 ${Date.now()}`;
  await setFieldValue(client, '구장 이름', courseName);
  await clickByText(client, '구장 추가');
  await waitForText(client, courseName);
  await capture(client, '12-courses-added');

  await clickByText(client, '삭제');
  await waitForText(client, '사용자 구장 등록');
  await capture(client, '13-courses-deleted');
}

async function runMethodFlow(client, method, prefix) {
  await goHomeOrReset(client);
  await clickByText(client, '라운딩 시작');
  await waitForText(client, '라운딩 생성');
  await clickByText(client, '경기 설정으로 이동');
  await waitForText(client, '경기 설정');
  await selectMethod(client, method);
  await capture(client, `${prefix}-round-create-${method}`);

  await clickByText(client, '참가자 선택으로 이동');
  await waitForText(client, '참가자 선택');
  await selectAllMembers(client);
  await capture(client, `${prefix}-member-select-${method}`);

  await clickByText(client, '편성 방식 선택');
  if (await clickByTextIfPresent(client, '조당 인원 선택')) {
    await waitForText(client, '조당 인원');
  }
  await clickByText(client, '조편성하기');
  await waitForText(client, '오늘의 베스트 조');
  await capture(client, `${prefix}-team-result-${method}`);

  await clickByText(client, '라운딩 기록 생성');
  await waitForText(client, '오늘의 라운드가');
  await clickByText(client, '라운딩 기록');
  await waitForText(client, '라운딩 기록 보기');
  await clickByText(client, '점수 입력');
  await waitForText(client, '실시간 점수판');
  await capture(client, `${prefix}-score-input-${method}`);

  await clickByText(client, '순위표 보기');
  await waitForText(client, '순위표');
  await capture(client, `${prefix}-ranking-${method}`);
}

async function main() {
  if (!existsSync(captureDir)) mkdirSync(captureDir, { recursive: true });
  if (existsSync(chromeProfileDir)) rmSync(chromeProfileDir, { recursive: true, force: true });

  const appPort = await findAvailablePort(5173);
  appUrl = `http://127.0.0.1:${appPort}`;

  const vite = startProcess(process.execPath, [
    join(process.cwd(), 'node_modules\\vite\\bin\\vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    String(appPort),
    '--strictPort'
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
    await runCourseFlow(client);
    await runMethodFlow(client, '신페리오', '12');
    await runMethodFlow(client, '매치 플레이', '16');
    await runMethodFlow(client, '스크램블', '20');
    await runMethodFlow(client, '포섬', '24');
    await runMethodFlow(client, '포볼', '28');
    await runMethodFlow(client, '스테이블포드', '32');
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
