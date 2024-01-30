// 'use strict';

const user = require('../user');
const flags = require('../flags');


const flagsApi = module.exports;

flagsApi.create = async (caller: { uid: number }, data: { type: string; id: number; reason: string }) => {
    const required: string[] = ['type', 'id', 'reason'];
    if (!required.every(prop => !!data[prop])) {
        throw new Error('[[error:invalid-data]]');
    }

    const { type, id, reason }: { type: string; id: number; reason: string } = data;

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await flags.validate({
        uid: caller.uid,
        type: type,
        id: id,
    });

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const flagObj = await flags.create(type, id, caller.uid, reason);

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    flags.notify(flagObj, caller.uid);

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return flagObj;
};

flagsApi.update = async (caller: { uid: number }, data: {flagId: number}) => {
    const allowed = await user.isPrivileged(caller.uid);
    if (!allowed) {
        throw new Error('[[error:no-privileges]]');
    }

    const { flagId } = data;
    delete data.flagId;

    await flags.update(flagId, caller.uid, data);
    return await flags.getHistory(flagId);
};


flagsApi.appendNote = async (caller, data) => {
    const allowed = await user.isPrivileged(caller.uid);
    if (!allowed) {
        throw new Error('[[error:no-privileges]]');
    }
    if (data.datetime && data.flagId) {
        try {
            const note = await flags.getNote(data.flagId, data.datetime);
            if (note.uid !== caller.uid) {
                throw new Error('[[error:no-privileges]]');
            }
        } catch (e) {
            // Okay if not does not exist in database
            if (e.message !== '[[error:invalid-data]]') {
                throw e;
            }
        }
    }
    await flags.appendNote(data.flagId, caller.uid, data.note, data.datetime);
    const [notes, history] = await Promise.all([
        flags.getNotes(data.flagId),
        flags.getHistory(data.flagId),
    ]);
    return { notes: notes, history: history };
};

flagsApi.deleteNote = async (caller, data) => {
    const note = await flags.getNote(data.flagId, data.datetime);
    if (note.uid !== caller.uid) {
        throw new Error('[[error:no-privileges]]');
    }

    await flags.deleteNote(data.flagId, data.datetime);
    await flags.appendHistory(data.flagId, caller.uid, {
        notes: '[[flags:note-deleted]]',
        datetime: Date.now(),
    });

    const [notes, history] = await Promise.all([
        flags.getNotes(data.flagId),
        flags.getHistory(data.flagId),
    ]);
    return { notes: notes, history: history };
};
