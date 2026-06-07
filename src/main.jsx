import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Users, Trophy, Download, Upload, CalendarDays, Shuffle, Save, Search, MapPin, Trash2, Activity, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import {
  TEAM_ASSIGNMENT_MODES,
  buildMemberStatsFromRecords,
  createTeamAssignment,
  flattenGroupMembers,
  isTeamMatchMethod
} from './services/teamAssignment.js';
import { loadParkBuddyState, saveParkBuddyState } from './services/supabaseStorage.js';
import './styles.css';

const GENDERS = ['남성', '여성'];
const SKILL_LEVELS = ['초급', '중급', '상급', '최상급'];
const POSITION_PRIORITY = ['회장', '부회장', '총무', '경기위원', '홍보위원', '재무'];
const COMMON_POSITIONS = [...POSITION_PRIORITY, '조장', '회원'];
const DEFAULT_CLUB_NAME = '장성 파크골프 동호회';
const DEFAULT_MEMBER_POSITION = '회원';
const DEFAULT_HOLE_PAR = 4;
const COURSE_HOLE_COUNT = 9;
const COURSE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const HOLE_OPTIONS = Array.from({ length: 9 }, (_, index) => (index + 1) * COURSE_HOLE_COUNT);
const GAME_METHODS = ['스트로크 플레이', '신페리오', '매치 플레이', '스크램블', '포섬', '포볼', '스테이블포드'];
const TEAM_SCORE_METHODS = new Set(['스크램블', '포섬', '포볼']);
const BACK_COUNT_HOLE_COUNTS = [9, 6, 3, 1];
const INDIVIDUAL_ASSIGNMENT_OPTIONS = [
  { value: TEAM_ASSIGNMENT_MODES.BALANCED, label: 'Buddy Balance', description: '오늘은 실력 차이가 튀지 않도록 조를 고르게 맞춰볼게요.' },
  { value: TEAM_ASSIGNMENT_MODES.BALANCED_OVERLAP, label: 'Buddy AI 추천', description: '실력 밸런스와 지난 조합 중복을 함께 줄여 가장 자연스러운 조를 찾습니다.' },
  { value: TEAM_ASSIGNMENT_MODES.LEADER, label: 'Captain Mix', description: '조장 후보를 각 조에 분산해 라운드 운영을 안정적으로 만듭니다.' },
  { value: TEAM_ASSIGNMENT_MODES.RANDOM, label: 'Random Mix', description: '오늘은 가볍게 랜덤 믹스로 분위기를 바꿔볼게요.' }
];
const TEAM_ASSIGNMENT_OPTIONS = [
  { value: TEAM_ASSIGNMENT_MODES.FOURSOME, label: 'Foursome AI', description: '비슷한 실력의 2인 팀을 만들어 호흡을 맞춥니다.' },
  { value: TEAM_ASSIGNMENT_MODES.FOURBALL, label: 'Four-ball Balance', description: '강자와 약자를 짝지어 팀 전력을 균형 있게 맞춥니다.' },
  { value: TEAM_ASSIGNMENT_MODES.TEAM_OVERLAP, label: 'Team Buddy AI', description: '팀 실력과 직전 조 중복을 함께 보고 매치업을 추천합니다.' }
];
const PROVINCES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도',
  '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

const PARK_GOLF_PLACES = {
  '서울특별시': ['잠실 파크골프장', '월드컵공원 파크골프장', '중랑천 파크골프장'],
  '부산광역시': ['삼락생태공원 파크골프장', '대저생태공원 파크골프장', '화명생태공원 파크골프장'],
  '대구광역시': ['강변 파크골프장', '수성 파크골프장', '달성 파크골프장'],
  '인천광역시': ['송도 파크골프장', '청라 파크골프장', '남동 파크골프장'],
  '광주광역시': ['승촌 파크골프장', '첨단체육공원 파크골프장', '염주 파크골프장', '서봉 파크골프장'],
  '대전광역시': ['갑천 파크골프장', '유등천 파크골프장', '대청호 파크골프장'],
  '울산광역시': ['태화강 파크골프장', '문수 파크골프장', '동천 파크골프장'],
  '세종특별자치시': ['세종 금강 파크골프장', '세종호수공원 파크골프장'],
  '경기도': ['수원 광교 파크골프장', '성남 탄천 파크골프장', '고양 한강 파크골프장', '화성 파크골프장'],
  '강원특별자치도': ['춘천 파크골프장', '원주 파크골프장', '강릉 남대천 파크골프장'],
  '충청북도': ['청주 무심천 파크골프장', '충주 파크골프장', '제천 파크골프장'],
  '충청남도': ['천안 파크골프장', '아산 곡교천 파크골프장', '공주 금강 파크골프장'],
  '전북특별자치도': ['전주 파크골프장', '익산 파크골프장', '군산 파크골프장'],
  '전라남도': ['장성 파크골프장', '담양 파크골프장', '나주 영산강 파크골프장', '함평 파크골프장', '화순 파크골프장', '목포 부주산 파크골프장'],
  '경상북도': ['포항 형산강 파크골프장', '구미 낙동강 파크골프장', '경주 파크골프장'],
  '경상남도': ['창원 대산 파크골프장', '김해 생림 파크골프장', '진주 남강 파크골프장'],
  '제주특별자치도': ['제주 파크골프장', '서귀포 파크골프장']
};

const DEFAULT_RECENT_PLACES = ['장성 파크골프장'];

const SAMPLE_CSV = `이름,성별,연락처,동호회,직책,실력등급,핸디캡,조장후보
김회장,남성,010-1111-0001,장성 파크골프 동호회,회장,최상급,2,예
이총무,여성,010-1111-0002,장성 파크골프 동호회,총무,상급,4,예
박프로,남성,010-1111-0003,장성 파크골프 동호회,경기위원,최상급,1,예
최시니어,남성,010-1111-0004,장성 파크골프 동호회,회원,중급,8,아니오
정루키,여성,010-1111-0005,장성 파크골프 동호회,회원,초급,15,아니오`;

const initialMembers = [
  { id: crypto.randomUUID(), name: '김회장', gender: '남성', phone: '010-1111-0001', clubName: DEFAULT_CLUB_NAME, position: '회장', skillLevel: '최상급', handicap: 2, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '이총무', gender: '여성', phone: '010-1111-0002', clubName: DEFAULT_CLUB_NAME, position: '총무', skillLevel: '상급', handicap: 4, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '박프로', gender: '남성', phone: '010-1111-0003', clubName: DEFAULT_CLUB_NAME, position: '경기위원', skillLevel: '최상급', handicap: 1, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '최시니어', gender: '남성', phone: '010-1111-0004', clubName: DEFAULT_CLUB_NAME, position: DEFAULT_MEMBER_POSITION, skillLevel: '중급', handicap: 8, isLeaderCandidate: false, averageScore: null, participationCount: 0 }
];

function getAssignmentOptions(method) {
  return isTeamMatchMethod(method) ? TEAM_ASSIGNMENT_OPTIONS : INDIVIDUAL_ASSIGNMENT_OPTIONS;
}

function isTeamScoreMethod(method) {
  return TEAM_SCORE_METHODS.has(method);
}

function getDefaultAssignmentMode(method) {
  if (method === '포볼') return TEAM_ASSIGNMENT_MODES.FOURBALL;
  if (method === '포섬') return TEAM_ASSIGNMENT_MODES.FOURSOME;
  return TEAM_ASSIGNMENT_MODES.BALANCED;
}

function getAssignmentModeLabel(mode) {
  return [...INDIVIDUAL_ASSIGNMENT_OPTIONS, ...TEAM_ASSIGNMENT_OPTIONS].find(option => option.value === mode)?.label || '실력 균형';
}

function getMemberSkillText(member, memberStats) {
  const stats = memberStats?.[member.id] || {};
  const averageScore = member.averageScore ?? stats.averageScore;
  const participationCount = member.participationCount ?? stats.participationCount ?? 0;
  const averageText = Number.isFinite(Number(averageScore)) ? `평균 ${Number(averageScore).toFixed(1)}타` : '평균 기록 없음';
  return `${averageText} · 참가 ${participationCount}회`;
}

function getMemberAffiliationText(member) {
  const clubName = String(member?.clubName || '').trim();
  const position = String(member?.position || '').trim();
  if (clubName && position) return `${clubName} · ${position}`;
  if (clubName) return clubName;
  if (position) return position;
  return '소속 동호회 미입력';
}

function getMemberPositionRank(member) {
  const position = String(member?.position || '').trim();
  const index = POSITION_PRIORITY.indexOf(position);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function sortMembersForDisplay(members = []) {
  return [...members].sort((a, b) => {
    const rankA = getMemberPositionRank(a);
    const rankB = getMemberPositionRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'ko');
  });
}

function getAppLink(params = {}) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
}

function getRecordShareLink(record) {
  return getAppLink({ recordId: record.id });
}

function formatTeamMembers(team) {
  if (Array.isArray(team?.matchTeams)) {
    return team.matchTeams
      .map(matchTeam => `${matchTeam.name}(${(matchTeam.members || []).map(member => member.name).join(', ')})`)
      .join(' / ');
  }
  return [team?.leader, ...(team?.members || [])].filter(Boolean).map(member => member.name).join(', ');
}

function buildRoundShareText(record) {
  const round = record.round || {};
  const teamLines = (record.teams || []).map(team => `${team.name}: ${formatTeamMembers(team)}`);
  return [
    `[ParkBuddy] ${round.title || '라운딩'} 조편성 결과`,
    `${round.date || ''} · ${round.place || ''}`,
    `${round.holes || ''}홀 · ${round.method || ''}`,
    '',
    ...teamLines,
    '',
    `점수 입력 및 실시간 순위 확인: ${getRecordShareLink(record)}`
  ].filter(line => line !== '').join('\n');
}

async function shareText(title, text) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

function getInitialEntryScores(record, entryId) {
  const holePars = getRoundHolePars(record?.round);
  const existingScores = record?.scores?.[entryId] || [];
  return holePars.map((par, index) => {
    const score = Number(existingScores[index]);
    return Number.isFinite(score) ? score : par;
  });
}

function getNormalizedRecordScores(record, changedEntryId, changedScores) {
  const entries = getScoreEntries(record?.participants || [], record?.teams || [], record?.round || {});
  const holePars = getRoundHolePars(record?.round);
  const previousScores = record?.scores || {};

  return Object.fromEntries(entries.map(entry => {
    const sourceScores = entry.id === changedEntryId ? changedScores : previousScores[entry.id];
    const scoreList = holePars.map((par, index) => {
      const score = Number(sourceScores?.[index]);
      return Number.isFinite(score) ? score : par;
    });
    return [entry.id, scoreList];
  }));
}

function getScoreEntries(participants = [], teams = [], round = {}) {
  if (!isTeamScoreMethod(round?.method)) {
    return participants.map(member => ({
      id: member.id,
      type: 'individual',
      name: member.name,
      member,
      members: [member],
      source: member
    }));
  }

  if (round?.method === '스크램블') {
    return teams.map(team => {
      const members = flattenGroupMembers(team);
      return {
        id: team.id,
        type: 'team',
        name: team.name,
        members,
        source: team
      };
    });
  }

  return teams.flatMap(team => (team.matchTeams || []).map(matchTeam => ({
    id: matchTeam.id,
    type: 'team',
    name: matchTeam.name,
    members: matchTeam.members || [],
    source: matchTeam,
    groupName: team.name
  })));
}

function getScoreEntrySubtitle(entry) {
  if (entry.type === 'individual') return getMemberAffiliationText(entry.member);
  const memberNames = (entry.members || []).map(member => member.name).join(' + ');
  return entry.groupName ? `${entry.groupName} · ${memberNames}` : memberNames;
}

function getRankingDisplayName(result) {
  return result.member?.name || result.name || '이름 없음';
}

function getRankingMembersText(result) {
  const names = (result.members || []).map(member => member.name).filter(Boolean);
  return names.length > 0 ? names.join(' + ') : getRankingDisplayName(result);
}

function getRankingMemberIds(result) {
  const ids = new Set();
  if (result.member?.id) ids.add(result.member.id);
  if (result.memberId) ids.add(result.memberId);
  (result.members || []).forEach(member => {
    if (member?.id) ids.add(member.id);
  });
  return ids;
}

function sanitizeHolePar(value, fallback = DEFAULT_HOLE_PAR) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.max(1, Math.min(12, Math.round(number)));
}

function createDefaultHolePars(holeCount, existingPars = []) {
  return Array.from({ length: holeCount }, (_, index) => sanitizeHolePar(existingPars[index]));
}

function getRoundHolePars(round, fallbackHoleCount) {
  const holeCount = fallbackHoleCount || round?.holes || round?.holePars?.length || 0;
  return createDefaultHolePars(holeCount, round?.holePars || []);
}

function getCourseLabel(courseIndex) {
  const label = COURSE_LABELS[courseIndex] || `코스${courseIndex + 1}`;
  return `${label}코스`;
}

function getCourseHoleLabel(holeIndex) {
  return `${getCourseLabel(Math.floor(holeIndex / COURSE_HOLE_COUNT))} ${holeIndex % COURSE_HOLE_COUNT + 1}H`;
}

function getCourseGroups(values = []) {
  const groups = [];
  for (let start = 0; start < values.length; start += COURSE_HOLE_COUNT) {
    const courseIndex = Math.floor(start / COURSE_HOLE_COUNT);
    groups.push({
      index: courseIndex,
      label: getCourseLabel(courseIndex),
      holes: values.slice(start, start + COURSE_HOLE_COUNT).map((value, offset) => ({
        index: start + offset,
        number: offset + 1,
        value
      }))
    });
  }
  return groups;
}

function sumNumbers(values) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

function createSeededRandom(seedValue = `${Date.now()}-${Math.random()}`) {
  let seed = 0;
  const text = String(seedValue);
  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createCombinations(items, count, startIndex = 0, current = [], results = []) {
  if (current.length === count) {
    results.push([...current]);
    return results;
  }

  for (let index = startIndex; index <= items.length - (count - current.length); index += 1) {
    current.push(items[index]);
    createCombinations(items, count, index + 1, current, results);
    current.pop();
  }

  return results;
}

function countByValue(values) {
  return values.reduce((counts, value) => ({
    ...counts,
    [value]: (counts[value] || 0) + 1
  }), {});
}

function getParProfilePenalty(candidateEntries, blockEntries, hiddenCount) {
  const blockParCounts = countByValue(blockEntries.map(entry => entry.par));
  const candidateParCounts = countByValue(candidateEntries.map(entry => entry.par));

  return Object.entries(blockParCounts).reduce((penalty, [par, blockCount]) => {
    const targetCount = blockCount * hiddenCount / blockEntries.length;
    return penalty + Math.abs((candidateParCounts[par] || 0) - targetCount);
  }, 0);
}

function getSectionPenalty(candidateEntries, blockEntries, hiddenCount) {
  const selectedIndexes = new Set(candidateEntries.map(entry => entry.index));
  const sections = [
    blockEntries.slice(0, 3),
    blockEntries.slice(3, 6),
    blockEntries.slice(6, 9)
  ].filter(section => section.length > 0);

  return sections.reduce((penalty, section) => {
    const sectionTarget = section.length * hiddenCount / blockEntries.length;
    const selectedCount = section.filter(entry => selectedIndexes.has(entry.index)).length;
    return penalty + Math.abs(selectedCount - sectionTarget);
  }, 0);
}

function scoreHiddenCandidate(candidateEntries, blockEntries, hiddenCount, random) {
  const blockParSum = sumNumbers(blockEntries.map(entry => entry.par));
  const hiddenParSum = sumNumbers(candidateEntries.map(entry => entry.par));
  const parDistance = Math.abs(hiddenParSum * blockEntries.length - blockParSum * hiddenCount);

  return {
    entries: candidateEntries,
    hiddenParSum,
    parDistance,
    parProfilePenalty: getParProfilePenalty(candidateEntries, blockEntries, hiddenCount),
    sectionPenalty: getSectionPenalty(candidateEntries, blockEntries, hiddenCount),
    tieBreaker: random()
  };
}

function selectHiddenIndexesFromBlock(blockEntries, random) {
  if (!blockEntries.length) return [];

  const hiddenCount = Math.max(1, Math.floor(blockEntries.length * 2 / 3));
  const allCandidates = createCombinations(blockEntries, hiddenCount)
    .map(candidate => scoreHiddenCandidate(candidate, blockEntries, hiddenCount, random));
  const exactParCandidates = allCandidates.filter(candidate => candidate.parDistance === 0);
  const candidates = exactParCandidates.length > 0 ? exactParCandidates : allCandidates;

  return [...candidates].sort((a, b) => {
    if (a.parDistance !== b.parDistance) return a.parDistance - b.parDistance;
    if (a.parProfilePenalty !== b.parProfilePenalty) return a.parProfilePenalty - b.parProfilePenalty;
    if (a.sectionPenalty !== b.sectionPenalty) return a.sectionPenalty - b.sectionPenalty;
    return a.tieBreaker - b.tieBreaker;
  })[0].entries.map(entry => entry.index);
}

function selectNewPeoriaHiddenHoleIndexes(holePars, seedValue) {
  const random = createSeededRandom(seedValue);
  const hiddenIndexes = [];

  for (let start = 0; start < holePars.length; start += 9) {
    const blockEntries = holePars.slice(start, start + 9).map((par, offset) => ({
      index: start + offset,
      par
    }));
    hiddenIndexes.push(...selectHiddenIndexesFromBlock(blockEntries, random));
  }

  return hiddenIndexes.sort((a, b) => a - b);
}

function getRoundHiddenHoleIndexes(round, holePars) {
  const validIndexes = (round?.hiddenHoleIndexes || [])
    .map(index => Number(index))
    .filter(index => Number.isInteger(index) && index >= 0 && index < holePars.length);

  if (validIndexes.length > 0) return [...new Set(validIndexes)].sort((a, b) => a - b);
  return selectNewPeoriaHiddenHoleIndexes(holePars, 'fallback-new-peoria');
}

function getHiddenHoleSummary(round, holePars) {
  const indexes = getRoundHiddenHoleIndexes(round, holePars);
  const totalPar = sumNumbers(holePars);
  const hiddenPar = indexes.reduce((sum, index) => sum + Number(holePars[index] || 0), 0);
  const targetPar = totalPar * 2 / 3;

  return {
    indexes,
    hiddenPar,
    targetPar,
    isExactPar: hiddenPar * 3 === totalPar * 2
  };
}

function formatParValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatHoleLabels(indexes = []) {
  return indexes.map(index => getCourseHoleLabel(index)).join(', ');
}

function getStoredArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function getTodayDateInputValue() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{9,10}$/.test(digits);
}

function normalizeNameBase(name) {
  return String(name || '').trim().replace(/\d+$/, '');
}

function withDuplicateNameCheck(existingMembers, newMember) {
  const base = normalizeNameBase(newMember.name);
  const sameGroup = existingMembers.filter(m => normalizeNameBase(m.name) === base);
  if (sameGroup.length === 0) return [...existingMembers, newMember];

  const others = existingMembers.filter(m => normalizeNameBase(m.name) !== base);
  const renamed = sameGroup.map((m, index) => ({ ...m, name: `${base}${index + 1}` }));
  return [...others, ...renamed, { ...newMember, name: `${base}${sameGroup.length + 1}` }];
}

function withEditedDuplicateNameCheck(existingMembers, editedMember) {
  const base = normalizeNameBase(editedMember.name);
  const replacedMembers = existingMembers.map(member => (
    member.id === editedMember.id ? editedMember : member
  ));
  const duplicateCount = replacedMembers.filter(member => normalizeNameBase(member.name) === base).length;

  if (duplicateCount <= 1) return replacedMembers;

  let duplicateIndex = 0;
  return replacedMembers.map(member => {
    if (normalizeNameBase(member.name) !== base) return member;
    duplicateIndex += 1;
    return { ...member, name: `${base}${duplicateIndex}` };
  });
}

function getCsvColumn(cols, header, names, fallbackIndex) {
  const normalizedNames = names.map(name => String(name).replace(/\s/g, ''));
  const headerIndex = header.findIndex(value => normalizedNames.includes(String(value || '').replace(/\s/g, '')));
  return cols[headerIndex >= 0 ? headerIndex : fallbackIndex];
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      row.push(field);
      if (row.some(value => String(value).trim())) rows.push(row);
      row = [];
      field = '';
      if (char === '\r' && nextChar === '\n') index += 1;
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(value => String(value).trim())) rows.push(row);

  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\ufeff/, '');
  return rows.map(cols => cols.map(value => String(value || '').trim()));
}

function getCsvHeaderMatchScore(text) {
  const header = parseCsvRows(text)[0] || [];
  const normalizedHeader = header.map(value => String(value || '').replace(/\s/g, ''));
  return ['이름', '성별', '연락처'].reduce(
    (score, columnName) => score + (normalizedHeader.includes(columnName) ? 1 : 0),
    0
  );
}

function decodeCsvBuffer(buffer) {
  const candidates = [
    { encoding: 'utf-8', label: 'UTF-8' },
    { encoding: 'euc-kr', label: 'EUC-KR/CP949' }
  ].map(candidate => {
    try {
      const text = new TextDecoder(candidate.encoding).decode(buffer);
      return {
        ...candidate,
        text,
        score: getCsvHeaderMatchScore(text),
        replacementCount: (text.match(/\uFFFD/g) || []).length
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  return [...candidates].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.replacementCount - b.replacementCount;
  })[0] || { text: '', label: '알 수 없음', score: 0 };
}

function parseCsv(text) {
  const parsedRows = parseCsvRows(text);
  const header = parsedRows[0] || [];
  const rows = parsedRows.slice(1);
  const valid = [];
  const errors = [];
  const warnings = [];

  if (!header.length) {
    return { valid, errors: ['CSV 파일이 비어 있습니다.'], warnings };
  }

  rows.forEach((cols, index) => {
    const name = getCsvColumn(cols, header, ['이름'], 0);
    const genderRaw = getCsvColumn(cols, header, ['성별'], 1);
    const phoneRaw = getCsvColumn(cols, header, ['연락처', '전화번호', '휴대폰'], 2);
    const clubNameRaw = getCsvColumn(cols, header, ['동호회', '동호회이름', '소속동호회'], undefined);
    const positionRaw = getCsvColumn(cols, header, ['직책', '직위', '역할'], undefined);
    const skillRaw = getCsvColumn(cols, header, ['실력등급', '실력'], 3);
    const handicapRaw = getCsvColumn(cols, header, ['핸디캡', '핸디'], 4);
    const leaderRaw = getCsvColumn(cols, header, ['조장후보', '조장'], 5);
    const gender = ['남성', '남', 'male', 'm'].includes((genderRaw || '').toLowerCase()) ? '남성'
      : ['여성', '여', 'female', 'f'].includes((genderRaw || '').toLowerCase()) ? '여성' : '';
    const phone = formatPhone(phoneRaw);
    if (!name || !gender || !isValidPhone(phoneRaw)) {
      errors.push(`${index + 2}행: 이름/성별/연락처 필수값 오류`);
      return;
    }

    const parsedHandicap = Number(handicapRaw);
    const handicap = Number.isFinite(parsedHandicap) ? parsedHandicap : 0;
    if (String(handicapRaw || '').trim() && !Number.isFinite(parsedHandicap)) {
      warnings.push(`${index + 2}행: 핸디캡 값 오류, 0으로 처리`);
    }

    valid.push({
      id: crypto.randomUUID(),
      name,
      gender,
      phone,
      clubName: String(clubNameRaw || '').trim(),
      position: String(positionRaw || '').trim() || DEFAULT_MEMBER_POSITION,
      skillLevel: SKILL_LEVELS.includes(skillRaw) ? skillRaw : '초급',
      handicap,
      isLeaderCandidate: ['예', '네', 'y', 'yes', 'true', '1', 'o', '○'].includes(String(leaderRaw || '').toLowerCase()),
      averageScore: null,
      participationCount: 0
    });
  });

  return { valid, errors, warnings };
}

function getExpectedHiddenHoleCount(holeCount) {
  let count = 0;
  for (let start = 0; start < holeCount; start += 9) {
    count += Math.max(1, Math.floor(Math.min(9, holeCount - start) * 2 / 3));
  }
  return count;
}

function getStablefordPoint(score, par) {
  const diff = Number(score || 0) - Number(par || DEFAULT_HOLE_PAR);
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

function getStablefordHolePoints(scoreList, holePars) {
  return holePars.map((par, index) => getStablefordPoint(scoreList[index], par));
}

function getBackCountValues(scoreList, holePars, method) {
  const values = method === '스테이블포드'
    ? getStablefordHolePoints(scoreList, holePars)
    : scoreList.map(value => Number(value || 0));

  return BACK_COUNT_HOLE_COUNTS.map(count => {
    const slice = values.slice(Math.max(0, values.length - count));
    return sumNumbers(slice);
  });
}

function compareBackCount(a, b, direction = 'low') {
  for (let index = 0; index < a.backCountValues.length; index += 1) {
    const left = a.backCountValues[index];
    const right = b.backCountValues[index];
    if (left === right) continue;
    return direction === 'high' ? right - left : left - right;
  }
  return 0;
}

function calculateMatchPlayPoints(entries, scores, holePars) {
  const pointsByEntryId = Object.fromEntries(entries.map(entry => [entry.id, 0]));
  const holePointsByEntryId = Object.fromEntries(entries.map(entry => [entry.id, Array(holePars.length).fill(0)]));

  holePars.forEach((_, holeIndex) => {
    const holeScores = entries
      .map(entry => ({
        entryId: entry.id,
        score: Number(scores[entry.id]?.[holeIndex])
      }))
      .filter(result => Number.isFinite(result.score) && result.score > 0);

    if (holeScores.length === 0) return;

    const bestScore = Math.min(...holeScores.map(result => result.score));
    const winners = holeScores.filter(result => result.score === bestScore);
    const point = winners.length === 1 ? 1 : 0.5;

    winners.forEach(winner => {
      pointsByEntryId[winner.entryId] += point;
      holePointsByEntryId[winner.entryId][holeIndex] = point;
    });
  });

  return { pointsByEntryId, holePointsByEntryId };
}

function calculateRankings(scoreEntries, scores, round) {
  const method = typeof round === 'string' ? round : round?.method;
  const holePars = getRoundHolePars(round);
  const totalPar = sumNumbers(holePars);
  const matchPlay = method === '매치 플레이'
    ? calculateMatchPlayPoints(scoreEntries, scores, holePars)
    : null;

  const results = scoreEntries.map(entry => {
    const scoreList = Array.from({ length: holePars.length }, (_, index) => Number(scores[entry.id]?.[index] || 0));
    const total = sumNumbers(scoreList);
    let handicap = 0;
    let finalScore = total;
    let points = null;
    let matchPoints = null;
    let sortValue = total;
    let sortDirection = 'low';
    let backCountValues = getBackCountValues(scoreList, holePars, method);

    if (method === '신페리오') {
      const hiddenHoleSummary = getHiddenHoleSummary(round, holePars);
      const hiddenScoreSum = hiddenHoleSummary.indexes.reduce((sum, index) => sum + Number(scoreList[index] || 0), 0);
      const hiddenParSum = hiddenHoleSummary.hiddenPar;
      const estimatedTotal = hiddenParSum > 0 ? hiddenScoreSum * totalPar / hiddenParSum : total;
      handicap = Math.max(0, (estimatedTotal - totalPar) * 0.8);
      finalScore = total - handicap;
      sortValue = finalScore;
    } else if (method === '스테이블포드') {
      const holePoints = getStablefordHolePoints(scoreList, holePars);
      points = sumNumbers(holePoints);
      finalScore = points;
      sortValue = points;
      sortDirection = 'high';
      backCountValues = BACK_COUNT_HOLE_COUNTS.map(count => sumNumbers(holePoints.slice(Math.max(0, holePoints.length - count))));
    } else if (method === '매치 플레이') {
      const holePoints = matchPlay?.holePointsByEntryId[entry.id] || [];
      matchPoints = matchPlay?.pointsByEntryId[entry.id] || 0;
      finalScore = matchPoints;
      sortValue = matchPoints;
      sortDirection = 'high';
      backCountValues = BACK_COUNT_HOLE_COUNTS.map(count => sumNumbers(holePoints.slice(Math.max(0, holePoints.length - count))));
    }

    return {
      id: entry.id,
      type: entry.type,
      name: entry.name,
      member: entry.member,
      members: entry.members || [],
      total,
      handicap,
      finalScore,
      points,
      matchPoints,
      scoreList,
      backCountValues,
      sortValue,
      sortDirection
    };
  }).sort((a, b) => {
    if (a.sortValue !== b.sortValue) {
      return a.sortDirection === 'high' ? b.sortValue - a.sortValue : a.sortValue - b.sortValue;
    }

    const backCountCompare = compareBackCount(a, b, a.sortDirection === 'high' ? 'high' : 'low');
    if (backCountCompare !== 0) return backCountCompare;
    if (a.total !== b.total) return a.total - b.total;
    return getRankingDisplayName(a).localeCompare(getRankingDisplayName(b), 'ko');
  });

  let lastSortKey = null;
  let lastRank = 0;
  return results.map((result, index) => {
    const sortKey = [
      result.sortValue,
      ...result.backCountValues,
      result.total
    ].join('|');
    const rank = sortKey === lastSortKey ? lastRank : index + 1;
    lastSortKey = sortKey;
    lastRank = rank;
    return { ...result, rank };
  });
}

function formatRankingDetail(result, method) {
  const handicap = Number.isFinite(Number(result.handicap)) ? Number(result.handicap).toFixed(1) : '0.0';
  const finalScore = Number.isFinite(Number(result.finalScore)) ? Number(result.finalScore).toFixed(1) : Number(result.total || 0).toFixed(1);

  if (method === '스테이블포드') {
    return `포인트 ${result.points} · 총타수 ${result.total}`;
  }

  if (method === '매치 플레이') {
    return `승점 ${result.matchPoints} · 총타수 ${result.total}`;
  }

  if (method === '신페리오') {
    return `총타수 ${result.total} · 핸디 ${handicap} · 최종 ${finalScore}`;
  }

  if (isTeamScoreMethod(method)) {
    return `팀 총타수 ${result.total}`;
  }

  return `총타수 ${result.total} · 핸디 ${handicap} · 최종 ${finalScore}`;
}

function shouldShowHiddenHoles(round) {
  return round?.showHiddenHoles !== false;
}

function getHiddenHoleDescription(round, hiddenHoleSummary) {
  if (!shouldShowHiddenHoles(round)) return '숨김 홀은 운영자 설정에 따라 비공개입니다.';
  return `숨김 홀: ${formatHoleLabels(hiddenHoleSummary.indexes)} · 숨김 파 ${hiddenHoleSummary.hiddenPar}/${formatParValue(hiddenHoleSummary.targetPar)} · ${hiddenHoleSummary.isExactPar ? '규칙 일치' : '가장 가까운 후보'}`;
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsv(rows) {
  return rows.map(row => row.map(escapeCsvValue).join(',')).join('\r\n');
}

function createSafeFilename(value) {
  const name = String(value || 'round-record').trim().replace(/[\\/:*?"<>|]/g, '_');
  return name || 'round-record';
}

function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildRecordCsv(record) {
  const round = record.round || {};
  const holePars = getRoundHolePars(round);
  const hiddenHoleSummary = round.method === '신페리오' ? getHiddenHoleSummary(round, holePars) : null;
  const metadataRows = [
    ['라운딩', round.title || ''],
    ['날짜', round.date || ''],
    ['장소', round.place || ''],
    ['방식', round.method || ''],
    ['기준파', sumNumbers(holePars)],
    ['참가자', record.participantCount || ''],
    ['조', record.teamCount || ''],
    ['저장일', record.savedAt || '']
  ];

  if (hiddenHoleSummary) {
    metadataRows.push(['신페리오', getHiddenHoleDescription(round, hiddenHoleSummary)]);
  }

  const scoreHeaders = holePars.map((_, index) => getCourseHoleLabel(index));
  const rankingRows = (record.rankings || []).map(result => [
    result.rank,
    getRankingDisplayName(result),
    getRankingMembersText(result),
    result.total,
    Number.isFinite(Number(result.handicap)) ? Number(result.handicap).toFixed(1) : '',
    Number.isFinite(Number(result.finalScore)) ? Number(result.finalScore).toFixed(1) : '',
    result.points ?? '',
    result.matchPoints ?? '',
    ...(result.scoreList || []).map(value => Number(value || 0))
  ]);

  return buildCsv([
    ...metadataRows,
    [],
    ['순위', '이름', '구성원', '총타수', '핸디', '최종', '포인트', '승점', ...scoreHeaders],
    ...rankingRows
  ]);
}

function formatScoreDiff(value, digits = 1) {
  const number = Number(value || 0);
  const text = Number.isInteger(number) ? String(number) : number.toFixed(digits);
  return number > 0 ? `+${text}` : text;
}

function getScoreDiffClass(diff) {
  const value = Number(diff || 0);
  if (value < 0) return 'under';
  if (value === 0) return 'even';
  if (value === 1) return 'bogey';
  return 'over';
}

function getEntryScoreMeta(scoreList = [], holePars = []) {
  const normalizedScores = holePars.map((par, index) => Number(scoreList[index] ?? par));
  const total = sumNumbers(normalizedScores);
  const totalPar = sumNumbers(holePars);
  const diff = total - totalPar;
  const completed = normalizedScores.filter(value => Number.isFinite(value) && value > 0).length;
  const parSaveCount = normalizedScores.filter((score, index) => score <= Number(holePars[index] || DEFAULT_HOLE_PAR)).length;
  const birdieCount = normalizedScores.filter((score, index) => score < Number(holePars[index] || DEFAULT_HOLE_PAR)).length;
  return {
    total,
    totalPar,
    diff,
    completed,
    parSaveRate: holePars.length ? Math.round((parSaveCount / holePars.length) * 100) : 0,
    birdieCount
  };
}

function getTeamSizePattern(participantCount = 0, teamCount = 0, teams = []) {
  if (teams.length > 0) {
    return teams.map(team => flattenGroupMembers(team).length || [team.leader, ...(team.members || [])].filter(Boolean).length).join('·');
  }
  if (!teamCount) return '';
  const base = Math.floor(participantCount / teamCount);
  const extra = participantCount % teamCount;
  return Array.from({ length: teamCount }, (_, index) => base + (index < extra ? 1 : 0)).join('·');
}

function buildBuddyInsight(participantCount, teamCount, assignmentMode, isTeamMatch) {
  const pattern = getTeamSizePattern(participantCount, teamCount);
  if (isTeamMatch) return `Buddy AI가 ${teamCount}개 매치업으로 팀 전력과 조합을 맞췄어요.`;
  if (participantCount % 4 !== 0 && pattern) return `${participantCount}명은 ${pattern} 구조가 가장 안정적이에요. 3인 조도 불리하지 않게 밸런스를 보정했습니다.`;
  if (assignmentMode === TEAM_ASSIGNMENT_MODES.BALANCED_OVERLAP) return '실력 밸런스와 직전 조 중복을 함께 줄인 추천 편성이에요.';
  if (assignmentMode === TEAM_ASSIGNMENT_MODES.LEADER) return '조장 후보를 고르게 배치해 각 조의 운영 안정감을 높였어요.';
  return '오늘 멤버의 실력 점수를 기준으로 조별 평균을 최대한 가깝게 맞췄어요.';
}

function buildResultShareText(round, rankings, totalPar) {
  const winner = rankings[0];
  const topLines = rankings.slice(0, 3).map(result => `#${result.rank} ${getRankingDisplayName(result)} · ${formatScoreDiff(Number(result.total || 0) - totalPar)} TO PAR`);
  return [
    'PARKBUDDY ROUND CARD',
    `${round.title || '오늘의 라운드'} · ${round.place || ''}`,
    `${round.date || ''} · ${round.holes || ''}H`,
    '',
    winner ? `WINNER ${getRankingDisplayName(winner)} · ${formatScoreDiff(Number(winner.total || 0) - totalPar)}` : '',
    ...topLines,
    '',
    '오늘의 라운드가, 나의 기록이 된다.'
  ].filter(Boolean).join('\n');
}

function getMemberScoreTrend(memberId, records = []) {
  if (!memberId) return [];

  return [...records].reverse().flatMap(record => {
    const result = (record.rankings || []).find(entry => getRankingMemberIds(entry).has(memberId));
    if (!result) return [];

    const holePars = getRoundHolePars(record.round);
    const totalPar = sumNumbers(holePars);
    const total = Number(result.total || 0);
    const scoreDiff = total - totalPar;

    return [{
      id: `${record.id}-${result.id || result.member?.id || memberId}`,
      recordId: record.id,
      title: record.round?.title || '라운딩',
      date: record.round?.date || '',
      place: record.round?.place || '',
      method: record.round?.method || '',
      holes: record.round?.holes || holePars.length,
      rank: result.rank,
      total,
      totalPar,
      scoreDiff,
      finalScore: result.finalScore,
      points: result.points,
      matchPoints: result.matchPoints,
      isTeamResult: result.type === 'team' || (result.members || []).length > 1,
      membersText: getRankingMembersText(result)
    }];
  });
}

function getTrendSummary(series = []) {
  if (series.length === 0) {
    return {
      count: 0,
      averageDiff: null,
      bestDiff: null,
      latest: null
    };
  }

  const diffValues = series.map(item => item.scoreDiff);
  const totalValues = series.map(item => item.total);
  return {
    count: series.length,
    averageDiff: sumNumbers(diffValues) / diffValues.length,
    averageTotal: sumNumbers(totalValues) / totalValues.length,
    bestDiff: Math.min(...diffValues),
    latest: series[series.length - 1]
  };
}

function Button({ children, onClick, variant = 'primary', disabled = false, icon: Icon }) {
  return (
    <button className={`btn ${variant}`} onClick={onClick} disabled={disabled}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

function Card({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="card">
      {(title || subtitle) && (
        <div className="card-title">
          {Icon && <Icon size={22} />}
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="field">
      <span>{label}{required && <b> *</b>}</span>
      {children}
    </label>
  );
}

function HomeScreen({ setScreen, members, records }) {
  const scoredRecords = records.filter(record => (record.rankings || []).length > 0);
  const latestRecord = scoredRecords[0];
  const latestWinner = latestRecord?.rankings?.[0];
  const latestPar = latestRecord ? sumNumbers(getRoundHolePars(latestRecord.round)) : 0;
  const latestDiff = latestWinner ? Number(latestWinner.total || 0) - latestPar : null;
  const totalPlayers = new Set(records.flatMap(record => (record.participants || []).map(member => member.id))).size;

  return (
    <main className="page home sport-home">
      <div className="hero sport-hero">
        <div>
          <p className="eyebrow">ParkBuddy Performance Club</p>
          <h1>오늘의 라운드가,<br />나의 기록이 된다.</h1>
          <p>조편성, 라이브 스코어, 순위표, 개인 성장 데이터를 하나의 스포츠 플랫폼처럼 관리하세요.</p>
          <div className="hero-actions">
            <Button icon={Plus} onClick={() => setScreen('roundCreate')}>Start Round</Button>
            <Button icon={Activity} onClick={() => setScreen('personalScores')} variant="glass">My Performance</Button>
          </div>
        </div>
        <div className="hero-score-card" aria-label="최근 라운드 하이라이트">
          <span>Latest Highlight</span>
          <strong>{latestWinner ? formatScoreDiff(latestDiff) : 'READY'}</strong>
          <small>{latestWinner ? `${getRankingDisplayName(latestWinner)} · ${latestRecord.round?.place || '최근 라운드'}` : '첫 라운드를 시작해 보세요'}</small>
        </div>
      </div>

      <div className="stats home-stats performance-stats">
        <button className="card stat-link stat-card" onClick={() => setScreen('members')} aria-label="회원 등록 및 관리로 이동">
          <span className="stat-label">Club Members</span>
          <strong>{members.length}</strong>
          <span>등록 회원</span>
        </button>
        <button className="card stat-link stat-card" onClick={() => setScreen('records')} aria-label="라운딩 기록 보기로 이동">
          <span className="stat-label">Rounds</span>
          <strong>{records.length}</strong>
          <span>누적 라운드</span>
        </button>
        <button className="card stat-link stat-card" onClick={() => setScreen('records')} aria-label="활동 선수 보기">
          <span className="stat-label">Active Players</span>
          <strong>{totalPlayers || members.length}</strong>
          <span>기록 참여자</span>
        </button>
      </div>

      <Card title="Club Pulse" subtitle="라운딩을 시작하면 순위, 성장 추이, 공유 카드가 자동으로 쌓입니다." icon={Trophy}>
        <div className="grid menu sport-menu">
          <Button icon={Plus} onClick={() => setScreen('roundCreate')}>오늘 라운딩 시작</Button>
          <Button icon={Activity} onClick={() => setScreen('personalScores')} variant="secondary">성장 데이터 보기</Button>
          <Button icon={MapPin} onClick={() => setScreen('courses')} variant="secondary">구장 관리</Button>
        </div>
      </Card>
    </main>
  );
}

function MemberScreen({ members, memberStats, setMembers }) {
  const clubNameSuggestions = useMemo(() => [
    ...new Set(members.map(member => String(member.clubName || '').trim()).filter(Boolean))
  ], [members]);
  const defaultClubName = clubNameSuggestions[0] || DEFAULT_CLUB_NAME;
  const empty = {
    name: '',
    gender: '',
    phone: '',
    clubName: defaultClubName,
    position: DEFAULT_MEMBER_POSITION,
    skillLevel: '초급',
    handicap: '0',
    isLeaderCandidate: false
  };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matchedMembers = !keyword ? members : members.filter(member => [
      member.name,
      member.phone,
      member.gender,
      member.clubName,
      member.position,
      member.skillLevel
    ].some(value => String(value || '').toLowerCase().includes(keyword)));
    return sortMembersForDisplay(matchedMembers);
  }, [members, query]);

  const saveMember = () => {
    if (!form.name.trim()) return setError('필수항목인 이름을 입력해 주세요.');
    if (!form.gender) return setError('필수항목인 성별을 선택해 주세요.');
    if (!isValidPhone(form.phone)) return setError('연락처는 0으로 시작하는 숫자 10~11자리로 입력해 주세요.');

    const existingMember = members.find(m => m.id === editingId);
    const member = {
      id: editingId || crypto.randomUUID(),
      name: form.name.trim(),
      gender: form.gender,
      phone: formatPhone(form.phone),
      clubName: String(form.clubName || '').trim(),
      position: String(form.position || '').trim() || DEFAULT_MEMBER_POSITION,
      skillLevel: form.skillLevel,
      handicap: Number.isFinite(Number(form.handicap)) ? Number(form.handicap) : 0,
      isLeaderCandidate: Boolean(form.isLeaderCandidate),
      averageScore: existingMember?.averageScore ?? null,
      participationCount: existingMember?.participationCount ?? 0
    };

    if (!confirm(editingId ? '회원 정보를 수정할까요?' : '회원을 등록할까요?')) return;

    if (editingId) {
      setMembers(prev => withEditedDuplicateNameCheck(prev, member));
    } else {
      setMembers(prev => withDuplicateNameCheck(prev, member));
    }
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    setExpandedMemberId(member.id);
    setError('');
  };

  const deleteMember = (member) => {
    if (confirm(`${member.name} 회원을 삭제할까요?\n\n저장된 과거 기록은 남지만, 이후 라운딩 참가자 선택과 조편성 후보에서는 제외됩니다.`)) {
      setMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const startEditMember = (member) => {
    setForm({
      ...empty,
      ...member,
      clubName: member.clubName || defaultClubName,
      position: member.position || DEFAULT_MEMBER_POSITION,
      handicap: String(member.handicap ?? 0),
      isLeaderCandidate: Boolean(member.isLeaderCandidate)
    });
    setEditingId(member.id);
    setShowForm(true);
    setExpandedMemberId(member.id);
    setError('');
  };

  const downloadSample = () => {
    const blob = new Blob(['\ufeff' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'parkbuddy_member_sample.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const uploadCsv = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const decoded = decodeCsvBuffer(reader.result);
      const { valid, errors, warnings } = parseCsv(decoded.text);
      const encodingNotice = decoded.label !== 'UTF-8' ? `파일 인코딩: ${decoded.label}로 읽음` : '';
      const notice = [
        encodingNotice,
        errors.length ? `건너뛸 행:\n${errors.join('\n')}` : '',
        warnings.length ? `자동 보정:\n${warnings.join('\n')}` : ''
      ].filter(Boolean).join('\n\n');
      const message = `등록 가능한 회원: ${valid.length}명\n건너뛸 행: ${errors.length}개\n자동 보정: ${warnings.length}개${notice ? '\n\n' + notice : ''}`;
      if (valid.length > 0 && confirm(message + '\n\n일괄 등록할까요?')) {
        setMembers(prev => valid.reduce((acc, member) => withDuplicateNameCheck(acc, member), prev));
      } else {
        alert(message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  return (
    <main className="page">
      <header className="topbar">
        <h1>회원 등록 및 관리</h1>
      </header>

      <Card title={`회원 ${members.length}명`} subtitle={`조장 후보 ${members.filter(m => m.isLeaderCandidate).length}명`} icon={Users}>
        <div className="button-row">
          <Button icon={Plus} onClick={() => setMenuOpen(v => !v)}>신규 등록</Button>
        </div>
        {menuOpen && (
          <div className="menu-box">
            <Button variant="secondary" onClick={() => { setShowForm(true); setEditingId(null); setForm(empty); setMenuOpen(false); }}>직접 등록</Button>
            <Button variant="secondary" icon={Download} onClick={downloadSample}>CSV 양식저장</Button>
            <label className="btn secondary file-btn">
              <Upload size={18} /> CSV 일괄등록
              <input type="file" accept=".csv,text/csv" onChange={uploadCsv} />
            </label>
          </div>
        )}
      </Card>

      <Card title="회원 검색" subtitle={`${filteredMembers.length}명 표시`} icon={Search}>
        <Field label="이름, 연락처, 동호회, 직책으로 검색">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 회장, 010-1111, 장성" />
        </Field>
      </Card>

      {showForm && (
        <Card title={editingId ? '회원 수정' : '신규 회원 등록'}>
          <div className="form-grid">
            <Field label="이름" required><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="연락처" required><input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="010-1234-5678" /></Field>
            <Field label="동호회 이름">
              <input list="club-name-options" value={form.clubName || ''} onChange={e => setForm({ ...form, clubName: e.target.value })} placeholder="예: 장성 파크골프 동호회" />
              <datalist id="club-name-options">{clubNameSuggestions.map(clubName => <option key={clubName} value={clubName} />)}</datalist>
            </Field>
            <Field label="직책">
              <input list="member-position-options" value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="예: 회원" />
              <datalist id="member-position-options">{COMMON_POSITIONS.map(position => <option key={position} value={position} />)}</datalist>
            </Field>
            <Field label="성별" required>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">선택</option>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="실력등급"><select value={form.skillLevel} onChange={e => setForm({ ...form, skillLevel: e.target.value })}>{SKILL_LEVELS.map(v => <option key={v}>{v}</option>)}</select></Field>
            <Field label="핸디캡"><input type="number" value={form.handicap} onChange={e => setForm({ ...form, handicap: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={form.isLeaderCandidate} onChange={e => setForm({ ...form, isLeaderCandidate: e.target.checked })} /> 조장 후보</label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="button-row">
            <Button onClick={saveMember}>{editingId ? '수정 완료' : '등록'}</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setError(''); }}>취소</Button>
          </div>
        </Card>
      )}

      <div className="list">
        {filteredMembers.map(member => {
          const isExpanded = expandedMemberId === member.id;
          const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;

          return (
            <Card key={member.id}>
              <div className="member-card-header">
                <button
                  className="summary-toggle member-summary"
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  aria-expanded={isExpanded}
                  aria-label={`${member.name} 회원 상세 ${isExpanded ? '접기' : '펼치기'}`}
                >
                  <span>
                    <strong>{member.name}</strong>
                    <em>{member.position || DEFAULT_MEMBER_POSITION}</em>
                  </span>
                  <ExpandIcon size={22} />
                </button>
                {isExpanded && (
                  <div className="button-row compact member-actions">
                    <Button variant="secondary" onClick={() => startEditMember(member)}>수정</Button>
                    <Button variant="danger" onClick={() => deleteMember(member)}>삭제</Button>
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="member-detail">
                  <div>
                    {member.isLeaderCandidate && <small>조장 후보</small>}
                    <p>{member.clubName || DEFAULT_CLUB_NAME}</p>
                    <p>{member.phone} · {member.gender} · {member.skillLevel} · 핸디 {member.handicap}</p>
                    <p>{getMemberSkillText(member, memberStats)}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filteredMembers.length === 0 && (
          <Card>
            <p>검색 조건에 맞는 회원이 없습니다.</p>
          </Card>
        )}
      </div>
    </main>
  );
}

function TrendChart({ series }) {
  if (series.length === 0) return null;

  const width = 760;
  const height = 280;
  const padding = 42;
  const values = series.map(item => item.scoreDiff);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = rawMin === rawMax ? rawMin - 1 : rawMin;
  const maxValue = rawMin === rawMax ? rawMax + 1 : rawMax;
  const valueRange = Math.max(1, maxValue - minValue);
  const xFor = index => series.length === 1
    ? width / 2
    : padding + (index * (width - padding * 2) / (series.length - 1));
  const yFor = value => height - padding - ((value - minValue) / valueRange) * (height - padding * 2);
  const points = series.map((item, index) => `${xFor(index)},${yFor(item.scoreDiff)}`).join(' ');
  const gridValues = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <div className="trend-chart" role="img" aria-label="개인 기준파 대비 점수 추이 그래프">
      <svg viewBox={`0 0 ${width} ${height}`}>
        {gridValues.map(value => (
          <g key={value}>
            <line x1={padding} y1={yFor(value)} x2={width - padding} y2={yFor(value)} />
            <text x={8} y={yFor(value) + 5}>{formatScoreDiff(value)}</text>
          </g>
        ))}
        <polyline points={points} />
        {series.map((item, index) => (
          <g key={item.id}>
            <circle cx={xFor(index)} cy={yFor(item.scoreDiff)} r="6" />
            <text className="point-label" x={xFor(index)} y={yFor(item.scoreDiff) - 12}>{formatScoreDiff(item.scoreDiff)}</text>
            <text className="date-label" x={xFor(index)} y={height - 12}>{item.date || `${index + 1}회`}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PersonalScoreScreen({ members, records }) {
  const sortedMembers = useMemo(() => sortMembersForDisplay(members), [members]);
  const [selectedMemberId, setSelectedMemberId] = useState(sortedMembers[0]?.id || '');
  const selectedMember = sortedMembers.find(member => member.id === selectedMemberId) || sortedMembers[0] || null;
  const series = useMemo(() => getMemberScoreTrend(selectedMember?.id, records), [selectedMember?.id, records]);
  const summary = getTrendSummary(series);

  React.useEffect(() => {
    if (!selectedMemberId && sortedMembers[0]?.id) setSelectedMemberId(sortedMembers[0].id);
  }, [sortedMembers, selectedMemberId]);

  return (
    <main className="page">
      <header className="topbar">
        <h1>개인점수관리</h1>
      </header>

      <Card title="회원 선택" subtitle="저장된 라운딩 기록을 기준파 대비 점수 추이로 확인합니다." icon={Activity}>
        <Field label="회원">
          <select value={selectedMember?.id || ''} onChange={e => setSelectedMemberId(e.target.value)} disabled={members.length === 0}>
            {sortedMembers.map(member => <option key={member.id} value={member.id}>{member.name} · {member.position || DEFAULT_MEMBER_POSITION}</option>)}
          </select>
        </Field>
      </Card>

      {!selectedMember ? (
        <Card>
          <p>등록된 회원이 없습니다.</p>
        </Card>
      ) : series.length === 0 ? (
        <Card title={selectedMember.name} subtitle="기록 없음">
          <p>저장된 라운딩 기록에 이 회원의 점수가 아직 없습니다.</p>
        </Card>
      ) : (
        <>
          <div className="stats score-stats">
            <Card><strong>{summary.count}</strong><span>기록 수</span></Card>
            <Card><strong>{formatScoreDiff(summary.averageDiff)}</strong><span>평균 기준파 대비</span></Card>
            <Card><strong>{formatScoreDiff(summary.bestDiff)}</strong><span>최고 기록</span></Card>
          </div>

          <Card title={`${selectedMember.name} 기록 추이`} subtitle={`최근 기록 ${summary.latest.date} · ${formatScoreDiff(summary.latest.scoreDiff)} · 총타수 ${summary.latest.total}`} icon={Activity}>
            <TrendChart series={series} />
          </Card>

          <Card title="라운딩별 기록">
            <div className="score-history">
              {series.slice().reverse().map(item => (
                <div key={item.id} className="score-history-row">
                  <div>
                    <strong>{item.date} · {item.title}</strong>
                    <span>{item.place} · {item.method} · {item.holes}홀 · 기준파 {item.totalPar}</span>
                    {item.isTeamResult && <small>팀 기록: {item.membersText}</small>}
                  </div>
                  <div>
                    <b>{formatScoreDiff(item.scoreDiff)}</b>
                    <span>총타수 {item.total} · {item.rank}위</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </main>
  );
}

function RoundCreateScreen({ setScreen, setRound, recentPlaces, setRecentPlaces, customPlaces = [] }) {
  const [province, setProvince] = useState('전라남도');
  const [round, setLocalRound] = useState({
    title: '정기 라운딩',
    date: getTodayDateInputValue(),
    place: '장성 파크골프장',
    memo: '',
    holes: 18,
    method: '스트로크 플레이',
    holePars: createDefaultHolePars(18),
    hiddenHoleMode: 'auto',
    manualHiddenHoleIndexes: [],
    showHiddenHoles: true
  });
  const [error, setError] = useState('');

  const customPlaceNames = customPlaces
    .filter(place => !place.province || place.province === province)
    .map(place => place.name)
    .filter(Boolean);
  const places = [...new Set([...(PARK_GOLF_PLACES[province] || []), ...customPlaceNames, ...recentPlaces])];
  const holePars = getRoundHolePars(round);
  const totalPar = sumNumbers(holePars);
  const expectedHiddenCount = getExpectedHiddenHoleCount(holePars.length);
  const manualHiddenIndexes = (round.manualHiddenHoleIndexes || [])
    .filter(index => index >= 0 && index < holePars.length)
    .sort((a, b) => a - b);
  const manualHiddenPar = manualHiddenIndexes.reduce((sum, index) => sum + Number(holePars[index] || 0), 0);
  const targetHiddenPar = totalPar * 2 / 3;

  const changeHoleCount = (holes) => {
    setLocalRound(prev => ({
      ...prev,
      holes,
      holePars: createDefaultHolePars(holes, prev.holePars),
      manualHiddenHoleIndexes: (prev.manualHiddenHoleIndexes || []).filter(index => index < holes)
    }));
  };

  const updateHolePar = (index, value) => {
    setLocalRound(prev => {
      const nextHolePars = createDefaultHolePars(prev.holes, prev.holePars);
      nextHolePars[index] = sanitizeHolePar(value);
      return { ...prev, holePars: nextHolePars };
    });
  };

  const toggleManualHiddenHole = (index) => {
    setLocalRound(prev => {
      const selected = new Set(prev.manualHiddenHoleIndexes || []);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      return {
        ...prev,
        manualHiddenHoleIndexes: [...selected].sort((a, b) => a - b)
      };
    });
  };

  const submit = () => {
    if (!round.title.trim()) return setError('라운딩 제목을 입력해 주세요.');
    if (!round.date.trim()) return setError('날짜를 입력해 주세요.');
    if (round.place.trim()) setRecentPlaces(prev => [round.place.trim(), ...prev.filter(p => p !== round.place.trim())].slice(0, 10));
    const normalizedHolePars = getRoundHolePars(round);
    let hiddenHoleIndexes = [];
    if (round.method === '신페리오') {
      if (round.hiddenHoleMode === 'manual') {
        const selectedIndexes = (round.manualHiddenHoleIndexes || [])
          .filter(index => index >= 0 && index < normalizedHolePars.length)
          .sort((a, b) => a - b);
        const selectedPar = selectedIndexes.reduce((sum, index) => sum + Number(normalizedHolePars[index] || 0), 0);
        const targetPar = sumNumbers(normalizedHolePars) * 2 / 3;
        if (selectedIndexes.length !== getExpectedHiddenHoleCount(normalizedHolePars.length)) {
          return setError(`직접 선택 숨김 홀은 ${getExpectedHiddenHoleCount(normalizedHolePars.length)}개여야 합니다.`);
        }
        if (selectedPar * 3 !== sumNumbers(normalizedHolePars) * 2) {
          return setError(`직접 선택 숨김 홀의 파 합계가 ${formatParValue(targetPar)}타가 되도록 선택해 주세요.`);
        }
        hiddenHoleIndexes = selectedIndexes;
      } else {
        hiddenHoleIndexes = selectNewPeoriaHiddenHoleIndexes(normalizedHolePars, `${round.title}-${round.date}-${round.place}-${normalizedHolePars.join('-')}`);
      }
    }
    setRound({
      ...round,
      id: crypto.randomUUID(),
      province,
      holePars: normalizedHolePars,
      hiddenHoleMode: round.method === '신페리오' ? round.hiddenHoleMode : 'auto',
      manualHiddenHoleIndexes: round.method === '신페리오' ? manualHiddenIndexes : [],
      showHiddenHoles: round.method === '신페리오' ? round.showHiddenHoles !== false : true,
      hiddenHoleIndexes
    });
    setScreen('memberSelect');
  };

  return (
    <main className="page round-page">
      <header className="topbar">
        <h1>라운딩 생성</h1>
        <p>라운딩 기본 정보를 입력하고 참가자를 선택하세요.</p>
      </header>

      <div className="scroll-area">
        <Card title="라운딩 기본 정보" icon={CalendarDays}>
          <div className="form-grid single">
            <Field label="라운딩 제목" required><input value={round.title} onChange={e => setLocalRound({ ...round, title: e.target.value })} /></Field>
            <Field label="날짜" required><input type="date" value={round.date} onChange={e => setLocalRound({ ...round, date: e.target.value })} /></Field>
            <Field label="행정구역">
              <select value={province} onChange={e => { setProvince(e.target.value); setLocalRound({ ...round, place: PARK_GOLF_PLACES[e.target.value]?.[0] || '' }); }}>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="파크골프장 선택 또는 직접 입력">
              <input list="places" value={round.place} onChange={e => setLocalRound({ ...round, place: e.target.value })} />
              <datalist id="places">{places.map(p => <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="메모"><textarea value={round.memo} onChange={e => setLocalRound({ ...round, memo: e.target.value })} rows={3} /></Field>
          </div>
        </Card>

        <Card title="경기 설정" icon={Trophy}>
          <Field label="기본 홀 수">
            <div className="chip-row">{HOLE_OPTIONS.map(h => <button key={h} className={round.holes === h ? 'chip active' : 'chip'} onClick={() => changeHoleCount(h)}>{h}홀</button>)}</div>
          </Field>
          <Field label="점수/경기 방식">
            <select value={round.method} onChange={e => setLocalRound({ ...round, method: e.target.value })}>
              {GAME_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <div className="field">
            <span>홀별 규정타수 · 기준파 {totalPar}</span>
            <div className="course-input-list">
              {getCourseGroups(holePars).map(course => (
                <section className="course-input-card" key={course.label}>
                  <h3>{course.label}</h3>
                  <div className="par-grid">
                    {course.holes.map(hole => (
                      <label key={hole.index}>
                        <span>{hole.number}H</span>
                        <input type="number" min="1" max="12" value={hole.value} onChange={e => updateHolePar(hole.index, e.target.value)} />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Card>

        {round.method === '신페리오' && (
          <Card
            title="신페리오 숨김 홀"
            subtitle={`필요 숨김 홀 ${expectedHiddenCount}개 · 목표 숨김 파 ${formatParValue(targetHiddenPar)}`}
          >
            <Field label="선정 방식">
              <div className="chip-row">
                <button className={round.hiddenHoleMode === 'auto' ? 'chip active' : 'chip'} onClick={() => setLocalRound({ ...round, hiddenHoleMode: 'auto' })}>자동 선정</button>
                <button className={round.hiddenHoleMode === 'manual' ? 'chip active' : 'chip'} onClick={() => setLocalRound({ ...round, hiddenHoleMode: 'manual' })}>직접 선택</button>
              </div>
            </Field>
            <label className="check">
              <input type="checkbox" checked={round.showHiddenHoles !== false} onChange={e => setLocalRound({ ...round, showHiddenHoles: e.target.checked })} />
              순위표와 기록에서 숨김 홀 공개
            </label>
            {round.hiddenHoleMode === 'manual' && (
              <div className="field">
                <span>숨김 홀 선택 · {manualHiddenIndexes.length}/{expectedHiddenCount}개 · 선택 파 {manualHiddenPar}/{formatParValue(targetHiddenPar)}</span>
                <div className="course-input-list">
                  {getCourseGroups(holePars).map(course => (
                    <section className="course-input-card" key={course.label}>
                      <h3>{course.label}</h3>
                      <div className="hidden-hole-grid">
                        {course.holes.map(hole => (
                          <button
                            key={hole.index}
                            className={manualHiddenIndexes.includes(hole.index) ? 'hole-toggle active' : 'hole-toggle'}
                            onClick={() => toggleManualHiddenHole(hole.index)}
                          >
                            <strong>{hole.number}H</strong>
                            <span>파 {hole.value}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <Button onClick={submit}>참가자 선택으로 이동</Button>
    </main>
  );
}

function MemberSelectScreen({
  setScreen,
  members,
  memberStats,
  setParticipants,
  setLeaders,
  setTeamSize,
  teamSize,
  round,
  teamAssignmentMode,
  setTeamAssignmentMode
}) {
  const [selected, setSelected] = useState([]);
  const [leaders, setLocalLeaders] = useState([]);
  const assignmentOptions = useMemo(() => getAssignmentOptions(round?.method), [round?.method]);
  const defaultAssignmentMode = getDefaultAssignmentMode(round?.method);
  const selectedAssignmentMode = assignmentOptions.some(option => option.value === teamAssignmentMode)
    ? teamAssignmentMode
    : defaultAssignmentMode;
  const isTeamMatch = isTeamMatchMethod(round?.method);
  const sortedMembers = useMemo(() => sortMembersForDisplay(members), [members]);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  const toggleLeader = (id) => setLocalLeaders(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

  React.useEffect(() => {
    if (!assignmentOptions.some(option => option.value === teamAssignmentMode)) {
      setTeamAssignmentMode(defaultAssignmentMode);
    }
  }, [assignmentOptions, defaultAssignmentMode, teamAssignmentMode, setTeamAssignmentMode]);

  const next = () => {
    const participants = sortedMembers.filter(m => selected.includes(m.id));
    if (participants.length < 3) return alert('참가자를 3명 이상 선택해 주세요.');
    setParticipants(participants);
    setLeaders(sortedMembers.filter(m => leaders.includes(m.id)));
    setTeamAssignmentMode(selectedAssignmentMode);
    setScreen('teamResult');
  };

  return (
    <main className="page">
      <header className="topbar"><h1>참가자 선택</h1><p>{round?.title} · {round?.date} · {round?.place}</p></header>
      <Card title={isTeamMatch ? '팀전 편성 방식' : '조편성 방식'} subtitle={isTeamMatch ? '2인 팀을 만든 뒤 2개 팀을 한 조로 배치합니다.' : '운영 목적에 맞는 조편성 기준을 고르세요.'}>
        <div className="option-grid">
          {assignmentOptions.map(option => (
            <button
              key={option.value}
              className={selectedAssignmentMode === option.value ? 'option-card active' : 'option-card'}
              onClick={() => setTeamAssignmentMode(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </Card>
      {!isTeamMatch && (
        <Card title="조당 인원">
          <div className="chip-row">{[3,4,5].map(size => <button key={size} className={teamSize === size ? 'chip active' : 'chip'} onClick={() => setTeamSize(size)}>{size}명</button>)}</div>
        </Card>
      )}
      <div className="member-grid">
        {sortedMembers.map(m => (
          <div key={m.id} className={`select-card ${selected.includes(m.id) ? 'selected' : ''}`}>
            <button onClick={() => toggle(m.id)}><strong>{m.name}</strong><span>{getMemberAffiliationText(m)}</span><em>{m.skillLevel} · 핸디 {m.handicap} · {getMemberSkillText(m, memberStats)}</em></button>
            {m.isLeaderCandidate && <button className={leaders.includes(m.id) ? 'leader active' : 'leader'} onClick={() => toggleLeader(m.id)}>조장</button>}
          </div>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="ghost" onClick={() => setScreen('roundCreate')}>이전</Button>
        <Button onClick={next}>조편성하기</Button>
      </div>
    </main>
  );
}

function TeamResultScreen({
  setScreen,
  participants,
  leaders,
  teamSize,
  setTeams,
  teams,
  setRecords,
  round,
  assignmentMode,
  memberStats,
  previousRoundTeams
}) {
  const isTeamMatch = isTeamMatchMethod(round?.method);
  const makeTeams = () => {
    setTeams(createTeamAssignment(participants, {
      method: round?.method,
      mode: assignmentMode,
      teamSize,
      leaders,
      statsByMember: memberStats,
      previousRoundTeams
    }));
  };
  React.useEffect(() => { if (!teams.length && participants.length) makeTeams(); }, []);

  const saveRoundRecord = () => {
    if (!round) return alert('라운딩 정보가 없습니다.');
    if (!teams.length) return alert('조편성을 먼저 완료해 주세요.');

    const scoreEntries = getScoreEntries(participants, teams, round);
    const savedAt = new Date().toLocaleString();
    const record = {
      id: crypto.randomUUID(),
      round,
      assignmentMode,
      participants,
      teams,
      participantCount: participants.length,
      teamCount: teams.length,
      scoringEntryCount: scoreEntries.length,
      scores: {},
      rankings: [],
      status: 'pending',
      savedAt,
      updatedAt: savedAt
    };

    setRecords(prev => [record, ...prev.filter(item => item.round?.id !== round.id)]);
    alert('조편성을 라운딩 기록에 저장했습니다. 점수 입력은 라운딩 기록 보기에서 진행하세요.');
    setScreen('records');
  };

  const pattern = getTeamSizePattern(participants.length, teams.length, teams);
  const balanceValues = teams.map(team => Number(team.skillAverage)).filter(Number.isFinite);
  const skillSpread = balanceValues.length ? (Math.max(...balanceValues) - Math.min(...balanceValues)).toFixed(1) : '0.0';
  const buddyInsight = buildBuddyInsight(participants.length, teams.length, assignmentMode, isTeamMatch);

  return (
    <main className="page">
      <header className="topbar sport-topbar"><div><p className="eyebrow">Buddy AI Pairing</p><h1>오늘의 베스트 조</h1><p>{round?.title} · {participants.length}명 · {teams.length}개 조 · {getAssignmentModeLabel(assignmentMode)}</p></div></header>

      <section className="ai-report-card">
        <div>
          <span className="badge-live">AI PICK</span>
          <h2>{pattern ? `${pattern} 편성 완료` : '편성 완료'}</h2>
          <p>{buddyInsight}</p>
        </div>
        <div className="ai-metrics">
          <div><strong>{skillSpread}</strong><span>실력 편차</span></div>
          <div><strong>{leaders.length}</strong><span>조장 후보</span></div>
          <div><strong>{teams.length}</strong><span>라운드 조</span></div>
        </div>
      </section>

      <div className="list team-list">
        {teams.map(team => (
          <Card key={team.id} title={team.name} subtitle={isTeamMatch ? `Team match · 평균 실력 ${team.skillAverage}` : `${team.leader ? `Captain ${team.leader.name}` : 'Captain 미지정'} · 평균 실력 ${team.skillAverage}`}>
            {isTeamMatch ? (
              <div className="match-team-list">
                {team.matchTeams.map(matchTeam => (
                  <div key={matchTeam.id} className="match-team">
                    <strong>{matchTeam.name}</strong>
                    <span>{matchTeam.members.map(member => member.name).join(' + ')}</span>
                    <small>팀 평균 {matchTeam.skillAverage} · 차이 {matchTeam.skillGap}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="team-roster">
                {[team.leader, ...team.members].filter(Boolean).map(member => (
                  <span key={member.id} className={member.id === team.leader?.id ? 'roster-chip captain' : 'roster-chip'}>{member.name}{member.id === team.leader?.id ? ' · Captain' : ''}</span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="secondary" icon={Shuffle} onClick={makeTeams}>다시 편성</Button>
        <Button icon={Save} onClick={saveRoundRecord}>Finish Setup</Button>
      </div>
    </main>
  );
}

function ScoreInputScreen({ setScreen, participants, round, teams, scores, setScores, activeRecordId }) {
  const holePars = useMemo(() => getRoundHolePars(round), [round]);
  const scoreEntries = useMemo(() => getScoreEntries(participants, teams, round), [participants, teams, round]);
  const courseGroups = useMemo(() => getCourseGroups(holePars), [holePars]);
  const [activeEntryId, setActiveEntryId] = useState(scoreEntries[0]?.id || '');
  const activeEntry = scoreEntries.find(entry => entry.id === activeEntryId) || scoreEntries[0];
  const rankings = calculateRankings(scoreEntries, scores, round);
  const totalPar = sumNumbers(holePars);
  const completedEntries = scoreEntries.filter(entry => (scores[entry.id] || []).length === holePars.length).length;

  React.useEffect(() => {
    if (!activeEntryId && scoreEntries[0]?.id) setActiveEntryId(scoreEntries[0].id);
  }, [activeEntryId, scoreEntries]);

  React.useEffect(() => {
    setScores(prev => {
      const next = { ...prev };
      scoreEntries.forEach(entry => {
        const existingScores = next[entry.id] || [];
        next[entry.id] = Array.from({ length: holePars.length }, (_, index) => {
          const existingScore = Number(existingScores[index]);
          return Number.isFinite(existingScore) ? existingScore : holePars[index];
        });
      });
      return next;
    });
  }, [scoreEntries, holePars, setScores]);

  const updateScore = (entryId, index, value) => {
    const nextValue = Math.max(1, Math.min(15, Number(value || 0)));
    setScores(prev => ({
      ...prev,
      [entryId]: (prev[entryId] || []).map((v, i) => i === index ? nextValue : v)
    }));
  };

  const activeScores = activeEntry ? scores[activeEntry.id] || [] : [];
  const activeMeta = getEntryScoreMeta(activeScores, holePars);

  return (
    <main className="page score-page">
      <section className="score-hud">
        <div>
          <p className="eyebrow">Live Scoreboard</p>
          <h1>{round.title}</h1>
          <p>{round.place} · {round.holes}H · {round.method}</p>
        </div>
        <div className="hud-metrics">
          <div><strong>{completedEntries}/{scoreEntries.length}</strong><span>Players</span></div>
          <div><strong>{totalPar}</strong><span>Course Par</span></div>
          <div><strong>LIVE</strong><span>Ranking</span></div>
        </div>
      </section>

      <div className="player-strip" aria-label="참가자별 현재 스코어">
        {scoreEntries.map(entry => {
          const meta = getEntryScoreMeta(scores[entry.id] || [], holePars);
          return (
            <button key={entry.id} className={activeEntry?.id === entry.id ? 'player-pill active' : 'player-pill'} onClick={() => setActiveEntryId(entry.id)}>
              <strong>{entry.name}</strong>
              <span className={getScoreDiffClass(meta.diff)}>{formatScoreDiff(meta.diff)}</span>
            </button>
          );
        })}
      </div>

      {activeEntry && (
        <Card title={activeEntry.name} subtitle={`${getScoreEntrySubtitle(activeEntry)} · Total ${activeMeta.total} · ${formatScoreDiff(activeMeta.diff)} TO PAR`} icon={Activity}>
          <div className="score-summary-grid">
            <div><span>Total</span><strong>{activeMeta.total}</strong></div>
            <div><span>To Par</span><strong className={getScoreDiffClass(activeMeta.diff)}>{formatScoreDiff(activeMeta.diff)}</strong></div>
            <div><span>Par Save</span><strong>{activeMeta.parSaveRate}%</strong></div>
            <div><span>Birdie</span><strong>{activeMeta.birdieCount}</strong></div>
          </div>
          <div className="course-input-list sporty-score-list">
            {courseGroups.map(course => (
              <section className="course-input-card sporty-course-card" key={`${activeEntry.id}-${course.label}`}>
                <h3>{course.label}</h3>
                <div className="score-grid sporty-score-grid">
                  {course.holes.map(hole => {
                    const value = activeScores[hole.index] ?? hole.value;
                    const diff = Number(value) - Number(hole.value);
                    return (
                      <div key={hole.index} className={`score-cell ${getScoreDiffClass(diff)}`}>
                        <span className="hole-label">{hole.number}H</span>
                        <small>PAR {hole.value}</small>
                        <strong>{value}</strong>
                        <em>{formatScoreDiff(diff, 0)}</em>
                        <div className="score-stepper">
                          <button onClick={() => updateScore(activeEntry.id, hole.index, Number(value) - 1)} aria-label={`${hole.number}홀 점수 낮추기`}>−</button>
                          <button onClick={() => updateScore(activeEntry.id, hole.index, Number(value) + 1)} aria-label={`${hole.number}홀 점수 높이기`}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </Card>
      )}

      <Card title="Live Ranking Preview" subtitle="점수를 바꾸면 순위가 바로 갱신됩니다." icon={Trophy}>
        <div className="mini-leaderboard">
          {rankings.slice(0, 5).map(result => (
            <div key={result.id} className="mini-leaderboard-row">
              <strong>#{result.rank}</strong>
              <span>{getRankingDisplayName(result)}</span>
              <b>{formatScoreDiff(Number(result.total || 0) - totalPar)}</b>
            </div>
          ))}
        </div>
      </Card>

      <div className="bottom-actions">
        <Button variant="ghost" onClick={() => setScreen(activeRecordId ? 'records' : 'teamResult')}>이전</Button>
        <Button onClick={() => setScreen('ranking')}>Open Leaderboard</Button>
      </div>
    </main>
  );
}

function RankingScreen({ setScreen, participants, scores, round, teams, assignmentMode, records, setRecords, activeRecordId }) {
  const scoreEntries = useMemo(() => getScoreEntries(participants, teams, round), [participants, teams, round]);
  const rankings = calculateRankings(scoreEntries, scores, round);
  const holePars = getRoundHolePars(round);
  const totalPar = sumNumbers(holePars);
  const hiddenHoleSummary = round.method === '신페리오' ? getHiddenHoleSummary(round, holePars) : null;
  const podium = rankings.slice(0, 3);
  const winner = rankings[0];

  const shareResult = async () => {
    try {
      const result = await shareText(`${round.title} 라운드 카드`, buildResultShareText(round, rankings, totalPar));
      if (result === 'copied') alert('공유용 라운드 카드를 클립보드에 복사했습니다. 인스타그램/카카오톡에 붙여넣어 공유하세요.');
    } catch (error) {
      alert('공유에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const saveRecord = () => {
    const previousRecord = records.find(record => record.id === activeRecordId);
    const savedAt = previousRecord?.savedAt || new Date().toLocaleString();
    const updatedAt = new Date().toLocaleString();
    const record = {
      id: activeRecordId || crypto.randomUUID(),
      round,
      assignmentMode,
      participants,
      teams,
      participantCount: participants.length,
      teamCount: teams.length,
      scoringEntryCount: scoreEntries.length,
      scores,
      rankings,
      status: 'scored',
      savedAt,
      updatedAt,
      scoredAt: updatedAt
    };
    setRecords(prev => {
      const exists = prev.some(item => item.id === record.id);
      if (!exists) return [record, ...prev];
      return prev.map(item => item.id === record.id ? { ...item, ...record } : item);
    });
    alert('라운딩 점수와 순위를 저장했습니다. 오늘의 기록이 누적 데이터에 반영됩니다.');
    setScreen('records');
  };

  return (
    <main className="page leaderboard-page">
      <header className="topbar sport-topbar"><div><p className="eyebrow">Live Leaderboard</p><h1>순위표</h1><p>{round.title} · {round.place} · {round.method} · 기준파 {totalPar}</p></div></header>
      {round.method === '신페리오' && (
        <Card
          title="신페리오 계산 정보"
          subtitle={`숨김 홀 ${hiddenHoleSummary.indexes.length}개 · 숨김 파 ${hiddenHoleSummary.hiddenPar}/${formatParValue(hiddenHoleSummary.targetPar)} · ${hiddenHoleSummary.isExactPar ? '규칙 일치' : '가장 가까운 후보'}`}
        >
          <p>{getHiddenHoleDescription(round, hiddenHoleSummary)}</p>
        </Card>
      )}

      <section className="share-card-preview">
        <span className="badge-live">ROUND CARD</span>
        <p>{round.place || 'ParkBuddy Round'}</p>
        <strong>{winner ? formatScoreDiff(Number(winner.total || 0) - totalPar) : 'E'}</strong>
        <h2>{winner ? getRankingDisplayName(winner) : 'No Winner Yet'}</h2>
        <small>{round.date} · {round.holes}H · {rankings.length} Players</small>
        <Button icon={Share2} variant="glass" onClick={shareResult}>Share Result</Button>
      </section>

      <div className="podium">
        {podium.map(result => (
          <div key={result.id} className={`podium-card rank-${result.rank}`}>
            <span>#{result.rank}</span>
            <strong>{getRankingDisplayName(result)}</strong>
            <b>{formatScoreDiff(Number(result.total || 0) - totalPar)}</b>
            <small>{formatRankingDetail(result, round.method)}</small>
          </div>
        ))}
      </div>

      <div className="list leaderboard-list">
        {rankings.map(r => (
          <Card key={r.id}>
            <div className="ranking-row sporty-ranking-row">
              <strong>#{r.rank}</strong>
              <div>
                <h3>{getRankingDisplayName(r)}</h3>
                {r.type === 'team' && <p>{getRankingMembersText(r)}</p>}
                <p>{formatRankingDetail(r, round.method)}</p>
              </div>
              <b className={getScoreDiffClass(Number(r.total || 0) - totalPar)}>{formatScoreDiff(Number(r.total || 0) - totalPar)}</b>
            </div>
          </Card>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="ghost" onClick={() => setScreen('scoreInput')}>이전</Button>
        <Button variant="secondary" icon={Share2} onClick={shareResult}>공유 카드 복사</Button>
        <Button icon={Save} onClick={saveRecord}>기록에 점수 저장</Button>
      </div>
    </main>
  );
}

function SharedScoreSelectScreen({ records, recordId, setSharedEntryId, setScreen }) {
  const record = records.find(item => item.id === recordId);
  const entries = useMemo(() => record ? getScoreEntries(record.participants || [], record.teams || [], record.round || {}) : [], [record]);

  if (!record) {
    return (
      <main className="page">
        <Card title="라운딩 기록을 찾을 수 없습니다.">
          <p>공유 링크가 만료되었거나 저장소에 해당 기록이 없습니다.</p>
        </Card>
      </main>
    );
  }

  const startScoreInput = (entryId) => {
    setSharedEntryId(entryId);
    setScreen('sharedScore');
  };

  return (
    <main className="page">
      <header className="topbar">
        <h1>점수 입력</h1>
        <p>{record.round.title} · {record.round.date} · {record.round.place}</p>
      </header>

      <Card title="내 이름 또는 팀 선택" subtitle="라운딩 중 점수를 저장하면 운영자의 라운딩 기록 순위가 갱신됩니다." icon={Activity}>
        <div className="member-grid">
          {entries.map(entry => (
            <button key={entry.id} className="option-card" onClick={() => startScoreInput(entry.id)}>
              <strong>{entry.name}</strong>
              <span>{getScoreEntrySubtitle(entry)}</span>
            </button>
          ))}
        </div>
      </Card>

      {(record.rankings || []).length > 0 && (
        <Card title="현재 순위">
          <ul className="mini-ranking">
            {record.rankings.slice(0, 10).map(result => (
              <li key={result.id || result.member?.id}>{result.rank}위 {getRankingDisplayName(result)} - {formatRankingDetail(result, record.round.method)}</li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function SharedScoreScreen({ records, setRecords, recordId, entryId, setScreen }) {
  const record = records.find(item => item.id === recordId);
  const entries = useMemo(() => record ? getScoreEntries(record.participants || [], record.teams || [], record.round || {}) : [], [record]);
  const entry = entries.find(item => item.id === entryId);
  const holePars = useMemo(() => getRoundHolePars(record?.round), [record]);
  const courseGroups = useMemo(() => getCourseGroups(holePars), [holePars]);
  const [localScores, setLocalScores] = useState(() => getInitialEntryScores(record, entryId));

  React.useEffect(() => {
    setLocalScores(getInitialEntryScores(record, entryId));
  }, [record?.id, entryId]);

  if (!record || !entry) {
    return (
      <main className="page">
        <Card title="점수 입력 대상을 찾을 수 없습니다.">
          <p>공유 링크에서 다시 이름 또는 팀을 선택해 주세요.</p>
          {record && <Button onClick={() => setScreen('sharedScoreSelect')}>선택 화면으로 이동</Button>}
        </Card>
      </main>
    );
  }

  const updateScore = (index, value) => {
    setLocalScores(prev => prev.map((score, scoreIndex) => scoreIndex === index ? Number(value || 0) : score));
  };

  const saveSharedScores = () => {
    const nextScores = getNormalizedRecordScores(record, entry.id, localScores);
    const rankings = calculateRankings(entries, nextScores, record.round);
    const updatedAt = new Date().toLocaleString();

    setRecords(prev => prev.map(item => item.id === record.id ? {
      ...item,
      scores: nextScores,
      rankings,
      status: 'scored',
      updatedAt,
      scoredAt: updatedAt
    } : item));
    alert('점수를 저장했습니다. 현재 순위가 갱신됩니다.');
  };

  const latestRankings = record.rankings || [];

  return (
    <main className="page">
      <header className="topbar">
        <h1>{entry.name} 점수 입력</h1>
        <p>{record.round.title} · {record.round.place} · {record.round.method}</p>
      </header>

      <Card title={entry.name} subtitle={`${getScoreEntrySubtitle(entry)} · 현재 총타수 ${sumNumbers(localScores)}`}>
        <div className="course-input-list">
          {courseGroups.map(course => (
            <section className="course-input-card" key={course.label}>
              <h3>{course.label}</h3>
              <div className="score-grid">
                {course.holes.map(hole => (
                  <label key={hole.index}>
                    <span>{hole.number}H <small>파 {hole.value}</small></span>
                    <input type="number" value={localScores[hole.index] ?? hole.value} onChange={event => updateScore(hole.index, event.target.value)} />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="button-row">
          <Button icon={Save} onClick={saveSharedScores}>점수 저장</Button>
          <Button variant="secondary" onClick={() => setScreen('sharedScoreSelect')}>대상 다시 선택</Button>
        </div>
      </Card>

      {latestRankings.length > 0 && (
        <Card title="현재 순위">
          <ul className="mini-ranking">
            {latestRankings.slice(0, 10).map(result => (
              <li key={result.id || result.member?.id}>{result.rank}위 {getRankingDisplayName(result)} - {formatRankingDetail(result, record.round.method)}</li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function RecordScreen({ records, setRecords, onScoreInput }) {
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [query, setQuery] = useState('');
  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return records;

    return records.filter(record => {
      const round = record.round || {};
      const rankingNames = (record.rankings || [])
        .flatMap(result => [getRankingDisplayName(result), getRankingMembersText(result)])
        .join(' ');
      const participantNames = (record.participants || []).map(member => member.name).join(' ');
      const searchText = [
        round.title,
        round.date,
        round.place,
        round.method,
        round.memo,
        getAssignmentModeLabel(record.assignmentMode),
        rankingNames,
        participantNames,
        record.status === 'pending' ? '점수 미입력' : '점수 입력 완료'
      ].join(' ').toLowerCase();

      return searchText.includes(keyword);
    });
  }, [records, query]);

  const deleteRecord = (record) => {
    if (!confirm(`${record.round.title} 기록을 삭제할까요?`)) return;
    setRecords(prev => prev.filter(item => item.id !== record.id));
  };

  const exportRecord = (record) => {
    const filename = `${createSafeFilename(record.round.title)}_${record.round.date || 'date'}.csv`;
    downloadTextFile(filename, buildRecordCsv(record), 'text/csv;charset=utf-8');
  };

  const shareRound = async (record) => {
    try {
      const result = await shareText(`${record.round.title} 조편성`, buildRoundShareText(record));
      if (result === 'copied') alert('조편성 결과와 점수 입력 링크를 클립보드에 복사했습니다. MMS나 카카오톡에 붙여넣어 전송하세요.');
    } catch (error) {
      alert(error?.message || '공유 메시지를 만들지 못했습니다.');
    }
  };

  return (
    <main className="page">
      <header className="topbar"><h1>라운딩 기록 보기</h1></header>
      {records.length > 0 && (
        <Card title="기록 검색" subtitle={`${filteredRecords.length}개 표시`} icon={Search}>
          <Field label="라운딩명, 날짜, 장소, 경기 방식, 참가자 이름으로 검색">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="예: 정기, 장성, 신페리오, 김회장" />
          </Field>
        </Card>
      )}
      {records.length === 0 ? <Card><p>아직 저장된 라운딩 기록이 없습니다.</p></Card> : (
        filteredRecords.length === 0 ? (
          <Card>
            <p>검색 조건에 맞는 라운딩 기록이 없습니다.</p>
          </Card>
        ) : (
          <div className="list">
            {filteredRecords.map(record => {
            const recordHolePars = getRoundHolePars(record.round);
            const recordHiddenHoleSummary = record.round.method === '신페리오'
              ? getHiddenHoleSummary(record.round, recordHolePars)
              : null;
            const isExpanded = expandedRecordId === record.id;
            const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;
            const rankings = record.rankings || [];
            const isScored = rankings.length > 0;
            const canScore = Array.isArray(record.participants) && record.participants.length > 0;

            return (
              <Card key={record.id}>
                <div className="record-header" data-record-id={record.id}>
                  <div className="record-title">
                    <h2>{record.round.title}</h2>
                    <p>{record.round.date} · {record.round.place}</p>
                  </div>
                  <div className="button-row compact record-header-actions">
                    {canScore && <Button icon={Activity} onClick={() => onScoreInput(record)}>{isScored ? '점수 수정' : '점수 입력'}</Button>}
                    <Button variant="secondary" icon={Download} disabled={!isScored} onClick={() => exportRecord(record)}>CSV 내보내기</Button>
                    <Button variant="danger" icon={Trash2} onClick={() => deleteRecord(record)}>삭제</Button>
                  </div>
                </div>
                <p>{record.round.holes}홀 · 기준파 {sumNumbers(recordHolePars)} · {record.round.method} · {getAssignmentModeLabel(record.assignmentMode)} · 참가자 {record.participantCount}명 · {record.teamCount}개 조</p>
                {record.round.method === '신페리오' && <p>{getHiddenHoleDescription(record.round, recordHiddenHoleSummary)}</p>}
                {canScore && (
                  <div className="record-share-row">
                    <Button variant="secondary" icon={Share2} onClick={() => shareRound(record)}>조편성/점수 링크 공유</Button>
                  </div>
                )}
                {isScored ? (
                  <div
                    className="summary-toggle ranking-toggle"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${record.round.title} 전체 순위 ${isExpanded ? '접기' : '펼치기'}`}
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedRecordId(isExpanded ? null : record.id);
                      }
                    }}
                  >
                    <ul className="mini-ranking">
                      {rankings.slice(0, 3).map(r => <li key={r.id || r.member?.id}>{r.rank}위 {getRankingDisplayName(r)} - {formatRankingDetail(r, record.round.method)}</li>)}
                    </ul>
                    <ExpandIcon size={22} />
                  </div>
                ) : (
                  <div className="pending-record">
                    <strong>점수 미입력</strong>
                    <span>조편성은 완료되었습니다. 라운딩 종료 후 이 기록에서 점수를 입력하세요.</span>
                  </div>
                )}
                {isScored && isExpanded && (
                  <div className="record-detail">
                    <h3>전체 순위</h3>
                    <ul className="mini-ranking">
                      {rankings.map(r => (
                        <li key={r.id || r.member?.id}>
                          {r.rank}위 {getRankingDisplayName(r)} - {formatRankingDetail(r, record.round.method)}
                          {r.type === 'team' && <small> 구성원: {getRankingMembersText(r)}</small>}
                        </li>
                      ))}
                    </ul>
                    {record.round.memo && <p>메모: {record.round.memo}</p>}
                  </div>
                )}
                <small>{isScored ? '점수 저장일' : '생성일'}: {record.scoredAt || record.savedAt}</small>
              </Card>
            );
          })}
          </div>
        )
      )}
    </main>
  );
}

function CourseManageScreen({ customPlaces, setCustomPlaces }) {
  const [province, setProvince] = useState('전라남도');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const addPlace = () => {
    const placeName = name.trim();
    if (!placeName) return setError('구장 이름을 입력해 주세요.');
    const exists = customPlaces.some(place => place.province === province && place.name === placeName)
      || (PARK_GOLF_PLACES[province] || []).includes(placeName);
    if (exists) return setError('이미 등록되어 있거나 기본 목록에 있는 구장입니다.');

    setCustomPlaces(prev => [{
      id: crypto.randomUUID(),
      province,
      name: placeName,
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setName('');
    setError('');
  };

  const deletePlace = (place) => {
    if (!confirm(`${place.name} 구장을 삭제할까요?\n\n저장된 과거 라운딩 기록의 장소명은 그대로 유지됩니다.`)) return;
    setCustomPlaces(prev => prev.filter(item => item.id !== place.id));
  };

  const groupedPlaces = customPlaces.reduce((groups, place) => {
    const key = place.province || '기타';
    return {
      ...groups,
      [key]: [...(groups[key] || []), place]
    };
  }, {});

  return (
    <main className="page">
      <header className="topbar"><h1>구장 관리</h1></header>

      <Card title="사용자 구장 등록" subtitle="라운딩 생성 화면의 구장 선택 목록에 추가됩니다." icon={MapPin}>
        <div className="form-grid">
          <Field label="행정구역">
            <select value={province} onChange={e => setProvince(e.target.value)}>
              {PROVINCES.map(item => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="구장 이름" required>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 우리동네 파크골프장" />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="button-row">
          <Button icon={Plus} onClick={addPlace}>구장 추가</Button>
        </div>
      </Card>

      {customPlaces.length === 0 ? (
        <Card>
          <p>아직 등록한 사용자 구장이 없습니다.</p>
        </Card>
      ) : (
        <div className="list">
          {Object.entries(groupedPlaces).map(([groupName, places]) => (
            <Card key={groupName} title={groupName} subtitle={`${places.length}개 구장`}>
              <div className="course-list">
                {places.map(place => (
                  <div key={place.id} className="course-row">
                    <div>
                      <strong>{place.name}</strong>
                      <small>등록일: {place.createdAt}</small>
                    </div>
                    <Button variant="danger" icon={Trash2} onClick={() => deletePlace(place)}>삭제</Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function App() {
  const [screen, setScreen] = useState('home');
  const [members, setMembers] = useState(initialMembers);
  const [round, setRound] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [teamSize, setTeamSize] = useState(4);
  const [teams, setTeams] = useState([]);
  const [teamAssignmentMode, setTeamAssignmentMode] = useState(null);
  const [scores, setScores] = useState({});
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [sharedEntryId, setSharedEntryId] = useState(null);
  const [records, setRecords] = useState([]);
  const [recentPlaces, setRecentPlaces] = useState(DEFAULT_RECENT_PLACES);
  const [customPlaces, setCustomPlaces] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const screenRef = React.useRef('home');
  const memberStats = useMemo(() => buildMemberStatsFromRecords(records), [records]);
  const previousRoundTeams = useMemo(() => records.find(record => record.teams?.length)?.teams || [], [records]);
  const sharedLinkHandledRef = React.useRef(false);

  React.useEffect(() => {
    screenRef.current = screen;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [screen]);

  React.useEffect(() => {
    window.history.replaceState({ app: 'parkbuddy', screen: 'home' }, '', window.location.href);

    const handlePopState = (event) => {
      const nextScreen = event.state?.app === 'parkbuddy' && event.state?.screen
        ? event.state.screen
        : 'home';
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    loadParkBuddyState()
      .then(({ isConfigured, data }) => {
        if (cancelled) return;

        if (data) {
          setMembers(getStoredArray(data.members, initialMembers));
          setRecords(getStoredArray(data.records, []));
          setRecentPlaces(getStoredArray(data.recentPlaces, DEFAULT_RECENT_PLACES));
          setCustomPlaces(getStoredArray(data.customPlaces, []));
        }

        setIsSupabaseReady(isConfigured);
      })
      .catch(error => {
        if (cancelled) return;
        setIsSupabaseReady(false);
        console.warn(error.message || 'Supabase 데이터를 불러오지 못함');
      })
      .finally(() => {
        if (!cancelled) setIsDataLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isDataLoaded || !isSupabaseReady) return undefined;

    const timeoutId = window.setTimeout(() => {
      saveParkBuddyState({ members, records, recentPlaces, customPlaces })
        .catch(error => {
          console.warn(error.message || 'Supabase 저장 실패');
        });
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [isDataLoaded, isSupabaseReady, members, records, recentPlaces, customPlaces]);

  React.useEffect(() => {
    if (!isDataLoaded || sharedLinkHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const recordId = params.get('recordId');
    const entryId = params.get('entryId');
    if (!recordId) return;

    sharedLinkHandledRef.current = true;
    setActiveRecordId(recordId);
    setSharedEntryId(entryId || null);
    const nextScreen = entryId ? 'sharedScore' : 'sharedScoreSelect';
    screenRef.current = nextScreen;
    setScreen(nextScreen);
  }, [isDataLoaded]);

  React.useEffect(() => {
    if (!isDataLoaded || !isSupabaseReady) return undefined;
    if (!['records', 'sharedScoreSelect', 'sharedScore'].includes(screen)) return undefined;

    const intervalId = window.setInterval(() => {
      loadParkBuddyState()
        .then(({ data }) => {
          if (!data) return;
          setMembers(getStoredArray(data.members, initialMembers));
          setRecords(getStoredArray(data.records, []));
          setRecentPlaces(getStoredArray(data.recentPlaces, DEFAULT_RECENT_PLACES));
          setCustomPlaces(getStoredArray(data.customPlaces, []));
        })
        .catch(error => {
          console.warn(error.message || 'Supabase 데이터를 동기화하지 못함');
        });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isDataLoaded, isSupabaseReady, screen]);

  const navigate = (next) => {
    if (next === 'teamResult') setTeams([]);
    if (next === 'roundCreate') { setScores({}); setTeams([]); setTeamAssignmentMode(null); setActiveRecordId(null); setSharedEntryId(null); }
    if (screenRef.current === next) return;
    screenRef.current = next;
    window.history.pushState({ app: 'parkbuddy', screen: next }, '', window.location.pathname);
    setScreen(next);
  };

  const startRecordScoreInput = (record) => {
    const recordParticipants = Array.isArray(record.participants) ? record.participants : [];
    if (recordParticipants.length < 3) {
      alert('이 기록에는 점수 입력에 필요한 참가자 정보가 없습니다.');
      return;
    }

    const recordRound = record.round || {};
    setRound(recordRound);
    setParticipants(recordParticipants);
    setTeams(Array.isArray(record.teams) ? record.teams : []);
    setTeamAssignmentMode(record.assignmentMode || getDefaultAssignmentMode(recordRound.method));
    setScores(record.scores || {});
    setActiveRecordId(record.id);
    setSharedEntryId(null);
    navigate('scoreInput');
  };

  if (!isDataLoaded) {
    return (
      <main className="page">
        <Card title="데이터 불러오는 중">
          <p>Supabase 저장소를 확인하고 있습니다.</p>
        </Card>
      </main>
    );
  }

  return (
    <>
      {screen === 'home' && <HomeScreen setScreen={navigate} members={members} records={records} />}
      {screen === 'members' && <MemberScreen members={members} memberStats={memberStats} setMembers={setMembers} />}
      {screen === 'roundCreate' && <RoundCreateScreen setScreen={navigate} setRound={setRound} recentPlaces={recentPlaces} setRecentPlaces={setRecentPlaces} customPlaces={customPlaces} />}
      {screen === 'personalScores' && <PersonalScoreScreen members={members} records={records} />}
      {screen === 'courses' && <CourseManageScreen customPlaces={customPlaces} setCustomPlaces={setCustomPlaces} />}
      {screen === 'memberSelect' && <MemberSelectScreen setScreen={navigate} members={members} memberStats={memberStats} setParticipants={setParticipants} setLeaders={setLeaders} setTeamSize={setTeamSize} teamSize={teamSize} round={round} teamAssignmentMode={teamAssignmentMode} setTeamAssignmentMode={setTeamAssignmentMode} />}
      {screen === 'teamResult' && <TeamResultScreen setScreen={navigate} participants={participants} leaders={leaders} teamSize={teamSize} teams={teams} setTeams={setTeams} setRecords={setRecords} round={round} assignmentMode={teamAssignmentMode || getDefaultAssignmentMode(round?.method)} memberStats={memberStats} previousRoundTeams={previousRoundTeams} />}
      {screen === 'scoreInput' && <ScoreInputScreen setScreen={navigate} participants={participants} teams={teams} round={round} scores={scores} setScores={setScores} activeRecordId={activeRecordId} />}
      {screen === 'ranking' && <RankingScreen setScreen={navigate} participants={participants} scores={scores} round={round} teams={teams} assignmentMode={teamAssignmentMode || getDefaultAssignmentMode(round?.method)} records={records} setRecords={setRecords} activeRecordId={activeRecordId} />}
      {screen === 'sharedScoreSelect' && <SharedScoreSelectScreen records={records} recordId={activeRecordId} setSharedEntryId={setSharedEntryId} setScreen={setScreen} />}
      {screen === 'sharedScore' && <SharedScoreScreen records={records} setRecords={setRecords} recordId={activeRecordId} entryId={sharedEntryId} setScreen={setScreen} />}
      {screen === 'records' && <RecordScreen records={records} setRecords={setRecords} onScoreInput={startRecordScoreInput} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
