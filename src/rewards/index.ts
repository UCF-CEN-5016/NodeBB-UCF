import util = require('util');

import db = require('../database');
import plugins = require('../plugins');

const rewards = module.exports;

rewards.checkConditionAndRewardUser = async function (params) {
    const { uid, condition, method } = params;
    const isActive = await isConditionActive(condition);
    if (!isActive) {
        return;
    }
    const ids = await getIDsByCondition(condition);
    let rewardData = await getRewardDataByIDs(ids);
    rewardData = await filterCompletedRewards(uid, rewardData);
    rewardData = rewardData.filter(Boolean);
    if (!rewardData || !rewardData.length) {
        return;
    }
    const eligible = await Promise.all(rewardData.map(reward => checkCondition(reward, method)));
    const eligibleRewards = rewardData.filter((reward, index) => eligible[index]);
    await giveRewards(uid, eligibleRewards);
};

async function isConditionActive(condition) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.isSetMember('conditions:active', condition);
}

async function getIDsByCondition(condition) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getSetMembers(`condition:${condition}:rewards`);
}

async function filterCompletedRewards(uid, rewards) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const data = await db.getSortedSetRangeByScoreWithScores(`uid:${uid}:rewards`, 0, -1, 1, '+inf');
    const userRewards = {};

    data.forEach((obj) => {
        userRewards[obj.value] = parseInt(obj.score, 10);
    });

    return rewards.filter((reward) => {
        if (!reward) {
            return false;
        }

        const claimable = parseInt(reward.claimable, 10);
        return claimable === 0 || (!userRewards[reward.id] || userRewards[reward.id] < reward.claimable);
    });
}

async function getRewardDataByIDs(ids) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getObjects(ids.map(id => `rewards:id:${id}`));
}

async function getRewardsByRewardData(rewards) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getObjects(rewards.map(reward => `rewards:id:${reward.id}:rewards`));
}

async function checkCondition(reward, method) {
    if (method.constructor && method.constructor.name !== 'AsyncFunction') {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        method = util.promisify(method);
    }
    const value = await method();
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const bool = await plugins.hooks.fire(`filter:rewards.checkConditional:${reward.conditional}`, { left: value, right: reward.value });
    return bool;
}

async function giveRewards(uid, rewards) {
    const rewardData = await getRewardsByRewardData(rewards);
    for (let i = 0; i < rewards.length; i++) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        /* eslint-disable no-await-in-loop */
        await plugins.hooks.fire(`action:rewards.award:${rewards[i].rid}`, { uid: uid, reward: rewardData[i] });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.sortedSetIncrBy(`uid:${uid}:rewards`, 1, rewards[i].id);
    }
}

require('../promisify')(rewards);
