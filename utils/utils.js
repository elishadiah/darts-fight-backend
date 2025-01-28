const isEmpty = (data) => {
  if (data.length === 0 || data === null || data === undefined) return true;
  else return false;
};

const findUserResult = (allResults, username) => {
  return allResults.find(
    (result) => result.username.trim().toLowerCase() === username.toLowerCase()
  );
};

const combineResultsAndUsers = (results, users) => {
  return results.map((result, index) => {
    const user = users[index];
    return user
      ? {
          ...result.toObject(),
          vAvatar: user.vAvatar,
          xp: user.xp,
          dXp: user.dXp,
        }
      : result.toObject();
  });
};

const calculateXP = (previousWin, achievementsLength) => {
  return previousWin
    ? 100 + achievementsLength * 10
    : 50 + achievementsLength * 10;
};

module.exports = {
  isEmpty,
  findUserResult,
  combineResultsAndUsers,
  calculateXP,
};
