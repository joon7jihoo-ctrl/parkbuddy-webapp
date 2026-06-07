import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appStateKey = import.meta.env.VITE_PARKBUDDY_STATE_KEY || 'default';

const LEGACY_TABLE_NAME = 'parkbuddy_app_state';
const TABLES = {
  settings: 'parkbuddy_app_settings',
  clubs: 'parkbuddy_clubs',
  members: 'parkbuddy_members',
  courses: 'parkbuddy_courses',
  rounds: 'parkbuddy_rounds',
  scores: 'parkbuddy_round_scores',
  rankings: 'parkbuddy_round_rankings'
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isMissingTableError(error) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
  return text.includes('42P01')
    || text.includes('does not exist')
    || text.includes('schema cache')
    || text.includes('Could not find the table');
}

function hashText(value) {
  const text = String(value || 'default');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeClubName(value) {
  return String(value || '기본 동호회').trim() || '기본 동호회';
}

function getClubId(name) {
  return `club_${hashText(normalizeClubName(name))}`;
}

function getStateClubRows(state) {
  const names = new Set();
  (state.members || []).forEach(member => names.add(normalizeClubName(member.clubName)));
  (state.customPlaces || []).forEach(place => {
    if (place.clubName) names.add(normalizeClubName(place.clubName));
  });
  if (names.size === 0) names.add('기본 동호회');

  return [...names].map(name => ({
    state_key: appStateKey,
    id: getClubId(name),
    name
  }));
}

function toMemberRow(member) {
  const clubName = normalizeClubName(member.clubName);
  return {
    state_key: appStateKey,
    id: member.id,
    club_id: getClubId(clubName),
    name: member.name || '',
    gender: member.gender || '',
    phone: member.phone || '',
    club_name: clubName,
    position: member.position || '회원',
    skill_level: member.skillLevel || '초급',
    handicap: Number.isFinite(Number(member.handicap)) ? Number(member.handicap) : 0,
    is_leader_candidate: Boolean(member.isLeaderCandidate),
    average_score: Number.isFinite(Number(member.averageScore)) ? Number(member.averageScore) : null,
    participation_count: Number.isFinite(Number(member.participationCount)) ? Number(member.participationCount) : 0,
    data: member
  };
}

function fromMemberRow(row) {
  const data = isPlainObject(row.data) ? row.data : {};
  return {
    ...data,
    id: row.id,
    name: row.name || data.name || '',
    gender: row.gender || data.gender || '',
    phone: row.phone || data.phone || '',
    clubName: row.club_name || data.clubName || '',
    position: row.position || data.position || '회원',
    skillLevel: row.skill_level || data.skillLevel || '초급',
    handicap: Number.isFinite(Number(row.handicap)) ? Number(row.handicap) : Number(data.handicap || 0),
    isLeaderCandidate: Boolean(row.is_leader_candidate ?? data.isLeaderCandidate),
    averageScore: row.average_score ?? data.averageScore ?? null,
    participationCount: Number.isFinite(Number(row.participation_count)) ? Number(row.participation_count) : Number(data.participationCount || 0)
  };
}

function toCourseRow(place) {
  const clubName = normalizeClubName(place.clubName);
  return {
    state_key: appStateKey,
    id: place.id,
    club_id: getClubId(clubName),
    province: place.province || '',
    name: place.name || '',
    created_at_text: place.createdAt || '',
    data: place
  };
}

function fromCourseRow(row) {
  const data = isPlainObject(row.data) ? row.data : {};
  return {
    ...data,
    id: row.id,
    province: row.province || data.province || '',
    name: row.name || data.name || '',
    createdAt: row.created_at_text || data.createdAt || ''
  };
}

function toRoundRow(record) {
  const round = record.round || {};
  const clubName = normalizeClubName(round.clubName || record.clubName);
  return {
    state_key: appStateKey,
    id: record.id,
    club_id: getClubId(clubName),
    title: round.title || '',
    round_date: round.date || '',
    place: round.place || '',
    method: round.method || '',
    holes: Number.isFinite(Number(round.holes)) ? Number(round.holes) : 0,
    status: record.status || 'scored',
    assignment_mode: record.assignmentMode || '',
    participant_count: Number.isFinite(Number(record.participantCount)) ? Number(record.participantCount) : 0,
    team_count: Number.isFinite(Number(record.teamCount)) ? Number(record.teamCount) : 0,
    saved_at_text: record.savedAt || '',
    scored_at_text: record.scoredAt || '',
    round,
    participants: record.participants || [],
    teams: record.teams || [],
    data: record
  };
}

function getScoreRows(record) {
  return Object.entries(record.scores || {}).map(([entryId, scores]) => ({
    state_key: appStateKey,
    round_id: record.id,
    entry_id: entryId,
    scores: Array.isArray(scores) ? scores : []
  }));
}

function getRankingRows(record) {
  return (record.rankings || []).map((ranking, index) => ({
    state_key: appStateKey,
    round_id: record.id,
    ranking_key: String(ranking.id || ranking.member?.id || ranking.memberId || `rank-${index}`),
    rank_order: Number.isFinite(Number(ranking.rank)) ? Number(ranking.rank) : index + 1,
    display_name: ranking.member?.name || ranking.name || '',
    ranking
  }));
}

function fromRoundRows(roundRows, scoreRows, rankingRows) {
  const scoresByRound = scoreRows.reduce((groups, row) => {
    groups[row.round_id] = {
      ...(groups[row.round_id] || {}),
      [row.entry_id]: Array.isArray(row.scores) ? row.scores : []
    };
    return groups;
  }, {});

  const rankingsByRound = rankingRows.reduce((groups, row) => {
    groups[row.round_id] = [...(groups[row.round_id] || []), row];
    return groups;
  }, {});

  return roundRows.map(row => {
    const data = isPlainObject(row.data) ? row.data : {};
    const rankings = (rankingsByRound[row.id] || [])
      .sort((a, b) => {
        if (a.rank_order !== b.rank_order) return a.rank_order - b.rank_order;
        return String(a.ranking_key).localeCompare(String(b.ranking_key), 'ko');
      })
      .map(item => item.ranking)
      .filter(Boolean);

    return {
      ...data,
      id: row.id,
      round: row.round || data.round || {},
      participants: Array.isArray(row.participants) ? row.participants : data.participants || [],
      teams: Array.isArray(row.teams) ? row.teams : data.teams || [],
      assignmentMode: row.assignment_mode || data.assignmentMode || '',
      participantCount: Number.isFinite(Number(row.participant_count)) ? Number(row.participant_count) : Number(data.participantCount || 0),
      teamCount: Number.isFinite(Number(row.team_count)) ? Number(row.team_count) : Number(data.teamCount || 0),
      status: row.status || data.status || 'scored',
      savedAt: row.saved_at_text || data.savedAt || '',
      scoredAt: row.scored_at_text || data.scoredAt || '',
      scores: scoresByRound[row.id] || data.scores || {},
      rankings: rankings.length > 0 ? rankings : data.rankings || []
    };
  });
}

function quotePostgrestValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatInFilter(values) {
  return `(${values.map(quotePostgrestValue).join(',')})`;
}

async function fetchRows(tableName, orderColumn = 'updated_at') {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('state_key', appStateKey)
    .order(orderColumn, { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadLegacyState() {
  const { data, error } = await supabase
    .from(LEGACY_TABLE_NAME)
    .select('data')
    .eq('state_key', appStateKey)
    .maybeSingle();

  if (error) throw error;
  return data?.data || null;
}

async function loadNormalizedState() {
  const [settingsRows, memberRows, courseRows, roundRows, scoreRows, rankingRows] = await Promise.all([
    fetchRows(TABLES.settings),
    fetchRows(TABLES.members),
    fetchRows(TABLES.courses),
    fetchRows(TABLES.rounds),
    fetchRows(TABLES.scores),
    fetchRows(TABLES.rankings)
  ]);

  const settings = settingsRows[0] || null;
  const hasData = Boolean(settings)
    || memberRows.length > 0
    || courseRows.length > 0
    || roundRows.length > 0;

  if (!hasData) return null;

  return {
    members: memberRows.map(fromMemberRow),
    records: fromRoundRows(roundRows, scoreRows, rankingRows),
    recentPlaces: settings?.recent_places || settings?.data?.recentPlaces || [],
    customPlaces: courseRows.map(fromCourseRow)
  };
}

async function upsertRows(tableName, rows, onConflict) {
  if (rows.length === 0) return;

  const options = onConflict ? { onConflict } : undefined;
  const { error } = await supabase
    .from(tableName)
    .upsert(rows, options);

  if (error) throw error;
}

async function deleteMissingRows(tableName, keyColumn, keepValues) {
  let query = supabase
    .from(tableName)
    .delete()
    .eq('state_key', appStateKey);

  if (keepValues.length > 0) {
    query = query.not(keyColumn, 'in', formatInFilter(keepValues));
  }

  const { error } = await query;
  if (error) throw error;
}

async function replaceRows(tableName, rows) {
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('state_key', appStateKey);

  if (deleteError) throw deleteError;
  await upsertRows(tableName, rows, undefined);
}

async function saveLegacyState(state, savedAt) {
  const { error } = await supabase
    .from(LEGACY_TABLE_NAME)
    .upsert({
      state_key: appStateKey,
      data: state,
      updated_at: savedAt
    }, {
      onConflict: 'state_key'
    });

  if (error) throw error;
}

async function saveNormalizedState(state, savedAt) {
  const safeState = {
    members: Array.isArray(state.members) ? state.members : [],
    records: Array.isArray(state.records) ? state.records : [],
    recentPlaces: Array.isArray(state.recentPlaces) ? state.recentPlaces : [],
    customPlaces: Array.isArray(state.customPlaces) ? state.customPlaces : []
  };
  const clubRows = getStateClubRows(safeState);
  const memberRows = safeState.members.map(toMemberRow);
  const courseRows = safeState.customPlaces.map(toCourseRow);
  const roundRows = safeState.records.map(toRoundRow);
  const scoreRows = safeState.records.flatMap(getScoreRows);
  const rankingRows = safeState.records.flatMap(getRankingRows);

  await upsertRows(TABLES.settings, [{
    state_key: appStateKey,
    recent_places: safeState.recentPlaces,
    data: { recentPlaces: safeState.recentPlaces },
    updated_at: savedAt
  }], 'state_key');
  await upsertRows(TABLES.clubs, clubRows, 'state_key,id');
  await upsertRows(TABLES.members, memberRows, 'state_key,id');
  await upsertRows(TABLES.courses, courseRows, 'state_key,id');
  await upsertRows(TABLES.rounds, roundRows, 'state_key,id');
  await replaceRows(TABLES.scores, scoreRows);
  await replaceRows(TABLES.rankings, rankingRows);

  await deleteMissingRows(TABLES.members, 'id', memberRows.map(row => row.id));
  await deleteMissingRows(TABLES.courses, 'id', courseRows.map(row => row.id));
  await deleteMissingRows(TABLES.rounds, 'id', roundRows.map(row => row.id));
  await deleteMissingRows(TABLES.clubs, 'id', clubRows.map(row => row.id));
}

export async function loadParkBuddyState() {
  if (!supabase) {
    return { isConfigured: false, data: null, storageMode: 'memory' };
  }

  try {
    const normalizedData = await loadNormalizedState();
    if (normalizedData) {
      return { isConfigured: true, data: normalizedData, storageMode: 'normalized' };
    }
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  const legacyData = await loadLegacyState();
  return {
    isConfigured: true,
    data: legacyData,
    storageMode: legacyData ? 'legacy' : 'normalized'
  };
}

export async function saveParkBuddyState(state) {
  if (!supabase) {
    return { isConfigured: false, savedAt: null, storageMode: 'memory' };
  }

  const savedAt = new Date().toISOString();

  try {
    await saveNormalizedState(state, savedAt);
    return { isConfigured: true, savedAt, storageMode: 'normalized' };
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    await saveLegacyState(state, savedAt);
    return { isConfigured: true, savedAt, storageMode: 'legacy' };
  }
}
