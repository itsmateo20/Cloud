const Sequelize = require('sequelize');
const User = require('./src/models/User.js');
const UserSettings = require('./src/models/UserSettings.js');
const Whitelisted = require('./src/models/Whitelisted.js');
const logger = require("./src/components/logger.js")

async function connectDatabase() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        logging: false,
        storage: './database.sqlite',
    });

    try {
        await sequelize.authenticate();
        logger.log('Database connected!', null, { name: 'DATABASE' });
        return sequelize;
    } catch (error) {
        logger.log('Database connection error:', error, { name: 'DATABASE', type: 'error', msgColor: 'red' });
        throw error;
    }
}

async function synchronizeModels(sequelize) {
    const isDev = process.argv.includes('--dev');
    if (isDev) logger.log('Synchronizing models...', null, { name: 'DATABASE' });
    try {
        await sequelize.sync({ alter: true });

        await User.sync({ alter: true });
        if (isDev) logger.log('User model synchronized successfully!', null, { name: 'DATABASE' });

        await UserSettings.sync({ alter: true });
        if (isDev) logger.log('UserSettings model synchronized successfully!', null, { name: 'DATABASE' });

        await Whitelisted.sync({ alter: true });
        if (isDev) logger.log('Whitelisted model synchronized successfully!', null, { name: 'DATABASE' });

        logger.log('All models synchronized successfully - Database ready!', null, { line: true, name: 'DATABASE' });
    } catch (error) {
        logger.log('Error synchronizing models:', error, { name: 'DATABASE', type: 'error', msgColor: 'red' });
        logger.log('Trying automatic repairs...', null, { name: 'DATABASE' });

        const modelsToSync = [User, UserSettings, Whitelisted];

        for (const model of modelsToSync) {
            await synchronizeModelWithRetry(sequelize, model);
        }
    }
}

async function synchronizeModelWithRetry(sequelize, model) {
    const isDev = process.argv.includes('--dev');
    const backupTableName = `${model.getTableName()}_backup`;
    const backupTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(backupTableName));
    const maxRetries = 3;
    let retries = 0;

    if (backupTableExists) {
        while (retries < maxRetries) {
            try {
                const [originalData, backupData] = await Promise.all([
                    model.findAll(),
                    sequelize.query(`SELECT * FROM ${backupTableName};`, { type: sequelize.QueryTypes.SELECT })
                ]);

                for (const backupRecord of backupData) {
                    const existingRecord = originalData.find(record => record.username === backupRecord.username);

                    if (existingRecord) {
                        if (existingRecord.updatedAt < backupRecord.updatedAt) {
                            await existingRecord.update(backupRecord);
                        }
                    } else {
                        await model.create(backupRecord);
                    }
                }

                await sequelize.getQueryInterface().dropTable(backupTableName);

                if (isDev) logger.log(`${model.name} model synchronized successfully!`, null, { name: 'DATABASE' });
                return;
            } catch (error) {
                logger.log(`Error synchronizing ${model.name} model:`, error, { name: 'DATABASE', type: 'error', msgColor: 'red' });
                retries++;
                if (retries < maxRetries) {
                    logger.log(`Retrying synchronization of ${model.name} model (Retry ${retries}/${maxRetries})...`, null, { name: 'DATABASE' });
                } else {
                    throw error;
                }
            }
        }
    }
}


async function areTablesEqual(model, sequelize) {
    const [originalData, backupData] = await Promise.all([
        model.findAll(),
        sequelize.query(`SELECT * FROM ${model.getTableName()}_backup;`, { type: sequelize.QueryTypes.SELECT })
    ]);

    return JSON.stringify(originalData) === JSON.stringify(backupData);
}

const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = {
    name: 'database',
    description: 'Database',
    async execute() {
        const sequelize = await connectDatabase();

        await synchronizeModels(sequelize);

        setTimeout(async () => {
            const adminFind = await User.findOne({ where: { email: 'admin@localhost' } })
            if (!adminFind) {
                await User.create({
                    email: 'admin@localhost',
                    password: bcrypt.hashSync('admin', saltRounds),
                    admin: true,
                    token: null,
                })
                await (UserSettings.findOne({ where: { email: 'admin@localhost' } }) ? UserSettings.create({ email: 'admin@localhost' }) : "")
                await (Whitelisted.findOne({ where: { email: 'admin@localhost' } }) ? Whitelisted.create({ email: 'admin@localhost' }) : "")
            }
        }, 5000);
    }
}
