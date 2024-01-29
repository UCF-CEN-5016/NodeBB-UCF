

import * as plugins from '../plugins';
import * as db from '../database';
import * as utils from '../utils';

interface RewardData {
    id: number;
    condition: string;
    rewards: Record<string, any>; // Adjust the type according to the structure of your rewards data
    // Add other properties as needed
}

const rewards: {
    save: (data: RewardData[]) => Promise<RewardData[]>;
    delete: (data: RewardData) => Promise<void>;
    get: () => Promise<{
        active: RewardData[];
        conditions: any[]; // Adjust the type accordingly
        conditionals: any[]; // Adjust the type accordingly
        rewards: any[]; // Adjust the type accordingly
    }>;
} = {} as any;

rewards.save = async function (data: RewardData[]) {
    async function save(data: RewardData) {
        if (!Object.keys(data.rewards).length) {
            return;
        }
        const rewardsData = data.rewards;
        delete data.rewards;
        if (!parseInt(data.id, 10)) {
            data.id = await db.incrObjectField('global', 'rewards:id');
        }
        await rewards.delete(data);
        await db.setAdd('rewards:list', data.id);
        await db.setObject(`rewards:id:${data.id}`, data);
        await db.setObject(`rewards:id:${data.id}:rewards`, rewardsData);
    }

    await Promise.all(data.map(data => save(data)));
    await saveConditions(data);
    return data;
};

rewards.delete = async function (data: RewardData) {
    await Promise.all([
        db.setRemove('rewards:list', data.id),
        db.delete(`rewards:id:${data.id}`),
        db.delete(`rewards:id:${data.id}:rewards`),
    ]);
};

rewards.get = async function () {
    return await utils.promiseParallel({
        active: getActiveRewards(),
        conditions: plugins.hooks.fire('filter:rewards.conditions', []),
        conditionals: plugins.hooks.fire('filter:rewards.conditionals', []),
        rewards: plugins.hooks.fire('filter:rewards.rewards', []),
    });
};

async function saveConditions(data: RewardData[]) {
    const rewardsPerCondition: Record<string, number[]> = {};
    await db.delete('conditions:active');
    const conditions: string[] = [];

    data.forEach((reward) => {
        conditions.push(reward.condition);
        rewardsPerCondition[reward.condition] = rewardsPerCondition[reward.condition] || [];
        rewardsPerCondition[reward.condition].push(reward.id);
    });

    await db.setAdd('conditions:active', conditions);

    await Promise.all(Object.keys(rewardsPerCondition).map(c => db.setAdd(`condition:${c}:rewards`, rewardsPerCondition[c])));
}

async function getActiveRewards(): Promise<RewardData[]> {
    async function load(id: number) {
        const [main, rewards] = await Promise.all([
            db.getObject(`rewards:id:${id}`),
            db.getObject(`rewards:id:${id}:rewards`),
        ]);
        if (main) {
            main.disabled = main.disabled === 'true';
            main.rewards = rewards;
        }
        return main as RewardData;
    }

    const rewardsList = await db.getSetMembers('rewards:list');
    const rewardData = await Promise.all(rewardsList.map(id => load(id)));
    return rewardData.filter(Boolean) as RewardData[];
}

require('../promisify')(rewards);
