const mysql = require('mysql2/promise');
const chalk = require('chalk')

const createConnection = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            database: 'test-db2',
        });
        console.log(chalk.green('Connected to MySQL database'));
        return connection;
    } catch (error) {
        console.error('Error connecting to MySQL:', error.message);
        throw error;
    }
};

const closeConnection = async (connection) => {
    try {
        await connection.end();
        console.log(chalk.yellow('Connection to MySQL closed'));
    } catch (error) {
        console.error('Error closing MySQL connection:', error.message);
        throw error;
    }
};

module.exports = {
    createConnection,
    closeConnection,
};
