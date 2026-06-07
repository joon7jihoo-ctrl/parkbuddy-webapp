const SKILL_LEVEL_VALUES = {
  '초급': 1,
  '중급': 2,
  '상급': 3,
  '최상급': 4
};

const TEAM_MATCH_METHODS = new Set(['포섬', '포볼']);
const DEFAULT_TEAM_SIZE = 4;

export const TEAM_ASSIGNMENT_MODES = {
  RANDOM: 'random',
  BALANCED: 'balanced',
  LEADER: 'leader',
  BALANCED_OVERLAP: 'balanced-overlap',
  FOURSOME: 'foursome',
  FOURBALL: 'fourball',
  TEAM_OVERLAP: 'team-overlap'
};

export function isTeamMatchMethod(method) {
  return TEAM_MATCH_METHODS.has(method);
}

export function buildMemberStatsFromRecords(records = []) {
  const summary = {};

  records.forEach(record => {
    (record.rankings || []).forEach(result => {
      getResultMembers(result).forEach(member => {
        const memberId = member?.id;
        if (!memberId) return;

        if (!summary[memberId]) {
          summary[memberId] = {
            participationCount: 0,
            scoredRounds: 0,
            strokeSum: 0
          };
        }

        summary[memberId].participationCount += 1;

        const total = toFiniteNumber(result.total);
        if (total !== null) {
          summary[memberId].scoredRounds += 1;
          summary[memberId].strokeSum += total;
        }
      });
    });
  });

  return Object.fromEntries(
    Object.entries(summary).map(([memberId, stat]) => [
      memberId,
      {
        participationCount: stat.participationCount,
        averageScore: stat.scoredRounds > 0 ? roundNumber(stat.strokeSum / stat.scoredRounds, 1) : null
      }
    ])
  );
}

export function calculateSkillScore(member, stats = {}) {
  const memberStat = getMemberStat(stats, member?.id);
  const averageScore = firstFiniteNumber(member?.averageScore, memberStat.averageScore);
  const participationCount = firstFiniteNumber(member?.participationCount, memberStat.participationCount, 0);
  const skillLevelValue = SKILL_LEVEL_VALUES[member?.skillLevel] || SKILL_LEVEL_VALUES['초급'];

  let averageScorePoint = 50;
  const minAverageScore = toFiniteNumber(stats.minAverageScore);
  const maxAverageScore = toFiniteNumber(stats.maxAverageScore);
  if (averageScore !== null && minAverageScore !== null && maxAverageScore !== null && maxAverageScore > minAverageScore) {
    averageScorePoint = ((maxAverageScore - averageScore) / (maxAverageScore - minAverageScore)) * 100;
  }

  const maxParticipationCount = Math.max(0, toFiniteNumber(stats.maxParticipationCount) || 0);
  const participationPoint = maxParticipationCount > 0
    ? (participationCount / maxParticipationCount) * 100
    : 0;
  const skillLevelPoint = (skillLevelValue / 4) * 100;

  return roundNumber(
    clamp(averageScorePoint, 0, 100) * 0.5
      + clamp(participationPoint, 0, 100) * 0.3
      + skillLevelPoint * 0.2,
    2
  );
}

export function createBalancedIndividualTeams(participants, options = {}) {
  const candidates = createIndividualCandidates(participants, options, TEAM_ASSIGNMENT_MODES.BALANCED);
  return selectBestTeamAssignment(candidates).groups;
}

export function createFoursomeTeams(participants, options = {}) {
  const candidates = createTeamMatchCandidates(participants, options, TEAM_ASSIGNMENT_MODES.FOURSOME);
  return selectBestTeamAssignment(candidates).groups;
}

export function createFourBallTeams(participants, options = {}) {
  const candidates = createTeamMatchCandidates(participants, options, TEAM_ASSIGNMENT_MODES.FOURBALL);
  return selectBestTeamAssignment(candidates).groups;
}

export function calculatePreviousOverlapScore(candidateTeams, previousRoundTeams = []) {
  const previousGroups = previousRoundTeams
    .map(group => flattenGroupMembers(group).map(member => member.id).filter(Boolean))
    .filter(memberIds => memberIds.length > 1);

  if (previousGroups.length === 0) return 0;

  return candidateTeams.reduce((total, group) => {
    const currentIds = new Set(flattenGroupMembers(group).map(member => member.id).filter(Boolean));

    const groupPenalty = previousGroups.reduce((sum, previousIds) => {
      const overlapCount = previousIds.reduce((count, memberId) => count + (currentIds.has(memberId) ? 1 : 0), 0);
      if (overlapCount <= 1) return sum;

      const pairPenalty = overlapCount * (overlapCount - 1) / 2;
      const limitPenalty = overlapCount > 2 ? (overlapCount - 2) * 8 : 0;
      return sum + pairPenalty + limitPenalty;
    }, 0);

    return total + groupPenalty;
  }, 0);
}

export function selectBestTeamAssignment(candidates) {
  const validCandidates = (candidates || []).filter(candidate => candidate?.groups?.length);
  if (validCandidates.length === 0) return { groups: [], metrics: {}, score: 0 };

  return [...validCandidates].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.metrics.skillSpread !== b.metrics.skillSpread) return a.metrics.skillSpread - b.metrics.skillSpread;
    if (a.metrics.previousOverlap !== b.metrics.previousOverlap) return a.metrics.previousOverlap - b.metrics.previousOverlap;
    return a.metrics.leaderSpread - b.metrics.leaderSpread;
  })[0];
}

export function createTeamAssignment(participants, options = {}) {
  if (!Array.isArray(participants) || participants.length === 0) return [];

  const mode = options.mode || getDefaultAssignmentMode(options.method);

  if (isTeamMatchMethod(options.method)) {
    if (mode === TEAM_ASSIGNMENT_MODES.FOURBALL) {
      return createFourBallTeams(participants, options);
    }

    if (mode === TEAM_ASSIGNMENT_MODES.TEAM_OVERLAP) {
      const methodMode = options.method === '포섬'
        ? TEAM_ASSIGNMENT_MODES.FOURSOME
        : TEAM_ASSIGNMENT_MODES.FOURBALL;
      const candidates = createTeamMatchCandidates(participants, options, methodMode);
      return selectBestTeamAssignment(candidates).groups;
    }

    return createFoursomeTeams(participants, options);
  }

  if (mode === TEAM_ASSIGNMENT_MODES.RANDOM) {
    return createRandomIndividualTeams(participants, options);
  }

  if (mode === TEAM_ASSIGNMENT_MODES.LEADER) {
    return createLeaderBasedIndividualTeams(participants, options);
  }

  const overlapOptions = mode === TEAM_ASSIGNMENT_MODES.BALANCED_OVERLAP
    ? options
    : { ...options, previousRoundTeams: [] };
  return createBalancedIndividualTeams(participants, overlapOptions);
}

export function flattenGroupMembers(group) {
  const membersById = new Map();
  const addMember = member => {
    if (member?.id && !membersById.has(member.id)) {
      membersById.set(member.id, member);
    }
  };

  if (Array.isArray(group?.matchTeams)) {
    group.matchTeams.forEach(matchTeam => (matchTeam.members || []).forEach(addMember));
  } else {
    addMember(group?.leader);
    (group?.members || []).forEach(addMember);
  }

  return [...membersById.values()];
}

function createRandomIndividualTeams(participants, options = {}) {
  const context = createSkillContext(participants, options.statsByMember);
  const teamCount = getIndividualTeamCount(participants.length, options.teamSize);
  const memberLists = createEmptyLists(teamCount);
  const shuffledMembers = shuffleItems([...participants]);

  shuffledMembers.forEach((member, index) => {
    memberLists[index % teamCount].push(member);
  });

  return createCandidateFromIndividualLists(memberLists, options, context).groups;
}

function createLeaderBasedIndividualTeams(participants, options = {}) {
  const context = createSkillContext(participants, options.statsByMember);
  const scoredParticipants = getScoredParticipants(participants, context);
  const teamCount = getIndividualTeamCount(participants.length, options.teamSize);
  const memberLists = distributeWithLeaderSeeding(scoredParticipants, teamCount, options, context);
  return createCandidateFromIndividualLists(memberLists, options, context).groups;
}

function getResultMembers(result) {
  if (Array.isArray(result?.members) && result.members.length > 0) return result.members;
  if (result?.member) return [result.member];
  if (result?.memberId) return [{ id: result.memberId }];
  return [];
}

function createIndividualCandidates(participants, options, mode) {
  const context = createSkillContext(participants, options.statsByMember);
  const scoredParticipants = getScoredParticipants(participants, context);
  const teamCount = getIndividualTeamCount(participants.length, options.teamSize);
  const candidates = [];

  if (teamCount === 0) return candidates;

  for (let offset = 0; offset < teamCount; offset += 1) {
    candidates.push(createCandidateFromIndividualLists(
      distributeSerpentine(scoredParticipants, teamCount, offset),
      options,
      context
    ));
  }

  candidates.push(createCandidateFromIndividualLists(
    distributeGreedy(scoredParticipants, teamCount, options.teamSize, context),
    options,
    context
  ));

  candidates.push(createCandidateFromIndividualLists(
    distributeWithLeaderSeeding(scoredParticipants, teamCount, options, context),
    options,
    context
  ));

  const needsMoreCandidates = mode === TEAM_ASSIGNMENT_MODES.BALANCED_OVERLAP
    || (options.previousRoundTeams || []).length > 0;
  if (needsMoreCandidates) {
    for (let seed = 1; seed <= 18; seed += 1) {
      const ordered = jitterScoredItems(scoredParticipants, seed);
      candidates.push(createCandidateFromIndividualLists(
        distributeSerpentine(ordered, teamCount, seed % teamCount),
        options,
        context
      ));
      candidates.push(createCandidateFromIndividualLists(
        distributeGreedy(ordered, teamCount, options.teamSize, context),
        options,
        context
      ));
    }
  }

  return candidates;
}

function createTeamMatchCandidates(participants, options, pairMode) {
  const context = createSkillContext(participants, options.statsByMember);
  const scoredParticipants = getScoredParticipants(participants, context);
  const pairTeams = pairMode === TEAM_ASSIGNMENT_MODES.FOURBALL
    ? createHighLowPairTeams(scoredParticipants, context)
    : createSimilarPairTeams(scoredParticipants, context);
  const groupCount = Math.max(1, Math.ceil(pairTeams.length / 2));
  const candidates = [];
  const sortedPairTeams = [...pairTeams].sort((a, b) => b.skillAverage - a.skillAverage);

  for (let offset = 0; offset < groupCount; offset += 1) {
    candidates.push(createCandidateFromMatchTeamLists(
      distributeSerpentine(sortedPairTeams, groupCount, offset),
      options,
      context
    ));
  }

  candidates.push(createCandidateFromMatchTeamLists(
    distributeSerpentine([...sortedPairTeams].reverse(), groupCount, 0),
    options,
    context
  ));

  if ((options.previousRoundTeams || []).length > 0) {
    for (let seed = 1; seed <= 14; seed += 1) {
      const ordered = jitterTeamItems(sortedPairTeams, seed);
      candidates.push(createCandidateFromMatchTeamLists(
        distributeSerpentine(ordered, groupCount, seed % groupCount),
        options,
        context
      ));
    }
  }

  return candidates;
}

function createCandidateFromIndividualLists(memberLists, options, context) {
  const groups = memberLists.map((members, index) => buildIndividualGroup(members, index, options, context));
  return scoreCandidate(groups, options);
}

function createCandidateFromMatchTeamLists(matchTeamLists, options, context) {
  const groups = matchTeamLists.map((matchTeams, index) => buildMatchGroup(matchTeams, index, context));
  return scoreCandidate(groups, options);
}

function buildIndividualGroup(members, index, options, context) {
  const leader = selectLeader(members, options.leaders);
  const restMembers = leader ? members.filter(member => member.id !== leader.id) : members;
  const allMembers = leader ? [leader, ...restMembers] : restMembers;

  return {
    id: makeId(`group-${index + 1}`),
    type: 'individual',
    name: `${index + 1}조`,
    leader,
    members: restMembers,
    skillAverage: getAverageSkillScore(allMembers, context),
    leaderCount: countLeaderCandidates(allMembers, options.leaders),
    memberCount: allMembers.length
  };
}

function buildMatchGroup(matchTeams, index, context) {
  const allMembers = matchTeams.flatMap(matchTeam => matchTeam.members);

  return {
    id: makeId(`group-${index + 1}`),
    type: 'team-match',
    name: `${index + 1}조`,
    matchTeams,
    skillAverage: getAverageSkillScore(allMembers, context),
    leaderCount: allMembers.filter(member => member.isLeaderCandidate).length,
    memberCount: allMembers.length
  };
}

function scoreCandidate(groups, options) {
  const skillAverages = groups.map(group => group.skillAverage).filter(value => Number.isFinite(value));
  const leaderCounts = groups.map(group => group.leaderCount || 0);
  const memberCounts = groups.map(group => group.memberCount || 0);
  const skillSpread = getSpread(skillAverages);
  const previousOverlap = calculatePreviousOverlapScore(groups, options.previousRoundTeams);
  const leaderSpread = getSpread(leaderCounts);
  const sizeSpread = getSpread(memberCounts);
  const score = skillSpread * 10 + previousOverlap * 35 + leaderSpread * 5 + sizeSpread * 3;

  return {
    groups,
    metrics: {
      skillSpread: roundNumber(skillSpread, 2),
      previousOverlap: roundNumber(previousOverlap, 2),
      leaderSpread,
      sizeSpread
    },
    score: roundNumber(score, 2)
  };
}

function createSimilarPairTeams(scoredParticipants, context) {
  const sorted = [...scoredParticipants].sort((a, b) => b.skillScore - a.skillScore);
  const pairs = [];

  for (let index = 0; index < sorted.length; index += 2) {
    pairs.push(sorted.slice(index, index + 2).map(item => item.member));
  }

  return pairs.map((members, index) => buildPairTeam(members, index, context));
}

function createHighLowPairTeams(scoredParticipants, context) {
  const sorted = [...scoredParticipants].sort((a, b) => b.skillScore - a.skillScore);
  const pairs = [];
  let left = 0;
  let right = sorted.length - 1;

  while (left <= right) {
    if (left === right) {
      pairs.push([sorted[left].member]);
    } else {
      pairs.push([sorted[left].member, sorted[right].member]);
    }
    left += 1;
    right -= 1;
  }

  return pairs.map((members, index) => buildPairTeam(members, index, context));
}

function buildPairTeam(members, index, context) {
  const skillScores = members.map(member => calculateSkillScore(member, context));

  return {
    id: makeId(`pair-${index + 1}`),
    name: `${getTeamLabel(index)}팀`,
    members,
    skillAverage: roundNumber(mean(skillScores), 2),
    skillGap: roundNumber(getSpread(skillScores), 2)
  };
}

function distributeSerpentine(items, teamCount, offset = 0) {
  const lists = createEmptyLists(teamCount);
  if (teamCount <= 0) return lists;

  items.forEach((item, index) => {
    const row = Math.floor(index / teamCount);
    const column = index % teamCount;
    const serpentineColumn = row % 2 === 0 ? column : teamCount - 1 - column;
    const targetIndex = (serpentineColumn + offset) % teamCount;
    lists[targetIndex].push(item.member || item);
  });

  return lists;
}

function distributeGreedy(scoredParticipants, teamCount, teamSize = DEFAULT_TEAM_SIZE, context) {
  const lists = createEmptyLists(teamCount);
  const sorted = [...scoredParticipants].sort((a, b) => b.skillScore - a.skillScore);

  sorted.forEach(item => {
    const targetIndex = findBestListIndex(lists, teamSize, context);
    lists[targetIndex].push(item.member);
  });

  return lists;
}

function distributeWithLeaderSeeding(scoredParticipants, teamCount, options, context) {
  const lists = createEmptyLists(teamCount);
  const leaderIds = new Set((options.leaders || []).map(leader => leader.id));
  const selectedIds = new Set();
  const sortedLeaders = scoredParticipants
    .filter(item => leaderIds.has(item.member.id) || item.member.isLeaderCandidate)
    .sort((a, b) => b.skillScore - a.skillScore);

  sortedLeaders.slice(0, teamCount).forEach((item, index) => {
    lists[index].push(item.member);
    selectedIds.add(item.member.id);
  });

  scoredParticipants
    .filter(item => !selectedIds.has(item.member.id))
    .sort((a, b) => b.skillScore - a.skillScore)
    .forEach(item => {
      const targetIndex = findBestListIndex(lists, options.teamSize || DEFAULT_TEAM_SIZE, context);
      lists[targetIndex].push(item.member);
    });

  return lists;
}

function findBestListIndex(lists, teamSize, context) {
  const candidates = lists
    .map((members, index) => ({ members, index }))
    .filter(candidate => candidate.members.length < teamSize);
  const available = candidates.length > 0 ? candidates : lists.map((members, index) => ({ members, index }));

  return [...available].sort((a, b) => {
    if (a.members.length !== b.members.length) return a.members.length - b.members.length;
    return getTotalSkillScore(a.members, context) - getTotalSkillScore(b.members, context);
  })[0].index;
}

function getDefaultAssignmentMode(method) {
  if (method === '포볼') return TEAM_ASSIGNMENT_MODES.FOURBALL;
  if (method === '포섬') return TEAM_ASSIGNMENT_MODES.FOURSOME;
  return TEAM_ASSIGNMENT_MODES.BALANCED;
}

function getScoredParticipants(participants, context) {
  return participants.map(member => ({
    member,
    skillScore: calculateSkillScore(member, context)
  })).sort((a, b) => b.skillScore - a.skillScore);
}

function createSkillContext(participants, statsByMember = {}) {
  const memberStats = {};
  const averageScores = [];
  const participationCounts = [];

  participants.forEach(member => {
    const stat = statsByMember?.[member.id] || {};
    const averageScore = firstFiniteNumber(member.averageScore, stat.averageScore);
    const participationCount = firstFiniteNumber(member.participationCount, stat.participationCount, 0);

    memberStats[member.id] = { averageScore, participationCount };
    if (averageScore !== null) averageScores.push(averageScore);
    participationCounts.push(participationCount);
  });

  return {
    memberStats,
    minAverageScore: averageScores.length > 0 ? Math.min(...averageScores) : null,
    maxAverageScore: averageScores.length > 0 ? Math.max(...averageScores) : null,
    maxParticipationCount: participationCounts.length > 0 ? Math.max(...participationCounts) : 0
  };
}

function getMemberStat(stats, memberId) {
  if (!memberId || !stats) return {};
  return stats.memberStats?.[memberId] || stats.byMember?.[memberId] || stats[memberId] || {};
}

function selectLeader(members, selectedLeaders = []) {
  const selectedLeaderIds = new Set(selectedLeaders.map(leader => leader.id));
  return members.find(member => selectedLeaderIds.has(member.id))
    || members.find(member => member.isLeaderCandidate)
    || null;
}

function countLeaderCandidates(members, selectedLeaders = []) {
  const selectedLeaderIds = new Set(selectedLeaders.map(leader => leader.id));
  return members.filter(member => selectedLeaderIds.has(member.id) || member.isLeaderCandidate).length;
}

function getAverageSkillScore(members, context) {
  if (!members.length) return 0;
  return roundNumber(mean(members.map(member => calculateSkillScore(member, context))), 2);
}

function getTotalSkillScore(members, context) {
  return members.reduce((total, member) => total + calculateSkillScore(member, context), 0);
}

function getIndividualTeamCount(participantCount, teamSize = DEFAULT_TEAM_SIZE) {
  const preferredSize = Math.max(3, teamSize || DEFAULT_TEAM_SIZE);
  const maxGroupCountWithMinimumSize = Math.max(1, Math.floor(participantCount / 3));
  const preferredGroupCount = Math.max(1, Math.ceil(participantCount / preferredSize));
  return Math.min(maxGroupCountWithMinimumSize, preferredGroupCount);
}

function getTeamLabel(index) {
  const code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < code.length) return code[index];
  return `${code[index % code.length]}${Math.floor(index / code.length) + 1}`;
}

function jitterScoredItems(scoredItems, seed) {
  return [...scoredItems].sort((a, b) => {
    const aKey = a.skillScore + (hashToUnit(`${a.member.id}-${seed}`) - 0.5) * 12;
    const bKey = b.skillScore + (hashToUnit(`${b.member.id}-${seed}`) - 0.5) * 12;
    return bKey - aKey;
  });
}

function jitterTeamItems(teamItems, seed) {
  return [...teamItems].sort((a, b) => {
    const aKey = a.skillAverage + (hashToUnit(`${a.id}-${seed}`) - 0.5) * 8;
    const bKey = b.skillAverage + (hashToUnit(`${b.id}-${seed}`) - 0.5) * 8;
    return bKey - aKey;
  });
}

function hashToUnit(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return (hash % 10000) / 10000;
}

function createEmptyLists(count) {
  return Array.from({ length: count }, () => []);
}

function shuffleItems(items) {
  return items
    .map(item => ({ item, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(entry => entry.item);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getSpread(values) {
  if (values.length <= 1) return 0;
  return Math.max(...values) - Math.min(...values);
}

function roundNumber(value, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}
