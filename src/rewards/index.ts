import util = require('util');

import db = require('../database');
import plugins = require('../plugins');

type Params = {
    uid: string;
    condition: string;
    method: () => unknown;
};

type Reward = {
    groupname: string;
};

type RewardData = {
    condition: string;
    conditional: string;
    value: string;
    rid: string;
    claimable: string;
    id: string;
    disabled: string;
}

type SortedSetIntermediary = {
    value: string;
    score: string;
}

type RewardsIndexModule = {
    checkConditionAndRewardUser: (params: Params) => Promise<void>;
};

const rewards: RewardsIndexModule = module.exports as RewardsIndexModule;

async function isConditionActive(condition: string): Promise<boolean> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.isSetMember('conditions:active', condition) as boolean;
}

async function getIDsByCondition(condition: string): Promise<string[]> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getSetMembers(`condition:${condition}:rewards`) as string[];
}

async function filterCompletedRewards(uid: string, rewards: RewardData[]): Promise<RewardData[]> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const data: SortedSetIntermediary[] = await db.getSortedSetRangeByScoreWithScores(`uid:${uid}:rewards`, 0, -1, 1, '+inf') as SortedSetIntermediary[];
    const userRewards: number[] = [];

    data.forEach((obj) => {
        userRewards[obj.value] = parseInt(obj.score, 10);
    });

    return rewards.filter((reward) => {
        if (!reward) {
            return false;
        }

        const claimable: number = parseInt(reward.claimable, 10);
        return claimable === 0 || (!userRewards[reward.id] || userRewards[reward.id] < reward.claimable);
    });
}

async function getRewardDataByIDs(ids: string[]): Promise<RewardData[]> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getObjects(ids.map(id => `rewards:id:${id}`)) as RewardData[];
}

async function getRewardsByRewardData(rewards: RewardData[]): Promise<Reward[]> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getObjects(rewards.map(reward => `rewards:id:${reward.id}:rewards`)) as Reward[];
}

async function checkCondition(reward: RewardData, method: () => unknown): Promise<boolean> {
    if (method.constructor && method.constructor.name !== 'AsyncFunction') {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        method = util.promisify(method);
    }
    const value = await method();
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const bool: boolean = await plugins.hooks.fire(`filter:rewards.checkConditional:${reward.conditional}`, { left: value, right: reward.value }) as boolean;
    return bool;
}

async function giveRewards(uid: string, rewards: RewardData[]): Promise<void> {
    const rewardData: Reward[] = await getRewardsByRewardData(rewards);
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

rewards.checkConditionAndRewardUser = async function (params: Params): Promise<void> {
    const { uid, condition, method } = params;
    const isActive: boolean = await isConditionActive(condition);
    if (!isActive) {
        return;
    }
    const ids: string[] = await getIDsByCondition(condition);
    let rewardData: RewardData[] = await getRewardDataByIDs(ids);
    rewardData = await filterCompletedRewards(uid, rewardData);
    rewardData = rewardData.filter(Boolean);
    if (!rewardData || !rewardData.length) {
        return;
    }
    const eligible: boolean[] = await Promise.all(rewardData.map(reward => checkCondition(reward, method)));
    const eligibleRewards: RewardData[] = rewardData.filter((reward, index) => eligible[index]);
    await giveRewards(uid, eligibleRewards);
};
