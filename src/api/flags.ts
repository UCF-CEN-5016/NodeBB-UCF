// 'use strict';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const user = require('../user');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const flags = require('../flags');

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const flagsApi = module.exports;

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
flagsApi.update = async (caller: { uid: number }, data: {flagId: number}) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const allowed: boolean = await user.isPrivileged(caller.uid) as boolean;
    if (!allowed) {
        throw new Error('[[error:no-privileges]]');
    }

    const { flagId } = data;
    delete data.flagId;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await flags.update(flagId, caller.uid, data);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return await flags.getHistory(flagId);
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
flagsApi.appendNote = async (caller: { uid: number }, data: {datetime: number, flagId: number, note: string}) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const allowed: boolean = await user.isPrivileged(caller.uid) as boolean;
    if (!allowed) {
        throw new Error('[[error:no-privileges]]');
    }
    if (data.datetime && data.flagId) {
        try {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            const note = await flags.getNote(data.flagId, data.datetime);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (note.uid !== caller.uid) {
                throw new Error('[[error:no-privileges]]');
            }
        } catch (e) {
            // Okay if not does not exist in database
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (e.message !== '[[error:invalid-data]]') {
                throw e;
            }
        }
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await flags.appendNote(data.flagId, caller.uid, data.note, data.datetime);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [notes, history] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        flags.getNotes(data.flagId),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        flags.getHistory(data.flagId),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { notes: notes, history: history };
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
flagsApi.deleteNote = async (caller: {uid: number}, data: {flagId: number, datetime: number}) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const note = await flags.getNote(data.flagId, data.datetime);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (note.uid !== caller.uid) {
        throw new Error('[[error:no-privileges]]');
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await flags.deleteNote(data.flagId, data.datetime);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
    await flags.appendHistory(data.flagId, caller.uid, {
        notes: '[[flags:note-deleted]]',
        datetime: Date.now(),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [notes, history] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        flags.getNotes(data.flagId),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        flags.getHistory(data.flagId),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { notes: notes, history: history };
};
