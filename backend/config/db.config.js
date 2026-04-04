const mysql = require('mysql2');
const { Pool: PgPool } = require('pg');
require('dotenv').config();

const rawClient = String(process.env.DB_CLIENT || '').trim().toLowerCase();
const usePostgres = rawClient === 'postgres'
    || rawClient === 'supabase'
    || !!String(process.env.DATABASE_URL || '').trim();

const normalizeSqlForPostgres = (sql) => String(sql || '')
    .replace(/DATE_SUB\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, (_, days) => `NOW() - INTERVAL '${days} days'`)
    .replace(/CURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');

const appendReturningIdIfNeeded = (sql) => {
    const source = String(sql || '').trim();
    if (!/^INSERT\s+/i.test(source) || /\bRETURNING\b/i.test(source)) {
        return source;
    }

    return `${source.replace(/;\s*$/, '')} RETURNING id`;
};

const convertMysqlPlaceholdersToPg = (sql, params = []) => {
    let paramIndex = 0;
    let valueIndex = 1;
    const values = [];

    const text = String(sql || '').replace(/\?/g, () => {
        const param = params[paramIndex];
        paramIndex += 1;

        if (Array.isArray(param)) {
            if (param.length === 0) {
                return 'NULL';
            }

            if (Array.isArray(param[0])) {
                const tupleSql = param.map((row) => {
                    if (!Array.isArray(row) || row.length === 0) {
                        return '(NULL)';
                    }

                    const rowSql = row.map((cell) => {
                        values.push(cell);
                        return `$${valueIndex++}`;
                    }).join(', ');

                    return `(${rowSql})`;
                }).join(', ');

                return tupleSql;
            }

            return param.map((item) => {
                values.push(item);
                return `$${valueIndex++}`;
            }).join(', ');
        }

        values.push(param);
        return `$${valueIndex++}`;
    });

    return { text, values };
};

const buildPgResult = (statementType, pgResult) => {
    if (statementType === 'SELECT' || statementType === 'WITH' || statementType === 'SHOW' || statementType === 'DESCRIBE') {
        return [pgResult.rows || []];
    }

    if (statementType === 'INSERT') {
        return [{
            insertId: pgResult.rows?.[0]?.id || null,
            affectedRows: Number(pgResult.rowCount || 0),
            rowCount: Number(pgResult.rowCount || 0),
        }];
    }

    return [{
        affectedRows: Number(pgResult.rowCount || 0),
        rowCount: Number(pgResult.rowCount || 0),
    }];
};

const runPgQuery = async (runner, sql, params = []) => {
    const normalized = normalizeSqlForPostgres(sql);
    const statementType = String(normalized || '').trim().split(/\s+/)[0]?.toUpperCase() || '';
    const finalSql = statementType === 'INSERT'
        ? appendReturningIdIfNeeded(normalized)
        : normalized;

    const { text, values } = convertMysqlPlaceholdersToPg(finalSql, params);
    const result = await runner.query(text, values);
    return buildPgResult(statementType, result);
};

const createPgConnectionWrapper = (client) => ({
    async beginTransaction() {
        await client.query('BEGIN');
    },
    async commit() {
        await client.query('COMMIT');
    },
    async rollback() {
        await client.query('ROLLBACK');
    },
    async query(sql, params = []) {
        return runPgQuery(client, sql, params);
    },
    release() {
        client.release();
    },
});

if (usePostgres) {
    const connectionString = String(process.env.DATABASE_URL || '').trim();
    const shouldUseSsl = String(process.env.DB_SSL || 'true').trim().toLowerCase() !== 'false';
    const pgPoolConfig = {
        max: Number(process.env.DB_CONNECTION_LIMIT || 10),
        ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    };

    if (connectionString) {
        // When DATABASE_URL is provided (Render/Supabase), do not let legacy DB_HOST/DB_USER override it.
        pgPoolConfig.connectionString = connectionString;
    } else {
        pgPoolConfig.host = process.env.DB_HOST || undefined;
        pgPoolConfig.port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
        pgPoolConfig.database = process.env.DB_NAME || undefined;
        pgPoolConfig.user = process.env.DB_USER || undefined;
        pgPoolConfig.password = process.env.DB_PASSWORD || undefined;
    }

    const pgPool = new PgPool(pgPoolConfig);

    pgPool.connect()
        .then((client) => {
            console.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công!');
            client.release();
        })
        .catch((error) => {
            console.error('Lỗi khi kết nối đến PostgreSQL:', error.message || error.code || error);
        });

    const pgAdapter = {
        clientType: 'postgres',
        promise() {
            return this;
        },
        async query(sql, params = []) {
            return runPgQuery(pgPool, sql, params);
        },
        async getConnection() {
            const client = await pgPool.connect();
            return createPgConnectionWrapper(client);
        },
    };

    module.exports = pgAdapter;
} else {
    // Sử dụng connection pool để tối ưu hiệu suất
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'if0_41324441_cineshadow',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    pool.clientType = 'mysql';

    // Kiểm tra kết nối
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Lỗi khi kết nối đến cơ sở dữ liệu MySQL:', err.code);
        } else {
            console.log('✅ Kết nối cơ sở dữ liệu MySQL thành công!');
            connection.release();
        }
    });

    module.exports = pool;
}
