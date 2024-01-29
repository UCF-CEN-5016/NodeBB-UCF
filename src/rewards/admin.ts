'use strict';

import * as plugins from '../plugins';
import * as db from '../database';
import * as utils from '../utils';

interface Reward {
    id: number;
    condition: string;
    // Add other properties from the original data structure if needed
}

const rewards: {
    save: (data: Reward[]) => Promise<Reward[]>;
    delete: (data: Reward) => Promise<void>;
    get: () => Promise<{
        active: Reward[];
        conditions: any[]; // Update the type if the actual type is known
        conditionals: any[]; // Update the type if the actual type is known
        rewards: any[]; // Update the type if the actual type is known
    }>;
} = {} as any;

rewards.save = async function (data: Reward[]): Promise<Reward[]> {
    async function save(data: Reward): Promise<void> {
        if (!Object.keys(data.rewards).length) {
            return;
        }
        const rewardsData = data.rewards;
        delete data.rewards;
        if (!parseInt(data.id.toString(), 10)) {
            data.id = await db.incrObjectField('global', 'rewards:id');
        }
        await rewards.delete(data);
        await db.setAdd('rewards:list', data.id);
        await db.setObject(`rewards:id:${data.id}`, data);
        await db.setObject(`rewards:id:${data.id}:rewards`, rewardsData);
    }

    await Promise.all(data.map((reward) => save(reward)));
    await saveConditions(data);
    return data;
};

rewards.delete = async function (data: Reward): Promise<void> {
    await Promise.all([
        db.setRemove('rewards:list', data.id),
        db.delete(`rewards:id:${data.id}`),
        db.delete(`rewards:id:${data.id}:rewards`),
    ]);
};

rewards.get = async function (): Promise<{
    active: Reward[];
    conditions: any[]; // Update the type if the actual type is known
    conditionals: any[]; // Update the type if the actual type is known
    rewards: any[]; // Update the type if the actual type is known
}> {
    return await utils.promiseParallel({
        active: getActiveRewards(),
        conditions: plugins.hooks.fire('filter:rewards.conditions', []),
        conditionals: plugins.hooks.fire('filter:rewards.conditionals', []),
        rewards: plugins.hooks.fire('filter:rewards.rewards', []),
    });
};

async function saveConditions(data: Reward[]): Promise<void> {
    const rewardsPerCondition: Record<string, number[]> = {};
    await db.delete('conditions:active');
    const conditions: string[] = [];

    data.forEach((reward) => {
        conditions.push(reward.condition);
        rewardsPerCondition[reward.condition] = rewardsPerCondition[reward.condition] || [];
        rewardsPerCondition[reward.condition].push(reward.id);
    });

    await db.setAdd('conditions:active', conditions);

    await Promise.all(Object.keys(rewardsPerCondition).map((c) => db.setAdd(`condition:${c}:rewards`, rewardsPerCondition[c])));
}

async function getActiveRewards(): Promise<Reward[]> {
    async function load(id: number): Promise<Reward | null> {
        const [main, rewards] = await Promise.all([
            db.getObject(`rewards:id:${id}`),
            db.getObject(`rewards:id:${id}:rewards`),
        ]);
        if (main) {
            main.disabled = main.disabled === 'true';
            main.rewards = rewards;
        }
        return main;
    }

    const rewardsList: number[] = await db.getSetMembers('rewards:list');
    const rewardData: (Reward | null)[] = await Promise.all(rewardsList.map((id) => load(id)));
    return rewardData.filter((reward): reward is Reward => reward !== null);
}

require('../promisify')(rewards);
