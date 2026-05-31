import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Users, Trophy, ClipboardList, Download, Upload, Home, CalendarDays, Shuffle, Save } from 'lucide-react';
import {
  TEAM_ASSIGNMENT_MODES,
  buildMemberStatsFromRecords,
  createTeamAssignment,
  isTeamMatchMethod
} from './services/teamAssignment.js';
import './styles.css';

const GENDERS = ['남성', '여성'];
const SKILL_LEVELS = ['초급', '중급', '상급', '최상급'];
const HOLE_OPTIONS = [9, 18, 27, 36];
const GAME_METHODS = ['스트로크 플레이', '신페리오', '매치 플레이', '포섬', '포볼'];
const INDIVIDUAL_ASSIGNMENT_OPTIONS = [
  { value: TEAM_ASSIGNMENT_MODES.BALANCED, label: '실력 균형', description: '실력 점수를 기준으로 조를 고르게 나눕니다.' },
  { value: TEAM_ASSIGNMENT_MODES.BALANCED_OVERLAP, label: '실력 균형 + 중복 최소화', description: '직전 라운딩에서 만난 사람을 가능한 줄입니다.' },
  { value: TEAM_ASSIGNMENT_MODES.LEADER, label: '조장 기준', description: '조장 후보를 각 조에 먼저 배치합니다.' },
  { value: TEAM_ASSIGNMENT_MODES.RANDOM, label: '랜덤', description: '참가자를 무작위로 섞습니다.' }
];
const TEAM_ASSIGNMENT_OPTIONS = [
  { value: TEAM_ASSIGNMENT_MODES.FOURSOME, label: '포섬 추천 팀 편성', description: '비슷한 실력끼리 2인 팀을 만듭니다.' },
  { value: TEAM_ASSIGNMENT_MODES.FOURBALL, label: '포볼 추천 팀 편성', description: '강자와 약자를 짝지어 팀 전력을 맞춥니다.' },
  { value: TEAM_ASSIGNMENT_MODES.TEAM_OVERLAP, label: '실력 균형 + 중복 최소화', description: '팀 실력과 직전 조 중복을 함께 봅니다.' }
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

const SAMPLE_CSV = `이름,성별,연락처,실력등급,핸디캡,조장후보
김회장,남성,01011110001,최상급,2,예
이총무,여성,01011110002,상급,4,예
박프로,남성,01011110003,최상급,1,예
최시니어,남성,01011110004,중급,8,아니오
정루키,여성,01011110005,초급,15,아니오`;

const initialMembers = [
  { id: crypto.randomUUID(), name: '김회장', gender: '남성', phone: '010-1111-0001', skillLevel: '최상급', handicap: 2, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '이총무', gender: '여성', phone: '010-1111-0002', skillLevel: '상급', handicap: 4, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '박프로', gender: '남성', phone: '010-1111-0003', skillLevel: '최상급', handicap: 1, isLeaderCandidate: true, averageScore: null, participationCount: 0 },
  { id: crypto.randomUUID(), name: '최시니어', gender: '남성', phone: '010-1111-0004', skillLevel: '중급', handicap: 8, isLeaderCandidate: false, averageScore: null, participationCount: 0 }
];

function getAssignmentOptions(method) {
  return isTeamMatchMethod(method) ? TEAM_ASSIGNMENT_OPTIONS : INDIVIDUAL_ASSIGNMENT_OPTIONS;
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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = lines.slice(1);
  const valid = [];
  const errors = [];

  rows.forEach((line, index) => {
    const cols = line.split(',').map(v => v.trim());
    const [name, genderRaw, phoneRaw, skillRaw, handicapRaw, leaderRaw] = cols;
    const gender = ['남성', '남', 'male', 'm'].includes((genderRaw || '').toLowerCase()) ? '남성'
      : ['여성', '여', 'female', 'f'].includes((genderRaw || '').toLowerCase()) ? '여성' : '';
    const phone = formatPhone(phoneRaw);
    const phoneDigits = phone.replace(/\D/g, '');
    if (!name || !gender || phoneDigits.length < 10) {
      errors.push(`${index + 2}행: 이름/성별/연락처 필수값 오류`);
      return;
    }
    valid.push({
      id: crypto.randomUUID(),
      name,
      gender,
      phone,
      skillLevel: SKILL_LEVELS.includes(skillRaw) ? skillRaw : '초급',
      handicap: Number.isFinite(Number(handicapRaw)) ? Number(handicapRaw) : 0,
      isLeaderCandidate: ['예', '네', 'y', 'yes', 'true', '1', 'o', '○'].includes(String(leaderRaw || '').toLowerCase()),
      averageScore: null,
      participationCount: 0
    });
  });

  return { valid, errors };
}

function calculateRankings(members, scores, method) {
  const results = members.map(member => {
    const memberScores = scores[member.id] || [];
    const total = memberScores.reduce((sum, value) => sum + Number(value || 0), 0);
    let handicap = 0;
    let finalScore = total;

    if (method === '신페리오') {
      const hiddenCount = Math.max(1, Math.floor(memberScores.length * 2 / 3));
      const hiddenSum = memberScores.slice(0, hiddenCount).reduce((sum, value) => sum + Number(value || 0), 0);
      const estimatedTotal = hiddenSum * memberScores.length / hiddenCount;
      const basePar = memberScores.length * 4;
      handicap = Math.max(0, (estimatedTotal - basePar) * 0.8);
      finalScore = total - handicap;
    }

    return { member, total, handicap, finalScore };
  }).sort((a, b) => a.finalScore - b.finalScore || a.total - b.total);

  let lastScore = null;
  let lastRank = 0;
  return results.map((result, index) => {
    const rank = result.finalScore === lastScore ? lastRank : index + 1;
    lastScore = result.finalScore;
    lastRank = rank;
    return { ...result, rank };
  });
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
  return (
    <main className="page home">
      <div className="hero">
        <div>
          <p className="eyebrow">ParkBuddy Web</p>
          <h1>파크골프 모임 운영을 한 번에</h1>
          <p>회원관리부터 라운딩 생성, 조편성, 점수 입력, 순위표, 기록 보기까지 웹에서 진행합니다.</p>
        </div>
      </div>
      <div className="stats">
        <Card><strong>{members.length}</strong><span>등록 회원</span></Card>
        <Card><strong>{records.length}</strong><span>라운딩 기록</span></Card>
      </div>
      <div className="grid menu">
        <Button icon={Users} onClick={() => setScreen('members')}>회원 등록 및 관리</Button>
        <Button icon={Plus} onClick={() => setScreen('roundCreate')}>라운딩 시작하기</Button>
        <Button icon={ClipboardList} onClick={() => setScreen('records')} variant="secondary">라운딩 기록 보기</Button>
      </div>
    </main>
  );
}

function MemberScreen({ members, setMembers, setScreen }) {
  const empty = { name: '', gender: '', phone: '', skillLevel: '초급', handicap: '0', isLeaderCandidate: false };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const saveMember = () => {
    if (!form.name.trim()) return setError('필수항목인 이름을 입력해 주세요.');
    if (!form.gender) return setError('필수항목인 성별을 선택해 주세요.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('연락처는 숫자 10~11자리로 입력해 주세요.');

    const existingMember = members.find(m => m.id === editingId);
    const member = {
      id: editingId || crypto.randomUUID(),
      name: form.name.trim(),
      gender: form.gender,
      phone: formatPhone(form.phone),
      skillLevel: form.skillLevel,
      handicap: Number.isFinite(Number(form.handicap)) ? Number(form.handicap) : 0,
      isLeaderCandidate: form.isLeaderCandidate,
      averageScore: existingMember?.averageScore ?? null,
      participationCount: existingMember?.participationCount ?? 0
    };

    if (!confirm(editingId ? '회원 정보를 수정할까요?' : '회원을 등록할까요?')) return;

    if (editingId) {
      setMembers(prev => prev.map(m => m.id === editingId ? member : m));
    } else {
      setMembers(prev => withDuplicateNameCheck(prev, member));
    }
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const deleteMember = (member) => {
    if (confirm(`${member.name} 회원을 삭제할까요?`)) {
      setMembers(prev => prev.filter(m => m.id !== member.id));
    }
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
      const { valid, errors } = parseCsv(String(reader.result));
      const message = `등록 가능한 회원: ${valid.length}명\n건너뛸 행: ${errors.length}개${errors.length ? '\n\n' + errors.join('\n') : ''}`;
      if (valid.length > 0 && confirm(message + '\n\n일괄 등록할까요?')) {
        setMembers(prev => valid.reduce((acc, member) => withDuplicateNameCheck(acc, member), prev));
      } else {
        alert(message);
      }
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  };

  return (
    <main className="page">
      <header className="topbar">
        <Button variant="ghost" icon={Home} onClick={() => setScreen('home')}>홈</Button>
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

      {showForm && (
        <Card title={editingId ? '회원 수정' : '신규 회원 등록'}>
          <div className="form-grid">
            <Field label="이름" required><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="연락처" required><input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="01012345678" /></Field>
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
        {members.map(member => (
          <Card key={member.id}>
            <div className="member-row">
              <div>
                <h3>{member.name} {member.isLeaderCandidate && <small>조장 후보</small>}</h3>
                <p>{member.phone} · {member.gender} · {member.skillLevel} · 핸디 {member.handicap}</p>
              </div>
              <div className="button-row compact">
                <Button variant="secondary" onClick={() => { setForm({ ...member, handicap: String(member.handicap) }); setEditingId(member.id); setShowForm(true); }}>수정</Button>
                <Button variant="danger" onClick={() => deleteMember(member)}>삭제</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

function RoundCreateScreen({ setScreen, setRound, recentPlaces, setRecentPlaces }) {
  const [province, setProvince] = useState('전라남도');
  const [round, setLocalRound] = useState({
    title: '정기 라운딩',
    date: getTodayDateInputValue(),
    place: '장성 파크골프장',
    memo: '',
    holes: 18,
    method: '스트로크 플레이'
  });
  const [error, setError] = useState('');

  const places = [...new Set([...(PARK_GOLF_PLACES[province] || []), ...recentPlaces])];

  const submit = () => {
    if (!round.title.trim()) return setError('라운딩 제목을 입력해 주세요.');
    if (!round.date.trim()) return setError('날짜를 입력해 주세요.');
    if (round.place.trim()) setRecentPlaces(prev => [round.place.trim(), ...prev.filter(p => p !== round.place.trim())].slice(0, 10));
    setRound({ ...round, id: crypto.randomUUID(), province });
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
            <div className="chip-row">{HOLE_OPTIONS.map(h => <button key={h} className={round.holes === h ? 'chip active' : 'chip'} onClick={() => setLocalRound({ ...round, holes: h })}>{h}홀</button>)}</div>
          </Field>
          <Field label="점수/경기 방식">
            <select value={round.method} onChange={e => setLocalRound({ ...round, method: e.target.value })}>
              {GAME_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </Card>
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
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  const toggleLeader = (id) => setLocalLeaders(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

  React.useEffect(() => {
    if (!assignmentOptions.some(option => option.value === teamAssignmentMode)) {
      setTeamAssignmentMode(defaultAssignmentMode);
    }
  }, [assignmentOptions, defaultAssignmentMode, teamAssignmentMode, setTeamAssignmentMode]);

  const next = () => {
    const participants = members.filter(m => selected.includes(m.id));
    if (participants.length < 2) return alert('참가자를 2명 이상 선택해 주세요.');
    setParticipants(participants);
    setLeaders(members.filter(m => leaders.includes(m.id)));
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
        {members.map(m => (
          <div key={m.id} className={`select-card ${selected.includes(m.id) ? 'selected' : ''}`}>
            <button onClick={() => toggle(m.id)}><strong>{m.name}</strong><span>{m.skillLevel} · 핸디 {m.handicap}</span><em>{getMemberSkillText(m, memberStats)}</em></button>
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

  return (
    <main className="page">
      <header className="topbar"><h1>조편성 결과</h1><p>{round?.title} · {participants.length}명 · {teams.length}개 조 · {getAssignmentModeLabel(assignmentMode)}</p></header>
      <div className="list">
        {teams.map(team => (
          <Card key={team.id} title={team.name} subtitle={isTeamMatch ? `팀전 · 평균 실력 ${team.skillAverage}` : `${team.leader ? `조장: ${team.leader.name}` : '조장 없음'} · 평균 실력 ${team.skillAverage}`}>
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
              <p>{[team.leader, ...team.members].filter(Boolean).map(m => m.name).join(', ')}</p>
            )}
          </Card>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="secondary" icon={Shuffle} onClick={makeTeams}>다시 편성</Button>
        <Button onClick={() => setScreen('scoreInput')}>점수 입력으로 이동</Button>
      </div>
    </main>
  );
}

function ScoreInputScreen({ setScreen, participants, round, scores, setScores }) {
  React.useEffect(() => {
    setScores(prev => {
      const next = { ...prev };
      participants.forEach(p => {
        if (!next[p.id]) next[p.id] = Array.from({ length: round.holes }, () => 4);
      });
      return next;
    });
  }, [participants, round.holes]);

  const updateScore = (memberId, index, value) => {
    setScores(prev => ({
      ...prev,
      [memberId]: prev[memberId].map((v, i) => i === index ? Number(value || 0) : v)
    }));
  };

  return (
    <main className="page">
      <header className="topbar"><h1>점수 입력</h1><p>{round.title} · {round.holes}홀 · {round.method}</p></header>
      <div className="list">
        {participants.map(member => (
          <Card key={member.id} title={member.name} subtitle={`현재 총타수 ${(scores[member.id] || []).reduce((a,b) => a+b, 0)}`}>
            <div className="score-grid">
              {(scores[member.id] || []).map((score, i) => (
                <label key={i}><span>{i+1}H</span><input type="number" value={score} onChange={e => updateScore(member.id, i, e.target.value)} /></label>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="ghost" onClick={() => setScreen('teamResult')}>이전</Button>
        <Button onClick={() => setScreen('ranking')}>순위표 보기</Button>
      </div>
    </main>
  );
}

function RankingScreen({ setScreen, participants, scores, round, teams, assignmentMode, records, setRecords }) {
  const rankings = calculateRankings(participants, scores, round.method);

  const saveRecord = () => {
    const record = {
      id: crypto.randomUUID(),
      round,
      assignmentMode,
      teams,
      participantCount: participants.length,
      teamCount: teams.length,
      rankings,
      savedAt: new Date().toLocaleString()
    };
    setRecords([record, ...records]);
    alert('라운딩 기록을 저장했습니다.');
    setScreen('home');
  };

  return (
    <main className="page">
      <header className="topbar"><h1>순위표</h1><p>{round.title} · {round.place} · {round.method}</p></header>
      <div className="list">
        {rankings.map(r => (
          <Card key={r.member.id}>
            <div className="ranking-row">
              <strong>{r.rank}위</strong>
              <div><h3>{r.member.name}</h3><p>총타수 {r.total} · 핸디 {r.handicap.toFixed(1)} · 최종 {r.finalScore.toFixed(1)}</p></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="bottom-actions">
        <Button variant="ghost" onClick={() => setScreen('scoreInput')}>이전</Button>
        <Button icon={Save} onClick={saveRecord}>기록 저장 후 처음으로</Button>
      </div>
    </main>
  );
}

function RecordScreen({ setScreen, records }) {
  return (
    <main className="page">
      <header className="topbar">
        <Button variant="ghost" icon={Home} onClick={() => setScreen('home')}>홈</Button>
        <h1>라운딩 기록 보기</h1>
      </header>
      {records.length === 0 ? <Card><p>아직 저장된 라운딩 기록이 없습니다.</p></Card> : (
        <div className="list">
          {records.map(record => (
            <Card key={record.id} title={record.round.title} subtitle={`${record.round.date} · ${record.round.place}`}>
              <p>{record.round.holes}홀 · {record.round.method} · {getAssignmentModeLabel(record.assignmentMode)} · 참가자 {record.participantCount}명 · {record.teamCount}개 조</p>
              <ol className="mini-ranking">
                {record.rankings.slice(0, 3).map(r => <li key={r.member.id}>{r.rank}위 {r.member.name} — 최종 {r.finalScore.toFixed(1)}</li>)}
              </ol>
              <small>저장일: {record.savedAt}</small>
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
  const [records, setRecords] = useState([]);
  const [recentPlaces, setRecentPlaces] = useState(['장성 파크골프장']);
  const memberStats = useMemo(() => buildMemberStatsFromRecords(records), [records]);
  const previousRoundTeams = useMemo(() => records.find(record => record.teams?.length)?.teams || [], [records]);

  const navigate = (next) => {
    if (next === 'teamResult') setTeams([]);
    if (next === 'roundCreate') { setScores({}); setTeams([]); setTeamAssignmentMode(null); }
    setScreen(next);
  };

  return (
    <>
      {screen === 'home' && <HomeScreen setScreen={navigate} members={members} records={records} />}
      {screen === 'members' && <MemberScreen setScreen={navigate} members={members} setMembers={setMembers} />}
      {screen === 'roundCreate' && <RoundCreateScreen setScreen={navigate} setRound={setRound} recentPlaces={recentPlaces} setRecentPlaces={setRecentPlaces} />}
      {screen === 'memberSelect' && <MemberSelectScreen setScreen={navigate} members={members} memberStats={memberStats} setParticipants={setParticipants} setLeaders={setLeaders} setTeamSize={setTeamSize} teamSize={teamSize} round={round} teamAssignmentMode={teamAssignmentMode} setTeamAssignmentMode={setTeamAssignmentMode} />}
      {screen === 'teamResult' && <TeamResultScreen setScreen={navigate} participants={participants} leaders={leaders} teamSize={teamSize} teams={teams} setTeams={setTeams} round={round} assignmentMode={teamAssignmentMode || getDefaultAssignmentMode(round?.method)} memberStats={memberStats} previousRoundTeams={previousRoundTeams} />}
      {screen === 'scoreInput' && <ScoreInputScreen setScreen={navigate} participants={participants} round={round} scores={scores} setScores={setScores} />}
      {screen === 'ranking' && <RankingScreen setScreen={navigate} participants={participants} scores={scores} round={round} teams={teams} assignmentMode={teamAssignmentMode || getDefaultAssignmentMode(round?.method)} records={records} setRecords={setRecords} />}
      {screen === 'records' && <RecordScreen setScreen={navigate} records={records} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
